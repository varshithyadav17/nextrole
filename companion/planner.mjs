const normal=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const personal=/\b(?:sponsor|visa|authoriz|citizen|race|ethnic|gender|disab|veteran|criminal|convict|salary|compensation|relocat|availability|start date|notice period|consent|agree|certify|attest|privacy|terms)\w*\b/;
export function planForm(fields,packet){
 const fills=[],blockers=[];const names=packet.contact.name.trim().split(/\s+/);
 for(const field of fields){
  const label=normal(field.label+' '+field.name),type=field.type;
  if(personal.test(label)||['checkbox','radio','password'].includes(type)){if(field.required)blockers.push('Review this personal declaration: '+field.label);continue;}
  let value=null,file=false;
  if(type==='file'&&/resume|curriculum|\bcv\b/.test(label)&&!/cover letter/.test(label)){file=true;value=packet.resume.filename;}
  else if(/\b(?:email|e mail)\b/.test(label))value=packet.contact.email;
  else if(/\bfirst name\b/.test(label))value=names[0];
  else if(/\blast name\b|\bfamily name\b|\bsurname\b/.test(label))value=names.length>1?names.slice(1).join(' '):null;
  else if(normal(field.label)==='name'||normal(field.name)==='name'||/^(?:full )?name(?: required)?$/.test(label)||/\bfull name\b/.test(label))value=packet.contact.name;
  else if(/\bphone\b|\bmobile\b/.test(label))value=packet.contact.phone||null;
  else if(/\blinkedin\b/.test(label))value=packet.contact.links.linkedin||null;
  else if(/\bgithub\b/.test(label)&&!/project|repository|repo/.test(label))value=packet.contact.links.github||null;
  else if(/\bleetcode\b/.test(label))value=packet.contact.links.leetcode||null;
  else if(/\bcodeforces\b/.test(label))value=packet.contact.links.codeforces||null;
  else{const answer=packet.questions.find(q=>normal(q.text)===normal(field.label));if(answer)value=answer.answer;}
  if(value!==null&&value!==''){
   if(field.value&&!file&&normal(field.value)!==normal(value)){blockers.push('A prefilled answer differs: '+field.label);continue;}
   if(type==='select-one'&&!field.options?.some(o=>normal(o.text)===normal(value)||o.value===value)){if(field.required)blockers.push('Choose an option yourself: '+field.label);continue;}
   fills.push({id:field.id,value,file});
  }else if(field.required&&!field.value)blockers.push('Add an answer: '+field.label);
 }
 if(!fills.some(f=>f.file))blockers.push('A supported résumé upload field was not found.');
 return {fills,blockers:[...new Set(blockers)]};
}
export function allowedApplicationUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['job-boards.greenhouse.io','boards.greenhouse.io','jobs.lever.co','jobs.eu.lever.co','jobs.ashbyhq.com'].includes(u.hostname);}catch{return false;}}

export function sameApplicationUrl(actual,target){try{const a=new URL(actual),b=new URL(target),base=b.pathname.replace(/\/apply\/?$/,'').replace(/\/$/,'');return allowedApplicationUrl(actual)&&a.origin===b.origin&&(a.pathname===base||a.pathname.startsWith(base+'/'));}catch{return false;}}
