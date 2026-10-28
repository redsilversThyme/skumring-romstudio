/* On-demand WebGL viewport. Depth is tested per pixel, never sorted by triangle centre. */
(function initRoom(){
'use strict';
const canvas=document.getElementById('view'), info=document.getElementById('progress');
const gl=window.SKUMRING_FORCE_SOFTWARE?null:canvas.getContext('webgl',{alpha:false,depth:true,antialias:true,powerPreference:'low-power'});
const soft=gl?null:createSoftwareRenderer(canvas);
const R=window.SKUMRING_ROOM;
if(!R){info.textContent='Rommodellen mangler. Trykk Hent siste romversjon.';return;}
const cubeP=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const cubeF=[[0,3,2],[0,2,1],[4,5,6],[4,6,7],[0,4,7],[0,7,3],[1,2,6],[1,6,5],[0,1,5],[0,5,4],[3,7,6],[3,6,2]];
let parts=R.boxes.map(b=>({id:b.id,group:b.group,color:b.color,p:cubeP.map(v=>v.map((x,i)=>(b.lo[i]+b.hi[i])/2+x*(b.hi[i]-b.lo[i])/2)),f:cubeF})).concat(R.planes);
let label=R.version,hideWalls=false,yaw=.08,pitch=.28,distance=8.7,target=[0,1.25,0],pending=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const cameraKey='skumring-camera-v2';
function remember(){try{sessionStorage.setItem(cameraKey,JSON.stringify({yaw,pitch,distance,target,hideWalls}));}catch(e){}}
try{const s=JSON.parse(sessionStorage.getItem(cameraKey));if(s&&[s.yaw,s.pitch,s.distance,...s.target].every(Number.isFinite)){yaw=s.yaw;pitch=clamp(s.pitch,-1.35,1.54);distance=clamp(s.distance,.7,28);target=s.target;hideWalls=!!s.hideWalls;}}catch(e){}
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
let program;
if(gl)try{
 program=gl.createProgram();
 gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;
 uniform vec3 uEye,uForward,uRight,uUp;uniform float uAspect,uFocal;
 varying mediump vec3 vColor,vNormal;
 void main(){vec3 r=aPos-uEye;float d=dot(r,uForward);float n=.035;float f=80.0;
 gl_Position=vec4(dot(r,uRight)*uFocal/uAspect,dot(r,uUp)*uFocal,((f+n)/(f-n))*d-2.0*f*n/(f-n),d);vColor=aColor;vNormal=aNormal;}`));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying mediump vec3 vColor,vNormal;
 void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 float light=.73+.30*max(dot(n,normalize(vec3(-.45,.82,.48))),0.0)+.06*max(n.y,0.0);
 gl_FragColor=vec4(clamp(vColor*light,0.0,1.0),1.0);}`));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
}catch(error){window.SKUMRING_FORCE_SOFTWARE=true;canvas.replaceWith(canvas.cloneNode(false));initRoom();return;}
if(gl){gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);}
const attrs=['aPos','aNormal','aColor'].map(n=>gl?gl.getAttribLocation(program,n):null);
const U=Object.fromEntries(['uEye','uForward','uRight','uUp','uAspect','uFocal'].map(n=>[n,gl?gl.getUniformLocation(program,n):null]));
let batches=[];
function makeBatch(list){
 const data=[];for(const p of list)for(const face of p.f){
  const a=p.p[face[0]],b=p.p[face[1]],c=p.p[face[2]];
  if(!a||!b||!c)throw Error('Ugyldig trekant i '+p.id);
  const n=norm(cross(sub(b,a),sub(c,a)));
  for(const ix of face){const color=p.colors?.[ix]||p.color||[128,128,128];data.push(...p.p[ix],...n,...color.slice(0,3).map(v=>v/255));}
 }
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
 return {buffer,count:data.length/9};
}
function rebuild(){
 if(!gl){request();return;}
 for(const b of batches)gl.deleteBuffer(b.buffer);
 const floor=p=>/^(01_Foundation|02_Oak_Floor)/.test(p.group||p.id);
 batches=[makeBatch(parts),makeBatch(parts.filter(floor))];request();
}
function request(){if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;draw();});}}
function draw(){
 if(gl&&gl.isContextLost())return;
 const rect=canvas.getBoundingClientRect(),dpr=gl?Math.min(devicePixelRatio||1,1.5):Math.min(1,960/Math.max(rect.width,1));
 const w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 if(gl){gl.viewport(0,0,w,h);gl.clearColor(.066,.102,.086,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);}
 const eye=[target[0]+distance*Math.cos(pitch)*Math.sin(yaw),target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(pitch)*Math.cos(yaw)];
 const fw=norm(sub(target,eye)),right=norm(cross(fw,[0,1,0])),up=norm(cross(right,fw));
 if(gl){for(const [name,value] of [['uEye',eye],['uForward',fw],['uRight',right],['uUp',up]])gl.uniform3fv(U[name],value);
 gl.uniform1f(U.uAspect,w/h);gl.uniform1f(U.uFocal,1/Math.tan(Math.PI*27/180));
 const b=batches[hideWalls?1:0];if(!b)return;
 gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);attrs.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,i*12);});
 gl.drawArrays(gl.TRIANGLES,0,b.count);
 }else{soft.draw(hideWalls?parts.filter(p=>/^(01_Foundation|02_Oak_Floor)/.test(p.group||p.id)):parts,eye,fw,right,up,1/Math.tan(Math.PI*27/180));}
 info.textContent=label+' · '+parts.reduce((n,p)=>n+p.f.length,0).toLocaleString('nb-NO')+' trekanter · '+(gl?'WebGL':'Reservevisning')+' · Gulvnivå 0 m';
 document.getElementById('walls').textContent=hideWalls?'Vis vegger':'Skjul vegger';
}
let dragging=null;
canvas.addEventListener('pointerdown',e=>{dragging={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.button===2||e.shiftKey};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointermove',e=>{
 if(!dragging||e.pointerId!==dragging.id)return;
 const dx=e.clientX-dragging.x,dy=e.clientY-dragging.y;dragging.x=e.clientX;dragging.y=e.clientY;
 if(dragging.pan){const k=distance*.0015;target[0]-=Math.cos(yaw)*dx*k;target[2]+=Math.sin(yaw)*dx*k;target[1]+=dy*k;}
 else{yaw-=dx*.006;pitch=clamp(pitch+dy*.006,-1.35,1.54);}request();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{dragging=null;remember();});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance*Math.exp(e.deltaY*.001),.7,28);remember();request();},{passive:false});
