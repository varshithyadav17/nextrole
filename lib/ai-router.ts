import {z} from 'zod';
import {boundedJSON} from './http-json';
import {db,one} from './store';
import {connectionState,digest,getAIOverview,openKey,storedSlots,type StoredSlot} from './keyring';
export type PDFInput={name:string;data:string;sha256:string};
export type ChatTurn={role:'user'|'assistant';text:string};
export type Attempt={slot:number;provider:string;status:string};
type Routed<T>={ok:true;data:T;provider:string;model:string;slot:number;cached:boolean;attempts:Attempt[]}|{ok:false;message:string;attempts:Attempt[]};
async function reserve(key:string,limit:number){if(limit<=0)return false;const r=await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1 WHERE CAST(meta.value AS INTEGER)<?').bind(key,'1',limit).run();return !!r.meta.changes;}
async function requestSlot(slot:StoredSlot,key:string,instructions:string,payload:unknown,schema:unknown,pdf?:PDFInput,chat?:ChatTurn[]){
 const openai=slot.provider==='openai',gemini=slot.provider==='gemini';
 const endpoint=openai?'https://api.openai.com/v1/responses':gemini?'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(slot.model)+':generateContent':'https://api.groq.com/openai/v1/chat/completions';
 const format={type:'json_schema',name:'nextrole_result',strict:true,schema};
 const base={role:'user' as const,content:JSON.stringify(payload)};
 const history=chat?.map(turn=>({role:turn.role,content:turn.text}))||[];
 const geminiTurns:{role:'user'|'model';parts:{text:string}[]}[]=[{role:'user',parts:[{text:base.content}]}];
 for(const turn of history){const role=turn.role==='assistant'?'model':'user',last=geminiTurns.at(-1)!;if(last.role===role)last.parts.push({text:turn.content});else geminiTurns.push({role,parts:[{text:turn.content}]});}
 const body=openai?{model:slot.model,store:false,...(slot.model.startsWith('gpt-5')?{reasoning:{effort:'minimal'}}:{}),max_output_tokens:pdf?6200:2200,input:[{role:'system',content:instructions},{role:'user',content:pdf?[{type:'input_text',text:JSON.stringify(payload)},{type:'input_file',filename:pdf.name,file_data:'data:application/pdf;base64,'+pdf.data}]:JSON.stringify(payload)},...history],text:{format}}:gemini?{systemInstruction:{parts:[{text:instructions}]},contents:chat?geminiTurns:[{role:'user',parts:[{text:JSON.stringify(payload)},...(pdf?[{inlineData:{mimeType:'application/pdf',data:pdf.data}}]:[])]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:pdf?6200:2200,thinkingConfig:slot.model.startsWith('gemini-3.')?{thinkingLevel:slot.model.includes('flash-lite')?'minimal':'low'}:{thinkingBudget:0}}}:{model:slot.model,messages:[{role:'system',content:instructions},base,...history],max_completion_tokens:2200,response_format:{type:'json_schema',json_schema:{name:'nextrole_result',strict:true,schema}}};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(gemini?{'x-goog-api-key':key}:{Authorization:'Bearer '+key})},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(pdf?30000:15000)});
 const result=await boundedJSON(response,128*1024).catch(()=>null) as any;
 if(!response.ok){
  const code=String(result?.error?.code||result?.error?.status||'');
  const quota=['credit_balance_exhausted','insufficient_quota','billing_hard_limit_reached'].includes(code);
  const rate=response.status===429;const unavailable=response.status>=500;
  const state=quota?'quota_exhausted':rate?'rate_limited':unavailable?'unavailable':response.status===401?'invalid_key':'needs_attention';
  const seconds=Number(response.headers.get('retry-after'));const delay=quota?86400000:rate?Math.min(3600000,Math.max(60000,Number.isFinite(seconds)?seconds*1000:60000)):unavailable?60000:null;
  return {ok:false as const,state,retryable:quota||rate||unavailable,message:quota?'Provider credits or quota are exhausted. Check the provider dashboard.':rate?'Provider rate limit reached. This slot is cooling down.':unavailable?'The provider is temporarily unavailable.':response.status===401?'The provider rejected this key. Replace it in AI Connections.':'The provider could not use this model or request. Check this connection.',cooldown:delay?new Date(Date.now()+delay).toISOString():null};
 }
 if(openai&&(result?.output||[]).flatMap((o:any)=>o.content||[]).some((c:any)=>c.type==='refusal')||!openai&&!gemini&&result?.choices?.[0]?.message?.refusal||gemini&&result?.promptFeedback?.blockReason)return {ok:false as const,state:'declined',retryable:false,message:'The provider declined this request. Use the employer details and profile matching.',cooldown:null};
 const text=openai?(result?.output||[]).flatMap((o:any)=>o.content||[]).find((c:any)=>c.type==='output_text')?.text:gemini?result?.candidates?.[0]?.content?.parts?.filter((p:any)=>!p.thought).map((p:any)=>p.text||'').join(''):result?.choices?.[0]?.message?.content;
 return {ok:true as const,text};
}
export async function routeAI<T>(userId:string,task:string,instructions:string,payload:unknown,jsonSchema:unknown,validator:z.ZodType<T>,normalize?:(data:T)=>T,pdf?:PDFInput,conversation?:ChatTurn[]):Promise<Routed<T>>{
 const chat=conversation===undefined?undefined:z.array(z.object({role:z.enum(['user','assistant']),text:z.string().min(1).max(6000)})).min(1).max(24).parse(conversation);
 if(pdf&&chat)throw new Error('Choose either PDF reading or conversation.');
 const attempts:Attempt[]=[];const overview=await getAIOverview(userId);
 const all=(await storedSlots(userId)).filter(s=>s.enabled);const candidates=overview.autoFallback?all:all.slice(0,1),slots=pdf?candidates.filter(s=>s.provider==='openai'||s.provider==='gemini'):candidates;
 if(pdf&&(!/^[a-f0-9]{64}$/.test(pdf.sha256)||pdf.data.length>5600000||!pdf.data))throw new Error('Invalid private PDF input.');
 if(pdf&&!slots.length)return {ok:false,message:'Original-PDF reading needs an enabled OpenAI or Gemini connection. Make one your first enabled slot or enable fallback in AI Connections.',attempts};
 if(!overview.storageReady||!slots.length)return {ok:false,message:'Add your own API connection in Preferences → AI Connections, or continue with profile matching.',attempts};
 const entries=await Promise.all(slots.map(async slot=>({slot,id:userId+':byok:'+await digest(JSON.stringify({v:1,task,provider:slot.provider,model:slot.model,fingerprint:slot.fingerprint,payload,...(pdf?{pdf:pdf.sha256}:{}),...(chat?{conversation:chat}:{})}))})));
 for(const {slot,id} of entries){const cached=await one<{data:string}>('SELECT data FROM analyses WHERE id=? AND created_at>=?',id,new Date(Date.now()-7*86400000).toISOString());if(cached){try{const parsed=validator.parse(JSON.parse(cached.data));return {ok:true,data:normalize?normalize(parsed):parsed,provider:slot.provider,model:slot.model,slot:slot.slot,cached:true,attempts};}catch{}}if(!['invalid_key','needs_attention'].includes(slot.status)&&(!slot.cooldown_until||Date.parse(slot.cooldown_until)<=Date.now()))break;}
 const eligible=entries.filter(({slot})=>!['invalid_key','needs_attention'].includes(slot.status)&&(!slot.cooldown_until||Date.parse(slot.cooldown_until)<=Date.now()));
 if(!eligible.length)return {ok:false,message:'Your enabled connections need attention or have reached their provider limits. Replace or update them in AI Connections. Profile matching still works.',attempts:slots.map(s=>({slot:s.slot,provider:s.provider,status:s.status}))};
 const lease=crypto.randomUUID();const now=Date.now();
 const lock=await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(substr(meta.value,1,13) AS INTEGER)<?').bind('byok_lock:'+userId,now+':'+lease,now-90000).run();
 if(!lock.meta.changes)return {ok:false,message:'Your previous AI check is still running. Please wait; your job feed remains available.',attempts};
 try{
  // A workspace may have been cleared after the initial key snapshot but before this lease.
  const current=await storedSlots(userId);
  if(!eligible.some(({slot})=>current.some(s=>s.slot===slot.slot&&s.enabled&&s.fingerprint===slot.fingerprint)))return {ok:false,message:'Your AI connections changed. Please try again with your current settings.',attempts};
  const day=new Date().toISOString().slice(0,10);const minute=new Date().toISOString().slice(0,16);
  if(!await reserve('byok_minute:'+minute+':'+userId,6))return {ok:false,message:'Please wait a minute before another AI request. Cached results and ordinary browsing remain available.',attempts};
  if(!await reserve('byok_count:'+day+':'+userId,overview.dailyLimit))return {ok:false,message:'You reached your chosen daily AI-check limit. You can adjust it in AI Connections. Provider quotas still apply.',attempts};
  for(const {slot,id} of eligible){
   const active=await one<{fingerprint:string;enabled:number}>('SELECT fingerprint,enabled FROM api_slots WHERE user_id=? AND slot=?',userId,slot.slot);
   if(!active?.enabled||active.fingerprint!==slot.fingerprint)continue;
   if(attempts.length){const cached=await one<{data:string}>('SELECT data FROM analyses WHERE id=? AND created_at>=?',id,new Date(Date.now()-7*86400000).toISOString());if(cached){try{const parsed=validator.parse(JSON.parse(cached.data));return {ok:true,data:normalize?normalize(parsed):parsed,provider:slot.provider,model:slot.model,slot:slot.slot,cached:true,attempts};}catch{}}}
   let result:Awaited<ReturnType<typeof requestSlot>>;
   try{const key=await openKey(userId,slot.slot,slot.ciphertext);result=await requestSlot(slot,key,instructions,payload,jsonSchema,pdf,chat);}catch{result={ok:false,state:'unavailable',retryable:true,message:'This connection could not complete the request. Try again later or reconnect it.',cooldown:new Date(Date.now()+60000).toISOString()};}
   if(!result.ok){attempts.push({slot:slot.slot,provider:slot.provider,status:result.state});await connectionState(userId,slot.slot,result.state,result.message,result.cooldown,slot.fingerprint,slot.model);if(!result.retryable)return {ok:false,message:result.message,attempts};continue;}
   let parsed:T;try{parsed=validator.parse(JSON.parse(result.text||''));if(normalize)parsed=normalize(parsed);}catch{attempts.push({slot:slot.slot,provider:slot.provider,status:'invalid_response'});await connectionState(userId,slot.slot,'needs_attention','The model returned an unusable response. Check the selected model.',null,slot.fingerprint,slot.model);return {ok:false,message:'The AI response could not be verified. Your job feed and tracking remain available.',attempts};}
   await connectionState(userId,slot.slot,'ready','Last AI request succeeded.',null,slot.fingerprint,slot.model);
   await db().prepare('INSERT OR REPLACE INTO analyses(id,user_id,job_key,data,created_at) VALUES(?,?,?,?,?)').bind(id,userId,task,JSON.stringify(parsed),new Date().toISOString()).run();
   await db().prepare('DELETE FROM analyses WHERE user_id=? AND id NOT IN (SELECT id FROM analyses WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 200)').bind(userId,userId).run();
   await db().prepare("DELETE FROM meta WHERE (key LIKE 'byok_count:%' AND substr(key,12,10)<?) OR (key LIKE 'byok_minute:%' AND substr(key,13,10)<?)").bind(new Date(Date.now()-7*86400000).toISOString().slice(0,10),new Date(Date.now()-86400000).toISOString().slice(0,10)).run();
   return {ok:true,data:parsed,provider:slot.provider,model:slot.model,slot:slot.slot,cached:false,attempts};
  }
  return {ok:false,message:'All enabled AI connections are unavailable or have reached their limits. Update them in AI Connections; profile matching and tracking still work.',attempts};
 }finally{await db().prepare('DELETE FROM meta WHERE key=? AND value=?').bind('byok_lock:'+userId,now+':'+lease).run();}
}
