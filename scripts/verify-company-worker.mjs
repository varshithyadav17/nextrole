import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.resolve('wrangler/package.json')),{Miniflare}=require('miniflare'),{build}=require('esbuild');
const f=JSON.parse(readFileSync(new URL('./fixtures/company-feeds.json',import.meta.url),'utf8'));
const html='<a href="'+f.googlePath+'">Job</a><span>1 jobs matched</span><script>AF_initDataCallback({key:\'ds:1\',hash:\'2\',data:'+JSON.stringify([[f.googleArray]])+',sideChannel:{}});</script>';
const workday={jobReqId:'R101',title:'Software Engineer Intern',jobDescription:'Python internship. No experience required. Thane, India.',location:'Thane',country:{descriptor:'India'},externalUrl:'https://salesforce.wd12.myworkdayjobs.com/External_Career_Site/job/India/Software-Engineer_R101',__path:'/job/India/Software-Engineer_R101'};
const bundle=await build({stdin:{contents:`import {companyPage,companyDetail,normalizeCompany} from './lib/company-feeds.ts';import {SOURCES} from './lib/sources.ts';export default {async fetch(request){const kind=new URL(request.url).searchParams.get('kind'),source=SOURCES.find(s=>s.provider===kind);try{const page=await companyPage(source,{offset:0},AbortSignal.timeout(5000));const raw=await companyDetail(source,page.records[0],AbortSignal.timeout(5000)),job=normalizeCompany(raw,source,'2026-11-14T00:00:00Z');return Response.json({ok:!!job,count:page.records.length,description:!!job?.description});}catch(error){return Response.json({ok:false,error:error.message});}}};`,resolveDir:fileURLToPath(new URL('../',import.meta.url)),loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
let redirect=false,requests=0;const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',outboundService:async request=>{
 requests++;assert(!request.headers.has('authorization'));if(redirect)return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid'}});const u=new URL(request.url);
 if(u.hostname==='www.amazon.jobs')return Response.json({hits:1,jobs:[f.amazon]});
 if(u.hostname==='apply.careers.microsoft.com')return Response.json(u.pathname.endsWith('position_details')?{status:200,data:f.microsoft}:{status:200,data:{count:1,positions:[{id:f.microsoft.id}]}});
 if(u.hostname==='www.google.com')return new Response(html);
 if(u.hostname==='jsapi.recruiterbox.com')return Response.json({objects:[f.trakstar],meta:{total:1,offset:0}});
 if(u.hostname==='careers.kula.ai')return new Response(u.pathname.split('/').filter(Boolean).length===1?'<a href="'+f.kula.__path+'">Job</a>':'<script type="application/ld+json">'+JSON.stringify(f.kula)+'</script>');
 if(u.hostname==='eeho.fa.us2.oraclecloud.com')return Response.json(u.pathname.endsWith('recruitingCEJobRequisitionDetails')?{items:[f.oracle]}:{items:[{TotalJobsCount:1,requisitionList:[{Id:f.oracle.Id}]}]});
 if(u.hostname==='salesforce.wd12.myworkdayjobs.com'){if(!u.pathname.endsWith('/jobs'))return Response.json({jobPostingInfo:workday});const body=await request.json();assert.equal(body.searchText,'');return Response.json(Object.keys(body.appliedFacets).length?{total:1,jobPostings:[{externalPath:workday.__path}]}:{total:2000,facets:[{facetParameter:'country',values:[{descriptor:'India',id:'india-country-id'}]}],jobPostings:[]});}
 throw new Error('Unexpected provider destination');
}});
let checks=0;try{for(const kind of ['amazon','microsoft','google','workday','oracle','kula','trakstar']){redirect=false;let r=await(await mf.dispatchFetch('https://local.test/?kind='+kind)).json();assert(r.ok,kind+': '+r.error);assert(r.description);checks+=2;redirect=true;const before=requests;r=await(await mf.dispatchFetch('https://local.test/?kind='+kind)).json();assert.equal(r.ok,false);assert.equal(requests-before,1);checks+=2;}console.log(JSON.stringify({passed:true,checks,scope:'Seven company importers in native Worker fetch; full details, redirects and public credential isolation'}));}finally{await mf.dispose();}
