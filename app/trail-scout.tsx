"use client";

import {useEffect,useState} from 'react';
import {ArrowUpRight,Check,SlidersHorizontal} from 'lucide-react';
import type {Profile} from '../lib/types';

/** Artwork is separate from the scenery so Scout can move without moving the landscape. */
export function TrailHero({profile,onPreferences,reaction}:{profile:Profile;onPreferences:()=>void;reaction?:'saved'|'applied'|null}){
 const [hello,setHello]=useState(false);
 useEffect(()=>{if(!hello)return;const timer=setTimeout(()=>setHello(false),3200);return()=>clearTimeout(timer);},[hello]);
 const firstName=profile.name.trim().split(/\s+/)[0];
 const preferences=[profile.experience===0?'Fresher':profile.experience+' years experience',profile.graduationYear?profile.graduationYear+' batch':'',profile.locations.slice(0,2).join(', ')].filter(Boolean);
 return <section className="trail-hero" aria-label="Your job search">
  <img className="trail-landscape" src="/art/trail/header-landscape.webp" width="2172" height="724" alt="" aria-hidden="true"/>
  <div className="trail-hero-copy"><span className="trail-heading-marker" aria-hidden="true"/><p className="trail-greeting">{firstName?'Hello, '+firstName+'.':'Your next chapter starts here.'}</p><h1>Find your next move.</h1><button className="trail-profile-link" onClick={onPreferences} aria-label="Edit search preferences"><span>{preferences.join(' · ')}</span><SlidersHorizontal size={15}/></button></div>
  <button className={'trail-scout-greeting '+(hello?'is-waving':'')} onClick={()=>setHello(true)} aria-label="Say hello to Scout" title="Say hello to Scout"><img className="trail-formal-scout" src="/art/trail/scout-formal.webp" width="1254" height="1254" alt="Scout in a suit, carrying a file to find a job" fetchPriority="high"/><span className="trail-scout-caption" aria-live="polite">{reaction?<><Check size={13}/>{reaction==='saved'?'Saved for later.':'A step forward!'}</>:hello?<>You’ve got this. <ArrowUpRight size={13}/></>:<>Ready for the next chapter.</>}</span></button>
 </section>;
}

/** Indeterminate work: the character moves, but no invented percentage is shown. */
export function TrailLoader({label='Finding new opportunities…',compact=false}:{label?:string;compact?:boolean}){
 return <div className={'trail-loader '+(compact?'is-compact':'')} role="status"><span className="trail-loader-label">{label}</span><div className="trail-loading-track" aria-hidden="true"><span className="trail-running-scout"><img src="/art/trail/scout-running.webp" width="1254" height="1254" alt=""/></span></div></div>;
}
