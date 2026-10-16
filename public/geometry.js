'use strict';
const Geo=(()=>{
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a),unit=a=>mul(a,1/(norm(a)||1));
function hull(v){let planes=new Map;for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++)for(let k=j+1;k<v.length;k++){let n=cross(sub(v[j],v[i]),sub(v[k],v[i]));if(norm(n)<1e-7)continue;n=unit(n);let d=dot(n,v[i]),ds=v.map(p=>dot(n,p)-d);if(ds.some(x=>x>1e-6)&&ds.some(x=>x< -1e-6))continue;if(ds.some(x=>x>1e-6)){n=mul(n,-1);d=-d}let ids=v.map((p,t)=>Math.abs(dot(n,p)-d)<1e-6?t:-1).filter(t=>t>=0),key=ids.join(',');if(planes.has(key))continue;let c=mul(ids.reduce((a,id)=>add(a,v[id]),[0,0,0]),1/ids.length),u=unit(sub(v[ids[0]],c)),w=cross(n,u);ids.sort((a,b)=>Math.atan2(dot(sub(v[a],c),w),dot(sub(v[a],c),u))-Math.atan2(dot(sub(v[b],c),w),dot(sub(v[b],c),u)));planes.set(key,ids)}return [...planes.values()]}
function mesh(v,faces){faces=faces||hull(v);let edges=new Map;for(const f of faces)for(let i=0;i<f.length;i++){let e=[f[i],f[(i+1)%f.length]].sort((a,b)=>a-b);edges.set(e.join(','),e)}return {v,f:faces,e:[...edges.values()]}}
function normalize(m){let c=mul(m.v.reduce(add,[0,0,0]),1/m.v.length),v=m.v.map(p=>sub(p,c)),r=Math.max(...v.map(norm));return mesh(v.map(p=>mul(p,1/r)),m.f)}
const phi=(1+Math.sqrt(5))/2;
let tetra=mesh([[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]]),cube=mesh([-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z])))),octa=mesh([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]),iv=[];for(let a of [-1,1])for(let b of [-phi,phi])iv.push([0,a,b],[a,b,0],[b,0,a]);let ico=mesh(iv);let dual=m=>mesh(m.f.map(f=>unit(f.reduce((s,i)=>add(s,m.v[i]),[0,0,0]))));let dodeca=dual(ico);
function truncate(m){return mesh(m.e.flatMap(([a,b])=>[add(mul(m.v[a],2/3),mul(m.v[b],1/3)),add(mul(m.v[b],2/3),mul(m.v[a],1/3))]))}
const names={3:'삼',4:'사',5:'오',6:'육',7:'칠',8:'팔',9:'구',10:'십',11:'십일',12:'십이'},polyName=n=>n===3?'정삼각형':n===4?'정사각형':`정${names[n]||n}각형`;
function ring(n,y,r=1,offset=0){return Array.from({length:n},(_,i)=>[r*Math.cos(i*2*Math.PI/n+offset),y,r*Math.sin(i*2*Math.PI/n+offset)])}
const list=[];function entry(id,name,family,m,description,regular=false,k=null){list.push({id,name,family,m:normalize(m),description,regular,k})}
entry('tetra','정사면체','정다면체',tetra,'합동인 정삼각형 4개로 둘러싸여 있어요. 각 꼭짓점에 3개의 면이 모여요.',true,3);
entry('cube','정육면체','정다면체',cube,'합동인 정사각형 6개로 둘러싸여 있어요. 각 꼭짓점에 3개의 면이 모여요.',true,3);
entry('octa','정팔면체','정다면체',octa,'합동인 정삼각형 8개로 둘러싸여 있어요. 각 꼭짓점에 4개의 면이 모여요.',true,4);
entry('dodeca','정십이면체','정다면체',dodeca,'합동인 정오각형 12개로 둘러싸여 있어요. 각 꼭짓점에 3개의 면이 모여요.',true,3);
entry('ico','정이십면체','정다면체',ico,'합동인 정삼각형 20개로 둘러싸여 있어요. 각 꼭짓점에 5개의 면이 모여요.',true,5);
for(let n=3;n<=12;n++){
entry(`prism${n}`,`${names[n]}각기둥`,'각기둥',mesh([...ring(n,-.72),...ring(n,.72)]),'서로 평행하고 합동인 두 밑면과 직사각형인 옆면으로 둘러싸여 있어요. 밑면의 변의 수를 바꿔 비교해 보세요.');
entry(`pyramid${n}`,`${names[n]}각뿔`,'각뿔',mesh([...ring(n,-.55),[0,1.15,0]]),'다각형인 밑면 1개와 하나의 꼭짓점에서 만나는 삼각형인 옆면으로 둘러싸여 있어요.');
entry(`frustum${n}`,`${names[n]}각뿔대`,'각뿔대',mesh([...ring(n,-.7),...ring(n,.7,.52)]),'각뿔을 밑면에 평행한 평면으로 잘라 생기는 두 입체도형 중 각뿔이 아닌 쪽이에요. 옆면은 사다리꼴이에요.');
}
for(let n=3;n<=8;n++){
entry(`bipyramid${n}`,`${names[n]}각쌍뿔`,'더 탐구',mesh([...ring(n,0),[0,1.25,0],[0,-1.25,0]]),'합동인 두 각뿔의 밑면을 맞붙인 모양이에요. 밑면을 맞붙인 부분은 바깥 면으로 세지 않아요. 이 모형의 삼각형 면은 모두 정삼각형인 것은 아니에요.');
entry(`antiprism${n}`,`${names[n]}각엇기둥`,'더 탐구',mesh([...ring(n,-.55),...ring(n,.55,1,Math.PI/n)]),'평행한 두 정다각형을 서로 비틀어 놓고 삼각형 옆면으로 연결한 모양이에요. 이 모형의 옆면은 일반적으로 정삼각형은 아니에요.');
}
entry('cubocta','육팔면체','더 탐구',mesh(cube.e.map(([a,b])=>mul(add(cube.v[a],cube.v[b]),.5))),'정삼각형 8개와 정사각형 6개가 있어요. 각 면은 정다각형이지만 모든 면이 서로 합동인 것은 아니므로 정다면체가 아니에요.');
entry('trunctetra','깎은 정사면체','더 탐구',truncate(tetra),'정사면체의 꼭짓점을 잘라 낸 모양이에요. 정삼각형 4개와 정육각형 4개로 이루어져 있어요.');
entry('truncico','깎은 정이십면체','더 탐구',truncate(ico),'축구공 무늬를 떠올려 보세요. 정오각형 12개와 정육각형 20개로 둘러싸인 다면체예요. 곡면인 실제 공과는 달라요.');
return {add,sub,mul,dot,cross,norm,unit,mesh,hull,normalize,list,names,polyName};
})();
if(typeof module!=='undefined')module.exports=Geo;
