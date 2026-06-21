import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PatchBody {
  subject?: string;
  body?: string;
  status?: "draft" | "approved";
}

/** Save HITL edits / approve a draft. RLS + explicit user_id scope the update. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/emails/[id]">) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as PatchBody;
  const update: Record<string, unknown> = {};
  if (body.subject !== undefined) update.subject = body.subject;
  if (body.body !== undefined) update.body = body.body;
  if (body.status !== undefined) update.status = body.status;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("emails")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ email: data });
}
