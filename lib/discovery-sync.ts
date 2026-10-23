import {env} from 'cloudflare:workers';
import {db,one,rows} from './store';
import {acquireLease,releaseLease} from './lease';
import {DISCOVERY_SOURCE,DISCOVERY_STATE,discoverySettings,discoveryKeyReady,discoveryUsage,discoveryBudgetKeys} from './discovery-settings';
import {discoveryHash,fetchDiscoveryPage,DiscoveryFeedError} from './discovery-feed';
import type {Job} from './types';

type State={version:1;configHash:string;startedAt:string;phase:'pending'|'complete';queryIndex:number;pageIndex:number;cursor:string|null;seenTokens:string[];pages:number;imported:number;skipped:number;duplicates:number;truncatedQueries:number;inFlight?:boolean;retryAt?:string;failure?:string};
const stateRow=()=>one<{value:string}>('SELECT value FROM meta WHERE key=?',DISCOVERY_STATE);
async function readState(){const row=await stateRow();if(!row)return null;const state=JSON.parse(row.value) as State;if(state.version!==1||!['pending','complete'].includes(state.phase)||!Number.isFinite(Date.parse(state.startedAt))||!Array.isArray(state.seenTokens)||!Number.isInteger(state.queryIndex)||!Number.isInteger(state.pageIndex))throw new Error('Invalid discovery checkpoint');return state;}
const stateStatement=(state:State)=>db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(DISCOVERY_STATE,JSON.stringify(state));
const normalizeName=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export async function discoveryStatus(owner=false){
 const [settings,usage,state,counts]=await Promise.all([discoverySettings(),discoveryUsage(),readState(),one<{n:number}>("SELECT COUNT(*) as n FROM jobs WHERE source_id=? AND active=1",DISCOVERY_SOURCE)]);
 const nextAt=state?state.phase==='pending'?(state.retryAt||new Date().toISOString()):new Date(Math.max(Date.parse(state.startedAt)+settings.intervalHours*3600000,state.retryAt?Date.parse(state.retryAt):0)).toISOString():null;
 const limited=usage.today>=settings.dailyLimit||usage.month>=settings.monthlyLimit;
 const result={provider:'Google Jobs via SerpApi',enabled:settings.enabled,configured:discoveryKeyReady(),queries:settings.queries.length,records:counts?.n||0,lastStartedAt:state?.startedAt||null,complete:state?.phase==='complete',pending:!!(settings.enabled&&discoveryKeyReady()&&state?.phase==='pending'&&!limited&&(!state.retryAt||Date.parse(state.retryAt)<=Date.now())),failure:state?.failure||null,nextAt,notice:'Search-index discovery has incomplete coverage and unconfirmed availability. These listings require eligibility review and do not generate verified-match alerts.'};
 return owner?{...result,settings,usage,budgetExhausted:limited,progress:state?{query:state.queryIndex,total:settings.queries.length,pages:state.pages,imported:state.imported,skipped:state.skipped,duplicates:state.duplicates,truncatedQueries:state.truncatedQueries}:null}:result;
}
/** Owner-only callers process one page per invocation. Ordinary student refreshes never call this. */
export async function advanceDiscovery(){
 let settings=await discoverySettings();
 if(!settings.enabled||!discoveryKeyReady())return {enabled:settings.enabled,configured:discoveryKeyReady(),pending:false};
 const lease=await acquireLease('google_jobs_discovery',60000);if(!lease)return {enabled:true,configured:true,pending:true,busy:true};
 let state:State|null=null;
 try{
  settings=await discoverySettings();
  if(!settings.enabled||!discoveryKeyReady())return {enabled:settings.enabled,configured:discoveryKeyReady(),pending:false};
  const configHash=await discoveryHash(JSON.stringify(settings)),usage=await discoveryUsage();state=await readState();
  const limited=usage.today>=settings.dailyLimit||usage.month>=settings.monthlyLimit;
  if(state?.inFlight){
   // A crash may have occurred after provider acceptance. Count the reservation and pause this pass.
   state.inFlight=false;state.phase='complete';state.failure='A previous search request did not record its result. Its reserved request remains counted; this pass was paused to avoid an immediate duplicate call.';
   state.retryAt=new Date(Date.now()+settings.intervalHours*3600000).toISOString();await stateStatement(state).run();
   return {enabled:true,configured:true,pending:false,uncertain:true,failure:state.failure};
  }
  if(state?.retryAt&&Date.parse(state.retryAt)>Date.now())return {enabled:true,configured:true,pending:false,deferred:true,retryAt:state.retryAt,failure:state.failure};
  if(state?.phase==='complete'&&state.configHash===configHash&&Date.now()-Date.parse(state.startedAt)<settings.intervalHours*3600000)return {enabled:true,configured:true,pending:false,cached:true,failure:state.failure};
  if(limited)return {enabled:true,configured:true,pending:false,budgetExhausted:true,usage,remainingQueries:state?.phase==='pending'?settings.queries.length-state.queryIndex:settings.queries.length};
  if(!state||state.configHash!==configHash||state.phase==='complete')state={version:1,configHash,startedAt:new Date().toISOString(),phase:'pending',queryIndex:0,pageIndex:0,cursor:null,seenTokens:[],pages:0,imported:0,skipped:0,duplicates:0,truncatedQueries:0};
  if(state.queryIndex>=settings.queries.length)throw new Error('Invalid discovery query checkpoint');
  const keys=discoveryBudgetKeys(),started=Date.now();state.inFlight=true;
  // One global lease serializes reservations with settings changes. Count before network, including errors.
  await db().batch([stateStatement(state),...Object.values(keys).map(key=>db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1').bind(key,'1'))]);
  let page:Awaited<ReturnType<typeof fetchDiscoveryPage>>;
  try{page=await fetchDiscoveryPage(env.SERPAPI_API_KEY!.trim(),settings.queries[state.queryIndex],state.cursor);}catch(error){
   state.inFlight=false;state.failure='Search discovery failed; previous listings and student choices were preserved. '+(error instanceof DiscoveryFeedError?error.code:'invalid-page');state.retryAt=new Date(Date.now()+(error instanceof DiscoveryFeedError?error.retryAfterMs:30*60000)).toISOString();
   await stateStatement(state).run();await observation('failed',Date.now()-started,0,0,0,error instanceof DiscoveryFeedError?error.code:'invalid-page');
   return {enabled:true,configured:true,pending:false,deferred:true,failure:state.failure,retryAt:state.retryAt};
  }
  if(page.nextCursor&&state.seenTokens.includes(page.nextCursor)){
   state.inFlight=false;state.phase='complete';state.failure='The provider repeated a pagination token. Discovery stopped without changing saved student choices.';await stateStatement(state).run();await observation('failed',Date.now()-started,0,0,0,'repeated-cursor');return {enabled:true,configured:true,pending:false,failure:state.failure};
  }
  const statements:D1PreparedStatement[]=[],seen=new Set<string>();let imported=0,duplicates=0,skipped=page.skipped;
  const count=await one<{n:number}>('SELECT COUNT(*) as n FROM jobs WHERE source_id=?',DISCOVERY_SOURCE);let capacity=Math.max(0,2000-(count?.n||0));
  for(const job of page.jobs){
   if(seen.has(job.id)){duplicates++;continue;}seen.add(job.id);
   const prior=await one<{data:string;job_key:string;first_seen:string}>('SELECT data,job_key,first_seen FROM jobs WHERE id=?',job.id);
   const urls=job.applyOptions!.map(o=>o.url),aliases=await rows<{data:string;job_key:string;source_id:string}>('SELECT data,job_key,source_id FROM jobs WHERE canonical_url IN ('+urls.map(()=>'?').join(',')+') ORDER BY first_seen,id',...urls);
   const canonical=aliases.find(a=>a.source_id!==DISCOVERY_SOURCE&&normalizeName((JSON.parse(a.data) as Job).company)===normalizeName(job.company));
   if(canonical){
    // Do not let a search hit overwrite or resurrect an authoritative stored vacancy.
    duplicates++;if(prior)statements.push(db().prepare('UPDATE jobs SET active=0 WHERE id=?').bind(job.id));continue;
   }
   if(!prior&&capacity<=0){skipped++;continue;}if(!prior)capacity--;
   job.key=prior?.job_key||job.key;job.firstSeen=prior?.first_seen||job.firstSeen;
   statements.push(db().prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,canonical_url,active) VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data,last_checked=excluded.last_checked,feed_checked_at=excluded.feed_checked_at,canonical_url=excluded.canonical_url,active=1').bind(job.id,job.key,DISCOVERY_SOURCE,JSON.stringify(job),job.firstSeen,job.lastChecked,state.startedAt,job.canonicalUrl));imported++;
  }
  state.inFlight=false;delete state.failure;delete state.retryAt;state.pages++;state.imported+=imported;state.skipped+=skipped;state.duplicates+=duplicates;
  if(page.nextCursor&&state.pageIndex+1<settings.pagesPerQuery){state.cursor=page.nextCursor;state.pageIndex++;state.seenTokens.push(page.nextCursor);}
  else{if(page.nextCursor)state.truncatedQueries++;state.queryIndex++;state.pageIndex=0;state.cursor=null;state.seenTokens=[];}
  state.phase=state.queryIndex>=settings.queries.length?'complete':'pending';
  statements.push(stateStatement(state));await db().batch(statements);await observation('success',Date.now()-started,page.jobs.length,imported,skipped,null);
  const after=await discoveryUsage(),budgetExhausted=after.today>=settings.dailyLimit||after.month>=settings.monthlyLimit;
  return {enabled:true,configured:true,pending:state.phase==='pending'&&!budgetExhausted,budgetExhausted:budgetExhausted&&state.phase==='pending',imported,duplicates,skipped,complete:state.phase==='complete',remainingQueries:settings.queries.length-state.queryIndex,usage:after};
 }finally{await releaseLease(lease);}
}
async function observation(outcome:'success'|'failed',duration:number,fetched:number,imported:number,incomplete:number,error:string|null){
 await db().prepare('INSERT INTO source_run_history(id,source_id,provider,checked_at,outcome,fetched,unique_count,new_jobs,closed,incomplete,duration_ms,error_code) VALUES(?,?,?,?,?,?,?,?,0,?,?,?)').bind(crypto.randomUUID(),DISCOVERY_SOURCE,'serpapi',new Date().toISOString(),outcome,fetched,imported,0,incomplete,Math.max(0,Math.round(duration)),error).run();
}
