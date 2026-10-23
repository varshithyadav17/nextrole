"use client";

import {createContext,useContext,useEffect,useState} from 'react';
import {Pause,Play} from 'lucide-react';

const MotionContext=createContext({enabled:false,reduced:false,toggle:()=>{}});

export function ScoutMotionProvider({children}:{children:React.ReactNode}){
 const [enabled,setEnabled]=useState(false),[reduced,setReduced]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const readPreference=()=>setReduced(preference.matches);
  const readVisibility=()=>setVisible(!document.hidden);
  readPreference();readVisibility();
  try{setEnabled(localStorage.getItem('nextrole:decorative-motion')!=='off');}catch{setEnabled(true);}
  preference.addEventListener('change',readPreference);
  document.addEventListener('visibilitychange',readVisibility);
  return()=>{preference.removeEventListener('change',readPreference);document.removeEventListener('visibilitychange',readVisibility);};
 },[]);
 function toggle(){setEnabled(value=>{const next=!value;try{localStorage.setItem('nextrole:decorative-motion',next?'on':'off');}catch{}return next;});}
 return <MotionContext.Provider value={{enabled,reduced,toggle}}><div className="motion-root" data-motion={enabled&&!reduced&&visible?'on':'off'}>{children}</div></MotionContext.Provider>;
}

export function MotionToggle(){
 const {enabled,reduced,toggle}=useContext(MotionContext);
 if(reduced)return <span className="motion-toggle motion-reduced" title="Following your device’s reduced-motion preference"><Pause size={13}/>Reduced motion</span>;
 return <button className="motion-toggle" type="button" aria-pressed={enabled} aria-label={enabled?'Pause decorative animations':'Enable decorative animations'} onClick={toggle}>{enabled?<Pause size={13}/>:<Play size={13}/>}<span>Motion {enabled?'on':'off'}</span></button>;
}
