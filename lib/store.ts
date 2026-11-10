import { env } from 'cloudflare:workers';
import {loadSources} from './source-registry';
import { defaultProfile, type Job, type JobView, type Profile } from './types';
import { matchJob } from './matching';
import {withExperienceRequirements} from './experience';
import { getAIOverview } from './keyring';
export function db():D1Database {if(!env.DB)throw new Error('Database is not connected yet. Please try again shortly.');return env.DB;}
export async function rows<T>(sql:string,...args:unknown[]):Promise<T[]>{return (await db().prepare(sql).bind(...args).all<T>()).results;}
export async function one<T>(sql:string,...args:unknown[]):Promise<T|null>{return db().prepare(sql).bind(...args).first<T>();}
export async function batch(statements:D1PreparedStatement[]){for(let i=0;i<statements.length;i+=50)await db().batch(statements.slice(i,i+50));}
export async function getProfile(userId:string):Promise<Profile>{const r=await one<{data:string}>('SELECT data FROM profiles WHERE user_id=?',userId);return r?{...defaultProfile,...JSON.parse(r.data)}:{...defaultProfile};}
export async function getJobRecord(userId:string,id:string){
 if(id.startsWith('import-'))return one<{job_key:string;data:string;active:number}>("SELECT job_key,data,COALESCE(json_extract(data,'$.active'),1) as active FROM imported_jobs WHERE user_id=? AND id=?",userId,id);
 return one<{job_key:string;data:string;active:number}>('SELECT job_key,data,active FROM jobs WHERE id=?',id);
}
export async function getJobs(userId:string,profile:Profile):Promise<JobView[]>{
 const result=await rows<{data:string;legacy_description:string|null;first_seen:string;last_checked:string;active:number;status:string|null;stage:string|null;note:string|null;updated_at:string|null;remind_at:string|null}>(
  "SELECT json_remove(j.data,'$.description') as data,CASE WHEN (COALESCE(json_extract(j.data,'$.experienceRequirements.version'),0)<3 OR COALESCE(json_extract(j.data,'$.eligibility.version'),0)<2) THEN json_extract(j.data,'$.description') ELSE NULL END as legacy_description,j.first_seen,j.last_checked,j.active,u.status,u.stage,u.note,u.updated_at,u.remind_at FROM jobs j LEFT JOIN user_jobs u ON u.job_key=j.job_key AND u.user_id=? WHERE j.active=1 UNION ALL SELECT json_remove(j.data,'$.description') as data,CASE WHEN (COALESCE(json_extract(j.data,'$.experienceRequirements.version'),0)<3 OR COALESCE(json_extract(j.data,'$.eligibility.version'),0)<2) THEN json_extract(j.data,'$.description') ELSE NULL END as legacy_description,j.first_seen,j.last_checked,j.active,u.status,u.stage,u.note,u.updated_at,u.remind_at FROM user_jobs u JOIN jobs j ON j.job_key=u.job_key WHERE u.user_id=? AND j.active=0 AND (u.status IN ('interested','applied','dismissed') OR length(u.note)>0)",userId,userId);
 const personal=await rows<(typeof result)[number]>("SELECT json_remove(i.data,'$.description') as data,CASE WHEN COALESCE(json_extract(i.data,'$.eligibility.version'),0)<2 THEN json_extract(i.data,'$.description') ELSE NULL END as legacy_description,i.created_at as first_seen,COALESCE(json_extract(i.data,'$.lastChecked'),'') as last_checked,COALESCE(json_extract(i.data,'$.active'),1) as active,u.status,u.stage,u.note,u.updated_at,u.remind_at FROM imported_jobs i LEFT JOIN user_jobs u ON u.user_id=i.user_id AND u.job_key=i.job_key WHERE i.user_id=?",userId);
 result.push(...personal);
 const map=new Map<string,JobView>();
 for(const r of result){const job=withExperienceRequirements({...JSON.parse(r.data),description:r.legacy_description||'',...(r.legacy_description&&r.legacy_description.length>=35000?{evidenceComplete:false}:{}),firstSeen:r.first_seen,lastChecked:r.last_checked,active:!!r.active} as Job);const item={...job,description:'',match:matchJob(job,profile),status:r.status==='new'?null:r.status,stage:r.stage,note:r.note||'',statusAt:r.updated_at,remindAt:r.remind_at} as JobView;const old=map.get(job.key);if(!old||(job.active&&!old.active)||(job.active===old.active&&job.lastChecked>old.lastChecked))map.set(job.key,item);}
 return [...map.values()].sort((a,b)=>b.match.score-a.match.score||b.firstSeen.localeCompare(a.firstSeen));
}
export async function getJob(userId:string,id:string,profile:Profile):Promise<JobView|null>{
 if(id.startsWith('import-')){
  const row=await getJobRecord(userId,id);if(!row)return null;
  const state=await one<{status:string;stage:string|null;note:string;updated_at:string;remind_at:string|null}>('SELECT status,stage,note,updated_at,remind_at FROM user_jobs WHERE user_id=? AND job_key=?',userId,row.job_key);
  const job=withExperienceRequirements(JSON.parse(row.data) as Job);
  return {...job,match:matchJob(job,profile),status:state?.status==='new'?null:(state?.status as JobView['status'])||null,stage:state?.stage||null,note:state?.note||'',statusAt:state?.updated_at||null,remindAt:state?.remind_at||null};
 }
 const r=await one<{data:string;first_seen:string;last_checked:string;active:number;status:string|null;stage:string|null;note:string|null;updated_at:string|null;remind_at:string|null}>(
  'SELECT j.data,j.first_seen,j.last_checked,j.active,u.status,u.stage,u.note,u.updated_at,u.remind_at FROM jobs j LEFT JOIN user_jobs u ON u.job_key=j.job_key AND u.user_id=? WHERE j.id=?',userId,id);
 if(!r)return null;
 const job=withExperienceRequirements({...JSON.parse(r.data),...(!JSON.parse(r.data).evidenceVersion&&JSON.parse(r.data).description?.length>=35000?{evidenceComplete:false}:{}),firstSeen:r.first_seen,lastChecked:r.last_checked,active:!!r.active} as Job);
 return {...job,match:matchJob(job,profile),status:r.status==='new'?null:r.status,stage:r.stage,note:r.note||'',statusAt:r.updated_at,remindAt:r.remind_at} as JobView;
}
export async function getData(userId:string,name:string,includeJobs=true){
 const p=await getProfile(userId);if(!p.name)p.name=name.split(' ')[0];
 const SOURCES=await loadSources();
 const [jobs,runs,notifications,schedule,sync]=await Promise.all([
 includeJobs?getJobs(userId,p):Promise.resolve([]),rows<{id:string;checked_at:string;success:number;count:number;error:string|null}>('SELECT * FROM source_runs'),
 rows<{id:string;title:string;body:string;job_key:string|null;job_id:string|null;created_at:string;read_at:string|null;type:string}>("SELECT n.*,COALESCE((SELECT id FROM jobs WHERE job_key=n.job_key ORDER BY active DESC,last_checked DESC,id LIMIT 1),(SELECT id FROM imported_jobs WHERE user_id=n.user_id AND job_key=n.job_key LIMIT 1)) as job_id FROM notifications n WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 60",userId),
 one<{value:string}>('SELECT value FROM meta WHERE key=?','schedule'),one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync')]);
 const ai=await getAIOverview(userId);const first=ai.slots.find(s=>s.configured&&s.enabled);
 return {profile:p,jobs:jobs.map(j=>({...j,description:''})),sources:SOURCES.map(s=>({...s,run:runs.find(r=>r.id===s.id)||null})),notifications:notifications.map(n=>({id:n.id,title:n.title,body:n.body,jobKey:n.job_key,jobId:n.job_id,createdAt:n.created_at,readAt:n.read_at,type:n.type})),schedule:schedule?JSON.parse(schedule.value):null,lastSync:sync?.value||null,ai,aiEnabled:ai.storageReady&&!!first,aiProvider:first?.provider||null,pushPublicKey:env.VAPID_PUBLIC_KEY||null};
}
