'use strict';
(()=>{const $=s=>document.querySelector(s),profile=StudentSession.current(),param=new URLSearchParams(location.search).get('class');
if(profile){$('#entryCode').value=profile.code;$('#entryNo').value=profile.studentNo;$('#entryName').value=profile.name}if(param&&/^[A-Z2-9]{8}$/i.test(param))$('#entryCode').value=param.toUpperCase();
$('#studentEntry').onsubmit=async e=>{e.preventDefault();if(!e.target.reportValidity())return;let name=$('#entryName').value.trim();if(!name){$('#entryStatus').textContent='이름을 입력해 주세요.';return}$('#entryButton').disabled=true;$('#entryStatus').textContent='수업을 확인하고 있어요.';
try{let r=await fetch('/api/notebooks/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('#entryCode').value.trim().toUpperCase()})}),b;try{b=await r.json()}catch{throw Error('수업에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.')}if(!r.ok)throw Error(b.error||'수업을 찾을 수 없어요.');StudentSession.activate({...b,studentNo:Number($('#entryNo').value),name});location.assign('/explore.html')}catch(err){$('#entryStatus').textContent=err.message}finally{$('#entryButton').disabled=false}};
})();
