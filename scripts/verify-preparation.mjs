import {writeFileSync} from 'node:fs';
import {PDFDocument} from 'pdf-lib';
export async function verifyPreparation({database,put,check,defaultProfile,raw,source,keys,aiResponse}){
 const {POST,GET}=await import('../app/api/preparation/route.ts');
 const {getJob}=await import('../lib/store.ts');
 const {normalizeGreenhouse}=await import('../lib/job-feeds.ts');
 const {resumeLatex,resumeDocument}=await import('../lib/career.ts');
 const user='preparation-owner',now=new Date().toISOString();
 const job=normalizeGreenhouse({...raw,id:77301,internal_job_id:77301},source,now);
 await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES(?,?,?,?,?,?,1)').bind(job.id,job.key,source.id,JSON.stringify(job),now,now).run();
 const identity=user=>{globalThis.__nextroleTestUser=user?{userId:user,email:user+'@example.test',displayName:user}:null;};
 const profileVersions=new Map();
 const post=async(body,who=user)=>{if(body.action==='career-save'&&body.expectedRevision===undefined)body={...body,expectedRevision:profileVersions.get(who)||null};identity(who);const response=await POST(new Request('https://nextrole.test/api/preparation',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://nextrole.test'},body:JSON.stringify(body)}));if(response.ok&&body.action==='career-save')profileVersions.set(who,(await response.clone().json()).career.revision);return response;};
 const get=async(query='',who=user)=>{identity(who);return GET(new Request('https://nextrole.test/api/preparation'+query));};
 check((await get('',null)).status===401&&(await post({action:'career-save'},null)).status===401,'Career/preparation endpoints reject anonymous access.');
 const facts=[
  {id:crypto.randomUUID(),kind:'education',title:'B.Tech in Computer Science',organization:'Example Institute',dates:'2024–2028 (expected)',details:['Coursework in databases and software engineering.'],url:'',verified:true},
  {id:crypto.randomUUID(),kind:'project',title:'Opportunity tracker',organization:'Personal project',dates:'2026',details:['Built a Python and SQL opportunity tracker.','Implemented source attribution and duplicate checks.'],url:'https://example.test/projects/tracker',verified:true},
  {id:crypto.randomUUID(),kind:'skill',title:'Python, SQL',organization:'',dates:'',details:[],url:'',verified:true},
  {id:crypto.randomUUID(),kind:'achievement',title:'UNCONFIRMED_AWARD',organization:'',dates:'',details:['This unconfirmed statement must never enter generated materials.'],url:'',verified:false},
 ];
 const profile={name:'Test Student',email:'private-profile@example.test',phone:'+91 0000000000',location:'Bengaluru, India',website:'https://example.test/portfolio',contactVerified:true,facts};
 const requestId=crypto.randomUUID(),input={action:'prepare',jobId:job.id,requestId,questions:['Describe a relevant project.','Do you require visa sponsorship?','When are you available to start?','Why do you want to join this company?']};
 check((await post(input)).status===400,'Preparation requires a reviewed career profile.');
 check((await post({action:'career-save',profile:{...profile,contactVerified:false}})).ok,'Career drafts can be saved before confirmation.');
 check((await post(input)).status===400,'Unconfirmed contact details cannot enter a resume.');
 check((await post({action:'career-save',profile:{...profile,facts:[facts[0],facts[0]]}})).status===400,'Duplicate fact IDs cannot silently overwrite verified evidence.');
 check((await post({action:'career-save',profile,expectedRevision:crypto.randomUUID()})).status===409,'A stale career-profile revision cannot overwrite confirmed facts.');
 check((await post({action:'career-save',profile})).ok,'The owner can save confirmed career facts.');
 const other=await (await get('', 'preparation-other')).json();
 check(!other.career.revision&&other.career.profile.facts.length===0,'Career profiles remain private to their authenticated workspace.');
 let network=0;const previous=globalThis.fetch;
 globalThis.fetch=async()=>{network++;throw new Error('No HTTP permitted for deterministic preparation.');};
 let kit;
 try{
  const response=await post(input);check(response.status===201,'A saved preparation is generated from verified facts without an API key.');kit=(await response.json()).kit;
  check(network===0&&kit.method==='verified-facts','Ordinary application preparation makes no provider or website calls.');
  const repeated=(await (await post(input)).json()).kit;
  check(repeated.id===kit.id&&repeated.revision===kit.revision,'Retrying a preparation request is idempotent.');
 }finally{globalThis.fetch=previous;}
 check(!JSON.stringify(kit.resume).includes('UNCONFIRMED_AWARD')&&kit.resume.sections.some(s=>s.title==='Projects'),'Resume content contains verified evidence and excludes unconfirmed achievements.');
 check(kit.questions[0].answer.includes('Built a Python and SQL')&&kit.questions[0].factIds.includes(facts[1].id),'Project answers refer to actual confirmed project facts.');
 check(kit.questions.slice(1).every(q=>q.answer===''&&q.missingFacts.length),'Authorization, availability and motivation remain unanswered instead of guessed.');
 check(kit.questions.every(q=>q.origin==='user-pasted'&&!q.reviewed),'Pasted questions retain their origin and require individual review.');
 check((await getJob(user,job.id,defaultProfile)).status===null,'Preparing documents never marks an application Applied.');
 for(const format of ['', '&format=tex','&format=pdf'])check((await get('?kitId='+kit.id+format,'preparation-other')).status===404,'Kit and document downloads enforce user ownership: '+format);
 check((await post({action:'update',kitId:kit.id,expectedRevision:kit.revision,answers:[{id:kit.questions[1].id,answer:'',reviewed:true}]})).status===400,'An unanswered critical declaration cannot be marked reviewed.');
 const updatedResponse=await post({action:'update',kitId:kit.id,expectedRevision:kit.revision,answers:[{id:kit.questions[0].id,answer:kit.questions[0].answer,reviewed:true}],selectedFactIds:kit.selectedFactIds});
 const updated=(await updatedResponse.json()).kit;
 check(updatedResponse.ok&&updated.revision!==kit.revision&&updated.questions[0].reviewed,'Reviewed answers are persisted with a new concurrency revision.');
 check((await post({action:'update',kitId:kit.id,expectedRevision:kit.revision,answers:[]})).status===409,'A stale editor cannot overwrite newer reviewed answers.');
 check((await post({action:'update',kitId:kit.id,expectedRevision:updated.revision,selectedFactIds:[facts[3].id]})).status===400,'Unverified facts cannot be added through a forged resume selection.');
 const legacyKit={...updated,id:'kit-'+crypto.randomUUID(),resume:resumeDocument(updated.profileSnapshot,updated.selectedFactIds,'legacy')};
 await database.prepare('INSERT INTO application_kits(user_id,id,job_key,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(user,legacyKit.id,legacyKit.jobKey,JSON.stringify(legacyKit),legacyKit.createdAt,legacyKit.updatedAt).run();
 const legacyBefore=Buffer.from(await (await get('?kitId='+legacyKit.id+'&format=pdf')).arrayBuffer());
 const legacyUpdate=await post({action:'update',kitId:legacyKit.id,expectedRevision:legacyKit.revision,selectedFactIds:legacyKit.selectedFactIds,answers:[]}),legacyAfter=(await legacyUpdate.json()).kit;
 check(legacyUpdate.ok&&!legacyAfter.resume.template&&Buffer.from(await (await get('?kitId='+legacyKit.id+'&format=pdf')).arrayBuffer()).equals(legacyBefore),'Editing an earlier saved preparation through the real API retains its renderer and exact PDF bytes.');
 const tex=await get('?kitId='+kit.id+'&format=tex'),latex=await tex.text();
 check(tex.ok&&latex.includes('\\documentclass')&&latex.includes('Opportunity tracker')&&!latex.includes('UNCONFIRMED_AWARD'),'The downloadable LaTeX template uses exactly the saved verified facts.');
 check(resumeLatex({...kit.resume,name:'Name \\input{private} & 50%'}).includes('\\textbackslash{}input\\{private\\} \\& 50\\%'),'User text is escaped instead of being interpreted as TeX commands.');
 const pdf=await get('?kitId='+kit.id+'&format=pdf'),pdfBytes=new Uint8Array(await pdf.arrayBuffer());
 check(pdf.ok&&new TextDecoder().decode(pdfBytes.slice(0,4))==='%PDF','PDF export returns an actual PDF document.');
 const parsedPDF=await PDFDocument.load(pdfBytes);
 check(parsedPDF.getPageCount()>=1&&parsedPDF.getTitle()==='Resume - Test Student','The generated PDF is readable and carries the saved resume identity.');
 const sample=process.argv.find(value=>value.startsWith('--resume-sample='))?.slice(16);if(sample)writeFileSync(sample,pdfBytes);
 await database.prepare("UPDATE jobs SET data=json_set(data,'$.description',?) WHERE id=?").bind('Updated employer description.',job.id).run();
 const snapshot=(await (await get('?kitId='+kit.id)).json()).kit;
 check(snapshot.jobSnapshot.description===kit.jobSnapshot.description&&snapshot.snapshotHash===kit.snapshotHash,'The original job snapshot remains unchanged when the shared listing changes.');
 try{
  globalThis.fetch=async input=>{network++;check(String(input).startsWith('https://boards-api.greenhouse.io/')&&String(input).endsWith('?questions=true'),'Form observation only calls the supported public job endpoint.');return Response.json({id:77301,questions:[{label:'Describe a project you built.'},{label:'Are you authorized to work in India?'}]});};
  const observed=(await (await post({...input,requestId:crypto.randomUUID(),questions:[],inspectForm:true})).json()).kit;
  check(observed.questions.length===2&&observed.questions.every(q=>q.origin==='observed'&&q.observedAt&&q.sourceUrl),'Observed form questions are distinguished from practice questions with source and time.');
 }finally{globalThis.fetch=previous;}
 const practice=(await (await post({...input,requestId:crypto.randomUUID(),questions:[]})).json()).kit;
 check(practice.questions.every(q=>q.origin==='suggested'&&!q.sourceUrl),'Predicted practice questions never claim to have been seen on the form.');
 await put({action:'ai-save',connection:{slot:1,provider:'openai',model:'gpt-5-mini',label:'Preparation fixture',key:keys[0]}},user);
 let payload;
 try{
  globalThis.fetch=async(input,init)=>{payload=JSON.parse(init.body);return aiResponse(input,{factIds:[facts[1].id,facts[3].id,crypto.randomUUID()]});};
  const selected=(await (await post({...input,requestId:crypto.randomUUID(),useAI:true})).json()).kit;
  check(selected.method==='ai-selection'&&selected.selectedFactIds[0]===facts[1].id&&!selected.selectedFactIds.includes(facts[3].id),'Optional AI can rank only confirmed fact IDs.');
  check(!JSON.stringify(payload).includes(profile.email)&&!JSON.stringify(payload).includes(profile.name)&&!JSON.stringify(payload).includes('UNCONFIRMED_AWARD'),'AI preparation excludes contact identity and unconfirmed facts.');
 }finally{globalThis.fetch=previous;}
 check((await post({action:'delete-kit',kitId:kit.id},'preparation-other')).status===404,'Another user cannot delete a saved preparation.');
 const exported=await (await put({action:'export-account'},user)).json();
 check(exported.applicationKits.length>=4&&exported.careerProfile.revision,'Workspace exports include preparation history and its career profile version.');
 check((await post({action:'delete-kit',kitId:kit.id})).ok&&(await get('?kitId='+kit.id)).status===404,'The owner can remove a preparation version.');
 await put({action:'delete-account-data',confirmation:'DELETE'},user);
 check(!(await database.prepare('SELECT user_id FROM career_profiles WHERE user_id=?').bind(user).first())&&!(await database.prepare('SELECT id FROM application_kits WHERE user_id=?').bind(user).first()),'Workspace deletion removes career data and all preparation history.');
}
