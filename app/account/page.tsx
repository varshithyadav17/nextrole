import {requireChatGPTUser} from '../chatgpt-auth';
import {getWorkspaceRole} from '../auth-role';
import SignInMethods from '../sign-in-methods';
import {ScoutMark} from '../scout';
import {ScoutIllustration} from '../trail-scout';
export const dynamic='force-dynamic';
export default async function Account(){
 const user=await requireChatGPTUser('/account'),host=await getWorkspaceRole(user)==='host';
 return <main className="login-page"><a className="brand" href={host?'/admin':'/'} aria-label="NextRole home"><span className="brand-icon"><ScoutMark/></span><span>nextrole<span className="brand-dot">.</span></span></a><section className="login-card"><ScoutIllustration pose="alerts" className="scout-account-moment"/><h1>Your account.</h1><p>{user.email}</p><SignInMethods/><a className="button secondary" href={host?'/admin':'/?tab=settings&settings=alerts'}>{host?'Back to admin':'Back to preferences'}</a></section><a className="text-button" href="/signout-with-chatgpt?return_to=%2F" target="_top">Log out</a></main>;
}
