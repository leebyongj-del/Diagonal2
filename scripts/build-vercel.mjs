import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source=fileURLToPath(new URL('../public/',import.meta.url));
const output=fileURLToPath(new URL('../vercel-dist/',import.meta.url));
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});await cp(source,output,{recursive:true});
console.log('Prepared classroom static assets for Vercel.');
