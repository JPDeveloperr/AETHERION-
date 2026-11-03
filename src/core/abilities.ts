import type {World} from './world';
import type {Vec} from '../math/iso';
import {smooth,timelinePose} from './attack';
import {damageEnemy} from './combat';
export type AbilityKind='blade'|'nova';
export const ABILITIES={
 blade:{name:'Lâmina de Aether',cost:35,cooldown:1.8,duration:.62,windup:.14,activeEnd:.32,release:.23,halfArc:1.7,direction:1,reach:180,damage:30,knockback:20,expansion:.45,lifetime:.62},
 nova:{name:'Nova Astral',cost:70,cooldown:6,duration:.82,windup:.24,activeEnd:.4,release:.24,halfArc:.6,direction:1,reach:135,damage:45,knockback:25,expansion:.16,lifetime:.62},
} as const;
export interface Cast {kind:AbilityKind;id:number;startedAt:number;facing:number;released:boolean}
export interface Burst extends Vec {kind:AbilityKind;id:number;startedAt:number;facing:number;hitTargets:number[]}
export interface PowerState {
 energy:number;cooldowns:Record<AbilityKind,number>;cast:Cast|null;bursts:Burst[];casts:number;emissions:number;lastKind:AbilityKind;
 bladeDown:boolean;novaDown:boolean;energyEvent:{id:number;delta:number;time:number};
 rejection:{kind:AbilityKind;reason:'energy'|'cooldown'|'busy'|'dodge';time:number}|null;
 dodgeStartedAt:number;evadedSources:string[];perfectDodges:number;perfectUntil:number;
}
export function createPowers():PowerState {
 return {energy:0,cooldowns:{blade:0,nova:0},cast:null,bursts:[],casts:0,emissions:0,lastKind:'blade',bladeDown:false,novaDown:false,energyEvent:{id:0,delta:0,time:-1},rejection:null,dodgeStartedAt:-1,evadedSources:[],perfectDodges:0,perfectUntil:0};
}
export function grantAether(w:World,amount:number) {
 const p=w.powers,before=p.energy;p.energy=Math.min(100,Math.max(0,p.energy+amount));
 if(p.energy!==before)p.energyEvent={id:p.energyEvent.id+1,delta:p.energy-before,time:w.time};
}
export function perfectDodge(w:World,source:string) {
 const p=w.powers;
 if(w.mode!=='playing'||w.dodge<=0||w.time-p.dodgeStartedAt>.12+1e-9||p.evadedSources.includes(source))return;
 p.evadedSources.push(source);p.perfectDodges++;p.perfectUntil=w.time+.65;grantAether(w,20);
}
/** Specials are edge-triggered and blocked while busy. A simultaneous Nova has priority over Blade/J. */
export function requestAbility(w:World,kind:AbilityKind):boolean {
 const p=w.powers,a=ABILITIES[kind];
 if(w.mode!=='playing'||w.player.hp<=0)return false;
 const reason=w.dodge>0?'dodge':p.cast||w.player.attack>0||w.cooldown>0?'busy':p.cooldowns[kind]>0?'cooldown':p.energy<a.cost?'energy':null;
 if(reason){p.rejection={kind,reason,time:w.time};return false;}
 grantAether(w,-a.cost);p.cooldowns[kind]=a.cooldown;
 p.cast={kind,id:++p.casts,startedAt:w.time,facing:w.player.facing,released:false};
 w.bufferUntil=0;w.comboUntil=0;return true;
}
export function clearAbilityEffects(w:World) {
 w.powers.cast=null;w.powers.bursts=[];w.powers.perfectUntil=0;w.powers.rejection=null;
}
export function abilityPose(elapsed:number,kind:AbilityKind) {
 const a=ABILITIES[kind];
 if(kind==='blade')return timelinePose(elapsed,a);
 const weight=elapsed<a.windup?smooth(elapsed/a.windup):1-smooth((elapsed-a.activeEnd)/(a.duration-a.activeEnd));
 return {angle:-.25-.9*weight,twist:-.16*weight,extension:1-.12*weight,weight,phase:elapsed<a.windup?'windup' as const:elapsed<a.activeEnd?'active' as const:'recovery' as const};
}
export function burstRadius(kind:AbilityKind,age:number) {
 const a=ABILITIES[kind],t=Math.max(0,Math.min(1,age/a.expansion));
 return a.reach*(kind==='nova'?smooth(t):t);
}
/** Same annular sector as the vector renderer: radial sweep, fixed direction, one hit per ID. */
export function burstCrosses(b:Burst,previousAge:number,age:number,target:Vec) {
 const a=ABILITIES[b.kind];
 if(previousAge>a.expansion||age<0)return false;
 const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy);
 if(d>a.reach||d<Math.max(0,burstRadius(b.kind,previousAge)-12)||d>burstRadius(b.kind,age)+12)return false;
 if(b.kind==='nova')return true;
 const angle=Math.atan2(Math.sin(Math.atan2(dy,dx)-b.facing),Math.cos(Math.atan2(dy,dx)-b.facing));
 return Math.abs(angle)<=.72;
}
export function coolPowerTimers(w:World,dt:number){for(const k of ['blade','nova'] as const)w.powers.cooldowns[k]=Math.max(0,w.powers.cooldowns[k]-dt);}
export function tickPowers(w:World,dt:number) {
 const p=w.powers;
 const cast=p.cast;
 if(cast){
  const a=ABILITIES[cast.kind],elapsed=w.time-cast.startedAt;
  if(!cast.released&&elapsed>=a.release){
   cast.released=true;p.emissions++;p.lastKind=cast.kind;
   p.bursts.push({id:cast.id,kind:cast.kind,x:w.player.x,y:w.player.y,facing:cast.facing,startedAt:cast.startedAt+a.release,hitTargets:[]});
  }
  if(elapsed>=a.duration)p.cast=null;
 }
 p.bursts=p.bursts.filter(b=>{
  const age=w.time-b.startedAt,a=ABILITIES[b.kind];
  if(age>a.lifetime)return false;
  for(const e of w.enemies){
   if(e.hp>0&&!b.hitTargets.includes(e.id)&&burstCrosses(b,Math.max(0,age-dt),age,e)){
    b.hitTargets.push(e.id);
    damageEnemy(w,e,a.damage,a.knockback,b.kind==='nova'?Math.atan2(e.y-b.y,e.x-b.x):b.facing,b.kind==='nova'?1.8:1.4);
   }
  }
  return true;
 });
}
