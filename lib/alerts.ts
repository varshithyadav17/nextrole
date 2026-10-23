import {availabilityUnconfirmed} from './availability';
import {db,one,rows} from './store';
import {matchJob,needsReminder} from './matching';
import {withExperienceRequirements} from './experience';
import {matchesView} from './job-selection';
import {defaultProfile,type Job,type Profile} from './types';
import {acquireLease,releaseLease} from './lease';
import {deliverPush} from './webpush';

type Sweep={target:string;cursor:string;processed:number;complete:boolean;startedAt:string;completedAt?:string};
type Person={user_id:string;data:string};
type State={job_key:string;status:string;remind_at:string|null};
type Alert={id:string;jobKey:string;title:string;body:string;type:'match'|'reminder'|'change';createdAt:string};
const BATCH_SIZE=50;
export async function requestAlertSweep(target:string){await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('alerts_target',target).run();}
async function activeMetadata(){const raw=await rows<{data:string;legacy_description:string|null;first_seen:string;last_checked:string}>("SELECT json_remove(data,'$.description') as data,CASE WHEN (COALESCE(json_extract(data,'$.experienceRequirements.version'),0)<3 OR COALESCE(json_extract(data,'$.eligibility.version'),0)<2) THEN json_extract(data,'$.description') ELSE NULL END as legacy_description,first_seen,last_checked FROM jobs WHERE active=1");return [...new Map(raw.map(r=>{const j=withExperienceRequirements({...JSON.parse(r.data),description:r.legacy_description||'',...(r.legacy_description&&r.legacy_description.length>=35000?{evidenceComplete:false}:{}),firstSeen:r.first_seen,lastChecked:r.last_checked,active:true} as Job);return[j.key,j] as const;})).values()].filter(j=>!availabilityUnconfirmed(j));}
async function personAlerts(person:Person,jobs:Job[]){
 const lease=await acquireLease('byok_mutation:'+person.user_id);if(!lease)return {busy:true,count:0};
 try{
  // Re-read after the lease: clearing a workspace must not recreate deleted alerts.
  const latest=await one<Person>('SELECT user_id,data FROM profiles WHERE user_id=?',person.user_id);if(!latest)return {busy:false,count:0};
  let profile:Profile;try{profile={...defaultProfile,...JSON.parse(latest.data)};}catch{return {busy:false,count:0};}if(!profile.completed)return {busy:false,count:0};
  const now=new Date().toISOString(),day=now.slice(0,10);
  const [states,notified]=await Promise.all([rows<State>('SELECT job_key,status,remind_at FROM user_jobs WHERE user_id=?',person.user_id),rows<{job_key:string;type:string}>("SELECT job_key,type FROM notifications WHERE user_id=? AND (type='match' OR (type='reminder' AND created_at>=?))",person.user_id,day)]);
  const handled=new Set(states.filter(s=>s.status!=='new').map(s=>s.job_key)),seen=new Set(notified.filter(n=>n.type==='match').map(n=>n.job_key)),reminded=new Set(notified.filter(n=>n.type==='reminder').map(n=>n.job_key));
  const alerts:Alert[]=[],reminders:State[]=[];
  if(profile.alerts){const candidates=jobs.filter(j=>!seen.has(j.key)&&!handled.has(j.key)&&Date.now()-Date.parse(j.lastChecked)<24*3600000).map(j=>({j,match:matchJob(j,profile)})).filter(r=>matchesView(r.match)).sort((a,b)=>b.match.score-a.match.score);for(const {j} of candidates.slice(0,30))alerts.push({id:person.user_id+':new:'+j.key,jobKey:j.key,title:j.title,body:j.company+' · '+j.location,type:'match',createdAt:now});}
  let reminderJobs=jobs;
  if(profile.reminders&&states.some(s=>s.job_key.startsWith('personal:')&&s.status==='interested')){const personal=await rows<{data:string}>('SELECT data FROM imported_jobs WHERE user_id=?',person.user_id);reminderJobs=[...jobs,...personal.map(row=>JSON.parse(row.data) as Job)];}
  if(profile.reminders){const byKey=new Map(reminderJobs.map(j=>[j.key,j]));for(const state of states){if(reminders.length===30)break;const j=byKey.get(state.job_key);if(!j||availabilityUnconfirmed(j)||reminded.has(j.key)||!needsReminder(state.status,j.active,j.deadline,state.remind_at,new Date()))continue;alerts.push({id:person.user_id+':reminder:'+j.key+':'+day,jobKey:j.key,title:'Saved: '+j.title,body:j.deadline?'Employer deadline: '+new Date(j.deadline).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})+'. Review and apply if you are ready.':'Your chosen reminder: review this saved opening.',type:'reminder',createdAt:now});reminders.push(state);}}
  if(profile.reminders){
   const changed=await rows<{job_key:string;title:string;company:string;at:string;summary:string}>("SELECT j.job_key,json_extract(j.data,'$.title') as title,json_extract(j.data,'$.company') as company,json_extract(j.data,'$.change.at') as at,json_extract(j.data,'$.change.summary') as summary FROM user_jobs u JOIN jobs j ON j.id=u.job_id WHERE u.user_id=? AND u.status='interested' AND json_extract(j.data,'$.change.at')>=? AND NOT EXISTS(SELECT 1 FROM notifications n WHERE n.id=?||j.job_key||':'||json_extract(j.data,'$.change.at')) ORDER BY at LIMIT 20",person.user_id,new Date(Date.now()-14*86400000).toISOString(),person.user_id+':change:');
   for(const j of changed)alerts.push({id:person.user_id+':change:'+j.job_key+':'+j.at,jobKey:j.job_key,title:'Updated: '+j.title,body:j.company+' · '+j.summary,type:'change',createdAt:now});
  }
  if(!alerts.length)return {busy:false,count:0};
  const statements:D1PreparedStatement[]=[];
  // 12 x 7 binds stays below D1's 100-parameter limit.
  for(let i=0;i<alerts.length;i+=12){const chunk=alerts.slice(i,i+12);statements.push(db().prepare('INSERT OR IGNORE INTO notifications(id,user_id,job_key,title,body,type,created_at,push_pending) VALUES '+chunk.map(()=>'(?,?,?,?,?,?,?,1)').join(',')).bind(...chunk.flatMap(a=>[a.id,person.user_id,a.jobKey,a.title,a.body,a.type,a.createdAt])));}
  const insertCount=statements.length;
  statements.push(db().prepare("INSERT INTO push_outbox(user_id,revision,attempts,available_at,created_at,state) SELECT ?,?,0,?,?,'pending' WHERE EXISTS(SELECT 1 FROM notifications WHERE user_id=? AND push_pending=1) AND EXISTS(SELECT 1 FROM subscriptions WHERE user_id=?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,attempts=0,available_at=excluded.available_at,state='pending'").bind(person.user_id,crypto.randomUUID(),now,now,person.user_id,person.user_id));
  statements.push(db().prepare('UPDATE notifications SET push_pending=0 WHERE user_id=? AND push_pending=1').bind(person.user_id));
  const custom=reminders.filter(s=>s.remind_at);if(custom.length)statements.push(db().prepare('UPDATE user_jobs SET remind_at=NULL WHERE user_id=? AND ('+custom.map(()=>'(job_key=? AND remind_at=?)').join(' OR ')+')').bind(person.user_id,...custom.flatMap(s=>[s.job_key,s.remind_at])));
  // Notification insertion and outbox enqueue commit together; a retry is idempotent.
  const results=await db().batch(statements);return {busy:false,count:results.slice(0,insertCount).reduce((sum,r)=>sum+Number(r.meta.changes||0),0)};
 }finally{await releaseLease(lease);}
}
export async function createPersonalAlerts(userId:string){const person=await one<Person>('SELECT user_id,data FROM profiles WHERE user_id=?',userId);if(!person)return 0;return (await personAlerts(person,await activeMetadata())).count;}
export async function processAlertBatch(){
 const lease=await acquireLease('alerts_worker',60000);if(!lease)return {processed:0,notifications:0,pending:true,busy:true};
 try{
  const target=(await one<{value:string}>('SELECT value FROM meta WHERE key=?','alerts_target'))?.value;if(!target)return {processed:0,notifications:0,pending:false,busy:false};
  const saved=await one<{value:string}>('SELECT value FROM meta WHERE key=?','alerts_state');let state:Sweep|undefined;try{state=saved?JSON.parse(saved.value):undefined;}catch{}
  if(!state||(state.complete&&state.target!==target))state={target,cursor:'',processed:0,complete:false,startedAt:new Date().toISOString()};
  if(state.complete)return {processed:0,notifications:0,pending:false,busy:false};
  const people=await rows<Person>('SELECT user_id,data FROM profiles WHERE user_id>? ORDER BY user_id LIMIT 51',state.cursor),jobs=await activeMetadata();
  let processed=0,notifications=0,busy=false;const started=Date.now();
  for(const person of people.slice(0,BATCH_SIZE)){if(Date.now()-started>15000)break;const result=await personAlerts(person,jobs);if(result.busy){busy=true;break;}notifications+=result.count;state.cursor=person.user_id;state.processed++;processed++;}
  state.complete=processed===people.length&&people.length<=BATCH_SIZE;
  if(state.complete)state.completedAt=new Date().toISOString();
  await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('alerts_state',JSON.stringify(state)).run();
  const latestTarget=(await one<{value:string}>('SELECT value FROM meta WHERE key=?','alerts_target'))?.value;
  return {processed,notifications,pending:!state.complete||state.target!==latestTarget,busy};
 }finally{await releaseLease(lease);}
}
export async function drainPushBatch(){
 const lease=await acquireLease('push_worker',60000);if(!lease)return {processed:0,sent:0,pending:true,busy:true};
 try{
  const now=new Date().toISOString();
  const work=await rows<{user_id:string;revision:string;attempts:number}>("SELECT user_id,revision,attempts FROM push_outbox WHERE state='pending' AND available_at<=? ORDER BY available_at LIMIT 25",now);
  const results:{sent:number;failed:number}[]=[];const started=Date.now();
  for(let offset=0;offset<work.length;offset+=2){if(Date.now()-started>8000)break;results.push(...await Promise.all(work.slice(offset,offset+2).map(async item=>{
   const p=await one<{data:string}>('SELECT data FROM profiles WHERE user_id=?',item.user_id);let profile:Profile|null=null;try{profile=p?JSON.parse(p.data):null;}catch{}
   const unread=profile?await one<{n:number}>("SELECT COUNT(*) as n FROM notifications WHERE user_id=? AND read_at IS NULL AND ((type='match' AND ?=1) OR (type IN ('reminder','change') AND ?=1))",item.user_id,Number(profile.alerts),Number(profile.reminders)):null;
   const result=unread?.n?await deliverPush(item.user_id,{title:'Your NextRole updates are ready',body:'New matches and saved-job reminders are waiting in your workspace.',url:'/?updates=1'}):{sent:0,failed:0};
   if(result.failed){const attempts=item.attempts+1;await db().prepare('UPDATE push_outbox SET attempts=?,available_at=?,state=? WHERE user_id=? AND revision=?').bind(attempts,new Date(Date.now()+Math.min(7200000,60000*5**item.attempts)).toISOString(),attempts>=5?'failed':'pending',item.user_id,item.revision).run();}
   else await db().prepare('DELETE FROM push_outbox WHERE user_id=? AND revision=?').bind(item.user_id,item.revision).run();
   return result;
  })));}
  const due=await one<{n:number}>("SELECT COUNT(*) as n FROM push_outbox WHERE state='pending' AND available_at<=?",new Date().toISOString());
  return {processed:results.length,sent:results.reduce((n,r)=>n+r.sent,0),pending:!!due?.n,busy:false};
 }finally{await releaseLease(lease);}
}
export async function deliveryStatus(){
 const [target,saved,queue]=await Promise.all([one<{value:string}>('SELECT value FROM meta WHERE key=?','alerts_target'),one<{value:string}>('SELECT value FROM meta WHERE key=?','alerts_state'),one<{pending:number;failed:number;due:number;oldest:string|null}>("SELECT COALESCE(SUM(state='pending'),0) as pending,COALESCE(SUM(state='failed'),0) as failed,COALESCE(SUM(state='pending' AND available_at<=?),0) as due,MIN(created_at) as oldest FROM push_outbox",new Date().toISOString())]);
 let state:Sweep|undefined;try{state=saved?JSON.parse(saved.value):undefined;}catch{}
 return {alertsPending:!!target&&(!state?.complete||state.target!==target.value),profilesProcessed:state?.processed||0,lastAlertsCompletedAt:state?.completedAt||null,push:queue};
}
