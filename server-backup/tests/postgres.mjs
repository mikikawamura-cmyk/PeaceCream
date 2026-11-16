import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {localDatabase} from '../../scripts/local-database.mjs';
import {service} from '../core.mjs';
import {harness} from './harness.mjs';
import {isolatedRestoreAdapter,syntheticSourceAdapter} from '../adapters.mjs';
const require=createRequire(import.meta.url),D=require('../../lib/domain.cjs'),{fixture}=require('../../tests/response-fixtures.cjs');
let checks=0;const check=(v)=>{assert.ok(v);checks++};
const source=await localDatabase(),target=await localDatabase(),now=Date.now;
const config={mode:'synthetic',externalApproved:true,emailApproved:false,ownerEmail:'owner@example.test',project:'a'.repeat(20),key:randomBytes(32),pullSecret:randomBytes(32).toString('hex'),pushSecret:randomBytes(32).toString('hex'),realCollectionEnabled:false};
try{
 for(const db of [source,target]){await db.exec('reset role');for(const name of ['20261112172007_recovery_journal.sql','20261112173247_deny_journal_browser_access.sql'])await db.exec(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));await db.exec('set role service_role')}
 const input=fixture('create');input.consent.text=true;input.text={originalExpression:'INVENTED WITHDRAWN WORDS',finalExpression:'INVENTED WITHDRAWN WORDS'};
 const p=D.normalize(input),saved=await source.rpc('pc_submit',{p}),live=await source.rpc('pc_submit',{p:D.normalize({...fixture('discover'),token:randomBytes(32).toString('base64url')})});
 const expiredId=randomUUID(),row=(await source.rows('?id=eq.'+live.id))[0];await source.table('pc_submissions','','POST',{...row,id:expiredId,token_hash:'f'.repeat(64),participation_date:'2018-01-01',expires_on:'2023-01-01'});await source.table('pc_text','','POST',{submission_id:expiredId,original_expression:'EXPIRED INVENTED WORDS',final_expression:'EXPIRED INVENTED WORDS',explanation:null});
 const report={cohort_key:JSON.stringify([p.event,new Date().getUTCFullYear(),p.mode,p.version]),event:p.event,year:new Date().getUTCFullYear(),mode:p.mode,version:p.version,data:{participants:5},published:true,expires_on:saved.expiresOn};await source.table('pc_reports','','POST',report);
 let failDelete=false;
 const sourceClient={table:source.table,rpc:async(name,body)=>name==='pc_recovery_snapshot'?(await source.query("select public.pc_recovery_snapshot('backup') as value")).rows[0].value:source.rpc(name,body)};
 const src=syntheticSourceAdapter({env:{PC_SERVER_BACKUP_MODE:'synthetic',PC_COLLECTION_MODE:'synthetic',PC_BACKUP_PROJECT_REF:config.project,SUPABASE_URL:'https://'+config.project+'.supabase.co'},client:sourceClient,now});
 const adapter={...src,...isolatedRestoreAdapter({client:target,sourceProject:config.project,targetProject:'b'.repeat(20),approved:true}),async applyWithdrawal(r){if(failDelete)throw Error('INVENTED DATABASE OUTAGE');return src.applyWithdrawal(r)}};
 const nonce=randomUUID();check(await adapter.claimNonce(nonce));check(!await adapter.claimNonce(nonce));
 const h=harness(config,now),svc=service({config,db:adapter,remote:h.remote,now,delay:async()=>{}}),snapshot=await adapter.snapshot(),a=svc.packageArtifact('backup',snapshot);
 check(snapshot.tables.pc_submissions.length===3);
 check(!Buffer.from(a.base64,'base64').includes(Buffer.from('INVENTED WITHDRAWN WORDS')));
 await assert.rejects(()=>svc.withdraw({id:saved.id,token:randomBytes(32).toString('base64url')}),/RECEIPT_REJECTED/);checks++;
 check(h.objects.size===0);
 h.flags.writeFailure=true;await assert.rejects(()=>svc.withdraw({id:saved.id,token:input.token}));checks++;
 check((await source.rows('?id=eq.'+saved.id)).length===1);
 check((await source.table('pc_text')).some(t=>t.submission_id===saved.id));
 h.flags.writeFailure=false;failDelete=true;await assert.rejects(()=>svc.withdraw({id:saved.id,token:input.token}),/DURABLE_WITHDRAWAL_DB_PENDING/);checks++;
 check(h.store.manifest().items.length===1);check((await source.rows('?id=eq.'+saved.id)).length===1);
 // Simulate total loss of source responses before the post-journal delete committed.
 await source.exec('reset role; drop table public.pc_submissions cascade; set role service_role');
 const invalid=structuredClone(snapshot);invalid.tables.pc_text[0].original_expression='x'.repeat(41);await assert.rejects(()=>svc.restore(svc.packageArtifact('backup',invalid)),/ISOLATED_RESTORE_FAILED/);checks++;check((await target.rows('?select=id')).length===0);check((await target.table('pc_text')).length===0);
 const result=await svc.restore(a);check(result.restored===1);check(result.publicationAllowed===false);
 const recovered=await target.rows('?select=id');check(recovered[0].id===live.id);check(!(await target.table('pc_text')).length);
 const reports=await target.table('pc_reports');check(reports[0].published===false);check(Object.keys(reports[0].data).length===0);
 // Replay remains idempotent after complete source-data loss.
 await assert.rejects(()=>svc.restore(a),/ISOLATED_RESTORE_FAILED/);checks++;check((await target.rows('?select=id')).length===1);
 const entries=h.store.manifest().items.map(i=>svc.decrypt(i.artifact,'journal'));await target.query('select public.pc_replay_deletions($1::jsonb)',[JSON.stringify(entries)]);check((await target.rows('?select=id')).length===1);
 for(const role of ['anon','authenticated']){await target.exec('reset role;set role '+role);for(const sql of ["select public.pc_recovery_snapshot('backup')",'select * from private.pc_deletions']){await assert.rejects(()=>target.query(sql));checks++}await target.exec('reset role;set role service_role')}
 console.log(JSON.stringify({suite:'Isolated local PostgreSQL recovery after source-data loss',status:'PASS',checks,realData:false,cloudConnections:0,withdrawalReappeared:false,expiredTextRestored:false,restoredReportsPublished:false}));
}finally{config.key.fill(0);await source.close();await target.close()}
