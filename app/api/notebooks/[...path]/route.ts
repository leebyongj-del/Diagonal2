import { env } from 'cloudflare:workers';
import { handleNotebook } from '../../../../lib/notebooks.mjs';
export const dynamic = 'force-dynamic';
async function handle(request:Request){return handleNotebook(request,{DB:env.DB,TEACHER_PIN:(env as unknown as Record<string,string>).TEACHER_PIN||process.env.TEACHER_PIN});}
export {handle as GET,handle as POST,handle as PATCH};
