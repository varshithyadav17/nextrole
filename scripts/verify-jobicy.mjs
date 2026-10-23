import {readFileSync} from 'node:fs';

// Uses the same real handlers and isolated D1 as verify-app. Never touches production.
export async function verifyJobicy({database,put,check,defaultProfile,SOURCES}){
 const {normalizeJobicy}=await import('../lib/job-feeds.ts');
 const {fetchJobicyPage,checkJobicyStatuses}=await import('../lib/jobicy.ts');
 const {advanceJobicy}=await import('../lib/jobicy-sync.ts');
 const {syncJobs,refreshJob,createAlerts,refreshSavedDetails}=await import('../lib/sync.ts');
 const {matchJob}=await import('../lib/matching.ts');
 const {candidateJobs}=await import('../lib/job-selection.ts');
 const {getData,getJob}=await import('../lib/store.ts');
 const {discoveryMetrics}=await import('../lib/discovery-metrics.ts');
 const sourceIndex=SOURCES.findIndex(s=>s.provider==='jobicy'),source=SOURCES[sourceIndex],stateKey='jobicy_state:'+source.id,now=new Date().toISOString();
 const native=globalThis.fetch,normalDB=globalThis.__nextroleTestEnv.DB;
 const profile={...defaultProfile,name:'Discovery student',roles:['Software engineer'],locations:['Anywhere'],graduationYear:'2027',degree:'',completed:true};
 const raw={id:610001,jobTitle:'Software Engineer',companyName:'Discovery Works',jobGeo:'Anywhere',jobLevel:'Entry-level',jobType:['Full-Time'],jobDescription:'<p>No prior experience required. Python and SQL.</p>',url:'https://jobicy.com/jobs/610001-software-engineer',pubDate:now};
 const page=(jobs,nextCursor=null)=>({success:true,statusCode:200,jobCount:jobs.length,jobs,hasMore:nextCursor!==null,nextCursor});
 const fresh=normalizeJobicy(raw,source,now);
 check(fresh.company==='Discovery Works'&&fresh.sourceLabel==='Jobicy'&&fresh.mode==='Remote'&&fresh.sourceCategory==='job-board','Job-board jobs retain the actual employer, original source and remote scope.');
 check(fresh.canonicalUrl===raw.url&&fresh.sourceUrl===raw.url&&fresh.availability==='unknown','Unverified rows retain a canonical Jobicy URL without inventing open status.');
 for(const url of ['https://localhost/jobs/610001-role','https://jobicy.com/jobs/610002-other','http://jobicy.com/jobs/610001-role','https://jobicy.com@evil.example/jobs/610001-role'])check(!normalizeJobicy({...raw,url},source,now),'Untrusted or mismatched job URLs are rejected.');
 const confirmed={...fresh,availability:'open',availabilityCheckedAt:now};
 check(matchJob(confirmed,profile).relevant&&!matchJob(confirmed,profile).uncertain,'An explicit zero-experience source job can match a fresher who chose all locations.');
 check(!matchJob({...confirmed,sourceSeniority:'Senior'},profile).relevant&&!matchJob({...confirmed,sourceSeniority:'Mid-level'},profile).relevant,'Published seniority prevents fresher matches even when the title omits seniority.');
 check(matchJob(confirmed,{...profile,locations:['India']}).uncertain,'An unspecified Jobicy Anywhere region is not assumed to authorize India hiring.');
 const entry=normalizeJobicy({...raw,jobDescription:'Build software products.'},source,now);
 check(entry.minExperience===null&&matchJob({...entry,availability:'open',availabilityCheckedAt:now},profile).uncertain,'Entry-level is not fabricated into a zero-year requirement.');
 const title=normalizeJobicy({...raw,jobTitle:'Software Engineer | Experience: 4–8 yrs'},source,now);
 check(title.minExperience===4&&!matchJob({...title,availability:'open',availabilityCheckedAt:now},profile).relevant,'Title-based 4–8 years is excluded by the job-board adapter as well.');
 check(matchJob({...confirmed,contentCheckedAt:'2020-01-01T00:00:00Z'},profile).uncertain,'Fresh availability cannot conceal stale listing text.');
 check(matchJob({...confirmed,availability:'unknown'},profile).uncertain&&matchJob({...confirmed,availabilityCheckedAt:'2020-01-01T00:00:00Z'},profile).uncertain,'Unknown or stale availability cannot become a confident match.');
 try{
  const token='opaque /cursor+value?keep=unchanged';
  const rawJobs=Array.from({length:101},(_,i)=>({...raw,id:610001+i,url:'https://jobicy.com/jobs/'+(610001+i)+'-software-engineer'}));
  const requests=[];let sourceJobs=rawJobs,mode='paged';
  globalThis.fetch=async(input,init)=>{
   const url=new URL(String(input));if(url.hostname!=='jobicy.com')return Response.json(url.hostname==='api.lever.co'?[]:{jobs:[],meta:{total:0}});requests.push(url);
   check(url.hostname==='jobicy.com'&&!new Headers(init?.headers).has('Authorization')&&!new Headers(init?.headers).has('x-goog-api-key'),'Discovery contacts only the public Jobicy API without student or global API keys.');
   if(url.pathname.endsWith('/status')){
    const ids=url.searchParams.get('ids').split(',');
    return Response.json({success:true,statusCode:200,count:ids.length,jobs:ids.map(id=>({id:Number(id),status:mode==='availability'&&id==='610001'?'closed':mode==='availability'&&id==='610002'?'unknown':'active'}))});
   }
   check(url.searchParams.get('geo')==='anywhere'&&url.searchParams.get('count')==='100','Every discovery page keeps the configured geographic scope and page size.');
   if(mode==='paged')return Response.json(url.searchParams.has('cursor')?page(sourceJobs.slice(100)):page(sourceJobs.slice(0,100),token));
   return Response.json(page(sourceJobs));
  };
  await database.prepare('DELETE FROM meta WHERE key=?').bind(stateKey).run();
  await database.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('source_sweep',JSON.stringify({startedAt:now,cursor:sourceIndex,imported:0,successful:sourceIndex,failures:[],complete:false})).run();
  let result=await syncJobs();
  check(result.sourcesPending&&result.sourceProgress.checked===sourceIndex,'A multi-page job board yields without falsely marking the source complete.');
  let state=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind(stateKey).first()).value);
  check(state.pages===1&&state.cursor===token&&state.seen.length===100,'The first feed page and opaque continuation are saved durably.');
  result=await syncJobs();
  for(let resume=0;result.sourcesPending&&resume<SOURCES.length+4;resume++)result=await syncJobs();
  check(!result.sourcesPending&&!result.failures.length&&result.sourceProgress.checked===SOURCES.length,'The next normal call resumes the same traversal and completes source progress.');
  check(requests.filter(u=>!u.pathname.endsWith('/status'))[1].searchParams.get('cursor')===token,'Cursor punctuation survives URL encoding without modification.');
  check((await database.prepare('SELECT COUNT(*) as n FROM jobs WHERE source_id=?').bind(source.id).first()).n===101,'Both discovery pages are ingested instead of stopping after the first 100 jobs.');
  const before=requests.length;await advanceJobicy(source);
  check(requests.length===before,'Shared hourly discovery caching prevents another student from starting a new traversal.');
  await put({action:'profile',profile},'jobicy-student');
  for(const [index,status] of [[0,'applied'],[1,'interested'],[2,'dismissed']])check((await put({action:'status',jobId:source.id+':'+rawJobs[index].id,status,note:'Preserve '+status+' note'},'jobicy-student')).ok,'Each manual job choice saves through the authenticated handler.');
  await put({action:'profile',profile},'jobicy-other');
  check((await getData('jobicy-other','Other')).jobs.filter(j=>j.sourceId===source.id).every(j=>!j.status&&!j.note),'Job-board discovery never shares personal tracking or notes between accounts.');
  // A new discovery window contains none of these jobs. Their statuses, not absence, decide closure.
  sourceJobs=[];mode='availability';state=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind(stateKey).first()).value);state.startedAt=new Date(Date.now()-7200000).toISOString();
  await database.prepare('UPDATE meta SET value=? WHERE key=?').bind(JSON.stringify(state),stateKey).run();
  const statusStart=requests.length;let resumed=await advanceJobicy(source),passes=1;
  while(!resumed.complete&&passes<5){resumed=await advanceJobicy(source);passes++;}
  const statusRequests=requests.slice(statusStart).filter(u=>u.pathname.endsWith('/status'));
  check(resumed.complete&&statusRequests.length===2&&statusRequests[0].searchParams.get('ids').split(',').length===100,'Older imported jobs are rechecked in resumable batches of at most 100 IDs.');
  const workspace=await getData('jobicy-student','Student'),closed=workspace.jobs.find(j=>j.id===source.id+':610001'),unknown=workspace.jobs.find(j=>j.id===source.id+':610002'),hidden=workspace.jobs.find(j=>j.id===source.id+':610003');
  check(!closed.active&&closed.status==='applied'&&closed.note==='Preserve applied note','An explicit closed result retains the application and its notes.');
  check(unknown.active&&unknown.availability==='unknown'&&unknown.status==='interested'&&unknown.note==='Preserve interested note','Unknown availability remains distinct from closed and preserves Interested.');
  check(hidden.active&&hidden.status==='dismissed'&&hidden.note==='Preserve dismissed note','A listing absent from the discovery window stays open when its status is active; Not interested stays saved.');
  check(candidateJobs(workspace.jobs,{company:'Discovery Works'}).length===98,'Handled job-board listings stay excluded from fresh discovery.');
  const metrics=await discoveryMetrics(),board=metrics.categories.find(c=>c.category==='job-board');
  check(board.sources===1&&board.open===99&&board.unknown===1,'Owner coverage counts distinguish confirmed open jobs from unknown availability.');
  const networkBefore=requests.length,verify=await refreshJob(unknown.id);
  check(!verify.verified&&!verify.closed&&requests.length===networkBefore,'A cached unknown status is neither verified open nor confirmed closed and uses no extra request.');
  await database.prepare('UPDATE user_jobs SET remind_at=? WHERE user_id=? AND job_key=?').bind(new Date(Date.now()-1000).toISOString(),'jobicy-student',unknown.key).run();
  await createAlerts('jobicy-student');
  check(!(await database.prepare('SELECT id FROM notifications WHERE user_id=? AND job_key=?').bind('jobicy-student',unknown.key).first()),'Unconfirmed availability produces neither match alerts nor application reminders.');
  const saved=await refreshSavedDetails();check(!saved.pending,'Fresh hourly status metadata does not leave saved-detail maintenance stuck in a loop.');
  // Run the real, captured public feed and status response through the actual adapter and D1 pipeline.
  const captured=JSON.parse(readFileSync(new URL('../fixtures/jobicy-worldwide-2026-10-18.json',import.meta.url),'utf8'));
  const actualStatus=new Map(captured.status.jobs.map(j=>[String(j.id),j.status]));
  state=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind(stateKey).first()).value);state.startedAt=new Date(Date.now()-7200000).toISOString();
  await database.prepare('UPDATE meta SET value=? WHERE key=?').bind(JSON.stringify(state),stateKey).run();
  let liveRequests=0;
  globalThis.fetch=async input=>{liveRequests++;const u=new URL(String(input));if(!u.pathname.endsWith('/status'))return Response.json(captured.feed);const ids=u.searchParams.get('ids').split(',');return Response.json({success:true,statusCode:200,count:ids.length,jobs:ids.map(id=>({id:Number(id),status:actualStatus.get(id)||'active'}))});};
  let live=await advanceJobicy(source);for(let i=0;!live.complete&&i<5;i++)live=await advanceJobicy(source);
  const actualJobs=(await getData('jobicy-other','Other')).jobs.filter(j=>captured.feed.jobs.some(r=>j.id===source.id+':'+r.id));
  check(live.complete&&actualJobs.length===captured.feed.jobs.length&&actualJobs.length>0,'Actual captured Jobicy jobs pass normalization, availability checks, D1 ingestion and workspace retrieval.');
  check(actualJobs.every(j=>j.company!=='Jobicy'&&j.sourceUrl.startsWith('https://jobicy.com/jobs/')),'Real imported records expose their actual employer and original Jobicy attribution.');
  check(actualJobs.filter(j=>j.minExperience>0||/senior|director|lead|mid/i.test(j.sourceSeniority||'')).every(j=>!j.match.relevant),'Actual experienced and senior-labelled source jobs cannot leak into fresher matches.');
  const chosen=actualJobs[0],detail=await getJob('jobicy-other',chosen.id,profile);
  check(detail.description.length>0&&detail.company===chosen.company&&detail.match.relevant===chosen.match.relevant,'Real job cards and full details use the same matching outcome and stored source evidence.');
  // A malformed page is rejected before it can delete or overwrite the existing catalogue.
  await database.prepare('DELETE FROM meta WHERE key=?').bind(stateKey).run();
  globalThis.fetch=async()=>Response.json(page([{...raw,id:620000,url:'https://jobicy.com/jobs/620000-role'},{id:'broken'}]));
  let rejected=false;try{await advanceJobicy(source);}catch{rejected=true;}
  check(rejected&&!(await database.prepare('SELECT id FROM jobs WHERE id=?').bind(source.id+':620000').first()),'A partially valid page cannot commit its good row when another row is malformed.');
  check((await getData('jobicy-student','Student')).jobs.find(j=>j.key===closed.key).note==='Preserve applied note','Source validation failures never overwrite application history.');
  // Rate limiting records a deferred retry and makes no repeated upstream call before it is due.
  await database.prepare('DELETE FROM meta WHERE key=?').bind(stateKey).run();let limitedCalls=0;
  globalThis.fetch=async()=>{limitedCalls++;return new Response('{}',{status:429,headers:{'Retry-After':'7200'}});};
  try{await advanceJobicy(source);}catch{}
  state=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind(stateKey).first()).value);
  check(Date.parse(state.retryAt)>Date.now()+7100000,'Jobicy HTTP 429 respects Retry-After rather than burning repeated requests.');
  try{await advanceJobicy(source);}catch{}
  check(limitedCalls===1,'A deferred source retry does not repeat the blocked request.');
  // An interrupted database commit must leave the continuation at the uncommitted page.
  await database.prepare('DELETE FROM meta WHERE key=?').bind(stateKey).run();
  globalThis.fetch=async input=>new URL(String(input)).pathname.endsWith('/status')?Response.json({success:true,statusCode:200,count:1,jobs:[{id:630000,status:'active'}]}):Response.json(page([{...raw,id:630000,url:'https://jobicy.com/jobs/630000-role'}],'next-after-commit'));
  globalThis.__nextroleTestEnv.DB={prepare:sql=>database.prepare(sql),batch:async()=>{throw new Error('Synthetic D1 interruption');}};
  try{await advanceJobicy(source);}catch{}
  globalThis.__nextroleTestEnv.DB=normalDB;
  state=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind(stateKey).first()).value);
  check(state.pages===0&&state.cursor===null&&!state.seen.length&&!(await database.prepare('SELECT id FROM jobs WHERE id=?').bind(source.id+':630000').first()),'A failed page transaction cannot advance its saved cursor or create a half-ingested job.');
  // The status validator rejects omitted IDs; missing is not silently converted to closed.
  globalThis.fetch=async()=>Response.json({success:true,statusCode:200,count:1,jobs:[{id:1,status:'active'}]});
  rejected=false;try{await checkJobicyStatuses(['1','2']);}catch{rejected=true;}
  check(rejected,'Incomplete availability responses are rejected rather than closing omitted IDs.');
  console.log(JSON.stringify({jobicy:true,capturedAt:captured.capturedAt,actualPublicJobs:actualJobs.length,paginatedFixtureJobs:101,liveAPIUsedDuringTests:false,note:'Public feed/status capture was fetched separately; all mutations above use isolated D1.'}));
 }finally{globalThis.fetch=native;globalThis.__nextroleTestEnv.DB=normalDB;}
}
