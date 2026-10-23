import {PDFDocument,PDFName,PDFString,PDFDict,PDFArray,PDFRawStream,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {LatinModernRegular,LatinModernBold,LatinModernItalic} from './resume-serif-fonts';
import {NotoSansRegular,NotoSansBold} from './resume-fonts';
import {resumePDF as legacyPDF} from './resume-pdf-legacy';
import {LETTER_TEMPLATE,resumeHeader,resumeLink,factLinks,templateSection} from './resume-template';
import type {CareerFact,ResumeDocument} from './career';
import {PublicError} from './errors';

type Style='regular'|'bold'|'italic';
type Span={text:string;style?:Style;url?:string};
type Fragment={text:string;font:PDFFont;url?:string;width:number};

/** Portable rendering of the supplied Letter template; never executes TeX. */
export async function resumePDF(document:ResumeDocument,createdAt?:string):Promise<Uint8Array<ArrayBuffer>>{
 if(document.template!==LETTER_TEMPLATE)return legacyPDF(document,createdAt);
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 if(createdAt){pdf.setCreationDate(new Date(createdAt));pdf.setModificationDate(new Date(createdAt));}
 pdf.setTitle('Resume - '+document.name);pdf.setAuthor(document.name);pdf.setCreator('NextRole');pdf.setProducer('NextRole '+LETTER_TEMPLATE+' verified-facts PDF');
 const bytes=(value:string)=>Uint8Array.from(atob(value),char=>char.charCodeAt(0));
 // fontkit 1.1.1 produces invalid CFF subsets for these fonts; embed intact OTFs.
 const embedded=await Promise.all([LatinModernRegular,LatinModernBold,LatinModernItalic].map(value=>pdf.embedFont(bytes(value),{subset:false})));
 const fonts:Record<Style,PDFFont>={regular:embedded[0],bold:embedded[1],italic:embedded[2]};
 const charset=new Map(Object.values(fonts).map(font=>[font,new Set(font.getCharacterSet())]));
 const text=[document.name,document.summary||'',...resumeHeader(document).map(item=>item.label),...document.sections.flatMap(s=>[templateSection(s.title),...s.facts.flatMap(f=>[f.title,f.organization,f.dates,f.annotation||'',f.technologies||'',...f.details])])].join('');
 let fallback:Record<'regular'|'bold',PDFFont>|null=null;
 if([...text].some(char=>!/[\n\r\t]/.test(char)&&Object.values(fonts).some(font=>!charset.get(font)!.has(char.codePointAt(0)!)))){
  const [regular,bold]=await Promise.all([pdf.embedFont(bytes(NotoSansRegular),{subset:true}),pdf.embedFont(bytes(NotoSansBold),{subset:true})]);
  fallback={regular,bold};for(const font of [regular,bold])charset.set(font,new Set(font.getCharacterSet()));
 }
 function fontFor(char:string,style:Style){
  const font=fonts[style];if(charset.get(font)!.has(char.codePointAt(0)!))return font;
  const alternative=fallback?.[style==='bold'?'bold':'regular'];
  if(alternative&&charset.get(alternative)!.has(char.codePointAt(0)!))return alternative;
  throw new PublicError('The bundled PDF fonts do not cover a character in your profile. No characters were replaced. Download the LaTeX source and use suitable fonts, or adjust the text yourself.');
 }
 // The original fullpage adjustments give 0.5-inch sides and 0.35-inch top/bottom.
 const width=612,height=792,margin=36,top=25.2,bottom=24,available=width-2*margin;
 let page!:PDFPage,y=height-top,pages=0;
 function newPage(){if(pages>=12)throw new PublicError('This resume exceeds 12 pages. Select fewer career facts before exporting.');page=pdf.addPage([width,height]);y=height-top;pages++;}
 function ensure(space:number){if(y-space<bottom)newPage();}
 newPage();

 function layout(spans:Span[],size:number,maxWidth:number){
  const lines:Fragment[][]=[];let line:Fragment[]=[],used=0;
  function pushLine(){if(line.length)lines.push(line);line=[];used=0;}
  function append(text:string,font:PDFFont,url?:string){
   const measured=font.widthOfTextAtSize(text,size),last=line.at(-1);
   if(last?.font===font&&last.url===url){last.text+=text;last.width=font.widthOfTextAtSize(last.text,size);}
   else line.push({text,font,url,width:measured});
   used=line.reduce((sum,part)=>sum+part.width,0);
  }
  for(const span of spans){
   for(const token of span.text.replace(/[\r\t]/g,' ').split(/(\n| +)/).filter(Boolean)){
    if(token==='\n'){pushLine();continue;}
    const space=/^ +$/.test(token);
    const groups:{text:string;font:PDFFont}[]=[];
    for(const char of token){const font=fontFor(char,span.style||'regular'),last=groups.at(-1);if(last?.font===font)last.text+=char;else groups.push({text:char,font});}
    const length=groups.reduce((sum,g)=>sum+g.font.widthOfTextAtSize(g.text,size),0);
    if(used+length>maxWidth&&line.length)pushLine();
    if(space){if(line.length)append(' ',fonts.regular);continue;}
    for(const group of groups){
     if(group.font.widthOfTextAtSize(group.text,size)<=maxWidth-used){append(group.text,group.font,resumeLink(span.url));continue;}
     for(const char of group.text){const w=group.font.widthOfTextAtSize(char,size);if(used+w>maxWidth&&line.length)pushLine();append(char,group.font,resumeLink(span.url));}
    }
   }
  }
  pushLine();return lines;
 }
 function paint(line:Fragment[],x:number,baseline:number,size:number){
  for(const fragment of line){
   page.drawText(fragment.text,{x,y:baseline,font:fragment.font,size,color:rgb(0,0,0)});
   if(fragment.url&&fragment.width){
    const link=pdf.context.obj({Type:PDFName.of('Annot'),Subtype:PDFName.of('Link'),Rect:[x,baseline-2,x+fragment.width,baseline+size],Border:[0,0,0],A:{Type:PDFName.of('Action'),S:PDFName.of('URI'),URI:PDFString.of(fragment.url)}});
    page.node.addAnnot(pdf.context.register(link));
   }
   x+=fragment.width;
  }
 }
 function flow(spans:Span[],{size=10,leading=11.95,indent=0,align='left',gap=0,bullet=false}:{size?:number;leading?:number;indent?:number;align?:'left'|'center'|'right';gap?:number;bullet?:boolean}={}){
  const lines=layout(spans,size,available-indent);
  if(lines.length*leading<=height-top-bottom)ensure(lines.length*leading);
  for(const [index,line] of lines.entries()){
   ensure(leading);const lineWidth=line.reduce((sum,f)=>sum+f.width,0),offset=align==='center'?(available-indent-lineWidth)/2:align==='right'?available-indent-lineWidth:0;
   paint(line,margin+indent+offset,y-size,size);
   if(bullet&&index===0)paint(layout([{text:'•'}],size,10)[0],margin+3,y-size,size);
   y-=leading;
  }
  y-=gap;
 }
 function paired(left:Span[],right:Span[],{size=10,indent=0}:{size?:number;indent?:number}={}){
  const l=layout(left,size,available-indent),r=layout(right,size,available-indent);
  const lw=l[0]?.reduce((sum,f)=>sum+f.width,0)||0,rw=r[0]?.reduce((sum,f)=>sum+f.width,0)||0;
  if(l.length<=1&&r.length<=1&&lw+rw+14<=available-indent){
   ensure(11.95);if(l.length)paint(l[0],margin+indent,y-size,size);if(r.length)paint(r[0],width-margin-rw,y-size,size);y-=11.95;
  }else{flow(left,{size,indent});if(right.length)flow(right,{size,indent,align:'right'});}
 }
 function section(title:string,keep:number){ensure(22+keep);y-=5;flow([{text:title,style:'bold'}],{size:12,leading:14});page.drawLine({start:{x:margin,y:y+1},end:{x:width-margin,y:y+1},thickness:.4,color:rgb(0,0,0)});y-=3;}
 function links(fact:CareerFact):Span[]{return factLinks(fact).flatMap((link,index)=>[...(index?[{text:' | '}]:[]),{text:link.label,url:link.url}]);}
 function bullet(text:string){flow([{text}],{indent:11,bullet:true,gap:.5});}
 function skillText(f:CareerFact):Span[]{return [{text:f.title+(f.details.length?': ':' '),style:'bold'},...(f.organization?[{text:f.organization+' '}]:[]),{text:f.details.join('; ')}];}
 function pairHeight(left:Span[],right:Span[],indent=0){
  const l=layout(left,10,available-indent),r=layout(right,10,available-indent),sum=(line:Fragment[]=[])=>line.reduce((n,f)=>n+f.width,0);
  return l.length<=1&&r.length<=1&&sum(l[0])+sum(r[0])+14<=available-indent?11.95:(l.length+r.length)*11.95;
 }
 function firstBlock(f:CareerFact){
  const dates:Span[]=f.dates?[{text:f.dates}]:[],detail=f.details[0]?layout([{text:f.details[0]}],f.kind==='certification'||f.kind==='achievement'?9:10,available-11).length*(f.kind==='certification'||f.kind==='achievement'?11:11.95):0;
  if(f.kind==='skill')return layout(skillText(f),10,available).length*11.95;
  if(f.kind==='education')return pairHeight([{text:f.organization||f.title,style:'bold'}],f.annotation?[{text:f.annotation,style:'bold'}]:[])+(f.organization||f.dates?pairHeight(f.organization?[{text:f.title}]:[],dates):0)+detail+1;
  if(f.kind==='certification'||f.kind==='achievement')return pairHeight([{text:f.title,style:'bold'},...(f.organization?[{text:' -- '+f.organization}]:[])],dates,11)+detail+1;
  return pairHeight([{text:f.title,style:'bold'}],links(f))+(f.organization||f.dates?pairHeight(f.organization?[{text:f.organization}]:[],dates):0)+(f.technologies?layout([{text:f.technologies,style:'italic'}],9,available).length*11:0)+detail+1;
 }

 // Match the optical top of the supplied centered Computer Modern header.
 y+=6;
 flow([{text:document.name,style:'bold'}],{size:17.28,leading:21,align:'center',gap:2});
 const header=resumeHeader(document);
 for(const row of [0,1]){const items=header.filter(item=>item.row===row);if(items.length)flow(items.flatMap((item,index)=>[...(index?[{text:' | '}]:[]),{text:item.label,url:item.url}]),{align:'center'});}
 if(document.summary){section('Profile',layout([{text:document.summary}],10,available).length*11.95);flow([{text:document.summary}],{gap:1});}
 for(const group of document.sections){
  if(!group.facts.length)continue;
  section(templateSection(group.title),firstBlock(group.facts[0]));
  for(const fact of group.facts){
   ensure(firstBlock(fact));
   const title:Span[]=[{text:fact.title,style:'bold'}],dates:Span[]=fact.dates?[{text:fact.dates}]:[];
   if(fact.kind==='skill'){
    flow(skillText(fact));
    if(fact.dates||links(fact).length)paired(dates,links(fact),{size:9});
   }else if(fact.kind==='education'){
    paired([{text:fact.organization||fact.title,style:'bold'}],fact.annotation?[{text:fact.annotation,style:'bold'}]:[]);
    if(fact.organization||dates.length)paired(fact.organization?[{text:fact.title}]:[],dates);
    for(const detail of fact.details)bullet(detail);
    if(links(fact).length)flow(links(fact),{size:9,leading:11});y-=2;
   }else if(fact.kind==='certification'||fact.kind==='achievement'){
    const markerY=y;paired([...title,...(fact.organization?[{text:' -- '+fact.organization}]:[])],dates,{indent:11});
    paint(layout([{text:'•'}],10,10)[0],margin+3,markerY-10,10);
    for(const detail of fact.details)flow([{text:detail}],{size:9,leading:11,indent:11});
    if(links(fact).length)flow(links(fact),{size:9,leading:11,indent:11});y-=1;
   }else{
    paired(title,links(fact));
    if(fact.organization||dates.length)paired(fact.organization?[{text:fact.organization}]:[],dates);
    if(fact.technologies)flow([{text:fact.technologies,style:'italic'}],{size:9,leading:11});
    for(const detail of fact.details)bullet(detail);y+=.5;
   }
  }
 }
 await pdf.flush();
 // The pinned fontkit reports CFF-backed OTFs as TrueType to pdf-lib. Describe
 // these three intact OpenType streams correctly; leave Noto/legacy fonts alone.
 for(const font of embedded){
  const root=pdf.context.lookup(font.ref,PDFDict),child=root.lookup(PDFName.of('DescendantFonts'),PDFArray).lookup(0,PDFDict),descriptor=child.lookup(PDFName.of('FontDescriptor'),PDFDict);
  const streamRef=descriptor.get(PDFName.of('FontFile2'))||descriptor.get(PDFName.of('FontFile3'));
  if(!streamRef)throw new PublicError('The résumé font could not be embedded. Please try the LaTeX download.');
  child.set(PDFName.of('Subtype'),PDFName.of('CIDFontType0'));child.delete(PDFName.of('CIDToGIDMap'));
  descriptor.delete(PDFName.of('FontFile2'));descriptor.set(PDFName.of('FontFile3'),streamRef);
  const stream=pdf.context.lookup(streamRef);
  if(!(stream instanceof PDFRawStream))throw new PublicError('The résumé font stream could not be verified. Please try the LaTeX download.');
  stream.dict.set(PDFName.of('Subtype'),PDFName.of('OpenType'));
 }
 return new Uint8Array(await pdf.save());
}
