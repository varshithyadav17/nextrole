import {loadSources,sourceFingerprint} from './source-registry';
import { batch,db,one,rows } from './store';
import {fetchSourceJobs,normalizeGreenhouse,normalizeLever,normalizeExtended,SourceFetchError} from './job-feeds';
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
import {advanceSmartRecruiters} from './smartrecruiters-sync';
import {PAGED_COMPANY_PROVIDERS,verifyCompanyJob} from './company-feeds';
import {advanceCompanySource} from './company-sync';
type SourceSweep={startedAt:string;cursor:number;imported:number;successful:number;failures:string[];complete:boolean;registry?:string;done?:string[];work?:Record<string,{company:string;checked:number;total:number}>};
type Retrieved={source:Source;jobs:Job[]|null;checkedAt:string;window?:{complete:boolean;imported:number;checked?:number;total?:number};skipReason?:string;retryAt?:string};
function registryParts(value:string|undefined){return new Map((value||'').split('|').filter(Boolean).map(part=>[part.split(':')[0],part.replace(/:+$/,'')]));}
export async function syncJobs(force=false,options:{owner?:boolean}={}){
 const SOURCES=await loadSources(),SOURCE_REGISTRY=sourceFingerprint(SOURCES),owner=options.owner===true;
 const last=await one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync');
 const attempt=await one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync_attempt');
 const saved=await one<{value:string}>('SELECT value FROM meta WHERE key=?','source_sweep');let run:SourceSweep|undefined;try{run=saved?JSON.parse(saved.value):undefined;}catch{}
 if(!force&&run?.complete&&run.registry===SOURCE_REGISTRY&&attempt&&Date.now()-Date.parse(attempt.value)<5*60000)return{cached:true,checkedAt:last?.value||null,sourcesPending:false,message:'The job sources were checked recently.'};
 const lease=await acquireLease('sync_lock',owner?90000:60000);if(!lease)return{cached:true,checkedAt:last?.value||null,sourcesPending:true,message:'Another refresh is running. Your saved choices are safe.'};
 let imported=0,successful=0;const started=Date.now(),failures:string[]=[],deferred:string[]=[];
 try{
  const current=await one<{value:string}>('SELECT value FROM meta WHERE key=?','source_sweep');try{run=current?JSON.parse(current.value):undefined;}catch{run=undefined;}
  const recent=await one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync_attempt');
  if(!force&&run?.complete&&run.registry===SOURCE_REGISTRY&&recent&&Date.now()-Date.parse(recent.value)<5*60000)return{cached:true,checkedAt:last?.value||null,sourcesPending:false,message:'The job sources were checked recently.'};
  if(force||!run||run.complete){
   const retained:string[]=[];
   if(!force&&run?.complete&&run.registry!==SOURCE_REGISTRY){const old=registryParts(run.registry),now=registryParts(SOURCE_REGISTRY),health=await rows<{id:string;checked_at:string;success:number}>('SELECT id,checked_at,success FROM source_runs');for(const source of SOURCES){const row=health.find(r=>r.id===source.id);if(old.get(source.id)===now.get(source.id)&&row?.success&&Date.now()-Date.parse(row.checked_at)<6*3600000)retained.push(source.id);}}
   run={startedAt:new Date().toISOString(),cursor:retained.length,done:retained,work:{},imported:0,successful:retained.length,failures:[],complete:false,registry:SOURCE_REGISTRY};
   await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('last_sync_attempt',run.startedAt).run();
  }
  const done=new Set(run.done||SOURCES.slice(0,run.cursor).map(s=>s.id)),work=run.work||{};
  if(run.registry&&run.registry!==SOURCE_REGISTRY){const old=registryParts(run.registry),next=registryParts(SOURCE_REGISTRY);for(const source of SOURCES)if(old.get(source.id)!==next.get(source.id)){if(done.delete(source.id)){const health=await one<{success:number}>('SELECT success FROM source_runs WHERE id=?',source.id);if(health?.success)run.successful=Math.max(0,run.successful-1);}delete work[source.id];}}
  const pending=SOURCES.filter(s=>!done.has(s.id)),group=pending.slice(0,force?SOURCES.length:owner?8:2);
  // An older saved prefix is migrated in place. Appended companies do not restart it.
  if(!force&&!owner){if(group[0]?.provider==='jobicy')group.splice(1);else if(group[1]?.provider==='jobicy')group.splice(1);}
  for(let offset=0;offset<group.length;offset+=2){
   if(!force&&offset&&Date.now()-started>(owner?35000:25000))break;
   const timings=new Map<string,number>(),part=group.slice(offset,offset+2);
   const settled=await Promise.allSettled(part.map(async(source):Promise<Retrieved>=>{const t=Date.now();try{
    const retry=await one<{value:string}>('SELECT value FROM meta WHERE key=?','source_retry:'+source.id);if((!force||source.provider==='jobicy')&&retry&&Date.parse(retry.value)>Date.now())return{source,jobs:null,checkedAt:new Date().toISOString(),skipReason:'retry-after',retryAt:retry.value};
    if(source.provider==='jobicy')return{source,jobs:null,checkedAt:new Date().toISOString(),window:await advanceJobicy(source)};
    if(source.provider==='smartrecruiters')return{source,jobs:null,checkedAt:new Date().toISOString(),window:await advanceSmartRecruiters(source,run!.startedAt)};
    if(PAGED_COMPANY_PROVIDERS.includes(source.provider as any))return{source,jobs:null,checkedAt:new Date().toISOString(),window:await advanceCompanySource(source,run!.startedAt)};
    const checkedAt=new Date().toISOString();return{source,jobs:await fetchSourceJobs(source,checkedAt),checkedAt};
   }finally{timings.set(source.id,Date.now()-t);}}));
   for(let i=0;i<settled.length;i++){const item=settled[i],source=part[i],duration=timings.get(source.id)||0;
    if(item.status==='rejected'){
     const transient=item.reason instanceof SourceFetchError&&[429,503].includes(item.reason.status)||['AbortError','TimeoutError'].includes(item.reason?.name);let resume=false;
     if(transient&&PAGED_COMPANY_PROVIDERS.includes(source.provider as any)){const saved=await one<{value:string}>('SELECT value FROM meta WHERE key=?','company_snapshot_v1:'+source.id);try{const state=saved?JSON.parse(saved.value):null;if(state&&!state.complete&&state.cursor?.offset>0){resume=true;work[source.id]={company:source.company,checked:state.seen?.length||0,total:state.total||0};}}catch{}}
     if(transient){const retryAt=new Date(Date.now()+(item.reason instanceof SourceFetchError?item.reason.retryAfterMs:60000)).toISOString();await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('source_retry:'+source.id,retryAt).run();if(resume)deferred.push(retryAt);}
     const error=item.reason instanceof JobicyError?item.reason.message+' Retry after '+item.reason.retryAt:item.reason instanceof SourceFetchError?'The public feed returned HTTP '+item.reason.status+'. Previous jobs were preserved.':transient?'The public feed timed out. Its saved checkpoint and previous jobs were preserved.':'The feed was unavailable or incomplete. Previous jobs were preserved.';failures.push(source.company+': '+error);if(!resume){done.add(source.id);delete work[source.id];}
     await db().prepare('INSERT INTO source_runs(id,checked_at,success,count,error) VALUES(?,?,0,0,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,success=0,error=excluded.error').bind(source.id,new Date().toISOString(),error).run();await recordSourceObservation(source,'failed',duration,{},item.reason instanceof SourceFetchError?'http-'+item.reason.status:'invalid-or-unavailable');continue;
    }
    if(item.value.window){const window=item.value.window;imported+=window.imported;await db().prepare('DELETE FROM meta WHERE key=?').bind('source_retry:'+source.id).run();if(window.complete){done.add(source.id);delete work[source.id];successful++;run.failures=run.failures.filter(f=>!f.startsWith(source.company+':'));}else work[source.id]={company:source.company,checked:window.checked||0,total:window.total||0};continue;}
    if(item.value.jobs===null){if(item.value.retryAt&&work[source.id])deferred.push(item.value.retryAt);else{done.add(source.id);delete work[source.id];if(item.value.skipReason!=='source-poll-window')failures.push(source.company+': The source is cooling down. Previous listings were preserved.');}await recordSourceObservation(source,'cooldown',duration,{},item.value.skipReason||'retry-after');continue;}
    await db().prepare('DELETE FROM meta WHERE key=?').bind('source_retry:'+source.id).run();await ingestCompleteSource(source,item.value.jobs,run.startedAt,item.value.checkedAt,duration);imported+=item.value.jobs.length;successful++;done.add(source.id);delete work[source.id];
   }
  }
  run.done=SOURCES.filter(s=>done.has(s.id)).map(s=>s.id);run.work=work;run.cursor=run.done.length;run.imported+=imported;run.successful+=successful;run.failures=[...new Set([...run.failures,...failures])];run.complete=run.cursor>=SOURCES.length;run.registry=SOURCE_REGISTRY;
  const checkpoint=db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('source_sweep',JSON.stringify(run));
  if(run.complete){const writes=[checkpoint,db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('last_sync_attempt',new Date().toISOString()),db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('alerts_target',run.startedAt)];if(run.successful)writes.push(db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('last_sync',run.startedAt));await db().batch(writes);await pruneDiscoveryData();}else await checkpoint.run();
  return{cached:false,checkedAt:run.complete&&run.successful?run.startedAt:last?.value||null,imported,sources:successful,totalSources:SOURCES.length,sourceProgress:{checked:run.cursor,total:SOURCES.length},sourceWork:Object.values(work),sourcesPending:!run.complete,failures:run.failures,nextSourceRetryAt:deferred.sort()[0]||null,notifications:0};
 }finally{await releaseLease(lease);}
}
async function ingestCompleteSource(source:Source,jobs:Job[],sweepAt:string,checkedAt:string,duration:number){
    const prior:{id:string;data:string;active:number}[]=[];
    prior.push(...await rows<(typeof prior)[number]>('SELECT id,data,active FROM jobs WHERE source_id=?',source.id));
    const previous=new Map(prior.map(r=>[r.id,JSON.parse(r.data) as Job&{detailCheckedAt?:string}]));
    const aliases=new Map<string,string>();
    const canonical=[...new Set(jobs.map(j=>j.canonicalUrl).filter((s):s is string=>!!s))];
    for(let start=0;start<canonical.length;start+=60){const urls=canonical.slice(start,start+60);const found=await rows<{canonical_url:string;job_key:string}>('SELECT canonical_url,job_key FROM jobs WHERE canonical_url IN ('+urls.map(()=>'?').join(',')+') ORDER BY first_seen,id',...urls);for(const row of found)if(!aliases.has(row.canonical_url))aliases.set(row.canonical_url,row.job_key);}
    for(const job of jobs){const old=previous.get(job.id);if(old){job.key=old.key;job.deadline=job.deadline||old.deadline;job.publishedAt=job.publishedAt||old.publishedAt;if(job.description===old.description&&job.title===old.title&&old.detailCheckedAt)(job as Job&{detailCheckedAt?:string}).detailCheckedAt=old.detailCheckedAt;}else if(job.canonicalUrl&&aliases.has(job.canonicalUrl)&&aliases.get(job.canonicalUrl)!.split(':')[0]===job.key.split(':')[0])job.key=aliases.get(job.canonicalUrl)!;if(job.canonicalUrl&&!aliases.has(job.canonicalUrl))aliases.set(job.canonicalUrl,job.key);Object.assign(job,withJobChanges(old,job));}
    const statements:D1PreparedStatement[]=[];
    for(let start=0;start<jobs.length;start+=10){const chunk=jobs.slice(start,start+10);statements.push(db().prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,canonical_url,active) VALUES '+chunk.map(()=>'(?,?,?,?,?,?,?,?,1)').join(',')+" ON CONFLICT(id) DO UPDATE SET job_key=excluded.job_key,data=json_set(excluded.data,'$.deadline',COALESCE(json_extract(excluded.data,'$.deadline'),json_extract(jobs.data,'$.deadline'))),last_checked=excluded.last_checked,feed_checked_at=excluded.feed_checked_at,canonical_url=excluded.canonical_url,active=1").bind(...chunk.flatMap(j=>[j.id,j.key,source.id,JSON.stringify(j),j.firstSeen,j.lastChecked,sweepAt,j.canonicalUrl||null])));}
    await batch(statements);
    if(source.provider!=='teamtailor'&&!source.country)await db().prepare("UPDATE jobs SET active=0,data=json_set(data,'$.change',json(?)) WHERE source_id=? AND active=1 AND feed_checked_at<>?").bind(JSON.stringify({at:checkedAt,fields:['availability'],previous:{},summary:'The employer removed this opening from its complete source feed. Review your saved plans.'}),source.id,sweepAt).run();
    await db().prepare('INSERT INTO source_runs(id,checked_at,success,count,error) VALUES(?,?,1,?,NULL) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,success=1,count=excluded.count,error=NULL').bind(source.id,checkedAt,jobs.length).run();
    const ids=new Set(jobs.map(job=>job.id));await recordSourceObservation(source,'success',duration,{fetched:jobs.length,unique:new Set(jobs.map(job=>job.key)).size,newJobs:jobs.filter(job=>!previous.has(job.id)).length,closed:source.country||['jobicy','teamtailor'].includes(source.provider)?0:prior.filter(job=>job.active&&!ids.has(job.id)).length,incomplete:jobs.filter(job=>job.evidenceComplete===false).length});

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
  }else if(PAGED_COMPANY_PROVIDERS.includes(source.provider as any)){
   try{latest=await verifyCompanyJob(source,old,now);}catch(error){if(error instanceof SourceFetchError&&error.status===404)closed=true;else return {verified:false};}
  }else if(source.provider==='smartrecruiters'){
   const result=await fetch('https://api.smartrecruiters.com/v1/companies/'+encodeURIComponent(source.token)+'/postings/'+providerId,{signal:AbortSignal.timeout(18000),redirect:'manual',headers:{Accept:'application/json'}});
   if(result.status===404)closed=true;
   else{if(!result.ok)return {verified:false};const raw=await boundedJSON(result,512*1024) as Record<string,any>;if(raw.visibility!=='PUBLIC'||String(raw.company?.identifier).toLowerCase()!==source.token.toLowerCase()||String(raw.id)!==providerId)return {verified:false};latest=normalizeExtended(raw,source,now);if(!latest)return {verified:false};}
  }else if(source.provider==='teamtailor')return {verified:false,availability:'unknown'};
  else if(source.provider!=='greenhouse'&&source.provider!=='lever'){
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
