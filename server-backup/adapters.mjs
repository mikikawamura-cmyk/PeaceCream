import {createRequire} from 'node:module';
import {timingSafeEqual} from 'node:crypto';
const require=createRequire(import.meta.url),D=require('../lib/domain.cjs');
export function syntheticSourceAdapter({env={},client,now=Date.now}){
 const project=env.PC_BACKUP_PROJECT_REF;
 if(env.PC_SERVER_BACKUP_MODE!=='synthetic'||env.PC_COLLECTION_MODE!=='synthetic'||env.PC_REAL_COLLECTION_APPROVAL||!/^[a-z0-9]{20}$/.test(project||'')||env.SUPABASE_URL!=='https://'+project+'.supabase.co'||!client)throw Error('SYNTHETIC_SOURCE_DISABLED');
 function receipt(r){try{return D.receipt(r)}catch{throw Error('INVALID_RECEIPT')}}
 return {
  projectRef:project,
  claimNonce:nonce=>client.rpc('pc_limit',{p_bucket:'backup-nonce:'+D.hash(nonce),p_limit:1,p_seconds:300}),
  snapshot:()=>client.rpc('pc_recovery_snapshot',{p_kind:'backup'}),
  async prepareWithdrawal(input){const r=receipt(input),rows=await client.table('pc_submissions','?id=eq.'+r.id+'&select=id,token_hash,synthetic,expires_on,participation_date,event,mode,version');if(rows.length!==1)return null;const row=rows[0];if(row.synthetic!==true||!/^[a-f0-9]{64}$/.test(row.token_hash||'')||!timingSafeEqual(Buffer.from(row.token_hash,'hex'),Buffer.from(r.tokenHash,'hex')))return null;const deletedAt=new Date(now());return {submission_id:r.id,cohort_key:JSON.stringify([row.event,new Date(row.participation_date).getUTCFullYear(),row.mode,row.version]),expires_on:new Date(deletedAt.getTime()+35*86400000).toISOString().slice(0,10),deleted_at:deletedAt.toISOString(),synthetic:true}},
  async applyWithdrawal(input){const r=receipt(input),ok=await client.rpc('pc_manage',{p_id:r.id,p_hash:r.tokenHash,p_operation:'withdraw',p_rating:null});if(ok!==true)throw Error('WITHDRAWAL_NOT_COMMITTED')}
 };
}
export function isolatedRestoreAdapter({client,sourceProject,targetProject,approved=false}={}){
 if(!approved||!client||!(/^[a-z0-9]{20}$/.test(sourceProject||''))||!(/^[a-z0-9]{20}$/.test(targetProject||''))||sourceProject===targetProject)throw Error('ISOLATED_RESTORE_DISABLED');
 const tables=['pc_submissions','pc_text','pc_reports','pc_exports'];
 return {restoreIsolated:true,restoreTargetProject:targetProject,async restoreAndReconcile(snapshot,entries){
  await client.query('begin isolation level serializable');
  try{
   for(const t of tables){if(!Array.isArray(snapshot.tables[t]))throw Error('INVALID_TABLE');const rows=(await client.query('select count(*)::int as n from public.'+t)).rows;if(rows[0].n!==0)throw Error('RESTORE_TARGET_NOT_EMPTY')}
   for(const t of tables)await client.query('insert into public.'+t+' select * from jsonb_populate_recordset(null::public.'+t+',$1::jsonb)',[JSON.stringify(snapshot.tables[t])]);
   await client.query('select public.pc_replay_deletions($1::jsonb)',[JSON.stringify(entries)]);
   await client.query('select public.pc_retention()');
   // Even reviewed reports await a fresh organizer review following recovery.
   await client.query('update public.pc_reports set published=false');
   const restored=(await client.query('select count(*)::int as n from public.pc_submissions')).rows[0].n;
   await client.query('commit');return {publicationAllowed:false,restored};
  }catch{await client.query('rollback');throw Error('ISOLATED_RESTORE_FAILED')}
 }};
}
