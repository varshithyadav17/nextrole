import {registerHooks} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.(ts|mjs|js|json)$/.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const {demoAdminReport}=await import('../lib/admin-demo.ts'),{buildAdminPDF}=await import('../lib/admin-pdf.ts');
const output=path.resolve(process.argv[2]||'output/pdf/NextRole_Synthetic_Demo_Analytics.pdf');await mkdir(path.dirname(output),{recursive:true});await writeFile(output,await buildAdminPDF(demoAdminReport(30),'all'));console.log(JSON.stringify({output,dataMode:'synthetic demo',realAdoptionClaimed:false}));
