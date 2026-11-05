import './admin-demo-runtime.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const {demoDataset}=await import('../lib/admin-demo-data.ts');
const {demoAdminReport}=await import('../lib/admin-demo.ts');
const {seedAdminDemo}=await import('./seed-admin-demo.mjs');
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const today='2026-11-06',data=demoDataset(today),now=new Date(today+'T15:30:00Z');
check(data.profiles.length===1040,'Exactly 1,040 fictional profiles');
check(new Set(data.profiles.map(p=>p.userId)).size===1040&&new Set(data.profiles.map(p=>p.name)).size===1040,'IDs and names are unique');
check(data.profiles.every(p=>p.email.endsWith('@example.invalid')&&p.dataMode==='synthetic'&&!p.data.alerts&&!p.data.reminders),'Reserved addresses, labels and no alert consent');
const reviews=data.feedback.filter(f=>f.rating!==null);
check(reviews.length===1040&&new Set(reviews.map(f=>f.userId)).size===1040,'One rated sample per profile');
check(reviews.reduce((n,f)=>n+f.rating,0)/reviews.length===4.3,'Explicit 4.3/5 test scenario reconciles');
check([1,2,3,4,5].every(r=>reviews.some(f=>f.rating===r)),'Mixed ratings');
check(data.events.every(e=>data.profiles.find(p=>p.userId===e.userId)?.analyticsEnabled),'Opt-outs excluded from events');
const output=await mkdtemp(path.join(os.tmpdir(),'nextrole-synthetic-test-'));
try{
 const receipt=await seedAdminDemo(output,today),db=new DatabaseSync(receipt.databasePath,{readOnly:true});
 try{
  const scalar=(sql,...values)=>Object.values(db.prepare(sql).get(...values))[0];
  check(scalar('SELECT COUNT(*) FROM profiles')===1040,'SQLite profile count');
  check(scalar('SELECT AVG(rating) FROM feedback WHERE rating IS NOT NULL')===4.3,'SQLite rating matches scenario');
  for(const days of [7,30,90]){
   const r=demoAdminReport(days,now),start=r.start;
   check(r.analytics.dataMode==='demo'&&r.demoRecords.profiles===1040&&r.operations===null,'Demo provenance, never live operation data');
   check(r.analytics.comparison.current.students===scalar("SELECT COUNT(DISTINCT user_id) FROM product_events WHERE kind='workspace_open' AND day>=?",start),'Active users reconcile to SQL for '+days);
   check(r.analytics.time.seconds===scalar('SELECT SUM(seconds) FROM product_activity_days WHERE day>=?',start),'Active time reconciles to SQL for '+days);
   check(r.ratings.count===scalar('SELECT COUNT(*) FROM feedback WHERE rating IS NOT NULL AND created_at>=?',start),'Selected-period rating denominator');
   const average=scalar('SELECT AVG(rating) FROM feedback WHERE rating IS NOT NULL AND created_at>=?',start);check(r.ratings.average===average,'Selected-period rating average');
   check(r.analytics.frequency.reduce((n,f)=>n+f.students,0)===r.analytics.comparison.current.students,'Frequency denominator');
   check(r.analytics.lifecycle.reduce((n,g)=>n+g.students,0)===r.analytics.coverage.observed,'Lifecycle reconciles to observed population');
   check(r.daily.at(-1).active===r.active.dau&&r.active.dau<=r.active.wau&&r.active.wau<=r.active.mau,'DAU/WAU/MAU consistency');
   check(r.analytics.stages.reduce((n,s)=>n+s.count,0)===r.applicationValue.confirmations,'Stage count equals application records');
   for(const row of r.features)check(row.students<=r.analytics.comparison.current.students&&row.uses===scalar('SELECT COUNT(*) FROM product_events WHERE kind=? AND day>=?',row.kind,start),'Feature count and adoption denominator');
   for(const row of r.analytics.retention){const exact=scalar("SELECT COUNT(*) FROM product_people p WHERE p.first_day>=? AND p.first_day<=date(?,'-'||?||' days') AND EXISTS(SELECT 1 FROM product_events e WHERE e.user_id=p.user_id AND e.kind='workspace_open' AND e.day=date(p.first_day,'+'||?||' days'))",start,today,row.offset,row.offset);check(row.returned===exact&&row.returned<=row.eligible,'Mature exact-day retention');}
   const j=r.analytics.journey;check(j.visited>=j.viewed&&j.viewed>=j.opened&&j.opened>=j.applied,'Ordered journey is monotonic');
  }
  for(const table of ['digest_settings','digest_outbox','subscriptions','push_outbox','google_accounts','api_slots','automation_queue'])check(scalar('SELECT COUNT(*) FROM '+table)===0,'Empty operational table '+table);
 }finally{db.close();}
 const writable=new DatabaseSync(receipt.databasePath);try{assert.throws(()=>writable.prepare('INSERT INTO digest_settings(user_id,email,enabled,revision,unsubscribe_token,updated_at) VALUES(?,?,?,?,?,?)').run('synthetic:student:0001','aarav@example.invalid',1,'r','t',now.toISOString()),/Synthetic demo database/);checks++;}finally{writable.close();}
 await assert.rejects(seedAdminDemo(output,today),/empty output directory/);checks++;
 const host=await readFile(new URL('../app/api/host/route.ts',import.meta.url),'utf8');check(host.indexOf('if(!isHost(user))')<host.indexOf("p.get('mode')==='demo'"),'Private demo API retains host guard');
 console.log(JSON.stringify({passed:true,checks,profiles:1040,ratedSamples:1040,sqlReconciliation:true,productionWrites:0,outboundRecipients:0}));
}finally{await rm(output,{recursive:true,force:true});}
