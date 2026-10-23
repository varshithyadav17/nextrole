import type {Metadata} from 'next';
import {getChatGPTUser} from '../../chatgpt-auth';
import {trustedCompanionConnection} from '../../../lib/companion-channel';
import ConnectScout from './connect-scout';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Connect Scout | NextRole',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function ConnectPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams,id=query.extension_id,state=query.state,user=await getChatGPTUser();
 const trusted=trustedCompanionConnection(id,state);
 return <ConnectScout extensionId={trusted?String(id):''} state={trusted?String(state):''} signedIn={!!user} name={user?.displayName||''}/>;
}
