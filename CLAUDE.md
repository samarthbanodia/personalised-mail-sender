# CLAUDE.md — project context

Working context for Claude Code and contributors. The **product spec** lives in
[`CLAUDE (7).md`](./CLAUDE%20(7).md); this file is the **engineering** state: how it's built,
run, and deployed, plus conventions and gotchas.

## What this is

Personalized cold-outreach platform. **Milestone 1 (shipped & deployed):** résumé → structured
profile → single personalized email → human-in-the-loop (HITL) review/edit → approve.
Authenticated, multi-tenant, live on Render.

## Monorepo layout

```
web/                 Next.js 16 app (App Router, TS, Tailwind v4, shadcn-style UI)
agent/               Python FastAPI service (deepagents + OpenRouter)
supabase/migrations/ Postgres schema + RLS + storage bucket
render.yaml          Render Blueprint — deploys BOTH services
```

Request flow: Browser → Next.js (Supabase auth, persistence, BFF route handlers) → Python agent
(deepagents + OpenRouter) → back. The agent is **stateless** and only ever called **server-side**
from the web's `app/api/*` routes — never directly from the browser.

## Local development

- **Web runs on port 3100, NOT 3000** (3000 is occupied on the owner's machine). `npm run dev`
  already passes `-p 3100`. Use `http://localhost:3100` for any local URL/config.
- Agent runs on `:8000` (`uvicorn app.main:app --reload --port 8000`).
- Env: copy `web/.env.example` → `web/.env.local`, `agent/.env.example` → `agent/.env`.
- Quality gates: web `npm run lint` + `npm run typecheck` + `npm run build`; agent
  `ruff check app tests` + `pytest` (venv in `agent/.venv`).

## Conventions & gotchas

- **Next.js 16 specifics** (real breaking changes — see `web/node_modules/next/dist/docs/`):
  - Middleware is **`proxy.ts`** (Node runtime), not `middleware.ts`. Ours does Supabase session
    refresh + route gating via `lib/supabase/proxy.ts`.
  - `cookies()`, `headers()`, `params`, `searchParams` are **async** (await them).
  - Turbopack is default; `next lint` is removed (use `eslint` directly).
  - Route handler context: `RouteContext<'/path/[id]'>`, `await ctx.params`.
- **Supabase**: `@supabase/ssr`; `lib/supabase/server.ts` (RSC/route/action),
  `client.ts` (browser). Every table is **RLS-scoped to `auth.uid()`** — verified: an
  unauthenticated REST read returns `[]`. New API keys: the **publishable** (`sb_publishable_…`)
  key is the browser/anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`); the `sb_secret_…` key must
  never touch client code or `NEXT_PUBLIC_*`.
- **Model-agnostic**: every agent call takes an OpenRouter model id. Curated list +
  per-agent defaults in `web/lib/models.ts`; the personalization model is user-pickable in the
  compose UI and persisted in `model_preferences`.
- **Agent design**: planner-orchestrator scaffold (`agent/app/agents/orchestrator.py`, deepagents)
  with specialist subagents (`resume_analyzer`, `personalization`). M1 endpoints call the
  specialists directly for speed/determinism; the orchestrator is the seam for later multi-step
  flows. Structured output via `llm.generate_structured` (provider-agnostic JSON + repair retry).
- **HITL editor** (`web/components/email-editor.tsx`) is the product differentiator — built to
  extend to bulk/batch in Milestone 2. Don't mutate props (React 19 immutability lint).

## Deployment (Render)

- Both services deploy from `render.yaml` (Render → New + → Blueprint → this repo). Region:
  Singapore. Plan: starter (paid → no cold-start spin-down).
- **Auto-deploys on push to `main`** (both services).
- Secrets/cross-service URLs set in the Render dashboard (marked `sync: false`):
  agent → `OPENROUTER_API_KEY`, `CORS_ALLOW_ORIGINS`; web → `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. `AGENT_SERVICE_URL` auto-wires to the
  agent via `fromService` (web's `lib/agent.ts` adds the scheme to the bare host).
- `NEXT_PUBLIC_*` are **inlined at build time** — set them before the build; changing them
  triggers a rebuild.
- Supabase project config (dashboard, not in repo): Auth → URL Configuration must point Site URL
  + Redirect URLs at the live web URL for email links to work; or disable "Confirm email" for
  password-only testing.

### Live (Milestone 1)
- Web: https://mailer-web.onrender.com
- Agent: https://mailer-agent.onrender.com

## Roadmap (build order from the spec)

1. ✅ Résumé → profile → single personalized email + HITL — **done, deployed**
2. Bulk/batch HITL across many recipients — **next**
3. Contact-DB upload → schema mapping → layered verification
4. Scheduling + follow-ups + timezone logic
5. Deliverability hardening (domain warmup, SPF/DKIM/DMARC, throttling, no tracking pixels)
6. Curated query-time search (OpenAlex/Semantic Scholar, directories)

Sending is deliberately **not** built yet (Milestones 4–5); the schema and provider seam exist.
