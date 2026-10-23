import {planForm,allowedApplicationUrl,sameApplicationUrl} from './planner.mjs';
import {API,pagePolicy,jobUrl,trustedPage} from './workspace.mjs';
import {createRadar} from './radar.mjs';
import {createConnection} from './connection.mjs';
let running=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const config=()=>chrome.storage.local.get(['token','enabled']);
async function status(text){await chrome.storage.local.set({status:text,checkedAt:new Date().toISOString()});}
export async function api(body,providedToken){
 const token=providedToken||(await config()).token;
 if(!token)throw new Error('Pair your own NextRole account in Connection first.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(API,{method:'POST',credentials:'omit',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
  const text=await response.text();if(text.length>3000000)throw new Error('The response was too large. Open this job in NextRole.');
  let data;try{data=JSON.parse(text);}catch{
   if(response.status===403)throw new Error('The connection was refused (403). Check that NextRole opens normally, then try Check connection. Your local drafts are kept.');
   if(response.status===429)throw new Error('Too many requests. Keep a local draft and try again in a minute.');
   throw new Error('NextRole is temporarily unavailable. Your local drafts are safe.');
  }
  if(!response.ok){const error=new Error(response.status===401?'Pairing expired or was revoked. Reconnect NextRole.':data.error||'NextRole could not complete this request.');error.status=response.status;throw error;}
  return data;
 }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw new Error('Could not reach NextRole. Keep a local draft and try again when online.');throw error;}
 finally{clearTimeout(timer);}
}
export const radar=createRadar(chrome,api);
export async function pairToken(value){
 if(running||(await chrome.storage.session.get('active')).active)throw new Error('Review the active application before replacing this connection.');
 const token=String(value||'');if(!/^nr_companion_[a-f0-9]{64}$/.test(token))throw new Error('Use a connection from your own NextRole account.');
 const connection=await api({action:'session'},token);
 await radar.reset();await chrome.storage.session.remove('form');
 await chrome.storage.local.set({token,enabled:false,connection,status:'Connected. Queue assistance and job checks are paused.'});return {connection};
}
export const connection=createConnection(chrome,pairToken);
async function send(tabId,message){try{return await chrome.tabs.sendMessage(tabId,message);}catch{if(message.kind!=='scout-scan')throw new Error('The employer action did not return a reliable result. Check the open tab before continuing.');await chrome.scripting.executeScript({target:{tabId},files:['content.js']});return chrome.tabs.sendMessage(tabId,message);}}
const report=(packet,action,extra={},token)=>api({id:packet.id,claim:packet.claim,action,url:packet.url,sha256:packet.resume.sha256,...extra},token);
async function enabled(token){const current=await config();if(!current.enabled||current.token!==token)throw new Error('Scout is paused or the pairing changed. Review the employer tab yourself.');}
export async function run(){
 if(running)return;const {enabled:allowed,token}=await config();if(!allowed||!token)return;running=true;let packet=null,attempted=false,ownsActive=false;
 try{
  const active=await chrome.storage.session.get('active');if(active.active){await status('A previous application needs review. Open Connection before running another.');return;}
  const result=await api({action:'claim'},token);if(!result.packet){await status(result.message||'No application is queued.');return;}packet=result.packet;
  await enabled(token);if(!allowedApplicationUrl(packet.url))throw new Error('This application is outside the supported employer ATS sites.');
  const tab=await chrome.tabs.create({url:packet.url,active:true}),tabId=tab.id;
  await chrome.storage.session.set({active:{packet,tabId}});ownsActive=true;
  let scanned;for(let i=0;i<15;i++){await wait(1000);await enabled(token);try{scanned=await send(tabId,{kind:'scout-scan'});if(scanned.fields?.length)break;}catch{}}
  if(!scanned||!sameApplicationUrl(scanned.url,packet.url))throw new Error('The application page moved or did not load.');
  if(scanned.closed)throw new Error('The source says this opening is closed.');
  if(scanned.confirmation)throw new Error('This page already shows a confirmation. Check whether you applied before.');
  if(scanned.captcha)throw new Error('Complete the CAPTCHA yourself before proceeding.');
  const plan=planForm(scanned.fields,packet);
  const fillPermission=await report(packet,'authorize-fill',{url:scanned.url},token);if(!fillPermission.allowed)throw new Error('Application assistance is paused.');
  await enabled(token);const filled=await send(tabId,{kind:'scout-fill',expectedUrl:packet.url,plan,resume:packet.resume});if(filled?.error)throw new Error(filled.error);
  await wait(1500);await enabled(token);const after=await send(tabId,{kind:'scout-scan'});
  if(!sameApplicationUrl(after.url,packet.url)||after.closed||after.confirmation)throw new Error('The application page changed. Review it yourself.');
  const missing=after.fields.filter(f=>(f.required&&!f.value)||f.valid===false).map(f=>'Add '+f.label),blockers=[...plan.blockers,...missing,...(after.captcha?['Complete the CAPTCHA yourself.']:[]),...(packet.review||[])];
  if(!packet.autoSubmit||blockers.length){await report(packet,'needs-review',{url:after.url,note:(!packet.autoSubmit?'Filled for your review. ':'')+blockers.join(' ').slice(0,430)},token);await status('Review the filled employer tab, submit yourself, then confirm Applied in NextRole.');return;}
  await enabled(token);const permission=await report(packet,'authorize-submit',{url:after.url},token);if(!permission.allowed)throw new Error('Automatic submission was not authorized.');
  await enabled(token);attempted=true;const submitted=await send(tabId,{kind:'scout-submit',expectedUrl:packet.url});if(!submitted?.clicked)throw new Error(submitted?.error||'The form was not submitted.');
  for(let i=0;i<20;i++){await wait(1500);try{const latest=await send(tabId,{kind:'scout-scan'});if(sameApplicationUrl(latest?.url,packet.url)&&latest.confirmation){await report(packet,'submitted',{url:latest.url,confirmation:latest.confirmation},token);await status('Employer confirmation observed. Saved to NextRole Applications.');return;}}catch{}}
  await report(packet,'uncertain',{note:'No reliable employer confirmation was observed. Check the employer tab; never repeat automatically.'},token);await status('Result uncertain. Check the employer tab. Scout will not retry automatically.');
 }catch(error){if(packet)try{await report(packet,attempted?'uncertain':'needs-review',{note:String(error.message).slice(0,500)},token);}catch{}await status(error.message||'Scout stopped. Check NextRole and the employer tab.');}
 finally{if(ownsActive)await chrome.storage.session.remove('active');running=false;}
}
export async function readCurrentJob(){
 let [tab]=await chrome.tabs.query({active:true,currentWindow:true});
 if(tab?.url===chrome.runtime.getURL('panel.html')){
  const {launchTab}=await chrome.storage.session.get('launchTab');
  try{tab=launchTab?await chrome.tabs.get(launchTab.id):null;}catch{tab=null;}
 }
 if(!tab?.url)throw new Error('Click the Scout icon while your job tab is active, or paste the original job link yourself.');
 const policy=pagePolicy(tab?.url||'');
 // Deliberately no script injection on LinkedIn, Unstop, Internshala or unknown sites.
 if(!policy.canRead)return {policy};
 const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{
  const found=[];function scan(value,depth=0){if(depth>8||!value)return;if(Array.isArray(value)){value.slice(0,100).forEach(item=>scan(item,depth+1));return;}if(typeof value!=='object')return;const type=value['@type'];if(type==='JobPosting'||Array.isArray(type)&&type.includes('JobPosting'))found.push(value);else if(value['@graph'])scan(value['@graph'],depth+1);}
  for(const node of Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0,30)){if(node.textContent.length>300000)continue;try{scan(JSON.parse(node.textContent));}catch{}}
  if(found.length!==1)return null;const job=found[0];
  const clean=value=>{const template=document.createElement('template');template.innerHTML=String(value||'').slice(0,100000);template.content.querySelectorAll('script,style').forEach(node=>node.remove());return (template.content.textContent||'').trim();};
  const places=(Array.isArray(job.jobLocation)?job.jobLocation:[job.jobLocation]).slice(0,10).map(place=>{const a=place?.address||{};return [a.addressLocality,a.addressRegion,typeof a.addressCountry==='string'?a.addressCountry:a.addressCountry?.name].filter(x=>typeof x==='string').join(', ');}).filter(Boolean).join(' · ');
  const type=String(job.employmentType||'');return {title:clean(job.title).slice(0,250),company:clean(job.hiringOrganization?.name).slice(0,100),description:clean(job.description).slice(0,35000),location:places.slice(0,1000)||'Not specified',mode:job.jobLocationType==='TELECOMMUTE'?'Remote':'Not specified',jobType:/INTERN/i.test(type)?'Internship':/FULL_TIME/i.test(type)?'Full-time':/CONTRACTOR|TEMPORARY/i.test(type)?'Contract':'Not specified'};
 }});
 return {policy,data:result||null};
}
export async function handleMessage(message,sender){
 if(!trustedPage(sender,chrome.runtime))return {error:'This action is available only in Scout’s own panel.'};
 if(!message||typeof message!=='object')return {error:'Invalid companion action.'};
 try{
  if(message.kind==='pair')return await pairToken(message.token);
  if(message.kind==='connect'){if(running||(await chrome.storage.session.get('active')).active)throw new Error('Review the active application before reconnecting.');await chrome.storage.local.set({enabled:false});return await connection.begin();}
  if(message.kind==='disconnect'){await radar.reset();await chrome.storage.session.remove(['pendingConnection','form']);await chrome.storage.local.remove(['token','connection']);await chrome.storage.local.set({enabled:false,status:'Disconnected in this browser. Revoke the connection in NextRole to invalidate it everywhere.'});return {ok:true};}
  if(message.kind==='radar-toggle')return await radar.toggle(message.enabled===true);
  if(message.kind==='radar-check')return await radar.check({manual:true});
  if(message.kind==='radar-poll')return await radar.check();
  if(message.kind==='radar-read')return await radar.read();
  if(message.kind==='session'){const connection=await api({action:'session'});await chrome.storage.local.set({connection});return {connection};}
  if(message.kind==='read-current')return await readCurrentJob();
  if(message.kind==='workspace'){
   if(!['lookup-job','import-job','job-status'].includes(message.body?.action))throw new Error('Unsupported workspace action.');
   if(message.body.action!=='job-status')jobUrl(message.body.url);
   return await api(message.body);
  }
  if(message.kind==='run'){await run();return {ok:true};}
  if(message.kind==='clear-active'){
   if(running)throw new Error('Pause and let the current check finish first.');
   if(message.confirmation!=='REVIEWED_ATTEMPT')throw new Error('Check the employer page first.');
   const {active}=await chrome.storage.session.get('active');
   if(active?.packet)try{await report(active.packet,'uncertain',{note:'User reviewed an interrupted browser attempt. No automatic retry is allowed.'});}catch{/* Expired/revoked claims remain on the server for review; never resend an application. */}
   await chrome.storage.session.remove('active');await status('Previous attempt left for review in NextRole.');return {ok:true};
  }
  return {error:'Unsupported companion action.'};
 }catch(error){return {error:error.message||'Scout could not complete this action.'};}
}
void chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='scout-queue')void run();if(alarm.name==='scout-radar')void radar.check();});
chrome.runtime.onInstalled.addListener(details=>{
 if(details.reason==='install'){void chrome.storage.local.set({enabled:false,radarEnabled:false,radarNotify:false,status:'Connect your NextRole account when ready.'});void chrome.tabs.create({url:chrome.runtime.getURL('panel.html')});}
 void chrome.alarms.create('scout-queue',{periodInMinutes:1});
 void chrome.alarms.create('scout-radar',{periodInMinutes:15});
});
chrome.runtime.onStartup.addListener(()=>{void chrome.alarms.create('scout-queue',{periodInMinutes:1});void chrome.alarms.create('scout-radar',{periodInMinutes:15});void radar.check();});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{if(!trustedPage(sender,chrome.runtime))return;void handleMessage(message,sender).then(respond);return true;});
chrome.runtime.onMessageExternal.addListener((message,sender,respond)=>{void connection.finish(message,sender).then(respond);return true;});
let notificationClickRegistered=false;
function registerNotificationClick(){
 const notifications=chrome.notifications;
 if(notificationClickRegistered||!notifications?.onClicked)return;
 notifications.onClicked.addListener(id=>{if(id==='scout-matches'){void radar.open();void notifications.clear(id);}});notificationClickRegistered=true;
}
registerNotificationClick();
chrome.permissions.onAdded?.addListener(({permissions=[]})=>{if(permissions.includes('notifications'))registerNotificationClick();});
