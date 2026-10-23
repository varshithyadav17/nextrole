import {extractEligibility,type EligibilityRequirements} from './eligibility';
/** Source-backed experience rules. Unknown or conflicting wording is never proof of zero experience. */
export const EXPERIENCE_RULE_VERSION=3;
type EvidenceSource='title'|'description';
export type ExperienceRequirements={
 version:1|2|typeof EXPERIENCE_RULE_VERSION;minimum:number|null;maximum:number|null;maximumExclusive?:boolean;
 evidence:string|null;review:string[];excludesFreshers?:boolean;
 evidenceItems?:{source:EvidenceSource;text:string}[];
};
const numbers:Record<string,number>={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20};
const amount='(?:\\d{1,2}(?:\\.\\d{1,2})?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)';
const duration=new RegExp('(?<![\\w.])('+amount+')\\s*(?:(?:[-–—−]|to|through|and)\\s*('+amount+'))?\\s*(\\+)?\\s*(years?|yrs?\\.?|months?|mos?\\.?)\\b[\u0027’]?','gi');
const optional=/\bpreferred\b|\bideally\b|nice[- ]to[- ]have|\bbonus\b|\boptional\b|not (?:strictly )?required/i;
const mandatory=/\brequired\b|\bminimum\b|\bmust\b|\bat least\b|\bmandatory\b/i;
const zero=/\b(?:no|zero|0)\s+(?:(?:prior|previous|work|professional|relevant|industry)\s+){0,3}experience\s+(?:is\s+)?(?:required|necessary|needed)\b|\bfreshers?\s+(?:(?:are|also)\s+)?(?:welcome|eligible|can apply|may apply)\b|\bopen to freshers?\b/i;
const count=(value:string)=>numbers[value.toLowerCase()]??Number(value);
const excerpt=(value:string)=>value.replace(/\s+/g,' ').trim().slice(0,420);

function parseExperience(description:string,inTitle=false):ExperienceRequirements{
 const result:ExperienceRequirements={version:EXPERIENCE_RULE_VERSION,minimum:null,maximum:null,evidence:null,review:[]};
 const text=description.slice(0,35000),rules:{minimum:number;maximum:number|null;exclusive:boolean;evidence:string}[]=[];
 let optionalSection=false,experienceSection=false,zeroEvidence:string|null=null;
 for(const line of text.split(/\n/)){
  const heading=line.trim().replace(/[:\s]+$/,'');
  if(heading.length<100&&/^(?:(?:preferred|minimum|required|basic|desired)\s+)?(?:qualifications|requirements|experience|what you (?:bring|need)|nice to have|bonus points|about (?:you|us)|benefits|responsibilities|what you.ll do)$/i.test(heading)){
   optionalSection=/preferred|desired|nice to have|bonus/i.test(heading);experienceSection=/experience|qualification|requirement|what you (?:bring|need)/i.test(heading);continue;
  }
  // Sentence boundaries keep a neighbouring preferred skill from weakening a mandatory rule.
  for(const part of line.split(/(?<=[.!?;])\s+(?=[A-Z*•-])|;\s*/)){
   const segment=part.trim();if(!segment)continue;
   const narrative=/\b(?:our (?:team|company|founder|clients?|customers?)|we (?:have|bring|offer)|founded|established)\b/i.test(segment)&&!/\b(?:you|your|candidate|applicant|must|required|minimum|at least)\b/i.test(segment);
   if(narrative)continue;
   if(/\bfreshers?\s+(?:are\s+)?not\s+(?:eligible|accepted)|\bno freshers\b/i.test(segment))result.excludesFreshers=true;
   if(zero.test(segment)&&!optionalSection)zeroEvidence=excerpt(segment);
   const units=[...segment.matchAll(duration)];
   for(let i=0;i<units.length;i++){
    const unit=units[i],index=unit.index!,end=index+unit[0].length;
    const before=segment.slice(i?units[i-1].index!+units[i-1][0].length:0,index);
    const after=segment.slice(end,i+1<units.length?units[i+1].index!:segment.length);
    const local=before.slice(-140)+unit[0]+after.slice(0,220);
    // Include technology-specific requirements, possessive years, and Experience: N years.
    const titleYears=inTitle&&/year|^yr/i.test(unit[4])&&!/\b(?:contract|duration|tenure|internship|programme?|program)\b/i.test(segment);
    const experience=/\b(?:experience|exp|yoe)\b/i.test(local)||experienceSection||titleYears||/\b(?:building|developing|designing|managing|leading|working|delivering|implementing|selling|programming)\b/i.test(after.slice(0,100));
    if(!experience)continue;
    const leadingOptional=optional.test(before)&&!mandatory.test(before.slice((before.search(optional)+1)));
    if(optionalSection||leadingOptional||optional.test(after)&&!mandatory.test(after.slice(0,after.search(optional))))continue;
    const a=count(unit[1]),b=unit[2]===undefined?null:count(unit[2]);
    const divisor=/month|^mo\b/i.test(unit[4])?12:1;
    if(!Number.isFinite(a)||a>40||b!==null&&(!Number.isFinite(b)||b>40||b<a)){
     result.review.push('The published experience range needs confirmation.');continue;
    }
    const upperOnly=/\b(?:up to|at most|maximum(?: of)?|less than|under)\s*$/i.test(before);
    const minimum=upperOnly?0:a/divisor,maximum=upperOnly?a/divisor:b===null?null:b/divisor;
    // Degree/experience alternatives require reviewing the complete route, not picking the highest number.
    if(/\bor\b/i.test(segment)&&(/\b(?:degree|bachelor|master|equivalent|projects?)\b/i.test(segment)||units.length>1)){
     result.review.push('Confirm the employer’s alternative experience or qualification routes: '+excerpt(segment));continue;
    }
    rules.push({minimum,maximum,exclusive:upperOnly&&/\b(?:less than|under)\s*$/i.test(before),evidence:excerpt(segment)});
   }
  }
 }
 if(rules.length){
  const strongest=rules.reduce((a,b)=>b.minimum>a.minimum?b:a);
  const upper=rules.filter(r=>r.maximum!==null).sort((a,b)=>a.maximum!-b.maximum!||Number(b.exclusive)-Number(a.exclusive))[0];
  result.minimum=strongest.minimum;result.maximum=upper?.maximum??null;result.evidence=strongest.evidence;
  if(upper?.exclusive)result.maximumExclusive=true;
  result.evidenceItems=[...new Set(rules.map(r=>r.evidence))].slice(0,6).map(text=>({source:inTitle?'title':'description',text}));
  if(result.maximum!==null&&(result.minimum>result.maximum||result.minimum===result.maximum&&result.maximumExclusive)){
   result.maximum=null;delete result.maximumExclusive;result.review.push('The published experience conditions conflict. Confirm them with the employer.');
  }
  if(zeroEvidence&&strongest.minimum>0)result.review.push('The listing accepts freshers but also states mandatory experience; the stated minimum still applies.');
 }else if(zeroEvidence){result.minimum=0;result.evidence=zeroEvidence;}
 if(result.excludesFreshers)result.review.push('The employer explicitly excludes freshers.');
 result.review=[...new Set(result.review)].slice(0,4);
 return result;
}

