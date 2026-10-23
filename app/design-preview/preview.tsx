"use client";

import {useEffect,useState} from 'react';
import Dashboard from '../dashboard';
import {defaultProfile,type JobView} from '../../lib/types';

const now='2026-10-23T09:00:00.000Z';
const user={userId:'local-design-fixture',displayName:'Example',email:'student@example.test'};
const profile={...defaultProfile,name:'Example',completed:true,graduationYear:'2027',skills:['Python','SQL','FastAPI'],roles:['Software engineer','Data analyst','Product manager']};
const initialJobs:JobView[]=[['Backend Intern','Example Labs','Bengaluru, India','Hybrid'],['Data Analyst Intern','Sample Systems','Hyderabad, India','On-site'],['Associate Product Intern','Demo Studio','Remote, India','Remote'],['Frontend Intern','Example Studio','Remote, India','Remote'],['Software Engineer Intern','Demo Labs','Bengaluru, India','Hybrid']].map(([title,company,location,mode],i)=>({
 id:'design-'+i,key:'design:'+i,sourceId:'design-example',company,title,location,mode,jobType:'Internship',description:'This fictional opportunity is for the local design preview. Final-year students graduating in 2027 and freshers with zero years of professional experience are welcome. Work on backend services and APIs using Python and FastAPI, data models with PostgreSQL, and clear tests. Collaborate with the team, explain your project decisions, and learn through reviewed work. Please use your actual projects and confirmed skills when preparing your résumé.',url:'https://example.test/jobs/'+i,sourceUrl:'https://example.test/careers',publishedAt:'2026-10-20T09:00:00.000Z',deadline:null,firstSeen:now,lastChecked:now,active:true,minExperience:0,experienceEvidence:'Freshers with zero years of experience',skills:['Python','SQL'],availability:'open',sourceCategory:'employer',provenance:{kind:'ats-api',url:'https://example.test/careers',capturedAt:now,parserVersion:1},match:{score:90,relevant:true,uncertain:false,reasons:['2027 graduates and freshers welcome.'],cautions:[]},status:i===3?'interested':i===4?'applied':null,stage:i===4?'Interviewing':null,note:'',statusAt:i===4?now:null,remindAt:null
}));

/** Browser-only fixtures: every API call is answered in memory, never forwarded. */
export default function DesignPreview(){
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  const original=window.fetch.bind(window),jobs=structuredClone(initialJobs);
  const community={analyticsEnabled:false,surveyDue:false,month:'2026-10',unreadReplies:0,role:'student'};
  let revision=crypto.randomUUID();
  const thread={id:crypto.randomUUID(),jobId:null,revision,resumeId:null,customJD:'',kitId:null,messages:[] as any[]};
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
    return result({jobs:filtered,total:filtered.length,nextCursor:null,snapshotId:'design-snapshot',expiresAt:'2026-10-24T09:00:00.000Z',cached:false,summary:{counts:counts(),quality:{visibleOpenings:jobs.length,employers:5,fresh:5,staleOrUnverified:0,incomplete:0,forYou:3,needsReview:0},companies:[],scanned:5}});
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
    return result({thread,job:null,careerReady:false,aiReady:false,pdfAIReady:false,files:[]});
   }
   if(url.pathname==='/api/resumes')return result({files:[],ready:true});
   if(url.pathname==='/api/preparation')return result({career:{profile:{name:'Example',email:'student@example.test',phone:'',location:'',website:'',links:{},facts:[],contactVerified:false},revision:null},history:[]});
   if(url.pathname==='/api/applications')return url.searchParams.has('analytics')?result({counts:{applied:1,response:0,oa:0,interview:0,offers:0,rejected:0,withdrawn:0},roles:{'Software engineer':1},months:{'2026-10':1},applications:[],notice:'Local synthetic UI fixture. No real application was submitted.'}):result({record:null,history:[],events:[]});
   if(url.pathname==='/api/digest')return result({ready:false,subscribed:false});
   return result({error:'This action is unavailable in the local design fixture.'},503);
  };
  setReady(true);
  return()=>{window.fetch=original;};
 },[]);
 return <><div className="design-preview-banner">LOCAL DESIGN PREVIEW · SYNTHETIC DATA · NO REAL ACCOUNT</div>{ready&&<Dashboard user={user}/>}</>;
}
