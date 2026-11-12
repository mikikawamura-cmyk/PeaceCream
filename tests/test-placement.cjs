const assert=require('node:assert/strict');
const R=require('../gelato-renderer.js');
const combos=[[],...Array.from({length:10},(_,i)=>[i])];for(let a=0;a<10;a++)for(let b=a+1;b<10;b++)combos.push([a,b]);
let tested=0,pieces=0,maxCoverage=0;
for(let flavor=0;flavor<10;flavor++)for(const selected of combos){
 const plan=R.buildPlan(flavor,selected);
 assert.equal(plan.length,selected.reduce((n,id)=>n+R.RECIPES[id].count,0));
 assert.deepEqual(plan,R.buildPlan(flavor,selected),'Placement must be repeatable');
 assert.deepEqual(plan,R.buildPlan(flavor,[...selected].reverse()),'Selection order must not separate toppings');
 for(const id of selected){const own=plan.filter(p=>p.id===id);assert.ok(own.length>=5);assert.ok(Math.max(...own.map(p=>p.x))-Math.min(...own.map(p=>p.x))>.15,'Spread ingredients across scoop');}
 for(const p of plan){assert.ok(R.inside(p.x,p.y,R.SURFACES[flavor]));assert.ok(p.y+p.size*.62<.64,'Keep all toppings off the cup');assert.ok(p.size<.10);assert.ok(p.squash>.5&&p.squash<=1);assert.ok(p.embed>0&&p.embed<.25);}
 for(let i=0;i<plan.length;i++)for(let j=0;j<i;j++){const a=plan[i],b=plan[j];assert.ok(Math.hypot(a.x-b.x,(a.y-b.y)*1.12)>=(a.size+b.size)*.43,'Pieces must not collide');}
 const coverage=plan.reduce((n,p)=>n+p.size*p.size*.6,0)/.2;maxCoverage=Math.max(maxCoverage,coverage);assert.ok(coverage<.25,'Leave most gelato visible');
 tested++;pieces+=plan.length;
}
assert.throws(()=>R.buildPlan(0,[0,1,2,3]));assert.throws(()=>R.buildPlan(10,[]));assert.throws(()=>R.buildPlan(0,[-1]));
console.log(JSON.stringify({result:'PASS',flavors:10,combinationsPerFlavor:combos.length,renderConfigurations:tested,piecesChecked:pieces,maxApproximateCoverage:Math.round(maxCoverage*100)+'%',checks:['piece counts','determinism','selection order','mixed surface distribution','surface bounds','cup exclusion','piece spacing','density','input validation']},null,2));
