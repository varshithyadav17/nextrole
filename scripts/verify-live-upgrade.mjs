import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire,registerHooks} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {Miniflare}=require('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test");}}',d1Databases:['DB'],compatibilityDate:'2026-05-15'});
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='cloudflare:workers')return {url:'nextrole-upgrade:env',shortCircuit:true};
  try{return next(specifier,context);}catch(error){if((specifier.startsWith('.')||specifier.startsWith('/'))&&!/\.(mjs|js|json|ts)$/.test(specifier))return next(specifier+'.ts',context);throw error;}
 },
 load(url,context,next){if(url==='nextrole-upgrade:env')return {format:'module',source:'export const env=globalThis.__nextroleTestEnv;',shortCircuit:true};return next(url,context);}
});
const database=await mf.getD1Database('DB');globalThis.__nextroleTestEnv={DB:database};
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
 const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort();
 const apply=async names=>{for(const name of names)for(const sql of readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await database.prepare(sql).run();};
 await apply(migrations.slice(0,8));
 const {SOURCES,SOURCE_REGISTRY}=await import('../lib/sources.ts');
 const {defaultProfile}=await import('../lib/types.ts');
 const {normalizeJobicy,normalizeGreenhouse}=await import('../lib/job-feeds.ts');
 const board=SOURCES.find(s=>s.provider==='jobicy'),now=new Date().toISOString(),old=new Date(Date.now()-7200000).toISOString();
 check(board.id==='jobicy-worldwide'&&board.token==='anywhere','The live provider ID and scope remain unchanged on upgrade.');
 const raw={id:721001,jobTitle:'Software Engineer',companyName:'Upgrade Fixture',jobGeo:'India',jobLevel:'Entry-level',jobType:['Full-Time'],jobDescription:'No prior experience required. Python.',url:'https://jobicy.com/jobs/721001-software-engineer',pubDate:old};
 const jobs=Array.from({length:3},(_,i)=>{const job=normalizeJobicy({...raw,id:raw.id+i,url:'https://jobicy.com/jobs/'+(raw.id+i)+'-software-engineer'},board,old);delete job.provenance;delete job.evidenceVersion;job.availability='open';job.availabilityCheckedAt=old;job.active=i!==0;job.experienceRequirements={...job.experienceRequirements,version:2};return job;});
 const profile={...defaultProfile,completed:true,roles:['Software engineer']};
 await database.prepare('INSERT INTO profiles(user_id,data,created_at,updated_at) VALUES(?,?,?,?)').bind('upgrade-student',JSON.stringify(profile),old,old).run();
 for(let i=0;i<jobs.length;i++){
  const j=jobs[i];await database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,feed_checked_at,canonical_url,active) VALUES(?,?,?,?,?,?,?,?,?)').bind(j.id,j.key,j.sourceId,JSON.stringify(j),old,old,old,j.canonicalUrl,Number(j.active)).run();
  await database.prepare('INSERT INTO user_jobs(user_id,job_key,job_id,status,stage,note,updated_at) VALUES(?,?,?,?,?,?,?)').bind('upgrade-student',j.key,j.id,['applied','interested','dismissed'][i],i===0?'Interviewing':null,'Keep note '+i,old).run();
 }
 await database.prepare('INSERT INTO meta(key,value) VALUES(?,?)').bind('source_sweep',JSON.stringify({startedAt:now,cursor:20,imported:3,successful:20,failures:[],complete:false,registry:SOURCE_REGISTRY})).run();
 const cursor='live-v14-opaque+cursor/=';
 await database.prepare('INSERT INTO meta(key,value) VALUES(?,?)').bind('jobicy_state:'+board.id,JSON.stringify({version:1,startedAt:now,phase:'feed',cursor,pages:1,seen:[jobs[0].id],imported:1,statusCursor:''})).run();
 await apply(migrations.slice(8));
 check(migrations.length===14,'The upgrade applies the six pending additive migrations, including application-link intents.');
 check((await database.prepare('SELECT COUNT(*) as n FROM user_jobs WHERE user_id=?').bind('upgrade-student').first()).n===3,'Migrations preserve every existing tracking row.');
 check(!!await database.prepare('SELECT revision FROM user_catalogue_versions WHERE user_id=?').bind('upgrade-student').first(),'Existing users receive a catalogue generation without resetting their profiles.');
 const requests=[];
 globalThis.fetch=async input=>{const u=new URL(String(input));requests.push(u);if(u.hostname==='api.lever.co')return Response.json([]);if(u.pathname.endsWith('/status')){const ids=u.searchParams.get('ids').split(',');return Response.json({success:true,statusCode:200,count:ids.length,jobs:ids.map(id=>({id:Number(id),status:'active'}))});}return Response.json({success:true,statusCode:200,jobCount:0,jobs:[],hasMore:false,nextCursor:null});};
 const {syncJobs}=await import('../lib/sync.ts');let result=await syncJobs();for(let i=0;result.sourcesPending&&i<3;i++)result=await syncJobs();
 check(!result.sourcesPending&&result.sourceProgress.checked===SOURCES.length&&!result.failures.length,'The unfinished live sweep completes without forcing or restarting.');
 check(requests[0].searchParams.get('cursor')===cursor&&requests[0].searchParams.get('geo')==='anywhere','The existing opaque cursor and original filter survive upgrade unchanged.');
 const retained=(await database.prepare('SELECT job_key,status,stage,note FROM user_jobs WHERE user_id=? ORDER BY job_id').bind('upgrade-student').all()).results;
 check(retained.every((r,i)=>r.job_key===jobs[i].key&&r.status===['applied','interested','dismissed'][i]&&r.note==='Keep note '+i),'Source resume preserves Applied, Interested, Not interested, keys and notes.');
 check(retained[0].stage==='Interviewing'&&(await database.prepare('SELECT active FROM jobs WHERE id=?').bind(jobs[0].id).first()).active===0,'A known closed application remains in its original stage and is not reopened by absence.');
 const {getData}=await import('../lib/store.ts');const data=await getData('upgrade-student','Student');
 check(data.jobs.filter(j=>jobs.some(old=>old.id===j.id)).length===3,'The upgraded workspace still returns closed and handled history.');
 const source=SOURCES[0],titleJob=normalizeGreenhouse({id:721099,internal_job_id:721099,title:'Software Engineer | Experience: 4–8 yrs',content:'Full-time. This is an on-site role.',location:{name:'Bengaluru, India'},absolute_url:'https://job-boards.greenhouse.io/'+source.token+'/jobs/721099'},source,now);
 titleJob.experienceRequirements={...titleJob.experienceRequirements,version:2,minimum:null,maximum:null};titleJob.minExperience=null;
 const {matchJob}=await import('../lib/matching.ts');check(!matchJob(titleJob,profile).relevant,'The title-experience fix still rejects the screenshot regression with old metadata.');
 const {locationFit}=await import('../lib/location.ts');check(locationFit({location:'Anywhere',mode:'Remote',sourceCategory:'job-board'},['India']).unknownRemote,'Legacy Jobicy Anywhere metadata also requires a country eligibility review.');
 const {mailReady}=await import('../lib/digests.ts');check(!mailReady(),'Deployment without sender configuration does not activate mail delivery.');
 console.log(JSON.stringify({passed:true,checks,upgrade:'live v14 schema and checkpoint to focused NextRole with retained v17 compatibility',pendingMigrations:6,productionDataUsed:false}));
}finally{await mf.dispose();}
