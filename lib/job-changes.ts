import type {Job} from './types';
import {extractEligibility} from './eligibility';
import {experienceForJob} from './experience';
function requirements(job:Job){
 const r=job.description?extractEligibility(job.title+'\n'+job.description):job.eligibility,e=experienceForJob(job);
 return JSON.stringify({experience:[e.minimum,e.maximum,e.maximumExclusive||false,e.excludesFreshers||false],graduation:r?.graduation?[r.graduation.years,r.graduation.minimum,r.graduation.maximum]:null,degree:r?.education?[r.education.levels,r.education.flexible,r.education.disciplines,r.education.disciplineFlexible]:null,academics:r?.academics?[r.academics.cgpa,r.academics.scale,r.academics.percentage,r.academics.alternative]:null,timing:r?.timing?[r.timing.startBy,r.timing.immediate,r.timing.months]:null});
}
export function withJobChanges(old:Job|undefined,next:Job):Job{
 if(!old)return next;
 const fields:string[]=[];
 if(old.active&&!next.active||old.availability==='open'&&next.availability==='closed')fields.push('availability');
 if(old.title.trim()!==next.title.trim())fields.push('job title');
 if(old.location.trim()!==next.location.trim()||old.mode!==next.mode)fields.push('location / arrangement');
 if(old.url!==next.url)fields.push('application destination');
 if(old.deadline!==next.deadline)fields.push('deadline');
 if(requirements(old)!==requirements(next))fields.push('eligibility requirements');
 if(!fields.length)return {...next,...(old.change?{change:old.change}:{})};
 return {...next,change:{at:next.lastChecked,fields,previous:{deadline:old.deadline,title:old.title,url:old.url},summary:'The source changed '+fields.join(', ')+'. Review the updated listing before applying.'}};
}
