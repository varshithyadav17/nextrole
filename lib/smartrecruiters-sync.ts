import {db,one,rows,batch} from './store';
import {boundedJSON} from './http-json';
import {normalizeExtended,SourceFetchError,sourceFeedUrl} from './job-feeds';
import {recordSourceObservation} from './source-metrics';
import {withJobChanges} from './job-changes';
import type {Source,Job} from './types';
type Snapshot={version:1;token:string;startedAt:string;ids:string[];cursor:number;complete:boolean;fetched?:number;newJobs?:number;incomplete?:number;duration?:number};
async function json(url:string,signal:AbortSignal){const r=await fetch(url,{signal,redirect:'manual',headers:{Accept:'application/json'}});if(!r.ok){const value=r.headers.get('retry-after'),seconds=Number(value);await r.body?.cancel();throw new SourceFetchError(r.status,Math.min(86400000,Math.max(60000,value?(Number.isFinite(seconds)?seconds*1000:Date.parse(value)-Date.now()):60000)));}return boundedJSON(r,2*1024*1024) as Promise<Record<string,any>>;}
export async function smartRecruitersIndex(source:Source,signal:AbortSignal){
 const ids:string[]=[];let total:number|undefined;
 for(let offset=0;offset<=1000;offset+=100){const u=new URL(sourceFeedUrl(source));u.searchParams.set('offset',String(offset));const page=await json(u.toString(),signal);
  if(!Array.isArray(page.content)||!Number.isSafeInteger(page.totalFound)||page.totalFound<0||page.totalFound>1000||page.content.length>100||total!==undefined&&page.totalFound!==total||page.offset!==undefined&&page.offset!==offset)throw new Error('Incomplete public posting index');total=Number(page.totalFound);
  for(const row of page.content){if(!row||!/^[a-zA-Z0-9_-]{1,100}$/.test(String(row.id))||row.visibility!=='PUBLIC'||String(row.company?.identifier).toLowerCase()!==source.token.toLowerCase()||row.location?.country?.toLowerCase()!=='in')throw new Error('Invalid India employer posting');ids.push(String(row.id));}
  if(new Set(ids).size!==ids.length||ids.length>total)throw new Error('Repeated posting index');if(ids.length===total)return ids;if(!page.content.length)throw new Error('Truncated posting index');
 }throw new Error('Posting index exceeds the source budget');
}
/** Resumable complete-snapshot ingestion. Only complete, revalidated membership permits closures. */
export async function advanceSmartRecruiters(source:Source,sweepAt:string){
 const started=Date.now(),signal=AbortSignal.timeout(18000),key='smartrecruiters_snapshot:'+source.id;
 const row=await one<{value:string}>('SELECT value FROM meta WHERE key=?',key);let state:Snapshot|undefined;try{state=row?JSON.parse(row.value):undefined;}catch{}
 if(!state||state.token!==source.token||state.complete&&state.startedAt!==sweepAt||Date.now()-Date.parse(state.startedAt)>6*3600000)state={version:1,token:source.token,startedAt:sweepAt,ids:await smartRecruitersIndex(source,signal),cursor:0,complete:false};
 if(state.complete)return{complete:true,imported:0};
 if(state.version!==1||!Array.isArray(state.ids)||state.ids.length>1000||!Number.isInteger(state.cursor)||state.cursor<0||state.cursor>state.ids.length)throw new Error('Invalid posting checkpoint');
 const ids=state.ids.slice(state.cursor,state.cursor+24),jobs:Job[]=[];
 for(let start=0;start<ids.length;start+=4){const group=await Promise.all(ids.slice(start,start+4).map(async id=>{const raw=await json('https://api.smartrecruiters.com/v1/companies/'+encodeURIComponent(source.token)+'/postings/'+encodeURIComponent(id),signal);
  if(String(raw.id)!==id||raw.visibility!=='PUBLIC'||String(raw.company?.identifier).toLowerCase()!==source.token.toLowerCase()||raw.location?.country?.toLowerCase()!=='in')throw new Error('Mismatched posting detail');
  const job=normalizeExtended(raw,source,new Date().toISOString());if(!job)throw new Error('Invalid employer posting');return job;
 }));jobs.push(...group);}
 const writes:D1PreparedStatement[]=[];let fresh=0,closed=0;
 for(const job of jobs){const old=await one<{data:string;job_key:string;first_seen:string}>('SELECT data,job_key,first_seen FROM jobs WHERE id=?',job.id);if(old){job.key=old.job_key;job.firstSeen=old.first_seen;Object.assign(job,withJobChanges(JSON.parse(old.data),job));}else fresh++;
  writes.push(db().prepare("INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,canonical_url,active) VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET data=json_set(excluded.data,'$.deadline',COALESCE(json_extract(excluded.data,'$.deadline'),json_extract(jobs.data,'$.deadline'))),last_checked=excluded.last_checked,feed_checked_at=excluded.feed_checked_at,canonical_url=excluded.canonical_url,active=1").bind(job.id,job.key,source.id,JSON.stringify(job),job.firstSeen,job.lastChecked,state.startedAt,job.canonicalUrl||null));
 }
 state.cursor+=jobs.length;state.fetched=(state.fetched||0)+jobs.length;state.newJobs=(state.newJobs||0)+fresh;state.incomplete=(state.incomplete||0)+jobs.filter(j=>!j.evidenceComplete).length;state.duration=(state.duration||0)+Date.now()-started;
 if(state.cursor===state.ids.length){const current=state.ids.length?await smartRecruitersIndex(source,signal):[];if(current.length!==state.ids.length||[...current].sort().join('|')!==[...state.ids].sort().join('|')){
   // The snapshot changed while collecting. Keep valid rows, but never infer closures from it.
   state.cursor=0;state.ids=current;state.startedAt=new Date().toISOString();await batch(writes);await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(state)).run();return{complete:false,imported:jobs.length,changed:true};
  }
  state.complete=true;const absent=await rows<{id:string}>('SELECT id FROM jobs WHERE source_id=? AND active=1 AND feed_checked_at<>?',source.id,state.startedAt);
  // Rows in this final batch are not committed yet, so exclude them from the closure count.
  closed=absent.filter(r=>!jobs.some(j=>j.id===r.id)).length;
  writes.push(db().prepare("UPDATE jobs SET active=0,data=json_set(data,'$.change',json(?)) WHERE source_id=? AND active=1 AND feed_checked_at<>?").bind(JSON.stringify({at:new Date().toISOString(),fields:['availability'],previous:{},summary:'The employer removed this opening from its complete public feed.'}),source.id,state.startedAt));
  writes.push(db().prepare('INSERT INTO source_runs(id,checked_at,success,count,error) VALUES(?,?,1,?,NULL) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,success=1,count=excluded.count,error=NULL').bind(source.id,new Date().toISOString(),state.ids.length));
 }
 writes.push(db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(state)));await batch(writes);
 if(state.complete)await recordSourceObservation(source,'success',state.duration||0,{fetched:state.fetched,unique:state.ids.length,newJobs:state.newJobs,closed,incomplete:state.incomplete});
 return{complete:state.complete,imported:jobs.length,checked:state.cursor,total:state.ids.length};
}
