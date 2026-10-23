import {companionIdentity,companionClaim,companionReport,companionWorkspaceAllowed,companionDiscoveryAllowed,automationState,withCompanionLease} from '../../../lib/automation';
import {companionLookup,companionImport,companionSetStatus,companionInbox} from '../../../lib/companion-workspace';
import {importJob} from '../../../lib/import-jobs';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {PublicError} from '../../../lib/errors';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function POST(request:Request){try{
 const userId=await companionIdentity(request);if(!await allowRequest(userId,'external',60))throw new PublicError('Please wait before another companion request.',429);
 const body=await requestJSON(request,120000);
 return respond(await withCompanionLease<unknown>(userId,async lease=>{
  // Pair replacement/revocation may have happened while another mutation held the lease.
  await companionIdentity(request);
  if(body?.action==='session'){const state=await automationState(userId);return {workspace:state.workspacePaired,discovery:state.discoveryPaired,expiresAt:state.pairedUntil};}
  if(body?.action==='matched-jobs'){
   if(!await companionDiscoveryAllowed(request,userId))throw new PublicError('Reconnect Scout with Matched-job inbox access enabled. Older connections keep their existing permissions.',403);
   return companionInbox(userId);
  }
  if(['lookup-job','import-job','job-status'].includes(body?.action)){
   if(!await companionWorkspaceAllowed(request,userId))throw new PublicError('Create a new pairing token with Workspace assistance enabled in NextRole Settings.',403);
   if(body.action==='lookup-job')return companionLookup(userId,body.url);
   if(body.action==='import-job')return companionImport(userId,body);
   return companionSetStatus(userId,body);
  }
  return body?.action==='capture-job'?capture(userId,body):body?.action==='claim'?companionClaim(userId):companionReport(userId,body,lease);
 }));
 }catch(e){return respond({error:e instanceof PublicError?e.message:'The companion request could not be completed. Check the fields and try again.'},e instanceof PublicError?e.status:400);}}

async function capture(userId:string,body:Record<string,unknown>){
 const url=new URL(String(body.url||''));if(url.protocol!=='https:'||!['www.linkedin.com','linkedin.com','unstop.com','www.unstop.com','job-boards.greenhouse.io','boards.greenhouse.io','jobs.lever.co','jobs.eu.lever.co','jobs.ashbyhq.com'].includes(url.hostname)||url.username||url.password)throw new PublicError('Capture supports individual LinkedIn, Unstop and supported ATS job pages only.');
 return importJob(userId,{kind:'jsonld',url:url.toString(),data:body.data});
}
