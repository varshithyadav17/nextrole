import {requireChatGPTUser} from '../chatgpt-auth';
import {getWorkspaceRole} from '../auth-role';
import HostDashboard from '../host-dashboard';
export const dynamic='force-dynamic';
export default async function Admin(){
 const user=await requireChatGPTUser('/admin');
 if(await getWorkspaceRole(user)!=='host')return <main className="login-page"><section className="login-card"><h1>Admin access required</h1><p>Your job workspace is ready.</p><a className="button primary" href="/">Open NextRole</a></section></main>;
 return <HostDashboard/>;
}
