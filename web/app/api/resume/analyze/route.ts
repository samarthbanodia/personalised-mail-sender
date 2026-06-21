import { NextResponse } from "next/server";
import { analyzeResume, AgentError } from "@/lib/agent";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const model = (form.get("model") as string) || undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No resume file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Resume exceeds the 8 MB limit." }, { status: 413 });
  }

  // Store the resume (best-effort; analysis proceeds even if storage fails).
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });

  try {
    const { profile, model: usedModel } = await analyzeResume(file, model);

    const { data: row, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        label: profile.headline ?? profile.name ?? file.name,
        resume_path: uploadError ? null : path,
        structured_profile: profile,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabase
      .from("model_preferences")
      .upsert({ user_id: user.id, agent: "resume_analyzer", model: usedModel });

    return NextResponse.json({ profile: row });
  } catch (err) {
    if (err instanceof AgentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Resume analysis failed." }, { status: 500 });
  }
}
