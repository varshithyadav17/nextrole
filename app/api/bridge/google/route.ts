import {siteBridgeConfig,siteBridgeProofConfig} from '../../../../lib/bridge/site';
import {googleExchange} from '../../../../lib/bridge/google';
import {requestJSON} from '../../../../lib/request-json';
import {PublicError} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
 try{const primary=siteBridgeConfig();if(!primary)throw new PublicError('Sign-in is temporarily unavailable.',503);if(request.headers.get('origin')&&request.headers.get('origin')!==primary.audience)throw new PublicError('Start sign-in from NextRole.',403);
  const body=await requestJSON(request,10000) as {payload?:unknown;signature?:unknown},config=body?await siteBridgeProofConfig('google-identity-v1',body.payload,body.signature):null;
  if(!config)throw new PublicError('This sign-in could not be verified.',401);
  return Response.json(await googleExchange(config,body),{headers});}
 catch(error){return Response.json({error:error instanceof PublicError?error.message:'Sign-in could not finish. Please try again.'},{status:error instanceof PublicError?error.status:503,headers});}
}
