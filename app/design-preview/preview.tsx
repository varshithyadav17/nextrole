"use client";

import {useEffect,useState} from 'react';
import Dashboard from '../dashboard';
import {defaultProfile,type JobView} from '../../lib/types';

const now='2026-10-23T09:00:00.000Z';
const user={userId:'local-design-fixture',displayName:'Example',email:'student@example.test'};
const profile={...defaultProfile,name:'Example',completed:true,graduationYear:'2027',skills:['Python','SQL','FastAPI'],roles:['Software engineer','Data analyst','Product manager']};
const initialJobs:JobView[]=[['Backend Intern','Example Labs','Bengaluru','Hybrid'],['Data Analyst Intern','Sample Systems','Hyderabad','On-site'],['Associate Product Intern','Demo Studio','Remote (India)','Remote'],['Backend Intern','Example Labs','Bengaluru','Hybrid'],['Data Analyst Intern','Sample Systems','Hyderabad','On-site'],['Product Intern','Demo Studio','Remote (India)','Remote'],['Software Engineer Intern','Demo Labs','Bengaluru','Hybrid']].map(([title,company,location,mode],i)=>({
 id:'design-'+i,key:'design:'+i,sourceId:'design-example',company,title,location,mode,jobType:'Internship',description:(i%3===0?'Build and maintain backend services using Python and FastAPI. Work on real product features with guidance from the team. ':i%3===1?'Work with product and data teams to build analytics dashboards, run experiments and derive insights from real datasets. ':'Support product research, user insights and feature development. Great opportunity to learn product fundamentals. ')+'This fictional opportunity is for the local design preview. Final-year students graduating in 2027 and freshers with zero years of professional experience are welcome. Work on backend services and APIs using Python and FastAPI, data models with PostgreSQL, and clear tests. Collaborate with the team, explain your project decisions, and learn through reviewed work. Please use your actual projects and confirmed skills when preparing your résumé.',url:'https://example.test/jobs/'+i,sourceUrl:'https://example.test/careers',publishedAt:'2026-10-20T09:00:00.000Z',deadline:i===3?'2026-10-26T09:00:00.000Z':null,firstSeen:now,lastChecked:now,active:true,minExperience:0,experienceEvidence:'Freshers with zero years of experience',experienceRequirements:{version:3,minimum:0,maximum:null,evidence:'Freshers with zero years of experience',review:[]},skills:['Python','SQL'],availability:'open',sourceCategory:'employer',provenance:{kind:'ats-api',url:'https://example.test/careers',capturedAt:now,parserVersion:1},match:{score:90,relevant:true,uncertain:false,reasons:['2027 graduates and freshers welcome.'],cautions:[],checks:[{key:'batch',label:'Graduation batch',status:'met',requirement:'2027',profile:'2027',evidence:'Final-year students graduating in 2027 are welcome.'}]},status:i>=3&&i<=5?'interested':i===6?'applied':null,stage:i===6?'Interviewing':null,note:'',statusAt:i>=3?now:null,remindAt:null
}));

