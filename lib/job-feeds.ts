import {boundedJSON} from './http-json';
import {extractSkills,inferMode,isSafeJobUrl,jobKey,plainText} from './matching';
import {extractExperience} from './experience';
import {extractEligibility} from './eligibility';
import type {Job,Source} from './types';

const MAX_JOBS=1000,MAX_CHARACTERS=4*1024*1024;
function object(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
const countries:Record<string,string>={IN:'India',US:'United States',GB:'United Kingdom',CA:'Canada',AU:'Australia',SG:'Singapore',DE:'Germany',FR:'France',NL:'Netherlands',JP:'Japan',BR:'Brazil',MX:'Mexico',NZ:'New Zealand'};
export function canonicalJobUrl(value:string){
 const url=new URL(value);url.hash='';
 for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||['gh_src','source','ref','referrer','lever-source','lever-origin'].includes(key.toLowerCase()))url.searchParams.delete(key);
 if(/^(jobs\.ashbyhq\.com|jobs(?:\.eu)?\.lever\.co)$/.test(url.hostname))url.pathname=url.pathname.replace(/\/apply\/?$/,'');
 url.pathname=url.pathname.replace(/\/$/,'');url.searchParams.sort();return url.toString();
}
function locationName(...values:unknown[]){return [...new Set(values.flatMap(v=>Array.isArray(v)?v:[v]).filter((v):v is string=>typeof v==='string'&&!!v.trim()).map(v=>countries[v]||v.trim()))].join(' · ').slice(0,1000)||'Not specified';}
function kind(title:string,label:string,description:string){if(/\bintern(?:ship)?\b/i.test(title)||/^intern$/i.test(label))return'Internship';if(/contract|freelance|temporary/i.test(label+' '+title))return'Contract';if(/full[ -]?time/i.test(label))return'Full-time';return/full[ -]time/i.test(description)?'Full-time':'Not specified';}
function base(raw:Record<string,unknown>,source:Source,now:string,fields:{id:unknown;title:unknown;description:string;location:string;url:unknown;published:unknown;type:string;mode?:string;identity?:string}):Job|null{
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(String(fields.id))||typeof fields.title!=='string'||!fields.title.trim()||typeof fields.url!=='string'||fields.url.length>2048||!isSafeJobUrl(fields.url))return null;
 const fullText=plainText(fields.description.slice(0,200000));
 const evidenceComplete=fields.description.length<=200000&&fullText.length<=35000&&!(source.provider==='lever'&&Array.isArray(raw.lists)&&raw.lists.length>30);
 const description=fullText.slice(0,35000),title=fields.title.trim().slice(0,250),experienceRequirements=extractExperience(description,title),exp={value:experienceRequirements.minimum,evidence:experienceRequirements.evidence};
 const canonical=canonicalJobUrl(fields.url),parsed=new URL(canonical),knownPage=/^(jobs\.ashbyhq\.com|jobs(?:\.eu)?\.lever\.co)$/.test(parsed.hostname)&&/^\/[^/]+\/[a-zA-Z0-9_-]{6,100}$/.test(parsed.pathname)||/^(?:job-boards|boards)\.greenhouse\.io$/.test(parsed.hostname)&&/\/jobs\/\d+$/.test(parsed.pathname);
 const strong=knownPage||parsed.pathname.split('/').includes(String(fields.id))||[...parsed.searchParams.values()].includes(String(fields.id));
 const explicitCountries=[raw.country,object(object(raw.address).postalAddress).addressCountry,...(Array.isArray(raw.secondaryLocations)?raw.secondaryLocations.slice(0,10).map((s:unknown)=>object(object(s).address).addressCountry):[])].filter((v):v is string=>typeof v==='string'&&/^[A-Z]{2}$/.test(v));
 return{id:source.id+':'+fields.id,key:jobKey(source.company,title,fields.location,source.provider+':'+(fields.identity||String(fields.id))),sourceId:source.id,company:source.company,title,location:fields.location,mode:fields.mode||inferMode(fields.location,description),jobType:kind(title,fields.type,description),description,url:fields.url,...(strong?{canonicalUrl:canonical}:{}),sourceUrl:source.careerUrl,publishedAt:fields.published&&Number.isFinite(Date.parse(String(fields.published)))?new Date(fields.published as string).toISOString():null,deadline:typeof raw.application_deadline==='string'&&Number.isFinite(Date.parse(raw.application_deadline))?new Date(raw.application_deadline).toISOString():null,firstSeen:now,lastChecked:now,active:true,minExperience:exp.value,experienceEvidence:exp.evidence,experienceRequirements,skills:extractSkills(description),eligibility:extractEligibility(description),countryCodes:[...new Set(explicitCountries)],evidenceComplete,evidenceVersion:1,provenance:{kind:'ats-api',url:sourceFeedUrl(source),capturedAt:now,parserVersion:1}};
}
export function normalizeGreenhouse(raw:Record<string,unknown>,source:Source,now:string):Job|null{
 if(!/^\d{1,30}$/.test(String(raw.id))||raw.internal_job_id===null)return null;
 return base(raw,source,now,{id:raw.id,title:raw.title,description:String(raw.content||''),location:locationName(object(raw.location).name),url:raw.absolute_url,published:raw.first_published,type:'',identity:String(/^\d{1,30}$/.test(String(raw.internal_job_id))?raw.internal_job_id:raw.id)});
}
export function normalizeLever(raw:Record<string,unknown>,source:Source,now:string){
 const sections=Array.isArray(raw.lists)?raw.lists.slice(0,30).map((list:unknown)=>String(object(list).text||'')+'\n'+String(object(list).content||'')).join('\n'):'';
 const description=[raw.descriptionPlain||raw.description||'',sections,raw.additionalPlain||raw.additional||''].join('\n');
 const mode=typeof raw.workplaceType==='string'?({remote:'Remote',hybrid:'Hybrid','on-site':'On-site',onsite:'On-site'} as Record<string,string>)[raw.workplaceType.toLowerCase()]:undefined;
 return base(raw,source,now,{id:raw.id,title:raw.text,description,location:locationName(object(raw.categories).location,object(raw.categories).allLocations,raw.country),url:raw.hostedUrl||raw.applyUrl,published:typeof raw.createdAt==='number'?new Date(raw.createdAt).toISOString():null,type:String(object(raw.categories).commitment||''),mode});
}
export function normalizeAshby(raw:Record<string,unknown>,source:Source,now:string){
 if(raw.isListed===false)return null;
 const address=object(object(raw.address).postalAddress),secondary=Array.isArray(raw.secondaryLocations)?raw.secondaryLocations.slice(0,10):[];
 const mode=typeof raw.workplaceType==='string'?({remote:'Remote',hybrid:'Hybrid',onsite:'On-site'} as Record<string,string>)[raw.workplaceType.toLowerCase()]:undefined;
 return base(raw,source,now,{id:raw.id,title:raw.title,description:String(raw.descriptionPlain||raw.descriptionHtml||''),location:locationName(raw.location,address.addressCountry,secondary.map((s:unknown)=>object(s).location),secondary.map((s:unknown)=>object(object(s).address).addressCountry)),url:raw.applyUrl||raw.jobUrl,published:raw.publishedAt,type:String(raw.employmentType||''),mode:mode||(raw.isRemote===true?'Remote':undefined)});
}
export function normalizeJobicy(raw:Record<string,unknown>,source:Source,now:string){
 if(!Number.isSafeInteger(raw.id)||Number(raw.id)<=0||typeof raw.companyName!=='string'||!raw.companyName.trim()||typeof raw.url!=='string')return null;
 const url=new URL(raw.url);if(url.protocol!=='https:'||url.hostname!=='jobicy.com'||url.username||url.password||!new RegExp('^/jobs/'+raw.id+'(?:-|/|$)').test(url.pathname))return null;
 const job=base(raw,{...source,company:raw.companyName.trim().slice(0,100)},now,{id:raw.id,title:raw.jobTitle,description:typeof raw.jobDescription==='string'?raw.jobDescription:'',location:typeof raw.jobGeo==='string'&&/^anywhere$/i.test(raw.jobGeo)?'Remote · region not specified':locationName(raw.jobGeo),url:raw.url,published:raw.pubDate,type:Array.isArray(raw.jobType)?raw.jobType.join(' '):'',mode:'Remote'});
 if(!job)return null;
 job.canonicalUrl=canonicalJobUrl(raw.url);job.sourceUrl=job.canonicalUrl;job.sourceCategory='job-board';job.sourceLabel='Jobicy';job.sourceSeniority=typeof raw.jobLevel==='string'?raw.jobLevel.trim().slice(0,80):'Not specified';job.contentCheckedAt=now;job.availability='unknown';
 job.provenance={kind:'job-board-api',url:sourceFeedUrl(source),capturedAt:now,parserVersion:1};
 job.evidenceComplete=job.evidenceComplete&&!!job.description;
 if(typeof raw.salaryMin==='number'||typeof raw.salaryMax==='number')job.compensation={minimum:typeof raw.salaryMin==='number'?raw.salaryMin:null,maximum:typeof raw.salaryMax==='number'?raw.salaryMax:null,currency:typeof raw.salaryCurrency==='string'?raw.salaryCurrency:null,period:typeof raw.salaryPeriod==='string'?raw.salaryPeriod:null,evidence:'Structured compensation reported by Jobicy.'};
 return job;
}
/** Provider contracts live here; boards are configuration, never arbitrary fetch URLs. */
export const SOURCE_ADAPTERS={
 greenhouse:{label:'Greenhouse',normalize:normalizeGreenhouse,board:(token:string)=>'https://job-boards.greenhouse.io/'+encodeURIComponent(token),feed:(token:string)=>'https://boards-api.greenhouse.io/v1/boards/'+encodeURIComponent(token)+'/jobs?content=true',documentation:'https://developers.greenhouse.io/job-board.html'},
 lever:{label:'Lever',normalize:normalizeLever,board:(token:string)=>'https://jobs.lever.co/'+encodeURIComponent(token),feed:(token:string)=>'https://api.lever.co/v0/postings/'+encodeURIComponent(token)+'?mode=json&limit=100&skip=0',documentation:'https://github.com/lever/postings-api'},
 ashby:{label:'Ashby',normalize:normalizeAshby,board:(token:string)=>'https://jobs.ashbyhq.com/'+encodeURIComponent(token),feed:(token:string)=>'https://api.ashbyhq.com/posting-api/job-board/'+encodeURIComponent(token),documentation:'https://developers.ashbyhq.com/docs/public-job-posting-api'},
 jobicy:{label:'Jobicy',normalize:normalizeJobicy,board:()=> 'https://jobicy.com/jobs',feed:(token:string)=>'https://jobicy.com/api/v2/remote-jobs?count=100'+(token==='anywhere'?'&geo=anywhere':''),documentation:'https://github.com/Jobicy/remote-jobs-api'},
} satisfies Record<Source['provider'],{label:string;normalize:(raw:Record<string,unknown>,source:Source,now:string)=>Job|null;board:(token:string)=>string;feed:(token:string)=>string;documentation:string}>;
export function sourceBoardUrl(source:Source){return SOURCE_ADAPTERS[source.provider].board(source.token);}
export function sourceFeedUrl(source:Source){return SOURCE_ADAPTERS[source.provider].feed(source.token);}
export class SourceFetchError extends Error{
 status:number;retryAfterMs:number;
 constructor(status:number,retryAfterMs:number){super('The source is temporarily unavailable.');this.status=status;this.retryAfterMs=retryAfterMs;}
}
async function json(url:string,signal:AbortSignal){
 // Workers supports manual/follow only. Non-2xx responses below refuse redirects.
 const response=await fetch(url,{signal,redirect:'manual',headers:{Accept:'application/json'}});
 if(!response.ok){const header=response.headers.get('retry-after'),seconds=header?Number(header):NaN;const retry=Number.isFinite(seconds)?seconds*1000:header?Date.parse(header)-Date.now():0;await response.body?.cancel();throw new SourceFetchError(response.status,Math.min(86400000,Math.max(60000,retry||0)));}
 return boundedJSON(response,8*1024*1024);
}
/** A bounded page lets shared ingestion checkpoint large rolling feeds instead of buffering the window. */
export async function fetchJobicyPage(source:Source,now:string,cursor?:string){
 const url=new URL(sourceFeedUrl(source));if(cursor){if(cursor.length>4096)throw new Error('Invalid Jobicy cursor');url.searchParams.set('cursor',cursor);}
 const data=object(await json(url.toString(),AbortSignal.timeout(18000)));
 if(data.success!==true||!Array.isArray(data.jobs)||data.jobs.length>100||typeof data.hasMore!=='boolean'||!(data.nextCursor===null||typeof data.nextCursor==='string'))throw new Error('Incomplete Jobicy page');
 if(data.hasMore!==(typeof data.nextCursor==='string'&&!!data.nextCursor)||typeof data.nextCursor==='string'&&(data.nextCursor===cursor||data.nextCursor.length>4096))throw new Error('Invalid Jobicy pagination');
 const jobs=data.jobs.map(raw=>{const job=normalizeJobicy(object(raw),source,now);if(!job)throw new Error('Invalid Jobicy posting');return job;});
 if(new Set(jobs.map(job=>job.id)).size!==jobs.length||jobs.reduce((n,job)=>n+job.description.length,0)>MAX_CHARACTERS)throw new Error('Invalid or oversized Jobicy page');
 return {jobs,nextCursor:data.nextCursor as string|null};
}
export async function fetchSourceJobs(source:Source,now:string):Promise<Job[]>{
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(source.token))throw new Error('Invalid source token');
 const signal=AbortSignal.timeout(18000),jobs:Job[]=[],seen=new Set<string>();let characters=0;
 function append(raw:unknown[]){
  if(raw.length>MAX_JOBS)throw new Error('Feed exceeds safe job count');
  for(const item of raw){
   if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('Invalid feed row');
   if(source.provider==='ashby'&&(item as Record<string,unknown>).isListed===false)continue;
   // Greenhouse includes prospect/talent-pool forms with no underlying job.
   if(source.provider==='greenhouse'&&(item as Record<string,unknown>).internal_job_id===null)continue;
   const job=SOURCE_ADAPTERS[source.provider].normalize(item as Record<string,unknown>,source,now);
   if(!job)throw new Error('Published feed contains an invalid row');
   if(seen.has(job.id))throw new Error('Feed repeated a posting across pages');seen.add(job.id);jobs.push(job);characters+=job.description.length;
   if(jobs.length>MAX_JOBS||characters>MAX_CHARACTERS)throw new Error('Feed exceeds safe memory budget');
  }
 }
 if(source.provider==='jobicy'){
  let cursor:string|null=null;const cursors=new Set<string>();
  for(let page=0;page<10;page++){
   const url=new URL(sourceFeedUrl(source));if(cursor)url.searchParams.set('cursor',cursor);
   const data=object(await json(url.toString(),signal));
   if(data.success!==true||!Array.isArray(data.jobs)||data.jobs.length>100||typeof data.hasMore!=='boolean'||!(data.nextCursor===null||typeof data.nextCursor==='string'))throw new Error('Incomplete Jobicy page');
   append(data.jobs);
   if(!data.hasMore&&data.nextCursor===null)return jobs;
   if(!data.hasMore||typeof data.nextCursor!=='string'||!data.nextCursor||data.nextCursor.length>4096||cursors.has(data.nextCursor))throw new Error('Invalid Jobicy cursor');
   cursor=data.nextCursor;cursors.add(cursor);
  }
  throw new Error('Jobicy pagination exceeds safe limit');
 }
 if(source.provider==='lever'){
  for(let skip=0;skip<=MAX_JOBS;skip+=100){
   const url=new URL(sourceFeedUrl(source));url.searchParams.set('skip',String(skip));const data=await json(url.toString(),signal);
   if(!Array.isArray(data)||data.length>100)throw new Error('Incomplete Lever page');
   append(data);if(data.length<100)return jobs;
  }
  throw new Error('Lever pagination exceeds safe limit');
 }
 const data=await json(sourceFeedUrl(source),signal) as {jobs?:unknown[];meta?:{total?:number};apiVersion?:string;error?:unknown;errors?:unknown;success?:boolean};
 if(!data||data.error||data.errors||data.success===false||!Array.isArray(data.jobs)||source.provider==='greenhouse'&&data.meta?.total!==undefined&&data.meta.total!==data.jobs.length)throw new Error('Incomplete feed');
 append(data.jobs);return jobs;
}
export async function jobicyStatus(id:string){
 if(!/^[1-9]\d{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))throw new Error('Invalid listing identifier');
 const data=object(await json('https://jobicy.com/api/v2/remote-jobs/status?ids='+encodeURIComponent(id),AbortSignal.timeout(12000)));
 if(data.success!==true||!Array.isArray(data.jobs)||data.jobs.length!==1)throw new Error('Invalid status response');
 const item=object(data.jobs[0]);if(String(item.id)!==id||!['active','closed','unknown'].includes(String(item.status)))throw new Error('Mismatched status response');
 return item.status as 'active'|'closed'|'unknown';
}
