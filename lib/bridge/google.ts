import {z} from 'zod';
import {db} from '../store';
import {PublicError} from '../errors';
import {base64url,issueSession,sha256,verifyProof,verifySession,type BridgeConfig,type BridgeUser} from './session';
const input=z.object({identity:z.object({subject:z.string().min(1).max(255),email:z.string().email().max(254),fullName:z.string().max(200).nullable()}),mode:z.enum(['login','link']),previousSession:z.string().max(4096).nullable(),issuedAt:z.number().int(),requestId:z.string().regex(/^[A-Za-z0-9_-]{43}$/)});
export async function googleExchange(config:BridgeConfig,body:unknown,now=Date.now()){
 const raw=body as {payload?:unknown;signature?:unknown};
 if(!raw||typeof raw.payload!=='string'||raw.payload.length>8000||!/^[A-Za-z0-9_-]+$/.test(raw.payload)||typeof raw.signature!=='string'||!await verifyProof(config,'google-identity-v1',raw.payload,raw.signature))throw new PublicError('This sign-in could not be verified.',401);
 let value:z.infer<typeof input>;try{value=input.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(raw.payload.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))));}catch{throw new PublicError('This sign-in request is invalid.',400);}
 if(value.issuedAt<now-60000||value.issuedAt>now+5000)throw new PublicError('This sign-in expired. Please try again.',401);
 const canonical=value.mode==='link'?await verifySession(config,value.previousSession):null;
 if(value.mode==='link'&&!canonical)throw new PublicError('Sign in to your existing workspace before connecting Google.',401);
 const subjectHash=await sha256(config.issuer+'\n'+value.identity.subject),nonceKey='google_exchange:'+await sha256(value.requestId);
 await db().prepare("DELETE FROM meta WHERE key IN (SELECT key FROM meta WHERE key>='google_exchange:' AND key<'google_exchange:~' AND CAST(value AS INTEGER)<? LIMIT 20)").bind(now).run();
 const used=await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING').bind(nonceKey,String(now+120000)).run();
 if(!used.meta.changes)throw new PublicError('This sign-in was already used. Please try again.',401);
 const identity=value.identity,user:BridgeUser=canonical||{userId:'google:'+subjectHash,email:identity.email,fullName:identity.fullName,displayName:identity.fullName||identity.email};
 await db().prepare('INSERT INTO google_accounts(subject_hash,user_id,user_data,linked_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(subjectHash,user.userId,JSON.stringify(user),new Date(now).toISOString()).run();
 const row=await db().prepare('SELECT user_id,user_data FROM google_accounts WHERE subject_hash=?').bind(subjectHash).first<{user_id:string;user_data:string}>();
 if(!row||canonical&&row.user_id!==canonical.userId)throw new PublicError('That Google account or workspace already has a different sign-in connection. No accounts were merged.',409);
 if(canonical||row.user_id===user.userId){row.user_data=JSON.stringify(user);await db().prepare('UPDATE google_accounts SET user_data=? WHERE subject_hash=? AND user_id=?').bind(row.user_data,subjectHash,row.user_id).run();}
 const session=await issueSession(config,JSON.parse(row.user_data),Math.floor(now/1000));return {session,expiresIn:86400,linked:value.mode==='link'};
}
export async function googleConnection(userId:string){const row=await db().prepare('SELECT linked_at FROM google_accounts WHERE user_id=?').bind(userId).first<{linked_at:string}>();return {linked:!!row,linkedAt:row?.linked_at||null};}
