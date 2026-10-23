import {z} from 'zod';
import {isSafeJobUrl} from './matching';
import {LETTER_TEMPLATE,templateLatex,latexEscape} from './resume-template';
export {latexEscape} from './resume-template';
const clean=z.string().trim().refine(s=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)&&!/(?:sk-(?:proj-)?|gsk_|AIza|nr_companion_)[A-Za-z0-9_-]{12,}/.test(s),'Remove credentials and control characters.');
const link=z.union([z.literal(''),z.string().url().max(2048).refine(isSafeJobUrl)]);
export const FACT_KINDS=['education','experience','project','skill','certification','achievement'] as const;
export const careerFactSchema=z.object({id:z.string().uuid(),kind:z.enum(FACT_KINDS),title:clean.pipe(z.string().min(1).max(160)),organization:clean.pipe(z.string().max(160)),dates:clean.pipe(z.string().max(100)),annotation:clean.pipe(z.string().max(100)).default(''),technologies:clean.pipe(z.string().max(250)).default(''),details:z.array(clean.pipe(z.string().min(1).max(500))).max(4),url:link,githubUrl:link.default(''),demoUrl:link.default(''),verified:z.boolean()});
export const careerSchema=z.object({name:clean.pipe(z.string().min(1).max(100)),email:z.union([z.literal(''),z.string().email().max(254)]),phone:clean.pipe(z.string().max(40)),location:clean.pipe(z.string().max(150)),website:link,links:z.object({linkedin:link.default(''),github:link.default(''),leetcode:link.default(''),codeforces:link.default('')}).default({}),summary:clean.pipe(z.string().max(1200)).default(''),summaryVerified:z.boolean().default(false),contactVerified:z.boolean(),facts:z.array(careerFactSchema).max(30)}).superRefine((p,context)=>{if(new Set(p.facts.map(f=>f.id)).size!==p.facts.length)context.addIssue({code:z.ZodIssueCode.custom,message:'Fact IDs must be unique.'});});
export type CareerFact=z.infer<typeof careerFactSchema>;
export type CareerProfile=z.infer<typeof careerSchema>;
export type ResumeContact={label:string;url?:string;row:0|1};
export type ResumeDocument={template?:typeof LETTER_TEMPLATE;name:string;contact:string[];header?:ResumeContact[];summary?:string;sections:{title:string;facts:CareerFact[]}[]};
export const emptyCareer:CareerProfile={name:'',email:'',phone:'',location:'',website:'',links:{linkedin:'',github:'',leetcode:'',codeforces:''},summary:'',summaryVerified:false,contactVerified:false,facts:[]};
const SECTION_NAMES:Record<CareerFact['kind'],string>={education:'Education',experience:'Experience',project:'Projects',skill:'Skills',certification:'Certifications',achievement:'Achievements'};
export function selectFacts(profile:CareerProfile,description:string){
 const words=new Set(description.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)||[]);
 return profile.facts.filter(f=>f.verified).map((fact,index)=>({fact,index,score:(fact.title+' '+(fact.technologies||'')+' '+fact.details.join(' ')).toLowerCase().split(/[^a-z0-9+#.-]+/).reduce((n,w)=>n+Number(words.has(w)),0)}))
  .sort((a,b)=>b.score-a.score||a.index-b.index).map(f=>f.fact.id);
}
export function resumeDocument(profile:CareerProfile,ids:string[],template:typeof LETTER_TEMPLATE|'legacy'=LETTER_TEMPLATE):ResumeDocument{
 if(!profile.contactVerified)throw new Error('Review and confirm your contact information first.');
 const facts=[...new Set(ids)].map(id=>profile.facts.find(f=>f.id===id&&f.verified)).filter((f):f is CareerFact=>!!f);
 if(template==='legacy')return {name:profile.name,contact:[profile.email,profile.phone,profile.location,profile.website,...Object.values(profile.links||{})].filter(Boolean),sections:FACT_KINDS.map(kind=>({title:SECTION_NAMES[kind],facts:facts.filter(f=>f.kind===kind)})).filter(s=>s.facts.length)};
 const header:ResumeContact[]=[];
 if(profile.phone)header.push({label:profile.phone,row:0});
 if(profile.email)header.push({label:profile.email,url:'mailto:'+profile.email,row:0});
 for(const [key,label,row] of [['github','GitHub',0],['linkedin','LinkedIn',0],['leetcode','LeetCode',1],['codeforces','Codeforces',1]] as const)if(profile.links?.[key])header.push({label,url:profile.links[key],row});
 if(profile.location)header.push({label:profile.location,row:1});
 if(profile.website)header.push({label:'Portfolio',url:profile.website,row:1});
 const order:CareerFact['kind'][]=['education','skill','experience','project','certification','achievement'];
 return {template:LETTER_TEMPLATE,name:profile.name,contact:[profile.email,profile.phone,profile.location,profile.website,...Object.values(profile.links||{})].filter(Boolean),header,summary:profile.summaryVerified?profile.summary||'':'',sections:order.map(kind=>({title:SECTION_NAMES[kind],facts:facts.filter(f=>f.kind===kind)})).filter(s=>s.facts.length)};
}
export function resumeLatex(document:ResumeDocument){
 if(document.template===LETTER_TEMPLATE)return templateLatex(document);
 const e=latexEscape;
 return ['% NextRole single-column resume. Compile locally with XeLaTeX or Tectonic.',
  '\\documentclass[10pt,a4paper]{article}','\\usepackage[margin=0.7in]{geometry}','\\usepackage{fontspec}','\\setmainfont{TeX Gyre Heros}','\\usepackage[hidelinks]{hyperref}','\\usepackage{enumitem}','\\setlist[itemize]{leftmargin=*,nosep}','\\pagestyle{empty}','\\setlength{\\parindent}{0pt}','\\begin{document}',
  '{\\LARGE\\bfseries '+e(document.name)+'}\\par\\smallskip',e(document.contact.join(' | '))+'\\par\\medskip',
  ...document.sections.flatMap(section=>['\\section*{'+e(section.title)+'}',...section.facts.flatMap(f=>[
   '\\textbf{'+e(f.title)+'}'+(f.organization?' --- '+e(f.organization):'')+'\\par',...(f.dates?['{\\small '+e(f.dates)+'}\\par']:[]),
   ...(f.details.length?['\\begin{itemize}',...f.details.map(line=>'\\item '+e(line)),'\\end{itemize}']:[]),...[f.url,f.githubUrl,f.demoUrl].filter(Boolean).map(url=>'\\href{'+e(url)+'}{'+e(url)+'}\\par'),'\\smallskip'])]),
  '\\end{document}',''].join('\n');
}
export type PreparationQuestion={id:string;text:string;origin:'observed'|'user-pasted'|'suggested';sourceUrl:string|null;observedAt:string|null;answer:string;reviewed:boolean;factIds:string[];missingFacts:string[];evidence?:{factId:string;quote:string}[]};
export function draftAnswer(question:string,profile:CareerProfile,selected:string[]){
 const q=question.toLowerCase(),facts=selected.map(id=>profile.facts.find(f=>f.id===id&&f.verified)).filter((f):f is CareerFact=>!!f);
 const critical=/\b(?:authoriz|sponsor|visa|citizen|legal|disabilit|gender|race|ethnic|veteran|convict|criminal|salary|stipend|compensation|notice period|start date|availability|available|relocat|consent|attest|agree|certify)\w*\b/i;
 if(critical.test(q))return {answer:'',factIds:[],missingFacts:['Enter and confirm this answer yourself. No authorization, personal declaration, compensation or availability is inferred.']};
 if(/\b(?:e-?mail)\b/.test(q))return {answer:profile.contactVerified?profile.email:'',factIds:[],missingFacts:profile.contactVerified&&profile.email?[]:['Confirm your email in Career profile.']};
 if(/\b(?:full name|your name)\b/.test(q))return {answer:profile.contactVerified?profile.name:'',factIds:[],missingFacts:profile.contactVerified?[]:['Confirm your name in Career profile.']};
 for(const key of ['linkedin','github','leetcode','codeforces'] as const)if(q.includes(key)&&!/project|repository/.test(q))return {answer:profile.contactVerified?profile.links?.[key]||'':'',factIds:[],missingFacts:profile.contactVerified&&profile.links?.[key]?[]:['Add and verify your '+key+' profile URL.']};
 if(/\b(?:phone|mobile)\b/.test(q))return {answer:profile.contactVerified?profile.phone:'',factIds:[],missingFacts:profile.contactVerified&&profile.phone?[]:['Confirm your phone number in Career profile.']};
 if(/\b(?:project|repository|repo)\b/.test(q)&&/\b(?:url|link|github|demo)\b/.test(q)){
  const projects=facts.filter(f=>f.kind==='project'),named=projects.filter(f=>q.includes(f.title.toLowerCase())),chosen=named.length===1?named[0]:projects.length===1?projects[0]:null;
  const url=chosen?(/\bdemo\b/.test(q)?chosen.demoUrl:chosen.githubUrl||chosen.url):'';
  return {answer:url||'',factIds:chosen&&url?[chosen.id]:[],missingFacts:url?[]:['Choose the project and confirm its repository or demo URL.']};
 }
 if(/\b(?:why|motivat|interest|company|culture)\w*\b/.test(q))return {answer:'',factIds:[],missingFacts:['Add your own reason for this employer and role. Motivation is a personal fact, not an inferred credential.']};
 let relevant=facts;
 if(/project|built|portfolio/.test(q))relevant=facts.filter(f=>f.kind==='project');
 else if(/educat|degree|universit|college|graduat/.test(q))relevant=facts.filter(f=>f.kind==='education');
 else if(/skill|technolog|programming/.test(q))relevant=facts.filter(f=>f.kind==='skill'||f.kind==='project');
 else if(/experience|background|challenge|achievement|about yourself/.test(q))relevant=facts.filter(f=>f.kind==='experience'||f.kind==='project'||f.kind==='achievement');
 else return {answer:'',factIds:[],missingFacts:['This question needs your own answer. Add verified supporting facts where appropriate.']};
 const chosen=relevant.slice(0,2);
 return {answer:chosen.map(f=>[f.title+(f.organization?' — '+f.organization:''),f.dates,...f.details,f.url,f.githubUrl,f.demoUrl].filter(Boolean).join('\n')).join('\n\n'),factIds:chosen.map(f=>f.id),missingFacts:chosen.length?[]:['Add and verify supporting career facts before preparing this answer.']};
}
