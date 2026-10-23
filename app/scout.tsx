"use client";

import {useEffect,useId,useRef,useState} from 'react';
import {ArrowUpRight,Bookmark,Check,Search,Sparkles} from 'lucide-react';

export type ScoutMood='idle'|'searching'|'saved'|'applied'|'quiet'|'hello';

export function ScoutMark(){return <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true" focusable="false"><path d="M12 27 8 8q14 0 20 12M38 20Q47 8 57 9l-5 22" fill="#688078" stroke="#263f37" strokeWidth="3" strokeLinejoin="round"/><path d="M10 27Q15 16 32 19q20-4 24 12 7 20-23 28C7 54 3 39 10 27" fill="#a7b7a6" stroke="#263f37" strokeWidth="3"/><path d="M9 33q8-12 22-1 15-13 24-1 3 14-14 12H24Q9 46 9 33" fill="#263f37"/><ellipse cx="21" cy="34" rx="4" ry="5" fill="#fff6df"/><ellipse cx="43" cy="34" rx="4" ry="5" fill="#fff6df"/><circle cx="22" cy="35" r="2" fill="#263f37"/><circle cx="44" cy="35" r="2" fill="#263f37"/><path d="M23 46q9-10 18 0-2 9-9 9t-9-9" fill="#fff6df"/><path d="m27 43 10 0-5 7Z" fill="#263f37"/></svg>;}

/** Original vector artwork: the individual parts stay crisp and independently animatable. */
export function ScoutRaccoon({compact=false,eventKey=0}:{compact?:boolean;eventKey?:number}){
 const id=useId().replace(/:/g,'');
 const tail=id+'tail',glass=id+'glass';
 return <svg key={eventKey} className={'scout-art '+(compact?'scout-art-compact':'')} viewBox="0 0 600 410" fill="none" aria-hidden="true" focusable="false">
  <defs><clipPath id={tail}><path d="M351 301C386 308 410 305 430 275C447 249 452 210 478 220C507 232 485 274 465 295C437 325 393 344 355 330Z"/></clipPath><linearGradient id={glass} x1="340" y1="140" x2="390" y2="200" gradientUnits="userSpaceOnUse"><stop stopColor="#e5f6e6" stopOpacity=".6"/><stop offset="1" stopColor="#b7e0d7" stopOpacity=".12"/></linearGradient></defs>
  <g className="scout-scenery">
   <circle cx="305" cy="201" r="164" fill="#edf0d9"/>
   <circle cx="305" cy="201" r="187" stroke="#cbd5bc" strokeDasharray="3 10"/>
   <path d="M62 242C132 300 180 96 288 116S421 251 542 170" stroke="#a3b69b" strokeWidth="1.5" strokeDasharray="4 7" className="scout-trail"/>
   <path d="m174 49 3 9 9 3-9 3-3 9-3-9-9-3 9-3ZM461 54l2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="#dba36d"/>
   <circle cx="92" cy="203" r="4" fill="#b1c3a1"/><circle cx="516" cy="285" r="4" fill="#dba36d"/>
   <ellipse cx="310" cy="371" rx="222" ry="14" fill="#dbe2cb"/>
   <g transform="rotate(-11 112 145)"><g className="scout-paper scout-paper-one"><rect x="30" y="94" width="151" height="99" rx="12" fill="#fffdf2" stroke="#b9c9af" strokeWidth="1.5"/><rect x="44" y="108" width="27" height="27" rx="8" fill="#dce8ca"/><path d="M51 118h13v10H51zM55 118v-4h5v4" stroke="#54745d" strokeWidth="1.5" strokeLinejoin="round"/><path d="M83 116h68M83 124h44" stroke="#8b9d84" strokeWidth="4" strokeLinecap="round"/><path d="M46 150h94M46 159h75" stroke="#d2dbc8" strokeWidth="4" strokeLinecap="round"/><rect x="44" y="171" width="51" height="10" rx="5" fill="#e9be93"/><circle cx="159" cy="174" r="8" fill="#dce8ca"/><path d="m155 174 3 3 5-6" stroke="#54745d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></g></g>
   <g transform="rotate(10 479 135)"><g className="scout-paper scout-paper-two"><rect x="420" y="83" width="145" height="92" rx="12" fill="#fbf6ec" stroke="#c9c2ac" strokeWidth="1.5"/><rect x="433" y="96" width="26" height="26" rx="8" fill="#eed4c4"/><path d="M443 102h7v14l-4-3-3 3z" stroke="#a36d4d" strokeWidth="1.5" strokeLinejoin="round"/><path d="M470 104h65M470 113h43" stroke="#a1957d" strokeWidth="4" strokeLinecap="round"/><path d="M435 137h108M435 148h75" stroke="#ddd7c5" strokeWidth="4" strokeLinecap="round"/><circle cx="544" cy="154" r="7" fill="#e5c293"/></g></g>
   <g className="scout-plant"><path d="M113 333v-49" stroke="#526c4f" strokeWidth="3" strokeLinecap="round"/><path d="M112 312Q81 311 84 286q28-2 28 26ZM114 300q-1-34 25-34 6 24-25 34ZM113 287q-22-13-11-32 21 10 11 32Z" fill="#9cb78a" stroke="#68835d" strokeWidth="1.5"/><path d="m91 326 43 0-7 35h-29Z" fill="#dcb18a" stroke="#a47e5c" strokeWidth="2"/><path d="M93 334h38" stroke="#edd0b2" strokeWidth="3"/></g>
   <g className="scout-coffee"><path className="scout-steam" d="M479 299q-9-9 0-18t0-17M492 296q-9-9 0-17" stroke="#aab69b" strokeWidth="2" strokeLinecap="round"/><path d="M502 321h8q20 0 15 15-4 10-22 5" stroke="#8f9f7d" strokeWidth="6"/><path d="M468 315h39v29q0 15-20 15t-19-15Z" fill="#fcf8e8" stroke="#8f9f7d" strokeWidth="2"/><path d="M478 330h18M482 339h10" stroke="#c4d2b2" strokeWidth="3" strokeLinecap="round"/></g>
  </g>
  <g className="scout-tail"><path d="M351 301C386 308 410 305 430 275C447 249 452 210 478 220C507 232 485 274 465 295C437 325 393 344 355 330Z" fill="#a3b0a2"/><g clipPath={'url(#'+tail+')'} stroke="#425a50" strokeWidth="18"><path d="m470 205 25 34M444 236l43 28M428 269l40 31M405 295l30 32M376 308l15 34"/></g><path d="M351 301C386 308 410 305 430 275C447 249 452 210 478 220C507 232 485 274 465 295C437 325 393 344 355 330" stroke="#2a443a" strokeWidth="3.5" strokeLinecap="round"/></g>
  <g className="scout-character">
   <path d="M258 245q-25 1-25 29v47q0 23 26 19l31-2-7-89Z" fill="#dda16d" stroke="#8c6649" strokeWidth="3"/><path d="M245 270v50" stroke="#f0c59b" strokeWidth="5" strokeLinecap="round"/>
   <path d="M283 229C249 240 245 295 257 331C268 358 344 364 368 338C389 315 371 260 345 237Z" fill="#789284" stroke="#2b443a" strokeWidth="3.5"/>
   <path d="M297 259C269 272 275 314 295 329C313 341 342 330 347 308C354 284 329 253 311 255Z" fill="#cbd9bf"/>
   <ellipse cx="277" cy="346" rx="28" ry="16" fill="#536f5e" stroke="#2b443a" strokeWidth="3" transform="rotate(-8 277 346)"/><ellipse cx="351" cy="347" rx="29" ry="16" fill="#536f5e" stroke="#2b443a" strokeWidth="3" transform="rotate(7 351 347)"/>
   <path d="M358 275q26-8 46-38l17 13q-18 34-51 46" fill="#789284" stroke="#2b443a" strokeWidth="3.5" strokeLinecap="round"/>
   <g className="scout-left-paw"><path d="M272 265q-24-1-36 21l17 14 27-21" fill="#789284" stroke="#2b443a" strokeWidth="3" strokeLinecap="round"/><ellipse cx="242" cy="291" rx="17" ry="13" fill="#b7c4b0" stroke="#2b443a" strokeWidth="3"/><path d="m234 287 1 6m6-7 1 6" stroke="#6c806c" strokeWidth="1.5" strokeLinecap="round"/></g>
   <g className="scout-head">
    <path className="scout-ear scout-ear-left" d="M246 137q-22-29-9-61 29 0 50 40Z" fill="#647c70" stroke="#2b443a" strokeWidth="3.5" strokeLinejoin="round"/><path d="m249 115-4-25q14 2 28 22Z" fill="#d4b69c"/>
    <path className="scout-ear scout-ear-right" d="M348 114q24-34 51-31 13 30-8 58Z" fill="#647c70" stroke="#2b443a" strokeWidth="3.5" strokeLinejoin="round"/><path d="m367 115 24-20-3 25Z" fill="#d4b69c"/>
    <path d="M242 134q15-29 47-26 24-13 54 0 37-5 55 28 23 36-2 70-22 31-78 36-53-2-78-29-24-25-10-55Z" fill="#a5b5a6" stroke="#2b443a" strokeWidth="3.5" strokeLinejoin="round"/>
    <path d="M246 154q20-26 43-11 25 17 50-1 27-20 51 12 15 23-4 45-23 25-70 28-48-3-69-27-18-20-1-46Z" fill="#f7eed8"/>
    <path d="m300 111 13-14 2 11 17-7-4 14" fill="#cdd5bd" stroke="#2b443a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M246 152c16-18 37-9 54 7q16 15 31-2c16-17 42-24 57-6 18 19 2 37-20 41-21 4-35-12-52-10-17-1-30 15-52 9-24-5-34-22-18-39Z" fill="#304b40"/>
    <g className="scout-eye"><ellipse cx="276" cy="164" rx="15" ry="18" fill="#fff9e8"/><g className="scout-pupil"><ellipse cx="281" cy="166" rx="7.5" ry="10" fill="#243e35"/><circle cx="283" cy="162" r="2.5" fill="#fff"/></g></g>
    <g className="scout-eye"><ellipse cx="355" cy="162" rx="16" ry="19" fill="#fff9e8"/><g className="scout-pupil"><ellipse cx="360" cy="164" rx="8" ry="11" fill="#243e35"/><circle cx="362" cy="160" r="3" fill="#fff"/></g></g>
    <path className="scout-brows" d="m263 137 19-5m60 0 18-4" stroke="#46624f" strokeWidth="3.5" strokeLinecap="round"/>
    <ellipse cx="265" cy="198" rx="12" ry="6" fill="#e7ac88" fillOpacity=".6"/><ellipse cx="366" cy="197" rx="12" ry="6" fill="#e7ac88" fillOpacity=".6"/>
    <ellipse cx="316" cy="207" rx="32" ry="22" fill="#fff7e3"/>
    <path d="M306 190q10-7 21 0 1 6-10 11-10-4-11-11Z" fill="#2b443a"/>
    <path d="M317 201v5q-8 11-20 2m20-2q8 11 20-1" stroke="#2b443a" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="290" cy="202" r="1.5" fill="#899a7c"/><circle cx="343" cy="201" r="1.5" fill="#899a7c"/>
   </g>
   <path d="M286 229q31 18 60-2l-4 22q-25 15-52 1Z" fill="#e9ac75" stroke="#a26d47" strokeWidth="2"/><path d="m336 246 18 19-22-5Z" fill="#e9ac75" stroke="#a26d47" strokeWidth="2" strokeLinejoin="round"/>
   <g className="scout-lens"><path d="m391 200 36 34" stroke="#273f36" strokeWidth="13" strokeLinecap="round"/><path d="m398 208 25 24" stroke="#dfa96e" strokeWidth="8" strokeLinecap="round"/><circle cx="364" cy="170" r="39" fill={'url(#'+glass+')'} stroke="#293f37" strokeWidth="7"/><circle cx="364" cy="170" r="32.5" stroke="#9cbfa7" strokeWidth="2"/><path d="M343 151q6-8 15-9m-20 19 1-3" stroke="#fffdf0" strokeWidth="4" strokeLinecap="round"/><ellipse cx="412" cy="238" rx="15" ry="12" fill="#b7c4b0" stroke="#2b443a" strokeWidth="3" transform="rotate(-33 412 238)"/><path d="m407 231 4 4m1-7 4 4" stroke="#6c806c" strokeWidth="1.5" strokeLinecap="round"/></g>
  </g>
  <g className="scout-laptop"><path d="m202 297 135-6q9 0 10 9l6 62-141 5-17-61q-2-8 7-9Z" fill="#375e49" stroke="#243e32" strokeWidth="3" strokeLinejoin="round"/><path d="m211 305 124-6 6 54-119 5Z" fill="#446f54"/><rect x="237" y="315" width="73" height="31" rx="7" fill="#e7edcd" transform="rotate(-3 237 315)"/><path d="m250 327 10 0m8 0 25-2m-41 10 35-2" stroke="#7d9870" strokeWidth="3" strokeLinecap="round"/><path d="m192 365 165-5 12 9q-90 12-174 6Z" fill="#b9c9a6" stroke="#2b443a" strokeWidth="2.5" strokeLinejoin="round"/><path d="m257 366 48-1" stroke="#7e9574" strokeWidth="3" strokeLinecap="round"/></g>
  <g className="scout-folder"><path d="m374 325 18-2 8 6 42-3 5 41-68 5Z" fill="#eed0a3" stroke="#b29267" strokeWidth="2" strokeLinejoin="round"/><path d="m383 341 52-5m-50 15 36-4" stroke="#caaf84" strokeWidth="3" strokeLinecap="round"/></g>
  <g className="scout-celebration"><path d="m207 74 4 12 12 3-12 4-4 12-3-12-12-4 12-3Z" fill="#dfa46a"/><path d="m423 57 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#9bb88a"/><circle cx="457" cy="200" r="6" fill="#dfa46a"/><path d="m192 225 4-9m221-94 8-4M369 51l-3-9" stroke="#9bb88a" strokeWidth="4" strokeLinecap="round"/></g>
  <g className="scout-success-badge"><circle cx="456" cy="91" r="24" fill="#365c43" stroke="#fff7df" strokeWidth="4"/><path d="m445 91 7 7 15-16" stroke="#e0efb7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>
 </svg>;
}

const captions:Record<ScoutMood,{label:string;title:string;detail:string}>={
 idle:{label:'YOUR SEARCH SIDEKICK',title:'Small paws. Big possibilities.',detail:'Meet Scout. A little company for your next chapter.'},
 searching:{label:'SEARCH IN PROGRESS',title:'Magnifying glass? Check.',detail:'Your requested search is running. Results will appear in the feed.'},
 saved:{label:'SAVED TO INTERESTED',title:'That one’s worth a closer look.',detail:'Scout approves the bookmark. Your next step is up to you.'},
 applied:{label:'MARKED AS APPLIED',title:'One more step. Nicely done.',detail:'Your application is in the tracker. Keep going at your pace.'},
 quiet:{label:'A LITTLE BREATHING ROOM',title:'Good things take a little looking.',detail:'Try a different filter or explore the connected companies.'},
 hello:{label:'OH, HELLO THERE',title:'You’ve got a little company.',detail:'One opportunity, one small step at a time.'}
};

export default function ScoutScene({mood='idle',variant='dashboard',message,eventKey=0}:{mood?:ScoutMood;variant?:'dashboard'|'landing';message?:string;eventKey?:number}){
 const [greeting,setGreeting]=useState(false),[active,setActive]=useState(true);
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{if(!greeting)return;const timer=setTimeout(()=>setGreeting(false),3500);return()=>clearTimeout(timer);},[greeting]);
 useEffect(()=>{if(!ref.current||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver(([entry])=>setActive(entry.isIntersecting),{rootMargin:'80px'});observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const current=greeting&&mood!=='searching'?'hello':mood;
 const caption=captions[current];
 return <figure ref={ref} className={'scout-scene scout-scene-'+variant} data-mood={current} data-active={active?'true':'false'}>
  <div className="scout-scene-top"><span><span className="scout-name-dot"/>SCOUT <span className="scout-top-divider">/</span> YOUR OPPORTUNITY SCOUT</span><Sparkles size={15}/></div>
  <div className="scout-stage"><div className="scout-orbit-label scout-orbit-label-one"><Search size={13}/><span>A little curiosity</span></div><div className="scout-orbit-label scout-orbit-label-two"><Bookmark size={13}/><span>A place for possibilities</span></div><button className="scout-greet" type="button" disabled={mood==='searching'} onClick={()=>setGreeting(true)} aria-label={mood==='searching'?'Scout is checking your requested search':'Say hello to Scout the raccoon'} title={mood==='searching'?'Search in progress':'Psst… say hello to Scout'}><ScoutRaccoon eventKey={eventKey}/></button><span className="scout-say-hi">{current==='hello'?<><Check size={11}/>Hello, human.</>:current==='searching'?<>A little focused curiosity <Search size={11}/></>:<>Psst… tap the raccoon <ArrowUpRight size={11}/></>}</span></div>
  <figcaption className="scout-caption">{variant==='landing'&&<span className="scout-caption-label"><span className={current==='searching'?'scout-search-dot':''}/>{caption.label}</span>}<strong>{caption.title}</strong>{(!!message||variant==='landing')&&<p>{message||caption.detail}</p>}</figcaption>
 </figure>;
}
