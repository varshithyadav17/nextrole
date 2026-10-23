import type {Profile,RequirementCheck} from './types';

export type TimingRequirements={startBy?:string;immediate?:boolean;months?:number;evidence:string[];review:string[]};
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const optional=/\bpreferred\b|nice to have|\boptional\b|\bbonus\b|not required/i;
export function validDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const n=Date.parse(value+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value;
}
function statedDate(text:string){
 const iso=text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);if(iso&&validDate(iso[1]))return iso[1];
 const m=text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
 const us=text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/i);
 if(!m&&!us)return null;const month=months.indexOf((m?m[2]:us![1]).toLowerCase())+1;
 const date=(m?m[3]:us![3])+'-'+String(month).padStart(2,'0')+'-'+String(m?m[1]:us![2]).padStart(2,'0');return validDate(date)?date:null;
}
/** Only explicit joining/commitment statements are interpreted. Application deadlines
 * and preferred dates must never become a mandatory start requirement. */
export function extractTiming(text:string):TimingRequirements{
 const result:TimingRequirements={evidence:[],review:[]};let optionalSection=false;
 for(const part of text.slice(0,35000).split(/\n|[;.!?](?=\s+[A-Z])/).map(p=>p.trim()).filter(Boolean)){
  if(/^(?:(?:preferred|required|minimum|basic|desired)\s+)?(?:qualifications|requirements|eligibility|nice[- ]to[- ]have|benefits|responsibilities)\s*:?$/i.test(part)){optionalSection=/preferred|desired|nice[- ]to[- ]have/i.test(part);continue;}
  if(optionalSection||optional.test(part)||part.length>800)continue;
  const joining=/\b(?:start(?:ing)? date|joining date|join(?:ing)? (?:on|by|from)|start (?:on|by|from)|commence (?:on|by))\b/i.test(part);
  const immediate=/\bimmediate joiners?\b|\b(?:must|required to|need to)\b.{0,35}\b(?:join|start) immediately\b/i.test(part);
  if(joining){const date=statedDate(part);if(date){if(result.startBy&&result.startBy!==date)result.review.push('The listing states multiple joining dates. Confirm the applicable date.');else result.startBy=date;result.evidence.push(part.slice(0,420));}else result.review.push('Confirm the stated joining date: '+part.slice(0,250));}
  if(immediate){result.immediate=true;result.evidence.push(part.slice(0,420));}
  const duration=part.match(/\b(?:duration\s*:|minimum(?: commitment)?(?: of)?|at least|must (?:be able to )?commit(?: for| to)?)\s*(\d{1,2})\s*(?:[-–]\s*\d{1,2}\s*)?months?\b/i);
  if(duration&&Number(duration[1])>0&&Number(duration[1])<=24){result.months=Math.max(result.months||0,Number(duration[1]));result.evidence.push(part.slice(0,420));}
 }
 result.evidence=[...new Set(result.evidence)].slice(0,4);result.review=[...new Set(result.review)].slice(0,3);return result;
}
export function checkTiming(rule:TimingRequirements|undefined,p:Profile,jobType:string,today=new Date().toISOString().slice(0,10)){
 const cautions:string[]=[],reasons:string[]=[],checks:RequirementCheck[]=[];let relevant=true,uncertain=false;
 const start=rule?.startBy,immediate=rule?.immediate,available=p.availableFrom&&validDate(p.availableFrom)?p.availableFrom:'';
 let state:RequirementCheck['status']='unstated',requirement='Joining date not stated';
 if(start||immediate){
  requirement=start?'Join by '+start:'Immediate joining is requested';
  if(start&&start<today){state='review';uncertain=true;cautions.push('The stated joining date has passed. Confirm that this opening is still accepting your start date.');}
  else if(!available){state='review';uncertain=true;cautions.push('Add your earliest joining date to check the published start requirement.');}
  else if(available>(start||today)){state='conflict';relevant=false;cautions.push('Your earliest joining date is after the employer’s published start requirement.');}
  else{state='met';reasons.push('Your availability fits the stated joining date');}
 }else if(available&&available>today){state='review';uncertain=true;cautions.push('The joining date is not stated. Confirm that the employer can accept your availability.');}
 checks.push({key:'joining',label:'Joining date',status:state,requirement,profile:available||'Not added',evidence:rule?.evidence.find(e=>/join|start|commence/i.test(e))});
 if(jobType==='Internship'){
  const months=rule?.months,provided=p.availableMonths;
  let status:RequirementCheck['status']='unstated';
  if(months){if(provided==null){status='review';uncertain=true;cautions.push('Add your internship availability to check the stated commitment.');}else if(provided<months){status='conflict';relevant=false;cautions.push('The internship requires '+months+' months; you can commit '+provided+'.');}else{status='met';reasons.push('Your internship availability fits the stated duration');}}
  checks.push({key:'duration',label:'Internship commitment',status,requirement:months?months+' months minimum':'Minimum duration not stated',profile:provided==null?'Not added':provided+' months',evidence:rule?.evidence.find(e=>/month/i.test(e))});
 }
 if(rule?.review.length){uncertain=true;cautions.push(...rule.review);}
 return {relevant,uncertain,cautions,reasons,checks};
}
