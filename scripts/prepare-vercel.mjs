/** Create an isolated, reproducible Next.js frontend from the reviewed Site source. */
import {cp,mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),index=process.argv.indexOf('--out'),out=index>=0&&process.argv[index+1]?path.resolve(process.argv[index+1]):null;
if(!out||out===root||out.startsWith(root+path.sep))throw new Error('Use --out with an empty absolute directory outside this checkout.');
await mkdir(out,{recursive:true});if((await readdir(out)).length)throw new Error('The output directory must be empty.');
for(const directory of ['app','lib','components','hooks','public']){
 try{await stat(path.join(root,directory));}catch{continue;}
 await cp(path.join(root,directory),path.join(out,directory),{recursive:true,filter:p=>!['api','mcp'].some(name=>p===path.join(root,'app',name)||p.startsWith(path.join(root,'app',name)+path.sep))});
}
for(const file of ['tsconfig.json','cloudflare-env.d.ts','postcss.config.mjs','pnpm-lock.yaml','pnpm-workspace.yaml','components.json']){try{await cp(path.join(root,file),path.join(out,file));}catch(error){if(error.code!=='ENOENT')throw error;}}
for(const file of await readdir(root)){if(file.endsWith('.d.ts')&&file!=='next-env.d.ts')await cp(path.join(root,file),path.join(out,file));}
const templates=path.join(root,'deploy/vercel');
for(const [source,target] of [['auth.ts.template','app/chatgpt-auth.ts'],['auth-role.ts.template','app/auth-role.ts'],['proxy.ts.template','lib/vercel-proxy.ts'],['login.ts.template','lib/vercel-login.ts'],['google-login.ts.template','lib/vercel-google.ts'],['next.config.ts.template','next.config.ts']])await cp(path.join(templates,source),path.join(out,target));
// Code for D1/R2 remains on the existing Site. Only signed, allowlisted personal routes are proxied.
const endpoints=[];
async function routes(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await routes(file);else if(entry.name==='route.ts'){
 const relative=path.relative(path.join(root,'app'),path.dirname(file)).split(path.sep).join('/');if(relative.startsWith('api/bridge/')||['api/companion','api/maintenance','api/digest/unsubscribe'].includes(relative))continue;
 const methods=[...(await readFile(file,'utf8')).matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g)].map(m=>m[1]);
 if(!methods.length)throw new Error('Unknown route shape: '+file);endpoints.push({path:'/'+relative,methods});
 const target=path.join(out,'app',relative,'route.ts'),importPath=path.relative(path.dirname(target),path.join(out,'lib/vercel-proxy')).split(path.sep).join('/');await mkdir(path.dirname(target),{recursive:true});
 await writeFile(target,"import {proxy} from '"+importPath+"';\nexport const dynamic='force-dynamic';\nexport const runtime='nodejs';\nexport const maxDuration=120;\n"+methods.map(method=>`export async function ${method}(request:Request){return proxy(request,${JSON.stringify('/'+relative)});}`).join('\n')+'\n');
}}}
await routes(path.join(root,'app/api'));
// Email unsubscribe remains publicly usable; its recipient token is verified by the backend.
const unsubscribe=path.join(out,'app/api/digest/unsubscribe');await mkdir(unsubscribe,{recursive:true});await writeFile(path.join(unsubscribe,'route.ts'),`import {serverConfig} from '../../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){const config=serverConfig();if(!config)return new Response('Please try again later.',{status:503});return new Response(null,{status:302,headers:{Location:config.issuer+'/api/digest/unsubscribe'+new URL(request.url).search,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
`);
for(const [route,handler] of [['signin-with-chatgpt','signIn'],['signout-with-chatgpt','signOut'],['callback','callback']]){const target=path.join(out,'app',route);await mkdir(target,{recursive:true});await writeFile(path.join(target,'route.ts'),`export {${handler} as GET} from '../../lib/vercel-login';\nexport const dynamic='force-dynamic';\nexport const runtime='nodejs';\n`);}
for(const [route,handler,method]of [['auth/google','googleStart','GET'],['auth/google/callback','googleCallback','GET'],['auth/google/link','googleLink','POST'],['api/auth/options','authOptions','GET']]){const target=path.join(out,'app',route);await mkdir(target,{recursive:true});const relative=path.relative(target,path.join(out,'lib/vercel-google')).split(path.sep).join('/');await writeFile(path.join(target,'route.ts'),`export {${handler} as ${method}} from '${relative}';\nexport const dynamic='force-dynamic';\nexport const runtime='nodejs';\n`);}
const require=createRequire(import.meta.url),worker=require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs');await mkdir(path.join(out,'public/vendor'),{recursive:true});await cp(worker,path.join(out,'public/vendor/pdf.worker.min.mjs'));await writeFile(path.join(out,'lib/pdf-worker-url.ts'),"export default '/vendor/pdf.worker.min.mjs';\n");
const pdfRoot=path.dirname(require.resolve('pdfjs-dist/package.json'));for(const file of ['LICENSE','NOTICE']){try{await cp(path.join(pdfRoot,file),path.join(out,'public/vendor/pdfjs-'+file));}catch(error){if(error.code!=='ENOENT')throw error;}}
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));pkg.name='nextrole-scout';pkg.scripts={dev:'next dev',build:'next build --webpack',start:'next start',typecheck:'tsc --noEmit --incremental false'};await writeFile(path.join(out,'package.json'),JSON.stringify(pkg,null,2)+'\n');
const renderBackend=process.argv.includes('--render-backend');
if(renderBackend){
 for(const [source,target] of [['frontend-auth.ts.template','app/chatgpt-auth.ts'],['frontend-role.ts.template','app/auth-role.ts'],['frontend-proxy.ts.template','lib/render-proxy.ts']])await cp(path.join(root,'deploy/render',source),path.join(out,target));
 await writeFile(path.join(out,'lib/vercel-proxy.ts'),"export {renderProxy as proxy} from './render-proxy';\n");
 for(const file of ['lib/vercel-google.ts','lib/vercel-login.ts'])await writeFile(path.join(out,file),'// Authentication is hosted on the configured Render backend.\nexport {};\n');
 for(const [route,methods] of [...endpoints.map(e=>[e.path.slice(1),e.methods]),['auth/google',['GET']],['auth/google/callback',['GET']],['auth/google/link',['POST']],['api/auth/options',['GET']],['signin-with-chatgpt',['GET']],['signout-with-chatgpt',['GET']],['callback',['GET']],['api/digest/unsubscribe',['GET']]]){
  const target=path.join(out,'app',route,'route.ts'),relative=path.relative(path.dirname(target),path.join(out,'lib/render-proxy')).split(path.sep).join('/');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,`import {renderProxy} from '${relative}';\nexport const dynamic='force-dynamic';\nexport const runtime='nodejs';\nexport const maxDuration=120;\n`+methods.map(method=>`export async function ${method}(request:Request){return renderProxy(request,${JSON.stringify('/'+route)});}`).join('\n')+'\n');
 }
}
await writeFile(path.join(out,'vercel.json'),JSON.stringify({$schema:'https://openapi.vercel.sh/vercel.json',framework:'nextjs',buildCommand:'pnpm run build',installCommand:'pnpm install --frozen-lockfile'},null,2)+'\n');
await writeFile(path.join(out,'README.md'),'# NextRole on Vercel\n\nGenerated by scripts/prepare-vercel.mjs. Set NEXTROLE_APP_ORIGIN, NEXTROLE_BACKEND_ORIGIN and the secret NEXTROLE_BRIDGE_SECRET in Vercel production. The existing authenticated Site retains D1, private R2 files, owner tools, personal AI secrets and schedules. No data is seeded or reset here. See handoff/VERCEL.md in the complete source archive.\n');
const manifest=[];async function hashFiles(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await hashFiles(p);else manifest.push({path:path.relative(out,p).split(path.sep).join('/'),sha256:createHash('sha256').update(await readFile(p)).digest('hex')});}}await hashFiles(out);
await writeFile(path.join(out,'VERCEL-SOURCE-MANIFEST.json'),JSON.stringify({schema:1,backend:renderBackend?'render':'existing-site',endpoints,files:manifest.sort((a,b)=>a.path.localeCompare(b.path))},null,2)+'\n');
console.log(JSON.stringify({output:out,files:manifest.length,endpoints:endpoints.length}));
