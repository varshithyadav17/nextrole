import {getChatGPTUser} from '../../chatgpt-auth';
import {isHost} from '../../../lib/admin';
import {loadSources,registerSource} from '../../../lib/source-registry';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {PublicError} from '../../../lib/errors';
import {z} from 'zod';
import {sourceMetrics} from '../../../lib/source-metrics';
import {discoveryStatus} from '../../../lib/discovery-sync';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 try{const [sources,metrics,discovery]=await Promise.all([loadSources(),sourceMetrics(),discoveryStatus()]);return respond({sources,metrics,discovery});}catch{return respond({error:'Sources are temporarily unavailable.'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 if(!isHost(user))return respond({error:'Only the host can connect shared employer sources.'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to connect a source.'},403);
 try{
  if(!await allowRequest(user.userId,'write',30))return respond({error:'Please wait before connecting more sources.'},429);
  return respond({source:await registerSource(await requestJSON(request,8192))},201);
 }catch(error){
  if(error instanceof z.ZodError)return respond({error:'Check the provider, public board token, company links and permission confirmation.'},400);
  return respond({error:error instanceof PublicError?error.message:'Could not connect this source.'},error instanceof PublicError?error.status:503);
 }
}
