"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { EmailRow } from "@/lib/types";

/**
 * Human-in-the-loop editor — the product's differentiator. Edit subject/body,
 * save, and one-click approve. Keyboard: Ctrl/Cmd+S saves, Ctrl/Cmd+Enter approves.
 * Built to extend into a batch/bulk view later.
 */
export function EmailEditor({ email }: { email: EmailRow }) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [baseline, setBaseline] = useState({ subject: email.subject, body: email.body });
  const [status, setStatus] = useState(email.status);
  const [saving, setSaving] = useState<"idle" | "saving" | "approving">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = subject !== baseline.subject || body !== baseline.body;

  async function patch(payload: Partial<Pick<EmailRow, "subject" | "body" | "status">>) {
    const res = await fetch(`/api/emails/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed.");
    return data.email as EmailRow;
  }

  async function save() {
    if (saving !== "idle") return;
    setSaving("saving");
    setError(null);
    try {
      await patch({ subject, body });
      setBaseline({ subject, body });
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving("idle");
    }
  }

  async function approve() {
    if (saving !== "idle") return;
    setSaving("approving");
    setError(null);
    try {
      await patch({ subject, body, status: "approved" });
      setBaseline({ subject, body });
      setStatus("approved");
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setSaving("idle");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "s") {
        e.preventDefault();
        void save();
      } else if (e.key === "Enter") {
        e.preventDefault();
        void approve();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body, saving]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={status === "approved" ? "success" : "secondary"}>{status}</Badge>
          <Badge variant="outline">{email.personalization_level}</Badge>
          {email.model && <span className="text-xs text-muted-foreground">{email.model}</span>}
        </div>
        <span className="text-xs text-muted-foreground">
          {dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : ""}
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[320px] font-mono text-sm leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">{body.length} characters</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} variant="outline" disabled={saving !== "idle" || !dirty}>
          {saving === "saving" ? <Loader2 className="animate-spin" /> : <Save />} Save draft
        </Button>
        <Button onClick={approve} disabled={saving !== "idle"}>
          {saving === "approving" ? <Loader2 className="animate-spin" /> : <Check />} Approve
        </Button>
        <Button onClick={copy} variant="ghost">
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">⌘/Ctrl+S save · ⌘/Ctrl+↵ approve</span>
      </div>
    </div>
  );
}
