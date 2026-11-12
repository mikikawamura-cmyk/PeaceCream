(function(root){
const C=root.PeaceQuizContent,order=['words','courage','dialogue','care','youth'];
const associations={words:['dignity','dialogue'],courage:['justice','human_rights'],dialogue:['reconciliation','dialogue'],care:['compassion','solidarity'],youth:['hope','sustainability']};
const opportunities=Object.fromEntries(order.map(k=>[k,C.questions.slice(3,10).flatMap(q=>q.choices).filter(c=>c[1]===k).length]));
const actionGroups=[
 ['justice','courage','community',['Ask your group whether a small shared task is divided fairly.','Make room for someone who has not had a turn in a shared activity.','Ask what would make one everyday rule feel fairer to everyone involved.']],
 ['dignity','words','community',['Thank someone for a contribution that is often overlooked.','Rewrite a frustrated message so it describes the problem without belittling anyone.','Use someone’s preferred name and invite others to do the same.']],
 ['hope','youth','creative',['Share one small thing you are looking forward to with a friend.','Invite a younger person to imagine a small improvement and help them try it.','Make a tiny drawing or note about a future you would like to help create.']],
 ['human_rights','courage','education',['Ask whether everyone can access the information needed for a shared activity.','Learn about one community resource and share it with someone who asks for help.','Invite someone whose needs are often overlooked to suggest a practical improvement.']],
 ['reconciliation','dialogue','relationships',['Ask someone you disagree with what they wish you understood.','If it feels comfortable, send a gentle invitation to reconnect without demanding a reply.','In a small disagreement, name one thing you both care about.']],
 ['solidarity','care','relationships',['Offer a specific, manageable bit of help to someone with a busy day.','Check in with someone who has been quiet and let them choose whether to talk.','Thank someone who supports your group behind the scenes.']],
 ['freedom','youth','creative',['Invite everyone in a shared activity to choose how they contribute.','Ask a younger person which part of a small project they would like to lead.','Make space for a friend to share a song, story or idea they love.']],
 ['compassion','care','relationships',['Ask someone how their day is going and listen without rushing to fix it.','Offer to sit with someone who would welcome company.','Ask what kind of support would be useful before offering advice.']],
 ['dialogue','dialogue','relationships',['Ask an open question and let the other person finish before responding.','Repeat what you heard and ask whether you understood it correctly.','Invite a friend to share a different perspective on something you both enjoy.']],
 ['sustainability','words','nature',['Take a short walk and pick up a few pieces of litter where it is safe to do so.','Choose one reusable item for an activity you enjoy.','Ask your group for one small way to reduce waste at your next gathering.']]
];
const actions=actionGroups.flatMap(([value,lens,context,texts])=>texts.map((text,i)=>({id:`${value}-${i}`,value,lens,context,text})));
function valid(a){return C.questions.slice(0,10).every(q=>Number.isInteger(a[q.id])&&a[q.id]>=0&&a[q.id]<4)&&Array.isArray(a.q11)&&a.q11.length===2&&new Set(a.q11).size===2&&a.q11.every(v=>C.values.some(x=>x.id===v))&&typeof a.q12==='string'&&a.q12.trim().length>0&&a.q12.length<=40}
function score(a,options={}){
 const structured=C.questions.slice(0,10).every(q=>Number.isInteger(a[q.id])&&a[q.id]>=0&&a[q.id]<4)&&Array.isArray(a.q11)&&a.q11.length===2&&new Set(a.q11).size===2&&a.q11.every(v=>C.values.some(x=>x.id===v));
 if(!(options.structuredOnly?structured:valid(a)))throw Error('Complete all twelve questions.');
 const fs=Object.fromEntries(C.flavors.map(f=>[f.id,0]));C.questions.slice(0,3).forEach(q=>fs[q.choices[a[q.id]][1]]++);
 const tied=C.flavors.filter(f=>fs[f.id]===Math.max(...Object.values(fs))).map(f=>f.id);
 const primary=C.questions.slice(0,3).map(q=>q.choices[a[q.id]][1]).find(id=>tied.includes(id));
 const counts=Object.fromEntries(order.map(id=>[id,0]));C.questions.slice(3,10).forEach(q=>counts[q.choices[a[q.id]][1]]++);
 const ranked=order.map(id=>({id,count:counts[id],opportunities:opportunities[id],score:counts[id]/opportunities[id]})).sort((a,b)=>b.score-a.score||order.indexOf(a.id)-order.indexOf(b.id));
 const leading=ranked.filter(l=>l.count>0).slice(0,2),lens=leading[0].id;
 const suggested=[...associations[lens],...C.values.map(v=>v.id)].find(v=>!a.q11.includes(v));
 const evidence=leading.map(l=>{const q=C.questions.slice(3,10).find(q=>q.choices[a[q.id]][1]===l.id);return {lens:l.id,question:q.id,text:q.choices[a[q.id]][0]}});
 return {flavor:C.flavors.find(f=>f.id===primary),flavorScores:fs,tied,ranked,leading,evidence,chosen:[...a.q11],suggested,expression:a.q12};
}
function recommendActions(result){const context=/nature|earth|garden|environment/i.test(result.expression)?'nature':/family|friend|community|relationship/i.test(result.expression)?'relationships':/music|art|football|sport/i.test(result.expression)?'creative':/education|school|learn/i.test(result.expression)?'education':'community';return [...actions].sort((a,b)=>weight(b)-weight(a)||actions.indexOf(a)-actions.indexOf(b));function weight(a){return (result.chosen.includes(a.value)?6:0)+(result.leading.some(l=>l.id===a.lens)?3:0)+(a.context===context?2:0)}}
root.PeaceQuizEngine={score,valid,opportunities,actions,recommendActions,associations};
})(globalThis);
