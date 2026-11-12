-- Apply only to a new isolated TEST project first. Never use production data in previews.
create schema if not exists private;
create table public.pc_organizers(user_id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('analyst','research_admin')), active boolean not null default true);
create table public.pc_submissions(
 id uuid primary key default gen_random_uuid(), participation_date date not null default current_date,
 expires_on date not null, mode text not null check(mode in ('create','discover')), version text not null,
 event text, consent jsonb not null, original jsonb not null, latest jsonb, results jsonb,
 final jsonb not null, customization jsonb not null, rating integer check(rating between 1 and 5),
 complete boolean not null default true, synthetic boolean not null default true,
 token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
 check(expires_on <= (participation_date + interval '5 years')::date),
 check((mode='create' and results is null and latest is null) or (mode='discover' and results is not null))
);
create index pc_submission_cohort on public.pc_submissions(event,participation_date,mode,version);
create function private.pc_immutable_original() returns trigger language plpgsql set search_path='' as $$begin
 if new.original is distinct from old.original or new.version is distinct from old.version or new.mode is distinct from old.mode or new.participation_date is distinct from old.participation_date or new.expires_on is distinct from old.expires_on or new.token_hash is distinct from old.token_hash or new.consent is distinct from old.consent then raise exception 'Original snapshot and retention are immutable';end if;return new;end$$;
create trigger pc_keep_original before update on public.pc_submissions for each row execute function private.pc_immutable_original();
create table public.pc_text(submission_id uuid primary key references public.pc_submissions(id) on delete cascade, original_expression text not null check(length(original_expression)<=40),final_expression text not null check(length(final_expression)<=40),explanation text check(length(explanation)<=240));
create table public.pc_exports(id uuid primary key default gen_random_uuid(),organizer_id uuid not null references auth.users(id),kind text not null check(kind in ('aggregate','text','raw')),reason text not null,created_at timestamptz not null default now(),row_count integer,status text not null default 'requested',expires_on date not null default (current_date + interval '5 years')::date);
create table public.pc_reports(
 id uuid primary key default gen_random_uuid(),cohort_key text not null unique,
 event text,year integer not null,mode text not null,version text not null,
 data jsonb not null,published boolean not null default false,
 expires_on date not null,anonymous_review jsonb,retention text not null default 'limited' check(retention in ('limited','reviewed_anonymous')),
 check(retention='limited' or (anonymous_review is not null and anonymous_review ? 'reviewer' and anonymous_review ? 'methodology' and anonymous_review ? 'approvedOn'))
);
create table private.pc_limits(bucket text primary key,started_at timestamptz not null,hits integer not null);
create function public.pc_role() returns text language sql stable security definer set search_path='' as $$select role from public.pc_organizers where user_id=auth.uid() and active$$;
revoke all on function public.pc_role() from public; grant execute on function public.pc_role() to authenticated;
alter table public.pc_organizers enable row level security;
alter table public.pc_submissions enable row level security;
alter table public.pc_text enable row level security;
alter table public.pc_exports enable row level security;
alter table public.pc_reports enable row level security;
alter table private.pc_limits enable row level security;
-- Browser clients have NO direct participant, free-text, audit, or report access.
revoke all on public.pc_organizers,public.pc_submissions,public.pc_text,public.pc_exports,public.pc_reports from anon,authenticated;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;
grant all on public.pc_organizers,public.pc_submissions,public.pc_text,public.pc_exports,public.pc_reports to service_role;
-- Policies document intended authorization even if read grants are enabled later.
create policy pc_own_role on public.pc_organizers for select to authenticated using(user_id=auth.uid());
create policy pc_research_responses on public.pc_submissions for select to authenticated using(public.pc_role()='research_admin');
create policy pc_research_text on public.pc_text for select to authenticated using(public.pc_role()='research_admin');
create policy pc_released_reports on public.pc_reports for select to authenticated using(published and public.pc_role() in ('analyst','research_admin') and (expires_on>current_date or retention='reviewed_anonymous'));

