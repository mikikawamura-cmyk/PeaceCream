const {Fault}=require('./domain.cjs');
function database(env=process.env,fetcher=fetch){
 const url=env.SUPABASE_URL,key=env.SUPABASE_SECRET_KEY;
 if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Fault(503,'Database setup is incomplete. No response was saved.');
 async function request(route,{method='GET',body,token}={}){const bearer=token||(!key.startsWith('sb_')?key:null);const response=await fetcher(url+route,{method,headers:{apikey:key,...(bearer?{Authorization:'Bearer '+bearer}:{}),'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Fault(token&&[401,403].includes(response.status)?401:503,token&&[401,403].includes(response.status)?'Please sign in again.':'The secure data service is unavailable. Please try again.');return response.status===204?null:response.json()}
 const table=(name,query='',method='GET',body)=>request('/rest/v1/'+name+query,{method,body});
 async function pages(name,query){let rows=[];for(let offset=0;offset<10001;offset+=1000){const part=await table(name,query+'&limit=1000&offset='+offset);rows.push(...part);if(part.length<1000)return rows}throw new Fault(413,'This export is too large. Narrow its scope.');}
 return {rpc:(name,body)=>request('/rest/v1/rpc/'+name,{method:'POST',body}),table,pages,
  async role(token){const user=await request('/auth/v1/user',{token});
   // Auth verifies the JWT first; decoding alone never authenticates a request.
   let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'))}catch{throw new Fault(401,'Please sign in again.')}if(claims.sub!==user.id||!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now()||!/^[-a-f0-9]{36}$/.test(claims.session_id||''))throw new Fault(401,'Please sign in again.');
   const state=await request('/rest/v1/rpc/pc_session_state',{method:'POST',body:{p_user:user.id,p_session:claims.session_id}});if(!state.valid)throw new Fault(401,'Your session was revoked. Please sign in again.');const roles=await table('pc_organizers','?user_id=eq.'+encodeURIComponent(user.id)+'&active=eq.true&select=role');if(!roles.length)throw new Fault(403,'Organizer access is not authorized.');return {id:user.id,role:roles[0].role,aal:claims.aal==='aal2'&&state.mfa?'aal2':'aal1',issuedAt:claims.iat,factors:(user.factors||[]).filter(f=>f.factor_type==='totp').map(f=>({id:f.id,status:f.status}))}},
  async login(email,password){const response=await fetcher(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY||key,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Fault(401,'Sign-in failed.');return response.json()},
  async enroll(token){return request('/auth/v1/factors',{method:'POST',token,body:{factor_type:'totp',friendly_name:'PeaceCream Studio',issuer:'PeaceCream'}})},
  async verify(token,factorId,code){const challenge=await request('/auth/v1/factors/'+factorId+'/challenge',{method:'POST',token,body:{}});try{return await request('/auth/v1/factors/'+factorId+'/verify',{method:'POST',token,body:{challenge_id:challenge.id,code}})}catch(error){if(error.status===401||error.status===503)throw new Fault(400,'The authenticator code was not accepted. Check the code and your device clock, then try again.');throw error}},
  logout:token=>request('/auth/v1/logout?scope=local',{method:'POST',token,body:{}}),
  rows:query=>pages('pc_submissions',query)
 };
}
module.exports={database};
