"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelPicker } from "@/components/model-picker";
import { EmailEditor } from "@/components/email-editor";
import type { EmailRow, PersonalizationLevel, Recipient } from "@/lib/types";

const LEVEL_HINTS: Record<PersonalizationLevel, string> = {
  low: "Clean template — name + org only.",
  medium: "Tailored to their role and your top strengths.",
  high: "References their specific work and how you align.",
};

export function ComposeForm({
  profiles,
  defaultModel,
}: {
  profiles: { id: string; label: string }[];
  defaultModel: string;
}) {
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [recipient, setRecipient] = useState<Recipient>({ domain_category: "professor" });
  const [level, setLevel] = useState<PersonalizationLevel>("high");
  const [model, setModel] = useState(defaultModel);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<EmailRow | null>(null);

  function set<K extends keyof Recipient>(key: K, value: Recipient[K]) {
    setRecipient((r) => ({ ...r, [key]: value }));
  }

  async function generate() {
    if (!profileId) {
      setError("Select a resume profile first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profileId,
          recipient,
          level,
          model,
          extra_instructions: extra || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setEmail(data.email as EmailRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Recipient & settings</CardTitle>
          <CardDescription>
            Higher personalization needs the recipient&apos;s specific work. Deliverability claims
            are probabilistic — review before sending.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile">Resume profile</Label>
            <Select id="profile" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={recipient.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Dr. Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org">Organization</Label>
              <Input id="org" value={recipient.org ?? ""} onChange={(e) => set("org", e.target.value)} placeholder="MIT" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={recipient.role ?? ""} onChange={(e) => set("role", e.target.value)} placeholder="Professor of CS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={recipient.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="jane@mit.edu" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={recipient.domain_category ?? "professor"}
              onChange={(e) => set("domain_category", e.target.value)}
            >
              <option value="professor">Professor</option>
              <option value="company">Company / recruiter</option>
              <option value="university">University</option>
              <option value="b-school">B-school</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="work">Their work summary</Label>
            <Textarea
              id="work"
              value={recipient.work_summary ?? ""}
              onChange={(e) => set("work_summary", e.target.value)}
              placeholder="Recent paper, lab focus, or what they work on — powers high personalization."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Personalization</Label>
            <Select id="level" value={level} onChange={(e) => setLevel(e.target.value as PersonalizationLevel)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
            <p className="text-xs text-muted-foreground">{LEVEL_HINTS[level]}</p>
          </div>

          <ModelPicker
            id="model"
            label="Model (personalization)"
            value={model}
            onChange={setModel}
            hint="Stronger models write better high-personalization emails."
          />

          <div className="space-y-2">
            <Label htmlFor="extra">Extra instructions (optional)</Label>
            <Input id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Keep it under 120 words; mention I can relocate." />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={generate} disabled={busy} className="w-full">
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {email ? "Regenerate" : "Generate email"}
          </Button>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Review & edit</CardTitle>
          <CardDescription>Nothing is sent — edit and approve the draft.</CardDescription>
        </CardHeader>
        <CardContent>
          {email ? (
            <EmailEditor key={email.id} email={email} />
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <Sparkles className="h-6 w-6" />
              Fill in the recipient and generate a draft to review it here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
