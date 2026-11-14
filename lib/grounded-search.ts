import {boundedJSON} from './http-json';
import {isSafeJobUrl} from './matching';
import {canonicalJobUrl} from './job-feeds';
import type {StoredSlot} from './keyring';

export type WebCitation={url:string;title:string};
export type Grounding={citations:WebCitation[];searchSuggestions:string;retrievedAt:string};
const object=(v:unknown):Record<string,any>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
/** No arbitrary crawl: only resolve the search provider's own citation redirect. */
async function citationUrl(value:unknown):Promise<string|null>{
 if(typeof value!=='string'||value.length>2048||!isSafeJobUrl(value))return null;
 const url=new URL(value);if(url.port||!url.hostname.includes('.'))return null;
 if(url.hostname==='vertexaisearch.cloud.google.com'){
  if(!url.pathname.startsWith('/grounding-api-redirect/'))return null;
  try{const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(3000)});await response.body?.cancel();const target=response.headers.get('location');if(![301,302,303,307,308].includes(response.status)||!target||!isSafeJobUrl(target))return null;const next=new URL(target);if(next.port||!next.hostname.includes('.')||next.hostname==='vertexaisearch.cloud.google.com')return null;return canonicalJobUrl(next.toString());}catch{return null;}
 }
 return canonicalJobUrl(url.toString());
}
export async function providerGrounding(provider:string,result:unknown):Promise<Grounding|null>{
 const r=object(result),candidate=object(r.candidates?.[0]),metadata=object(candidate.groundingMetadata);
 const calls=Array.isArray(r.output)?r.output.filter((o:any)=>o.type==='web_search_call'&&o.status==='completed'):[];
 if(provider==='openai'&&!calls.length||provider==='gemini'&&(!Array.isArray(metadata.webSearchQueries)||!metadata.webSearchQueries.length))return null;
 const raw:unknown[]=provider==='openai'?[...calls.flatMap((o:any)=>o.action?.sources||[]),...(r.output||[]).flatMap((o:any)=>o.content||[]).flatMap((c:any)=>c.annotations||[]).filter((a:any)=>a.type==='url_citation')]:Array.isArray(metadata.groundingChunks)?metadata.groundingChunks.map((c:any)=>c.web):[];
 const citations:WebCitation[]=[];
 for(let i=0;i<Math.min(raw.length,24);i+=4)for(const item of await Promise.all(raw.slice(i,i+4).map(async v=>{const c=object(v),url=await citationUrl(c.url||c.uri);return url?{url,title:typeof c.title==='string'?c.title.slice(0,200):new URL(url).hostname}:null;})))if(item&&!citations.some(c=>c.url===item.url))citations.push(item);
 if(!citations.length)return null;
 const html=object(metadata.searchEntryPoint).renderedContent;
 return {citations,searchSuggestions:provider==='gemini'&&typeof html==='string'&&html.length<=20000?html:'',retrievedAt:new Date().toISOString()};
}
export async function requestGrounded(slot:StoredSlot,key:string,instructions:string,payload:unknown){
 const openai=slot.provider==='openai',endpoint=openai?'https://api.openai.com/v1/responses':'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(slot.model)+':generateContent';
 const prompt=instructions+' Return only a JSON object with summary and jobs. Each job has title, company, location, description, url. Return at most 8 concrete vacancy pages that you actually found with the search tool. Do not return career homepages or search-result pages. No Markdown fences.';
 const body=openai?{model:slot.model,store:false,reasoning:{effort:'low'},max_output_tokens:3600,max_tool_calls:2,tools:[{type:'web_search',search_context_size:'low'}],tool_choice:'required',include:['web_search_call.action.sources'],input:[{role:'system',content:prompt},{role:'user',content:JSON.stringify(payload)}]}:{systemInstruction:{parts:[{text:prompt}]},tools:[{googleSearch:{}}],contents:[{role:'user',parts:[{text:JSON.stringify(payload)}]}],generationConfig:{maxOutputTokens:3600}};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(openai?{Authorization:'Bearer '+key}:{'x-goog-api-key':key})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(35000)});
 const result=await boundedJSON(response,512*1024);
 if(!response.ok){const code=String(result?.error?.code||result?.error?.status||''),quota=['insufficient_quota','billing_hard_limit_reached','RESOURCE_EXHAUSTED'].includes(code),rate=response.status===429;
  return {ok:false as const,state:quota?'quota_exhausted':rate?'rate_limited':response.status===401?'invalid_key':'unavailable',retryable:quota||rate,message:quota||rate?'Your search provider reached its quota or rate limit. Cached jobs remain available.':'This connection could not run web search. Check that its model supports search tools.',cooldown:new Date(Date.now()+(quota?86400000:60000)).toISOString()};}
 const grounding=await providerGrounding(slot.provider,result);
 if(!grounding)return {ok:false as const,state:'unavailable',retryable:false,message:'The provider returned no verifiable web-search sources. No generated listings were added.',cooldown:new Date(Date.now()+60000).toISOString()};
 const text=openai?(result.output||[]).flatMap((o:any)=>o.content||[]).filter((c:any)=>c.type==='output_text').map((c:any)=>c.text||'').join(''):(result.candidates?.[0]?.content?.parts||[]).filter((p:any)=>!p.thought).map((p:any)=>p.text||'').join('');
 return {ok:true as const,text,grounding};
}
