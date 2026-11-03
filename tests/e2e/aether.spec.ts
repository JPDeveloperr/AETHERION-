import {test,expect,type Page} from '@playwright/test';
import {begin,completeJourney,moveToward,read} from './journey';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/screenshots/aether-v03',capture=process.env.AETHER_CAPTURE==='1';
async function sequence(page:Page,name:string,count=64){
 const frames:{file:string;ms:number;state:Record<string,string|undefined>}[]=[];
 const initial=await read(page),vp=page.viewportSize()!;
 const clip={x:Math.max(0,Math.min(vp.width-600,Number(initial.screenPlayerX)-230)),y:Math.max(0,Math.min(vp.height-360,Number(initial.screenPlayerY)-180)),width:600,height:360};
 if(capture)await mkdir(out,{recursive:true});
 for(let i=0;i<count;i++){
  if(i)await page.clock.runFor(16);
  const state=await read(page),file=`${name}-${String(i).padStart(2,'0')}.png`;
  if(capture)await page.screenshot({path:`${out}/${file}`,clip});
  frames.push({file,ms:i*16,state});
 }
 if(capture)await writeFile(`${out}/${name}.json`,JSON.stringify(frames,null,2));
 return frames;
}
test('earned Aether powers Nova and Blade while moving, then completes all three encounters',async({page})=>{
 test.setTimeout(capture?360000:240000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await begin(page);
 await expect(page.locator('#energy')).toHaveText('0 / 100');
 await page.keyboard.press('KeyK');await page.clock.runFor(32);await expect(page.locator('#power-feedback')).toHaveText('AETHER INSUFICIENTE');
 const used={nova:false,blade:false};let preparing:string|null=null;
 await completeJourney(page,async stage=>{
  if(capture)await page.screenshot({path:`${out}/encounter-${stage+1}.png`});
 },async f=>{
  const kind=!used.nova&&Number(f.energy)>=70?'nova':used.nova&&!used.blade&&Number(f.energy)>=35?'blade':null;
  if(!kind)return false;
  const live=(JSON.parse(f.enemyState!) as {x:number;y:number;hp:number}[]).filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-Number(f.playerX),a.y-Number(f.playerY))-Math.hypot(b.x-Number(f.playerX),b.y-Number(f.playerY)));
  const target=live[0];if(!target)return false;
  const dx=target.x-Number(f.playerX),dy=target.y-Number(f.playerY),dist=Math.hypot(dx,dy);
  if(preparing!==kind){preparing=kind;await page.keyboard.up('Space');}
  await moveToward(page,dx,dy,dist>70);
  if(Number(f.renderAttack)>0||Number(f.basicCooldown)>0||Number(f.dodgeActive)>0||f.ability!=='idle'||dist>90){await page.clock.runFor(100);return true;}
  const energy=Number(f.energy),attackId=f.attackId;
  await page.keyboard.press(kind==='nova'?'KeyL':'KeyK');await page.clock.runFor(64); // Include the intentionally delayed presentation frame.
  await expect(page.locator('canvas')).toHaveAttribute('data-ability',kind);
  await expect(page.locator(`#${kind}-status`)).toHaveAttribute('data-state','cooldown');
  await expect(page.locator('#energy')).toHaveText(`${energy-(kind==='nova'?70:35)} / 100`);
  await moveToward(page,dx,dy,true);
  const before=await read(page);await page.mouse.move(0,0);
  const frames=await sequence(page,kind);
  const active=frames.filter(frame=>frame.state.ability===kind);
  expect(active.length).toBeGreaterThan(8);
  expect(active.every(frame=>frame.state.renderFacing===before.renderFacing)).toBe(true);
  expect(frames.every(frame=>frame.state.attackId===attackId)).toBe(true);
  expect(frames.some(frame=>(JSON.parse(frame.state.burstState!) as {hitTargets:number[]}[]).some(b=>b.hitTargets.length>0))).toBe(true);
  expect(Math.hypot(Number(frames.at(-1)!.state.playerX)-Number(before.playerX),Number(frames.at(-1)!.state.playerY)-Number(before.playerY))).toBeGreaterThan(80);
  used[kind]=true;preparing=null;return true;
 });
 expect(used).toEqual({nova:true,blade:true});await expect(page.locator('#counter')).toHaveText('ENCONTROS 3 / 3');
 await expect(page.locator('canvas')).toHaveAttribute('data-bursts','0');
 const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('aetherion.checkpoint.v2')!));expect(Object.keys(save).sort()).toEqual(['completedEncounters','savedAt','version']);
 await page.reload();await page.locator('#continue').press('Enter');await page.clock.runFor(64);await expect(page.locator('#energy')).toHaveText('0 / 100');expect(errors).toEqual([]);
});
test('a real projectile yields one perfect dodge, with no reward for an empty dodge',async({page})=>{
 test.setTimeout(120000);if(capture)await mkdir(out,{recursive:true});
 await page.addInitScript(()=>localStorage.setItem('aetherion.checkpoint.v1',JSON.stringify({version:1,enemyDefeated:true,savedAt:'2026-11-03T12:00:00Z'})));
 await begin(page,true);await page.keyboard.press('Space');await page.clock.runFor(320);await expect(page.locator('#energy')).toHaveText('0 / 100');
 let evaded=false;
 for(let i=0;i<220;i++){
  await page.clock.runFor(32);const f=await read(page);
  const bolts=JSON.parse(f.projectileState!) as {x:number;y:number}[];
  if(Number(f.dodgeActive)===0&&bolts.some(b=>Math.hypot(b.x-Number(f.playerX),b.y-Number(f.playerY))<43)){
   await page.keyboard.press('Space');await page.clock.runFor(112);
   await expect(page.locator('#energy')).toHaveText('20 / 100');await expect(page.locator('#power-feedback')).toHaveText('ESQUIVA PERFEITA');
   await expect(page.locator('#hp')).toHaveText('100 / 100');await expect(page.locator('canvas')).toHaveAttribute('data-perfect-dodges','1');
   await sequence(page,'perfect-dodge',42);evaded=true;break;
  }
 }
 expect(evaded).toBe(true);await expect(page.locator('#energy')).toHaveText('20 / 100');
});
test('standard Xbox/PlayStation shoulder buttons are edge-triggered; HUD fits a small screen',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  const pad={connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0,touched:false}))};
  Object.assign(window,{testPad:pad});Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});
 });
 await begin(page);
 for(const [index,kind] of [[5,'blade'],[4,'nova']] as const){
  await page.evaluate(i=>{(window as unknown as {testPad:{buttons:{pressed:boolean}[]}}).testPad.buttons[i]!.pressed=true;},index);await page.clock.runFor(32);
  await expect(page.locator(`#${kind}-status`)).toHaveAttribute('data-state','starved');await expect(page.locator('#power-feedback')).toHaveText('AETHER INSUFICIENTE');
  await page.clock.runFor(1000);await expect(page.locator('#power-feedback')).toHaveText('');
  await page.evaluate(i=>{(window as unknown as {testPad:{buttons:{pressed:boolean}[]}}).testPad.buttons[i]!.pressed=false;},index);await page.clock.runFor(32);
 }
 await expect(page.locator('canvas')).toHaveAttribute('data-cast-id','0');
 const bar=await page.locator('.aether-track').boundingBox(),quest=await page.locator('.quest').boundingBox();expect(bar!.x).toBeGreaterThanOrEqual(0);expect(bar!.x+bar!.width).toBeLessThanOrEqual(390);expect(bar!.y+bar!.height).toBeLessThan(quest!.y);
 if(capture)await page.screenshot({path:`${out}/hud-small.png`});
});
