/* Skumring interaction choreography v3.2. No rendering dependencies. */
(function (root, factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SkumringMotion=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const STARTS=[
  {name:'Ava',x:-1.70,z:.59,color:0x759b80},
  {name:'Victoria',x:0,z:.59,color:0xb87b67},
  {name:'Karakter 3',x:1.70,z:.59,color:0x869ac0}
 ];
 const TARGETS={
  chair:{name:'stolen',staging:{x:-3.62,z:-1.76},final:{x:-3.64,z:-2.67},pose:'sit'},
  bed:{name:'sengen',pose:'lie',slots:[
   {staging:{x:1.62,z:-2.59},final:{x:3.12,z:-2.59}},
   {staging:{x:1.62,z:-1.79},final:{x:3.12,z:-1.79}}
  ]}
 };
 const lerp=(a,b,t)=>a+(b-a)*t;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 function angleTo(a,b){return Math.atan2(b.x-a.x,b.z-a.z);}
 function shortTurn(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
 class World{
  constructor(){
   this.actors=STARTS.map((p,id)=>({id,name:p.name,color:p.color,x:p.x,z:p.z,yaw:0,phase:'idle',target:null,bedSlot:null,
    route:[],walkCycle:0,walkAmount:0,sit:0,lie:0,transition:0,from:null,to:null,partner:null,interactTime:0,message:'Klar'}));
   this.reserved={chair:null,bed:[null,null]};
   this.speed=1.35;
  }
  actor(index){return this.actors[index]||null;}
  freeBedSlots(){return this.reserved.bed.map((a,i)=>a===null?i:-1).filter(i=>i>=0);}
  _canMove(a){return !!a&&(a.phase==='idle'||a.phase==='interacting');}
  _exitMeeting(a){
   if(a.partner===null)return;
   const other=this.actor(a.partner);
   a.partner=null;a.interactTime=0;
   if(a.phase==='interacting'||a.phase==='meetingWait'){a.phase='idle';a.message='Klar';}
   if(other&&other.partner===a.id){other.partner=null;other.interactTime=0;
    if(other.phase==='interacting'||other.phase==='meetingWait'){other.phase='idle';other.message='Klar';}
   }
  }
  _startWalking(a,kind,route,slot=null,partner=null){
   a.target=kind;a.bedSlot=slot;a.partner=partner;a.phase='walking';a.route=route.map(q=>({...q}));
   a.transition=0;a.from=null;a.to=null;a.walkAmount=0;a.sit=0;a.lie=0;
   a.message=kind==='meet'?'Går mot '+this.actor(partner).name:'Går til '+TARGETS[kind].name;
  }
  command(index,kind){
   const a=this.actor(index);
   if(!a)return {ok:false,message:'Ukjent karakter.'};
   if(kind!=='chair'&&kind!=='bed')return {ok:false,message:'Ukjent møbel.'};
   if(!this._canMove(a))return {ok:false,message:a.name+' må fullføre bevegelsen eller reise seg først.'};
   if(kind==='chair'&&this.reserved.chair!==null&&this.reserved.chair!==index)
    return {ok:false,message:'Stolen er allerede i bruk.'};
   const slot=kind==='bed'?this.freeBedSlots()[0]:null;
   if(kind==='bed'&&slot===undefined)return {ok:false,message:'Begge plassene i sengen er opptatt.'};
   this._exitMeeting(a);
   if(kind==='bed')this.reserved.bed[slot]=index;else this.reserved.chair=index;
   const t=kind==='bed'?TARGETS.bed.slots[slot]:TARGETS.chair;
   this._startWalking(a,kind,[t.staging],slot);
   if(kind==='chair')a.route.push({...t.final});
   return {ok:true,message:a.name+' går til '+TARGETS[kind].name+'.'};
  }
  commandPair(aIndex,bIndex,kind){
   const a=this.actor(aIndex),b=this.actor(bIndex);
   if(!a||!b||a===b)return {ok:false,message:'Velg to forskjellige karakterer.'};
   if(kind!=='meet'&&kind!=='bed')return {ok:false,message:'Ukjent samhandling.'};
   if(!this._canMove(a)||!this._canMove(b))return {ok:false,message:'Begge må være klare eller stå sammen før dere kan starte.'};
   if(a.partner!==null&&a.partner!==b.id||b.partner!==null&&b.partner!==a.id)
    return {ok:false,message:'En av karakterene er opptatt i en annen samhandling.'};
   if(kind==='meet'){
    if(a.phase==='interacting'&&b.phase==='interacting'&&a.partner===b.id)return {ok:true,message:a.name+' og '+b.name+' står allerede sammen.'};
    this._exitMeeting(a);this._exitMeeting(b);
    const middle=clamp((a.x+b.x)/2,-1.3,1.3),z=clamp((a.z+b.z)/2,-.25,1.3);
    const first=a.x<b.x?a:b,second=first===a?b:a;
    this._startWalking(first,'meet',[{x:middle-.53,z}],null,second.id);
    this._startWalking(second,'meet',[{x:middle+.53,z}],null,first.id);
    return {ok:true,message:a.name+' og '+b.name+' går mot hverandre.'};
   }
   const slots=this.freeBedSlots();
   if(slots.length<2)return {ok:false,message:'Begge sengeplassene må være ledige for to karakterer.'};
   this._exitMeeting(a);this._exitMeeting(b);
   // Assign each actor a different half of the bed. Reservation is atomic.
   for(const [actor,slot] of [[a,slots[0]],[b,slots[1]]]){
    this.reserved.bed[slot]=actor.id;
    this._startWalking(actor,'bed',[TARGETS.bed.slots[slot].staging],slot);
   }
   return {ok:true,message:a.name+' og '+b.name+' går til hver sin plass i sengen.'};
  }
  rise(index){
   const a=this.actor(index);if(!a)return {ok:false,message:'Ukjent karakter.'};
   if(!['sitting','lying'].includes(a.phase))return {ok:false,message:a.name+' sitter eller ligger ikke.'};
   const t=a.target==='bed'?TARGETS.bed.slots[a.bedSlot]:TARGETS.chair;
   a.phase='gettingUp';a.transition=0;
   a.from={x:a.x,z:a.z,yaw:a.yaw,sit:a.sit,lie:a.lie};
   a.to={x:t.staging.x,z:t.staging.z,yaw:0,sit:0,lie:0};
   a.message='Reiser seg';return {ok:true,message:a.name+' reiser seg.'};
  }
  _release(a){
   if(a.target==='chair'&&this.reserved.chair===a.id)this.reserved.chair=null;
   if(a.target==='bed'&&a.bedSlot!==null&&this.reserved.bed[a.bedSlot]===a.id)this.reserved.bed[a.bedSlot]=null;
   a.target=null;a.bedSlot=null;
  }
  reset(index){
   const a=this.actor(index);if(!a)return {ok:false,message:'Ukjent karakter.'};
   if(a.target==='meet' && a.partner!==null){
    const other=this.actor(a.partner);
    if(other && other.partner===a.id && ['walking','meetingWait'].includes(other.phase)){
     other.phase='idle';other.route=[];other.target=null;other.partner=null;other.walkAmount=0;other.message='Samhandlingen ble avbrutt';
    }
   }
   this._exitMeeting(a);this._release(a);
   const sp=STARTS[index];Object.assign(a,{x:sp.x,z:sp.z,yaw:0,phase:'idle',route:[],walkAmount:0,sit:0,lie:0,transition:0,
    from:null,to:null,partner:null,interactTime:0,message:'Klar'});
   return {ok:true,message:a.name+' tilbake på startpunktet.'};
  }
  update(delta){
   const dt=clamp(Number(delta)||0,0,.05);
   for(const a of this.actors){
    if(a.phase==='walking'){
     const p=a.route[0];if(!p){this._arrived(a);continue;}
     const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz),move=this.speed*dt;
     if(d<=move+.015){a.x=p.x;a.z=p.z;a.route.shift();if(a.route.length===0)this._arrived(a);}
     else{a.x+=dx/d*move;a.z+=dz/d*move;}
     a.yaw+=shortTurn(a.yaw,angleTo(a,p))*Math.min(1,dt*8);
     a.walkCycle+=dt*10;a.walkAmount=Math.min(1,a.walkAmount+dt*5);
    }else if(a.phase==='meetingWait'){
     a.walkAmount=Math.max(0,a.walkAmount-dt*5);
     const b=this.actor(a.partner);
     if(b&&b.partner===a.id&&b.phase==='meetingWait'){
      a.phase='interacting';b.phase='interacting';a.message='Sammen med '+b.name;b.message='Sammen med '+a.name;
      a.yaw=angleTo(a,b);b.yaw=angleTo(b,a);
     }
    }else if(a.phase==='interacting'){
     const b=this.actor(a.partner);if(b){a.yaw+=shortTurn(a.yaw,angleTo(a,b))*Math.min(1,dt*8);}
     a.interactTime+=dt;a.walkAmount=0;
    }else if(['sittingDown','lyingDown','gettingUp'].includes(a.phase)){
     a.transition=Math.min(1,a.transition+dt/(a.phase==='gettingUp'?1.35:1.30));
     const v=a.transition*a.transition*(3-2*a.transition);
     if(a.from&&a.to){a.x=lerp(a.from.x,a.to.x,v);a.z=lerp(a.from.z,a.to.z,v);
      a.yaw=a.from.yaw+shortTurn(a.from.yaw,a.to.yaw)*v;
      a.sit=lerp(a.from.sit,a.to.sit,v);a.lie=lerp(a.from.lie,a.to.lie,v);}
     a.walkAmount=Math.max(0,a.walkAmount-dt*6);
     if(a.transition>=1){if(a.phase==='gettingUp'){this._release(a);a.phase='idle';a.message='Klar';a.sit=0;a.lie=0;}
      else{a.phase=a.phase==='sittingDown'?'sitting':'lying';a.message=a.phase==='sitting'?'Sitter i stolen':'Ligger i sengen';}}
    }else a.walkAmount=Math.max(0,a.walkAmount-dt*6);
    a.x=clamp(a.x,-4.20,4.20);a.z=clamp(a.z,-3.15,3.18);
   }
  }
  _arrived(a){
   if(a.target==='meet'){a.phase='meetingWait';a.walkAmount=0;a.message='Venter på '+this.actor(a.partner).name;return;}
   const t=a.target==='bed'?TARGETS.bed.slots[a.bedSlot]:TARGETS.chair;
   if(!t)return;
   a.phase=a.target==='bed'?'lyingDown':'sittingDown';a.transition=0;
   a.from={x:a.x,z:a.z,yaw:a.yaw,sit:0,lie:0};
   a.to={x:t.final.x,z:t.final.z,yaw:0,sit:a.target==='chair'?1:0,lie:a.target==='bed'?1:0};
   a.message=a.target==='bed'?'Legger seg':'Setter seg';
  }
 }
 return {World,STARTS,TARGETS};
});
