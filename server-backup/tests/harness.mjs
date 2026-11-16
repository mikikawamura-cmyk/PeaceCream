import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {protocol as P} from '../core.mjs';
export function harness(config,clock){
 const flags={},objects=new Map(),properties=new Map([['PC_FOLDER_ID','synthetic-folder'],['PC_JOURNAL_HEAD',JSON.stringify({seq:0,hash:P.ZERO})]]),emails=[],requests=[];
 const state={get:k=>properties.get(k)||null,set(k,v){if(k==='PC_JOURNAL_HEAD'&&flags.failHead){flags.failHead=false;throw Error('SYNTHETIC_PRIVATE_ERROR')}properties.set(k,v)}};
 const bytes=v=>Buffer.isBuffer(v)?v:typeof v==='string'?Buffer.from(v):Buffer.from(v);
 const blob=v=>({getBytes:()=>Array.from(bytes(v)),getDataAsString:()=>bytes(v).toString()});
 const Utilities={DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(algo,v)=>Array.from(createHash('sha256').update(bytes(v)).digest()),computeHmacSha256Signature:(v,k)=>Array.from(createHmac('sha256',k).update(v).digest()),base64Decode:v=>Array.from(Buffer.from(v,'base64')),base64Encode:v=>bytes(v).toString('base64'),newBlob:v=>blob(v),getUuid:randomUUID};
 const Drive={About:{get:()=>{flags.accountCalls=(flags.accountCalls||0)+1;if(flags.accountFailure)throw Error('SYNTHETIC_PRIVATE_ERROR');return {user:{emailAddress:config.ownerEmail}}}},Files:{create(meta,data){if(flags.writeFailure||flags.scopeDenied)throw Error('SYNTHETIC_PRIVATE_ERROR');const id=randomUUID(),obj={id,appProperties:meta.appProperties,parents:meta.parents||[],mimeType:meta.mimeType,bytes:data?Buffer.from(data.getBytes()):Buffer.alloc(0)};objects.set(id,obj);return structuredClone({id,appProperties:obj.appProperties})},list(options){if(flags.listFailure||flags.scopeDenied)throw Error('SYNTHETIC_PRIVATE_ERROR');let rows=[...objects.values()];const k=/key='pcKind' and value='([^']+)'/.exec(options.q)?.[1],project=/key='pcProject' and value='([^']+)'/.exec(options.q)?.[1];rows=rows.filter(o=>(!k||o.appProperties.pcKind===k)&&(!project||o.appProperties.pcProject===project));const page=Number(options.pageToken||0),size=flags.pageSize||1000;return {files:rows.slice(page,page+size).map(o=>({id:o.id,appProperties:{...o.appProperties}})),...(page+size<rows.length?{nextPageToken:String(page+size)}:{})}}}};
 const UrlFetchApp={fetch(url,options){requests.push({url,method:options?.method||'get'});if(!url.startsWith('https://www.googleapis.com/drive/v3/files/'))throw Error('UNEXPECTED_NETWORK_DESTINATION');if(flags.readFailure)throw Error('SYNTHETIC_PRIVATE_ERROR');const id=decodeURIComponent(url.split('/files/')[1].split('?')[0]),o=objects.get(id);if(!o)return {getResponseCode:()=>404};let b=Buffer.from(o.bytes);if(flags.corruptRead&&b.length)b[b.length-1]^=1;return {getResponseCode:()=>200,getBlob:()=>blob(b)}}};
 let held=false;
 const sandbox={Utilities,Drive,UrlFetchApp,ScriptApp:{getOAuthToken:()=> 'SYNTHETIC_TOKEN_NEVER_TRANSMITTED'},LockService:{getScriptLock:()=>({tryLock(){if(flags.busy||held)return false;held=true;return true},releaseLock(){held=false}})},PropertiesService:{getScriptProperties:()=>({getProperty:state.get,setProperty:state.set})},MailApp:{sendEmail(...args){if(flags.mailFailure)throw Error('SYNTHETIC_PRIVATE_ERROR');emails.push(args)}},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({text:s,setMimeType(){return this}})}};
 vm.createContext(sandbox);
 for(const f of ['../apps-script/Protocol.gs','../apps-script/Companion.gs'])vm.runInContext(readFileSync(new URL(f,import.meta.url),'utf8'),sandbox);
 const crypto=sandbox.pcGoogleCrypto(),store=sandbox.pcDriveStore({crypto,state,project:config.project});
 let transport=()=>{throw Error('NO_TRANSPORT')},notify=n=>{if(flags.mailFailure)throw Error('SYNTHETIC_PRIVATE_ERROR');emails.push(n)};
 const companion=sandbox.pcCompanion({config,crypto,store,state,now:clock,uuid:randomUUID,transport:(path,wire)=>transport(path,wire),notify:n=>notify(n)});
 return {sandbox,state,properties,flags,objects,emails,requests,store,companion,setTransport:f=>transport=f,setNotify:f=>notify=f,remote:wire=>JSON.parse(JSON.stringify(JSON.parse(wire.payload).action==='journal.manifest'?companion.manifest(wire):companion.post(wire)))};
}
