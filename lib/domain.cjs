'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const context={};context.window=context;vm.createContext(context);
context.PeaceQuizContent=JSON.parse(fs.readFileSync(path.join(__dirname,'content-v1.json'),'utf8'));
vm.runInContext(fs.readFileSync(path.join(__dirname,'engine-v1.js'),'utf8'),context);
const C=context.PeaceQuizContent,E=context.PeaceQuizEngine;
const VERSION='peacecream-quiz-1',CONSENT='peacecream-consent-5y-1';
const FLAVORS=['strawberry','pistachio','lemon','orange','blueberry','matcha','mango','coconut','chocolate','vanilla'];
class Fault extends Error{constructor(status,message){super(message);this.status=status}}
const fail=m=>{throw new Fault(400,m)};
function object(v,keys,required=keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k))||required.some(k=>!Object.hasOwn(v,k)))fail('Unexpected or missing fields.');return v}
function string(v,max,optional=false){if(optional&&v===null)return null;if(typeof v!=='string'||v.length>max||(!optional&&!v.trim()))fail('Invalid text length.');return v}
function one(v,list){if(!list.includes(v))fail('Unrecognized value.');return v}
function values(v,min=0,max=3){if(!Array.isArray(v)||v.length<min||v.length>max||new Set(v).size!==v.length)fail('Invalid value selection.');v.forEach(x=>one(x,C.values.map(v=>v.id)));return [...v]}
function integer(v,min,max){if(!Number.isInteger(v)||v<min||v>max)fail('Invalid number.');return v}
function token(v){if(typeof v!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(v))fail('Invalid receipt.');return v}
function hash(v){return crypto.createHash('sha256').update(v).digest('hex')}
function receipt(v){object(v,['id','token']);if(typeof v.id!=='string'||!/^[-0-9a-f]{36}$/i.test(v.id))fail('Invalid receipt.');return {id:v.id,tokenHash:hash(token(v.token))}}
function fiveYears(date){const d=new Date(date+'T00:00:00Z'),year=d.getUTCFullYear()+5,month=d.getUTCMonth(),day=d.getUTCDate();d.setUTCFullYear(year,month,1);d.setUTCDate(Math.min(day,new Date(Date.UTC(year,month+1,0)).getUTCDate()));return d.toISOString().slice(0,10)}
function normalize(input,today=new Date().toISOString().slice(0,10)){
 object(input,['mode','version','consent','event','original','latest','final','rating','token','text','synthetic'],['mode','version','consent','original','final','rating','token','synthetic']);
 one(input.mode,['create','discover']);one(input.version,[VERSION]);
 object(input.consent,['version','responses','text','adult']);one(input.consent.version,[CONSENT]);
 if(input.consent.responses!==true||input.consent.adult!==true||typeof input.consent.text!=='boolean')fail('Explicit adult consent is required.');
 if(typeof input.synthetic!=='boolean')fail('Invalid test-data flag.');
 let event=input.event??null;if(event!==null&&(typeof event!=='string'||!(/^[a-z0-9][a-z0-9-]{0,39}$/).test(event)))fail('Invalid event code.');
 const parseOriginal=raw=>{
  if(input.mode==='create'){object(raw,['flavor','values']);return {flavor:one(raw.flavor,FLAVORS),values:values(raw.values,0,2)}}
  object(raw,['answers','values','expressionAnswered']);object(raw.answers,C.questions.slice(0,10).map(q=>q.id));
  const answers={};for(const q of C.questions.slice(0,10)){const id=raw.answers[q.id];one(id,['a','b','c','d'].map(c=>q.id+'-'+c));answers[q.id]=id}
  if(raw.expressionAnswered!==true)fail('The expression question must be completed.');return {answers,values:values(raw.values,2,2),expressionAnswered:true};
 };
 const original=parseOriginal(input.original),latest=input.latest?parseOriginal(input.latest):original;
 object(input.final,['flavor','values','suggestion','action','initialAction','actionChanges'],['flavor','values','suggestion','action','actionChanges']);
 const final={flavor:one(input.final.flavor,FLAVORS),values:values(input.final.values,input.mode==='discover'?2:0,input.mode==='discover'?3:2),suggestion:null,action:null,initialAction:null,actionChanges:integer(input.final.actionChanges,0,10000)};
 let results=null;
 function calculate(snapshot){const answers={q11:snapshot.values};for(const [q,id]of Object.entries(snapshot.answers))answers[q]='abcd'.indexOf(id.slice(-1));const scored=E.score(answers,{structuredOnly:true});return {flavor:scored.flavor.id,quality:scored.flavor.quality,flavorScores:scored.flavorScores,tied:scored.tied,lenses:scored.ranked.map(l=>({id:l.id,count:l.count,opportunities:l.opportunities,normalized:l.score})),leading:scored.leading.map(l=>l.id),suggested:scored.suggested,chosen:scored.chosen}}
 if(input.mode==='discover'){
  results={original:calculate(original),latest:calculate(latest)};
  object(input.final.suggestion,['decision','value']);const sg=input.final.suggestion;
  one(sg.decision,['declined','accepted','replaced']);one(sg.value,C.values.map(v=>v.id));
  if(sg.decision==='accepted'&&sg.value!==results.latest.suggested)fail('Changed suggestions must be marked replaced.');
  if(sg.decision!=='declined'&&!final.values.includes(sg.value))fail('Accepted suggestion missing from final recipe.');
  if(sg.decision==='declined'&&final.values.length>2)fail('Declined suggestion cannot add a third value.');
  final.suggestion={...sg};if(input.final.action!==null)final.action=one(input.final.action,C.actions.map(a=>a.id));if(input.final.initialAction!==null)final.initialAction=one(input.final.initialAction,C.actions.map(a=>a.id));
 }else if(input.final.suggestion!==null||input.final.action!==null||input.final.initialAction!==null||input.final.actionChanges!==0||input.latest)fail('Create has no quiz results.');
 let text=null;
 if(input.consent.text){object(input.text,['originalExpression','finalExpression','explanation'],['originalExpression','finalExpression']);text={originalExpression:string(input.text.originalExpression,40,input.mode==='create'),finalExpression:string(input.text.finalExpression,40,input.mode==='create'),explanation:input.mode==='create'?string(input.text.explanation??'',240,true):null};if(input.mode==='discover'&&input.text.explanation!==undefined)fail('Generated explanations are not participant text.');}
 else if(input.text!==undefined)fail('Free text requires separate consent.');
 const rating=input.rating===null?null:integer(input.rating,1,5);
 const source=results?.latest||original;
 return JSON.parse(JSON.stringify({mode:input.mode,version:VERSION,consent:input.consent,event,original,latest:input.mode==='discover'?latest:null,results,final,customization:{flavorChanged:final.flavor!==source.flavor,actionChanged:final.initialAction!==final.action,valuesChanged:[...final.values].sort().join('|')!==[...(source.chosen||source.values)].sort().join('|')},rating,text,tokenHash:hash(token(input.token)),participationDate:today,expiresOn:fiveYears(today),complete:true,synthetic:input.synthetic}));
}
// Fixed event/year/mode reports are published only as reviewed, frozen snapshots.
// No overlapping live filters: analysts filter already released snapshot rows.
function suppress(categories,threshold=5){const list=categories.map(x=>({...x}));const small=list.filter(x=>x.count>0&&x.count<threshold);if(small.length){const visible=list.filter(x=>x.count>=threshold).sort((a,b)=>a.count-b.count||a.id.localeCompare(b.id));if(small.length===1&&visible.length)small.push(visible[0]);}const hidden=new Set(small.map(x=>x.id));return list.map(x=>({id:x.id,count:hidden.has(x.id)?null:x.count,suppressed:hidden.has(x.id)}))}
function csv(rows,columns){const cell=v=>{let s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);if(/^[\s]*[=+\-@\t\r\n]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};return [columns,...rows.map(row=>columns.map(c=>row[c]))].map(row=>row.map(cell).join(',')).join('\r\n')}
module.exports={VERSION,CONSENT,C,E,FLAVORS,Fault,object,string,one,integer,token,hash,receipt,fiveYears,normalize,suppress,csv};
