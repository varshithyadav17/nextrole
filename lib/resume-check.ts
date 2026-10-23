import {extractSkills} from './matching';
import type {ResumeDocument} from './career';
export type ResumeTip={title:string;detail:string};
function tipsFor(missing:string[],checks:{label:string;pass:boolean}[]):ResumeTip[]{
 const tips:ResumeTip[]=[];
 if(missing.length)tips.push({title:'Show relevant evidence',detail:'The JD mentions '+missing.slice(0,4).join(', ')+'. If you have used these, show them in a real project or experience. Do not add skills you do not have.'});
 if(!checks[0]?.pass)tips.push({title:'Check your contact details',detail:'Use a readable email address in the document body.'});
 if(!checks[1]?.pass)tips.push({title:'Use clear section headings',detail:'Include Education, Experience or Projects so your evidence is easy to locate.'});
 if(!checks[2]?.pass)tips.push({title:'Make skills easy to find',detail:'Add a Skills section containing only tools and skills you actually know.'});
 tips.push({title:'Strengthen one project bullet',detail:'State your action, the tools you used and a real outcome. Use a number only when you can substantiate it.'});
 return tips.slice(0,4);
}
function recognisedSkills(text:string){
 const extra=['Pandas','NumPy','PostgreSQL','MySQL','MongoDB','Node.js','Next.js','Git','Linux','REST','GraphQL','Spring','Django','Flask','FastAPI','HTML','CSS','Kotlin','Swift','TensorFlow','PyTorch','scikit-learn','Statistics','A/B testing','Stakeholder management','Agile','Scrum','Jira','Roadmap','User research','Wireframing','Prototyping','Business analysis','Requirements gathering','Data visualization','ETL','Spark','Hadoop','Azure','GCP'];
 const has=(source:string,skill:string)=>new RegExp('(^|[^a-z0-9])'+skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)','i').test(source);
 return [...new Set([...extractSkills(text),...extra.filter(s=>has(text,s))])];
}
export function resumeCheck(document:ResumeDocument,description:string){
 const text=[document.name,document.summary||'',...document.contact,...document.sections.flatMap(s=>[s.title,...s.facts.flatMap(f=>[f.title,f.organization,f.kind==='project'||f.kind==='experience'?f.technologies||'':'',...f.details])])].join(' ');
 const requested=recognisedSkills(description),present=new Set(recognisedSkills(text).map(s=>s.toLowerCase()));
 const matched=requested.filter(s=>present.has(s.toLowerCase())),missing=requested.filter(s=>!present.has(s.toLowerCase()));
 const checks=[{label:'Contact information provided',pass:document.contact.some(s=>s.includes('@'))},{label:'Education, experience or projects included',pass:document.sections.some(s=>['Education','Experience','Projects'].includes(s.title)&&s.facts.length>0)},{label:'Skills section included',pass:document.sections.some(s=>/^(?:technical )?skills$/i.test(s.title)&&s.facts.length>0)}];
 return {score:requested.length?Math.round(70*matched.length/requested.length+30*checks.filter(c=>c.pass).length/checks.length):null,matched,missing,checks,tips:tipsFor(missing,checks),formula:'70% recognised JD skill coverage + 30% three text-structure checks. Each recognised JD skill has equal weight. Required and preferred skills are not distinguished by this metric.',notice:'NextRole résumé compatibility check, not an employer ATS score or hiring probability. It checks saved text, not a live ATS parser. Eligibility is assessed separately. Missing skills must never be added unless true.'};
}
export type ResumeCheck=ReturnType<typeof resumeCheck>;

/** Text-only analysis for an uploaded original. It never claims an employer parser score. */
export function uploadedResumeCheck(text:string,description:string):ResumeCheck{
 const requested=recognisedSkills(description),present=new Set(recognisedSkills(text).map(s=>s.toLowerCase())),matched=requested.filter(s=>present.has(s.toLowerCase())),missing=requested.filter(s=>!present.has(s.toLowerCase()));
 const checks=[{label:'Email address found in reviewed text',pass:/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)},{label:'Education, experience or project heading found',pass:/\b(?:education|experience|projects?|qualifications)\b/i.test(text)},{label:'Skills or technologies heading found',pass:/\b(?:skills|technologies|technical expertise)\b/i.test(text)}];
 return {score:requested.length?Math.round(70*matched.length/requested.length+30*checks.filter(c=>c.pass).length/3):null,matched,missing,checks,tips:tipsFor(missing,checks),formula:'70% recognised JD skill coverage + 30% three text-structure checks. Required and preferred skills are weighted equally.',notice:'Internal résumé/JD text compatibility. This does not run the employer ATS, inspect its parser or predict hiring. Review extraction errors and eligibility separately; only add skills you actually have.'};
}
