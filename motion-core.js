/* Skumring interaction choreography v3.1. No rendering dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SkumringMotion = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const STARTS = [
    {name:'Ava', x:-1.70, z:0.59, color:0x759b80},
    {name:'Victoria', x:0, z:0.59, color:0xb87b67},
    {name:'Karakter 3', x:1.70, z:0.59, color:0x869ac0}
  ];
  const TARGETS = {
    chair: {name:'stolen', staging:{x:-3.62,z:-1.76}, final:{x:-3.64,z:-2.67}, pose:'sit'},
    bed: {name:'sengen', staging:{x:1.67,z:-2.20}, final:{x:3.09,z:-2.19}, pose:'lie'}
  };
  const lerp=(a,b,t)=>a+(b-a)*t;
  function angleTo(a,b){return Math.atan2(b.x-a.x,b.z-a.z)}
  function shortTurn(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  class World {
    constructor(){
      this.actors = STARTS.map((p,i)=>({id:i,name:p.name,color:p.color,x:p.x,z:p.z,yaw:0,
        phase:'idle',target:null,route:[],walkCycle:0,walkAmount:0,sit:0,lie:0,transition:0,
        from:null,to:null,transitionKind:null, message:'Klar'}));
      this.reserved={chair:null,bed:null};
      this.speed=1.35;
    }
    actor(index){return this.actors[index]}
    command(index,kind){
      const a=this.actor(index);
      if(!a)return {ok:false,message:'Ukjent karakter.'};
      if(!TARGETS[kind])return {ok:false,message:'Ukjent møbel.'};
      if(a.phase!=='idle')return {ok:false,message:a.name+' må først reise seg eller fullføre bevegelsen.'};
      if(this.reserved[kind]!==null&&this.reserved[kind]!==index){
        return {ok:false,message:(kind==='chair'?'Stolen':'Sengen')+' er allerede i bruk av '+this.actor(this.reserved[kind]).name+'.'};
      }
      this.reserved[kind]=index;
      const t=TARGETS[kind];a.target=kind;a.phase='walking';
      a.route=[{...t.staging}];
      if(kind==='chair')a.route.push({...t.final});
      a.message='Går til '+t.name;
      return {ok:true,message:a.name+' går til '+t.name+'.'};
    }
    rise(index){
      const a=this.actor(index);if(!a)return {ok:false,message:'Ukjent karakter.'};
      if(a.phase!=='sitting'&&a.phase!=='lying')return {ok:false,message:a.name+' sitter eller ligger ikke.'};
      const target=a.target;
      a.phase='gettingUp';a.transition=0;
      a.from={x:a.x,z:a.z,yaw:a.yaw,sit:a.sit,lie:a.lie};
      a.to={x:TARGETS[target].staging.x,z:TARGETS[target].staging.z,yaw:0,sit:0,lie:0};
      a.message='Reiser seg';return {ok:true,message:a.name+' reiser seg.'};
    }
    reset(index){
      const a=this.actor(index);if(!a)return {ok:false,message:'Ukjent karakter.'};
      if(a.target!==null&&this.reserved[a.target]===index)this.reserved[a.target]=null;
      const sp=STARTS[index];Object.assign(a,{x:sp.x,z:sp.z,yaw:0,phase:'idle',target:null,route:[],walkAmount:0,sit:0,lie:0,transition:0,from:null,to:null,message:'Klar'});
      return {ok:true,message:a.name+' tilbake på startpunktet.'};
    }
    update(delta){
      const dt=Math.min(.05,Math.max(0,delta));
      for(const a of this.actors){
        if(a.phase==='walking'){
          const p=a.route[0];if(!p){this._arrived(a);continue}
          const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz),move=this.speed*dt;
          if(d<=move+.015){a.x=p.x;a.z=p.z;a.route.shift();if(a.route.length===0)this._arrived(a)}
          else{a.x+=dx/d*move;a.z+=dz/d*move;}
          a.yaw+=shortTurn(a.yaw,angleTo(a,p))*Math.min(1,dt*8);
          a.walkCycle+=dt*10;
          a.walkAmount=Math.min(1,a.walkAmount+dt*5);
        }else if(a.phase==='sitting'||a.phase==='lying'){
          a.walkAmount=Math.max(0,a.walkAmount-dt*6);
        }else if(a.phase==='sittingDown'||a.phase==='lyingDown'||a.phase==='gettingUp'){
          a.transition=Math.min(1,a.transition+dt/(a.phase==='gettingUp'?1.35:1.30));
          const v=a.transition*a.transition*(3-2*a.transition);
          if(a.from&&a.to){
            a.x=lerp(a.from.x,a.to.x,v);a.z=lerp(a.from.z,a.to.z,v);
            a.yaw=a.from.yaw+shortTurn(a.from.yaw,a.to.yaw)*v;
            a.sit=lerp(a.from.sit,a.to.sit,v);a.lie=lerp(a.from.lie,a.to.lie,v);
          }
          a.walkAmount=Math.max(0,a.walkAmount-dt*6);
          if(a.transition>=1){
            if(a.phase==='gettingUp'){
              if(a.target!==null&&this.reserved[a.target]===a.id)this.reserved[a.target]=null;
              a.phase='idle';a.target=null;a.message='Klar';a.sit=0;a.lie=0;
            }else{a.phase=a.phase==='sittingDown'?'sitting':'lying';a.message=a.phase==='sitting'?'Sitter i stolen':'Ligger på sengen';}
          }
        }else a.walkAmount=Math.max(0,a.walkAmount-dt*6);
        a.x=Math.max(-4.20,Math.min(4.20,a.x));a.z=Math.max(-3.15,Math.min(3.18,a.z));
      }
    }
    _arrived(a){
      const kind=a.target,t=TARGETS[kind];if(!t)return;
      const posture=kind==='chair'?'sittingDown':'lyingDown';
      a.phase=posture;a.transition=0;
      a.from={x:a.x,z:a.z,yaw:a.yaw,sit:0,lie:0};
      a.to={x:t.final.x,z:t.final.z,yaw:kind==='chair'?0:0,sit:kind==='chair'?1:0,lie:kind==='bed'?1:0};
      a.message=kind==='chair'?'Setter seg':'Legger seg';
    }
  }
  return {World,STARTS,TARGETS};
});
