import {emptyCareer,careerSchema,careerFactSchema,type CareerFact,type CareerProfile} from './career';
import {isSafeJobUrl} from './matching';
const headings:Record<string,CareerFact['kind']>={education:'education',academicqualifications:'education',qualifications:'education',experience:'experience',workexperience:'experience',professionalexperience:'experience',internships:'experience',projects:'project',projectexperience:'project',academicprojects:'project',personalprojects:'project',skills:'skill',technicalskills:'skill',technicalexpertise:'skill',technologies:'skill',certifications:'certification',certificates:'certification',achievements:'achievement',awards:'achievement'};
const key=(line:string)=>line.toLowerCase().replace(/[^a-z]/g,'');
const bullet=/^[•●▪◦*\-–]\s*/;
const action=/^(?:built|created|developed|designed|implemented|worked|used|analyzed|analysed|led|managed|improved|achieved|learned|using|integrated|added|tested|presented|completed)\b/i;
const degree=/\b(?:b\.?\s?tech|m\.?\s?tech|bachelor|master|b\.?e\.?|b\.?sc|m\.?sc|ph\.?d|class\s+(?:x|xi|xii|10|12)|diploma|secondary school|intermediate education)\b/i;
const date=/(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2}(?:\s*(?:--|[-–—/]|to)\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+)?(?:(?:19|20)\d{2}|present))?/i;
/** Unverified, conservative grouping. Review always precedes résumé generation. */
export function profileFromResume(text:string,links:string[]=[]):CareerProfile{
 const lines=text.replace(/\u0000/g,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),facts:CareerFact[]=[];
 const headingAt=lines.findIndex(s=>!!headings[key(s)]),header=lines.slice(0,headingAt<0?5:headingAt);
 const first=header.find(s=>/^[\p{L} .'-]{3,80}$/u.test(s)&&!headings[key(s)]&&!/^(resume|curriculum vitae|cv)$/i.test(s));
 const urls=[...new Set([...text.matchAll(/(?:https:\/\/)?(?:www\.)?(?:github\.com|linkedin\.com|leetcode\.com|codeforces\.com)\/[A-Za-z0-9_./?=#%-]+/gi)].map(m=>m[0].replace(/[.,;)]+$/,'')).map(u=>u.startsWith('https://')?u:'https://'+u).concat(links))].filter(isSafeJobUrl);
 const phone=[...text.matchAll(/(?:\+\d{1,3}[ -]?)?\b\d[\d ()-]{8,}\d\b/g)].map(m=>m[0]).find(s=>s.replace(/\D/g,'').length>=9&&s.replace(/\D/g,'').length<=15)||'';
 const profile:CareerProfile={...emptyCareer,links:{...emptyCareer.links},facts,name:first||'',email:text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]||'',phone};
 for(const name of ['github','linkedin','leetcode','codeforces'] as const)profile.links[name]=urls.find(u=>new URL(u).hostname.replace(/^www\./,'')===name+'.com'&&(name!=='github'||new URL(u).pathname.split('/').filter(Boolean).length===1))||'';
 let kind:CareerFact['kind']|null=null,current:CareerFact|null=null;
 const add=(title:string)=>{if(facts.length>=30||!title.trim())return null;const fact=careerFactSchema.parse({id:crypto.randomUUID(),kind:kind!,title:title.slice(0,160),organization:'',dates:'',details:[],url:'',verified:false});facts.push(fact);return fact;};
 const detail=(line:string,continuation=false)=>{if(!current)return;const last=current.details.length-1;if(continuation&&last>=0&&current.details[last].length+line.length<499)current.details[last]+=' '+line;else if(current.details.length<4)current.details.push(line.slice(0,500));};
 for(const line of lines){
  if(headings[key(line)]){kind=headings[key(line)];current=null;continue;}
  if(['summary','profile','objective','interests','hobbies','references'].includes(key(line))){kind=null;current=null;continue;}
  if(!kind||line===first||line===profile.email||line===profile.phone)continue;
  const columns=line.split(/\t+/),left=columns[0].replace(bullet,'').trim(),right=columns.slice(1).filter(s=>!/^https:\/\//i.test(s)).join(' ').trim(),isBullet=bullet.test(line);
  if(!left)continue;
  if(kind==='skill'){
   const colon=left.indexOf(':');
   if(colon>0&&colon<70){current=add(left.slice(0,colon));detail(left.slice(colon+1).trim());}
   else if(!current)current=add(left);else detail(left,true);
   continue;
  }
  if(kind==='education'){
   if(degree.test(left)){
    if(current&&!degree.test(current.title)&&!current.organization&&!current.details.length){current.organization=current.title;current.title=left.slice(0,160);}
    else current=add(left);
    if(current){const dates=(right||left).match(date)?.[0];if(dates){current.dates=dates;current.title=current.title.replace(dates,'').trim();}}
   }else if(current&&degree.test(current.title)&&!current.organization&&!isBullet)current.organization=left.slice(0,160);
   else if(isBullet)detail(left);
   else current=add(left);
   if(current&&right&&!date.test(right))current.annotation=right.slice(0,100);
   continue;
  }
  if(kind==='project'||kind==='experience'){
   const technology=!isBullet&&current&&!current.details.length&&(/^(?:tech(?:nologies| stack)?|tools|stack)\s*:/i.test(left)||left.includes(' | '));
   if(technology){current!.technologies=left.replace(/^(?:tech(?:nologies| stack)?|tools|stack)\s*:\s*/i,'').slice(0,250);continue;}
   if(isBullet){if(!current)current=add(kind==='project'?'Project details':'Experience details');detail(left);continue;}
   if(current&&date.test(left)&&left.length<100&&left.match(date)?.[0]===left){current.dates=left;continue;}
   const title=left.length<=160&&!/[.!?]$/.test(left)&&!action.test(left)&&!/^(?:and|the|with|for|to|in|on|of|as|by|from|using)\b/i.test(left);
   if(!current||title&&(current.details.length>0||kind==='project'))current=add(left);
   else if(current&&kind==='experience'&&!current.organization&&!current.details.length)current.organization=left.slice(0,160);
   else detail(left,true);
   if(current){
    if(right&&date.test(right))current.dates=right.match(date)![0];
    for(const url of line.match(/https:\/\/[^\s<>\]]+/g)||[]){if(!isSafeJobUrl(url))continue;if(new URL(url).hostname==='github.com')current.githubUrl=url;else current.demoUrl=url;}
   }
   continue;
  }
  if(!current||isBullet&&!action.test(left))current=add(left);else detail(left,true);
 }
 return profile.name?careerSchema.parse(profile):profile;
}
