-- PeaceCream-Test only. This entire synthetic drill rolls back.
begin;
do $$
declare s public.pc_submissions; d jsonb; r jsonb; test_id uuid:=gen_random_uuid(); test_hash text:=repeat('8',64); ck text; expired uuid:=gen_random_uuid();owner_id uuid;
begin
 if exists(select 1 from public.pc_submissions where not synthetic) then raise exception 'Synthetic-only database required';end if;
 select * into strict s from public.pc_submissions limit 1;
 s.id:=test_id;s.token_hash:=test_hash;s.event:='synthetic-recovery-drill';s.participation_date:=current_date;s.expires_on:=(current_date+interval '5 years')::date;
 insert into public.pc_submissions select s.*;
 insert into public.pc_text values(test_id,'Synthetic recovery','Synthetic recovery',null);
 ck:=jsonb_build_array(s.event,extract(year from s.participation_date)::integer,s.mode,s.version)::text;
 insert into public.pc_reports(cohort_key,event,year,mode,version,data,published,expires_on) values(ck,s.event,extract(year from s.participation_date),s.mode,s.version,'{"participants":5}',true,s.expires_on);
 r:=public.pc_recovery_snapshot('backup');if jsonb_array_length(r->'tables'->'pc_submissions')<>25 then raise exception 'Snapshot mismatch';end if;
 if not public.pc_manage(test_id,test_hash,'withdraw',null) then raise exception 'Withdrawal failed';end if;
 select jsonb_agg(to_jsonb(x)) into d from private.pc_deletions x where submission_id=test_id;
 if jsonb_array_length(d)<>1 then raise exception 'Journal missing';end if;
 -- Emulate a restored old application row/text/report, then replay newer deletion.
 insert into public.pc_submissions select s.*;insert into public.pc_text values(test_id,'Synthetic recovery','Synthetic recovery',null);
 update public.pc_reports set published=true,data='{"participants":5}' where cohort_key=ck;
 r:=public.pc_replay_deletions(d);
 if (r->>'removed')::int<>1 or exists(select 1 from public.pc_submissions where id=test_id) or exists(select 1 from public.pc_text where submission_id=test_id) or exists(select 1 from public.pc_reports where cohort_key=ck and (published or data<>'{}'::jsonb)) then raise exception 'Restore replay failed';end if;
 r:=public.pc_replay_deletions(d);if (r->>'removed')::int<>0 then raise exception 'Replay is not idempotent';end if;
 s.id:=expired;s.token_hash:=repeat('9',64);s.participation_date:='2018-01-01';s.expires_on:='2023-01-01';insert into public.pc_submissions select s.*;insert into public.pc_text values(expired,'Expired synthetic','Expired synthetic',null);
 select user_id into strict owner_id from public.pc_organizers where active and role='research_admin';
 insert into public.pc_exports(organizer_id,kind,reason,expires_on) values(owner_id,'raw','Synthetic expired audit recovery check','2023-01-01');
 r:=public.pc_retention();if exists(select 1 from public.pc_submissions where id=expired) or exists(select 1 from public.pc_text where submission_id=expired) or exists(select 1 from public.pc_exports where expires_on<=current_date) then raise exception 'Expiry deletion failed';end if;
 if (select count(*) from public.pc_submissions)<>24 then raise exception 'Review fixtures changed';end if;
 if has_function_privilege('anon','public.pc_recovery_snapshot(text)','EXECUTE') or has_function_privilege('authenticated','public.pc_replay_deletions(jsonb)','EXECUTE') or has_table_privilege('anon','private.pc_deletions','SELECT') then raise exception 'Browser access exposed';end if;
 if (public.pc_session_state(owner_id,gen_random_uuid())->>'valid')::boolean then raise exception 'Unknown session accepted';end if;
end$$;
select 'PASS: hosted rollback-only withdrawal journal, restoration replay, text cascade, cohort invalidation, expiry, grants, unknown-session denial' as result;
rollback;
