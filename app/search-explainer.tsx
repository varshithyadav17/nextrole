"use client";

import {ArrowUpRight,Radio,ShieldCheck} from 'lucide-react';
import type {AIOverview} from '../lib/providers';

export default function SearchExplainer({overview,onConnections,onSources}:{overview:AIOverview;onConnections:()=>void;onSources:()=>void}){
 const enabled=overview.slots.filter(slot=>slot.configured&&slot.enabled).length;
 const connectionStatus=!overview.storageReady?'AI storage unavailable · profile matching is on':enabled?`Your AI: ${enabled} enabled ${enabled===1?'connection':'connections'}`:'No AI connection enabled · profile matching is on';
 return <section className="search-explainer" aria-label="Job sources and AI usage">
  <div className="search-explainer-heading"><Radio size={18} aria-hidden="true"/><strong>Job discovery uses no AI credits.</strong></div>
  <p>Openings come from connected employer feeds and Jobicy’s public job board. Your saved preferences help match them, even without an API key.</p>
  <div className="search-explainer-status"><span><ShieldCheck size={14} aria-hidden="true"/>{connectionStatus}</span><button className="text-button" onClick={onConnections}>AI Connections <ArrowUpRight size={13}/></button></div>
  <button className="text-button" onClick={onSources}>Explore LinkedIn, Unstop & more sources <ArrowUpRight size={14}/></button>
  <details><summary>How jobs, sign-in and AI work</summary><div className="search-explainer-details">
   <p><strong>Jobs & alerts.</strong> Public source listings are refreshed and shared across the app. Jobicy discovery covers worldwide remote postings from its seven-day feed; imported older jobs receive separate status checks. Browsing, keyword search, profile matching, tracking and scheduled alerts use no LLM calls. <button className="text-button" onClick={onSources}>See connected sources <ArrowUpRight size={13}/></button></p>
   <p><strong>ChatGPT sign-in.</strong> This identifies your account and keeps your saved work together. It does not provide an AI API key or connect a ChatGPT credit balance.</p>
   <p><strong>Optional AI.</strong> Only when you request an AI search or fit check, NextRole can use your enabled connections to rank existing openings or explain a listing. Provider charges and limits apply. With fallback enabled, it tries your next connection on a limit or temporary outage. It never uses a shared AI key; profile matching remains available if your connections run out.</p>
  </div></details>
 </section>;
}
