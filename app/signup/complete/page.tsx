import {requireChatGPTUser} from '../../chatgpt-auth';
import {safeReturnPath} from '../../../lib/bridge/session';
import {ScoutMark} from '../../scout';
import EmailForm from '../../login/email-form';
import {redirect} from 'next/navigation';
import AuthStyles from '../../login/auth-styles';

export const dynamic='force-dynamic';

export default async function CompleteSignup({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const user=await requireChatGPTUser('/signup/complete');
 const params=await searchParams;
 const returnTo=safeReturnPath(typeof params.return_to==='string'?params.return_to:'/');
 if(!user.setupPending)redirect(returnTo);
 return <main className="login-page"><AuthStyles/>
  <a className="brand" href="/" aria-label="NextRole home"><span className="brand-icon"><ScoutMark/></span><span>nextrole<span className="brand-dot">.</span></span></a>
  <section className="login-card auth-card">
   <h1>Complete your account.</h1>
   <p>Confirm your details to get started.</p>
   <EmailForm mode="setup" accountEmail={user.email} initialName={user.fullName||''} returnTo={returnTo} enabled/>
  </section>
  <a className="text-button" href="/privacy">Privacy &amp; your data</a>
 </main>;
}
