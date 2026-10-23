import {getChatGPTUser} from '../../chatgpt-auth';
import {cataloguePage} from '../../../lib/catalogue';
import {allowRequest} from '../../../lib/rate-limit';
import {PublicError} from '../../../lib/errors';
import {z} from 'zod';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return respond({error:'Please sign in with ChatGPT.'},401);
 try{
  if(!await allowRequest(user.userId,'catalogue',90))return respond({error:'Please wait a minute before loading more catalogue pages.'},429);
  const params=new URL(request.url).searchParams,input:Record<string,unknown>=Object.fromEntries(params);
  if(params.has('limit'))input.limit=Number(params.get('limit'));
  if(params.has('ids'))input.ids=params.getAll('ids').filter(Boolean);
  return respond(await cataloguePage(user.userId,input));
 }catch(error){return respond({error:error instanceof z.ZodError?'Check the catalogue filters and page size.':error instanceof PublicError?error.message:'The catalogue is temporarily unavailable. Please try again.'},error instanceof z.ZodError?400:error instanceof PublicError?error.status:503);}
}
