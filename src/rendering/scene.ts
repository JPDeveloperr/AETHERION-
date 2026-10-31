import { Application, Container, Graphics } from 'pixi.js';
import { project, type Vec } from '../math/iso';
import type { World, Actor } from '../core/world';
export class Scene {
 app=new Application();root=new Container();floor=new Graphics();actors=new Graphics();decor=new Graphics();camera={x:0,y:0};zoom=1;reducedMotion=false;
 async init(host:HTMLElement){await this.app.init({resizeTo:window,background:0x060c18,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true});host.append(this.app.canvas);this.app.stage.addChild(this.root);this.root.addChild(this.floor,this.decor,this.actors);this.buildFloor();}
 private diamond(g:Graphics,x:number,y:number,size:number,color:number,alpha=1){const p=project({x,y});g.poly([p.x,p.y-size*.5,p.x+size*.866,p.y,p.x,p.y+size*.5,p.x-size*.866,p.y]).fill({color,alpha});}
 private buildFloor(){const g=this.floor;
 for(let ring=0;ring<5;ring++){this.diamond(g,0,0,870-ring*16,0x142331,.3+ring*.1);}
 for(let x=-400;x<400;x+=50)for(let y=-400;y<400;y+=50){const p=project({x:x+25,y:y+25});this.diamond(g,x+25,y+25,48,((x+y)/50)%2?0x132632:0x162c39);g.moveTo(p.x-32,p.y).lineTo(p.x,p.y+18).stroke({color:0x47616a,width:1,alpha:.18});}
 const c=project({x:0,y:0});for(const r of [95,106,156,162])g.ellipse(c.x,c.y,r*1.732,r).stroke({color:0xb89b58,width:r===106?2:1,alpha:.55});
 for(let i=0;i<16;i++){const a=i*Math.PI/8;const p=project({x:225*Math.cos(a),y:225*Math.sin(a)});g.poly([p.x-4,p.y,p.x,p.y-6,p.x+4,p.y,p.x,p.y+6]).fill(0xb89b58);}
 for(const x of [-345,345])for(let y=-320;y<350;y+=80){const p=project({x,y});g.moveTo(p.x-9,p.y).lineTo(p.x+9,p.y).stroke({color:0x58dcd5,width:2,alpha:.6});}
 const d=this.decor;
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
 render(w:World,dt:number){this.app.canvas.dataset.playerX=w.player.x.toFixed(2);this.app.canvas.dataset.playerY=w.player.y.toFixed(2);const target=project(w.player);const follow=1-Math.exp(-dt*3);this.camera.x+=(target.x*.35-this.camera.x)*follow;this.camera.y+=(target.y*.35-this.camera.y)*follow;const scale=Math.min(innerWidth/1250,innerHeight/800)*this.zoom;this.root.scale.set(scale);this.root.position.set(innerWidth/2-this.camera.x*scale,innerHeight*.55-this.camera.y*scale);const g=this.actors;g.clear();
 const portal=project({x:285,y:285});for(let i=0;i<4;i++)g.ellipse(portal.x,portal.y-36,25+i*7,44+i*8).stroke({color:w.enemy.hp<=0?0x55f3ef:0x6b6695,width:2,alpha:.2+i*.13});
 if(w.telegraph>0){const p=project(w.enemy);g.ellipse(p.x,p.y,150,86).fill({color:0xf64c62,alpha:.12}).stroke({color:0xff6976,width:2});g.ellipse(p.x,p.y,150*(1-w.telegraph/.8),86*(1-w.telegraph/.8)).stroke({color:0xff6976,width:2});}
 const actors=[{a:w.player,enemy:false},...(w.enemy.hp>0?[{a:w.enemy,enemy:true}]:[])].sort((a,b)=>a.a.x+a.a.y-b.a.x-b.a.y);
 for(const a of actors)this.actor(g,a.a,a.enemy,this.reducedMotion?0:w.time);
 if(w.player.attack>0){const p=project(w.player),d=project({x:Math.cos(w.player.facing),y:Math.sin(w.player.facing)}),angle=Math.atan2(d.y,d.x);g.arc(p.x,p.y-28,58,angle-1.1,angle+1.1).stroke({color:0x9efff9,width:5,alpha:w.player.attack/.24});}
 for(const e of w.effects)if(e.kind==='hit'){const p=project(e);for(let i=0;i<10;i++){const a=i*.628,r=(.4-e.life)*190;g.circle(p.x+Math.cos(a)*r,p.y-30+Math.sin(a)*r*.6,2).fill({color:0xffd797,alpha:e.life/.4});}}
 if(!this.reducedMotion)for(let i=0;i<32;i++){const x=Math.sin(i*71)*550,y=Math.cos(i*43)*260-((w.time*12+i*17)%150);g.circle(x,y,1.2).fill({color:0x63c5dc,alpha:.2+.2*Math.sin(w.time+i)});}
 }
}
