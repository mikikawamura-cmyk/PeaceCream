-- Minimal deletion metadata, never participant words, answers, or receipt tokens.
create table private.pc_deletions(
 submission_id uuid primary key,cohort_key text not null,
 deleted_at timestamptz not null default now(),expires_on date not null
);
alter table private.pc_deletions enable row level security;
revoke all on private.pc_deletions from public,anon,authenticated;
grant all on private.pc_deletions to service_role;
create function private.pc_log_deletion() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into private.pc_deletions(submission_id,cohort_key,expires_on)
 values(old.id,jsonb_build_array(old.event,extract(year from old.participation_date)::integer,old.mode,old.version)::text,greatest(old.expires_on,current_date+35))
 on conflict(submission_id) do update set expires_on=greatest(private.pc_deletions.expires_on,excluded.expires_on);
 return old;end$$;
revoke all on function private.pc_log_deletion() from public,anon,authenticated;
create trigger pc_record_deletion after delete on public.pc_submissions for each row execute function private.pc_log_deletion();

-- One SQL statement gives a consistent logical application-data snapshot.
-- Auth credentials, sessions and platform settings are deliberately excluded.
create function public.pc_recovery_snapshot(p_kind text default 'backup') returns jsonb language plpgsql security definer set search_path='' as $$begin
 if p_kind not in ('backup','journal') then raise exception 'Invalid snapshot type';end if;
 if (select count(*) from public.pc_submissions)>10000 then raise exception 'Pilot snapshot capacity exceeded; use reviewed database backup tooling';end if;
 return jsonb_build_object('format',1,'kind',p_kind,'capturedAt',now(),
 'deletions',coalesce((select jsonb_agg(to_jsonb(d)) from private.pc_deletions d),'[]'::jsonb),
 'tables',case when p_kind='backup' then jsonb_build_object(
 'pc_submissions',coalesce((select jsonb_agg(to_jsonb(s)) from public.pc_submissions s),'[]'::jsonb),
 'pc_text',coalesce((select jsonb_agg(to_jsonb(t)) from public.pc_text t),'[]'::jsonb),
 'pc_reports',coalesce((select jsonb_agg(to_jsonb(r)) from public.pc_reports r),'[]'::jsonb),
 'pc_exports',coalesce((select jsonb_agg(to_jsonb(e)) from public.pc_exports e),'[]'::jsonb)) else '{}'::jsonb end);
end$$;
create function public.pc_replay_deletions(p_entries jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare d jsonb;n integer:=0;changed integer;begin
 if jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>20000 then raise exception 'Invalid deletion journal';end if;
 for d in select value from jsonb_array_elements(p_entries) loop
  if not(d ? 'submission_id' and d ? 'cohort_key' and d ? 'expires_on') then raise exception 'Invalid deletion entry';end if;
  -- Match the snapshot's cohort_key representation semantically, not whitespace.
  update public.pc_reports set published=false,data='{}'::jsonb where retention='limited' and cohort_key::jsonb=(d->>'cohort_key')::jsonb;
  delete from public.pc_submissions where id=(d->>'submission_id')::uuid;get diagnostics changed=row_count;n:=n+changed;
  insert into private.pc_deletions(submission_id,cohort_key,deleted_at,expires_on) values((d->>'submission_id')::uuid,d->>'cohort_key',coalesce((d->>'deleted_at')::timestamptz,now()),(d->>'expires_on')::date)
   on conflict(submission_id) do update set expires_on=greatest(private.pc_deletions.expires_on,excluded.expires_on);
 end loop;
 return jsonb_build_object('replayed',jsonb_array_length(p_entries),'removed',n);
end$$;
revoke all on function public.pc_recovery_snapshot(text),public.pc_replay_deletions(jsonb) from public,anon,authenticated;
grant execute on function public.pc_recovery_snapshot(text),public.pc_replay_deletions(jsonb) to service_role;
create or replace function public.pc_retention() returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;begin
 delete from public.pc_submissions where expires_on<=current_date;get diagnostics n=row_count;
 delete from public.pc_reports where retention='limited' and expires_on<=current_date;
 delete from public.pc_exports where expires_on<=current_date;
 delete from private.pc_limits where started_at<now()-interval '1 day';
 delete from private.pc_deletions where expires_on<=current_date;
 return jsonb_build_object('expiredSubmissionsDeleted',n);end$$;
-- Dates must not depend on an operator/client session timezone.
alter function public.pc_submit(jsonb) set timezone='UTC';
alter function public.pc_manage(uuid,text,text,integer) set timezone='UTC';
alter function public.pc_retention() set timezone='UTC';
alter function private.pc_log_deletion() set timezone='UTC';
