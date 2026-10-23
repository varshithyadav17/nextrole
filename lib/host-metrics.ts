import {mailStatus} from './digests';
import {env} from 'cloudflare:workers';
import {one,rows} from './store';
import {indiaDay,shiftDay,feedbackColumns} from './product';
import {productCleanupStatus} from './rate-limit';
import {deliveryStatus} from './alerts';
import {FEATURE_LABELS} from './community-types';
import {discoveryMetrics} from './discovery-metrics';
import {adminAnalytics} from './admin-analytics';
export async function hostMetrics(days:number,hostId:string){
 const today=indiaDay(),start=shiftDay(today,1-days),week=shiftDay(today,-6),month=shiftDay(today,-29),mature=shiftDay(today,-7);
 const since=new Date(Date.parse(start+'T00:00:00Z')-330*60000).toISOString();
 const [active,features,daily,activation,retention,ratings,voices,themes,health,sourceRuns,sync,tracking,counts]=await Promise.all([
  one<{dau:number;wau:number;mau:number}>("SELECT COUNT(DISTINCT CASE WHEN day=? THEN user_id END) as dau,COUNT(DISTINCT CASE WHEN day>=? THEN user_id END) as wau,COUNT(DISTINCT user_id) as mau FROM product_events WHERE kind='workspace_open' AND day>=? AND user_id<>?",today,week,month,hostId),
  rows<{kind:string;uses:number;students:number}>('SELECT kind,COUNT(*) as uses,COUNT(DISTINCT user_id) as students FROM product_events WHERE day>=? AND user_id<>? GROUP BY kind ORDER BY uses DESC,kind',start,hostId),
  rows<{day:string;active:number;applyClicks:number;applied:number}>("SELECT day,COUNT(DISTINCT CASE WHEN kind='workspace_open' THEN user_id END) as active,SUM(kind='apply_open') as applyClicks,SUM(kind='applied') as applied FROM product_events WHERE day>=? AND user_id<>? GROUP BY day ORDER BY day",start,hostId),
  one<{eligible:number;completed:number}>("SELECT COUNT(*) as eligible,COALESCE(SUM(EXISTS(SELECT 1 FROM product_events e WHERE e.user_id=p.user_id AND e.kind='profile_completed' AND e.created_at>=p.first_seen)),0) as completed FROM product_people p WHERE p.first_day>=? AND p.initial_completed=0 AND p.user_id<>?",start,hostId),
  one<{eligible:number;returned:number}>("SELECT COUNT(*) as eligible,COALESCE(SUM(EXISTS(SELECT 1 FROM product_events e WHERE e.user_id=p.user_id AND e.kind='workspace_open' AND e.day=date(p.first_day,'+7 days'))),0) as returned FROM product_people p WHERE p.first_day>=? AND p.first_day<=? AND p.user_id<>?",start,mature,hostId),
  rows<{rating:number;n:number}>("SELECT rating,COUNT(*) as n FROM feedback WHERE kind='apply' AND rating IS NOT NULL AND created_at>=? AND user_id<>? GROUP BY rating ORDER BY rating",since,hostId),
  one<{total:number;open:number;help:number;monthly:number;apply:number;avgReplyHours:number|null;avgResolutionHours:number|null}>("SELECT COUNT(*) as total,COALESCE(SUM(status<>'resolved'),0) as open,COALESCE(SUM(kind='help' AND status<>'resolved'),0) as help,COALESCE(SUM(kind='monthly'),0) as monthly,COALESCE(SUM(kind='apply'),0) as apply,AVG(CASE WHEN kind='help' AND replied_at IS NOT NULL THEN (julianday(replied_at)-julianday(created_at))*24 END) as avgReplyHours,AVG(CASE WHEN kind='help' AND resolved_at IS NOT NULL THEN (julianday(resolved_at)-julianday(created_at))*24 END) as avgResolutionHours FROM feedback WHERE created_at>=? AND user_id<>?",since,hostId),
  rows<{category:string;n:number}>("SELECT category,COUNT(*) as n FROM feedback WHERE created_at>=? AND status<>'resolved' AND user_id<>? GROUP BY category ORDER BY n DESC,category LIMIT 10",since,hostId),
  deliveryStatus(),rows<{id:string;checked_at:string;success:number;count:number;error:string|null}>('SELECT * FROM source_runs ORDER BY id'),
  one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync'),one<{value:string}>('SELECT value FROM meta WHERE key=?','product_tracking_started'),
  Promise.all(['profiles','jobs','user_jobs','notifications','product_events','feedback'].map(async table=>({table,rows:(await one<{n:number}>('SELECT COUNT(*) as n FROM '+table))?.n||0})))
 ]);
 const applicationValue=await one<{students:number;confirmations:number;checked:number}>("SELECT COUNT(DISTINCT a.user_id) as students,COUNT(*) as confirmations,COALESCE(SUM(json_extract(a.data,'$.fitAtConfirmation.relevant')=1 AND json_extract(a.data,'$.fitAtConfirmation.uncertain')=0),0) as checked FROM application_records a LEFT JOIN engagement_settings e ON e.user_id=a.user_id WHERE a.user_id<>? AND COALESCE(e.analytics_enabled,1)=1 AND json_extract(a.data,'$.fitAtConfirmation.checkedAt')>=?",hostId,since);
 const ratingCount=ratings.reduce((n,r)=>n+r.n,0),average=ratingCount?ratings.reduce((n,r)=>n+r.rating*r.n,0)/ratingCount:null;
 const cleanup=await productCleanupStatus(),analytics=await adminAnalytics(days,hostId);
 const totalOpen=await one<{n:number;oldest:string|null}>("SELECT COUNT(*) as n,MIN(created_at) as oldest FROM feedback WHERE status<>'resolved' AND user_id<>?",hostId);
 return {analytics,applicationValue,days,start,today,timezone:'Asia/Kolkata',generatedAt:new Date().toISOString(),trackingSince:tracking?.value||null,active,features:features.map(f=>({...f,label:FEATURE_LABELS[f.kind]||f.kind})),daily:Array.from({length:days},(_,i)=>{const day=shiftDay(start,i);return daily.find(d=>d.day===day)||{day,active:0,applyClicks:0,applied:0};}),activation,retention,ratings:{distribution:ratings,count:ratingCount,average,positive:ratings.filter(r=>r.rating>=4).reduce((n,r)=>n+r.n,0)},voices,themes,backlog:totalOpen,operations:{email:await mailStatus(),privateStorage:{ready:!!env.BUCKET,...await one<{files:number;bytes:number}>('SELECT COUNT(*) as files,COALESCE(SUM(bytes),0) as bytes FROM resume_files')},automation:await rows<{state:string;count:number}>('SELECT state,COUNT(*) as count FROM automation_queue GROUP BY state'),cleanup,discovery:await discoveryMetrics(),sources:sourceRuns,lastSync:sync?.value||null,delivery:health,records:counts}};
}
export async function hostInbox(filters:{page:number;kind:string;status:string;category:string;q:string}){
 const where:string[]=[],params:unknown[]=[];
 for(const key of ['kind','status','category'] as const)if(filters[key]!=='all'){where.push(key+'=?');params.push(filters[key]);}
 if(filters.q){where.push("(subject LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\' OR needs LIKE ? ESCAPE '\\' OR difficulty LIKE ? ESCAPE '\\')");const q='%'+filters.q.replace(/[\\%_]/g,'\\$&')+'%';params.push(q,q,q,q);}
 const items=await rows('SELECT '+feedbackColumns+' FROM feedback'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET ?',...params,filters.page*25);
 return {items:items.slice(0,25),hasMore:items.length>25,page:filters.page};
}
