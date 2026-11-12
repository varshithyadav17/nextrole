import {registerHooks} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.(ts|mjs|js|json)$/.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const args=new Map();for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i],value=process.argv[i+1];if(!['--snapshot','--out','--section'].includes(key)||!value||args.has(key))throw Error('Use --snapshot private.json --out report.pdf [--section all].');args.set(key,value);}
if(!args.has('--snapshot'))throw Error('A private report snapshot is required.');
const raw=await readFile(path.resolve(args.get('--snapshot')),'utf8');if(Buffer.byteLength(raw)>2_000_000)throw Error('Snapshot is too large.');
const parsed=JSON.parse(raw),report=parsed.analyticsReport||parsed;
if(!report.analytics||!Array.isArray(report.daily)||!report.generatedAt||!report.start||!report.today)throw Error('Expected the aggregate analyticsReport snapshot, not user records.');
const section=args.get('--section')||'all';if(!['all','overview','retention','features','journey','feedback','operations'].includes(section))throw Error('Unknown report section.');
const {buildAdminPDF}=await import('../lib/admin-pdf.ts');
const output=path.resolve(args.get('--out')||'output/pdf/NextRole_Product_Analytics_'+report.today+'.pdf');
await mkdir(path.dirname(output),{recursive:true});const bytes=await buildAdminPDF(report,section);await writeFile(output,bytes);
console.log(JSON.stringify({output,bytes:bytes.length,period:report.start+' / '+report.today,generatedAt:report.generatedAt,section}));
