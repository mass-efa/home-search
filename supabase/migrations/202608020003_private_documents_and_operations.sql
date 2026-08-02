-- Private document intake, operational auditability, and guarded automatic release.
-- Automatic release remains disabled until an administrator explicitly enables it.

alter table public.home_buddy_evaluation_requests
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_retry_at timestamptz,
  add column if not exists last_error_code text;

alter table public.home_buddy_product_events
  drop constraint if exists home_buddy_product_events_event_name_check;
alter table public.home_buddy_product_events
  add constraint home_buddy_product_events_event_name_check check (event_name in (
    'landing_view', 'listing_url_entered', 'listing_submitted',
    'listing_validated', 'request_step_viewed', 'request_reviewed',
    'auth_started', 'auth_link_requested', 'auth_link_sent',
    'auth_completed', 'auth_gate_viewed', 'request_started',
    'analysis_failed', 'report_ready', 'report_opened',
    'evidence_expanded', 'debrief_started', 'second_home_started',
    'view_opened', 'documents_added'
  ));

create table if not exists public.home_buddy_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.home_buddy_workspaces (id) on delete cascade,
  request_id uuid references public.home_buddy_evaluation_requests (id) on delete cascade,
  storage_bucket text not null default 'home-buddy-private-documents'
    check (storage_bucket = 'home-buddy-private-documents'),
  storage_path text not null,
  original_filename text not null,
  media_type text not null check (media_type in (
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
  )),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  processing_status text not null default 'uploaded' check (processing_status in (
    'uploaded', 'scanning', 'ready', 'rejected', 'failed', 'deleted'
  )),
  safe_status_message text not null default 'Document uploaded.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  check (storage_path like owner_id::text || '/%')
);

create index if not exists home_buddy_documents_owner_created_idx
  on public.home_buddy_documents (owner_id, created_at desc);
create index if not exists home_buddy_documents_request_idx
  on public.home_buddy_documents (request_id, created_at);

drop trigger if exists home_buddy_documents_set_updated_at on public.home_buddy_documents;
create trigger home_buddy_documents_set_updated_at
before update on public.home_buddy_documents
for each row execute function public.set_updated_at();

create or replace function public.validate_home_buddy_document_ownership()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.workspace_id is not null and not exists (
    select 1 from public.home_buddy_workspaces w
    where w.id = new.workspace_id and w.owner_id = new.owner_id
  ) then raise exception 'invalid_document_workspace'; end if;
  if new.request_id is not null and not exists (
    select 1 from public.home_buddy_evaluation_requests r
    where r.id = new.request_id and r.owner_id = new.owner_id
  ) then raise exception 'invalid_document_request'; end if;
  return new;
end;
$$;

drop trigger if exists home_buddy_documents_validate_ownership on public.home_buddy_documents;
create trigger home_buddy_documents_validate_ownership
before insert or update on public.home_buddy_documents
for each row execute function public.validate_home_buddy_document_ownership();

alter table public.home_buddy_documents enable row level security;
create policy "owners can read own private documents"
  on public.home_buddy_documents for select using (auth.uid() = owner_id);
create policy "owners can register own private documents"
  on public.home_buddy_documents for insert with check (
    auth.uid() = owner_id and processing_status = 'uploaded'
  );
create policy "owners can delete own unprocessed documents"
  on public.home_buddy_documents for delete using (
    auth.uid() = owner_id and processing_status = 'uploaded'
  );
