import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const sha=value=>createHash('sha256').update(value).digest('hex');
export async function verifyAnalyticsImports({database,bucket,check}){
 const originalUser=globalThis.__nextroleTestUser,originalOwner=globalThis.__nextroleTestEnv.NEXTROLE_OWNER_EMAIL,originalBucket=globalThis.__nextroleTestEnv.BUCKET,originalScope=globalThis.__nextroleTestEnv.NEXTROLE_ANALYTICS_IMPORT_SCOPE;
 globalThis.__nextroleTestEnv.BUCKET=bucket;
 const {importAnalytics,readImportedReport}=await import('../lib/analytics-import.ts'),api=await import('../app/api/host/imports/route.ts'),mcp=await import('../app/mcp/route.ts');
 try{
  const files=[Buffer.from('PK\x03\x04 isolated detailed workbook fixture'),Buffer.from('PK\x03\x04 isolated directory workbook fixture')],sources=files.map((f,i)=>({sha256:sha(f),fileName:'fixture-'+i+'.xlsx',bytes:f.length,parts:1,origin:'synthetic',sheets:[]})),all=[];
  const add=(i,sheet,row,cells)=>all.push({source:sources[i].sha256,sheet,row,cells});
  add(0,'Users',5,{A:'user_id',B:'fictional_name'});
  for(let i=1;i<=3;i++)add(0,'Users',5+i,{A:'U'+i,B:'User '+i,C:'u'+i+'@example.test',D:'private-test-placeholder',F:'PM',Q:'Yes',H:2026});
  add(0,'Activity',5,{A:'activity_id',B:'user_id'});
  for(const [id,user,day] of [['U1_2026-10-01','U1',2026],['U1_2026-10-08','U1',2026],['U2_2026-10-08','U2',2026],['U3_2026-09-01','U3',2026],['U1_2026-10-08','U1',2026],['unknown_2026-10-08','unknown',2026],['U3_2026-13-01','U3',2026]])add(0,'Activity',all.filter(r=>r.sheet==='Activity').length+5,{A:id,B:user,C:day,D:2026,G:2026,K:10});
  add(0,'Feedback',5,{A:'feedback_id'});add(0,'Feedback',6,{A:'F1',B:'U1',C:'User 1',D:2026,E:5,F:'Matching',H:'A useful review',AA:'SYNTHETIC'});add(0,'Feedback',7,{A:'F2',B:'U2',C:'User 2',D:2026,E:3,F:'Matching'});
  add(1,'User Database',6,{A:'User ID'});add(1,'User Database',7,{A:1,B:'User 1',C:'different@example.test',D:'private-test-placeholder',E:'Yes',F:'Retained',M:'PM',P:'Yes',Q:'Yes',R:'Yes'});
  for(const source of sources)for(const sheet of [...new Set(all.filter(r=>r.source===source.sha256).map(r=>r.sheet))])source.sheets.push({name:sheet,rows:all.filter(r=>r.source===source.sha256&&r.sheet===sheet).length,headerRow:sheet==='User Database'?6:5,columns:{A:'identifier'}});
  const raw=Buffer.from(JSON.stringify(all)),manifest={version:1,title:'Isolated import verification',totalRows:all.length,sources,pages:[{index:0,sha256:sha(raw),rows:all.length}]},packet=gzipSync(raw).toString('base64');
  const started=await importAnalytics('begin',manifest),id=started.id;
  const scope={id,manifestSHA256:sha(JSON.stringify(manifest)),expiresAt:Date.now()+60000};globalThis.__nextroleTestEnv.NEXTROLE_ANALYTICS_IMPORT_SCOPE=JSON.stringify(scope);
  const {issueAnalyticsUpload}=await import('../lib/analytics-import-upload.ts'),upload=await import('../app/api/host/imports/upload/route.ts'),permit=await issueAnalyticsUpload();
  const uploadRequest=(operation,payload,token=permit.token,origin=null)=>upload.POST(new Request('https://nextrole.test/api/host/imports/upload',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify({operation,payload:typeof payload==='string'?payload:JSON.stringify(payload)})}));
  check((await uploadRequest('status',{id},null)).status===401,'Upload packets require a scoped permission before parsing private data.');
  check((await uploadRequest('status',{id},'x'.repeat(43))).status===401,'A forged upload token cannot read import progress or write rows.');
  check((await uploadRequest('status',{id:'0'.repeat(64)})).status===403,'Upload permissions cannot access another import.');
  check((await uploadRequest('begin',{...manifest,title:'Changed manifest'})).status===403,'Upload permissions bind the exact manifest text and cannot start modified sources.');
  check((await uploadRequest('status',{id},permit.token,'https://other.example')).status===403,'Cross-origin upload attempts are rejected.');
  check((await uploadRequest('begin',JSON.stringify(manifest))).ok,'A scoped permission accepts the exact owner-configured source manifest.');
  globalThis.__nextroleTestEnv.NEXTROLE_ANALYTICS_IMPORT_SCOPE=JSON.stringify({...scope,expiresAt:Date.now()-1});
  check((await uploadRequest('status',{id})).status===401,'Expired runtime upload scopes immediately reject the same token.');
  globalThis.__nextroleTestEnv.NEXTROLE_ANALYTICS_IMPORT_SCOPE=JSON.stringify(scope);
  check(started.state==='pending'&&started.sourceRows===0,'Imports begin as private, incomplete batches.');
  await importAnalytics('begin',manifest);
  check((await database.prepare('SELECT COUNT(*) as n FROM analytics_imports WHERE id=?').bind(id).first()).n===1,'Beginning the same source files twice does not duplicate an import.');
  for(let i=0;i<files.length;i++)await importAnalytics('file',{id,source:sources[i].sha256,data:files[i].toString('base64')});
  await importAnalytics('finalize',{id}).then(()=>check(false,'Incomplete imports must fail.'),e=>check(e.status===409,'Incomplete batches cannot become visible analytics.'));
  await importAnalytics('append',{id,page:0,packed:gzipSync(Buffer.from('[]')).toString('base64')}).then(()=>check(false,'Bad checksums must fail.'),e=>check(e.message.includes('checksum'),'Import page checksums reject altered data.'));
  const before=await database.prepare('SELECT (SELECT COUNT(*) FROM email_accounts) as accounts,(SELECT COUNT(*) FROM product_events) as events').first();
  await importAnalytics('append',{id,page:0,packed:packet});const repeated=await importAnalytics('append',{id,page:0,packed:packet});
  check(repeated.replayed&&(await database.prepare('SELECT COUNT(*) as n FROM analytics_import_rows WHERE import_id=?').bind(id).first()).n===all.length,'Replaying accepted pages preserves exactly one copy of every row.');
  const finished=await (await uploadRequest('finalize',{id})).json(),again=await importAnalytics('finalize',{id}),report=await readImportedReport(id),s=report.sources[0];
  check((await uploadRequest('status',{id})).status===401,'Successful finalization revokes its temporary upload permission.');
  check((await issueAnalyticsUpload()).alreadyImported,'Completed sources cannot mint another upload permission.');
  check(finished.state==='complete'&&again.alreadyImported,'Finalization is resumable and idempotent.');
  check(s.profileRows===3&&report.sources[1].profileRows===1,'Source snapshots are analyzed separately even when names match.');
  check(s.windows['30'].active===2&&s.windows['7'].active===2,'Activity dates are recovered from IDs and users are deduplicated per day.');
  check(s.retention.eligible===2&&s.retention.returned===1&&s.retention.pending===1,'Exact Day-7 retention excludes immature cohorts and includes mature non-returners.');
  check(s.ratingCount===2&&s.ratingMean===4&&s.writtenReviews===1,'Ratings, averages and written reviews use separate valid denominators.');
  check(s.windows['30'].features.find(f=>f.label==='Job details').featureDays===3,'Feature-day counts exclude duplicate and orphan activity.');
  check(s.quality.some(q=>q.includes('unknown user'))&&s.quality.some(q=>q.includes('no usable date')),'Orphan rows and impossible dates are disclosed without fabricating activity.');
  check(report.sources[1].windows['90'].active===null,'Directory snapshots never infer unobserved 90-day active users.');
  check(!JSON.stringify(report).includes('private-test-placeholder'),'Normalized analytics never expose source password columns.');
  const after=await database.prepare('SELECT (SELECT COUNT(*) FROM email_accounts) as accounts,(SELECT COUNT(*) FROM product_events) as events').first();
  check(after.accounts===before.accounts&&after.events===before.events,'Importing workbook identities creates neither login accounts nor measured live usage.');
  const get=(view='summary',extra={})=>api.GET(new Request('https://nextrole.test/api/host/imports?'+new URLSearchParams({id,source:s.sha256,view,...extra})));
  globalThis.__nextroleTestEnv.NEXTROLE_OWNER_EMAIL='import-owner@example.test';globalThis.__nextroleTestUser=null;
  check((await get()).status===401&&(await get('raw')).status===401,'Anonymous visitors cannot access imported summaries or raw exports.');
  globalThis.__nextroleTestUser={userId:'email:unverified-owner',email:'import-owner@example.test',displayName:'Unverified'};
  check((await get()).status===403,'An unverified email registration cannot read imported owner data.');
  const request=()=>new Request('https://nextrole.test/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'nextrole_import_analytics',arguments:{operation:'status',payload:JSON.stringify({id})}}})});
  check((await mcp.POST(request())).status===403,'The import MCP tool enforces the same owner boundary.');
  globalThis.__nextroleTestUser={userId:'import-owner',email:'import-owner@example.test',displayName:'Owner'};
  const summary=await (await get()).json();check(summary.report.sources[0].people===undefined&&summary.report.sources[0].feedback===undefined,'Summary responses omit individual profiles and reviews.');
  const people=await (await get('people',{q:'u1@example.test'})).json();check(people.total===1&&people.items[0].id==='U1'&&!JSON.stringify(people).includes('placeholder'),'Owner user search returns normalized, password-free records.');
  const original=await get('original');check(original.ok&&sha(Buffer.from(await original.arrayBuffer()))===sources[0].sha256,'Private original workbook exports preserve exact source bytes.');
  const backup=await (await get('raw')).json();check(backup.rows.length===all.length&&JSON.stringify(backup).includes('private-test-placeholder'),'Only the explicit private raw backup preserves all source columns.');
  const {verifyCombinedAnalytics}=await import('./verify-combined-analytics.mjs');await verifyCombinedAnalytics({database,check});
  // Optional private end-to-end fixture. Never commit workbook data or generated packets.
  if(process.env.NEXTROLE_IMPORT_FIXTURE){
   const directory=process.env.NEXTROLE_IMPORT_FIXTURE,load=name=>JSON.parse(readFileSync(path.join(directory,name),'utf8')),manifest=load('manifest.json'),begun=await importAnalytics('begin',manifest),packets=load('pages.json'),parts=load('files.json');
   for(const source of manifest.sources){const data=parts.filter(p=>p.source===source.sha256).sort((a,b)=>a.part-b.part).map(p=>p.data).join('');await importAnalytics('file',{id:begun.id,source:source.sha256,data});}
   for(const p of packets)await importAnalytics('append',p);
   const end=await importAnalytics('finalize',{id:begun.id}),actual=await readImportedReport(begun.id),detailed=actual.sources.find(s=>s.activityRows);
   check(end.state==='complete'&&actual.sourceRows===6898,'Both attached workbooks import all 6,898 nonempty source rows end to end.');
   check(actual.sources.every(s=>s.profileRows===930&&s.ratingCount===180&&s.ratingMean===4.3&&s.writtenReviews===108),'Both uploaded snapshots independently yield 930 profiles, 180 ratings, 4.3 average and 108 reviews.');
   check(detailed.activityRows===3623&&detailed.recoveredDates===3623&&detailed.asOf==='2026-11-10','The detailed source recovers all 3,623 dated activity rows through 10 November.');
   console.log(JSON.stringify({uploadedFixtureVerified:true,sourceRows:actual.sourceRows,sources:actual.sources.map(s=>({profiles:s.profileRows,activityRows:s.activityRows,ratingCount:s.ratingCount,ratingMean:s.ratingMean,writtenReviews:s.writtenReviews,active7:s.windows['7'].active,active30:s.windows['30'].active,retention:s.retention}))}));
   // Do not leave private fixture imports in the test fixture view used by other checks.
   await database.prepare('DELETE FROM analytics_import_pages WHERE import_id=?').bind(begun.id).run();await database.prepare('DELETE FROM analytics_import_rows WHERE import_id=?').bind(begun.id).run();await database.prepare('DELETE FROM analytics_imports WHERE id=?').bind(begun.id).run();
  }
  await database.prepare('DELETE FROM analytics_import_pages WHERE import_id=?').bind(id).run();await database.prepare('DELETE FROM analytics_import_rows WHERE import_id=?').bind(id).run();await database.prepare('DELETE FROM analytics_imports WHERE id=?').bind(id).run();
 }finally{globalThis.__nextroleTestUser=originalUser;globalThis.__nextroleTestEnv.NEXTROLE_OWNER_EMAIL=originalOwner;globalThis.__nextroleTestEnv.BUCKET=originalBucket;globalThis.__nextroleTestEnv.NEXTROLE_ANALYTICS_IMPORT_SCOPE=originalScope;}
}
