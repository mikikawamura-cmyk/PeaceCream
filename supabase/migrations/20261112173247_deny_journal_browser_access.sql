-- Explicit deny in addition to no schema/table grants.
create policy pc_no_browser_journal on private.pc_deletions for all to anon,authenticated using(false) with check(false);
-- Journals only need to outlive the approved 30-day rolling backup window.
create or replace function private.pc_log_deletion() returns trigger language plpgsql security definer set search_path='' set timezone='UTC' as $$begin
 insert into private.pc_deletions(submission_id,cohort_key,expires_on)
 values(old.id,jsonb_build_array(old.event,extract(year from old.participation_date)::integer,old.mode,old.version)::text,current_date+35)
 on conflict(submission_id) do update set expires_on=greatest(private.pc_deletions.expires_on,excluded.expires_on);
 return old;end$$;
revoke all on function private.pc_log_deletion() from public,anon,authenticated;
update private.pc_deletions set expires_on=least(expires_on,(deleted_at at time zone 'UTC')::date+35);
