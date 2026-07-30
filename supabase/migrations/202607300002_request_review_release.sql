-- First-five-user request lifecycle, manual release, and privacy-safe events.
-- Internal evaluation artifacts are never buyer-readable. Buyers see only
-- owner-safe request status and immutable released results.

create table if not exists public.home_buddy_staff_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('reviewer', 'release_manager', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_buddy_evaluation_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.home_buddy_workspaces (id) on delete set null,
  listing_id text not null,
  listing_label text not null default 'Home evaluation',
  decision_stage text not null default 'considering-tour',
  analysis_depth text not null default 'decision-brief',
  status text not null default 'submitted'
    check (status in (
      'submitted', 'in_analysis', 'in_review', 'needs_buyer_input',
      'ready', 'failed', 'cancelled', 'withdrawn'
    )),
  safe_status_message text not null default 'Your request was received.',
  latest_evaluation_id uuid,
  idempotency_key text not null,
  submitted_at timestamptz not null default now(),
  analysis_started_at timestamptz,
  analysis_completed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

alter table public.home_buddy_ai_evaluations
  add column if not exists request_id uuid
    references public.home_buddy_evaluation_requests (id) on delete set null,
  add column if not exists attempt integer not null default 1,
  add column if not exists input_hash text,
  add column if not exists policy_version text;

alter table public.home_buddy_evaluation_requests
  drop constraint if exists home_buddy_evaluation_requests_latest_evaluation_id_fkey;
alter table public.home_buddy_evaluation_requests
  add constraint home_buddy_evaluation_requests_latest_evaluation_id_fkey
  foreign key (latest_evaluation_id)
  references public.home_buddy_ai_evaluations (id)
  on delete set null;

create table if not exists public.home_buddy_released_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.home_buddy_evaluation_requests (id) on delete cascade,
  evaluation_id uuid not null references public.home_buddy_ai_evaluations (id),
  owner_id uuid not null references auth.users (id) on delete cascade,
  version integer not null default 1,
  result_payload jsonb not null,
  approval_manifest jsonb not null default '{}'::jsonb,
  release_mode text not null check (release_mode in ('automatic', 'manual')),
  released_by uuid references auth.users (id),
  released_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  withdrawal_reason_code text,
  unique (request_id, version)
);

create table if not exists public.home_buddy_review_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.home_buddy_evaluation_requests (id) on delete cascade,
  evaluation_id uuid references public.home_buddy_ai_evaluations (id),
  reviewer_id uuid not null references auth.users (id),
  action text not null check (action in (
    'opened', 'released', 'correction_requested',
    'buyer_input_requested', 'failed', 'withdrawn'
  )),
  reason_code text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.home_buddy_product_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  anonymous_session_id text not null,
  request_id uuid references public.home_buddy_evaluation_requests (id) on delete set null,
  event_name text not null check (event_name in (
    'landing_view', 'listing_url_entered', 'listing_submitted',
    'listing_validated', 'request_step_viewed', 'request_reviewed',
    'auth_started', 'auth_link_requested', 'auth_link_sent',
    'auth_completed', 'auth_gate_viewed', 'request_started',
    'analysis_failed', 'report_ready', 'report_opened',
    'evidence_expanded', 'debrief_started', 'second_home_started',
    'view_opened'
  )),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

create index if not exists home_buddy_requests_owner_created_idx
  on public.home_buddy_evaluation_requests (owner_id, created_at desc);
create index if not exists home_buddy_requests_queue_idx
  on public.home_buddy_evaluation_requests (status, updated_at);
create index if not exists home_buddy_ai_evaluations_request_idx
  on public.home_buddy_ai_evaluations (request_id, attempt desc);
create unique index if not exists home_buddy_ai_evaluations_request_attempt_idx
  on public.home_buddy_ai_evaluations (request_id, attempt)
  where request_id is not null;
create index if not exists home_buddy_product_events_name_time_idx
  on public.home_buddy_product_events (event_name, occurred_at);

drop trigger if exists home_buddy_staff_roles_set_updated_at
  on public.home_buddy_staff_roles;
create trigger home_buddy_staff_roles_set_updated_at
before update on public.home_buddy_staff_roles
for each row execute function public.set_updated_at();

drop trigger if exists home_buddy_evaluation_requests_set_updated_at
  on public.home_buddy_evaluation_requests;
create trigger home_buddy_evaluation_requests_set_updated_at
before update on public.home_buddy_evaluation_requests
for each row execute function public.set_updated_at();

alter table public.home_buddy_staff_roles enable row level security;
alter table public.home_buddy_evaluation_requests enable row level security;
alter table public.home_buddy_released_results enable row level security;
alter table public.home_buddy_review_events enable row level security;
alter table public.home_buddy_product_events enable row level security;

-- Close the previous withholding bypass: buyers cannot query internal drafts,
-- validators, candidates, evaluator output, or raw errors.
drop policy if exists "home buddy owners can read own ai evaluations"
  on public.home_buddy_ai_evaluations;

create policy "staff can read own active role"
  on public.home_buddy_staff_roles for select
  using (auth.uid() = user_id and active);

create policy "owners can read safe request status"
  on public.home_buddy_evaluation_requests for select
  using (auth.uid() = owner_id);

create policy "owners can read released results"
  on public.home_buddy_released_results for select
  using (auth.uid() = owner_id and withdrawn_at is null);

create policy "active staff can read evaluation requests"
  on public.home_buddy_evaluation_requests for select
  using (exists (
    select 1 from public.home_buddy_staff_roles staff
    where staff.user_id = auth.uid() and staff.active
  ));

