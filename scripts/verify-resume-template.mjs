import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {PDFDocument,PDFName,PDFDict,PDFArray,PDFRawStream} from 'pdf-lib';

// Synthetic data only. Never seed this fixture into a user's career profile.
export function resumeTemplateFixture(){
 const fact=(kind,title,details=[],extra={})=>({id:crypto.randomUUID(),kind,title,organization:'',dates:'',details,url:'',githubUrl:'',demoUrl:'',verified:true,...extra});
 return {name:'Example Student',email:'student@example.test',phone:'+91 00000 00000',location:'',website:'',links:{github:'https://github.com/example-student',linkedin:'https://www.linkedin.com/in/example-student',leetcode:'https://leetcode.com/u/example-student',codeforces:'https://codeforces.com/profile/example-student'},contactVerified:true,summary:'Software engineering student focused on Python, backend development, retrieval systems and reliable application workflows. Hands-on experience with FastAPI, PostgreSQL and React through independently reviewed academic projects. Interested in building practical tools with clear source evidence and tested behavior.',summaryVerified:true,facts:[
  fact('education','B.Tech. in Computer Science',[],{organization:'Example Institute of Technology',dates:'2023--2027',annotation:'CGPA: 8.0/10'}),
  fact('education','Class X -- Secondary School Certificate',[],{organization:'Example High School',dates:'2019--2020',annotation:'90%'}),
  fact('education','Class XII -- Intermediate Education',[],{organization:'Example Junior College',dates:'2020--2022',annotation:'92%'}),
  fact('skill','Languages',['Python, JavaScript, C++, SQL']),
  fact('skill','AI / Retrieval',['Embeddings, semantic search, BM25, hybrid retrieval, evaluation']),
  fact('skill','Backend & Data',['FastAPI, Node.js, REST APIs, PostgreSQL, Redis']),
  fact('skill','Frontend',['React, TypeScript, HTML, CSS']),
  fact('skill','Engineering',['Git, Docker, Linux, automated tests']),
  fact('project','Repository Explorer | Engineering Knowledge Workspace',[
   'Built a searchable workspace for repository documents using structured parsing and source-linked retrieval. Preserved the original source alongside every extracted record.',
   'Developed FastAPI services for document ingestion, dependency summaries and indexed search with bounded processing and visible error recovery.',
   'Integrated PostgreSQL for application records and added tests for ownership, duplicate observations and missing source evidence.'
  ],{technologies:'Python | FastAPI | React | PostgreSQL | Retrieval',githubUrl:'https://github.com/example-student/repository-explorer',demoUrl:'https://example.test/explorer'}),
  fact('project','Project Notebook | Source-Based Research Workspace',[
   'Created an academic project that turns document collections into searchable notes. Compared keyword and semantic retrieval against a manually reviewed synthetic evaluation set.',
   'Implemented source attribution and explicit uncertainty when retrieved passages did not support an answer. Retained references for human review.',
   'Added deterministic validation and integration checks for ingestion retries, malformed documents and interrupted requests.'
  ],{technologies:'Python | FastAPI | PostgreSQL | Hybrid Retrieval',demoUrl:'https://example.test/notebook'}),
  fact('project','Opportunity Tracker | Application History',[
   'Built a personal job tracker with saved job descriptions, separate application milestones and immutable copies of submitted documents.',
   'Implemented accessible forms and CSV reports that keep unknown dates separate from known application dates.',
   'Tested concurrent edits and account deletion using synthetic identities. No external applications were submitted by the project.'
  ],{technologies:'TypeScript | React | SQLite | Automated Tests'}),
  fact('certification','Backend Foundations Certificate',['Synthetic credential for layout verification; not a real candidate qualification.'],{organization:'Example Learning',dates:'Oct 2026'}),
  fact('certification','Data Systems Fundamentals',['Synthetic course covering indexing, data modeling and query review.'],{organization:'Example Learning',dates:'Sep 2026'}),
  fact('certification','Responsible AI Workshop',['Synthetic workshop covering source evidence and human review.'],{organization:'Example Academy',dates:'Sep 2026'}),
  fact('achievement','Academic demonstration',['Presented a source-linked project to a synthetic review panel.']),
  fact('achievement','Testing exercise',['Completed an academic exercise in reproducible workflow verification.']),
 ]};
}

