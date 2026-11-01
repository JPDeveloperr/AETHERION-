import { BASIC_ATTACK, crossesTarget } from './attack';
import { distance, normalized, type Vec } from '../math/iso';
export interface Actor extends Vec { hp:number; facing:number; attack:number; hurt:number; phase:number; moving?:number; desiredFacing?:number }
export interface Command { move:Vec; aim:Vec|null; attack:boolean; dodge:boolean }
export type Mode = 'menu'|'playing'|'paused'|'dead'|'won';
export interface World { player:Actor; enemy:Actor; mode:Mode; time:number; cooldown:number; dodge:number; dodgeCooldown:number; telegraph:number; enemyCooldown:number; kills:number; attackFacing:number; attackStartedAt:number; attackId:number; attackHit:boolean; swings:number; effects:{x:number;y:number;life:number;kind:'hit'|'slash'}[]; hits:number }
export function createWorld():World {return {player:{x:-110,y:90,hp:100,facing:-0.6,attack:0,hurt:0,phase:0},enemy:{x:165,y:-100,hp:100,facing:2.4,attack:0,hurt:0,phase:0},mode:'menu',time:0,cooldown:0,dodge:0,dodgeCooldown:0,telegraph:0,enemyCooldown:1.5,kills:0,attackFacing:-0.6,attackStartedAt:-1,attackId:0,attackHit:false,swings:0,effects:[],hits:0};}
const clamp=(n:number)=>Math.max(-370,Math.min(370,n));
export function step(w:World,c:Command,dt:number) {
 if(w.mode!=='playing')return;
 const previousAttack=w.player.attack;
 w.time+=dt; w.cooldown=Math.max(0,w.cooldown-dt); w.dodgeCooldown=Math.max(0,w.dodgeCooldown-dt); w.dodge=Math.max(0,w.dodge-dt);
 for(const a of [w.player,w.enemy]){a.attack=Math.max(0,a.attack-dt);a.hurt=Math.max(0,a.hurt-dt);}
 w.effects=w.effects.filter(e=>(e.life-=dt)>0);
 const p=w.player,e=w.enemy,m=normalized(c.move);
 if(c.dodge&&w.dodgeCooldown===0){w.dodge=.24;w.dodgeCooldown=1.1;}
 const speed=w.dodge>0?620:190;p.moving=Math.hypot(m.x,m.y);
 p.x=clamp(p.x+m.x*speed*dt);p.y=clamp(p.y+m.y*speed*dt);
 if(Math.hypot(m.x,m.y)>.05){p.desiredFacing=Math.atan2(m.y,m.x);p.phase+=dt*12;}
 else p.phase+=dt*2;
 if(c.aim&&Math.hypot(c.aim.x,c.aim.y)>.1)p.desiredFacing=Math.atan2(c.aim.y,c.aim.x);
 // Keep the committed heading until recovery ends; remember later movement/gamepad aim.
 if(previousAttack===0){const delta=Math.atan2(Math.sin((p.desiredFacing??p.facing)-p.facing),Math.cos((p.desiredFacing??p.facing)-p.facing));p.facing+=Math.max(-16*dt,Math.min(16*dt,delta));}
 if(c.attack&&w.cooldown===0&&p.attack===0&&p.hp>0){
  w.cooldown=BASIC_ATTACK.cooldown;p.attack=BASIC_ATTACK.duration;
  w.attackFacing=p.facing;w.attackStartedAt=w.time;w.attackId++;w.attackHit=false;
 }
 if(previousAttack>0){
  const before=BASIC_ATTACK.duration-previousAttack,now=BASIC_ATTACK.duration-p.attack;
  if(before<BASIC_ATTACK.windup&&now>=BASIC_ATTACK.windup)w.swings++;
  const angle=Math.atan2(e.y-p.y,e.x-p.x)-w.attackFacing;
  if(!w.attackHit&&e.hp>0&&distance(p,e)<BASIC_ATTACK.reach&&crossesTarget(before,now,angle)){
   w.attackHit=true;e.hp=Math.max(0,e.hp-BASIC_ATTACK.damage);e.hurt=.2;w.hits++;
   w.effects.push({x:e.x,y:e.y,life:.4,kind:'hit'});
   e.x=clamp(e.x+Math.cos(w.attackFacing)*15);e.y=clamp(e.y+Math.sin(w.attackFacing)*15);
   if(e.hp===0){w.kills++;w.telegraph=0;}
  }
 }

 if(e.hp>0){
  const d=distance(p,e);e.facing=Math.atan2(p.y-e.y,p.x-e.x);w.enemyCooldown-=dt;
  if(w.telegraph>0){w.telegraph-=dt;if(w.telegraph<=0){e.attack=.3;w.enemyCooldown=1.3;if(d<100&&w.dodge===0){p.hp=Math.max(0,p.hp-15);p.hurt=.3;w.hits++;} }}
  else if(d<94&&w.enemyCooldown<=0)w.telegraph=.8;
  else if(d>70){e.x+=Math.cos(e.facing)*90*dt;e.y+=Math.sin(e.facing)*90*dt;e.phase+=dt*9;}
 }
 if(p.hp<=0){w.mode='dead';p.attack=0;w.effects=[];}
 if(e.hp===0&&distance(p,{x:285,y:285})<75){w.mode='won';p.attack=0;w.effects=[];}
}
