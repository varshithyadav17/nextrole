import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {Miniflare}=require('miniflare');
const {build}=require('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url));
const now='2026-10-18T00:00:00.000Z';
const payloads={
 greenhouse:{jobs:[{id:101,internal_job_id:9001,title:'Software Engineer',location:{name:'India'},content:'No prior experience required. Python.',absolute_url:'https://job-boards.greenhouse.io/test/jobs/101'}],meta:{total:1}},
 lever:[{id:'lever1234',text:'Software Engineer',categories:{location:'India',commitment:'Full-time'},descriptionPlain:'No prior experience required. Python.',hostedUrl:'https://jobs.lever.co/test/lever1234',createdAt:Date.parse(now)}],
 ashby:{jobs:[{id:'ashby1234',title:'Software Engineer',location:'India',descriptionPlain:'No prior experience required. Python.',jobUrl:'https://jobs.ashbyhq.com/test/ashby1234',publishedAt:now,employmentType:'FullTime',isListed:true}]},
 jobicy:{success:true,statusCode:200,jobCount:1,hasMore:false,nextCursor:null,jobs:[{id:101,companyName:'Test employer',jobTitle:'Software Engineer',jobDescription:'No prior experience required. Python.',jobGeo:'Anywhere',jobType:['full-time'],jobLevel:'Entry-level',url:'https://jobicy.com/jobs/101-software-engineer',pubDate:now}]},
 status:{success:true,statusCode:200,count:1,jobs:[{id:101,status:'active'}]},
};
const bundled=await build({stdin:{contents:`
 import {fetchSourceJobs} from './lib/job-feeds.ts';
 import {fetchJobicyPage,checkJobicyStatuses} from './lib/jobicy.ts';
 export default {async fetch(request){
  const kind=new URL(request.url).searchParams.get('kind');
  const source={id:'test-'+kind,company:'Test employer',provider:kind,token:kind==='jobicy'?'anywhere':'test',careerUrl:'https://example.test/careers'};
  try{
   const count=kind==='status'?(await checkJobicyStatuses(['101'])).size:kind==='jobicy'?(await fetchJobicyPage(source,'${now}',null)).jobs.length:(await fetchSourceJobs(source,'${now}')).length;
   return Response.json({ok:true,count});
  }catch(error){return Response.json({ok:false,message:error.message});}
 }};`,resolveDir:root,sourcefile:'worker-egress-check.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
let mode='success',unexpected=0,calls=0;
const mf=new Miniflare({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-15',outboundService:async request=>{
 const url=new URL(request.url);calls++;
 const kind=url.hostname==='boards-api.greenhouse.io'?'greenhouse':url.hostname==='api.lever.co'?'lever':url.hostname==='api.ashbyhq.com'?'ashby':url.hostname==='jobicy.com'?(url.pathname.endsWith('/status')?'status':'jobicy'):null;
 if(!kind){unexpected++;return new Response('Unexpected destination',{status:500});}
 if(mode==='redirect')return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/collection'}});
 return Response.json(payloads[kind]);
}});
let checks=0;
try{
 for(const kind of Object.keys(payloads)){
  mode='success';let before=calls;
  let result=await(await mf.dispatchFetch('http://local.test/?kind='+kind)).json();
  assert.equal(result.ok,true,kind+' must fetch through native Worker fetch: '+result.message);checks++;
  assert.equal(result.count,1,kind+' must normalize the complete fixture');checks++;
  assert.equal(calls-before,1,kind+' must use one upstream request');checks++;
  mode='redirect';before=calls;
  result=await(await mf.dispatchFetch('http://local.test/?kind='+kind)).json();
  assert.equal(result.ok,false,kind+' must reject an upstream redirect');checks++;
  assert.equal(calls-before,1,kind+' must never follow the redirect');checks++;
 }
 assert.equal(unexpected,0,'No request may reach the redirect destination');checks++;
 console.log(JSON.stringify({passed:true,checks,scope:'Actual adapters in native Worker fetch with isolated outbound service; no production network or data'}));
}finally{await mf.dispose();}
