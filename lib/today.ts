import {db,getJob,getProfile,rows} from './store';
import {PublicError} from './errors';

export type TodayAction={id:string;jobId:string;title:string;company:string;kind:'confirm'|'deadline'|'changed'|'milestone'|'queue';label:string;date:string|null;detail:string};
export type TodayPlan={actions:TodayAction[];checkedAt:string;hasMore:boolean};
export async function recordApplicationOpen(userId:string,jobId:string){
 const job=await getJob(userId,jobId,await getProfile(userId));if(!job)throw new PublicError('This opening could not be found.',404);
 if(job.status==='applied')return {recorded:false};
 const now=new Date().toISOString();
 await db().batch([
  db().prepare('INSERT INTO application_intents(user_id,job_key,job_id,opened_at,dismissed_at) VALUES(?,?,?,?,NULL) ON CONFLICT(user_id,job_key) DO UPDATE SET job_id=excluded.job_id,opened_at=excluded.opened_at,dismissed_at=NULL').bind(userId,job.key,job.id,now),
  db().prepare('DELETE FROM application_intents WHERE user_id=? AND opened_at<?').bind(userId,new Date(Date.now()-30*86400000).toISOString())
 ]);
 return {recorded:true};
}
export async function dismissApplicationIntent(userId:string,jobId:string){
 const job=await getJob(userId,jobId,await getProfile(userId));if(!job)throw new PublicError('This opening could not be found.',404);
 await db().prepare('UPDATE application_intents SET dismissed_at=? WHERE user_id=? AND job_key=?').bind(new Date().toISOString(),userId,job.key).run();
 return {ok:true};
}
/** Personal action metadata only. No résumé bytes, private answers or full shared catalogue
 * are loaded. Indexed user partitions and fixed limits bound the work. */
