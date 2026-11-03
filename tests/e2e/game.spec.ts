import {begin,completeJourney} from './journey';
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
test('three encounters save progress, unlock the portal and restore victory',async({page})=>{
 test.setTimeout(180000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await begin(page);
 await completeJourney(page,async stage=>{
  await page.screenshot({path:`test-results/encounter-${stage+1}-${test.info().project.name}.png`});
 });
 await expect(page.locator('#counter')).toHaveText('ENCONTROS 3 / 3');
 await expect(page.locator('#panel h1')).toHaveText('O santuáriolembra.');
 await expect(page.locator('#toast')).toContainText('MARCO SALVO');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aetherion.checkpoint.v2')!).completedEncounters)).toBe(3);
 await page.screenshot({path:`test-results/victory-${test.info().project.name}.png`});
 await page.reload();await expect(page.locator('#continue')).toBeVisible();await page.locator('#continue').press('Enter');await page.clock.runFor(64);
 await expect(page.locator('#counter')).toHaveText('ENCONTROS 3 / 3');await expect(page.locator('#objective')).toHaveText('Entre no portal a sudeste');
 expect(errors).toEqual([]);
});
