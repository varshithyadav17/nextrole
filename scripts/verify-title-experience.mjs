// The exact Paytm title reported in the owner's screenshot is a permanent regression case.
export async function verifyTitleExperience({database,put,check,defaultProfile,raw,source,SOURCES}){
 const {extractExperience,experienceForJob,experienceLabel}=await import('../lib/experience.ts');
 const {normalizeLever,normalizeGreenhouse,normalizeAshby}=await import('../lib/job-feeds.ts');
 const {matchJob}=await import('../lib/matching.ts');
 const {candidateJobs}=await import('../lib/job-selection.ts');
 const {getData,getJob}=await import('../lib/store.ts');
 const {keywordSearchJobs,searchJobs}=await import('../lib/search.ts');
 const {createAlerts}=await import('../lib/sync.ts');
 const {basicFit}=await import('../lib/ai.ts');
 const screenshotTitle='Product Management - Lending Product | Experience : 4 -8 yrs';
 const cases=[
  [screenshotTitle,4,8],
  ['Product Manager (3–5 years)',3,5],
  ['Product Manager | 3+ yrs',3,null],
  ['Product Manager | Exp: 2 to 4 years',2,4],
  ['Product Manager | 0–1 years',0,1],
  ['Product Manager | Experience: 6 months',0.5,null],
  ['Product Manager | Experience: three years',3,null],
  ['Product Manager | Experience: 4—8 yrs',4,8],
  ['Product Intern | 6 month internship',null,null],
  ['Product Intern 2027',null,null],
  ['Product Intern | 2-year programme',null,null],
 ];
 for(const [title,min,max] of cases){const r=extractExperience('Build products with a collaborative team.',title);check(r.minimum===min&&r.maximum===max,'Title experience: '+title);}
 const exact=extractExperience('Build lending products.',screenshotTitle);
 check(exact.evidenceItems.some(i=>i.source==='title'&&i.text===screenshotTitle)&&experienceLabel(exact,null)==='4–8 years','The screenshot’s title is retained as evidence and displayed as 4–8 years, never unconfirmed.');
 const conflict=extractExperience('No experience required.',screenshotTitle);
 check(conflict.minimum===4&&conflict.review.length&&conflict.evidenceItems.length===2,'A fresher statement in the description cannot erase a mandatory 4-year minimum in the title.');
 const reverse=extractExperience('Minimum 3 years of experience required.','Product Manager | Experience: 0–1 years');
 check(reverse.minimum===3&&reverse.review.length,'A zero-experience title cannot override mandatory description experience.');
 const optional=extractExperience('No experience required.','Product Manager | 4 years of experience preferred');
 check(optional.minimum===0&&!optional.review.length,'A preferred title qualification must not become a mandatory cutoff.');
 const now=new Date().toISOString(),paytm=SOURCES.find(s=>s.id==='paytm');
 const lever=normalizeLever({id:'title-test-001',text:screenshotTitle,categories:{location:'Bangalore, Karnataka',commitment:'Full-time'},country:'IN',workplaceType:'on-site',hostedUrl:'https://jobs.lever.co/paytm/title-test-001',descriptionPlain:'Build lending products with the team.'},paytm,now);
 const greenhouse=normalizeGreenhouse({...raw,id:930001,internal_job_id:930001,title:screenshotTitle,content:'<p>Full-time. This is an on-site role.</p>'},source,now);
 const ashby=normalizeAshby({id:'title-test-ashby',title:screenshotTitle,location:'Bangalore, India',isListed:true,workplaceType:'OnSite',employmentType:'FullTime',descriptionPlain:'Build lending products.',jobUrl:'https://jobs.ashbyhq.com/sarvam/title-test-ashby'},SOURCES.find(s=>s.provider==='ashby'),now);
 const p={...defaultProfile,name:'Title regression',roles:['Product manager'],experience:0,graduationYear:'2027',degree:''};
 for(const j of [lever,greenhouse,ashby]){
  check(j.minExperience===4&&j.experienceRequirements.maximum===8,'Every ATS normalizer reads title-only experience: '+j.sourceId);
  const m=matchJob(j,p);check(!m.relevant&&m.cautions.some(c=>c.includes('at least 4 years')),'A zero-experience profile is excluded from the screenshot role: '+j.sourceId);
  const card={...j,description:'',match:matchJob({...j,description:''},p),status:null};
  check(!candidateJobs([card]).length&&!candidateJobs([card],{view:'review'}).length,'A known experienced title stays out of both For you and Needs review: '+j.sourceId);
 }
 const qualified=matchJob(lever,{...p,experience:5});
 check(qualified.relevant&&!qualified.uncertain&&matchJob(lever,{...p,experience:3}).relevant===false&&matchJob(lever,{...p,experience:9}).relevant===false,'The 4–8 range admits a 5-year profile and excludes profiles below or above the range.');
 const legacy={...lever,experienceRequirements:{version:1,minimum:null,maximum:null,evidence:null,review:[]},minExperience:null,experienceEvidence:null};
 const legacyCard={...legacy,description:''};
 check(experienceForJob(legacyCard).minimum===4&&!matchJob(legacyCard,p).relevant,'Existing v12 description-only metadata is corrected from the title immediately, without another source refresh.');
 const fit=basicFit(legacy,p);
 check(fit.checks.some(c=>c.includes('at least 4 years'))&&!fit.checks.some(c=>c.startsWith('Confirm required experience')),'The no-key fit check reports the actual title requirement rather than claiming it is missing.');
 const company='Title Evidence Test Employer';
 const known={...legacy,id:'title-regression:known',key:'title-regression:known',company};
 const fresh=normalizeGreenhouse({...raw,id:930002,internal_job_id:930002,title:'Product Management Graduate | Experience: 0–1 years',content:'<p>Only 2027 graduates are eligible. Full-time. This is an on-site role.</p>'},{...source,company},now);
 for(const j of [known,fresh])await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES(?,?,?,?,?,?,1)').bind(j.id,j.key,j.sourceId,JSON.stringify(j),now,now).run();
 await put({action:'profile',profile:{...p,completed:true}},'title-2027');
 const before=await database.prepare('SELECT data,first_seen,last_checked FROM jobs WHERE id=?').bind(known.id).first();
 const data=await getData('title-2027',p.name),card=data.jobs.find(j=>j.id===known.id),detail=await getJob('title-2027',known.id,p);
 check(card.description===''&&card.minExperience===4&&card.experienceRequirements.maximum===8,'The real lightweight workspace repairs the label on an existing v12 Paytm-style record.');
 check(detail.minExperience===4&&detail.match.relevant===card.match.relevant&&detail.match.uncertain===card.match.uncertain,'The job card and full-detail API agree on title-only experience.');
 const after=await database.prepare('SELECT data,first_seen,last_checked FROM jobs WHERE id=?').bind(known.id).first();
 check(JSON.stringify(before)===JSON.stringify(after),'Read-time title correction does not rewrite source records or their verification timestamps.');
 const selected=candidateJobs(data.jobs,{company}),review=candidateJobs(data.jobs,{company,view:'review'});
 check(selected.length===1&&selected[0].id===fresh.id&&!review.some(j=>j.id===known.id),'Company filtering keeps an explicit experienced role out of both matched and review results.');
 const keyword=await keywordSearchJobs('title-2027','Product Management',p,{company});
 const ai=await searchJobs('title-2027','Product Management',p,{company});
 check(keyword.jobIds.length===1&&keyword.jobIds[0]===fresh.id&&ai.jobIds.length===1&&ai.jobIds[0]===fresh.id,'Keyword and optional AI search share the title-experience exclusion.');
 await createAlerts('title-2027');
 const notices=(await database.prepare("SELECT job_key FROM notifications WHERE user_id=? AND type='match'").bind('title-2027').all()).results;
 check(notices.length===1&&notices[0].job_key===fresh.key,'Alerts reject title-only experienced jobs even while old metadata remains in the database.');
 await put({action:'status',jobId:known.id,status:'applied',note:'Preserve this existing application'},'title-2027');
 const tracked=(await getData('title-2027',p.name)).jobs.find(j=>j.id===known.id);
 check(tracked.status==='applied'&&tracked.note==='Preserve this existing application'&&tracked.minExperience===4,'Correcting the displayed experience preserves Applied and private notes.');
}
