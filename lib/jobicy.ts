import {boundedJSON} from './http-json';
import {normalizeJobicy,sourceFeedUrl} from './job-feeds';
import type {Job,Source} from './types';

export type JobicyStatus='active'|'closed'|'unknown';
export class JobicyError extends Error{
 retryAt:string;restartNextPass:boolean;
 constructor(message:string,retryAt:string,restartNextPass=false){super(message);this.retryAt=retryAt;this.restartNextPass=restartNextPass;}
}
async function read(url:string){
 const response=await fetch(url,{signal:AbortSignal.timeout(18000),redirect:'manual',headers:{Accept:'application/json'}});
 if(!response.ok){
  const retry=response.headers.get('Retry-After'),seconds=retry&&/^\d+$/.test(retry)?Number(retry)*1000:retry?Date.parse(retry)-Date.now():0;
  throw new JobicyError(response.status===429?'Jobicy rate limited this check. Saved listings were preserved.':'Jobicy did not return a complete public response. Saved listings were preserved.',new Date(Date.now()+Math.max(5*60000,Number.isFinite(seconds)?Math.min(seconds,86400000):0)).toISOString(),response.status===400);
 }
 return await boundedJSON(response,8*1024*1024) as Record<string,any>;
}
export async function fetchJobicyPage(source:Source,now:string,cursor:string|null=null):Promise<{jobs:Job[];nextCursor:string|null}>{
 if(source.provider!=='jobicy'||source.token!=='anywhere')throw new Error('Unsupported Jobicy scope.');
 const url=new URL(sourceFeedUrl(source));if(cursor)url.searchParams.set('cursor',cursor);
 const data=await read(url.toString());
 if(data.success!==true||data.statusCode!==200||!Array.isArray(data.jobs)||data.jobs.length>100||data.jobCount!==data.jobs.length||typeof data.hasMore!=='boolean'||!(data.nextCursor===null||typeof data.nextCursor==='string'&&data.nextCursor.length>0&&data.nextCursor.length<=16384)||data.hasMore!==(data.nextCursor!==null)||data.nextCursor!==null&&(!data.jobs.length||data.nextCursor===cursor))throw new Error('Incomplete Jobicy page.');
 const jobs:Job[]=[],seen=new Set<string>();let characters=0;
 for(const row of data.jobs){
  if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('Invalid Jobicy row.');
  const job=normalizeJobicy(row,source,now);
  if(!job||seen.has(job.id))throw new Error('Invalid or repeated Jobicy listing.');
  seen.add(job.id);jobs.push(job);characters+=job.description.length;
  if(characters>4*1024*1024)throw new Error('Jobicy page exceeds the safe memory limit.');
 }
 return {jobs,nextCursor:data.nextCursor};
}
export async function checkJobicyStatuses(ids:string[]):Promise<Map<string,JobicyStatus>>{
 if(!ids.length||ids.length>100||new Set(ids).size!==ids.length||ids.some(id=>!/^\d{1,16}$/.test(id)||!Number.isSafeInteger(Number(id))||Number(id)<=0))throw new Error('Invalid Jobicy status batch.');
 const url=new URL('https://jobicy.com/api/v2/remote-jobs/status');url.searchParams.set('ids',ids.join(','));
 const data=await read(url.toString());
 if(data.success!==true||data.statusCode!==200||data.count!==ids.length||!Array.isArray(data.jobs)||data.jobs.length!==ids.length)throw new Error('Incomplete Jobicy status response.');
 const expected=new Set(ids),result=new Map<string,JobicyStatus>();
 for(const row of data.jobs){
  const id=String(row?.id);
  if(!expected.has(id)||result.has(id)||!['active','closed','unknown'].includes(row?.status))throw new Error('Invalid Jobicy status response.');
  result.set(id,row.status);
 }
 return result;
}
