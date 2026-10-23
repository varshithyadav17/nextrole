import {z} from 'zod';
import {getChatGPTUser} from '../../chatgpt-auth';
import {isHost} from '../../../lib/admin';
import {db,one} from '../../../lib/store';
import {hostMetrics,hostInbox} from '../../../lib/host-metrics';
import {feedbackColumns} from '../../../lib/product';
import {FEEDBACK_CATEGORIES} from '../../../lib/community-types';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {demoAdminReport} from '../../../lib/admin-demo';
export const dynamic='force-dynamic';
const respond=(d:unknown,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);if(!isHost(user))return respond({error:'This workspace is available only to the NextRole host.'},403);
 try{
  const p=new URL(request.url).searchParams;
  if(p.get('view')==='inbox')return respond(await hostInbox(z.object({page:z.coerce.number().int().min(0).max(10000),kind:z.enum(['all','apply','monthly','help','idea']),status:z.enum(['all','new','reviewing','planned','resolved']),category:z.enum(['all',...FEEDBACK_CATEGORIES]),q:z.string().trim().max(100)}).parse({page:p.get('page')||0,kind:p.get('kind')||'all',status:p.get('status')||'all',category:p.get('category')||'all',q:p.get('q')||''})));
  const days=z.coerce.number().refine(n=>[7,30,90].includes(n)).parse(p.get('days')||30);
  if(p.get('mode')==='demo')return respond(demoAdminReport(days));
  return respond(await hostMetrics(days,user.userId));
 }catch(e){return respond({error:e instanceof z.ZodError?'Choose a valid host view and date range.':'The host dashboard is temporarily unavailable. Please try again.'},e instanceof z.ZodError?400:503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);if(!isHost(user))return respond({error:'Host access is required.'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to update the inbox.'},403);
 try{
  if(!await allowRequest(user.userId,'feedback',30))return respond({error:'Please wait a minute before updating more feedback.'},429);
  const b=z.object({id:z.string().regex(/^f_[a-f0-9]{64}$/),status:z.enum(['new','reviewing','planned','resolved']),priority:z.enum(['low','normal','high']),reply:z.string().trim().max(3000).refine(s=>!/(?:sk-(?:proj-)?|gsk_|AIza)[A-Za-z0-9_-]{12,}/.test(s))}).parse(await requestJSON(request));
  const now=new Date().toISOString();
  const result=await db().prepare("UPDATE feedback SET status=?,priority=?,reply=?,replied_at=CASE WHEN ?<>'' THEN COALESCE(replied_at,?) ELSE replied_at END,reply_read_at=CASE WHEN reply<>? THEN NULL ELSE reply_read_at END,resolved_at=CASE WHEN ?='resolved' THEN COALESCE(resolved_at,?) ELSE NULL END,updated_at=? WHERE id=?").bind(b.status,b.priority,b.reply,b.reply,now,b.reply,b.status,now,now,b.id).run();
  if(!result.meta.changes)return respond({error:'This feedback was removed or is no longer available.'},404);
  return respond({ok:true,item:await one('SELECT '+feedbackColumns+' FROM feedback WHERE id=?',b.id)});
 }catch(e){return respond({error:e instanceof z.ZodError?'Check the fields and remove any API credentials before replying.':'Could not update feedback. Please try again.'},e instanceof z.ZodError?400:503);}
}
