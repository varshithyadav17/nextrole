import {z} from 'zod';
import {db,one} from './store';
import {scanJobs,hydrateJobs} from './job-scan';
import {matchesRole} from './matching';
import {matchesView} from './job-selection';
import {verificationState,FRESHNESS_WINDOW_MS} from './freshness';
import {loadSources} from './source-registry';
import {ROLE_CATEGORIES} from './categories';
import {digest} from './keyring';
import {acquireLease,releaseLease,type Lease} from './lease';
import {PublicError} from './errors';
import {defaultProfile,type JobView,type Profile} from './types';
import type {CatalogueFilters,CataloguePage,CatalogueSummary,CompanyCounts} from './catalogue-types';

export const MAX_CATALOGUE_ROWS=20000;
export const catalogueRequest=z.object({tab:z.enum(['discover','interested','applications','archive']).default('discover'),query:z.string().max(500).default(''),view:z.enum(['for-you','review','all']).default('for-you'),company:z.string().max(100).default('all'),role:z.string().max(100).default('all'),mode:z.enum(['All arrangements','On-site','Hybrid','Remote','Not specified']).default('All arrangements'),sort:z.enum(['Best match','Newest first','Deadline soon']).default('Best match'),ids:z.array(z.string().max(200)).max(20).optional(),limit:z.number().int().min(20).max(100).multipleOf(20).default(20),cursor:z.string().max(100).optional()});
type Snapshot={id:string;query_hash:string;generation:string;data:string;expires_at:string};
type SnapshotData={refs:number[];summary:CatalogueSummary};
type Ranked={ref:number;score:number;firstSeen:string;deadline:number};
// One SQLite statement captures the profile and its revision from the same read snapshot.
async function catalogueState(userId:string){
 const state=await db().prepare("SELECT (SELECT value FROM meta WHERE key='catalogue_revision') as catalogue,(SELECT value FROM meta WHERE key='source_registry_v1') as registry,(SELECT revision FROM user_catalogue_versions WHERE user_id=?) as workspace,(SELECT data FROM profiles WHERE user_id=?) as profile,(SELECT updated_at FROM engagement_settings WHERE user_id=?) as reset_at").bind(userId,userId,userId).first<{catalogue:string|null;registry:string|null;workspace:string|null;profile:string|null;reset_at:string|null}>();
 const profile:Profile={...defaultProfile,...(state?.profile?JSON.parse(state.profile):{})};
 const {name:_,alerts:__,reminders:___,completed:____,...preferences}=profile;void _;void __;void ___;void ____;
 const generation=await digest(JSON.stringify([2,state?.catalogue||'0',state?.registry||'',state?.workspace||'0',state?.reset_at||'',preferences]));
 return {profile,generation};
}

