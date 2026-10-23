import {registerHooks} from 'node:module';
import {PDFDocument} from 'pdf-lib';
const workerUrl=import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs');
registerHooks({resolve(specifier,context,next){if(specifier==='pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')return {url:'nextrole-upload:worker',shortCircuit:true};return next(specifier,context);},load(url,context,next){if(url==='nextrole-upload:worker')return {format:'module',source:'export default '+JSON.stringify(workerUrl),shortCircuit:true};return next(url,context);}});
export async function verifyResumeUploads({check}){
 const {extractResumeUpload}=await import('../lib/upload-extraction.ts');
 const {resumePDF}=await import('../lib/resume-pdf.ts');
 const {careerSchema,resumeDocument}=await import('../lib/career.ts');
 const {resumeTemplateFixture}=await import('./verify-resume-template.mjs');
 const profile=careerSchema.parse(resumeTemplateFixture()),pdf=await resumePDF(resumeDocument(profile,profile.facts.map(f=>f.id)),'2026-10-01T00:00:00.000Z');
 const extracted=await extractResumeUpload(new File([pdf],'resume.pdf',{type:'application/pdf'}));
 check(extracted.text.includes('Example Student')&&extracted.text.includes('Repository Explorer')&&extracted.text.includes('Python'),'The actual PDF.js parser extracts identity, project and skill text from the generated résumé PDF.');
 const text='Example Student\nProjects: Built a reliable Python and SQL opportunity tracker.\nSkills: Python, SQL.';
 check((await extractResumeUpload(new File([text],'resume.txt'))).text===text,'UTF-8 résumé extraction preserves reviewed source text.');
 const rejects=async f=>{try{await f();return false;}catch{return true;}};
 check(await rejects(()=>extractResumeUpload(new File([new Uint8Array(4*1024*1024+1)],'large-resume.txt'))),'Browser extraction rejects files above the 4 MiB limit before parsing and multipart transfer.');
 check(await rejects(()=>extractResumeUpload(new File([new Uint8Array([255,254,255])],'resume.txt'))),'Malformed UTF-8 fails clearly instead of replacing personal text.');
 const blank=await PDFDocument.create();blank.addPage();check(await rejects(async()=>extractResumeUpload(new File([await blank.save()],'image-only.pdf'))),'A PDF without readable text requests pasted text rather than inventing an extraction.');
 const long=await PDFDocument.create();for(let i=0;i<9;i++)long.addPage();check(await rejects(async()=>extractResumeUpload(new File([await long.save()],'too-many-pages.pdf'))),'PDF extraction enforces the eight-page upload budget.');
 const docx=Uint8Array.from(Buffer.from('UEsDBBQAAAAIAFGvUl33S4B1wgAAAHYBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QuQ7CMAyGX6XKiqgRAwOiLMAKDLyAlbptRC7FLsfbk3INCBjt//gsLw7XSFxcnPVcqU4kzgFYd+SQyxDJZ6UJyaHkMbUQUR+xJZhOJjPQwQt5GcvQoZaLNTXYWyk2l7xmE3ylEllWxephHFiVwhit0ShZh5OvPyjjJ6HMybuHOxN5lA0KvhIG5TfgmdudKCVTU7HHJFt02QXnkGqog+5dTpb/a77cGZrGaHrnh7aYgiZm41tny7fi0PjX/XB/9/IGUEsDBBQAAAAIAFGvUl1hey9DiQAAAPIAAAALAAAAX3JlbHMvLnJlbHONzzsOAiEQBuCrEA6ws1pYGKCy2dZ4AQLDIy6PDBj19lJYrMbCcuaffH9GnHHVPZbcQqyNPdKam+Sh93oEaCZg0m0qFfNIXKGk+xjJQ9Xmqj3Cfp4PQFuDK7E12WIlp8XuOLs8K/5jF+eiwVMxt4S5/6j4uhiyJo9d8nshC/a9ngbLQQn4eFG9AFBLAwQUAAAACABRr1JdWwlV8JsAAADjAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sbY9BCoMwEEWvEjyAI110EayLQnddVDzBaFIjJJmQjERvX1MohdLN+8z/w3ymzVLRtDrtWWzO+iTzpTLMQQKkyWiHqaag/ZE9KTrkY4wzZIoqRJp0SoufnYVT05zB4eKrrs1yJLUXDQWxgLvbhi5YLQZe1dHWQjEL45vhd/+6LpYFisfOhrxAr8TQ34XCZEbCqOo/F+BTDd+3uhdQSwECFAMUAAAACABRr1Jd90uAdcIAAAB2AQAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAIAFGvUl1hey9DiQAAAPIAAAALAAAAAAAAAAAAAACAAfMAAABfcmVscy8ucmVsc1BLAQIUAxQAAAAIAFGvUl1bCVXwmwAAAOMAAAARAAAAAAAAAAAAAACAAaUBAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAwADALkAAABvAgAAAAA=','base64'));
 check((await extractResumeUpload(new File([docx],'resume.docx'))).text.includes('Built a Python and SQL dashboard.'),'The actual DOCX parser extracts original Word paragraph text.');
 const bomb=new Uint8Array(60),view=new DataView(bomb.buffer);view.setUint32(0,0x02014b50,true);view.setUint32(24,30*1024*1024,true);check(await rejects(()=>extractResumeUpload(new File([bomb],'unsafe.docx'))),'DOCX expansion limits are checked before XML decompression.');
}
