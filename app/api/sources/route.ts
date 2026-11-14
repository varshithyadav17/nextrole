import {getChatGPTUser} from '../../chatgpt-auth';
import {isHost} from '../../../lib/admin';
import {loadSources,registerSource} from '../../../lib/source-registry';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {PublicError} from '../../../lib/errors';
import {z} from 'zod';
import {sourceMetrics} from '../../../lib/source-metrics';
import {discoveryStatus} from '../../../lib/discovery-sync';
import {advanceEmployerDirectory,employerChecks,employerDirectoryStatus} from '../../../lib/employer-discovery';
import {fetchSourceJobs} from '../../../lib/job-feeds';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request?:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 try{if(request&&new URL(request.url).searchParams.get('view')==='directory')return respond(await employerDirectoryStatus(true));const [sources,metrics,discovery]=await Promise.all([loadSources(),sourceMetrics(),discoveryStatus()]);return respond({sources,metrics,discovery});}catch{return respond({error:'Sources are temporarily unavailable.'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 if(!isHost(user))return respond({error:'Only the host can connect shared employer sources.'},403);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to connect a source.'},403);
 try{
  if(!await allowRequest(user.userId,'write',30))return respond({error:'Please wait before connecting more sources.'},429);
  const body=await requestJSON(request,8192);
  if(body&&typeof body==='object'&&'action' in body){
   if(body.action==='scan-employers')return respond(await advanceEmployerDirectory());
   const input=z.object({action:z.literal('connect-employer'),id:z.string().regex(/^employer-[a-f0-9]{16}$/),policyUrl:z.string().url().max(2048),permissionConfirmed:z.literal(true)}).strict().parse(body);
   const check=(await employerChecks())[input.id];if(!check?.candidate)throw new PublicError('This employer needs a verified public feed first.');
   const jobs=await fetchSourceJobs(check.candidate,new Date().toISOString());if(!jobs.length)throw new PublicError('No published jobs could be validated. The feed was not connected.');
   const {id:_,...source}=check.candidate;void _;return respond({source:await registerSource({...source,policyUrl:input.policyUrl,permissionConfirmed:true}),validated:jobs.length},201);
  }
  return respond({source:await registerSource(body)},201);
 }catch(error){
  if(error instanceof z.ZodError)return respond({error:'Check the provider, public board token, company links and permission confirmation.'},400);
  return respond({error:error instanceof PublicError?error.message:'Could not connect this source.'},error instanceof PublicError?error.status:503);
 }
}
