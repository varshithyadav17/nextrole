import {env} from 'cloudflare:workers';
import {buildPushPayload} from '@block65/webcrypto-web-push';
import {db,rows} from './store';
export function validPushEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
export async function validPushKeys(keys:{p256dh:string;auth:string}){
 try{const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));if(!/^[A-Za-z0-9_-]+={0,2}$/.test(keys.p256dh)||!/^[A-Za-z0-9_-]+={0,2}$/.test(keys.auth))return false;const point=decode(keys.p256dh);if(point.length!==65||point[0]!==4||decode(keys.auth).length!==16)return false;await crypto.subtle.importKey('raw',point,{name:'ECDH',namedCurve:'P-256'},false,[]);return true;}catch{return false;}
}
export async function deliverPush(userId:string,data:{title:string;body:string;url:string}){
 if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return {sent:0,failed:1};
 const subscriptions=await rows<{endpoint:string;data:string}>('SELECT endpoint,data FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 3',userId);
 const results=await Promise.all(subscriptions.map(async sub=>{try{
  const subscription=JSON.parse(sub.data);if(!validPushEndpoint(subscription.endpoint))return {sent:0,failed:0};
  const payload=await buildPushPayload({data,options:{ttl:3600}},subscription,{subject:env.VAPID_SUBJECT||'https://nextrole-job-radar.ivorypine64.chatgpt.site',publicKey:env.VAPID_PUBLIC_KEY!,privateKey:env.VAPID_PRIVATE_KEY!});
  const response=await fetch(subscription.endpoint,{...payload,signal:AbortSignal.timeout(8000)});
  await response.body?.cancel();
  if(response.status===404||response.status===410){await db().prepare('DELETE FROM subscriptions WHERE endpoint=? AND user_id=?').bind(sub.endpoint,userId).run();return {sent:0,failed:0};}
  return {sent:Number(response.ok),failed:Number(!response.ok)};
 }catch{return {sent:0,failed:1};}}));
 return results.reduce((total,r)=>({sent:total.sent+r.sent,failed:total.failed+r.failed}),{sent:0,failed:0});
}
