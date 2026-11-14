export async function verifySourceExpansion({database,check}){
 const {detectEmployerBoard,directoryRows,employers,platforms}=await import('../lib/employer-directory.ts');
 const {validSourceAddress,parseJobsXML}=await import('../lib/extended-feeds.ts');
 const {advanceSmartRecruiters}=await import('../lib/smartrecruiters-sync.ts');
 const {checkEmployer}=await import('../lib/employer-discovery.ts');
 const {sourceFingerprint}=await import('../lib/source-registry.ts');
 const native=globalThis.fetch,now=new Date().toISOString(),source={id:'expansion-fixture',company:'Expansion fixture',provider:'smartrecruiters',token:'ExpansionFixture',careerUrl:'https://careers.smartrecruiters.com/ExpansionFixture'};
 const posting=id=>({id:String(id),name:'Software Engineer Intern',visibility:'PUBLIC',company:{identifier:'ExpansionFixture'},location:{city:'Bengaluru',country:'in'},typeOfEmployment:{label:'Full-time'},applyUrl:'https://jobs.smartrecruiters.com/ExpansionFixture/'+id,jobAd:{sections:{jobDescription:{text:'No prior experience required. Python and SQL internship. On-site in Bengaluru, India.'}}}});
 check(platforms.length===58&&new Set(platforms.map(p=>p.id)).size===58,'The supplied 58-platform inventory is deduplicated.');
 check(employers.length>=463&&new Set(employers.map(e=>e.id)).size===employers.length,'The employer inventory includes the supplied expansion without duplicate IDs.');
 for(const [url,provider] of [['https://job-boards.greenhouse.io/acme','greenhouse'],['https://jobs.lever.co/acme','lever'],['https://jobs.ashbyhq.com/acme','ashby'],['https://careers.smartrecruiters.com/Acme','smartrecruiters'],['https://apply.workable.com/acme/','workable'],['https://acme.recruitee.com/','recruitee'],['https://acme.jobs.personio.de/','personio'],['https://acme.breezy.hr/','breezy'],['https://acme.teamtailor.com/','teamtailor'],['https://ats.rippling.com/acme/jobs','rippling'],['https://acme.wd103.myworkdayjobs.com/en-US/External','workday'],['https://acme.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1','oracle']]){
  const found=detectEmployerBoard(url,'Acme');check(found?.provider===provider&&found.candidate&&validSourceAddress(found.candidate),'Recognized public '+provider+' board produces a constrained candidate.');
 }
 check(!detectEmployerBoard('https://jobs.lever.co.evil.test/acme','Acme')&&!detectEmployerBoard('https://jobs.lever.co@127.0.0.1/acme','Acme'),'Lookalike and credential-bearing URLs cannot become employer feed candidates.');
 check(!validSourceAddress({...source,provider:'workday',host:'127.0.0.1',site:'External'})&&!validSourceAddress({...source,provider:'oracle',host:'evil.test'}),'Employer-controlled host fields cannot reach private or arbitrary servers.');
 check(sourceFingerprint([{...source,provider:'personio',region:'de'}])!==sourceFingerprint([{...source,provider:'personio',region:'com'}]),'Changing a provider region changes the source checkpoint fingerprint.');
 let xmlRejected=false;try{parseJobsXML('<!DOCTYPE rss [<!ENTITY a SYSTEM "file:///etc/passwd">]><rss></rss>','teamtailor');}catch{xmlRejected=true;}check(xmlRejected,'External XML entity declarations are rejected before parsing.');
 const team=parseJobsXML('<rss><channel><item><title>Engineer</title><link>https://acme.teamtailor.com/jobs/123456-a-long-title</link><description>India</description></item></channel></rss>','teamtailor');check(team[0].id==='123456','RSS posting identity is the stable job ID rather than the title slug.');
 const revvity=directoryRows([],{}).find(e=>e.name==='Revvity');check(revvity?.provider==='workday'&&revvity.state!=='connected','Revvity is identified by its actual Workday tenant without claiming a working connection.');
 try{
  let attempted=[];globalThis.fetch=async input=>{attempted.push(String(input));return new Response(null,{status:302,headers:{Location:'https://127.0.0.1/private'}});};
  const blocked=await checkEmployer({id:'test',name:'Acme',careersUrl:'https://employer.example.test/careers',sector:'Test',origin:'Test',priority:'P1'});check(blocked.state==='unavailable'&&attempted.length===1,'Career discovery refuses an unsafe redirect without sending a request to it.');
  let available=Array.from({length:26},(_,i)=>String(710000+i)),failed=false,detailCalls=0;
  globalThis.fetch=async(input,init)=>{const u=new URL(String(input));check(u.hostname==='api.smartrecruiters.com'&&!new Headers(init?.headers).has('Authorization'),'Shared source collection uses a fixed public provider and no student credentials.');
   if(u.pathname.endsWith('/postings'))return Response.json({content:available.map(id=>posting(id)),totalFound:available.length,offset:0});
   detailCalls++;if(failed)return new Response('Access required',{status:403});return Response.json(posting(u.pathname.split('/').at(-1)));
  };
  const stale={id:source.id+':old',key:'expansion:old',company:source.company,title:'Old opening',sourceId:source.id};
  await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,active) VALUES(?,?,?,?,?,?,?,1)').bind(stale.id,stale.key,source.id,JSON.stringify(stale),now,now,'old').run();
  let result=await advanceSmartRecruiters(source,now);check(!result.complete&&result.checked===24&&detailCalls===24,'A large employer index checkpoints after a bounded batch of full posting details.');
  check((await database.prepare('SELECT active FROM jobs WHERE id=?').bind(stale.id).first()).active===1,'An incomplete employer snapshot cannot close previously stored openings.');
  const first=await database.prepare('SELECT id,job_key FROM jobs WHERE id=?').bind(source.id+':710000').first();
  await database.prepare('INSERT INTO user_jobs(user_id,job_key,job_id,status,note,updated_at) VALUES(?,?,?,?,?,?)').bind('expansion-fixture-user',first.job_key,first.id,'applied','Preserve this interview note',now).run();
  failed=true;let rejected=false;try{await advanceSmartRecruiters(source,now);}catch{rejected=true;}
  const checkpoint=JSON.parse((await database.prepare('SELECT value FROM meta WHERE key=?').bind('smartrecruiters_snapshot:'+source.id).first()).value);check(rejected&&checkpoint.cursor===24,'An access failure leaves the last successful detail checkpoint intact.');
  failed=false;detailCalls=0;result=await advanceSmartRecruiters(source,now);check(result.complete&&detailCalls===2,'The next collector resumes the remaining details without re-fetching completed rows.');
  check((await database.prepare('SELECT active FROM jobs WHERE id=?').bind(stale.id).first()).active===0,'Only a complete revalidated public index permits absence-based closure.');
  const decision=await database.prepare('SELECT status,note FROM user_jobs WHERE user_id=?').bind('expansion-fixture-user').first();check(decision.status==='applied'&&decision.note==='Preserve this interview note','Expanded ingestion preserves Applied choices and application notes.');
  const changedAt=new Date(Date.now()+1000).toISOString();available=Array.from({length:26},(_,i)=>String(710000+i));await advanceSmartRecruiters(source,changedAt);available.push('710100');result=await advanceSmartRecruiters(source,changedAt);check(!result.complete&&result.changed,'A changing public index defers finalization rather than closing jobs from an inconsistent snapshot.');
  const ancient=new Date(Date.now()-12*3600000).toISOString();available=Array.from({length:26},(_,i)=>String(710000+i));await database.prepare('DELETE FROM meta WHERE key=?').bind('smartrecruiters_snapshot:'+source.id).run();
  detailCalls=0;await advanceSmartRecruiters(source,ancient);result=await advanceSmartRecruiters(source,ancient);check(result.complete&&detailCalls===26,'A sweep older than six hours advances its new employer batches rather than repeatedly resetting page one.');
  await database.prepare('UPDATE jobs SET feed_checked_at=? WHERE source_id=?').bind(ancient,source.id).run();await database.prepare('UPDATE meta SET value=? WHERE key=?').bind(JSON.stringify({version:1,token:source.token,startedAt:ancient,ids:available,cursor:24,complete:false}),'smartrecruiters_snapshot:'+source.id).run();detailCalls=0;result=await advanceSmartRecruiters(source,ancient);check(result.complete&&detailCalls===2,'A legacy live cursor migrates in place and resumes the final details without discarding its progress.');
 }finally{
  globalThis.fetch=native;await database.prepare('DELETE FROM user_jobs WHERE user_id=?').bind('expansion-fixture-user').run();await database.prepare('DELETE FROM jobs WHERE source_id=?').bind(source.id).run();await database.prepare('DELETE FROM source_runs WHERE id=?').bind(source.id).run();await database.prepare('DELETE FROM source_run_history WHERE source_id=?').bind(source.id).run();await database.prepare('DELETE FROM meta WHERE key=?').bind('smartrecruiters_snapshot:'+source.id).run();
 }
}
