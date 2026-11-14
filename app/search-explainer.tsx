"use client";

import {ArrowUpRight,Radio,ShieldCheck} from 'lucide-react';
import type {AIOverview} from '../lib/providers';

export default function SearchExplainer({overview,onConnections,onSources}:{overview:AIOverview;onConnections:()=>void;onSources:()=>void}){
 const enabled=overview.slots.filter(slot=>slot.configured&&slot.enabled).length;
 const connectionStatus=!overview.storageReady?'AI storage unavailable · profile matching is on':enabled?`Your AI: ${enabled} enabled ${enabled===1?'connection':'connections'}`:'No AI connection enabled · profile matching is on';
 return <section className="search-explainer" aria-label="Job sources and AI usage">
  <div className="search-explainer-heading"><Radio size={18} aria-hidden="true"/><strong>Your shared job feed uses no AI credits.</strong></div>
  <p>Openings come from connected employer feeds and Jobicy’s public job board. Your saved preferences help match them, even without an API key.</p>
  <div className="search-explainer-status"><span><ShieldCheck size={14} aria-hidden="true"/>{connectionStatus}</span><button className="text-button" onClick={onConnections}>AI Connections <ArrowUpRight size={13}/></button></div>
  <button className="text-button" onClick={onSources}>Explore LinkedIn, Unstop & more sources <ArrowUpRight size={14}/></button>
  <details><summary>How jobs, sign-in and AI work</summary><div className="search-explainer-details">
   <p><strong>Jobs & alerts.</strong> Public source listings are refreshed and shared across the app. Jobicy discovery covers worldwide remote postings from its seven-day feed; imported older jobs receive separate status checks. Browsing, keyword search, profile matching, tracking and scheduled alerts use no LLM calls. <button className="text-button" onClick={onSources}>See connected sources <ArrowUpRight size={13}/></button></p>
   <p><strong>Sign-in.</strong> Google or email sign-in keeps your saved work together. AI API connections are managed separately.</p>
   <p><strong>Optional AI.</strong> AI ranking and fit checks use your enabled connections. Search the web uses a supported OpenAI or Gemini connection to find sourced leads beyond the connected feeds; these need eligibility review. Provider charges and limits apply. With fallback enabled, confirmed quota or rate-limit responses can use your next supported connection. Web searches are not automatically repeated after an uncertain response. It never uses a shared AI key; profile matching remains available if your connections run out.</p>
  </div></details>
 </section>;
}
