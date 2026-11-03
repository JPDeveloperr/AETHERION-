import { drawSpecter, drawProjectile } from './specter';
import { drawKael, drawImpact, drawSwordTrail } from './kael';
import { capturePlayer, kaelPose, SwordTrail, type PlayerFrame } from './kael-motion';
import { attackSpec, attackPose } from '../core/attack';
import { Application, Container, Graphics } from 'pixi.js';
import { project, type Vec } from '../math/iso';
import type { World, Actor } from '../core/world';
export class Scene {
 private swordTrail=new SwordTrail();
 app=new Application();root=new Container();floor=new Graphics();actors=new Graphics();decor=new Graphics();camera={x:0,y:0};zoom=1;reducedMotion=false;
 async init(host:HTMLElement){await this.app.init({autoStart:false,resizeTo:window,background:0x060c18,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true});host.append(this.app.canvas);this.app.stage.addChild(this.root);this.root.addChild(this.floor,this.decor,this.actors);this.buildFloor();}
 private diamond(g:Graphics,x:number,y:number,size:number,color:number,alpha=1){const p=project({x,y});g.poly([p.x,p.y-size*.5,p.x+size*.866,p.y,p.x,p.y+size*.5,p.x-size*.866,p.y]).fill({color,alpha});}
 private buildFloor(){const g=this.floor;
 for(let ring=0;ring<5;ring++){this.diamond(g,0,0,870-ring*16,0x142331,.3+ring*.1);}
 for(let x=-400;x<400;x+=50)for(let y=-400;y<400;y+=50){const p=project({x:x+25,y:y+25});this.diamond(g,x+25,y+25,48,((x+y)/50)%2?0x132632:0x162c39);g.moveTo(p.x-32,p.y).lineTo(p.x,p.y+18).stroke({color:0x47616a,width:1,alpha:.18});}
 const c=project({x:0,y:0});for(const r of [95,106,156,162])g.ellipse(c.x,c.y,r*1.732,r).stroke({color:0xb89b58,width:r===106?2:1,alpha:.55});
 for(let i=0;i<16;i++){const a=i*Math.PI/8;const p=project({x:225*Math.cos(a),y:225*Math.sin(a)});g.poly([p.x-4,p.y,p.x,p.y-6,p.x+4,p.y,p.x,p.y+6]).fill(0xb89b58);}
 for(const x of [-345,345])for(let y=-320;y<350;y+=80){const p=project({x,y});g.moveTo(p.x-9,p.y).lineTo(p.x+9,p.y).stroke({color:0x58dcd5,width:2,alpha:.6});}
 // Engraved runes and branching energy seams, built once rather than per frame.
 for(let i=0;i<20;i++){
  const a=i*Math.PI/10,p=project({x:285*Math.cos(a),y:285*Math.sin(a)});
  g.ellipse(p.x,p.y,12,6).fill({color:0x52d6d7,alpha:.06});
  g.moveTo(p.x-5,p.y-4).lineTo(p.x,p.y+4).lineTo(p.x+5,p.y-4).moveTo(p.x-4,p.y).lineTo(p.x+4,p.y)
   .stroke({color:0x69ded8,width:1,alpha:.55});
 }
 for(const [x,y] of [[-200,-40],[75,-260],[230,170],[-230,235]]){
  const p=project({x:x!,y:y!});
  const seam=[p.x-48,p.y-20,p.x-21,p.y-10,p.x-12,p.y-13,p.x+6,p.y+1,p.x+32,p.y+10];
  g.poly(seam,false).stroke({color:0x44bfc9,width:7,alpha:.045}).stroke({color:0x62ded5,width:1,alpha:.4});
 }
 const d=this.decor;
 // Crystals occupy the outer border; the playable floor stays unobstructed.
 for(const [x,y,h] of [[-335,280,34],[310,-315,44],[-280,-320,26],[330,170,32]]){
  const p=project({x:x!,y:y!}),height=h!;
  d.ellipse(p.x+12,p.y+6,33,10).fill({color:0x00030b,alpha:.4});
  d.ellipse(p.x,p.y,29,13).fill({color:0x7577dc,alpha:.07});
  d.poly([p.x-9,p.y-3,p.x-5,p.y-height,p.x+2,p.y-height-8,p.x+11,p.y-10,p.x+4,p.y+4]).fill(0x385175).stroke({color:0x8cb8de,width:1});
  d.poly([p.x+2,p.y-height-8,p.x+2,p.y,p.x+11,p.y-10]).fill(0x608ea5);
  d.moveTo(p.x-3,p.y-height+3).lineTo(p.x-1,p.y-8).stroke({color:0x96f3ef,width:1.5,alpha:.8});
 }
 for(const [x,y] of [[-360,-360],[-360,-160],[-160,-360],[360,-360],[-360,360],[360,50]] as [number,number][]){const p=project({x,y});this.diamond(d,x,y,46,0x080f19);d.poly([p.x-23,p.y,p.x-23,p.y-115,p.x,p.y-130,p.x,p.y+12]).fill(0x263e4a);d.poly([p.x,p.y+12,p.x,p.y-130,p.x+23,p.y-115,p.x+23,p.y]).fill(0x132530);d.poly([p.x-23,p.y-115,p.x,p.y-130,p.x+23,p.y-115,p.x,p.y-101]).fill(0x3e5860);d.moveTo(p.x,p.y-20).lineTo(p.x,p.y-92).stroke({color:0x47d9dc,width:3});d.moveTo(p.x-20,p.y-108).lineTo(p.x,p.y-96).lineTo(p.x+20,p.y-108).stroke({color:0xb99b61,width:3});}
 }
 screen(p:Vec){const v=project(p);return{x:this.root.x+v.x*this.root.scale.x,y:this.root.y+v.y*this.root.scale.y};}
 private actor(g:Graphics,a:Actor,enemy:boolean,time:number){const p=project(a),bob=Math.sin(a.phase)*2;const x=p.x,y=p.y+bob;const bright=a.hurt>0?0xffffff:enemy?0xff6e67:0x55f3ef;const metal=enemy?0x552c3b:0x263e51;const gold=0xc7a56a;
 g.ellipse(p.x,p.y+4,22,9).fill({color:0x000000,alpha:.5});
 // Cape, articulated boots, armor, head, shoulder plates, energy core.
 g.poly([x-12,y-47,x+12,y-47,x+22+Math.sin(time*3)*3,y-9,x+1,y-2,x-21,y-10]).fill(enemy?0x421b2d:0x123e55);
 const stride=Math.sin(a.phase)*6;
 for(const side of [-1,1]){const leg=side*stride;g.moveTo(x+side*7,y-24).lineTo(x+side*9,y-12+leg).lineTo(x+side*10,y+leg).stroke({color:0x0c1423,width:9});g.moveTo(x+side*10,y+leg).lineTo(x+side*10+5,y+leg+2).stroke({color:gold,width:3});}
 g.poly([x-14,y-47,x+13,y-47,x+11,y-25,x,y-19,x-12,y-25]).fill(metal).stroke({color:gold,width:1.5});
 g.poly([x-19,y-49,x-8,y-50,x-10,y-39,x-23,y-40]).fill(metal).stroke({color:gold,width:1});g.poly([x+9,y-50,x+21,y-47,x+24,y-38,x+11,y-39]).fill(metal).stroke({color:gold,width:1});
 g.moveTo(x-17,y-38).lineTo(x-20,y-26).stroke({color:metal,width:7});g.moveTo(x+18,y-39).lineTo(x+23,y-25).stroke({color:metal,width:7});
 g.poly([x-8,y-65,x+5,y-68,x+11,y-59,x+7,y-49,x-6,y-49,x-10,y-57]).fill(0x273a49).stroke({color:gold,width:1});g.moveTo(x-5,y-57).lineTo(x+7,y-57).stroke({color:bright,width:2});
 g.circle(x,y-36,9).fill({color:bright,alpha:.09});g.poly([x,y-43,x+5,y-36,x,y-29,x-5,y-36]).fill(bright);
 const dir=project({x:Math.cos(a.facing),y:Math.sin(a.facing)});const angle=Math.atan2(dir.y,dir.x)+(a.attack>0?Math.sin(a.attack*18)*1.4:0);const bx=x+21,by=y-28;g.moveTo(bx,by).lineTo(bx+Math.cos(angle)*42,by+Math.sin(angle)*42).stroke({color:bright,width:enemy?3:4});g.circle(bx,by,3).fill(gold);
 if(enemy){g.roundRect(x-28,y-37,14,23,3).fill(0x4b2b3c).stroke({color:gold,width:2});g.rect(x-24,y-83,48,3).fill(0x281722);g.rect(x-24,y-83,48*a.hp/100,3).fill(0xec6965);}
 }
 render(w:World,dt:number,view:PlayerFrame=capturePlayer(w)){const A=attackSpec(w.comboIndex);this.app.canvas.dataset.playerX=w.player.x.toFixed(2);this.app.canvas.dataset.playerY=w.player.y.toFixed(2);this.app.canvas.dataset.attackPhase=w.player.attack>0?attackPose(A.duration-w.player.attack,w.comboIndex).phase:'idle';this.app.canvas.dataset.swings=String(w.swings);this.app.canvas.dataset.effects=String(w.effects.length);const target=project(view.player);const follow=1-Math.exp(-dt*3);this.camera.x+=(target.x*.35-this.camera.x)*follow;this.camera.y+=(target.y*.35-this.camera.y)*follow;const scale=Math.min(innerWidth/1250,innerHeight/800)*this.zoom;this.root.scale.set(scale);this.root.position.set(innerWidth/2-this.camera.x*scale,innerHeight*.55-this.camera.y*scale);const g=this.actors;g.clear();
 const portal=project({x:285,y:285});for(let i=0;i<4;i++)g.ellipse(portal.x,portal.y-36,25+i*7,44+i*8).stroke({color:w.completedEncounters===3?0x55f3ef:0x6b6695,width:2,alpha:.2+i*.13});
 for(const e of w.enemies)if(e.telegraph>0&&e.kind==='sentinel'){
 const p=project(e);g.ellipse(p.x,p.y,150,86).fill({color:0xf64c62,alpha:.12}).stroke({color:0xff6976,width:2});g.ellipse(p.x,p.y,150*(1-e.telegraph/.8),86*(1-e.telegraph/.8)).stroke({color:0xff6976,width:2});}
 const actors=[{a:view.player,e:null},...w.enemies.filter(e=>e.hp>0||e.death>0).map(e=>({a:e,e}))].sort((a,b)=>a.a.x+a.a.y-b.a.x-b.a.y);
 for(const a of actors){
  if(a.e?.kind==='specter')drawSpecter(g,a.e,w.time,this.reducedMotion);
  else if(a.e){if(a.e.hp>0)this.actor(g,a.a,true,this.reducedMotion?0:w.time);}
  else drawKael(g,a.a,view,this.reducedMotion);
 }
 for(const b of w.projectiles)drawProjectile(g,b);
 this.swordTrail.update(view);drawSwordTrail(g,this.swordTrail,this.reducedMotion);
 const rig=kaelPose(view);
 Object.assign(this.app.canvas.dataset,{bladeX:String(rig.tip.x),bladeY:String(rig.tip.y),bladeLocalX:String(rig.blade.tip.x),bladeLocalY:String(rig.blade.tip.y),renderX:String(view.player.x),renderY:String(view.player.y),renderPhase:rig.pose.phase,renderTime:String(view.time),renderFacing:String(rig.facing),renderAttack:String(view.player.attack),attackId:String(view.attackId),trailCount:String(this.swordTrail.samples.length),comboIndex:String(view.comboIndex??0),completedEncounters:String(w.completedEncounters),enemies:String(w.enemies.filter(e=>e.hp>0).length),projectiles:String(w.projectiles.length),enemyState:JSON.stringify(w.enemies.map(e=>({id:e.id,kind:e.kind,x:e.x,y:e.y,hp:e.hp,telegraph:e.telegraph,aim:e.aim,death:e.death}))),projectileState:JSON.stringify(w.projectiles),hp:String(w.player.hp),mode:w.mode});
 for(const e of w.effects)if(e.kind==='hit')drawImpact(g,e,e.life,e.power);
 if(!this.reducedMotion)for(let i=0;i<32;i++){const x=Math.sin(i*71)*550,y=Math.cos(i*43)*260-((w.time*12+i*17)%150);g.circle(x,y,1.2).fill({color:0x63c5dc,alpha:.2+.2*Math.sin(w.time+i)});}
 this.app.render();
 }
}
