import {z} from 'zod';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {isHost} from '../../../../lib/admin';
import {hostMetrics} from '../../../../lib/host-metrics';
import {buildAdminPDF} from '../../../../lib/admin-pdf';
import {adminReportDetails} from '../../../../lib/admin-report-data';
import {allowRequest} from '../../../../lib/rate-limit';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to NextRole.'},{status:401,headers:{'Cache-Control':'no-store'}});if(!isHost(user))return Response.json({error:'Admin access required.'},{status:403,headers:{'Cache-Control':'no-store'}});
 try{const p=new URL(request.url).searchParams,days=z.coerce.number().refine(n=>[7,30,90].includes(n)).parse(p.get('days')||30),section=z.enum(['all','overview','retention','features','journey','feedback','operations']).parse(p.get('section')||'all');if(!await allowRequest(user.userId,'external',6))return Response.json({error:'Please wait before exporting another report.'},{status:429,headers:{'Cache-Control':'no-store'}});const report=await hostMetrics(days,user.userId),detail=await adminReportDetails(report,user.userId),bytes=await buildAdminPDF({...report,detail},section);return new Response(bytes as BodyInit,{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="NextRole_${section}_${report.today}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch(e){return Response.json({error:e instanceof z.ZodError?'Choose a valid report period and section.':'Report preparation is temporarily unavailable.'},{status:e instanceof z.ZodError?400:503,headers:{'Cache-Control':'no-store'}});}
}
