import {z} from 'zod';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getProfile} from '../../../lib/store';
import {searchMarket,saveMarketLead,marketFilters} from '../../../lib/market-search';
import {requestJSON} from '../../../lib/request-json';
import {allowRequest} from '../../../lib/rate-limit';
import {acquireLease,releaseLease,type Lease} from '../../../lib/lease';
import {PublicError} from '../../../lib/errors';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('search'),consent:z.literal('USE_MY_WEB_SEARCH_CREDITS'),query:z.string().trim().min(2).max(300),filters:marketFilters}).strict(),
 z.object({action:z.literal('save'),resultId:z.string().min(1).max(400),url:z.string().url().max(2048)}).strict(),
]);
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return respond({error:'Use NextRole to search and save openings.'},403);
 let lease:Lease|null=null;
 try{
  const body=schema.parse(await requestJSON(request,8192));
  if(!await allowRequest(user.userId,body.action==='search'?'market':'write',body.action==='search'?6:120))return respond({error:'Wait a minute before another web-search action.'},429);
  if(body.action==='search')return respond(await searchMarket(user.userId,body.query,await getProfile(user.userId),body.filters));
  lease=await acquireLease('byok_mutation:'+user.userId,45000);if(!lease)return respond({error:'Another workspace change is being saved. Please try again in a moment.'},409);
  return respond(await saveMarketLead(user.userId,body.resultId,body.url));
 }catch(error){return respond({error:error instanceof z.ZodError?'Check the search, filters and API-credit confirmation.':error instanceof PublicError?error.message:'Web search could not finish. Your stored openings and saved choices are available.'},error instanceof z.ZodError?400:error instanceof PublicError?error.status:503);}finally{await releaseLease(lease);}
}
