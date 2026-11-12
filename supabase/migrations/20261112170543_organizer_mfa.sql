-- Server-only session check. No browser grants or auth schema exposure.
create or replace function public.pc_session_state(p_user uuid,p_session uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('valid',exists(select 1 from auth.sessions s where s.id=p_session and s.user_id=p_user and (s.not_after is null or s.not_after>now())),
 'mfa',exists(select 1 from auth.sessions s join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id where s.id=p_session and s.user_id=p_user and s.aal='aal2' and f.factor_type='totp' and f.status='verified' and (s.not_after is null or s.not_after>now())));
$$;
revoke all on function public.pc_session_state(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pc_session_state(uuid,uuid) to service_role;
