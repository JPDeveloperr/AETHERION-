import {describe,it,expect} from 'vitest';
import {ABILITIES,abilityPose,burstCrosses,createPowers,grantAether,perfectDodge,requestAbility,type AbilityKind} from '../../src/core/abilities';
import {createWorld,createEnemy,restoreEncounters,step,type Command} from '../../src/core/world';
import {capturePlayer,interpolatePlayer,kaelPose} from '../../src/rendering/kael-motion';
const idle:Command={move:{x:0,y:0},aim:null,attack:false,dodge:false};
const tick=(w:ReturnType<typeof createWorld>,n=1,c=idle)=>{for(let i=0;i<n;i++)step(w,c,1/60);};
function setup(){const w=createWorld();w.mode='playing';w.player.x=w.player.y=w.player.facing=0;w.enemies[0]!.x=70;w.enemies[0]!.y=0;w.enemies[0]!.cooldown=100;return w;}
const tap=(w:ReturnType<typeof createWorld>)=>tick(w,1,{...idle,attack:true,attackPressed:true});
describe('Aether events',()=>{
 it('starts empty, never regenerates and clamps grants/consumption to 0–100',()=>{const w=setup();tick(w,100);expect(w.powers.energy).toBe(0);grantAether(w,120);expect(w.powers.energy).toBe(100);grantAether(w,-200);expect(w.powers.energy).toBe(0);});
 it('rewards 12, 12 and 20 only for unique living target hits',()=>{const w=setup();for(const expected of [12,24,44]){tap(w);tick(w,25);expect(w.powers.energy).toBe(expected);}const before=w.powers.energy;tick(w,40);expect(w.powers.energy).toBe(before);});
 it('grants nothing for air, a dead target or a held button after its one hit',()=>{
  for(const state of ['air','dead','held']){const w=setup();if(state==='air')w.enemies[0]!.x=300;if(state==='dead')w.enemies[0]!.hp=0;
   tick(w,50,{...idle,attack:true});expect(w.powers.energy).toBe(state==='held'?12:0);}
 });
 it('rewards two valid enemies once each, not repeated overlap',()=>{const w=setup();w.enemies.push(createEnemy('specter',9,75,5));w.enemies[1]!.cooldown=100;tap(w);tick(w,22);expect(w.powers.energy).toBe(24);expect(w.hitTargets).toHaveLength(2);});
 it('retains energy across encounters but resets it on a new game/checkpoint restoration',()=>{
  const w=setup();grantAether(w,60);w.enemies[0]!.hp=0;tick(w,82);expect(w.completedEncounters).toBe(1);expect(w.powers.energy).toBe(60);
  restoreEncounters(w,2);expect(w.powers.energy).toBe(0);expect(createWorld().powers.energy).toBe(0);
 });
});
describe.each(['blade','nova'] as const)('%s activation and collision',kind=>{
 const a=ABILITIES[kind];
 it('rejects insufficient energy without charging, casting or starting cooldown',()=>{const w=setup();grantAether(w,a.cost-1);expect(requestAbility(w,kind)).toBe(false);expect(w.powers.energy).toBe(a.cost-1);expect(w.powers.cooldowns[kind]).toBe(0);expect(w.powers.cast).toBeNull();});
 it('accepts exact cost once and refuses a held input after cooldown expires',()=>{
  const w=setup();grantAether(w,a.cost);tick(w,1,{...idle,[kind]:true});expect(w.powers.energy).toBe(0);expect(w.powers.casts).toBe(1);expect(w.powers.cooldowns[kind]).toBe(a.cooldown);
  grantAether(w,100);tick(w,400,{...idle,[kind]:true});expect(w.powers.casts).toBe(1);expect(w.powers.energy).toBe(100);
 });
 it('separates input spam, busy rejection and cooldown, and never emits twice',()=>{
  const w=setup();grantAether(w,100);expect(requestAbility(w,kind)).toBe(true);expect(requestAbility(w,kind)).toBe(false);expect(w.powers.energy).toBe(100-a.cost);
  tick(w,55);expect(w.powers.emissions).toBe(1);expect(requestAbility(w,kind)).toBe(false);expect(w.powers.rejection?.reason).toBe('cooldown');
 });
 it('damages each living enemy at most once and never replenishes energy from specials',()=>{
  const w=setup();w.enemies.push(createEnemy('specter',9,80,20));w.enemies[1]!.cooldown=100;grantAether(w,100);requestAbility(w,kind);tick(w,42);
  expect(w.enemies.map(e=>e.hp)).toEqual([100-a.damage,100-a.damage]);expect(w.powers.energy).toBe(100-a.cost);expect(w.hits).toBe(2);tick(w,30);expect(w.hits).toBe(2);expect(w.powers.bursts).toEqual([]);
 });
 it('does not damage during preparation, follows the visible expanding front and excludes distant targets',()=>{
  const b={x:0,y:0,id:1,kind,startedAt:0,facing:0,hitTargets:[]};
  expect(burstCrosses(b,0,0,{x:70,y:0})).toBe(false);
  expect(burstCrosses(b,0,a.expansion,{x:a.reach-1,y:0})).toBe(true);
  expect(burstCrosses(b,0,a.expansion,{x:a.reach+1,y:0})).toBe(false);
  expect(burstCrosses(b,a.expansion+.02,a.expansion+.1,{x:70,y:0})).toBe(false);
  const w=setup();grantAether(w,100);requestAbility(w,kind);tick(w,Math.floor(a.release*60)-1);expect(w.enemies[0]!.hp).toBe(100);
 });
 it('keeps movement responsive, locks facing, blocks J overlap and returns smoothly',()=>{
  const w=setup();grantAether(w,100);requestAbility(w,kind);const face=w.powers.cast!.facing;
  tick(w,10,{...idle,attack:true,aim:{x:0,y:1},move:{x:0,y:1}});
  expect(w.attackId).toBe(0);expect(w.player.y).toBeCloseTo(190/6);expect(w.powers.cast!.facing).toBe(face);expect(w.player.facing).toBe(face);
  tick(w,60);expect(w.powers.cast).toBeNull();expect(w.player.facing).toBeCloseTo(Math.PI/2);tap(w);expect(w.attackId).toBe(1);expect(w.comboIndex).toBe(0);
 });
 for(const mode of ['menu','paused','dead','won'] as const)it(`cannot start in ${mode} and removes transient powers`,()=>{
  const w=setup();grantAether(w,100);requestAbility(w,kind);tick(w,Math.ceil(a.release*60)+1);expect(w.powers.bursts.length).toBeGreaterThan(0);
  w.mode=mode;const energy=w.powers.energy;tick(w,1,{...idle,[kind]:true});expect(w.powers.bursts).toEqual([]);expect(w.powers.cast).toBeNull();expect(w.powers.energy).toBe(energy);expect(requestAbility(w,kind)).toBe(false);
 });
});
describe('perfect dodge is a collision event',()=>{
 it('rewards a real sentinel strike during the first 120 ms without damage',()=>{
  const w=setup();w.enemies[0]!.telegraph=.01;tick(w,1,{...idle,dodge:true});expect(w.player.hp).toBe(100);expect(w.powers.energy).toBe(20);expect(w.powers.perfectDodges).toBe(1);expect(w.dodge).toBe(.24);expect(w.dodgeCooldown).toBe(1.1);
 });
 it('rewards a real projectile, removes it and cannot reward its source again',()=>{
  const w=setup();w.projectiles.push({id:44,x:30,y:0,vx:-230,vy:0,life:3});tick(w,1,{...idle,dodge:true});tick(w,3);
  expect(w.powers.energy).toBe(20);expect(w.player.hp).toBe(100);expect(w.projectiles).toEqual([]);perfectDodge(w,'projectile:44');expect(w.powers.energy).toBe(20);expect(w.powers.perfectDodges).toBe(1);
 });
 it('does not reward collisions already prevented by damage invulnerability',()=>{const w=setup();w.player.hurt=.3;w.enemies[0]!.telegraph=.01;tick(w,1,{...idle,dodge:true});expect(w.powers.energy).toBe(0);});
 it('gives nothing for pressing dodge without a hostile collision or dodging a distant strike',()=>{
  const w=setup();tick(w,1,{...idle,dodge:true});tick(w,4);expect(w.powers.energy).toBe(0);
  w.enemies[0]!.x=160;w.enemies[0]!.telegraph=.01;tick(w);expect(w.powers.energy).toBe(0);
 });
 it('preserves late dodge invulnerability without a perfect reward',()=>{
  const w=setup();tick(w,1,{...idle,dodge:true});tick(w,9);w.enemies[0]!.telegraph=.01;tick(w);expect(w.player.hp).toBe(100);expect(w.powers.energy).toBe(0);
 });
 it('gives no reward for a normal hit and caps multiple distinct evaded attacks',()=>{
  const w=setup();w.enemies[0]!.telegraph=.01;tick(w);expect(w.player.hp).toBe(85);expect(w.powers.energy).toBe(0);
  grantAether(w,90);w.player.hurt=0;w.enemies[0]!.telegraph=.01;tick(w,1,{...idle,dodge:true});expect(w.powers.energy).toBe(100);expect(w.powers.perfectDodges).toBe(1);
 });
});
describe('action priority and lifecycle',()=>{
 it('gives dodge priority over a simultaneous J/K/L request without spending energy',()=>{
  const w=setup();grantAether(w,100);tick(w,1,{...idle,attack:true,blade:true,nova:true,dodge:true});expect(w.powers.cast).toBeNull();expect(w.powers.energy).toBe(100);expect(w.attackId).toBe(0);expect(w.powers.rejection?.reason).toBe('dodge');
 });
 it('selects Nova over Blade/J and lets an already committed cast coexist with dodge locomotion',()=>{
  const w=setup();grantAether(w,100);tick(w,1,{...idle,attack:true,blade:true,nova:true});expect(w.powers.cast?.kind).toBe('nova');expect(w.powers.energy).toBe(30);expect(w.attackId).toBe(0);
  tick(w,1,{...idle,dodge:true,move:{x:1,y:0}});expect(w.dodge).toBe(.24);expect(w.powers.cast?.kind).toBe('nova');expect(w.player.x).toBeCloseTo(620/60);
 });
 it('blocks specials during J without consuming energy or buffering an incompatible pose',()=>{
  const w=setup();grantAether(w,100);tap(w);tick(w,1,{...idle,blade:true});expect(w.powers.cast).toBeNull();expect(w.powers.energy).toBe(100);tick(w,30);expect(w.powers.casts).toBe(0);
 });
 it('does not grant immunity during preparation',()=>{const w=setup();grantAether(w,100);requestAbility(w,'nova');w.enemies[0]!.telegraph=.01;tick(w);expect(w.player.hp).toBe(85);expect(w.powers.cast?.kind).toBe('nova');});
 it('cancels a dead player before emission and clears bursts on victory',()=>{
  const w=setup();grantAether(w,100);requestAbility(w,'blade');w.player.hp=0;tick(w,30);expect(w.mode).toBe('dead');expect(w.powers.emissions).toBe(0);expect(w.powers.cast).toBeNull();
  const v=setup();grantAether(v,100);requestAbility(v,'nova');v.completedEncounters=3;v.enemies=[];v.player.x=v.player.y=285;tick(v);expect(v.mode).toBe('won');expect(v.powers.cast).toBeNull();expect(v.powers.bursts).toEqual([]);
 });
 it('is deterministic for identical fixed input streams',()=>{
  const a=setup(),b=setup();for(const w of [a,b]){grantAether(w,100);for(let i=0;i<180;i++)step(w,{...idle,blade:i<70,attack:i===100,dodge:i===80},1/60);}expect(a).toEqual(b);
 });
});
describe.each(['blade','nova'] as const)('%s continuous body rig',kind=>{
 const spec=ABILITIES[kind];
 for(const t of [0,spec.windup,spec.release,spec.activeEnd,spec.duration])it(`preserves pose and velocity at ${t}`,()=>{
  const sample=(elapsed:number)=>{
   const w=setup();w.time=2+elapsed;w.player.moving=1;w.player.phase=w.time*12;
   if(elapsed>=0&&elapsed<spec.duration)w.powers.cast={kind,id:1,startedAt:2,facing:0,released:false};
   const rig=kaelPose(capturePlayer(w)),p=abilityPose(elapsed,kind);return [p.angle,p.extension,p.weight,p.twist,rig.grip.x,rig.grip.y,rig.tip.x,rig.tip.y,rig.bob,rig.stride];
  };
  const h=1e-7,l=sample(t-h),c=sample(t),r=sample(t+h);
  for(let i=0;i<l.length;i++){expect(Math.abs(l[i]!-r[i]!)).toBeLessThan(.003);expect(Math.abs((c[i]!-l[i]!)/h-(r[i]!-c[i]!)/h)).toBeLessThan(.1);}
 });
 it.each([60,120,144])('interpolates special start and recovery at %i Hz without inventing an earlier cast',hz=>{
  const w=setup();grantAether(w,100);const before=capturePlayer(w);tick(w,1,{...idle,[kind]:true});const after=capturePlayer(w);
  expect(interpolatePlayer(before,after,.5).special).toBeNull();expect(interpolatePlayer(before,after,1).special?.kind).toBe(kind);
  let prev=after,acc=0;for(let i=0;i<hz;i++){acc+=1/hz;while(acc>=1/60){prev=capturePlayer(w);tick(w);acc-=1/60;}const f=interpolatePlayer(prev,capturePlayer(w),acc*60);expect(Number.isFinite(kaelPose(f).tip.x)).toBe(true);}
 });
});
