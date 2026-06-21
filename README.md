# Personalized Mass AI Mailer

A personalized cold-outreach platform. Upload a resume → get a structured profile → generate
per-recipient personalized emails at a chosen depth → review/edit with effortless human-in-the-loop
(HITL) controls → (later) schedule and send with follow-ups, without tripping spam filters.

This repository contains **Milestone 1**: the production foundation —
*resume → structured profile → single personalized email → HITL review/edit*, as a real,
authenticated, deployable app. See [`CLAUDE (7).md`](./CLAUDE%20(7).md) for the full product spec
and build order.

## Architecture

Polyglot monorepo with two independently deployable services:

| Path         | What it is                                  | Stack                                              | Deploy |
|--------------|---------------------------------------------|----------------------------------------------------|--------|
| `web/`       | Web app (UI, auth, persistence, BFF)        | Next.js 16 (App Router, TS), Tailwind v4, shadcn-style UI | Render |
| `agent/`     | Multi-agent AI service                      | Python, FastAPI, deepagents, OpenRouter            | Render |
| `supabase/`  | Database schema, RLS, storage               | Supabase (Postgres + Auth + Storage)               | Supabase |

**Request flow:** Browser → Next.js (validates Supabase session, persists data, BFF proxy) →
Python agent service (deepagents + OpenRouter) → back. Resumes live in Supabase Storage; all
structured data in Supabase Postgres, row-level-security scoped to each user.

The agent service is a **planner-orchestrator with specialist subagents** (not one mega-agent).
Milestone 1 ships two of them — **Resume Analyzer** and **Personalization** — on a scaffold the
remaining spec'd agents (Schema, Search/Curation, Verification, Scheduler/Sender) plug into.

Everything is **model-agnostic**: the user picks an OpenRouter model per agent (cheap models for
mechanical work, strong models for high-personalization writing).

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [OpenRouter](https://openrouter.ai) API key

## Local development

### 1. Supabase

Create a project, then apply the schema in `supabase/migrations/0001_init.sql` (paste into the
Supabase SQL editor, or use the Supabase CLI: `supabase db push`). Note your project URL, anon
key, and service-role key from **Project Settings → API**.

### 2. Agent service (`agent/`)

```bash
cd agent
python -m venv .venv
# Windows:  .venv\Scripts\activate     |  macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then fill in OPENROUTER_API_KEY
uvicorn app.main:app --reload --port 8000
```

Health check: <http://localhost:8000/health>. Interactive docs: <http://localhost:8000/docs>.

### 3. Web app (`web/`)

```bash
cd web
npm install
cp .env.example .env.local      # then fill in Supabase keys + AGENT_SERVICE_URL=http://localhost:8000
npm run dev
```

Open <http://localhost:3000>.

## End-to-end test

Sign in → upload a resume → review the extracted profile → enter a recipient, pick a
personalization level and model → **Generate** → edit the draft in the HITL editor → **Approve**.
Confirm the `profiles` and `emails` rows appear in Supabase (and that RLS prevents seeing other
users' rows).

## Deployment

Both the web app and the agent service run on **Render**, deployed together from the root
[`render.yaml`](./render.yaml) blueprint. Supabase hosts the database/auth/storage.

### Render (both services)

In Render: **New + → Blueprint**, and point it at this repo. It creates two services —
`mailer-agent` (Python) and `mailer-web` (Node). The agent's URL is wired into the web app
automatically (`AGENT_SERVICE_URL` via `fromService`). Then set the dashboard values marked
`sync: false`:

- **mailer-agent** → `OPENROUTER_API_KEY`, and `CORS_ALLOW_ORIGINS` = the web URL
  (e.g. `https://mailer-web.onrender.com`).
- **mailer-web** → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `NEXT_PUBLIC_SITE_URL` = the web URL. (These are inlined at build time, so set them before the
  first build; trigger a redeploy after the URLs are known.)

> A paid Render plan keeps both services warm — worth it for the agent, since a cold start would
> otherwise add ~50s to the first request after idle.

### Supabase auth configuration

In **Authentication → URL Configuration**, set the Site URL to your Render web URL and add
`https://<your-web>.onrender.com/auth/callback` to the redirect allow-list (plus the localhost
equivalents for dev). Email/password works out of the box; for "Continue with Google", enable the
Google provider under **Authentication → Providers**.

## Deferred to later milestones

Email sending + ESP, bulk/batch HITL, contact-DB upload + verification, scheduling/follow-ups,
deliverability hardening (warmup, SPF/DKIM/DMARC, throttling), and curated query-time search are
intentionally **out of scope** for Milestone 1 — but the schema and seams for them are in place.
See the spec for details.
