import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResumeUpload } from "@/components/resume-upload";
import { ProfileView } from "@/components/profile-view";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmailRow, ProfileRow } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: emails }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("emails")
      .select("id, subject, status, personalization_level, model, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const latest = (profiles as ProfileRow[] | null)?.[0];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Upload a resume, then compose personalized outreach.
          </p>
        </div>
        {latest && (
          <Link href="/compose" className={buttonClasses()}>
            Compose email <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your resume</CardTitle>
            <CardDescription>
              We extract a structured profile to drive personalization. Nothing is sent until you
              approve it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResumeUpload />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              {latest ? "Extracted from your most recent resume." : "No profile yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latest ? (
              <ProfileView profile={latest.structured_profile} />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <FileText className="h-6 w-6" />
                Upload a resume to see your structured profile here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(profiles?.length ?? 0) > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>All resumes</CardTitle>
            <CardDescription>{profiles!.length} uploaded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(profiles as ProfileRow[]).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.label ?? "Untitled"}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(emails?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent drafts</CardTitle>
            <CardDescription>Your latest generated emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(emails as Pick<EmailRow, "id" | "subject" | "status" | "personalization_level" | "model" | "created_at">[]).map(
              (e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium">{e.subject || "(no subject)"}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{e.personalization_level}</Badge>
                    <Badge variant={e.status === "approved" ? "success" : "secondary"}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
