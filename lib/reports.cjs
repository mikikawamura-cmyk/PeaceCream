const {C,FLAVORS,suppress,csv}=require('./domain.cjs');
const DISCLAIMER='These results reflect voluntary responses to a reflective peace activity, not scientifically validated personality measurements.';
function buildReport(rows){
 if(rows.length<5)return null;
 const count=(ids,select)=>suppress(ids.map(id=>({id,count:rows.filter(r=>select(r).includes(id)).length})));
 const values=C.values.map(v=>v.id),lenses=Object.keys(C.lenses);
 const report={participants:rows.length,complete:rows.filter(r=>r.complete).length,disclaimer:DISCLAIMER,metrics:{
  finalFlavors:count(FLAVORS,r=>[r.final.flavor]),finalValues:count(values,r=>r.final.values),chosenValues:count(values,r=>r.original.values),
  changedFlavor:count(['changed','unchanged'],r=>[r.customization.flavorChanged?'changed':'unchanged']),changedToppings:count(['changed','unchanged'],r=>[r.customization.valuesChanged?'changed':'unchanged']),
  combinations:count([...new Set(rows.map(r=>[...r.final.values].sort().join(' + ')||'none'))],r=>[[...r.final.values].sort().join(' + ')||'none']),
  ratings:count(['1','2','3','4','5','unanswered'],r=>[r.rating?String(r.rating):'unanswered'])
 }};
 const rated=rows.filter(r=>r.rating!==null);report.averageRating=rated.length>=5?Math.round(rated.reduce((n,r)=>n+r.rating,0)/rated.length*10)/10:null;
 if(rows[0].mode==='discover'){
  report.metrics.recommendedFlavors=count(C.flavors.map(f=>f.id),r=>[r.results.original.flavor]);
  report.metrics.innerPeace=count(C.flavors.map(f=>f.quality),r=>[r.results.original.quality]);
  report.metrics.leadingLenses=count(lenses,r=>r.results.original.leading);
  report.metrics.suggestedValues=count(values,r=>[r.results.original.suggested]);
  report.metrics.suggestionDecisions=count(['accepted','declined','replaced'],r=>[r.final.suggestion.decision]);
  for(const q of C.questions.slice(0,10))report.metrics[q.id]=count(['a','b','c','d'].map(c=>q.id+'-'+c),r=>[r.original.answers[q.id]]);
  for(const lens of lenses){
   report.metrics[lens+'Counts']=count(['0','1','2','3','4','5','6'],r=>[String(r.results.original.lenses.find(l=>l.id===lens).count)]);
   report.metrics[lens+'Normalized']=count(['0','0–0.25','0.25–0.5','0.5–0.75','0.75–1'],r=>{const n=r.results.original.lenses.find(l=>l.id===lens).normalized;return [n===0?'0':n<=.25?'0–0.25':n<=.5?'0.25–0.5':n<=.75?'0.5–0.75':'0.75–1']});
  }
 }
 return report;
}
function aggregateCSV(reports){return csv(reports.flatMap(r=>Object.entries(r.data.metrics).flatMap(([metric,cells])=>cells.map(c=>({event:r.event,year:r.year,mode:r.mode,version:r.version,metric,category:c.id,count:c.count,suppressed:c.suppressed})))),['event','year','mode','version','metric','category','count','suppressed'])}
module.exports={DISCLAIMER,buildReport,aggregateCSV};
