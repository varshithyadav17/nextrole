// Prepare the exact generated frontend for the authenticated deployment tool.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const [directory,out,commit]=process.argv.slice(2);
if(!directory||!path.isAbsolute(directory)||!out||!path.isAbsolute(out)||!/^[a-f0-9]{40}$/.test(commit||''))throw new Error('Use absolute generated source/output paths and the exact pushed commit.');
const manifest=JSON.parse(await readFile(path.join(directory,'VERCEL-SOURCE-MANIFEST.json'),'utf8')),files=[];
for(const entry of [...manifest.files,{path:'VERCEL-SOURCE-MANIFEST.json'}]){
 if(entry.path.startsWith('/')||entry.path.split('/').includes('..'))throw new Error('Invalid source manifest path.');
 const data=await readFile(path.join(directory,entry.path));
 if(entry.sha256&&createHash('sha256').update(data).digest('hex')!==entry.sha256)throw new Error('Generated file changed: '+entry.path);
 if(data.length>150000)files.push({file:entry.path,sha:createHash('sha1').update(data).digest('hex'),size:data.length});
 else if(/\.(?:png|zip|woff2?|ttf|ico|pdf)$/i.test(entry.path))files.push({file:entry.path,data:data.toString('base64'),encoding:'base64'});
 else files.push({file:entry.path,data:data.toString('utf8'),encoding:'utf-8'});
}
await writeFile(out,JSON.stringify({requestBody:{name:'nextrole-scout',project:'prj_6MsqOzhV4nAgtZSve5zhjqoecd2M',target:'production',files,gitMetadata:{commitSha:commit,commitRef:'main',commitMessage:'NextRole: dedicated admin analytics, active time and PDF reports',dirty:false},projectSettings:{framework:'nextjs',nodeVersion:'22.x'}}}));
console.log(JSON.stringify({output:out,files:files.length,referencedExistingLargeBlobs:files.filter(f=>f.sha).map(f=>({file:f.file,sha:f.sha,size:f.size}))}));
