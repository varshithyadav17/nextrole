import {env} from 'cloudflare:workers';
import {db} from '../store';
import {PublicError} from '../errors';
import {bridgeConfig,sha256,randomToken,verifyProof,exchangeValue,issueSession,type BridgeConfig,type BridgeUser} from './session';
export function siteBridgeConfig(){return bridgeConfig(env.NEXTROLE_BRIDGE_SECRET,env.NEXTROLE_BRIDGE_ISSUER,env.NEXTROLE_VERCEL_ORIGIN);}
/** Two explicitly provisioned server credentials; never derive one from a Site bypass token. */
export function siteBridgeConfigs(){
 const primary=siteBridgeConfig(),render=bridgeConfig(env.NEXTROLE_RENDER_BRIDGE_SECRET,env.NEXTROLE_BRIDGE_ISSUER,env.NEXTROLE_VERCEL_ORIGIN);
 return [primary,render].filter((value,index,all):value is BridgeConfig=>!!value&&all.findIndex(candidate=>candidate?.secret===value.secret)===index);
}
export async function siteBridgeProofConfig(purpose:'exchange-v1'|'google-identity-v1',value:unknown,signature:unknown){
 if(typeof value!=='string'||value.length>9000||typeof signature!=='string'||signature.length!==43)return null;
 for(const config of siteBridgeConfigs())if(await verifyProof(config,purpose,value,signature))return config;
 return null;
}
export function authorizationParams(config:BridgeConfig,url:URL){
 const redirectUri=url.searchParams.get('redirect_uri')||'',challenge=url.searchParams.get('code_challenge')||'',state=url.searchParams.get('state')||'';
 if(redirectUri!==config.audience+'/callback'||url.searchParams.get('code_challenge_method')!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(challenge)||!/^[A-Za-z0-9_-]{43}$/.test(state))throw new PublicError('This sign-in request is invalid. Start again from NextRole.',400);
 return {redirectUri,challenge,state};
}
export async function issueAuthorization(config:BridgeConfig,user:BridgeUser,params:{redirectUri:string;challenge:string},now=Date.now()){
 const owner=await sha256(user.userId),prefix='bridge_code:'+owner+':',expires=now+120000,random=randomToken(),key=prefix+expires+':'+await sha256(random);
 await db().prepare("DELETE FROM meta WHERE key IN (SELECT key FROM meta WHERE key>=? AND key<? AND CAST(json_extract(value,'$.expires') AS INTEGER)<=? LIMIT 20)").bind(prefix,prefix+'~',now).run();
 const count=await db().prepare('SELECT COUNT(*) as n FROM meta WHERE key>=? AND key<?').bind(prefix,prefix+'~').first<{n:number}>();if((count?.n||0)>=10)throw new PublicError('Too many sign-ins are waiting. Wait two minutes and try again.',429);
 await db().prepare('INSERT INTO meta(key,value) VALUES(?,?)').bind(key,JSON.stringify({user,expires,challenge:params.challenge,redirectUri:params.redirectUri})).run();
 return expires+'.'+owner+'.'+random;
}
export async function consumeAuthorization(config:BridgeConfig,input:unknown,now=Date.now()){
 const body=input as {code?:unknown;verifier?:unknown;redirectUri?:unknown;proof?:unknown};
 if(!body||typeof body.code!=='string'||!/^\d{13}\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(body.code)||typeof body.verifier!=='string'||!/^[A-Za-z0-9_-]{43,128}$/.test(body.verifier)||body.redirectUri!==config.audience+'/callback'||typeof body.proof!=='string'||!await verifyProof(config,'exchange-v1',exchangeValue(body.code,body.verifier,body.redirectUri),body.proof))throw new PublicError('The sign-in exchange was rejected. Start again from NextRole.',401);
 const [expires,owner,random]=body.code.split('.');if(Number(expires)<=now||Number(expires)>now+120000)throw new PublicError('This sign-in expired. Start again from NextRole.',401);
 const key='bridge_code:'+owner+':'+expires+':'+await sha256(random),record=await db().prepare('SELECT value FROM meta WHERE key=?').bind(key).first<{value:string}>();
 if(!record)throw new PublicError('This sign-in was already used or expired. Start again.',401);
 const saved=JSON.parse(record.value);if(saved.expires!==Number(expires)||saved.redirectUri!==body.redirectUri||await sha256(saved.user.userId)!==owner||saved.challenge!==await sha256(body.verifier))throw new PublicError('This sign-in does not match the original browser. Start again.',401);
 const consumed=await db().prepare('DELETE FROM meta WHERE key=? AND value=? RETURNING value').bind(key,record.value).first();if(!consumed)throw new PublicError('This sign-in was already used. Start again.',401);
 return {session:await issueSession(config,saved.user,Math.floor(now/1000)),expiresIn:86400};
}
export async function clearAuthorizations(userId:string){const prefix='bridge_code:'+await sha256(userId)+':';await db().prepare('DELETE FROM meta WHERE key>=? AND key<?').bind(prefix,prefix+'~').run();}