create function public.pc_limit(p_bucket text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into private.pc_limits values(p_bucket,now(),1) on conflict(bucket) do update set hits=case when private.pc_limits.started_at < now()-make_interval(secs=>p_seconds) then 1 else private.pc_limits.hits+1 end,started_at=case when private.pc_limits.started_at < now()-make_interval(secs=>p_seconds) then now() else private.pc_limits.started_at end returning hits into n;
 return n<=p_limit;end$$;

create function public.pc_submit(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid; existing public.pc_submissions; begin
 select * into existing from public.pc_submissions where token_hash=p->>'tokenHash';
 if found then return jsonb_build_object('id',existing.id,'expiresOn',existing.expires_on,'reused',true);end if;
 if (p->'consent'->>'responses')::boolean is not true or (p->'consent'->>'adult')::boolean is not true then raise exception 'Consent required';end if;
 if not public.pc_limit('submission-global',500,3600) then raise exception 'Submission capacity reached';end if;
 insert into public.pc_submissions(participation_date,expires_on,mode,version,event,consent,original,latest,results,final,customization,rating,complete,synthetic,token_hash)
 values(current_date,(current_date+interval '5 years')::date,p->>'mode',p->>'version',nullif(p->>'event',''),p->'consent',p->'original',nullif(p->'latest','null'::jsonb),nullif(p->'results','null'::jsonb),p->'final',p->'customization',nullif(p->>'rating','')::integer,true,(p->>'synthetic')::boolean,p->>'tokenHash') returning id into sid;
 if (p->'consent'->>'text')::boolean and p->'text'<>'null'::jsonb then insert into public.pc_text values(sid,p->'text'->>'originalExpression',p->'text'->>'finalExpression',p->'text'->>'explanation');end if;
 return jsonb_build_object('id',sid,'expiresOn',(current_date+interval '5 years')::date,'reused',false);
 exception when unique_violation then select id into sid from public.pc_submissions where token_hash=p->>'tokenHash';return jsonb_build_object('id',sid,'reused',true);end$$;

create function public.pc_manage(p_id uuid,p_hash text,p_operation text,p_rating integer default null) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; s public.pc_submissions;begin
 if not public.pc_limit('manage-global',2000,3600) then return false;end if;
 if p_operation='withdraw' then
 select * into s from public.pc_submissions where id=p_id and token_hash=p_hash;
 if not found then return false;end if;
 -- Ordinary snapshots are not claimed anonymous: invalidate, erase and never republish this cohort.
 update public.pc_reports set published=false,data='{}'::jsonb where retention='limited' and mode=s.mode and version=s.version and year=extract(year from s.participation_date) and event is not distinct from s.event;
 delete from public.pc_submissions where id=p_id and token_hash=p_hash;
 elsif p_operation='rating' and p_rating between 1 and 5 then update public.pc_submissions set rating=p_rating where id=p_id and token_hash=p_hash and expires_on>current_date;
 else return false;end if;get diagnostics n=row_count;return n=1;end$$;

create function public.pc_retention() returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;begin
 delete from public.pc_submissions where expires_on<=current_date;get diagnostics n=row_count;
 delete from public.pc_reports where retention='limited' and expires_on<=current_date;
 delete from public.pc_exports where expires_on<=current_date;
 delete from private.pc_limits where started_at<now()-interval '1 day';
 return jsonb_build_object('expiredSubmissionsDeleted',n);end$$;

-- All RPCs are server-only; anon/authenticated users cannot call privileged functions.
revoke all on function public.pc_limit(text,integer,integer),public.pc_submit(jsonb),public.pc_manage(uuid,text,text,integer),public.pc_retention() from public,anon,authenticated;
grant execute on function public.pc_limit(text,integer,integer),public.pc_submit(jsonb),public.pc_manage(uuid,text,text,integer),public.pc_retention() to service_role;

-- Enable pg_cron in the Supabase Dashboard, then apply the second migration.
