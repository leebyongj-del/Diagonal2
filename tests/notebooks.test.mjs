import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { hash } from '../lib/teacher-auth.mjs';
import { handleNotebook } from '../lib/notebooks.mjs';
const sqlite=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
const DB={
 async batch(stmts){return Promise.all(stmts.map(s=>s.run()))},
 prepare(sql){
  let params=[];
  return {
   bind(...v){params=v;return this},
   async first(){return sqlite.prepare(sql).get(...params)||null},
   async all(){return {results:sqlite.prepare(sql).all(...params)}},
   async run(){return {meta:sqlite.prepare(sql).run(...params)}}
  };
 }
};
const env={DB,TEACHER_PIN:'654321'},teacher={},student={};let teacherCookie='';
async function call(path,method='GET',data,user=teacher,origin='https://lab.test'){let req=new Request('https://lab.test/api/notebooks/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:user===teacher?teacherCookie:user?.cookie||''},...(data===undefined?{}:{body:JSON.stringify(data)})});let r=await handleNotebook(req,env);return {status:r.status,cookie:r.headers.get('set-cookie'),body:await r.json()}}
let login=await call('login','POST',{pin:env.TEACHER_PIN},null);assert.equal(login.status,200);teacherCookie=login.cookie.split(';')[0];
assert.equal((await call('rooms','GET',undefined,student)).status,401);
assert.equal((await call('rooms','GET',undefined,null)).status,401);
assert.equal((await call('rooms','POST',{title:'교차 출처',grade:1,classNo:1},teacher,'https://else.test')).status,403);
assert.equal((await call('submit','POST',null,null)).status,400);
let r=await call('rooms','POST',{title:'1반 다면체 탐구',grade:1,classNo:1});assert.equal(r.status,201);const room=r.body;assert.equal(room.code.length,8);
const payload={id:crypto.randomUUID(),code:room.code,studentNo:12,name:'테스트학생',answers:{definition:'모든 면이 합동인 정다각형이고 각 꼭짓점에 모이는 면의 수가 같다.',reason:'120도인 각이 최소 3개 모이면 360도가 되어 평평하다.',discovery:'모든 면이 정다각형이어도 정다면체가 아닐 수 있다.'},records:['tetra','cube']};
r=await call('submit','POST',payload,null);assert.equal(r.status,201);assert.equal(r.body.grade,1);assert.equal(r.body.classNo,1);
r=await call('submit','POST',payload,null);assert.equal(r.status,200);assert.equal(r.body.reused,true);
r=await call('submit','POST',{...payload,name:'변경된 내용'},null);assert.equal(r.status,409);
r=await call('submit','POST',{...payload,id:crypto.randomUUID(),answers:{...payload.answers,reason:''}},null);assert.equal(r.status,400);
r=await call('submit','POST',{...payload,id:crypto.randomUUID(),code:'ZZZZZZZZ'},null);assert.equal(r.status,404);
r=await call('submissions?room='+room.id);assert.equal(r.status,200);assert.equal(r.body.submissions.length,1);assert.equal(r.body.submissions[0].answers.reason,payload.answers.reason);
const foreignToken='b'.repeat(64);await DB.prepare('INSERT INTO teacher_sessions (token_hash,owner_id,expires_at) VALUES (?,?,?)').bind(await hash(foreignToken),'another-owner',Date.now()+10000).run();
r=await call('submissions?room='+room.id,'GET',undefined,{cookie:'__Secure-geometry-teacher='+foreignToken});assert.equal(r.status,404);
r=await call('rooms/'+room.id,'PATCH',{open:false});assert.equal(r.status,200);
r=await call('submit','POST',{...payload,id:crypto.randomUUID()},null);assert.equal(r.status,409);
r=await call('rooms/'+room.id,'PATCH',{open:true});assert.equal(r.status,200);
r=await call('submit','POST',{...payload,id:crypto.randomUUID(),answers:{...payload.answers,discovery:'再제출 내용'}},null);assert.equal(r.status,201);
r=await call('rooms');assert.equal(r.body.rooms[0].submission_count,2);assert.equal(r.body.rooms[0].student_count,1);
for(let i=0;i<201;i++){const p={...payload,id:crypto.randomUUID(),studentNo:i%90+1};let r=await call('submit','POST',p,null);assert.equal(r.status,201)}
r=await call('submissions?room='+room.id);assert.equal(r.body.submissions.length,200);assert.equal(r.body.nextOffset,200);
r=await call('submissions?room='+room.id+'&offset=200');assert.equal(r.body.submissions.length,3);assert.equal(r.body.nextOffset,null);
let join=await call('join','POST',{code:room.code},null);assert.equal(join.status,200);assert.equal(join.body.grade,1);assert(!('owner_id' in join.body));assert(!('submissions' in join.body));
let custom=await call('rooms','POST',{title:'추가 질문 수업',grade:1,classNo:2,noteEnabled:false,extraPrompts:['가장 흥미로운 도형과 이유는?']});assert.equal(custom.status,201);
let customPayload={...payload,id:crypto.randomUUID(),code:custom.body.code,answers:{},records:[],extraAnswers:{q1:'정십이면체입니다.'}};
assert.equal((await call('submit','POST',{...customPayload,extraAnswers:{}},null)).status,400);
assert.equal((await call('submit','POST',customPayload,null)).status,201);
assert.equal((await call('rooms/'+custom.body.id,'PATCH',{title:'수정된 수업',grade:1,classNo:2,noteEnabled:false,extraPrompts:['두 번째 질문']})).status,200);
let saved=await call('submissions?room='+custom.body.id);assert.equal(saved.body.submissions[0].extras[0].label,'가장 흥미로운 도형과 이유는?');assert.equal(saved.body.submissions[0].extras[0].answer,'정십이면체입니다.');
assert.equal((await call('rooms','POST',{title:'빈 수업',grade:1,classNo:1,noteEnabled:false,extraPrompts:[]})).status,400);
assert.equal((await call('logout','POST',{})).status,200);assert.equal((await call('rooms')).status,401);
let wrong=await call('login','POST',{pin:'000000'},null);assert.equal(wrong.status,401);
sqlite.prepare('UPDATE rooms SET owner_id=?').run('legacy-gpt-owner');
let secondLogin=await call('login','POST',{pin:env.TEACHER_PIN},null);assert.equal(secondLogin.status,200);assert.match(secondLogin.cookie,/HttpOnly/);assert.match(secondLogin.cookie,/Secure/);assert.match(secondLogin.cookie,/SameSite=Strict/);teacherCookie=secondLogin.cookie.split(';')[0];
assert.equal((await call('rooms')).body.rooms.length,2);
const plainToken=teacherCookie.split('=')[1];assert.equal(sqlite.prepare('SELECT count(*) AS n FROM teacher_sessions WHERE token_hash=?').get(plainToken).n,0);
assert.equal((await call('rooms','GET',undefined,{cookie:'__Secure-geometry-teacher='+('a'.repeat(64))})).status,401);
sqlite.prepare('UPDATE teacher_sessions SET expires_at=0').run();assert.equal((await call('rooms')).status,401);
let limited;for(let i=0;i<12;i++)limited=await call('login','POST',{pin:'000000'},null);assert.equal(limited.status,429);
console.log('PASS: PIN authentication, legacy classroom access, secure opaque cookie, no plaintext token storage, invalid/expired/revoked sessions, rate limiting;  join metadata, custom tasks, optional notebook, task settings, preserved prompt snapshots;  migrations, teacher permissions, room ownership, same-origin writes, anonymous code submission, validation, retry deduplication, immutable resubmission, close/reopen, counts, pagination.');
