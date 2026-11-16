import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {syntheticSourceAdapter,isolatedRestoreAdapter} from '../adapters.mjs';
import {createSyntheticWorker} from '../worker.mjs';
import {vercelEntry} from '../vercel-entry.mjs';
const {createPreviewHandler}=createRequire(import.meta.url)('../../lib/server-backup-entry.cjs');
const D=createRequire(import.meta.url)('../../lib/domain.cjs'),{createHandler}=createRequire(import.meta.url)('../../lib/server.cjs');
let checks=0;const check=async fn=>{await fn();checks++};
const project='a'.repeat(20),env={PC_SERVER_BACKUP_MODE:'synthetic',PC_COLLECTION_MODE:'synthetic',PC_BACKUP_PROJECT_REF:project,SUPABASE_URL:'https://'+project+'.supabase.co',PC_BACKUP_KEY_B64:randomBytes(32).toString('base64'),PC_PULL_SECRET:randomBytes(32).toString('hex'),PC_PUSH_SECRET:randomBytes(32).toString('hex'),PC_APPS_SCRIPT_URL:'https://script.google.com/macros/s/SYNTHETIC_DEPLOYMENT_ID/exec'};
const receipt={id:'11111111-1111-4111-8111-111111111111',token:randomBytes(32).toString('base64url')},calls=[],row={id:receipt.id,token_hash:D.hash(receipt.token),synthetic:true,expires_on:'2031-11-15',participation_date:'2026-11-15',event:'invented',mode:'create',version:'test-v1'};
const client={rpc:async(name,body)=>{calls.push({name,body});return true},table:async(name,query)=>{calls.push({name,query});return [{...row}]}};
for(const patch of [{PC_SERVER_BACKUP_MODE:'disabled'},{PC_COLLECTION_MODE:'enabled'},{PC_REAL_COLLECTION_APPROVAL:'present'},{SUPABASE_URL:'https://'+'b'.repeat(20)+'.supabase.co'},{PC_BACKUP_PROJECT_REF:'bad'}])await check(async()=>assert.throws(()=>syntheticSourceAdapter({env:{...env,...patch},client}),/DISABLED/));
await check(async()=>{const a=syntheticSourceAdapter({env,client}),r=await a.prepareWithdrawal(receipt);assert.equal(r.submission_id,receipt.id);assert.equal(JSON.stringify(r).includes(receipt.token),false);assert.equal(JSON.stringify(r).includes(row.token_hash),false);assert.equal(calls.at(-1).query.includes(receipt.token),false);assert.equal(calls.at(-1).query.includes(row.token_hash),false)});
await check(async()=>assert.equal(await syntheticSourceAdapter({env,client}).prepareWithdrawal({...receipt,token:randomBytes(32).toString('base64url')}),null));
await check(async()=>{row.synthetic=false;try{assert.equal(await syntheticSourceAdapter({env,client}).prepareWithdrawal(receipt),null)}finally{row.synthetic=true}});
await check(async()=>{await syntheticSourceAdapter({env,client}).claimNonce('invented-nonce');assert.equal(calls.at(-1).name,'pc_limit');assert.equal(calls.at(-1).body.p_limit,1);assert.equal(calls.at(-1).body.p_seconds,300)});
await check(async()=>assert.rejects(()=>syntheticSourceAdapter({env,client}).prepareWithdrawal({id:'bad',token:'bad'}),/INVALID_RECEIPT/));
await check(async()=>assert.rejects(()=>syntheticSourceAdapter({env,client:{...client,rpc:async()=>false}}).applyWithdrawal(receipt),/NOT_COMMITTED/));
for(const options of [{approved:false,sourceProject:project,targetProject:'b'.repeat(20)},{approved:true,sourceProject:project,targetProject:project},{approved:true,sourceProject:project,targetProject:'bad'}])await check(async()=>assert.throws(()=>isolatedRestoreAdapter({client:{},...options}),/DISABLED/));
await check(async()=>assert.throws(()=>createSyntheticWorker(),/DISABLED/));
await check(async()=>assert.throws(()=>createSyntheticWorker({env:{...env,PC_REAL_COLLECTION_APPROVAL:'present'},client,fetcher:async()=>{}}),/DISABLED/));
await check(async()=>assert.throws(()=>createSyntheticWorker({env:{...env,PC_BACKUP_KEY_B64:'not-a-key'},client,fetcher:async()=>{}}),/INVALID_KEY/));
await check(async()=>{let network=0;const worker=createSyntheticWorker({env,client,fetcher:async()=>{network++;throw Error('NO_NETWORK_ALLOWED')}});worker.close();const result=await worker.handle({method:'POST',path:'/backup/request',contentType:'application/json',body:'{}'});assert.equal(result.status,503);assert.equal(network,0)});

