import { attackSpec, attackPose } from '../core/attack';
import type { Actor, World, Mode } from '../core/world';
import { project, type Vec } from '../math/iso';

export interface PlayerFrame {
  player: Actor;
  time: number;
  attackFacing: number;
  attackStartedAt: number;
  attackId: number;
  mode: Mode;
  comboIndex?: number;
}
export function capturePlayer(w:World):PlayerFrame {
  return {player:{...w.player},time:w.time,attackFacing:w.attackFacing,
    attackStartedAt:w.attackStartedAt,attackId:w.attackId,comboIndex:w.comboIndex,mode:w.mode};
}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export function angleLerp(a:number,b:number,t:number){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;}
/** Present one fixed step behind the simulation, never extrapolating collisions. */
export function interpolatePlayer(a:PlayerFrame,b:PlayerFrame,alpha:number):PlayerFrame {
  if(b.mode==='dead'||b.mode==='won'||a.time===b.time)return {...b,player:{...b.player}};
  const t=Math.max(0,Math.min(1,alpha)),time=lerp(a.time,b.time,t);
  // A newly accepted attack is an event, not a timer that may be lerped backwards.
  const event=b.attackId!==a.attackId&&time<b.attackStartedAt?a:b;
  const elapsed=time-event.attackStartedAt,A=attackSpec(event.comboIndex);
  const remaining=event.attackId>0&&elapsed>=0&&elapsed<A.duration?A.duration-elapsed:0;
  return {...event,time,mode:b.mode,player:{...b.player,
    x:lerp(a.player.x,b.player.x,t),y:lerp(a.player.y,b.player.y,t),
    facing:angleLerp(a.player.facing,b.player.facing,t),phase:lerp(a.player.phase,b.player.phase,t),
    moving:lerp(a.player.moving??0,b.player.moving??0,t),hurt:lerp(a.player.hurt,b.player.hurt,t),attack:remaining}};
}
export function bladePoints(facing:number,elapsed:number|null,index=0) {
  const pose=elapsed===null?{angle:-.25,extension:1}:attackPose(elapsed,index);
  const angle=facing+pose.angle;
  const lift=index===2&&elapsed!==null?Math.sin(Math.PI*Math.max(0,Math.min(1,elapsed/attackSpec(index).duration)))**2*12:0;
  const at=(radius:number,z:number)=>project({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius},z+lift);
  return {grip:at(32*pose.extension,48),guard:at(42*pose.extension,48),tip:at(113*pose.extension,48),angle};
}
/** Shared, continuous body channels; locomotion never switches on/off at an attack edge. */
export function kaelPose(f:PlayerFrame) {
  const A=attackSpec(f.comboIndex),a=f.player,elapsed=a.attack>0?A.duration-a.attack:null;
  const pose=elapsed===null?{angle:-.25,extension:1,twist:0,weight:0,phase:'idle' as const}:attackPose(elapsed,f.comboIndex);
  const facing=elapsed===null?a.facing:f.attackFacing;
  const breath=Math.sin(f.time*2.5)*.65;
  const bob=lerp(breath,-Math.sin((elapsed??0)/A.duration*Math.PI)*(f.comboIndex===2?3.5:1.7),pose.weight);
  const moving=a.moving??0;
  const stride=Math.sin(a.phase)*5*moving*(1-.25*pose.weight);
  const position=project(a),blade=bladePoints(facing,elapsed,f.comboIndex);
  return {elapsed,pose,facing,bob,stride,stance:2*pose.weight*(1-.7*moving),position,blade,
    grip:{x:position.x+blade.grip.x,y:position.y+bob+blade.grip.y},
    tip:{x:position.x+blade.tip.x,y:position.y+bob+blade.tip.y}};
}
/** Soft extension avoids the square-root singularity at a fully straight elbow. */
export function elbowPoint(shoulder:readonly[number,number],hand:readonly[number,number],bend:number):readonly[number,number] {
  const dx=hand[0]-shoulder[0],dy=hand[1]-shoulder[1],d=Math.hypot(dx,dy);
  const normalLength=Math.sqrt(d*d+1);
  const curve=12/(1+(d/28)**4);
  return [(shoulder[0]+hand[0])/2-dy/normalLength*curve*bend,(shoulder[1]+hand[1])/2+dx/normalLength*curve*bend];
}
export interface TrailSample {time:number; grip:Vec; tip:Vec}
/** Store the actual world-space path, not old angles relocated around today's player position. */
export class SwordTrail {
  private previous:PlayerFrame|null=null;
  private id=-1;
  readonly samples:TrailSample[]=[];
  fade=0;
  time=0;
  update(frame:PlayerFrame) {
    const A=attackSpec(frame.comboIndex);
    this.time=frame.time;
    const elapsed=frame.time-frame.attackStartedAt;
    if(frame.attackId!==this.id){this.samples.length=0;this.id=frame.attackId;}
    if(frame.mode==='dead'||frame.mode==='won'||elapsed>A.activeEnd+.09||frame.attackId===0){
      this.samples.length=0;this.fade=0;this.previous=frame;return;
    }
    const from=this.previous;
    if(from&&from.attackId===frame.attackId&&frame.time>from.time){
      // Subsample only the interpolated motion between two displayed frames.
      // At most 24 samples for the frame delta cap (100 ms), and 32 retained.
      const count=Math.min(24,Math.max(1,Math.ceil((frame.time-from.time)*240)));
      for(let i=1;i<=count;i++){
        const f=interpolatePlayer(from,frame,i/count),e=f.time-f.attackStartedAt;
        if(e>=A.windup&&e<=A.activeEnd){const pose=kaelPose(f);this.samples.push({time:f.time,grip:pose.grip,tip:pose.tip});}
      }
    }
    const end=frame.attackStartedAt+Math.min(elapsed,A.activeEnd);
    while(this.samples.length&&(this.samples[0]!.time<end-.065||this.samples.length>32))this.samples.shift();
    this.fade=elapsed<=A.activeEnd?1:Math.max(0,1-(elapsed-A.activeEnd)/.09);
    this.previous=frame;
  }
}
