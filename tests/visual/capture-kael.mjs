// Visual evidence from the actual game, using only keyboard input and controlled time.
// Run with Vite already listening on port 5173.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const out='docs/screenshots/kael-polish';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-31T19:00:00Z')});
 await page.goto('http://127.0.0.1:5173');await page.locator('canvas').waitFor();
 await page.clock.pauseAt(new Date('2026-10-31T19:01:00Z'));
 await page.locator('#start').press('Enter');await page.clock.runFor(32);
 await page.screenshot({path:`${out}/idle.png`});
 await page.screenshot({path:`${out}/idle-detail.png`,clip:{x:475,y:350,width:330,height:230}});
 await page.keyboard.down('KeyD');await page.clock.runFor(170);
 await page.screenshot({path:`${out}/run.png`});
 await page.keyboard.up('KeyD');await page.keyboard.press('KeyJ');await page.clock.runFor(150);
 const state=await page.locator('canvas').evaluate(c=>({...c.dataset}));
 if(state.attackPhase!=='active')throw new Error(`Expected active cut, got ${state.attackPhase}`);
 await page.screenshot({path:`${out}/attack.png`});
 await page.screenshot({path:`${out}/attack-detail.png`,clip:{x:475,y:350,width:330,height:230}});
 console.log(JSON.stringify({state,errors}));
 if(errors.length)throw new Error('Browser errors during visual capture');
} finally {await browser.close();}