/** Browser-only fixtures: every API call is answered in memory, never forwarded. */
export default function DesignPreview(){
 const [ready,setReady]=useState(false),[viewport,setViewport]=useState(0);
 useEffect(()=>{
  const requestedWidth=Number(new URLSearchParams(location.search).get('viewport'));
  if([390,768,1280].includes(requestedWidth)){setViewport(requestedWidth);return;}
  const push=history.pushState.bind(history),replace=history.replaceState.bind(history);
  const previewURL=(url:string|URL|null|undefined)=>{if(!url)return url;const target=new URL(url,location.href);if(target.origin===location.origin&&target.pathname==='/')target.pathname='/design-preview';return target.href;};
  history.pushState=(data,unused,url)=>push(data,unused,previewURL(url));
  history.replaceState=(data,unused,url)=>replace(data,unused,previewURL(url));
  // HTTP-only local fixture support; this route is unavailable in production.
  if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>{
   const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
   const hex=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
   return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }});
  const original=window.fetch.bind(window),jobs=structuredClone(initialJobs);
  const community={analyticsEnabled:false,surveyDue:false,month:'2026-10',unreadReplies:0,role:'student'};
  let revision=crypto.randomUUID();
  const thread={id:crypto.randomUUID(),jobId:null as string|null,revision,resumeId:null,customJD:'',kitId:null,messages:[] as any[]};
  const result=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  const counts=()=>({discover:jobs.filter(j=>!j.status).length,interested:jobs.filter(j=>j.status==='interested').length,applications:jobs.filter(j=>j.status==='applied').length,archive:jobs.filter(j=>j.status==='dismissed').length});
  window.fetch=async(input,init)=>{
   const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,window.location.origin);
   if(!url.pathname.startsWith('/api/'))return original(input,init);
   let body:Record<string,any>={};try{body=typeof init?.body==='string'?JSON.parse(init.body):{};}catch{}
   if(url.pathname==='/api/community')return result({state:community,items:[],hasMore:false});
   if(url.pathname==='/api/auth/options')return result({googleReady:false,linked:false});
   if(url.pathname==='/api/app'){
    if(body.action==='detail')return result({job:jobs.find(j=>j.id===body.jobId)||null});
    if(body.action==='verify')return result({verified:true,availability:'open'});
    if(body.action==='refresh'){await new Promise(resolve=>setTimeout(resolve,2200));return result({sourcesPending:false,totalSources:1,sourceProgress:{checked:1,total:1},failures:[]});}
    if(body.action==='status'){const job=jobs.find(j=>j.id===body.jobId);if(job){job.status=body.status==='restore'?null:body.status;job.statusAt=new Date().toISOString();if(body.note!==undefined)job.note=body.note;if(body.stage)job.stage=body.stage;}return result({ok:true});}
    if(body.action==='profile')Object.assign(profile,body.profile);
    return result({role:'student',profile,jobs:[],sources:[{id:'design-example',company:'Example Labs',provider:'greenhouse',token:'example',careerUrl:'https://example.test/careers',run:{success:1,checked_at:now,count:3,error:null}}],notifications:[],lastSync:now,schedule:{enabled:false,times:[],timezone:'Asia/Kolkata'},ai:{slots:[],enabled:false,automaticFallback:false},aiEnabled:false,aiProvider:null,pushPublicKey:null});
   }
   if(url.pathname==='/api/catalogue'){
    const tab=url.searchParams.get('tab'),query=(url.searchParams.get('query')||'').toLowerCase(),company=url.searchParams.get('company'),mode=url.searchParams.get('mode');
    const filtered=jobs.filter(j=>(tab==='interested'?j.status==='interested':tab==='applications'?j.status==='applied':tab==='archive'?j.status==='dismissed':!j.status)&&(!query||(j.title+' '+j.company+' '+j.description).toLowerCase().includes(query))&&(!company||company==='all'||j.company===company)&&(!mode||mode==='All arrangements'||j.mode===mode));
    return result({jobs:filtered,total:filtered.length,nextCursor:null,snapshotId:'design-snapshot',expiresAt:'2026-10-24T09:00:00.000Z',cached:false,summary:{counts:counts(),quality:{visibleOpenings:jobs.length,employers:4,fresh:jobs.length,staleOrUnverified:0,incomplete:0,forYou:3,needsReview:0},companies:[],scanned:5}});
   }
   if(url.pathname==='/api/scout'){
    if(init?.method==='POST'){
     if(body.action==='set-jd')thread.customJD=body.customJD;
     if(body.action==='clear')thread.messages=[];
     else if(body.action==='message'){
      thread.messages.push({id:crypto.randomUUID(),role:'user',text:body.message,createdAt:new Date().toISOString()});
      await new Promise(resolve=>setTimeout(resolve,1500));
      thread.messages.push({id:crypto.randomUUID(),role:'assistant',mode:'guided',text:'I can help you review your résumé and tailor it to a job. Attach your PDF and choose a job, or paste its JD from Résumé & JD.',createdAt:new Date().toISOString()});
     }
     revision=crypto.randomUUID();thread.revision=revision;
    }
    const scoutJob=jobs.find(job=>job.id===(body.jobId||url.searchParams.get('jobId')))||null;
    thread.jobId=scoutJob?.id||null;
    return result({thread,job:scoutJob,careerReady:false,aiReady:false,pdfAIReady:false,files:[]});
   }
   if(url.pathname==='/api/resumes')return result({files:[],ready:true});
   if(url.pathname==='/api/preparation')return result({career:{profile:{name:'Example',email:'student@example.test',phone:'',location:'',website:'',links:{},facts:[],contactVerified:false},revision:null},history:[]});
   if(url.pathname==='/api/applications')return url.searchParams.has('analytics')?result({counts:{applied:1,response:0,oa:0,interview:0,offers:0,rejected:0,withdrawn:0},roles:{'Software engineer':1},months:{'2026-10':1},applications:[],notice:'Local synthetic UI fixture. No real application was submitted.'}):result({record:null,history:[],events:[]});
   if(url.pathname==='/api/digest')return result({ready:false,subscribed:false});
   return result({error:'This action is unavailable in the local design fixture.'},503);
  };
  setReady(true);
  return()=>{window.fetch=original;history.pushState=push;history.replaceState=replace;};
 },[]);
 if(viewport)return <main style={{minHeight:'100vh',background:'#eef1ee',padding:'34px 12px',display:'grid',justifyItems:'center',gap:16}}><p style={{font:'13px Arial',color:'#415346'}}>Local responsive check · {viewport} px · Synthetic data</p><iframe title="NextRole responsive preview" src="/design-preview" width={viewport} height={viewport===1280?720:844} style={{boxSizing:'content-box',border:'1px solid #d9dfda',background:'#fff',maxWidth:'100%'}}/></main>;
 return <><div className="design-preview-banner">LOCAL DESIGN PREVIEW · SYNTHETIC DATA · NO REAL ACCOUNT</div>{ready&&<Dashboard user={user}/>}</>;
}