export async function verifyResumeTemplate({check}){
 const {careerSchema,resumeDocument,resumeLatex}=await import('../lib/career.ts');
 const {resumePDF}=await import('../lib/resume-pdf.ts');
 const {resumeCheck}=await import('../lib/resume-check.ts');
 const {LETTER_TEMPLATE,LETTER_PREAMBLE,resumeLink}=await import('../lib/resume-template.ts');
 const input=resumeTemplateFixture(),profile=careerSchema.parse(input),ids=profile.facts.map(f=>f.id),document=resumeDocument(profile,ids),createdAt='2026-10-01T00:00:00.000Z';
 const old=careerSchema.parse({name:'Earlier student',email:'',phone:'',location:'',website:'',contactVerified:true,facts:[]});
 check(old.summary===''&&!old.summaryVerified,'Older saved profiles receive empty optional summary fields.');
 check(document.template===LETTER_TEMPLATE&&document.summary===profile.summary,'New documents pin the supplied Letter layout and confirmed summary.');
 check(!resumeDocument({...profile,summaryVerified:false},ids).summary,'An unconfirmed profile paragraph cannot enter a résumé.');
 check(!resumeDocument({...profile,facts:profile.facts.map(f=>({...f,verified:false}))},ids).sections.length,'Unconfirmed grades, technology lines and claims remain excluded.');
 const tex=resumeLatex(document);
 check(tex.startsWith(LETTER_PREAMBLE)&&tex.includes('\\hfill \\textbf{CGPA: 8.0/10}')&&tex.includes('\\small\\textit{Python \\textbar{} FastAPI'),'LaTeX retains the exact supplied preamble and uses explicit grade and technology fields.');
 check(tex.indexOf('\\section*{Profile}')<tex.indexOf('\\section*{Education}')&&tex.indexOf('\\section*{Technical Skills}')<tex.indexOf('\\section*{Projects}'),'The supplied section order is preserved for newly generated résumés.');
 const second=resumeLatex(resumeDocument({...profile,name:'Second Applicant',email:'second@example.test'},ids));
 check(second.includes('Second Applicant')&&second.includes('second@example.test')&&!second.includes(profile.name)&&!second.includes(profile.email),'A second candidate receives their own identity rather than template example details.');
 const hostile=resumeLatex({...document,summary:'Use \\input{private} & 90% #1 _test ^ ~ $',header:[{label:'Unsafe \\write18{command}',url:'javascript:alert(1)',row:0}]});
 check(hostile.includes('\\textbackslash{}input\\{private\\}')&&!hostile.includes('\\href{javascript:')&&hostile.includes('\\& 90\\%'),'User content and unsafe URL schemes cannot become executable TeX.');
 check(!resumeLink('https://127.0.0.1/private')&&!resumeLink('file:///private')&&!resumeLink('mailto:student@example.test?bcc=other@example.test'),'PDF and TeX links reject private endpoints, files and injected mail headers.');
 check(resumeCheck(resumeDocument({...profile,summary:'Verified Kubernetes practice',summaryVerified:true},ids),'Kubernetes and Python required.').matched.includes('Kubernetes'),'Compatibility checks include the verified text actually rendered in the Profile paragraph.');
 const data=await resumePDF(document,createdAt),parsed=await PDFDocument.load(data);
 const path=process.argv.find(arg=>arg.startsWith('--template-samples='))?.slice(19);
 if(path){writeFileSync(path+'/template.pdf',data);writeFileSync(path+'/template.tex',tex);writeFileSync(path+'/template-document.json',JSON.stringify(document,null,2));}
 check(parsed.getPageCount()===1&&parsed.getPage(0).getWidth()===612&&parsed.getPage(0).getHeight()===792,'The representative complete résumé fits one US Letter page.');
 const streams=[];
 for(const [,object] of parsed.context.enumerateIndirectObjects())if(object instanceof PDFDict&&object.get(PDFName.of('Subtype'))?.toString()==='/Type0'){
  const descendant=object.lookup(PDFName.of('DescendantFonts'),PDFArray).lookup(0,PDFDict),descriptor=descendant.lookup(PDFName.of('FontDescriptor'),PDFDict),ref=descriptor.get(PDFName.of('FontFile3'));
  if(ref)streams.push(descendant.get(PDFName.of('Subtype')).toString()==='/CIDFontType0'&&parsed.context.lookup(ref,PDFRawStream).dict.get(PDFName.of('Subtype')).toString()==='/OpenType');
 }
 check(streams.length===3&&streams.every(Boolean),'The three full serif fonts carry the correct OpenType stream and descendant font types.');
 const urls=parsed.getPages().flatMap(page=>(page.node.Annots()?.asArray()||[]).map(ref=>parsed.context.lookup(ref).lookup(PDFName.of('A')).lookup(PDFName.of('URI')).decodeText()));
 check(urls.includes('mailto:student@example.test')&&urls.includes(profile.links.linkedin)&&urls.includes(profile.facts.find(f=>f.githubUrl).githubUrl)&&urls.includes(profile.facts.find(f=>f.demoUrl).demoUrl),'PDF annotations retain clickable email, professional, repository and demo links.');
 check(Buffer.from(data).equals(Buffer.from(await resumePDF(document,createdAt))),'A saved template document produces stable bytes for the submitted résumé hash.');
 const legacy={name:'Legacy Student',contact:['legacy@example.test'],sections:[{title:'Projects',facts:[{id:'00000000-0000-4000-8000-000000000001',kind:'project',title:'Existing project',organization:'',dates:'2026',details:['Built a truthful project.'],url:'',githubUrl:'',demoUrl:'',verified:true}]}]};
 check(createHash('sha256').update(await resumePDF(legacy,createdAt)).digest('hex')==='57cf468899650c385abec15da0d26c1aec5e039d31a3b6a63557b8ceb8c575da','Unversioned preparation PDFs remain byte-identical to the v16 renderer.');
 check(resumeLatex(legacy).includes('a4paper')&&!resumeLatex(legacy).includes('letterpaper'),'Unversioned preparation LaTeX keeps its earlier layout.');
 check(!resumeDocument(profile,ids,'legacy').template&&!resumeDocument(profile,ids,'legacy').summary,'Editing an unversioned preparation preserves its earlier document structure.');
 const long={...document,name:'A'.repeat(100),header:[{label:'x'.repeat(240)+'@example.test',url:'mailto:'+('x'.repeat(240))+'@example.test',row:0}],sections:[{title:'Projects',facts:Array.from({length:6},(_,i)=>({...profile.facts.find(f=>f.kind==='project'),title:'Long project '+i+' '+('X'.repeat(140)),details:Array.from({length:4},(_,j)=>'END_'+i+'_'+j+' '+('Verified content for overflow testing. '.repeat(12)))}))}]};
 const longPDF=await resumePDF(long,createdAt),longParsed=await PDFDocument.load(longPDF);
 check(longParsed.getPageCount()>1&&longParsed.getPageCount()<=12,'Long text and unbroken contact strings paginate without dropping content.');
 const unicode=await resumePDF({...document,name:'Жанна Élodie Example'},createdAt);check((await PDFDocument.load(unicode)).getTitle()==='Resume - Жанна Élodie Example','Supported non-Latin characters retain their identity through font fallback.');
 let refused=false;try{await resumePDF({...document,name:'Unsupported 🧑'},createdAt);}catch(error){refused=error.message.includes('No characters were replaced');}check(refused,'Unsupported glyphs fail clearly instead of disappearing from a résumé.');
 let bounded=false;try{await resumePDF({...long,sections:[{title:'Projects',facts:Array.from({length:30},(_,i)=>({...long.sections[0].facts[0],title:'Bounded '+i,details:Array(4).fill('W'.repeat(500))}))}]},createdAt);}catch(error){bounded=error.message.includes('12 pages');}check(bounded,'Oversized résumés fail at the retained page budget instead of truncating.');
 if(path){writeFileSync(path+'/long.pdf',longPDF);writeFileSync(path+'/unicode.pdf',unicode);}
}
