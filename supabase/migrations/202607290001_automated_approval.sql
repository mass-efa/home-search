-- Automated approval persistence and server-only write authority.
-- Apply with automatic delivery disabled.

alter table public.home_buddy_ai_evaluations
  add column if not exists candidate jsonb not null default '{}'::jsonb,
  add column if not exists validator_results jsonb not null default '[]'::jsonb,
  add column if not exists independent_evaluation jsonb not null default '{}'::jsonb,
  add column if not exists approval_decision jsonb not null default '{}'::jsonb;

drop policy if exists "home buddy owners can insert own ai evaluations"
  on public.home_buddy_ai_evaluations;

drop policy if exists "home buddy owners can update own ai evaluations"
  on public.home_buddy_ai_evaluations;

drop policy if exists "home buddy owners can delete own ai evaluations"
  on public.home_buddy_ai_evaluations;

-- Owners retain read access to their own immutable evaluation and approval
-- records. Only the Edge Function's service role can create them.
