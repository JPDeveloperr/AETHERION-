import { Graphics } from 'pixi.js';
import { BASIC_ATTACK, attackPose, smooth } from '../core/attack';
import type { Actor, World } from '../core/world';
import { project, type Vec } from '../math/iso';

const C = { black:0x080e17, dark:0x121d29, plate:0x253343, light:0x435266, edge:0x6a7988,
  gold:0xbd9250, shine:0xf5d795, goldShade:0x654b2d, cyan:0x58e9e8, ice:0xddffff, cape:0x153a49 };
type Point = readonly [number, number];
const mix = (a:number,b:number,t:number) => a+(b-a)*t;

/** Local vector ink: every ornament and bevel remains source geometry. */
class Ink {
  constructor(readonly g:Graphics,readonly x:number,readonly y:number,readonly rotation=0) {}
  point([x,y]:Point):Point {const c=Math.cos(this.rotation),s=Math.sin(this.rotation);return [this.x+x*c-y*s,this.y+x*s+y*c];}
  poly(points:Point[],color:number,edge?:number,width=.7,alpha=1){this.g.poly(points.flatMap(p=>[...this.point(p)])).fill({color,alpha});if(edge!==undefined)this.g.stroke({color:edge,width,alpha});}
  line(points:Point[],color:number,width=1,alpha=1){const [first,...rest]=points;if(!first)return;this.g.moveTo(...this.point(first));for(const p of rest)this.g.lineTo(...this.point(p));this.g.stroke({color,width,alpha,cap:'round',join:'round'});}
  circle(x:number,y:number,r:number,color:number,alpha=1){this.g.circle(...this.point([x,y]),r).fill({color,alpha});}
}

export function bladePoints(facing:number,elapsed:number|null) {
  const pose=elapsed===null?{angle:-.25,extension:1}:attackPose(elapsed);
  const angle=facing+pose.angle;
  // A 3D horizontal cut projected by the same isometric transform as the world.
  const at=(radius:number,z:number)=>project({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius},z);
  return {grip:at(32*pose.extension,48),guard:at(42*pose.extension,48),tip:at(113*pose.extension,48),angle};
}

function arm(ink:Ink,shoulder:Point,hand:Point,bend:number,front:boolean){
  const dx=hand[0]-shoulder[0],dy=hand[1]-shoulder[1],d=Math.hypot(dx,dy)||1;
  const curve=Math.sqrt(Math.max(0,19*19-Math.min(d/2,19)**2));
  const elbow:Point=[(shoulder[0]+hand[0])/2-dy/d*curve*bend,(shoulder[1]+hand[1])/2+dx/d*curve*bend];
  ink.line([shoulder,elbow,hand],C.black,11);
  ink.line([shoulder,elbow],front?C.plate:C.dark,8);
  ink.circle(...elbow,4.8,C.goldShade);ink.circle(...elbow,2.5,C.black);
  const angle=Math.atan2(hand[1]-elbow[1],hand[0]-elbow[0]);
  const gauntlet=new Ink(ink.g,...ink.point(elbow),angle+ink.rotation);
  const length=Math.hypot(hand[0]-elbow[0],hand[1]-elbow[1]);
  gauntlet.poly([[1,-5],[length-3,-4],[length+1,0],[length-3,5],[2,6]],C.plate,C.black,1);
  gauntlet.poly([[2,-5],[length-4,-4],[length-5,-1],[3,0]],C.light);
  gauntlet.line([[3,-5],[length-4,-4]],C.gold,1.1);
  gauntlet.line([[5,2],[length-6,2]],C.cyan,.8,.7);
  ink.circle(...hand,4,C.dark);
  for(let i=0;i<3;i++)ink.line([[hand[0]-2+i*1.7,hand[1]-2],[hand[0]-2+i*1.7,hand[1]+1]],C.edge,.7);
}

function leg(ink:Ink,side:number,stride:number,stance:number){
  const hip:Point=[side*7,-36],knee:Point=[side*(9+stance),-19+stride*.45],foot:Point=[side*(11+stance)+stride*.24,-1+stride];
  ink.line([hip,knee,foot],C.black,12);
  ink.poly([[hip[0]-5,hip[1]],[hip[0]+5,hip[1]],[knee[0]+4,knee[1]],[knee[0]-4,knee[1]]],C.plate,C.black);
  ink.line([[hip[0]-3,hip[1]+3],[knee[0]-3,knee[1]-2]],C.light,1.8);
  ink.poly([[knee[0],knee[1]-5],[knee[0]+6,knee[1]],[knee[0],knee[1]+5],[knee[0]-5,knee[1]]],C.light,C.gold,.7);
  ink.poly([[knee[0]-4,knee[1]+3],[knee[0]+4,knee[1]+3],[foot[0]+4,foot[1]-2],[foot[0]-5,foot[1]-2]],C.dark,C.black);
  ink.poly([[knee[0]-3,knee[1]+4],[knee[0],knee[1]+5],[foot[0],foot[1]-3],[foot[0]-4,foot[1]-2]],C.plate);
  ink.line([[knee[0]+2,knee[1]+5],[foot[0]+2,foot[1]-4]],C.gold,.9);
  ink.poly([[foot[0]-5,foot[1]-4],[foot[0]+4,foot[1]-4],[foot[0]+9,foot[1]+2],[foot[0]+4,foot[1]+4],[foot[0]-6,foot[1]+2]],C.plate,C.black,1);
  ink.line([[foot[0]-5,foot[1]+1],[foot[0]+4,foot[1]+3],[foot[0]+8,foot[1]+1]],C.gold,1);
}

