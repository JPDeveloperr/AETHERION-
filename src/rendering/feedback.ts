import type {Actor} from '../core/world';
/** Presentation-only recoil: endpoints have zero displacement and velocity. */
export function recoilPosition(a:Actor&{recoilFacing?:number}) {
 const t=Math.max(0,Math.min(1,1-a.hurt/.2));
 const amount=a.hurt>0?Math.sin(Math.PI*t)**2*8:0,angle=a.recoilFacing??0;
 return {x:a.x+Math.cos(angle)*amount,y:a.y+Math.sin(angle)*amount};
}
