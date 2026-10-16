'use strict';
window.studentProfile=StudentSession.current();
{const code=new URLSearchParams(location.search).get('class');if(!window.studentProfile||(code&&code.toUpperCase()!==window.studentProfile.code))location.replace('/student.html'+(code?'?class='+encodeURIComponent(code):''));}
