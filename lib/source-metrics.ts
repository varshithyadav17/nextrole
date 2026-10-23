import {db,rows} from './store';
import type {Source} from './types';

export type SourceObservation={id:string;source_id:string;provider:string;checked_at:string;outcome:'success'|'failed'|'cooldown';fetched:number;unique_count:number;new_jobs:number;closed:number;incomplete:number;duration_ms:number;error_code:string|null};
type Counts={fetched?:number;unique?:number;newJobs?:number;closed?:number;incomplete?:number};
export async function recordSourceObservation(source:Source,outcome:SourceObservation['outcome'],durationMs:number,counts:Counts={},errorCode:string|null=null){
 const now=new Date().toISOString();
 await db().prepare('INSERT INTO source_run_history(id,source_id,provider,checked_at,outcome,fetched,unique_count,new_jobs,closed,incomplete,duration_ms,error_code) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),source.id,source.provider,now,outcome,counts.fetched||0,counts.unique||0,counts.newJobs||0,counts.closed||0,counts.incomplete||0,Math.max(0,Math.round(durationMs)),errorCode).run();
}
export async function pruneDiscoveryData(){
 const cutoff=new Date(Date.now()-30*86400000).toISOString();
 // Bounded cleanup runs under the existing maintenance path; no new schedule.
 await db().batch([
  db().prepare('DELETE FROM source_run_history WHERE id IN (SELECT id FROM source_run_history WHERE checked_at<? ORDER BY checked_at LIMIT 500)').bind(cutoff),
  db().prepare('DELETE FROM source_run_history WHERE id IN (SELECT id FROM source_run_history ORDER BY checked_at DESC,id DESC LIMIT 500 OFFSET 10000)'),
  db().prepare('DELETE FROM catalogue_snapshots WHERE user_id IN (SELECT user_id FROM catalogue_snapshots WHERE expires_at<? ORDER BY expires_at LIMIT 100)').bind(new Date().toISOString()),
 ]);
}
export async function sourceMetrics(){
 const cutoff=new Date(Date.now()-30*86400000).toISOString();
 const [recent,totals]=await Promise.all([
  rows<SourceObservation>('SELECT * FROM source_run_history WHERE checked_at>=? ORDER BY checked_at DESC,id DESC LIMIT 60',cutoff),
  db().prepare("SELECT COUNT(*) as recorded,SUM(CASE WHEN outcome='success' THEN 1 ELSE 0 END) as successful,SUM(CASE WHEN outcome='failed' THEN 1 ELSE 0 END) as failed,SUM(CASE WHEN outcome='cooldown' THEN 1 ELSE 0 END) as cooldown,SUM(fetched) as fetched,SUM(unique_count) as withinFeedUnique,SUM(new_jobs) as newlyObserved,SUM(closed) as closures,SUM(incomplete) as incomplete,COUNT(DISTINCT source_id) as sources,COUNT(DISTINCT provider) as providers,MIN(checked_at) as oldest,MAX(checked_at) as latest FROM source_run_history WHERE checked_at>=?").bind(cutoff).first<{recorded:number;successful:number|null;failed:number|null;cooldown:number|null;fetched:number|null;withinFeedUnique:number|null;newlyObserved:number|null;closures:number|null;incomplete:number|null;sources:number;providers:number;oldest:string|null;latest:string|null}>(),
 ]);
 return {recent,totals,windowStart:cutoff,retention:'Latest 30 days, capped at 10,000 observations with bounded maintenance cleanup.',notice:'Feed rows can repeat across refreshes. Within-feed uniqueness and newly observed source IDs are not cross-source unique relevant-job counts. Accuracy, broken-link rate and cost per usable job are not measured here.'};
}
