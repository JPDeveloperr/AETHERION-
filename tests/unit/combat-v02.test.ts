import {describe,it,expect} from 'vitest';
import {attackSpec,attackPose,crossesTarget,COMBO_ATTACKS} from '../../src/core/attack';
import {createWorld,createEnemy,restoreEncounters,segmentHits,step,type Command} from '../../src/core/world';
import {capturePlayer,interpolatePlayer,kaelPose,bladePoints,SwordTrail} from '../../src/rendering/kael-motion';
import {parseCheckpoint,browserServices} from '../../src/platform/services';
const idle:Command={move:{x:0,y:0},aim:null,attack:false,dodge:false};
const tick=(w:ReturnType<typeof createWorld>,n=1,c=idle)=>{for(let i=0;i<n;i++)step(w,c,1/60);};
function arena(){const w=createWorld();w.mode='playing';w.player.x=0;w.player.y=0;w.player.facing=0;w.enemies[0]!.x=85;w.enemies[0]!.y=0;w.enemies[0]!.cooldown=100;return w;}
const tap=(w:ReturnType<typeof createWorld>)=>tick(w,1,{...idle,attack:true,attackPressed:true});
describe('three deliberate cuts',()=>{
 it('buffers one tap in recovery, runs the reverse cut and finishes only after a third tap',()=>{
  const w=arena();tap(w);tick(w,12);tap(w);tick(w,12);
  expect(w.attackId).toBe(2);expect(w.comboIndex).toBe(1);
  tick(w,12);tap(w);tick(w,12);expect(w.comboIndex).toBe(2);expect(w.attackId).toBe(3);
  tick(w,80);expect(w.attackId).toBe(3);expect(w.player.attack).toBe(0);expect(w.enemies[0]!.hp).toBe(8);
 });
 it('cannot repeat or complete a combo from one held button',()=>{const w=arena();tick(w,120,{...idle,attack:true});expect(w.attackId).toBe(1);expect(w.comboIndex).toBe(0);expect(w.enemies[0]!.hp).toBe(75);});
 it('expires old input and resets combo after the grace window',()=>{const w=arena();tap(w);tick(w,90);tap(w);expect(w.attackId).toBe(2);expect(w.comboIndex).toBe(0);});
 it('does not turn early taps into additional stored cuts',()=>{const w=arena();tap(w);tap(w);tick(w,80);expect(w.attackId).toBe(1);});
 it('hits each target at most once per swing, including a two-enemy sweep',()=>{
  const w=arena();w.enemies.push(createEnemy('specter',8,80,10));w.enemies[1]!.cooldown=100;
  tap(w);tick(w,23);expect(w.enemies.map(e=>e.hp)).toEqual([75,75]);expect(w.hitTargets).toEqual([1,8]);
  tick(w,6);expect(w.enemies.map(e=>e.hp)).toEqual([75,75]);
 });
 it('keeps the damage window and knockback distinct for the finisher',()=>{
  const w=arena();w.comboIndex=1;w.attackId=2;w.comboUntil=10;tap(w);
  tick(w,7);expect(w.enemies[0]!.hp).toBe(100);
  let before=w.enemies[0]!.x;
  for(let i=0;i<10&&!w.attackHit;i++){before=w.enemies[0]!.x;tick(w);}
  expect(w.enemies[0]!.hp).toBe(58);expect(w.enemies[0]!.x-before).toBeCloseTo(32);
  expect(w.hitTargets).toHaveLength(1);
 });
 it('moves and remembers a new direction throughout a buffered combo',()=>{
  const w=arena();tap(w);const locked=w.attackFacing;
  tick(w,15,{...idle,move:{x:0,y:1}});expect(w.attackFacing).toBe(locked);expect(w.player.y).toBeCloseTo(190/4);expect(w.player.desiredFacing).toBeCloseTo(Math.PI/2);
 });
});
describe('continuous combo rig and shared collision',()=>{
 for(let index=0;index<3;index++){
  const a=attackSpec(index);
  for(const boundary of [0,a.windup,a.activeEnd,a.duration])it(`cut ${index+1} preserves position and velocity at ${boundary}`,()=>{
   const sample=(t:number)=>{
    const w=createWorld();w.comboIndex=index;w.attackId=1;w.time=2+t;w.attackStartedAt=2;
    w.player.attack=t>=0&&t<a.duration?a.duration-t:0;w.player.phase=w.time*12;w.player.moving=1;
    const f=kaelPose(capturePlayer(w)),p=attackPose(t,index);
    return [p.angle,p.twist,p.extension,p.weight,f.tip.x,f.tip.y,f.grip.x,f.grip.y,f.bob,f.stride];
   };
   const h=1e-6,l=sample(boundary-h),c=sample(boundary),r=sample(boundary+h);
   for(let i=0;i<l.length;i++){
    expect(Math.abs(l[i]!-r[i]!)).toBeLessThan(.003);
    expect(Math.abs((c[i]!-l[i]!)/h-(r[i]!-c[i]!)/h)).toBeLessThan(.08);
   }
  });
  it(`cut ${index+1} collides only along its active swept blade arc`,()=>{
   expect(crossesTarget(a.windup-.01,a.activeEnd+.01,0,index)).toBe(true);
   expect(crossesTarget(0,a.windup-.01,0,index)).toBe(false);
   expect(crossesTarget(a.windup,a.activeEnd,Math.PI,index)).toBe(false);
   const start=bladePoints(0,a.windup,index),end=bladePoints(0,a.activeEnd,index);
   expect(Math.sign(end.angle-start.angle)).toBe(a.direction);
  });
 }
 it('interpolates the longer finisher without using the first attack duration',()=>{
  const w=arena();w.comboIndex=2;w.attackId=3;w.attackStartedAt=0;w.time=.2;w.player.attack=.3;
  const a=capturePlayer(w);tick(w);const view=interpolatePlayer(a,capturePlayer(w),.5);
  expect(view.player.attack).toBeCloseTo(.3-1/120);expect(view.comboIndex).toBe(2);
  const trail=new SwordTrail();trail.update(a);trail.update(view);expect(trail.samples.length).toBeGreaterThan(0);
 });
 it('preserves valid combo event interpolation at 60, 120 or 144 Hz',()=>{
  for(const hz of [60,120,144]){
   const w=arena();tap(w);tick(w,12);tap(w);let previous=capturePlayer(w),acc=0;
   for(let i=0;i<hz;i++){
    acc+=1/hz;while(acc>=1/60){previous=capturePlayer(w);tick(w);acc-=1/60;}
    const view=interpolatePlayer(previous,capturePlayer(w),acc*60),rig=kaelPose(view);
    expect([rig.tip.x,rig.tip.y,rig.grip.x,rig.grip.y].every(Number.isFinite)).toBe(true);
    expect(view.player.attack).toBeGreaterThanOrEqual(0);
   }
  }
 });
});
describe('void specter, projectiles and progression',()=>{
 it('approaches, retreats and stays reachable at arena edges',()=>{
  const w=arena();restoreEncounters(w,1);const e=w.enemies[0]!;e.x=360;e.y=360;e.cooldown=100;
  const start=Math.hypot(e.x,e.y);tick(w,120);expect(Math.hypot(e.x,e.y)).toBeLessThan(start);
  e.x=40;e.y=0;const near=Math.hypot(e.x,e.y);tick(w,30);expect(Math.hypot(e.x,e.y)).toBeGreaterThan(near);
  expect(Math.abs(e.x)).toBeLessThanOrEqual(370);expect(Math.abs(e.y)).toBeLessThanOrEqual(370);
 });
 it('telegraphs a committed shot and does not track the player during windup',()=>{
  const w=arena();restoreEncounters(w,1);const e=w.enemies[0]!;e.x=230;e.y=0;e.cooldown=0;
  tick(w);expect(e.telegraph).toBeCloseTo(.85);const aim=e.aim;
  tick(w,55,{...idle,move:{x:0,y:1}});expect(w.projectiles).toHaveLength(1);expect(e.aim).toBe(aim);
  expect(w.projectiles[0]!.vx).toBeLessThan(0);expect(w.projectiles[0]!.vy).toBeCloseTo(0);
 });
 it('sweeps collisions, damages once and respects dodge and hurt invulnerability',()=>{
  expect(segmentHits({x:-100,y:0},{x:100,y:0},{x:0,y:0},22)).toBe(true);
  expect(segmentHits({x:-100,y:30},{x:100,y:30},{x:0,y:0},22)).toBe(false);
  for(const dodge of [false,true]){
   const w=arena();w.projectiles.push({id:1,x:-30,y:0,vx:230,vy:0,life:3});
   tick(w,12,{...idle,dodge});expect(w.player.hp).toBe(dodge?100:88);expect(w.projectiles).toHaveLength(0);
  }
 });
 it('cleans projectiles at bounds, lifetime expiry, death and completed encounters',()=>{
  const w=arena();w.projectiles.push({id:1,x:400,y:350,vx:230,vy:0,life:3},{id:2,x:200,y:0,vx:0,vy:0,life:.01});tick(w,2);expect(w.projectiles).toEqual([]);
  w.projectiles.push({id:3,x:200,y:200,vx:0,vy:0,life:3});w.player.hp=0;tick(w);expect(w.projectiles).toEqual([]);
 });
 it('runs all three encounters, cleans defeated actors and gates the portal',()=>{
  const w=arena();
  for(let i=0;i<3;i++){
   expect(w.enemies.map(e=>e.kind)).toEqual(i===0?['sentinel']:i===1?['specter']:['sentinel','specter']);
   w.player.x=285;w.player.y=285;tick(w);expect(w.mode).toBe('playing');
   for(const e of w.enemies)e.hp=0;
   tick(w);expect(w.completedEncounters).toBe(i+1);
   if(i<2){expect(w.mode).toBe('playing');tick(w,80);}
  }
  expect(w.mode).toBe('won');expect(w.projectiles).toEqual([]);expect(w.enemies).toEqual([]);
 });
 it('restores every stage and migrates the original sentinel checkpoint without skipping the specter',async()=>{
  const date='2026-11-03T12:00:00Z';
  expect(parseCheckpoint(JSON.stringify({version:1,enemyDefeated:true,savedAt:date}))).toEqual({version:2,completedEncounters:1,savedAt:date});
  for(const completedEncounters of [0,1,2,3]){
   const map=new Map<string,string>(),port=browserServices({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);}});
   await port.saveCheckpoint({version:2,completedEncounters,savedAt:date});const saved=await port.loadCheckpoint();
   const w=arena();restoreEncounters(w,saved!.completedEncounters);expect(w.completedEncounters).toBe(completedEncounters);expect(w.enemies.length).toBe([1,1,2,0][completedEncounters]);
  }
  for(const count of [-1,4,.5,null])expect(parseCheckpoint(JSON.stringify({version:2,completedEncounters:count,savedAt:date}))).toBeNull();
 });
});
