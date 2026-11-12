const {Fault}=require('./domain.cjs');
function database(env=process.env,fetcher=fetch){
 const url=env.SUPABASE_URL,key=env.SUPABASE_SECRET_KEY;
 if(!url||!key||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Fault(503,'Database setup is incomplete. No response was saved.');
 async function request(route,{method='GET',body,token}={}){const bearer=token||(!key.startsWith('sb_')?key:null);const response=await fetcher(url+route,{method,headers:{apikey:key,...(bearer?{Authorization:'Bearer '+bearer}:{}),'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Fault(token&&[401,403].includes(response.status)?401:503,token&&[401,403].includes(response.status)?'Please sign in again.':'The secure data service is unavailable. Please try again.');return response.status===204?null:response.json()}
 const table=(name,query='',method='GET',body)=>request('/rest/v1/'+name+query,{method,body});
 async function pages(name,query){let rows=[];for(let offset=0;offset<10001;offset+=1000){const part=await table(name,query+'&limit=1000&offset='+offset);rows.push(...part);if(part.length<1000)return rows}throw new Fault(413,'This export is too large. Narrow its scope.');}
 return {rpc:(name,body)=>request('/rest/v1/rpc/'+name,{method:'POST',body}),table,pages,
  async role(token){const user=await request('/auth/v1/user',{token});const roles=await table('pc_organizers','?user_id=eq.'+encodeURIComponent(user.id)+'&active=eq.true&select=role');if(!roles.length)throw new Fault(403,'Organizer access is not authorized.');return {id:user.id,role:roles[0].role}},
  async login(email,password){const response=await fetcher(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY||key,'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Fault(401,'Sign-in failed.');return response.json()},
  rows:query=>pages('pc_submissions',query)
 };
}
module.exports={database};
