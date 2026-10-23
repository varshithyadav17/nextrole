import {getChatGPTUser} from '../../chatgpt-auth';
import {todayPlan} from '../../../lib/today';
import {allowRequest} from '../../../lib/rate-limit';
export const dynamic='force-dynamic';
const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 try{if(!await allowRequest(user.userId,'catalogue',90))return respond({error:'Please wait a moment before checking your actions again.'},429);return respond(await todayPlan(user.userId));}
 catch{return respond({error:'Your action list could not be loaded. Your saved applications are available in Applications.'},503);}
}