export async function todayPlan(userId:string):Promise<TodayPlan>{
 const now=new Date().toISOString(),soon=new Date(Date.now()+7*86400000).toISOString(),recent=new Date(Date.now()-14*86400000).toISOString();
 type Item={job_id:string;title:string;company:string;deadline?:string|null;remind_at?:string|null;change_at?:string|null;change_summary?:string|null;active?:number;opened_at?:string;due?:string;milestone?:string;notice?:string;state?:string};
 const data="COALESCE(j.data,i.data)",joins=' LEFT JOIN jobs j ON j.id=u.job_id LEFT JOIN imported_jobs i ON i.user_id=u.user_id AND i.id=u.job_id ';
 const [saved,intents,milestones,queue]=await Promise.all([
  rows<Item>("SELECT u.job_id,u.remind_at,json_extract("+data+",'$.title') as title,json_extract("+data+",'$.company') as company,json_extract("+data+",'$.deadline') as deadline,json_extract("+data+",'$.change.at') as change_at,json_extract("+data+",'$.change.summary') as change_summary,COALESCE(j.active,json_extract(i.data,'$.active'),0) as active FROM user_jobs u"+joins+"WHERE u.user_id=? AND u.status='interested' AND ((COALESCE(j.active,json_extract(i.data,'$.active'),0)=1 AND (json_extract("+data+",'$.deadline') IS NULL OR json_extract("+data+",'$.deadline')>?) AND (u.remind_at<=? OR json_extract("+data+",'$.deadline')<=?)) OR json_extract("+data+",'$.change.at')>=?) ORDER BY COALESCE(u.remind_at,json_extract("+data+",'$.deadline'),'9999'),u.updated_at DESC LIMIT 21",userId,now,soon,soon,recent),
  rows<Item>("SELECT a.job_id,a.opened_at,json_extract(COALESCE(j.data,i.data),'$.title') as title,json_extract(COALESCE(j.data,i.data),'$.company') as company FROM application_intents a LEFT JOIN user_jobs u ON u.user_id=a.user_id AND u.job_key=a.job_key LEFT JOIN jobs j ON j.id=a.job_id LEFT JOIN imported_jobs i ON i.user_id=a.user_id AND i.id=a.job_id WHERE a.user_id=? AND a.dismissed_at IS NULL AND a.opened_at>=? AND (u.status IS NULL OR u.status IN ('new','interested')) ORDER BY a.opened_at DESC LIMIT 11",userId,recent),
  rows<Item>("SELECT a.job_id,json_extract(a.data,'$.title') as title,json_extract(a.data,'$.company') as company,m.key as milestone,json_extract(m.value,'$.dueAt') as due FROM application_records a JOIN user_jobs u ON u.user_id=a.user_id AND u.job_key=a.job_key JOIN json_each(a.data,'$.milestones') m WHERE a.user_id=? AND u.status='applied' AND COALESCE(u.stage,'Applied') NOT IN ('Rejected','Offer','Withdrawn') AND json_extract(m.value,'$.doneAt') IS NULL AND json_extract(m.value,'$.dueAt') IS NOT NULL AND json_extract(m.value,'$.dueAt')<=? ORDER BY due LIMIT 21",userId,soon),
  rows<Item>("SELECT json_extract(data,'$.jobId') as job_id,json_extract(data,'$.title') as title,json_extract(data,'$.company') as company,json_extract(data,'$.notice') as notice,state FROM automation_queue WHERE user_id=? AND state IN ('needs_review','uncertain') ORDER BY updated_at DESC LIMIT 6",userId)
 ]);
 const actions:TodayAction[]=[];
 for(const item of saved.slice(0,20)){
  if(!item.title)continue;
  if(item.change_at&&item.change_at>=recent)actions.push({id:'change:'+item.job_id,jobId:item.job_id,title:item.title,company:item.company,kind:'changed',label:'Saved opening changed',date:item.change_at,detail:item.change_summary||'Review the current requirements before using an older preparation.'});
  const due=item.remind_at||item.deadline;
  if(item.active&&due&&Number.isFinite(Date.parse(due))&&(!item.deadline||item.deadline>now))actions.push({id:'deadline:'+item.job_id,jobId:item.job_id,title:item.title,company:item.company,kind:'deadline',label:item.remind_at?'Your saved reminder':'Application deadline',date:due,detail:item.deadline?'Employer deadline: '+item.deadline:'A reminder you set. No employer deadline is assumed.'});
 }
 for(const item of milestones.slice(0,20))if(item.title&&item.due&&Number.isFinite(Date.parse(item.due)))actions.push({id:'milestone:'+item.job_id+':'+item.milestone,jobId:item.job_id,title:item.title,company:item.company,kind:'milestone',label:(item.milestone==='oa'?'Assessment':item.milestone==='interview'?'Interview':'Response / follow-up')+(item.due<now?' · check the outcome':' coming up'),date:item.due,detail:'Scheduled by you. Open the application to update or prepare for this step.'});
 for(const item of intents.slice(0,10))if(item.title)actions.push({id:'confirm:'+item.job_id,jobId:item.job_id,title:item.title,company:item.company,kind:'confirm',label:'Did you submit this application?',date:item.opened_at||null,detail:'You opened its application page. Confirm the result; opening a link does not mean Applied.'});
 for(const item of queue.slice(0,5))if(item.title&&item.job_id)actions.push({id:'queue:'+item.job_id,jobId:item.job_id,title:item.title,company:item.company,kind:'queue',label:item.state==='uncertain'?'Check an uncertain application attempt':'Browser assistance needs your review',date:null,detail:item.notice||'Review the original site before taking another action.'});
 const priority={milestone:0,deadline:1,changed:2,queue:3,confirm:4};actions.sort((a,b)=>priority[a.kind]-priority[b.kind]||(a.date||'9999').localeCompare(b.date||'9999'));
 return {actions:actions.slice(0,12),checkedAt:now,hasMore:actions.length>12||saved.length>20||intents.length>10||milestones.length>20||queue.length>5};
}