function sword(ink:Ink,grip:Vec,guard:Vec,tip:Vec,active:boolean){
  const d=Math.hypot(tip.x-grip.x,tip.y-grip.y),angle=Math.atan2(tip.y-grip.y,tip.x-grip.x);
  const blade=new Ink(ink.g,...ink.point([grip.x,grip.y]),angle);
  const h=Math.hypot(guard.x-grip.x,guard.y-grip.y);
  // Narrow bloom in layers instead of a filter over the whole scene.
  blade.line([[h+2,0],[d-3,0]],C.cyan,active?12:8,active?.12:.06);
  blade.poly([[h,-3],[h+11,-4],[d-9,-2],[d,0],[d-9,2],[h+11,4],[h,3]],0x12434e,C.cyan,.8);
  blade.poly([[h+9,-2],[d,0],[h+12,1.2],[h+4,0]],C.ice);
  blade.poly([[h+9,2.5],[d-10,1],[h+11,4]],C.cyan);
  blade.line([[h+16,-2.5],[d-14,-.7]],C.shine,.7,.8);
  blade.poly([[h-3,-3],[h-7,-10],[h-3,-9],[h+3,-4],[h+3,4],[h-3,9],[h-7,10],[h-3,3]],C.gold,C.goldShade,.8);
  blade.line([[-8,0],[h-3,0]],C.black,5);
  for(let x=-6;x<h-4;x+=3)blade.line([[x,-2],[x+1,2]],C.gold,1);
  blade.poly([[-11,0],[-8,-3],[-5,0],[-8,3]],C.gold);
  blade.circle(h,0,2.3,C.ice);
}

/** Bounded trail sampled from the actual blade tip; no independent semicircle. */
function trail(ink:Ink,facing:number,elapsed:number,reducedMotion:boolean){
  const a=BASIC_ATTACK;
  if(elapsed<a.windup||elapsed>a.activeEnd+.09)return;
  const end=Math.min(elapsed,a.activeEnd),start=Math.max(a.windup,end-.065);
  const fade=elapsed<=a.activeEnd?1:1-smooth((elapsed-a.activeEnd)/.09);
  const outer:Point[]=[],inner:Point[]=[];
  for(let i=0;i<=18;i++){
    const t=mix(start,end,i/18),b=bladePoints(facing,t);
    outer.push([b.tip.x,b.tip.y]);inner.push([mix(b.grip.x,b.tip.x,.63),mix(b.grip.y,b.tip.y,.63)]);
  }
  ink.poly([...outer,...inner.reverse()],C.cyan,undefined,0,.14*fade);
  ink.line(outer,C.cyan,5,.16*fade);ink.line(outer,C.ice,1.5,.8*fade);
  const gold=outer.map(([x,y])=>[x*.91,y*.91-4] as Point);ink.line(gold,C.gold,1,.7*fade);
  if(!reducedMotion)for(let i=0;i<9;i++){
    const t=mix(start,end,i/9),b=bladePoints(facing,t),age=elapsed-t;
    const x=b.tip.x+Math.cos(i*2.4)*age*65,y=b.tip.y+Math.sin(i*2.4)*age*45;
    const alpha=Math.max(0,1-age/.14)*fade;
    ink.line([[x,y],[x-2-Math.cos(i)*3,y+2]],i%3?C.cyan:C.shine,1.2,alpha);
  }
}

