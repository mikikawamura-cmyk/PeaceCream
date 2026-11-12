'use strict';
const crypto=require('node:crypto');
const D=require('./domain.cjs'),{database}=require('./database.cjs'),{buildReport,aggregateCSV}=require('./reports.cjs');
const contact='peacebymiki@gmail.com';
function configuration(env){let mode=env.PC_COLLECTION_MODE||'disabled';if(mode==='enabled'&&env.PC_REAL_COLLECTION_APPROVAL!=='reviewed-18plus-five-years')mode='disabled';if(!['disabled','synthetic','enabled'].includes(mode))mode='disabled';return {mode,configured:!!(env.SUPABASE_URL&&env.SUPABASE_SECRET_KEY),version:D.VERSION,consentVersion:D.CONSENT,contact,retentionYears:5,minimumAge:18}}
function bytesEqual(a,b){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function issueChallenge(hash,secret,now=Date.now()){const stamp=hash+'.'+(now+600000);return stamp+'.'+crypto.createHmac('sha256',secret).update('pc-submit:'+stamp).digest('hex')}
function checkChallenge(challenge,proof,tokenHash,secret,now=Date.now()){if(typeof challenge!=='string'||challenge.length>160||!Number.isInteger(proof)||proof<0||proof>1000000)return false;const [hash,expires,signature]=challenge.split('.');if(hash!==tokenHash||!Number.isFinite(+expires)||+expires<now||+expires>now+600000)return false;const expected=issueChallenge(hash,secret,+expires-600000);return bytesEqual(challenge,expected)&&D.hash(challenge+':'+proof).startsWith('000')}
async function parse(req){if(Number(req.headers['content-length']||0)>16384)throw new D.Fault(413,'Request too large.');if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new D.Fault(415,'Use JSON requests.');if(req.body!==undefined){const b=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(b)>16384)throw new D.Fault(413,'Request too large.');try{return JSON.parse(b)}catch(e){throw new D.Fault(400,'Invalid JSON.')}}let size=0,parts=[];for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>16384)throw new D.Fault(413,'Request too large.');parts.push(chunk)}try{return JSON.parse(Buffer.concat(parts).toString())}catch(e){throw new D.Fault(400,'Invalid JSON.')}}
function originCheck(req){const origin=req.headers.origin,host=req.headers.host;if(!origin||new URL(origin).host!==host)throw new D.Fault(403,'Use the PeaceCream website to make this request.');if(req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin')throw new D.Fault(403,'Cross-site requests are not allowed.')}
function cookie(req){const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pc_organizer='));return raw?decodeURIComponent(raw.slice(13)):null}
function filters(query){const allowed=['event','from','to','mode','version'];for(const k of query.keys())if(!allowed.includes(k))throw new D.Fault(400,'Unsupported filter.');const event=query.get('event');if(event&&!/^[a-z0-9][a-z0-9-]{0,39}$/.test(event))throw new D.Fault(400,'Invalid event filter.');const from=query.get('from'),to=query.get('to');for(const d of [from,to])if(d&&!/^\d{4}-\d{2}-\d{2}$/.test(d))throw new D.Fault(400,'Invalid date filter.');if(from&&to&&from>to)throw new D.Fault(400,'Invalid date range.');const mode=query.get('mode');if(mode)D.one(mode,['create','discover']);const version=query.get('version');if(version)D.one(version,[D.VERSION]);return {event,from,to,mode,version}}
function rawQuery(f,today){return '?expires_on=gt.'+today+'&select=id,participation_date,expires_on,mode,version,event,consent,original,latest,results,final,customization,rating,complete,synthetic&order=id.asc'+(f.event?'&event=eq.'+encodeURIComponent(f.event):'')+(f.from?'&participation_date=gte.'+f.from:'')+(f.to?'&participation_date=lte.'+f.to:'')+(f.mode?'&mode=eq.'+f.mode:'')+(f.version?'&version=eq.'+f.version:'')}
function createHandler({env=process.env,dbFactory=()=>database(env),now=()=>Date.now()}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))};
 try{
  const url=new URL(req.url,'https://'+req.headers.host),route=url.pathname.replace(/^\/api\//,'');
  // Vercel appends dynamic path captures to the function query string.
  // Remove only a single capture matching the actual path; keep filter validation strict.
  for(const key of ['route','...route'])if(url.searchParams.has(key)){if(url.searchParams.getAll(key).length!==1||url.searchParams.get(key)!==route)throw new D.Fault(400,'Invalid route parameter.');url.searchParams.delete(key)}
  if(req.method==='GET'&&route==='config')return send(200,configuration(env));
  const allowed={challenge:'POST',submit:'POST',rating:'POST',withdraw:'POST',login:'POST',logout:'POST',session:'GET',reports:'GET',texts:'GET',export:'POST','report-release':'POST'};
  if(allowed[route]!==req.method)throw new D.Fault(405,'Method or endpoint not allowed.');
  if(req.method==='POST')originCheck(req);
  const body=req.method==='POST'?await parse(req):null,db=dbFactory(),cfg=configuration(env);
  if(route==='challenge'){D.object(body,['tokenHash']);if(!/^[0-9a-f]{64}$/.test(body.tokenHash))D.one(null,[]);if(cfg.mode==='disabled'||!cfg.configured)throw new D.Fault(503,'Response collection is not enabled.');return send(200,{challenge:issueChallenge(body.tokenHash,env.SUPABASE_SECRET_KEY,now())})}
  if(route==='submit'){
   if(cfg.mode==='disabled'||!cfg.configured)throw new D.Fault(503,'Response collection is not enabled.');
   D.object(body,['response','challenge','proof']);const record=D.normalize(body.response,new Date(now()).toISOString().slice(0,10));
   if(cfg.mode==='synthetic'&&!record.synthetic)throw new D.Fault(403,'Preview accepts synthetic test data only.');
   if(!checkChallenge(body.challenge,body.proof,record.tokenHash,env.SUPABASE_SECRET_KEY,now()))throw new D.Fault(400,'The submission check expired. Please try again.');
   const saved=await db.rpc('pc_submit',{p:record});return send(200,{id:saved.id,expiresOn:saved.expiresOn});
  }
  if(route==='rating'||route==='withdraw'){
   D.object(body,route==='rating'?['id','token','rating']:['id','token']);const r=D.receipt({id:body.id,token:body.token});if(route==='rating')D.integer(body.rating,1,5);
   const ok=await db.rpc('pc_manage',{p_id:r.id,p_hash:r.tokenHash,p_operation:route,p_rating:route==='rating'?body.rating:null});if(!ok)throw new D.Fault(404,'Receipt not found, expired, or no longer valid.');return send(200,{ok:true});
  }
  if(route==='login'){
   D.object(body,['email','password']);D.string(body.email,254);D.string(body.password,256);
   const bucket='login:'+D.hash(body.email.toLowerCase()+':'+env.SUPABASE_SECRET_KEY);if(!await db.rpc('pc_limit',{p_bucket:bucket,p_limit:10,p_seconds:900}))throw new D.Fault(429,'Please wait before trying again.');
   const session=await db.login(body.email,body.password),who=await db.role(session.access_token);
   res.setHeader('Set-Cookie','pc_organizer='+encodeURIComponent(session.access_token)+'; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age='+Math.min(session.expires_in||3600,3600));return send(200,{role:who.role});
  }
  if(route==='logout'){res.setHeader('Set-Cookie','pc_organizer=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0');return send(200,{ok:true})}
  const access=cookie(req);if(!access)throw new D.Fault(401,'Please sign in.');const who=await db.role(access);
  if(route==='session')return send(200,{role:who.role});
  if(['texts','report-release'].includes(route)&&who.role!=='research_admin')throw new D.Fault(403,'Research Administrator access is required.');
  if(route==='reports'){
   const f=filters(url.searchParams),reports=await db.table('pc_reports','?published=eq.true&select=id,event,year,mode,version,data,retention,expires_on');
   const rows=reports.filter(r=>(r.retention==='reviewed_anonymous'||r.expires_on>new Date(now()).toISOString().slice(0,10))&&(!f.event||r.event===f.event)&&(!f.mode||r.mode===f.mode)&&(!f.version||r.version===f.version)&&(!f.from||r.year>=+f.from.slice(0,4))&&(!f.to||r.year<=+f.to.slice(0,4)));
   return send(200,{reports:rows,policy:'Frozen, reviewed event/year/mode/version cohorts only. Date filters select whole years. No public reports.'});
  }
  if(route==='texts'){const selected=await db.rows(rawQuery(filters(url.searchParams),new Date(now()).toISOString().slice(0,10))),ids=new Set(selected.map(r=>r.id)),texts=await db.pages('pc_text','?select=submission_id,original_expression,final_expression,explanation&order=submission_id.asc');return send(200,{rows:texts.filter(t=>ids.has(t.submission_id)).slice(0,100)})}
  if(route==='export'){
   D.object(body,['kind','reason','confirmSensitive','filters']);D.one(body.kind,['aggregate','text','raw']);D.string(body.reason,500);if(body.reason.trim().length<20)throw new D.Fault(400,'Explain the purpose of this export in at least 20 characters.');
   if(body.kind!=='aggregate'&&(who.role!=='research_admin'||body.confirmSensitive!==true))throw new D.Fault(403,'Sensitive export authorization required.');
   const f=filters(new URLSearchParams(body.filters)),audit=await db.table('pc_exports','','POST',{organizer_id:who.id,kind:body.kind,reason:body.reason,status:'requested'});let output,number=0;
   if(body.kind==='aggregate'){const reports=await db.table('pc_reports','?published=eq.true&select=event,year,mode,version,data,retention,expires_on');const selected=reports.filter(r=>(r.retention==='reviewed_anonymous'||r.expires_on>new Date(now()).toISOString().slice(0,10))&&(!f.event||r.event===f.event)&&(!f.mode||r.mode===f.mode)&&(!f.version||r.version===f.version)&&(!f.from||r.year>=+f.from.slice(0,4))&&(!f.to||r.year<=+f.to.slice(0,4)));output=aggregateCSV(selected);number=selected.length}
   else{const rows=await db.rows(rawQuery(f,new Date(now()).toISOString().slice(0,10)));const texts=body.kind==='text'?await db.pages('pc_text','?select=submission_id,original_expression,final_expression,explanation&order=submission_id.asc'):null;const selected=texts?texts.filter(t=>rows.some(r=>r.id===t.submission_id)):rows;output=D.csv(selected,texts?['submission_id','original_expression','final_expression','explanation']:['id','participation_date','mode','version','event','original','latest','results','final','customization','rating','synthetic']);number=selected.length}
   await db.table('pc_exports','?id=eq.'+audit[0].id,'PATCH',{status:'completed',row_count:number});res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="peacecream-'+body.kind+'.csv"');res.statusCode=200;return res.end(output);
  }
  if(route==='report-release'){
   D.object(body,['event','year','mode','version','reason','confirmClosed']);D.integer(body.year,2020,2100);D.one(body.mode,['create','discover']);D.one(body.version,[D.VERSION]);if(body.event!==null&&!/^[a-z0-9][a-z0-9-]{0,39}$/.test(body.event))throw new D.Fault(400,'Invalid event code.');D.string(body.reason,500);if(body.confirmClosed!==true||body.reason.length<20)throw new D.Fault(400,'Confirm the cohort is closed and document your review.');
   const cohortKey=JSON.stringify([body.event,body.year,body.mode,body.version]);const prior=await db.table('pc_reports','?cohort_key=eq.'+encodeURIComponent(cohortKey)+'&select=id');if(prior.length)throw new D.Fault(409,'This cohort was already frozen. It cannot be regenerated.');
   const rows=await db.rows(rawQuery({event:body.event,from:body.year+'-01-01',to:body.year+'-12-31',mode:body.mode,version:body.version},new Date(now()).toISOString().slice(0,10)));const scoped=rows.filter(r=>r.event===body.event);const data=buildReport(scoped);if(!data)throw new D.Fault(409,'At least five submissions are required.');
   await db.table('pc_reports','','POST',{cohort_key:cohortKey,event:body.event,year:body.year,mode:body.mode,version:body.version,data,published:true,expires_on:scoped.map(r=>r.expires_on).sort()[0]});
   await db.table('pc_exports','','POST',{organizer_id:who.id,kind:'aggregate',reason:'Frozen cohort release: '+body.reason,status:'completed',row_count:scoped.length});return send(200,{ok:true,policy:'Limited retention. No claim of anonymity; no indefinite archive approved.'});
  }
 }catch(error){send(error instanceof D.Fault?error.status:503,{error:error instanceof D.Fault?error.message:'The secure service is unavailable. No operation was confirmed.'})}
}}
module.exports={createHandler,configuration,issueChallenge,checkChallenge,parse,originCheck,filters,bytesEqual};
