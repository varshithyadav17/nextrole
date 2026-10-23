// Keep sidePanel.open in the original click gesture. Fallback needs no page access.
export function openScoutPanel(api,windowId,onOpen){
 const fallback=()=>api.tabs.create({url:api.runtime.getURL('panel.html')}).then(onOpen);
 if(!api.sidePanel?.open)return fallback();
 try{return Promise.resolve(api.sidePanel.open({windowId})).then(onOpen,fallback);}catch{return fallback();}
}
