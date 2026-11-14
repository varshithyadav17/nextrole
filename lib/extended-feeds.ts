import type {Source} from './types';
export const EMPLOYER_PROVIDERS=['greenhouse','lever','ashby','smartrecruiters','workable','recruitee','personio','breezy','teamtailor','rippling','workday','oracle'] as const;
export const EXTENDED_PROVIDERS=EMPLOYER_PROVIDERS.slice(3);
export const PROVIDER_LABELS:Record<Source['provider'],string>={greenhouse:'Greenhouse',lever:'Lever',ashby:'Ashby',jobicy:'Jobicy',smartrecruiters:'SmartRecruiters',workable:'Workable',recruitee:'Recruitee',personio:'Personio',breezy:'Breezy HR',teamtailor:'Teamtailor',rippling:'Rippling',workday:'Workday',oracle:'Oracle Recruiting'};
const record=(v:unknown):Record<string,any>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
export function validSourceAddress(s:Source){
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(s.token))return false;
 if(s.provider==='workday')return !!s.host&&new RegExp('^'+s.token.toLowerCase()+'\\.wd[0-9]{1,3}\\.myworkdayjobs\\.com$').test(s.host)&&/^[a-zA-Z0-9_-]{1,100}$/.test(s.site||'');
 if(s.provider==='oracle')return !!s.host&&/^[a-z0-9-]+\.fa\.(?:[a-z0-9-]+\.)?oraclecloud\.com$/.test(s.host);
 if(s.provider==='teamtailor')return !!s.host&&/^[a-z0-9-]+\.(?:teamtailor\.com|teamtailor\.jobs)$/.test(s.host);
 return !s.host||['personio'].includes(s.provider)&&s.host===s.token+'.jobs.personio.'+(s.region||'de');
}
export function extendedBoard(s:Source){
 if(!validSourceAddress(s))throw new Error('Invalid employer source address');
 const t=encodeURIComponent(s.token);
 switch(s.provider){
 case'smartrecruiters':return'https://jobs.smartrecruiters.com/'+t;
 case'workable':return'https://apply.workable.com/'+t;
 case'recruitee':return'https://'+t+'.recruitee.com';
 case'personio':return'https://'+t+'.jobs.personio.'+(s.region||'de');
 case'breezy':return'https://'+t+'.breezy.hr';
 case'teamtailor':return'https://'+s.host;
 case'rippling':return'https://ats.rippling.com/'+t+'/jobs';
 case'workday':return'https://'+s.host+'/'+encodeURIComponent(s.site!);
 case'oracle':return'https://'+s.host+'/hcmUI/CandidateExperience/en/sites/'+t;
 default:throw new Error('Unsupported employer source');
 }
}
export function extendedFeed(s:Source){
 const board=extendedBoard(s),t=encodeURIComponent(s.token);
 switch(s.provider){
 case'smartrecruiters':return'https://api.smartrecruiters.com/v1/companies/'+t+'/postings?destination=PUBLIC&country=in&limit=100&offset=0';
 case'workable':return'https://apply.workable.com/api/v1/widget/accounts/'+t+'?details=true';
 case'recruitee':return board+'/api/offers/';
 case'personio':return board+'/xml?language=en';
 case'breezy':return board+'/json';
 case'teamtailor':return board+'/jobs.rss';
 case'rippling':return'https://ats.rippling.com/api/v2/board/'+t+'/jobs';
 case'workday':return'https://'+s.host+'/wday/cxs/'+t+'/'+encodeURIComponent(s.site!)+'/jobs';
 case'oracle':return'https://'+s.host+'/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&limit=100&offset=0&finder='+encodeURIComponent('findReqs;siteNumber='+s.token);
 default:throw new Error('Unsupported employer source');
 }
}
export function postingFields(raw:Record<string,any>,source:Source){
 const r=raw,l=record(r.location),salary=record(r.salary),country=l.country||r.country||record(r.address).country;
 const countries=[country,r.countryCode,l.countryCode].filter(x=>typeof x==='string'&&x.length===2).map(x=>x.toUpperCase());
 const sections=record(r.jobAd?.sections),description=Object.values(sections).map(x=>record(x).text||'').join('\n');
 let id=r.id||r._id||r.uuid||r.shortcode||r.Id||r.jobRequisitionId;
 let title=r.name||r.title||r.Title||r.jobTitle;
 let text=r.description||r.descriptionHtml||r.description_html||r.body||r.jobDescription||description||r.ExternalDescriptionStr;
 let location=[l.city,l.state,l.region,l.country,r.locationName,r.city,typeof r.location==='string'?r.location:'',r.PrimaryLocation].filter(x=>typeof x==='string'&&x.trim()).join(' · ')||'Not specified';
 let url=r.apply_url||r.careers_url||r.careers_apply_url||r.url||r.applicationUrl||r.applyUrl||r.referralUrl;
 if(source.provider==='smartrecruiters')url=r.applyUrl||r.postingUrl||'https://jobs.smartrecruiters.com/'+encodeURIComponent(source.token)+'/'+encodeURIComponent(String(id));
 if(source.provider==='workable'){location=record(r.location).location_str||[l.city,l.region,l.country].filter(Boolean).join(', ')||'Not specified';url=r.url||r.application_url||'https://apply.workable.com/j/'+encodeURIComponent(String(r.shortcode||id));}
 if(source.provider==='recruitee'){title=r.title;location=r.location||r.location_name||[r.city,r.country].filter(Boolean).join(', ')||'Not specified';}
 if(source.provider==='personio'){url=extendedBoard(source)+'/job/'+encodeURIComponent(String(id))+'?language=en';location=r.office||'Not specified';text=r.jobDescriptions||'';}
 if(source.provider==='breezy'){location=[l.city,l.state,l.country?.name||l.country].filter(x=>typeof x==='string').join(', ')||'Not specified';}
 if(source.provider==='workday'){id=r.jobReqId;title=r.title;text=r.jobDescription;location=[r.location,...(Array.isArray(r.additionalLocations)?r.additionalLocations:[])].filter(x=>typeof x==='string').join(' · ')||'Not specified';url=r.externalUrl;}
 if(source.provider==='oracle'){id=r.Id;title=r.Title;text=[r.ExternalDescriptionStr,r.ExternalQualificationsStr,r.ExternalResponsibilitiesStr].filter(Boolean).join('\n');url=extendedBoard(source)+'/job/'+encodeURIComponent(String(id));}
 if(source.provider==='teamtailor'){id=r.id;url=r.link;title=r.title;text=r.description;location=r.location||'Not specified';}
 return {raw:{...r,country:countries[0]},fields:{id,title,description:typeof text==='string'?text:'',location,url,published:r.releasedDate||r.published||r.published_at||r.created_date||r.date||r.pubDate||r.startDate||r.ExternalPostedStartDate||r.postedOn,mode:source.provider==='smartrecruiters'?(l.remote===true?'Remote':l.hybrid===true?'Hybrid':l.remote===false&&l.hybrid===false?'On-site':undefined):undefined,type:String(r.typeOfEmployment?.label||r.employment_type||r.employmentType||r.jobType||r.timeType||'')}};
}
const xmlDecode=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
function tag(s:string,name:string){const m=new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'>','i').exec(s);return m?xmlDecode(m[1].trim()):'';}
export function parseJobsXML(text:string,provider:Source['provider']){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('XML declarations are not allowed');
 const parent=provider==='personio'?'workzag-jobs':'rss';
 if(!new RegExp('<'+parent+'(?:[\\s>])','i').test(text)||!new RegExp('</'+parent+'>\\s*$','i').test(text))throw new Error('Incomplete XML feed');
 const block=provider==='personio'?'position':'item';const matches=[...text.matchAll(new RegExp('<'+block+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+block+'>','gi'))];
 if((text.match(new RegExp('<'+block+'(?:\\s[^>]*)?>','gi'))||[]).length!==matches.length)throw new Error('Truncated XML jobs');
 return matches.map(m=>{const b=m[1];if(provider==='personio')return{id:tag(b,'id'),name:tag(b,'name'),office:tag(b,'office'),jobDescriptions:tag(b,'jobDescriptions'),employmentType:tag(b,'employmentType'),created_date:tag(b,'createdAt')};const link=tag(b,'link'),id=tag(b,'guid')||link;return{id:link.match(/\/jobs\/(\d{1,30})(?:[-/?#]|$)/)?.[1]||id,title:tag(b,'title'),link,description:tag(b,'description'),pubDate:tag(b,'pubDate')};});
}
/** Complete employer snapshots only. Search details are fetched by validated posting ID, never a response-supplied URL. */
export async function readExtended(source:Source,request:(url:string,init?:RequestInit,text?:boolean)=>Promise<any>):Promise<Record<string,any>[]>{
 const url=extendedFeed(source);let raw:unknown[]=[];
 if(source.provider==='personio'||source.provider==='teamtailor')return parseJobsXML(await request(url,undefined,true),source.provider);
 if(source.provider==='smartrecruiters'){
  let expected:number|undefined;
  for(let offset=0;offset<=1000;offset+=100){const u=new URL(url);u.searchParams.set('offset',String(offset));const d=await request(u.toString());if(!Array.isArray(d.content)||!Number.isSafeInteger(d.totalFound)||d.totalFound<0||d.totalFound>1000||d.content.length>100||d.offset!==undefined&&d.offset!==offset||expected!==undefined&&expected!==d.totalFound)throw new Error('Incomplete SmartRecruiters snapshot');expected=Number(d.totalFound);raw.push(...d.content);if(raw.length>expected)throw new Error('Repeated SmartRecruiters page');if(raw.length===expected)break;if(d.content.length===0)throw new Error('Truncated SmartRecruiters page');}
  if(raw.length!==expected)throw new Error('SmartRecruiters pagination exceeds budget');
  const details=[];for(let start=0;start<raw.length;start+=4){const part=await Promise.all(raw.slice(start,start+4).map(async(v)=>{const r=record(v);if(!/^[a-zA-Z0-9_-]{1,100}$/.test(String(r.id))||r.visibility&&r.visibility!=='PUBLIC')throw new Error('Invalid public posting');const d=await request('https://api.smartrecruiters.com/v1/companies/'+encodeURIComponent(source.token)+'/postings/'+r.id);if(String(d.id)!==String(r.id))throw new Error('Mismatched posting detail');return d;}));details.push(...part);}return details;
 }
 if(source.provider==='workday'){
  let total:number|undefined;for(let offset=0;offset<=1000;offset+=20){const d=await request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appliedFacets:{},limit:20,offset,searchText:''})});if(!Array.isArray(d.jobPostings)||!Number.isSafeInteger(d.total)||d.total<0||d.total>1000||total!==undefined&&total!==d.total||d.jobPostings.length>20)throw new Error('Incomplete Workday snapshot');total=Number(d.total);raw.push(...d.jobPostings);if(raw.length===total)break;if(!d.jobPostings.length||raw.length>total)throw new Error('Invalid Workday page');}
  if(raw.length!==total)throw new Error('Workday pagination exceeds budget');const details=[];
  for(let start=0;start<raw.length;start+=4){details.push(...await Promise.all(raw.slice(start,start+4).map(async v=>{const p=String(record(v).externalPath||'');if(!/^\/job\/[a-zA-Z0-9_\-/%.]{1,600}$/.test(p)||p.includes('..')||/%2e|%2f|%5c/i.test(p))throw new Error('Invalid Workday detail path');const d=await request(url.replace(/\/jobs$/,'')+p);if(!d.jobPostingInfo?.jobReqId)throw new Error('Incomplete Workday detail');return d.jobPostingInfo;})));}return details;
 }
 if(source.provider==='oracle'){
  for(let offset=0;offset<=1000;offset+=100){const u=new URL(url);u.searchParams.set('offset',String(offset));const d=await request(u.toString());if(!Array.isArray(d.items)||typeof d.hasMore!=='boolean'||d.items.length>100)throw new Error('Incomplete Oracle snapshot');raw.push(...d.items);if(!d.hasMore)return raw.map(record);if(!d.items.length)throw new Error('Truncated Oracle snapshot');}throw new Error('Oracle pagination exceeds budget');
 }
 const d=await request(url);
 if(source.provider==='workable'){if(!Array.isArray(d.jobs)||typeof d.name!=='string')throw new Error('Incomplete Workable feed');raw=d.jobs;}
 else if(source.provider==='recruitee'){if(!Array.isArray(d.offers))throw new Error('Incomplete Recruitee feed');raw=d.offers.filter((x:any)=>x.status===undefined||x.status==='published');}
 else if(source.provider==='breezy'){if(!Array.isArray(d))throw new Error('Incomplete Breezy feed');raw=d.filter((x:any)=>x.state===undefined||x.state==='published');}
 else if(source.provider==='rippling'){if(!Array.isArray(d.jobs)||d.nextCursor||d.hasMore||d.total!==undefined&&d.total!==d.jobs.length)throw new Error('Incomplete Rippling feed');raw=d.jobs;}
 else throw new Error('Unsupported employer feed');
 if(raw.length>1000)throw new Error('Feed exceeds job budget');if(raw.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw new Error('Malformed employer posting');return raw.map(record);
}
