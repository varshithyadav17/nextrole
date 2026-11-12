import {PDFDocument} from 'pdf-lib';
import {writeFileSync} from 'node:fs';
export async function verifyCombinedAnalytics({database,check}){
 const {analyticsBaseline}=await import('../lib/combined-baseline.ts'),{hostMetrics,recordedHostMetrics,hostInbox}=await import('../lib/host-metrics.ts'),{indiaDay,shiftDay}=await import('../lib/product.ts'),{buildAdminPDF}=await import('../lib/admin-pdf.ts');
 const baseline=await analyticsBaseline();check(baseline?.source.profileRows===3&&baseline.versions===2,'The combined baseline chooses the detailed version rather than adding a directory copy again.');
 const owner='combined-owner',actor='combined-new-account',today=indiaDay(),first=shiftDay(today,-8),due=shiftDay(today,-1),before=await recordedHostMetrics(90,owner),initial=await hostMetrics(90,owner),start=shiftDay(today,-89);
 const sourceUsers=new Set(baseline.activity.filter(a=>a.day>=start&&a.day<=today).map(a=>a.user));
 const accountsBefore=await database.prepare('WITH accounts AS (SELECT user_id FROM profiles UNION SELECT user_id FROM google_accounts UNION SELECT user_id FROM email_accounts UNION SELECT user_id FROM product_people) SELECT COUNT(*) as n FROM accounts WHERE user_id<>?').bind(owner).first();
 check(initial.sourceInfo.profileRecords===accountsBefore.n+3,'Combined profile records include one imported baseline and current app accounts.');
 check(initial.analytics.comparison.current.students===before.analytics.comparison.current.students+sourceUsers.size,'Dated source activity and app activity contribute to the same active-profile total.');
 const firstStamp=first+'T12:00:00.000Z',stamp=today+'T12:00:00.000Z';
 await database.prepare('INSERT INTO profiles(user_id,data,created_at,updated_at) VALUES(?,?,?,?)').bind(actor,JSON.stringify({name:'User 1',completed:true}),firstStamp,stamp).run();
 await database.prepare('INSERT INTO product_people(user_id,first_seen,last_seen,first_day,initial_completed) VALUES(?,?,?,?,1)').bind(actor,firstStamp,stamp,first).run();
 const events=[['workspace_open',first],['workspace_open',due],['workspace_open',today],['job_view',today],['saved',today],['apply_open',today],['applied',today],['fit_check',today],['scout_score',today],['stage_updated',today]];
 for(const [i,[kind,day]] of events.entries())await database.prepare('INSERT INTO product_events(id,user_id,kind,day,created_at) VALUES(?,?,?,?,?)').bind('combined-event-'+i,actor,kind,day,day+'T12:00:00.000Z').run();
 await database.prepare('INSERT INTO product_activity_days(user_id,day,section,seconds) VALUES(?,?,?,?)').bind(actor,due,'discover',30).run();await database.prepare('INSERT INTO product_activity_days(user_id,day,section,seconds) VALUES(?,?,?,?)').bind(actor,today,'discover',90).run();
 const rating=(id,value,message)=>database.prepare('INSERT INTO feedback(id,user_id,kind,context_id,rating,category,subject,message,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,actor,'apply',id,value,'Usability','Combined live feedback',message,stamp,stamp).run();
 await rating('combined-review-one',1,'New app response');
 try{
  const report=await hostMetrics(90,owner),recorded=await recordedHostMetrics(90,owner),total=await database.prepare('SELECT COUNT(*) as n,COALESCE(SUM(rating),0) as sum FROM feedback WHERE rating BETWEEN 1 AND 5 AND user_id<>?').bind(owner).first(),sourceSum=baseline.source.distribution.reduce((sum,r)=>sum+r.rating*r.count,0);
  check(report.sourceInfo.profileRecords===initial.sourceInfo.profileRecords+1,'A newly created account grows the combined count without modifying or duplicating the imported identities.');
  check(report.analytics.comparison.current.students===initial.analytics.comparison.current.students+1,'New activity grows the unified active total automatically.');
  check(report.ratings.count===total.n+baseline.source.ratingCount&&report.ratings.average===(total.sum+sourceSum)/(total.n+baseline.source.ratingCount),'Combined ratings use the sum and count of responses, not an average of source averages.');
  check(report.features.find(f=>f.kind==='resume_check').students===(new Set(baseline.activity.filter(a=>a.day>=start&&a.day<=today&&a.features.includes('resume_check')).map(a=>a.user))).size+1,'Different app résumé-check actions count the same account once for adoption.');
  check(report.analytics.retention[1].eligible===initial.analytics.retention[1].eligible+1&&report.analytics.retention[1].returned===initial.analytics.retention[1].returned+1,'A new mature app cohort contributes to the same Day-7 numerator and denominator.');
  check(initial.analytics.retention[1].eligible===baseline.source.retention.eligible+before.analytics.retention[1].eligible,'Imported cohort maturity remains limited to the source observation window.');
  const sourceTimes=new Map();for(const a of baseline.activity.filter(a=>a.day>=start&&a.day<=today&&a.minutes>0))sourceTimes.set(a.user,(sourceTimes.get(a.user)||0)+a.minutes*60);
  const appTimes=(await database.prepare('SELECT SUM(seconds) as seconds FROM product_activity_days WHERE day>=? AND day<=? AND user_id<>? GROUP BY user_id').bind(start,today,owner).all()).results.map(t=>t.seconds),times=[...appTimes,...sourceTimes.values()].sort((a,b)=>a-b),median=times.length%2?times[(times.length-1)/2]:(times[times.length/2-1]+times[times.length/2])/2;
  check(report.analytics.time.medianSeconds===median&&report.analytics.time.seconds===recorded.analytics.time.seconds+[...sourceTimes.values()].reduce((s,t)=>s+t,0),'Time totals and the median are recomputed over available profile estimates.');
  const filters={page:0,kind:'all',status:'all',category:'all',q:''},sourceInbox=await hostInbox({...filters,q:'A useful review'}),liveInbox=await hostInbox({...filters,q:'New app response'});
  check(sourceInbox.items.some(i=>i.kind==='imported'&&i.message==='A useful review')&&liveInbox.items.some(i=>i.kind==='apply'&&i.message==='New app response'),'The same feedback inbox searches imported responses and incoming app feedback.');
  const beforeNext=report.ratings.average;await rating('combined-review-two',5,'Another app response');const next=await hostMetrics(90,owner);
  check(next.ratings.count===report.ratings.count+1&&next.ratings.average!==beforeNext,'Later feedback updates the combined rating without reimporting the workbook.');
  check(next.sourceInfo.origin==='Database backup'&&next.sourceInfo.fileName==='NextRole_Activity_Backup.xlsx'&&!JSON.stringify(next).includes('private-test-placeholder'),'Totals use neutral backup labels without exposing password columns.');
  const pdf=await PDFDocument.load(await buildAdminPDF(next,'all'));check(pdf.getTitle()==='NextRole / Product analytics','Exported reports use the regular NextRole analytics title.');
  const replay=await hostMetrics(90,owner);check(replay.sourceInfo.profileRecords===next.sourceInfo.profileRecords&&replay.ratings.count===next.ratings.count,'Refreshing the dashboard never inserts another copy of the baseline.');
  if(process.env.NEXTROLE_COMBINED_QA_REPORT)writeFileSync(process.env.NEXTROLE_COMBINED_QA_REPORT,JSON.stringify(next),{flag:'wx'});
  await database.prepare('INSERT INTO email_accounts(email,user_id,password_hash,user_data,created_at) VALUES(?,?,?,?,?)').bind('linked-count@example.test',actor,'isolated-unusable-test-hash',JSON.stringify({userId:actor,email:'linked-count@example.test',displayName:'Fixture'}),stamp).run();
  const linked=await hostMetrics(90,owner);check(linked.sourceInfo.profileRecords===next.sourceInfo.profileRecords,'Adding another sign-in method for an existing account never counts it twice.');
  await database.prepare('INSERT INTO email_accounts(email,user_id,password_hash,user_data,created_at) VALUES(?,?,?,?,?)').bind('signup-count@example.test','email:combined-signup','isolated-unusable-test-hash',JSON.stringify({userId:'email:combined-signup',email:'signup-count@example.test',displayName:'Fixture'}),stamp).run();
  const signedUp=await hostMetrics(90,owner);check(signedUp.sourceInfo.profileRecords===next.sourceInfo.profileRecords+1&&signedUp.analytics.comparison.current.students===next.analytics.comparison.current.students,'Registration grows the combined account total before profile completion without inventing activity.');
 }finally{
  await database.prepare('DELETE FROM email_accounts WHERE user_id IN (?,?)').bind('email:combined-signup',actor).run();await database.prepare('DELETE FROM feedback WHERE user_id=?').bind(actor).run();await database.prepare('DELETE FROM product_events WHERE user_id=?').bind(actor).run();await database.prepare('DELETE FROM product_people WHERE user_id=?').bind(actor).run();await database.prepare('DELETE FROM product_activity_days WHERE user_id=?').bind(actor).run();await database.prepare('DELETE FROM profiles WHERE user_id=?').bind(actor).run();
 }
}
