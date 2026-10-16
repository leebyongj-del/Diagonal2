import assert from 'node:assert/strict';
import handler from '../api/notebooks.mjs';
process.env.UPSTREAM_ORIGIN='https://upstream.example.test';
const originalFetch=globalThis.fetch;let requests=[];
globalThis.fetch=async(url,options)=>{requests.push({url:String(url),options});return Response.json({teacher:true},{headers:{'Set-Cookie':'__Secure-geometry-teacher='+('a'.repeat(64))+'; Path=/api/notebooks; HttpOnly; Secure; SameSite=Strict'}})};
async function call({method='POST',origin='https://diagonal2.vercel.app',path='login',body={pin:'test-fixture'},cookie=''}={}){const res={headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=v}};await handler({method,url:'/api/notebooks?path='+encodeURIComponent(path),headers:{host:'diagonal2.vercel.app',origin,cookie},body},res);return res}
assert.equal((await call()).statusCode,200);assert.equal(requests[0].options.headers.Origin,'https://upstream.example.test');assert.equal(requests[0].options.redirect,'manual');
let r=await call({method:'GET',path:'rooms',cookie:'unrelated=private; __Secure-geometry-teacher='+('b'.repeat(64))});assert.equal(r.statusCode,200);assert.equal(requests.at(-1).options.headers.Cookie,'__Secure-geometry-teacher='+('b'.repeat(64)));assert.match(r.headers['Set-Cookie'][0],/HttpOnly/);
let count=requests.length;assert.equal((await call({origin:'https://other.test'})).statusCode,403);assert.equal(requests.length,count);
assert.equal((await call({path:'https://other.test'})).statusCode,404);assert.equal((await call({body:'x'.repeat(30001)})).statusCode,413);
delete process.env.UPSTREAM_ORIGIN;assert.equal((await call()).statusCode,503);globalThis.fetch=originalFetch;
console.log('PASS: same-origin gateway, server-only upstream, secure cookies, cookie filtering, invalid paths, size limit, missing configuration.');
