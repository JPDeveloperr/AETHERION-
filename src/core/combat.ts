import type {Enemy,World} from './world';
export const clampArena=(n:number)=>Math.max(-370,Math.min(370,n));
/** Shared damage event: callers own per-activation target IDs. Dead targets never emit hits. */
export function damageEnemy(w:World,e:Enemy,damage:number,knockback:number,facing:number,power=1):boolean {
 if(e.hp<=0)return false;
 e.hp=Math.max(0,e.hp-damage);e.hurt=.2;w.hits++;
 w.effects.push({x:e.x,y:e.y,life:.4,kind:'hit',power});
 e.x=clampArena(e.x+Math.cos(facing)*knockback);e.y=clampArena(e.y+Math.sin(facing)*knockback);
 if(e.hp===0){w.kills++;e.telegraph=0;e.death=.65;}
 return true;
}
