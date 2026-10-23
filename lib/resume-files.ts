import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,one,rows} from './store';
import {digest} from './keyring';
import {isSafeJobUrl} from './matching';
import {PublicError} from './errors';

export const MAX_RESUME_BYTES=4*1024*1024,MAX_RESUMES=10,MAX_RESUME_TOTAL=24*1024*1024;
export type ResumeFile={id:string;name:string;role:string;contentType:string;bytes:number;sha256:string;revision:string;createdAt:string;updatedAt:string;text:string;textConfirmed:boolean;warnings:string[];pages?:number;links?:string[];textSource?:'reviewed'|'browser'|'pdf-ai'};
type Stored={id:string;name:string;role:string;content_type:string;bytes:number;sha256:string;revision:string;created_at:string;updated_at:string;data:string;object_key:string};
const visible=(r:Stored):ResumeFile=>({id:r.id,name:r.name,role:r.role,contentType:r.content_type,bytes:r.bytes,sha256:r.sha256,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at,...JSON.parse(r.data)});
export async function resumeList(userId:string){return (await rows<Stored>('SELECT * FROM resume_files WHERE user_id=? ORDER BY created_at DESC',userId)).map(r=>{const {text,...meta}=visible(r);return {...meta,characters:text.length};});}
export async function resumeFile(userId:string,id:string){const r=await one<Stored>('SELECT * FROM resume_files WHERE user_id=? AND id=?',userId,z.string().uuid().parse(id));return r?visible(r):null;}
export async function saveResumeFile(userId:string,file:File,input:unknown,mode:'reviewed'|'attachment'='reviewed'){
 if(!env.BUCKET)throw new PublicError('Private résumé storage is not connected. Please try again later.',503);
 const value=z.object({role:z.string().trim().min(1).max(120),text:z.string().trim().min(mode==='attachment'?0:40).max(50000),textConfirmed:mode==='attachment'?z.literal(false):z.literal(true),warnings:z.array(z.string().max(200)).max(5).default([]),links:z.array(z.string().url().max(2048).refine(u=>u.startsWith('https://')&&isSafeJobUrl(u))).max(30).default([])}).parse(input);
 if(/(?:sk-(?:proj-)?|gsk_|AIza|nr_companion_)[A-Za-z0-9_-]{12,}/.test(value.text))throw new PublicError('Remove API keys or other credentials before uploading this document.');
 if(file.size<1||file.size>MAX_RESUME_BYTES)throw new PublicError('Choose a résumé up to 4 MiB.');
 const total=await one<{n:number;bytes:number}>('SELECT COUNT(*) as n,COALESCE(SUM(bytes),0) as bytes FROM resume_files WHERE user_id=?',userId);
 if((total?.n||0)>=MAX_RESUMES||(total?.bytes||0)+file.size>MAX_RESUME_TOTAL)throw new PublicError('Your private library allows 10 résumés and 24 MiB. Delete an older file first.');
 const bytes=new Uint8Array(await file.arrayBuffer()),extension=file.name.toLowerCase().split('.').pop();
 const type=extension==='pdf'&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-'?'application/pdf':extension==='docx'&&bytes[0]===80&&bytes[1]===75?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':extension==='txt'?'text/plain':null;
 if(!type)throw new PublicError('Choose a PDF, DOCX or text résumé with the matching file contents.');
 let pages:number|undefined;
 if(mode==='attachment'){
  if(type!=='application/pdf')throw new PublicError('Attach a PDF résumé to Scout.');
  try{const {PDFDocument}=await import('pdf-lib');const pdf=await PDFDocument.load(bytes,{updateMetadata:false});pages=pdf.getPageCount();if(pages<1||pages>8)throw new PublicError('Use a résumé of 1–8 pages.');}
  catch(error){if(error instanceof PublicError)throw error;throw new PublicError('This PDF could not be opened. Unlock it or export a new PDF.');}
 }
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const id=crypto.randomUUID(),now=new Date().toISOString(),key='resumes/'+await digest(userId)+'/'+id,revision=crypto.randomUUID();
 const name=file.name.replace(/[^\p{L}\p{N} ._()-]/gu,'').slice(0,120)||'resume.'+extension;
 await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});
 try{await db().prepare('INSERT INTO resume_files(user_id,id,name,role,content_type,bytes,sha256,object_key,data,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(userId,id,name,value.role,type,file.size,sha,key,JSON.stringify({text:value.text,textConfirmed:value.textConfirmed,warnings:value.warnings,links:value.links,textSource:mode==='attachment'?'browser':'reviewed',...(pages?{pages}:{})}),revision,now,now).run();}
 catch(error){await env.BUCKET.delete(key);throw error;}
 return resumeFile(userId,id);
}
export async function downloadResumeFile(userId:string,id:string,preview=false){
 const record=await one<Stored>('SELECT * FROM resume_files WHERE user_id=? AND id=?',userId,z.string().uuid().parse(id));
 if(!record||!env.BUCKET)throw new PublicError('Résumé file not found.',404);
 const file=await env.BUCKET.get(record.object_key);if(!file)throw new PublicError('The private file is unavailable. Your reviewed text is retained.',503);
 return new Response(file.body,{headers:{'Content-Type':record.content_type,'Content-Disposition':(preview?'inline':'attachment')+'; filename="'+record.name.replace(/[^a-zA-Z0-9 ._()-]/g,'_')+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
/** Access to original bytes is always scoped to the signed-in owner. */
export async function resumePDFInput(userId:string,id:string){
 const record=await one<Stored>('SELECT * FROM resume_files WHERE user_id=? AND id=?',userId,z.string().uuid().parse(id));
 if(!record||record.content_type!=='application/pdf')throw new PublicError('Choose your PDF résumé.',404);
 if(!env.BUCKET)throw new PublicError('Private file storage is unavailable.',503);
 const object=await env.BUCKET.get(record.object_key);if(!object)throw new PublicError('The original PDF is unavailable. Upload it again.',503);
 const bytes=new Uint8Array(await object.arrayBuffer());if(bytes.length!==record.bytes||bytes.length>MAX_RESUME_BYTES)throw new PublicError('The saved PDF could not be verified.',409);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==record.sha256)throw new PublicError('The saved PDF changed. Upload it again.',409);
 let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return {name:record.name,data:btoa(binary),sha256:record.sha256};
}
export async function savePDFReading(userId:string,file:ResumeFile,text:string){
 const clean=z.string().trim().min(40).max(18000).parse(text);
 if(/(?:sk-(?:proj-)?|gsk_|AIza|nr_companion_)[A-Za-z0-9_-]{12,}/.test(clean))throw new PublicError('This PDF appears to contain credentials. Remove them and upload it again.');
 const revision=crypto.randomUUID(),now=new Date().toISOString();
 const result=await db().prepare('UPDATE resume_files SET data=?,revision=?,updated_at=? WHERE user_id=? AND id=? AND revision=?').bind(JSON.stringify({text:clean,textConfirmed:false,warnings:['AI read this PDF. Review the original before approving résumé facts.'],pages:file.pages,links:file.links||[],textSource:'pdf-ai'}),revision,now,userId,file.id,file.revision).run();
 if(!result.meta.changes)throw new PublicError('The PDF changed during reading. Select it again.',409);
 return (await resumeFile(userId,file.id))!;
}
export async function deleteResumeFile(userId:string,id:string){
 const row=await one<{object_key:string}>('SELECT object_key FROM resume_files WHERE user_id=? AND id=?',userId,z.string().uuid().parse(id));
 if(!row)throw new PublicError('Résumé not found.',404);
 if(env.BUCKET)await env.BUCKET.delete(row.object_key);
 await db().prepare('DELETE FROM resume_files WHERE user_id=? AND id=?').bind(userId,id).run();
 await db().prepare("DELETE FROM analyses WHERE user_id=? AND job_key='scout-pdf-read-v1'").bind(userId).run();
}
export async function clearResumeFiles(userId:string){
 const files=await rows<{object_key:string}>('SELECT object_key FROM resume_files WHERE user_id=?',userId);
 if(files.length&&!env.BUCKET)throw new PublicError('Private file storage is unavailable. Try clearing again later.',503);
 if(files.length)await env.BUCKET!.delete(files.map(f=>f.object_key));
 await db().prepare('DELETE FROM resume_files WHERE user_id=?').bind(userId).run();
}
