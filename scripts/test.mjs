import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const files=['app.js','gelato-renderer.js','quiz-en.js','quiz-engine.js','quiz-ui.js'];
for(const file of files)new vm.Script(await readFile(new URL(file,root),'utf8'),{filename:file});
const context=vm.createContext({});context.window=context;
for(const file of ['quiz-en.js','quiz-engine.js','tests/quiz-tests.js'])vm.runInContext(await readFile(new URL(file,root),'utf8'),context);
assert.equal(context.PeaceQuizTestReport.result,'PASS');
console.log(context.PeaceQuizTestReport);
createRequire(import.meta.url)(fileURLToPath(new URL('tests/test-placement.cjs',root)));
const renderer=createRequire(import.meta.url)(fileURLToPath(new URL('gelato-renderer.js',root)));
let triples=0;
for(let f=0;f<10;f++)for(let a=0;a<10;a++)for(let b=a+1;b<10;b++)for(let c=b+1;c<10;c++){assert.ok(renderer.buildPlan(f,[a,b,c]).length);triples++}
for(const file of ['index.html','style.css','quiz.css',...files]){
 const source=await readFile(new URL(file,root),'utf8');
 for(const match of source.matchAll(/assets\/([a-zA-Z0-9-]+\.png)/g))await access(new URL('assets/'+match[1],root));
}
for(let i=0;i<10;i++)await access(new URL(`assets/topping-photo-${i}.png`,root));
console.log(`PASS: script syntax, referenced assets, ${triples} three-topping plans`);
