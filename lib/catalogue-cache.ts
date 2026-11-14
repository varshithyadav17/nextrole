import {env} from 'cloudflare:workers';
import {boundedJSON} from './http-json';

/** Only public vacancy metadata belongs here. Private workspace responses never do. */
export type PublicJobRow={ref:number;job_key:string;data:string;legacy_description:string|null;first_seen:string;last_checked:string;active:number};
type Chunk={version:1;revision:string;after:number;expires:number;rows:PublicJobRow[]};
const TTL=300,MAX_BYTES=2*1024*1024,MAX_MEMORY=12*1024*1024;
const memory=new Map<string,{chunk:Chunk;bytes:number}>(),inflight=new Map<string,Promise<PublicJobRow[]>>();
let memoryBytes=0,redisCooldown=0;
const counters={memoryHits:0,sharedHits:0,misses:0,fallbacks:0,oversized:0};
const namespace='nextrole:appgprj_6ad224df721c8191ba6037935d0477b6:catalogue:v1:';
function redis(){
 const token=env.UPSTASH_REDIS_REST_TOKEN,url=env.UPSTASH_REDIS_REST_URL;
 if(!token||!url)return null;
 try{const u=new URL(url);if(u.protocol==='https:'&&/^[a-z0-9-]+\.upstash\.io$/.test(u.hostname)&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash)return {url:u.origin,token};}catch{}
 return null;
}
function edge():Cache|null{try{return typeof caches!=='undefined'?(caches as CacheStorage&{default?:Cache}).default||null:null;}catch{return null;}}
const address=(key:string)=>new Request('https://nextrole-job-radar.varshithyadav-1720.chatgpt.site/__catalogue_cache__/'+encodeURIComponent(key));
function valid(value:unknown,revision:string,after:number):value is Chunk{
 if(!value||typeof value!=='object')return false;const c=value as Chunk;
 return c.version===1&&c.revision===revision&&c.after===after&&c.expires>Date.now()&&c.expires<=Date.now()+(TTL+1)*1000&&Array.isArray(c.rows)&&c.rows.length<=250&&c.rows.every((r,i)=>Number.isSafeInteger(r.ref)&&r.ref>(i?c.rows[i-1].ref:after)&&typeof r.job_key==='string'&&typeof r.data==='string'&&(r.legacy_description===null||typeof r.legacy_description==='string')&&typeof r.first_seen==='string'&&typeof r.last_checked==='string'&&r.active===1&&!['status','stage','note','user_id','updated_at','remind_at','match'].some(k=>k in r));
}
function remember(key:string,chunk:Chunk,bytes:number){
 const previous=memory.get(key);if(previous)memoryBytes-=previous.bytes;memory.delete(key);
 while(memory.size>=64||memoryBytes+bytes>MAX_MEMORY){const oldest=memory.keys().next().value;if(oldest===undefined)break;memoryBytes-=memory.get(oldest)!.bytes;memory.delete(oldest);}
 memory.set(key,{chunk,bytes});memoryBytes+=bytes;
}
async function command(config:{url:string;token:string},args:(string|number)[]){
 const response=await fetch(config.url,{method:'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},body:JSON.stringify(args),redirect:'error',signal:AbortSignal.timeout(900)});
 if(!response.ok){await response.body?.cancel();throw new Error('Cache unavailable');}
 const result=await boundedJSON(response,MAX_BYTES*2+8192);if(result.error)throw new Error('Cache unavailable');return result.result;
}
export function catalogueCacheStatus(){return {mode:redis()?'redis-with-edge-fallback':'edge',redisConfigured:!!redis(),edgeAvailable:!!edge(),ttlSeconds:TTL,maxChunkBytes:MAX_BYTES,memoryBytes,...counters,counterScope:'current worker isolate; resets on restart'};}
/** Revision keys invalidate every cache layer immediately after a catalogue write. */
export async function publicJobChunk(revision:string,after:number,load:()=>Promise<PublicJobRow[]>){
 if(!/^\d{1,20}$/.test(revision)||!Number.isSafeInteger(after)||after<0)return load();
 const key=namespace+revision+':'+after,local=memory.get(key);
 if(local&&local.chunk.expires>Date.now()){counters.memoryHits++;memory.delete(key);memory.set(key,local);return local.chunk.rows;}
 if(local){memoryBytes-=local.bytes;memory.delete(key);}
 const running=inflight.get(key);if(running)return running;
 const promise=(async()=>{
  const config=redis(),cache=edge();
  if(config&&redisCooldown<=Date.now())try{
   const raw=await command(config,['GET',key]);
   if(typeof raw==='string'&&new TextEncoder().encode(raw).length<=MAX_BYTES){const parsed=JSON.parse(raw);if(valid(parsed,revision,after)){counters.sharedHits++;remember(key,parsed,new TextEncoder().encode(raw).length);return parsed.rows;}}
  }catch{counters.fallbacks++;redisCooldown=Date.now()+30000;}
  if(cache)try{const response=await cache.match(address(key));if(response){const parsed=await boundedJSON(response,MAX_BYTES);if(valid(parsed,revision,after)){counters.sharedHits++;remember(key,parsed,new TextEncoder().encode(JSON.stringify(parsed)).length);return parsed.rows;}}}catch{counters.fallbacks++;}
  counters.misses++;
  const rows=await load(),chunk:Chunk={version:1,revision,after,expires:Date.now()+TTL*1000,rows};
  if(!valid(chunk,revision,after))return rows;
  const raw=JSON.stringify(chunk),bytes=new TextEncoder().encode(raw).length;
  if(bytes>MAX_BYTES){counters.oversized++;return rows;}
  remember(key,chunk,bytes);
  if(config&&redisCooldown<=Date.now())try{await command(config,['SET',key,raw,'EX',TTL]);}catch{counters.fallbacks++;redisCooldown=Date.now()+30000;}
  if(cache)try{await cache.put(address(key),new Response(raw,{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age='+TTL}}));}catch{counters.fallbacks++;}
  return rows;
 })();inflight.set(key,promise);
 try{return await promise;}finally{inflight.delete(key);}
}
