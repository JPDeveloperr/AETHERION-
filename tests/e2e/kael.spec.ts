import {test,expect} from '@playwright/test';

// Frozen clock makes taps shorter than one simulation tick reproducible.
test('a quick J tap works without a mouse click and completes its animation',async({page})=>{
  await page.clock.install({time:new Date('2026-10-31T12:00:00Z')});
  await page.goto('/');await expect(page.locator('canvas')).toBeVisible();
  await page.clock.pauseAt(new Date('2026-10-31T12:01:00Z'));
  await page.locator('#start').press('Enter');
  await page.clock.runFor(32);
  const canvas=page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-attack-phase','idle');
  await page.keyboard.press('KeyJ'); // keydown+keyup before any simulation frame
  await page.clock.runFor(32);
  await expect(canvas).toHaveAttribute('data-attack-phase','windup');
  await page.clock.runFor(100);
  await expect(canvas).toHaveAttribute('data-attack-phase','active');
  await expect(canvas).toHaveAttribute('data-swings','1');
  await page.clock.runFor(100);
  await expect(canvas).toHaveAttribute('data-attack-phase','recovery');
  await page.clock.runFor(200);
  await expect(canvas).toHaveAttribute('data-attack-phase','idle');
  await expect(canvas).toHaveAttribute('data-effects','0');
  await expect(canvas).toHaveAttribute('data-swings','1');
  await page.keyboard.press('Escape');await page.keyboard.press('KeyJ');
  await page.clock.runFor(500);
  await expect(canvas).toHaveAttribute('data-swings','1');
});
