'use strict';
window.StudentSession=(()=>{
 const profileKey='polyhedron-active-student-v1',lastKey='polyhedron-last-student-v1',draftKeys=['polyhedron-notes-v1','polyhedron-submit-v1','polyhedron-extra-v1'];
 const key=p=>JSON.stringify([p.code,Number(p.studentNo),p.name.trim()]);
 function current(){try{let p=JSON.parse(sessionStorage.getItem(profileKey));return p&&p.code&&p.name&&p.studentNo?p:null}catch{return null}}
 function activate(p){
  let previous;try{previous=JSON.parse(localStorage.getItem(lastKey))}catch{}
  if(!previous||key(previous)!==key(p)){
   const old=previous?key(previous):'legacy';
   for(let k of draftKeys){let value=localStorage.getItem(k);if(value!==null)localStorage.setItem(k+':student:'+old,value);const saved=localStorage.getItem(k+':student:'+key(p));if(saved===null)localStorage.removeItem(k);else localStorage.setItem(k,saved)}
  }
  let state={};try{state=JSON.parse(localStorage.getItem('polyhedron-submit-v1'))||{}}catch{}
  Object.assign(state,{code:p.code,studentNo:p.studentNo,name:p.name});localStorage.setItem('polyhedron-submit-v1',JSON.stringify(state));localStorage.setItem(lastKey,JSON.stringify(p));sessionStorage.setItem(profileKey,JSON.stringify(p));
 }
 return {current,activate};
})();
