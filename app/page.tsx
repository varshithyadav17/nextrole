import {getChatGPTUser} from './chatgpt-auth';
import Dashboard from './dashboard';
import Landing from './landing';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();if(user?.setupPending)redirect('/signup/complete');return user?<Dashboard user={{userId:user.userId,displayName:user.displayName,email:user.email}}/>:<Landing/>;}
