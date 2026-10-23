import {getChatGPTUser,requireChatGPTUser} from '../../chatgpt-auth';
import Dashboard from '../../dashboard';
export const dynamic='force-dynamic';
export default async function JobPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {id}=await params,query=await searchParams,p=new URLSearchParams();
 for(const [key,value]of Object.entries(query)){if(Array.isArray(value))for(const item of value)p.append(key,item);else if(value!==undefined)p.set(key,value);}
 const returnTo='/jobs/'+encodeURIComponent(id)+(p.size?'?'+p.toString():''),user=await getChatGPTUser()||await requireChatGPTUser(returnTo);
 return <Dashboard user={{userId:user.userId,displayName:user.displayName,email:user.email}} initialJobId={id.slice(0,200)}/>;
}
