import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
export async function verifyProductWorkflow({database,put,check,defaultProfile,raw,source,keys,aiResponse}){
 const {GET:applicationsGET,POST:applicationsPOST}=await import('../app/api/applications/route.ts');
 const {GET:preparationGET,POST:preparationPOST}=await import('../app/api/preparation/route.ts');
 const {GET:digestGET,POST:digestPOST}=await import('../app/api/digest/route.ts');
 const {POST:unsubscribePOST}=await import('../app/api/digest/unsubscribe/route.ts');
 const {normalizeGreenhouse,normalizeJobicy,fetchSourceJobs}=await import('../lib/job-feeds.ts');
 const {syncJobs,refreshJob}=await import('../lib/sync.ts');
 const {drainDigests,mailDailyBudget,mailStatus}=await import('../lib/digests.ts');
 const {getJob}=await import('../lib/store.ts');
 const {acquireLease,releaseLease}=await import('../lib/lease.ts');
 const {saveApplicationRecord}=await import('../lib/application-records.ts');
 const user='product-workflow',now=new Date().toISOString();
 const identity=who=>{globalThis.__nextroleTestUser=who?{userId:who,displayName:who,email:who+'@example.test'}:null;};
 const post=async(handler,body,who=user)=>{identity(who);return handler(new Request('https://nextrole.test/api',{method:'POST',headers:{Origin:'https://nextrole.test','Content-Type':'application/json'},body:JSON.stringify(body)}));};
 const get=async(handler,query='',who=user)=>{identity(who);return handler(new Request('https://nextrole.test/api'+query));};
 const job=normalizeGreenhouse({...raw,id:88116,internal_job_id:88116,content:'No prior experience required. Software Engineering Intern in Bengaluru, India. This is an on-site role. Required skills: Python, SQL and TypeScript.'},source,now);
 async function insert(job){await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES(?,?,?,?,?,?,1)').bind(job.id,job.key,job.sourceId,JSON.stringify(job),job.firstSeen,job.lastChecked).run();}
 await insert(job);await put({action:'profile',profile:{...defaultProfile,name:'Workflow fixture',completed:true}},user);
 check((await get(applicationsGET,'?analytics=1',null)).status===401&&(await post(applicationsPOST,{},null)).status===401,'Application timelines and analytics reject anonymous access.');
 const project={id:crypto.randomUUID(),kind:'project',title:'Python SQL tracker',organization:'',dates:'2026',details:['Built a Python and SQL tracker with documented tests.'],url:'',githubUrl:'https://github.com/example/tracker',demoUrl:'https://example.test/demo',verified:true};
 const profile={name:'Workflow Student',email:'private-career@example.test',phone:'PRIVATE_PROFILE_PHONE',location:'India',website:'',links:{github:'https://github.com/example',linkedin:'https://www.linkedin.com/in/example',leetcode:'https://leetcode.com/u/example',codeforces:'https://codeforces.com/profile/example'},contactVerified:true,facts:[project,{...project,id:crypto.randomUUID(),kind:'education',title:'Computer Science',githubUrl:'',demoUrl:'',details:[]},{...project,id:crypto.randomUUID(),kind:'skill',title:'Python, SQL',githubUrl:'',demoUrl:'',details:[]}]};
 check((await post(preparationPOST,{action:'career-save',profile,expectedRevision:null})).ok,'Professional profiles and separate project repository/demo links save through the actual profile API.');
 const prepared=await post(preparationPOST,{action:'prepare',jobId:job.id,requestId:crypto.randomUUID(),questions:['Describe a project you built.','Do you require visa sponsorship?']}),kit=(await prepared.json()).kit;
 check(prepared.ok&&kit.compatibility.missing.includes('TypeScript')&&kit.compatibility.matched.includes('Python'),'The saved JD compatibility check identifies missing evidence without adding a skill.');
 check(kit.resume.sections.find(s=>s.title==='Projects').facts[0].demoUrl===project.demoUrl&&kit.resume.contact.includes(profile.links.leetcode),'Résumé documents retain confirmed project and professional links.');
 const {draftAnswer}=await import('../lib/career.ts');check(draftAnswer('Project repository URL',profile,kit.selectedFactIds).answer===project.githubUrl&&draftAnswer('Project demo link',profile,kit.selectedFactIds).answer===project.demoUrl,'Known project URL questions return the actual repository/demo rather than invented links or an essay.');
 const tex=await (await get(preparationGET,'?kitId='+kit.id+'&format=tex')).text();check(tex.includes(project.githubUrl)&&tex.includes(project.demoUrl),'The LaTeX export includes the repository and live demo.');
 await put({action:'ai-save',connection:{slot:1,provider:'openai',model:'gpt-5-mini',label:'Workflow AI fixture',key:keys[0]}},user);
 const previousAI=globalThis.fetch;let aiPayload;
 try{
  globalThis.fetch=async(input,init)=>{aiPayload=JSON.parse(init.body);return aiResponse(input,{answers:[{id:kit.questions[0].id,answer:'I built a Python and SQL tracker with documented tests.',evidence:[{factId:project.id,quote:project.details[0]}]},{id:kit.questions[1].id,answer:'I do not require visa sponsorship.',evidence:[{factId:project.id,quote:project.details[0]}]}]});};
  check((await post(preparationPOST,{action:'draft-answers',kitId:kit.id,expectedRevision:kit.revision,consent:false})).status===400,'AI answer generation requires explicit consent.');
  const generated=await post(preparationPOST,{action:'draft-answers',kitId:kit.id,expectedRevision:kit.revision,consent:true}),draft=(await generated.json()).kit;
  check(generated.ok&&draft.questions[0].evidence[0].quote===project.details[0]&&!draft.questions[0].reviewed,'AI drafts retain exact supporting quotes and require user review.');
  check(draft.questions[1].answer===''&&draft.questions[1].missingFacts.length>0,'AI cannot answer a personal declaration excluded from the supplied questions.');
  check(!JSON.stringify(aiPayload).includes(profile.email)&&!JSON.stringify(aiPayload).includes(profile.phone),'AI drafting excludes contact fields.');
  kit.revision=draft.revision;
  const second=(await (await post(preparationPOST,{action:'prepare',jobId:job.id,requestId:crypto.randomUUID(),questions:['Describe another project example.']})).json()).kit;
  globalThis.fetch=async input=>aiResponse(input,{answers:[{id:second.questions[0].id,answer:'I improved revenue by 95% using Kubernetes.',evidence:[{factId:project.id,quote:project.details[0]}]}]});
  check((await post(preparationPOST,{action:'draft-answers',kitId:second.id,expectedRevision:second.revision,consent:true})).status===400,'Unsupported numbers and recognised skills cannot replace an existing answer.');
 }finally{globalThis.fetch=previousAI;}
 const before=Buffer.from(await (await get(preparationGET,'?kitId='+kit.id+'&format=pdf')).arrayBuffer());
 if(process.env.NEXTROLE_QA_RESUME)writeFileSync(process.env.NEXTROLE_QA_RESUME,before);
 const appliedAt=new Date().toISOString(),confirmation={action:'confirm',jobId:job.id,confirmation:'SUBMITTED',kitId:kit.id,role:'Software engineering',appliedAt};
 check((await post(applicationsPOST,{...confirmation,confirmation:'OPENED'})).status===400,'Opening a link cannot be recorded as a confirmed submission.');
 check((await post(applicationsPOST,confirmation,'workflow-other')).status===400,'A user cannot attach another account’s preparation to a submission.');
 let response=await post(applicationsPOST,confirmation),record=(await response.json()).record;
 check(response.ok&&record.submitted.kitId===kit.id,'A user-confirmed submission saves its exact preparation revision and résumé.');
 check((await getJob(user,job.id,defaultProfile)).status==='applied','Confirmation updates the existing Applied tracker in the same transaction.');
 check((await post(applicationsPOST,confirmation)).status===409,'Repeated confirmation cannot overwrite an immutable submitted résumé or duplicate its event.');
 const after=Buffer.from(await (await get(applicationsGET,'?jobId='+job.id+'&format=pdf')).arrayBuffer());
 check(before.equals(after)&&createHash('sha256').update(after).digest('hex')===record.submitted.sha256,'The attached PDF is byte-identical to the downloaded preparation and its recorded hash.');
 check((await get(applicationsGET,'?jobId='+job.id+'&format=pdf','workflow-other')).status===404,'Submitted résumé downloads enforce ownership.');
 const corrected=await post(applicationsPOST,{action:'correct',jobId:job.id,expectedRevision:record.revision,role:'Backend engineering',appliedAt:null});record=(await corrected.json()).record;check(corrected.ok&&record.appliedAt===null&&record.role==='Backend engineering','Users can correct role/date metadata without inventing a date or replacing their submitted document.');check(Buffer.from(await (await get(applicationsGET,'?jobId='+job.id+'&format=pdf')).arrayBuffer()).equals(before),'A metadata correction preserves the submitted PDF byte-for-byte.');
 const previousRevision=record.revision;
 response=await post(applicationsPOST,{action:'milestone',jobId:job.id,expectedRevision:record.revision,milestone:'oa',done:true,doneAt:appliedAt,dueAt:null});record=(await response.json()).record;
 check(response.ok&&record.milestones.oa.doneAt===appliedAt&&!record.milestones.response.doneAt,'OA completion is recorded without inventing a response or interview.');
 check((await post(applicationsPOST,{action:'milestone',jobId:job.id,expectedRevision:previousRevision,milestone:'response',done:true,doneAt:appliedAt,dueAt:null})).status===409,'Concurrent timeline edits require the current revision.');
 check((await post(applicationsPOST,{action:'milestone',jobId:job.id,expectedRevision:record.revision,milestone:'interview',done:true,doneAt:'2099-01-01T00:00:00.000Z',dueAt:null})).status===400,'A scheduled future interview cannot count as a completed interview.');
 let analytics=await (await get(applicationsGET,'?analytics=1')).json();
 check(analytics.counts.applied===1&&analytics.counts.oa===1&&analytics.counts.response===0&&analytics.counts.rejected===0,'Application analytics use actual milestones and never classify silence as rejection.');
 await post(preparationPOST,{action:'delete-kit',kitId:kit.id});
 check(Buffer.from(await (await get(applicationsGET,'?jobId='+job.id+'&format=pdf')).arrayBuffer()).equals(before),'Deleting a preparation leaves the separately confirmed submitted copy intact.');
 const exported=await (await put({action:'export-account'},user)).json();check(exported.applicationRecords.length===1&&exported.applicationEvents.length===3&&exported.applicationHistoryExport,'Workspace export includes application summaries and the complete-history export route.');
 const archived=(await (await get(applicationsGET,'?export=1')).text()).trim().split('\n').map(line=>JSON.parse(line));check(archived.some(row=>row.type==='application'&&row.record.submitted.pdf)&&archived.filter(row=>row.type==='event').length===3&&archived.at(-1).complete,'The bounded streamed archive contains the full résumé snapshot, raw events and completion marker.');
 await post(preparationPOST,{action:'delete-career',confirmation:'DELETE'});
 check((await get(applicationsGET,'?jobId='+job.id+'&format=pdf')).status===404,'Deleting career data also removes submitted profile and résumé copies.');
 const staleLease=await acquireLease('byok_mutation:expired-record',90000);await releaseLease(staleLease);let blocked=false;
 try{await saveApplicationRecord('expired-record',{...confirmation,kitId:null},staleLease);}catch(error){blocked=error.status===409;}
 check(blocked&&!await database.prepare('SELECT user_id FROM application_records WHERE user_id=?').bind('expired-record').first()&&!await database.prepare('SELECT user_id FROM user_jobs WHERE user_id=?').bind('expired-record').first(),'A stale lease cannot recreate application, tracking or event data after workspace deletion.');
 check((await post(applicationsPOST,{...confirmation,kitId:null,appliedAt:null,role:'__proto__'},'unknown-date')).ok,'An earlier application can retain an unknown submission date instead of inventing one.');
 const unknownReport=await (await get(applicationsGET,'?analytics=1','unknown-date')).json();check(unknownReport.months['Date not recorded']===1&&unknownReport.roles['__proto__']===1,'Unknown dates and arbitrary role labels aggregate safely without prototype collisions.');
 await put({action:'delete-account-data',confirmation:'DELETE'},'unknown-date');

 const originalFetch=globalThis.fetch,originalNow=Date.now,environment=globalThis.__nextroleTestEnv;
 const oldMail=Object.fromEntries(['NEXTROLE_MAIL_APPROVAL','NEXTROLE_MAIL_API_KEY','NEXTROLE_MAIL_FROM','NEXTROLE_PUBLIC_URL','NEXTROLE_MAIL_DAILY_BUDGET'].map(key=>[key,environment[key]]));
 try{
  const night=new Date();night.setUTCHours(16,0,0,0);Date.now=()=>night.getTime();
  environment.NEXTROLE_MAIL_DAILY_BUDGET='250';check(mailDailyBudget()===250,'The operator can configure the campus mail reservation budget within an approved provider quota.');environment.NEXTROLE_MAIL_DAILY_BUDGET='unlimited';check(mailDailyBudget()===50,'Invalid or unbounded mail budgets fall back to the conservative pilot cap.');delete environment.NEXTROLE_MAIL_DAILY_BUDGET;
  await database.prepare('UPDATE jobs SET first_seen=?,last_checked=?,data=json_set(data,\'$.company\',?) WHERE id=?').bind(new Date(Math.min(night.getTime(),originalNow())-60000).toISOString(),night.toISOString(),'Fixture & Company',job.id).run();
  await put({action:'status',jobId:job.id,status:'restore'},user);
  for(let i=0;i<21;i++)await insert({...job,id:'digest-fixture:'+i,key:'digest-fixture:'+i,company:'Fixture & Company',url:'https://careers.example.test/digest/'+i,canonicalUrl:'https://careers.example.test/digest/'+i,firstSeen:new Date(Math.min(night.getTime(),originalNow())-30000).toISOString(),lastChecked:night.toISOString()});
  let calls=0,payload;
  globalThis.fetch=async()=>{calls++;throw new Error('No mail or AI calls expected.');};
  check((await get(digestGET,'',null)).status===401,'Digest preferences require an authenticated account.');
  const preview=(await (await get(digestGET,'?preview=1')).json()).preview;
  check(preview.total>=1&&preview.html.includes('Fixture &amp; Company')&&!preview.html.includes('PRIVATE_PROFILE_PHONE')&&calls===0,'Newsletter previews use current matching source evidence, escape HTML and make no provider calls.');
  const allMatches=Buffer.from(preview.attachment.content,'base64').toString('utf8');check(preview.count===20&&preview.total>20&&allMatches.includes('https://careers.example.test/digest/20')&&allMatches.trim().split('\r\n').length===preview.total+1,'A newsletter with over 20 matches includes every matching job in its attachment.');
  check((await post(digestPOST,{enabled:true,email:'forged@example.test'})).ok,'An account may explicitly opt into a nightly digest.');
  const settings=await database.prepare('SELECT * FROM digest_settings WHERE user_id=?').bind(user).first();
  check(settings.email===user+'@example.test','Digest delivery uses the authenticated account email rather than a supplied recipient.');
  check(!(await drainDigests(night)).configured&&calls===0,'Mail remains disabled without the host’s explicit service activation.');
  Object.assign(environment,{NEXTROLE_MAIL_APPROVAL:'approved',NEXTROLE_MAIL_API_KEY:'fixture-mail-key-never-real',NEXTROLE_MAIL_FROM:'jobs@example.test',NEXTROLE_PUBLIC_URL:'https://nextrole.test'});
  globalThis.fetch=async(url,init)=>{calls++;check(String(url)==='https://api.resend.com/emails','Mail requests use only the documented provider endpoint.');payload=JSON.parse(init.body);return Response.json({id:crypto.randomUUID()});};
  check((await drainDigests(new Date(night.getTime()-3600000))).waitingForNight&&calls===0,'The worker waits until the configured nightly window.');
  const sent=await drainDigests(night);check(sent.accepted===1&&calls===1&&payload.to[0]===user+'@example.test'&&payload.attachments[0].filename.endsWith('.csv'),'The actual worker submits exactly one opted-in nightly digest to the email provider.');
  check(!JSON.stringify(payload).includes(profile.phone)&&payload.headers['List-Unsubscribe-Post']==='List-Unsubscribe=One-Click','Mail excludes career contact facts and carries an unsubscribe mechanism.');
  await drainDigests(night);check(calls===1,'Repeated worker invocations cannot send the same daily digest twice.');
  const unsubscribe=await unsubscribePOST(new Request('https://nextrole.test/api/digest/unsubscribe?token='+settings.unsubscribe_token,{method:'POST'}));
  check(unsubscribe.ok&&!(await database.prepare('SELECT enabled FROM digest_settings WHERE user_id=?').bind(user).first()).enabled,'The high-entropy email link disables future digests without requiring login.');
  await put({action:'profile',profile:{...defaultProfile,name:'Timeout fixture',completed:true}},'digest-timeout');await post(digestPOST,{enabled:true},'digest-timeout');
  globalThis.fetch=async()=>{calls++;throw new Error('Ambiguous provider acceptance');};
  await drainDigests(night);const attempts=calls;await drainDigests(night);
  check(calls===attempts&&(await database.prepare('SELECT state FROM digest_outbox WHERE user_id=?').bind('digest-timeout').first()).state==='uncertain','A timeout remains uncertain and is not automatically resent.');
  check(!(await database.prepare('SELECT enabled FROM digest_settings WHERE user_id=?').bind('digest-timeout').first()).enabled,'An ambiguous email attempt pauses future automatic delivery.');
  await put({action:'profile',profile:{...defaultProfile,name:'Budget fixture',completed:true}},'digest-budget');await post(digestPOST,{enabled:true},'digest-budget');
  const day=new Date(night.getTime()+330*60000).toISOString().slice(0,10);await database.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('mail_budget:'+day,'50').run();
  const budget=await drainDigests(night);check(budget.budgetExhausted&&!budget.pending&&calls===attempts,'The daily pilot budget stops network sends and avoids a busy retry loop.');
  const mailHealth=await mailStatus(night);check(mailHealth.budgetExhausted&&mailHealth.remaining>=1&&!JSON.stringify(mailHealth).includes('example.test'),'Owner delivery health exposes aggregate backlog and budget without recipient identities.');
  await put({action:'delete-account-data',confirmation:'DELETE'},'digest-budget');
  await put({action:'delete-account-data',confirmation:'DELETE'},'digest-timeout');
  check(!await database.prepare('SELECT user_id FROM digest_outbox WHERE user_id=?').bind('digest-timeout').first()&&!await database.prepare('SELECT user_id FROM digest_settings WHERE user_id=?').bind('digest-timeout').first(),'Workspace deletion removes digest preferences and delivery history.');
 }finally{Date.now=originalNow;globalThis.fetch=originalFetch;for(const [key,value] of Object.entries(oldMail))if(value===undefined)delete environment[key];else environment[key]=value;}

 const board=(await import('../lib/sources.ts')).SOURCES.find(s=>s.provider==='jobicy');
 const listing={id:9188116,url:'https://jobicy.com/jobs/9188116-software-engineer-intern',jobTitle:'Software Engineer Intern',companyName:'Jobicy Fixture Employer',jobGeo:'India',jobType:['Internship'],jobDescription:'No prior experience required. Python and SQL. Build tested software remotely in India.',pubDate:now};
 const normalized=normalizeJobicy(listing,board,now);
 check(normalized.company===listing.companyName&&normalized.url===listing.url&&normalized.deadline===null&&normalized.provenance.kind==='job-board-api','The multi-employer adapter preserves employer identity, canonical source attribution and unknown facts.');
 let feedCalls=0;
 try{
  globalThis.fetch=async url=>{feedCalls++;const second=new URL(url).searchParams.has('cursor');return Response.json({success:true,jobs:second?[{...listing,id:9188117,url:'https://jobicy.com/jobs/9188117-data-intern'}]:[listing],hasMore:!second,nextCursor:second?null:'opaque+cursor/='});};
  const pages=await fetchSourceJobs(board,now);check(pages.length===2&&feedCalls===2,'The adapter follows opaque cursor pagination through the complete permitted window.');
  globalThis.fetch=async()=>Response.json({success:true,jobs:[listing],hasMore:true,nextCursor:'repeated'});let rejected=false;try{await fetchSourceJobs(board,now);}catch{rejected=true;}check(rejected,'Repeated cursor or posting data cannot be presented as a complete feed.');
  await database.prepare("DELETE FROM meta WHERE key LIKE 'jobicy_state:%'").run();let traversals=0;
  globalThis.fetch=async url=>{const u=new URL(url);if(u.hostname==='jobicy.com'){if(u.pathname.endsWith('/status')){const ids=u.searchParams.get('ids').split(',');return Response.json({success:true,statusCode:200,count:ids.length,jobs:ids.map(id=>({id:Number(id),status:'active'}))});}const next=u.searchParams.get('cursor');if(!next)traversals++;const jobs=[next?{...listing,id:9188117,url:'https://jobicy.com/jobs/9188117-other-intern'}:listing];return Response.json({success:true,statusCode:200,jobCount:jobs.length,jobs,hasMore:!next,nextCursor:next?null:'resume-next-page'});}return Response.json(u.hostname==='api.lever.co'?[]:{jobs:[],meta:{total:0}});};
  const firstPage=await syncJobs(true);let checkpoint=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind('jobicy_state:'+board.id).first()).value);check(firstPage.sourcesPending&&checkpoint.phase==='feed'&&!!checkpoint.cursor,'Shared discovery checkpoints a rolling-feed page and reports remaining work.');let finalPage=await syncJobs();for(let pass=0;finalPage.sourcesPending&&pass<10;pass++)finalPage=await syncJobs();checkpoint=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind('jobicy_state:'+board.id).first()).value);check(!finalPage.sourcesPending&&checkpoint.phase==='complete','The next invocation resumes the saved cursor and completes the traversal.');await syncJobs(true);check(traversals===1,'Even forced refreshes cannot start Jobicy traversal more often than hourly.');
  await database.prepare("DELETE FROM meta WHERE key LIKE 'jobicy_state:%'").run();
  globalThis.fetch=async url=>{const u=new URL(url);if(u.pathname.endsWith('/status')){const ids=u.searchParams.get('ids').split(',');return Response.json({success:true,statusCode:200,count:ids.length,jobs:ids.map(id=>({id:Number(id),status:'active'}))});}return Response.json(u.hostname==='api.lever.co'?[]:{success:true,statusCode:200,jobCount:0,jobs:[],hasMore:false,nextCursor:null,meta:{total:0}});};
  let emptyWindow=await syncJobs(true);for(let pass=0;emptyWindow.sourcesPending&&pass<10;pass++)emptyWindow=await syncJobs();check((await database.prepare('SELECT active FROM jobs WHERE id=?').bind(normalized.id).first()).active===1,'Leaving a rolling discovery window never closes an otherwise known listing.');
  for(const status of ['unknown','closed']){
   await database.prepare("UPDATE jobs SET data=json_remove(data,'$.detailCheckedAt','$.detailAttemptedAt','$.availabilityCheckedAt') WHERE id=?").bind(normalized.id).run();
   globalThis.fetch=async()=>Response.json({success:true,statusCode:200,count:1,jobs:[{id:listing.id,status}]});const result=await refreshJob(normalized.id);
   check(status==='unknown'?!result.verified&&result.availability==='unknown':result.verified&&result.closed,'Status checks distinguish '+status+' without inventing closure.');
  }
 }finally{globalThis.fetch=originalFetch;}
 await put({action:'delete-account-data',confirmation:'DELETE'},user);
 check(!await database.prepare('SELECT user_id FROM application_records WHERE user_id=?').bind(user).first()&&!await database.prepare('SELECT user_id FROM application_events WHERE user_id=?').bind(user).first(),'Workspace deletion clears the complete application record and event history.');
 await database.prepare("DELETE FROM jobs WHERE id LIKE 'digest-fixture:%'").run();
 await database.prepare('DELETE FROM jobs WHERE id IN (?,?,?)').bind(job.id,normalized.id,board.id+':9188117').run();
}
