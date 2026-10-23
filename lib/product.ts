import {db,one,rows,getProfile} from './store';
import {isHost} from './admin';
import {acquireLease,releaseLease} from './lease';
import type {ChatGPTUser} from '../app/chatgpt-auth';
import type {CommunityState,FeedbackRow} from './community-types';
export function indiaDay(date=new Date()){return new Date(date.getTime()+330*60000).toISOString().slice(0,10);}
export function shiftDay(day:string,n:number){return new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);}
export async function engagement(userId:string){return await one<{analytics_enabled:number;survey_month:string}>('SELECT analytics_enabled,survey_month FROM engagement_settings WHERE user_id=?',userId)||{analytics_enabled:1,survey_month:''};}
export async function productEvent(user:ChatGPTUser,kind:string,id=crypto.randomUUID(),locked=false){
 if(isHost(user))return;
 const lease=locked?null:await acquireLease('byok_mutation:'+user.userId);
 if(!locked&&!lease)return;
 try{
  if(!(await engagement(user.userId)).analytics_enabled)return;
  const now=new Date().toISOString(),day=indiaDay();
  const p=await getProfile(user.userId);
  await db().batch([
   db().prepare('INSERT OR IGNORE INTO meta(key,value) VALUES(?,?)').bind('product_tracking_started',now),
   db().prepare('INSERT INTO product_people(user_id,first_seen,last_seen,first_day,initial_completed) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_seen=excluded.last_seen').bind(user.userId,now,now,day,Number(p.completed&&kind!=='profile_completed')),
   db().prepare('INSERT OR IGNORE INTO product_events(id,user_id,kind,day,created_at) VALUES(?,?,?,?,?)').bind(user.userId+':'+kind+':'+id,user.userId,kind,day,now),
   db().prepare('INSERT OR IGNORE INTO product_events(id,user_id,kind,day,created_at) VALUES(?,?,?,?,?)').bind(user.userId+':workspace_open:'+day,user.userId,'workspace_open',day,now)
  ]);
 }finally{await releaseLease(lease);}
}
export async function safeEvent(user:ChatGPTUser,kind:string,id?:string,locked=false){try{await productEvent(user,kind,id,locked);}catch{/* Optional measurement must never block saved work. */}}
export async function communityState(user:ChatGPTUser):Promise<CommunityState>{
 const [s,p,unread]=await Promise.all([engagement(user.userId),one<{created_at:string;data:string}>('SELECT created_at,data FROM profiles WHERE user_id=?',user.userId),one<{n:number}>("SELECT COUNT(*) as n FROM feedback WHERE user_id=? AND reply<>'' AND reply_read_at IS NULL",user.userId)]);
 const month=indiaDay().slice(0,7);let completed=false;try{completed=!!p&&JSON.parse(p.data).completed;}catch{}
 return {analyticsEnabled:!!s.analytics_enabled,surveyDue:!isHost(user)&&completed&&indiaDay(new Date(p!.created_at)).slice(0,7)<month&&s.survey_month!==month,month,unreadReplies:unread?.n||0,role:isHost(user)?'host':'student'};
}
export const feedbackColumns='id,kind,job_id,rating,category,subject,message,needs,difficulty,period,status,priority,reply,replied_at,reply_read_at,resolved_at,created_at,updated_at';
export async function myFeedback(userId:string,page=0){return rows<FeedbackRow>('SELECT '+feedbackColumns+' FROM feedback WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 21 OFFSET ?',userId,page*20);}
