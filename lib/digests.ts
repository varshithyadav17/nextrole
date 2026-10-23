import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,one,rows,getProfile,getJob} from './store';
import {scanJobs} from './job-scan';
import {matchesView} from './job-selection';
import {isSafeJobUrl} from './matching';
import {acquireLease,releaseLease} from './lease';
import {boundedJSON} from './http-json';
import {PublicError} from './errors';
import {digest} from './keyring';
type Settings={user_id:string;email:string;enabled:number;revision:string;unsubscribe_token:string;last_sent_at:string|null;updated_at:string};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function csvLine(values:string[]){return values.map(value=>'"'+(/^[\s]*[=+@-]/.test(value)?"'":'')+value.replace(/"/g,'""')+'"').join(',')+'\r\n';}
function base64(value:string){const bytes=new TextEncoder().encode(value);let binary='';for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192));return btoa(binary);}
export function mailReady(){return env.NEXTROLE_MAIL_APPROVAL==='approved'&&!!env.NEXTROLE_MAIL_API_KEY&&z.string().email().safeParse(env.NEXTROLE_MAIL_FROM).success&&!!env.NEXTROLE_PUBLIC_URL&&isSafeJobUrl(env.NEXTROLE_PUBLIC_URL)&&new URL(env.NEXTROLE_PUBLIC_URL).protocol==='https:';}
export function mailDailyBudget(){const value=Number(env.NEXTROLE_MAIL_DAILY_BUDGET||50);return Number.isInteger(value)&&value>=1&&value<=100000?value:50;}
export async function mailStatus(now=new Date()){
 const day=new Date(now.getTime()+330*60000).toISOString().slice(0,10),[people,outbox,usage,remaining]=await Promise.all([
  one<{n:number}>('SELECT COUNT(*) as n FROM digest_settings WHERE enabled=1'),
  rows<{state:string;count:number}>('SELECT state,COUNT(*) as count FROM digest_outbox WHERE day=? GROUP BY state',day),
  one<{value:string}>('SELECT value FROM meta WHERE key=?','mail_budget:'+day),
  one<{n:number}>("SELECT COUNT(*) as n FROM digest_settings d WHERE d.enabled=1 AND NOT EXISTS(SELECT 1 FROM digest_outbox o WHERE o.user_id=d.user_id AND o.day=?)",day)
 ]);const used=Number(usage?.value||0),budget=mailDailyBudget();return {ready:mailReady(),day,subscribers:people?.n||0,outbox,remaining:remaining?.n||0,budget,used,budgetExhausted:used>=budget,notice:'Provider acceptance is not inbox delivery. Counts contain no recipient identities.'};
}
export async function digestSettings(userId:string){
 const settings=await one<Settings>('SELECT * FROM digest_settings WHERE user_id=?',userId);
 const recent=await rows<{day:string;state:string;updated_at:string}>('SELECT day,state,updated_at FROM digest_outbox WHERE user_id=? ORDER BY day DESC LIMIT 7',userId);
 return {enabled:!!settings?.enabled,email:settings?.email||null,lastSentAt:settings?.last_sent_at||null,ready:mailReady(),recent,schedule:'Daily after 9 PM Asia/Kolkata when the host’s nightly delivery task runs. No inbox connection is required.'};
}
export async function saveDigestSettings(userId:string,email:string,enabled:boolean){
 const address=z.string().email().max(254).parse(email),now=new Date().toISOString();
 await db().batch([
  db().prepare('INSERT INTO digest_settings(user_id,email,enabled,revision,unsubscribe_token,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,enabled=excluded.enabled,revision=excluded.revision,updated_at=excluded.updated_at').bind(userId,address,Number(enabled),crypto.randomUUID(),crypto.randomUUID(),now),
  db().prepare("DELETE FROM digest_outbox WHERE user_id=? AND state='queued'").bind(userId),
 ]);
 return digestSettings(userId);
}
export async function unsubscribeDigest(token:string){
 z.string().uuid().parse(token);const settings=await one<Settings>('SELECT * FROM digest_settings WHERE unsubscribe_token=?',token);if(!settings)return;
 const lease=await acquireLease('byok_mutation:'+settings.user_id,90000);if(!lease)throw new PublicError('Delivery is being processed. Please try unsubscribing again in a moment.',409);
 try{await db().batch([db().prepare('UPDATE digest_settings SET enabled=0,revision=?,updated_at=? WHERE user_id=? AND unsubscribe_token=?').bind(crypto.randomUUID(),new Date().toISOString(),settings.user_id,token),db().prepare("DELETE FROM digest_outbox WHERE user_id=? AND state='queued'").bind(settings.user_id)]);}finally{await releaseLease(lease);}
}
export async function buildDigest(userId:string,since:string,until=new Date(),unsubscribeUrl=''){
 const profile=await getProfile(userId),selected:{id:string;score:number;firstSeen:string}[]=[],csv=[csvLine(['Company','Role','Location','Type','Reported skills','Deadline','Source / application URL','Source','First discovered (UTC)'])];let total=0,scanned=0,csvBytes=0;
 if(profile.completed)for await(const {job} of scanJobs(userId,profile)){
  if(++scanned>20000)throw new PublicError('The catalogue exceeds the safe digest budget. Ask the host to review capacity.',503);
  if(job.provenance?.kind==='user-import'||!job.active||job.status||!isSafeJobUrl(job.url)||!matchesView(job.match)||job.deadline&&!(Date.parse(job.deadline)>until.getTime())||Date.parse(job.firstSeen)<=Date.parse(since)||Date.parse(job.firstSeen)>until.getTime())continue;
  const line=csvLine([job.company,job.title,job.location,job.jobType,job.skills.join(', '),job.deadline||'Unknown',job.url,job.provenance?.kind==='job-board-api'?'Jobicy':job.sourceUrl,job.firstSeen]);csvBytes+=new TextEncoder().encode(line).byteLength;if(csvBytes>4*1024*1024)throw new PublicError('The full matching-job attachment exceeds the current email budget. No partial digest was sent. Ask the host to review capacity.');csv.push(line);
  total++;selected.push({id:job.id,score:job.match.score,firstSeen:job.firstSeen});selected.sort((a,b)=>b.score-a.score||b.firstSeen.localeCompare(a.firstSeen));if(selected.length>20)selected.pop();
 }
 const jobs=[];for(const item of selected){const job=await getJob(userId,item.id,profile);if(job&&isSafeJobUrl(job.url))jobs.push(job);}
 const day=until.toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'long',year:'numeric'}),subject='NextRole · '+total+' new matching '+(total===1?'opportunity':'opportunities')+' · '+day;
 const intro='First discovered between '+new Date(since).toISOString()+' and '+until.toISOString()+'. These are discovery times, not claimed posting dates. Showing '+jobs.length+' detailed highlights; all '+total+' matching jobs and source links are included in the CSV attachment. No AI call was made.';
 const articles=jobs.map(job=>'<article style="padding:22px 0;border-bottom:1px solid #dadfd9"><h2 style="font-size:20px;margin:0 0 6px">'+escape(job.title)+'</h2><p>'+escape(job.company+' · '+job.location+' · '+job.jobType)+'</p><p>'+escape(job.description.slice(0,500))+(job.description.length>500?'…':'')+'</p><p><strong>Skills reported:</strong> '+escape(job.skills.join(', ')||'Not specified')+'</p><p><strong>Deadline:</strong> '+escape(job.deadline||'Not provided')+'</p><a href="'+escape(job.url)+'">'+(job.provenance?.kind==='job-board-api'?'Source: Jobicy · view listing':'View source and application')+'</a></article>').join('');
 const text=[subject,intro,...jobs.map(job=>[job.title,job.company+' · '+job.location,job.description.slice(0,500),'Skills reported: '+(job.skills.join(', ')||'Not specified'),job.url].join('\n')),unsubscribeUrl?'Unsubscribe: '+unsubscribeUrl:'Preview only; no email was sent.'].join('\n\n');
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+escape(subject)+'</title><body style="margin:0;background:#f4f3ec;color:#18392d;font-family:Arial,sans-serif"><main style="max-width:650px;margin:auto;padding:32px 24px"><p style="letter-spacing:3px">NEXTROLE / YOUR DAILY RADAR</p><h1>Your next opportunity,<br>worth a closer look.</h1><p>'+escape(day)+'</p><p>'+escape(intro)+'</p>'+(articles||'<p>No new verified matches were found in this window. Empty digests are not emailed.</p>')+'<p>Availability can change. Recheck the source, full JD and eligibility before applying.</p>'+(unsubscribeUrl?'<p><a href="'+escape(unsubscribeUrl)+'">Unsubscribe from the daily digest</a></p>':'<p>Preview only. No email was sent.</p>')+'</main></body></html>';
 return {subject,html,text,total,count:jobs.length,until:until.toISOString(),attachment:{filename:'NextRole_matching_jobs_'+until.toISOString().slice(0,10)+'.csv',content:base64(csv.join(''))}};
}
async function reserveMailBudget(day:string){const result=await db().prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=CAST(meta.value AS INTEGER)+1 WHERE CAST(meta.value AS INTEGER)<?').bind('mail_budget:'+day,'1',mailDailyBudget()).run();return !!result.meta.changes;}
/** Owner-authorized MCP task invokes this bounded worker after 21:00 IST. */
export async function drainDigests(now=new Date()){
 if(!mailReady())return {configured:false,processed:0,accepted:0,pending:false,delivery:await mailStatus(now)};
 const local=new Date(now.getTime()+330*60000),day=local.toISOString().slice(0,10);if(local.getUTCHours()<21)return {configured:true,processed:0,accepted:0,pending:false,waitingForNight:true};
 const lease=await acquireLease('digest_delivery',90000);if(!lease)return {configured:true,processed:0,accepted:0,pending:true,busy:true};
 let processed=0,accepted=0;
 try{
  const people=await rows<Settings>("SELECT d.* FROM digest_settings d WHERE d.enabled=1 AND NOT EXISTS(SELECT 1 FROM digest_outbox o WHERE o.user_id=d.user_id AND o.day=?) AND NOT EXISTS(SELECT 1 FROM digest_outbox pending WHERE pending.user_id=d.user_id AND pending.state='sending') ORDER BY d.user_id LIMIT 5",day);
  for(const person of people){
   const workspace=await acquireLease('byok_mutation:'+person.user_id,90000);if(!workspace)continue;
   try{
    const active=await one<Settings>('SELECT * FROM digest_settings WHERE user_id=? AND revision=? AND enabled=1',person.user_id,person.revision);if(!active)continue;
    const since=active.last_sent_at||new Date(now.getTime()-86400000).toISOString(),url=new URL('/api/digest/unsubscribe',env.NEXTROLE_PUBLIC_URL);url.searchParams.set('token',active.unsubscribe_token);
    const content=await buildDigest(person.user_id,since,now,url.toString());
    if(content.count&&!await reserveMailBudget(day))return {configured:true,processed,accepted,pending:false,budgetExhausted:true,delivery:await mailStatus(now)};
    const timestamp=new Date().toISOString();
    const inserted=await db().prepare("INSERT INTO digest_outbox(user_id,day,revision,state,data,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM digest_settings WHERE user_id=? AND revision=? AND enabled=1) AND EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?) ON CONFLICT(user_id,day) DO NOTHING").bind(person.user_id,day,person.revision,content.count?'sending':'empty',JSON.stringify({count:content.count,total:content.total,until:content.until}),timestamp,timestamp,person.user_id,person.revision,workspace.key,workspace.value).run();
    if(!inserted.meta.changes)continue;processed++;
    if(!content.count)continue;
    let state='uncertain',providerId:string|null=null;
    try{
     const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'Authorization':'Bearer '+env.NEXTROLE_MAIL_API_KEY,'Content-Type':'application/json','Idempotency-Key':'nextrole-digest-'+await digest(person.user_id)+'-'+day},body:JSON.stringify({from:env.NEXTROLE_MAIL_FROM,to:[person.email],subject:content.subject,html:content.html,text:content.text,attachments:[content.attachment],headers:{'List-Unsubscribe':'<'+url.toString()+'>','List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}})});
     const result=await boundedJSON(response,16000) as {id?:unknown};if(response.ok&&typeof result.id==='string'){state='accepted';providerId=result.id;accepted++;}else if(response.status>=400&&response.status<500)state='rejected';
    }catch{/* Ambiguous acceptance is never retried automatically. */}
    if(state!=='accepted')await db().prepare('UPDATE digest_settings SET enabled=0,updated_at=? WHERE user_id=? AND revision=?').bind(new Date().toISOString(),person.user_id,person.revision).run();
    await db().batch([db().prepare('UPDATE digest_outbox SET state=?,data=?,updated_at=? WHERE user_id=? AND day=? AND revision=?').bind(state,JSON.stringify({count:content.count,total:content.total,until:content.until,providerId}),new Date().toISOString(),person.user_id,day,person.revision),db().prepare("UPDATE digest_settings SET last_sent_at=? WHERE user_id=? AND revision=? AND ?='accepted'").bind(content.until,person.user_id,person.revision,state)]);
   }catch{
    // A single oversized or invalid workspace must not stall other recipients or cause an unbounded retry loop.
    const timestamp=new Date().toISOString();await db().batch([
     db().prepare("INSERT INTO digest_outbox(user_id,day,revision,state,data,created_at,updated_at) SELECT ?,?,?,'preparation-failed','{}',?,? WHERE EXISTS(SELECT 1 FROM digest_settings WHERE user_id=? AND revision=?) AND EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?) ON CONFLICT(user_id,day) DO NOTHING").bind(person.user_id,day,person.revision,timestamp,timestamp,person.user_id,person.revision,workspace.key,workspace.value),
     db().prepare('UPDATE digest_settings SET enabled=0,updated_at=? WHERE user_id=? AND revision=? AND EXISTS(SELECT 1 FROM meta WHERE key=? AND value=?)').bind(timestamp,person.user_id,person.revision,workspace.key,workspace.value),
    ]);
   }finally{await releaseLease(workspace);}
  }
  const left=await one<{n:number}>("SELECT COUNT(*) as n FROM digest_settings d WHERE d.enabled=1 AND NOT EXISTS(SELECT 1 FROM digest_outbox o WHERE o.user_id=d.user_id AND o.day=?)",day);
  return {configured:true,processed,accepted,pending:!!left?.n,delivery:await mailStatus(now)};
 }finally{await releaseLease(lease);}
}
