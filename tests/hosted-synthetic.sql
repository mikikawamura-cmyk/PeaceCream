-- Synthetic verification for an EMPTY isolated test project only. All writes roll back.
begin;
do $guard$ begin if exists(select 1 from public.pc_submissions) or exists(select 1 from public.pc_reports) then raise exception 'Use an empty isolated test database';end if;end $guard$;
set local role service_role;
do $test$
declare p jsonb := '{"mode":"discover","version":"peacecream-quiz-1","consent":{"version":"peacecream-consent-5y-2","responses":true,"text":false,"adult":true},"event":"synthetic-pilot","original":{"answers":{"q1":"q1-a","q2":"q2-a","q3":"q3-a","q4":"q4-a","q5":"q5-a","q6":"q6-a","q7":"q7-a","q8":"q8-a","q9":"q9-a","q10":"q10-a"},"values":["justice","dignity"],"expressionAnswered":true},"latest":{"answers":{"q1":"q1-a","q2":"q2-a","q3":"q3-a","q4":"q4-a","q5":"q5-a","q6":"q6-a","q7":"q7-a","q8":"q8-a","q9":"q9-a","q10":"q10-a"},"values":["justice","dignity"],"expressionAnswered":true},"results":{"original":{"flavor":"strawberry","quality":"Love","flavorScores":{"strawberry":3,"matcha":0,"lemon":0,"orange":0},"tied":["strawberry"],"lenses":[{"id":"words","count":3,"opportunities":6,"normalized":0.5},{"id":"dialogue","count":2,"opportunities":6,"normalized":0.3333333333333333},{"id":"courage","count":1,"opportunities":5,"normalized":0.2},{"id":"youth","count":1,"opportunities":5,"normalized":0.2},{"id":"care","count":0,"opportunities":6,"normalized":0}],"leading":["words","dialogue"],"suggested":"dialogue","chosen":["justice","dignity"]},"latest":{"flavor":"strawberry","quality":"Love","flavorScores":{"strawberry":3,"matcha":0,"lemon":0,"orange":0},"tied":["strawberry"],"lenses":[{"id":"words","count":3,"opportunities":6,"normalized":0.5},{"id":"dialogue","count":2,"opportunities":6,"normalized":0.3333333333333333},{"id":"courage","count":1,"opportunities":5,"normalized":0.2},{"id":"youth","count":1,"opportunities":5,"normalized":0.2},{"id":"care","count":0,"opportunities":6,"normalized":0}],"leading":["words","dialogue"],"suggested":"dialogue","chosen":["justice","dignity"]}},"final":{"flavor":"lemon","values":["justice","dignity"],"suggestion":{"decision":"declined","value":"dialogue"},"action":"justice-0","initialAction":"justice-0","actionChanges":0},"customization":{"flavorChanged":true,"actionChanged":false,"valuesChanged":false},"rating":null,"text":null,"tokenHash":"b59e65c402a629e6c5b28355c7628a1002262b55b43a52f941c02740e3bdfafc","participationDate":"2026-11-12","expiresOn":"2031-11-12","complete":true,"synthetic":true}'::jsonb; sid uuid; tid uuid; expiry date; rejected boolean:=false; r jsonb;
begin
r:=public.pc_submit(p);sid:=(r->>'id')::uuid;
if (select original->'answers'->>'q10' from public.pc_submissions where id=sid)<>'q10-a' then raise exception 'Original answer failed';end if;
if exists(select 1 from public.pc_text where submission_id=sid) then raise exception 'Text without consent';end if;
if (public.pc_submit(p)->>'id')::uuid<>sid or (select count(*) from public.pc_submissions)<>1 then raise exception 'Duplicate retry failed';end if;
select expires_on into expiry from public.pc_submissions where id=sid;
if expiry<>(current_date+interval '5 years')::date then raise exception 'Retention failed';end if;
if public.pc_manage(sid,repeat('a',64),'rating',5) then raise exception 'Wrong token accepted';end if;
if not public.pc_manage(sid,p->>'tokenHash','rating',5) then raise exception 'Rating failed';end if;
if (select rating from public.pc_submissions where id=sid)<>5 or (select expires_on from public.pc_submissions where id=sid)<>expiry then raise exception 'Rating changed retention';end if;
begin update public.pc_submissions set original='{}' where id=sid;exception when raise_exception then rejected:=true;end;
if not rejected then raise exception 'Original changed';end if;
p:=jsonb_set(jsonb_set(jsonb_set(p,'{tokenHash}',to_jsonb(repeat('b',64))),'{consent,text}','true'),'{text}','{"originalExpression":"Synthetic original","finalExpression":"Synthetic final"}');
tid:=(public.pc_submit(p)->>'id')::uuid;
if (select original_expression from public.pc_text where submission_id=tid)<>'Synthetic original' then raise exception 'Opt-in text failed';end if;
insert into public.pc_reports(cohort_key,event,year,mode,version,data,published,expires_on) select 'hosted-synthetic-verification',event,extract(year from participation_date),mode,version,'{"participants":5}',true,expires_on from public.pc_submissions where id=tid;
if not public.pc_manage(tid,p->>'tokenHash','withdraw',null) then raise exception 'Withdrawal failed';end if;
if exists(select 1 from public.pc_text where submission_id=tid) or exists(select 1 from public.pc_submissions where id=tid) then raise exception 'Withdrawal cascade failed';end if;
if exists(select 1 from public.pc_reports where cohort_key='hosted-synthetic-verification' and (published or data<>'{}')) then raise exception 'Report invalidation failed';end if;
insert into public.pc_submissions(participation_date,expires_on,mode,version,consent,original,latest,results,final,customization,synthetic,token_hash) select '2019-01-01','2024-01-01',mode,version,consent,original,latest,results,final,customization,true,repeat('f',64) from public.pc_submissions where id=sid;
perform public.pc_retention();
if exists(select 1 from public.pc_submissions where token_hash=repeat('f',64)) then raise exception 'Expiry cleanup failed';end if;
end $test$;
reset role;
set local role anon;
do $test$ begin
begin perform id from public.pc_submissions;raise exception 'Anonymous read allowed';exception when insufficient_privilege then null;end;
begin perform public.pc_submit('{}');raise exception 'Anonymous RPC allowed';exception when insufficient_privilege then null;end;
end $test$;
reset role;
set local role authenticated;
do $test$ begin
begin perform original_expression from public.pc_text;raise exception 'Authenticated text read allowed';exception when insufficient_privilege then null;end;
begin perform public.pc_submit('{}');raise exception 'Authenticated RPC allowed';exception when insufficient_privilege then null;end;
end $test$;
reset role;
rollback;
select 'PASS: hosted synthetic submission, original immutability, no-text consent, opt-in text, duplicate retry, rating, wrong-token denial, withdrawal cascade, report invalidation, expiry deletion, and direct-role access denial; all fixtures rolled back' as verification,(select count(*) from public.pc_submissions) as remaining_submissions;
