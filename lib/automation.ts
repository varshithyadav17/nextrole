import {z} from 'zod';
import {db,one,rows,getJob,getProfile} from './store';
import {getKit,preparationHistory,type ApplicationKit} from './preparation';
import {careerState} from './preparation';
import {PublicError} from './errors';
import {digest} from './keyring';
import {acquireLease,releaseLease,type Lease} from './lease';
import {saveApplicationRecord,applicationRecord} from './application-records';
import type {JobView} from './types';

export const automationSchema=z.object({enabled:z.boolean(),autoSubmit:z.boolean(),dailyLimit:z.number().int().min(1).max(10),companies:z.array(z.string().trim().min(1).max(100)).max(30).default([])});
export type AutomationSettings=z.infer<typeof automationSchema>;
const defaults:AutomationSettings={enabled:false,autoSubmit:false,dailyLimit:3,companies:[]};
type QueueData={jobId:string;title:string;company:string;url:string;kitId:string;kitRevision:string;role:string;checks:string[];phase?:string;claim?:string;claimExpires?:string;pdfSha256?:string;attemptDay?:string;claimedKit?:ApplicationKit;claimedPdf?:string;notice:string;events:{at:string;state:string;note:string}[]};
type QueueRow={id:string;user_id:string;job_key:string;state:string;data:string;revision:string;created_at:string;updated_at:string};
const now=()=>new Date().toISOString();
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());
export async function automationState(userId:string){
 const row=await one<{data:string;revision:string}>('SELECT data,revision FROM automation_settings WHERE user_id=?',userId),token=await one<{token_hash:string;expires_at:string}>('SELECT token_hash,expires_at FROM automation_tokens WHERE user_id=?',userId);
 const scope=await one<{value:string}>('SELECT value FROM meta WHERE key=?','companion_workspace:'+userId);
 const items=await rows<QueueRow>('SELECT * FROM automation_queue WHERE user_id=? ORDER BY created_at DESC LIMIT 50',userId);
 const valid=!!token&&Date.parse(token.expires_at)>Date.now(),discoveryPaired=valid&&scope?.value==='discovery:'+token!.token_hash;
 return {settings:row?automationSchema.parse(JSON.parse(row.data)):{...defaults},revision:row?.revision||null,pairedUntil:token?.expires_at||null,workspacePaired:valid&&(scope?.value===token!.token_hash||discoveryPaired),discoveryPaired,queue:items.map(r=>({id:r.id,jobKey:r.job_key,state:r.state,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at,...publicQueue(JSON.parse(r.data))}))};
}
function publicQueue(data:QueueData){const {claim,claimExpires,claimedKit,claimedPdf,...rest}=data;void claim;void claimExpires;void claimedKit;void claimedPdf;return rest;}
export function applicationChecks(job:JobView,kit:ApplicationKit|null,settings:AutomationSettings){
 const blocks:string[]=[],review:string[]=[];
 const url=new URL(job.url),allowed=['job-boards.greenhouse.io','boards.greenhouse.io','jobs.lever.co','jobs.eu.lever.co','jobs.ashbyhq.com'];
 if(!allowed.includes(url.hostname)||job.provenance?.kind!=='ats-api')blocks.push('This source has no supported companion adapter. Apply on the original site.');
 if(!job.active||job.deadline&&Date.parse(job.deadline)<=Date.now())blocks.push('The opening is closed or its deadline has passed.');
 if(job.status==='applied'||job.status==='dismissed')blocks.push('This opening is already applied to or marked Not interested.');
 if(!job.match.relevant)blocks.push('A saved preference or published eligibility requirement excludes this opening.');
 if(job.match.uncertain)review.push(...job.match.cautions.length?job.match.cautions:['Eligibility is incomplete or uncertain.']);
 if(!job.lastChecked||Date.now()-Date.parse(job.lastChecked)>2*3600000)review.push('A recent source availability check is required.');
 if(settings.companies.length&&!settings.companies.some(c=>c.toLowerCase()===job.company.toLowerCase()))blocks.push('This employer is outside your automation company allowlist.');
 if(!kit||kit.jobKey!==job.key)blocks.push('Choose a saved résumé preparation for this exact job.');
 else{if(!kit.profileSnapshot.contactVerified||!kit.profileSnapshot.name||!kit.profileSnapshot.email)blocks.push('Confirm a name and email in Career facts and rebuild the résumé.');if(!kit.selectedFactIds.length)blocks.push('The résumé has no selected facts.');}
 if(kit&&job.change&&Date.parse(job.change.at)>Date.parse(kit.createdAt))blocks.push('The source changed this opening after this preparation. Review the new listing and create a fresh preparation before queueing it.');
 return {blocks,review:[...new Set(review)]};
}
export async function automationForJob(userId:string,jobId:string){const state=await automationState(userId),job=await getJob(userId,jobId,await getProfile(userId));if(!job)throw new PublicError('Opening not found.',404);const history=await preparationHistory(userId,job.key),kits=await Promise.all(history.map(k=>getKit(userId,k.id)));return {...state,job:{id:job.id,title:job.title,company:job.company},preparations:kits.filter((k):k is ApplicationKit=>!!k).map(k=>({id:k.id,createdAt:k.createdAt,checks:applicationChecks(job,k,state.settings)}))};}
export async function automationAction(userId:string,input:unknown){
 const value=z.object({action:z.enum(['settings','pair','revoke','queue','cancel']),expectedRevision:z.string().uuid().nullable().optional(),settings:automationSchema.optional(),consent:z.string().optional(),jobId:z.string().max(200).optional(),kitId:z.string().max(50).optional(),role:z.string().trim().max(100).optional(),queueId:z.string().uuid().optional()}).parse(input),state=await automationState(userId);
 if(value.action==='settings'){
  if(state.revision!==value.expectedRevision)throw new PublicError('Automation settings changed. Reload before saving.',409);if(!value.settings)throw new PublicError('Choose automation settings.');
  if(value.settings.autoSubmit&&!state.settings.autoSubmit&&value.consent!=='AUTO_APPLY')throw new PublicError('Explicitly confirm automatic submission before enabling it.');
  const revision=crypto.randomUUID();await db().prepare('INSERT INTO automation_settings(user_id,data,revision,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at').bind(userId,JSON.stringify(value.settings),revision,now()).run();
  if(!value.settings.enabled)await db().prepare("UPDATE automation_queue SET state='needs_review',updated_at=? WHERE user_id=? AND state IN ('ready','processing')").bind(now(),userId).run();
 }else if(value.action==='pair'){
  const bytes=crypto.getRandomValues(new Uint8Array(32)),token='nr_companion_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''),expires=new Date(Date.now()+30*86400000).toISOString();
  const hash=await digest(token);
  const discovery=value.consent==='COMPANION_DISCOVERY',workspace=discovery||value.consent==='COMPANION_WORKSPACE';
  await db().batch([db().prepare('INSERT INTO automation_tokens(user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at,created_at=excluded.created_at').bind(userId,hash,expires,now()),workspace?db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('companion_workspace:'+userId,(discovery?'discovery:':'')+hash):db().prepare('DELETE FROM meta WHERE key=?').bind('companion_workspace:'+userId)]);
  return {state:await automationState(userId),token,notice:'Your connection expires in 30 days and can be revoked here. '+(discovery?'Discovery access includes your recent matched-job inbox, plus reviewed job saving and tracking. Browser checks and desktop alerts have separate switches.':workspace?'Workspace access permits deliberate job imports, single-job matching/status lookup and confirmed tracking changes, plus approved application packets and receipts.':'Access permits explicit structured job captures, approved application packets and receipts only.')};
 }else if(value.action==='revoke'){
  await db().batch([db().prepare('DELETE FROM automation_tokens WHERE user_id=?').bind(userId),db().prepare('DELETE FROM meta WHERE key=?').bind('companion_workspace:'+userId)]);await db().prepare("UPDATE automation_queue SET state='needs_review',updated_at=? WHERE user_id=? AND state IN ('ready','processing')").bind(now(),userId).run();
 }else if(value.action==='cancel'){
  await db().prepare("UPDATE automation_queue SET state='cancelled',updated_at=? WHERE user_id=? AND id=? AND state<>'submitted'").bind(now(),userId,value.queueId||'').run();
 }else{
  if(!value.jobId||!value.kitId)throw new PublicError('Choose a job and its saved résumé.');
  const job=await getJob(userId,value.jobId,await getProfile(userId)),kit=await getKit(userId,value.kitId);if(!job)throw new PublicError('Opening not found.',404);
  const checks=applicationChecks(job,kit,state.settings);if(checks.blocks.length)throw new PublicError(checks.blocks.join(' '));
  const currentCareer=await careerState(userId);if(currentCareer.revision!==kit!.profileRevision)throw new PublicError('Your Career facts changed. Build a fresh résumé before queuing.');
  const existing=await one<QueueRow>('SELECT * FROM automation_queue WHERE user_id=? AND job_key=? ORDER BY created_at DESC LIMIT 1',userId,job.key);
  if(existing&&!['cancelled','failed'].includes(existing.state))return {state:await automationState(userId),notice:'This job already has a queue record. Ambiguous or submitted attempts are never retried automatically.'};
  const pending=await one<{n:number}>("SELECT COUNT(*) as n FROM automation_queue WHERE user_id=? AND state IN ('ready','processing','needs_review','uncertain')",userId);if((pending?.n||0)>=25)throw new PublicError('Review or cancel older entries before queuing more than 25 pending applications.');
  const data:QueueData={jobId:job.id,title:job.title,company:job.company,url:job.url,kitId:kit!.id,kitRevision:kit!.revision,role:(value.role||job.title).slice(0,100),checks:checks.review,notice:'Queued for the paired browser companion. The employer form is checked again before any submission.',events:[{at:now(),state:'ready',note:'User queued this saved preparation.'}]};
  await db().prepare('INSERT INTO automation_queue(id,user_id,job_key,state,data,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),userId,job.key,'ready',JSON.stringify(data),crypto.randomUUID(),now(),now()).run();
 }
 return {state:await automationState(userId)};
}
export async function companionIdentity(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (nr_companion_[a-f0-9]{64})$/)?.[1];if(!token)throw new PublicError('A valid Scout Companion token is required.',401);
 const record=await one<{user_id:string;expires_at:string}>('SELECT user_id,expires_at FROM automation_tokens WHERE token_hash=?',await digest(token));if(!record||Date.parse(record.expires_at)<=Date.now())throw new PublicError('This companion token expired or was revoked.',401);return record.user_id;
}
export async function companionWorkspaceAllowed(request:Request,userId:string){
 const token=request.headers.get('authorization')?.match(/^Bearer (nr_companion_[a-f0-9]{64})$/)?.[1];
 const scope=await one<{value:string}>('SELECT value FROM meta WHERE key=?','companion_workspace:'+userId);
 if(!token)return false;const hash=await digest(token);return scope?.value===hash||scope?.value==='discovery:'+hash;
}
export async function companionDiscoveryAllowed(request:Request,userId:string){
 const token=request.headers.get('authorization')?.match(/^Bearer (nr_companion_[a-f0-9]{64})$/)?.[1];
 const scope=await one<{value:string}>('SELECT value FROM meta WHERE key=?','companion_workspace:'+userId);
 return !!token&&scope?.value==='discovery:'+await digest(token);
}
async function saveQueue(row:QueueRow,data:QueueData,state:string,note:string){if(state==='submitted'){delete data.claimedKit;delete data.claimedPdf;}data.notice=note;data.events=[...data.events,{at:now(),state,note}].slice(-40);const revision=crypto.randomUUID();const saved=await db().prepare('UPDATE automation_queue SET state=?,data=?,revision=?,updated_at=? WHERE id=? AND user_id=? AND revision=?').bind(state,JSON.stringify(data),revision,now(),row.id,row.user_id,row.revision).run();if(!saved.meta.changes)throw new PublicError('The queue changed. Review this entry before continuing.',409);return revision;}
async function freshPacket(userId:string,row:QueueRow){const data=JSON.parse(row.data) as QueueData,job=await getJob(userId,data.jobId,await getProfile(userId)),kit=await getKit(userId,data.kitId),career=await careerState(userId),state=await automationState(userId);if(!job||!kit||kit.revision!==data.kitRevision||career.revision!==kit.profileRevision)throw new PublicError('The job, résumé or Career facts changed. Review this queue entry.');const checks=applicationChecks(job,kit,state.settings);if(checks.blocks.length)throw new PublicError(checks.blocks.join(' '));return {job,kit,data,checks,state};}
export async function companionClaim(userId:string){
 const state=await automationState(userId);if(!state.settings.enabled)return {paused:true,message:'Automation is paused in NextRole.'};
 const abandoned=await rows<QueueRow>("SELECT * FROM automation_queue WHERE user_id=? AND state='processing'",userId);
 for(const row of abandoned){const data=JSON.parse(row.data) as QueueData;if(!data.claimExpires||Date.parse(data.claimExpires)<=Date.now())await saveQueue(row,data,'uncertain','The companion stopped before a confirmed result. Check the employer page; no automatic retry will occur.');else return {busy:true,message:'One application is already open in your companion.'};}
 const row=await one<QueueRow>("SELECT * FROM automation_queue WHERE user_id=? AND state='ready' ORDER BY created_at LIMIT 1",userId);if(!row)return {empty:true,message:'No approved applications are queued.'};
 try{
  const {kit,job,data,checks}=await freshPacket(userId,row),{resumePDF}=await import('./resume-pdf'),pdf=await resumePDF(kit.resume,kit.createdAt),sha=await crypto.subtle.digest('SHA-256',pdf);
  data.claim=crypto.randomUUID();data.claimExpires=new Date(Date.now()+10*60000).toISOString();data.pdfSha256=Array.from(new Uint8Array(sha),b=>b.toString(16).padStart(2,'0')).join('');data.phase='filling';data.claimedKit=kit;data.claimedPdf=btoa(Array.from(pdf,b=>String.fromCharCode(b)).join(''));
  await saveQueue(row,data,'processing','The companion received this exact prepared résumé. No application has been submitted yet.');
  return {packet:{id:row.id,claim:data.claim,expiresAt:data.claimExpires,url:job.url,title:job.title,company:job.company,autoSubmit:state.settings.autoSubmit&&!checks.review.length,review:checks.review,contact:{name:kit.profileSnapshot.name,email:kit.profileSnapshot.email,phone:kit.profileSnapshot.phone,location:kit.profileSnapshot.location,links:kit.profileSnapshot.links},questions:kit.questions.filter(q=>q.origin!=='suggested'&&q.reviewed&&!!q.answer.trim()).map(q=>({text:q.text,answer:q.answer})),resume:{filename:'NextRole_resume.pdf',base64:data.claimedPdf,sha256:data.pdfSha256}}};
 }catch(error){await saveQueue(row,JSON.parse(row.data),'needs_review',error instanceof PublicError?error.message:'Could not prepare the application packet. Review before retrying.');return {needsReview:true,message:'The next queue entry needs review in NextRole.'};}
}
export async function companionReport(userId:string,input:unknown,lease:Lease){
 const value=z.object({id:z.string().uuid(),claim:z.string().uuid(),action:z.enum(['authorize-fill','authorize-submit','submitted','needs-review','uncertain','failed']),url:z.string().url().max(2048),confirmation:z.string().max(500).default(''),sha256:z.string().regex(/^[a-f0-9]{64}$/),note:z.string().max(500).default('')}).parse(input);
 const row=await one<QueueRow>('SELECT * FROM automation_queue WHERE user_id=? AND id=?',userId,value.id);if(!row)throw new PublicError('Queue record not found.',404);const data=JSON.parse(row.data) as QueueData;
 if(row.state==='submitted'&&value.action==='submitted')return {ok:true,alreadyRecorded:true};
 if((row.state!=='processing'&&!(value.action==='submitted'&&row.state==='needs_review'&&data.phase==='armed'))||data.claim!==value.claim||!data.claimExpires||Date.parse(data.claimExpires)<=Date.now()||data.pdfSha256!==value.sha256)throw new PublicError('This application claim changed or expired. Check the employer site before doing anything else.',409);
 const actual=new URL(value.url),expected=new URL(data.url);if(actual.origin!==expected.origin||!(actual.pathname===expected.pathname.replace(/\/apply\/?$/,'').replace(/\/$/,'')||actual.pathname.startsWith(expected.pathname.replace(/\/apply\/?$/,'').replace(/\/$/,'')+'/')))throw new PublicError('The companion moved to another page. Review manually.');
 if(value.action==='authorize-fill'){
  const {state}=await freshPacket(userId,row);if(!state.settings.enabled)throw new PublicError('Application assistance is paused in NextRole.');
  return {allowed:true,validForMs:10000};
 }
 if(value.action==='authorize-submit'){
  const {state,checks}=await freshPacket(userId,row);if(!state.settings.enabled||!state.settings.autoSubmit||checks.review.length)throw new PublicError('Automatic submission is paused or this job needs review.');
  if(data.phase==='armed')throw new PublicError('Submission was already authorized once. Check the site rather than repeating it.',409);
  const attempted=await one<{n:number}>("SELECT COUNT(*) as n FROM automation_queue WHERE user_id=? AND json_extract(data,'$.attemptDay')=?",userId,day());if((attempted?.n||0)>=state.settings.dailyLimit)throw new PublicError('Your daily automatic submission limit is reached.');
  data.phase='armed';data.attemptDay=day();await saveQueue(row,data,'processing','One automatic submission was authorized after the companion checked the form.');return {allowed:true,validForMs:10000};
 }
 if(value.action==='submitted'){
  if(!/application (?:has been |was |is )?(?:submitted|received)|thank you for applying|successfully (?:submitted|applied)/i.test(value.confirmation))throw new PublicError('An employer confirmation message is required. A click is not a submission.');
  const prior=await applicationRecord(userId,row.job_key);if(prior){if(prior.submitted?.sha256!==data.pdfSha256)throw new PublicError('A different submission is already recorded. Its original résumé is preserved.',409);await saveQueue(row,data,'submitted','Recovered the already saved submitted résumé after an interrupted response.');return {ok:true,alreadyRecorded:true};}
  // Record the exact claimed document even if preferences, source availability or a draft changed after the click.
  const kit=data.claimedKit;if(!kit||!data.claimedPdf||!data.pdfSha256)throw new PublicError('The original application packet is unavailable. Check the employer site and record this manually.',409);
  const pdf=Uint8Array.from(atob(data.claimedPdf),c=>c.charCodeAt(0));await saveApplicationRecord(userId,{action:'confirm',jobId:data.jobId,kitId:kit.id,role:data.role,confirmation:'SUBMITTED',appliedAt:now()},lease,{kit,pdf,sha256:data.pdfSha256});
  await db().prepare("INSERT INTO application_events(id,user_id,job_key,kind,data,created_at) VALUES(?,?,?,'companion-confirmation',?,?)").bind(crypto.randomUUID(),userId,row.job_key,JSON.stringify({url:value.url,text:value.confirmation,source:'candidate-browser-observation',pdfSha256:data.pdfSha256}),now()).run();
  await saveQueue(row,data,'submitted','The candidate browser observed an employer confirmation. The exact prepared résumé was saved to Applications.');return {ok:true};
 }
 await saveQueue(row,data,value.action==='needs-review'?'needs_review':value.action,value.note||'Check the application manually before continuing.');return {ok:true};
}
export async function withCompanionLease<T>(userId:string,action:(lease:Lease)=>Promise<T>){const lease=await acquireLease('byok_mutation:'+userId,90000);if(!lease)throw new PublicError('Another workspace change is running.',409);try{return await action(lease);}finally{await releaseLease(lease);}}
