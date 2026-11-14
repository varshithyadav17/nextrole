// Empty successful public feeds for tests of unrelated product workflows.
// Nonempty pages, public details, pagination and failures have separate contract tests.
export function emptyCompanyFeed(input){
 const u=new URL(String(input));
 if(u.hostname==='www.amazon.jobs')return Response.json({hits:0,jobs:[]});
 if(u.hostname==='apply.careers.microsoft.com')return Response.json({status:200,data:{count:0,positions:[]}});
 if(u.hostname==='www.google.com')return new Response('<html><body>0 jobs matched</body></html>');
 if(u.hostname==='careers.kula.ai')return new Response('<html><body>No open jobs</body></html>');
 if(u.hostname==='jsapi.recruiterbox.com')return Response.json({objects:[],meta:{total:0,offset:0,limit:10}});
 if(u.hostname.endsWith('.myworkdayjobs.com'))return Response.json({total:0,jobPostings:[]});
 if(u.hostname.endsWith('.oraclecloud.com'))return Response.json({items:[{TotalJobsCount:0,requisitionList:[]}],hasMore:false});
 return null;
}
