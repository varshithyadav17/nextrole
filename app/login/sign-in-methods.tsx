'use client';
import {useEffect,useState} from 'react';

type Options={googleReady:boolean;googleOnly:boolean;googleExternal:boolean;googleOrigin:string;serviceUnavailable?:boolean};
export default function SignInMethods({initial,returnTo}:{initial:Options;returnTo:string}){
 const [options,setOptions]=useState(initial),[attempt,setAttempt]=useState(0),[checking,setChecking]=useState(!!initial.serviceUnavailable);
 useEffect(()=>{
  if(!initial.serviceUnavailable&&attempt===0)return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),65000);let active=true;
  setChecking(true);
  fetch('/api/auth/options',{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('Unavailable');
   const data=await response.json() as Partial<Pick<Options,'googleReady'|'googleOnly'>>|null;if(typeof data?.googleReady!=='boolean'||typeof data?.googleOnly!=='boolean')throw new Error('Invalid response');
   if(active)setOptions({...initial,googleReady:data.googleReady,googleOnly:data.googleOnly,serviceUnavailable:false});
  }).catch(()=>{if(active)setOptions({...initial,serviceUnavailable:true});}).finally(()=>{clearTimeout(timer);if(active)setChecking(false);});
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[attempt,initial]);
 return <>
  {options.googleReady||options.googleExternal?<a className="google-signin" href={options.googleOrigin+'/auth/google?return_to='+encodeURIComponent(returnTo)} target="_top"><span aria-hidden="true" className="google-mark">G</span>Continue with Google</a>:<><button className="google-signin" disabled><span aria-hidden="true" className="google-mark">G</span>Continue with Google</button><small className="login-pending" role="status" aria-live="polite">{checking?'Connecting to sign-in…':options.serviceUnavailable?'Sign-in is temporarily unavailable. Please try again.':'Google sign-in is being connected.'}</small>{options.serviceUnavailable&&!checking&&<button className="text-button" onClick={()=>setAttempt(value=>value+1)}>Retry sign-in</button>}</>}
  {!options.googleOnly&&<><div className="login-divider"><span>or</span></div><a className="button primary login-chatgpt" href={'/signin-with-chatgpt?return_to='+encodeURIComponent(returnTo)} target="_top">Continue with ChatGPT</a><p className="login-existing">Already use NextRole? Use your existing sign-in, then connect Google in Preferences.</p></>}
 </>;
}
