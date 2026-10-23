import {z} from 'zod';
import {db,one} from './store';
import {digest} from './keyring';
import {canonicalJobUrl} from './job-feeds';
import {plainText,isSafeJobUrl,extractSkills,inferMode} from './matching';
import {extractEligibility} from './eligibility';
import {extractExperience} from './experience';
import {PublicError} from './errors';
import type {Job} from './types';

const fields=z.object({
 url:z.string().url().max(2048).refine(isSafeJobUrl),company:z.string().trim().min(1).max(100),title:z.string().trim().min(2).max(250),
 location:z.string().trim().max(1000).default('Not specified'),description:z.string().trim().min(40).max(100000),
 mode:z.enum(['On-site','Hybrid','Remote','Not specified']).default('Not specified'),
 jobType:z.enum(['Full-time','Internship','Contract','Not specified']).default('Not specified'),
});
function record(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function text(value:unknown){return typeof value==='string'?value:'';}
function validDate(value:unknown){return typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;}
function findPostings(value:unknown,depth=0):Record<string,unknown>[] {
 if(depth>8)return [];
 if(Array.isArray(value))return value.slice(0,100).flatMap(v=>findPostings(v,depth+1));
 const node=record(value),type=node['@type'];
 if(type==='JobPosting'||Array.isArray(type)&&type.includes('JobPosting'))return [node];
 return node['@graph']?findPostings(node['@graph'],depth+1):[];
}
export function parseJobPosting(value:unknown,url:string){
 const found=findPostings(value);if(found.length!==1)throw new PublicError('Paste structured data containing exactly one JobPosting.');
 const node=found[0],employer=record(node.hiringOrganization),locations=Array.isArray(node.jobLocation)?node.jobLocation:[node.jobLocation];
 const place=locations.slice(0,10).map(location=>{const address=record(record(location).address);return [address.addressLocality,address.addressRegion,typeof address.addressCountry==='string'?address.addressCountry:record(address.addressCountry).name].map(text).filter(Boolean).join(', ');}).filter(Boolean).join(' · ');
 const employment=Array.isArray(node.employmentType)?node.employmentType.map(text).join(' '):text(node.employmentType);
 const locationType=text(node.jobLocationType),restrictions=Array.isArray(node.applicantLocationRequirements)?node.applicantLocationRequirements:[node.applicantLocationRequirements];
 const region=restrictions.map(v=>typeof v==='string'?v:text(record(v).name)).filter(Boolean).join(', ');
 const parsed=fields.parse({url,company:text(employer.name),title:text(node.title),description:text(node.description),location:[place,region].filter(Boolean).join(' · ')||'Not specified',mode:locationType==='TELECOMMUTE'?'Remote':'Not specified',jobType:/INTERN/i.test(employment)?'Internship':/FULL_TIME/i.test(employment)?'Full-time':/CONTRACTOR|TEMPORARY/i.test(employment)?'Contract':'Not specified'});
 const salary=record(node.baseSalary),amount=record(salary.value);
 const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
 const minimum=number(amount.minValue??amount.value),maximum=number(amount.maxValue??amount.value);
 const compensation=minimum!==null||maximum!==null?{minimum,maximum,currency:text(salary.currency)||null,period:text(amount.unitText)||null,evidence:JSON.stringify(node.baseSalary).slice(0,2000)}:undefined;
 const countryCodes=locations.map(location=>record(record(location).address).addressCountry).filter((country):country is string=>typeof country==='string'&&/^[A-Z]{2}$/.test(country));
 if(minimum!==null&&maximum!==null&&minimum>maximum)throw new PublicError('The published compensation range conflicts. Use a text import and leave compensation unconfirmed.');
 const deadlineText=text(node.validThrough).slice(0,160),deadline=/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(deadlineText)?validDate(deadlineText):null;
 return {...parsed,publishedAt:validDate(node.datePosted),deadline,deadlineEvidence:deadlineText||undefined,compensation,countryCodes};
}
export async function importJob(userId:string,input:unknown){
 const body=z.object({kind:z.enum(['text','jsonld']),data:z.unknown(),url:z.string().url().max(2048).refine(isSafeJobUrl)}).parse(input);
 let parsed:z.infer<typeof fields>&{publishedAt?:string|null;deadline?:string|null;compensation?:Job['compensation'];deadlineEvidence?:string;countryCodes?:string[]};
 if(body.kind==='jsonld'){
  let value;try{value=typeof body.data==='string'?JSON.parse(body.data):body.data;}catch{throw new PublicError('Paste valid JSON-LD, without surrounding script tags.');}
  parsed=parseJobPosting(value,body.url);
 }else parsed=fields.parse({...record(body.data),url:body.url});
 const canonical=canonicalJobUrl(parsed.url);
 const shared=await one<{id:string;job_key:string}>('SELECT id,job_key FROM jobs WHERE canonical_url=? ORDER BY active DESC,first_seen LIMIT 1',canonical);
 if(shared){await db().prepare('INSERT OR IGNORE INTO user_jobs(user_id,job_key,job_id,status,updated_at) VALUES(?,?,?,?,?)').bind(userId,shared.job_key,shared.id,'interested',new Date().toISOString()).run();return {jobId:shared.id,reused:true};}
 const id='import-'+(await digest(canonical)).slice(0,32),key='personal:'+(await digest(userId+':'+canonical)).slice(0,32);
 const count=await one<{n:number}>('SELECT COUNT(*) as n FROM imported_jobs WHERE user_id=?',userId);
 const existing=await one('SELECT id FROM imported_jobs WHERE user_id=? AND id=?',userId,id);
 if(!existing&&(count?.n||0)>=100)throw new PublicError('You have 100 private imports. Remove an older import before adding another.');
 const description=plainText(parsed.description.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'')).slice(0,35000),requirements=extractExperience(description,parsed.title),now=new Date().toISOString();
 const job:Job={id,key,sourceId:'personal-import',company:parsed.company,title:parsed.title,location:parsed.location||'Not specified',mode:parsed.mode==='Not specified'?inferMode(parsed.location,description):parsed.mode,jobType:parsed.jobType,description,url:parsed.url,sourceUrl:parsed.url,canonicalUrl:canonical,publishedAt:parsed.publishedAt||null,deadline:parsed.deadline||null,...(parsed.deadlineEvidence?{deadlineEvidence:parsed.deadlineEvidence}:{}),firstSeen:now,lastChecked:'',active:true,minExperience:requirements.minimum,experienceEvidence:requirements.evidence,experienceRequirements:requirements,eligibility:extractEligibility(description),skills:extractSkills(description),evidenceComplete:plainText(parsed.description).length<=35000,evidenceVersion:1,...(parsed.countryCodes?{countryCodes:parsed.countryCodes}:{}),provenance:{kind:'user-import',url:parsed.url,capturedAt:now,parserVersion:1},...(parsed.compensation?{compensation:parsed.compensation}:{})};
 await db().batch([db().prepare('INSERT INTO imported_jobs(user_id,id,job_key,data,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET data=json_set(excluded.data,\'$.firstSeen\',json_extract(imported_jobs.data,\'$.firstSeen\')),updated_at=excluded.updated_at').bind(userId,id,key,JSON.stringify(job),now,now),db().prepare('INSERT OR IGNORE INTO user_jobs(user_id,job_key,job_id,status,updated_at) VALUES(?,?,?,?,?)').bind(userId,key,id,'interested',now)]);
 return {jobId:id,reused:false};
}
