"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {CatalogueFilters,CataloguePage} from '../lib/catalogue-types';
import type {JobView} from '../lib/types';

type State={key:string;page:CataloguePage|null;jobs:JobView[];loading:boolean;error:string;message:string};
function parameters(signature:string){const filter=JSON.parse(signature) as CatalogueFilters,params=new URLSearchParams();for(const [name,value] of Object.entries(filter))if(Array.isArray(value)){if(!value.length)params.set(name,'');else for(const id of value)params.append(name,id);}else params.set(name,value);return params;}
export function useCatalogue(filters:CatalogueFilters,ready:boolean,refresh:number){
 const signature=JSON.stringify(filters),[reset,setReset]=useState(0),[state,setState]=useState<State>({key:'',page:null,jobs:[],loading:false,error:'',message:''});
 const sequence=useRef(0),controller=useRef<AbortController|null>(null),busy=useRef(false);
 const key=signature+':'+refresh+':'+reset;
 useEffect(()=>{
  controller.current?.abort();const current=++sequence.current;busy.current=false;
  if(!ready)return;
  const abort=new AbortController();controller.current=abort;
  const params=parameters(signature),requested=Number(new URLSearchParams(window.location.search).get('limit'))||20;
  // Old share links may request many cards; each initial response stays bounded.
  params.set('limit',String(Math.min(100,Math.max(20,Math.floor(requested/20)*20))));
  async function load(){try{
   const response=await fetch('/api/catalogue?'+params,{signal:abort.signal,cache:'no-store'}),result=await response.json() as CataloguePage&{error?:string};
   if(!response.ok)throw new Error(result.error||'Could not load these openings.');
   if(!abort.signal.aborted&&current===sequence.current)setState(old=>({key,page:result,jobs:result.jobs,loading:false,error:'',message:old.message}));
  }catch(error){if(!abort.signal.aborted&&current===sequence.current)setState(old=>({key,page:null,jobs:[],loading:false,error:error instanceof Error?error.message:'Could not load these openings.',message:old.message}));}}
  const timer=setTimeout(load,250);return()=>{clearTimeout(timer);abort.abort();controller.current?.abort();};
 },[ready,signature,key]);
 const reload=useCallback(()=>setReset(value=>value+1),[]);
 async function more(){
  if(state.key!==key||!state.page?.nextCursor||state.loading||busy.current)return;
  busy.current=true;const current=sequence.current,abort=new AbortController();controller.current=abort;
  setState(old=>({...old,loading:true,error:''}));
  try{
   const params=parameters(signature);params.set('cursor',state.page.nextCursor);params.set('limit','20');
   const response=await fetch('/api/catalogue?'+params,{signal:abort.signal,cache:'no-store'}),result=await response.json() as CataloguePage&{error?:string};
   if(abort.signal.aborted||current!==sequence.current)return;
   if(response.status===409){setState(old=>({...old,message:'The catalogue changed. Showing refreshed results.'}));reload();return;}
   if(!response.ok)throw new Error(result.error||'Could not load the next page.');
   if(result.snapshotId!==state.page.snapshotId)throw new Error('The result set changed. Reload your catalogue.');
   setState(old=>({...old,page:result,jobs:[...old.jobs,...result.jobs],loading:false,error:''}));
  }catch(error){if(!abort.signal.aborted&&current===sequence.current)setState(old=>({...old,loading:false,error:error instanceof Error?error.message:'Could not load the next page.'}));}
  finally{if(current===sequence.current)busy.current=false;}
 }
 const active=state.key===key&&ready;
 return {jobs:active?state.jobs:[],summary:active?state.page?.summary:null,total:active?state.page?.total||0:0,hasMore:active&&!!state.page?.nextCursor,loading:ready&&(!active||state.loading),error:active?state.error:'',message:active?state.message:'',more,reload};
}
