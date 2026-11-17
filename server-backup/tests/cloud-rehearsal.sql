-- Disposable synthetic-only trial helper. Install only in PeaceCream-Test; remove after trial.
create or replace function public.pc_synthetic_recovery_rehearsal(p_snapshot jsonb,p_entries jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare d jsonb; before_n integer; after_n integer; deleted_n integer; text_n integer; audit_n integer; report_n integer;
begin
 if p_snapshot->>'format'<>'1' or p_snapshot->>'kind'<>'backup' or jsonb_typeof(p_snapshot->'tables'->'pc_submissions')<>'array' or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>20000 then raise exception 'Invalid trial input'; end if;
 if exists(select 1 from jsonb_array_elements(p_snapshot->'tables'->'pc_submissions') x where x->'synthetic' is distinct from 'true'::jsonb) or exists(select 1 from public.pc_submissions where not synthetic) then raise exception 'Synthetic-only trial'; end if;
 create temporary table pc_trial_submissions (like public.pc_submissions including all) on commit drop;
 create temporary table pc_trial_text (like public.pc_text including all) on commit drop;
 alter table pg_temp.pc_trial_text add foreign key(submission_id) references pg_temp.pc_trial_submissions(id) on delete cascade;
 create temporary table pc_trial_reports (like public.pc_reports including all) on commit drop;
 create temporary table pc_trial_exports (like public.pc_exports including all) on commit drop;
 if exists(select 1 from jsonb_array_elements(p_snapshot->'tables'->'pc_exports') x where not exists(select 1 from auth.users u where u.id=(x->>'organizer_id')::uuid)) then raise exception 'Missing historical organizer';end if;
 insert into pg_temp.pc_trial_submissions select * from jsonb_populate_recordset(null::public.pc_submissions,p_snapshot->'tables'->'pc_submissions');
 insert into pg_temp.pc_trial_text select * from jsonb_populate_recordset(null::public.pc_text,p_snapshot->'tables'->'pc_text');
 insert into pg_temp.pc_trial_reports select * from jsonb_populate_recordset(null::public.pc_reports,p_snapshot->'tables'->'pc_reports');
 insert into pg_temp.pc_trial_exports select * from jsonb_populate_recordset(null::public.pc_exports,p_snapshot->'tables'->'pc_exports');
 select count(*) into before_n from pg_temp.pc_trial_submissions;
 for d in select value from jsonb_array_elements(p_entries) loop
  if not(d ? 'submission_id' and d ? 'cohort_key' and d ? 'expires_on') then raise exception 'Invalid trial journal';end if;
  update pg_temp.pc_trial_reports set published=false,data='{}'::jsonb where retention='limited' and cohort_key::jsonb=(d->>'cohort_key')::jsonb;
  delete from pg_temp.pc_trial_submissions where id=(d->>'submission_id')::uuid;
 end loop;
 delete from pg_temp.pc_trial_submissions where expires_on<=current_date;
 delete from pg_temp.pc_trial_reports where retention='limited' and expires_on<=current_date;
 delete from pg_temp.pc_trial_exports where expires_on<=current_date;
 update pg_temp.pc_trial_reports set published=false;
 select count(*) into after_n from pg_temp.pc_trial_submissions;
 select count(*) into deleted_n from pg_temp.pc_trial_submissions s where exists(select 1 from jsonb_array_elements(p_entries) x where (x->>'submission_id')::uuid=s.id);
 select count(*) into text_n from pg_temp.pc_trial_text;
 select count(*) into audit_n from pg_temp.pc_trial_exports;
 select count(*) into report_n from pg_temp.pc_trial_reports where published;
 if deleted_n<>0 or report_n<>0 or exists(select 1 from pg_temp.pc_trial_submissions where expires_on<=current_date) then raise exception 'Unsafe trial restore';end if;
 return jsonb_build_object('ok',true,'scope','temporary-tables-in-test-project','snapshotRows',before_n,'restoredRows',after_n,'withdrawnRowsRemaining',deleted_n,'textRows',text_n,'auditRows',audit_n,'publishedReports',report_n);
exception when others then raise exception 'SYNTHETIC_RECOVERY_REHEARSAL_FAILED';
end$$;
revoke all on function public.pc_synthetic_recovery_rehearsal(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.pc_synthetic_recovery_rehearsal(jsonb,jsonb) to service_role;
