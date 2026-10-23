"use client";
import {useEffect,useState} from 'react';
import {ArrowRight,Bookmark,CalendarClock,CheckCheck,AlertCircle,RefreshCw,Sparkles,Flag} from 'lucide-react';
import type {JobView,Profile} from '../lib/types';
import type {CatalogueSummary} from '../lib/catalogue-types';
import type {TodayPlan} from '../lib/today';
import {ScoutHeading} from './trail-scout';

type Props={profile:Profile;matches:JobView[];summary:CatalogueSummary|null|undefined;loading:boolean;lastSync:string|null;refresh:number;onOpen:(id:string)=>void;onBrowse:(review?:boolean)=>void;onSaved:()=>void;onApplications:()=>void;onProfile:()=>void;onHelp:()=>void;onSurvey?:()=>void};
function when(value:string){return new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});}
export default function Today({profile,matches,summary,loading,lastSync,refresh,onOpen,onBrowse,onSaved,onApplications,onProfile,onHelp,onSurvey}:Props){
 const [state,setState]=useState<TodayPlan|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[busy,setBusy]=useState('');
 useEffect(()=>{const abort=new AbortController();setState(null);setError('');fetch('/api/today',{signal:abort.signal,cache:'no-store'}).then(async r=>{const d=await r.json() as TodayPlan&{error?:string};if(!r.ok)throw new Error(d.error||'Could not load your next actions.');if(!abort.signal.aborted)setState(d);}).catch(e=>{if(!abort.signal.aborted)setError(e.message||'Could not load your next actions.');});return()=>abort.abort();},[refresh,retry]);
 async function dismiss(jobId:string){setBusy(jobId);try{const r=await fetch('/api/app',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'dismiss-intent',jobId})});if(!r.ok)throw new Error('Could not dismiss this reminder. Try again.');setRetry(n=>n+1);}catch(e){setError(e instanceof Error?e.message:'Try again.');}finally{setBusy('');}}
 const counts=summary?.counts,fresh=lastSync&&Date.now()-Date.parse(lastSync)<24*3600000;
 return <div className="today-page">
  <ScoutHeading pose="applications" title="Your next small step."><div className="preference-chips">{profile.roles.slice(0,2).map(role=><span key={role}>{role}</span>)}<span>{profile.experience===0?'Fresher':profile.experience+' years'}</span><button type="button" onClick={onProfile}>Edit profile</button></div></ScoutHeading>
  <div className="today-links"><button onClick={()=>onBrowse()}><Sparkles size={18}/><span><strong>{counts?.discover??'—'}</strong>matches</span><ArrowRight size={16}/></button><button onClick={onSaved}><Bookmark size={18}/><span><strong>{counts?.interested??'—'}</strong>saved</span><ArrowRight size={16}/></button><button onClick={onApplications}><CheckCheck size={18}/><span><strong>{counts?.applications??'—'}</strong>applied</span><ArrowRight size={16}/></button></div>
  <section className="today-section"><div className="today-section-heading"><h2>Next steps</h2><button className="text-button" disabled={!!busy} onClick={()=>setRetry(n=>n+1)} aria-label="Refresh next steps"><RefreshCw size={15}/></button></div>
   {error&&<p className="form-error" role="alert">{error} <button className="text-button" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}
   {!state&&!error?<p role="status">Loading…</p>:state&&!state.actions.length?<div className="today-quiet"><CalendarClock size={23}/><strong>All caught up.</strong></div>:<div className="today-action-list">{state?.actions.map(action=><article key={action.id} className={'today-action '+action.kind}><span className="today-action-icon">{action.kind==='changed'||action.kind==='queue'?<AlertCircle size={19}/>:action.kind==='confirm'?<CheckCheck size={19}/>:<CalendarClock size={19}/>}</span><div><span className="today-action-label">{action.kind==='confirm'?'Did you apply?':action.label}</span><h3>{action.title}</h3><p>{action.company}{action.date?' · '+when(action.date):''}</p><details><summary>Details</summary><small>{action.detail}</small></details></div><div className="today-action-buttons"><button className="button secondary" onClick={()=>onOpen(action.jobId)}>{action.kind==='confirm'?'Update':'Review'}<ArrowRight size={14}/></button>{action.kind==='confirm'&&<button className="text-button" disabled={!!busy} onClick={()=>void dismiss(action.jobId)}>Not yet</button>}</div></article>)}</div>}
   {state?.hasMore&&<button className="text-button" onClick={onApplications}>View applications<ArrowRight size={14}/></button>}
  </section>
  <section className="today-section"><div className="today-section-heading"><h2>Picked for you</h2><button className="text-button" onClick={()=>onBrowse()}>View all<ArrowRight size={14}/></button></div>
   {loading?<p role="status">Finding matches…</p>:matches.length?<div className="today-match-list">{matches.slice(0,5).map(job=><button className="today-match" key={job.key} onClick={()=>onOpen(job.id)}><span className="today-company" aria-hidden="true">{job.company.slice(0,2).toUpperCase()}</span><span><strong>{job.title}</strong><small>{job.company} · {job.location}</small></span><ArrowRight size={18}/></button>)}</div>:<div className="today-quiet"><Sparkles size={23}/><div><strong>No matches yet.</strong><button className="text-button" onClick={()=>onBrowse(true)}>Explore Needs review<ArrowRight size={14}/></button></div></div>}
   <p className={'today-source-note '+(!fresh?'needs-check':'')}><AlertCircle size={14}/>{lastSync?'Sources checked '+when(lastSync):'Sources need a check.'}</p>
  </section>
  <div className="today-footer"><button className="text-button" onClick={onHelp}><Flag size={14}/>Help & feedback</button>{onSurvey&&<button className="text-button" onClick={onSurvey}>Monthly check-in</button>}</div>
 </div>;
}
