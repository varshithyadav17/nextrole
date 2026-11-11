/** Node-only password hashing. Imported by the authentication gateway, never by browser code. */
import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';

const N=131072,r=8,p=1,keyLength=32;
// Bound memory on the existing 512 MB gateway, including concurrent login attempts.
let running=0;
export class PasswordBusyError extends Error {}
async function derive(password:string,salt:Buffer){
 if(running>=1)throw new PasswordBusyError('Sign-in is busy. Please try again in a moment.');
 running++;
 try{return await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,keyLength,{N,r,p,maxmem:160*1024*1024},(error,key)=>error?reject(error):resolve(key)));}
 finally{running--;}
}
export function validPassword(value:unknown,creating=false):value is string{
 return typeof value==='string'&&value.length>=(creating?12:1)&&value.length<=128&&Buffer.byteLength(value,'utf8')<=512;
}
export async function hashPassword(password:string){
 if(!validPassword(password,true))throw new Error('Use a password with 12 to 128 characters.');
 const salt=randomBytes(16),key=await derive(password,salt);
 return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${key.toString('hex')}`;
}
export async function checkPassword(password:string,stored:string|null){
 if(!validPassword(password))return false;
 const match=stored?.match(/^scrypt\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{64})$/);
 // Missing accounts still perform the same expensive derivation.
 const key=await derive(password,Buffer.from(match?.[1]||'0'.repeat(32),'hex'));
 return !!match&&timingSafeEqual(key,Buffer.from(match[2],'hex'));
}
