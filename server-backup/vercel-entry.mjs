// Dormant adapter; exported factory is NOT an installed Vercel API route.
export function vercelEntry(worker){return async(req,res)=>{
 try{
  const u=new URL(req.url,'https://unused.invalid');
  const body=typeof req.body==='string'?req.body:Buffer.isBuffer(req.body)?req.body.toString('utf8'):JSON.stringify(req.body);
  const result=await worker.handle({method:req.method,path:u.pathname.replace(/^\/api(?=\/backup\/)/,''),query:u.search,contentType:req.headers?.['content-type'],body});
  res.statusCode=result.status;for(const [k,v] of Object.entries(result.headers))res.setHeader(k,v);res.end(JSON.stringify(result.body));
 }catch{res.statusCode=503;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end('{"error":"BACKUP_OPERATION_FAILED"}')}
}}
