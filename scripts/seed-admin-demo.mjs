import './admin-demo-runtime.mjs';
import {DatabaseSync} from 'node:sqlite';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {demoDataset}=await import('../lib/admin-demo-data.ts');
const {demoAdminReport}=await import('../lib/admin-demo.ts');

/** Local-only: requires an empty directory, accepts no credentials or remote binding. */
export async function seedAdminDemo(output,today){
 const directory=path.resolve(output);await mkdir(directory,{recursive:true});
 if((await readdir(directory)).length)throw new Error('Use an empty output directory. Existing databases are never opened or overwritten.');
 const data=demoDataset(today),databasePath=path.join(directory,'NextRole-SYNTHETIC-DEMO.sqlite'),db=new DatabaseSync(databasePath);
 try{
  db.exec('PRAGMA foreign_keys=ON; BEGIN;');
  const migrations=fileURLToPath(new URL('../drizzle/',import.meta.url));
  for(const file of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(path.join(migrations,file),'utf8'));
  db.exec('CREATE TABLE demo_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE demo_identities(user_id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL,city TEXT NOT NULL,data_mode TEXT NOT NULL CHECK(data_mode=\'synthetic\'));');
  const meta=db.prepare('INSERT INTO demo_metadata(key,value) VALUES(?,?)');
  for(const [key,value] of Object.entries({dataset_id:data.datasetId,data_mode:'synthetic',label:'FICTIONAL DATA - NOT EVIDENCE OF REAL USERS OR REVIEWS',anchor_day:data.today,outbound_disabled:'true',rating_scenario:'Preselected 4.3/5 test distribution'}))meta.run(key,value);
  const identity=db.prepare('INSERT INTO demo_identities VALUES(?,?,?,?,?,?)'),profile=db.prepare('INSERT INTO profiles(user_id,data,created_at,updated_at) VALUES(?,?,?,?)'),person=db.prepare('INSERT INTO product_people(user_id,first_seen,last_seen,first_day,initial_completed) VALUES(?,?,?,?,0)'),settings=db.prepare('INSERT INTO engagement_settings(user_id,analytics_enabled,updated_at) VALUES(?,?,?)');
  const lastSeen=new Map();for(const e of data.events)if(e.kind==='workspace_open')lastSeen.set(e.userId,e.createdAt);
  for(const p of data.profiles){identity.run(p.userId,p.name,p.email,p.role,p.city,'synthetic');profile.run(p.userId,JSON.stringify({...p.data,dataMode:'synthetic'}),p.createdAt,p.createdAt);settings.run(p.userId,Number(p.analyticsEnabled),p.createdAt);if(p.analyticsEnabled)person.run(p.userId,p.createdAt,lastSeen.get(p.userId)||p.createdAt,p.firstDay);}
  const event=db.prepare('INSERT INTO product_events(id,user_id,kind,day,created_at) VALUES(?,?,?,?,?)');for(const e of data.events)event.run(e.id,e.userId,e.kind,e.day,e.createdAt);
  const activity=db.prepare('INSERT INTO product_activity_days(user_id,day,section,seconds) VALUES(?,?,?,?)');for(const a of data.activity)activity.run(a.userId,a.day,a.section,a.seconds);
  const application=db.prepare('INSERT INTO user_jobs(user_id,job_key,job_id,status,stage,note,updated_at) VALUES(?,?,?,\'applied\',?,\'SYNTHETIC DEMO\',?)'),record=db.prepare('INSERT INTO application_records(user_id,job_key,job_id,data,revision,updated_at) VALUES(?,?,?,?,?,?)');
  for(const a of data.applications){application.run(a.userId,a.jobKey,a.jobId,a.stage,a.updatedAt);record.run(a.userId,a.jobKey,a.jobId,JSON.stringify({dataMode:'synthetic',fitAtConfirmation:{relevant:a.checked,uncertain:!a.checked,checkedAt:a.createdAt}}),'synthetic:v2',a.updatedAt);}
  const columns=['id','user_id','kind','context_id','job_id','rating','category','subject','message','needs','difficulty','period','status','priority','reply','replied_at','reply_read_at','resolved_at','created_at','updated_at'],feedback=db.prepare('INSERT INTO feedback('+columns.join(',')+') VALUES('+columns.map(()=>'?').join(',')+')');
  for(const f of data.feedback)feedback.run(...columns.map(key=>key==='user_id'?f.userId:key==='context_id'?'synthetic:fixture':f[key]??null));
  // Even if accidentally wired to a runtime, this fixture DB cannot acquire outbound recipients or credentials.
  for(const table of ['digest_settings','digest_outbox','subscriptions','push_outbox','automation_queue','automation_tokens','google_accounts','api_slots'])db.exec(`CREATE TRIGGER demo_block_${table} BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT,'Synthetic demo database: outbound delivery, authentication and credentials disabled'); END;`);
  db.exec('COMMIT;');
  const report=demoAdminReport(30,new Date(data.today+'T15:30:00Z'));
  await writeFile(path.join(directory,'NextRole-SYNTHETIC-DEMO-records.json'),JSON.stringify(data));
  await writeFile(path.join(directory,'NextRole-SYNTHETIC-DEMO-summary.json'),JSON.stringify(report,null,2));
  await writeFile(path.join(directory,'README.txt'),'NEXTROLE - SYNTHETIC DEMO ONLY\n\nAll names, addresses, reviews and activity are invented. This is not evidence of real adoption, satisfaction, retention or hiring outcomes. The 4.3 rating is a deliberately selected test scenario.\n\nThe SQLite database uses the app\'s current migrations plus demo_metadata and demo_identities. It is isolated from production. All addresses use example.invalid. No authentication accounts, subscriptions, delivery recipients or API keys are created. Outbound/authentication insert guards are installed.\n\nEach chart is calculated from the companion JSON records. Recreate with npm run demo:seed -- --out /absolute/empty/directory. Never import the database or records into production.\n');
  return{databasePath,datasetId:data.datasetId,dataMode:'synthetic',profiles:data.profiles.length,reviews:data.feedback.filter(f=>f.rating!==null).length,feedbackRows:data.feedback.length,events:data.events.length,outboundRecipients:0};
 }finally{db.close();}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const index=process.argv.indexOf('--out');if(index<0||!process.argv[index+1])throw new Error('Pass --out with an empty local directory.');console.log(JSON.stringify(await seedAdminDemo(process.argv[index+1])));}
