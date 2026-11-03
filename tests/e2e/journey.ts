import {expect,type Page} from '@playwright/test';
export async function begin(page:Page,resume=false){
 await page.clock.install({time:new Date('2026-11-03T12:00:00Z')});
 await page.goto('/');await expect(page.locator('canvas')).toBeVisible();
 await page.clock.pauseAt(new Date('2026-11-03T12:01:00Z'));
 await page.locator(resume?'#continue':'#start').press('Enter');await page.clock.runFor(64);
}
export const read=(page:Page)=>page.locator('canvas').evaluate(c=>({...c.dataset}));
const keys=['KeyW','KeyA','KeyS','KeyD'];
export async function moveToward(page:Page,dx:number,dy:number,move=true){
 const sx=(dx-dy)*.8660254,sy=(dx+dy)*.5,len=Math.hypot(sx,sy)||1;
 const desired=new Set<string>();
 if(move){if(Math.abs(sx/len)>.36)desired.add(sx>0?'KeyD':'KeyA');if(Math.abs(sy/len)>.36)desired.add(sy>0?'KeyS':'KeyW');}
 await page.evaluate(({keys,desired})=>{for(const code of keys)window.dispatchEvent(new KeyboardEvent(desired.includes(code)?'keydown':'keyup',{code}));},{keys,desired:[...desired]});
}
/** Read-only render telemetry drives real keyboard input; no world state is modified. */
export async function completeJourney(page:Page,onStage?:(stage:number)=>Promise<void>,onTick?:(frame:Record<string,string|undefined>,iteration:number)=>Promise<boolean>){
 let seen=-1,sawProjectile=false;
 for(let i=0;i<650;i++){
  const f=await read(page),stage=Number(f.completedEncounters);
  if(f.mode==='dead')throw new Error(`Pilot died at encounter ${stage+1}`);
  sawProjectile ||= Number(f.projectiles)>0;
  const enemies=JSON.parse(f.enemyState!) as {x:number;y:number;hp:number;kind:string;telegraph:number}[];
  const live=enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-Number(f.playerX),a.y-Number(f.playerY))-Math.hypot(b.x-Number(f.playerX),b.y-Number(f.playerY)));
  if(stage!==seen&&live.length){seen=stage;await onStage?.(stage);}
  if(onTick&&await onTick(f,i))continue;
  const p={x:Number(f.playerX),y:Number(f.playerY)};
  const target=stage===3?{x:285,y:285}:live[0];
  if(!target){await moveToward(page,0,0,false);await page.clock.runFor(100);continue;}
  const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  const turn=Math.abs(Math.atan2(Math.sin(angle-Number(f.renderFacing)),Math.cos(angle-Number(f.renderFacing))));
  await moveToward(page,dx,dy,stage===3||d>75||turn>.5);
  if(stage<3&&d<120&&i%2===0)await page.keyboard.press('KeyJ');
  if(live.some(e=>e.telegraph>0&&e.telegraph<.2&&e.kind==='sentinel'&&Math.hypot(e.x-p.x,e.y-p.y)<110))await page.keyboard.down('Space');
  else await page.keyboard.up('Space');
  await page.clock.runFor(100);
  if((await read(page)).mode==='won'){await moveToward(page,0,0,false);return {sawProjectile};}
 }
 throw new Error(`Journey did not finish: ${JSON.stringify(await read(page))}`);
}
