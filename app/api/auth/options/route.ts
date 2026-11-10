import {getChatGPTUser} from '../../../chatgpt-auth';
import {siteBridgeConfig} from '../../../../lib/bridge/site';
import {googleConnection} from '../../../../lib/bridge/google';
import {emailConnection} from '../../../../lib/bridge/email';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getChatGPTUser(),config=siteBridgeConfig();
 return Response.json({googleReady:false,googleExternal:!!config,emailReady:false,manageHref:config?config.audience+'/login?return_to='+encodeURIComponent('/account'):null,...(user?{...await googleConnection(user.userId),...await emailConnection(user.userId)}:{})},{headers:{'Cache-Control':'private, no-store'}});
}
