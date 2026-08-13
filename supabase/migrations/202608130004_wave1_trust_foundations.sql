-- Wave 1 trust foundations. Additive and disabled-by-default for production.

begin;
set local lock_timeout = '5s';

alter table public.home_buddy_evaluation_requests
  add column if not exists preference_version_id uuid,
  add column if not exists analysis_policy_version text not null default 'analysis-depth-policy:v1';

alter table public.home_buddy_evaluation_requests
  drop constraint if exists home_buddy_request_stage_allowed;
alter table public.home_buddy_evaluation_requests
  add constraint home_buddy_request_stage_allowed
  check (decision_stage in ('considering-tour', 'post-tour', 'pre-offer')) not valid;
alter table public.home_buddy_evaluation_requests
  drop constraint if exists home_buddy_request_depth_allowed;
alter table public.home_buddy_evaluation_requests
  add constraint home_buddy_request_depth_allowed
  check (analysis_depth in ('quick-scan', 'decision-brief', 'deep-decision-pack')) not valid;

create table if not exists public.home_buddy_preference_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.home_buddy_workspaces (id) on delete cascade,
  version integer not null check (version > 0),
  preferences jsonb not null default '{}'::jsonb,
  source text not null default 'buyer_confirmed'
    check (source in ('buyer_confirmed', 'conversation', 'tour_debrief', 'voice_transcript', 'import')),
  confirmation_status text not null default 'confirmed'
    check (confirmation_status in ('draft', 'confirmed', 'superseded')),
  effective_at timestamptz not null default now(),
  last_confirmed_at timestamptz,
  supersedes_id uuid references public.home_buddy_preference_versions (id),
  created_at timestamptz not null default now(),
  unique (workspace_id, version),
  check (length(preferences::text) <= 100000)
);
create index if not exists home_buddy_preference_versions_owner_idx
  on public.home_buddy_preference_versions (owner_id, workspace_id, version desc);
alter table public.home_buddy_preference_versions enable row level security;
drop policy if exists "owners can read own preference versions"
  on public.home_buddy_preference_versions;
create policy "owners can read own preference versions"
  on public.home_buddy_preference_versions for select using (auth.uid() = owner_id);
drop policy if exists "owners can insert own preference versions"
  on public.home_buddy_preference_versions;
create policy "owners can insert own preference versions"
  on public.home_buddy_preference_versions for insert with check (
    auth.uid() = owner_id and exists (
      select 1 from public.home_buddy_workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

create or replace function public.validate_home_buddy_preference_version()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.home_buddy_workspaces w
    where w.id = new.workspace_id and w.owner_id = new.owner_id
  ) then raise exception 'invalid_preference_workspace'; end if;
  if new.supersedes_id is not null and not exists (
    select 1 from public.home_buddy_preference_versions p
    where p.id = new.supersedes_id and p.owner_id = new.owner_id
      and p.workspace_id = new.workspace_id
  ) then raise exception 'invalid_preference_predecessor'; end if;
  return new;
end;
$$;
drop trigger if exists home_buddy_preference_version_validate
  on public.home_buddy_preference_versions;
create trigger home_buddy_preference_version_validate
before insert on public.home_buddy_preference_versions
for each row execute function public.validate_home_buddy_preference_version();

alter table public.home_buddy_evaluation_requests
  drop constraint if exists home_buddy_evaluation_requests_preference_version_id_fkey;
alter table public.home_buddy_evaluation_requests
  add constraint home_buddy_evaluation_requests_preference_version_id_fkey
  foreign key (preference_version_id) references public.home_buddy_preference_versions (id) on delete set null;
alter table public.home_buddy_ai_evaluations
  add column if not exists preference_version_id uuid
    references public.home_buddy_preference_versions (id) on delete set null,
  add column if not exists analysis_policy jsonb not null default '{}'::jsonb,
  add column if not exists source_coverage jsonb not null default '{}'::jsonb;

-- Media remains private. Video is deliberately outside the accepted contract.
alter table public.home_buddy_documents
  add column if not exists media_kind text generated always as (
    case when media_type = 'application/pdf' then 'document' else 'image' end
  ) stored,
  add column if not exists content_verified_at timestamptz;
alter table public.home_buddy_documents
  drop constraint if exists home_buddy_documents_no_video;
alter table public.home_buddy_documents
  add constraint home_buddy_documents_no_video
  check (media_type not like 'video/%');

create table if not exists public.home_buddy_release_audits (
  id uuid primary key default gen_random_uuid(),
  released_result_id uuid not null references public.home_buddy_released_results (id) on delete cascade,
  request_id uuid not null references public.home_buddy_evaluation_requests (id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'in_progress', 'passed', 'finding', 'revoked', 'cancelled')),
  sampling_reason text not null,
  due_at timestamptz not null,
  assigned_to uuid references auth.users (id),
  completed_at timestamptz,
  finding_code text,
  notes text,
  created_at timestamptz not null default now(),
  unique (released_result_id)
);
create index if not exists home_buddy_release_audits_queue_idx
  on public.home_buddy_release_audits (status, due_at);
