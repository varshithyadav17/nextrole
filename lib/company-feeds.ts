import {boundedJSON,boundedText} from './http-json';
import {SourceFetchError,sourceFeedUrl,normalizeExtended,normalizePosting,indiaLocation,locationName} from './job-feeds';
import {extendedBoard,validSourceAddress} from './extended-feeds';
import type {Source,Job} from './types';
export const PAGED_COMPANY_PROVIDERS=['amazon','microsoft','workday','oracle','trakstar','kula','google'] as const;
export type CompanyCursor={offset:number;facets?:Record<string,string[]>;paths?:string[];total?:number};
export type CompanyPage={records:Record<string,any>[];total:number;next:number|null;cursor:CompanyCursor;completeSnapshot:boolean};
export async function publicJSON(url:string,signal:AbortSignal,init?:RequestInit){const r=await fetch(url,{...init,signal,redirect:'manual',headers:{Accept:'application/json',...init?.headers}});if(!r.ok){const value=r.headers.get('retry-after'),n=Number(value);await r.body?.cancel();throw new SourceFetchError(r.status,Math.min(86400000,Math.max(60000,value?(Number.isFinite(n)?n*1000:Date.parse(value)-Date.now()):60000)));}return boundedJSON(r,4*1024*1024) as Promise<Record<string,any>>;}
async function publicHTML(url:string,signal:AbortSignal){const r=await fetch(url,{signal,redirect:'manual',headers:{Accept:'text/html'}});if(!r.ok){await r.body?.cancel();throw new SourceFetchError(r.status,60000);}return boundedText(r,2*1024*1024);}
const total=(value:unknown)=>{if(!Number.isSafeInteger(value)||Number(value)<0||Number(value)>10000)throw new Error('Invalid company index total');return Number(value);};
const safeId=(value:unknown)=>{const id=String(value??'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new Error('Invalid public requisition ID');return id;};
export function companyRecordId(raw:Record<string,any>,source:Source){return source.provider==='workday'?workdayPath(raw.__path):safeId(source.provider==='amazon'?raw.id_icims:source.provider==='oracle'?raw.Id:raw.id);}
function workdayPath(value:unknown){const p=String(value||'');if(!/^\/job\/[a-zA-Z0-9_\-/%.]{1,700}$/.test(p)||p.includes('..')||/%2e|%2f|%5c/i.test(p))throw new Error('Invalid public Workday detail path');return p;}
function oracleURL(source:Source,resource:string,finder:string,extra:Record<string,string>={}){const u=new URL('https://'+source.host+'/hcmRestApi/resources/latest/'+resource);u.searchParams.set('onlyData','true');u.searchParams.set('finder',finder);for(const[k,v]of Object.entries(extra))u.searchParams.set(k,v);return u.toString();}
/** Extract JSON array values from public AF data callbacks; never execute scripts. */
export function googleJobRecords(html:string,expected?:{id:string;url:string}){
 const links=expected?new Map([[expected.id,expected.url.replace('https://www.google.com/about/careers/applications/','')]]):new Map([...html.matchAll(/href=["'](jobs\/results\/(\d+)-[^"']+)["']/g)].map(m=>[m[2],m[1].replace(/&amp;/g,'&')]));const records:Record<string,any>[]=[];
 for(const m of html.matchAll(/AF_initDataCallback\(\{key:[\s\S]{0,120}?data:\s*/g)){
  const start=m.index!+m[0].length;if(html[start]!=='[')continue;let depth=0,string=false,escape=false,end=-1;
  for(let i=start;i<html.length;i++){const c=html[i];if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;continue;}if(c==='"')string=true;else if(c==='['||c==='{')depth++;else if(c===']'||c==='}'){depth--;if(!depth){end=i+1;break;}}}
  if(end<0)throw new Error('Incomplete Google public data');const data=JSON.parse(html.slice(start,end));
  const walk=(v:any,level=0)=>{if(level>8||!Array.isArray(v))return;if(typeof v[0]==='string'&&/^\d{8,30}$/.test(v[0])&&typeof v[1]==='string'&&links.has(v[0])&&Array.isArray(v[9])){const description=[v[4]?.[1],v[10]?.[1],v[3]?.[1]].filter(x=>typeof x==='string').join('\n');if(!description.trim())throw new Error('Google job description is incomplete');records.push({id:v[0],title:v[1],description,locations:v[9],__url:'https://www.google.com/about/careers/applications/'+links.get(v[0])});return;}for(const x of v)walk(x,level+1);};walk(data);
 }
 if(new Set(records.map(r=>r.id)).size!==records.length||records.length!==links.size)throw new Error('Google job records do not match the public index');
 const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' '),match=/\b(\d[\d,]*)\s+jobs matched/i.exec(plain);if(!match&&!expected)throw new Error('Google public job total is unavailable');return{records,total:match?Number(match[1].replaceAll(',','')):records.length};
}
export async function companyPage(source:Source,cursor:CompanyCursor,signal:AbortSignal):Promise<CompanyPage>{
 if(!validSourceAddress(source))throw new Error('Invalid company source');const offset=cursor.offset;
 if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new Error('Invalid company checkpoint');
 if(source.provider==='google'){
  const u=new URL(sourceFeedUrl(source));u.searchParams.set('page',String(Math.floor(offset/20)+1));const d=googleJobRecords(await publicHTML(u.toString(),signal)),n=total(d.total);if(!d.records.length&&offset<n)throw new Error('Incomplete Google index');return{records:d.records,total:n,next:offset+d.records.length<n?offset+d.records.length:null,cursor,completeSnapshot:false};
 }
 if(source.provider==='amazon'){
  const u=new URL(sourceFeedUrl(source));u.searchParams.set('offset',String(offset));const d=await publicJSON(u.toString(),signal),n=total(d.hits);if(!Array.isArray(d.jobs)||d.jobs.length>50||d.error)throw new Error('Invalid Amazon public index');
  const records=d.jobs.filter((r:any)=>['IN','IND'].includes(String(r.country_code))&&r.isPostedExternally!==0&&r.isUnsearchable!==1);if(records.length!==d.jobs.length)throw new Error('Amazon country scope was not honored');
  if(!d.jobs.length&&offset<n)throw new Error('Incomplete Amazon index');return{records,total:n,next:offset+d.jobs.length<n?offset+d.jobs.length:null,cursor,completeSnapshot:false};
 }
 if(source.provider==='microsoft'){
  const u=new URL(sourceFeedUrl(source));u.searchParams.set('start',String(offset));const d=await publicJSON(u.toString(),signal),data=d.data,n=total(data?.count);if(d.status!==200||!Array.isArray(data.positions)||data.positions.length>50)throw new Error('Invalid Microsoft public index');if(!data.positions.length&&offset<n)throw new Error('Incomplete Microsoft index');const records=data.positions.slice(0,5);return{records,total:n,next:offset+records.length<n?offset+records.length:null,cursor,completeSnapshot:false};
 }
 if(source.provider==='workday'){
  const feed=sourceFeedUrl(source),search=async(facets:Record<string,string[]>)=>publicJSON(feed,signal,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appliedFacets:facets,limit:12,offset,searchText:''})});
  let facets=cursor.facets,d:Record<string,any>;
  if(source.country==='IN'&&!facets){d=await search({});if(d.total===0)return{records:[],total:0,next:null,cursor:{...cursor,facets:{}},completeSnapshot:true};const options=(d.facets||[]).flatMap((f:any)=>(f.values||[]).filter((v:any)=>v.descriptor==='India').map((v:any)=>({key:f.facetParameter,id:v.id})));
   if(!options.length||!options.every((x:any)=>typeof x.key==='string'&&typeof x.id==='string'))throw new Error('This Workday board has no verifiable India facet');facets={[options[0].key]:[options[0].id]};d=await search(facets);
  }else d=await search(facets||{});
  // CXS reports total=0 on later pages even while returning valid postings.
  // Carry the verified first-page count rather than treating page two as EOF.
  const n=offset>0&&d.total===0&&cursor.total!==undefined?total(cursor.total):total(d.total);if(offset>0&&d.total===0&&cursor.total===undefined)throw new Error('Workday pagination needs its first-page total');if(!Array.isArray(d.jobPostings)||d.jobPostings.length>12||!d.jobPostings.length&&offset<n)throw new Error('Incomplete Workday public index');
  const records=d.jobPostings.map((r:any)=>({...r,__path:workdayPath(r.externalPath)}));return{records,total:n,next:offset+records.length<n?offset+records.length:null,cursor:{...cursor,facets,total:n},completeSnapshot:true};
 }
 if(source.provider==='oracle'){
  const finder='findReqs;siteNumber='+source.token+',limit=12,offset='+offset+(source.country==='IN'?',locationId='+source.locationId+',location=India':'');if(source.country==='IN'&&!source.locationId)throw new Error('An exact India location ID is required');
  const d=await publicJSON(oracleURL(source,'recruitingCEJobRequisitions',finder,{expand:'requisitionList'}),signal),context=d.items?.[0],n=total(context?.TotalJobsCount);if(!Array.isArray(d.items)||d.items.length!==1||!Array.isArray(context.requisitionList)||context.requisitionList.length>12||!context.requisitionList.length&&offset<n)throw new Error('Incomplete Oracle public index');
  return{records:context.requisitionList,total:n,next:offset+context.requisitionList.length<n?offset+context.requisitionList.length:null,cursor,completeSnapshot:true};
 }
 if(source.provider==='trakstar'){
  const u=new URL(sourceFeedUrl(source));u.searchParams.set('offset',String(offset));const d=await publicJSON(u.toString(),signal),n=total(d.meta?.total??d.meta?.total_count);if(!Array.isArray(d.objects)||d.objects.length>10||d.meta.offset!==offset||!d.objects.length&&offset<n)throw new Error('Incomplete Trakstar public index');
  return{records:d.objects,total:n,next:offset+d.objects.length<n?offset+d.objects.length:null,cursor,completeSnapshot:false};
 }
 if(source.provider==='kula'){
  let paths=cursor.paths;if(!paths){const html=await publicHTML(extendedBoard(source),signal),base='/'+source.token+'/';paths=[...new Set([...html.matchAll(/href=["']([^"']+)["']/g)].map(m=>m[1].replace(/&amp;/g,'&')).filter(p=>p.startsWith(base)&&/^\/[a-zA-Z0-9_-]+\/\d+-[a-zA-Z0-9_%\-/]+$/.test(p)))];if(paths.length>1000)throw new Error('Kula index exceeds the page budget');if(!paths.length&&!/no (?:open |current )?(?:jobs|openings)|0 (?:jobs|openings)/i.test(html))throw new Error('Kula job links could not be validated');}
  const records=paths.slice(offset,offset+10).map(path=>({id:path.split('/').at(-1)!.split('-')[0],__path:path}));return{records,total:paths.length,next:offset+records.length<paths.length?offset+records.length:null,cursor:{...cursor,paths},completeSnapshot:false};
 }throw new Error('Unsupported company feed');
}
export async function companyDetail(source:Source,index:Record<string,any>,signal:AbortSignal){
 if(['amazon','trakstar','google'].includes(source.provider))return index;
 if(source.provider==='microsoft'){const d=await publicJSON('https://apply.careers.microsoft.com/api/pcsx/position_details?domain=microsoft.com&position_id='+safeId(index.id),signal);if(d.status!==200||String(d.data?.id)!==String(index.id)||typeof d.data.jobDescription!=='string')throw new Error('Mismatched Microsoft job detail');return d.data;}
 if(source.provider==='workday'){const path=workdayPath(index.__path),d=await publicJSON(sourceFeedUrl(source).replace(/\/jobs$/,'')+path,signal);if(!d.jobPostingInfo?.jobReqId||typeof d.jobPostingInfo.jobDescription!=='string'||d.jobPostingInfo.canApply===false)throw new Error('Incomplete Workday job detail');return{...d.jobPostingInfo,__path:path};}
 if(source.provider==='oracle'){const fields='Id,Title,ExternalDescriptionStr,ExternalQualificationsStr,ExternalResponsibilitiesStr,PrimaryLocation,PrimaryLocationCountry,ExternalPostedStartDate,ExternalPostedEndDate';const d=await publicJSON(oracleURL(source,'recruitingCEJobRequisitionDetails','ById;Id='+safeId(index.Id)+',siteNumber='+source.token,{fields}),signal);const r=d.items?.[0];if(!Array.isArray(d.items)||d.items.length!==1||String(r?.Id)!==String(index.Id)||typeof r.ExternalDescriptionStr!=='string')throw new Error('Mismatched Oracle job detail');return{...index,...r};}
 if(source.provider==='kula'){const p=String(index.__path||'');if(!p.startsWith('/'+source.token+'/')||!/^\/[a-zA-Z0-9_-]+\/\d+-[a-zA-Z0-9_%\-/]+$/.test(p))throw new Error('Invalid Kula detail path');const html=await publicHTML('https://careers.kula.ai'+p,signal);for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){const d=JSON.parse(m[1]);const nodes=Array.isArray(d)?d:d['@graph']||[d];const job=nodes.find((v:any)=>v?.['@type']==='JobPosting');if(job)return{...job,id:index.id,__path:p};}throw new Error('Kula page has no published JobPosting');}
 throw new Error('Unsupported company detail');
}
export function normalizeCompany(raw:Record<string,any>,source:Source,now:string):Job|null{
 let job:Job|null=null;
 if(source.provider==='google'){const places=raw.locations||[],codes=places.map((p:any)=>p[5]).filter((v:any)=>typeof v==='string');job=normalizePosting({...raw,country:codes.includes('IN')?'IN':undefined},source,now,{id:raw.id,title:raw.title,description:raw.description,location:locationName(places.map((p:any)=>p[0])),url:raw.__url,published:null,type:''});}
 else if(source.provider==='amazon'){const id=safeId(raw.id_icims),path=String(raw.job_path||'');if(!path.startsWith('/en/jobs/'+id+'/')||path.includes('..'))throw new Error('Invalid Amazon public job URL');job=normalizePosting({...raw,country:'IN'},source,now,{id,title:raw.title,description:[raw.description,raw.basic_qualifications,raw.preferred_qualifications].filter(Boolean).join('\n'),location:locationName(raw.city,raw.state,'India'),url:'https://www.amazon.jobs'+path,published:raw.posted_date,type:raw.is_intern?'Internship':String(raw.job_schedule_type||'')});}
 else if(source.provider==='microsoft'){const id=safeId(raw.id),locations=[...(raw.locations||[]),...(raw.standardizedLocations||[])],path=String(raw.positionUrl||'/careers/job/'+id);if(!/^\/careers\/job\/[0-9]+/.test(path))throw new Error('Invalid Microsoft public job URL');job=normalizePosting(raw,source,now,{id,title:raw.name,description:raw.jobDescription,location:locationName(locations),url:'https://apply.careers.microsoft.com'+path,published:typeof raw.postedTs==='number'?new Date(raw.postedTs*1000).toISOString():null,type:String(raw.efcustomTextEmploymentType||''),mode:({onsite:'On-site',hybrid:'Hybrid',remote:'Remote'} as Record<string,string>)[raw.workLocationOption],identity:String(raw.atsJobId||raw.displayJobId||id)});}
 else if(source.provider==='trakstar')job=normalizePosting(raw,source,now,{id:raw.id,title:raw.title,description:raw.description,location:locationName(raw.location?.city,raw.location?.state,raw.location?.country),url:raw.hosted_url,published:raw.created_on,type:String(raw.position_type||'').replaceAll('_',' '),mode:raw.allows_remote===true?'Remote':undefined});
 else if(source.provider==='kula'){const places=(Array.isArray(raw.jobLocation)?raw.jobLocation:[raw.jobLocation]).filter(Boolean).map((p:any)=>p.address||{});job=normalizePosting(raw,source,now,{id:raw.id,title:raw.title,description:raw.description,location:locationName(places.flatMap((p:any)=>[p.addressLocality,p.addressRegion,typeof p.addressCountry==='string'?p.addressCountry:p.addressCountry?.name])),url:'https://careers.kula.ai'+raw.__path,published:raw.datePosted,type:String(raw.employmentType||'').replaceAll('_',' ')});}
 else{job=normalizeExtended(raw,source,now);if(job&&source.provider==='oracle'&&raw.PrimaryLocationCountry==='IN')job.countryCodes=['IN'];}
 if(job&&raw.__path)job.sourceLocator=raw.__path;if(job&&source.country==='IN'&&!indiaLocation(job.location,job.countryCodes))return null;if(job)job.contentCheckedAt=now;return job;
}
export async function verifyCompanyJob(source:Source,old:Job,now:string){
 const signal=AbortSignal.timeout(20000),id=old.id.slice(source.id.length+1);
 if(source.provider==='amazon'){
  const u=new URL(old.url);if(u.hostname!=='www.amazon.jobs'||!u.pathname.startsWith('/en/jobs/'+safeId(id)+'/'))throw new Error('Invalid Amazon job URL');const html=await publicHTML(u.toString(),signal);
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){const d=JSON.parse(m[1]),nodes=Array.isArray(d)?d:d['@graph']||[d],r=nodes.find((v:any)=>v?.['@type']==='JobPosting');if(r){const places=(Array.isArray(r.jobLocation)?r.jobLocation:[r.jobLocation]).map((p:any)=>p?.address||{});return normalizePosting(r,source,now,{id,title:r.title,description:r.description,location:locationName(places.flatMap((p:any)=>[p.addressLocality,p.addressRegion,p.addressCountry])),url:old.url,published:r.datePosted,type:String(r.employmentType||'').replaceAll('_',' ')});}}
  throw new Error('Amazon job could not be independently verified');
 }
 if(source.provider==='google'){const u=new URL(old.url);if(u.hostname!=='www.google.com'||!u.pathname.startsWith('/about/careers/applications/jobs/results/'+safeId(id)+'-'))throw new Error('Invalid Google job URL');const d=googleJobRecords(await publicHTML(u.toString(),signal),{id,url:old.url});if(d.records.length!==1)throw new Error('Google job identity did not match');return normalizeCompany(d.records[0],source,now);}
 if(source.provider==='trakstar'){const d=await publicJSON('https://jsapi.recruiterbox.com/v1/openings/'+safeId(id)+'?client_name='+encodeURIComponent(source.token),signal);if(String(d.id)!==id)throw new Error('Trakstar identity did not match');return normalizeCompany(d,source,now);}
 const raw=await companyDetail(source,{id,Id:id,__path:old.sourceLocator},signal);const job=normalizeCompany(raw,source,now);if(job?.id!==old.id)throw new Error('Employer requisition identity did not match');return job;
}
export async function validateCompanyBoard(source:Source){const signal=AbortSignal.timeout(24000),page=await companyPage(source,{offset:0},signal);if(!page.records.length)return{validated:0,total:page.total};for(const raw of page.records.slice(0,4)){const job=normalizeCompany(await companyDetail(source,raw,signal),source,new Date().toISOString());if(job)return{validated:1,total:page.total};}throw new Error('No India job could be validated from this board');}
