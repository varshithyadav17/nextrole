import {z} from 'zod';
import {ownerAccess} from '../../../../lib/admin';
import {PublicError} from '../../../../lib/errors';
import {downloadImportedSource,importedSummary,listAnalyticsImports,readImportedReport,readImportedRows} from '../../../../lib/analytics-import';
export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request){
 const access=await ownerAccess();if(!access.allowed)return respond({error:access.status===401?'Sign in to NextRole.':'Only the NextRole owner can view imported datasets.'},access.status);
 try{
  const params=new URL(request.url).searchParams;
  const input=z.object({id:z.string().regex(/^[a-f0-9]{64}$/).nullable(),source:z.string().regex(/^[a-f0-9]{64}$/).nullable(),view:z.enum(['summary','people','feedback','json','raw','original']),page:z.coerce.number().int().min(0).max(10000),q:z.string().trim().max(100)}).parse({id:params.get('id'),source:params.get('source'),view:params.get('view')||'summary',page:params.get('page')||0,q:params.get('q')||''});
  const report=await readImportedReport(input.id);
  if(!report)return respond({imports:await listAnalyticsImports(),report:null});
  if(input.view==='original'){if(!input.source)throw new PublicError('Choose a source workbook.');return downloadImportedSource(report.id,input.source);}
  if(input.view==='raw')return new Response(JSON.stringify({id:report.id,rows:await readImportedRows(report.id)}),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="NextRole_private_source_rows.json"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  if(input.view==='json')return new Response(JSON.stringify(report,null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="NextRole_imported_analytics.json"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  if(input.view==='summary')return respond({imports:await listAnalyticsImports(),report:importedSummary(report)});
  const source=report.sources.find(s=>s.sha256===input.source);if(!source)throw new PublicError('Choose a source workbook.');
  const records=input.view==='people'?source.people:source.feedback,query=input.q.toLowerCase(),filtered=query?records.filter(r=>Object.values(r).some(v=>typeof v==='string'&&v.toLowerCase().includes(query))):records;
  return respond({items:filtered.slice(input.page*25,(input.page+1)*25),total:filtered.length,hasMore:(input.page+1)*25<filtered.length});
 }catch(error){return respond({error:error instanceof PublicError?error.message:error instanceof z.ZodError?'Invalid analytics request.':'Could not load imported analytics.'},error instanceof PublicError?error.status:error instanceof z.ZodError?400:503);}
}