function preset(y,p,d,t){yaw=y;pitch=p;distance=d;target=t;remember();request();}
document.getElementById('front').onclick=()=>preset(.08,.28,8.7,[0,1.25,0]);
document.getElementById('inside').onclick=()=>preset(0,.035,3.3,[0,1.35,-1.4]);
document.getElementById('iso').onclick=()=>preset(.45,.60,9.4,[0,1.1,0]);
document.getElementById('top').onclick=()=>preset(0,1.54,9.8,[0,0,0]);
document.getElementById('walls').onclick=()=>{hideWalls=!hideWalls;remember();request();};
document.getElementById('update').onclick=()=>{remember();if(location.protocol==='file:'){location.reload();return;}const url=new URL(location.href);url.searchParams.set('versjon',Date.now().toString());location.replace(url.href);};
window.addEventListener('resize',request);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();info.textContent='3D-visningen ble stoppet av nettleseren. Trykk Hent siste romversjon.';});
canvas.addEventListener('webglcontextrestored',()=>location.reload());
// GLB import is local only; it never changes the shared room in GitHub.
function readGLB(buffer){
 const v=new DataView(buffer);if(v.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2)throw Error('Velg en GLB 2.0-fil');
 let off=12,j,bin;while(off+8<=v.byteLength){const len=v.getUint32(off,true),typ=v.getUint32(off+4,true);off+=8;if(off+len>v.byteLength)throw Error('Ufullstendig GLB-fil');if(typ===0x4e4f534a)j=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,off,len)).replace(/\0/g,''));if(typ===0x004e4942)bin=new DataView(buffer,off,len);off+=len;}
 if(!j||!bin)throw Error('GLB-filen mangler geometri');
 const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},counts={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 function access(i){const a=j.accessors[i],b=j.bufferViews[a.bufferView];if(!b||a.sparse)throw Error('Denne GLB-typen støttes ikke i enkel testvisning');const n=counts[a.type],sz=sizes[a.componentType],stride=b.byteStride||n*sz,start=(b.byteOffset||0)+(a.byteOffset||0),out=[];
  for(let k=0;k<a.count;k++){const row=[];for(let q=0;q<n;q++){const at=start+k*stride+q*sz;let x;switch(a.componentType){case 5120:x=bin.getInt8(at);break;case 5121:x=bin.getUint8(at);break;case 5122:x=bin.getInt16(at,true);break;case 5123:x=bin.getUint16(at,true);break;case 5125:x=bin.getUint32(at,true);break;case 5126:x=bin.getFloat32(at,true);break;default:throw Error('Ukjent GLB-format');}if(a.normalized&&a.componentType!==5126)x=a.componentType===5121?x/255:a.componentType===5123?x/65535:a.componentType===5120?Math.max(-1,x/127):Math.max(-1,x/32767);row.push(x);}out.push(n===1?row[0]:row);}return out;
 }
 const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 function mul(a,b){const c=Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];return c;}
 function matrix(n){if(n.matrix)return n.matrix;const [x,y,z,w]=n.rotation||[0,0,0,1],[sx,sy,sz]=n.scale||[1,1,1],[tx,ty,tz]=n.translation||[0,0,0];return [(1-2*(y*y+z*z))*sx,2*(x*y+z*w)*sx,2*(x*z-y*w)*sx,0,2*(x*y-z*w)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+x*w)*sy,0,2*(x*z+y*w)*sz,2*(y*z-x*w)*sz,(1-2*(x*x+y*y))*sz,0,tx,ty,tz,1];}
 const result=[];let vertices=0;
 function visit(i,parent,trail){if(trail.has(i))throw Error('Ugyldig GLB-hierarki');const t=new Set(trail);t.add(i);const n=j.nodes[i],m=mul(parent,matrix(n));if(n.mesh!==undefined)for(const p of j.meshes[n.mesh].primitives){
  if((p.mode??4)!==4||p.attributes.POSITION===undefined)continue;
  const pos=access(p.attributes.POSITION).map(([x,y,z])=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]]);vertices+=pos.length;if(vertices>1000000)throw Error('Modellen er for stor for lettvisningen');
  const ix=p.indices!==undefined?access(p.indices):pos.map((_,k)=>k),faces=[];for(let k=0;k+2<ix.length;k+=3)faces.push(ix.slice(k,k+3));
  const mat=j.materials?.[p.material]?.pbrMetallicRoughness?.baseColorFactor||[1,1,1,1];let colors;
  if(p.attributes.COLOR_0!==undefined)colors=access(p.attributes.COLOR_0).map(c=>c.slice(0,3).map((x,k)=>x*mat[k]*255));
  result.push({id:n.name||'Del_'+i,group:n.name||'Del_'+i,p:pos,f:faces,colors,color:/Forest_Rain_View/.test(n.name||'')?[65,88,79]:mat.slice(0,3).map(x=>x*255)});
 }for(const child of n.children||[])visit(child,m,t);}
 for(const n of j.scenes?.[j.scene??0]?.nodes||[])visit(n,I,new Set());if(!result.length)throw Error('Fant ingen lesbare modeller');return result;
}
async function load(f){if(!f)return;try{if(f.size>55*1024*1024)throw Error('Filen er over 55 MB');const next=readGLB(await f.arrayBuffer());parts=next;label='Lokal test: '+f.name;hideWalls=false;rebuild();}catch(e){info.textContent='Kunne ikke åpne modellen: '+e.message;}}
document.getElementById('chooseLocal').onclick=()=>document.getElementById('upload').click();
document.getElementById('upload').onchange=e=>{load(e.target.files[0]);e.target.value='';};
canvas.addEventListener('dragover',e=>e.preventDefault());canvas.addEventListener('drop',e=>{e.preventDefault();load(e.dataTransfer.files[0]);});
/* Software fallback: per-pixel inverse-depth buffer, not painter's ordering. */
function createSoftwareRenderer(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw Error('Nettleseren kunne ikke starte 3D-visningen');
 let image=null,depth=null;
 const normalize=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);
 const light=normalize([-.45,.82,.48]);
 function draw(parts,eye,fw,right,up,focal){
  const W=canvas.width,H=canvas.height;
  if(!image||image.width!==W||image.height!==H){image=ctx.createImageData(W,H);depth=new Float32Array(W*H);}
  const pixels=image.data;depth.fill(0);for(let k=0;k<pixels.length;k+=4){pixels[k]=17;pixels[k+1]=26;pixels[k+2]=22;pixels[k+3]=255;}
  const scale=H*focal/2;
  function raster(verts,shade){
   const p=verts.map(v=>[W/2+v[0]*scale/v[2],H/2-v[1]*scale/v[2],1/v[2],v[3]]);
   const [a,b,c]=p,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
   if(Math.abs(den)<1e-8)return;
   const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0])));
   const y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   const dax=(b[1]-c[1])/den,dbx=(c[1]-a[1])/den;
   const same=a[3].every((v,i)=>v===b[3][i]&&v===c[3][i]);
   const solid=a[3].map(v=>Math.round(Math.min(255,v*shade)));
   for(let y=y0;y<=y1;y++){
    let wa=((b[1]-c[1])*(x0+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den;
    let wb=((c[1]-a[1])*(x0+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den;
    for(let x=x0;x<=x1;x++,wa+=dax,wb+=dbx){
     const wc=1-wa-wb;if(wa<-1e-7||wb<-1e-7||wc<-1e-7)continue;
     const inv=wa*a[2]+wb*b[2]+wc*c[2],idx=y*W+x;
     if(inv<=depth[idx]+1e-8)continue;depth[idx]=inv;
     const offset=idx*4;for(let k=0;k<3;k++)pixels[offset+k]=same?solid[k]:Math.min(255,shade*(wa*a[2]*a[3][k]+wb*b[2]*b[3][k]+wc*c[2]*c[3][k])/inv);
    }
   }
  }
  for(const p of parts){
   const cam=p.p.map(v=>{const r=sub(v,eye);return[dot(r,right),dot(r,up),dot(r,fw)];});
   for(const f of p.f){
    const n=normalize(cross(sub(p.p[f[1]],p.p[f[0]]),sub(p.p[f[2]],p.p[f[0]])));
    if(dot(n,sub(eye,p.p[f[0]]))<0)for(let k=0;k<3;k++)n[k]*=-1;
    const shade=.73+.30*Math.max(dot(n,light),0)+.06*Math.max(n[1],0);
    let poly=f.map(i=>[...cam[i],p.colors?.[i]||p.color||[128,128,128]]),clipped=[];
    for(let i=0;i<poly.length;i++){
     const a=poly[i],b=poly[(i+1)%poly.length],ain=a[2]>=.035,bin=b[2]>=.035;
     if(ain)clipped.push(a);
     if(ain!==bin){const t=(.035-a[2])/(b[2]-a[2]);clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),.035,a[3].map((v,k)=>v+t*(b[3][k]-v))]);}
    }
    for(let i=1;i+1<clipped.length;i++)raster([clipped[0],clipped[i],clipped[i+1]],shade);
   }
  }
  ctx.putImageData(image,0,0);
 }
 return {draw};
}

rebuild();
})();
