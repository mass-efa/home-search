-- Canonical stage contract, authoritative preference allocation, and 24-hour private reads.

begin;
set local lock_timeout = '5s';

alter table public.home_buddy_evaluation_requests
  drop constraint if exists home_buddy_request_stage_allowed;
update public.home_buddy_evaluation_requests
set decision_stage = case decision_stage
  when 'considering-tour' then 'pre_tour'
  when 'post-tour' then 'post_tour'
  when 'pre-offer' then 'pre_offer'
  else decision_stage
end;
alter table public.home_buddy_evaluation_requests
  add constraint home_buddy_request_stage_allowed
  check (decision_stage in ('pre_tour', 'post_tour', 'pre_offer')) not valid;
alter table public.home_buddy_evaluation_requests
  validate constraint home_buddy_request_stage_allowed;
alter table public.home_buddy_evaluation_requests
  validate constraint home_buddy_request_depth_allowed;

alter table public.home_buddy_documents
  drop constraint if exists home_buddy_documents_byte_size_check;
alter table public.home_buddy_documents
  add constraint home_buddy_documents_byte_size_check
  check (byte_size > 0 and byte_size <= 20971520) not valid;
alter table public.home_buddy_documents
  validate constraint home_buddy_documents_byte_size_check;
update storage.buckets set file_size_limit = 20971520
  where id = 'home-buddy-private-documents';

create or replace function public.home_buddy_has_recent_auth()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = nullif(auth.jwt()->>'session_id', '')::uuid
      and s.user_id = auth.uid()
      and s.created_at >= now() - interval '24 hours'
      and nullif(auth.jwt()->>'iat', '')::double precision is not null
      and to_timestamp((auth.jwt()->>'iat')::double precision) >= s.created_at - interval '5 minutes'
  );
$$;
revoke all on function public.home_buddy_has_recent_auth() from public;
grant execute on function public.home_buddy_has_recent_auth() to authenticated;

create or replace function public.assert_home_buddy_recent_auth()
returns void language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.home_buddy_has_recent_auth() then
    raise exception 'reauthentication_required' using errcode = '28000';
  end if;
end;
$$;

drop policy if exists "home buddy owners can read own workspaces" on public.home_buddy_workspaces;
create policy "home buddy owners can read own workspaces"
  on public.home_buddy_workspaces for select
  using (auth.uid() = owner_id and public.home_buddy_has_recent_auth());
drop policy if exists "home buddy owners can insert own workspaces" on public.home_buddy_workspaces;
create policy "home buddy owners can insert own workspaces"
  on public.home_buddy_workspaces for insert
  with check (auth.uid() = owner_id and public.home_buddy_has_recent_auth());
drop policy if exists "home buddy owners can update own workspaces" on public.home_buddy_workspaces;
create policy "home buddy owners can update own workspaces"
  on public.home_buddy_workspaces for update
  using (auth.uid() = owner_id and public.home_buddy_has_recent_auth())
  with check (auth.uid() = owner_id and public.home_buddy_has_recent_auth());

drop policy if exists "owners can read safe request status" on public.home_buddy_evaluation_requests;
create policy "owners can read safe request status"
  on public.home_buddy_evaluation_requests for select
  using (auth.uid() = owner_id and public.home_buddy_has_recent_auth());

drop policy if exists "owners can read released results" on public.home_buddy_released_results;
create policy "owners can read released results"
  on public.home_buddy_released_results for select
  using (auth.uid() = owner_id and withdrawn_at is null and public.home_buddy_has_recent_auth());

drop policy if exists "owners can read own private documents" on public.home_buddy_documents;
create policy "owners can read own private documents"
  on public.home_buddy_documents for select
  using (auth.uid() = owner_id and public.home_buddy_has_recent_auth());
drop policy if exists "owners can register own private documents" on public.home_buddy_documents;
create policy "owners can register own private documents"
  on public.home_buddy_documents for insert with check (
    auth.uid() = owner_id and processing_status = 'uploaded'
    and public.home_buddy_has_recent_auth()
  );

