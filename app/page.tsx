import {getChatGPTUser} from './chatgpt-auth';
import Dashboard from './dashboard';
import Landing from './landing';
import {getWorkspaceRole} from './auth-role';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();if(user&&await getWorkspaceRole(user)==='host')redirect('/admin');return user?<Dashboard user={{userId:user.userId,displayName:user.displayName,email:user.email}}/>:<Landing/>;}
