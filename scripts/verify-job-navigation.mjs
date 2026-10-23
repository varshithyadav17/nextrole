import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks={effects:[],useState:value=>[value,()=>{}],useRef:value=>({current:value}),useEffect:callback=>hooks.effects.push(callback)};
globalThis.__nextroleNavigationHooks=hooks;
registerHooks({resolve(specifier,context,next){if(specifier==='react'&&context.parentURL?.endsWith('/app/use-radar-navigation.ts'))return {url:'nextrole-nav:hooks',shortCircuit:true};try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.(ts|js|mjs)$/.test(specifier))return next(specifier+'.ts',context);throw error;}},load(url,context,next){if(url==='nextrole-nav:hooks')return {format:'module',source:'const h=globalThis.__nextroleNavigationHooks;export const useRef=h.useRef,useState=h.useState,useEffect=h.useEffect;',shortCircuit:true};return next(url,context);}});
const {useRadarNavigation}=await import('../app/use-radar-navigation.ts'),{readRadarLocation,radarHref}=await import('../lib/navigation.ts');
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
const initial='/?q=SQL&company=Example&view=review&sort=Newest+first&limit=60';
function surface(href){
 const entries=[{href,state:{nextroleScroll:640}}],events={};let index=0;
 const location=new URL(href,'https://nextrole.test');const window={location,scrollY:640,addEventListener:(name,cb)=>events[name]=cb,removeEventListener:()=>{},scrollTo:({top})=>window.scrollY=top,history:{scrollRestoration:'auto',get state(){return entries[index].state;},replaceState(state,_,href){entries[index]={href:href||entries[index].href,state};if(href)window.location=new URL(href,location.origin);},pushState(state,_,href){entries.splice(index+1);entries.push({href,state});index++;window.location=new URL(href,location.origin);},back(){if(index){index--;window.location=new URL(entries[index].href,location.origin);events.popstate?.();}},forward(){if(index<entries.length-1){index++;window.location=new URL(entries[index].href,location.origin);events.popstate?.();}}}};
 globalThis.window=window;globalThis.requestAnimationFrame=fn=>{fn();return 1;};hooks.effects=[];const nav=useRadarNavigation();const cleanup=hooks.effects.map(effect=>effect());return {window,nav,entries,cleanup};
}
try{
 let s=surface(initial);s.nav.select('greenhouse:123');
 check(s.window.location.pathname==='/jobs/greenhouse%3A123'&&s.window.scrollY===0,'Opening a job creates a real job-page URL and starts at the page top.');
 const page=readRadarLocation(s.window.location.search,s.window.location.pathname);check(page.query==='SQL'&&page.company==='Example'&&page.visibleCount===60&&page.view==='review','A job-page URL preserves the originating filters and loaded result count.');
 s.nav.select(null);check(s.window.location.pathname==='/'&&s.window.scrollY===640&&s.window.location.search===new URL(initial,'https://nextrole.test').search,'Back to jobs restores the previous results URL and scroll position.');
 s.window.history.forward();check(readRadarLocation(s.window.location.search,s.window.location.pathname).selected==='greenhouse:123','Browser Forward reopens the same job page.');
 s.nav.select(null);s.nav.select('lever:456');check(readRadarLocation(s.window.location.search,s.window.location.pathname).selected==='lever:456','Opening another eye uses the new job’s page instead of stale job context.');
 s.nav.showUpdates(true);s.nav.showUpdates(false);s.nav.select(null);check(s.window.location.pathname==='/'&&s.window.scrollY===640,'Opening and closing notifications does not lose the jobs return point.');
 s.cleanup.forEach(fn=>fn?.());s=surface('/jobs/ashby%3A789?tab=applications&q=backend');s.nav.select(null);
 check(s.window.location.pathname==='/'&&s.window.location.search.includes('tab=applications')&&s.window.location.search.includes('q=backend'),'A directly opened job link has a safe in-app return without needing browser history.');
 check(readRadarLocation('?job=old%3A123').selected==='old:123'&&radarHref(readRadarLocation('?job=old%3A123')).startsWith('/jobs/old%3A123'),'Existing notification and extension job links remain compatible.');
 check(readRadarLocation('','/jobs/%broken').selected===null,'Malformed path encoding does not crash navigation.');
 check(new URL(radarHref({...page,selected:'//evil.test'}),'https://nextrole.test').origin==='https://nextrole.test','A supplied job identifier cannot turn navigation into an external redirect.');
 console.log(JSON.stringify({passed:true,checks,scope:'Actual navigation hook with simulated history; not real browser/device proof'}));
}finally{delete globalThis.window;delete globalThis.requestAnimationFrame;delete globalThis.__nextroleNavigationHooks;}
