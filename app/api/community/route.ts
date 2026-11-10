import {z} from 'zod';
import {getChatGPTUser} from '../../chatgpt-auth';
import {db,one,getJobRecord} from '../../../lib/store';
import {communityState,myFeedback,feedbackColumns,indiaDay,safeEvent} from '../../../lib/product';
import {FEEDBACK_CATEGORIES} from '../../../lib/community-types';
import {requestJSON} from '../../../lib/request-json';
import {PublicError} from '../../../lib/errors';
import {allowRequest} from '../../../lib/rate-limit';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {digest} from '../../../lib/keyring';
import {recordActivity} from '../../../lib/activity';
export const dynamic='force-dynamic';
const respond=(d:unknown,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'no-store'}});
const text=z.string().trim().max(1500).refine(s=>!/(?:sk-(?:proj-)?|gsk_|AIza)[A-Za-z0-9_-]{12,}/.test(s),'Remove API credentials before sharing feedback.');
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);try{const page=z.coerce.number().int().min(0).max(1000).parse(new URL(request.url).searchParams.get('page')||0);const items=await myFeedback(user.userId,page);return respond({state:await communityState(user),items:items.slice(0,20),hasMore:items.length>20,page});}catch(e){return respond({error:e instanceof z.ZodError?'Choose a valid feedback page.':'Feedback is temporarily unavailable. Your saved jobs are safe.'},e instanceof z.ZodError?400:503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to send this request.'},403);
 let lease:Lease|null=null;
 try{
  const body=await requestJSON(request);if(!body||typeof body!=='object')return respond({error:'Please send a valid request.'},400);
  const now=new Date().toISOString(),month=indiaDay().slice(0,7);
  const telemetry=['event','session','activity'].includes(body.action);
  if(!await allowRequest(user.userId,telemetry?'telemetry':'feedback',telemetry?60:12))return respond({error:'Please wait a minute before sending more updates.'},429);
  lease=await acquireLease('byok_mutation:'+user.userId);if(!lease)return respond({error:'Another change is being saved. Please try again in a moment.'},409);
  if(body.action==='session'){await safeEvent(user,'workspace_open',indiaDay(),true);return respond({state:await communityState(user)});}
  if(body.action==='activity'){return respond(await recordActivity(user,{minutes:body.minutes}));}
  if(body.action==='event'){
   const b=z.object({kind:z.enum(['external_search','filter_company','filter_role','filter_arrangement','filter_match','change_sort','keyword_filter','job_view','apply_open','apply_feedback_shown','apply_feedback_skipped','survey_shown','visit_today','visit_discover','visit_interested','visit_applications','visit_archive','visit_companies','visit_sources','visit_settings','visit_help']),id:z.string().uuid(),jobId:z.string().max(200).optional()}).parse(body);
   if(b.kind==='job_view'||b.kind==='apply_open'){
    if(!b.jobId)return respond({error:'Choose a listing.'},400);
    const job=await getJobRecord(user.userId,b.jobId);if(!job)return respond({error:'This listing is unavailable.'},404);
    if(b.kind==='apply_open'&&(!job.active||JSON.parse(job.data).deadline&&Date.parse(JSON.parse(job.data).deadline)<=Date.now()))return respond({ok:true,recorded:false});
   }
   await safeEvent(user,b.kind,b.kind==='survey_shown'?month:b.id,true);return respond({ok:true});
  }
  if(body.action==='analytics'){
   const enabled=z.boolean().parse(body.enabled);
   await db().prepare('INSERT INTO engagement_settings(user_id,analytics_enabled,survey_month,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET analytics_enabled=excluded.analytics_enabled,updated_at=excluded.updated_at').bind(user.userId,Number(enabled),'',now).run();
   if(!enabled)await db().batch(['product_events','product_people','product_activity_minutes','product_activity_days'].map(t=>db().prepare('DELETE FROM '+t+' WHERE user_id=?').bind(user.userId)));
   return respond({state:await communityState(user)});
  }
  if(body.action==='survey-skip'){
   await db().prepare('INSERT INTO engagement_settings(user_id,analytics_enabled,survey_month,updated_at) VALUES(?,1,?,?) ON CONFLICT(user_id) DO UPDATE SET survey_month=excluded.survey_month,updated_at=excluded.updated_at').bind(user.userId,month,now).run();
   await safeEvent(user,'survey_skipped',month,true);return respond({state:await communityState(user)});
  }
  if(body.action==='read-replies'){const ids=z.array(z.string().regex(/^f_[a-f0-9]{64}$/)).min(1).max(20).parse(body.ids);await db().prepare("UPDATE feedback SET reply_read_at=? WHERE user_id=? AND id IN ("+ids.map(()=>'?').join(',')+") AND reply<>'' AND reply_read_at IS NULL").bind(now,user.userId,...ids).run();return respond({ok:true});}
  if(body.action==='submit'){
   const b=z.object({kind:z.enum(['apply','monthly','help','idea']),contextId:z.string().uuid(),jobId:z.string().max(200).optional(),rating:z.number().int().min(1).max(5).nullable().default(null),category:z.enum(FEEDBACK_CATEGORIES),subject:text.refine(s=>s.length<=120),message:text,needs:text.default(''),difficulty:text.default('')}).parse(body);
   if(b.kind==='apply'&&!b.rating)return respond({error:'Choose a rating, or skip this feedback.'},400);
   if((b.kind==='help'||b.kind==='idea')&&(!b.subject||!b.message))return respond({error:'Add a subject and describe what you need.'},400);
   if(b.kind==='monthly'&&!b.message&&!b.needs&&!b.difficulty&&!b.rating)return respond({error:'Share an answer or rating, or skip this month.'},400);
   if(b.kind==='apply'&&(!b.jobId||!await getJobRecord(user.userId,b.jobId)))return respond({error:'This listing could not be found. Use general feedback instead.'},404);
   const context=b.kind==='monthly'?month:b.contextId,id='f_'+await digest(user.userId+':'+b.kind+':'+context);
   await db().prepare('INSERT OR IGNORE INTO feedback(id,user_id,kind,context_id,job_id,rating,category,subject,message,needs,difficulty,period,status,priority,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,user.userId,b.kind,context,b.kind==='apply'?b.jobId:null,b.rating,b.category,b.subject,b.message,b.needs,b.difficulty,b.kind==='monthly'?month:null,'new','normal',now,now).run();
   if(b.kind==='monthly')await db().prepare('INSERT INTO engagement_settings(user_id,analytics_enabled,survey_month,updated_at) VALUES(?,1,?,?) ON CONFLICT(user_id) DO UPDATE SET survey_month=excluded.survey_month,updated_at=excluded.updated_at').bind(user.userId,month,now).run();
   await safeEvent(user,b.kind==='monthly'?'survey_sent':'feedback_sent',id,true);
   return respond({ok:true,item:await one('SELECT '+feedbackColumns+' FROM feedback WHERE id=? AND user_id=?',id,user.userId),state:await communityState(user)});
  }
  return respond({error:'Unknown feedback action.'},400);
 }catch(e){if(e instanceof z.ZodError)return respond({error:e.issues.some(i=>i.message.includes('credentials'))?'Remove API credentials before sharing feedback.':'Please check your entries and try again.'},400);if(e instanceof PublicError)return respond({error:e.message},e.status);return respond({error:'Could not save this update. Please try again; your jobs are safe.'},503);}finally{await releaseLease(lease);}
}
