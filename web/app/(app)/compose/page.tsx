import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ComposeForm } from "@/components/compose-form";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_MODELS } from "@/lib/models";
import type { ProfileRow } from "@/lib/types";

export default async function ComposePage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: pref }] = await Promise.all([
    supabase.from("profiles").select("id, label").order("created_at", { ascending: false }),
    supabase
      .from("model_preferences")
      .select("model")
      .eq("agent", "personalization")
      .maybeSingle(),
  ]);

  const profileList = (profiles as Pick<ProfileRow, "id" | "label">[] | null) ?? [];

  if (profileList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>You need a resume profile first.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
          <FileText className="h-6 w-6" />
          Upload a resume on the dashboard to start composing.
          <Link href="/dashboard" className={buttonClasses()}>
            Go to dashboard
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compose</h1>
        <p className="text-sm text-muted-foreground">
          Generate a personalized email, then review and approve it.
        </p>
      </div>
      <ComposeForm
        profiles={profileList.map((p) => ({ id: p.id, label: p.label ?? "Untitled" }))}
        defaultModel={pref?.model ?? DEFAULT_MODELS.personalization}
      />
    </div>
  );
}
