"use client";
import {useEffect,useRef} from 'react';
import type {ACTIVITY_SECTIONS} from '../lib/activity';
type Section=typeof ACTIVITY_SECTIONS[number];
type Sample={minute:number;seconds:number;section:Section};
export function useActiveTime(enabled:boolean,section:Section){
 const currentSection=useRef(section);currentSection.current=section;
 useEffect(()=>{
  if(!enabled)return;
  let last=performance.now(),input=last,wasActive=false;
  const minutes=new Map<number,{ms:number;section:Section}>();
  const samples=()=>Array.from(minutes,([minute,m])=>({minute,seconds:Math.min(60,Math.floor(m.ms/1000)),section:m.section})).filter(m=>m.seconds>0);
  function send(beacon=false){
   const current=Math.floor(Date.now()/60000);for(const minute of minutes.keys())if(minute<current-2)minutes.delete(minute);
   const values=samples();if(!values.length)return;
   const body=JSON.stringify({action:'activity',minutes:values});
   if(beacon&&navigator.sendBeacon){navigator.sendBeacon('/api/community',new Blob([body],{type:'application/json'}));return;}
   void fetch('/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  }
  function tick(){
   const now=performance.now(),wall=Date.now(),active=!document.hidden&&document.hasFocus()&&now-input<60000;
   const elapsed=now-last;last=now;
   if(active&&wasActive&&elapsed>0&&elapsed<=2500){
    const previousWall=wall-elapsed;
    for(let minute=Math.floor(previousWall/60000);minute<=Math.floor(wall/60000);minute++){
     const ms=Math.max(0,Math.min(wall,(minute+1)*60000)-Math.max(previousWall,minute*60000));
     if(ms){const value=minutes.get(minute)||{ms:0,section:currentSection.current};value.ms=Math.min(60000,value.ms+ms);minutes.set(minute,value);}
    }
   }
   wasActive=active;
  }
  const interact=()=>{input=performance.now();};
  const pause=()=>{tick();wasActive=false;send(true);};
  const focus=()=>{last=performance.now();input=last;wasActive=false;};
  const visibility=()=>document.hidden?pause():focus();
  for(const name of ['pointerdown','keydown','scroll','touchstart'])window.addEventListener(name,interact,{passive:true});
  window.addEventListener('blur',pause);window.addEventListener('focus',focus);window.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',visibility);
  const clock=setInterval(tick,1000),flush=setInterval(()=>send(),30000);
  return()=>{tick();send(true);clearInterval(clock);clearInterval(flush);for(const name of ['pointerdown','keydown','scroll','touchstart'])window.removeEventListener(name,interact);window.removeEventListener('blur',pause);window.removeEventListener('focus',focus);window.removeEventListener('pagehide',pause);document.removeEventListener('visibilitychange',visibility);};
 },[enabled]);
}
