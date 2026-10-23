import {openScoutPanel} from './panel-launcher.mjs';
const status=document.getElementById('status');
const {token,enabled}=await chrome.storage.local.get(['token','enabled']);
const currentWindow=await chrome.windows.getCurrent();
const [jobTab]=await chrome.tabs.query({active:true,currentWindow:true});
if(jobTab?.id&&jobTab.url?.startsWith('https:'))await chrome.storage.session.set({launchTab:{id:jobTab.id}});
else await chrome.storage.session.remove('launchTab');
status.textContent=token?'Paired in this browser · Queue '+(enabled?'enabled':'paused'):'Start with Connection in the Scout panel.';
document.getElementById('open-panel').onclick=()=>{
 // open() must run in the click gesture, before any asynchronous work.
 void openScoutPanel(chrome,currentWindow.id,()=>window.close()).catch(()=>{status.textContent='Scout could not open. Reload it from your browser’s Extensions page, or open the setup guide below.';});
};
