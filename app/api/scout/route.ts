import {getChatGPTUser} from '../../chatgpt-auth';
import {scoutAction,scoutState} from '../../../lib/scout-chat';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {PublicError} from '../../../lib/errors';
import {z} from 'zod';
import {safeEvent} from '../../../lib/product';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);try{const id=new URL(request.url).searchParams.get('jobId');return respond(await scoutState(user.userId,id?z.string().max(200).parse(id):null));}catch(e){return respond({error:e instanceof PublicError?e.message:'Could not load Scout.'},e instanceof PublicError?e.status:503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Open Scout in NextRole.'},403);
 let lease:Lease|null=null;try{if(!await allowRequest(user.userId,'write',60))throw new PublicError('Please wait before another message.',429);lease=await acquireLease('byok_mutation:'+user.userId,90000);if(!lease)throw new PublicError('Another change is running. Please try again.',409);const body=await requestJSON(request,150000),result=await scoutAction(user.userId,body);const kind=({message:'scout_message',build:'scout_build',score:'scout_score','import-resume':'scout_import','apply-edit':'scout_edit'} as Record<string,string>)[String(result.performedAction||body?.action)];if(kind)await safeEvent(user,kind,undefined,true);return respond(result);}
 catch(e){return respond({error:e instanceof z.ZodError?'Check your message and selected résumé.':e instanceof PublicError?e.message:'Scout could not finish. Your saved work is retained.'},e instanceof z.ZodError?400:e instanceof PublicError?e.status:503);}finally{await releaseLease(lease);}
}
