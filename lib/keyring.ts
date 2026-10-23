import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,one,rows} from './store';
import {PROVIDERS,type AIOverview,type Provider,type SlotSummary} from './providers';
import {PublicError} from './errors';
export type StoredSlot={user_id:string;slot:number;provider:Provider;model:string;label:string;ciphertext:string;fingerprint:string;last_four:string;enabled:number;status:string;message:string;cooldown_until:string|null;updated_at:string};
export const connectionSchema=z.object({slot:z.number().int().min(1).max(3),provider:z.enum(['openai','gemini','groq']),model:z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9._/:-]*$/),label:z.string().trim().max(60),key:z.string().trim().min(16).max(512).regex(/^[a-zA-Z0-9_\-.]+$/)});
const encoder=new TextEncoder();
function rootBytes(){const value=env.KEYRING_ENCRYPTION_KEY;if(!value||!/^[a-f0-9]{64}$/i.test(value))throw new PublicError('Secure API storage is unavailable. Please use profile matching for now.');return Uint8Array.from(value.match(/../g)!,s=>parseInt(s,16));}
export function storageReady(){return !!env.KEYRING_ENCRYPTION_KEY&&/^[a-f0-9]{64}$/i.test(env.KEYRING_ENCRYPTION_KEY);}
export async function sealKey(userId:string,slot:number,key:string){
 const iv=crypto.getRandomValues(new Uint8Array(12));const master=await crypto.subtle.importKey('raw',rootBytes(),'AES-GCM',false,['encrypt']);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('nextrole:v1:'+userId+':'+slot)},master,encoder.encode(key));
 return JSON.stringify({v:1,iv:Array.from(iv),data:Array.from(new Uint8Array(encrypted))});
}
export async function openKey(userId:string,slot:number,ciphertext:string){
 const value=JSON.parse(ciphertext);if(value.v!==1)throw new PublicError('Reconnect this API slot.');
 const master=await crypto.subtle.importKey('raw',rootBytes(),'AES-GCM',false,['decrypt']);
 const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(value.iv),additionalData:encoder.encode('nextrole:v1:'+userId+':'+slot)},master,new Uint8Array(value.data));
 return new TextDecoder().decode(raw);
}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function storedSlots(userId:string){return rows<StoredSlot>('SELECT * FROM api_slots WHERE user_id=? ORDER BY slot',userId);}
export async function getAIOverview(userId:string):Promise<AIOverview>{
 const [slots,settings,usage]=await Promise.all([storedSlots(userId),one<{auto_fallback:number;daily_limit:number}>('SELECT auto_fallback,daily_limit FROM ai_settings WHERE user_id=?',userId),one<{value:string}>('SELECT value FROM meta WHERE key=?','byok_count:'+new Date().toISOString().slice(0,10)+':'+userId)]);
 const summaries:SlotSummary[]=[1,2,3].map(slot=>{const r=slots.find(s=>s.slot===slot);return r?{slot,configured:true,provider:r.provider,model:r.model,label:r.label,lastFour:r.last_four,enabled:!!r.enabled,status:r.status,message:r.message,cooldownUntil:r.cooldown_until,updatedAt:r.updated_at}:{slot,configured:false,provider:slot===1?'openai':slot===2?'gemini':'groq',model:slot===1?PROVIDERS.openai.defaultModel:slot===2?PROVIDERS.gemini.defaultModel:PROVIDERS.groq.defaultModel,label:'',lastFour:'',enabled:false,status:'empty',message:'Add a connection when you want AI help.',cooldownUntil:null,updatedAt:null};});
 return {storageReady:storageReady(),slots:summaries,autoFallback:settings?.auto_fallback!==0,dailyLimit:settings?.daily_limit||20,usedToday:Number(usage?.value||0)};
}
export async function saveConnection(userId:string,input:unknown){
 const value=connectionSchema.parse(input);const fingerprint=await digest(value.key);const slots=await storedSlots(userId);
 if(!value.key.startsWith(value.provider==='openai'?'sk-':value.provider==='gemini'?'AIza':'gsk_'))throw new PublicError('This key does not look like a '+PROVIDERS[value.provider].name+' API key. Check the provider and paste the full key.');
 if(!(PROVIDERS[value.provider].models as readonly string[]).includes(value.model))throw new PublicError('Choose one of the supported models for this provider.');
 if(/(?:sk-|gsk_|AIza)[A-Za-z0-9_-]{8,}/.test(value.label)||value.label.includes(value.key))throw new PublicError('Use a short label without API credentials.');
 if(slots.some(s=>s.slot!==value.slot&&s.fingerprint===fingerprint))throw new PublicError('That key is already in another slot. Use a different authorized connection.');
 const ciphertext=await sealKey(userId,value.slot,value.key);const now=new Date().toISOString();
 await db().prepare('INSERT INTO api_slots(user_id,slot,provider,model,label,ciphertext,fingerprint,last_four,enabled,status,message,cooldown_until,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?,?,NULL,?) ON CONFLICT(user_id,slot) DO UPDATE SET provider=excluded.provider,model=excluded.model,label=excluded.label,ciphertext=excluded.ciphertext,fingerprint=excluded.fingerprint,last_four=excluded.last_four,enabled=1,status=excluded.status,message=excluded.message,cooldown_until=NULL,updated_at=excluded.updated_at').bind(userId,value.slot,value.provider,value.model,value.label||PROVIDERS[value.provider].name,ciphertext,fingerprint,value.key.slice(-4),'untested','Saved. The next AI request will check this connection.',now).run();
}
export async function connectionState(userId:string,slot:number,status:string,message:string,cooldownUntil:string|null=null,fingerprint?:string,model?:string){await db().prepare('UPDATE api_slots SET status=?,message=?,cooldown_until=? WHERE user_id=? AND slot=?'+(fingerprint?' AND fingerprint=?':'')+(model?' AND model=?':'')).bind(status,message,cooldownUntil,userId,slot,...(fingerprint?[fingerprint]:[]),...(model?[model]:[])).run();}
export async function swapConnections(userId:string,from:number,to:number){
 const existing=(await storedSlots(userId)).filter(s=>s.slot===from||s.slot===to);
 const prepared=await Promise.all(existing.map(async s=>{const slot=s.slot===from?to:from;return {...s,slot,ciphertext:await sealKey(userId,slot,await openKey(userId,s.slot,s.ciphertext))};}));
 await db().batch([db().prepare('DELETE FROM api_slots WHERE user_id=? AND slot IN (?,?)').bind(userId,from,to),...prepared.map(s=>db().prepare('INSERT INTO api_slots(user_id,slot,provider,model,label,ciphertext,fingerprint,last_four,enabled,status,message,cooldown_until,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(userId,s.slot,s.provider,s.model,s.label,s.ciphertext,s.fingerprint,s.last_four,s.enabled,s.status,s.message,s.cooldown_until,new Date().toISOString()))]);
}

export async function updateConnection(userId:string,input:unknown){
 const value=z.object({slot:z.number().int().min(1).max(3),provider:z.enum(['openai','gemini','groq']),model:z.string().min(1).max(120),label:z.string().trim().max(60)}).parse(input);
 if(!(PROVIDERS[value.provider].models as readonly string[]).includes(value.model))throw new PublicError('Choose one of the supported models for this provider.');
 if(/(?:sk-|gsk_|AIza)[A-Za-z0-9_-]{8,}/.test(value.label))throw new PublicError('Use a short label without API credentials.');
 const result=await db().prepare("UPDATE api_slots SET model=?,label=?,status='untested',message=?,cooldown_until=NULL,updated_at=? WHERE user_id=? AND slot=? AND provider=?").bind(value.model,value.label||PROVIDERS[value.provider].name,'Settings saved. Your next requested AI check will use this model.',new Date().toISOString(),userId,value.slot,value.provider).run();
 if(!result.meta.changes)throw new PublicError('This connection changed. Reload it and try again.',409);
}
