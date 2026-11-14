import employers from '../data/employers.json' with {type:'json'};
import platforms from '../data/platforms.json' with {type:'json'};
import requested from '../data/requested-employers.json' with {type:'json'};
import type {Source} from './types';
import {validSourceAddress} from './extended-feeds';

export {employers,platforms,requested};
export const employerName=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^fampay$/,'fam');
export const requestedEmployerNames=new Set(requested.brands.map(employerName));
export function isRequestedEmployer(name:string){return requestedEmployerNames.has(employerName(name));}
export type EmployerCheck={state:'detected'|'access-required'|'unavailable'|'needs-review'|'needs-url';checkedAt:string;provider?:string;candidate?:Source;reason:string};
export type EmployerChecks=Record<string,EmployerCheck>;
const unsupported:[string,RegExp][]=[['icims',/\.icims\.com$/],['sap-successfactors',/\.(?:successfactors|successfactors\.eu|successfactors\.com|successfactors\.asia|successfactors\.cn)$/],['taleo',/\.taleo\.net$/],['darwinbox',/\.darwinbox\.(?:com|in)$/],['zoho-recruit',/\.(?:zohorecruit\.com|zohopublic\.com|zohorecruit\.in)$/],['bamboohr',/\.bamboohr\.com$/],['jazzhr',/\.(?:applytojob\.com|jazz\.co)$/],['jobvite',/\.(?:jobvite\.com|jobvite\.com)$/],['recruit-crm',/\.(?:recruitcrm\.io)$/],['manatal',/\.(?:manatal\.com)$/],['breezy',/\.breezy\.hr$/],['turbohire',/\.turbohire\.co$/]];
/** Read-only fingerprinting. Every candidate is still validated before connection. */
export function detectEmployerBoard(url:string,company:string):{provider:string;candidate?:Source}|null{
 let u:URL;try{u=new URL(url);}catch{return null;}if(u.protocol!=='https:'||u.username||u.password)return null;
 const h=u.hostname.toLowerCase(),parts=u.pathname.split('/').filter(Boolean);let provider:Source['provider']|undefined,token='',host:string|undefined,site:string|undefined,region:'de'|'com'|undefined;
 if(/^(?:job-boards|boards)\.greenhouse\.io$/.test(h)){provider='greenhouse';token=parts[0]||'';}
 else if(/^(?:jobs|jobs\.eu)\.lever\.co$/.test(h)){if(h==='jobs.eu.lever.co')return{provider:'lever'};provider='lever';token=parts[0]||'';}
 else if(h==='jobs.ashbyhq.com'){provider='ashby';token=parts[0]||'';}
 else if(h==='careers.kula.ai'){provider='kula';token=parts[0]||'';}
 else if(/^[a-z0-9-]+\.hire\.trakstar\.com$/.test(h)){provider='trakstar';token=h.split('.')[0];}
 else if(h==='www.amazon.jobs'||h==='amazon.jobs'){provider='amazon';token='amazon';}
 else if(h==='apply.careers.microsoft.com'){provider='microsoft';token='microsoft';}
 else if(h==='www.google.com'&&u.pathname.startsWith('/about/careers/applications/')){provider='google';token='google';}
 else if(/^(?:jobs|careers)\.smartrecruiters\.com$/.test(h)){provider='smartrecruiters';token=parts[0]||'';}
 else if(h==='apply.workable.com'){provider='workable';token=parts[0]||'';if(token==='j')return null;}
 else if(/^[a-z0-9-]+\.recruitee\.com$/.test(h)){provider='recruitee';token=h.split('.')[0];}
 else if(/^[a-z0-9-]+\.jobs\.personio\.(?:de|com)$/.test(h)){provider='personio';token=h.split('.')[0];region=h.endsWith('.de')?'de':'com';}
 else if(/^[a-z0-9-]+\.breezy\.hr$/.test(h)){provider='breezy';token=h.split('.')[0];}
 else if(/^[a-z0-9-]+\.(?:teamtailor\.com|teamtailor\.jobs)$/.test(h)){provider='teamtailor';host=h;token=h.split('.')[0];}
 else if(h==='ats.rippling.com'){provider='rippling';token=parts[0]||'';}
 else if(/^[a-z0-9-]+\.wd[0-9]{1,3}\.myworkdayjobs\.com$/.test(h)){provider='workday';host=h;token=h.split('.')[0];site=parts.find(p=>!/^en[-_][A-Z]{2}$/i.test(p));}
 else if(/^[a-z0-9-]+\.fa\.(?:[a-z0-9-]+\.)?oraclecloud\.com$/.test(h)){provider='oracle';host=h;const i=parts.indexOf('sites');token=i>=0?parts[i+1]||'':'';}
 if(provider){const candidate:Source={id:'detected',company,provider,token,careerUrl:u.toString(),...(['amazon','microsoft','google','kula','trakstar','workday'].includes(provider)?{country:'IN' as const}:{}),...(host?{host}:{}),...(site?{site}:{}),...(region?{region}:{})};return{provider,...(validSourceAddress(candidate)?{candidate}:{})};}
 const other=unsupported.find(([,pattern])=>pattern.test('.'+h));return other?{provider:other[0]}:null;
}
export function careerLinks(html:string,base:string){
 const links:string[]=[];for(const m of html.matchAll(/\bhref\s*=\s*["']([^"']{1,2048})["']/gi)){try{const u=new URL(m[1].replace(/&amp;/g,'&'),base);if(u.protocol==='https:'&&!u.username&&!u.password)links.push(u.toString());}catch{}if(links.length>=600)break;}return [...new Set(links)];
}
export function directoryRows(sources:Source[],checks:EmployerChecks,health?:{id:string;success:number;count:number}[]){
 const connected=new Map(sources.filter(s=>s.provider!=='jobicy').map(s=>[employerName(s.company),s]));
 return employers.map(e=>{const source=connected.get(employerName(e.name)),run=source?health?.find(h=>h.id===source.id):null,check=checks[e.id],known=e.careersUrl?detectEmployerBoard(e.careersUrl,e.name):null;return{...e,requested:isRequestedEmployer(e.name),provider:source?.provider||check?.provider||known?.provider||null,state:source?(health?(run?.success?'connected':run?'source-error':'import-pending'):'connected'):check?.state||(!e.careersUrl?'needs-url':'queued'),sourceId:source?.id||null,checkedAt:check?.checkedAt||null,reason:source?(health&&!run?'First import is pending.':run&&!run.success?'The last import needs attention. Existing listings are preserved.':'Published jobs are imported through this connected feed.'):check?.reason||'Awaiting a career-page check.',canConnect:!source&&!!check?.candidate,candidate:check?.candidate};});
}
