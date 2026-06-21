# Project Context: Personalized Mass AI Mailer

## What we're building

A personalized cold-outreach platform. A user uploads their resume (and optionally their own contact databases), the app analyzes the resume into a structured profile, finds or ingests relevant recipients (professors, companies, universities, B-schools), generates per-recipient personalized emails at a chosen depth, lets the user review/edit individually or in bulk, then schedules and sends with follow-ups — without tripping spam filters.

Primary user (v1): students doing research/job/internship outreach.
Future user: founders of small B2B startups doing cold outreach; social-post (Twitter/LinkedIn) recommendations.

## Design principles

- **HITL is the differentiator.** One-click approve + individual-and-bulk email editing must feel effortless. Existing tools (Instantly, Apollo, Lemlist) are clunky here. This is where we win.
- **Be honest about deliverability and email validity.** Never promise "guaranteed valid" or "never flagged." These are probabilistic. Surface confidence, not certainty.
- **Model-agnostic.** Users pick models per task via OpenRouter. Cheap models for mechanical work (schema mapping), strong models for high-personalization writing.
- **UI/UX inspiration:** crazehq.com, supermemory.com, Claude. Clean, fast, low-friction, generous whitespace, keyboard-driven.

## Architecture

### Multi-agent layer (deepagents + OpenRouter)

A planner-orchestrator with specialist subagents (not one mega-agent). deepagents provides planning, sub-agents, and a virtual filesystem; it's model-agnostic so OpenRouter slots in.

Subagents:
- **Resume Analyzer** — resume → structured profile JSON (skills, research interests, domain, seniority, notable work).
- **Schema agent** — ingests uploaded CSV/XLSX, maps to canonical recipient schema, dedups.
- **Search/Curation agent** — finds professors/companies/programs matching the profile at query time.
- **Personalization agent** — per-recipient email generation; takes personalization level as a parameter.
- **Verification agent** — email validity (layered) + spam scoring.
- **Scheduler/Sender agent** — timezone logic, throttling, follow-up sequencing.

Let the user select the model per agent.

### Canonical recipient schema

Uploaded databases normalize into one schema (name, role, org, email, domain category, research/work summary, source, verification status, timezone). The Schema agent does the mapping and flags ambiguous columns for user confirmation.

## Feature spec

### Templates
- Prebuilt, domain-wise: tech, consulting, finance, research, etc.
- User can supply their own custom template.

### Databases
- Built-in: companies, universities, professors, B-schools. **Treat built-in static databases as a legal/maintenance liability** (stale emails, GDPR/CAN-SPAM/PECR). Prefer query-time curated search (university directory pages, OpenAlex/Semantic Scholar for research matching) over shipping a large static DB.
- User upload: analyze → normalize to canonical schema → verify.

### Personalization levels
- Low / Medium / High. High = references the professor's specific work and how the user's profile aligns. User picks the LLM driving it.

### Attachments
- Resume, transcript.

### Sending / college email
- "Send via college email (SMTP porting)" is a **risky headline feature.** Universities rate-limit hard (often 100–500/day, sometimes far less) and flag bulk patterns; this can get a student's account throttled or banned.
- Better default: send from a verified custom domain, set **reply-to** = the user's college email. Be explicit with users about the volume cap if they insist on college SMTP.

### HITL
- One-click approve. Edit individual emails or apply bulk tweaks across the batch.

### Deliverability ("no getting blocked")
- This is an **email-infrastructure problem, not an LLM problem**, and it constrains the whole product.
- Warmed-up sending domains; correct SPF/DKIM/DMARC; gradual volume ramp; per-domain throttling; randomized send intervals; plain-text-leaning HTML.
- **No tracking pixels on cold sends** — pixels are a strong spam signal now.

### Email verification
- Layered: syntax → MX records → SMTP probe → optional paid API (ZeroBounce/NeverBounce) for the database product.
- SMTP probe (RCPT TO without sending) is **increasingly unreliable** — many servers accept-all or block probes. Don't over-promise.

### Scheduling
- Smart timezone-based scheduling. Follow-up emails as sequences.

## Build order

1. Resume → profile extraction + single personalized email generation (core value, fastest to validate).
2. HITL review/edit UI (individual + bulk).
3. Database upload → schema normalization → verification.
4. Scheduling + follow-up sequencing + timezone logic.
5. Deliverability hardening (domain warmup, throttling) — before any real volume.
6. Curated search agent.

## Hard constraints to keep front of mind

- Deliverability architecture is the make-or-break; design sending around it from day one.
- Email validity is probabilistic — surface confidence, never guarantee.
- College SMTP caps volume; communicate this honestly.
- Static contact databases carry compliance risk; favor query-time curation.
- Compliance generally: CAN-SPAM (US), GDPR/PECR (EU/UK) — cold outreach rules vary by jurisdiction and recipient type. Keep an unsubscribe path and accurate sender identity.
