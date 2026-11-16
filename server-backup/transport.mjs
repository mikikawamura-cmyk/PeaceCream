// Dormant adapter. The caller must explicitly approve and inject a network client.
// Never auto-follows a redirect carrying the signed POST or inherited credentials.
export function companionTransport({url,fetcher,enabled=false}={}){
 const initial=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{12,}\/exec$/;
 return async wire=>{
  if(!enabled||typeof fetcher!=='function'||!initial.test(url||''))throw Error('TRANSPORT_DISABLED');
  const body=JSON.stringify(wire);if(Buffer.byteLength(body)>4101000)throw Error('TRANSPORT_TOO_LARGE');
  try{
   let target=url,method='POST',payload=body;
   for(let hop=0;hop<3;hop++){
    const response=await fetcher(target,{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},...(payload?{body:payload}:{}),redirect:'manual',signal:AbortSignal.timeout(8000)});
    if([301,302,303].includes(response.status)){
     const next=response.headers.get('location'),u=new URL(next||'');if(u.protocol!=='https:'||u.hostname!=='script.googleusercontent.com'||u.pathname!=='/macros/echo'||u.username||u.password||u.port)throw Error('UNEXPECTED_REDIRECT');target=next;method='GET';payload=undefined;continue;
    }
    if(response.status!==200)throw Error('HTTP_FAILED');
    let raw;
    if(response.body?.getReader){const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>4101000){await reader.cancel();throw Error('RESPONSE_TOO_LARGE')}chunks.push(Buffer.from(r.value))}raw=Buffer.concat(chunks).toString('utf8')}finally{reader.releaseLock()}}
    else {raw=await response.text();if(Buffer.byteLength(raw)>4101000)throw Error('RESPONSE_TOO_LARGE')}
    return JSON.parse(raw);
   }
   throw Error('REDIRECT_LIMIT');
  }catch{throw Error('COMPANION_TRANSPORT_FAILED')}
 };
}
