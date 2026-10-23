import {getChatGPTUser} from '../../chatgpt-auth';
import {resumeList,resumeFile,saveResumeFile,deleteResumeFile,downloadResumeFile} from '../../../lib/resume-files';
import {allowRequest} from '../../../lib/rate-limit';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {PublicError} from '../../../lib/errors';
import {z} from 'zod';
import {safeEvent} from '../../../lib/product';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);
 try{const params=new URL(request.url).searchParams,id=params.get('id');if(!id)return respond({files:await resumeList(user.userId)});if(params.get('download')==='1'||params.get('preview')==='1')return await downloadResumeFile(user.userId,id,params.get('preview')==='1');const file=await resumeFile(user.userId,id);return file?respond({file}):respond({error:'Résumé not found.'},404);}
 catch(error){return respond({error:error instanceof PublicError?error.message:'Could not load your private résumé.'},error instanceof PublicError?error.status:400);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to manage résumés.'},403);
 let lease:Lease|null=null;
 try{
  if(!await allowRequest(user.userId,'write',60))throw new PublicError('Please wait before another upload.',429);
  lease=await acquireLease('byok_mutation:'+user.userId,90000);if(!lease)throw new PublicError('Another change is saving. Please try again.',409);
  const limit=4400000;if(Number(request.headers.get('content-length'))>limit)throw new PublicError('The upload is too large.',413);
  const reader=request.body?.getReader();if(!reader)throw new PublicError('Choose a résumé file.');const chunks:Uint8Array[]=[];let length=0;
  try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>limit){await reader.cancel();throw new PublicError('The upload is too large.',413);}chunks.push(part.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const form=await new Request(request.url,{method:'POST',headers:request.headers,body:bytes}).formData();
  if(form.get('action')==='delete'){await deleteResumeFile(user.userId,String(form.get('id')||''));return respond({ok:true});}
  const file=form.get('file');if(!(file instanceof File))throw new PublicError('Choose a résumé file.');
  const attachment=form.get('action')==='attach';
  const saved=await saveResumeFile(user.userId,file,{role:form.get('role')||'Résumé',text:form.get('text')||'',textConfirmed:attachment?false:form.get('confirmed')==='true',warnings:JSON.parse(String(form.get('warnings')||'[]')),links:JSON.parse(String(form.get('links')||'[]'))},attachment?'attachment':'reviewed');await safeEvent(user,'resume_upload',undefined,true);return respond({file:saved},201);
 }catch(error){return respond({error:error instanceof z.ZodError?'Review the extracted text, choose a role and confirm it before saving.':error instanceof PublicError?error.message:'The upload could not be saved. Please try again.'},error instanceof z.ZodError?400:error instanceof PublicError?error.status:503);}
 finally{await releaseLease(lease);}
}
