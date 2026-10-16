const COOKIE='__Secure-geometry-teacher';
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export const hash=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const cookie=(token,age)=>`${COOKIE}=${token}; Path=/api/notebooks; Max-Age=${age}; HttpOnly; Secure; SameSite=Strict`;
const response=(body,status=200,sessionCookie)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(sessionCookie?{'Set-Cookie':sessionCookie}:{})}});
function tokenFrom(req){const token=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null}
export async function teacherIdentity(req,env){let token=tokenFrom(req);if(!token||!env.DB)return null;const r=await env.DB.prepare('SELECT owner_id FROM teacher_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(token),Date.now()).first();return r?{userId:r.owner_id}:null}
export async function teacherLogin(req,env,b){
 if(!env.TEACHER_PIN)return response({error:'교사번호 설정이 준비되지 않았어요.'},503);
 const now=Date.now(),window=Math.floor(now/900000),ip=req.headers.get('cf-connecting-ip')||'shared';
 const attemptKey=await hash(env.TEACHER_PIN+':'+ip+':'+window);
 const tries=await env.DB.prepare('INSERT INTO teacher_login_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(attemptKey,(window+2)*900000).first();
 if(tries.count>10)return response({error:'로그인 시도가 많아요. 잠시 후 다시 시도해 주세요.'},429);
 const supplied=typeof b.pin==='string'?b.pin.trim():'';
 const [actual,expected]=await Promise.all([hash(supplied),hash(env.TEACHER_PIN)]);let difference=0;for(let i=0;i<actual.length;i++)difference|=actual.charCodeAt(i)^expected.charCodeAt(i);
 if(difference)return response({error:'교사번호가 일치하지 않아요. 다시 입력해 주세요.'},401);
 // Retain the original single teacher's ownership, including pre-PIN classrooms.
 const previous=await env.DB.prepare('SELECT owner_id FROM rooms ORDER BY created_at,id LIMIT 1').first();
 const ownerId=previous?.owner_id||'geometry-teacher';
 const token=hex(crypto.getRandomValues(new Uint8Array(32))),expires=now+12*60*60*1000;
 await env.DB.prepare('INSERT INTO teacher_sessions (token_hash,owner_id,expires_at) VALUES (?,?,?)').bind(await hash(token),ownerId,expires).run();
 await env.DB.batch([env.DB.prepare('DELETE FROM teacher_sessions WHERE expires_at<?').bind(now),env.DB.prepare('DELETE FROM teacher_login_attempts WHERE expires_at<?').bind(now)]);
 return response({teacher:true},200,cookie(token,12*60*60));
}
export async function teacherLogout(req,env){let token=tokenFrom(req);if(token)await env.DB.prepare('DELETE FROM teacher_sessions WHERE token_hash=?').bind(await hash(token)).run();return response({ok:true},200,cookie('',0))}
