import { teacherIdentity, teacherLogin, teacherLogout } from './teacher-auth.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
class ApiError extends Error{constructor(message,status=400){super(message);this.status=status}}
const fail=(m,s=400)=>{throw new ApiError(m,s)};
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
async function body(req){if(!req.headers.get('content-type')?.includes('application/json'))fail('JSON 형식으로 제출해 주세요.',415);let s=await req.text();if(s.length>30000)fail('제출 내용이 너무 길어요.',413);let parsed;try{parsed=JSON.parse(s)}catch{fail('제출 내용을 읽을 수 없어요.')}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))fail('제출 내용을 확인해 주세요.');return parsed}
function settings(b){
 if(!text(b.title,80)||!int(b.grade,1,3)||!int(b.classNo,1,99))fail('수업 이름, 학년과 반을 확인해 주세요.');
 const enabled=b.noteEnabled===undefined?true:b.noteEnabled,prompts=b.extraPrompts||[];
 if(typeof enabled!=='boolean'||!Array.isArray(prompts)||prompts.length>5||prompts.some(p=>!text(p,200)))fail('추가 질문은 200자 이내로 최대 5개까지 설정할 수 있어요.');
 if(!enabled&&!prompts.length)fail('탐구 노트 또는 추가 질문을 하나 이상 선택해 주세요.');
 return {enabled,prompts:prompts.map((label,i)=>({id:'q'+(i+1),label:label.trim()}))};
}
export async function handleNotebook(req,env){try{
 const url=new URL(req.url),path=url.pathname.replace(/^\/api\/notebooks\/?/,'').split('/').filter(Boolean),method=req.method;
 const user=await teacherIdentity(req,env),teacher=!!user;
 if(method!=='GET'){let origin=req.headers.get('origin');if(origin!==url.origin)fail('이 사이트의 화면에서 다시 시도해 주세요.',403)}
 if(path[0]==='session'&&method==='GET')return json({signedIn:!!user,teacher});
 const db=env.DB;if(!db)fail('제출 저장소가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요.',503);
 if(path[0]==='login'&&method==='POST')return await teacherLogin(req,env,await body(req));
 if(path[0]==='logout'&&method==='POST')return await teacherLogout(req,env);
 if(path[0]==='join'&&method==='POST'){
  const b=await body(req);if(!text(b.code,12))fail('수업 코드를 입력해 주세요.');
  const r=await db.prepare('SELECT code,title,grade,class_no,open,note_enabled,extra_prompts FROM rooms WHERE code=?').bind(b.code.trim().toUpperCase()).first();if(!r)fail('수업 코드를 찾을 수 없어요. 선생님께 확인해 주세요.',404);
  return json({...r,extra_prompts:JSON.parse(r.extra_prompts)});
 }
 if(path[0]==='submit'&&method==='POST'){
  const b=await body(req);if(!uuid(b.id)||!text(b.code,12)||!int(b.studentNo,1,99)||!text(b.name,30))fail('수업 코드, 번호, 이름을 확인해 주세요.');
  const a=b.answers||{};
  if(!Array.isArray(b.records)||b.records.length>50||b.records.some(x=>typeof x!=='string'||!/^[a-z0-9]{1,25}$/.test(x)))fail('관찰 도형 목록이 올바르지 않아요.');
  const room=await db.prepare('SELECT * FROM rooms WHERE code = ?').bind(b.code.trim().toUpperCase()).first();if(!room)fail('수업 코드를 찾을 수 없어요. 선생님께 확인해 주세요.',404);
  const keys=['definition','reason','discovery'];
  if(room.note_enabled&&!keys.every(k=>text(a[k],3000)))fail('탐구 질문 세 가지에 모두 답해 주세요. (각 3,000자 이내)');
  const prompts=JSON.parse(room.extra_prompts),ea=b.extraAnswers||{};if(prompts.some(p=>!text(ea[p.id],3000)))fail('선생님이 설정한 추가 질문에도 모두 답해 주세요. (각 3,000자 이내)');
  const extras=JSON.stringify(prompts.map(p=>({...p,answer:ea[p.id].trim()})));
  const answers=JSON.stringify(Object.fromEntries(keys.map(k=>[k,typeof a[k]==='string'?a[k].trim().slice(0,3000):'']))),observations=JSON.stringify([...new Set(b.records)]),name=b.name.trim();
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([room.id,b.studentNo,name,answers,observations,...(prompts.length?[extras]:[])]))))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const previous=await db.prepare('SELECT id,digest,created_at FROM submissions WHERE id = ?').bind(b.id).first();if(previous){if(previous.digest!==digest)fail('내용이 변경되었어요. 다시 제출해 주세요.',409);return json({id:previous.id,createdAt:previous.created_at,title:room.title,grade:room.grade,classNo:room.class_no,reused:true})}
  if(!room.open)fail('제출이 마감된 수업이에요. 선생님께 문의해 주세요.',409);
  const createdAt=new Date().toISOString();
  await db.prepare('INSERT OR IGNORE INTO submissions (id,room_id,student_no,name,answers,observations,extras,digest,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(b.id,room.id,b.studentNo,name,answers,observations,extras,digest,createdAt).run();
  const saved=await db.prepare('SELECT digest,created_at FROM submissions WHERE id = ?').bind(b.id).first();if(!saved||saved.digest!==digest)fail('제출 번호가 충돌했어요. 다시 시도해 주세요.',409);
  return json({id:b.id,createdAt:saved.created_at,title:room.title,grade:room.grade,classNo:room.class_no},201);
 }
 if(!teacher)fail('교사번호로 로그인해 주세요.',401);
 if(path[0]==='rooms'&&path.length===1&&method==='GET'){
  const r=await db.prepare('SELECT r.*, (SELECT COUNT(*) FROM submissions s WHERE s.room_id=r.id) AS submission_count, (SELECT COUNT(DISTINCT student_no) FROM submissions s WHERE s.room_id=r.id) AS student_count FROM rooms r WHERE owner_id=? ORDER BY created_at DESC').bind(user.userId).all();return json({rooms:r.results});
 }
 if(path[0]==='rooms'&&path.length===1&&method==='POST'){
  const b=await body(req),cfg=settings(b);
  const id=crypto.randomUUID(),code=Array.from(crypto.getRandomValues(new Uint8Array(8)),x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join(''),createdAt=new Date().toISOString();
  await db.prepare('INSERT INTO rooms (id,owner_id,code,title,grade,class_no,open,created_at,note_enabled,extra_prompts) VALUES (?,?,?,?,?,?,1,?,?,?)').bind(id,user.userId,code,b.title.trim(),b.grade,b.classNo,createdAt,cfg.enabled?1:0,JSON.stringify(cfg.prompts)).run();return json({id,code},201);
 }
 if(path[0]==='rooms'&&path.length===2&&method==='PATCH'){
  const b=await body(req);
  if(b.title!==undefined){const cfg=settings(b);const r=await db.prepare('UPDATE rooms SET title=?,grade=?,class_no=?,note_enabled=?,extra_prompts=? WHERE id=? AND owner_id=?').bind(b.title.trim(),b.grade,b.classNo,cfg.enabled?1:0,JSON.stringify(cfg.prompts),path[1],user.userId).run();if(!r.meta.changes)fail('수업을 찾을 수 없어요.',404);return json({ok:true})}
  if(typeof b.open!=='boolean')fail('제출 상태를 확인해 주세요.');const r=await db.prepare('UPDATE rooms SET open=? WHERE id=? AND owner_id=?').bind(b.open?1:0,path[1],user.userId).run();if(!r.meta.changes)fail('수업을 찾을 수 없어요.',404);return json({ok:true});
 }
 if(path[0]==='submissions'&&method==='GET'){
  const roomId=url.searchParams.get('room'),offset=Number(url.searchParams.get('offset')||0);if(!uuid(roomId)||!int(offset,0,1000000))fail('조회 조건을 확인해 주세요.');
  const room=await db.prepare('SELECT * FROM rooms WHERE id=? AND owner_id=?').bind(roomId,user.userId).first();if(!room)fail('수업을 찾을 수 없어요.',404);
  const rows=await db.prepare('SELECT id,student_no,name,answers,observations,extras,created_at FROM submissions WHERE room_id=? ORDER BY created_at,id LIMIT 200 OFFSET ?').bind(roomId,offset).all();
  return json({submissions:rows.results.map(r=>({...r,answers:JSON.parse(r.answers),observations:JSON.parse(r.observations),extras:JSON.parse(r.extras)})),nextOffset:rows.results.length===200?offset+200:null});
 }
 return json({error:'요청한 기능을 찾을 수 없어요.'},404);
 }catch(e){if(e instanceof ApiError)return json({error:e.message},e.status);console.error('Notebook API failed',e?.name);return json({error:'처리 중 문제가 생겼어요. 내용은 그대로 두고 잠시 후 다시 시도해 주세요.'},500)}}
