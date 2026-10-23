import {getChatGPTUser} from '../../chatgpt-auth';
import {digestSettings,saveDigestSettings,buildDigest} from '../../../lib/digests';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {z} from 'zod';
export const dynamic='force-dynamic';
const respond=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return respond({error:'Sign in to view your digest.'},401);try{const settings=await digestSettings(user.userId);if(new URL(request.url).searchParams.has('preview')){if(!await allowRequest(user.userId,'external',12))return respond({error:'Please wait before preparing another preview.'},429);return respond({preview:await buildDigest(user.userId,settings.lastSentAt||new Date(Date.now()-86400000).toISOString())});}return respond(settings);}catch{return respond({error:'Could not prepare your newsletter.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Sign in to change email preferences.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to change email preferences.'},403);
 let lease:Lease|null=null;
 try{if(!await allowRequest(user.userId,'write',60))return respond({error:'Please wait before saving more settings.'},429);const body=z.object({enabled:z.boolean()}).parse(await requestJSON(request,2000));lease=await acquireLease('byok_mutation:'+user.userId,90000);if(!lease)return respond({error:'Another workspace operation is running. Try again shortly.'},409);return respond(await saveDigestSettings(user.userId,user.email,body.enabled));}catch{return respond({error:'Could not save your email preferences.'},400);}finally{await releaseLease(lease);}
}
