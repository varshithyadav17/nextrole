import {loadSources,sourceFingerprint} from './source-registry';
import { batch,db,one,rows } from './store';
import {fetchSourceJobs,normalizeGreenhouse,normalizeLever,SourceFetchError} from './job-feeds';
export {normalizeGreenhouse,normalizeLever,normalizeAshby} from './job-feeds';
import type {Job,Source} from './types';
import {boundedJSON} from './http-json';
import {acquireLease,releaseLease} from './lease';
import {createPersonalAlerts,processAlertBatch} from './alerts';
import {PublicError} from './errors';
import {recordSourceObservation,pruneDiscoveryData} from './source-metrics';
import {advanceJobicy} from './jobicy-sync';
import {checkJobicyStatuses,JobicyError} from './jobicy';
import {withJobChanges} from './job-changes';
type SourceSweep={startedAt:string;cursor:number;imported:number;successful:number;failures:string[];complete:boolean;registry?:string};
type Retrieved={source:Source;jobs:Job[]|null;checkedAt:string;window?:Awaited<ReturnType<typeof advanceJobicy>>;skipReason?:string};
export async function syncJobs(force=false){
 const SOURCES=await loadSources(),SOURCE_REGISTRY=sourceFingerprint(SOURCES);
 const last=await one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync');
 const attempt=await one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync_attempt');
 const saved=await one<{value:string}>('SELECT value FROM meta WHERE key=?','source_sweep');let run:SourceSweep|undefined;try{run=saved?JSON.parse(saved.value):undefined;}catch{}
 if(!force&&run?.complete&&run.registry===SOURCE_REGISTRY&&attempt&&Date.now()-Date.parse(attempt.value)<5*60000)return {cached:true,checkedAt:last?.value||null,sourcesPending:false,message:'The job sources were checked recently. Unavailable feeds will be retried at the next check.'};
 const lease=await acquireLease('sync_lock',60000);
 if(!lease)return {cached:true,checkedAt:last?.value||null,sourcesPending:true,message:'Another refresh is running. Your saved choices are safe.'};
 let imported=0,successful=0;const failures:string[]=[];
 try{
  // Re-read the checkpoint after acquiring the lease; another invocation may have advanced it.
  const current=await one<{value:string}>('SELECT value FROM meta WHERE key=?','source_sweep');try{run=current?JSON.parse(current.value):undefined;}catch{run=undefined;}
  const recent=await one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync_attempt');
  if(!force&&run?.complete&&run.registry===SOURCE_REGISTRY&&recent&&Date.now()-Date.parse(recent.value)<5*60000)return {cached:true,checkedAt:last?.value||null,sourcesPending:false,message:'The job sources were checked recently. Unavailable feeds will be retried at the next check.'};
  if(force||!run||run.complete){run={startedAt:new Date().toISOString(),cursor:0,imported:0,successful:0,failures:[],complete:false,registry:SOURCE_REGISTRY};await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('last_sync_attempt',run.startedAt).run();}
  const now=run.startedAt,group=SOURCES.slice(run.cursor,run.cursor+(force?SOURCES.length:2));let pendingCursor:number|null=null;
  if(!force&&group[0]?.provider==='jobicy')group.splice(1);else if(!force&&group[1]?.provider==='jobicy')group.splice(1);
  // A public request processes at most two feeds. The owner worker resumes the rest.
  for(let offset=0;offset<group.length;offset+=2){
   const timings=new Map<string,number>();
   const part=group.slice(offset,offset+2),settled=await Promise.allSettled(part.map(async(source):Promise<Retrieved>=>{
    const started=Date.now();try{
    const retry=await one<{value:string}>('SELECT value FROM meta WHERE key=?','source_retry:'+source.id);
    if((!force||source.provider==='jobicy')&&retry&&Date.parse(retry.value)>Date.now())return {source,jobs:null,checkedAt:new Date().toISOString(),skipReason:'retry-after'};
    if(source.provider==='jobicy')return {source,jobs:null,checkedAt:new Date().toISOString(),window:await advanceJobicy(source)};
    const checkedAt=new Date().toISOString();return {source,jobs:await fetchSourceJobs(source,checkedAt),checkedAt};
    }finally{timings.set(source.id,Date.now()-started);}
   }));
   for(let i=0;i<settled.length;i++){
    const item=settled[i],source=part[i];
    const recordFailure=async(error:string)=>{failures.push(source.company+': '+error);await db().prepare('INSERT INTO source_runs(id,checked_at,success,count,error) VALUES(?,?,0,0,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,success=0,error=excluded.error').bind(source.id,new Date().toISOString(),error).run();};
    if(item.status==='rejected'){if(item.reason instanceof SourceFetchError&&[429,503].includes(item.reason.status))await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('source_retry:'+source.id,new Date(Date.now()+item.reason.retryAfterMs).toISOString()).run();await recordFailure(item.reason instanceof JobicyError?item.reason.message+' Retry after '+item.reason.retryAt:'The feed was unavailable, incomplete or larger than the safe response limit. Previous jobs were preserved.');await recordSourceObservation(source,'failed',timings.get(source.id)||0,{},item.reason instanceof SourceFetchError?'http-'+item.reason.status:'invalid-or-unavailable');continue;}
    if(item.value.window){imported+=item.value.window.imported;if(!item.value.window.complete){pendingCursor=run.cursor+offset+i;break;}successful++;continue;}
    const jobs=item.value.jobs;if(jobs===null){if(item.value.skipReason!=='source-poll-window')failures.push(source.company+': The source is cooling down after a temporary limit. Previous listings were preserved.');await recordSourceObservation(source,'cooldown',timings.get(source.id)||0,{},item.value.skipReason||'retry-after');continue;}
    await db().prepare('DELETE FROM meta WHERE key=?').bind('source_retry:'+source.id).run();
    const prior:{id:string;data:string;active:number}[]=[];
    prior.push(...await rows<(typeof prior)[number]>('SELECT id,data,active FROM jobs WHERE source_id=?',source.id));
    const previous=new Map(prior.map(r=>[r.id,JSON.parse(r.data) as Job&{detailCheckedAt?:string}]));
    const aliases=new Map<string,string>();
    const canonical=[...new Set(jobs.map(j=>j.canonicalUrl).filter((s):s is string=>!!s))];
    for(let start=0;start<canonical.length;start+=60){const urls=canonical.slice(start,start+60);const found=await rows<{canonical_url:string;job_key:string}>('SELECT canonical_url,job_key FROM jobs WHERE canonical_url IN ('+urls.map(()=>'?').join(',')+') ORDER BY first_seen,id',...urls);for(const row of found)if(!aliases.has(row.canonical_url))aliases.set(row.canonical_url,row.job_key);}
    for(const job of jobs){const old=previous.get(job.id);if(old){job.key=old.key;job.deadline=job.deadline||old.deadline;job.publishedAt=job.publishedAt||old.publishedAt;if(job.description===old.description&&job.title===old.title&&old.detailCheckedAt)(job as Job&{detailCheckedAt?:string}).detailCheckedAt=old.detailCheckedAt;}else if(job.canonicalUrl&&aliases.has(job.canonicalUrl)&&aliases.get(job.canonicalUrl)!.split(':')[0]===job.key.split(':')[0])job.key=aliases.get(job.canonicalUrl)!;if(job.canonicalUrl&&!aliases.has(job.canonicalUrl))aliases.set(job.canonicalUrl,job.key);Object.assign(job,withJobChanges(old,job));}
    const statements:D1PreparedStatement[]=[];
    for(let start=0;start<jobs.length;start+=10){const chunk=jobs.slice(start,start+10);statements.push(db().prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,canonical_url,active) VALUES '+chunk.map(()=>'(?,?,?,?,?,?,?,?,1)').join(',')+" ON CONFLICT(id) DO UPDATE SET job_key=excluded.job_key,data=json_set(excluded.data,'$.deadline',COALESCE(json_extract(excluded.data,'$.deadline'),json_extract(jobs.data,'$.deadline'))),last_checked=excluded.last_checked,feed_checked_at=excluded.feed_checked_at,canonical_url=excluded.canonical_url,active=1").bind(...chunk.flatMap(j=>[j.id,j.key,source.id,JSON.stringify(j),j.firstSeen,j.lastChecked,now,j.canonicalUrl||null])));}
    await batch(statements);
    await db().prepare("UPDATE jobs SET active=0,data=json_set(data,'$.change',json(?)) WHERE source_id=? AND active=1 AND feed_checked_at<>?").bind(JSON.stringify({at:item.value.checkedAt,fields:['availability'],previous:{},summary:'The employer removed this opening from its complete source feed. Review your saved plans.'}),source.id,now).run();
    await db().prepare('INSERT INTO source_runs(id,checked_at,success,count,error) VALUES(?,?,1,?,NULL) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,success=1,count=excluded.count,error=NULL').bind(source.id,item.value.checkedAt,jobs.length).run();
    const ids=new Set(jobs.map(job=>job.id));await recordSourceObservation(source,'success',timings.get(source.id)||0,{fetched:jobs.length,unique:new Set(jobs.map(job=>job.key)).size,newJobs:jobs.filter(job=>!previous.has(job.id)).length,closed:source.provider==='jobicy'?0:prior.filter(job=>job.active&&!ids.has(job.id)).length,incomplete:jobs.filter(job=>job.evidenceComplete===false).length});
    imported+=jobs.length;successful++;

   }
   if(pendingCursor!==null)break;
  }
  run.cursor=pendingCursor??run.cursor+group.length;run.imported+=imported;run.successful+=successful;run.failures.push(...failures);run.complete=run.cursor>=SOURCES.length;run.registry=SOURCE_REGISTRY;
  const checkpoint=db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('source_sweep',JSON.stringify(run));
  if(run.complete){const writes=[checkpoint,db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('last_sync_attempt',new Date().toISOString()),db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('alerts_target',now)];if(run.successful)writes.push(db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('last_sync',now));await db().batch(writes);await pruneDiscoveryData();}else await checkpoint.run();
  return {cached:false,checkedAt:run.complete&&run.successful?now:last?.value||null,imported,sources:successful,totalSources:SOURCES.length,sourceProgress:{checked:run.cursor,total:SOURCES.length},sourcesPending:!run.complete,failures:run.failures,notifications:0};
 }finally{await releaseLease(lease);}
}
export async function refreshJob(jobId:string){
 const row=await one<{data:string;active:number}>('SELECT data,active FROM jobs WHERE id=?',jobId);
 if(!row)throw new PublicError('This opening could not be found.',404);
 const old=JSON.parse(row.data) as Job&{detailCheckedAt?:string};
 const source=(await loadSources()).find(s=>s.id===old.sourceId);if(!source)return {verified:false};
 if(source.provider==='jobicy'){
  if(old.availabilityCheckedAt&&Date.now()-Date.parse(old.availabilityCheckedAt)<3600000)return {verified:old.availability!=='unknown',cached:true,closed:!row.active,availability:old.availability};
  if((old as Job&{detailAttemptedAt?:string}).detailAttemptedAt&&Date.now()-Date.parse((old as Job&{detailAttemptedAt:string}).detailAttemptedAt)<3600000)return {verified:false,cached:true,availability:'unknown'};
 }else if(old.detailCheckedAt&&Date.now()-Date.parse(old.detailCheckedAt)<30*60000)return {verified:true,cached:true,closed:!row.active};
 const providerId=old.id.slice(old.sourceId.length+1);if(!/^[a-zA-Z0-9_-]{1,100}$/.test(providerId))return {verified:false};
 const lease=await acquireLease('job_verify:'+jobId,30000);if(!lease)return {verified:false,busy:true};
 try{
  await db().prepare("UPDATE jobs SET data=json_set(data,'$.detailAttemptedAt',?) WHERE id=?").bind(new Date().toISOString(),jobId).run();
  const now=new Date().toISOString();let latest:Job|null=null,closed=false;
  if(source.provider==='jobicy'){
   const status=(await checkJobicyStatuses([providerId])).get(providerId)!,availability=status==='active'?'open':status==='closed'?'closed':'unknown';
   await db().prepare("UPDATE jobs SET active=?,last_checked=?,data=json_set(data,'$.availability',?,'$.availabilityCheckedAt',?,'$.detailCheckedAt',?,'$.active',json(?),'$.lastChecked',?,'$.change',json(CASE WHEN active=1 AND ?='closed' THEN ? ELSE COALESCE(json_extract(data,'$.change'),'null') END)) WHERE id=?").bind(Number(status!=='closed'),now,availability,now,now,status==='closed'?'false':'true',now,status,JSON.stringify({at:now,fields:['availability'],previous:{},summary:'The source marked this opening closed. Your saved history is preserved.'}),jobId).run();
   return {verified:status!=='unknown',closed:status==='closed',availability};
  }else if(source.provider==='ashby'){
   const jobs=await fetchSourceJobs(source,now);latest=jobs.find(j=>j.id===old.id)||null;closed=!latest;
  }else{
   const url=source.provider==='greenhouse'?'https://boards-api.greenhouse.io/v1/boards/'+encodeURIComponent(source.token)+'/jobs/'+providerId:'https://api.lever.co/v0/postings/'+encodeURIComponent(source.token)+'/'+providerId+'?mode=json';
   const result=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{Accept:'application/json'}});
   if(result.status===404)closed=true;
   else{if(!result.ok)return {verified:false};const raw=await boundedJSON(result,512*1024) as Record<string,any>;latest=(source.provider==='greenhouse'?normalizeGreenhouse:normalizeLever)(raw,source,now);if(!latest||latest.id!==old.id)return {verified:false};}
  }
  if(closed){await db().prepare("UPDATE jobs SET active=0,data=json_set(data,'$.detailCheckedAt',?,'$.change',json(?)),last_checked=? WHERE id=?").bind(now,JSON.stringify({at:now,fields:['availability'],previous:{},summary:'The employer has closed this opening. Your saved history is preserved.'}),now,jobId).run();return {verified:true,closed:true};}
  if(!latest)return {verified:false};
  await db().prepare('UPDATE jobs SET data=?,canonical_url=?,last_checked=?,active=1 WHERE id=?').bind(JSON.stringify({...withJobChanges(old,latest),key:old.key,detailCheckedAt:now}),latest.canonicalUrl||null,now,jobId).run();
  return {verified:true,closed:false};
 }catch{return {verified:false};}finally{await releaseLease(lease);}
}
export async function createAlerts(onlyUserId?:string){return onlyUserId?createPersonalAlerts(onlyUserId):(await processAlertBatch()).notifications;}
export async function refreshSavedDetails(){
 const cutoff=new Date(Date.now()-30*60000).toISOString();
 const saved=await rows<{id:string}>("SELECT DISTINCT j.id FROM user_jobs u JOIN jobs j ON j.job_key=u.job_key WHERE u.status='interested' AND j.active=1 AND ((j.source_id='jobicy-worldwide' AND MAX(COALESCE(json_extract(j.data,'$.availabilityCheckedAt'),''),COALESCE(json_extract(j.data,'$.detailAttemptedAt'),''))<?) OR (j.source_id<>'jobicy-worldwide' AND COALESCE(json_extract(j.data,'$.detailAttemptedAt'),json_extract(j.data,'$.detailCheckedAt'),'')<?)) ORDER BY COALESCE(json_extract(j.data,'$.detailCheckedAt'),'') LIMIT 5",new Date(Date.now()-3600000).toISOString(),cutoff);
 const results=await Promise.allSettled(saved.slice(0,4).map(j=>refreshJob(j.id)));
 return {checked:Math.min(saved.length,4),pending:saved.length>4,failures:results.filter(r=>r.status==='rejected'||!r.value.verified).length};
}
