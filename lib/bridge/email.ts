import {z} from 'zod';
import {db} from '../store';
import {PublicError} from '../errors';
import {allowRequest} from '../rate-limit';
import {sha256,verifyProof,verifySession,type BridgeConfig,type BridgeUser} from './session';

const passwordHash=z.string().regex(/^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
const input=z.object({action:z.enum(['lookup','create']),email:z.string().trim().toLowerCase().email().max(254),fullName:z.string().trim().min(1).max(100).optional(),passwordHash:passwordHash.optional(),previousSession:z.string().max(4096).nullable().optional(),issuedAt:z.number().int(),requestId:z.string().regex(/^[A-Za-z0-9_-]{43}$/)});

/** Only a signed gateway request may read a hash or create a password identity. */
export async function emailExchange(config:BridgeConfig,body:unknown,now=Date.now()){
 const packet=body as {payload?:unknown;signature?:unknown};
 if(!packet||typeof packet.payload!=='string'||packet.payload.length>9000||typeof packet.signature!=='string'||!await verifyProof(config,'email-auth-v1',packet.payload,packet.signature))throw new PublicError('This sign-in could not be verified.',401);
 let value:z.infer<typeof input>;
 try{value=input.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(packet.payload.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))));}
 catch{throw new PublicError('Check the account details and try again.',400);}
 if(value.issuedAt<now-60000||value.issuedAt>now+5000)throw new PublicError('This sign-in expired. Please try again.',401);
 const used=await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING').bind('email_exchange:'+await sha256(value.requestId),String(now+120000)).run();
 if(!used.meta.changes)throw new PublicError('This sign-in was already used. Please try again.',401);
 await db().prepare("DELETE FROM meta WHERE key IN (SELECT key FROM meta WHERE key>='email_exchange:' AND key<'email_exchange:~' AND CAST(value AS INTEGER)<? LIMIT 20)").bind(now).run();
 if(value.action==='lookup'){
  const key=await sha256(value.email),hour='request_count:'+new Date(now).toISOString().slice(0,13)+':email-hour:'+key;
  if(!await allowRequest('email:'+key,'bridge',8)||!await allowRequest('email-auth-global','bridge',90))throw new PublicError('Too many sign-in attempts. Please wait a minute.',429);
  const count=await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1 WHERE CAST(meta.value AS INTEGER)<40').bind(hour,'1').run();
  if(!count.meta.changes)throw new PublicError('Too many sign-in attempts. Please try again later.',429);
  const account=await db().prepare('SELECT user_data,password_hash FROM email_accounts WHERE email=?').bind(value.email).first<{user_data:string;password_hash:string}>();
  return {account:account?{user:JSON.parse(account.user_data) as BridgeUser,passwordHash:account.password_hash}:null};
 }
 if(!value.passwordHash||!value.fullName)throw new PublicError('Enter your name and a valid password.',400);
 const canonical=value.previousSession?await verifySession(config,value.previousSession):null;
 if(value.previousSession&&!canonical)throw new PublicError('Sign in again before adding a password.',401);
 if(canonical&&canonical.email.trim().toLowerCase()!==value.email)throw new PublicError('Use the email address of your signed-in account.',403);
 const user:BridgeUser=canonical||{userId:'email:'+await sha256(config.issuer+'\n'+value.email),email:value.email,fullName:value.fullName,displayName:value.fullName};
 // A matching Google email never merges accounts without an authenticated linking session.
 const existingGoogle=await db().prepare("SELECT user_id FROM google_accounts WHERE lower(json_extract(user_data,'$.email'))=? LIMIT 1").bind(value.email).first<{user_id:string}>();
 if(existingGoogle&&existingGoogle.user_id!==canonical?.userId)throw new PublicError('Sign in with Google, then add a password from Your account.',409);
 const result=await db().prepare('INSERT INTO email_accounts(email,user_id,password_hash,user_data,created_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(value.email,user.userId,value.passwordHash,JSON.stringify(user),new Date(now).toISOString()).run();
 if(!result.meta.changes)throw new PublicError('An account already uses these details. Sign in to continue.',409);
 return {user};
}
export async function emailConnection(userId:string){return {passwordLinked:!!await db().prepare('SELECT user_id FROM email_accounts WHERE user_id=?').bind(userId).first()};}