create policy "active staff can read private document metadata"
  on public.home_buddy_documents for select using (exists (
    select 1 from public.home_buddy_staff_roles s
    where s.user_id = auth.uid() and s.active
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'home-buddy-private-documents', 'home-buddy-private-documents', false, 52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners can upload private home documents"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'home-buddy-private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "owners can read private home documents"
  on storage.objects for select to authenticated using (
    bucket_id = 'home-buddy-private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "owners can delete private unprocessed uploads"
  on storage.objects for delete to authenticated using (
    bucket_id = 'home-buddy-private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.home_buddy_documents d
      where d.storage_path = name and d.owner_id = auth.uid()
        and d.processing_status = 'uploaded'
    )
  );

create table if not exists public.home_buddy_operation_events (
  id bigint generated always as identity primary key,
  request_id uuid references public.home_buddy_evaluation_requests (id) on delete set null,
  evaluation_id uuid references public.home_buddy_ai_evaluations (id) on delete set null,
  event_name text not null check (event_name in (
    'analysis_started', 'analysis_succeeded', 'analysis_failed',
    'retry_scheduled', 'automatic_release_succeeded', 'automatic_release_blocked',
    'document_registered', 'document_processing_failed'
  )),
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (length(metadata::text) <= 4000)
);
create index if not exists home_buddy_operation_events_request_time_idx
  on public.home_buddy_operation_events (request_id, created_at desc);
alter table public.home_buddy_operation_events enable row level security;
create policy "active staff can read operation events"
  on public.home_buddy_operation_events for select using (exists (
    select 1 from public.home_buddy_staff_roles s
    where s.user_id = auth.uid() and s.active
  ));

create table if not exists public.home_buddy_release_controls (
  id boolean primary key default true check (id),
  automatic_release_enabled boolean not null default false,
  max_automatic_releases integer not null default 0 check (max_automatic_releases >= 0),
  automatic_releases_used integer not null default 0 check (automatic_releases_used >= 0),
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);
insert into public.home_buddy_release_controls (id) values (true)
on conflict (id) do nothing;
alter table public.home_buddy_release_controls enable row level security;
create policy "admins can read release controls"
  on public.home_buddy_release_controls for select using (exists (
    select 1 from public.home_buddy_staff_roles s
    where s.user_id = auth.uid() and s.active and s.role = 'admin'
  ));

create or replace function public.automatically_release_home_buddy_result(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_request public.home_buddy_evaluation_requests;
  v_evaluation public.home_buddy_ai_evaluations;
  v_control public.home_buddy_release_controls;
  v_result_id uuid;
  v_failed_gate boolean;
begin
  if auth.role() <> 'service_role' then raise exception 'not_authorized'; end if;
  select * into v_control from public.home_buddy_release_controls where id for update;
  if not v_control.automatic_release_enabled
    or v_control.automatic_releases_used >= v_control.max_automatic_releases then
    raise exception 'automatic_release_disabled_or_limit_reached';
  end if;
  select * into v_request from public.home_buddy_evaluation_requests
    where id = p_request_id for update;
  if v_request.id is null or v_request.status <> 'in_review' then
    raise exception 'request_not_releasable';
  end if;
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
    or v_evaluation.independent_evaluation->>'inputHash' <> v_evaluation.input_hash then
    raise exception 'approval_requirements_not_met';
  end if;
  insert into public.home_buddy_released_results (
    request_id, evaluation_id, owner_id, version, result_payload,
    approval_manifest, release_mode, released_by
  ) values (
    v_request.id, v_evaluation.id, v_request.owner_id, 1, v_evaluation.candidate,
    v_evaluation.approval_decision, 'automatic', null
  ) returning id into v_result_id;
  update public.home_buddy_evaluation_requests set
    status = 'ready', safe_status_message = 'Your evidence-checked decision packet is ready.',
    released_at = now() where id = v_request.id;
  update public.home_buddy_release_controls set
    automatic_releases_used = automatic_releases_used + 1,
    updated_at = now() where id;
  insert into public.home_buddy_operation_events (
    request_id, evaluation_id, event_name, metadata
  ) values (v_request.id, v_evaluation.id, 'automatic_release_succeeded',
    jsonb_build_object('policyVersion', v_evaluation.policy_version));
  return v_result_id;
end;
$$;
revoke all on function public.automatically_release_home_buddy_result(uuid) from public;
grant execute on function public.automatically_release_home_buddy_result(uuid) to service_role;

create or replace function public.schedule_home_buddy_retry(
  p_request_id uuid,
  p_delay_seconds integer default 60,
  p_reason_code text default 'staff_requested_retry'
)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_retry_at timestamptz;
  v_evaluation_id uuid;
begin
  select role into v_role from public.home_buddy_staff_roles
  where user_id = auth.uid() and active and role in ('reviewer', 'release_manager', 'admin');
  if v_role is null then raise exception 'not_authorized'; end if;
  if p_delay_seconds < 0 or p_delay_seconds > 86400 then raise exception 'invalid_retry_delay'; end if;
  if p_reason_code !~ '^[a-z0-9_]{1,80}$' then raise exception 'invalid_reason_code'; end if;
  v_retry_at := now() + make_interval(secs => p_delay_seconds);
  update public.home_buddy_evaluation_requests set
    next_retry_at = v_retry_at,
    last_error_code = p_reason_code,
    safe_status_message = 'Your request is saved and queued for another analysis attempt.'
  where id = p_request_id and status = 'failed'
  returning latest_evaluation_id into v_evaluation_id;
  if not found then raise exception 'request_not_retryable'; end if;
  insert into public.home_buddy_operation_events (
    request_id, evaluation_id, event_name, error_code, metadata
  ) values (
    p_request_id, v_evaluation_id, 'retry_scheduled', p_reason_code,
    jsonb_build_object('retryAt', v_retry_at)
  );
  return v_retry_at;
end;
$$;
revoke all on function public.schedule_home_buddy_retry(uuid, integer, text) from public;
grant execute on function public.schedule_home_buddy_retry(uuid, integer, text) to authenticated;
