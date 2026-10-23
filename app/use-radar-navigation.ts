"use client";
import {useEffect,useRef,useState} from 'react';
import {defaultLocation,radarHref,readRadarLocation,type RadarLocation} from '../lib/navigation';

export function useRadarNavigation(initialJobId:string|null=null){
 const [location,setLocation]=useState<RadarLocation>({...defaultLocation,selected:initialJobId});
 const current=useRef(location);
 useEffect(()=>{
  const previousRestoration=window.history.scrollRestoration;window.history.scrollRestoration='manual';
  const restore=()=>{const next=readRadarLocation(window.location.search,window.location.pathname);current.current=next;setLocation(next);requestAnimationFrame(()=>window.scrollTo({top:window.history.state?.nextroleScroll||0}));};
  restore();window.addEventListener('popstate',restore);
  return()=>{window.removeEventListener('popstate',restore);window.history.scrollRestoration=previousRestoration;};
 },[]);
 function update(patch:Partial<RadarLocation>,replace=false){
  const before=current.current;const next={...before,...patch};
  const href=radarHref(next);if(href===radarHref(before))return;
  if(!replace)window.history.replaceState({...window.history.state,nextroleScroll:window.scrollY},'');
  const historyState={...window.history.state,nextroleJobReturn:next.selected?(before.selected?window.history.state?.nextroleJobReturn||null:radarHref({...before,selected:null})):null,nextroleUpdates:patch.updates?radarHref(before):null,nextroleScroll:next.selected!==before.selected||before.tab!==next.tab?0:window.scrollY};
  window.history[replace?'replaceState':'pushState'](historyState,'',href);
  current.current=next;setLocation(next);
 }
 function select(id:string|null){
  if(id===null&&current.current.selected&&window.history.state?.nextroleJobReturn){window.history.back();return;}
  update({selected:id,...(id?{updates:false}:{})},id===null);
  window.scrollTo({top:0});
 }
 function showUpdates(updates:boolean){
  if(!updates&&current.current.updates&&window.history.state?.nextroleUpdates){window.history.back();return;}
  update({updates},!updates);
 }
 return {location,update,select,showUpdates};
}
