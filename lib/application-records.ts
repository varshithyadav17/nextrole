import {z} from 'zod';
import {db,one,rows,getJob,getProfile} from './store';
import {getKit,type ApplicationKit} from './preparation';
import {resumePDF} from './resume-pdf';
import {PublicError} from './errors';
import type {Lease} from './lease';
import {type ApplicationRecord} from './application-types';
export {MILESTONES,type Milestone,type ApplicationRecord} from './application-types';
export async function applicationRecord(userId:string,key:string){
 const row=await one<{data:string}>('SELECT data FROM application_records WHERE user_id=? AND job_key=?',userId,key);return row?JSON.parse(row.data) as ApplicationRecord:null;
}
export function publicRecord(record:ApplicationRecord|null){if(!record)return null;const {submitted,...rest}=record;return {...rest,submitted:submitted?{kitId:submitted.kit.id,revision:submitted.kit.revision,createdAt:submitted.kit.createdAt,sha256:submitted.sha256}:null};}
const instant=z.string().datetime().refine(s=>Date.parse(s)<=Date.now()+60000,'Use the actual completed date.');
export const recordInput=z.discriminatedUnion('action',[
 z.object({action:z.literal('confirm'),jobId:z.string().max(200),confirmation:z.literal('SUBMITTED'),kitId:z.string().regex(/^kit-[a-f0-9-]{36}$/).nullable(),role:z.string().trim().min(1).max(100),appliedAt:instant.nullable()}),
 z.object({action:z.literal('correct'),jobId:z.string().max(200),expectedRevision:z.string().uuid(),role:z.string().trim().min(1).max(100),appliedAt:instant.nullable()}),
 z.object({action:z.literal('milestone'),jobId:z.string().max(200),expectedRevision:z.string().uuid(),milestone:z.enum(['response','oa','interview']),done:z.boolean(),doneAt:instant.nullable(),dueAt:z.string().datetime().nullable()}),
]);
export async function saveApplicationRecord(userId:string,input:unknown,lease:Lease,claimed?:{kit:ApplicationKit;pdf:Uint8Array;sha256:string}){
 const value=recordInput.parse(input),job=await getJob(userId,value.jobId,await getProfile(userId));if(!job)throw new PublicError('Opening not found.',404);
 const current=await applicationRecord(userId,job.key),now=new Date().toISOString();let record:ApplicationRecord;
 if(value.action==='confirm'){
  if(current)throw new PublicError('This application already has a submission record. Its original résumé is preserved.',409);
  const kit=claimed?.kit||(value.kitId?await getKit(userId,value.kitId):null);
  if(value.kitId&&(!kit||kit.id!==value.kitId||kit.jobKey!==job.key))throw new PublicError('Select your preparation for this exact job.',400);
  if(kit&&value.appliedAt&&Date.parse(kit.updatedAt)>Date.parse(value.appliedAt)+60000)throw new PublicError('The selected preparation was changed after the recorded application date. Confirm which file you used.');
  let submitted:ApplicationRecord['submitted']=null;
  if(kit){
   const bytes=claimed?.pdf||await resumePDF(kit.resume,kit.createdAt),sha=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes));
   const pdfHash=Array.from(new Uint8Array(sha),b=>b.toString(16).padStart(2,'0')).join('');
   if(claimed&&claimed.sha256!==pdfHash)throw new PublicError('The claimed résumé bytes do not match the submission packet.',409);
   const {id,revision,resume,questions,createdAt,profileRevision}=kit;
   submitted={kit:{id,revision,resume,questions,createdAt,profileRevision},pdf:btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')),sha256:pdfHash};
  }
  const listing=kit?.jobSnapshot||job;
  const fitAtConfirmation={relevant:job.match.relevant,uncertain:job.match.uncertain,checkedAt:now};
  record={revision:crypto.randomUUID(),jobId:job.id,jobKey:job.key,company:job.company,title:job.title,role:value.role,fitAtConfirmation,appliedAt:value.appliedAt,listingSnapshot:{title:listing.title,company:listing.company,url:listing.url,description:listing.description,lastChecked:listing.lastChecked,capturedAt:kit?.createdAt||now},milestones:{response:{doneAt:null,dueAt:null},oa:{doneAt:null,dueAt:null},interview:{doneAt:null,dueAt:null}},submitted,updatedAt:now};
  const written=await db().batch([
   db().prepare('INSERT INTO application_records(user_id,job_key,job_id,data,revision,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?)').bind(userId,job.key,job.id,JSON.stringify(record),record.revision,now,lease.key,lease.value),
   db().prepare("INSERT INTO user_jobs(user_id,job_key,job_id,status,stage,note,updated_at) SELECT ?,?,?,'applied','Applied','',? WHERE EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?) ON CONFLICT(user_id,job_key) DO UPDATE SET status='applied',stage=CASE WHEN user_jobs.status='applied' THEN user_jobs.stage ELSE 'Applied' END,updated_at=excluded.updated_at").bind(userId,job.key,job.id,now,lease.key,lease.value),
   db().prepare('INSERT INTO application_events(id,user_id,job_key,kind,data,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?)').bind(crypto.randomUUID(),userId,job.key,'submission-confirmed',JSON.stringify({appliedAt:value.appliedAt,kitId:kit?.id||null,confirmation:'user-confirmed'}),now,lease.key,lease.value),
  ]);
  if(!written[0].meta.changes)throw new PublicError('Your workspace changed. Reload before recording this application.',409);
 }else if(value.action==='correct'){
  if(!current)throw new PublicError('Save the submission record first.');
  if(current.revision!==value.expectedRevision)throw new PublicError('This record changed. Reload before correcting it.',409);
  record={...current,role:value.role,appliedAt:value.appliedAt,revision:crypto.randomUUID(),updatedAt:now};
  const written=await db().batch([
   db().prepare('UPDATE application_records SET data=?,revision=?,updated_at=? WHERE user_id=? AND job_key=? AND revision=? AND EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?)').bind(JSON.stringify(record),record.revision,now,userId,job.key,value.expectedRevision,lease.key,lease.value),
   db().prepare("INSERT INTO application_events(id,user_id,job_key,kind,data,created_at) SELECT ?,?,?,'correction',?,? WHERE EXISTS(SELECT 1 FROM application_records WHERE user_id=? AND job_key=? AND revision=?)").bind(crypto.randomUUID(),userId,job.key,JSON.stringify({before:{role:current.role,appliedAt:current.appliedAt},after:{role:value.role,appliedAt:value.appliedAt}}),now,userId,job.key,record.revision),
  ]);
  if(!written[0].meta.changes)throw new PublicError('The record changed or was deleted. Reload it.',409);
 }else{
  if(job.status!=='applied'||!current)throw new PublicError('Confirm the application and save its submission record first.');
  if(current.revision!==value.expectedRevision)throw new PublicError('This application changed in another tab. Reload its timeline.',409);
  if(value.done&&!value.doneAt)throw new PublicError('Choose the actual completion date.');
  if(value.doneAt&&current.appliedAt&&Date.parse(value.doneAt)<Date.parse(current.appliedAt))throw new PublicError('A milestone cannot precede the recorded application date.');
  const eventCount=await one<{n:number}>('SELECT COUNT(*) as n FROM application_events WHERE user_id=? AND job_key=?',userId,job.key);
  if((eventCount?.n||0)>=200)throw new PublicError('This application reached its 200-event history limit. Your recorded progress is retained.');
  record={...current,revision:crypto.randomUUID(),updatedAt:now,milestones:{...current.milestones,[value.milestone]:{doneAt:value.done?value.doneAt:null,dueAt:value.dueAt}}};
  const written=await db().batch([
   db().prepare('UPDATE application_records SET data=?,revision=?,updated_at=? WHERE user_id=? AND job_key=? AND revision=? AND EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?)').bind(JSON.stringify(record),record.revision,now,userId,job.key,value.expectedRevision,lease.key,lease.value),
   db().prepare('INSERT INTO application_events(id,user_id,job_key,kind,data,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM application_records WHERE user_id=? AND job_key=? AND revision=?)').bind(crypto.randomUUID(),userId,job.key,value.milestone,JSON.stringify(record.milestones[value.milestone]),now,userId,job.key,record.revision),
  ]);
  if(!written[0].meta.changes)throw new PublicError('Your application changed. Reload the timeline.',409);
 }
 return publicRecord(record);
}
export async function applicationEvents(userId:string,key:string){return rows<{kind:string;data:string;created_at:string}>('SELECT kind,data,created_at FROM application_events WHERE user_id=? AND job_key=? ORDER BY created_at DESC,id DESC LIMIT 200',userId,key);}
export async function applicationAnalytics(userId:string){
 const data=await rows<{stage:string|null;title:string;company:string;url:string;role:string|null;appliedAt:string|null;response:string|null;oa:string|null;interview:string|null}>("SELECT u.stage,COALESCE(json_extract(a.data,'$.title'),json_extract(j.data,'$.title'),json_extract(i.data,'$.title'),'Unknown role') as title,COALESCE(json_extract(a.data,'$.company'),json_extract(j.data,'$.company'),json_extract(i.data,'$.company'),'Unknown company') as company,COALESCE(json_extract(a.data,'$.listingSnapshot.url'),json_extract(j.data,'$.url'),json_extract(i.data,'$.url'),'') as url,json_extract(a.data,'$.role') as role,json_extract(a.data,'$.appliedAt') as appliedAt,json_extract(a.data,'$.milestones.response.doneAt') as response,json_extract(a.data,'$.milestones.oa.doneAt') as oa,json_extract(a.data,'$.milestones.interview.doneAt') as interview FROM user_jobs u LEFT JOIN application_records a ON a.user_id=u.user_id AND a.job_key=u.job_key LEFT JOIN jobs j ON j.id=u.job_id LEFT JOIN imported_jobs i ON i.user_id=u.user_id AND i.id=u.job_id WHERE u.user_id=? AND u.status='applied' ORDER BY u.updated_at DESC",userId);
 const total=data.length,roles:Record<string,number>=Object.create(null),months:Record<string,number>=Object.create(null);
 for(const row of data){roles[row.role||row.title]=(roles[row.role||row.title]||0)+1;const month=row.appliedAt?row.appliedAt.slice(0,7):'Date not recorded';months[month]=(months[month]||0)+1;}
 const counts={applied:total,response:data.filter(r=>!!r.response).length,oa:data.filter(r=>!!r.oa).length,interview:data.filter(r=>!!r.interview).length,offers:data.filter(r=>r.stage==='Offer').length,rejected:data.filter(r=>r.stage==='Rejected').length,withdrawn:data.filter(r=>r.stage==='Withdrawn').length};
 return {counts,roles,months,applications:data,notice:'Counts reflect your current applied tracker and explicitly recorded completed milestones. An unanswered application is not a rejection. Earlier quick-marked applications may have no submission date or milestone record. These observations do not establish that a résumé caused an outcome.'};
}
