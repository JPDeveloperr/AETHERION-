import {describe,it,expect} from 'vitest';
import {BASIC_ATTACK as A,attackPose} from '../../src/core/attack';
import {createWorld,step,type Command} from '../../src/core/world';
import {angleLerp,bladePoints,capturePlayer,interpolatePlayer,kaelPose,elbowPoint,SwordTrail,type PlayerFrame} from '../../src/rendering/kael-motion';
const idle:Command={move:{x:0,y:0},aim:null,attack:false,dodge:false};
function frame(elapsed:number,running=false):PlayerFrame{
 const w=createWorld();w.mode='playing';w.time=1+elapsed;w.attackId=1;w.attackStartedAt=1;
 w.player.attack=elapsed>=0&&elapsed<A.duration?A.duration-elapsed:0;
 w.player.facing=w.attackFacing=0.3;w.player.phase=w.time*12;w.player.moving=running?1:0;
 w.player.x=running?elapsed*190:0;w.player.y=0;
 return capturePlayer(w);
}
const delta=(a:readonly number[],b:readonly number[])=>Math.max(...a.map((n,i)=>Math.abs(n-b[i]!)));
const channels=(t:number)=>{const p=attackPose(t);return [p.angle,p.extension,p.twist,p.weight];};
describe('continuous sword and body channels',()=>{
 for(const boundary of [0,A.windup,A.activeEnd,A.duration]){
  it(`has continuous pose and velocity at ${boundary}s`,()=>{
   const h=1e-6,l=channels(boundary-h),c=channels(boundary),r=channels(boundary+h);
   expect(delta(l,r)).toBeLessThan(.00001);
   const vl=c.map((v,i)=>(v-l[i]!)/h),vr=r.map((v,i)=>(v-c[i]!)/h);
   expect(delta(vl,vr)).toBeLessThan(.01);
  });
  it(`blends running/body/breath at ${boundary}s without resetting a limb`,()=>{
   const values=(t:number)=>{const p=kaelPose(frame(t,true));return [p.bob,p.stride,p.stance,p.grip.x,p.grip.y,p.tip.x,p.tip.y];};
   expect(delta(values(boundary-1e-6),values(boundary+1e-6))).toBeLessThan(.002);
  });
 }
 it('keeps stepping during a running cut instead of freezing both legs',()=>{
  const a=kaelPose(frame(.11,true)),b=kaelPose(frame(.17,true));
  expect(Math.abs(a.stride)).toBeGreaterThan(.5);expect(a.stride).not.toBe(b.stride);
 });
 it('keeps the wrist and tip continuous through the formerly discontinuous 15% extension',()=>{
  for(const facing of [0,1,2,3,4,5]){const a=bladePoints(facing,A.activeEnd-1e-7),b=bladePoints(facing,A.activeEnd+1e-7);expect(Math.hypot(a.tip.x-b.tip.x,a.tip.y-b.tip.y)).toBeLessThan(.0001);}
 });
 it('turns through the shortest arc at the -pi/pi seam',()=>{expect(angleLerp(Math.PI-.01,-Math.PI+.01,.5)).toBeCloseTo(Math.PI);});
 it('extends the elbow smoothly instead of snapping at the old 38-unit limit',()=>{
  for(const d of [0,1,37.999,38,38.001,55]){const a=elbowPoint([0,0],[d-1e-5,0],1),b=elbowPoint([0,0],[d+1e-5,0],1);expect(delta(a,b)).toBeLessThan(.001);expect(a.every(Number.isFinite)).toBe(true);}
 });
});
describe('fixed timestep presentation',()=>{
 it.each([60,120,144])('interpolates running at %i Hz without changing simulation speed',hz=>{
  const w=createWorld();w.mode='playing';w.player.x=0;w.player.y=0;let previous=capturePlayer(w),accumulator=0,lastTime=0;
  for(let i=1;i<=Math.floor(hz*.7);i++){
   accumulator+=1/hz;
   while(accumulator>=1/60){previous=capturePlayer(w);step(w,{...idle,move:{x:1,y:0}},1/60);accumulator-=1/60;}
   const view=interpolatePlayer(previous,capturePlayer(w),accumulator*60);
   expect(view.time).toBeGreaterThanOrEqual(lastTime);lastTime=view.time;
   expect(view.player.x).toBeCloseTo(190*Math.max(0,i/hz-1/60),7);
   expect(view.player.x).toBeLessThanOrEqual(w.player.x);
  }
 });
 it('does not interpolate a new swing timer backwards across its event',()=>{
  const w=createWorld();w.mode='playing';const before=capturePlayer(w);step(w,{...idle,attack:true},1/60);const after=capturePlayer(w);
  expect(interpolatePlayer(before,after,.5).player.attack).toBe(0);
  expect(interpolatePlayer(before,after,1).player.attack).toBe(A.duration);
  const previous=capturePlayer(w);step(w,idle,1/60);
  expect(interpolatePlayer(previous,capturePlayer(w),.5).player.attack).toBeCloseTo(A.duration-1/120);
 });
 it('holds direction and never restarts a held attack inside its cooldown',()=>{
  const w=createWorld();w.mode='playing';let lastId=0,lastStart=-1,previousRemaining=0,locked=0;
  for(let i=0;i<100;i++){
   const before={x:w.player.x,y:w.player.y};step(w,{...idle,attack:true,move:{x:i%2?1:0,y:i%2?0:1}},1/60);
   expect(Math.hypot(w.player.x-before.x,w.player.y-before.y)).toBeCloseTo(190/60);
   if(w.attackId!==lastId){expect(w.time-lastStart).toBeGreaterThanOrEqual(A.cooldown-1e-9);lastId=w.attackId;lastStart=w.time;locked=w.attackFacing;}
   else if(w.player.attack>0){expect(w.player.attack).toBeLessThan(previousRemaining);expect(w.attackFacing).toBe(locked);}
   previousRemaining=w.player.attack;
  }
  expect(w.attackId).toBe(5);expect([A.damage,A.reach,A.cooldown]).toEqual([25,125,.38]);
 });
 it('remembers the last movement direction after stopping, without any aim input',()=>{
  const w=createWorld();w.mode='playing';for(let i=0;i<20;i++)step(w,{...idle,move:{x:0,y:1}},1/60);
  const facing=w.player.facing;step(w,{...idle,attack:true},1/60);expect(w.attackFacing).toBe(facing);
  for(let i=0;i<20;i++)step(w,idle,1/60);expect(w.attackFacing).toBe(facing);
 });
});
describe('world-space blade trail',()=>{
 it('retains old tip positions while Kael runs and expires after the cut',()=>{
  const trail=new SwordTrail();for(let t=0;t<.15;t+=1/120)trail.update(frame(t,true));
  expect(trail.samples.length).toBeGreaterThan(2);const old=trail.samples.at(-1)!,saved={...old.tip};
  trail.update(frame(.16,true));expect(trail.samples).toContain(old);expect(old.tip).toEqual(saved);
  expect(trail.samples.length).toBeLessThanOrEqual(32);
  trail.update(frame(.3,true));expect(trail.samples).toEqual([]);expect(trail.fade).toBe(0);
 });
 it('stores the actual endpoint for every sampled frame and clears on death',()=>{
  const trail=new SwordTrail();trail.update(frame(.08,true));const f=frame(.12,true);trail.update(f);
  expect(trail.samples.at(-1)!.tip.x).toBeCloseTo(kaelPose(f).tip.x,10);expect(trail.samples.at(-1)!.tip.y).toBeCloseTo(kaelPose(f).tip.y,10);
  trail.update({...frame(.13,true),mode:'dead'});expect(trail.samples).toEqual([]);
 });
});
