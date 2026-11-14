import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {registerHooks,createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json')),{Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("isolated scalability test")}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:'scale-test:env',shortCircuit:true};if(specifier.endsWith('/chatgpt-auth'))return {url:'scale-test:auth',shortCircuit:true};try{return next(specifier,context);}catch(error){if((specifier.startsWith('.')||specifier.startsWith('/'))&&!/\.(mjs|js|json|ts)$/.test(specifier))return next(specifier+'.ts',context);throw error;}},load(url,context,next){if(url==='scale-test:env')return {format:'module',source:'export const env=globalThis.__scaleEnv;',shortCircuit:true};if(url==='scale-test:auth')return {format:'module',source:'export async function getChatGPTUser(){return globalThis.__scaleUser;}',shortCircuit:true};return next(url,context);}});
const nativeFetch=globalThis.fetch,originalCaches=globalThis.caches;
try{
 const database=await mf.getD1Database('DB');globalThis.__scaleEnv={DB:database,KEYRING_ENCRYPTION_KEY:'a'.repeat(64)};
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(s=>s.endsWith('.sql')).sort())for(const sql of readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await database.prepare(sql).run();
 const {publicJobChunk,catalogueCacheStatus}=await import('../lib/catalogue-cache.ts');
 const cache=new Map();globalThis.caches={default:{async match(r){return cache.get(r.url)?.clone();},async put(r,value){cache.set(r.url,value.clone());}}};
 const row={ref:1,job_key:'shared-job',data:'{"title":"Software Engineer Intern"}',legacy_description:null,first_seen:new Date().toISOString(),last_checked:new Date().toISOString(),active:1};let loads=0;
 const load=async()=>{loads++;await new Promise(r=>setTimeout(r,5));return [row];};
 await Promise.all(Array.from({length:25},()=>publicJobChunk('100000',0,load)));
 check(loads===1,'Concurrent cache misses must collapse into one source-data read.');
 const again=await publicJobChunk('100000',0,load);check(loads===1&&again[0].ref===1,'An unchanged public revision must reuse cached metadata.');
 check([...cache.values()].every(r=>!r.headers.has('Set-Cookie')),'Shared cache entries must not contain session cookies.');
 await publicJobChunk('100001',0,load);check(loads===2,'A catalogue revision change must invalidate the cached rows.');
 await publicJobChunk('bad-revision',0,load);check(loads===3,'Malformed cache namespaces must fall back to authoritative storage.');
 const clock=Date.now;try{Date.now=()=>clock()+301000;await publicJobChunk('100000',0,load);check(loads===4,'TTL expiry must reload authoritative data even when an old shared entry survives.');}finally{Date.now=clock;}
 let redisCalls=0;globalThis.__scaleEnv.UPSTASH_REDIS_REST_URL='https://cache-owner.upstash.io';globalThis.__scaleEnv.UPSTASH_REDIS_REST_TOKEN='private-cache-fixture';
 globalThis.fetch=async(input,init)=>{redisCalls++;check(String(input)==='https://cache-owner.upstash.io','Only the configured Redis HTTPS origin may receive cache requests.');check(new Headers(init.headers).get('authorization')==='Bearer private-cache-fixture'&&init.redirect==='error','Cache credentials must use an authorization header and redirects must be refused.');throw new Error('Redis outage');};
 await publicJobChunk('100002',0,load);const afterFailure=redisCalls;await publicJobChunk('100003',0,load);check(loads===6&&redisCalls===afterFailure,'A Redis outage must fall back to database reads with a circuit breaker.');
 check(catalogueCacheStatus().fallbacks>0&&!JSON.stringify(catalogueCacheStatus()).includes('private-cache-fixture'),'Cache diagnostics expose counters, never tokens.');
 const cacheClock=Date.now;
 try{
  Date.now=()=>cacheClock()+60000;
  globalThis.fetch=async(input,init)=>{const args=JSON.parse(init.body);check(args[0]==='GET'&&args[1].includes(':100004:'),'Redis reads must use revision-namespaced GET commands.');return Response.json({result:JSON.stringify({version:1,revision:'100004',after:0,expires:Date.now()+300000,rows:[row]})});};
  const loaded=loads;check((await publicJobChunk('100004',0,load))[0].ref===1&&loads===loaded,'A valid Redis hit must avoid the authoritative metadata query.');
 }finally{Date.now=cacheClock;}
 delete globalThis.__scaleEnv.UPSTASH_REDIS_REST_URL;delete globalThis.__scaleEnv.UPSTASH_REDIS_REST_TOKEN;
 const {defaultProfile}=await import('../lib/types.ts'),{extractExperience}=await import('../lib/experience.ts'),{extractEligibility}=await import('../lib/eligibility.ts'),{cataloguePage}=await import('../lib/catalogue.ts');
 const at=new Date().toISOString(),profile={...defaultProfile,name:'PRIVATE_STUDENT_NAME',cgpa:9.1,graduationYear:'2027',roles:['Software engineer'],completed:true};
 const description='No prior professional experience required. Internship building software using TypeScript in Bengaluru, India. Graduating in 2027.';
 const job={id:'scale-job',key:'scale-key',sourceId:'scale',company:'Scale Company',title:'Software Engineer Intern',location:'Bengaluru, India',mode:'On-site',jobType:'Internship',description,url:'https://careers.acme.com/jobs/12345',sourceUrl:'https://careers.acme.com/jobs/12345',publishedAt:null,deadline:null,firstSeen:at,lastChecked:at,active:true,availability:'open',minExperience:0,experienceEvidence:'No prior professional experience required.',skills:['TypeScript'],experienceRequirements:extractExperience(description,'Software Engineer Intern'),eligibility:extractEligibility(description),evidenceComplete:true,evidenceVersion:1};
 await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,canonical_url,active) VALUES(?,?,?,?,?,?,?,1)').bind(job.id,job.key,job.sourceId,JSON.stringify(job),at,at,job.url).run();
 for(const user of ['scale-a','scale-b'])await database.prepare('INSERT INTO profiles(user_id,data,created_at,updated_at) VALUES(?,?,?,?)').bind(user,JSON.stringify(profile),at,at).run();
 await database.prepare('INSERT INTO user_jobs(user_id,job_key,job_id,status,note,updated_at) VALUES(?,?,?,?,?,?)').bind('scale-a',job.key,job.id,'applied','PRIVATE_TRACKING_NOTE',at).run();
 let publicQueries=0;
 globalThis.__scaleEnv.DB=new Proxy(database,{get(target,name){if(name!=='prepare'){const value=target[name];return typeof value==='function'?value.bind(target):value;}return sql=>{if(sql.includes('j.job_key,json_remove')&&sql.includes('ORDER BY j.rowid LIMIT 250'))publicQueries++;return target.prepare(sql);};}});
 const a=await cataloguePage('scale-a',{view:'all'}),firstAccountScans=publicQueries,b=await cataloguePage('scale-b',{view:'all'});
 check(firstAccountScans===1&&publicQueries===firstAccountScans,'A second account must rank from shared metadata with zero additional full catalogue scans.');
 globalThis.__scaleEnv.DB=database;
 check(a.total===0&&b.total===1,'A shared cache hit must still apply each account’s own Applied choice.');
 const applied=await cataloguePage('scale-a',{tab:'applications'});check(applied.jobs[0].note==='PRIVATE_TRACKING_NOTE','Private notes must hydrate correctly after shared ranking.');
 const serialized=(await Promise.all([...cache.values()].map(r=>r.clone().text()))).join('');check(!serialized.includes('PRIVATE_TRACKING_NOTE')&&!serialized.includes('PRIVATE_STUDENT_NAME')&&!serialized.includes('scale-a'),'Shared metadata caches must contain no private notes, profiles or account identifiers.');
 await database.prepare("UPDATE user_jobs SET status='dismissed' WHERE user_id='scale-a'").run();
 const changed=await cataloguePage('scale-a',{tab:'archive'});check(changed.jobs[0].status==='dismissed','Tracking changes must invalidate private rankings independently of shared public metadata.');
 await database.prepare('UPDATE jobs SET active=0 WHERE id=?').bind(job.id).run();check((await cataloguePage('scale-b',{view:'all'})).total===0,'Closing an opening must invalidate the shared cache before its TTL.');check((await cataloguePage('scale-a',{tab:'archive'})).jobs.length===1,'Closed tracked jobs must remain in the owner’s history.');
 const {POST}=await import('../app/api/market/route.ts'),{saveConnection}=await import('../lib/keyring.ts'),{normalizeMarketResult,isVacancyUrl}=await import('../lib/market-search.ts');
 const identity=user=>({userId:user,displayName:'Private Student',email:user+'@example.test'});
 const request=(body,user='web-a',origin='https://nextrole.test')=>{globalThis.__scaleUser=user?identity(user):null;return POST(new Request('https://nextrole.test/api/market',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));};
 const input={action:'search',consent:'USE_MY_WEB_SEARCH_CREDITS',query:'software engineer internships India',filters:{view:'all'}};
 check((await request(input,null)).status===401,'Anonymous callers cannot use private web search.');
 check((await request(input,'web-a','https://evil.test')).status===403,'Cross-origin callers cannot spend search credits.');
 check((await request({...input,consent:undefined})).status===400,'A web search must include explicit credit-use consent.');
 check((await request({...input,userId:'someone-else'})).status===400,'A request cannot choose another account or credit owner.');
 let providerCalls=0,providerBodies=[],failMode='';
 const lead={title:'Software Engineer Intern',company:'Acme',location:'Bengaluru, India',description,url:'https://careers.acme.com/jobs/54321'};
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));check(['api.openai.com','generativelanguage.googleapis.com','vertexaisearch.cloud.google.com'].includes(url.hostname),'Web discovery may call only the selected provider and its citation redirect, never a crawled arbitrary URL.');
  if(url.hostname==='vertexaisearch.cloud.google.com')return new Response(null,{status:302,headers:{Location:lead.url}});
  providerCalls++;const body=JSON.parse(init.body);providerBodies.push(body);check(!init.body.includes('PRIVATE_STUDENT_NAME')&&!init.body.includes('9.1')&&!init.body.includes('@example.test'),'Only public job preferences may enter a search prompt.');
  if(failMode==='timeout')throw new Error('ambiguous network failure');
  if(failMode==='quota')return Response.json({error:{code:'insufficient_quota'}},{status:429});
  if(url.hostname==='generativelanguage.googleapis.com')return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({summary:'Found',jobs:[lead]})}]},groundingMetadata:{webSearchQueries:['software intern India'],groundingChunks:[{web:{uri:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/test',title:'Acme vacancy'}}],searchEntryPoint:{renderedContent:'<p>Google Search suggestions</p>'}}}]});
  return Response.json({output:[...(failMode==='no-tool'?[]:[{type:'web_search_call',status:'completed',action:{sources:[{url:lead.url,title:'Acme vacancy'}]}}]),{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'Found',jobs:[lead,{...lead,url:'https://careers.uncited.com/jobs/987'}]}),annotations:[]}]}]});
 };
 const noKey=await (await request(input,'web-no-key')).json();check(!noKey.ok&&providerCalls===0,'Missing keys must never borrow another user’s connection or a global key.');
 for(const user of ['web-a','web-b','web-timeout','web-no-tool']){
  await database.prepare('INSERT INTO profiles(user_id,data,created_at,updated_at) VALUES(?,?,?,?)').bind(user,JSON.stringify(profile),at,at).run();
  await saveConnection(user,{slot:1,provider:'openai',model:'gpt-5-mini',label:'My OpenAI',key:'sk-test-private-'+user+'-1234567890'});
 }
 let result=await (await request(input)).json();check(result.ok&&result.jobs.length===1&&result.jobs[0].url===lead.url,'Only a concrete vacancy URL present in provider search evidence may be returned.');
 check(providerBodies[0].tools[0].type==='web_search'&&providerBodies[0].tool_choice==='required'&&providerBodies[0].max_tool_calls===2,'The provider must run live search with a bounded hosted-tool budget.');
 check(providerBodies[0].reasoning.effort!=='minimal','GPT-5 web search must use supported reasoning effort.');
 const before=providerCalls,cached=await (await request(input)).json();check(cached.cached&&providerCalls===before,'An identical private search must reuse its six-hour cache without another billable call.');
 await request(input,'web-b');check(providerCalls===before+1,'A different account must use its own connection, never the first account’s AI cache.');
 const save=await request({action:'save',resultId:result.resultId,url:lead.url});check(save.ok,'The owner can explicitly save a sourced lead.');const saved=await save.json();
 const stored=await database.prepare('SELECT data,job_key FROM imported_jobs WHERE user_id=? AND id=?').bind('web-a',saved.jobId).first();check(stored&&JSON.parse(stored.data).availability==='unknown'&&JSON.parse(stored.data).evidenceComplete===false,'A saved web lead remains unverified and cannot become a confirmed match.');
 await database.prepare('UPDATE user_jobs SET status=?,note=? WHERE user_id=? AND job_key=?').bind('applied','KEEP_APPLICATION_NOTE','web-a',stored.job_key).run();
 await request({action:'save',resultId:result.resultId,url:lead.url});const state=await database.prepare('SELECT status,note FROM user_jobs WHERE user_id=? AND job_key=?').bind('web-a',stored.job_key).first();check(state.status==='applied'&&state.note==='KEEP_APPLICATION_NOTE','Saving an already Applied lead must preserve its status and notes.');
 check((await request({action:'save',resultId:result.resultId,url:lead.url},'web-b')).status===409,'Another user cannot save from a copied private result identifier.');
 check((await request({action:'save',resultId:result.resultId,url:'https://careers.other.com/jobs/123'})).status===404,'Client substitutions cannot add an uncited result through the save endpoint.');
 failMode='no-tool';const noTool=await (await request(input,'web-no-tool')).json();check(!noTool.ok,'Model text without an actual search-tool result must be rejected.');
 await saveConnection('web-timeout',{slot:2,provider:'gemini',model:'gemini-3.5-flash-lite',label:'Second',key:'AIza-test-secondary-1234567890'});failMode='timeout';const calls=providerCalls,timeout=await (await request(input,'web-timeout')).json();check(!timeout.ok&&providerCalls===calls+1,'An ambiguous provider result must stop instead of automatically charging the fallback key.');
 failMode='';await saveConnection('web-gemini',{slot:1,provider:'gemini',model:'gemini-3.5-flash-lite',label:'Gemini',key:'AIza-test-gemini-1234567890'});
 const gemini=await (await request(input,'web-gemini')).json();check(gemini.ok&&gemini.jobs.length===1&&gemini.searchSuggestions.includes('Google Search'),'Gemini citations must resolve through its fixed redirect and preserve its Search suggestions.');
 check(providerBodies.at(-1).tools[0].googleSearch,'Gemini web discovery must use Google Search grounding.');
 const reject=['https://careers.acme.com/jobs','https://careers.acme.com/jobs/search?q=intern','https://127.0.0.1/jobs/123','https://host.internal/jobs/123','https://careers.acme.com:444/jobs/123','javascript:alert(1)'];check(reject.every(url=>!isVacancyUrl(url)),'Reject career indexes, private endpoints, unexpected ports and script URLs.');
 const normalized=normalizeMarketResult({summary:'Any claim',jobs:[lead,{...lead,url:lead.url+'?utm_source=test'}],citations:[{url:lead.url,title:'Acme'}],searchSuggestions:'',retrievedAt:at});check(normalized.jobs.length===1&&!normalized.summary.includes('Any claim'),'Canonical deduplication and fixed summaries must prevent duplicate leads or unsupported provider claims.');
 await database.prepare('UPDATE analyses SET created_at=? WHERE id=?').bind(new Date(Date.now()-7*3600000).toISOString(),result.resultId).run();check((await request({action:'save',resultId:result.resultId,url:lead.url})).status===409,'Expired private web results cannot be saved as current leads.');
 const {build}=require('esbuild'),{mkdir,rm}=await import('node:fs/promises'),{pathToFileURL}=await import('node:url');
 const uiFile=new URL('../node_modules/.cache/nextrole-company-test.mjs',import.meta.url);await mkdir(new URL('.',uiFile),{recursive:true});
 try{await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import CompanyBrowser from './app/company-browser.tsx';import {SOURCES} from './lib/sources.ts';export const markup=renderToStaticMarkup(React.createElement(CompanyBrowser,{facets:[],sources:SOURCES,view:'for-you',countsReady:false,onView(){},onExplore(){}}));`,resolveDir:new URL('../',import.meta.url).pathname,loader:'tsx'},outfile:uiFile.pathname,format:'esm',platform:'node',bundle:true,packages:'external',jsx:'automatic'});const {markup}=await import(pathToFileURL(uiFile.pathname).href);check(markup.includes('<h2>Google</h2>')&&markup.includes('<h2>Revvity</h2>'),'The actual Companies component must render Google and Revvity before personal counts are available.');check(markup.includes('<strong>—</strong>')&&markup.includes('Loading job counts'),'Unavailable counts must render as pending rather than fabricated zeros.');}finally{await rm(uiFile,{force:true});}
 console.log(JSON.stringify({passed:true,checks,scope:'Shared cache collapse, TTL/revision invalidation, account isolation, Redis outage, actual catalogue/history, credit consent, provider citations, private AI cache, explicit saving and ambiguous-result handling; isolated fixtures only'}));
}finally{globalThis.fetch=nativeFetch;globalThis.caches=originalCaches;await mf.dispose();}
