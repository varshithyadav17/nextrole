import {APP,jobUrl} from './workspace.mjs';
const PERIOD=15*60000;
export function createRadar(browser,request,now=()=>Date.now()){
 let running=false;
 const badge=async count=>{try{await browser.action.setBadgeText({text:count?String(Math.min(count,99)):''});await browser.action.setBadgeBackgroundColor({color:'#12634e'});}catch{/* The inbox remains available if a badge cannot render. */}};
 async function check({manual=false}={}){
  const state=await browser.storage.local.get(['token','radarEnabled','radarNotify','radar']);
  if(!state.token||!state.radarEnabled)return {paused:true};
  if(running)return {busy:true};
  if(!manual&&state.radar?.nextCheckAt>now())return {deferred:true};
  running=true;const token=state.token;
  try{
   const response=await request({action:'matched-jobs'},token);
   const current=await browser.storage.local.get(['token','radarEnabled']);if(current.token!==token||!current.radarEnabled)return {changed:true};
   if(!Array.isArray(response.jobs))throw new Error('The job inbox response was incomplete. Try again later.');
   const seen=new Set(),jobs=response.jobs.slice(0,30).filter(job=>{
    try{jobUrl(job.url);}catch{return false;}
    if(typeof job.key!=='string'||job.key.length>500||typeof job.id!=='string'||job.id.length>200||seen.has(job.key)||!job.match?.relevant||job.match.uncertain||job.status||!job.active)return false;
    seen.add(job.key);return true;
   });
   const known=new Set(state.radar?.knownKeys||[]),fresh=jobs.filter(job=>!known.has(job.key)),unread=new Set(state.radar?.unreadKeys||[]);
   for(const job of fresh){known.add(job.key);unread.add(job.key);}
   const keys=new Set(jobs.map(job=>job.key));
   const radar={jobs,knownKeys:[...known].slice(-2000),unreadKeys:[...unread].filter(key=>keys.has(key)),lastSuccess:now(),nextCheckAt:now()+PERIOD,failures:0,error:'',lastSync:response.lastSync,sourceHealth:response.sourceHealth,requiresProfile:response.requiresProfile,alertsEnabled:response.alertsEnabled,hasMore:response.hasMore};
   await browser.storage.local.set({radar});await badge(radar.unreadKeys.length);
   // Start with a quiet baseline. Newly arriving jobs notify once after that.
   if(state.radar?.lastSuccess&&fresh.length&&state.radarNotify&&await browser.permissions.contains({permissions:['notifications']})){
    try{await browser.notifications.create('scout-matches',{type:'basic',iconUrl:browser.runtime.getURL('icons/scout-128.png'),title:'Scout found new job matches',message:fresh.length+' new opening'+(fresh.length===1?'':'s')+' match your saved preference checks. Open NextRole to review.'});}
    catch{await browser.storage.local.set({radar:{...radar,notificationError:'Desktop alerts could not be displayed. Check browser and device notification settings.'}});}
   }
   return {count:jobs.length};
  }catch(error){
   const current=await browser.storage.local.get(['token','radarEnabled']);if(current.token!==token||!current.radarEnabled)return {changed:true};
   const failures=Math.min(10,(state.radar?.failures||0)+1),radar={...(state.radar||{}),error:error.message||'NextRole could not be reached.',failures,nextCheckAt:now()+Math.min(6*3600000,PERIOD*2**(failures-1))};
   if(error.status===401){radar.jobs=[];radar.unreadKeys=[];await browser.storage.local.set({radar,radarEnabled:false});await badge(0);}
   else await browser.storage.local.set({radar});
   return {error:radar.error};
  }finally{running=false;}
 }
 async function toggle(enabled){
  if(enabled){const {token}=await browser.storage.local.get('token');if(!token)throw new Error('Connect NextRole first.');const connection=await request({action:'session'},token);if((await browser.storage.local.get('token')).token!==token)throw new Error('The connection changed. Check your account before enabling job checks.');if(!connection.discovery)throw new Error('Reconnect with Matched-job inbox access. Existing saving-only connections keep their permissions.');}
  await browser.storage.local.set({radarEnabled:enabled});if(enabled)return check({manual:true});return {paused:true};
 }
 async function read(){const {radar}=await browser.storage.local.get('radar');if(radar)await browser.storage.local.set({radar:{...radar,unreadKeys:[]}});await badge(0);return {ok:true};}
 async function reset(){await browser.storage.local.remove('radar');await browser.storage.local.set({radarEnabled:false,radarNotify:false});await badge(0);}
 function open(){return browser.tabs.create({url:APP+'/?tab=discover'});}
 return {check,toggle,read,reset,open};
}
