import {boundedJSON} from './http-json';
import {extractExperience} from './experience';
import {extractEligibility} from './eligibility';
import {extractSkills,inferMode,isSafeJobUrl,jobKey,plainText} from './matching';
import {canonicalJobUrl} from './job-feeds';
import type {Job} from './types';

export const SEARCH_SOURCE_ID='google-jobs-serpapi';
export class DiscoveryFeedError extends Error{
 code:string;retryAfterMs:number;
 constructor(code:string,retryAfterMs=30*60000){super('The search provider could not return a complete page.');this.code=code;this.retryAfterMs=retryAfterMs;}
}
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export async function discoveryHash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('').slice(0,32);}
const tidy=(s:string)=>s.replace(/\s+/g,' ').trim();
function usableLink(value:unknown){if(typeof value!=='string'||value.length>2048||!isSafeJobUrl(value))return false;const url=new URL(value);return url.hostname.includes('.')&&!/^(?:www\.)?(?:google\.com|serpapi\.com)$/.test(url.hostname);}
export async function normalizeDiscoveryJob(input:unknown,now:string):Promise<Job|null>{
 const raw=object(input);
 if(typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>250||typeof raw.company_name!=='string'||!raw.company_name.trim()||raw.company_name.length>100)return null;
 const options=(Array.isArray(raw.apply_options)?raw.apply_options:[]).slice(0,20).map(object).filter(o=>usableLink(o.link)).map(o=>({label:typeof o.title==='string'?tidy(o.title).slice(0,80):new URL(o.link as string).hostname,url:canonicalJobUrl(o.link as string)}));
 const links=[...new Map(options.map(o=>[o.url,o])).values()].slice(0,5);
 if(!links.length)return null;
 // Prefer a documented ATS URL when it is actually supplied; never invent an employer URL.
 links.sort((a,b)=>Number(/^(?:job-boards|boards)\.greenhouse\.io$|^jobs(?:\.eu)?\.lever\.co$|^jobs\.ashbyhq\.com$/.test(new URL(b.url).hostname))-Number(/^(?:job-boards|boards)\.greenhouse\.io$|^jobs(?:\.eu)?\.lever\.co$|^jobs\.ashbyhq\.com$/.test(new URL(a.url).hostname)));
 const title=tidy(raw.title),company=tidy(raw.company_name),url=links[0].url;
 const description=plainText(typeof raw.description==='string'?raw.description.slice(0,100000):'').slice(0,35000),experience=extractExperience(description,title);
 const location=typeof raw.location==='string'?tidy(raw.location).slice(0,1000)||'Not specified':'Not specified';
 const detected=object(raw.detected_extensions),schedule=typeof detected.schedule_type==='string'?detected.schedule_type:'';
 const jobType=/\bintern(?:ship)?\b/i.test(title+' '+schedule)?'Internship':/contract|freelance|temporary/i.test(schedule)?'Contract':/full[ -]?time/i.test(schedule)?'Full-time':'Not specified';
 const id=await discoveryHash(company.toLowerCase()+'|'+url);
 return {id:SEARCH_SOURCE_ID+':'+id,key:jobKey(company,title,location,'search:'+id),sourceId:SEARCH_SOURCE_ID,company,title,location,description,url,canonicalUrl:url,sourceUrl:url,sourceCategory:'job-board',sourceLabel:'Google Jobs via SerpApi',firstSeen:now,lastChecked:now,contentCheckedAt:now,active:true,availability:'unknown',publishedAt:null,deadline:null,mode:detected.work_from_home===true?'Remote':inferMode(location,description),jobType,minExperience:experience.minimum,experienceEvidence:experience.evidence,experienceRequirements:experience,eligibility:extractEligibility(title+'\n'+description),skills:extractSkills(description),evidenceComplete:false,evidenceVersion:1,applyOptions:links,provenance:{kind:'job-search-api',url:'https://serpapi.com/google-jobs-api',capturedAt:now,parserVersion:1}};
}
/** Fixed provider and endpoint only. Never fetch a returned URL, a raw page, or a student's session. */
export async function fetchDiscoveryPage(key:string,search:{query:string;location:string},cursor:string|null){
 const url=new URL('https://serpapi.com/search.json');url.searchParams.set('engine','google_jobs');url.searchParams.set('q',search.query);url.searchParams.set('location',search.location);url.searchParams.set('gl','in');url.searchParams.set('hl','en');url.searchParams.set('api_key',key);if(cursor)url.searchParams.set('next_page_token',cursor);
 let response:Response;try{response=await fetch(url,{redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(20000)});}catch{throw new DiscoveryFeedError('network-or-timeout');}
 if(!response.ok){const seconds=Number(response.headers.get('retry-after'));await response.body?.cancel();throw new DiscoveryFeedError('http-'+response.status,Math.max(5*60000,Math.min(86400000,Number.isFinite(seconds)?seconds*1000:30*60000)));}
 let raw:Record<string,unknown>;try{raw=object(await boundedJSON(response,1024*1024));}catch{throw new DiscoveryFeedError('invalid-response');}
 if(object(raw.search_metadata).status!=='Success'||raw.error||!Array.isArray(raw.jobs_results)||raw.jobs_results.length>10)throw new DiscoveryFeedError('incomplete-response');
 const pagination=object(raw.serpapi_pagination),next=pagination.next_page_token;
 if(next!==undefined&&(typeof next!=='string'||!next||next.length>4096||next===cursor))throw new DiscoveryFeedError('invalid-pagination');
 const now=new Date().toISOString(),normalized=await Promise.all(raw.jobs_results.map(job=>normalizeDiscoveryJob(job,now))),jobs=normalized.filter((job):job is Job=>!!job);
 return {jobs,nextCursor:typeof next==='string'?next:null,skipped:normalized.length-jobs.length};
}
