import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{localDatabase}from'../scripts/local-database.mjs';const db=await localDatabase();let checks=0;const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',fid='33333333-3333-4333-8333-333333333333';
try{await db.exec("reset role;create table auth.sessions(id uuid,user_id uuid,not_after timestamptz,factor_id uuid,aal text);create table auth.mfa_factors(id uuid,user_id uuid,factor_type text,status text);");await db.exec(await readFile(new URL('../supabase/migrations/20261112170543_organizer_mfa.sql',import.meta.url),'utf8'));
const state=async()=>{checks++;return(await db.query('select public.pc_session_state($1,$2) as s',[uid,sid])).rows[0].s};assert.deepEqual(await state(),{valid:false,mfa:false});
await db.query("insert into auth.sessions values($1,$2,null,$3,'aal1')",[sid,uid,fid]);assert.deepEqual(await state(),{valid:true,mfa:false});
await db.query("insert into auth.mfa_factors values($1,$2,'totp','verified')",[fid,uid]);await db.query("update auth.sessions set aal='aal2'");assert.deepEqual(await state(),{valid:true,mfa:true});
await db.query("update auth.mfa_factors set status='unverified'");assert.equal((await state()).mfa,false);await db.query("update auth.mfa_factors set status='verified',user_id=$1",[sid]);assert.equal((await state()).mfa,false);
await db.query('update auth.mfa_factors set user_id=$1',[uid]);await db.query("update auth.sessions set not_after=now()-interval '1 second'");assert.deepEqual(await state(),{valid:false,mfa:false});
await db.query('delete from auth.sessions');assert.deepEqual(await state(),{valid:false,mfa:false});
for(const role of['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>state());await db.exec('reset role')}
console.log(JSON.stringify({sessionRevocationSQL:'PASS',checks,scope:'Real local PostgreSQL, missing/revoked/expired sessions, AAL1, verified/unverified/mismatched factors and browser execution denial.'}));
}finally{await db.close()}
