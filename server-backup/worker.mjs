// Synthetic worker; mounted only behind the fail-closed Vercel preview guard.
import {createRequire} from 'node:module';
import {service,httpHandler} from './core.mjs';
import {syntheticSourceAdapter} from './adapters.mjs';
import {companionTransport} from './transport.mjs';
const {database}=createRequire(import.meta.url)('../lib/database.cjs');
export function createSyntheticWorker({env={},client,fetcher,now=Date.now}={}){
 if(env.PC_SERVER_BACKUP_MODE!=='synthetic'||env.PC_COLLECTION_MODE!=='synthetic'||env.PC_REAL_COLLECTION_APPROVAL||typeof fetcher!=='function')throw Error('WORKER_DISABLED');
 const encoded=env.PC_BACKUP_KEY_B64;
 if(typeof encoded!=='string'||!/^[A-Za-z0-9+/]{43}=$/.test(encoded))throw Error('INVALID_KEY_CONFIG');
 const key=Buffer.from(encoded,'base64');if(key.length!==32||key.toString('base64')!==encoded)throw Error('INVALID_KEY_CONFIG');
 const config={mode:'synthetic',project:env.PC_BACKUP_PROJECT_REF,key,pullSecret:env.PC_PULL_SECRET,pushSecret:env.PC_PUSH_SECRET,realCollectionEnabled:false};
 const db=syntheticSourceAdapter({env,client:client||database(env,fetcher),now});
 const remote=companionTransport({url:env.PC_APPS_SCRIPT_URL,enabled:true,fetcher});
 const svc=service({config,db,remote,now});
 return {handle:httpHandler(svc,{enabled:true}),withdraw:svc.withdraw,close(){config.mode='disabled';key.fill(0)}};
}
