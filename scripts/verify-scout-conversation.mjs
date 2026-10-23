import {readFileSync} from 'node:fs';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

export async function verifyScoutConversation({database,put,check,defaultProfile}){
 const {scoutAction,scoutState}=await import('../lib/scout-chat.ts');
 const {scoutConversation,pastedScoutJD,SCOUT_MESSAGE_LIMIT,SCOUT_HISTORY_CHARACTERS}=await import('../lib/scout-conversation.ts');
 const {routeAI}=await import('../lib/ai-router.ts'),{saveConnection}=await import('../lib/keyring.ts'),{PROVIDERS}=await import('../lib/providers.ts'),{z}=await import('zod');
 const oldFetch=globalThis.fetch,user='scout-conversation-owner',other='scout-conversation-other';
 globalThis.__nextroleTestEnv.KEYRING_ENCRYPTION_KEY||='ab'.repeat(32);
 const history=Array.from({length:30},(_,i)=>({role:i%2?'assistant':'user',text:'Turn '+i+' '+('a'.repeat(1700))}));
 history.push({role:'user',text:'Explain that, contact me at person@example.test or +91 9999912345.',attachment:{name:'my-resume.pdf'}});
 const replay=scoutConversation(history),serialized=JSON.stringify(replay);
 check(replay.length<=24&&replay.reduce((n,t)=>n+t.text.length,0)<=SCOUT_HISTORY_CHARACTERS&&replay.at(-1).text.includes('Explain that'),'Conversation replay bounds cost while retaining the latest follow-up.');
 check(replay[0].role==='user'&&!serialized.includes('person@example.test')&&!serialized.includes('9999912345')&&serialized.includes('my-resume.pdf'),'Conversation history redacts contacts and retains attachment context without file bytes.');
 check(!JSON.stringify(scoutConversation([{role:'user',text:'sk-proj-'+ 'q'.repeat(35)}])).includes('q'.repeat(35)),'Credential patterns in historic text are redacted before replay.');
 check(pastedScoutJD('What is a JD?')===null&&pastedScoutJD('JD: too short')===null,'Explanations and short chat text are never mistaken for a pasted JD.');
 const filename=fileURLToPath(new URL('../app/scout-reply.tsx',import.meta.url)),module=new Module(filename);
 module.paths=Module._nodeModulePaths(fileURLToPath(new URL('..',import.meta.url)));
 module._compile(ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,filename);
 const markup=renderToStaticMarkup(createElement(module.exports.default,{text:'Here is **your next step**.\n\n- Keep your evidence.\n- Review the JD.\n\n3. First\n4. Second\n\n```html\n<script>alert(1)</script>\n```\n\n<img src=x onerror=alert(2)>'}));
 check(markup.includes('<strong>your next step</strong>')&&markup.includes('<ul>')&&markup.includes('<ol start="3">')&&markup.includes('<pre>'),'Assistant paragraphs, emphasis, lists and code render as readable chat content.');
 check(!markup.includes('<script>')&&!markup.includes('<img')&&markup.includes('&lt;script&gt;'),'Model output cannot execute HTML or load a remote image in a chat bubble.');
 check(renderToStaticMarkup(createElement(module.exports.default,{text:'- \n1. \n**Unfinished'})).includes('Unfinished'),'Incomplete Markdown remains readable instead of blocking the conversation.');
 let calls=[],reply='Let’s choose one project to explain clearly.',revision=null;
 globalThis.fetch=async(input,init)=>{
  const host=new URL(String(input)).hostname,body=JSON.parse(init.body);calls.push({host,body});
  const text=JSON.stringify({reply,edits:[]});
  if(host==='api.openai.com')return Response.json({output:[{content:[{type:'output_text',text}]}]});
  if(host==='generativelanguage.googleapis.com')return Response.json({candidates:[{content:{parts:[{text}]}}]});
  if(host==='api.groq.com')return Response.json({choices:[{message:{content:text}}]});
  throw new Error('Unexpected network access in synthetic conversational checks.');
 };
 const chat=async(message,extra={})=>{const out=await scoutAction(user,{action:'message',jobId:null,expectedRevision:revision,message,...extra});revision=out.thread.revision;return out;};
 const clearMinute=()=>database.prepare("DELETE FROM meta WHERE key LIKE 'byok_minute:%' AND key LIKE ?").bind('%:'+user).run();
 const connect=provider=>saveConnection(user,{slot:1,provider,model:PROVIDERS[provider].defaultModel,label:'Synthetic conversation',key:(provider==='openai'?'sk-':provider==='gemini'?'AIza':'gsk_')+'test_conversation_'+provider+'_0123456789abcdef'});
 try{
  for(const who of [user,other])await put({action:'profile',profile:{...defaultProfile,name:'Synthetic student',completed:true}},who);
  await connect('openai');
  let out=await chat('Hello, help me plan my next step.',{aiConsent:false});
  check(calls.length===0&&out.thread.messages.at(-1).mode==='guided','Saving an API connection never silently enables AI chat.');
  const jd='Entry-level data analyst. Use SQL and Python to build dashboards. No prior experience required. Work with the analytics team on reports.';
  out=await chat('Here is the JD: '+jd);
  check(out.thread.customJD===jd&&out.thread.kitId===null&&calls.length===0,'A JD pasted conversationally is saved privately and acknowledged without an AI call.');
  check(!(await database.prepare('SELECT id FROM jobs WHERE instr(data,?)>0').bind(jd).first()),'A conversational JD never becomes a public or verified job listing.');
  const first='My project is a student opportunity tracker. Help me describe its purpose.';
  out=await chat(first,{aiConsent:true});
  check(out.thread.messages.at(-1).mode==='ai'&&calls.length===1,'Consented conversational replies use only the applicant’s configured provider.');
  for(const prompt of ['Explain that.','Keep the tone friendly.','Focus on the student problem.','Make it shorter.']){
   reply='A clearer version for this project: '+prompt;
   out=await chat(prompt,{aiConsent:true});
  }
  const sent=calls.at(-1).body.input;
  check(sent.at(-1).role==='user'&&sent.at(-1).content==='Make it shorter.'&&sent.some(t=>t.role==='assistant'&&t.content.includes('Let’s choose'))&&sent.some(t=>t.role==='user'&&t.content===first),'Follow-ups replay real user/assistant turns, including context older than six messages.');
  check(JSON.parse(sent[1].content).job.description===jd&&sent[0].content.includes('Answer the actual question'),'The current JD and conversational instructions accompany the same thread.');
  check((await scoutState(other,null)).thread.messages.length===0,'Conversation history and pasted job context remain isolated between students.');
  await clearMinute();
  const validator=z.object({reply:z.string(),edits:z.array(z.unknown())}),schema={type:'object',properties:{reply:{type:'string'},edits:{type:'array',items:{type:'string'}}},required:['reply','edits'],additionalProperties:false};
  const turns=[{role:'user',text:'Help me choose.'},{role:'assistant',text:'Start with your SQL project.'},{role:'user',text:'Explain that.'}];
  const routed=(history,task='scout-conversation-test')=>routeAI(user,task,'Continue the conversation.',{context:'synthetic'},schema,validator,undefined,undefined,history);
  let before=calls.length;check((await routed(turns)).ok&&(await routed(turns)).cached&&calls.length===before+1,'Identical conversation replay can reuse a private cached response.');
  check((await routed(turns.map(t=>t.role==='assistant'?{...t,text:'Start with your product project.'}:t))).ok&&calls.length===before+2,'Different preceding replies cannot reuse a stale answer to the same follow-up.');
  let invalid=false;try{await routed([{role:'system',text:'Untrusted role'}]);}catch{invalid=true;}check(invalid,'Conversation replay cannot introduce an extra system role.');
  await connect('gemini');check((await routed(turns,'scout-gemini-test')).ok,'Gemini supports the same conversational request.');
  const gemini=calls.at(-1).body.contents;
  check(gemini.map(t=>t.role).join(',')==='user,model,user'&&gemini[0].parts.some(p=>p.text==='Help me choose.')&&gemini.at(-1).parts[0].text==='Explain that.','Gemini receives correctly alternating user/model history and the latest follow-up.');
  await connect('groq');check((await routed(turns,'scout-groq-test')).ok,'Groq supports the same conversational request.');
  check(calls.at(-1).body.messages.map(t=>t.role).join(',')==='system,user,user,assistant,user','Groq receives context and ordered conversation roles.');
  await clearMinute();
  const long='Please consider this background: '+ 'a'.repeat(SCOUT_MESSAGE_LIMIT-33);
  out=await chat(long,{aiConsent:false});check(out.thread.messages.at(-2).text.length===long.length&&long.length>2000,'Longer natural questions are retained without the previous 2,000-character cutoff.');
  let tooLong=false;try{await chat('x'.repeat(SCOUT_MESSAGE_LIMIT+1));}catch{tooLong=true;}check(tooLong,'The server independently rejects messages beyond the composer’s limit.');
  const cleared=await scoutAction(user,{action:'clear',jobId:null,expectedRevision:revision});revision=cleared.thread.revision;
  await connect('openai');reply='Hello again.';out=await chat('Hello again.',{aiConsent:true});
  check(!JSON.stringify(calls.at(-1).body).includes(first)&&!out.thread.customJD,'Clearing chat removes the previous conversation and pasted JD from future AI context.');
  await database.prepare('DELETE FROM api_slots WHERE user_id=?').bind(user).run();before=calls.length;
  out=await chat('Can we talk?',{aiConsent:true});check(calls.length===before&&out.thread.messages.at(-1).mode==='guided'&&out.thread.messages.at(-1).text.includes('API connection'),'Missing API setup produces a clear guided fallback, never a fake AI reply.');
 }finally{
  globalThis.fetch=oldFetch;
  for(const who of [user,other])await put({action:'delete-account-data',confirmation:'DELETE'},who);
 }
}
