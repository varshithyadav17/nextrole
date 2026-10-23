"use client";
import {ArrowUpRight,ExternalLink,Radio} from 'lucide-react';
import {sourceBoardUrl} from '../lib/job-feeds';
import type {Source} from '../lib/types';
type Health=Source&{run:{success:number;checked_at:string;count:number;error:string|null}|null};
const names={greenhouse:'Greenhouse',lever:'Lever',ashby:'Ashby',jobicy:'Jobicy'};
export default function SourceCatalogue({sources}:{sources:Health[]}){
 return <><div className="source-catalog-heading"><h2>Automatically connected sources</h2><p>Employer feeds and a public job board. Imported listings receive NextRole matching, tracking and alerts; external search links above are separate.</p></div>
 <div className="sources-grid">{sources.map(s=><article className="source-card" key={s.id}>
  <span className="company-logo"><Radio size={22}/></span><div><h3>{s.company}</h3><span>{names[s.provider]} · {s.category==='job-board'?'Public job board':'Employer feed'}</span></div>
  <span className={'source-state '+(s.run?.success?'good':s.run?'issue':'')}><span className={'status-dot '+(s.run?.success?'live':'')}/>{s.run?.success?'Checked':s.run?'Unavailable':'Not checked'}</span>
  <div className="source-info"><p><strong>{s.run?.success?s.run.count:'—'}</strong> {s.category==='job-board'?'confirmed open listings':'published openings'}</p><span>{s.run?'Checked '+new Date(s.run.checked_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'Awaiting first source check'}</span></div>
  {s.scope&&<p className="source-scope">{s.scope} Jobicy availability uses separate active, closed and unknown status checks; missing jobs are not automatically closed.</p>}
  {s.run?.error&&<p className="source-error">{s.run.error}</p>}
  <div className="source-links"><a href={sourceBoardUrl(s)} target="_blank" rel="noopener noreferrer">View {s.category==='job-board'?'Jobicy':'job board'} <ArrowUpRight size={14}/></a><a href={s.category==='job-board'?'https://jobicy.com/jobs-rss-feed':s.careerUrl} target="_blank" rel="noopener noreferrer">{s.category==='job-board'?'API & coverage':'Company careers'} <ExternalLink size={13}/></a></div>
 </article>)}</div></>;
}