export function drawKael(g:Graphics,a:Actor,w:World,reducedMotion:boolean){
  const p=project(a),attacking=a.attack>0,elapsed=attacking?BASIC_ATTACK.duration-a.attack:null;
  const pose=elapsed===null?{twist:0,phase:'idle'}:attackPose(elapsed);
  const facing=attacking?w.attackFacing:a.facing;
  const direction=project({x:Math.cos(facing),y:Math.sin(facing)});
  const look=Math.max(-1,Math.min(1,direction.x));
  const gait= Math.sin(a.phase),breath=Math.sin(w.time*2.5)*.65;
  const bob=attacking?Math.sin((elapsed??0)/BASIC_ATTACK.duration*Math.PI)*-1.7:breath;
  const origin=new Ink(g,p.x,p.y);
  g.ellipse(p.x,p.y+3,23,8).fill({color:0x000000,alpha:.45});
  const ink=new Ink(g,p.x,p.y+bob);
  const twist=pose.twist,lean=twist*14,lead=direction.x<0?-1:1;
  // Cape attaches at both collar bones, with three independently delayed folds.
  const wind=reducedMotion?0:Math.sin(w.time*3.2)*3+gait*1.5;
  const hem=wind-twist*15-look*8*(a.moving??0);
  g.moveTo(...ink.point([-14+lean,-65])).bezierCurveTo(...ink.point([-24,-44]),...ink.point([-22+hem,-12]),...ink.point([-27+hem,0]))
    .quadraticCurveTo(...ink.point([-8+hem,5]),...ink.point([1+hem,-3]))
    .quadraticCurveTo(...ink.point([13+hem,4]),...ink.point([22+hem,-5]))
    .bezierCurveTo(...ink.point([15,-31]),...ink.point([19,-52]),...ink.point([12+lean,-65])).closePath().fill(C.black).stroke({color:C.goldShade,width:1});
  ink.poly([[-13+lean,-62],[-17+hem,-20],[-25+hem,-1],[-8+hem,-4],[1,-46]],C.cape);
  ink.poly([[2+lean,-63],[-3+hem,-14],[1+hem,-4],[12+hem,-1],[9,-44]],0x0c2432);
  ink.line([[-13+lean,-62],[-17+hem,-20],[-24+hem,-2]],C.gold,1,.75);
  ink.line([[-21+hem,-1],[-8+hem,1],[1+hem,-5],[13+hem,1],[21+hem,-5]],C.gold,.8,.65);
  g.moveTo(...ink.point([-10+lean,-58])).bezierCurveTo(...ink.point([-15,-39]),...ink.point([-9+hem,-18]),...ink.point([-15+hem,-5])).stroke({color:0x366373,width:1,alpha:.5});
  g.moveTo(...ink.point([8+lean,-57])).bezierCurveTo(...ink.point([15,-36]),...ink.point([7+hem,-19]),...ink.point([14+hem,-6])).stroke({color:0x305365,width:1,alpha:.5});
  // Small heraldic chevrons stitched into the cape, kept away from the core.
  ink.line([[-16+hem,-22],[-11+hem,-17],[-6+hem,-23]],0x527d84,.8,.5);
  const stride=attacking?0:gait*5*(a.moving??0);
  leg(ink,-1,-stride,attacking?2:0);leg(ink,1,stride,attacking?2:0);
  const body=new Ink(g,p.x+lean,p.y+bob,twist*.35);
  const blade=bladePoints(facing,elapsed);
  const hx=blade.grip.x-lean,hy=blade.grip.y,r=twist*.35;
  const hand:Point=[hx*Math.cos(r)+hy*Math.sin(r),-hx*Math.sin(r)+hy*Math.cos(r)];
  const weaponBehind=blade.tip.y<-51;
  if(weaponBehind){sword(ink,blade.grip,blade.guard,blade.tip,pose.phase==='active');arm(body,[16*lead,-59],hand,lead,false);}
  // Under-suit connects neck, chest, abdomen and pelvis before plates are layered.
  body.poly([[-9,-68],[9,-68],[17,-59],[11,-39],[9,-31],[-10,-31],[-13,-44],[-17,-59]],C.black);
  body.poly([[-14,-61],[-2,-65],[12,-62],[15,-53],[9,-44],[0,-40],[-12,-47]],C.plate,C.black,1.2);
  body.poly([[-14,-61],[-2,-64],[-1,-55],[-10,-50]],C.light);
  body.poly([[0,-63],[12,-61],[14,-54],[3,-49]],0x344357);
  body.line([[-13,-60],[-3,-63],[0,-59],[5,-62],[12,-59]],C.shine,.9);
  body.line([[-12,-56],[-6,-53],[-3,-48]],C.gold,1.1);
  body.line([[12,-56],[7,-52],[4,-48]],C.gold,1.1);
  // Lapped abdominal lames, with offset highlights and a forged waist clasp.
  for(let i=0;i<3;i++){const y=-45+i*4;body.poly([[-10,y],[0,y+2],[10,y],[8,y+5],[0,y+7],[-9,y+4]],i%2?C.dark:C.plate,C.black,.8);body.line([[-8,y+1],[0,y+3],[8,y+1]],C.edge,.7,.7);}
  body.line([[-11,-33],[0,-31],[11,-33]],C.gold,2);
  body.poly([[-3,-34],[3,-34],[4,-30],[0,-28],[-4,-30]],C.shine);
  body.poly([[-11,-34],[-3,-31],[-7,-21],[-16,-24]],C.dark,C.edge,.6);
  body.poly([[4,-32],[11,-34],[16,-25],[8,-21]],C.plate,C.edge,.6);
  // Nested inlays read as an energy reactor, not a floating dot.
  body.circle(0,-54,10,C.cyan,.06);body.circle(0,-54,7.5,C.cyan,.1);
  body.poly([[0,-62],[6,-55],[4,-49],[0,-46],[-5,-51],[-6,-56]],C.goldShade,C.gold,1);
  body.poly([[0,-60],[4,-55],[2,-50],[0,-48],[-3,-52],[-4,-56]],0x147c8e);
  body.poly([[0,-59],[2,-54],[0,-49],[-2,-54]],C.ice);
  body.line([[-7,-55],[-10,-58]],C.cyan,1);body.line([[7,-55],[10,-58]],C.cyan,1);
  // Off arm counterbalances the swing; elbow and gauntlet remain connected.
  arm(body,[-17*lead,-59],[(-21-twist*10)*lead,-36-Math.abs(twist)*13],lead,true);
  for(const side of [-1,1]){
    const x=side*16;
    body.poly([[x-side*6,-65],[x+side*3,-67],[x+side*12,-58],[x+side*9,-52],[x-side*5,-56]],C.plate,C.black,1.2);
    body.poly([[x-side*5,-65],[x+side*3,-66],[x+side*10,-58],[x+side*2,-60]],C.light);
    body.line([[x-side*5,-64],[x+side*3,-65],[x+side*10,-57],[x+side*8,-54]],C.gold,1.2);
    body.line([[x+side*1,-61],[x+side*5,-58],[x+side*2,-55]],C.shine,.7);
    body.circle(x-side*3,-60,1.2,C.gold);
  }
  // Gorget overlaps the breastplate and neck, anchoring the helmet.
  body.poly([[-9,-67],[-5,-71],[6,-71],[10,-66],[5,-62],[-4,-63]],C.dark,C.goldShade,.8);
  const head=new Ink(g,p.x+lean+look*2,p.y+bob-69,twist*.25);
  head.poly([[-8,-12],[-3,-18],[4,-17],[9,-10],[8,0],[3,5],[-4,4],[-9,-2]],C.plate,C.black,1);
  head.poly([[-8,-12],[-3,-17],[-1,-7],[-7,-4]],C.light);
  head.poly([[-1,-17],[4,-16],[8,-10],[1,-7]],C.edge);
  head.poly([[-7,-6],[0,-8],[8,-5],[5,0],[0,2],[-6,-1]],C.black);
  head.line([[-7,-5],[-2,-3]],C.cyan,1.5);head.line([[2,-3],[7,-5]],C.ice,1.5);
  head.poly([[0,-9],[2,-2],[1,3],[-1,3],[-2,-2]],C.gold);
  head.line([[-8,-10],[-5,-12],[-3,-16]],C.gold,1);
  head.line([[5,-15],[7,-10],[9,-8]],C.gold,.8);
  head.line([[-7,0],[-4,3],[-2,3]],C.edge,1);head.line([[3,3],[6,1]],C.edge,1);
  // Swept crown gives Kael an identifiable silhouette without a giant helmet.
  head.poly([[-5,-14],[-8,-23],[-1,-18],[1,-13]],C.dark,C.gold,.8);
  if(!weaponBehind){arm(body,[17*lead,-59],hand,lead,true);sword(ink,blade.grip,blade.guard,blade.tip,pose.phase==='active');}
  if(elapsed!==null)trail(ink,facing,elapsed,reducedMotion);
  if(a.hurt>0)origin.circle(0,-53,12,C.ice,a.hurt*.35);
}

export function drawImpact(g:Graphics,position:Vec,life:number){
  const p=project(position),ink=new Ink(g,p.x,p.y-46),age=.4-life,fade=Math.max(0,life/.4);
  // White core lasts < 70 ms; twelve shards and one thin ring expire in 400 ms.
  if(age<.07){const t=1-age/.07;ink.circle(0,0,12*t,C.ice,t*.75);ink.poly([[0,-24*t],[4*t,-4*t],[18*t,0],[3*t,4*t],[0,20*t],[-3*t,3*t],[-18*t,0],[-4*t,-4*t]],C.ice,undefined,0,t);}
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6+.23,r=7+age*(65+i%3*24),x=Math.cos(a)*r,y=Math.sin(a)*r*.65;
    const len=(4+i%3*2)*fade;
    ink.poly([[x,y-len],[x+len*.45,y],[x,y+len*.5],[x-len*.45,y]],i%3?C.cyan:C.shine,undefined,0,fade);
  }
  g.ellipse(p.x,p.y-46,8+age*65,5+age*38).stroke({color:C.shine,width:1,alpha:fade*.4});
}
