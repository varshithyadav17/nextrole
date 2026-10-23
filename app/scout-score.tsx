"use client";
import {useEffect,useState} from 'react';
import {Check,ChevronRight,FileText,Download,Sparkles} from 'lucide-react';
import type {ResumeCheck} from '../lib/resume-check';
export function ScoutScore({check,onImprove}:{check:ResumeCheck;onImprove:()=>void}){
 const score=check.score,coverage=check.matched.length+check.missing.length;
 return <section className="scout-score" aria-label="Résumé and job-description compatibility">
  <div className="scout-score-heading"><div className="scout-score-ring" role="img" aria-label={score===null?'Insufficient recognised JD skills':score+' out of 100, internal compatibility'}><svg viewBox="0 0 88 88" aria-hidden="true"><circle cx="44" cy="44" r="37"/><circle cx="44" cy="44" r="37" pathLength="100" strokeDasharray={(score||0)+' 100'}/></svg><strong>{score===null?'—':score}<small>/100</small></strong></div><div><span className="scout-card-eyebrow">ATS / JD FIT</span><h3>{score===null?'More JD detail needed':score>=80?'A strong starting point':score>=55?'Some useful overlap':'Let’s review the gaps'}</h3><p>{coverage?check.matched.length+' of '+coverage+' recognised skills evidenced':'No recognised JD skills to score yet'}</p></div></div>
  {!!check.matched.length&&<div className="scout-skill-group"><h4><Check size={14}/>Present in your résumé</h4><div>{check.matched.map(skill=><span key={skill}>{skill}</span>)}</div></div>}
  {!!check.missing.length&&<div className="scout-skill-group needs-review"><h4>Check your evidence</h4><div>{check.missing.map(skill=><span key={skill}>{skill}</span>)}</div><p>Only add a skill if it reflects your actual experience.</p></div>}
  {!!check.tips?.length&&<div className="scout-improvement-tips"><h4>Worth improving</h4><ul>{check.tips.map(tip=><li key={tip.title}><strong>{tip.title}</strong><span>{tip.detail}</span></li>)}</ul></div>}
  <details className="scout-score-details"><summary>How this score works<ChevronRight size={14}/></summary><p>{check.formula}</p><ul>{check.checks.map(c=><li key={c.label}><span>{c.pass?'✓':'○'}</span>{c.label}</li>)}</ul><p>{check.notice}</p></details>
  <button className="scout-inline-action" onClick={onImprove}><Sparkles size={15}/>Improve my résumé<ChevronRight size={15}/></button>
  <small className="scout-score-limit">Internal JD match, not an employer ATS score.</small>
 </section>;
}
export function ScoutResume({kitId,onReview,onEdit,onFit}:{kitId:string;onReview?:()=>void;onEdit?:()=>void;onFit?:()=>void}){
 const [layout,setLayout]=useState<{pages:number;omitted:string[]}|null>(null),[error,setError]=useState(''),[preview,setPreview]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLayout(null);setError('');fetch('/api/preparation?kitId='+encodeURIComponent(kitId)+'&layout=1',{cache:'no-store'}).then(async r=>{const value=await r.json() as {pages?:number;omitted?:unknown;error?:string};if(!r.ok||!Number.isInteger(value.pages)||!value.pages||value.pages<1)throw new Error(value.error||'Could not check the page count.');if(active)setLayout({pages:value.pages,omitted:Array.isArray(value.omitted)?value.omitted.filter((s):s is string=>typeof s==='string'):[]});}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[kitId,revision]);
 useEffect(()=>{const changed=(event:Event)=>{if((event as CustomEvent<{kitId?:string}>).detail?.kitId===kitId)setRevision(r=>r+1);};window.addEventListener('nextrole-preparation-changed',changed);return()=>window.removeEventListener('nextrole-preparation-changed',changed);},[kitId]);
 const ready=layout?.pages===1,url='/api/preparation?kitId='+encodeURIComponent(kitId);
 return <section className="scout-resume-card"><span className="scout-document-icon"><FileText size={24}/></span><div><span className="scout-card-eyebrow">YOUR RÉSUMÉ DRAFT</span><h3>{layout?ready?'One page. Your template.':layout.pages+' pages — let’s shorten it':'Checking the page count…'}</h3><p>{layout?'Review the draft before you apply.':'Verifying the actual PDF layout.'}</p></div>
 {error&&<p className="scout-layout-error" role="status">{error}<button className="text-button" onClick={()=>setRevision(r=>r+1)}>Try again</button></p>}
 {layout&&!ready&&<div className="scout-page-warning"><p>Keep readable type. Scout can select fewer relevant facts for a new one-page copy.</p>{onFit?<button className="button primary" onClick={onFit}>Make a one-page copy</button>:<small>Use the latest draft in this chat, or build a fresh version.</small>}</div>}
 <div className="scout-downloads">{ready?<><a className="button primary" href={url+'&format=pdf'}><Download size={15}/>Download PDF</a><button className="button secondary" aria-expanded={preview} onClick={()=>setPreview(!preview)}>{preview?'Hide preview':'Preview PDF'}</button><a className="scout-latex-link" href={url+'&format=txt'}>LaTeX .txt</a><a className="scout-latex-link" href={url+'&format=tex'}>.tex</a></>:<button className="button primary" disabled><Download size={15}/>Download PDF</button>}{onEdit&&<button className="button secondary" onClick={onEdit}>Edit details</button>}{onReview&&<button className="button secondary" onClick={onReview}>Review details</button>}</div>
 {!!layout?.omitted?.length&&<details className="scout-selection-details"><summary>{layout.omitted.length} facts kept outside this draft</summary><p>These were left out to keep this version on one page. Your profile and earlier drafts are unchanged.</p><ul>{layout.omitted.map((title,i)=><li key={i}>{title}</li>)}</ul></details>}
 {preview&&ready&&<iframe className="scout-resume-preview" title="Your one-page résumé PDF preview" src={url+'&format=pdf&preview=1'} loading="lazy"/>}
 </section>;
}
