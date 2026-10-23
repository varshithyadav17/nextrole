import type {CareerFact,ResumeContact,ResumeDocument} from './career';
import {isSafeJobUrl} from './matching';

export const LETTER_TEMPLATE='nextrole-letter-v1' as const;

/** User-supplied layout, with no candidate data or executable user markup. */
export const LETTER_PREAMBLE=String.raw`\documentclass[letterpaper,10pt]{article}

\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage[hidelinks]{hyperref}
\usepackage{enumitem}
\usepackage{microtype}

\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}

%==================== PAGE GEOMETRY ====================
\addtolength{\oddsidemargin}{-0.50in}
\addtolength{\evensidemargin}{-0.50in}
\addtolength{\textwidth}{1.00in}
\addtolength{\topmargin}{-0.65in}
\addtolength{\textheight}{1.30in}

%==================== SECTION STYLE ====================
\titleformat{\section}
{\large\bfseries}
{}{0em}
{}
[\titlerule]

\titlespacing*{\section}{0pt}{5pt}{2pt}

%==================== BULLET STYLE ====================
\setlist[itemize]{
    leftmargin=1.1em,
    itemsep=0.5pt,
    topsep=1pt,
    parsep=0pt,
    partopsep=0pt
}`;

export function latexEscape(value:string){
 const replacements:Record<string,string>={'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','&':'\\&','#':'\\#','%':'\\%','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'};
 return value.replace(/[\\{}$&#%_^~]/g,char=>replacements[char]).replace(/[\u0000-\u001f]/g,' ');
}

/** Links remain data. Refuse non-web schemes except an actual contact email. */
export function resumeLink(value:string|undefined):string|undefined{
 if(!value)return undefined;
 if(/^mailto:[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)&&value.length<=261&&!/[?#\r\n]/.test(value)&&!/%[a-f0-9]{2}/i.test(value))return value;
 if(value.length>2048||!isSafeJobUrl(value))return undefined;
 return new URL(value).href;
}
export function resumeHeader(document:ResumeDocument):ResumeContact[]{
 return document.header||document.contact.map(label=>({label,row:0 as const}));
}
export function factLinks(fact:CareerFact){
 const entries=[{label:'Live Demo',url:fact.demoUrl},{label:'GitHub',url:fact.githubUrl},{label:'Link',url:fact.url}];
 const seen=new Set<string>();
 return entries.filter((item):item is {label:string;url:string}=>!!item.url&&!!resumeLink(item.url)&&!seen.has(item.url)&&!!seen.add(item.url));
}
export function templateSection(title:string){return title==='Skills'?'Technical Skills':title;}

export function templateLatex(document:ResumeDocument){
 function e(value:string){
  const visible=(text:string)=>latexEscape(text).replace(/\|/g,'\\textbar{}').replace(/</g,'\\textless{}').replace(/>/g,'\\textgreater{}');
  return value.split(/(\s+)/).map(word=>{
   const chars=[...word];if(chars.length<=48)return visible(word);
   const pieces:string[]=[];for(let i=0;i<chars.length;i+=24)pieces.push(visible(chars.slice(i,i+24).join('')));
   return pieces.join('\\allowbreak{}');
  }).join('');
 }
 function href(label:string,url?:string){
  const safe=resumeLink(url);
  // URL syntax is escaped too; braces, fragments and query parameters cannot end a macro.
  return safe?'\\href{'+latexEscape(safe)+'}{'+e(label)+'}':e(label);
 }
 const bullets=(lines:string[])=>lines.length?['\\begin{itemize}',...lines.map(line=>'\\item '+e(line)),'\\end{itemize}']:[];
 const header=resumeHeader(document),rows=[0,1].map(row=>header.filter(item=>item.row===row).map(item=>href(item.label,item.url)).join(' $|$ ')).filter(Boolean);
 const body=document.sections.flatMap(section=>['\\section*{'+e(templateSection(section.title))+'}',...section.facts.flatMap(f=>{
  const links=factLinks(f).map(link=>href(link.label,link.url)).join(' $|$ ');
  if(f.kind==='education')return [
   '\\textbf{'+e(f.organization||f.title)+'}'+(f.annotation?' \\hfill \\textbf{'+e(f.annotation)+'}':'')+'\\par',
   (f.organization?e(f.title):'')+(f.dates?' \\hfill '+e(f.dates):'')+'\\par',...bullets(f.details),...(links?[links+'\\par']:[]),'\\smallskip'];
  if(f.kind==='skill')return ['\\textbf{'+e(f.title)+(f.details.length?':':'')+'}'+(f.organization?' '+e(f.organization):'')+(f.details.length?' '+f.details.map(e).join('; '):'')+'\\par',...(f.dates||links?['{\\small '+e(f.dates)+(links?' \\hfill '+links:'')+'}\\par']:[])];
  if(f.kind==='certification'||f.kind==='achievement')return ['\\begin{itemize}','\\item \\textbf{'+e(f.title)+'}'+(f.organization?' -- '+e(f.organization):'')+(f.dates?' \\hfill {\\small '+e(f.dates)+'}':'')+(f.details.length?'\\\\\n{\\small '+f.details.map(e).join(' ')+'}':'')+(links?'\\\\ '+links:''),'\\end{itemize}'];
  return ['\\textbf{'+e(f.title)+'}'+(links?' \\hfill '+links:'')+'\\par',...(f.organization||f.dates?[e(f.organization)+(f.dates?' \\hfill '+e(f.dates):'')+'\\par']:[]),...(f.technologies?['{\\small\\textit{'+e(f.technologies)+'}}\\par']:[]),...bullets(f.details),'\\smallskip'];
 })]);
 return [LETTER_PREAMBLE,'% NextRole template '+LETTER_TEMPLATE+'. All personal text is escaped.','% Compile with pdfLaTeX for Latin text; XeLaTeX + suitable fonts for other scripts.','\\begin{document}','\\begin{center}','{\\LARGE\\textbf{'+e(document.name)+'}}\\\\[2pt]',...rows.map((row,index)=>row+(index<rows.length-1?'\\\\':'')),'\\end{center}',...(document.summary?['\\section*{Profile}',e(document.summary)]:[]),...body,'\\end{document}',''].join('\n');
}
