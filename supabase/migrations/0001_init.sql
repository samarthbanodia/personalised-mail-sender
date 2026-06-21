-- Personalized Mass AI Mailer — Milestone 1 schema
-- Postgres / Supabase. All app tables are row-level-security scoped to the
-- authenticated user (auth.uid()). Run this in the Supabase SQL editor or via
-- `supabase db push`.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type personalization_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type email_status as enum ('draft', 'approved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('unverified', 'valid', 'risky', 'invalid');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- profiles: a parsed resume -> structured profile (one user can have several)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  label              text,                       -- user-facing name, e.g. "ML research resume"
  resume_path        text,                       -- path in the `resumes` storage bucket
  structured_profile jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- ---------------------------------------------------------------------------
-- recipients: the canonical recipient schema (full now; M1 uses single entry)
-- ---------------------------------------------------------------------------
create table if not exists public.recipients (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  name                text,
  role                text,
  org                 text,
  email               text,
  domain_category     text,                      -- e.g. professor / company / university / b-school
  work_summary        text,                      -- research/work summary used for personalization
  source              text,                      -- manual / upload / curated-search
  verification_status verification_status not null default 'unverified',
  timezone            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists recipients_user_id_idx on public.recipients (user_id);

-- ---------------------------------------------------------------------------
-- emails: generated drafts (HITL editable), with the model + level used
-- ---------------------------------------------------------------------------
create table if not exists public.emails (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  recipient_id          uuid references public.recipients (id) on delete set null,
  profile_id            uuid references public.profiles (id) on delete set null,
  subject               text not null default '',
  body                  text not null default '',
  personalization_level personalization_level not null default 'medium',
  model                 text,                    -- OpenRouter model id used to generate
  status                email_status not null default 'draft',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists emails_user_id_idx on public.emails (user_id);
create index if not exists emails_recipient_id_idx on public.emails (recipient_id);

-- ---------------------------------------------------------------------------
-- model_preferences: per-user, per-agent OpenRouter model selection
-- ---------------------------------------------------------------------------
create table if not exists public.model_preferences (
  user_id    uuid not null references auth.users (id) on delete cascade,
  agent      text not null,                      -- e.g. 'resume_analyzer' | 'personalization'
  model      text not null,                      -- OpenRouter model id
  updated_at timestamptz not null default now(),
  primary key (user_id, agent)
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists recipients_set_updated_at on public.recipients;
create trigger recipients_set_updated_at before update on public.recipients
  for each row execute function public.set_updated_at();

drop trigger if exists emails_set_updated_at on public.emails;
create trigger emails_set_updated_at before update on public.emails
  for each row execute function public.set_updated_at();

drop trigger if exists model_preferences_set_updated_at on public.model_preferences;
create trigger model_preferences_set_updated_at before update on public.model_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: each user sees only their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.recipients        enable row level security;
alter table public.emails            enable row level security;
alter table public.model_preferences enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','recipients','emails','model_preferences'] loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s;', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s;', t);

    execute format($f$create policy "%1$s_select_own" on public.%1$s
      for select using (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "%1$s_insert_own" on public.%1$s
      for insert with check (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "%1$s_update_own" on public.%1$s
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);$f$, t);
    execute format($f$create policy "%1$s_delete_own" on public.%1$s
      for delete using (auth.uid() = user_id);$f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: private `resumes` bucket, each user confined to a folder named
-- after their uid (path = "<uid>/<filename>")
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

do $$ begin
  drop policy if exists "resumes_read_own" on storage.objects;
  drop policy if exists "resumes_insert_own" on storage.objects;
  drop policy if exists "resumes_update_own" on storage.objects;
  drop policy if exists "resumes_delete_own" on storage.objects;
end $$;

create policy "resumes_read_own" on storage.objects
  for select using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "resumes_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "resumes_update_own" on storage.objects
  for update using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "resumes_delete_own" on storage.objects
  for delete using (
    bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
  );
