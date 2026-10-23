export async function verifyCatalogue({database,put,GET,check,job,defaultProfile,source,migratedWorkspaceRevision}){
 const {cataloguePage}=await import('../lib/catalogue.ts');
 const {getJobs}=await import('../lib/store.ts');
 const {candidateJobs}=await import('../lib/job-selection.ts');
 const {extractExperience}=await import('../lib/experience.ts');
 const {extractEligibility}=await import('../lib/eligibility.ts');
 const {GET:pageGET}=await import('../app/api/catalogue/route.ts');
 const user='catalogue-owner',profile={...defaultProfile,name:'Catalogue Owner',roles:['Software engineer'],skills:['TypeScript'],completed:true},now=Date.now();
 const identity=id=>({userId:id,displayName:'Catalogue test',email:id+'@example.test'});
 const read=input=>pageGET(new Request('https://nextrole.test/api/catalogue?'+new URLSearchParams(input)));
 // Pause one real database write so concurrent API behavior can be verified without replacing responses.
 function pauseWrite(matches){
  let release,started,armed=true;const gate=new Promise(resolve=>{release=resolve;}),ready=new Promise(resolve=>{started=resolve;});
  const method=(target,name)=>typeof target[name]==='function'?target[name].bind(target):target[name];
  globalThis.__nextroleTestEnv.DB=new Proxy(database,{get(target,name){
   if(name!=='prepare')return method(target,name);
   return sql=>new Proxy(target.prepare(sql),{get(statement,operation){
    if(operation!=='bind')return method(statement,operation);
    return (...args)=>{const bound=statement.bind(...args);if(!armed||!matches(sql,args))return bound;armed=false;
     return new Proxy(bound,{get(write,action){if(action!=='run')return method(write,action);return async(...values)=>{started();await gate;return write.run(...values);};}});
    };
   }});
  }});
  return {ready,release,restore(){release();globalThis.__nextroleTestEnv.DB=database;}};
 }
 const {acquireLease,releaseLease}=await import('../lib/lease.ts');
 const leaseClock=Date.now,leaseKey='catalogue-lease-regression';let holder=null,successor=null;
 try{
  Date.now=()=>now;holder=await acquireLease(leaseKey,90000);check(!!holder,'A holder must acquire an unused lease.');
  Date.now=()=>now+46000;check(!await acquireLease(leaseKey,1000)&&!await acquireLease(leaseKey,45000),'Shorter caller timeouts must not steal a live 90-second lease.');
  Date.now=()=>now+90001;successor=await acquireLease(leaseKey,1000);check(!!successor,'An expired lease must remain recoverable.');
  await releaseLease(holder);check((await database.prepare('SELECT value FROM meta WHERE key=?').bind(leaseKey).first())?.value===successor.value,'A stale holder must not release its successor’s lease.');
  await releaseLease(successor);
  await database.prepare('INSERT INTO meta(key,value) VALUES(?,?)').bind(leaseKey,(now-100000)+':legacy-holder').run();
  successor=await acquireLease(leaseKey,45000);check(!!successor,'Legacy start-time leases must remain recoverable during rollout.');
 }finally{Date.now=leaseClock;await releaseLease(holder);await releaseLease(successor);await database.prepare('DELETE FROM meta WHERE key=?').bind(leaseKey).run();}
 check(/^v-[a-f0-9]{32}$/.test(migratedWorkspaceRevision),'The additive migration must seed a unique cache revision for an existing v14 workspace.');
 globalThis.__nextroleTestUser=null;check((await read({})).status===401,'Catalogue pages must reject anonymous callers.');
 globalThis.__nextroleTestUser=identity(user);
 check((await put({action:'profile',profile},user)).ok,'The pagination profile must save through the actual API.');
 check((await read({limit:'1000'})).status===400&&(await read({limit:'1'})).status===400,'Page sizes must stay between 20 and 100 in bounded increments.');
 check((await read({cursor:'untrusted-cursor'})).status===400,'Malformed cursors must be rejected.');
 function fixture(i,company='Catalogue Fixture'){
  const title=i%5===1?'Software Engineer':i%5===3?'Data Analyst Intern':'Software Engineer Intern';
  const description=i%5===1?'Requires 4 years of professional software engineering experience. TypeScript is required.':i%5===4?'Build and maintain documented software for customers. The role uses TypeScript and Python.':'No prior experience required. Build documented software in TypeScript. Internship in Bengaluru, India.';
  const experienceRequirements=extractExperience(description,title);
  return {...job,id:'catalogue-fixture:'+company+':'+i,key:'catalogue-fixture:'+company+':'+i,sourceId:'catalogue-fixture',company,title,description,skills:['TypeScript'],location:'Bengaluru, India',countryCodes:['IN'],mode:'On-site',jobType:'Internship',firstSeen:new Date(now-i*60000).toISOString(),lastChecked:new Date(now-(i%5===2?26*3600000:0)).toISOString(),deadline:null,active:true,experienceRequirements,minExperience:experienceRequirements.minimum,experienceEvidence:experienceRequirements.evidence,eligibility:extractEligibility(description),evidenceVersion:1,evidenceComplete:true,url:'https://careers.example.test/jobs/'+i};
 }
 async function insert(jobs){for(let start=0;start<jobs.length;start+=400){const statements=[];for(let i=start;i<Math.min(start+400,jobs.length);i+=10){const part=jobs.slice(i,Math.min(i+10,start+400));statements.push(database.prepare('INSERT INTO jobs(id,job_key,source_id,data,first_seen,last_checked,active) VALUES '+part.map(()=>'(?,?,?,?,?,?,1)').join(',')).bind(...part.flatMap(j=>[j.id,j.key,j.sourceId,JSON.stringify(j),j.firstSeen,j.lastChecked])));}await database.batch(statements);}}
 const fixtures=Array.from({length:85},(_,i)=>fixture(i));await insert(fixtures);
 const emptySelection=await (await read({company:'Catalogue Fixture',view:'all',query:'Software',ids:''})).json();check(emptySelection.total===0&&emptySelection.jobs.length===0,'An empty AI shortlist must stay empty when encoded in the actual catalogue URL.');
 const invalidDeadline={...fixture(905,'Invalid Deadline'),deadline:'not-an-instant'};await insert([invalidDeadline]);
 check((await cataloguePage(user,{company:'Invalid Deadline',view:'all'})).total===0,'Pagination must not admit an invalid deadline that the established discovery policy excludes.');
 const baseline=await getJobs(user,profile);
 for(const view of ['for-you','review','all']){
  const filter={company:'Catalogue Fixture',view},expected=candidateJobs(baseline,filter).sort((a,b)=>b.match.score-a.match.score||b.firstSeen.localeCompare(a.firstSeen)).map(job=>job.id),seen=[];
  let cursor;do{const page=await cataloguePage(user,{...filter,...(cursor?{cursor}:{})});seen.push(...page.jobs.map(job=>job.id));cursor=page.nextCursor;check(page.jobs.length<=20&&page.jobs.every(job=>job.description===''),'Each page must omit descriptions and contain at most 20 cards by default.');}while(cursor);
  check(JSON.stringify(seen)===JSON.stringify(expected),'All '+view+' pages must agree with the pre-existing catalogue selection and ranking policy.');
  check(new Set(seen).size===seen.length,'Pagination must not duplicate a job across pages.');
 }
 let first=await cataloguePage(user,{company:'Catalogue Fixture',view:'all'}),cached=await cataloguePage(user,{company:'Catalogue Fixture',view:'all'});
 check(cached.cached&&cached.snapshotId===first.snapshotId,'Unchanged filters and generation must reuse the ranking snapshot.');
 let response=await read({company:'Catalogue Fixture',view:'all'});check(response.ok&&response.headers.get('Cache-Control')==='no-store','Actual catalogue HTTP responses must be authenticated and non-cacheable.');
 const workspace=await (await GET(new Request('https://nextrole.test/api/app?workspace=1'))).json();
 check(workspace.jobs.length===0&&workspace.profile.name===profile.name,'Dashboard bootstrap must return preferences without downloading the catalogue.');
 globalThis.__nextroleTestUser=identity('catalogue-other');
 check((await read({company:'Catalogue Fixture',view:'all',cursor:first.nextCursor})).status===409,'A cursor copied to another account must expose no records.');
 globalThis.__nextroleTestUser=identity(user);
 check((await read({company:'Other company',view:'all',cursor:first.nextCursor})).status===409,'Cursors must not be reused under different filters.');
 await put({action:'status',jobId:fixtures[0].id,status:'applied',note:'PRIVATE_PAGINATION_NOTE'},user);
 check((await read({company:'Catalogue Fixture',view:'all',cursor:first.nextCursor})).status===409,'Tracking changes must invalidate an old snapshot at the database boundary.');
 const applied=await cataloguePage(user,{tab:'applications',company:'Catalogue Fixture'});
 check(applied.jobs.length===1&&applied.jobs[0].note==='PRIVATE_PAGINATION_NOTE','Application pages must hydrate the owner’s current status and notes.');
 const snapshot=await database.prepare('SELECT data FROM catalogue_snapshots WHERE user_id=?').bind(user).first();
 check(!snapshot.data.includes('PRIVATE_PAGINATION_NOTE'),'Temporary rankings must store references and counts rather than private notes.');
 first=await cataloguePage(user,{company:'Catalogue Fixture',view:'all'});
 await database.prepare('UPDATE jobs SET active=0 WHERE id=?').bind(fixtures[3].id).run();
 check((await read({company:'Catalogue Fixture',view:'all',cursor:first.nextCursor})).status===409,'A source update must invalidate old cursors, including direct SQL writes.');
 first=await cataloguePage(user,{company:'Catalogue Fixture',view:'all'});
 await put({action:'profile',profile:{...profile,experience:5}},user);
 check((await read({company:'Catalogue Fixture',view:'all',cursor:first.nextCursor})).status===409,'Profile changes must invalidate old rankings.');
 await put({action:'profile',profile},user);
 first=await cataloguePage(user,{company:'Catalogue Fixture',view:'all'});
 await database.prepare('UPDATE catalogue_snapshots SET expires_at=? WHERE user_id=?').bind(new Date(now-1).toISOString(),user).run();
 check((await read({company:'Catalogue Fixture',view:'all',cursor:first.nextCursor})).status===409,'Expired snapshots must require a new first page.');
 const boundary={...fixture(900,'Freshness Boundary'),lastChecked:new Date(now-24*3600000+10000).toISOString()};await insert([boundary]);
 const originalNow=Date.now;try{
  Date.now=()=>now;const before=await cataloguePage(user,{company:'Freshness Boundary'});
  check(before.jobs.length===1&&Date.parse(before.expiresAt)<=now+10001,'Snapshot expiry must stop at the next freshness boundary.');
  Date.now=()=>now+11000;let rejected=false;try{await cataloguePage(user,{company:'Freshness Boundary',cursor:before.snapshotId+'.0'});}catch(error){rejected=error.status===409;}check(rejected,'Time alone must invalidate a freshness-sensitive snapshot.');
  check((await cataloguePage(user,{company:'Freshness Boundary',view:'review'})).jobs.length===1,'A stale listing must move to review after snapshot expiry.');
 }finally{Date.now=originalNow;}
 const dup={...fixtures[10],id:fixtures[10].id+'-alias'};await insert([dup]);
 const deduped=await cataloguePage(user,{company:'Catalogue Fixture',view:'all'});
 check(deduped.total===83,'Strong-identity duplicates must remain collapsed after one Applied and one closed record.');
 const summary=deduped.summary,allNow=await getJobs(user,profile),company=summary.companies.find(facet=>facet.company==='Catalogue Fixture');
 check(company.scopes['for-you'].total===candidateJobs(allNow,{company:'Catalogue Fixture'}).length&&summary.counts.applications===1,'Company facets and sidebar counts must describe the whole snapshot, independent of its page.');
 const {catalogueQuality}=await import('../lib/source-health.ts');
 check(JSON.stringify(summary.quality)===JSON.stringify(catalogueQuality(allNow)),'Coverage totals must agree with the complete existing catalogue rather than the first page.');
 await database.prepare('INSERT INTO notifications(id,user_id,job_key,title,body,type,created_at) VALUES(?,?,?,?,?,?,?)').bind('pagination-off-page',user,fixtures[82].key,'Off-page opening','Actual source notice','match',new Date().toISOString()).run();
 const notices=await (await GET(new Request('https://nextrole.test/api/app?workspace=1'))).json();
 check(notices.notifications.some(notice=>notice.id==='pagination-off-page'&&notice.jobId===fixtures[82].id),'Off-page notification links must resolve a real job ID without a full catalogue download.');
 const detail=await (await put({action:'detail',jobId:fixtures[82].id},user)).json();
 check(detail.job.description===fixtures[82].description,'Off-page deep links must load actual descriptions through the existing owner-safe detail handler.');
 const updates=fixtures.slice(5,45).map(item=>database.prepare('INSERT INTO user_jobs(user_id,job_key,job_id,status,note,updated_at) VALUES(?,?,?,?,?,?)').bind(user,item.key,item.id,'applied','Export note '+item.id,new Date().toISOString()));await database.batch(updates);
 const exported=await (await put({action:'export-applications'},user)).json();
 check(exported.applications.length===41&&exported.applications.every(item=>item.status==='applied'),'Application export must include all pages, not just loaded cards.');
 const imported=await (await put({action:'import-job',import:{kind:'text',url:'https://careers.example.test/private-pagination',data:{company:'Private Pagination',title:'Software Engineer Intern',location:'Bengaluru, India',description:'No prior experience required. Build tested software and internal tools with TypeScript.',mode:'On-site',jobType:'Internship'}}},user)).json();
 check((await cataloguePage(user,{tab:'interested',company:'Private Pagination'})).jobs[0]?.id===imported.jobId,'Private imports must appear in their owner’s paginated shortlist.');
 check((await cataloguePage('catalogue-other',{tab:'interested',company:'Private Pagination'})).total===0,'Private imports must never enter another account’s catalogue.');
 const {sourceMetrics,recordSourceObservation,pruneDiscoveryData}=await import('../lib/source-metrics.ts');
 const previous=await sourceMetrics();check(previous.totals.successful>0&&previous.totals.failed>0&&previous.totals.closures>0,'Actual sync workflows must record successful, failed and closing source observations.');await recordSourceObservation(source,'success',23,{fetched:2,unique:1,newJobs:1,closed:1,incomplete:1});await recordSourceObservation(source,'failed',10,{},'http-429');await recordSourceObservation(source,'cooldown',0,{},'retry-after');const metrics=await sourceMetrics();
 check(metrics.totals.recorded===previous.totals.recorded+3&&metrics.totals.successful===previous.totals.successful+1&&metrics.totals.cooldown===previous.totals.cooldown+1,'Source metrics must retain actual outcomes with cooldown skips separate from attempts.');
 check(metrics.totals.fetched===previous.totals.fetched+2&&metrics.totals.newlyObserved===previous.totals.newlyObserved+1,'Observed row counters must use measured denominators rather than invented accuracy or usable-job counts.');
 check(metrics.recent.some(run=>run.outcome==='failed')&&metrics.recent.some(run=>run.outcome==='success'),'Source history must retain earlier outcomes instead of overwriting the latest row.');
 const stale=metrics.recent[0].id;await database.prepare('UPDATE source_run_history SET checked_at=? WHERE id=?').bind(new Date(Date.now()-31*86400000).toISOString(),stale).run();await pruneDiscoveryData();
 check(!await database.prepare('SELECT id FROM source_run_history WHERE id=?').bind(stale).first(),'Bounded maintenance must remove expired source observations.');
 if(process.argv.includes('--scale')){
  const big=Array.from({length:10000},(_,i)=>({...fixture(i*5,'Scale Catalogue'),id:'catalogue-scale:'+i,key:'catalogue-scale:'+i,title:'Software Engineer Intern'+(i===9999?' TailRare':''),description:fixtures[0].description.repeat(20)}));await insert(big);
  let scanQueries=0,maxBatch=0,hydrations=0;
  // Instrument actual D1 calls without substituting responses or matching behavior.
  globalThis.__nextroleTestEnv.DB={batch:statements=>database.batch(statements),prepare(sql){const statement=database.prepare(sql);return {bind(...args){const bound=statement.bind(...args);return new Proxy(bound,{get(target,name){if(name==='all')return async(...values)=>{const result=await target.all(...values);if(sql.includes('ORDER BY j.rowid LIMIT 250')){scanQueries++;maxBatch=Math.max(maxBatch,result.results.length);}if(sql.includes('WHERE j.rowid IN'))hydrations++;return result;};const value=target[name];return typeof value==='function'?value.bind(target):value;}});}};}};
  try{
   const started=performance.now(),large=await cataloguePage(user,{company:'Scale Catalogue'}),coldMs=performance.now()-started,coldScans=scanQueries;
   const warmStarted=performance.now(),second=await cataloguePage(user,{company:'Scale Catalogue',cursor:large.nextCursor}),warmMs=performance.now()-warmStarted,bytes=new TextEncoder().encode(JSON.stringify(large)).length;
   check(large.total===10000&&large.jobs.length===20&&second.jobs.length===20,'The actual paged workflow must expose all 10,000 fixture listings in bounded pages.');
   check(maxBatch===250&&coldScans>=40&&scanQueries===coldScans&&hydrations>=2,'Cold ranking must stream bounded batches; warm paging must hydrate indexed references without rescanning.');
   check(bytes<160*1024,'The default first-page response must remain below 160 KiB in the 10,000-listing fixture.');
   check(new Set([...large.jobs,...second.jobs].map(job=>job.id)).size===40,'Large-catalogue pages must remain stable without overlaps.');
   const {keywordSearchJobs}=await import('../lib/search.ts');const tail=await keywordSearchJobs(user,'TailRare',profile,{company:'Scale Catalogue'});check(tail.jobIds.length===1&&tail.jobIds[0]==='catalogue-scale:9999','Bounded keyword search must still find a relevant job at the end of the entire catalogue.');
   const plan=await database.prepare('EXPLAIN QUERY PLAN SELECT id FROM jobs WHERE rowid IN (?,?)').bind(1,2).all();check(plan.results.some(row=>String(row.detail).includes('INTEGER PRIMARY KEY')),'Page hydration must use SQLite primary-key lookup.');
   console.log(JSON.stringify({catalogueScale:{listings:10000,coldMs:Math.round(coldMs),warmMs:Math.round(warmMs),firstPageBytes:bytes,coldScanQueries:coldScans,maxRowsPerScan:maxBatch,hydration:'SQLite integer primary key',productionCapacityProven:false}}));
  }finally{globalThis.__nextroleTestEnv.DB=database;await database.prepare("DELETE FROM jobs WHERE id LIKE 'catalogue-scale:%'").run();}
 }
 for(const expired of [false,true]){
  const raceUser='catalogue-clear-race-'+expired;await put({action:'profile',profile},raceUser);
  const paused=pauseWrite(sql=>sql.startsWith('INSERT INTO catalogue_snapshots'));
  const pending=cataloguePage(raceUser,{company:'Catalogue Fixture',view:'all'}).then(page=>({page}),error=>({error})),clock=Date.now;
  try{
   await Promise.race([paused.ready,pending.then(()=>{throw new Error('Catalogue preparation ended before its cache-write race could be tested.');})]);
   if(expired)Date.now=()=>clock()+90001;
   const cleared=await put({action:'delete-account-data',confirmation:'DELETE'},raceUser);
   check(cleared.status===(expired?200:409),expired?'Workspace clear must recover an expired catalogue lease.':'Workspace clear must wait for an active catalogue cache write.');
   paused.release();const result=await pending;
   if(expired){
    check(result.error?.status===409,'A cache writer overtaken by workspace clear must fail safely.');
    check(!await database.prepare('SELECT user_id FROM catalogue_snapshots WHERE user_id=?').bind(raceUser).first(),'An expired writer must not recreate a ranking snapshot after clear.');
   }else{
    check(!!result.page,'An uninterrupted cache writer must complete normally.');
    check((await put({action:'delete-account-data',confirmation:'DELETE'},raceUser)).ok,'Workspace clear must succeed after the cache writer releases its lease.');
   }
  }finally{paused.release();await pending;Date.now=clock;paused.restore();}
 }
 const emptyUser='catalogue-empty-race',paused=pauseWrite((sql,args)=>sql.startsWith('INSERT INTO meta(key,value)')&&args[0]==='byok_mutation:'+emptyUser);
 const pending=cataloguePage(emptyUser,{company:'Catalogue Fixture',view:'all'}).then(page=>({page}),error=>({error}));
 try{
  await Promise.race([paused.ready,pending.then(()=>{throw new Error('Catalogue preparation ended before workspace-lease acquisition could be paused.');})]);
  check((await put({action:'delete-account-data',confirmation:'DELETE'},emptyUser)).ok,'An empty workspace must be clearable while an earlier ranking request waits to acquire its lease.');
  paused.release();const result=await pending;
  check(result.error?.status===409,'The retained reset marker must invalidate an earlier request even when the workspace had no personal revision.');
  check(!await database.prepare('SELECT user_id FROM catalogue_snapshots WHERE user_id=?').bind(emptyUser).first(),'A waiting request must not recreate an empty workspace’s cache after clear.');
 }finally{paused.release();await pending;paused.restore();}
 const oldRevision=(await database.prepare('SELECT revision FROM user_catalogue_versions WHERE user_id=?').bind(user).first()).revision;
 await cataloguePage(user,{tab:'applications'});check((await put({action:'delete-account-data',confirmation:'DELETE'},user)).ok,'Workspace deletion must clear the new derived catalogue data.');
 check(!await database.prepare('SELECT user_id FROM catalogue_snapshots WHERE user_id=?').bind(user).first()&&!await database.prepare('SELECT user_id FROM user_catalogue_versions WHERE user_id=?').bind(user).first(),'Workspace deletion must remove ranking snapshots and revision state after trigger-driven personal cleanup.');
 await put({action:'profile',profile},user);check((await database.prepare('SELECT revision FROM user_catalogue_versions WHERE user_id=?').bind(user).first()).revision!==oldRevision,'Recreating a workspace must never reuse a cache generation from before deletion.');
 await put({action:'delete-account-data',confirmation:'DELETE'},user);
 await database.prepare("DELETE FROM jobs WHERE id LIKE 'catalogue-fixture:%'").run();
}
