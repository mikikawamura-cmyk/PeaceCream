import assert from 'node:assert/strict';import {createRequire} from 'node:module';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),D=require('../lib/domain.cjs'),S=require('../lib/server.cjs'),{buildReport}=require('../lib/reports.cjs'),{fixture}=require('./response-fixtures.cjs');let checks=0;
function test(name,fn){fn();checks++;}
test('Complete original answers preserved',()=>{const p=D.normalize(fixture());assert.equal(Object.keys(p.original.answers).length,10);assert.equal(JSON.stringify(p.original.values),'["justice","dignity"]');assert.equal(p.text,null);assert.equal(p.results.original.flavor,'strawberry');assert.equal(p.results.original.lenses.find(x=>x.id==='words').opportunities,6);assert.ok(!JSON.stringify(p).includes(fixture().token));assert.equal(p.final.flavor,'lemon');assert.ok(p.customization.flavorChanged)});
test('Create is not a fabricated quiz',()=>{const p=D.normalize(fixture('create'));assert.equal(p.results,null);assert.equal(p.latest,null);assert.equal(p.original.answers,undefined)});
for(const mutate of [p=>p.consent.adult=false,p=>p.consent.responses=false,p=>p.consent.version='old',p=>p.original.answers.q1='q1-z',p=>p.original.answers.q2='q3-a',p=>p.original.values=['justice','justice'],p=>p.final.flavor='banana',p=>p.final.values=['invented'],p=>p.ip='127.0.0.1',p=>p.text={originalExpression:'Private'},p=>p.results={flavor:'orange'},p=>p.original.expressionAnswered=false,p=>p.rating=6,p=>p.event='usa/<script>',p=>p.final.action='invented'])test('Reject invalid/unconsented payload',()=>{const p=fixture();mutate(p);assert.throws(()=>D.normalize(p))});
test('Exact original/final text separate',()=>{const p=fixture();p.consent.text=true;p.text={originalExpression:'Family & 音楽',finalExpression:'Music <3'};const result=D.normalize(p);assert.equal(result.text.originalExpression,p.text.originalExpression);assert.equal(result.text.finalExpression,p.text.finalExpression);p.text.explanation='AI says you are caring';assert.throws(()=>D.normalize(p))});
test('Decline cannot render third topping',()=>{const p=fixture();p.final.values.push('hope');assert.throws(()=>D.normalize(p))});
test('Five years and leap-year boundary',()=>{assert.equal(D.fiveYears('2024-02-29'),'2029-02-28');assert.equal(D.fiveYears('2026-11-11'),'2031-11-11')});
test('Complementary suppression hides singleton',()=>{const out=D.suppress([{id:'a',count:1},{id:'b',count:6},{id:'c',count:20}]);assert.equal(out[0].count,null);assert.equal(out[1].count,null);assert.equal(out[2].count,20)});
test('CSV formula injection escaped',()=>{assert.ok(D.csv([{t:'=HYPERLINK("evil")'}],['t']).includes("'=HYPERLINK"));assert.ok(D.csv([{t:'\t=1+1'}],['t']).includes("'\t=1+1"))});
test('Reports omit all free text and token material',()=>{const row=D.normalize(fixture());const report=buildReport(Array.from({length:6},()=>row));const encoded=JSON.stringify(report);assert.ok(!encoded.includes('tokenHash'));assert.ok(!encoded.includes('originalExpression'));assert.equal(buildReport([row]),null);assert.equal(buildReport(Array.from({length:6},()=>D.normalize(fixture('create')))).metrics.leadingLenses,undefined)});
test('Real collection fails closed',()=>{assert.equal(S.configuration({PC_COLLECTION_MODE:'enabled'}).mode,'disabled')});
test('Receipt hash and compare',()=>{assert.equal(D.hash(fixture().token).length,64);assert.ok(S.bytesEqual('a','a'));assert.ok(!S.bytesEqual('a','ab'));assert.throws(()=>D.receipt({id:'bad',token:'123'}))});
let nonce=S.issueChallenge(D.hash(fixture().token),'test-secret',1000),solution=0;while(!D.hash(nonce+':'+solution).startsWith('000'))solution++;
test('Challenge expiry, binding and work',()=>{assert.ok(S.checkChallenge(nonce,solution,D.hash(fixture().token),'test-secret',1001));assert.ok(!S.checkChallenge(nonce,solution,'f'.repeat(64),'test-secret',1001));assert.ok(!S.checkChallenge(nonce,solution,D.hash(fixture().token),'test-secret',601001))});
const calls=[];let adminRole='analyst';const db={rpc:async(name,p)=>{calls.push({name,p});if(name==='pc_submit')return {id:'11111111-1111-4111-8111-111111111111',expiresOn:'2031-11-11'};return true},role:async()=>({id:'11111111-1111-4111-8111-111111111111',role:adminRole}),table:async(name)=>{calls.push({table:name});return []},rows:async()=>[]};
const env={PC_COLLECTION_MODE:'synthetic',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'test-secret'};
async function invoke(route,body,options={}){const response={headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=v}};await S.createHandler({env,dbFactory:()=>db,now:()=>1001})({url:'/api/'+route,method:body===undefined?'GET':'POST',headers:{host:'example.test',origin:'https://example.test','content-type':'application/json',...options.headers},body},response);return response}
assert.equal((await invoke('submit',{response:fixture(),challenge:nonce,proof:solution})).statusCode,200);checks++;
assert.equal(calls.find(c=>c.name==='pc_submit').p.p.text,null);checks++;
assert.equal((await invoke('submit',{response:{...fixture(),synthetic:false},challenge:nonce,proof:solution})).statusCode,403);checks++;
assert.equal((await invoke('submit',{response:fixture(),challenge:nonce,proof:solution},{headers:{origin:'https://evil.test'}})).statusCode,403);checks++;
assert.equal((await invoke('reports')).statusCode,401);checks++;
assert.equal((await invoke('texts',undefined,{headers:{cookie:'pc_organizer=valid'}})).statusCode,403);checks++;
assert.equal((await invoke('export',{kind:'raw',reason:'Research question for this synthetic test',confirmSensitive:true,filters:{}},{headers:{cookie:'pc_organizer=valid'}})).statusCode,403);checks++;
assert.equal((await invoke('rating',{id:'11111111-1111-4111-8111-111111111111',token:fixture().token,rating:4})).statusCode,200);checks++;
assert.equal((await invoke('submit',{a:'x'.repeat(17000)})).statusCode,413);checks++;
// The browser's card decoder and storage logic are tested without any API or DOM access.
const storage=new Map(),sandbox={crypto:globalThis.crypto,TextEncoder,TextDecoder,atob,btoa,URL,URLSearchParams,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},toast:()=>{}};vm.createContext(sandbox);vm.runInContext(await readFile(new URL('../collection.js',import.meta.url),'utf8'),sandbox);const P=sandbox.PeaceCreamData;
const card={v:1,flavor:0,toppings:[1,2],peace:'Music & 音楽 <3',why:'My own words'};
assert.equal(P.decode(P.encode(card)).peace,card.peace);checks++;assert.throws(()=>P.decode('invalid!'));checks++;
assert.equal(P.validCard({...card,token:'secret'}),false);checks++;assert.equal(P.validCard({...card,toppings:[1,1]}),false);checks++;
for(let i=0;i<21;i++)P.save(card);assert.equal(P.load(P.storage.cards).length,20);checks++;
storage.set(P.storage.cards,'broken');assert.equal(P.load(P.storage.cards).length,0);checks++;
console.log(JSON.stringify({responseSecurityTests:'PASS',checks,apiAdapter:'Synthetic test double; real PostgreSQL tests run separately.'}));