alter table public.home_buddy_release_audits enable row level security;
drop policy if exists "active staff can read release audits"
  on public.home_buddy_release_audits;
create policy "active staff can read release audits"
  on public.home_buddy_release_audits for select using (exists (
    select 1 from public.home_buddy_staff_roles s
    where s.user_id = auth.uid() and s.active
  ));

alter table public.home_buddy_released_results
  add column if not exists correction_of_result_id uuid
    references public.home_buddy_released_results (id),
  add column if not exists audit_status text not null default 'not_selected'
    check (audit_status in ('not_selected', 'queued', 'passed', 'finding', 'revoked'));

alter table public.home_buddy_release_controls
  add column if not exists audit_sample_percent integer not null default 100
    check (audit_sample_percent between 0 and 100),
  add column if not exists first_release_full_audit_count integer not null default 20
    check (first_release_full_audit_count >= 0),
  add column if not exists audit_due_hours integer not null default 24
    check (audit_due_hours between 1 and 168);

alter table public.home_buddy_operation_events
  drop constraint if exists home_buddy_operation_events_event_name_check;
alter table public.home_buddy_operation_events
  add constraint home_buddy_operation_events_event_name_check check (event_name in (
    'analysis_started', 'analysis_succeeded', 'analysis_failed',
    'retry_scheduled', 'automatic_release_succeeded', 'automatic_release_blocked',
    'document_registered', 'document_processing_failed',
    'release_audit_queued', 'release_audit_completed', 'result_revoked'
  ));

create or replace function public.assert_home_buddy_recent_auth()
returns void language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_iat double precision;
  v_session_id uuid;
  v_authenticated_at timestamptz;
begin
  v_iat := nullif(auth.jwt()->>'iat', '')::double precision;
  v_session_id := nullif(auth.jwt()->>'session_id', '')::uuid;
  if v_session_id is not null then
    select created_at into v_authenticated_at from auth.sessions
      where id = v_session_id and user_id = auth.uid();
  end if;
  if v_iat is null or v_authenticated_at is null
    or v_authenticated_at < now() - interval '24 hours'
    or to_timestamp(v_iat) < v_authenticated_at - interval '5 minutes' then
    raise exception 'reauthentication_required' using errcode = '28000';
  end if;
end;
$$;
revoke all on function public.assert_home_buddy_recent_auth() from public;
grant execute on function public.assert_home_buddy_recent_auth() to authenticated;

