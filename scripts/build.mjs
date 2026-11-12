import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),out=new URL('dist/',root);
await mkdir(new URL('assets/',out),{recursive:true});
const scripts=['quiz-en.js','quiz-engine.js','quiz-ui.js','gelato-renderer.js','app.js','collection.js'];
const styles=['style.css','quiz.css','collection.css'];
const assets=(await readdir(new URL('assets/',root))).filter(name=>name.endsWith('.png'));
for(const file of [...scripts,...styles,...assets.map(name=>'assets/'+name)])await cp(new URL(file,root),new URL(file,out));
// Each release references a content version so returning browsers fetch current code.
const hash=createHash('sha256');
for(const file of [...scripts,...styles])hash.update(await readFile(new URL(file,root)));
const version=hash.digest('hex').slice(0,12);
await cp(new URL('dashboard.html',root),new URL('dashboard.html',out));
await cp(new URL('dashboard.js',root),new URL('dashboard.js',out));
await cp(new URL('dashboard.css',root),new URL('dashboard.css',out));
let html=await readFile(new URL('index.html',root),'utf8');
html=html.replace(/\?v=[^"\s]+/g,'?v='+version);
await writeFile(new URL('index.html',out),html);
console.log(`Built PeaceCream static activities in dist/ (${version}). Optional collection uses server-only API functions; activities require no visitor sign-in.`);
