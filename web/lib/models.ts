/**
 * Curated OpenRouter models the user can pick per agent. The platform is
 * model-agnostic — this is a sensible shortlist, not a hard limit. Cheap models
 * suit mechanical work (resume parsing); stronger models suit personalization.
 */

export interface ModelOption {
  id: string; // OpenRouter model id
  label: string;
  hint: "cheap" | "balanced" | "strong";
}

export const MODELS: ModelOption[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", hint: "cheap" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", hint: "cheap" },
  { id: "google/gemini-flash-1.5", label: "Gemini 1.5 Flash", hint: "cheap" },
  { id: "openai/gpt-4o", label: "GPT-4o", hint: "balanced" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", hint: "strong" },
  { id: "google/gemini-pro-1.5", label: "Gemini 1.5 Pro", hint: "strong" },
  { id: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B", hint: "balanced" },
];

/** Per-agent default model ids (overridable by the user). */
export const DEFAULT_MODELS = {
  resume_analyzer: "openai/gpt-4o-mini",
  personalization: "anthropic/claude-3.5-sonnet",
} as const;

export type AgentName = keyof typeof DEFAULT_MODELS;
