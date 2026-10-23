"use client";
import {useRef,useState} from 'react';
import {GraduationCap,Check,AlertCircle,Flag,Send} from 'lucide-react';
import type {EligibilityRequirements} from '../lib/eligibility';
import {experienceLabel,type ExperienceRequirements} from '../lib/experience';
import type {JobView,RequirementCheck} from '../lib/types';
import {communityRequest} from './community';

const labels={met:'Matches',conflict:'Conflict',review:'Review',unstated:'Not stated'};
const shortLabels:Record<string,string>={experience:'Experience',batch:'Batch',degree:'Degree',academics:'Grades',joining:'Joining',duration:'Duration',availability:'Listing'};
export default function EligibilitySummary({requirements,experience,job}:{requirements:EligibilityRequirements|undefined;experience?:ExperienceRequirements;job?:JobView}){
 const fallback:RequirementCheck[]=[{key:'experience',label:'Professional experience',status:'review',requirement:experienceLabel(experience,null),profile:'Open your saved preferences to check',evidence:experience?.evidence||undefined},{key:'batch',label:'Graduation batch',status:'unstated',requirement:requirements?.graduation?.evidence||'Accepted graduation years are not stated',profile:'Confirm on the original listing'}];
 const checks=job?.match.checks||fallback,conflicts=checks.filter(c=>c.status==='conflict').length;
 return <section className="eligibility-summary" aria-label="Eligibility evidence">
  <div className="evidence-heading"><GraduationCap size={19}/><h3>Eligibility</h3><span className={'eligibility-status '+(conflicts?'conflict':job?.match.uncertain?'review':'')}>{conflicts?conflicts+' conflict'+(conflicts===1?'':'s'):job?.match.uncertain?'Needs review':'See requirements'}</span></div>
  <div className="eligibility-pills">{checks.map(check=><span key={check.key} className={check.status} title={check.requirement}><span>{shortLabels[check.key]||check.label}</span><small>{labels[check.status]}</small></span>)}</div>
  <details className="eligibility-details"><summary>View requirements</summary><div className="requirement-checks">{checks.map(check=><article key={check.key} className={'requirement-check '+check.status}>
   <div className="requirement-title"><strong>{check.label}</strong><span>{check.status==='met'?<Check size={13}/>:check.status==='conflict'||check.status==='review'?<AlertCircle size={13}/>:null}{labels[check.status]}</span></div>
   <p>{check.requirement}</p><small>{check.key==='availability'?'Last checked: ':'Your profile: '}{check.key==='availability'&&Number.isFinite(Date.parse(check.profile))?new Date(check.profile).toLocaleString():check.profile}</small>
   {check.evidence&&<details><summary>See source evidence</summary>{check.key==='experience'&&experience?.evidenceItems?.length?experience.evidenceItems.map((item,i)=><blockquote key={i}><small>{item.source==='title'?'Job title':'Job description'}</small>{item.text}</blockquote>):<blockquote>{check.evidence}</blockquote>}</details>}
  </article>)}</div>
  <p className="evidence-limit">Not stated = unconfirmed. Check the full employer criteria.</p></details>
  {job&&<JobFeedback job={job}/>}
 </section>;
}
function JobFeedback({job}:{job:JobView}){
 const requestId=useRef('');
 const [open,setOpen]=useState(false),[message,setMessage]=useState(''),[pending,setPending]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 async function send(){setPending(true);setError('');try{requestId.current||=crypto.randomUUID();await communityRequest('submit',{kind:'help',category:'Job relevance',contextId:requestId.current,rating:null,subject:('Review eligibility: '+job.title).slice(0,120),message:('Job: '+job.title+' at '+job.company+'\n'+job.url+'\n\n'+message.trim()).slice(0,1500)});setSent(true);setMessage('');}catch(e){setError(e instanceof Error?e.message:'Could not send your report. Please try again.');}finally{setPending(false);}}
 return <div className="job-feedback">{sent?<p role="status">Report sent. Replies appear in Help.</p>:<><button type="button" className="text-button" aria-expanded={open} onClick={()=>setOpen(!open)}><Flag size={14}/>Report an issue</button>{open&&<div><label className="field-label">What did we miss?<textarea rows={3} maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what looks wrong."/></label><small>Private message to the NextRole host.</small><button type="button" className="button secondary" disabled={pending||message.trim().length<5} onClick={()=>void send()}><Send size={14}/>{pending?'Sending…':'Send report'}</button></div>}</>}{error&&<p className="form-error" role="alert">{error}</p>}</div>;
}
