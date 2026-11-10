import type {Profile,RequirementCheck} from './types';
import {extractTiming,type TimingRequirements} from './job-timing';

type EducationLevel='diploma'|'bachelor'|'master'|'doctorate';
export type EligibilityRequirements={
 version?:number;
 graduation?:{years:number[];minimum?:number;maximum?:number;evidence:string};
 education?:{levels:EducationLevel[];flexible:boolean;inProgressAllowed?:boolean;disciplines?:string[];disciplineFlexible?:boolean;evidence:string};
 academics?:{cgpa?:number;scale?:number;percentage?:number;alternative:boolean;evidence:string};
 timing?:TimingRequirements;
 review:string[];
};
const degreePatterns:[EducationLevel,RegExp][]=[
 ['doctorate',/\bph\.?\s?d\b|\bdoctor(?:ate|al)\b/i],
 ['master',/\bmaster(?:['’]?s)?\b|\bm\.?\s?(?:tech|sc|ca|ba|com)\b|\bm\.?e\.?\b|\bpost[- ]graduate\b/i],
 ['bachelor',/\bbachelor(?:['’]?s)?\b|\bb\.?\s?(?:tech|sc|ca|ba|com|s|a)\b|\bb\.?e\.?\b|\bundergraduate\b/i],
 ['diploma',/\bdiploma\b/i],
];
export function degreeLevel(value:string):EducationLevel|null{return degreePatterns.find(([,pattern])=>pattern.test(value))?.[0]||null;}
const disciplines:[string,RegExp][]=[['Computer science',/computer science|\bcse\b/i],['Information technology',/[Ii]nformation [Tt]echnology|\bIT\b/],['Electrical engineering',/electrical|\beee\b/i],['Electronics',/electronics?|\bece\b|\beee\b/i],['Mechanical engineering',/mechanical/i],['Civil engineering',/civil engineering/i],['Statistics',/statistics|statistical/i],['Mathematics',/mathematics|mathematical/i],['Economics',/economics/i],['Business',/business administration|business management|\bbba\b|\bmba\b/i],['Finance',/finance|accounting/i]];
export function degreeDisciplines(value:string){return disciplines.filter(([,pattern])=>pattern.test(value)).map(([label])=>label);}
const optional=/\bpreferred\b|nice to have|not (?:strictly )?required|no .{0,20}required|\boptional\b|\bbonus\b/i;
const evidence=(s:string)=>s.replace(/\s+/g,' ').trim().slice(0,420);
type Graduation=NonNullable<EligibilityRequirements['graduation']>;
function graduationRule(part:string):Graduation|undefined{
 const list='(20\\d{2}(?:\\s*(?:,|and|or|/|to|through|[-–—])\\s*20\\d{2}){0,7})';
 const term='(?:batch(?:es)?(?: of)?|class of|graduat(?:ion(?: year| batch)?|ing|ed|es?)(?: in| of| from| between)?|pass(?:ing|ed)?[- ]?outs?(?: batch)?|year of passing)';
 const months='(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\s+)?';
 const m=part.match(new RegExp('\\b'+term+'\\s*(?:[:=-]\\s*)?(?:(?:on or )?(?:before|after)|by|since|from|in|between)?\\s*'+months+list,'i'))||part.match(new RegExp('\\b'+list+'\\s*[-–—]?\\s*(?:graduates?|graduating|batch(?:es)?|pass[- ]?outs?)\\b','i'));
 if(!m)return;
 const years=[...new Set([...m[1].matchAll(/20\d{2}/g)].map(v=>Number(v[0])))].sort();
 const range=m[1].match(/(20\d{2})\s*(?:[-–—]|to|through)\s*(20\d{2})/i);
 if(range){if(Number(range[2])<Number(range[1])||Number(range[2])-Number(range[1])>8)return;for(let y=Number(range[1]);y<=Number(range[2]);y++)if(!years.includes(y))years.push(y);}
 const minimum=part.match(/\b(20\d{2})\s*(?:or (?:later|after)|onwards|and (?:later|beyond))/i);
 const maximum=part.match(/\b(20\d{2})\s*(?:or (?:earlier|before)|and (?:earlier|before))/i)||part.match(/\b(?:by|on or before)\s+(?:[A-Za-z]+\s+)?(20\d{2})/i);
 if(/\b(?:before|after|since|from)\s+20\d{2}/i.test(part)&&!range&&!minimum&&!maximum)return;
 return{years:years.sort(),...(minimum?{minimum:Number(minimum[1])}:{}),...(maximum?{maximum:Number(maximum[1])}:{}),evidence:evidence(part)};
}
export function extractEligibility(description:string):EligibilityRequirements{
 const text=description.slice(0,35000),parts=text.split(/\n|[.!?;](?=\s+[A-Z0-9])|,\s+(?=(?:only|minimum|required|must|candidates?|applicants?|graduation|year of passing|20\d{2})\b)/i).map(s=>s.trim()).filter(s=>s.length>3);
 const result:EligibilityRequirements={version:2,review:[],timing:extractTiming(text)};const batches:Graduation[]=[];let optionalSection=false;
 for(const part of parts){
  const heading=part.replace(/[:\s]+$/,'');
  if(heading.length<100&&/^(?:(?:preferred|required|minimum|basic|desired)\s+)?(?:qualifications|requirements|eligibility|nice[- ]to[- ]have|benefits|responsibilities)$/i.test(heading)){optionalSection=/preferred|desired|nice[- ]to[- ]have/i.test(heading);continue;}
  if(optionalSection)continue;
  if(part.length>1400){if(/graduat|batch|degree|qualification|cgpa|percentage|marks/i.test(part))result.review.push('A long eligibility statement needs confirmation on the employer’s page.');continue;}
  if(optional.test(part))continue;
  if(/\b(?:batch(?:es)?|class of|graduat(?:e[sd]?|ing|ion)|pass(?:ing|ed)?[- ]?outs?|year of passing)\b/i.test(part)&&!/our (?:team|founder)|company was founded/i.test(part)){
   const batch=graduationRule(part);
   if(batch){batches.push(batch);if(batch.years.length>1&&degreePatterns.filter(([,pattern])=>pattern.test(part)).length>1)result.review.push('Confirm which graduation year applies to your qualification route.');}
   else if(/\b20\d{2}\b/.test(part))result.review.push('Confirm the graduation-year condition: '+evidence(part));
  }
  if(!result.education){
   const levels=degreePatterns.filter(([,pattern])=>pattern.test(part)).map(([level])=>level);
   const narrative=/our (?:team|founder|colleagues)|we are a (?:team|group)|company was founded/i.test(part)&&!/you|candidate|applicant|require|must/i.test(part);
   if(!narrative&&levels.length&&/degree|bachelor|master|diploma|ph\.?d|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca|mba|undergraduate|post[- ]graduate/i.test(part)){
    result.education={levels,flexible:/equivalent|related experience|practical experience|or experience|any (?:degree|discipline)|not mandatory/i.test(part),inProgressAllowed:/currently (?:pursuing|enrolled|studying)|pursuing|enrolled|working toward|students?|final[- ]year/i.test(part),evidence:evidence(part)};
    const subject=part.match(/\b(?:in|branches?|disciplines?)\b\s*[:=-]?\s*([^.;\n]{1,180})/i)?.[1];
    const required=subject?degreeDisciplines(subject):[];
    if(required.length){result.education.disciplines=required;result.education.disciplineFlexible=/related (?:field|discipline)|equivalent|any (?:branch|discipline|field)/i.test(part);}
    if(/\bin (?:computer|engineering|information|electronic|electrical|mechanical|business|finance|science)|related (?:field|discipline)/i.test(part)&&(!required.length||result.education.disciplineFlexible))result.review.push('Confirm the permitted degree disciplines and equivalent qualifications.');
   }
  }
  if((/\b(?:cgpa|gpa)\b/i.test(part)||/\b(?:academic|aggregate|graduation|degree|marks|percentage)\b/i.test(part)&&/\d\s*%/.test(part))&&/minimum|\bmin\b|at least|>=|≥|or above|and above|cut[- ]?off|require|must|eligib|\b(?:cgpa|gpa)\s*:/i.test(part)){
   const cgpa=part.match(/\b(cgpa|gpa)\s*(?:(?:of|:|at least|minimum|above|>=|≥|is|should be|must be|score|a)\s*){0,4}(\d(?:\.\d{1,2})?)/i)||part.match(/\b(\d(?:\.\d{1,2})?)\s*(?:or above|and above|minimum|\+)?\s*(cgpa|gpa)\b/i);
   const score=cgpa?Number(/^\d/.test(cgpa[1])?cgpa[1]:cgpa[2]):undefined;
   const scale=part.match(/(?:out of|on (?:a )?|\/)\s*(10|4)(?:\.0)?\s*(?:point|scale)?/i);
   const percent=part.match(/(?:minimum|at least|>=|≥|aggregate(?: of)?|percentage(?: of)?)\s*:?\s*(\d{2,3}(?:\.\d{1,2})?)\s*%/i)||part.match(/\b(\d{2,3}(?:\.\d{1,2})?)\s*%\s*(?:or above|and above|minimum|\+|aggregate|marks|overall|in academics)/i);
   const percentage=percent?Number(percent[1]):undefined;
   if((score!==undefined&&score>=0&&score<=10)||(percentage!==undefined&&percentage<=100)){
    const old=result.academics;
    const between=cgpa&&percent?part.slice(Math.min(cgpa.index!+cgpa[0].length,percent.index!+percent[0].length),Math.max(cgpa.index!,percent.index!)):'';
    result.academics={...old,...(score!==undefined?{cgpa:score,...(scale?{scale:Number(scale[1])}:{})}:{}),...(percentage!==undefined?{percentage}:{}),alternative:!!old?.alternative||/\bor\b(?!\s+(?:above|higher|more))/i.test(between),evidence:evidence((old?.evidence?old.evidence+'; ':'')+part)};
    if(/10th|12th|secondary|high school|throughout|all (?:academic|semester)/i.test(part))result.review.push('Check school-level or semester-specific cutoffs separately; your saved score may not cover them.');
   }
  }
 }
 if(batches.length){
  const fits=(r:Graduation,y:number)=>(r.minimum===undefined||y>=r.minimum)&&(r.maximum===undefined||y<=r.maximum)&&(r.minimum!==undefined||r.maximum!==undefined||r.years.includes(y));
  const allowed=Array.from({length:100},(_,i)=>2000+i).filter(y=>batches.every(r=>fits(r,y)));
  if(!allowed.length)result.review.push('The listing contains conflicting graduation-year conditions; confirm the accepted batch.');
  else if(batches.length===1)result.graduation=batches[0];
  else result.graduation={years:allowed,evidence:evidence(batches.map(r=>r.evidence).join('; '))};
 }
 result.review=[...new Set(result.review)].slice(0,5);
 return result;
}
export function checkEligibility(requirements:EligibilityRequirements|undefined,profile:Profile){
 const reasons:string[]=[],cautions:string[]=[];let relevant=true,uncertain=false;
 if(!requirements)return{relevant,uncertain,reasons,cautions};
 const graduation=requirements.graduation,year=Number(profile.graduationYear);
 if(graduation){
  if(!profile.graduationYear){uncertain=true;cautions.push('Add your graduation year to check the published batch requirement.');}
  else{
   const fits=graduation.minimum!==undefined?year>=graduation.minimum:graduation.maximum!==undefined?year<=graduation.maximum:graduation.years.includes(year);
   if(!fits){relevant=false;cautions.push('Your graduation year is outside the published batch requirement.');}else reasons.push('Graduation year fits the published requirement');
  }
 }
 if(requirements.education){
  const rule=requirements.education,level=degreeLevel(profile.degree),rank={diploma:0,bachelor:1,master:2,doctorate:3};
  if(!level){uncertain=true;cautions.push('Confirm your qualification against the published degree requirement.');}
  else if(rule.flexible){uncertain=true;cautions.push('The employer permits equivalent qualifications; confirm the accepted route.');}
  else if(rank[level]<Math.min(...rule.levels.map(l=>rank[l]))){relevant=false;cautions.push('Your saved qualification is below the published degree level.');}
  else reasons.push('Degree level fits; confirm the required discipline');
  if(rule.disciplines?.length){
   const saved=degreeDisciplines(profile.degree);
   if(!saved.length){uncertain=true;cautions.push('Add or confirm your degree discipline against the stated permitted branches.');}
   else if(!saved.some(d=>rule.disciplines!.includes(d))){if(rule.disciplineFlexible){uncertain=true;cautions.push('Your degree discipline differs; confirm whether the employer accepts it as a related field.');}else{relevant=false;cautions.push('Your saved degree discipline is outside the explicitly listed branches.');}}
   else reasons.push('Degree discipline fits the published requirement');
  }
  if(profile.graduationYear&&Number(profile.graduationYear)>new Date().getUTCFullYear()&&!rule.inProgressAllowed&&!requirements.graduation){uncertain=true;cautions.push('Your degree is still in progress based on your graduation year. Confirm whether current students and your start date are accepted.');}
 }
 if(requirements.academics){
  const rule=requirements.academics,results:('pass'|'fail'|'unknown')[]=[];
  if(rule.cgpa!==undefined){results.push(!rule.scale||profile.cgpa===null||profile.cgpa===undefined||profile.cgpaScale!==rule.scale?'unknown':profile.cgpa>=rule.cgpa?'pass':'fail');}
  if(rule.percentage!==undefined)results.push(profile.percentage===null||profile.percentage===undefined?'unknown':profile.percentage>=rule.percentage?'pass':'fail');
  // Do not compare one overall score against mixed school/semester requirements.
  const mixed=requirements.review.some(s=>s.includes('school-level'));
  const fail=!mixed&&(rule.alternative?results.length>0&&results.every(r=>r==='fail'):results.includes('fail'));
  const unknown=mixed||(rule.alternative?!results.includes('pass')&&results.includes('unknown'):results.includes('unknown'));
  if(fail){relevant=false;cautions.push('Your saved academic score is below the published cutoff.');}
  else if(unknown){uncertain=true;cautions.push('Confirm academic cutoffs and grading scale; no CGPA/percentage conversion is assumed.');}
  else if(results.length)reasons.push('Saved academic score fits the explicit cutoff');
 }
 if(requirements.review.length){uncertain=true;cautions.push(...requirements.review);}
 return{relevant,uncertain,reasons,cautions};
}

export function eligibilityEvidence(r:EligibilityRequirements|undefined,p:Profile):RequirementCheck[]{
 const status=(part:EligibilityRequirements)=>{const result=checkEligibility(part,p);return !result.relevant?'conflict':result.uncertain?'review':'met';};
 const batch=r?.graduation;
 return [
  {key:'batch',label:'Graduation batch',status:batch?status({graduation:batch,review:[]}):'unstated',requirement:batch?(batch.minimum!==undefined?batch.minimum+' or later':batch.maximum!==undefined?batch.maximum+' or earlier':batch.years.join(', ')):'Accepted years not stated',profile:p.graduationYear||'Not added',evidence:batch?.evidence},
  {key:'degree',label:'Degree and discipline',status:r?.education?status({education:r.education,graduation:r.graduation,review:[]}):'unstated',requirement:r?.education?[r.education.levels.join(' / '),r.education.disciplines?.join(' / '),r.education.disciplineFlexible?'related fields need confirmation':''].filter(Boolean).join(' · '):'Required degree not stated',profile:p.degree||'Not added',evidence:r?.education?.evidence},
  {key:'academics',label:'Academic cutoff',status:r?.academics?status({academics:r.academics,review:r.review.filter(s=>s.includes('school-level'))}):'unstated',requirement:r?.academics?r.academics.evidence:'Cutoff not stated',profile:[p.cgpa!=null?p.cgpa+' / '+(p.cgpaScale||10):'',p.percentage!=null?p.percentage+'%':''].filter(Boolean).join(' · ')||'Not added',evidence:r?.academics?.evidence}
 ];
}
