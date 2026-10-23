import {siteBridgeConfig,consumeAuthorization} from '../../../../lib/bridge/site';
import {requestJSON} from '../../../../lib/request-json';
import {PublicError} from '../../../../lib/errors';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 try{const config=siteBridgeConfig();if(!config)throw new PublicError('NextRole sign-in is temporarily unavailable.',503);if(request.headers.get('origin')&&request.headers.get('origin')!==config.audience)throw new PublicError('This exchange must come from NextRole.',403);return Response.json(await consumeAuthorization(config,await requestJSON(request,4096)),{headers});}
 catch(e){return Response.json({error:e instanceof PublicError?e.message:'Sign-in exchange failed. Start again.'},{status:e instanceof PublicError?e.status:503,headers});}
}
