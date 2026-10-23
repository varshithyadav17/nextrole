// Important matching and model-output counterexamples from the v13 audit.
export async function verifyTrust({database,put,check,job,defaultProfile,raw,source,aiResponse,keys}) {
 const {matchJob}=await import('../lib/matching.ts');
 const {extractExperience}=await import('../lib/experience.ts');
 const {normalizeGreenhouse}=await import('../lib/job-feeds.ts');
 const {candidateJobs}=await import('../lib/job-selection.ts');
 const {analyseJob}=await import('../lib/ai.ts');
 const {getJob,getData}=await import('../lib/store.ts');
 const now=new Date().toISOString();
 const make=(description,extra={})=>({...job,description,lastChecked:now,active:true,deadline:null,...extra});
 for(const location of ['Indianapolis, United States','Delhi, Canada','Mumbai, United States']) {
  check(!matchJob(make('No experience required.',{location}),defaultProfile).relevant,'India preferences must reject a foreign location: '+location);
 }
 check(matchJob(make('No experience required.',{location:'Bangalore, India'}),{...defaultProfile,locations:['Bengaluru']}).relevant,'Bangalore/Bengaluru remain equivalent city labels.');
 check(!matchJob(make('No experience required.',{location:'Puneville'}),{...defaultProfile,locations:['Pune']}).relevant,'City preferences must use whole place names.');
 check(!matchJob(make('No experience required.',{location:'Remote',mode:'Remote',countryCodes:['US']}),defaultProfile).relevant,'A structured US restriction cannot become worldwide remote.');
 const range='Minimum 1 year of professional experience required. Maximum 2 years of professional experience.';
 check(extractExperience(range).minimum===1&&extractExperience(range).maximum===2,'Separate minimum and maximum statements must both survive extraction.');
 check(!matchJob(make(range),{...defaultProfile,experience:3}).relevant,'A profile above the explicit maximum must be excluded.');
 check(matchJob(make(range),{...defaultProfile,experience:2}).relevant,'The inclusive maximum remains eligible.');
 const conflict=extractExperience('0–2 years of experience required. At least 3 years of Python experience required.');
 check(conflict.review.length>0,'Contradictory experience ranges within one description require review.');
 const long=normalizeGreenhouse({...raw,id:77101,internal_job_id:77101,content:'No experience required. '+'Role details. '.repeat(3000)+'Only 2025 graduates are eligible.'},source,now);
 check(long.description.length===35000&&long.evidenceComplete===false,'A shortened description carries an explicit incompleteness flag.');
 const shortened=matchJob(long,{...defaultProfile,graduationYear:'2026'});
 check(shortened.uncertain&&shortened.cautions.some(c=>c.includes('shortened')),'Missing eligibility beyond the content limit never produces a strict match.');
 const stale=make('No experience required.',{lastChecked:new Date(Date.now()-25*3600000).toISOString()});
 const staleView={...stale,match:matchJob(stale,defaultProfile),status:null};
 check(candidateJobs([staleView]).length===0&&candidateJobs([staleView],{view:'review'}).length===1,'Stale jobs are retained in review, outside strict recommendations.');
 check(matchJob(make('No experience required.',{lastChecked:'2099-01-01T00:00:00Z'}),defaultProfile).uncertain,'An impossible future verification timestamp is not fresh.');
 const persisted={...long,id:source.id+':77102',key:'trust:truncation'};
 await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES(?,?,?,?,?,?,1)').bind(persisted.id,persisted.key,source.id,JSON.stringify(persisted),now,now).run();
 const [detail,data]=await Promise.all([getJob('trust-user',persisted.id,defaultProfile),getData('trust-user','Trust')]);
 const card=data.jobs.find(j=>j.id===persisted.id);
 check(detail.match.uncertain&&card.match.uncertain&&card.evidenceComplete===false,'Card/detail carry the same incomplete-evidence warning.');
 await put({action:'ai-save',connection:{slot:1,provider:'openai',model:'gpt-5-mini',label:'Trust fixture',key:keys[0]}},'trust-ai');
 const previous=globalThis.fetch;
 let calls=0;
 try {
  const quote='At least 5 years of professional experience required.';
  globalThis.fetch=async input=>{calls++;return aiResponse(input,{summary:'You meet all requirements and are eligible.',strengths:[{point:'You have five years of experience.',evidence:quote}],checks:[]});};
  const fit=await analyseJob('trust-ai',make(quote,{key:'trust:ai'}),defaultProfile);
  check(fit.kind==='ai'&&!fit.summary.includes('meet all')&&fit.checks.some(c=>c.includes('Requires at least 5')),'AI output cannot hide an explicit experience failure.');
  check(fit.strengths.every(s=>s.point==='From the employer’s description'),'A real employer quote cannot substantiate an invented personal credential.');
  const cached=await analyseJob('trust-ai',make(quote,{key:'trust:ai'}),defaultProfile);
  check(cached.cached&&calls===1&&cached.checks.some(c=>c.includes('Requires at least 5')),'Cached interpretations retain deterministic safeguards without another provider call.');
 } finally { globalThis.fetch=previous; }
}
