/** One timeline shared by collision, interpolation and the procedural rig. */
export const BASIC_ATTACK = {
  duration: .36, cooldown: .38, windup: .075, activeEnd: .195,
  halfArc: Math.acos(.1), reach: 125, damage: 25, knockback: 15,
  direction: 1, name: 'Corte Crescente',
} as const;
export const COMBO_ATTACKS = [BASIC_ATTACK,
  {...BASIC_ATTACK, direction: -1, name: 'Corte Reverso'},
  {...BASIC_ATTACK, duration: .5, cooldown: .54, windup: .13, activeEnd: .3,
    halfArc: 1.65, damage: 42, knockback: 32, name: 'Corte Finalizador'},
] as const;
export const attackSpec = (index=0) => COMBO_ATTACKS[index] ?? BASIC_ATTACK;
export const COMBO_GRACE = .48;
export const INPUT_BUFFER = .32;
export const smooth = (t:number) => {const x=Math.max(0,Math.min(1,t));return x*x*x*(x*(x*6-15)+10);};
export function attackPose(elapsed:number,index=0) {return timelinePose(elapsed,attackSpec(index));}
export function timelinePose(elapsed:number,a:{duration:number;windup:number;activeEnd:number;halfArc:number;direction:number}) {
  const s=a.direction;
  if(elapsed<a.windup){
    const t=smooth(elapsed/a.windup);
    return {angle:-.25+(-s*a.halfArc+.25)*t,twist:-s*t*.32,extension:1-t*.15,weight:t,phase:'windup' as const};
  }
  if(elapsed<a.activeEnd){
    const t=smooth((elapsed-a.windup)/(a.activeEnd-a.windup));
    return {angle:s*(-a.halfArc+2*a.halfArc*t),twist:s*(-.32+t*.7),extension:.85+Math.sin(t*Math.PI)**2*.15,weight:1,phase:'active' as const};
  }
  const t=smooth((elapsed-a.activeEnd)/(a.duration-a.activeEnd));
  return {angle:s*a.halfArc+(-.25-s*a.halfArc)*t,twist:s*.38*(1-t),extension:.85+.15*t,weight:1-t,phase:'recovery' as const};
}
/** Swept sector is valid for both directions; no missed hits between fixed steps. */
export function crossesTarget(previousElapsed:number,elapsed:number,relativeAngle:number,index=0) {
  const a=attackSpec(index);
  if(elapsed<a.windup||previousElapsed>a.activeEnd)return false;
  const from=attackPose(Math.max(a.windup,previousElapsed),index).angle;
  const to=attackPose(Math.min(a.activeEnd,elapsed),index).angle;
  const angle=Math.atan2(Math.sin(relativeAngle),Math.cos(relativeAngle));
  return Math.abs(angle)<=a.halfArc&&angle>=Math.min(from,to)-.08&&angle<=Math.max(from,to)+.08;
}