await check(async()=>{let normalized;const entry=vercelEntry({handle:async r=>{normalized=r;return {status:200,headers:{'Cache-Control':'no-store'},body:{ok:true}}}}),res={setHeader(){},end(s){this.body=s}};await entry({method:'POST',url:'/api/backup/request',headers:{'content-type':'application/json'},body:{payload:'signed',mac:'mac'}},res);assert.equal(normalized.path,'/backup/request');assert.equal(normalized.body,'{"payload":"signed","mac":"mac"}');assert.equal(res.statusCode,200)});
await check(async()=>{let normalized;const res={setHeader(){},end(){}};await vercelEntry({handle:async r=>{normalized=r;return {status:400,headers:{},body:{}}}})({method:'POST',url:'/api/backup/request?secret=bad',headers:{},body:'{}'},res);assert.equal(normalized.query,'?secret=bad');assert.equal(res.statusCode,400)});
await check(async()=>{const res={setHeader(){},end(s){this.body=s}};await vercelEntry({handle:async()=>{throw Error('SYNTHETIC_PRIVATE_DETAILS')}})({url:'/api/backup/request',headers:{},body:'{}'},res);assert.equal(res.statusCode,503);assert.equal(res.body.includes('SYNTHETIC_PRIVATE_DETAILS'),false)});

async function apiCall(workflow,mode='synthetic'){let legacyCalls=0;const h=createHandler({env:{...env,PC_COLLECTION_MODE:mode,SUPABASE_SECRET_KEY:'synthetic-configured'},dbFactory:()=>({rpc:async()=>{legacyCalls++;return true}}),backupWorkflow:workflow}),res={setHeader(){},end(s){this.body=JSON.parse(s)}};await h({method:'POST',url:'/api/withdraw',headers:{host:'localhost',origin:'http://localhost','content-type':'application/json'},body:receipt},res);return {res,legacyCalls}}
await check(async()=>{const r=await apiCall(null);assert.equal(r.res.statusCode,503);assert.equal(r.legacyCalls,0)});
await check(async()=>{const r=await apiCall({withdraw:async()=>{throw Error('SYNTHETIC_PRIVATE_PROVIDER_DETAILS')}});assert.equal(r.res.statusCode,503);assert.equal(r.legacyCalls,0);assert.equal(JSON.stringify(r.res.body).includes('SYNTHETIC_PRIVATE_PROVIDER_DETAILS'),false)});
await check(async()=>{const r=await apiCall({withdraw:async()=>({ok:true,independentlyRecorded:false})});assert.equal(r.res.statusCode,503);assert.equal(r.legacyCalls,0)});
await check(async()=>{let called=false;const r=await apiCall({withdraw:async()=>{called=true;return {ok:true,independentlyRecorded:true}}});assert.equal(r.res.statusCode,200);assert.equal(called,true);assert.equal(r.legacyCalls,0)});
await check(async()=>{const r=await apiCall({withdraw:async()=>{throw Error('MUST_NOT_REACH')}},'disabled');assert.equal(r.res.statusCode,503);assert.equal(r.legacyCalls,0)});

for(const bad of [{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{PC_SERVER_BACKUP_MODE:'disabled'},{PC_REAL_COLLECTION_APPROVAL:'present'}])await check(async()=>{let loaded=0;const response={setHeader(){},end(v){this.body=v}},h=createPreviewHandler({env:{...env,VERCEL_ENV:'preview',...bad},load:async()=>{loaded++;throw Error('MUST_NOT_LOAD')}});await h({},response);assert.equal(response.statusCode,503);assert.equal(loaded,0)});
await check(async()=>{let closed=false;const response={setHeader(){},end(){}},h=createPreviewHandler({env:{...env,VERCEL_ENV:'preview'},load:async()=>[{createSyntheticWorker:()=>({close(){closed=true}})},{vercelEntry:()=>async(req,res)=>{res.statusCode=200}}]});await h({},response);assert.equal(response.statusCode,200);assert.equal(closed,true)});
await check(async()=>{const response={setHeader(){},end(v){this.body=v}},h=createPreviewHandler({env:{...env,VERCEL_ENV:'preview'},load:async()=>{throw Error('SYNTHETIC_PRIVATE_DETAILS')}});await h({},response);assert.equal(response.statusCode,503);assert.equal(response.body.includes('SYNTHETIC_PRIVATE_DETAILS'),false)});
console.log(JSON.stringify({suite:'Synthetic-only integration and isolated restore gates',status:'PASS',checks,networkRequests:0}));
