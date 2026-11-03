import { describe,it,expect } from 'vitest';
import { BASIC_ATTACK as A,attackPose,crossesTarget } from '../../src/core/attack';
import { createWorld,step,type Command } from '../../src/core/world';
import { bladePoints } from '../../src/rendering/kael';
import { project } from '../../src/math/iso';
const idle:Command={move:{x:0,y:0},aim:null,attack:false,dodge:false};
function setup(){const w=createWorld();w.mode='playing';w.player.x=0;w.player.y=0;w.player.facing=0;w.enemies[0]!.x=70;w.enemies[0]!.y=0;w.enemies[0]!.cooldown=10;return w;}
function frames(w:ReturnType<typeof setup>,count:number,command=idle){for(let i=0;i<count;i++)step(w,command,1/60);}
describe('basic sword timing',()=>{
 it('prepares without damage, then hits during the visible blade crossing',()=>{const w=setup();step(w,{...idle,attack:true},1/60);expect(w.player.attack).toBe(A.duration);expect(w.enemies[0]!.hp).toBe(100);frames(w,5);expect(w.enemies[0]!.hp).toBe(100);expect(w.swings).toBe(1);frames(w,4);expect(w.enemies[0]!.hp).toBe(75);expect(w.attackHit).toBe(true);expect(w.effects).toHaveLength(1);frames(w,12);expect(w.enemies[0]!.hp).toBe(75);});
 it('requires another press instead of repeating a held attack',()=>{const w=setup(),held={...idle,attack:true};frames(w,23,held);expect(w.swings).toBe(1);expect(w.enemies[0]!.hp).toBe(75);frames(w,10,held);expect(w.swings).toBe(1);expect(w.enemies[0]!.hp).toBe(75);});
 it.each(['menu','paused','dead','won'] as const)('cannot attack while %s',mode=>{const w=setup();w.mode=mode;frames(w,40,{...idle,attack:true});expect(w.enemies[0]!.hp).toBe(100);expect(w.swings).toBe(0);expect(w.player.attack).toBe(0);});
 it('returns to locomotion and expires every impact effect after release',()=>{const w=setup();step(w,{...idle,attack:true},1/60);frames(w,12);expect(w.effects.length).toBeGreaterThan(0);frames(w,40,{...idle,move:{x:0,y:1}});expect(w.player.attack).toBe(0);expect(w.effects).toEqual([]);expect(w.player.moving).toBe(1);expect(w.player.y).toBeGreaterThan(100);});
 it('locks the committed cut direction while allowing new aim for the next attack',()=>{const w=setup();step(w,{...idle,attack:true},1/60);frames(w,12,{...idle,aim:{x:-1,y:0}});expect(w.player.facing).toBe(0);expect(w.player.desiredFacing).toBe(Math.PI);expect(w.attackFacing).toBe(0);expect(w.enemies[0]!.hp).toBe(75);frames(w,30);expect(w.player.facing).toBeCloseTo(Math.PI);});
 it('does not damage targets behind Kael or outside the original reach',()=>{for(const x of [-70,180]){const w=setup();w.enemies[0]!.x=x;step(w,{...idle,attack:true},1/60);frames(w,12);expect(w.enemies[0]!.hp).toBe(100);}});
 it('clears transient visuals on death instead of freezing a blade trail',()=>{const w=setup();step(w,{...idle,attack:true},1/60);frames(w,9);w.player.hp=0;step(w,idle,1/60);expect(w.mode).toBe('dead');expect(w.player.attack).toBe(0);expect(w.effects).toHaveLength(0);});
 it('sweeps crossed sectors even across a large simulation interval',()=>{expect(crossesTarget(.06,.2,0)).toBe(true);expect(crossesTarget(.01,.07,0)).toBe(false);expect(crossesTarget(.21,.3,0)).toBe(false);expect(crossesTarget(.06,.2,Math.PI)).toBe(false);});
 it('uses the same world direction for the blade and damage sector',()=>{for(const facing of [0,Math.PI/2,Math.PI,-Math.PI/2]){const time=(A.windup+A.activeEnd)/2;const tip=bladePoints(facing,time).tip;const expected=project({x:Math.cos(facing)*113,y:Math.sin(facing)*113},48);expect(tip.x).toBeCloseTo(expected.x);expect(tip.y).toBeCloseTo(expected.y);expect(attackPose(time).phase).toBe('active');}expect(attackPose(A.duration).angle).toBeCloseTo(-.25);});
});
