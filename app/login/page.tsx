import {getSignInOptions} from '../chatgpt-auth';
import {safeReturnPath} from '../../lib/bridge/session';
import {ScoutMark} from '../scout';
export const dynamic='force-dynamic';
const messages:Record<string,string>={'google-not-ready':'Google sign-in is being connected. Please try again later.','google-cancelled':'Google sign-in was cancelled. Choose an account when you’re ready.','google-failed':'Google sign-in could not finish. Please try again.','google-conflict':'That Google account or workspace is already connected elsewhere. Your existing accounts are safe.','google-signin-first':'Sign in to your existing workspace, then connect Google from Preferences.'};
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,returnTo=safeReturnPath(typeof params.return_to==='string'?params.return_to:'/'),options=await getSignInOptions(),error=typeof params.error==='string'?messages[params.error]:null;
 return <main className="login-page">
  <a className="brand" href="/" aria-label="NextRole home"><span className="brand-icon"><ScoutMark/></span><span>nextrole<span className="brand-dot">.</span></span></a>
  <section className="login-card"><span className="login-scout"><img src="/art/trail/scout-formal.webp" width="1254" height="1254" alt="Scout, ready for the next chapter"/></span><h1>Your next chapter.</h1><p>Sign in or create your NextRole account.</p>
   {error&&<p className="login-notice" role="alert">{error}</p>}
   {options.googleReady||options.googleExternal?<a className="google-signin" href={options.googleOrigin+'/auth/google?return_to='+encodeURIComponent(returnTo)} target="_top"><span aria-hidden="true" className="google-mark">G</span>Continue with Google</a>:<><button className="google-signin" disabled><span aria-hidden="true" className="google-mark">G</span>Continue with Google</button><small className="login-pending">Google sign-in is being connected.</small></>}
   {!options.googleOnly&&<><div className="login-divider"><span>or</span></div><a className="button primary login-chatgpt" href={'/signin-with-chatgpt?return_to='+encodeURIComponent(returnTo)} target="_top">Continue with ChatGPT</a><p className="login-existing">Already use NextRole? Use your existing sign-in, then connect Google in Preferences.</p></>}
   <small>Sign-in doesn’t use AI credits.</small>
  </section><a className="text-button" href="/privacy">Privacy &amp; your data</a>
 </main>;
}
