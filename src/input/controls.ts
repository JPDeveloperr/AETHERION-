import { normalized, unproject, type Vec } from '../math/iso';
import type { Command } from '../core/world';
export class Controls {
 private attackQueued=false;
 private padAttackDown=false;
 keys=new Set<string>(); held=false; padPause=false; padConfirm=false; menuDirection=0; deadzone=.18;
 constructor(canvas:HTMLCanvasElement){
 window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyJ'&&!e.repeat)this.attackQueued=true;this.keys.add(e.code);});
 window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());
 canvas.addEventListener('pointerdown',e=>{if(e.button===0){this.held=true;this.attackQueued=true;}});window.addEventListener('pointerup',()=>this.held=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 }
 clear(){this.keys.clear();this.held=false;this.attackQueued=false;}
 consumeAttack(){this.attackQueued=false;}
 sample():Command {
 const pad=navigator.getGamepads?.().find(p=>p?.connected);const axis=(n:number)=>{const v=pad?.axes[n]??0;return Math.abs(v)<this.deadzone?0:Math.sign(v)*(Math.abs(v)-this.deadzone)/(1-this.deadzone);};
 this.menuDirection=pad?.buttons[12]?.pressed?-1:pad?.buttons[13]?.pressed?1:0;
 const padAttack=pad?.buttons[2]?.pressed??false;
 if(padAttack&&!this.padAttackDown)this.attackQueued=true;this.padAttackDown=padAttack;
 this.padPause=pad?.buttons[9]?.pressed??false;this.padConfirm=pad?.buttons[0]?.pressed??false;
 const x=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))+axis(0);
 const y=Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))+axis(1);
 let aim:Vec|null=null;const ax=axis(2),ay=axis(3);if(ax||ay)aim=unproject({x:ax,y:ay});
 return {move:normalized(unproject({x,y})),aim,attackPressed:this.attackQueued,attack:this.attackQueued||this.held||this.keys.has('KeyJ')||(pad?.buttons[2]?.pressed??false),dodge:this.keys.has('Space')||(pad?.buttons[0]?.pressed??false)};
 }
}
