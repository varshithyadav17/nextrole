import {one,rows} from './store';
import {readImportedReport} from './analytics-import';
import type {ImportedReview,ImportedSourceReport,ImportRow} from './imported-analytics-types';
import type {FeedbackRow} from './community-types';

export type BaselineActivity={user:string;day:string;features:string[];minutes:number};
export type AnalyticsBaseline={id:string;importedAt:string;versions:number;source:ImportedSourceReport;activity:BaselineActivity[];days:Map<string,Set<string>>;firstDay:string|null};
export type CombinedSourceInfo={label:string;origin:string;fileName:string;importId:string;canonicalSource:string;versions:number;sourceProfiles:number;appAccounts:number;profileRecords:number;writtenResponses:number;observedThrough:string|null;quality:string[];definitions:string[]};
export type ImportedAdminFeedback={id:string;kind:'imported';rating:number|null;category:string;subject:string;message:string;needs:string;difficulty:string;status:string;priority:string;created_at:null;updated_at:string;source:{origin:string;fileName:string;name:string;originalStatus:string}};
export type LiveAdminFeedback=FeedbackRow&{authorName?:string};
export type AdminFeedbackItem=LiveAdminFeedback|ImportedAdminFeedback;
let cached:AnalyticsBaseline|null=null;
const text=(v:unknown)=>v==null?'':String(v).trim();
const present=(v:unknown)=>v!==undefined&&v!==null&&v!==''&&v!==false&&v!==0;
function validDay(value:unknown){if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return null;const t=Date.parse(value+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value?value:null;}
const columns=[['D','job_view'],['E','saved'],['F','resume_check'],['G','apply_open'],['H','applied'],['I','scout_usage'],['J','tracker_update']] as const;

/** A workbook set is one baseline. Its detailed version takes precedence over directory copies. */
export async function analyticsBaseline():Promise<AnalyticsBaseline|null>{
 const latest=await one<{id:string}>("SELECT id FROM analytics_imports WHERE state='complete' ORDER BY created_at DESC,id DESC LIMIT 1");
 if(!latest){cached=null;return null;}if(cached?.id===latest.id)return cached;
 const report=await readImportedReport(latest.id);if(!report)return null;
 const source=report.sources.slice().sort((a,b)=>b.activityRows-a.activityRows||b.profileRows-a.profileRows||a.sha256.localeCompare(b.sha256))[0];if(!source?.profileRows)return null;
 const known=new Set(source.people.map(p=>p.id)),seen=new Set<string>(),activity:BaselineActivity[]=[],days=new Map<string,Set<string>>();
 for(let offset=0;;offset+=500){
  const page=await rows<{data:string}>("SELECT data FROM analytics_import_rows WHERE import_id=? AND source_sha=? AND sheet='Activity' ORDER BY row_number LIMIT 500 OFFSET ?",report.id,source.sha256,offset);
  for(const record of page){const row=JSON.parse(record.data) as ImportRow,c=row.cells,user=text(c.B),encoded=text(c.A).match(/^(.*?)_(20\d{2}-\d{2}-\d{2})$/),day=validDay(c.C)||(encoded&&encoded[1]===user?validDay(encoded[2]):null);if(!day||!known.has(user)||seen.has(user+'|'+day))continue;seen.add(user+'|'+day);const set=days.get(user)||new Set<string>();set.add(day);days.set(user,set);activity.push({user,day,features:columns.filter(([col])=>present(c[col])).map(([,kind])=>kind),minutes:typeof c.K==='number'&&c.K>=0&&c.K<=1440?c.K:0});}
  if(page.length<500)break;
 }
 cached={id:report.id,importedAt:report.createdAt,versions:report.sources.length,source,activity,days,firstDay:activity.length?activity.reduce((first,a)=>a.day<first?a.day:first,activity[0].day):null};return cached;
}
export function feedbackCategory(theme:string){const categories:Record<string,string>={'Job relevance':'Job relevance',Coverage:'Missing jobs',Freshness:'Job relevance',Filters:'Usability',ScoutX:'AI connections','Saved jobs':'Applications',Notifications:'Reminders','Mobile usability':'Usability','Resume fit':'Applications','Application tracking':'Applications',Onboarding:'Account',Login:'Account'};return categories[theme]||'Other';}
function reviewStatus(value:string){return /resolv|closed/i.test(value)?'resolved':/planned/i.test(value)?'planned':/reviewing|in review/i.test(value)?'reviewing':'new';}
export function baselineFeedback(baseline:AnalyticsBaseline):ImportedAdminFeedback[]{return baseline.source.feedback.map((r:ImportedReview)=>({id:'source:'+baseline.id+':'+r.id,kind:'imported',rating:r.rating,category:feedbackCategory(r.theme),subject:r.theme||'Source feedback',message:r.text,needs:r.opportunity,difficulty:r.painPoint,status:reviewStatus(r.status),priority:'normal',created_at:null,updated_at:baseline.importedAt,source:{origin:baseline.source.origin,fileName:baseline.source.fileName,name:r.name,originalStatus:r.status}}));}
