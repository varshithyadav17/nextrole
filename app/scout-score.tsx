"use client";
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
export function ScoutResume({kitId,onReview,onEdit}:{kitId:string;onReview?:()=>void;onEdit?:()=>void}){
 return <section className="scout-resume-card"><span className="scout-document-icon"><FileText size={24}/></span><div><span className="scout-card-eyebrow">SAVED RÉSUMÉ DRAFT</span><h3>Ready for your review</h3><p>Your NextRole template. Your reviewed facts.</p></div><div className="scout-downloads"><a className="button primary" href={'/api/preparation?kitId='+encodeURIComponent(kitId)+'&format=pdf'}><Download size={15}/>Download PDF</a>{onEdit&&<button className="button secondary" onClick={onEdit}>Edit details</button>}{onReview&&<button className="button secondary" onClick={onReview}>Review details</button>}<a className="scout-latex-link" href={'/api/preparation?kitId='+encodeURIComponent(kitId)+'&format=txt'}>LaTeX code .txt</a><a className="scout-latex-link" href={'/api/preparation?kitId='+encodeURIComponent(kitId)+'&format=tex'}>.tex</a></div></section>;
}
