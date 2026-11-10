import {db} from './store';
import {matchJob} from './matching';
import {withExperienceRequirements} from './experience';
import type {Job,JobView,Profile} from './types';

type MetadataRow={ref:number;data:string;legacy_description:string|null;first_seen:string;last_checked:string;active:number;status:string|null;stage:string|null;note:string|null;updated_at:string|null;remind_at:string|null};
export type ScannedJob={ref:number;job:JobView};
const columns="json_remove(j.data,'$.description') as data,CASE WHEN (COALESCE(json_extract(j.data,'$.experienceRequirements.version'),0)<3 OR COALESCE(json_extract(j.data,'$.eligibility.version'),0)<2) THEN json_extract(j.data,'$.description') ELSE NULL END as legacy_description,j.first_seen,j.last_checked,j.active,u.status,u.stage,u.note,u.updated_at,u.remind_at";
const visible="(j.active=1 OR u.status IN ('interested','applied','dismissed') OR length(u.note)>0)";
// Choose one stable representative before applying filters, as the old catalogue did.
const preferred="NOT EXISTS (SELECT 1 FROM jobs p WHERE p.job_key=j.job_key AND (p.active>j.active OR (p.active=j.active AND (p.last_checked>j.last_checked OR (p.last_checked=j.last_checked AND p.rowid<j.rowid)))))";
function view(row:MetadataRow,profile:Profile):ScannedJob{
 const job=withExperienceRequirements({...JSON.parse(row.data),description:row.legacy_description||'',...(row.legacy_description&&row.legacy_description.length>=35000?{evidenceComplete:false}:{}),firstSeen:row.first_seen,lastChecked:row.last_checked,active:!!row.active} as Job);
 return {ref:row.ref,job:{...job,description:'',match:matchJob(job,profile),status:row.status==='new'?null:row.status as JobView['status'],stage:row.stage,note:row.note||'',statusAt:row.updated_at,remindAt:row.remind_at}};
}
export async function* scanJobs(userId:string,profile:Profile,trackedOnly=false):AsyncGenerator<ScannedJob>{
 let after=0;
 for(;;){
  const result=await db().prepare('SELECT j.rowid as ref,'+columns+' FROM jobs j LEFT JOIN user_jobs u ON u.job_key=j.job_key AND u.user_id=? WHERE j.rowid>? AND '+(trackedOnly?"(u.status IN ('interested','applied','dismissed') OR length(u.note)>0)":visible)+' AND '+preferred+' ORDER BY j.rowid LIMIT 250').bind(userId,after).all<MetadataRow>();
  for(const row of result.results){after=row.ref;yield view(row,profile);}
  if(result.results.length<250)break;
 }
 const personal=await db().prepare("SELECT -j.rowid as ref,json_remove(j.data,'$.description') as data,CASE WHEN COALESCE(json_extract(j.data,'$.eligibility.version'),0)<2 THEN json_extract(j.data,'$.description') ELSE NULL END as legacy_description,j.created_at as first_seen,COALESCE(json_extract(j.data,'$.lastChecked'),'') as last_checked,COALESCE(json_extract(j.data,'$.active'),1) as active,u.status,u.stage,u.note,u.updated_at,u.remind_at FROM imported_jobs j LEFT JOIN user_jobs u ON u.user_id=j.user_id AND u.job_key=j.job_key WHERE j.user_id=?"+(trackedOnly?" AND (u.status IN ('interested','applied','dismissed') OR length(u.note)>0)":'')+' ORDER BY j.rowid').bind(userId).all<MetadataRow>();
 for(const row of personal.results)yield view(row,profile);
}
/** Indexed hydration fetches only the requested page. Private references remain user-scoped. */
export async function hydrateJobs(userId:string,profile:Profile,refs:number[]){
 const found=new Map<number,JobView>();
 for(let start=0;start<refs.length;start+=40){
  const part=refs.slice(start,start+40),shared=part.filter(n=>n>0),personal=part.filter(n=>n<0).map(n=>-n);
  if(shared.length){const rows=await db().prepare('SELECT j.rowid as ref,'+columns+' FROM jobs j LEFT JOIN user_jobs u ON u.job_key=j.job_key AND u.user_id=? WHERE j.rowid IN ('+shared.map(()=>'?').join(',')+')').bind(userId,...shared).all<MetadataRow>();for(const row of rows.results){const item=view(row,profile);found.set(item.ref,item.job);}}
  if(personal.length){const rows=await db().prepare("SELECT -j.rowid as ref,json_remove(j.data,'$.description') as data,CASE WHEN COALESCE(json_extract(j.data,'$.eligibility.version'),0)<2 THEN json_extract(j.data,'$.description') ELSE NULL END as legacy_description,j.created_at as first_seen,COALESCE(json_extract(j.data,'$.lastChecked'),'') as last_checked,COALESCE(json_extract(j.data,'$.active'),1) as active,u.status,u.stage,u.note,u.updated_at,u.remind_at FROM imported_jobs j LEFT JOIN user_jobs u ON u.user_id=j.user_id AND u.job_key=j.job_key WHERE j.user_id=? AND j.rowid IN ("+personal.map(()=>'?').join(',')+')').bind(userId,...personal).all<MetadataRow>();for(const row of rows.results){const item=view(row,profile);found.set(item.ref,item.job);}}
 }
 return refs.flatMap(ref=>found.has(ref)?[found.get(ref)!]:[]);
}
