'use strict';
{const code=new URLSearchParams(location.search).get('class');if(code&&/^[A-Z2-9]{8}$/i.test(code)){const link=document.querySelector('.student-role');if(link)link.href='/student.html?class='+encodeURIComponent(code.toUpperCase())}}
