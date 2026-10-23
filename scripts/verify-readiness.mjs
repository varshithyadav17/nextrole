import assert from 'node:assert/strict';

export async function verifyReadiness({database,put,check,job,raw,source,SOURCES,defaultProfile,keys,goodFit,aiResponse}){
 const {syncJobs,refreshJob}=await import('../lib/sync.ts');
 const {getData}=await import('../lib/store.ts');
 const {createPersonalAlerts,processAlertBatch,requestAlertSweep,drainPushBatch,deliveryStatus}=await import('../lib/alerts.ts');
 const {storedSlots,openKey,connectionState}=await import('../lib/keyring.ts');
 const {analyseJob}=await import('../lib/ai.ts');
 const {PROVIDERS}=await import('../lib/providers.ts');
 const {boundedJSON}=await import('../lib/http-json.ts');
 const {allowRequest}=await import('../lib/rate-limit.ts');
 let oversized=false;try{await boundedJSON(new Response('secret',{headers:{'Content-Length':'9000'}}),100);}catch{oversized=true;}check(oversized,'An oversized upstream response must be rejected before JSON parsing.');
 oversized=false;try{await boundedJSON(new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('x'.repeat(1000)));c.close();}})),50);}catch{oversized=true;}check(oversized,'A streamed response without a size header must remain bounded.');
 check(PROVIDERS.gemini.defaultModel==='gemini-3.5-flash-lite','New Gemini connections must use the current default for new projects.');
 check((await put({action:'ai-save',connection:{slot:1,provider:'openai',model:'gpt-5-mini',label:'Model test',key:keys[0]}},'model-edit')).ok,'A connection for model-update testing must save.');
 const before=(await storedSlots('model-edit'))[0];
 check((await put({action:'ai-update',connection:{slot:1,provider:'openai',model:'gpt-5',label:'Changed model'}},'model-edit')).ok,'A user can change their model without re-entering a secret.');
 const after=(await storedSlots('model-edit'))[0];
 check(after.ciphertext===before.ciphertext&&after.model==='gpt-5'&&await openKey('model-edit',1,after.ciphertext)===keys[0],'A model change must preserve the encrypted owned key.');
 await connectionState('model-edit',1,'ready','Old model completed.',null,before.fingerprint,before.model);
 check((await storedSlots('model-edit'))[0].status==='untested','An old model request cannot mark a newly selected model ready.');
 check((await put({action:'ai-update',connection:{slot:1,provider:'openai',model:'invented-model',label:'Invalid'}},'model-edit')).status===400,'Unsupported model changes must fail validation.');
 check((await put({action:'ai-update',userId:'model-edit',connection:{slot:1,provider:'openai',model:'gpt-5-mini',label:'Wrong user'}},'unrelated-model-user')).status===409,'A client-supplied ID cannot change another account’s model.');
 for(let i=0;i<12;i++)check(await allowRequest('rate-check','external',12),'A source-check allowance must permit its documented requests.');
 check(!await allowRequest('rate-check','external',12),'The source-check allowance must reject excess requests.');

 let calls=0,concurrent=0,peak=0;
 const feed=async input=>{calls++;concurrent++;peak=Math.max(peak,concurrent);await new Promise(r=>setTimeout(r,1));concurrent--;return new Response(JSON.stringify(new URL(String(input)).hostname==='api.lever.co'?[]:new URL(String(input)).hostname==='jobicy.com'?{success:true,statusCode:200,jobCount:0,jobs:[],hasMore:false,nextCursor:null}:{jobs:String(input).includes('/'+source.token+'/')?[raw]:[],meta:{total:String(input).includes('/'+source.token+'/')?1:0}}));};
 globalThis.fetch=feed;
 await database.prepare("DELETE FROM meta WHERE key LIKE 'jobicy_state:%'").run();
 await database.prepare('DELETE FROM meta WHERE key IN (?,?)').bind('source_sweep','last_sync_attempt').run();
 let result=await syncJobs();check(result.sourcesPending&&result.sourceProgress.checked===2,'A normal source refresh must checkpoint after two feeds.');
 let passes=1;while(result.sourcesPending&&passes<Math.ceil(SOURCES.length/2)+2){result=await syncJobs();passes++;}
 check(passes<=SOURCES.length&&calls===SOURCES.length&&!result.sourcesPending,'Source checks must resume exactly once through every connected board.');
 check(peak<=2,'Upstream source payloads must be limited to two concurrent fetches.');
 const priorCalls=calls;check((await syncJobs()).cached&&calls===priorCalls,'A completed source sweep must share its cooldown across users.');
 await put({action:'profile',profile:{...defaultProfile,name:'Outage reminder',completed:true,alerts:false,reminders:true}},'outage-reminder');
 await put({action:'status',jobId:job.id,status:'interested',remindAt:new Date(Date.now()+86400000).toISOString()},'outage-reminder');
 await database.prepare('UPDATE user_jobs SET remind_at=? WHERE user_id=?').bind(new Date(Date.now()-60000).toISOString(),'outage-reminder').run();
 globalThis.fetch=async()=>{calls++;return new Response('{}',{status:503});};
 await database.prepare('DELETE FROM meta WHERE key=?').bind('last_sync_attempt').run();
 result=await syncJobs();while(result.sourcesPending)result=await syncJobs();
 const failureCalls=calls;check((await syncJobs()).cached&&calls===failureCalls,'A total source outage must also respect the shared retry cooldown.');
 const retained=await database.prepare('SELECT active FROM jobs WHERE id=?').bind(job.id).first();check(retained.active===1,'A failed source sweep must preserve previously active records.');
 let outageWork;do{outageWork=await processAlertBatch();}while(outageWork.pending);
 check((await database.prepare("SELECT COUNT(*) as n FROM notifications WHERE user_id=? AND type='reminder'").bind('outage-reminder').first()).n===1,'A total source outage must not suppress a due personal reminder for a saved last-known opening.');


 // The detail timestamp must never make a feed-present job look absent.
 // Advance the synthetic source cooldowns to test recovery, independently of backoff.
 await database.prepare("UPDATE meta SET value=? WHERE key LIKE 'source_retry:%'").bind(new Date(0).toISOString()).run();
 globalThis.fetch=feed;
 await database.prepare('DELETE FROM meta WHERE key=?').bind('last_sync_attempt').run();
 const normalDB=globalThis.__nextroleTestEnv.DB;let interleaved=false;
 globalThis.__nextroleTestEnv.DB={batch:s=>database.batch(s),prepare(sql){const statement=database.prepare(sql);if(!sql.includes('WHERE source_id=? AND active=1 AND feed_checked_at<>?'))return statement;return {bind(...args){const bound=statement.bind(...args);return {async run(){if(!interleaved&&args[1]===source.id){interleaved=true;await database.prepare('UPDATE jobs SET last_checked=? WHERE id=?').bind(new Date(Date.now()+1000).toISOString(),job.id).run();}return bound.run();}};}};}};
 await syncJobs();globalThis.__nextroleTestEnv.DB=normalDB;
 check(interleaved&&(await database.prepare('SELECT active FROM jobs WHERE id=?').bind(job.id).first()).active===1,'A detail check interleaved with ingestion must not close a feed-present opening.');

 // Exercise actual Web Push encryption with generated test keys; no real delivery.
 const base64url=value=>Buffer.from(value).toString('base64url');
 const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 globalThis.__nextroleTestEnv.VAPID_PUBLIC_KEY=base64url(await crypto.subtle.exportKey('raw',vapid.publicKey));
 globalThis.__nextroleTestEnv.VAPID_PRIVATE_KEY=(await crypto.subtle.exportKey('jwk',vapid.privateKey)).d;
 const receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const pushKeys={p256dh:base64url(await crypto.subtle.exportKey('raw',receiver.publicKey)),auth:base64url(crypto.getRandomValues(new Uint8Array(16)))};
 check((await put({action:'profile',profile:{...defaultProfile,name:'Push test',completed:true}},'push-check')).ok,'The push test profile must save.');
 check((await put({action:'subscribe',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/test-invalid',keys:{p256dh:'x'.repeat(65),auth:'a'.repeat(16)}}},'push-check')).status===400,'Malformed push key material must not be registered as a working device.');
 for(let i=0;i<3;i++)check((await put({action:'subscribe',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/test-device-'+i,keys:pushKeys}},'push-check')).ok,'Each of the three supported devices must register.');
 check((await put({action:'subscribe',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/test-device-4',keys:pushKeys}},'push-check')).status===409,'A fourth device must be rejected rather than creating unbounded work.');
 let created=await createPersonalAlerts('push-check');check(created>0,'Relevant new openings must create real in-app notifications.');
 let queued=await database.prepare('SELECT * FROM push_outbox WHERE user_id=?').bind('push-check').first();check(queued&&queued.state==='pending','New notifications and their push outbox entry must commit together.');
 let pushCalls=0;globalThis.fetch=async()=>{pushCalls++;return new Response('',{status:503});};
 let delivery=await drainPushBatch();queued=await database.prepare('SELECT * FROM push_outbox WHERE user_id=?').bind('push-check').first();
 check(pushCalls===3&&queued.attempts===1&&Date.parse(queued.available_at)>Date.now(),'A transient push outage must persist a delayed retry for all supported devices.');
 check((await createPersonalAlerts('push-check'))===0&&(await database.prepare('SELECT revision FROM push_outbox WHERE user_id=?').bind('push-check').first()).revision===queued.revision,'Duplicate notification generation must not reset a retry or enqueue duplicate messages.');
 await database.prepare('UPDATE push_outbox SET available_at=? WHERE user_id=?').bind(new Date(0).toISOString(),'push-check').run();
 globalThis.fetch=async()=>{pushCalls++;return new Response('',{status:201});};
 const drains=await Promise.all(Array.from({length:6},()=>drainPushBatch()));
 check(pushCalls===6&&drains.reduce((n,r)=>n+r.sent,0)===3,'Concurrent queue workers must send one batch rather than duplicate device deliveries.');
 check(!await database.prepare('SELECT user_id FROM push_outbox WHERE user_id=?').bind('push-check').first(),'Successful push delivery must acknowledge the durable queue row.');
 await database.prepare("INSERT INTO push_outbox(user_id,revision,available_at,created_at,state) VALUES(?,?,?,?,?)").bind('push-check','test-revision',new Date(0).toISOString(),new Date().toISOString(),'pending').run();
 check((await put({action:'unsubscribe'},'push-check')).ok,'Browser alerts can be disabled.');
 check(!await database.prepare('SELECT user_id FROM push_outbox WHERE user_id=?').bind('push-check').first(),'Disabling browser alerts must remove pending deliveries.');

 // Clearing an account while alert generation waits for its lease cannot revive it.
 await put({action:'profile',profile:{...defaultProfile,name:'Delete race',completed:true}},'delete-alert');
 let release,started,blocked=false;const ready=new Promise(r=>{started=r;}),gate=new Promise(r=>{release=r;});
 globalThis.__nextroleTestEnv.DB={batch:s=>database.batch(s),prepare(sql){const statement=database.prepare(sql);if(!sql.startsWith('INSERT INTO meta(key,value)'))return statement;return {bind(...args){const bound=statement.bind(...args);if(args[0]!=='byok_mutation:delete-alert'||blocked)return bound;blocked=true;return {async run(){started();await gate;return bound.run();}};}};}};
 const staleAlert=createPersonalAlerts('delete-alert');await ready;
 check((await put({action:'delete-account-data',confirmation:'DELETE'},'delete-alert')).ok,'Account clearing can finish before a stale alert worker acquires its lease.');
 release();check(await staleAlert===0,'A stale alert snapshot must not recreate deleted notifications.');globalThis.__nextroleTestEnv.DB=normalDB;
 check((await database.prepare('SELECT COUNT(*) as n FROM notifications WHERE user_id=?').bind('delete-alert').first()).n===0,'Deleted personal notifications must remain deleted.');

 // Exports include history beyond the 60-row dashboard preview.
 const extra=[];for(let i=0;i<75;i++)extra.push(database.prepare('INSERT INTO notifications(id,user_id,title,body,type,created_at) VALUES(?,?,?,?,?,?)').bind('export-all:'+i,'push-check','Older update','Saved history','match',new Date().toISOString()));for(let i=0;i<extra.length;i+=20)await database.batch(extra.slice(i,i+20));
 const exported=await (await put({action:'export-account'},'push-check')).json();check(exported.notifications.length>=75,'The account export must include notification history beyond the dashboard preview.');

 if(process.argv.includes('--scale')){
  const startedAt=performance.now(),count=1001,now=new Date().toISOString();
  const people=[];for(let i=0;i<count;i++)people.push(database.prepare('INSERT INTO profiles(user_id,data,created_at,updated_at) VALUES(?,?,?,?)').bind('load-'+String(i).padStart(4,'0'),JSON.stringify({...defaultProfile,name:'Synthetic student',completed:true,alerts:i%10===0,reminders:false}),now,now));for(let i=0;i<people.length;i+=40)await database.batch(people.slice(i,i+40));
  const inserts=[];for(let i=0;i<500;i++){const j={...job,id:'scale:'+i,key:'scale:req-'+i,title:'Software Engineering Intern '+i,description:'A'.repeat(34000),firstSeen:now,lastChecked:now,deadline:null,active:true};inserts.push(database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES(?,?,?,?,?,?,1)').bind(j.id,j.key,source.id,JSON.stringify(j),now,now));}for(let i=0;i<inserts.length;i+=20)await database.batch(inserts.slice(i,i+20));
  await requestAlertSweep('scale-'+now);let pages=0,processed=0,work;
  do{work=await processAlertBatch();check(work.processed<=50,'A notification invocation must process at most 50 profiles.');processed+=work.processed;pages++;}while(work.pending&&pages<100);
  check(!work.pending&&processed>=count&&pages>20,'The persisted sweep must resume beyond 1,000 profiles without silently stopping at 500.');
  check((await database.prepare('SELECT COUNT(*) as n FROM notifications WHERE user_id=?').bind('load-1000').first()).n>0,'A student beyond the first 1,000 profiles must receive their eligible in-app updates.');
  const completed=await deliveryStatus();check(!completed.alertsPending&&completed.profilesProcessed>=count,'Maintenance status must report completed backlog processing without exposing account IDs.');
  const latencies=[];let bytes=0;const reads=100,concurrency=10;
  for(let start=0;start<reads;start+=concurrency)await Promise.all(Array.from({length:concurrency},async(_,offset)=>{const began=performance.now();const data=await getData('load-'+String(start+offset).padStart(4,'0'),'Synthetic student');latencies.push(performance.now()-began);bytes=Math.max(bytes,Buffer.byteLength(JSON.stringify(data)));assert.ok(data.jobs.every(j=>j.description===''));}));
  latencies.sort((a,b)=>a-b);check(bytes<2*1024*1024,'A 500-listing workspace must exclude full descriptions and stay below a 2 MB synthetic response budget.');
  console.log(JSON.stringify({syntheticScale:{profiles:count,additionalListings:500,alertPages:pages,profilesProcessed:processed,workspaceReads:reads,readConcurrency:concurrency,p50Ms:Math.round(latencies[Math.floor(latencies.length*.5)]),p95Ms:Math.round(latencies[Math.ceil(latencies.length*.95)-1]),largestWorkspaceBytes:bytes,elapsedMs:Math.round(performance.now()-startedAt),environment:'isolated Miniflare; not production capacity or browser proof'}}));
 }
}
