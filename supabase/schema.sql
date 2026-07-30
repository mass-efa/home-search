-- Home-Finding Buddy MVP Supabase schema.
--
-- Run this in the Supabase SQL editor for the project that will back app.html.
-- The static app stores the current MVP workspace as JSONB so the buyer-facing
-- loop can persist across devices before we normalize the full data model.

create extension if not exists pgcrypto;

create table if not exists public.home_buddy_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Home Search',
  app_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_buddy_workspaces_owner_id_idx
  on public.home_buddy_workspaces (owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists home_buddy_workspaces_set_updated_at
  on public.home_buddy_workspaces;

create trigger home_buddy_workspaces_set_updated_at
before update on public.home_buddy_workspaces
for each row
execute function public.set_updated_at();

alter table public.home_buddy_workspaces enable row level security;

drop policy if exists "home buddy owners can read own workspaces"
  on public.home_buddy_workspaces;
create policy "home buddy owners can read own workspaces"
  on public.home_buddy_workspaces
  for select
  using (auth.uid() = owner_id);

drop policy if exists "home buddy owners can insert own workspaces"
  on public.home_buddy_workspaces;
create policy "home buddy owners can insert own workspaces"
  on public.home_buddy_workspaces
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "home buddy owners can update own workspaces"
  on public.home_buddy_workspaces;
create policy "home buddy owners can update own workspaces"
  on public.home_buddy_workspaces
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "home buddy owners can delete own workspaces"
  on public.home_buddy_workspaces;
create policy "home buddy owners can delete own workspaces"
  on public.home_buddy_workspaces
  for delete
  using (auth.uid() = owner_id);

create table if not exists public.home_buddy_ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.home_buddy_workspaces (id) on delete cascade,
  listing_id text not null,
  rubric_version text not null default 'home-evaluation:v1',
  model text,
  status text not null default 'complete',
  listing_snapshot jsonb not null default '{}'::jsonb,
  buyer_context jsonb not null default '{}'::jsonb,
  evaluation jsonb not null default '{}'::jsonb,
  candidate jsonb not null default '{}'::jsonb,
  validator_results jsonb not null default '[]'::jsonb,
  independent_evaluation jsonb not null default '{}'::jsonb,
  approval_decision jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_buddy_ai_evaluations
  add column if not exists candidate jsonb not null default '{}'::jsonb,
  add column if not exists validator_results jsonb not null default '[]'::jsonb,
  add column if not exists independent_evaluation jsonb not null default '{}'::jsonb,
  add column if not exists approval_decision jsonb not null default '{}'::jsonb;

create index if not exists home_buddy_ai_evaluations_owner_id_idx
  on public.home_buddy_ai_evaluations (owner_id);

create index if not exists home_buddy_ai_evaluations_workspace_id_idx
  on public.home_buddy_ai_evaluations (workspace_id);

drop trigger if exists home_buddy_ai_evaluations_set_updated_at
  on public.home_buddy_ai_evaluations;

create trigger home_buddy_ai_evaluations_set_updated_at
before update on public.home_buddy_ai_evaluations
for each row
execute function public.set_updated_at();

alter table public.home_buddy_ai_evaluations enable row level security;

drop policy if exists "home buddy owners can read own ai evaluations"
  on public.home_buddy_ai_evaluations;
create policy "home buddy owners can read own ai evaluations"
  on public.home_buddy_ai_evaluations
  for select
  using (auth.uid() = owner_id);

drop policy if exists "home buddy owners can insert own ai evaluations"
  on public.home_buddy_ai_evaluations;

drop policy if exists "home buddy owners can update own ai evaluations"
  on public.home_buddy_ai_evaluations;

drop policy if exists "home buddy owners can delete own ai evaluations"
  on public.home_buddy_ai_evaluations;
