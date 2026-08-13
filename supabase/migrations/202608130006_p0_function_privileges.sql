-- Supabase projects can grant newly created public functions directly to API roles.
-- Replace those defaults with the smallest RPC surface used by this application.

begin;

revoke all privileges on function public.home_buddy_has_recent_auth()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.assert_home_buddy_recent_auth()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.create_home_buddy_preference_version(uuid, jsonb, text, timestamptz)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.release_home_buddy_result(uuid, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.schedule_home_buddy_retry(uuid, integer, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.revoke_home_buddy_result(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.complete_home_buddy_release_audit(uuid, text, text, text)
  from public, anon, authenticated, service_role;

grant execute on function public.home_buddy_has_recent_auth() to authenticated;
grant execute on function public.assert_home_buddy_recent_auth() to authenticated;
grant execute on function public.create_home_buddy_preference_version(uuid, jsonb, text, timestamptz)
  to authenticated;
grant execute on function public.release_home_buddy_result(uuid, text) to authenticated;
grant execute on function public.schedule_home_buddy_retry(uuid, integer, text) to authenticated;
grant execute on function public.revoke_home_buddy_result(uuid, text, text) to authenticated;
grant execute on function public.complete_home_buddy_release_audit(uuid, text, text, text)
  to authenticated;

revoke all privileges on function public.automatically_release_home_buddy_result(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.home_buddy_evaluation_has_authoritative_preferences(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.automatically_release_home_buddy_result(uuid) to service_role;
grant execute on function public.home_buddy_evaluation_has_authoritative_preferences(uuid, uuid)
  to service_role;

-- Trigger helpers are not public RPCs. Their triggers continue to execute with
-- the function ownership and trigger definitions established by prior migrations.
revoke all privileges on function public.validate_home_buddy_product_event()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.validate_home_buddy_document_ownership()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.validate_home_buddy_preference_version()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.enforce_home_buddy_recent_auth_on_release()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.enforce_home_buddy_automatic_preference_pin()
  from public, anon, authenticated, service_role;

commit;
