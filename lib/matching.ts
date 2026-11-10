import type { Job, Profile, Match,RequirementCheck } from './types';
import {checkEligibility,extractEligibility,eligibilityEvidence} from './eligibility';
import {checkTiming} from './job-timing';
import {extractExperience,experienceForJob} from './experience';
import {locationFit} from './location';
import {verificationState} from './freshness';
import {availabilityUnconfirmed} from './availability';
export function plainText(value: string): string {
  return value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<\/(p|div|li|h[1-6])>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n\n').trim();
}
const SKILLS=['Python','SQL','JavaScript','TypeScript','React','Java','C++','Excel','Figma','Tableau','Power BI','AWS','Docker','Kubernetes','Machine learning','Product management','Data analysis','Communication','Sales','Marketing','Go','Rust'];
export function extractSkills(text: string): string[] {
  const s=text.toLowerCase();
  return SKILLS.filter(k=>new RegExp('(^|[^a-z])'+k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(s));
}
export function experienceFrom(text: string): { value:number|null; evidence:string|null } {
  const rule=extractExperience(text);return{value:rule.minimum,evidence:rule.evidence};
}
export function jobKey(company:string,title:string,location:string,providerId:string): string {
  return company.toLowerCase().replace(/[^a-z0-9]/g,'')+':'+providerId;
}
const families:Record<string,string[]>={
  'software engineer':['software','developer','frontend','front-end','backend','back-end','full stack','fullstack','sde','engineering intern'],
  'data analyst':['data analyst','analytics','business intelligence','data science','data scientist','analytics engineer'],
  'product manager':['product manager','product management','associate product','product intern','apm'],
  'product analyst':['product analyst','product analytics','business analyst'],
  'designer':['designer','design intern','ux','ui/ux'],
  'marketing':['marketing','growth','content','seo','social media','employer branding'],
  'business analyst':['business analyst','business operations','strategy','operations analyst','customer operations'],
  'ai / ml engineer':['machine learning','ai engineer','artificial intelligence','ml engineer','research intern','ai evaluations'],
};
export function matchesRole(title:string,role:string){const t=title.toLowerCase();const r=role.trim().toLowerCase();return(families[r]||[r]).some(s=>s.length<=4?new RegExp('(^|[^a-z0-9])'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)').test(t):t.includes(s));}
export function matchJob(job:Job,p:Profile):Match {
  const reasons:string[]=[];const cautions:string[]=[];const checks:RequirementCheck[]=[];let score=0;let relevant=true;let uncertain=false;
  if(availabilityUnconfirmed(job)){uncertain=true;cautions.push('Current availability is unconfirmed. Check the original listing before applying.');}
  if(job.sourceCategory==='job-board'&&(!job.contentCheckedAt||!Number.isFinite(Date.parse(job.contentCheckedAt))||Date.now()-Date.parse(job.contentCheckedAt)>7*86400000)){uncertain=true;cautions.push('The listing text needs a fresh review. Confirm the current requirements on the original listing.');}
  if(job.sourceSeniority&&((p.experience<2&&/\bsenior\b|\bstaff\b|\bprincipal\b|\bdirector\b|\blead\b|\bexecutive\b/i.test(job.sourceSeniority))||(p.experience===0&&/\bmid(?:dle)?\b|\bmanager\b/i.test(job.sourceSeniority)))){relevant=false;cautions.push('Jobicy labels this role '+job.sourceSeniority+'; it is outside your experience.');}
  const role=p.roles.find(r=>matchesRole(job.title,r));
  if(role){score+=40;reasons.push('Matches '+role.toLowerCase());}else if(p.roles.length){relevant=false;}
  const {matches:place,worldwide,unknownRemote}=locationFit(job,p.locations);
  if(place){score+=20;reasons.push(worldwide?'Remote location: worldwide':'Location matches');}
  else if(unknownRemote){uncertain=true;cautions.push('Remote hiring region needs confirmation');}
  else{relevant=false;cautions.push('Outside your preferred locations');}
  if(job.mode==='Not specified'){uncertain=true;cautions.push('Work arrangement not specified');}
  else if(!p.modes.includes(job.mode)){relevant=false;cautions.push('Outside your preferred work arrangements');}else{score+=5;}
  if(job.jobType==='Not specified'){uncertain=true;cautions.push('Opportunity type not specified');}
  if(!p.jobTypes.includes(job.jobType)&&job.jobType!=='Not specified')relevant=false;
  const experience=experienceForJob(job),minimum=experience.minimum;
  if(minimum!==null&&minimum>p.experience){relevant=false;cautions.push('Requires at least '+minimum+' years; your profile has '+p.experience+'.');}
  else if(experience?.maximum!==null&&experience?.maximum!==undefined&&(experience.maximumExclusive?p.experience>=experience.maximum:p.experience>experience.maximum)){relevant=false;cautions.push('Outside the employer’s published maximum experience.');}
  else if(experience?.excludesFreshers&&p.experience===0){relevant=false;cautions.push('The employer explicitly excludes freshers.');}
  else if(minimum!==null&&experience){score+=20;reasons.push(minimum===0?'Published experience requirement accepts freshers':'Experience requirement fits');}
  else{uncertain=true;cautions.push('No explicit experience requirement was found in the title or description.');}
  if(experience?.review.length){uncertain=true;cautions.push(...experience.review);}
  const experienceConflict=minimum!==null&&minimum>p.experience||experience.maximum!==null&&(experience.maximumExclusive?p.experience>=experience.maximum:p.experience>experience.maximum)||!!experience.excludesFreshers&&p.experience===0;
  checks.push({key:'experience',label:'Professional experience',status:experienceConflict?'conflict':experience.review.length?'review':minimum===null?'unstated':'met',requirement:minimum===null?'Numeric experience requirement not confirmed':(minimum===0?'0':String(minimum))+(experience.maximum!==null?'–'+experience.maximum+(experience.maximumExclusive?' (upper limit excluded)':''):'+')+' years',profile:p.experience===0?'Fresher · 0 years':p.experience+' years',evidence:experience.evidence||undefined});
  if(p.experience<2&&!/\bintern(?:ship)?\b/i.test(job.title)&&/\bsenior\b|\bstaff\b|\bprincipal\b|\bdirector\b|\blead\b|\bhead\b/i.test(job.title)){relevant=false;cautions.push('The title indicates a senior role outside your experience.');}
  const skills=p.skills.filter(s=>job.skills.some(k=>k.toLowerCase()===s.toLowerCase()));
  if(skills.length){score+=Math.min(15,skills.length*5);reasons.push('Skills: '+skills.slice(0,3).join(', '));}
  const eligibility=job.description?extractEligibility(job.title+'\n'+job.description):job.eligibility;
  const academic=checkEligibility(eligibility,p);
  relevant=relevant&&academic.relevant;uncertain=uncertain||academic.uncertain;reasons.push(...academic.reasons);cautions.push(...academic.cautions);
  checks.push(...eligibilityEvidence(eligibility,p));
  const timing=checkTiming(eligibility?.timing,p,job.jobType);relevant=relevant&&timing.relevant;uncertain=uncertain||timing.uncertain;reasons.push(...timing.reasons);cautions.push(...timing.cautions);checks.push(...timing.checks);
  if(job.deadline&&new Date(job.deadline).getTime()<Date.now())relevant=false;
  const verification=verificationState(job);
  if(verification==='closed'){relevant=false;cautions.push('This opening is closed or its published deadline has passed.');}
  else if(verification!=='fresh'){uncertain=true;cautions.push('Availability has not been confirmed in the last 24 hours. Recheck the employer’s page.');}
  if(job.evidenceComplete===false){uncertain=true;cautions.push('The source description was incomplete or shortened. Review the full employer listing before relying on eligibility.');}
  checks.push({key:'availability',label:'Application availability',status:verification==='closed'?'conflict':verification!=='fresh'||availabilityUnconfirmed(job)?'review':'met',requirement:verification==='closed'?'Closed / deadline passed':verification==='fresh'&&!availabilityUnconfirmed(job)?'Present in a recently checked source':'Needs a current source check',profile:job.lastChecked||'No independent check',evidence:job.deadline?'Published deadline: '+job.deadline:undefined});
  return {score,relevant,uncertain,reasons:reasons.slice(0,4),cautions:[...new Set(cautions)],checks};
}
export function inferMode(location:string,text:string):string{
  if(/hybrid/i.test(location))return 'Hybrid';if(/remote/i.test(location))return 'Remote';
  if(/\bhybrid (?:work|role|model|schedule)|work(?:ing)? (?:in a |on a )?hybrid/i.test(text))return 'Hybrid';
  if(/fully remote|100% remote|this (?:is a |role is )remote/i.test(text))return 'Remote';
  if(/on[- ]site|work from (?:the )?office|office.based/i.test(text))return 'On-site';return 'Not specified';
}
export function isSafeJobUrl(url:string):boolean{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost$|0\.|127\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(?:18|19)\.|\[)/i.test(u.hostname);}catch{return false;}}
export function needsReminder(status:string,active:boolean,deadline:string|null,remindAt:string|null,now:Date):boolean{
  if(status!=='interested'||!active)return false;if(deadline&&new Date(deadline).getTime()<=now.getTime())return false;
  if(remindAt)return new Date(remindAt).getTime()<=now.getTime();return !!deadline&&(new Date(deadline).getTime()-now.getTime())<=48*3600000;
}
