export type ExtractedResume={text:string;warnings:string[];pages?:number;links?:string[]};
function validateDocx(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let entries=0,total=0;
 for(let i=0;i+46<bytes.length;i++)if(view.getUint32(i,true)===0x02014b50){
  const size=view.getUint32(i+24,true),compressed=view.getUint32(i+20,true);entries++;total+=size;
  if(entries>400||total>20*1024*1024||size>10*1024*1024||size>Math.max(1024*1024,compressed*200))throw new Error('This DOCX expands beyond the safe limit. Export a simpler PDF or text file.');
  i+=45+view.getUint16(i+28,true)+view.getUint16(i+30,true)+view.getUint16(i+32,true);
 }
 if(!entries)throw new Error('This DOCX has no supported ZIP directory.');
}
export async function extractResumeUpload(file:File,options:{attachment?:boolean}={}):Promise<ExtractedResume>{
 if(!file.size||file.size>4*1024*1024)throw new Error('Choose a file up to 4 MiB.');
 const extension=file.name.toLowerCase().split('.').pop(),bytes=new Uint8Array(await file.arrayBuffer()),warnings:string[]=[],links:string[]=[];let text='',pages:number|undefined;
 if(extension==='pdf'){
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),worker=await import('./pdf-worker-url');
  pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
  const task=pdfjs.getDocument({data:bytes,useSystemFonts:true,stopAtErrors:true});
  try{const pdf=await task.promise;pages=pdf.numPages;if(pdf.numPages>8)throw new Error('Use a résumé of up to 8 pages.');
   const lines:string[]=[];let bulletIndent:number|null=null;
   for(let n=1;n<=pdf.numPages;n++){
    const page=await pdf.getPage(n),content=await page.getTextContent(),annotations=await page.getAnnotations();
    const items=content.items.flatMap(item=>'str' in item&&item.str.trim()?[{text:item.str,x:item.transform[4],y:item.transform[5],width:item.width,font:item.fontName}]:[]).sort((a,b)=>b.y-a.y||a.x-b.x);
    const rows:{y:number;items:typeof items}[]=[];
    for(const item of items){const row=rows.at(-1);if(row&&Math.abs(row.y-item.y)<2)row.items.push(item);else rows.push({y:item.y,items:[item]});}
    for(const row of rows){
     row.items.sort((a,b)=>a.x-b.x);let line='',right=0;
     for(const item of row.items){line+=(line?(item.x-right>35?'\t':' '):'')+item.text;right=item.x+item.width;}
     const targets=annotations.flatMap(a=>typeof a.url==='string'&&a.url.startsWith('https://')&&a.url.length<=2048&&Array.isArray(a.rect)&&row.y>=a.rect[1]-3&&row.y<=a.rect[3]+2?[a.url]:[]);
     for(const url of [...new Set(targets)]){if(!links.includes(url)&&links.length<30)links.push(url);if(!line.includes(url))line+='\t'+url;}
     if(/^[•●▪◦*]\s/.test(line)){lines.push(line);bulletIndent=new Set(row.items.map(i=>i.font)).size>1?null:row.items.find(i=>!/^\s*[•●▪◦*]\s*$/.test(i.text))?.x??row.items[0].x+5;}
     else if(bulletIndent!==null&&row.items[0].x>=bulletIndent-1&&line&&!/^https:\/\//i.test(line))lines[lines.length-1]+=' '+line;
     else{lines.push(line);bulletIndent=null;}
    }
    text=lines.join('\n');page.cleanup();if(text.length>50000)throw new Error('The extracted text exceeds 50,000 characters.');
   }
  }finally{await task.destroy();}
  if(!options.attachment)warnings.push('Review PDF text order. Image-only PDFs need original-PDF AI reading.');
 }else if(extension==='docx'){
  validateDocx(bytes);const mammoth=await import('mammoth/mammoth.browser.js'),result=await mammoth.extractRawText({arrayBuffer:bytes.buffer});text=result.value;
  if(result.messages.length)warnings.push('Some document formatting was ignored. Check the extracted text.');
 }else if(extension==='txt')text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 else throw new Error('Choose a PDF, DOCX or UTF-8 text résumé.');
 text=text.replace(/\u0000/g,'').replace(/ +/g,' ').replace(/^ +| +$/gm,'').trim();if(text.length>50000)throw new Error('Keep the text below 50,000 characters.');
 if(text.length<40&&!options.attachment)throw new Error('Readable résumé text was not found. Paste the text below or upload a text-based file.');
 return {text,warnings,links,...(pages?{pages}:{})};
}
