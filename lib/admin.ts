import {env} from 'cloudflare:workers';
import {getChatGPTUser,type ChatGPTUser} from '../app/chatgpt-auth';
export function isHost(user:ChatGPTUser){const owner=env.NEXTROLE_OWNER_EMAIL?.trim().toLowerCase();return !user.userId.startsWith('google:')&&!!owner&&user.email.trim().toLowerCase()===owner;}
export async function ownerAccess(){
 const user=await getChatGPTUser();
 if(!user)return {allowed:false,status:401};
 return {allowed:isHost(user),status:403};
}
