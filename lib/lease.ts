import {db} from './store';
export type Lease={key:string;value:string};
export async function acquireLease(key:string,ttl=45000):Promise<Lease|null>{
 const now=Date.now(),value=(now+ttl)+':'+crypto.randomUUID()+':v2';
 // Store the holder's expiry: a caller with a shorter TTL must not steal a live lease.
 // Older start-time values remain recoverable during an incremental rollout.
 const result=await db().prepare("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE (meta.value LIKE '%:v2' AND CAST(substr(meta.value,1,13) AS INTEGER)<?) OR (meta.value NOT LIKE '%:v2' AND CAST(substr(meta.value,1,13) AS INTEGER)<?)").bind(key,value,now,now-ttl).run();
 return result.meta.changes?{key,value}:null;
}
export async function releaseLease(lease:Lease|null){if(lease)await db().prepare('DELETE FROM meta WHERE key=? AND value=?').bind(lease.key,lease.value).run();}
