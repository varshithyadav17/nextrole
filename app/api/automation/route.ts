import {getChatGPTUser} from '../../chatgpt-auth';
import {automationAction,automationState,automationForJob,withCompanionLease} from '../../../lib/automation';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {PublicError} from '../../../lib/errors';
import {z} from 'zod';
import {safeEvent} from '../../../lib/product';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);try{const id=new URL(request.url).searchParams.get('jobId');return respond(id?await automationForJob(user.userId,z.string().max(200).parse(id)):await automationState(user.userId));}catch(e){return respond({error:e instanceof PublicError?e.message:'Could not load automation.'},e instanceof PublicError?e.status:503);}}
export async function POST(request:Request){const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole settings.'},403);try{if(!await allowRequest(user.userId,'write',60))throw new PublicError('Please wait before another change.',429);return respond(await withCompanionLease(user.userId,async()=>{const body=await requestJSON(request,12000),result=await automationAction(user.userId,body);if(body?.action==='queue')await safeEvent(user,'automation_queued',undefined,true);return result;}));}catch(e){return respond({error:e instanceof PublicError?e.message:'Review your automation choices.'},e instanceof PublicError?e.status:400);}}
