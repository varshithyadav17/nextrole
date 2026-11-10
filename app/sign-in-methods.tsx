"use client";
import {useEffect,useState} from 'react';
import EmailForm from './login/email-form';
import './login/login.css';
type Methods={emailReady?:boolean;passwordLinked?:boolean;googleReady:boolean;googleExternal:boolean;linked?:boolean;manageHref?:string|null};
export default function SignInMethods({email}:{email:string}){
 const [methods,setMethods]=useState<Methods|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/auth/options',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error();const value=await r.json() as Methods;if(active)setMethods(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 return <div className="signin-methods"><h4>Google sign-in</h4>{error?<p>Sign-in methods couldn’t load. Refresh to try again.</p>:!methods?<p role="status">Checking sign-in methods…</p>:methods.linked?<p><span className="status-dot live"/>Google is connected to this workspace.</p>:methods.googleReady?<><p>Use Google to return to this same workspace.</p><form method="post" action="/auth/google/link" target="_top"><button className="google-signin" type="submit"><span aria-hidden="true" className="google-mark">G</span>Connect Google</button></form></>:methods.googleExternal&&methods.manageHref?<a className="button secondary" href={methods.manageHref} target="_top">Manage sign-in on NextRole</a>:<p>Google sign-in is being connected.</p>}<section className="account-password"><h4>Email and password</h4>{methods?.passwordLinked?<p role="status">Email sign-in is enabled for this workspace.</p>:methods?.emailReady?<><p>Add a password to sign in to this same workspace with your email address.</p><EmailForm mode="link" accountEmail={email} returnTo="/account" enabled onLinked={()=>setMethods(current=>current?{...current,passwordLinked:true}:current)}/></>:<p>Email sign-in is being connected.</p>}</section></div>;
}
