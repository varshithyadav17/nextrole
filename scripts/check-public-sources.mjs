// Read-only live adapter smoke check. No database, identity or API keys are loaded.
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if((specifier.startsWith('.')||specifier.startsWith('/'))&&!/\.(?:mjs|js|json|ts)$/.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const {SOURCES}=await import('../lib/sources.ts');
const {fetchSourceJobs}=await import('../lib/job-feeds.ts');
const {fetchJobicyPage}=await import('../lib/jobicy.ts');
const {PAGED_COMPANY_PROVIDERS,companyPage,companyDetail,normalizeCompany}=await import('../lib/company-feeds.ts');
const selected=process.argv.find(s=>s.startsWith('--source='))?.slice(9);
const sources=selected?SOURCES.filter(s=>s.id===selected):SOURCES;
if(!sources.length)throw new Error('Choose a configured source ID.');
let failed=0,total=0;
for(let i=0;i<sources.length;i+=2){
 const results=await Promise.all(sources.slice(i,i+2).map(async source=>{
  const checkedAt=new Date().toISOString();
  try{let jobs,partial=false,indexTotal;
   if(PAGED_COMPANY_PROVIDERS.includes(source.provider)){const signal=AbortSignal.timeout(28000),page=await companyPage(source,{offset:0},signal);indexTotal=page.total;partial=page.next!==null;const detail=await Promise.all(page.records.slice(0,4).map(raw=>companyDetail(source,raw,signal)));jobs=detail.map(raw=>normalizeCompany(raw,source,checkedAt)).filter(Boolean);partial||=detail.length<page.records.length;}
   else{const page=source.provider==='jobicy'?await fetchJobicyPage(source,checkedAt):null;jobs=page?page.jobs:await fetchSourceJobs(source,checkedAt);partial=!!page?.nextCursor;}
   total+=jobs.length;return{source:source.id,provider:source.provider,checkedAt,ok:true,jobs:jobs.length,partial,indexTotal,internships:jobs.filter(j=>j.jobType==='Internship').length,parsedEligibility:jobs.filter(j=>j.eligibility?.graduation||j.eligibility?.education||j.eligibility?.academics).length};}
  catch{failed++;return{source:source.id,provider:source.provider,checkedAt,ok:false,error:'Feed unavailable, invalid or beyond the bounded adapter limits.'};}
 }));for(const result of results)console.log(JSON.stringify(result));
}
console.log(JSON.stringify({ok:failed===0,feeds:sources.length,failed,totalListings:total,note:'Live public catalogue counts, not personal eligibility or production capacity.'}));
if(failed)process.exitCode=1;
