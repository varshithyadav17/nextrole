import {z} from 'zod';
import {db} from './store';
import {engagement,indiaDay} from './product';
import {isHost} from './admin';
import type {ChatGPTUser} from '../app/chatgpt-auth';

export const ACTIVITY_SECTIONS=['discover','job','interested','applications','analytics','archive','companies','sources','settings','help','scout'] as const;
export const activityInput=z.object({minutes:z.array(z.object({minute:z.number().int().positive(),seconds:z.number().int().min(1).max(60),section:z.enum(ACTIVITY_SECTIONS)}).strict()).min(1).max(4)}).strict();
/** A recent cumulative minute sample; MAX makes network retries and parallel tabs idempotent. */
export async function recordActivity(user:ChatGPTUser,input:unknown,now=Date.now()){
 const {minutes}=activityInput.parse(input);
 if(isHost(user)||!(await engagement(user.userId)).analytics_enabled)return {recorded:false};
 const current=Math.floor(now/60000),accepted=minutes.filter(m=>m.minute<=current&&m.minute>=current-2);
 if(!accepted.length)return {recorded:false};
 await db().batch(accepted.map(m=>{
  const seconds=Math.min(m.seconds,m.minute===current?Math.max(0,Math.floor((now-m.minute*60000)/1000)):60);
  return db().prepare('INSERT INTO product_activity_minutes(user_id,minute,day,section,seconds) VALUES(?,?,?,?,?) ON CONFLICT(user_id,minute) DO UPDATE SET seconds=MAX(product_activity_minutes.seconds,excluded.seconds)').bind(user.userId,m.minute,indiaDay(new Date(m.minute*60000)),m.section,seconds);
 }));
 return {recorded:true};
}
