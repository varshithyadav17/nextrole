import {getChatGPTUser} from '../../../chatgpt-auth';
import {siteBridgeConfig} from '../../../../lib/bridge/site';
import {googleConnection} from '../../../../lib/bridge/google';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser(),config=siteBridgeConfig();
 return Response.json({googleReady:false,googleExternal:!!config,manageHref:config?config.audience+'/signin-with-chatgpt?return_to='+encodeURIComponent('/?tab=settings&settings=alerts'):null,...(user?await googleConnection(user.userId):{})},{headers:{'Cache-Control':'private, no-store'}});
}
