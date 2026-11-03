import {afterEach,describe,it,expect,vi} from 'vitest';
import {Controls} from '../../src/input/controls';
function rig(){
 const win=new EventTarget(),canvas=new EventTarget();let buttons=Array.from({length:16},()=>({pressed:false,value:0,touched:false}));
 const pad={connected:true,mapping:'standard',axes:[0,0,0,0],buttons};
 vi.stubGlobal('window',win);vi.stubGlobal('HTMLInputElement',class {});vi.stubGlobal('navigator',{getGamepads:()=>[pad]});
 const controls=new Controls(canvas as HTMLCanvasElement);
 const key=(type:string,code:string,repeat=false)=>{const e=new Event(type);Object.assign(e,{code,repeat});win.dispatchEvent(e);};
 return {controls,key,pad,win,canvas};
}
afterEach(()=>vi.unstubAllGlobals());
describe('keyboard and standard Gamepad API edges',()=>{
 it.each([['KeyK','bladePressed'],['KeyL','novaPressed'],['Space','dodge']] as const)('retains a quick %s tap until simulation consumes it', (key,field)=>{
  const r=rig();r.key('keydown',key);r.key('keyup',key);expect(r.controls.sample()[field]).toBe(true);r.controls.consumeAttack();expect(r.controls.sample()[field]).toBe(false);
 });
 it.each([['Xbox RB / PlayStation R1',5,'bladePressed'],['Xbox LB / PlayStation L1',4,'novaPressed']] as const)('maps %s to the standard button %i, once per press',(_,button,field)=>{
  const r=rig();r.pad.buttons[button]!.pressed=true;expect(r.controls.sample()[field]).toBe(true);r.controls.consumeAttack();expect(r.controls.sample()[field]).toBe(false);
  r.pad.buttons[button]!.pressed=false;r.controls.sample();r.pad.buttons[button]!.pressed=true;expect(r.controls.sample()[field]).toBe(true);
 });
 it('preserves attack, dodge, menu navigation and pause mappings',()=>{
  const r=rig();for(const i of [0,2,9,12])r.pad.buttons[i]!.pressed=true;const c=r.controls.sample();expect(c.attackPressed).toBe(true);expect(c.dodge).toBe(true);expect(r.controls.padConfirm).toBe(true);expect(r.controls.padPause).toBe(true);expect(r.controls.menuDirection).toBe(-1);
 });
 it('ignores OS repeat and clears queued powers on blur',()=>{
  const r=rig();r.key('keydown','KeyK');r.controls.consumeAttack();r.key('keydown','KeyK',true);expect(r.controls.sample().bladePressed).toBe(false);r.key('keydown','KeyL');r.win.dispatchEvent(new Event('blur'));expect(r.controls.sample().novaPressed).toBe(false);
 });
 it('does not derive aim from the cursor',()=>{const r=rig();r.win.dispatchEvent(new Event('pointermove'));expect(r.controls.sample().aim).toBeNull();});
});
