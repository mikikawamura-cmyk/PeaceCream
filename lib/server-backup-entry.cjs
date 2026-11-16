// Preview-only wiring. Never create a worker or touch credentials on production.
function createPreviewHandler({env=process.env,fetcher=globalThis.fetch,load=()=>Promise.all([import('../server-backup/worker.mjs'),import('../server-backup/vercel-entry.mjs')])}={}){
 return async function handler(req,res){
  const fail=()=>{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end('{"error":"PREVIEW_BACKUP_UNAVAILABLE"}')};
  if(env.VERCEL_ENV!=='preview'||env.PC_SERVER_BACKUP_MODE!=='synthetic'||env.PC_COLLECTION_MODE!=='synthetic'||env.PC_REAL_COLLECTION_APPROVAL)return fail();
  let worker;
  try{const [w,v]=await load();worker=w.createSyntheticWorker({env,fetcher});await v.vercelEntry(worker)(req,res)}catch{fail()}finally{if(worker)worker.close()}
 };
}
function createParticipantHandler({env=process.env,fetcher=globalThis.fetch,createHandler=require('./server.cjs').createHandler,load=()=>import('../server-backup/worker.mjs')}={}){
 const ordinary=createHandler({env,fetcher});
 return async function(req,res){
  if(env.VERCEL_ENV!=='preview'||env.PC_SERVER_BACKUP_MODE!=='synthetic'||(req.url||'').split('?')[0]!=='/api/withdraw')return ordinary(req,res);
  let worker;
  try{const w=await load();worker=w.createSyntheticWorker({env,fetcher});await createHandler({env,fetcher,backupWorkflow:worker})(req,res)}catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end('{"error":"PREVIEW_BACKUP_UNAVAILABLE"}')}finally{if(worker)worker.close()}
 };
}
module.exports={createPreviewHandler,createParticipantHandler};
