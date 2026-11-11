'use client';
import {useEffect,useState} from 'react';
import EmailForm from './email-form';
type Options={emailReady?:boolean;googleReady:boolean;googleOnly:boolean;googleExternal:boolean;googleOrigin:string;serviceUnavailable?:boolean};
export default function SignInMethods({initial,returnTo}:{initial:Options;returnTo:string}){
 const [options,setOptions]=useState(initial),[attempt,setAttempt]=useState(0),[checking,setChecking]=useState(!!initial.serviceUnavailable),[mode,setMode]=useState<'login'|'signup'>('login');
 useEffect(()=>{
  if(!initial.serviceUnavailable&&attempt===0)return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65000);let active=true;
  setChecking(true);
  fetch('/api/auth/options',{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('Unavailable');
   const data=await response.json() as Partial<Options>|null;if(typeof data?.googleReady!=='boolean')throw new Error('Invalid response');
   if(active)setOptions({...initial,emailReady:data.emailReady===true,googleReady:data.googleReady,googleOnly:false,serviceUnavailable:false});
  }).catch(()=>{if(active)setOptions({...initial,serviceUnavailable:true});}).finally(()=>{clearTimeout(timer);if(active)setChecking(false);});
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[attempt,initial]);
 return <div className="auth-methods">
  {(options.googleReady||options.googleExternal)&&<><a className="google-signin" href={options.googleOrigin+'/auth/google?return_to='+encodeURIComponent(returnTo)} target="_top"><span aria-hidden="true" className="google-mark">G</span>Continue with Google</a><div className="login-divider"><span>or</span></div></>}
  <h2>{mode==='login'?'Welcome back.':'Let’s get you started.'}</h2>
  <EmailForm key={mode} mode={mode} returnTo={returnTo} enabled={!!options.emailReady&&!checking}/>
  {!options.emailReady&&<p className="login-pending" role="status" aria-live="polite">{checking?'Connecting to sign-in…':options.serviceUnavailable?'Sign-in is temporarily unavailable. Please retry.':options.googleReady||options.googleExternal?'Email sign-in is being connected. You can continue with Google.':'Sign-in is temporarily unavailable. Please try again shortly.'}</p>}
  {options.serviceUnavailable&&!checking&&<button className="text-button" onClick={()=>setAttempt(value=>value+1)}>Retry connection</button>}
  <p className="auth-switch">{mode==='login'?'Don’t have an account?':'Already have an account?'} <button type="button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create an account':'Sign in'}</button></p>
 </div>;
}
