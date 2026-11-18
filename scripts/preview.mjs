// Loopback-only static preview. No database, API, credentials, proxy or uploads.
import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const port=Number(process.env.PC_REDESIGN_PORT||4185);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a port from 1024 to 65535.');
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Static preview only');}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=pathname==='/'?'index.html':pathname.slice(1);
  if(!/^(?:[a-zA-Z0-9-]+\.(?:html|js|css)|assets\/[a-zA-Z0-9/_-]+\.(?:png|jpg|webp|svg))$/.test(file))throw Error('Not a web asset');
  const target=await realpath(path.join(root,file));
  if(!target.startsWith(root))throw Error('Outside preview');
  const body=await readFile(target);res.setHeader('Content-Type',types[path.extname(target)]);res.writeHead(200);res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`PeaceCream redesign preview: http://127.0.0.1:${port} (static only)`));
process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close());
