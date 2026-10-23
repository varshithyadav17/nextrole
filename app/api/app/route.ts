import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {db,getData,getProfile,getJob,getJobRecord,one,rows} from '../../../lib/store';
import {importJob} from '../../../lib/import-jobs';
import {clearResumeFiles} from '../../../lib/resume-files';
import {scanJobs} from '../../../lib/job-scan';
import type {JobView} from '../../../lib/types';
import {defaultProfile,type Job} from '../../../lib/types';
import {syncJobs,createAlerts,refreshJob} from '../../../lib/sync';
import {analyseJob} from '../../../lib/ai';
import {validPushEndpoint,validPushKeys} from '../../../lib/webpush';
import {nextReminderCheck} from '../../../lib/reminders';
import {saveConnection,getAIOverview,swapConnections,updateConnection} from '../../../lib/keyring';
import {searchJobs,keywordSearchJobs} from '../../../lib/search';
import {requestJSON} from '../../../lib/request-json';
import {z} from 'zod';
import {PublicError} from '../../../lib/errors';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {allowRequest} from '../../../lib/rate-limit';
import {isHost} from '../../../lib/admin';
import {clearAuthorizations} from '../../../lib/bridge/site';
import {safeEvent,indiaDay,feedbackColumns,engagement} from '../../../lib/product';
import {validDate} from '../../../lib/job-timing';
import {recordApplicationOpen,dismissApplicationIntent} from '../../../lib/today';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const stringList=z.array(z.string().trim().min(1).max(100)).max(20);
const profileSchema=z.object({name:z.string().trim().min(1).max(80),roles:stringList.min(1),locations:stringList.min(1),modes:z.array(z.enum(['On-site','Hybrid','Remote'])).min(1),skills:stringList,experience:z.number().min(0).max(40),graduationYear:z.string().regex(/^(\d{4})?$/),degree:z.string().max(150),cgpa:z.number().min(0).max(10).nullable().optional().default(null),cgpaScale:z.union([z.literal(4),z.literal(10)]).optional().default(10),percentage:z.number().min(0).max(100).nullable().optional().default(null),availableFrom:z.string().max(10).optional().default('').refine(s=>!s||validDate(s)),availableMonths:z.number().int().min(1).max(24).nullable().optional().default(null),jobTypes:z.array(z.enum(['Full-time','Internship','Contract'])).min(1),alerts:z.boolean(),reminders:z.boolean(),completed:z.boolean()}).refine(p=>p.cgpa===null||p.cgpa<=p.cgpaScale,{message:'CGPA exceeds its scale'});
export async function GET(request?:Request){const user=await getChatGPTUser();if(!user)return response({error:'Please sign in with ChatGPT.'},401);try{return response({...await getData(user.userId,user.displayName,!request||new URL(request.url).searchParams.get('workspace')!=='1'),role:isHost(user)?'host':'student'});}catch{return response({error:'Your workspace is temporarily unavailable. Please refresh in a moment.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return response({error:'Please sign in with ChatGPT.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return response({error:'This request must come from NextRole.'},403);
 let mutationLease:Lease|null=null;
 let deletionLease:Lease|null=null;
 try{
  const body=await requestJSON(request,128*1024);if(!body||typeof body!=='object'||Array.isArray(body))return response({error:'Please send a valid action.'},400);const now=new Date().toISOString();
  if(['verify','refresh'].includes(body.action)&&!await allowRequest(user.userId,'external',12))return response({error:'Please wait a minute before another source check.'},429);
  if(['application-open','dismiss-intent','profile','status','read','subscribe','unsubscribe','ai-save','ai-update','ai-remove','ai-toggle','ai-swap','ai-settings','delete-account-data','import-job','remove-import'].includes(body.action)){
   if(!await allowRequest(user.userId,'write',120))return response({error:'Please wait a minute before saving more changes.'},429);
   mutationLease=await acquireLease('byok_mutation:'+user.userId);
   if(!mutationLease)return response({error:'Another workspace change is being saved. Please wait a moment and try again.'},409);
  }
  if(body.action==='application-open'){const result=await recordApplicationOpen(user.userId,z.string().max(200).parse(body.jobId));await safeEvent(user,'apply_open',undefined,true);return response(result);}
  if(body.action==='dismiss-intent')return response(await dismissApplicationIntent(user.userId,z.string().max(200).parse(body.jobId)));
  if(body.action==='import-job')return response(await importJob(user.userId,body.import));
  if(body.action==='remove-import'){
   const id=z.string().regex(/^import-[a-f0-9]{32}$/).parse(body.jobId);
   if(body.confirmation!=='DELETE')return response({error:'Confirm deletion of this import, its tracking and saved preparation versions.'},400);
   const imported=await getJobRecord(user.userId,id);if(!imported)return response({error:'Imported opening not found.'},404);
   await db().batch([db().prepare('DELETE FROM application_intents WHERE user_id=? AND job_key=?').bind(user.userId,imported.job_key),db().prepare('DELETE FROM application_records WHERE user_id=? AND job_key=?').bind(user.userId,imported.job_key),db().prepare('DELETE FROM application_events WHERE user_id=? AND job_key=?').bind(user.userId,imported.job_key),db().prepare('DELETE FROM scout_threads WHERE user_id=? AND job_key=?').bind(user.userId,imported.job_key),db().prepare('DELETE FROM imported_jobs WHERE user_id=? AND id=?').bind(user.userId,id),db().prepare('DELETE FROM user_jobs WHERE user_id=? AND job_key=?').bind(user.userId,imported.job_key),db().prepare('DELETE FROM notifications WHERE user_id=? AND job_key=?').bind(user.userId,imported.job_key),db().prepare('DELETE FROM application_kits WHERE user_id=? AND job_key=?').bind(user.userId,imported.job_key),db().prepare('DELETE FROM analyses WHERE user_id=? AND job_key IN (?,?)').bind(user.userId,'fit:'+imported.job_key,'fit-v2:'+imported.job_key)]);return response({ok:true});
  }
  if(body.action==='ai-save'){await saveConnection(user.userId,body.connection);await safeEvent(user,'ai_connection_saved',undefined,true);return response({ok:true,ai:await getAIOverview(user.userId)});}
  if(body.action==='ai-update'){await updateConnection(user.userId,body.connection);return response({ok:true,ai:await getAIOverview(user.userId)});}
  if(body.action==='ai-remove'){const slot=z.number().int().min(1).max(3).parse(body.slot);await db().prepare('DELETE FROM api_slots WHERE user_id=? AND slot=?').bind(user.userId,slot).run();return response({ok:true,ai:await getAIOverview(user.userId)});}
  if(body.action==='ai-swap'){const b=z.object({from:z.number().int().min(1).max(3),to:z.number().int().min(1).max(3)}).parse(body);if(b.from!==b.to)await swapConnections(user.userId,b.from,b.to);return response({ok:true,ai:await getAIOverview(user.userId)});}
  if(body.action==='ai-toggle'){const slot=z.number().int().min(1).max(3).parse(body.slot);const enabled=z.boolean().parse(body.enabled);await db().prepare('UPDATE api_slots SET enabled=? WHERE user_id=? AND slot=?').bind(Number(enabled),user.userId,slot).run();return response({ok:true,ai:await getAIOverview(user.userId)});}
  if(body.action==='ai-settings'){
   const b=z.object({autoFallback:z.boolean(),dailyLimit:z.number().int().min(1).max(200)}).parse(body.settings);
   await db().prepare('INSERT INTO ai_settings(user_id,auto_fallback,daily_limit,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET auto_fallback=excluded.auto_fallback,daily_limit=excluded.daily_limit,updated_at=excluded.updated_at').bind(user.userId,Number(b.autoFallback),b.dailyLimit,now).run();return response({ok:true,ai:await getAIOverview(user.userId)});
  }
  if(body.action==='ai-search'||body.action==='keyword-search'){
   const b=z.object({query:z.string().trim().min(2).max(500),filters:z.object({company:z.string().max(100).optional(),role:z.string().max(100).optional(),mode:z.string().max(40).optional(),view:z.string().max(20).optional()}).default({})}).parse(body);
   const search=body.action==='keyword-search'?keywordSearchJobs:searchJobs;
   const result=await search(user.userId,b.query,await getProfile(user.userId),b.filters);await safeEvent(user,body.action==='keyword-search'?'keyword_search':'ai_search');await safeEvent(user,result.kind==='ai'?'ai_result':'basic_result');return response(result);
  }
  if(body.action==='export-applications'){
   const applications:JobView[]=[];for await(const item of scanJobs(user.userId,await getProfile(user.userId),true))if(item.job.status==='applied')applications.push(item.job);
   return response({applications});
  }
  if(body.action==='export-account'){
   const data=await getData(user.userId,user.displayName,false),tracked:JobView[]=[];for await(const item of scanJobs(user.userId,data.profile,true))tracked.push(item.job);await safeEvent(user,'export');return response({applicationIntents:await rows('SELECT job_id,opened_at,dismissed_at FROM application_intents WHERE user_id=? ORDER BY opened_at DESC',user.userId),resumeFiles:await rows('SELECT id,name,role,bytes,sha256,data,created_at,updated_at FROM resume_files WHERE user_id=? ORDER BY created_at',user.userId),resumeFileNotice:'Download original binaries from the private résumé library separately. Storage keys and companion tokens are excluded.',scoutConversations:await rows('SELECT job_key,data,updated_at FROM scout_threads WHERE user_id=? ORDER BY updated_at',user.userId),automationSettings:await one('SELECT data,updated_at FROM automation_settings WHERE user_id=?',user.userId),automationHistory:await rows("SELECT id,job_key,state,json_remove(data,'$.claim','$.claimExpires','$.claimedKit','$.claimedPdf') as data,created_at,updated_at FROM automation_queue WHERE user_id=? ORDER BY created_at",user.userId),applicationRecords:await rows("SELECT job_key,json_extract(data,'$.title') as title,json_extract(data,'$.role') as role,json_extract(data,'$.milestones') as milestones,json_extract(data,'$.submitted.sha256') as resume_sha256,updated_at FROM application_records WHERE user_id=?",user.userId),applicationEvents:await rows('SELECT kind,COUNT(*) as count FROM application_events WHERE user_id=? GROUP BY kind',user.userId),applicationHistoryExport:'/api/applications?export=1',applicationHistoryNotice:'The streamed archive contains complete submitted documents and raw timeline events; this JSON contains summaries. Concurrent edits may appear with their individual update timestamps.',digestSettings:await one('SELECT email,enabled,last_sent_at,updated_at FROM digest_settings WHERE user_id=?',user.userId),digestHistory:await rows('SELECT day,state,data,created_at,updated_at FROM digest_outbox WHERE user_id=? ORDER BY day',user.userId),careerProfile:await one('SELECT data,revision,updated_at FROM career_profiles WHERE user_id=?',user.userId),applicationKits:await rows('SELECT data,created_at,updated_at FROM application_kits WHERE user_id=? ORDER BY created_at DESC',user.userId),importedJobs:await rows('SELECT data,created_at,updated_at FROM imported_jobs WHERE user_id=? ORDER BY created_at DESC',user.userId),feedback:await rows('SELECT '+feedbackColumns+' FROM feedback WHERE user_id=? ORDER BY created_at',user.userId),activeTimeEstimate:await rows('SELECT day,section,seconds FROM product_activity_days WHERE user_id=? ORDER BY day,section',user.userId),usageAnalytics:await rows('SELECT day,kind,COUNT(*) as count FROM product_events WHERE user_id=? GROUP BY day,kind',user.userId),analyticsSettings:await engagement(user.userId),exportedAt:now,profile:data.profile,trackedJobs:tracked,notifications:await db().prepare('SELECT id,job_key,title,body,type,created_at,read_at FROM notifications WHERE user_id=? ORDER BY created_at DESC,id DESC').bind(user.userId).all().then(r=>r.results),aiConnections:data.ai.slots,aiSettings:{autoFallback:data.ai.autoFallback,dailyLimit:data.ai.dailyLimit},notice:'API secrets are never included in exports.'});
  }
  if(body.action==='delete-account-data'){
   if(body.confirmation!=='DELETE')return response({error:'Type DELETE to confirm removal of your workspace data.'},400);
   deletionLease=await acquireLease('byok_lock:'+user.userId,90000);
   if(!deletionLease)return response({error:'Wait for your AI request to finish before clearing workspace data.'},409);
   await clearResumeFiles(user.userId);
   await clearAuthorizations(user.userId);
   await db().prepare('DELETE FROM meta WHERE key=?').bind('companion_workspace:'+user.userId).run();
   await db().batch(['application_intents','scout_threads','automation_queue','automation_settings','automation_tokens','digest_outbox','digest_settings','application_events','application_records','catalogue_snapshots','imported_jobs','career_profiles','application_kits','api_slots','ai_settings','analyses','notifications','subscriptions','push_outbox','user_jobs','profiles','feedback','product_events','product_people','product_activity_minutes','product_activity_days','user_catalogue_versions'].map(table=>db().prepare('DELETE FROM '+table+' WHERE user_id=?').bind(user.userId)).concat([db().prepare('INSERT INTO engagement_settings(user_id,analytics_enabled,survey_month,updated_at) VALUES(?,0,?,?) ON CONFLICT(user_id) DO UPDATE SET analytics_enabled=0,survey_month=excluded.survey_month,updated_at=excluded.updated_at').bind(user.userId,indiaDay().slice(0,7),now)]));
   await db().prepare("DELETE FROM meta WHERE (key LIKE 'byok_count:%' AND substr(key,23)=?) OR (key LIKE 'byok_minute:%' AND substr(key,30)=?) OR (key LIKE 'request_count:%' AND substr(key,32) IN (?,?,?,?,?,?))").bind(user.userId,user.userId,'write:'+user.userId,'external:'+user.userId,'telemetry:'+user.userId,'feedback:'+user.userId,'catalogue:'+user.userId,'bridge:'+user.userId).run();
   return response({ok:true});
  }
  if(body.action==='profile'){
   const previousProfile=await getProfile(user.userId);const p=profileSchema.parse(body.profile);await db().prepare('INSERT INTO profiles(user_id,data,created_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(user.userId,JSON.stringify({...defaultProfile,...p,completed:true}),now,now).run();await safeEvent(user,previousProfile.completed?'profile_saved':'profile_completed',previousProfile.completed?undefined:'activation',true);return response({ok:true});
  }
  if(body.action==='status'){
   const b=z.object({jobId:z.string().max(200),status:z.enum(['interested','applied','dismissed','restore']),stage:z.enum(['Applied','Interviewing','Offer','Rejected','Withdrawn']).optional(),note:z.string().max(3000).optional(),remindAt:z.string().nullable().optional()}).parse(body);
   const r=await getJobRecord(user.userId,b.jobId);if(!r)return response({error:'This job could not be found.'},404);
   if(b.status==='restore'){await db().prepare("UPDATE user_jobs SET status='new',stage=NULL,remind_at=NULL,updated_at=? WHERE user_id=? AND job_key=?").bind(now,user.userId,r.job_key).run();return response({ok:true});}
   if(b.remindAt&&(!Number.isFinite(Date.parse(b.remindAt))||Date.parse(b.remindAt)<Date.now()))return response({error:'Choose a future reminder time.'},400);
   const job=JSON.parse(r.data) as Job;
   if(b.remindAt&&(!r.active||job.deadline&&Date.parse(nextReminderCheck(b.remindAt))>=Date.parse(job.deadline)))return response({error:'Reminders arrive at the next 9 AM, 2 PM or 7 PM IST check. Choose an earlier time so it arrives before the deadline. Closed openings cannot receive reminders.'},400);
   const previous=await one<{status:string;note:string;stage:string|null;remind_at:string|null}>('SELECT status,note,stage,remind_at FROM user_jobs WHERE user_id=? AND job_key=?',user.userId,r.job_key);
   const reminder=b.status==='interested'?(b.remindAt===undefined?previous?.remind_at||null:b.remindAt):null;
   await db().prepare('INSERT INTO user_jobs(user_id,job_key,job_id,status,stage,note,remind_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id,job_key) DO UPDATE SET job_id=excluded.job_id,status=excluded.status,stage=excluded.stage,note=excluded.note,remind_at=excluded.remind_at,updated_at=excluded.updated_at').bind(user.userId,r.job_key,b.jobId,b.status,b.status==='applied'?(b.stage||previous?.stage||'Applied'):null,b.note===undefined?previous?.note||'':b.note,reminder,now).run();
   if(b.status!==previous?.status)await safeEvent(user,b.status==='interested'?'saved':b.status==="applied"?'applied':'dismissed',undefined,true);if(b.note!==undefined&&b.note!==previous?.note)await safeEvent(user,'note_saved',undefined,true);if(b.stage&&b.stage!==previous?.stage)await safeEvent(user,'stage_updated',undefined,true);
   if(b.status==='applied'||b.status==='dismissed')await db().prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND job_key=? AND read_at IS NULL').bind(now,user.userId,r.job_key).run();return response({ok:true});
  }
  if(body.action==='refresh'){const result=await syncJobs();await safeEvent(user,'manual_refresh');const notifications=result.sourcesPending?0:await createAlerts(user.userId);return response({...result,notifications});}
  if(body.action==='verify'){const id=z.string().max(200).parse(body.jobId);if(id.startsWith('import-'))return await getJobRecord(user.userId,id)?response({verified:false,userImport:true}):response({error:'Job not found.'},404);return response(await refreshJob(id));}
  if(body.action==='detail'){
   const job=await getJob(user.userId,z.string().max(200).parse(body.jobId),await getProfile(user.userId));
   return job?response({job}):response({error:'This opening is no longer available.'},404);
  }
  if(body.action==='read'){
   const id=body.noticeId===undefined?null:z.string().max(600).parse(body.noticeId);
   if(id)await db().prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND id=? AND read_at IS NULL').bind(now,user.userId,id).run();
   else await db().prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').bind(now,user.userId).run();
   return response({ok:true});
  }
  if(body.action==='analyse'){
   const id=z.string().max(200).parse(body.jobId);const r=await getJobRecord(user.userId,id);if(!r)return response({error:'Job not found.'},404);const result=await analyseJob(user.userId,{...JSON.parse(r.data),active:!!r.active} as Job,await getProfile(user.userId));await safeEvent(user,'fit_check');await safeEvent(user,result.kind==='ai'?'ai_result':'basic_result');return response(result);
  }
  if(body.action==='pushstatus'){
   const endpoint=body.endpoint===undefined?null:z.string().url().max(2048).parse(body.endpoint);
   const stored=endpoint?await one<{n:number}>('SELECT COUNT(*) as n FROM subscriptions WHERE user_id=? AND endpoint=?',user.userId,endpoint):null;
   return response({subscribed:!!stored?.n});
  }
  if(body.action==='subscribe'){
   const s=z.object({endpoint:z.string().url().max(2048),expirationTime:z.number().nullable().optional(),keys:z.object({p256dh:z.string().min(20).max(200),auth:z.string().min(10).max(200)})}).parse(body.subscription);
   if(!validPushEndpoint(s.endpoint))return response({error:'This browser’s push service is not supported yet.'},400);
   const old=await one<{user_id:string}>('SELECT user_id FROM subscriptions WHERE endpoint=?',s.endpoint);if(old&&old.user_id!==user.userId)return response({error:'This device is registered to a different account. Sign out and reset browser notifications first.'},409);
   if(!await validPushKeys(s.keys))return response({error:'This browser returned an invalid notification registration. Reset browser notifications and try again.'},400);
   const count=await one<{n:number}>('SELECT COUNT(*) as n FROM subscriptions WHERE user_id=?',user.userId);if(!old&&(count?.n||0)>=3)return response({error:'Alerts support up to three devices. Disable on all devices, then enable the devices you use.'},409);
   if(!env.VAPID_PUBLIC_KEY)return response({error:'Browser alerts are not configured yet.'},503);
   await db().prepare('INSERT INTO subscriptions(endpoint,user_id,data,created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET data=excluded.data').bind(s.endpoint,user.userId,JSON.stringify(s),now).run();await safeEvent(user,'alerts_enabled',undefined,true);return response({ok:true});
  }
  if(body.action==='unsubscribe'){await db().batch([db().prepare('DELETE FROM subscriptions WHERE user_id=?').bind(user.userId),db().prepare('DELETE FROM push_outbox WHERE user_id=?').bind(user.userId)]);await safeEvent(user,'alerts_disabled',undefined,true);return response({ok:true});}
  return response({error:'Unknown action.'},400);
 }catch(error){if(error instanceof z.ZodError)return response({error:'Please check your entries and try again.'},400);if(error instanceof PublicError)return response({error:error.message},error.status);return response({error:'This action is temporarily unavailable. Please try again.'},503);}
 finally{
  await releaseLease(deletionLease);
  await releaseLease(mutationLease);
 }
}
