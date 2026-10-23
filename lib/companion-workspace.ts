import {z} from 'zod';
import {db,one,rows,getJob,getProfile} from './store';
import {canonicalJobUrl} from './job-feeds';
import {isSafeJobUrl} from './matching';
import {importJob} from './import-jobs';
import {PublicError} from './errors';
import type {Job,JobView} from './types';
import {withExperienceRequirements} from './experience';
import {matchJob} from './matching';
import {matchesView} from './job-selection';

const urlSchema=z.string().url().max(2048).refine(isSafeJobUrl);
/** Read a bounded personal alert window, then recheck current eligibility and tracking.
 * Shared feeds are refreshed once centrally; a student's browser never crawls boards.
 */
export async function companionInbox(userId:string){
 const profile=await getProfile(userId),checkedAt=new Date().toISOString();
 const [sync,health]=await Promise.all([
  one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync'),
  one<{checked:number;failed:number}>('SELECT COUNT(*) as checked,COALESCE(SUM(success=0),0) as failed FROM source_runs')
 ]);
 const base={checkedAt,lastSync:sync?.value||null,sourceHealth:{checked:health?.checked||0,failed:health?.failed||0},requiresProfile:!profile.completed,alertsEnabled:profile.alerts,scope:'Recent personal match alerts from connected sources; no unrestricted LinkedIn, Unstop or Internshala feed.'};
 if(!profile.completed||!profile.alerts)return {...base,jobs:[],hasMore:false};
 // notifications_feed_idx bounds per-account work; representative jobs use jobs_representative_idx.
 const records=await rows<{data:string;legacy_description:string|null;first_seen:string;last_checked:string;notified_at:string}>(
  "SELECT json_remove(j.data,'$.description') as data,CASE WHEN (COALESCE(json_extract(j.data,'$.experienceRequirements.version'),0)<3 OR COALESCE(json_extract(j.data,'$.eligibility.version'),0)<2) THEN json_extract(j.data,'$.description') ELSE NULL END as legacy_description,j.first_seen,j.last_checked,n.created_at as notified_at FROM (SELECT job_key,created_at FROM notifications WHERE user_id=? AND type='match' AND created_at>=? ORDER BY created_at DESC LIMIT 61) n JOIN jobs j ON j.id=(SELECT id FROM jobs WHERE job_key=n.job_key AND active=1 ORDER BY last_checked DESC,id DESC LIMIT 1) LEFT JOIN user_jobs u ON u.user_id=? AND u.job_key=n.job_key WHERE u.status IS NULL OR u.status='new' ORDER BY n.created_at DESC LIMIT 61",
  userId,new Date(Date.now()-30*86400000).toISOString(),userId);
 const seen=new Set<string>(),jobs=[];
 for(const record of records.slice(0,60)){
  const job=withExperienceRequirements({...JSON.parse(record.data),description:record.legacy_description||'',...(record.legacy_description&&record.legacy_description.length>=35000?{evidenceComplete:false}:{}),firstSeen:record.first_seen,lastChecked:record.last_checked,active:true} as Job);
  if(seen.has(job.key)||!isSafeJobUrl(job.url))continue;seen.add(job.key);
  const match=matchJob(job,profile);if(!matchesView(match))continue;
  jobs.push({...companionJobSummary({...job,match,status:null,statusAt:null,stage:null,note:'',remindAt:null}),key:job.key,mode:job.mode,jobType:job.jobType,source:job.sourceLabel||job.company,notifiedAt:record.notified_at});
 }
 return {...base,jobs:jobs.slice(0,30),hasMore:records.length>60||jobs.length>30};
}
export function companionJobSummary(job:JobView){
 return {id:job.id,title:job.title,company:job.company,location:job.location,url:job.url,status:job.status,statusAt:job.statusAt,
  active:job.active,availability:job.provenance?.kind==='user-import'?'unknown':job.availability||'unknown',
  imported:job.provenance?.kind==='user-import',deadline:job.deadline,lastChecked:job.lastChecked,
  match:{relevant:job.match.relevant,uncertain:job.match.uncertain,reasons:job.match.reasons.slice(0,8),cautions:job.match.cautions.slice(0,8)}};
}
export async function companionLookup(userId:string,url:unknown){
 const canonical=canonicalJobUrl(urlSchema.parse(url));
 // Prefer an existing tracked record so a newly indexed duplicate cannot hide Applied.
 const tracked=await one<{id:string}>('SELECT j.id FROM jobs j JOIN user_jobs u ON u.job_key=j.job_key AND u.user_id=? WHERE j.canonical_url=? ORDER BY u.updated_at DESC LIMIT 1',userId,canonical);
 const personal=tracked?null:await one<{id:string}>("SELECT id FROM imported_jobs WHERE user_id=? AND COALESCE(json_extract(data,'$.canonicalUrl'),json_extract(data,'$.url'))=? LIMIT 1",userId,canonical);
 const shared=tracked||personal||await one<{id:string}>('SELECT id FROM jobs WHERE canonical_url=? ORDER BY active DESC,first_seen LIMIT 1',canonical);
 const job=shared?await getJob(userId,shared.id,await getProfile(userId)):null;
 return {job:job?companionJobSummary(job):null};
}
export async function companionImport(userId:string,body:unknown){
 const value=z.object({url:urlSchema,data:z.unknown(),confirmation:z.literal('REVIEWED_JOB')}).parse(body);
 const result=await importJob(userId,{kind:'text',url:value.url,data:value.data});
 const job=await getJob(userId,result.jobId,await getProfile(userId));
 return {...result,job:job?companionJobSummary(job):null};
}
export async function companionSetStatus(userId:string,body:unknown){
 const value=z.object({jobId:z.string().min(1).max(200),status:z.enum(['interested','applied','dismissed']),expectedStatus:z.enum(['interested','applied','dismissed']).nullable(),expectedStatusAt:z.string().nullable(),confirmation:z.string().optional()}).parse(body);
 const job=await getJob(userId,value.jobId,await getProfile(userId));
 if(!job)throw new PublicError('This opening is not in your workspace.',404);
 if(job.status!==value.expectedStatus||job.statusAt!==value.expectedStatusAt)throw new PublicError('Tracking changed in NextRole. Check this job again before saving.',409);
 if(job.status==='applied'&&value.status!=='applied')throw new PublicError('This job is already Applied. Review its history in NextRole before changing it.',409);
 if(value.status==='applied'&&value.confirmation!=='I_APPLIED')throw new PublicError('Confirm that you submitted on the employer website. Opening or filling a form is not Applied.');
 if(job.status===value.status)return {job:companionJobSummary(job),unchanged:true};
 const at=new Date().toISOString();
 // Preserve notes, existing stages and every application record/event. No résumé is fabricated.
 await db().prepare('INSERT INTO user_jobs(user_id,job_key,job_id,status,stage,note,remind_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,job_key) DO UPDATE SET job_id=excluded.job_id,status=excluded.status,stage=excluded.stage,remind_at=excluded.remind_at,updated_at=excluded.updated_at').bind(userId,job.key,job.id,value.status,value.status==='applied'?(job.stage||'Applied'):null,job.note,value.status==='interested'?job.remindAt:null,at).run();
 if(value.status!=='interested')await db().prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND job_key=? AND read_at IS NULL').bind(at,userId,job.key).run();
 const updated=await getJob(userId,job.id,await getProfile(userId));
 return {job:companionJobSummary(updated!)};
}
