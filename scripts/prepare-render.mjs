/** Stateless Render authentication/API tier. Existing D1/R2 remains the durable data service. */
import {mkdir,readFile,writeFile,cp,readdir,lstat,rm} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(process.argv[process.argv.indexOf('--out')+1]||'');
if(!process.argv.includes('--out')||out===root||out.startsWith(root+path.sep)&&out!==path.join(root,'.deploy/render'))throw new Error('Provide --out with an empty directory outside the checkout or .deploy/render.');
const managed=out===path.join(root,'.deploy/render');
// Render restores this generated directory from its build cache on later deploys.
// Only our marked, fixed build directory may be refreshed; arbitrary output stays protected.
if(managed){for(const directory of [path.dirname(out),out]){const info=await lstat(directory).catch(error=>{if(error.code==='ENOENT')return null;throw error;});if(info?.isSymbolicLink())throw new Error('Managed Render output must not use symlinks.');}}
await mkdir(out,{recursive:true});const previous=await readdir(out);
if(previous.length){
 if(!managed)throw new Error('Output must be empty.');
 const marker=path.join(out,'RENDER-SOURCE-MANIFEST.json'),info=await lstat(marker).catch(()=>null);
 if(!info?.isFile())throw new Error('Refusing to replace unrecognized Render output.');
 const manifest=JSON.parse(await readFile(marker,'utf8'));
 if(manifest.schema!==1||manifest.source!=='NextRole canonical source')throw new Error('Refusing to replace unrecognized Render output.');
 for(const name of previous)if(!['node_modules','.next'].includes(name))await rm(path.join(out,name),{recursive:true,force:true});
}
for(const dir of ['app','lib/bridge'])await mkdir(path.join(out,dir),{recursive:true});
for(const file of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json'])await cp(path.join(root,file),path.join(out,file));
for(const [from,to] of [['deploy/vercel/auth.ts.template','app/chatgpt-auth.ts'],['deploy/vercel/auth-role.ts.template','app/auth-role.ts'],['deploy/vercel/proxy.ts.template','lib/vercel-proxy.ts'],['deploy/vercel/login.ts.template','lib/vercel-login.ts'],['deploy/vercel/google-login.ts.template','lib/vercel-google.ts'],['deploy/vercel/next.config.ts.template','next.config.ts'],['deploy/render/handlers.ts.template','lib/render-handlers.ts'],['lib/bridge/session.ts','lib/bridge/session.ts'],['lib/google-oidc.ts','lib/google-oidc.ts'],['lib/http-json.ts','lib/http-json.ts']])await cp(path.join(root,from),path.join(out,to));
const endpoints=[];async function routes(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await routes(file);else if(entry.name==='route.ts'){const route='/'+path.relative(path.join(root,'app'),path.dirname(file)).split(path.sep).join('/');if(route.startsWith('/api/bridge/')||['/api/companion','/api/maintenance','/api/digest/unsubscribe','/api/auth/options'].includes(route))continue;const methods=[...(await readFile(file,'utf8')).matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g)].map(m=>m[1]);endpoints.push({path:route,methods});const target=path.join(out,'app',route.slice(1),'route.ts'),relative=path.relative(path.dirname(target),path.join(out,'lib/render-handlers')).split(path.sep).join('/');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,`import {dataRequest} from '${relative}';\nexport const dynamic='force-dynamic';\n`+methods.map(m=>`export async function ${m}(r:Request){return dataRequest(r,${JSON.stringify(route)});}`).join('\n')+'\n');}}}
await routes(path.join(root,'app/api'));
for(const [route,handler,method] of [['auth/google','googleStart','GET'],['auth/google/callback','googleCallback','GET'],['auth/google/link','googleLink','POST'],['api/auth/options','authOptions','GET'],['signin-with-chatgpt','signIn','GET'],['callback','callback','GET'],['signout-with-chatgpt','signOut','GET'],['api/auth/session','currentSession','GET'],['healthz','health','GET'],['api/digest/unsubscribe','unsubscribe','GET']]){const dir=path.join(out,'app',route);await mkdir(dir,{recursive:true});const relative=path.relative(dir,path.join(out,'lib/render-handlers')).split(path.sep).join('/');await writeFile(path.join(dir,'route.ts'),`export {${handler} as ${method}} from '${relative}';\nexport const dynamic='force-dynamic';\nexport const runtime='nodejs';\n`);}
const pkg=JSON.parse(await readFile(path.join(out,'package.json'),'utf8'));pkg.name='nextrole-render-backend';pkg.scripts={dev:'next dev --hostname 0.0.0.0',build:'next build --webpack',start:'next start --hostname 0.0.0.0',typecheck:'tsc --noEmit --incremental false'};await writeFile(path.join(out,'package.json'),JSON.stringify(pkg,null,2)+'\n');
await writeFile(path.join(out,'app/layout.tsx'),'export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}\n');
await writeFile(path.join(out,'app/page.tsx'),'export default function Home(){return <main><h1>NextRole API</h1><p>Open the NextRole app to continue.</p></main>;}\n');
await writeFile(path.join(out,'RENDER-SOURCE-MANIFEST.json'),JSON.stringify({schema:1,source:'NextRole canonical source',storage:'Existing owner-authorized D1/R2 data service; no data seeded or moved',endpoints},null,2)+'\n');
console.log(JSON.stringify({output:out,endpoints:endpoints.length,storageMigrated:false,googleActivated:false}));
