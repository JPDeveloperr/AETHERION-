export interface Vec { x: number; y: number }
export const project = ({x,y}: Vec, z = 0): Vec => ({x:(x-y)*0.8660254,y:(x+y)*0.5-z});
export const unproject = ({x,y}: Vec): Vec => ({x:y+x/1.7320508,y:y-x/1.7320508});
export function normalized(v: Vec): Vec { const n=Math.hypot(v.x,v.y); return n>1?{x:v.x/n,y:v.y/n}:v; }
export const distance = (a:Vec,b:Vec) => Math.hypot(a.x-b.x,a.y-b.y);
