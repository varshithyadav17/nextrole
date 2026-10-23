import {getChatGPTUser} from '../../chatgpt-auth';
import {getJob,getProfile,rows} from '../../../lib/store';
import {applicationRecord,applicationEvents,applicationAnalytics,saveApplicationRecord,publicRecord} from '../../../lib/application-records';
import {preparationHistory} from '../../../lib/preparation';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {allowRequest} from '../../../lib/rate-limit';
import {requestJSON} from '../../../lib/request-json';
import {PublicError} from '../../../lib/errors';
import {z} from 'zod';
export const dynamic='force-dynamic';
const respond=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
function historyExport(userId:string){
 const encoder=new TextEncoder();let phase:'records'|'events'|'end'='records',after='';
 const stream=new ReadableStream<Uint8Array>({async pull(controller){try{
  if(phase==='end'){controller.enqueue(encoder.encode('{"type":"end","complete":true}\n'));controller.close();return;}
  if(phase==='records'){
   const page=await rows<{job_key:string;data:string;updated_at:string}>('SELECT job_key,data,updated_at FROM application_records WHERE user_id=? AND job_key>? ORDER BY job_key LIMIT 5',userId,after);
   for(const row of page){after=row.job_key;controller.enqueue(encoder.encode('{"type":"application","updatedAt":'+JSON.stringify(row.updated_at)+',"record":'+row.data+'}\n'));}
   if(page.length<5){phase='events';after='';}return;
  }
  const page=await rows<{id:string;job_key:string;kind:string;data:string;created_at:string}>('SELECT id,job_key,kind,data,created_at FROM application_events WHERE user_id=? AND id>? ORDER BY id LIMIT 50',userId,after);
  for(const row of page){after=row.id;controller.enqueue(encoder.encode(JSON.stringify({type:'event',...row,data:JSON.parse(row.data)})+'\n'));}if(page.length<50)phase='end';
 }catch{controller.error(new Error('Application history export was interrupted. Please download it again.'));}}});
 return new Response(stream,{headers:{'Content-Type':'application/x-ndjson;charset=utf-8','Content-Disposition':'attachment; filename="NextRole_application_history.ndjson"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Sign in to view your application records.'},401);
 try{
  const query=new URL(request.url).searchParams;if(query.has('export'))return historyExport(user.userId);if(query.has('analytics'))return respond(await applicationAnalytics(user.userId));
  const id=z.string().max(200).parse(query.get('jobId')),job=await getJob(user.userId,id,await getProfile(user.userId));if(!job)return respond({error:'Opening not found.'},404);
  const record=await applicationRecord(user.userId,job.key);
  if(query.get('format')==='pdf'){
   if(!record?.submitted)return respond({error:'No submitted résumé snapshot is recorded.'},404);
   return new Response(Uint8Array.from(atob(record.submitted.pdf),c=>c.charCodeAt(0)),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="NextRole_submitted_resume.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  return respond({record:publicRecord(record),history:await preparationHistory(user.userId,job.key),events:await applicationEvents(user.userId,job.key)});
 }catch{return respond({error:'Application records are temporarily unavailable.'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Sign in to save your application.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to change your tracker.'},403);
 let lease:Lease|null=null;
 try{
  if(!await allowRequest(user.userId,'write',60))return respond({error:'Please wait a minute before saving more changes.'},429);
  const body=await requestJSON(request,16000);lease=await acquireLease('byok_mutation:'+user.userId,90000);if(!lease)return respond({error:'Another workspace change is running. Try again shortly.'},409);
  return respond({record:await saveApplicationRecord(user.userId,body,lease)});
 }catch(error){return respond({error:error instanceof z.ZodError?'Check the submission confirmation and dates.':error instanceof PublicError?error.message:'Could not save this application.'},error instanceof z.ZodError?400:error instanceof PublicError?error.status:503);}
 finally{await releaseLease(lease);}
}
