import {recoilPosition} from './feedback';
import { Graphics } from 'pixi.js';
import type { Enemy, Projectile } from '../core/world';
import { project } from '../math/iso';

/** Retained source geometry only: floating shards, hollow mantle and an exposed core. */
export function drawSpecter(g:Graphics,e:Enemy,time:number,reducedMotion:boolean) {
 const p=project(recoilPosition(e)),dy=reducedMotion?0:Math.sin(time*2.8+e.id)*4;
 const dead=e.hp<=0,fade=dead?e.death/.65:1,burst=dead?(1-fade)*40:0;
 if(fade<=0)return;
 const x=p.x,y=p.y-24+dy,charge=Math.max(0,e.telegraph/.85);
 const violet=e.hurt>0?0xeeebff:0xb38bfa,ice=0xe4d7ff;
 g.ellipse(p.x,p.y+4,26,10).fill({color:0x030615,alpha:.42*fade});
 g.ellipse(p.x,p.y,30+charge*12,16+charge*5).fill({color:0x8050d8,alpha:.06*fade});
 for(const side of [-1,1]){
  const dx=side*burst;
  g.poly([x+dx+side*7,y-40-burst,x+dx+side*20,y-26-burst,x+dx+side*29,y+4,x+dx+side*12,y-1,x+dx+side*5,y-20])
   .fill({color:0x241e43,alpha:fade}).stroke({color:0x7960ac,width:1,alpha:.8*fade});
  g.poly([x+dx+side*17,y-17,x+dx+side*24,y+10+burst,x+dx+side*13,y+23+burst,x+dx+side*10,y+2])
   .fill({color:0x39305c,alpha:fade});
  g.moveTo(x+dx+side*17,y-20).lineTo(x+dx+side*21,y+2).stroke({color:violet,width:1,alpha:.6*fade});
 }
 // Angular hood and a negative-space face, with two luminous eye slits.
 g.poly([x,y-60-burst,x-13,y-42-burst,x-10,y-28,x,y-33,x+10,y-28,x+13,y-42-burst])
  .fill({color:0x3b3059,alpha:fade}).stroke({color:0x8b78ac,width:1,alpha:fade});
 g.poly([x,y-51-burst,x-8,y-40,x,y-33,x+8,y-40]).fill({color:0x0d1023,alpha:fade});
 for(const s of [-1,1])g.moveTo(x+s*2,y-40).lineTo(x+s*6,y-42).stroke({color:ice,width:1.8,alpha:fade});
 const pulse=1+Math.sin(time*5)*.07;
 g.circle(x,y-18,(16+charge*9)*pulse).fill({color:violet,alpha:.07*fade});
 g.circle(x,y-18,9+charge*4).stroke({color:violet,width:1,alpha:.5*fade});
 g.poly([x,y-27,x+6,y-18,x,y-8,x-6,y-18]).fill({color:violet,alpha:fade});
 g.poly([x,y-24,x+2,y-18,x,y-12,x-2,y-18]).fill({color:ice,alpha:fade});
 for(let i=0;i<5;i++){
  const a=(reducedMotion?0:time*.9)+i*Math.PI*2/5;
  const sx=x+Math.cos(a)*(31+burst),sy=y-22+Math.sin(a)*14;
  g.poly([sx,sy-7,sx+4,sy,sx,sy+6,sx-3,sy]).fill({color:i%2?0x635080:0xa48acb,alpha:fade})
   .stroke({color:violet,width:.6,alpha:fade*.7});
 }
 if(!dead){g.rect(x-24,y-70,48,3).fill(0x21172f);g.rect(x-24,y-70,48*e.hp/100,3).fill(0xb18be8);}
 // Fixed aiming line: the player can read and dodge where the shot will go.
 if(e.telegraph>0){
  const end=project({x:e.x+Math.cos(e.aim)*330,y:e.y+Math.sin(e.aim)*330});
  g.moveTo(p.x,p.y-42).lineTo(end.x,end.y-42).stroke({color:0xb787ff,width:1.5,alpha:.25+(1-charge)*.4});
  g.circle(x,y-18,12+(1-charge)*18).stroke({color:ice,width:1.2,alpha:fade*.7});
 }
}
export function drawProjectile(g:Graphics,b:Projectile) {
 const p=project(b,42),tail=project({x:b.x-b.vx*.085,y:b.y-b.vy*.085},42);
 const ground=project(b);g.ellipse(ground.x,ground.y,8,4).fill({color:0x9565df,alpha:.12});
 g.moveTo(tail.x,tail.y).lineTo(p.x,p.y).stroke({color:0xa16ef1,width:6,alpha:.24});
 g.circle(p.x,p.y,9).fill({color:0xa16ef1,alpha:.1});
 g.poly([p.x,p.y-6,p.x+6,p.y,p.x,p.y+6,p.x-6,p.y]).fill(0xaa82f2);
 g.circle(p.x,p.y,2.5).fill(0xf0e6ff);
}
