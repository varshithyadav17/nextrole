"use client";

import {useEffect,useState,type ReactNode} from 'react';
import {LoaderCircle,SlidersHorizontal} from 'lucide-react';
import type {Profile} from '../lib/types';

export type ScoutPose='saved'|'applications'|'job-detail'|'progress'|'preferences'|'resume'|'alerts'|'help'|'archive'|'admin';

function useReactionKey(reactionKey:number|undefined,initial:string){
 const [key,setKey]=useState<string|number>(reactionKey??initial);
 useEffect(()=>{if(reactionKey!==undefined)setKey(reactionKey);},[reactionKey]);
 return key;
}

/** Decorative artwork never changes the user's job, application or account state. */
export function ScoutIllustration({pose,className='',reactionKey}:{pose:ScoutPose;className?:string;reactionKey?:number}){
 const motionKey=useReactionKey(reactionKey,pose);
 return <span className={'scout-moment scout-moment--'+pose+' '+className} aria-hidden="true"><img key={pose+'-'+motionKey} src={'/art/scout-pages/scout-'+pose+'.webp'} width={512} height={512} alt="" decoding="async"/></span>;
}

export function ScoutHeading({title,pose,subtitle,children,reactionKey}:{title:ReactNode;pose:ScoutPose;subtitle?:ReactNode;children?:ReactNode;reactionKey?:number}){
 return <header className={'page-heading simple-heading scout-page-heading scout-page-heading--'+pose}>
  <div className="scout-heading-copy"><span className="trail-heading-marker" aria-hidden="true"/><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}{children&&<div className="scout-heading-actions">{children}</div>}</div>
  <ScoutIllustration pose={pose} reactionKey={reactionKey}/>
 </header>;
}

/** The city and character are independent raster assets, so only Scout moves. */
export function ScoutCityScene({onGreet,greeting=false,reactionKey,className=''}:{onGreet?:()=>void;greeting?:boolean;reactionKey?:number;className?:string}){
 const motionKey=useReactionKey(reactionKey,'walk');
 const character=<img key={motionKey} className="trail-formal-scout" src="/art/trail/scout-formal.webp" width={512} height={512} alt="" fetchPriority="high"/>;
 return <div className={'scout-city-scene '+(greeting?'is-greeting ':'')+className}>
  <img className="scout-city-street" src="/art/scout-pages/city-street.webp" width={1774} height={887} alt="" aria-hidden="true" fetchPriority="high"/>
  {onGreet?<button type="button" className="scout-city-walker" onClick={onGreet} aria-label="Say hello to Scout" title="Say hello to Scout">{character}</button>:<span className="scout-city-walker" aria-hidden="true">{character}</span>}
 </div>;
}

export function TrailHero({profile,onPreferences,reaction,reactionKey}:{profile:Profile;onPreferences:()=>void;reaction?:'saved'|'applied'|null;reactionKey?:number}){
 const [hello,setHello]=useState(false);
 useEffect(()=>{if(!hello)return;const timer=setTimeout(()=>setHello(false),2500);return()=>clearTimeout(timer);},[hello]);
 const firstName=profile.name.trim().split(/\s+/)[0];
 const preferences=[profile.experience===0?'Fresher':profile.experience+' years experience',profile.graduationYear?profile.graduationYear+' batch':'',profile.locations.slice(0,2).join(', ')].filter(Boolean);
 return <section className="scout-jobs-hero" aria-label="Your job search">
  <div className="scout-jobs-copy"><span className="trail-heading-marker" aria-hidden="true"/><p className="trail-greeting">{firstName?'Hello, '+firstName+'.':'Your next chapter starts here.'}</p><h1>Find your next move.</h1><button className="trail-profile-link" onClick={onPreferences} aria-label="Edit search preferences"><span>{preferences.join(' · ')}</span><SlidersHorizontal size={15}/></button></div>
  <ScoutCityScene onGreet={()=>setHello(true)} greeting={hello} reactionKey={reactionKey}/>
  <span className="sr-only" role="status">{reaction==='saved'?'Job saved.':reaction==='applied'?'Application recorded.':hello?'You’ve got this.':''}</span>
 </section>;
}

/** Plain progress feedback replaces the removed running-Scout loading effect. */
export function WorkStatus({label='Checking opportunities…',compact=false}:{label?:string;compact?:boolean}){
 return <div className={'scout-work-status '+(compact?'is-compact':'')} role="status"><LoaderCircle size={compact?14:16} className="spin" aria-hidden="true"/><span>{label}</span></div>;
}
