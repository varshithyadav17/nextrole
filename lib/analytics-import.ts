import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,one,rows} from './store';
import {PublicError} from './errors';
import {analyzeImportedRows} from './imported-analytics-model';
import type {ImportManifest,ImportRow,ImportedReport,ImportedSummary} from './imported-analytics-types';

const hash=z.string().regex(/^[a-f0-9]{64}$/);
const manifestSchema=z.object({
 version:z.literal(1),title:z.string().trim().min(1).max(120),totalRows:z.number().int().min(1).max(50000),
 sources:z.array(z.object({sha256:hash,fileName:z.string().min(1).max(180),bytes:z.number().int().min(1).max(750000),parts:z.number().int().min(1).max(100),origin:z.enum(['synthetic','imported']),sheets:z.array(z.object({name:z.string().min(1).max(100),rows:z.number().int().min(0).max(50000),headerRow:z.number().int().positive().nullable(),columns:z.record(z.string().max(250))}).strict()).min(1).max(50)}).strict()).min(1).max(10),
 pages:z.array(z.object({index:z.number().int().min(0),sha256:hash,rows:z.number().int().min(1).max(50)}).strict()).min(1).max(1000),
}).strict();
const rowSchema=z.object({source:hash,sheet:z.string().min(1).max(100),row:z.number().int().min(1).max(1000000),cells:z.record(z.union([z.string().max(16000),z.number().finite(),z.boolean(),z.null()])),formulas:z.record(z.string().max(16000)).optional()}).strict();
const idSchema=z.object({id:hash});
type Batch={id:string;created_at:string;manifest:string;manifest_hash:string;state:string;report:string|null};
const digest=async(bytes:Uint8Array|string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof bytes==='string'?new TextEncoder().encode(bytes):bytes as BufferSource))].map(n=>n.toString(16).padStart(2,'0')).join('');
function decode(value:string){if(!/^[A-Za-z0-9+/]*={0,2}$/.test(value)||value.length%4)throw new PublicError('Invalid base64 encoding.');return Uint8Array.from(atob(value),v=>v.charCodeAt(0));}
const objectKey=(id:string,sha:string)=>`analytics-imports/${id}/${sha}.xlsx`;
async function batchFor(id:string){const batch=await one<Batch>('SELECT * FROM analytics_imports WHERE id=?',id);if(!batch)throw new PublicError('Import not found.',404);return {batch,manifest:JSON.parse(batch.manifest) as ImportManifest};}
async function progress(id:string){const {batch,manifest}=await batchFor(id);const p=await one<{pages:number;sourceRows:number}>('SELECT COUNT(*) as pages,COALESCE(SUM(row_count),0) as sourceRows FROM analytics_import_pages WHERE import_id=?',id);return {id,state:batch.state,receivedPages:p?.pages||0,expectedPages:manifest.pages.length,sourceRows:p?.sourceRows||0,expectedRows:manifest.totalRows,sources:manifest.sources.map(s=>({sha256:s.sha256,fileName:s.fileName,origin:s.origin}))};}
export function importedSummary(report:ImportedReport):ImportedSummary{return {...report,sources:report.sources.map(({people,feedback,...source})=>source)};}
export async function readImportedRows(id:string){const result:ImportRow[]=[];for(let offset=0;;offset+=500){const page=await rows<{data:string}>('SELECT data FROM analytics_import_rows WHERE import_id=? ORDER BY source_sha,sheet,row_number LIMIT 500 OFFSET ?',id,offset);result.push(...page.map(r=>JSON.parse(r.data) as ImportRow));if(page.length<500)break;}return result;}
export async function listAnalyticsImports(){return rows<{id:string;title:string;created_at:string;state:string}>('SELECT id,title,created_at,state FROM analytics_imports ORDER BY created_at DESC,id DESC LIMIT 50');}
export async function readImportedReport(id?:string|null){const batch=id?await one<Batch>("SELECT * FROM analytics_imports WHERE id=? AND state='complete'",id):await one<Batch>("SELECT * FROM analytics_imports WHERE state='complete' ORDER BY created_at DESC,id DESC LIMIT 1");if(!batch?.report)return null;return JSON.parse(batch.report) as ImportedReport;}