function evidenceItems(rule:ExperienceRequirements,source:EvidenceSource){
 return rule.evidenceItems|| (rule.evidence?[{source,text:rule.evidence}]:[]);
}
function combineExperience(body:ExperienceRequirements,title:ExperienceRequirements):ExperienceRequirements{
 const rules=[body,title].filter(r=>r.minimum!==null),strongest=rules.reduce<ExperienceRequirements|undefined>((a,b)=>!a||b.minimum!>a.minimum!?b:a,undefined);
 const review=[...body.review,...title.review];
 const items=[...evidenceItems(title,'title'),...evidenceItems(body,'description')];
 if(!strongest)return{version:EXPERIENCE_RULE_VERSION,minimum:null,maximum:null,evidence:null,review:[...new Set(review)].slice(0,4),...(body.excludesFreshers||title.excludesFreshers?{excludesFreshers:true}:{}),...(items.length?{evidenceItems:items.slice(0,2)}:{})};
 const upper=rules.filter(r=>r.maximum!==null).sort((a,b)=>a.maximum!-b.maximum!||Number(!!b.maximumExclusive)-Number(!!a.maximumExclusive))[0];
 const minimum=strongest.minimum!,maximum=upper?.maximum??null,exclusive=!!upper?.maximumExclusive;
 if(body.minimum!==null&&title.minimum!==null&&((body.minimum===0)!==(title.minimum===0)))review.push('The title and description disagree on fresher experience; the stated positive minimum still applies.');
 const conflict=maximum!==null&&(minimum>maximum||minimum===maximum&&exclusive);
 if(conflict)review.push('The published experience conditions conflict. Confirm them with the employer.');
 return{version:EXPERIENCE_RULE_VERSION,minimum,maximum:conflict?null:maximum,...(exclusive&&!conflict?{maximumExclusive:true}:{}),evidence:strongest.evidence,review:[...new Set(review)].slice(0,4),...(body.excludesFreshers||title.excludesFreshers?{excludesFreshers:true}:{}),...(items.length?{evidenceItems:items.slice(0,8)}:{})};
}

/** Inspect both actual source fields, keeping optional description headings separate from the title. */
export function extractExperience(description:string,title=''):ExperienceRequirements{
 return combineExperience(parseExperience(description),parseExperience(title.slice(0,500),true));
}

type ExperienceJob={title:string;description:string;minExperience:number|null;experienceEvidence:string|null;experienceRequirements?:ExperienceRequirements;eligibility?:EligibilityRequirements};
export function experienceForJob(job:ExperienceJob):ExperienceRequirements{
 if(job.description)return extractExperience(job.description,job.title);
 const saved=job.experienceRequirements;
 if(saved?.version===EXPERIENCE_RULE_VERSION)return saved;
 // A v1 row contains description-only evidence. Re-read its title immediately, without a refresh or DB rewrite.
 const body:ExperienceRequirements=saved?{...saved,review:[...saved.review,'The saved experience requirements need a current source check.']}:{version:EXPERIENCE_RULE_VERSION,minimum:job.minExperience!==null&&job.minExperience>0?job.minExperience:null,maximum:null,evidence:job.experienceEvidence,review:job.minExperience!==null&&job.minExperience>0?['The saved experience requirement needs a current source check.']:[]};
 return combineExperience(body,parseExperience(job.title.slice(0,500),true));
}
export function withExperienceRequirements<T extends ExperienceJob>(job:T):T{
 const rule=experienceForJob(job);return{...job,...(job.description?{eligibility:extractEligibility(job.title+'\n'+job.description)}:{}),experienceRequirements:rule,minExperience:rule.minimum,experienceEvidence:rule.evidence};
}

export function experienceLabel(rule:ExperienceRequirements|undefined,minimum:number|null){
 const value=rule?rule.minimum:minimum!==null&&minimum>0?minimum:null;if(value===null)return'Experience not confirmed';
 const max=rule?.maximum;
 if(max!==null&&max!==undefined)return value===0?(rule?.maximumExclusive?'Under ':'Up to ')+max+' years':value+'–'+max+' years';
 return value===0?'No experience required':value+'+ years required';
}
