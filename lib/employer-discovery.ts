import {db,one} from './store';
import {acquireLease,releaseLease} from './lease';
import {loadSources} from './source-registry';
import {boundedText} from './http-json';
import {isSafeJobUrl} from './matching';
import {employers,platforms,careerLinks,detectEmployerBoard,directoryRows,type EmployerCheck,type EmployerChecks} from './employer-directory';
const KEY='employer_directory_v1';
export async function employerChecks():Promise<EmployerChecks>{const row=await one<{value:string}>('SELECT value FROM meta WHERE key=?',KEY);if(!row)return{};const data=JSON.parse(row.value);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid employer directory checkpoint');return data;}
const later=(check:EmployerCheck|undefined)=>check&&(['detected','needs-url','needs-review','access-required'].includes(check.state)||Date.now()-Date.parse(check.checkedAt)<86400000);
async function page(url:string,originHost:string,signal:AbortSignal){
 for(let redirects=0;redirects<3;redirects++){
  const u=new URL(url);if(!isSafeJobUrl(url)||u.protocol!=='https:'||!(u.hostname===originHost||u.hostname.replace(/^www\./,'')===originHost.replace(/^www\./,'')||detectEmployerBoard(url,'Employer')))throw new Error('redirect-review');
  const response=await fetch(u,{signal,redirect:'manual',headers:{Accept:'text/html,application/xhtml+xml'}});
  if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');await response.body?.cancel();if(!next)throw new Error('redirect-review');url=new URL(next,u).toString();continue;}
  if(!response.ok){await response.body?.cancel();throw new Error([401,403,429].includes(response.status)?'access-required':'unavailable');}
  return{url,html:await boundedText(response,2*1024*1024)};
 }throw new Error('redirect-review');
}
export async function checkEmployer(employer:(typeof employers)[number]):Promise<EmployerCheck>{
 const checkedAt=new Date().toISOString();if(!employer.careersUrl)return{state:'needs-url',checkedAt,reason:'An official careers link still needs verification.'};
 const direct=detectEmployerBoard(employer.careersUrl,employer.name);if(direct)return{state:direct.candidate?'detected':'needs-review',checkedAt,...direct,reason:direct.candidate?'Public board identified. Validate and review access before connecting.':'Platform identified; this portal needs a connector or access review.'};
 try{
  const signal=AbortSignal.timeout(9000),host=new URL(employer.careersUrl).hostname;let result=await page(employer.careersUrl,host,signal);
  let links=[result.url,...careerLinks(result.html,result.url)];let found=links.map(url=>detectEmployerBoard(url,employer.name)).find(Boolean);
  if(!found){const internal=links.find(url=>new URL(url).hostname.replace(/^www\./,'')===host.replace(/^www\./,'')&&/career|\/jobs(?:[/?#]|$)|join-us/i.test(new URL(url).pathname)&&url!==result.url);if(internal){result=await page(internal,host,signal);links=[result.url,...careerLinks(result.html,result.url)];found=links.map(url=>detectEmployerBoard(url,employer.name)).find(Boolean);}}
  return found?{state:found.candidate?'detected':'needs-review',checkedAt,...found,reason:found.candidate?'Public board identified. Validate and review access before connecting.':'Platform identified; this portal needs a connector or access review.'}:{state:'needs-review',checkedAt,reason:'The careers page needs a dedicated connector or a verified public feed.'};
 }catch(error){const code=error instanceof Error?error.message:'';return{state:code==='access-required'?'access-required':'unavailable',checkedAt,reason:code==='access-required'?'The portal limits automated access. Use the official careers page.':code==='redirect-review'?'The careers redirect needs review. Previous listings are preserved.':'The careers page could not be checked. A later check can retry.'};}
}
export async function employerDirectoryStatus(includeRows=false){const sources=await loadSources(),checks=await employerChecks(),entries=directoryRows(sources,checks),counts:Record<string,number>={};for(const entry of entries)counts[entry.state]=(counts[entry.state]||0)+1;return{total:entries.length,platforms:platforms.length,counts,pending:entries.some(e=>e.state!=='connected'&&!later(checks[e.id])&&!!e.careersUrl),...(includeRows?{entries,platformList:platforms}:{})};}
/** Owner maintenance only. No student request triggers public page collection. */
export async function advanceEmployerDirectory(){
 const lease=await acquireLease('employer_directory_scan',45000);if(!lease)return{pending:true,busy:true};
 try{const sources=await loadSources(),checks=await employerChecks(),entries=directoryRows(sources,checks),work=entries.filter(e=>e.state!=='connected'&&e.careersUrl&&!later(checks[e.id])).slice(0,8);const results=await Promise.all(work.map(async e=>({id:e.id,check:await checkEmployer(e)})));for(const result of results)checks[result.id]=result.check;
  if(results.length)await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(KEY,JSON.stringify(checks)).run();
  return{checked:results.length,...await employerDirectoryStatus()};
 }finally{await releaseLease(lease);}
}
