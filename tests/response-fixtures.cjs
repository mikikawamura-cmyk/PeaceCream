const {VERSION,CONSENT}=require('../lib/domain.cjs');
function fixture(mode='discover'){
 const answers={};for(let i=1;i<=10;i++)answers['q'+i]='q'+i+'-a';
 return {mode,version:VERSION,consent:{version:CONSENT,responses:true,text:false,adult:true},event:'synthetic-pilot',original:mode==='discover'?{answers,values:['justice','dignity'],expressionAnswered:true}:{flavor:'lemon',values:['hope']},final:{flavor:'lemon',values:mode==='discover'?['justice','dignity']:['hope'],suggestion:mode==='discover'?{decision:'declined',value:'dialogue'}:null,action:mode==='discover'?'justice-0':null,initialAction:mode==='discover'?'justice-0':null,actionChanges:0},rating:null,token:Buffer.alloc(32,17).toString('base64url'),synthetic:true};
}
module.exports={fixture};
