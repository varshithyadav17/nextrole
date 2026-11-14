import {db,one,rows,batch} from './store';
import {sourceFingerprint} from './source-registry';
import {companyPage,companyDetail,companyRecordId,normalizeCompany,type CompanyCursor} from './company-feeds';
import {recordSourceObservation} from './source-metrics';
import {withJobChanges} from './job-changes';
import type {Source,Job} from './types';
type State={version:1;identity:string;runId:string;startedAt:string;cursor:CompanyCursor;seen:string[];imported:string[];total:number|null;consistent:boolean;complete:boolean;duration:number};
/** Page checkpoints contain public requisition IDs only. User choices are never rewritten. */
export async function advanceCompanySource(source:Source,sweepAt:string){
 const started=Date.now(),now=new Date().toISOString(),signal=AbortSignal.timeout(source.provider==='microsoft'?33000:28000),key='company_snapshot_v1:'+source.id,identity=sourceFingerprint([source]);
 const stored=await one<{value:string}>('SELECT value FROM meta WHERE key=?',key);let state:State|undefined;try{state=stored?JSON.parse(stored.value):undefined;}catch{}
 const compatible=state?.identity===identity||source.provider==='microsoft'&&state?.identity===identity.replace(/:pcsx5$/,'');
 if(!state||state.version!==1||!compatible||state.complete&&state.runId!==sweepAt||Date.now()-Date.parse(state.startedAt)>(source.provider==='microsoft'&&!state.complete?7*86400000:6*3600000))state={version:1,identity,runId:sweepAt,startedAt:now,cursor:{offset:0},seen:[],imported:[],total:null,consistent:true,complete:false,duration:0};else state.identity=identity;
 if(state.complete)return{complete:true,imported:0,checked:state.imported.length,total:state.total||0};
 if(!Array.isArray(state.seen)||!Array.isArray(state.imported)||state.seen.length>10000||state.imported.length>10000)throw new Error('Invalid company feed checkpoint');state.runId=sweepAt;
 const page=await companyPage(source,state.cursor,signal);if(state.total!==null&&state.total!==page.total)state.consistent=false;state.total=page.total;
 const seen=new Set(state.seen),records:Record<string,any>[]=[];
 for(const raw of page.records){const id=companyRecordId(raw,source);if(seen.has(id)){state.consistent=false;continue;}seen.add(id);records.push(raw);}
 const jobs:Job[]=[],width=source.provider==='microsoft'?2:4;for(let start=0;start<records.length;start+=width){const part=await Promise.all(records.slice(start,start+width).map(async raw=>{const detail=await companyDetail(source,raw,signal);return normalizeCompany(detail,source,now);}));jobs.push(...part.filter((j):j is Job=>!!j));}
 const prior=jobs.length?await rows<{id:string;data:string;job_key:string;first_seen:string}>('SELECT id,data,job_key,first_seen FROM jobs WHERE id IN ('+jobs.map(()=>'?').join(',')+')',...jobs.map(j=>j.id)):[],previous=new Map(prior.map(r=>[r.id,r]));let newlyObserved=0;
 for(const job of jobs){const old=previous.get(job.id);if(old){job.key=old.job_key;job.firstSeen=old.first_seen;Object.assign(job,withJobChanges(JSON.parse(old.data),job));}else newlyObserved++;}
 const writes:D1PreparedStatement[]=[];
 for(let start=0;start<jobs.length;start+=10){const part=jobs.slice(start,start+10);writes.push(db().prepare("INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,canonical_url,active) VALUES "+part.map(()=>'(?,?,?,?,?,?,?,?,1)').join(',')+" ON CONFLICT(id) DO UPDATE SET data=json_set(excluded.data,'$.deadline',COALESCE(json_extract(excluded.data,'$.deadline'),json_extract(jobs.data,'$.deadline'))),last_checked=excluded.last_checked,feed_checked_at=excluded.feed_checked_at,canonical_url=excluded.canonical_url,active=1").bind(...part.flatMap(job=>[job.id,job.key,source.id,JSON.stringify(job),job.firstSeen,job.lastChecked,state!.startedAt,job.canonicalUrl||null])));}
 state.seen=[...seen];state.imported=[...new Set([...state.imported,...jobs.map(j=>j.id)])];state.cursor={...page.cursor,offset:page.next??state.cursor.offset};state.complete=page.next===null;state.duration+=Date.now()-started;
 if(state.seen.length>10000||JSON.stringify(state).length>1400000)throw new Error('Company index checkpoint exceeds the storage budget');
 // Search/window sources do not prove closure by absence. A complete exact-country
 // snapshot can retire absent records only when totals and every row remained consistent.
 if(state.complete){if(page.completeSnapshot&&state.consistent&&state.seen.length===page.total&&state.imported.length===state.seen.length)writes.push(db().prepare("UPDATE jobs SET active=0,data=json_set(data,'$.change',json(?)) WHERE source_id=? AND active=1 AND feed_checked_at<>?").bind(JSON.stringify({at:now,fields:['availability'],previous:{},summary:'This opening no longer appears in the complete employer feed. Check the original listing.'}),source.id,state.startedAt));
  writes.push(db().prepare('INSERT INTO source_runs(id,checked_at,success,count,error) VALUES(?,?,1,?,NULL) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,success=1,count=excluded.count,error=NULL').bind(source.id,now,state.imported.length));}
 writes.push(db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(state)));await batch(writes);
 await recordSourceObservation(source,'success',Date.now()-started,{fetched:jobs.length,unique:new Set(jobs.map(j=>j.key)).size,newJobs:newlyObserved,incomplete:jobs.filter(j=>!j.evidenceComplete).length});
 return{complete:state.complete,imported:jobs.length,checked:state.seen.length,total:state.total};
}
