import {db,one} from './store';
export async function allowRequest(userId:string,kind:'write'|'external'|'feedback'|'telemetry'|'catalogue'|'bridge',limit:number){
 const key='request_count:'+new Date().toISOString().slice(0,16)+':'+kind+':'+userId;
 const r=await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1 WHERE CAST(meta.value AS INTEGER)<?').bind(key,'1',limit).run();
 return !!r.meta.changes;
}
export async function productCleanupStatus(){
 const expired=new Date(Date.now()-90*86400000).toISOString().slice(0,10),inactive=new Date(Date.now()-180*86400000).toISOString();
 const r=await one<{events:number;cohorts:number;minutes:number;activity:number}>('SELECT EXISTS(SELECT 1 FROM product_events WHERE day<? LIMIT 1) as events,EXISTS(SELECT 1 FROM product_people WHERE last_seen<? LIMIT 1) as cohorts,EXISTS(SELECT 1 FROM product_activity_minutes WHERE minute<? LIMIT 1) as minutes,EXISTS(SELECT 1 FROM product_activity_days WHERE day<? LIMIT 1) as activity',expired,inactive,Math.floor(Date.now()/60000)-2880,expired);
 return {pending:!!r?.events||!!r?.cohorts||!!r?.minutes||!!r?.activity,eventsPending:!!r?.events,cohortsPending:!!r?.cohorts,activityPending:!!r?.minutes||!!r?.activity};
}
export async function pruneTransientData(){
 await db().prepare('DELETE FROM product_activity_minutes WHERE rowid IN (SELECT rowid FROM product_activity_minutes WHERE minute<? LIMIT 5000)').bind(Math.floor(Date.now()/60000)-2880).run();
 await db().prepare('DELETE FROM product_activity_days WHERE rowid IN (SELECT rowid FROM product_activity_days WHERE day<? LIMIT 1000)').bind(new Date(Date.now()-90*86400000).toISOString().slice(0,10)).run();
 await db().prepare("DELETE FROM meta WHERE key IN (SELECT key FROM meta WHERE key>='bridge_code:' AND key<'bridge_code;' AND CAST(json_extract(value,'$.expires') AS INTEGER)<=? LIMIT 500)").bind(Date.now()).run();
 await db().prepare('DELETE FROM product_events WHERE id IN (SELECT id FROM product_events WHERE day<? LIMIT 500)').bind(new Date(Date.now()-90*86400000).toISOString().slice(0,10)).run();
 await db().prepare('DELETE FROM product_people WHERE user_id IN (SELECT user_id FROM product_people WHERE last_seen<? LIMIT 500)').bind(new Date(Date.now()-180*86400000).toISOString()).run();
 const day=new Date(Date.now()-2*86400000).toISOString().slice(0,10);
 await db().prepare("DELETE FROM meta WHERE key IN (SELECT key FROM meta WHERE ((key LIKE 'request_count:%' AND substr(key,15,10)<?) OR (key LIKE 'byok_minute:%' AND substr(key,13,10)<?) OR (key LIKE 'byok_count:%' AND substr(key,12,10)<?) OR (key LIKE 'mail_budget:%' AND substr(key,13,10)<?)) LIMIT 500)").bind(day,day,day,day).run();
 await db().prepare('DELETE FROM digest_outbox WHERE rowid IN (SELECT rowid FROM digest_outbox WHERE updated_at<? LIMIT 100)').bind(new Date(Date.now()-30*86400000).toISOString()).run();
 await db().prepare('DELETE FROM analyses WHERE id IN (SELECT id FROM analyses WHERE created_at<? LIMIT 500)').bind(new Date(Date.now()-7*86400000).toISOString()).run();
 return productCleanupStatus();
}
