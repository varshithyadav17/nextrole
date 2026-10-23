import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,one} from './store';
import {acquireLease,releaseLease} from './lease';
import {PublicError} from './errors';

export const DISCOVERY_SOURCE='google-jobs-serpapi';
export const DISCOVERY_CONFIG='google_jobs_config_v1';
export const DISCOVERY_STATE='google_jobs_state_v1';
export const discoverySettingsSchema=z.object({
 enabled:z.boolean(),permissionConfirmed:z.boolean(),
 dailyLimit:z.number().int().min(1).max(100),monthlyLimit:z.number().int().min(1).max(5000),
 intervalHours:z.number().int().min(6).max(168),pagesPerQuery:z.number().int().min(1).max(3),
 queries:z.array(z.object({query:z.string().trim().min(3).max(200),location:z.string().trim().min(2).max(120)})).min(1).max(6),
}).strict().refine(s=>!s.enabled||s.permissionConfirmed,{message:'Confirm permitted use before enabling discovery.'});
export type DiscoverySettings=z.infer<typeof discoverySettingsSchema>;
export const DEFAULT_DISCOVERY_SETTINGS:DiscoverySettings={enabled:false,permissionConfirmed:false,dailyLimit:6,monthlyLimit:200,intervalHours:24,pagesPerQuery:1,queries:[{query:'software engineer intern fresher',location:'India'},{query:'data analyst intern fresher',location:'India'},{query:'product management intern',location:'India'}]};
export function discoveryKeyReady(){return !!env.SERPAPI_API_KEY?.trim();}
export async function discoverySettings(){
 const row=await one<{value:string}>('SELECT value FROM meta WHERE key=?',DISCOVERY_CONFIG);
 return row?discoverySettingsSchema.parse(JSON.parse(row.value)):structuredClone(DEFAULT_DISCOVERY_SETTINGS);
}
export function discoveryBudgetKeys(now=new Date()){
 const day=now.toISOString().slice(0,10);return {day:'google_jobs_requests:'+day,month:'google_jobs_requests:'+day.slice(0,7)};
}
export async function discoveryUsage(){
 const keys=discoveryBudgetKeys(),result=await db().prepare('SELECT key,value FROM meta WHERE key IN (?,?)').bind(keys.day,keys.month).all<{key:string;value:string}>();
 return {today:Number(result.results.find(r=>r.key===keys.day)?.value||0),month:Number(result.results.find(r=>r.key===keys.month)?.value||0)};
}
export async function saveDiscoverySettings(input:unknown){
 const settings=discoverySettingsSchema.parse(input);
 const unique=new Set(settings.queries.map(q=>q.query.toLowerCase()+'|'+q.location.toLowerCase()));
 if(unique.size!==settings.queries.length)throw new PublicError('Remove duplicate searches before saving.');
 if(settings.enabled&&!discoveryKeyReady())throw new PublicError('Add SERPAPI_API_KEY as a backend server secret before enabling discovery.',409);
 const lease=await acquireLease('google_jobs_discovery',60000);
 if(!lease)throw new PublicError('A discovery page is being processed. Try saving again in a moment.',409);
 try{
  // Changing configuration cancels its continuation, never its request counters or student choices.
  await db().batch([db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(DISCOVERY_CONFIG,JSON.stringify(settings)),db().prepare('DELETE FROM meta WHERE key=?').bind(DISCOVERY_STATE)]);
  return settings;
 }finally{await releaseLease(lease);}
}
