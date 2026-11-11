import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,one} from './store';
import {PublicError} from './errors';
import {importAnalytics} from './analytics-import';
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const scopeSchema=z.object({id:hash,manifestSHA256:hash,expiresAt:z.number().int().positive()}).strict();
const sha=async(value:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
function configuredScope(){try{const s=scopeSchema.parse(JSON.parse(env.NEXTROLE_ANALYTICS_IMPORT_SCOPE||'null'));return s.expiresAt>Date.now()?s:null;}catch{return null;}}
const key=(id:string)=>'analytics_import_upload:'+id;

/** The caller must already have passed ownerAccess. This grants file-scoped upload, not identity. */
export async function issueAnalyticsUpload(){
 const scope=configuredScope();if(!scope)return null;
 const existing=await one<{state:string}>('SELECT state FROM analytics_imports WHERE id=?',scope.id);if(existing?.state==='complete')return {id:scope.id,alreadyImported:true};
 const token=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),expiresAt=Math.min(scope.expiresAt,Date.now()+15*60000);
 await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key(scope.id),JSON.stringify({tokenHash:await sha(token),manifestSHA256:scope.manifestSHA256,expiresAt})).run();
 return {id:scope.id,token,expiresAt,path:'/api/host/imports/upload',scope:'Only the configured workbook manifest, its checksummed rows and original files. No account or live telemetry access.'};
}

export async function useAnalyticsUpload(authorization:string|null,input:unknown){
 const scope=configuredScope(),token=authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];if(!scope||!token)throw new PublicError('The upload permission is missing or expired.',401);
 const record=await one<{value:string}>('SELECT value FROM meta WHERE key=?',key(scope.id)),permit=record?JSON.parse(record.value):null;
 if(!permit||permit.expiresAt<=Date.now()||permit.manifestSHA256!==scope.manifestSHA256||permit.tokenHash!==await sha(token))throw new PublicError('The upload permission is missing or expired.',401);
 const args=z.object({operation:z.enum(['begin','append','file','finalize','status']),payload:z.string().max(1100000)}).strict().parse(input),payload=JSON.parse(args.payload);
 if(args.operation==='begin'){
  if(await sha(args.payload)!==scope.manifestSHA256)throw new PublicError('This manifest is outside the upload permission.',403);
  const files=z.object({sources:z.array(z.object({sha256:hash}).passthrough()).min(1).max(10)}).passthrough().parse(payload);
  if(await sha(files.sources.map(s=>s.sha256).sort().join('\n'))!==scope.id)throw new PublicError('This source set is outside the upload permission.',403);
 }else if(!payload||payload.id!==scope.id)throw new PublicError('This import is outside the upload permission.',403);
 const result=await importAnalytics(args.operation,payload);
 if(args.operation==='finalize')await db().prepare('DELETE FROM meta WHERE key=?').bind(key(scope.id)).run();
 return result;
}