drop policy if exists "owners can read own preference versions" on public.home_buddy_preference_versions;
create policy "owners can read own preference versions"
  on public.home_buddy_preference_versions for select
  using (auth.uid() = owner_id and public.home_buddy_has_recent_auth());
-- Preference versions are allocated only through the locked, recent-auth RPC below.
drop policy if exists "owners can insert own preference versions"
  on public.home_buddy_preference_versions;

drop policy if exists "owners can read private home documents" on storage.objects;
create policy "owners can read private home documents"
  on storage.objects for select to authenticated using (
    bucket_id = 'home-buddy-private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.home_buddy_has_recent_auth()
  );
drop policy if exists "owners can upload private home documents" on storage.objects;
create policy "owners can upload private home documents"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'home-buddy-private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.home_buddy_has_recent_auth()
  );

-- Atomic allocation prevents two tabs from selecting the same next version.
create or replace function public.create_home_buddy_preference_version(
  p_workspace_id uuid,
  p_preferences jsonb,
  p_source text default 'buyer_confirmed',
  p_last_confirmed_at timestamptz default now()
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_prior public.home_buddy_preference_versions;
  v_id uuid;
begin
  perform public.assert_home_buddy_recent_auth();
  if not exists (select 1 from public.home_buddy_workspaces w
    where w.id = p_workspace_id and w.owner_id = v_owner) then
    raise exception 'workspace_not_found';
  end if;
  if p_source not in ('buyer_confirmed', 'conversation', 'tour_debrief', 'voice_transcript', 'import')
    or jsonb_typeof(p_preferences) <> 'object' or length(p_preferences::text) > 100000 then
    raise exception 'invalid_preference_version';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id::text, 0));
  select * into v_prior from public.home_buddy_preference_versions
    where workspace_id = p_workspace_id order by version desc limit 1 for update;
  insert into public.home_buddy_preference_versions (
    owner_id, workspace_id, version, preferences, source,
    confirmation_status, last_confirmed_at, supersedes_id
  ) values (
    v_owner, p_workspace_id, coalesce(v_prior.version, 0) + 1, p_preferences, p_source,
    'confirmed', coalesce(p_last_confirmed_at, now()), v_prior.id
  ) returning id into v_id;
  if v_prior.id is not null then
    update public.home_buddy_preference_versions set confirmation_status = 'superseded'
      where id = v_prior.id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.create_home_buddy_preference_version(uuid, jsonb, text, timestamptz) from public;
grant execute on function public.create_home_buddy_preference_version(uuid, jsonb, text, timestamptz) to authenticated;

-- Automatic release independently requires a fresh, confirmed, request-matching pin.
create or replace function public.home_buddy_evaluation_has_authoritative_preferences(
  p_request_id uuid,
  p_evaluation_id uuid
)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.home_buddy_evaluation_requests r
    join public.home_buddy_ai_evaluations e on e.id = p_evaluation_id and e.request_id = r.id
    join public.home_buddy_preference_versions p
      on p.id = r.preference_version_id and p.id = e.preference_version_id
      and p.owner_id = r.owner_id and p.workspace_id = r.workspace_id
    where r.id = p_request_id and p.confirmation_status = 'confirmed'
      and p.last_confirmed_at >= now() - interval '30 days'
  );
$$;
revoke all on function public.home_buddy_evaluation_has_authoritative_preferences(uuid, uuid) from public;
grant execute on function public.home_buddy_evaluation_has_authoritative_preferences(uuid, uuid) to service_role;

create or replace function public.enforce_home_buddy_automatic_preference_pin()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.release_mode = 'automatic' and not public.home_buddy_evaluation_has_authoritative_preferences(
    new.request_id, new.evaluation_id
  ) then raise exception 'authoritative_preference_pin_required'; end if;
  return new;
end;
$$;
drop trigger if exists home_buddy_automatic_preference_pin on public.home_buddy_released_results;
create trigger home_buddy_automatic_preference_pin
before insert on public.home_buddy_released_results
for each row execute function public.enforce_home_buddy_automatic_preference_pin();

commit;
