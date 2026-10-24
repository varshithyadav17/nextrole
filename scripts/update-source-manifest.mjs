import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),target='handoff/SOURCE-MANIFEST.json',files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(file=>file&&file!==target);
const source_files=[];for(const file of [...new Set(files)].sort()){const bytes=await readFile(path.join(root,file));source_files.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const parentCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
await writeFile(path.join(root,target),JSON.stringify({project:'NextRole',release:'Compact Scout interface sizing with browser-reviewed laptop and mobile spacing',generatedAt:new Date().toISOString(),parentCommit,notice:'Complete source snapshot excluding this manifest. Deployment receipts identify the exact pushed commit. Portfolio metrics are labelled synthetic. No production credentials or student records.',source_files},null,2)+'\n');
console.log(JSON.stringify({files:source_files.length,parentCommit}));
