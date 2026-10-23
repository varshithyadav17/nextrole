import {PDFDocument} from 'pdf-lib';
import {resumeDocument,type CareerProfile,type ResumeDocument} from './career';
import {resumePDF} from './resume-pdf';
import {PublicError} from './errors';

export async function resumePageCount(document:ResumeDocument,createdAt?:string){
 return (await PDFDocument.load(await resumePDF(document,createdAt))).getPageCount();
}

/** Select whole verified facts by relevance; never shrink fonts, clip bullets or alter claims. */
export async function onePageResume(profile:CareerProfile,rankedIds:string[],render=(ids:string[])=>resumeDocument(profile,ids)){
 const ids=[...new Set(rankedIds)].filter(id=>profile.facts.some(f=>f.id===id&&f.verified));
 if(!ids.length)throw new PublicError('Select at least one reviewed fact for your résumé.');
 const counts=new Map<string,number>();
 async function pages(selected:string[]){
  const key=selected.join(',');if(counts.has(key))return counts.get(key)!;
  let count:number;
  try{count=await resumePageCount(render(selected));}catch(error){if(error instanceof PublicError&&error.message.includes('exceeds 12 pages'))count=13;else throw error;}
  counts.set(key,count);return count;
 }
 const originalPages=await pages(ids);
 if(originalPages===1)return {selected:ids,omitted:[] as string[],resume:render(ids),originalPages,pages:1 as const};
 const fact=(id:string)=>profile.facts.find(f=>f.id===id)!;
 // Keep the highest-ranked education, skill and real-work/project evidence when present.
 const required=new Set<string>();
 for(const kinds of [['education'],['skill'],['experience','project']]){
  const id=ids.find(id=>kinds.includes(fact(id).kind));if(id)required.add(id);
 }
 if(!required.size)required.add(ids[0]);
 const rest=ids.filter(id=>!required.has(id));
 const choose=(count:number)=>{const selected=new Set([...required,...rest.slice(0,count)]);return ids.filter(id=>selected.has(id));};
 if(await pages(choose(0))!==1)throw new PublicError('Your essential facts need more than one page in your template. Shorten the summary or project bullets, then build again. Your text was not clipped or reduced to tiny type.');
 let low=0,high=rest.length;
 while(low<high){const middle=Math.ceil((low+high)/2);if(await pages(choose(middle))===1)low=middle;else high=middle-1;}
 const selected=choose(low),selectedSet=new Set(selected);
 return {selected,omitted:ids.filter(id=>!selectedSet.has(id)),resume:render(selected),originalPages,pages:1 as const};
}

export async function requireOnePage(document:ResumeDocument,createdAt?:string){
 const pages=await resumePageCount(document,createdAt);
 if(pages!==1)throw new PublicError('This edit makes the résumé '+pages+' pages. Shorten a bullet or select fewer facts to keep the one-page draft.');
 return pages;
}
