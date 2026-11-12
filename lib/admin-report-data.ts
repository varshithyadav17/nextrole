import {one,rows} from './store';
import {analyticsBaseline,baselineFeedback} from './combined-baseline';
import type {HostMetrics} from './admin-report-types';

export type ReportGroup={label:string;count:number};
export type ReportSegment={label:string;profiles:number;active:number;viewed:number;saved:number;opened:number;applied:number;ratings:number;ratingSum:number};
export type AdminReportDetail={
 audience:{profiles:number;roles:ReportGroup[];locations:ReportGroup[];experience:ReportGroup[];segments:ReportSegment[];channels:ReportGroup[];channelRecords:number};
 feedback:{statuses:ReportGroup[];priorities:ReportGroup[];ages:ReportGroup[];kinds:ReportGroup[];written:number;reply:{samples:number;medianHours:number|null;p90Hours:number|null};resolution:{samples:number;medianHours:number|null;p90Hours:number|null}};
 catalogue:{total:number;open:number;unknown:number;deadlineKnown:number;experienceKnown:number;modeKnown:number;types:ReportGroup[]};
};
const label=(v:unknown,fallback='Not recorded')=>typeof v==='string'&&v.trim()?v.trim():fallback;
const add=(map:Map<string,number>,key:string,n=1)=>map.set(key,(map.get(key)||0)+n);
const groups=(m:Map<string,number>):ReportGroup[]=>[...m].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
function timing(values:(number|null)[]){const v=values.filter((x):x is number=>x!==null&&Number.isFinite(x)&&x>=0).sort((a,b)=>a-b),n=v.length;return {samples:n,medianHours:n?(n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2):null,p90Hours:n?v[Math.ceil(n*.9)-1]:null};}

