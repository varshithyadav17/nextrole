import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {SOURCES} from './sources';
import type {Source} from './types';
import {isSafeJobUrl} from './matching';
import {acquireLease,releaseLease} from './lease';
import {PublicError} from './errors';

const definition=z.object({
 company:z.string().trim().min(2).max(100),provider:z.enum(['greenhouse','lever','ashby']),
 token:z.string().trim().regex(/^[a-zA-Z0-9_-]{1,100}$/),
 careerUrl:z.string().url().max(2048).refine(isSafeJobUrl),
 policyUrl:z.string().url().max(2048).refine(isSafeJobUrl),
 permissionConfirmed:z.literal(true),
});
type RegisteredSource=Source&{policyUrl:string;reviewedAt:string};
const KEY='source_registry_v1';
export function sourceFingerprint(sources:Source[]){return sources.map(s=>s.id+':'+s.provider+':'+s.token).join('|');}
export async function loadSources():Promise<Source[]>{
 const row=await env.DB!.prepare('SELECT value FROM meta WHERE key=?').bind(KEY).first<{value:string}>();
 if(!row)return SOURCES;
 const stored=z.array(definition.omit({permissionConfirmed:true}).extend({id:z.string().regex(/^custom-[a-f0-9]{24}$/),reviewedAt:z.string().datetime()})).max(80).safeParse(JSON.parse(row.value));
 if(!stored.success)throw new PublicError('Source configuration needs the host’s attention. Previous listings are preserved.',503);
 return [...SOURCES,...stored.data];
}
export async function registerSource(input:unknown){
 const source=definition.parse(input);
 const lease=await acquireLease('source_registry_write',30000);
 if(!lease)throw new PublicError('Another source change is being saved. Please try again.',409);
 try{
  const sources=await loadSources();
  if(sources.some(s=>s.provider===source.provider&&s.token===source.token))throw new PublicError('This employer board is already connected.',409);
  const extra=sources.slice(SOURCES.length) as RegisteredSource[];
  if(extra.length>=80)throw new PublicError('The current source budget supports 80 additional boards. Review capacity before expanding it.');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source.provider+':'+source.token));
  const id='custom-'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
  const {permissionConfirmed:_,...fields}=source;void _;
  const created={...fields,id,reviewedAt:new Date().toISOString()};
  await env.DB!.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(KEY,JSON.stringify([...extra,created])).run();
  return created;
 }finally{await releaseLease(lease);}
}
