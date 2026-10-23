import {APP} from './workspace.mjs';
export function createConnection(browser,pair){
 let completing=false;
 async function begin(){
  const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  await browser.storage.session.set({pendingConnection:{state,expires:Date.now()+5*60000}});
  await browser.tabs.create({url:APP+'/extension/connect?'+new URLSearchParams({extension_id:browser.runtime.id,state})});
  return {ok:true};
 }
 async function finish(message,sender){
  let url;try{url=new URL(sender?.url);}catch{return {error:'Open the connection page from Scout.'};}
  if(url.origin!==APP||url.pathname!=='/extension/connect'||!['nextrole-connect','nextrole-ready'].includes(message?.kind)||completing)return {error:'This connection was not requested by Scout.'};
  completing=true;
  try{
   const {pendingConnection}=await browser.storage.session.get('pendingConnection');
   if(!pendingConnection||pendingConnection.expires<=Date.now()||message.state!==pendingConnection.state)return {error:'This connection expired. Start again from Scout.'};
   if(message.kind==='nextrole-ready')return {ok:true};
   await browser.storage.session.remove('pendingConnection');const result=await pair(message.token);return {ok:true,connection:result.connection};
  }
  catch(error){return {error:error.message||'The connection could not be verified. Start again from Scout.'};}
  finally{completing=false;}
 }
 return {begin,finish};
}
