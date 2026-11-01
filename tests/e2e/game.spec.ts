import { test,expect } from '@playwright/test';
test('renders vector arena, starts, pauses and persists settings',async({page})=>{
 // Several reloads and screenshots share this budget on headless cloud graphics.
 test.setTimeout(60000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('#start')).toBeFocused();
 await page.screenshot({path:`test-results/menu-${test.info().project.name}.png`});
 await page.locator('#settingsButton').click();await page.locator('#volume').fill('0.6');await page.locator('#back').click();await page.reload();await page.locator('#settingsButton').click();await expect(page.locator('#volume')).toHaveValue('0.6');await page.locator('#back').click();
 await page.locator('#start').click();await expect(page.locator('#hp')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#start')).toHaveText('RETOMAR');await page.locator('#start').click();
 await page.keyboard.down('KeyD');await page.waitForTimeout(500);await page.keyboard.up('KeyD');await page.keyboard.press('Space');await expect(page.locator('#dodge')).not.toHaveText('ESQUIVA PRONTA');
 await page.screenshot({path:`test-results/arena-${test.info().project.name}.png`});expect(errors).toEqual([]);
});
test('sentinel pursues and damages the player in real time',async({page})=>{await page.goto('/');await page.locator('#start').click();await expect(page.locator('#hp')).not.toHaveText('100 / 100',{timeout:12000});});
test('player defeats the sentinel, saves, and reaches the portal',async({page})=>{test.setTimeout(60000);
 await page.goto('/');await page.locator('#start').click();await page.mouse.move(1150,390);await page.keyboard.down('KeyJ');
 await expect(page.locator('#counter')).toHaveText('SENTINELAS 1 / 1',{timeout:15000});await page.keyboard.up('KeyJ');
 await expect(page.locator('#toast')).toContainText('MARCO SALVO');
 await page.evaluate(async()=>{
  const canvas=document.querySelector('canvas')!;
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));
  try {await new Promise<void>((resolve,reject)=>{const began=performance.now();function check(){if(Number(canvas.dataset.playerX)-Number(canvas.dataset.playerY)>-25)resolve();else if(performance.now()-began>10000)reject(new Error('Movement did not reach target'));else requestAnimationFrame(check);}check();});}
  finally {window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD'}));}
 });
 await page.keyboard.down('KeyS');
 await expect(page.locator('#panel h1')).toHaveText('O santuáriolembra.',{timeout:15000});await page.keyboard.up('KeyS');
 await page.screenshot({path:`test-results/victory-${test.info().project.name}.png`});
 await page.reload();await expect(page.locator('#continue')).toBeVisible();await page.locator('#continue').click();await expect(page.locator('#counter')).toHaveText('SENTINELAS 1 / 1');
});
