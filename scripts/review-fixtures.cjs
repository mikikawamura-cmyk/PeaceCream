// Invented test-project examples only. Never import into the deployed app.
const crypto=require('node:crypto'),D=require('../lib/domain.cjs'),{fixture}=require('../tests/response-fixtures.cjs');
const EVENT='synthetic-launch-review';
function reviewFixtures(){const rows=[];for(const mode of ['create','discover'])for(let i=0;i<12;i++){
 const p=fixture(mode);p.event=EVENT;p.token=crypto.randomBytes(32).toString('base64url');p.rating=i===11?2:i<6?5:4;
 if(mode==='discover'){
  for(let q=1;q<=10;q++)p.original.answers['q'+q]='q'+q+'-'+(i<6?'a':'b');
  p.original.values=i<6?['justice','dignity']:['hope','sustainability'];
  p.latest=structuredClone(p.original);if(i===11)p.latest.answers.q4='q4-c';
  const preliminary=D.normalize(p);p.final.flavor=i<6?preliminary.results.original.flavor:i===11?'vanilla':'lemon';
  p.final.values=[...p.original.values];p.final.suggestion={decision:i<6?'accepted':'declined',value:preliminary.results.latest.suggested};
  if(i<6)p.final.values.push(p.final.suggestion.value);
  p.final.initialAction=D.C.actions[0].id;p.final.action=D.C.actions[i<6?0:1].id;p.final.actionChanges=i<6?0:1;
 }else{
  p.original={flavor:i<6?'strawberry':'matcha',values:i<6?['hope','compassion']:['dignity','dialogue']};
  p.final.flavor=i<6?'strawberry':i===11?'vanilla':'lemon';p.final.values=i===11?['hope','dialogue']:[...p.original.values];
 }
 if(i===0||i===6){p.consent.text=true;p.text={originalExpression:'Synthetic '+mode+' example '+i,finalExpression:'Synthetic peace through 音楽'};if(mode==='create')p.text.explanation='Invented example for prelaunch review only.';}
 rows.push(D.normalize(p));
}return rows}
module.exports={reviewFixtures,EVENT};
