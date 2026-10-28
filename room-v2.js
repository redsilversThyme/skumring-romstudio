/* Skumring empty cottage: metres, glTF Y-up. No furniture. */
(() => {
  'use strict';
  const boxes=[], planes=[];
  const C={wall:[64,75,62],panel:[43,44,35],wood:[102,67,41],edge:[125,85,53],dark:[52,35,28],door:[75,47,32],brass:[167,123,72]};
  function box(id,group,c,lo,hi){
    if(lo.some((x,i)=>!(hi[i]>x)))throw Error('Invalid box: '+id);
    boxes.push({id,group,color:typeof c==='string'?C[c]:c,lo,hi});
  }
  function span(id,g,c,x0,x1,y0,y1,z0,z1){box(id,g,c,[x0,y0,z0],[x1,y1,z1]);}
  span('Foundation','01_Foundation','dark',-3.09,3.09,-.15,-.028,-2.59,2.5);
  // Each plank and end joint is cut into the surface, never raised over it.
  for(let row=0;row<27;row++){
    const z0=-2.5+row*5/27,z1=-2.5+(row+1)*5/27;
    const cuts=[-2.99];
    for(let x=-2.99+(.64+(row%3)*.57);x<2.99;x+=1.95)cuts.push(x);
    cuts.push(2.99);
    for(let j=0;j<cuts.length-1;j++){
      const k=(row*13+j*7)%11;
      span('Floor_plank_'+row+'_'+j,'02_Oak_Floor_Planks',[86+k*1.2,56+k*.8,36+k*.45],cuts[j]+.001,cuts[j+1]-.001,-.028,0,z0+.001,z1-.001);
    }
  }
  // Rear wall owns the corners; side walls stop at its inside face.
  const windows=[[-2.32,-.82],[.87,2.37]];
  for(const [i,a,b] of [[0,-3.09,-2.32],[1,-.82,.87],[2,2.37,3.09]])span('Rear_pier_'+i,'03_Walls_Rear','wall',a,b,0,2.96,-2.59,-2.41);
  windows.forEach(([a,b],i)=>{
    span('Window_'+i+'_below','03_Walls_Rear','wall',a,b,0,1.02,-2.59,-2.41);
    span('Window_'+i+'_above','03_Walls_Rear','wall',a,b,2.37,2.96,-2.59,-2.41);
  });
  for(const [i,a,b] of [[0,-2.41,-1.12],[1,-.16,2.5]])span('Left_wall_'+i,'03_Walls_Left','wall',-3.09,-2.91,0,2.96,a,b);
  span('Door_lintel','03_Walls_Left','wall',-3.09,-2.91,2.22,2.96,-1.12,-.16);
  span('Right_wall','03_Walls_Right','wall',2.91,3.09,0,2.96,-2.41,2.5);
  const leftRuns=[[-2.41,-1.205],[-.075,2.5]];
  span('Rear_panel','04_Wood_Paneling','panel',-2.91,2.91,.13,.94,-2.41,-2.375);
  span('Right_panel','04_Wood_Paneling','panel',2.875,2.91,.13,1.015,-2.375,2.5);
  leftRuns.forEach(([a,b],i)=>span('Left_panel_'+i,'04_Wood_Paneling','panel',-2.91,-2.875,.13,1.015,Math.max(a,-2.375),b));
  // Panel battens stop below the cap and never continue across the door.
  for(let x=-2.65,i=0;x<2.85;x+=.52,i++)span('Rear_batten_'+i,'04_Wood_Paneling','wood',x,x+.028,.15,.92,-2.375,-2.355);
  for(const side of [-1,1])for(let z=-2.20,i=0;z<2.45;z+=.52,i++){
    if(side<0&&z<-.075&&z+.028>-1.205)continue;
    const a=side<0?-2.875:2.855,b=side<0?-2.855:2.875;
    span('Side_batten_'+side+'_'+i,'04_Wood_Paneling','wood',a,b,.15,.99,z,z+.028);
  }
  span('Rear_baseboard','05_Baseboard_Trim','edge',-2.91,2.91,0,.13,-2.41,-2.335);
  span('Right_baseboard','05_Baseboard_Trim','edge',2.835,2.91,0,.13,-2.335,2.5);
  leftRuns.forEach(([a,b],i)=>span('Left_baseboard_'+i,'05_Baseboard_Trim','edge',-2.91,-2.835,0,.13,Math.max(a,-2.335),b));
  // Back cap lies below window sills. Side caps are cut at the door casing.
  span('Rear_panel_cap','05_Chair_Rail_Trim','wood',-2.91,2.91,.94,.975,-2.41,-2.32);
  span('Right_chair_rail','05_Chair_Rail_Trim','wood',2.80,2.91,1.015,1.09,-2.41,2.5);
  leftRuns.forEach(([a,b],i)=>span('Left_chair_rail_'+i,'05_Chair_Rail_Trim','wood',-2.91,-2.80,1.015,1.09,a,b));
  span('Rear_cornice','05_Cornice_Trim','wood',-2.91,2.91,2.71,2.80,-2.41,-2.30);
  span('Right_cornice','05_Cornice_Trim','wood',2.80,2.91,2.71,2.80,-2.30,2.5);
  span('Left_cornice','05_Cornice_Trim','wood',-2.91,-2.80,2.71,2.80,-2.30,2.5);
  [-2.60,-.72,.75,2.50].forEach((x,i)=>span('Ceiling_beam_'+i,'05_Ceiling_Beams','dark',x-.065,x+.065,2.80,2.96,-2.41,2.5));
  windows.forEach(([a,b],i)=>{
    const g='06_Window_'+(i+1)+'_Wood_Frame',cx=(a+b)/2;
    span('Window_'+i+'_jamb_left',g,'wood',a-.09,a+.035,1.06,2.33,-2.45,-2.29);
    span('Window_'+i+'_jamb_right',g,'wood',b-.035,b+.09,1.06,2.33,-2.45,-2.29);
    span('Window_'+i+'_head',g,'edge',a-.09,b+.09,2.33,2.43,-2.45,-2.29);
    span('Window_'+i+'_sill',g,'edge',a-.135,b+.135,.975,1.06,-2.49,-2.10);
    span('Window_'+i+'_mullion',g,'wood',cx-.026,cx+.026,1.06,2.33,-2.49,-2.36);
    span('Window_'+i+'_cross_left',g,'wood',a+.035,cx-.026,1.726,1.774,-2.49,-2.36);
    span('Window_'+i+'_cross_right',g,'wood',cx+.026,b-.035,1.726,1.774,-2.49,-2.36);
    planes.push({id:'Forest_Rain_View_'+(i+1),group:'Forest_Rain_View',color:[65,88,79],p:[[a-.15,.87,-2.60],[b+.15,.87,-2.60],[b+.15,2.52,-2.60],[a-.15,2.52,-2.60]],f:[[0,1,2],[0,2,3]]});
  });
  const door='08_Old_Wood_Door';
  span('Door_slab',door,'door',-2.98,-2.92,.008,2.12,-1.07,-.21);
  span('Door_jamb_back',door,'edge',-3.00,-2.80,0,2.13,-1.20,-1.08);
  span('Door_jamb_front',door,'edge',-3.00,-2.80,0,2.13,-.20,-.08);
  span('Door_header',door,'edge',-3.00,-2.80,2.13,2.23,-1.20,-.08);
  for(const [i,lo,hi] of [[0,.24,.87],[1,1.19,1.89]]){
    span('Door_raised_panel_'+i,door,'wood',-2.92,-2.902,lo,hi,-.98,-.30);
    span('Door_inner_panel_'+i,door,'door',-2.902,-2.895,lo+.055,hi-.055,-.925,-.355);
  }
  span('Door_handle_mount',door,'brass',-2.92,-2.89,1.0,1.12,-.34,-.29);
  span('Door_handle',door,'brass',-2.89,-2.82,1.045,1.075,-.41,-.30);

  // Animation area: 3m x 3m. Lines sit directly above floor, unobstructed centre.
  span('Anim_zone_rear','09_Animation_Zone','edge',-1.5,1.5,0,.008,-1.25,-1.19);
  span('Anim_zone_front','09_Animation_Zone','edge',-1.5,1.5,0,.008,1.75,1.81);
  span('Anim_zone_left','09_Animation_Zone','edge',-1.5,-1.44,0,.008,-1.25,1.81);
  span('Anim_zone_right','09_Animation_Zone','edge',1.44,1.5,0,.008,-1.25,1.81);
  span('Anim_zone_mid_x','09_Animation_Zone',[96,112,92],-.015,.015,0,.007,-1.25,1.81);
  span('Anim_zone_mid_z','09_Animation_Zone',[96,112,92],-1.5,1.5,0,.007,.25,.31);

  // Flat floor markers for Ava and Victoria; not full-size character replacements.
  span('Start_Ava_base','10_Start_Markers',[88,132,114],-.95,-.43,0,.012,.02,.54);
  span('Start_Ava_core','10_Start_Markers',[128,168,149],-.84,-.54,.012,.018,.13,.43);
  span('Start_Victoria_base','10_Start_Markers',[142,87,83],.43,.95,0,.012,.02,.54);
  span('Start_Victoria_core','10_Start_Markers',[184,118,113],.54,.84,.012,.018,.13,.43);

  // Compact test sofa: left wall; feet rest on the floor; centre animation zone clear.
  span('Sofa_body','11_Test_Sofa',[66,98,81],-2.72,-2.08,.12,.36,.72,2.02);
  span('Sofa_left_arm','11_Test_Sofa',[58,86,72],-2.72,-2.08,.12,.56,.72,.90);
  span('Sofa_right_arm','11_Test_Sofa',[58,86,72],-2.72,-2.08,.12,.56,1.84,2.02);
  span('Sofa_back','11_Test_Sofa',[53,79,66],-2.72,-2.56,.36,.86,.72,2.02);
  span('Sofa_seat_split','11_Test_Sofa',[73,108,89],-2.50,-2.10,.34,.39,.74,2.00);
  span('Sofa_leg_0','11_Test_Sofa','dark',-2.68,-2.62,0,.12,.78,.84);
  span('Sofa_leg_1','11_Test_Sofa','dark',-2.18,-2.12,0,.12,.78,.84);
  span('Sofa_leg_2','11_Test_Sofa','dark',-2.68,-2.62,0,.12,1.90,1.96);
  span('Sofa_leg_3','11_Test_Sofa','dark',-2.18,-2.12,0,.12,1.90,1.96);

  window.SKUMRING_ROOM={version:'Animasjonsrom v2.1',boxes,planes,floorLevel:0,units:'meters'};
})();
