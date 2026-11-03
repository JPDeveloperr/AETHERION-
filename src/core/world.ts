import {createPowers,grantAether,perfectDodge,requestAbility,tickPowers,coolPowerTimers,clearAbilityEffects,type PowerState} from './abilities';
import {damageEnemy,clampArena as clamp} from './combat';
import { attackSpec, COMBO_GRACE, INPUT_BUFFER, crossesTarget } from './attack';
import { distance, normalized, type Vec } from '../math/iso';
export interface Actor extends Vec {hp:number;facing:number;attack:number;hurt:number;phase:number;moving?:number;desiredFacing?:number}
export interface Enemy extends Actor {id:number;kind:'sentinel'|'specter';cooldown:number;telegraph:number;death:number;aim:number;strikeId:number}
export interface Projectile extends Vec {vx:number;vy:number;life:number;id:number}
export interface Command {move:Vec;aim:Vec|null;attack:boolean;attackPressed?:boolean;dodge:boolean;blade?:boolean;nova?:boolean;bladePressed?:boolean;novaPressed?:boolean}
export type Mode='menu'|'playing'|'paused'|'dead'|'won';
export interface World {
 powers:PowerState;player:Actor;enemies:Enemy[];projectiles:Projectile[];mode:Mode;time:number;cooldown:number;
 dodge:number;dodgeCooldown:number;kills:number;completedEncounters:number;transition:number;
 attackFacing:number;attackStartedAt:number;attackId:number;attackHit:boolean;hitTargets:number[];
 comboIndex:number;comboUntil:number;bufferUntil:number;attackDown:boolean;swings:number;
 effects:{x:number;y:number;life:number;kind:'hit'|'slash';power?:number}[];hits:number;nextProjectile:number;
}
export function createEnemy(kind:Enemy['kind'],id:number,x:number,y:number):Enemy {
 return {id,kind,x,y,hp:100,facing:2.4,attack:0,hurt:0,phase:0,cooldown:1.5,telegraph:0,death:0,aim:0,strikeId:0};
}
function encounter(index:number):Enemy[] {
 if(index===0)return [createEnemy('sentinel',1,165,-100)];
 if(index===1)return [createEnemy('specter',2,150,-145)];
 if(index===2)return [createEnemy('sentinel',3,-30,-180),createEnemy('specter',4,210,15)];
 return [];
}
export function createWorld():World {
 return {powers:createPowers(),player:{x:-110,y:90,hp:100,facing:-.6,attack:0,hurt:0,phase:0},enemies:encounter(0),projectiles:[],mode:'menu',time:0,cooldown:0,dodge:0,dodgeCooldown:0,kills:0,completedEncounters:0,transition:0,attackFacing:-.6,attackStartedAt:-1,attackId:0,attackHit:false,hitTargets:[],comboIndex:0,comboUntil:0,bufferUntil:0,attackDown:false,swings:0,effects:[],hits:0,nextProjectile:0};
}
/** Checkpoints store completed encounters, never half-finished actors/projectiles. */
export function restoreEncounters(w:World,completed:number) {
 w.completedEncounters=Math.max(0,Math.min(3,Math.floor(completed)));
 w.enemies=encounter(w.completedEncounters);w.kills=[0,1,2,4][w.completedEncounters]!;
 w.projectiles=[];w.transition=0;w.powers=createPowers();
}
function hurtPlayer(w:World,damage:number,source:string) {
 if(w.player.hp<=0||w.player.hurt>0)return;
 if(w.dodge>0){perfectDodge(w,source);return;}
 w.player.hp=Math.max(0,w.player.hp-damage);w.player.hurt=.3;w.hits++;
}
/** Swept segment/circle collision prevents fast projectiles passing through Kael. */
export function segmentHits(a:Vec,b:Vec,p:Vec,radius:number) {
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
 return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y)<=radius;
}
export function step(w:World,c:Command,dt:number) {
 if(w.mode!=='playing'){clearAbilityEffects(w);w.effects=[];return;}
 if(w.player.hp<=0){w.mode='dead';w.player.attack=0;w.effects=[];w.projectiles=[];w.bufferUntil=0;clearAbilityEffects(w);return;}
 const previousCast=w.powers.cast;
 const bladePressed=c.bladePressed??(!!c.blade&&!w.powers.bladeDown),novaPressed=c.novaPressed??(!!c.nova&&!w.powers.novaDown);
 w.powers.bladeDown=!!c.blade;w.powers.novaDown=!!c.nova;
 const ability=novaPressed?'nova':bladePressed?'blade':null;
 const p=w.player,previousAttack=p.attack,pressed=c.attackPressed??(c.attack&&!w.attackDown);
 w.attackDown=c.attack;w.time+=dt;coolPowerTimers(w,dt);
 w.cooldown=Math.max(0,w.cooldown-dt);w.dodgeCooldown=Math.max(0,w.dodgeCooldown-dt);w.dodge=Math.max(0,w.dodge-dt);
 for(const a of [p,...w.enemies]){a.attack=Math.max(0,a.attack-dt);a.hurt=Math.max(0,a.hurt-dt);}
 w.effects=w.effects.filter(e=>(e.life-=dt)>0);
 const m=normalized(c.move);
 if(c.dodge&&w.dodgeCooldown===0){w.dodge=.24;w.dodgeCooldown=1.1;w.powers.dodgeStartedAt=w.time;w.powers.evadedSources=[];}
 const speed=w.dodge>0?620:190;p.moving=Math.hypot(m.x,m.y);
 p.x=clamp(p.x+m.x*speed*dt);p.y=clamp(p.y+m.y*speed*dt);
 if(p.moving>.05){p.desiredFacing=Math.atan2(m.y,m.x);p.phase+=dt*12;}else p.phase+=dt*2;
 if(c.aim&&Math.hypot(c.aim.x,c.aim.y)>.1)p.desiredFacing=Math.atan2(c.aim.y,c.aim.x);
 if(previousAttack===0&&!previousCast){const delta=Math.atan2(Math.sin((p.desiredFacing??p.facing)-p.facing),Math.cos((p.desiredFacing??p.facing)-p.facing));p.facing+=Math.max(-16*dt,Math.min(16*dt,delta));}
 const spec=attackSpec(w.comboIndex);
 // Finish the previous sweep before accepting a new attack event.
 if(previousAttack>0){
  const before=spec.duration-previousAttack,now=spec.duration-p.attack;
  if(before<spec.windup&&now>=spec.windup)w.swings++;
  for(const e of w.enemies){
   const angle=Math.atan2(e.y-p.y,e.x-p.x)-w.attackFacing;
   if(e.hp>0&&!w.hitTargets.includes(e.id)&&distance(p,e)<spec.reach&&crossesTarget(before,now,angle,w.comboIndex)){
    w.hitTargets.push(e.id);w.attackHit=true;
    if(damageEnemy(w,e,spec.damage,spec.knockback,w.attackFacing,w.comboIndex===2?1.5:1))grantAether(w,w.comboIndex===2?20:12);
   }
  }
 }
 // One buffered edge, never a chain from a held button. Early mashing cannot queue two cuts.
 if(ability)requestAbility(w,ability);
 if(pressed&&!w.powers.cast&&!ability&&w.powers.dodgeStartedAt!==w.time){
  if(previousAttack===0||spec.duration-previousAttack>=.06)w.bufferUntil=w.time+INPUT_BUFFER;
 }
 if(!w.powers.cast&&!ability&&w.powers.dodgeStartedAt!==w.time&&w.bufferUntil>=w.time&&w.bufferUntil>0&&w.cooldown===0&&p.attack===0&&p.hp>0){
  w.comboIndex=w.attackId>0&&w.time<=w.comboUntil&&w.comboIndex<2?w.comboIndex+1:0;
  const next=attackSpec(w.comboIndex);
  w.cooldown=next.cooldown;p.attack=next.duration;w.comboUntil=w.time+next.duration+COMBO_GRACE;
  w.attackFacing=p.facing;w.attackStartedAt=w.time;w.attackId++;w.attackHit=false;w.hitTargets=[];w.bufferUntil=0;
 }
 tickPowers(w,dt);
 for(const e of w.enemies){
  if(e.hp<=0){e.death=Math.max(0,e.death-dt);continue;}
  if(e.hurt>0){e.telegraph=0;e.cooldown=Math.max(e.cooldown,.45);continue;}
  e.phase+=dt*(e.kind==='specter'?2.5:9);e.facing=Math.atan2(p.y-e.y,p.x-e.x);e.cooldown-=dt;
  const d=distance(p,e);
  if(e.telegraph>0){
   e.telegraph-=dt;
   if(e.telegraph<=0){
    e.strikeId++;e.attack=.3;e.cooldown=e.kind==='specter'?1.8:1.3;
    if(e.kind==='sentinel'){if(d<100)hurtPlayer(w,15,`melee:${e.id}:${e.strikeId}`);}
    else w.projectiles.push({id:++w.nextProjectile,x:e.x,y:e.y,vx:Math.cos(e.aim)*230,vy:Math.sin(e.aim)*230,life:3});
   }
  }else if(e.kind==='sentinel'){
   if(d<94&&e.cooldown<=0)e.telegraph=.8;
   else if(d>70){e.x=clamp(e.x+Math.cos(e.facing)*90*dt);e.y=clamp(e.y+Math.sin(e.facing)*90*dt);}
  }else{
   if(d<430&&e.cooldown<=0){e.telegraph=.85;e.aim=e.facing;}
   else{
    // Orbit on the firing cooldown; retreat locally, bounded to reachable arena floor.
    const radial=d>265?1:d<175?-1:0,orbit=e.id%2?1:-1;
    const vx=Math.cos(e.facing)*radial-Math.sin(e.facing)*.5*orbit;
    const vy=Math.sin(e.facing)*radial+Math.cos(e.facing)*.5*orbit;
    e.x=clamp(e.x+vx*78*dt);e.y=clamp(e.y+vy*78*dt);
   }
  }
 }
 w.projectiles=w.projectiles.filter(b=>{
  const before={x:b.x,y:b.y};b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(segmentHits(before,b,p,22)){hurtPlayer(w,12,`projectile:${b.id}`);return false;}
  return b.life>0&&Math.abs(b.x)<405&&Math.abs(b.y)<405;
 });
 if(p.hp<=0){w.mode='dead';p.attack=0;w.effects=[];w.projectiles=[];w.bufferUntil=0;clearAbilityEffects(w);for(const e of w.enemies)e.death=0;return;}
 if(w.transition>0){w.transition=Math.max(0,w.transition-dt);if(w.transition===0)w.enemies=encounter(w.completedEncounters);}
 else if(w.completedEncounters<3&&w.enemies.length>0&&w.enemies.every(e=>e.hp<=0)){
  w.completedEncounters++;w.transition=w.completedEncounters<3?1.3:0;w.projectiles=[];
  p.hp=Math.min(100,p.hp+20);
 }
 if(w.completedEncounters===3&&distance(p,{x:285,y:285})<75){w.mode='won';p.attack=0;w.effects=[];w.projectiles=[];w.enemies=[];w.bufferUntil=0;clearAbilityEffects(w);}
}
