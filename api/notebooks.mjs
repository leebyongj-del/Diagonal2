// Same-origin Vercel gateway. UPSTREAM_ORIGIN is configured only on the server.
export default async function handler(req,res){
 const reply=(status,message)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:message}))};
 if(!['GET','POST','PATCH'].includes(req.method))return reply(405,'지원하지 않는 요청입니다.');
 const host=req.headers.host;
 if(!host||!/^[-a-z0-9.:]+$/i.test(host))return reply(400,'올바르지 않은 주소입니다.');
 if(req.method!=='GET'&&req.headers.origin!==`https://${host}`)return reply(403,'이 사이트의 화면에서 다시 시도해 주세요.');
 let upstream;try{upstream=new URL(process.env.UPSTREAM_ORIGIN);if(upstream.protocol!=='https:'||upstream.username||upstream.password)throw Error()}catch{return reply(503,'제출 서버 연결 설정이 준비되지 않았어요. 선생님께 문의해 주세요.')}
 const incoming=new URL(req.url,`https://${host}`),path=incoming.searchParams.get('path')||'';
 if(!/^(session|login|logout|join|submit|rooms(?:\/[a-f0-9-]{36})?|submissions)$/.test(path))return reply(404,'요청한 기능을 찾을 수 없어요.');
 const target=new URL('/api/notebooks/'+path,upstream.origin);incoming.searchParams.delete('path');target.search=incoming.searchParams.toString();
 const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>/^__Secure-geometry-teacher=[a-f0-9]{64}$/.test(x));
 let payload;if(req.method!=='GET'){try{payload=typeof req.body==='string'?req.body:JSON.stringify(req.body??{});if(payload.length>30000)return reply(413,'제출 내용이 너무 길어요.')}catch{return reply(400,'제출 내용을 읽을 수 없어요.')}}
 try{
  const headers={'Content-Type':'application/json','Origin':upstream.origin,'User-Agent':'Mozilla/5.0 (compatible; GeometryClassroomGateway/1.0)'};if(cookie)headers.Cookie=cookie;
  const result=await fetch(target,{method:req.method,headers,body:payload,redirect:'manual',signal:AbortSignal.timeout(25000)});
  if(!result.headers.get('content-type')?.includes('application/json'))return reply(502,'제출 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
  const data=await result.text();res.statusCode=result.status;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  const cookies=result.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies.filter(x=>x.startsWith('__Secure-geometry-teacher=')).map(x=>x.replace(/;\s*Domain=[^;]+/ig,'')));
  res.end(data);
 }catch{return reply(502,'제출 서버에 연결할 수 없어요. 작성한 내용은 유지하고 다시 시도해 주세요.')}
}
