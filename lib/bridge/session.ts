/** Shared, dependency-free Web Crypto protocol. No platform bypass credential is used. */
export type BridgeUser={userId:string;email:string;displayName:string;fullName:string|null};
export type BridgeConfig={secret:string;issuer:string;audience:string};
const encoder=new TextEncoder();
export const SESSION_SECONDS=24*60*60;
export function httpsOrigin(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.origin!==value||u.username||u.password)throw new Error('An exact HTTPS origin is required.');return u.origin;}
export function bridgeConfig(secret:unknown,issuer:unknown,audience:unknown):BridgeConfig|null{
 try{if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret)||typeof issuer!=='string'||typeof audience!=='string')return null;return {secret,issuer:httpsOrigin(issuer),audience:httpsOrigin(audience)};}catch{return null;}
}
export function base64url(bytes:Uint8Array){return btoa(Array.from(bytes,n=>String.fromCharCode(n)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unbase64(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error('Invalid encoding.');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export function randomToken(){return base64url(crypto.getRandomValues(new Uint8Array(32)));}
export async function sha256(value:string){return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
async function hmacKey(secret:string){return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g)!,n=>parseInt(n,16)),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function proof(config:BridgeConfig,purpose:string,value:string){return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',await hmacKey(config.secret),encoder.encode(purpose+'\n'+value))));}
export async function verifyProof(config:BridgeConfig,purpose:string,value:string,signature:string){try{return signature.length===43&&await crypto.subtle.verify('HMAC',await hmacKey(config.secret),unbase64(signature),encoder.encode(purpose+'\n'+value));}catch{return false;}}
function validUser(value:unknown):value is BridgeUser{
 if(!value||typeof value!=='object')return false;const u=value as BridgeUser;
 return typeof u.userId==='string'&&u.userId.length>0&&u.userId.length<=200&&typeof u.email==='string'&&u.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)&&(u.fullName===null||typeof u.fullName==='string'&&u.fullName.length<=200)&&typeof u.displayName==='string'&&u.displayName.length<=254;
}
export async function issueSession(config:BridgeConfig,user:BridgeUser,now=Math.floor(Date.now()/1000)){
 if(!validUser(user))throw new Error('Invalid trusted identity.');
 const payload=base64url(encoder.encode(JSON.stringify({typ:'nextrole-session',iss:config.issuer,aud:config.audience,iat:now,exp:now+SESSION_SECONDS,user})));
 return 'v1.'+payload+'.'+await proof(config,'session-v1',payload);
}
export async function verifySession(config:BridgeConfig,token:string|null,now=Math.floor(Date.now()/1000)):Promise<BridgeUser|null>{
 try{if(!token||token.length>4096)return null;const [version,payload,signature,...extra]=token.split('.');if(version!=='v1'||extra.length||!await verifyProof(config,'session-v1',payload,signature))return null;
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(unbase64(payload)));
  if(p.typ!=='nextrole-session'||p.iss!==config.issuer||p.aud!==config.audience||!Number.isSafeInteger(p.exp)||!Number.isSafeInteger(p.iat)||p.iat>now+30||p.exp<=now||p.exp-p.iat!==SESSION_SECONDS||!validUser(p.user))return null;
  return {userId:p.user.userId,email:p.user.email,fullName:p.user.fullName,displayName:p.user.fullName||p.user.email};
 }catch{return null;}
}
export function safeReturnPath(value:string){try{const u=new URL(value,'https://nextrole.local');if(!value.startsWith('/')||value.startsWith('//')||u.origin!=='https://nextrole.local'||/^\/(?:callback|login|auth|signin-with-chatgpt|signout-with-chatgpt)(?:\/|$)/.test(u.pathname))return '/';return u.pathname+u.search+u.hash;}catch{return '/';}}
export function exchangeValue(code:string,verifier:string,redirectUri:string){return [code,verifier,redirectUri].join('\n');}
