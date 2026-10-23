import {siteBridgeConfig,siteBridgeProofConfig,consumeAuthorization} from '../../../../lib/bridge/site';
import {exchangeValue} from '../../../../lib/bridge/session';
import {requestJSON} from '../../../../lib/request-json';
import {PublicError} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 try{const primary=siteBridgeConfig();if(!primary)throw new PublicError('NextRole sign-in is temporarily unavailable.',503);if(request.headers.get('origin')&&request.headers.get('origin')!==primary.audience)throw new PublicError('This exchange must come from NextRole.',403);
  const body=await requestJSON(request,4096) as {code?:unknown;verifier?:unknown;redirectUri?:unknown;proof?:unknown};
  const config=body&&typeof body.code==='string'&&typeof body.verifier==='string'&&typeof body.redirectUri==='string'?await siteBridgeProofConfig('exchange-v1',exchangeValue(body.code,body.verifier,body.redirectUri),body.proof):null;
  if(!config)throw new PublicError('The sign-in exchange was rejected. Start again from NextRole.',401);
  return Response.json(await consumeAuthorization(config,body),{headers});}
 catch(e){return Response.json({error:e instanceof PublicError?e.message:'Sign-in exchange failed. Start again.'},{status:e instanceof PublicError?e.status:503,headers});}
}
