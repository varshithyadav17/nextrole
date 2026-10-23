import {getChatGPTUser} from '../../chatgpt-auth';
import {isHost} from '../../../lib/admin';
import {allowRequest} from '../../../lib/rate-limit';
import {requestJSON} from '../../../lib/request-json';
import {PublicError} from '../../../lib/errors';
import {saveDiscoverySettings} from '../../../lib/discovery-settings';
import {advanceDiscovery,discoveryStatus} from '../../../lib/discovery-sync';
import {z} from 'zod';
export const dynamic='force-dynamic';
const respond=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);if(!isHost(user))return respond({error:'Only the host can manage discovery.'},403);
 try{return respond(await discoveryStatus(true));}catch{return respond({error:'Discovery settings need host review.'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);if(!isHost(user))return respond({error:'Only the host can manage discovery.'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to manage discovery.'},403);
 try{
  if(!await allowRequest(user.userId,'external',12))return respond({error:'Wait a minute before another discovery change.'},429);
  const input=z.discriminatedUnion('action',[z.object({action:z.literal('save'),settings:z.unknown()}).strict(),z.object({action:z.literal('advance')}).strict()]).parse(await requestJSON(request,8192));
  if(input.action==='save'){await saveDiscoverySettings(input.settings);return respond(await discoveryStatus(true));}
  return respond({result:await advanceDiscovery(),...await discoveryStatus(true)});
 }catch(error){return respond({error:error instanceof z.ZodError?'Check the search terms, locations, limits and permission confirmation.':error instanceof PublicError?error.message:'Discovery could not complete. Saved listings are preserved.'},error instanceof z.ZodError?400:error instanceof PublicError?error.status:503);}
}
