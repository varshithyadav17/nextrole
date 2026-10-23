import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {NotoSansRegular,NotoSansBold} from './resume-fonts';
import type {ResumeDocument} from './career';
import {PublicError} from './errors';

/** Local, text-based PDF export. No resume or provider credential leaves the app. */
export async function resumePDF(document:ResumeDocument,createdAt?:string):Promise<Uint8Array<ArrayBuffer>>{
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 if(createdAt){pdf.setCreationDate(new Date(createdAt));pdf.setModificationDate(new Date(createdAt));}
 const bytes=(value:string)=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
 const [regular,bold]=await Promise.all([pdf.embedFont(bytes(NotoSansRegular),{subset:true}),pdf.embedFont(bytes(NotoSansBold),{subset:true})]);
 const supported=new Set(regular.getCharacterSet());
 const all=[document.name,...document.contact,...document.sections.flatMap(s=>[s.title,...s.facts.flatMap(f=>[f.title,f.organization,f.dates,...f.details,f.url,f.githubUrl,f.demoUrl])])].join('');
 if([...all].some(c=>c!=='\n'&&c!=='\r'&&c!=='\t'&&!supported.has(c.codePointAt(0)!)))throw new PublicError('The bundled PDF font does not cover a character in your profile. Download the LaTeX source and select a suitable Unicode font, or adjust the text yourself. No characters were silently replaced.');
 pdf.setTitle('Resume - '+document.name);pdf.setAuthor(document.name);pdf.setCreator('NextRole');pdf.setProducer('NextRole verified-facts PDF');
 const width=595.28,height=841.89,margin=48,contentWidth=width-2*margin;
 let page!:PDFPage,y=height-margin,pageNumber=0;
 function newPage(){if(pageNumber>=12)throw new PublicError('This resume exceeds 12 pages. Select fewer career facts before exporting.');page=pdf.addPage([width,height]);y=height-margin;pageNumber++;}
 newPage();
 function ensure(space:number){if(y-space<margin)newPage();}
 function wrap(text:string,font:PDFFont,size:number,available:number){
  const lines:string[]=[];let current='';
  for(const word of text.replace(/[\r\t]/g,' ').split(/\s+/).filter(Boolean)){
   if(font.widthOfTextAtSize(word,size)>available){
    if(current){lines.push(current);current='';}
    let chunk='';for(const char of word){if(chunk&&font.widthOfTextAtSize(chunk+char,size)>available){lines.push(chunk);chunk='';}chunk+=char;}current=chunk;
   }else if(current&&font.widthOfTextAtSize(current+' '+word,size)>available){lines.push(current);current=word;}
   else current=current?current+' '+word:word;
  }
  if(current)lines.push(current);return lines;
 }
 function draw(text:string,{font=regular,size=10,indent=0,color=rgb(.12,.15,.2),gap=3}:{font?:PDFFont;size?:number;indent?:number;color?:ReturnType<typeof rgb>;gap?:number}={}){
  const leading=size*1.45;
  for(const paragraph of text.split('\n'))for(const line of wrap(paragraph,font,size,contentWidth-indent)){ensure(leading);page.drawText(line,{x:margin+indent,y:y-size,font,size,color});y-=leading;}
  y-=gap;
 }
 draw(document.name,{font:bold,size:22,gap:5});
 draw(document.contact.join(' | '),{size:9,gap:12});
 for(const section of document.sections){
  ensure(80);draw(section.title.toUpperCase(),{font:bold,size:10,gap:4});page.drawLine({start:{x:margin,y:y+1},end:{x:width-margin,y:y+1},thickness:.6,color:rgb(.75,.78,.81)});y-=7;
  for(const fact of section.facts){
   const header=fact.title+(fact.organization?' | '+fact.organization:'');ensure(Math.min(140,wrap(header,bold,10,contentWidth).length*15+40));
   draw(header,{font:bold,size:10,gap:1});if(fact.dates)draw(fact.dates,{size:9,gap:2,color:rgb(.35,.38,.42)});
   for(const detail of fact.details)draw('- '+detail,{size:10,indent:8,gap:2});
   for(const url of [fact.url,fact.githubUrl,fact.demoUrl].filter(Boolean))draw(url,{size:8.5,gap:2,color:rgb(.2,.25,.35)});y-=8;
  }
  y-=3;
 }
 if(pageNumber>1)for(const [index,p] of pdf.getPages().entries())p.drawText(document.name+' | '+(index+1)+' / '+pageNumber,{x:margin,y:24,font:regular,size:8,color:rgb(.45,.45,.45)});
 return new Uint8Array(await pdf.save());
}
