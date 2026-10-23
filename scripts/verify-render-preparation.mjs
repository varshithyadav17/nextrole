import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,writeFile,readFile,access,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..'),temporary=await mkdtemp(path.join(tmpdir(),'nextrole-render-preparation-'));
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const exists=async file=>access(file).then(()=>true,()=>false);
async function fixture(name){
 const directory=path.join(temporary,name);await mkdir(path.join(directory,'scripts'),{recursive:true});
 for(const file of ['scripts/prepare-render.mjs','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','lib/bridge/session.ts','lib/google-oidc.ts','lib/http-json.ts']){await mkdir(path.dirname(path.join(directory,file)),{recursive:true});await cp(path.join(root,file),path.join(directory,file));}
 await cp(path.join(root,'deploy'),path.join(directory,'deploy'),{recursive:true});
 await mkdir(path.join(directory,'app/api/example'),{recursive:true});await writeFile(path.join(directory,'app/api/example/route.ts'),'export async function GET(){return Response.json({ok:true});}\n');
 return directory;
}
function generate(directory,out){return spawnSync(process.execPath,[path.join(directory,'scripts/prepare-render.mjs'),'--out',out],{cwd:directory,encoding:'utf8',timeout:15000});}
try{
 const directory=await fixture('project'),out=path.join(directory,'.deploy/render');
 let result=generate(directory,out);check(result.status===0,'First deployment generates the backend: '+result.stderr);
 await mkdir(path.join(out,'app/api/removed'),{recursive:true});await writeFile(path.join(out,'app/api/removed/route.ts'),'stale route');
 await mkdir(path.join(out,'node_modules'),{recursive:true});await writeFile(path.join(out,'node_modules/cache-probe'),'dependency cache');
 await mkdir(path.join(out,'.next/cache'),{recursive:true});await writeFile(path.join(out,'.next/cache/probe'),'compiler cache');
 await writeFile(path.join(out,'old-config.txt'),'stale generated file');
 result=generate(directory,out);check(result.status===0,'A cached second deployment generates successfully: '+result.stderr);
 check(!await exists(path.join(out,'app/api/removed'))&&!await exists(path.join(out,'old-config.txt')),'Cached routes and old generated files cannot survive a source change.');
 check(await readFile(path.join(out,'node_modules/cache-probe'),'utf8')==='dependency cache'&&await readFile(path.join(out,'.next/cache/probe'),'utf8')==='compiler cache','Dependency and compiler caches are retained for the subsequent install/build.');
 check(await exists(path.join(out,'app/api/example/route.ts')),'Current source routes are regenerated.');
 const partial=await fixture('partial'),partialOut=path.join(partial,'.deploy/render');await mkdir(path.join(partialOut,'node_modules'),{recursive:true});await mkdir(path.join(partialOut,'.next/cache'),{recursive:true});await writeFile(path.join(partialOut,'node_modules/probe'),'partial dependency cache');
 result=generate(partial,partialOut);check(result.status===0&&await readFile(path.join(partialOut,'node_modules/probe'),'utf8')==='partial dependency cache'&&await exists(path.join(partialOut,'app/api/example/route.ts')),'A cache-only restore regenerates source without requiring a missing source marker.');
 const outside=path.join(temporary,'outside');await mkdir(outside);await writeFile(path.join(outside,'keep.txt'),'keep');
 result=generate(directory,outside);check(result.status!==0&&await readFile(path.join(outside,'keep.txt'),'utf8')==='keep','An arbitrary nonempty output directory is never cleaned.');
 const unknown=await fixture('unknown'),unknownOut=path.join(unknown,'.deploy/render');await mkdir(unknownOut,{recursive:true});await writeFile(path.join(unknownOut,'keep.txt'),'keep');
 result=generate(unknown,unknownOut);check(result.status!==0&&await readFile(path.join(unknownOut,'keep.txt'),'utf8')==='keep','Unmarked content in the fixed build directory is protected.');
 const linked=await fixture('linked');await symlink(outside,path.join(linked,'.deploy'),'dir');
 result=generate(linked,path.join(linked,'.deploy/render'));check(result.status!==0&&await readFile(path.join(outside,'keep.txt'),'utf8')==='keep','A symlinked managed parent cannot redirect cleanup.');
 const cacheLink=await fixture('linked-cache'),cacheOut=path.join(cacheLink,'.deploy/render');await mkdir(cacheOut,{recursive:true});await symlink(outside,path.join(cacheOut,'node_modules'),'dir');
 result=generate(cacheLink,cacheOut);check(result.status!==0&&await readFile(path.join(outside,'keep.txt'),'utf8')==='keep','A symlink cannot pose as a restored dependency cache.');
 console.log(JSON.stringify({passed:true,checks,scope:'Fresh and cached Render builds, stale route removal, preserved caches and cleanup boundaries'}));
}finally{await rm(temporary,{recursive:true,force:true});}
