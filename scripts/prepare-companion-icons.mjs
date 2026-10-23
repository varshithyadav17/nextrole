// Render the existing product mark into the raster sizes required by browser stores.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const require=createRequire(import.meta.url),sharp=require('sharp');
await mkdir(new URL('../companion/icons/',import.meta.url),{recursive:true});
for(const size of [16,32,48,128])await sharp(new URL('../public/favicon.svg',import.meta.url).pathname).resize(size,size).png().toFile(new URL('../companion/icons/scout-'+size+'.png',import.meta.url).pathname);
console.log('Rendered four Scout extension icons.');
