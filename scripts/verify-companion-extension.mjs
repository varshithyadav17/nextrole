import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openScoutPanel} from '../companion/panel-launcher.mjs';
import {pagePolicy,jobUrl,validateDraft,saveLocalDraft,trustedPage,appJobLink,API} from '../companion/workspace.mjs';
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const rejects=(action,pattern)=>assert.throws(action,pattern);
for(const url of ['https://www.linkedin.com/jobs/view/1','https://in.linkedin.com/jobs/view/1','https://unstop.com/jobs/a','https://internshala.com/internship/detail/1','https://careers.example.org/jobs/1'])check(!pagePolicy(url).canRead,'Restricted and unknown websites use paste, without script injection.');
check(pagePolicy('https://jobs.lever.co/example/abc').canRead,'An individual supported ATS posting can offer a structured preview.');
check(!pagePolicy('https://jobs.lever.co/example').canRead&&!pagePolicy('https://jobs.lever.co.attacker.org/example/abc').canRead,'Employer listing pages and host lookalikes cannot invoke ATS capture.');
for(const url of ['http://jobs.example.org/a','https://name:secret@jobs.example.org/a','https://localhost/a','https://127.0.0.1/a','chrome://extensions','file:///tmp/job']){rejects(()=>jobUrl(url));checks++;}
const draft={url:'https://unstop.com/jobs/abc',title:'Software Engineer Intern',company:'Employer',description:'No prior work experience required. Students graduating in 2027 are eligible. Python and SQL.',mode:'Not specified',jobType:'Internship'};
check(validateDraft(draft).location==='Not specified','Missing data is left unknown, not inferred as eligible.');
rejects(()=>validateDraft({...draft,description:'tiny'}));checks++;
let drafts=saveLocalDraft([],draft);drafts=saveLocalDraft(drafts,{...draft,title:'Updated intern title'});check(drafts.length===1&&drafts[0].data.title==='Updated intern title','Saving a local draft updates one URL rather than duplicating it.');
for(let i=1;i<20;i++)drafts=saveLocalDraft(drafts,{...draft,url:draft.url+i});rejects(()=>saveLocalDraft(drafts,{...draft,url:draft.url+'extra'}));checks++;
const runtime={id:'scout-test',getURL:path=>'chrome-extension://scout-test/'+path};
const sender={id:runtime.id,url:runtime.getURL('panel.html')};
check(trustedPage(sender,runtime)&&!trustedPage({...sender,tab:{id:9}},runtime)&&!trustedPage({...sender,url:'https://www.linkedin.com'},runtime)&&!trustedPage({...sender,id:'other'},runtime),'Only the extension’s exact own pages can request privileged actions.');
check(appJobLink({id:'import-abc',status:'applied'},true).includes('tab=applications')&&appJobLink({id:'a&b'}).includes('job=a%26b'),'Deep links choose the right tracking section and safely encode the job identifier.');
const manifest=JSON.parse(readFileSync(new URL('../companion/manifest.json',import.meta.url)));
check(manifest.manifest_version===3&&manifest.permissions.includes('sidePanel')&&!manifest.permissions.includes('tabs')&&!JSON.stringify(manifest).includes('<all_urls>'),'MV3 uses a side panel and activeTab without broad browsing-history access.');
check(!manifest.host_permissions.some(value=>/linkedin|unstop|internshala/.test(value)),'Restricted boards have no persistent host permission.');
let local={},session={},page='https://www.linkedin.com/jobs/view/1',scriptCalls=0,fetchCalls=[],scanMode='normal',filled=false,submits=0,tabCreates=0;
const events={},get=(data,keys)=>Object.fromEntries((typeof keys==='string'?[keys]:keys||Object.keys(data)).filter(key=>key in data).map(key=>[key,data[key]]));
const storage=data=>({get:async keys=>get(data(),keys),set:async value=>Object.assign(data(),value),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete data()[key];},setAccessLevel:async value=>{events.access=value.accessLevel;}});
globalThis.chrome={storage:{local:storage(()=>local),session:storage(()=>session)},runtime:{...runtime,onInstalled:{addListener:f=>events.install=f},onStartup:{addListener:f=>events.start=f},onMessage:{addListener:f=>events.message=f},onMessageExternal:{addListener:f=>events.external=f}},alarms:{onAlarm:{addListener:f=>events.alarm=f},create:async()=>{}},tabs:{query:async()=>[{id:7,url:page}],create:async()=>{tabCreates++;return {id:8};},sendMessage:async(id,message)=>{
 if(message.kind==='scout-scan'){if(scanMode==='pause')local.enabled=false;return {url:'https://jobs.lever.co/example/abc',closed:false,captcha:false,confirmation:'',fields:[{id:'name',label:'Name',name:'name',type:'text',required:true,value:filled?'Student':''},{id:'email',label:'Email',name:'email',type:'email',required:true,value:filled?'student@example.test':''},{id:'resume',label:'Resume',name:'resume',type:'file',required:true,value:filled?'resume.pdf':''}]};}
 if(message.kind==='scout-fill'){filled=true;return {ok:true};}
 if(message.kind==='scout-submit'){submits++;throw new Error('Port closed after employer action');}
}},action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}},notifications:{onClicked:{addListener:f=>events.notificationClick=f},clear:async()=>{}},permissions:{contains:async()=>false},scripting:{executeScript:async()=>{scriptCalls++;return [{result:null}];}}};
const oldFetch=globalThis.fetch,oldTimeout=globalThis.setTimeout;
globalThis.setTimeout=(callback,ms,...args)=>ms<5000?oldTimeout(callback,0,...args):oldTimeout(callback,ms,...args);
const token='nr_companion_'+'a'.repeat(64),packet={id:crypto.randomUUID(),claim:crypto.randomUUID(),url:'https://jobs.lever.co/example/abc',resume:{sha256:'a'.repeat(64),filename:'resume.pdf',base64:'cGRm'},contact:{name:'Student',email:'student@example.test',links:{}},questions:[],review:[],autoSubmit:true};
let handler=async body=>body.action==='session'?{workspace:true,expiresAt:'2099-01-01'}:body.action==='claim'?{packet}:{allowed:true};
globalThis.fetch=async(url,init)=>{check(url===API&&init.credentials==='omit'&&init.redirect==='error','Requests use the fixed backend and never ambient website cookies or redirects.');const body=JSON.parse(init.body);fetchCalls.push(body);return Response.json(await handler(body,init));};
try{
 const {api,handleMessage,readCurrentJob,run}=await import('../companion/background.mjs');
 check(events.access==='TRUSTED_CONTEXTS','Local token and draft storage is restricted to trusted extension contexts.');
 let result=await handleMessage({kind:'pair',token},{...sender,tab:{id:7}});check(result.error&&fetchCalls.length===0,'Content scripts cannot use the backend proxy.');
 result=await handleMessage({kind:'pair',token},sender);check(result.connection.workspace&&local.token===token&&local.enabled===false,'Pairing is verified with the server and queue assistance stays paused.');
 const previousToken=local.token;handler=async()=>{throw new TypeError('offline');};result=await handleMessage({kind:'pair',token:'nr_companion_'+'b'.repeat(64)},sender);check(result.error&&local.token===previousToken,'An offline pairing attempt does not replace the valid stored token.');
 handler=async body=>body.action==='session'?{workspace:true,expiresAt:'2099-01-01'}:body.action==='claim'?{packet}:{allowed:true};
 for(const url of ['https://www.linkedin.com/jobs/view/1','https://unstop.com/jobs/a','https://internshala.com/internship/detail/1']){page=url;const result=await readCurrentJob();check(result.policy.kind==='paste'&&scriptCalls===0,'Restricted board capture never injects a script.');}
 page='https://jobs.lever.co/example/abc';await readCurrentJob();check(scriptCalls===1,'Known employer capture invokes only the user-requested adapter.');scriptCalls=0;
 local.enabled=true;await events.install({reason:'update'});check(local.enabled===true,'An upgrade preserves the existing paused/enabled choice.');
 session.active={packet,tabId:8};await run();check(session.active&&tabCreates===0,'A previous active attempt cannot be silently discarded by another queue run.');session={};
 local.enabled=true;scanMode='pause';filled=false;fetchCalls=[];await run();check(!filled&&!submits&&fetchCalls.some(body=>body.action==='needs-review'),'Pausing during load prevents PDF/contact filling and submission.');
 local.enabled=true;scanMode='normal';filled=false;fetchCalls=[];submits=0;await run();check(filled&&submits===1&&scriptCalls===0,'A submission with a lost response is never injected or clicked again.');
 check(fetchCalls.some(body=>body.action==='uncertain')&&!fetchCalls.some(body=>body.action==='submitted'),'A lost submission response stays uncertain, never falsely Applied.');
 session={};local.enabled=true;filled=false;fetchCalls=[];handler=async body=>body.action==='claim'?{packet}:{allowed:false};await run();check(!filled&&!fetchCalls.some(body=>body.action==='authorize-submit'),'Server pause/authorization denial prevents filling and submission.');
 await handleMessage({kind:'disconnect'},sender);check(!local.token&&!local.enabled,'Disconnect clears the local credential and disables queue assistance.');
 check(!readFileSync(new URL('../companion/panel.mjs',import.meta.url),'utf8').includes('innerHTML'),'Job text and saved drafts are displayed as text, not executable markup.');
 const calls=[];const launcher={runtime,tabs:{create:async()=>{calls.push('fallback');return {id:5};}},sidePanel:{open:()=>{calls.push('panel');return Promise.resolve();}}};
 const opened=openScoutPanel(launcher,1,()=>calls.push('closed'));check(calls[0]==='panel','The native panel opens inside the original user click, before asynchronous work.');await opened;
 check(calls.join(',')==='panel,closed','A supported browser opens the side panel without opening an extra tab.');
 for(const mode of ['missing','reject','throw']){calls.length=0;launcher.sidePanel=mode==='missing'?undefined:{open:()=>{if(mode==='throw')throw new Error('Unavailable');return Promise.reject(new Error('Unavailable'));}};await openScoutPanel(launcher,1,()=>calls.push('closed'));check(calls.join(',')==='fallback,closed','Missing or rejected side-panel support falls back exactly once.');}
 page=runtime.getURL('panel.html');session.launchTab={id:7};chrome.tabs.get=async id=>({id,url:'https://unstop.com/jobs/from-original-tab'});let recovered=await readCurrentJob();check(recovered.policy.url==='https://unstop.com/jobs/from-original-tab'&&scriptCalls===0,'Extension-tab fallback can recover the deliberately launched job tab without reading restricted board content.');
 chrome.tabs.get=async()=>{throw new Error('Closed tab');};await assert.rejects(()=>readCurrentJob(),/Click the Scout icon/);checks++;
 const mockFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('error code: 1010',{status:403});local.token=token;await assert.rejects(()=>api({action:'session'}),/connection was refused \(403\)/);checks++;
 check(local.token===token,'A refused connection does not discard pairing or local drafts.');globalThis.fetch=mockFetch;
 chrome.notifications=undefined;let permissionAdded,notificationListeners=0;chrome.permissions.onAdded={addListener:listener=>{permissionAdded=listener;}};
 await import('../companion/background.mjs?without-notification-permission');check(typeof permissionAdded==='function','First install can initialise without a notifications namespace before optional permission is granted.');
 chrome.notifications={onClicked:{addListener:()=>{notificationListeners++;}},clear:async()=>{}};permissionAdded({permissions:['notifications']});permissionAdded({permissions:['notifications']});check(notificationListeners===1,'A later optional notification grant registers its click handler exactly once.');

 console.log(JSON.stringify({passed:true,checks,scope:'Companion policy, local drafts, sender boundary, network identity and queue interruption behavior'}));
}finally{globalThis.fetch=oldFetch;globalThis.setTimeout=oldTimeout;delete globalThis.chrome;}
