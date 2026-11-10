'use client';
import {useRef,useState,type FormEvent} from 'react';
import {Eye,EyeOff,Loader2,ArrowRight} from 'lucide-react';
type Mode='login'|'signup'|'link';
export default function EmailForm({mode,returnTo='/',enabled,accountEmail,onLinked}:{mode:Mode;returnTo?:string;enabled:boolean;accountEmail?:string;onLinked?:()=>void}){
 const [visible,setVisible]=useState(false),[confirmVisible,setConfirmVisible]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const lock=useRef(false),errorRef=useRef<HTMLParagraphElement>(null),creating=mode!=='login';
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current||!enabled)return;
  const form=event.currentTarget,data=new FormData(form),password=String(data.get('password')||'');
  setError('');
  if(creating&&password!==data.get('confirmation')){setError('Your passwords don’t match. Please enter them again.');requestAnimationFrame(()=>errorRef.current?.focus());return;}
  lock.current=true;setPending(true);
  try{
   const response=await fetch('/api/auth/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,email:accountEmail||data.get('email'),password,...(creating?{fullName:data.get('fullName')}:{}),returnTo}),cache:'no-store',signal:AbortSignal.timeout(65000)});
   const result=await response.json() as {ok?:boolean;returnTo?:string;error?:string};
   if(!response.ok||!result.ok)throw new Error(result.error||'Sign-in could not finish. Please try again.');
   form.reset();
   if(mode==='link'){onLinked?.();return;}
   window.location.assign(result.returnTo?.startsWith('/')&&!result.returnTo.startsWith('//')?result.returnTo:'/');
  }catch(error){setError(error instanceof Error&&error.name!=='TimeoutError'?error.message:'Sign-in is taking longer than expected. Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}
  finally{lock.current=false;setPending(false);}
 }
 return <form className="email-auth-form" onSubmit={submit} aria-label={mode==='signup'?'Create your account':mode==='link'?'Add a password':'Sign in with email'}>
  {creating&&<label htmlFor="auth-name">Full name<input id="auth-name" name="fullName" autoComplete="name" required maxLength={100} placeholder="Your full name" disabled={pending}/></label>}
  <label htmlFor="auth-email">Email address<input id="auth-email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" defaultValue={accountEmail} readOnly={!!accountEmail} disabled={pending}/></label>
  <label htmlFor="auth-password">{mode==='link'?'New password':'Password'}<span className="auth-password-field"><input id="auth-password" name="password" type={visible?'text':'password'} autoComplete={creating?'new-password':'current-password'} required minLength={creating?12:1} maxLength={128} placeholder={creating?'At least 12 characters':'Enter your password'} disabled={pending} aria-describedby={creating?'password-help':undefined}/><button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} aria-controls="auth-password" onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></span></label>
  {creating&&<><small id="password-help" className="auth-password-help">Use at least 12 characters. A phrase works well.</small><label htmlFor="auth-confirm">Confirm password<span className="auth-password-field"><input id="auth-confirm" name="confirmation" type={confirmVisible?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={128} placeholder="Enter your password again" disabled={pending}/><button type="button" aria-label={confirmVisible?'Hide confirmation password':'Show confirmation password'} aria-pressed={confirmVisible} aria-controls="auth-confirm" onClick={()=>setConfirmVisible(v=>!v)}>{confirmVisible?<EyeOff size={19}/>:<Eye size={19}/>}</button></span></label></>}
  {error&&<p ref={errorRef} tabIndex={-1} className="login-notice" role="alert">{error}</p>}
  <button className="button primary auth-submit" type="submit" disabled={!enabled||pending}>{pending?<><Loader2 size={17} className="spin"/>{mode==='signup'?'Creating account…':'Signing in…'}</>:<>{mode==='signup'?'Create account':mode==='link'?'Enable email sign-in':'Sign in'}<ArrowRight size={17}/></>}</button>
 </form>;
}
