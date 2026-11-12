-- Advisor hardening for the isolated test project. No public access is added.
-- Policy dependencies follow this function's OID when it moves.
alter function public.pc_role() set schema private;
revoke all on function private.pc_role() from public,anon,service_role;
grant execute on function private.pc_role() to authenticated;
alter policy pc_own_role on public.pc_organizers using(user_id=(select auth.uid()));
create index pc_exports_organizer on public.pc_exports(organizer_id);
-- Explicit default-deny policies; service_role remains the server-only access path.
create policy pc_audit_deny_browser on public.pc_exports for all to anon,authenticated using(false) with check(false);
create policy pc_limits_deny_browser on private.pc_limits for all to anon,authenticated using(false) with check(false);
-- Supabase's automatic-RLS event trigger runs as its owner, not an API visitor.
do $hardening$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke all on function public.rls_auto_enable() from public,anon,authenticated,service_role;
 end if;
end $hardening$;