/** Called only after the MCP route verifies the owner. No account or live event writes. */
export async function importAnalytics(operation:string,payload:unknown){
 if(operation==='begin'){
  const manifest=manifestSchema.parse(payload) as ImportManifest;
  if(new Set(manifest.sources.map(s=>s.sha256)).size!==manifest.sources.length||manifest.sources.some(s=>new Set(s.sheets.map(x=>x.name)).size!==s.sheets.length)||manifest.pages.some((p,i)=>p.index!==i)||manifest.pages.reduce((n,p)=>n+p.rows,0)!==manifest.totalRows||manifest.sources.reduce((n,s)=>n+s.sheets.reduce((m,x)=>m+x.rows,0),0)!==manifest.totalRows)throw new PublicError('Manifest counts or source identifiers do not match.');
  const id=await digest(manifest.sources.map(s=>s.sha256).sort().join('\n')),encoded=JSON.stringify(manifest),manifestHash=await digest(encoded),existing=await one<Batch>('SELECT * FROM analytics_imports WHERE id=?',id);
  if(existing&&existing.manifest_hash!==manifestHash)throw new PublicError('This source import already exists with a different manifest.',409);
  if(!existing)await db().prepare('INSERT INTO analytics_imports(id,title,created_at,manifest,manifest_hash,state) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,manifest.title,new Date().toISOString(),encoded,manifestHash,'pending').run();
  return {...await progress(id),alreadyImported:existing?.state==='complete'};
 }
 if(operation==='append'){
  const input=z.object({id:hash,page:z.number().int().min(0),packed:z.string().min(1).max(180000)}).strict().parse(payload),{batch,manifest}=await batchFor(input.id),expected=manifest.pages[input.page];
  if(!expected)throw new PublicError('Unknown import page.');
  const compressed=decode(input.packed);let bytes:Uint8Array;
  try{const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),reader=stream.getReader(),parts:Uint8Array[]=[];let size=0;while(true){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>2000000){await reader.cancel();throw new Error();}parts.push(p.value);}bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}}catch{throw new PublicError('The import page could not be decompressed.');}
  if(await digest(bytes)!==expected.sha256)throw new PublicError('Import page checksum does not match.');
  const group=z.array(rowSchema).length(expected.rows).parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))) as ImportRow[];
  if(group.some(r=>!manifest.sources.some(s=>s.sha256===r.source&&s.sheets.some(x=>x.name===r.sheet))))throw new PublicError('A row references an unknown source or sheet.');
  const already=await one<{digest:string}>('SELECT digest FROM analytics_import_pages WHERE import_id=? AND page=?',input.id,input.page);
  if(already){if(already.digest!==expected.sha256)throw new PublicError('Existing page differs.',409);return {ok:true,id:input.id,page:input.page,replayed:true};}
  if(batch.state!=='pending')throw new PublicError('This import is already complete.',409);
  await db().batch([...group.map(r=>db().prepare('INSERT INTO analytics_import_rows(import_id,source_sha,sheet,row_number,data) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(input.id,r.source,r.sheet,r.row,JSON.stringify(r))),db().prepare('INSERT INTO analytics_import_pages(import_id,page,digest,row_count) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(input.id,input.page,expected.sha256,group.length)]);
  return {ok:true,id:input.id,page:input.page,rows:group.length};
 }
 if(operation==='file'){
  const input=z.object({id:hash,source:hash,data:z.string().min(1).max(1000000)}).strict().parse(payload),{manifest}=await batchFor(input.id),source=manifest.sources.find(s=>s.sha256===input.source);
  if(!source)throw new PublicError('Unknown source workbook.');if(!env.BUCKET)throw new PublicError('Private file storage is unavailable.',503);
  const bytes=decode(input.data);if(bytes.length!==source.bytes||await digest(bytes)!==source.sha256)throw new PublicError('Original workbook checksum or size does not match.');
  const key=objectKey(input.id,source.sha256),existing=await env.BUCKET.head(key);if(existing&&existing.customMetadata?.sha256!==source.sha256)throw new PublicError('Stored workbook differs.',409);
  if(!existing)await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},customMetadata:{sha256:source.sha256,importId:input.id}});
  return {ok:true,id:input.id,source:source.sha256,bytes:bytes.length,replayed:!!existing};
 }
 const {id}=idSchema.strict().parse(payload),{batch,manifest}=await batchFor(id);
 if(operation==='status'){return {...await progress(id),summary:batch.report?importedSummary(JSON.parse(batch.report)):null};}
 if(operation!=='finalize')throw new PublicError('Unknown import operation.');
 if(batch.state==='complete')return {ok:true,alreadyImported:true,...await progress(id),summary:importedSummary(JSON.parse(batch.report!))};
 const p=await progress(id);if(p.receivedPages!==p.expectedPages||p.sourceRows!==manifest.totalRows)throw new PublicError('Import is incomplete. Resume missing pages before finalizing.',409);
 if(!env.BUCKET)throw new PublicError('Private file storage is unavailable.',503);
 for(const source of manifest.sources){const file=await env.BUCKET.head(objectKey(id,source.sha256));if(!file||file.size!==source.bytes||file.customMetadata?.sha256!==source.sha256)throw new PublicError('An original workbook has not been stored or verified.',409);}
 const all=await readImportedRows(id);if(all.length!==manifest.totalRows)throw new PublicError('Stored row count differs from the manifest.',409);
 for(const source of manifest.sources)for(const sheet of source.sheets)if(all.filter(r=>r.source===source.sha256&&r.sheet===sheet.name).length!==sheet.rows)throw new PublicError('A stored sheet row count differs from the manifest.',409);
 const report=analyzeImportedRows(id,manifest,all,batch.created_at);
 await db().prepare("UPDATE analytics_imports SET state='complete',report=? WHERE id=? AND state='pending'").bind(JSON.stringify(report),id).run();
 return {ok:true,...await progress(id),summary:importedSummary(report)};
}
export async function downloadImportedSource(id:string,sha:string){hash.parse(id);hash.parse(sha);const {manifest}=await batchFor(id),source=manifest.sources.find(s=>s.sha256===sha);if(!source)throw new PublicError('Source workbook not found.',404);if(!env.BUCKET)throw new PublicError('Private file storage is unavailable.',503);const file=await env.BUCKET.get(objectKey(id,sha));if(!file)throw new PublicError('Source workbook not found.',404);return new Response(file.body,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(source.fileName)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
