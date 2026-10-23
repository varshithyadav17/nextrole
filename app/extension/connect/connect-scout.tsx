"use client";
import {useState} from 'react';
import {ScoutMark} from '../../scout';
type ExtensionRuntime={sendMessage:(id:string,message:unknown)=>Promise<{ok?:boolean;error?:string}>};
export default function ConnectScout({extensionId,state,signedIn,name}:{extensionId:string;state:string;signedIn:boolean;name:string}){
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[complete,setComplete]=useState(false),[error,setError]=useState('');
 const path='/extension/connect?'+new URLSearchParams({extension_id:extensionId,state});
 async function connect(){
  if(!consent||busy||!extensionId)return;setBusy(true);setError('');let token='';
  try{
   const runtime=(window as unknown as {chrome?:{runtime?:ExtensionRuntime}}).chrome?.runtime;if(!runtime)throw new Error('Open this page in the browser where you installed Scout, using its Connect NextRole button.');
   const ready=await runtime.sendMessage(extensionId,{kind:'nextrole-ready',state});if(!ready?.ok)throw new Error(ready?.error||'Scout could not confirm this connection. Start again from its Connection tab.');
   const response=await fetch('/api/automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'pair',consent:'COMPANION_DISCOVERY'})});
   const result=await response.json() as {token?:string;error?:string};if(!response.ok||!result.token)throw new Error(result.error||'The connection could not be created. Sign in again and retry.');token=result.token;
   const delivered=await runtime.sendMessage(extensionId,{kind:'nextrole-connect',state,token});if(!delivered?.ok)throw new Error(delivered?.error||'Connection was not confirmed. Open Scout and check Connection before starting again.');
   setComplete(true);
  }catch(e){setError(e instanceof Error?e.message:'Connection was not confirmed. Open Scout and check Connection before starting again.');}
  finally{token='';setBusy(false);}
 }
 return <main className="privacy-page"><a href="/" className="extension-brand"><ScoutMark/>nextrole.</a><span className="eyebrow">SCOUT COMPANION</span><h1>{complete?'Scout is connected.':'Your next role, within reach.'}</h1>
 {!extensionId?<><p>This installation is not a registered Scout store release yet. Normal browser connection becomes available after the publisher registers the official extension ID.</p><a className="button primary" href="/extension">View extension availability</a></>:complete?<><p>Return to Scout’s Connection tab, turn on background job checks and choose whether you want desktop alerts. Your application queue stays paused.</p><a href="/?tab=discover" className="button primary">Open my job inbox</a></>:!signedIn?<><p>Sign in to connect your own NextRole job inbox to Scout in this browser.</p><a className="button primary" target="_top" href={'/signin-with-chatgpt?return_to='+encodeURIComponent(path)}>Sign in to NextRole</a></>:<><p>Connect as <strong>{name}</strong>. Scout will receive recent matching-job summaries, allow reviewed job saving and confirmed tracking changes, and access application packets you deliberately queue.</p><p>Connecting replaces your previous browser token and expires after 30 days. You can revoke access in Preferences. Background checks, desktop alerts and application assistance have separate controls.</p><label className="check-row"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/>I want to connect this Scout installation to my NextRole account with matched-job inbox and workspace access.</label><button className="button primary" disabled={!consent||busy} onClick={()=>void connect()}>{busy?'Connecting…':'Connect Scout'}</button><a className="text-button" href="/">Cancel</a></>}{error&&<p className="form-error" role="alert">{error}</p>}
 </main>;
}
