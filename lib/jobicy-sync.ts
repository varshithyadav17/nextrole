import {db,one,rows} from './store';
import {checkJobicyStatuses,fetchJobicyPage,JobicyError} from './jobicy';
import type {Job,Source} from './types';
import {recordSourceObservation} from './source-metrics';
import {withJobChanges} from './job-changes';

type State={version:1;startedAt:string;phase:'feed'|'status'|'complete';cursor:string|null;pages:number;seen:string[];imported:number;statusCursor:string;retryAt?:string;failure?:string;completedAt?:string};
const HOUR=3600000;
export async function advanceJobicy(source:Source){
 const began=Date.now();
 const key='jobicy_state:'+source.id,saved=await one<{value:string}>('SELECT value FROM meta WHERE key=?',key);
 let state:State|undefined;try{state=saved?JSON.parse(saved.value):undefined;}catch{}
 if(state&&(state.version!==1||!['feed','status','complete'].includes(state.phase)||!Array.isArray(state.seen)||!Number.isFinite(Date.parse(state.startedAt))))throw new Error('The saved Jobicy checkpoint needs owner review.');
 const persist=()=>db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(state)).run();
 if(state?.retryAt&&Date.parse(state.retryAt)>Date.now())throw new JobicyError('Jobicy is waiting for its retry window. Saved listings were preserved.',state.retryAt);
 if(state?.phase==='complete'&&Date.now()-Date.parse(state.startedAt)<HOUR){
  if(state.failure)throw new JobicyError(state.failure,new Date(Date.parse(state.startedAt)+HOUR).toISOString());
  await recordSourceObservation(source,'cooldown',Date.now()-began,{},'source-poll-window');
  return {complete:true,imported:0,cached:true};
 }
 if(!state||state.phase==='complete'){
  state={version:1,startedAt:new Date().toISOString(),phase:'feed',cursor:null,pages:0,seen:[],imported:0,statusCursor:''};
  // Persist before any upstream call: student refreshes share this hourly budget.
  await persist();
 }
 let imported=0;
 try{
  if(state.phase==='feed'){
   if(Date.now()-Date.parse(state.startedAt)>24*HOUR){state.phase='complete';throw new JobicyError('The Jobicy discovery cursor expired. Saved listings were preserved; a later pass can start a new traversal.',new Date().toISOString(),true);}
   if(state.pages>=10){state.phase='complete';throw new JobicyError('Jobicy exceeded the 1,000-listing traversal limit. Saved listings were preserved; coverage needs owner review.',new Date(Date.parse(state.startedAt)+HOUR).toISOString(),true);}
   const now=new Date().toISOString(),page=await fetchJobicyPage(source,now,state.cursor),seen=new Set(state.seen);
   if(page.jobs.some(j=>seen.has(j.id)))throw new Error('Jobicy repeated a listing across pages.');
   const statuses=page.jobs.length?await checkJobicyStatuses(page.jobs.map(j=>j.id.slice(source.id.length+1))):new Map();
   // Validate the entire page and its statuses before changing any stored rows.
   const previous:{id:string;data:string;first_seen:string}[]=[];
   for(let start=0;start<page.jobs.length;start+=60){const ids=page.jobs.slice(start,start+60).map(j=>j.id);previous.push(...await rows<{id:string;data:string;first_seen:string}>('SELECT id,data,first_seen FROM jobs WHERE source_id=? AND id IN ('+ids.map(()=>'?').join(',')+')',source.id,...ids));}
   const old=new Map(previous.map(r=>[r.id,r]));
   const statements:D1PreparedStatement[]=[];
   for(const job of page.jobs){
    const prior=old.get(job.id),data=prior?JSON.parse(prior.data) as Job:null,status=statuses.get(job.id.slice(source.id.length+1));
    job.key=data?.key||job.key;job.firstSeen=prior?.first_seen||now;job.deadline=job.deadline||data?.deadline||null;
    job.availability=status==='active'?'open':status==='closed'?'closed':'unknown';job.availabilityCheckedAt=now;job.active=status!=='closed';
    Object.assign(job,withJobChanges(data||undefined,job));
    statements.push(db().prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,canonical_url,active) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET job_key=excluded.job_key,data=excluded.data,last_checked=excluded.last_checked,feed_checked_at=excluded.feed_checked_at,canonical_url=excluded.canonical_url,active=excluded.active').bind(job.id,job.key,source.id,JSON.stringify(job),job.firstSeen,now,state.startedAt,job.canonicalUrl||null,Number(job.active)));
   }
   // At most 100 rows. D1 commits the page and continuation atomically.
   const next:State={...state,seen:[...state.seen,...page.jobs.map(j=>j.id)],pages:state.pages+1,imported:state.imported+page.jobs.length,cursor:page.nextCursor,phase:page.nextCursor?'feed':'status'};
   delete next.retryAt;delete next.failure;
   statements.push(db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(next)));
   await db().batch(statements);state=next;imported=page.jobs.length;
   await recordSourceObservation(source,'success',Date.now()-began,{fetched:page.jobs.length,unique:new Set(page.jobs.map(j=>j.key)).size,newJobs:page.jobs.filter(j=>!old.has(j.id)).length,closed:page.jobs.filter(j=>!j.active).length,incomplete:page.jobs.filter(j=>j.evidenceComplete===false).length});
   // An unfinished feed yields after one bounded page. No absent-row closure.
   if(state.phase==='feed')return {complete:false,imported,cached:false};
  }
  const older=await rows<{id:string}>("SELECT id FROM jobs WHERE source_id=? AND active=1 AND id>? AND COALESCE(json_extract(data,'$.availabilityCheckedAt'),'')<? ORDER BY id LIMIT 101",source.id,state.statusCursor,state.startedAt);
  const part=older.slice(0,100);
  if(part.length&&imported>0)return {complete:false,imported,cached:false};
  if(part.length){
   const statuses=await checkJobicyStatuses(part.map(j=>j.id.slice(source.id.length+1))),now=new Date().toISOString();
   const statements=part.map(j=>{const status=statuses.get(j.id.slice(source.id.length+1));return db().prepare("UPDATE jobs SET active=?,last_checked=?,data=json_set(data,'$.availability',?,'$.availabilityCheckedAt',?,'$.active',json(?),'$.lastChecked',?,'$.change',json(CASE WHEN active=1 AND ?='closed' THEN ? ELSE COALESCE(json_extract(data,'$.change'),'null') END)) WHERE id=?").bind(Number(status!=='closed'),now,status==='active'?'open':status==='closed'?'closed':'unknown',now,status==='closed'?'false':'true',now,status,JSON.stringify({at:now,fields:['availability'],previous:{},summary:'The source marked this opening closed. Your saved history is preserved.'}),j.id);});
   const next:State={...state,statusCursor:part.at(-1)!.id};delete next.retryAt;delete next.failure;
   statements.push(db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(next)));
   await db().batch(statements);state=next;
  }
  if(older.length>100)return {complete:false,imported,cached:false};
  state.phase='complete';state.completedAt=new Date().toISOString();delete state.retryAt;delete state.failure;
  const count=await one<{n:number}>("SELECT COUNT(*) as n FROM jobs WHERE source_id=? AND active=1 AND json_extract(data,'$.availability')='open'",source.id);
  await db().batch([
   db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(state)),
   db().prepare('INSERT INTO source_runs(id,checked_at,success,count,error) VALUES(?,?,1,?,NULL) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,success=1,count=excluded.count,error=NULL').bind(source.id,state.completedAt,count?.n||0)
  ]);
  return {complete:true,imported,cached:false};
 }catch(error){
  const safe=error instanceof JobicyError?error.message:'Jobicy returned an unavailable, invalid or incomplete response. Saved listings were preserved.';
  state.failure=safe;
  const earliest=state.phase==='feed'&&!state.cursor?Date.parse(state.startedAt)+HOUR:Date.now()+5*60000;
  state.retryAt=new Date(Math.max(earliest,error instanceof JobicyError?Date.parse(error.retryAt):0)).toISOString();
  if(error instanceof JobicyError&&error.restartNextPass)state.phase='complete';
  await persist();
  throw new JobicyError(safe,state.retryAt);
 }
}