/** Aggregate-only report detail. No identities, private messages or credentials leave this function. */
export async function adminReportDetails(report:HostMetrics,hostId:string):Promise<AdminReportDetail>{
 const [baseline,accounts,activity,ratings,feedback,times,catalogue,types]=await Promise.all([
  analyticsBaseline(),
  rows<{user_id:string;data:string|null}>("WITH accounts AS (SELECT user_id FROM profiles UNION SELECT user_id FROM google_accounts UNION SELECT user_id FROM email_accounts UNION SELECT user_id FROM product_people) SELECT a.user_id,p.data FROM accounts a LEFT JOIN profiles p ON p.user_id=a.user_id WHERE a.user_id<>?",hostId),
  rows<{user_id:string;active:number;viewed:number;saved:number;opened:number;applied:number}>("SELECT user_id,MAX(kind='workspace_open') as active,MAX(kind='job_view') as viewed,MAX(kind='saved') as saved,MAX(kind='apply_open') as opened,MAX(kind='applied') as applied FROM product_events WHERE day>=? AND day<=? AND user_id<>? GROUP BY user_id",report.start,report.today,hostId),
  rows<{user_id:string;count:number;sum:number}>("SELECT user_id,COUNT(*) as count,SUM(rating) as sum FROM feedback WHERE rating BETWEEN 1 AND 5 AND user_id<>? GROUP BY user_id",hostId),
  rows<{status:string;priority:string;kind:string;age:string;n:number;written:number}>("SELECT status,priority,kind,CASE WHEN julianday(created_at) IS NULL THEN 'Date unavailable' WHEN julianday(?)-julianday(created_at)<1 THEN 'Under 1 day' WHEN julianday(?)-julianday(created_at)<7 THEN '1-6 days' WHEN julianday(?)-julianday(created_at)<30 THEN '7-29 days' ELSE '30+ days' END as age,COUNT(*) as n,SUM(length(trim(message))>0) as written FROM feedback WHERE user_id<>? GROUP BY status,priority,kind,age",report.generatedAt,report.generatedAt,report.generatedAt,hostId),
  rows<{reply:number|null;resolution:number|null}>("SELECT CASE WHEN replied_at IS NOT NULL THEN (julianday(replied_at)-julianday(created_at))*24 END as reply,CASE WHEN resolved_at IS NOT NULL THEN (julianday(resolved_at)-julianday(created_at))*24 END as resolution FROM feedback WHERE kind='help' AND user_id<>?",hostId),
  one<{total:number;open:number;unknown:number;deadlineKnown:number;experienceKnown:number;modeKnown:number}>("WITH item AS (SELECT job_key,MAX(COALESCE(json_extract(data,'$.availability'),'open')='open') as is_open,MAX(json_extract(data,'$.deadline') IS NOT NULL) as deadline,MAX(json_extract(data,'$.minExperience') IS NOT NULL) as experience,MAX(COALESCE(lower(json_extract(data,'$.mode')),'') NOT IN ('','not specified','unknown')) as mode FROM jobs WHERE active=1 GROUP BY job_key) SELECT COUNT(*) as total,COALESCE(SUM(is_open),0) as open,COALESCE(SUM(is_open=0),0) as unknown,COALESCE(SUM(deadline),0) as deadlineKnown,COALESCE(SUM(experience),0) as experienceKnown,COALESCE(SUM(mode),0) as modeKnown FROM item"),
  rows<{label:string;count:number}>("SELECT type as label,COUNT(*) as count FROM (SELECT job_key,COALESCE(MAX(NULLIF(json_extract(data,'$.jobType'),'')),'Not specified') as type FROM jobs WHERE active=1 GROUP BY job_key) GROUP BY type ORDER BY count DESC,type")
 ]);
 const role=new Map<string,number>(),location=new Map<string,number>(),experience=new Map<string,number>(),segments=new Map<string,ReportSegment>(),statuses=new Map<string,number>(),priorities=new Map<string,number>(),ages=new Map<string,number>(),kinds=new Map<string,number>();
 const segment=(key:string,flags:{active?:number;viewed?:number;saved?:number;opened?:number;applied?:number},rating:{count:number;sum:number})=>{const s=segments.get(key)||{label:key,profiles:0,active:0,viewed:0,saved:0,opened:0,applied:0,ratings:0,ratingSum:0};s.profiles++;for(const field of ['active','viewed','saved','opened','applied'] as const)s[field]+=flags[field]?1:0;s.ratings+=rating.count;s.ratingSum+=rating.sum;segments.set(key,s);};
 const events=new Map(activity.map(a=>[a.user_id,a])),rated=new Map(ratings.map(r=>[r.user_id,r]));
 for(const account of accounts){let profile:Record<string,unknown>={};try{profile=JSON.parse(account.data||'{}');}catch{}
  const primary=label(Array.isArray(profile.roles)?profile.roles[0]:null,'Preferences pending');add(role,primary);add(location,label(Array.isArray(profile.locations)?profile.locations[0]:null));
  const years=profile.experience;add(experience,typeof years==='number'&&Number.isFinite(years)?years===0?'Fresher / 0 years':years<=2?'1-2 years':years<=5?'3-5 years':'6+ years':'Not recorded');
  const r=rated.get(account.user_id);segment(primary,events.get(account.user_id)||{},{count:r?.count||0,sum:r?.sum||0});
 }
 if(baseline){
  const byPerson=new Map<string,Set<string>>();for(const a of baseline.activity){if(a.day<report.start||a.day>report.today)continue;const f=byPerson.get(a.user)||new Set<string>();a.features.forEach(k=>f.add(k));byPerson.set(a.user,f);}
  for(const person of baseline.source.people){const primary=label(person.role);add(role,primary);add(location,'Not recorded');add(experience,'Not recorded');const f=byPerson.get(person.id);segment(primary,{active:f?1:0,viewed:f?.has('job_view')?1:0,saved:f?.has('saved')?1:0,opened:f?.has('apply_open')?1:0,applied:f?.has('applied')?1:0},{count:person.rating===null?0:1,sum:person.rating||0});}
  for(const item of baselineFeedback(baseline)){add(kinds,'Feedback');if(!item.message.trim())continue;add(statuses,item.status);add(priorities,item.priority);if(item.status!=='resolved')add(ages,'Date unavailable');}
 }
 for(const item of feedback){add(kinds,item.kind,item.n);if(!item.written)continue;add(statuses,item.status,item.written);add(priorities,item.priority,item.written);if(item.status!=='resolved')add(ages,item.age,item.written);}
 const channels=[...(baseline?.source.channels||[])],channelRecords=baseline?.source.visitorRows||0,classified=channels.reduce((n,c)=>n+c.count,0);if(channelRecords>classified)channels.push({label:'Unclassified',count:channelRecords-classified});
 return {audience:{profiles:accounts.length+(baseline?.source.profileRows||0),roles:groups(role),locations:groups(location),experience:groups(experience),segments:[...segments.values()].sort((a,b)=>b.profiles-a.profiles||a.label.localeCompare(b.label)),channels,channelRecords},feedback:{statuses:groups(statuses),priorities:groups(priorities),ages:groups(ages),kinds:groups(kinds),written:[...statuses.values()].reduce((a,b)=>a+b,0),reply:timing(times.map(t=>t.reply)),resolution:timing(times.map(t=>t.resolution))},catalogue:{total:catalogue?.total||0,open:catalogue?.open||0,unknown:catalogue?.unknown||0,deadlineKnown:catalogue?.deadlineKnown||0,experienceKnown:catalogue?.experienceKnown||0,modeKnown:catalogue?.modeKnown||0,types}};
}
