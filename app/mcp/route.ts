import {env} from 'cloudflare:workers';
import {drainDigests,mailStatus} from '../../lib/digests';
import {ownerAccess} from '../../lib/admin';
import {db,one,rows} from '../../lib/store';
import {syncJobs,refreshSavedDetails} from '../../lib/sync';
import {requestJSON} from '../../lib/request-json';
import {processAlertBatch,drainPushBatch,deliveryStatus} from '../../lib/alerts';
import {pruneTransientData,productCleanupStatus} from '../../lib/rate-limit';
import {loadSources,sourceFingerprint} from '../../lib/source-registry';
import {discoveryMetrics} from '../../lib/discovery-metrics';
import {advanceDiscovery,discoveryStatus} from '../../lib/discovery-sync';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const tools=[
 {name:'nextrole_send_daily_digests',description:'Process up to five opted-in nightly job emails after 21:00 Asia/Kolkata, only when the host has explicitly activated its email service. Sends email through the configured provider. Owner only. No inbox reading, application submission or LLM calls.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true}},
 {name:'nextrole_refresh_status',description:'Read NextRole source refresh time, listing counts and source health. Owner only. Contains no student profiles, API keys or application history.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
 {name:'nextrole_refresh_sources',description:'Refresh NextRole public feeds and, only if the host has explicitly enabled it, request-capped SerpApi job discovery. Generate opted-in updates and preserve saved student decisions. Owner only. No LLM calls, student API keys, application submissions, sharing changes or redeployment.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true}}
];
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin&&origin!=='https://chatgpt.com')return Response.json({error:'Origin is not allowed.'},{status:403,headers});
 let body:any;try{body=await requestJSON(request,8192);}catch{return Response.json({error:'Invalid JSON.'},{status:400,headers});}
 if(!body||Array.isArray(body)||body.jsonrpc!=='2.0')return Response.json({error:'Invalid JSON-RPC request.'},{status:400,headers});
 const id=typeof body.id==='string'||typeof body.id==='number'?body.id:null;
 const result=(value:unknown)=>Response.json({jsonrpc:'2.0',id,result:value},{headers});
 if(body.method==='initialize')return result({protocolVersion:['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(body.params?.protocolVersion)?body.params.protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'NextRole',version:'1.0.0'}});
 if(body.method==='notifications/initialized'||body.method==='notifications/cancelled')return new Response(null,{status:202,headers});
 if(body.method==='ping')return result({});
 if(body.method==='tools/list')return result({tools});
 if(body.method!=='tools/call')return Response.json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found.'}},{headers});
 const access=await ownerAccess();
 if(!access.allowed)return Response.json({error:access.status===401?'Sign in to connect this tool.':'Only the NextRole owner can maintain sources.'},{status:access.status,headers});
 const name=body.params?.name;
 if(!tools.some(t=>t.name===name))return Response.json({jsonrpc:'2.0',id,error:{code:-32602,message:'Unknown tool.'}},{headers});
 const args=body.params?.arguments;
 if(args&&(typeof args!=='object'||Array.isArray(args)||Object.keys(args).length))return result({isError:true,content:[{type:'text',text:'This tool accepts no arguments.'}]});
 try{
  let value:unknown;
  if(name==='nextrole_send_daily_digests'){value=await drainDigests();}else if(name==='nextrole_refresh_sources'){
   const sources=await syncJobs();
   let cleanup=await productCleanupStatus();
   let details={checked:0,pending:false,failures:0},alerts={processed:0,notifications:0,pending:false,busy:false},push={processed:0,sent:0,pending:false,busy:false};
   if(sources.cached&&!sources.sourcesPending){details=await refreshSavedDetails();alerts=await processAlertBatch();push=await drainPushBatch();cleanup=await pruneTransientData();}
   const search=sources.sourcesPending?{pending:false,deferred:true}:await advanceDiscovery();
   const delivery=await deliveryStatus();
   value={...sources,search,details,alerts,push,delivery,cleanup,workPending:search.pending||cleanup.pending||!!sources.sourcesPending||details.pending||delivery.alertsPending||!!delivery.push?.due};
   await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('schedule',JSON.stringify({enabled:true,times:['09:00','14:00','19:00'],timezone:'Asia/Kolkata',transport:'owner-mcp'})).run();
  }else{
   const SOURCES=await loadSources(),SOURCE_REGISTRY=sourceFingerprint(SOURCES);
   const last=await one<{value:string}>('SELECT value FROM meta WHERE key=?','last_sync');
   const count=await one<{n:number}>("SELECT COUNT(*) as n FROM jobs WHERE active=1 AND COALESCE(json_extract(data,'$.availability'),'open')='open'");
   const sources=await rows<{id:string;success:number;count:number;checked_at:string}>('SELECT id,success,count,checked_at,error FROM source_runs');
   const progress=await one<{value:string}>('SELECT value FROM meta WHERE key=?','source_sweep');let sourceProgress=null;try{const state=progress?JSON.parse(progress.value):null;sourceProgress=state?{checked:state.cursor,total:SOURCES.length,complete:state.complete&&state.registry===SOURCE_REGISTRY,startedAt:state.startedAt}:null;}catch{}
   const privateFiles=await one<{files:number;bytes:number}>('SELECT COUNT(*) as files,COALESCE(SUM(bytes),0) as bytes FROM resume_files');const automation=await rows<{state:string;count:number}>('SELECT state,COUNT(*) as count FROM automation_queue GROUP BY state');
   value={ok:true,email:await mailStatus(),privateStorage:{ready:!!env.BUCKET,files:privateFiles?.files||0,bytes:privateFiles?.bytes||0},automation,lastSync:last?.value||null,activeListings:count?.n||0,discovery:await discoveryMetrics(),searchDiscovery:await discoveryStatus(true),sources,sourceProgress,delivery:await deliveryStatus(),cleanup:await productCleanupStatus()};
  }
  return result({content:[{type:'text',text:JSON.stringify(value)}]});
 }catch{return result({isError:true,content:[{type:'text',text:'The source update could not complete. Saved student data is preserved. Try again or inspect source health.'}]});}
}
