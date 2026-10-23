export async function verifyCompanionDiscovery({database,put,check,defaultProfile}){
 const {automationAction,withCompanionLease}=await import('../lib/automation.ts');
 const {normalizeGreenhouse}=await import('../lib/sync.ts');const {SOURCES}=await import('../lib/sources.ts');
 const {POST}=await import('../app/api/companion/route.ts');
 const user='companion-discovery-fixture',other='companion-discovery-other',previousUser=globalThis.__nextroleTestUser,ids=[];let token;
 const request=async(whoToken=token)=>{const r=await POST(new Request('https://nextrole.test/api/companion',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+whoToken},body:JSON.stringify({action:'matched-jobs'})}));return {response:r,data:await r.json()};};
 const pair=async(consent,who=user)=>{const r=await withCompanionLease(who,()=>automationAction(who,{action:'pair',consent}));if(who===user)token=r.token;return r;};
 try{
  const profileResponse=await put({action:'profile',profile:{...defaultProfile,name:'Discovery fixture',experience:0,graduationYear:'2027',completed:true}},user);check(profileResponse.ok,'The isolated discovery fixture must complete onboarding.');
  await pair('COMPANION_WORKSPACE');check((await request()).response.status===403,'A saving-only token does not silently gain access to matched job alerts.');
  const paired=await pair('COMPANION_DISCOVERY');check(paired.state.discoveryPaired&&paired.state.workspacePaired,'Fresh explicit discovery consent includes its declared workspace capabilities.');
  const insert=async(name,changes={},owner=user)=>{
   const date=new Date().toISOString(),id='radar-test:'+name;
   const job={...normalizeGreenhouse({id:200+ids.length,internal_job_id:200+ids.length,title:changes.title||'Software Engineering Intern',location:{name:'Bengaluru, India'},content:changes.description||'<p>No prior experience required. Students graduating in 2027 are eligible. Python and SQL. This is an on-site internship.</p>',absolute_url:'https://job-boards.greenhouse.io/'+SOURCES[0].token+'/jobs/'+name},SOURCES[0],date),id,key:id,...changes};ids.push(id);
   await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES(?,?,?,?,?,?,?)').bind(id,job.key,job.sourceId,JSON.stringify(job),job.firstSeen,job.lastChecked,Number(job.active)).run();
   await database.prepare('INSERT INTO notifications(id,user_id,job_key,title,body,type,created_at) VALUES(?,?,?,?,?,?,?)').bind('radar-alert:'+name,owner,job.key,job.title,'Match','match',date).run();return job;
  };
  const good=await insert('good');
  await insert('experience',{title:'Software Engineering Intern 3–4 years experience',description:'At least 3 years of professional experience required. Students graduating in 2027 are eligible. This is an on-site internship in India.'});
  await insert('batch',{description:'No prior experience required. Only 2026 graduates eligible. On-site internship in India.'});
  await insert('stale',{lastChecked:new Date(Date.now()-2*86400000).toISOString()});
  await insert('closed',{active:false});
  await insert('expired',{deadline:'2020-01-01T00:00:00Z'});
  await insert('unknown',{availability:'unknown'});
  await insert('other-student',{},other);
  for(const state of ['applied','interested','dismissed']){const j=await insert(state);await put({action:'status',jobId:j.id,status:state,note:'Private note must never leave the app'},user);}
  let result=await request();check(result.response.ok&&result.data.jobs.length===1&&result.data.jobs[0].id===good.id,'Inbox uses current title/JD experience, graduation, freshness, availability and tracking checks; other students’ alerts are excluded. Fixture result: '+JSON.stringify(result.data));
  check(!JSON.stringify(result.data).includes('Private note')&&!JSON.stringify(result.data).includes('token_hash')&&!JSON.stringify(result.data).includes('profile'),'The inbox returns narrow job summaries without notes, career facts or credentials.');
  await database.prepare('UPDATE profiles SET data=json_set(data,\'$.experience\',3) WHERE user_id=?').bind(user).run();
  result=await request();check(result.data.jobs.some(j=>j.id==='radar-test:experience'),'Current preference changes are re-evaluated rather than using an old cached match score.');
  await put({action:'profile',profile:{...defaultProfile,name:'Discovery fixture',experience:0,graduationYear:'2027',completed:true,alerts:false}},user);result=await request();check(!result.data.alertsEnabled&&result.data.jobs.length===0,'Turning job alerts off in NextRole suppresses the companion inbox.');
  await pair('COMPANION_WORKSPACE');check((await request()).response.status===403,'Replacing a discovery connection with a saving-only connection removes inbox access.');
 }finally{for(const who of [user,other])await put({action:'delete-account-data',confirmation:'DELETE'},who);for(const id of ids)await database.prepare('DELETE FROM jobs WHERE id=?').bind(id).run();globalThis.__nextroleTestUser=previousUser;}
}
