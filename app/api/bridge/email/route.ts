import {siteBridgeConfig,siteBridgeProofConfig} from '../../../../lib/bridge/site';
import {emailExchange} from '../../../../lib/bridge/email';
import {requestJSON} from '../../../../lib/request-json';
import {PublicError} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
 try{
  const primary=siteBridgeConfig();if(!primary)throw new PublicError('Account sign-in is temporarily unavailable.',503);
  if(request.headers.has('origin')&&request.headers.get('origin')!==primary.audience)throw new PublicError('Start sign-in from NextRole.',403);
  const body=await requestJSON(request,12000),config=await siteBridgeProofConfig('email-auth-v1',body?.payload,body?.signature);
  if(!config)throw new PublicError('This sign-in could not be verified.',401);
  return Response.json(await emailExchange(config,body),{headers});
 }catch(error){return Response.json({error:error instanceof PublicError?error.message:'Account sign-in is temporarily unavailable. Please try again.'},{status:error instanceof PublicError?error.status:503,headers});}
}