export function inCatalogue(job:JobView,filter:CatalogueFilters){
 if(filter.tab==='discover'){
  if(!job.active||job.status||job.deadline&&!(Date.parse(job.deadline)>Date.now())||!matchesView(job.match,filter.view))return false;
 }else if(job.status!==(filter.tab==='applications'?'applied':filter.tab==='archive'?'dismissed':'interested'))return false;
 if(filter.company!=='all'&&job.company!==filter.company||filter.role!=='all'&&!matchesRole(job.title,filter.role)||filter.mode!=='All arrangements'&&job.mode!==filter.mode)return false;
 if(filter.ids)return filter.ids.includes(job.id);
 const query=filter.query.toLowerCase().trim();return !query||(job.title+' '+job.company+' '+job.location+' '+job.skills.join(' ')).toLowerCase().includes(query);
}
function companyCounts(company:string):CompanyCounts{return {company,scopes:{'for-you':{total:0,roles:{}},review:{total:0,roles:{}},all:{total:0,roles:{}}}};}
async function build(userId:string,profile:Profile,filter:CatalogueFilters){
 const now=Date.now(),ranked:Ranked[]=[],companies=new Map((await loadSources()).filter(source=>source.provider!=='jobicy').map(source=>[source.company,companyCounts(source.company)])),employers=new Set<string>();
 const summary:CatalogueSummary={counts:{discover:0,interested:0,applications:0,archive:0},quality:{visibleOpenings:0,employers:0,fresh:0,staleOrUnverified:0,incomplete:0,forYou:0,needsReview:0},companies:[],scanned:0};
 const roles=[...new Set([...ROLE_CATEGORIES,...profile.roles])];let expires=now+5*60000;
 for await(const {ref,job} of scanJobs(userId,profile)){
  if(++summary.scanned>MAX_CATALOGUE_ROWS)throw new PublicError('The catalogue exceeds the current safe ranking budget. Your saved data is retained; ask the host to review catalogue capacity.',503);
  const checked=Date.parse(job.lastChecked),deadline=job.deadline?Date.parse(job.deadline):Infinity;
  for(const boundary of [checked+FRESHNESS_WINDOW_MS+1,checked-5*60000,deadline])if(Number.isFinite(boundary)&&boundary>now)expires=Math.min(expires,boundary);
  if(job.status==='interested')summary.counts.interested++;
  if(job.status==='applied')summary.counts.applications++;
  if(job.status==='dismissed')summary.counts.archive++;
  if(!companies.has(job.company))companies.set(job.company,companyCounts(job.company));
  const state=verificationState(job,now);
  if(state!=='closed'){
   summary.quality.visibleOpenings++;employers.add(job.company);
   if(!companies.has(job.company))companies.set(job.company,companyCounts(job.company));
   if(state==='fresh')summary.quality.fresh++;else summary.quality.staleOrUnverified++;
   if(job.evidenceComplete===false)summary.quality.incomplete++;
   if(!job.status&&(!job.deadline||Date.parse(job.deadline)>now)){
    const facet=companies.get(job.company)!;const matchingRoles=roles.filter(role=>matchesRole(job.title,role));
    for(const scope of ['for-you','review','all'] as const)if(matchesView(job.match,scope)){facet.scopes[scope].total++;for(const role of matchingRoles)facet.scopes[scope].roles[role]=(facet.scopes[scope].roles[role]||0)+1;}
    if(matchesView(job.match)){summary.counts.discover++;summary.quality.forYou++;}
    if(matchesView(job.match,'review'))summary.quality.needsReview++;
   }
  }
  if(inCatalogue(job,filter))ranked.push({ref,score:filter.ids?filter.ids.length-filter.ids.indexOf(job.id):job.match.score,firstSeen:job.firstSeen,deadline});
 }
 ranked.sort((a,b)=>(filter.ids?b.score-a.score:filter.sort==='Newest first'?b.firstSeen.localeCompare(a.firstSeen):filter.sort==='Deadline soon'?(a.deadline===b.deadline?0:a.deadline-b.deadline):b.score-a.score)||b.firstSeen.localeCompare(a.firstSeen)||a.ref-b.ref);
 summary.quality.employers=employers.size;summary.companies=[...companies.values()].sort((a,b)=>a.company.localeCompare(b.company));
 return {data:{refs:ranked.map(job=>job.ref),summary},expires};
}
export async function cataloguePage(userId:string,input:unknown):Promise<CataloguePage>{
 const parsed=catalogueRequest.parse(input),{cursor,limit,...filters}=parsed,queryHash=await digest(JSON.stringify(filters)),{profile,generation:stamp}=await catalogueState(userId);
 let snapshot=await one<Snapshot>('SELECT id,query_hash,generation,data,expires_at FROM catalogue_snapshots WHERE user_id=?',userId),cached=true,offset=0;
 if(cursor){const match=/^([a-f0-9-]{36})\.(\d{1,5})$/.exec(cursor);if(!match)throw new PublicError('Invalid page cursor.',400);offset=Number(match[2]);if(offset>MAX_CATALOGUE_ROWS||offset%20!==0)throw new PublicError('Invalid page cursor.',400);
  if(!snapshot||snapshot.id!==match[1]||snapshot.query_hash!==queryHash||snapshot.generation!==stamp||Date.parse(snapshot.expires_at)<=Date.now())throw new PublicError('Your catalogue changed. Reload the current results before continuing.',409);
 }else if(!snapshot||snapshot.query_hash!==queryHash||snapshot.generation!==stamp||Date.parse(snapshot.expires_at)<=Date.now()){
  const lease=await acquireLease('catalogue_build:'+userId,90000);if(!lease)throw new PublicError('Your catalogue is being prepared in another tab. Please try again in a moment.',409);
  let workspaceLease:Lease|null=null;
  try{
   workspaceLease=await acquireLease('byok_mutation:'+userId,90000);
   if(!workspaceLease)throw new PublicError('Another workspace change is being saved. Please try loading the catalogue again in a moment.',409);
   const result=await build(userId,profile,filters);
   if((await catalogueState(userId)).generation!==stamp||result.expires<=Date.now())throw new PublicError('Your catalogue changed during preparation. Reload to use the current results.',409);
   const id=crypto.randomUUID(),expiresAt=new Date(result.expires).toISOString(),data=JSON.stringify(result.data);
   // Fence the write in SQLite too: an expired holder must not recreate data after a clear.
   const written=await db().prepare('INSERT INTO catalogue_snapshots(user_id,id,query_hash,generation,data,expires_at,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?) ON CONFLICT(user_id) DO UPDATE SET id=excluded.id,query_hash=excluded.query_hash,generation=excluded.generation,data=excluded.data,expires_at=excluded.expires_at,created_at=excluded.created_at').bind(userId,id,queryHash,stamp,data,expiresAt,new Date().toISOString(),workspaceLease.key,workspaceLease.value).run();
   if(!written.meta.changes)throw new PublicError('Your workspace changed during preparation. Reload to use the current results.',409);
   snapshot={id,query_hash:queryHash,generation:stamp,data,expires_at:expiresAt};cached=false;
  }finally{try{await releaseLease(workspaceLease);}finally{await releaseLease(lease);}}
 }
 const saved=JSON.parse(snapshot!.data) as SnapshotData,refs=saved.refs.slice(offset,offset+limit),jobs=await hydrateJobs(userId,profile,refs);
 if((await catalogueState(userId)).generation!==stamp||Date.parse(snapshot!.expires_at)<=Date.now()||jobs.length!==refs.length||jobs.some(job=>!inCatalogue(job,filters)))throw new PublicError('Your catalogue changed. Reload to use the current results.',409);
 return {jobs,total:saved.refs.length,nextCursor:offset+limit<saved.refs.length?snapshot!.id+'.'+(offset+limit):null,snapshotId:snapshot!.id,expiresAt:snapshot!.expires_at,summary:saved.summary,cached};
}
