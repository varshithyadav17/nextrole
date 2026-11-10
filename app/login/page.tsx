import {getSignInOptions} from '../chatgpt-auth';
import {safeReturnPath} from '../../lib/bridge/session';
import {ScoutMark} from '../scout';
import SignInMethods from './sign-in-methods';
import {redirect} from 'next/navigation';
import './login.css';
export const dynamic='force-dynamic';
const messages:Record<string,string>={'google-not-ready':'Google sign-in is being connected. Please try again later.','google-cancelled':'Google sign-in was cancelled. Choose an account when you’re ready.','google-failed':'Google sign-in could not finish. Please try again.','google-workspace-unavailable':'Google returned successfully, but your workspace could not be reached. Please try again shortly.','google-conflict':'That Google account or workspace is already connected elsewhere. Your existing accounts are safe.','google-signin-first':'Sign in to your existing workspace, then connect Google from Preferences.'};
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,returnTo=safeReturnPath(typeof params.return_to==='string'?params.return_to:'/'),options=await getSignInOptions(true),error=typeof params.error==='string'?messages[params.error]:null;
 if(options.googleExternal&&options.googleOrigin)redirect(options.googleOrigin+'/login?return_to='+encodeURIComponent(returnTo));
 return <main className="login-page">
  <a className="brand" href="/" aria-label="NextRole home"><span className="brand-icon"><ScoutMark/></span><span>nextrole<span className="brand-dot">.</span></span></a>
  <section className="login-card auth-card"><span className="login-scout"><img src="/art/trail/scout-formal.webp" width="1254" height="1254" alt="Scout, ready for the next chapter"/></span><h1>Your next chapter.</h1><p>One workspace for your next opportunity.</p>
   {error&&<p className="login-notice" role="alert">{error}</p>}
   <SignInMethods initial={options} returnTo={returnTo}/>
  </section><a className="text-button" href="/privacy">Privacy &amp; your data</a>
 </main>;
}
