import {Graphics} from 'pixi.js';
import {ABILITIES,abilityPose,burstRadius,type Burst} from '../core/abilities';
import type {World} from '../core/world';
import {project} from '../math/iso';
import {kaelPose,type PlayerFrame} from './kael-motion';
const cyan=0x70efeb,gold=0xe8c27a,ice=0xe6ffff;
function arc(b:Burst,r:number,z:number,from:number,to:number,segments=24) {
 return Array.from({length:segments+1},(_,i)=>{const a=b.facing+from+(to-from)*i/segments;return project({x:b.x+Math.cos(a)*r,y:b.y+Math.sin(a)*r},z);});
}
function line(g:Graphics,points:{x:number;y:number}[],color:number,width:number,alpha:number) {
 if(!points.length)return;g.moveTo(points[0]!.x,points[0]!.y);
 for(const p of points.slice(1))g.lineTo(p.x,p.y);g.stroke({color,width,alpha,cap:'round'});
}
function drawBurst(g:Graphics,b:Burst,time:number,reducedMotion:boolean) {
 const age=time-b.startedAt,a=ABILITIES[b.kind];if(age<0||age>a.lifetime)return;
 const r=burstRadius(b.kind,age),fade=Math.min(1,age/.025)*Math.max(0,Math.min(1,(a.lifetime-age)/.18));
 if(b.kind==='blade'){
  // Three earlier radii form a temporal crescent trail, with a faceted core and golden lip.
  for(let j=2;j>=0;j--){
   const radius=burstRadius('blade',Math.max(0,age-j*.035));
   const outer=arc(b,radius,48,-.72,.72),inner=arc(b,Math.max(0,radius-10),48,-.72,.72);
   g.poly([...outer,...inner.reverse()].flatMap(p=>[p.x,p.y])).fill({color:cyan,alpha:fade*(j?.055:.24)});
   if(j===0){line(g,outer,gold,1.5,.9*fade);line(g,arc(b,Math.max(0,radius-3),48,-.68,.68),ice,2.5,.9*fade);}
  }
  if(!reducedMotion)for(let i=0;i<12;i++){
   const angle=b.facing-.7+i*.127,rr=Math.max(0,r-10-(age*67+i*13)%35);
   const p=project({x:b.x+Math.cos(angle)*rr,y:b.y+Math.sin(angle)*rr},48+Math.sin(i*3)*5);
   g.poly([p.x,p.y-3,p.x+2,p.y,p.x,p.y+3,p.x-2,p.y]).fill({color:i%3?cyan:gold,alpha:fade*.7});
  }
 }else{
  const ground=project(b,5);
  g.ellipse(ground.x,ground.y,r*1.32,r*.76).fill({color:cyan,alpha:.035*fade});
  for(const scale of [1,.83,.64])line(g,arc(b,r*scale,8,-Math.PI,Math.PI,48),scale===.83?gold:cyan,scale===1?3:1,.7*fade);
  const polygon=arc(b,r*.9,8,-Math.PI,Math.PI,12);line(g,polygon,gold,1,.38*fade);
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,rad=r*.92,p=project({x:b.x+Math.cos(angle)*rad,y:b.y+Math.sin(angle)*rad},10);
   g.moveTo(p.x-3,p.y-4).lineTo(p.x,p.y+4).lineTo(p.x+3,p.y-4).stroke({color:gold,width:1,alpha:fade*.8});
   if(!reducedMotion){const s=project({x:b.x+Math.cos(angle)*(r+age*28),y:b.y+Math.sin(angle)*(r+age*28)},12+Math.sin(age*8)*18);
    g.poly([s.x,s.y-5,s.x+2,s.y,s.x,s.y+3,s.x-2,s.y]).fill({color:i%2?gold:ice,alpha:fade*.75});}
  }
  if(age<.065){const p=project(b,35);g.circle(p.x,p.y,18*(1-age/.065)).fill({color:ice,alpha:.25*fade});}
 }
}
export function drawPowerEffects(g:Graphics,w:World,view:PlayerFrame,reducedMotion:boolean) {
 if(w.mode!=='playing')return;
 const cast=view.special,rig=kaelPose(view);
 if(cast){
  const elapsed=view.time-cast.startedAt,pose=abilityPose(elapsed,cast.kind),weight=pose.weight;
  const x=rig.position.x+pose.twist*14+Math.sin(pose.twist*.35)*54;
  const y=rig.position.y+rig.bob-Math.cos(pose.twist*.35)*54;
  if(cast.kind==='blade'){
   line(g,[rig.grip,rig.tip],cyan,9,.13*weight);line(g,[rig.grip,rig.tip],gold,2,.5*weight);
   g.circle(rig.tip.x,rig.tip.y,7*weight).fill({color:ice,alpha:.14*weight});
  }else{
   g.circle(x,y,22*weight).fill({color:cyan,alpha:.12*weight});g.circle(x,y,8*weight).fill({color:ice,alpha:.5*weight});
   for(let i=0;i<7;i++){const angle=i*Math.PI*2/7+(reducedMotion?0:elapsed*5),p=project({x:view.player.x+Math.cos(angle)*42*weight,y:view.player.y+Math.sin(angle)*42*weight},35+Math.sin(angle)*9);
    g.poly([p.x,p.y-5,p.x+2,p.y,p.x,p.y+4,p.x-2,p.y]).fill({color:i%2?cyan:gold,alpha:.75*weight});}
  }
 }
 for(const b of w.powers.bursts)drawBurst(g,b,view.time,reducedMotion);
 if(w.powers.perfectUntil>w.time){
  const t=1-(w.powers.perfectUntil-w.time)/.65,p=rig.position,fade=1-t;
  g.ellipse(p.x,p.y,22+t*44,10+t*20).stroke({color:gold,width:1.7,alpha:fade*.8});
  g.ellipse(p.x,p.y-32,20+t*12,36).stroke({color:cyan,width:1,alpha:fade*.22});
 }
}
