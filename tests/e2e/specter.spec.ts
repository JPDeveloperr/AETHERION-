import {test,expect} from '@playwright/test';
import {begin,read} from './journey';
test('old checkpoint resumes at the specter; telegraph, projectile and dodge work in the real game',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('aetherion.checkpoint.v1',JSON.stringify({version:1,enemyDefeated:true,savedAt:'2026-11-03T12:00:00Z'})));
 await begin(page,true);
 await expect(page.locator('#counter')).toHaveText('ENCONTROS 1 / 3');
 await expect(page.locator('#objective')).toHaveText('Enfrente o Espectro do Vazio');
 let charging=false,shot=false,dodged=false;
 for(let i=0;i<80;i++){
  await page.clock.runFor(100);const f=await read(page);
  const enemies=JSON.parse(f.enemyState!) as {telegraph:number}[];
  const bolts=JSON.parse(f.projectileState!) as {x:number;y:number}[];
  if(!charging&&enemies.some(e=>e.telegraph>0)){
   charging=true;await page.screenshot({path:`test-results/specter-charge-${test.info().project.name}.png`});
  }
  if(!shot&&bolts.length){shot=true;await page.screenshot({path:`test-results/specter-shot-${test.info().project.name}.png`});}
  if(!dodged&&bolts.some(b=>Math.hypot(b.x-Number(f.playerX),b.y-Number(f.playerY))<65)){
   await page.keyboard.down('Space');await page.clock.runFor(240);await page.keyboard.up('Space');dodged=true;break;
  }
 }
 expect(charging).toBe(true);expect(shot).toBe(true);expect(dodged).toBe(true);
 await expect(page.locator('#hp')).toHaveText('100 / 100');
 expect(errors).toEqual([]);
});
