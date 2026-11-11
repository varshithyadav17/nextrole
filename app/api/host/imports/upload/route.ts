import {z} from 'zod';
import {PublicError} from '../../../../../lib/errors';
import {requestJSON} from '../../../../../lib/request-json';
import {useAnalyticsUpload} from '../../../../../lib/analytics-import-upload';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origin is not allowed.'},{status:403,headers});
 if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(request.headers.get('authorization')||''))return Response.json({error:'An exact-source upload permission is required.'},{status:401,headers});
 try{return Response.json(await useAnalyticsUpload(request.headers.get('authorization'),await requestJSON(request,1200000)),{headers});}catch(error){return Response.json({error:error instanceof PublicError?error.message:error instanceof z.ZodError?'Invalid upload data.':'The upload could not complete. Accepted pages are preserved.'},{status:error instanceof PublicError?error.status:error instanceof z.ZodError?400:503,headers});}
}
