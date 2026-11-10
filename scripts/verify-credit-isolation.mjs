// Uses the isolated test database and synthetic keys; never contacts a real provider.
export async function verifyCreditIsolation({database,put,GET,check,job,raw,source,SOURCES,keys,goodFit,aiResponse}){
 const originalFetch=globalThis.fetch;
 const globals=['OPENAI_API_KEY','GEMINI_API_KEY','GROQ_API_KEY'];
 const previous=globals.map(name=>[name,globalThis.__nextroleTestEnv[name]]);
 for(const name of globals)globalThis.__nextroleTestEnv[name]='unused-global-credential';
 let sourceRequests=0;
 const providerRequests=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(String(input));
  if(['boards-api.greenhouse.io','api.lever.co','api.ashbyhq.com','jobicy.com'].includes(url.hostname)){
   sourceRequests++;
   const jobs=url.pathname.includes('/'+source.token+'/')?[raw]:[];
   return new Response(JSON.stringify(url.hostname==='api.lever.co'?[]:url.hostname==='jobicy.com'?{success:true,statusCode:200,jobCount:0,jobs:[],hasMore:false,nextCursor:null}:{jobs,meta:{total:jobs.length}}),{headers:{'Content-Type':'application/json'}});
  }
  if(!['api.openai.com','generativelanguage.googleapis.com','api.groq.com'].includes(url.hostname))throw new Error('Unexpected external destination in credit-isolation test.');
  const headers=new Headers(init.headers);
  providerRequests.push({authorization:headers.get('authorization'),googleKey:headers.get('x-goog-api-key')});
  return aiResponse(input,goodFit);
 };
 const workspace=async user=>{
  globalThis.__nextroleTestUser={userId:user,displayName:'Test student',email:user+'@example.test'};
  const response=await GET();
  check(response.ok,'An authenticated workspace must remain accessible without a provider key.');
  return response.json();
 };
 try{
  await database.prepare("DELETE FROM meta WHERE key LIKE 'jobicy_state:%'").run();
  await database.prepare('DELETE FROM meta WHERE key IN (?,?)').bind('source_sweep','last_sync_attempt').run();
  let refresh;
  for(let pass=0;pass<SOURCES.length*2;pass++){
   const response=await put({action:'refresh'},'credits-none');
   check(response.ok,'An account without AI keys can refresh employer sources.');
   refresh=await response.json();if(!refresh.sourcesPending)break;
  }
  check(!refresh.sourcesPending&&sourceRequests===SOURCES.length&&providerRequests.length===0,'A complete vacancy refresh must use documented job feeds only, with no AI provider calls.');
  const warmed=sourceRequests;
  const parallelRefreshes=await Promise.all(Array.from({length:20},(_,i)=>put({action:'refresh'},'credits-browse-'+i)));
  check(parallelRefreshes.every(r=>r.ok)&&sourceRequests===warmed&&providerRequests.length===0,'Twenty student refreshes must reuse the shared source cooldown without multiplying upstream or AI calls.');

  let data=await workspace('credits-none');
  check(data.jobs.some(j=>j.id===job.id)&&!data.aiEnabled&&data.ai.slots.every(s=>!s.configured),'A signed-in student sees real source records with no AI connection enabled.');
  let keyword=await (await put({action:'keyword-search',query:'software internships',filters:{view:'all'}},'credits-none')).json();
  check(keyword.kind==='basic'&&keyword.jobIds.includes(job.id)&&providerRequests.length===0,'The no-key search button must use the keyword-only server action.');
  let result=await (await put({action:'ai-search',query:'software internships',filters:{view:'all'},userId:'search-user'},'credits-none')).json();
  check(result.kind==='basic'&&result.jobIds.includes(job.id)&&providerRequests.length===0,'No-key keyword search must return a source job without borrowing another account or global key.');
  result=await (await put({action:'analyse',jobId:job.id,userId:'search-user'},'credits-none')).json();
  check(result.kind==='basic'&&providerRequests.length===0,'No-key fit checks must use profile matching without a hidden provider fallback.');
  data=await workspace('credits-none');
  check(data.ai.usedToday===0,'Browsing and no-key checks must not consume an AI-check allowance.');

  check((await put({action:'ai-save',connection:{slot:1,provider:'groq',model:'openai/gpt-oss-120b',label:'Paused connection',key:keys[2]}},'credits-paused')).ok,'A test student can save their own optional connection.');
  check((await put({action:'ai-toggle',slot:1,enabled:false},'credits-paused')).ok,'A test student can pause their own connection.');
  result=await (await put({action:'ai-search',query:'software',filters:{view:'all'}},'credits-paused')).json();
  check(result.kind==='basic'&&result.jobIds.includes(job.id)&&providerRequests.length===0,'Paused connections must not be charged or replaced by a global key.');
  check((await put({action:'ai-remove',slot:1},'credits-paused')).ok,'A student can remove their connection.');
  result=await (await put({action:'analyse',jobId:job.id},'credits-paused')).json();
  check(result.kind==='basic'&&providerRequests.length===0,'Removing the final key must immediately leave a usable profile check without an AI call.');

  const owned=[['credits-owned-a','gsk_test_own_account_a_abcdefghijklmnopqrstuvwxyz'],['credits-owned-b','gsk_test_own_account_b_abcdefghijklmnopqrstuvwxyz']];
  for(const [user,key] of owned){
   check((await put({action:'ai-save',connection:{slot:1,provider:'groq',model:'openai/gpt-oss-120b',label:'My connection',key}},user)).ok,'Each test account can save a distinct authorized key.');
   check((await put({action:'ai-settings',settings:{autoFallback:true,dailyLimit:1}},user)).ok,'Each account has its own usage limit.');
  }
  keyword=await (await put({action:'keyword-search',query:'software internships',filters:{view:'all'}},owned[0][0])).json();
  check(keyword.kind==='basic'&&keyword.jobIds.includes(job.id)&&providerRequests.length===0,'A keyword search cannot become a paid AI request when the account has enabled keys, including a key added from another tab.');
  check((await workspace(owned[0][0])).ai.usedToday===0,'Keyword-only search with an enabled key must leave the AI allowance untouched.');
  result=await (await put({action:'analyse',jobId:job.id,userId:owned[1][0]},owned[0][0])).json();
  check(result.kind==='ai'&&providerRequests.length===1&&providerRequests[0].authorization==='Bearer '+owned[0][1],'The provider receives the signed-in account’s key, even if the body claims another account.');
  result=await (await put({action:'ai-search',query:'software',filters:{view:'all'}},owned[0][0])).json();
  check(result.kind==='basic'&&providerRequests.length===1,'An account at its daily AI limit keeps keyword search without another provider call.');
  result=await (await put({action:'analyse',jobId:job.id},owned[1][0])).json();
  check(result.kind==='ai'&&providerRequests.length===2&&providerRequests[1].authorization==='Bearer '+owned[1][1],'Another account retains its own key and allowance when the first account is limited.');
  const first=await workspace(owned[0][0]),second=await workspace(owned[1][0]);
  check(first.ai.usedToday===1&&second.ai.usedToday===1,'AI usage accounting must remain independent for each signed-in account.');
 }finally{
  globalThis.fetch=originalFetch;
  for(const [name,value] of previous){if(value===undefined)delete globalThis.__nextroleTestEnv[name];else globalThis.__nextroleTestEnv[name]=value;}
 }
}
