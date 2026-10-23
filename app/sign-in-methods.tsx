"use client";
import {useEffect,useState} from 'react';
type Methods={googleReady:boolean;googleExternal:boolean;linked?:boolean;manageHref?:string|null};
export default function SignInMethods(){
 const [methods,setMethods]=useState<Methods|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/auth/options',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error();const value=await r.json() as Methods;if(active)setMethods(value);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 return <div className="signin-methods"><h4>Google sign-in</h4>{error?<p>Sign-in methods couldn’t load. Refresh to try again.</p>:!methods?<p role="status">Checking sign-in methods…</p>:methods.linked?<p><span className="status-dot live"/>Google is connected to this workspace.</p>:methods.googleReady?<><p>Use Google to return to this same workspace.</p><form method="post" action="/auth/google/link" target="_top"><button className="google-signin" type="submit"><span aria-hidden="true" className="google-mark">G</span>Connect Google</button></form></>:methods.googleExternal&&methods.manageHref?<a className="button secondary" href={methods.manageHref} target="_top">Manage sign-in on NextRole</a>:<p>Google sign-in is being connected.</p>}</div>;
}