create policy "active staff can read internal evaluations"
  on public.home_buddy_ai_evaluations for select
  using (exists (
    select 1 from public.home_buddy_staff_roles staff
    where staff.user_id = auth.uid() and staff.active
  ));

create policy "active staff can read released results"
  on public.home_buddy_released_results for select
  using (exists (
    select 1 from public.home_buddy_staff_roles staff
    where staff.user_id = auth.uid() and staff.active
  ));

create policy "active staff can read review events"
  on public.home_buddy_review_events for select
  using (exists (
    select 1 from public.home_buddy_staff_roles staff
    where staff.user_id = auth.uid() and staff.active
  ));

create policy "active staff can read product events"
  on public.home_buddy_product_events for select
  using (exists (
    select 1 from public.home_buddy_staff_roles staff
    where staff.user_id = auth.uid() and staff.active
  ));

create policy "owners can insert sanitized product events"
  on public.home_buddy_product_events for insert
  with check (auth.uid() = owner_id);

create or replace function public.validate_home_buddy_product_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_key text;
begin
  if jsonb_typeof(new.properties) <> 'object'
    or length(new.properties::text) > 2000
    or length(new.anonymous_session_id) > 120
    or new.occurred_at < now() - interval '90 days'
    or new.occurred_at > now() + interval '10 minutes' then
    raise exception 'invalid_product_event';
  end if;

  if new.request_id is not null and not exists (
    select 1 from public.home_buddy_evaluation_requests request_row
    where request_row.id = new.request_id
      and request_row.owner_id = new.owner_id
  ) then
    raise exception 'invalid_product_event_request';
  end if;

  for v_key in select jsonb_object_keys(new.properties)
  loop
    if v_key not in (
      'method', 'success', 'view', 'step', 'totalSteps', 'depthDefault',
      'signedIn', 'sourceCategory', 'inputType', 'hasUrl', 'completeness',
      'decisionStage', 'depth', 'documentCount', 'evidenceStatus',
      'hasApprovedBrief', 'returning', 'referrerCategory', 'retryable',
      'source', 'requestId'
    ) then
      raise exception 'invalid_product_event_property';
    end if;
    if jsonb_typeof(new.properties->v_key) not in ('string', 'number', 'boolean', 'null')
      or length(coalesce(new.properties->>v_key, '')) > 120 then
      raise exception 'invalid_product_event_value';
    end if;
    if jsonb_typeof(new.properties->v_key) = 'string'
      and (new.properties->>v_key) !~ '^[A-Za-z0-9_-]{1,120}$' then
      raise exception 'invalid_product_event_string';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists home_buddy_product_events_validate
  on public.home_buddy_product_events;
create trigger home_buddy_product_events_validate
before insert on public.home_buddy_product_events
for each row execute function public.validate_home_buddy_product_event();

create or replace function public.release_home_buddy_result(
  p_request_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.home_buddy_evaluation_requests;
  v_evaluation public.home_buddy_ai_evaluations;
  v_role text;
  v_result_id uuid;
  v_failed_gate boolean;
begin
  select role into v_role
  from public.home_buddy_staff_roles
  where user_id = auth.uid()
    and active
    and role in ('release_manager', 'admin');

  if v_role is null then
    raise exception 'not_authorized';
  end if;

  select * into v_request
  from public.home_buddy_evaluation_requests
  where id = p_request_id
  for update;

  if v_request.id is null or v_request.status <> 'in_review' then
    raise exception 'request_not_releasable';
  end if;

  select * into v_evaluation
  from public.home_buddy_ai_evaluations
  where id = v_request.latest_evaluation_id
    and request_id = v_request.id;

  if v_evaluation.id is null then
    raise exception 'evaluation_missing';
  end if;

  select exists (
    select 1
    from jsonb_array_elements(v_evaluation.validator_results) gate
    where gate->>'status' <> 'pass'
  ) into v_failed_gate;

  if v_failed_gate
    or v_evaluation.independent_evaluation->>'status' <> 'passed'
    or v_evaluation.approval_decision->>'outcome' <> 'auto_approved'
    or v_evaluation.approval_decision->>'inputHash' <> v_evaluation.input_hash
    or v_evaluation.independent_evaluation->>'inputHash' <> v_evaluation.input_hash then
    raise exception 'approval_requirements_not_met';
  end if;

  insert into public.home_buddy_released_results (
    request_id, evaluation_id, owner_id, version, result_payload,
    approval_manifest, release_mode, released_by
  ) values (
    v_request.id,
    v_evaluation.id,
    v_request.owner_id,
    coalesce((
      select max(version) + 1
      from public.home_buddy_released_results
      where request_id = v_request.id
    ), 1),
    v_evaluation.candidate,
    v_evaluation.approval_decision,
    'manual',
    auth.uid()
  )
  returning id into v_result_id;

  update public.home_buddy_evaluation_requests
  set status = 'ready',
      safe_status_message = 'Your reviewed decision packet is ready.',
      released_at = now()
  where id = v_request.id;

  insert into public.home_buddy_review_events (
    request_id, evaluation_id, reviewer_id, action, notes
  ) values (
    v_request.id, v_evaluation.id, auth.uid(), 'released', left(p_note, 2000)
  );

  return v_result_id;
end;
$$;

revoke all on function public.release_home_buddy_result(uuid, text) from public;
grant execute on function public.release_home_buddy_result(uuid, text) to authenticated;
