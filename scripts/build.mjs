import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),out=new URL('dist/',root);
await mkdir(new URL('assets/',out),{recursive:true});
const scripts=['quiz-en.js','quiz-engine.js','quiz-ui.js','gelato-renderer.js','app.js'];
const styles=['style.css','quiz.css'];
const assets=(await readdir(new URL('assets/',root))).filter(name=>name.endsWith('.png'));
for(const file of [...scripts,...styles,...assets.map(name=>'assets/'+name)])await cp(new URL(file,root),new URL(file,out));
// Each release references a content version so returning browsers fetch current code.
const hash=createHash('sha256');
for(const file of [...scripts,...styles])hash.update(await readFile(new URL(file,root)));
const version=hash.digest('hex').slice(0,12);
let html=await readFile(new URL('index.html',root),'utf8');
html=html.replace(/\?v=[^"\s]+/g,'?v='+version);
await writeFile(new URL('index.html',out),html);
console.log(`Built one static PeaceCream website in dist/ (${version}); no runtime server, API key or visitor sign-in required.`);
