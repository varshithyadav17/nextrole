import channel from './companion-channel.json' with {type:'json'};
const id=String(channel.chromeExtensionId||'');
export const companionExtensionId=/^[a-p]{32}$/.test(id)?id:null;
export const chromeStoreUrl=channel.chromeStoreApproved&&companionExtensionId?'https://chromewebstore.google.com/detail/'+companionExtensionId:null;
export function trustedCompanionConnection(id:unknown,state:unknown){
 return !!companionExtensionId&&id===companionExtensionId&&typeof state==='string'&&/^[a-f0-9]{64}$/.test(state);
}
