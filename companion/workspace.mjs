export const APP='https://nextrole-scout.vercel.app';
export const API='https://nextrole-job-radar.ivorypine64.chatgpt.site/api/companion';
export const ATS=['job-boards.greenhouse.io','boards.greenhouse.io','jobs.lever.co','jobs.eu.lever.co','jobs.ashbyhq.com'];
const restricted=['linkedin.com','unstop.com','internshala.com'];
export function jobUrl(value){
 let u;try{u=new URL(value);}catch{throw new Error('Use the original HTTPS link to one job.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||!u.hostname.includes('.')||u.hostname.includes(':')||/^\d+(?:\.\d+){3}$/.test(u.hostname)||/(?:^|\.)(?:localhost|local|internal|test|example|invalid)$/.test(u.hostname))throw new Error('Use a public HTTPS job link without credentials.');
 u.hash='';return u.toString();
}
export function pagePolicy(value){
 const url=jobUrl(value),u=new URL(url),host=u.hostname.toLowerCase();
 const board=restricted.find(domain=>host===domain||host.endsWith('.'+domain));
 const individual=ATS.includes(host)&&u.pathname.split('/').filter(Boolean).length>=2&&!/\/(?:login|signin|auth|search)(?:\/|$)/i.test(u.pathname);
 return {url,kind:individual?'ats':'paste',label:board?board.replace('.com',''):individual?'Employer ATS':'Job website',canRead:individual,
  message:board?'Paste the job description yourself. Scout does not read or automate this board.':individual?'Preview the structured job data from this employer page, then review it.':'Paste this individual job’s title, employer and description. No page reading is enabled for this site.'};
}
export function validateDraft(input){
 const value={url:jobUrl(String(input.url||'')),title:String(input.title||'').trim(),company:String(input.company||'').trim(),location:String(input.location||'').trim()||'Not specified',description:String(input.description||'').trim(),mode:input.mode||'Not specified',jobType:input.jobType||'Not specified'};
 if(value.title.length<2||value.title.length>250)throw new Error('Add a job title between 2 and 250 characters.');
 if(!value.company||value.company.length>100)throw new Error('Add the employer name (up to 100 characters).');
 if(value.location.length>1000)throw new Error('Keep the location under 1,000 characters.');
 if(value.description.length<40||value.description.length>35000)throw new Error('Paste the full job description (40–35,000 characters).');
 if(!['On-site','Hybrid','Remote','Not specified'].includes(value.mode)||!['Full-time','Internship','Contract','Not specified'].includes(value.jobType))throw new Error('Choose a listed work arrangement and job type.');
 return value;
}
export function saveLocalDraft(drafts,input,at=new Date().toISOString()){
 const data=validateDraft(input),list=Array.isArray(drafts)?drafts:[];
 const existing=list.find(d=>d.data?.url===data.url),entry={id:existing?.id||crypto.randomUUID(),savedAt:at,data};
 if(!existing&&list.length>=20)throw new Error('You have 20 local drafts. Delete one before saving another.');
 return [entry,...list.filter(d=>d.id!==entry.id)].slice(0,20);
}
export function appJobLink(job,scout=false){
 if(!job?.id||typeof job.id!=='string'||job.id.length>200)throw new Error('Save or check this job first.');
 const tab=job.status==='applied'?'applications':job.status==='dismissed'?'archive':job.status==='interested'?'interested':'discover';
 return APP+'/?'+new URLSearchParams({tab,job:job.id,...(scout?{scout:'1'}:{})});
}
export function trustedPage(sender,runtime){
 return sender?.id===runtime.id&&!sender.tab&&typeof sender.url==='string'&&['popup.html','panel.html'].some(page=>sender.url===runtime.getURL(page));
}
