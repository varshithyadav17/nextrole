// Regression cases reproduce the reported fresher / 2027 filtering failure.
export async function verifyEligibility({database,put,check,defaultProfile,raw,source}){
 const {extractExperience,experienceLabel}=await import('../lib/experience.ts');
 const {matchJob}=await import('../lib/matching.ts');
 const {extractEligibility,checkEligibility}=await import('../lib/eligibility.ts');
 const {candidateJobs,matchesView}=await import('../lib/job-selection.ts');
 const {normalizeGreenhouse}=await import('../lib/job-feeds.ts');
 const {getData,getJob}=await import('../lib/store.ts');
 const {keywordSearchJobs,searchJobs}=await import('../lib/search.ts');
 const {createAlerts}=await import('../lib/sync.ts');
 const experienceCases=[
  ['3–4 years of experience required.',3,4],
  ['4—8 years of relevant experience required.',4,8],
  ["3+ years’ experience in software development.",3,null],
  ["3 years' experience required.",3,null],
  ['Experience: 4 to 8 years',4,8],
  ['You have three years of professional experience.',3,null],
  ['At least 3 years building production systems.',3,null],
  ['Minimum 2 years of Python experience required.',2,null],
  ['6 months of professional experience required.',0.5,null],
  ['0–1 years of experience.',0,1],
  ['No prior experience required.',0,null],
  ['Freshers are eligible.',0,null],
  ['2-4 years of experience preferred. Freshers are welcome.',0,null],
  ['Preferred qualifications:\n3 years of experience\nRequirements:\nNo experience required.',0,null],
  ['No experience required. 3 years of Python experience required.',3,null],
  ['Minimum 2 years of professional experience. 5 years preferred.',2,null],
  ['Experience of up to 2 years.',0,2],
  ['Less than 2 years of experience.',0,2],
  ['Our team has 20 years of experience.',null,null],
  ['A great opportunity for an intern.',null,null],
  ['Experience with Python and SQL.',null,null],
  ['3 years of experience preferred.',null,null],
  ['Preferred: 3 years of experience.',null,null],
  ['Between 4 and 8 years of experience.',4,8],
 ];
 for(const [text,min,max] of experienceCases){const r=extractExperience(text);check(r.minimum===min&&r.maximum===max,'Experience requirement: '+text);}
 const p={...defaultProfile,name:'Eligibility student',roles:['NextRole Eligibility Engineer'],experience:0,graduationYear:'2027',degree:''};
 const make=(text,extra={})=>normalizeGreenhouse({...raw,id:910001,title:'NextRole Eligibility Engineer',content:'<p>'+text+'</p><p>Full-time. This is an on-site role.</p>',...extra},source,new Date().toISOString());
 for(const text of experienceCases.filter(c=>c[1]>0).map(c=>c[0]))check(!matchJob(make(text),p).relevant,'A fresher must be excluded from mandatory experience: '+text);
 const unknown=matchJob(make('Python experience welcome.',{title:'NextRole Eligibility Engineer Intern'}),p);
 check(unknown.relevant&&unknown.uncertain&&!matchesView(unknown)&&matchesView(unknown,'review'),'An intern title cannot turn unstated experience into a confirmed fresher match.');
 const senior=matchJob(make('No experience required.',{title:'Senior NextRole Eligibility Engineer'}),p);
 check(!senior.relevant,'A contradictory senior title must not appear in a fresher’s matched results.');
 const excluded=matchJob(make('Freshers are not eligible.'),p);
 check(!excluded.relevant,'An explicit fresher exclusion must be enforced without inventing a numeric minimum.');
 const alternative=extractExperience('Bachelor degree with 3 years of experience or Master degree with 1 year of experience.');
 check(alternative.minimum===null&&alternative.review.length,'Alternative qualification routes require review rather than choosing an unsupported minimum.');
 check(matchJob(make('Less than 2 years of experience.'),{...p,experience:2}).relevant===false,'An exclusive upper experience boundary must be enforced.');
 const legacy={...make('No experience required.'),description:'',minExperience:0,experienceRequirements:undefined};
 check(!matchesView(matchJob(legacy,p))&&matchesView(matchJob(legacy,p),'review'),'Old unversioned zero-experience metadata must stay under review until a source refresh.');
 const graduationCases=[
  ['Year of passing: 2027.',true,false],
  ['2027 passouts only.',true,false],
  ['Graduating in May 2027.',true,false],
  ['Graduation year: 2026.',false,false],
  ['2026 batch only.',false,false],
  ['Batch of 2026—2028.',true,false],
  ['Candidates must have graduated by June 2026.',false,false],
  ['Graduation before 2027.',true,true],
  ['Batch of 2026. Graduation year: 2027.',true,true],
  ['No experience required, Only 2026 graduates are eligible.',false,false],
  ['No experience required; 2026 graduates only.',false,false],
  ['Preferred qualifications:\n2026 graduates only.\nRequirements:\nNo experience required.',true,false],
 ];
 for(const [text,relevant,uncertain] of graduationCases){const r=checkEligibility(extractEligibility(text),p);check(r.relevant===relevant&&r.uncertain===uncertain,'Graduation requirement: '+text);}
 check(experienceLabel(undefined,0)==='Experience not confirmed','Legacy zero metadata must not be labelled as confirmed no-experience acceptance.');
 const future=String(new Date().getUTCFullYear()+1);
 check(checkEligibility(extractEligibility('Bachelor degree required.'),{...p,degree:'B.Tech',graduationYear:future}).uncertain,'A future graduation year must not imply the degree is already completed.');
 check(!extractEligibility('Our founder graduated in 2020.').graduation,'A founder’s graduation date must not restrict applicants.');
 const employer={...source,company:'Eligibility Test Employer'};
 const fixtures=[
  ['zero-2027','No prior experience required. Year of passing: 2027.'],
  ['three-years','Experience: 3 to 4 years. Year of passing: 2027.'],
  ['four-years','4—8 years of professional experience required.'],
  ['wrong-batch','No experience required. Only 2026 graduates are eligible.'],
  ['unknown','We are seeking a curious intern.'],
  ['conflict','No experience required. Minimum three years of Python experience required.'],
 ];
 const now=new Date().toISOString(),jobs=fixtures.map(([label,text],i)=>({...normalizeGreenhouse({...raw,id:920000+i,internal_job_id:920000+i,title:'NextRole Eligibility Engineer '+label,content:'<p>'+text+'</p><p>Full-time. This is an on-site role.</p>'},employer,now),testLabel:label}));
 for(const j of jobs)await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES(?,?,?,?,?,?,1)').bind(j.id,j.key,employer.id,JSON.stringify(j),now,now).run();
 check((await put({action:'profile',profile:{...p,completed:true}},'eligibility-2027')).ok,'The reported zero-experience / 2027 profile saves through the real handler.');
 const data=await getData('eligibility-2027',p.name),only=data.jobs.filter(j=>j.company===employer.company);
 check(only.length===6&&only.every(j=>j.description===''),'The real workspace includes metadata-only cards for all six synthetic catalogue records.');
 const matched=candidateJobs(only,{company:employer.company});
 check(matched.length===1&&matched[0].id===jobs[0].id,'Only the explicit zero-experience / 2027 job appears in For you, including company filtering.');
 check(candidateJobs(only,{view:'review'}).map(j=>j.id).join(',')===jobs[4].id,'Unknown experience appears only in Needs review, not in For you.');
 check(candidateJobs(only,{view:'all'}).length===6,'All openings is an explicit unfiltered catalogue view.');
 for(const j of jobs){const detail=await getJob('eligibility-2027',j.id,p),card=only.find(c=>c.id===j.id);check(detail.match.relevant===card.match.relevant&&detail.match.uncertain===card.match.uncertain,'Full detail and lightweight card agree: '+j.testLabel);}
 let networkCalls=0;const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{networkCalls++;throw new Error('No provider call allowed in this regression.');};
  const result=await keywordSearchJobs('eligibility-2027','Eligibility Engineer',p,{company:employer.company});
  check(result.jobIds.length===1&&result.jobIds[0]===jobs[0].id&&networkCalls===0,'Keyword search enforces the same zero-experience / batch filters without AI credits.');
  const ai=await searchJobs('eligibility-2027','four-years',p,{company:employer.company,view:'for-you'});
  check(!ai.jobIds.includes(jobs[2].id)&&networkCalls===0,'Optional AI search cannot resurrect an excluded experienced job, including without a configured key.');
 }finally{globalThis.fetch=previous;}
 await createAlerts('eligibility-2027');
 const notices=(await database.prepare("SELECT job_key FROM notifications WHERE user_id=? AND type='match'").bind('eligibility-2027').all()).results;
 check(notices.length===1&&notices[0].job_key===jobs[0].key,'New-match notifications use the same strict experience and graduation eligibility policy.');
 await put({action:'status',jobId:jobs[1].id,status:'applied',note:'Keep my existing application history'},'eligibility-2027');
 const tracked=(await getData('eligibility-2027',p.name)).jobs.find(j=>j.id===jobs[1].id);
 check(tracked.status==='applied'&&tracked.note==='Keep my existing application history'&&!tracked.match.relevant,'A stricter filter preserves a student’s existing Applied state and private notes.');
}
