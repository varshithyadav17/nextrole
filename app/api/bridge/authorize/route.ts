import {getNativeChatGPTUser,chatGPTSignInPath} from '../../../chatgpt-auth';
import {siteBridgeConfig,authorizationParams,issueAuthorization} from '../../../../lib/bridge/site';
import {allowRequest} from '../../../../lib/rate-limit';
import {PublicError} from '../../../../lib/errors';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export async function GET(request:Request){
 try{const config=siteBridgeConfig();if(!config)throw new PublicError('NextRole sign-in is temporarily unavailable.',503);
  const url=new URL(request.url),params=authorizationParams(config,url),user=await getNativeChatGPTUser();
  if(!user)return new Response(null,{status:302,headers:{...headers,Location:chatGPTSignInPath(url.pathname+url.search)}});
  if(!await allowRequest(user.userId,'bridge',10))throw new PublicError('Wait a minute before starting another sign-in.',429);
  const callback=new URL(params.redirectUri);callback.searchParams.set('code',await issueAuthorization(config,user,params));callback.searchParams.set('state',params.state);
  return new Response(null,{status:302,headers:{...headers,Location:callback.href}});
 }catch(e){return Response.json({error:e instanceof PublicError?e.message:'NextRole sign-in could not start. Try again.'},{status:e instanceof PublicError?e.status:503,headers});}
}
