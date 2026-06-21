import { NextResponse } from "next/server";
import { generateEmail, AgentError } from "@/lib/agent";
import { createClient } from "@/lib/supabase/server";
import type { PersonalizationLevel, Recipient, StructuredProfile } from "@/lib/types";

interface GenerateBody {
  profile_id: string;
  recipient: Recipient;
  level: PersonalizationLevel;
  model?: string;
  extra_instructions?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as GenerateBody;
  if (!body.profile_id || !body.recipient) {
    return NextResponse.json({ error: "profile_id and recipient are required." }, { status: 400 });
  }

  // Load the profile from the DB rather than trusting a client copy.
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("structured_profile")
    .eq("id", body.profile_id)
    .single();
  if (profileError || !profileRow) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  // Persist the recipient (canonical schema).
  const { data: recipient, error: recipientError } = await supabase
    .from("recipients")
    .insert({
      user_id: user.id,
      name: body.recipient.name ?? null,
      role: body.recipient.role ?? null,
      org: body.recipient.org ?? null,
      email: body.recipient.email ?? null,
      domain_category: body.recipient.domain_category ?? null,
      work_summary: body.recipient.work_summary ?? null,
      source: "manual",
      timezone: body.recipient.timezone ?? null,
    })
    .select()
    .single();
  if (recipientError || !recipient) {
    return NextResponse.json({ error: "Could not save recipient." }, { status: 500 });
  }

  try {
    const draft = await generateEmail({
      profile: profileRow.structured_profile as StructuredProfile,
      recipient: body.recipient,
      level: body.level,
      model: body.model,
      extra_instructions: body.extra_instructions,
    });

    const { data: email, error: emailError } = await supabase
      .from("emails")
      .insert({
        user_id: user.id,
        recipient_id: recipient.id,
        profile_id: body.profile_id,
        subject: draft.subject,
        body: draft.body,
        personalization_level: body.level,
        model: draft.model,
        status: "draft",
      })
      .select()
      .single();
    if (emailError) {
      return NextResponse.json({ error: emailError.message }, { status: 500 });
    }

    await supabase
      .from("model_preferences")
      .upsert({ user_id: user.id, agent: "personalization", model: draft.model });

    return NextResponse.json({ email });
  } catch (err) {
    if (err instanceof AgentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Email generation failed." }, { status: 500 });
  }
}
