import "server-only";

import type {
  EmailRow,
  PersonalizationLevel,
  Recipient,
  StructuredProfile,
} from "@/lib/types";

/** Accepts a full URL or a bare host (e.g. Render's `fromService` host); adds https. */
function normalizeBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const AGENT_URL = normalizeBase(process.env.AGENT_SERVICE_URL ?? "http://localhost:8000");

export class AgentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AgentError";
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string };
    return data.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Forward resume bytes to the agent service for structured extraction. */
export async function analyzeResume(
  file: File,
  model?: string,
): Promise<{ profile: StructuredProfile; model: string }> {
  const form = new FormData();
  form.append("file", file);
  if (model) form.append("model", model);

  const res = await fetch(`${AGENT_URL}/resume/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new AgentError(await readError(res), res.status);
  return res.json();
}

/** Generate a personalized email draft for a recipient. */
export async function generateEmail(input: {
  profile: StructuredProfile;
  recipient: Recipient;
  level: PersonalizationLevel;
  model?: string;
  extra_instructions?: string;
}): Promise<Pick<EmailRow, "subject" | "body"> & { model: string }> {
  const res = await fetch(`${AGENT_URL}/email/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AgentError(await readError(res), res.status);
  return res.json();
}
