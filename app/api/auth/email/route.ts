export const dynamic='force-dynamic';
/** The generated Node gateway replaces this route; passwords never run through the Site UI. */
export async function POST(){return Response.json({error:'Open NextRole to use email sign-in.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
