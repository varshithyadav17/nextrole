import {getChatGPTUser} from '../../chatgpt-auth';
import {careerState,saveCareer,prepareApplication,updatePreparation,getKit,preparationHistory} from '../../../lib/preparation';
import {getJob,getProfile,db} from '../../../lib/store';
import {requestJSON} from '../../../lib/request-json';
import {resumeLatex} from '../../../lib/career';
import {resumeCheck} from '../../../lib/resume-check';
import {clearResumeFiles} from '../../../lib/resume-files';
import {draftApplicationAnswers} from '../../../lib/answer-drafts';
import {PublicError} from '../../../lib/errors';
import {allowRequest} from '../../../lib/rate-limit';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {z} from 'zod';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 try{
  const params=new URL(request.url).searchParams,id=params.get('kitId');
  if(params.get('drafts')==='1')return respond({history:await preparationHistory(user.userId,undefined,true)});
  if(id){const kit=await getKit(user.userId,z.string().regex(/^kit-[a-f0-9-]{36}$/).parse(id));if(!kit)return respond({error:'Preparation not found.'},404);
   if(params.get('format')==='tex'||params.get('format')==='txt'){const txt=params.get('format')==='txt';return new Response(resumeLatex(kit.resume),{headers:{'Content-Type':txt?'text/plain; charset=utf-8':'application/x-tex; charset=utf-8','Content-Disposition':'attachment; filename="'+(txt?'NextRole_resume_LaTeX.txt':'NextRole_resume.tex')+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
   if(params.get('format')==='pdf'){const {resumePDF}=await import('../../../lib/resume-pdf');return new Response(await resumePDF(kit.resume,kit.createdAt),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="NextRole_resume.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
   return respond({kit:{...kit,compatibility:resumeCheck(kit.resume,kit.jobSnapshot.description)}});
  }
  const jobId=params.get('jobId'),job=jobId?await getJob(user.userId,z.string().max(200).parse(jobId),await getProfile(user.userId)):null;
  if(jobId&&!job)return respond({error:'Opening not found.'},404);
  return respond({career:await careerState(user.userId),history:await preparationHistory(user.userId,job?.key)});
 }catch(error){return respond({error:error instanceof PublicError?error.message:'Could not load preparation. Please try again.'},error instanceof PublicError?error.status:503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to save preparation.'},403);
 let lease:Lease|null=null;
 try{
  if(!await allowRequest(user.userId,'write',60))return respond({error:'Please wait before saving more preparation changes.'},429);
  const body=await requestJSON(request,96000);if(!body||typeof body!=='object'||Array.isArray(body))return respond({error:'Send a valid preparation action.'},400);lease=await acquireLease('byok_mutation:'+user.userId,90000);
  if(!lease)return respond({error:'Another workspace change is running. Please try again.'},409);
  if(body.action==='career-save')return respond({career:await saveCareer(user.userId,body.profile,body.expectedRevision)});
  if(body.action==='prepare')return respond({kit:await prepareApplication(user.userId,body)},201);
  if(body.action==='draft-answers')return respond({kit:await draftApplicationAnswers(user.userId,body)});
  if(body.action==='update')return respond({kit:await updatePreparation(user.userId,body)});
  if(body.action==='delete-kit'){const id=z.string().regex(/^kit-[a-f0-9-]{36}$/).parse(body.kitId);const result=await db().prepare('DELETE FROM application_kits WHERE user_id=? AND id=?').bind(user.userId,id).run();return result.meta.changes?respond({ok:true}):respond({error:'Preparation not found.'},404);}
  if(body.action==='delete-career'&&body.confirmation==='DELETE'){await clearResumeFiles(user.userId);await db().batch([db().prepare('DELETE FROM scout_threads WHERE user_id=?').bind(user.userId),db().prepare('DELETE FROM automation_tokens WHERE user_id=?').bind(user.userId),db().prepare('DELETE FROM meta WHERE key=?').bind('companion_workspace:'+user.userId),db().prepare('DELETE FROM automation_queue WHERE user_id=?').bind(user.userId),db().prepare('DELETE FROM automation_settings WHERE user_id=?').bind(user.userId),db().prepare("UPDATE application_records SET data=json_set(data,'$.submitted',NULL) WHERE user_id=?").bind(user.userId),db().prepare('DELETE FROM career_profiles WHERE user_id=?').bind(user.userId),db().prepare('DELETE FROM application_kits WHERE user_id=?').bind(user.userId),db().prepare("DELETE FROM analyses WHERE user_id=? AND (job_key IN (?,?) OR job_key LIKE 'scout-%')").bind(user.userId,'application-fact-selection-v1','application-answer-draft-v1')]);return respond({ok:true});}
  return respond({error:'Choose a valid preparation action.'},400);
 }catch(error){return respond({error:error instanceof z.ZodError?'Check your career facts and answers. Remove credentials and review required fields.':error instanceof PublicError?error.message:'Preparation could not be saved. Please try again.'},error instanceof z.ZodError?400:error instanceof PublicError?error.status:503);}
 finally{await releaseLease(lease);}
}
