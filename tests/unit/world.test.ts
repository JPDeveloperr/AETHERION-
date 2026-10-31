import { describe,it,expect } from 'vitest';
import { createWorld,step,type Command } from '../../src/core/world';
import { project,unproject,distance } from '../../src/math/iso';
import { parseSettings,parseCheckpoint,browserServices } from '../../src/platform/services';
const idle:Command={move:{x:0,y:0},aim:null,attack:false,dodge:false};
describe('isometric simulation',()=>{
 it('round trips coordinates and keeps physical height independent',()=>{const p={x:217,y:-88};const screen=project(p);expect(unproject(screen).x).toBeCloseTo(p.x);expect(unproject(screen).y).toBeCloseTo(p.y);expect(project(p,30).y).toBe(screen.y-30);});
 it('normalizes diagonal motion and clamps arena bounds',()=>{const w=createWorld();w.mode='playing';const before={...w.player};step(w,{...idle,move:{x:1,y:1}},1/60);expect(distance(before,w.player)).toBeCloseTo(190/60);for(let i=0;i<1000;i++)step(w,{...idle,move:{x:-1,y:0}},1/60);expect(w.player.x).toBe(-370);});
 it('does not advance when paused',()=>{const w=createWorld();w.mode='paused';step(w,{...idle,attack:true},1);expect(w.time).toBe(0);});
 it('telegraphs damage, permits dodge and rate limits attacks',()=>{const w=createWorld();w.mode='playing';w.enemy.x=w.player.x+60;w.enemy.y=w.player.y;w.enemyCooldown=0;step(w,idle,1/60);expect(w.telegraph).toBeGreaterThan(0);expect(w.player.hp).toBe(100);w.telegraph=.01;step(w,{...idle,dodge:true},1/60);expect(w.player.hp).toBe(100);w.dodge=0;w.telegraph=.01;step(w,idle,1/60);expect(w.player.hp).toBe(85);step(w,{...idle,aim:{x:1,y:0},attack:true},1/60);const hp=w.enemy.hp;step(w,{...idle,aim:{x:1,y:0},attack:true},1/60);expect(w.enemy.hp).toBe(hp);});
 it('defeats the sentinel, removes its attacks, and completes at the portal',()=>{const w=createWorld();w.mode='playing';for(let i=0;i<4;i++){w.player.x=w.enemy.x-60;w.player.y=w.enemy.y;w.cooldown=0;step(w,{...idle,aim:{x:1,y:0},attack:true},1/60);}expect(w.enemy.hp).toBe(0);expect(w.kills).toBe(1);const hp=w.player.hp;for(let i=0;i<120;i++)step(w,idle,1/60);expect(w.player.hp).toBe(hp);w.player.x=285;w.player.y=285;step(w,idle,1/60);expect(w.mode).toBe('won');});
 it('enemy pursues and kills an idle player',()=>{const w=createWorld();w.mode='playing';for(let i=0;i<3000;i++)step(w,idle,1/60);expect(w.mode).toBe('dead');expect(w.player.hp).toBe(0);});
});
describe('portable persistence',()=>{
 it('recovers malformed settings and rejects unknown checkpoint versions',()=>{expect(parseSettings('{bad').volume).toBe(.3);expect(parseSettings('{"volume":99}').volume).toBe(1);expect(parseCheckpoint('{"version":2}')).toBeNull();expect(parseCheckpoint('{"version":1,"enemyDefeated":true,"savedAt":"invalid"}')).toBeNull();});
 it('round trips a checkpoint through the storage port',async()=>{const data=new Map<string,string>();const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)};const p=browserServices(storage);const checkpoint={version:1 as const,enemyDefeated:true,savedAt:new Date().toISOString()};await p.saveCheckpoint(checkpoint);expect(await p.loadCheckpoint()).toEqual(checkpoint);});
 it('reports quota errors instead of claiming a successful save',async()=>{const p=browserServices({setItem:()=>{throw new Error('quota');}} as unknown as Storage);await expect(p.saveSettings({volume:1,deadzone:.2,zoom:1,reducedMotion:false})).rejects.toThrow('quota');});
});