-- Replace automatic finalization with an atomic, idempotent, version-safe form.
create or replace function public.automatically_release_home_buddy_result(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_request public.home_buddy_evaluation_requests;
  v_evaluation public.home_buddy_ai_evaluations;
  v_control public.home_buddy_release_controls;
  v_result_id uuid;
  v_existing_id uuid;
  v_failed_gate boolean;
  v_version integer;
  v_correction_of uuid;
  v_audit boolean;
  v_reason text;
begin
  if auth.role() <> 'service_role' then raise exception 'not_authorized'; end if;
  select * into v_control from public.home_buddy_release_controls where id for update;
  if not coalesce(v_control.automatic_release_enabled, false)
    or v_control.automatic_releases_used >= v_control.max_automatic_releases then
    raise exception 'automatic_release_disabled_or_limit_reached';
  end if;
  select * into v_request from public.home_buddy_evaluation_requests
    where id = p_request_id for update;
  if v_request.id is null then raise exception 'request_not_releasable'; end if;
  select id into v_existing_id from public.home_buddy_released_results
    where request_id = v_request.id and evaluation_id = v_request.latest_evaluation_id
      and withdrawn_at is null order by version desc limit 1;
  if v_existing_id is not null then return v_existing_id; end if;
  if v_request.status <> 'in_review' then raise exception 'request_not_releasable'; end if;
  select * into v_evaluation from public.home_buddy_ai_evaluations
    where id = v_request.latest_evaluation_id and request_id = v_request.id;
  if v_evaluation.id is null then raise exception 'evaluation_missing'; end if;
  select exists (
    select 1 from jsonb_array_elements(v_evaluation.validator_results) gate
    where gate->>'status' <> 'pass'
  ) into v_failed_gate;
  if v_failed_gate
    or v_evaluation.independent_evaluation->>'status' <> 'passed'
    or v_evaluation.approval_decision->>'outcome' <> 'auto_approved'
    or v_evaluation.approval_decision->>'inputHash' <> v_evaluation.input_hash
    or v_evaluation.independent_evaluation->>'inputHash' <> v_evaluation.input_hash
    or not (
      coalesce(v_evaluation.source_coverage->'schools'->>'status', 'missing') = 'complete'
      or (
        v_request.decision_stage = 'pre_tour'
        and v_request.analysis_depth = 'quick-scan'
        and v_evaluation.source_coverage->'schools'->>'status' = 'current_year_gap'
        and coalesce((v_evaluation.source_coverage->'schools'->>'suppressCurrentAssignmentConclusion')::boolean, false)
        and v_evaluation.source_coverage->'schools'->>'officialVerificationUrl' like 'https://%'
      )
    )
    or coalesce(v_evaluation.source_coverage->'safety'->>'status', 'missing') <> 'complete' then
    raise exception 'approval_requirements_not_met';
  end if;
  select coalesce(max(version), 0) + 1 into v_version
    from public.home_buddy_released_results where request_id = v_request.id;
  select id into v_correction_of from public.home_buddy_released_results
    where request_id = v_request.id and withdrawn_at is not null
    order by version desc limit 1;
  v_audit := v_control.automatic_releases_used < v_control.first_release_full_audit_count
    or (random() * 100) < v_control.audit_sample_percent;
  v_reason := case when v_control.automatic_releases_used < v_control.first_release_full_audit_count
    then 'initial_cohort' else 'random_sample' end;
  insert into public.home_buddy_released_results (
    request_id, evaluation_id, owner_id, version, result_payload,
    approval_manifest, release_mode, released_by, audit_status, correction_of_result_id
  ) values (
    v_request.id, v_evaluation.id, v_request.owner_id, v_version, v_evaluation.candidate,
    v_evaluation.approval_decision, 'automatic', null,
    case when v_audit then 'queued' else 'not_selected' end, v_correction_of
  ) returning id into v_result_id;
  update public.home_buddy_evaluation_requests set
    status = 'ready', safe_status_message = 'Decision packet ready.',
    released_at = now() where id = v_request.id;
  update public.home_buddy_release_controls set
    automatic_releases_used = automatic_releases_used + 1, updated_at = now() where id;
  if v_audit then
    insert into public.home_buddy_release_audits (
      released_result_id, request_id, sampling_reason, due_at
    ) values (
      v_result_id, v_request.id, v_reason,
      now() + make_interval(hours => v_control.audit_due_hours)
    );
    insert into public.home_buddy_operation_events (
      request_id, evaluation_id, event_name, metadata
    ) values (
      v_request.id, v_evaluation.id, 'release_audit_queued',
      jsonb_build_object('releasedResultId', v_result_id, 'samplingReason', v_reason)
    );
  end if;
  insert into public.home_buddy_operation_events (
    request_id, evaluation_id, event_name, metadata
  ) values (v_request.id, v_evaluation.id, 'automatic_release_succeeded',
    jsonb_build_object('policyVersion', v_evaluation.policy_version, 'auditQueued', v_audit));
  return v_result_id;
end;
$$;
revoke all on function public.automatically_release_home_buddy_result(uuid) from public;
grant execute on function public.automatically_release_home_buddy_result(uuid) to service_role;

create or replace function public.revoke_home_buddy_result(
  p_released_result_id uuid,
  p_reason_code text,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_result public.home_buddy_released_results;
begin
  perform public.assert_home_buddy_recent_auth();
  select role into v_role from public.home_buddy_staff_roles
    where user_id = auth.uid() and active and role in ('release_manager', 'admin');
  if v_role is null then raise exception 'not_authorized'; end if;
  if p_reason_code !~ '^[a-z0-9_]{1,80}$' then raise exception 'invalid_reason_code'; end if;
  select * into v_result from public.home_buddy_released_results
    where id = p_released_result_id for update;
  if v_result.id is null then raise exception 'result_not_found'; end if;
  if v_result.withdrawn_at is not null then return; end if;
  update public.home_buddy_released_results set
    withdrawn_at = now(), withdrawal_reason_code = p_reason_code, audit_status = 'revoked'
    where id = v_result.id;
  update public.home_buddy_evaluation_requests set
    status = 'withdrawn',
    safe_status_message = 'We withdrew this result while we correct an issue. Your original request remains private.'
    where id = v_result.request_id;
  update public.home_buddy_release_audits set
    status = 'revoked', completed_at = coalesce(completed_at, now()),
    finding_code = coalesce(finding_code, p_reason_code), notes = left(p_note, 2000)
    where released_result_id = v_result.id;
  insert into public.home_buddy_review_events (
    request_id, evaluation_id, reviewer_id, action, reason_code, notes
  ) values (
    v_result.request_id, v_result.evaluation_id, auth.uid(), 'withdrawn',
    p_reason_code, left(p_note, 2000)
  );
  insert into public.home_buddy_operation_events (
    request_id, evaluation_id, event_name, error_code, metadata
  ) values (v_result.request_id, v_result.evaluation_id, 'result_revoked', p_reason_code, '{}');
end;
$$;
revoke all on function public.revoke_home_buddy_result(uuid, text, text) from public;
grant execute on function public.revoke_home_buddy_result(uuid, text, text) to authenticated;

create or replace function public.complete_home_buddy_release_audit(
  p_audit_id uuid,
  p_outcome text,
  p_finding_code text default null,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_audit public.home_buddy_release_audits;
begin
  perform public.assert_home_buddy_recent_auth();
  select role into v_role from public.home_buddy_staff_roles
    where user_id = auth.uid() and active;
  if v_role is null then raise exception 'not_authorized'; end if;
  if p_outcome not in ('passed', 'finding') then raise exception 'invalid_audit_outcome'; end if;
  if p_outcome = 'finding' and coalesce(p_finding_code, '') !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'finding_code_required';
  end if;
  select * into v_audit from public.home_buddy_release_audits
    where id = p_audit_id and status in ('queued', 'in_progress') for update;
  if v_audit.id is null then raise exception 'audit_not_completable'; end if;
  update public.home_buddy_release_audits set
    status = p_outcome, assigned_to = auth.uid(), completed_at = now(),
    finding_code = case when p_outcome = 'finding' then p_finding_code else null end,
    notes = left(p_note, 2000)
    where id = v_audit.id;
  update public.home_buddy_released_results set audit_status = p_outcome
    where id = v_audit.released_result_id and withdrawn_at is null;
  insert into public.home_buddy_operation_events (
    request_id, event_name, error_code, metadata
  ) values (
    v_audit.request_id, 'release_audit_completed',
    case when p_outcome = 'finding' then p_finding_code else null end,
    jsonb_build_object('outcome', p_outcome, 'releasedResultId', v_audit.released_result_id)
  );
end;
$$;
revoke all on function public.complete_home_buddy_release_audit(uuid, text, text, text) from public;
grant execute on function public.complete_home_buddy_release_audit(uuid, text, text, text) to authenticated;

-- Sensitive authenticated writes require a token issued within the last 24 hours.
create or replace function public.enforce_home_buddy_recent_auth_on_release()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' then perform public.assert_home_buddy_recent_auth(); end if;
  return new;
end;
$$;
drop trigger if exists home_buddy_release_recent_auth on public.home_buddy_released_results;
create trigger home_buddy_release_recent_auth
before insert or update on public.home_buddy_released_results
for each row execute function public.enforce_home_buddy_recent_auth_on_release();

commit;
