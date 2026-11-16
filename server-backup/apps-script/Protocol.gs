/* Pure shared protocol. Copied byte-for-byte to Apps Script by prepare.mjs. */
function pcProtocol(crypto) {
 const MAX=3000000, ZERO='0'.repeat(64);
 function fault(code){const e=new Error(code);e.code=code;throw e}
 function exact(o,keys){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join('|')!==keys.slice().sort().join('|'))fault('INVALID_SHAPE')}
 function hash(s){return crypto.sha256(s)}
 function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
 function message(action,data,secret,now,nonce){const payload=JSON.stringify({version:1,action,at:now,nonce,data});return {payload,mac:crypto.hmac(payload,secret)}}
 function open(wire,secret,now,action,nonce){exact(wire,['payload','mac']);if(typeof wire.payload!=='string'||wire.payload.length>4100000||!/^[a-f0-9]{64}$/.test(wire.mac)||!safeEqual(crypto.hmac(wire.payload,secret),wire.mac))fault('AUTH_FAILED');let p;try{p=JSON.parse(wire.payload)}catch{fault('INVALID_MESSAGE')}exact(p,['version','action','at','nonce','data']);if(p.version!==1||p.action!==action||!Number.isSafeInteger(p.at)||Math.abs(now-p.at)>120000||!/^[a-f0-9-]{36}$/.test(p.nonce)||nonce!==undefined&&p.nonce!==nonce)fault('STALE_OR_WRONG_MESSAGE');return p}
 function artifact(a){exact(a,['id','kind','project','sha256','bytes','base64']);if(!/^[a-f0-9-]{36}$/.test(a.id)||!['backup','journal'].includes(a.kind)||!/^[a-z0-9]{20}$/.test(a.project)||!Number.isSafeInteger(a.bytes)||a.bytes<46||a.bytes>MAX||typeof a.base64!=='string'||a.base64.length!==4*Math.ceil(a.bytes/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64)||!/^[a-f0-9]{64}$/.test(a.sha256))fault('INVALID_ARTIFACT');const bytes=crypto.decode(a.base64);if(bytes.length!==a.bytes||crypto.encode(bytes.slice(0,18))!=='UGVhY2VDcmVhbUJhY2t1cDEK'||crypto.sha256(bytes)!==a.sha256||crypto.encode(bytes)!==a.base64)fault('CORRUPT_ARTIFACT');return a}
 function record(a,seq,prev){artifact(a);if(!Number.isSafeInteger(seq)||seq<1||!/^[a-f0-9]{64}$/.test(prev))fault('INVALID_CHAIN');const r={id:a.id,kind:a.kind,project:a.project,sha256:a.sha256,bytes:a.bytes,seq,prev};return {...r,hash:hash(JSON.stringify(r))}}
 function chain(items,head,project){exact(head,['seq','hash']);if(!Array.isArray(items)||items.length>20000||!Number.isSafeInteger(head.seq)||head.seq<0||head.seq!==items.length)fault('INCOMPLETE_JOURNAL');let prev=ZERO;items.forEach((item,i)=>{exact(item,['artifact','record']);const r=record(item.artifact,i+1,prev);if(item.artifact.kind!=='journal'||item.artifact.project!==project||JSON.stringify(r)!==JSON.stringify(item.record))fault('BROKEN_JOURNAL');prev=r.hash});if(prev!==head.hash)fault('INCOMPLETE_JOURNAL');return true}
 return {MAX,ZERO,fault,exact,hash,safeEqual,message,open,artifact,record,chain};
}
if(typeof module!=='undefined')module.exports={pcProtocol};
