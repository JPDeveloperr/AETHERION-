import {begin} from './journey';
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

test('moving the mouse cannot change the sword pose at rest, running or during J attacks',async({page})=>{
  test.setTimeout(90000);
  await page.clock.install({time:new Date('2026-11-01T12:00:00Z')});
  await page.goto('/');await expect(page.locator('canvas')).toBeVisible();
  await page.clock.pauseAt(new Date('2026-11-01T12:01:00Z'));
  await page.locator('#start').press('Enter');await page.clock.runFor(64);
  const read=()=>page.locator('canvas').evaluate(c=>({...c.dataset}));
  const idle=await read();
  for(const [x,y] of [[80,500],[1150,600],[600,100]]){
    await page.mouse.move(x!,y!);await page.clock.runFor(64);
    const f=await read();expect(f.renderFacing).toBe(idle.renderFacing);expect(f.bladeLocalX).toBe(idle.bladeLocalX);expect(f.bladeLocalY).toBe(idle.bladeLocalY);
  }
  await page.keyboard.down('KeyD');await page.clock.runFor(240);
  const running=await read();
  for(const [x,y] of [[100,100],[1100,650]]){
    await page.mouse.move(x!,y!);await page.clock.runFor(48);
    const f=await read();expect(f.renderFacing).toBe(running.renderFacing);expect(f.bladeLocalX).toBe(running.bladeLocalX);expect(f.bladeLocalY).toBe(running.bladeLocalY);
    expect(Number(f.playerX)).toBeGreaterThan(Number(running.playerX));
  }
  await page.keyboard.press('KeyJ');await page.clock.runFor(48);
  const attack=await read();expect(Number(attack.renderAttack)).toBeGreaterThan(0);
  await page.mouse.move(0,0);await page.clock.runFor(80);
  const cut=await read();expect(cut.renderFacing).toBe(attack.renderFacing);expect(cut.attackId).toBe(attack.attackId);expect(Number(cut.renderAttack)).toBeLessThan(Number(attack.renderAttack));
  await page.keyboard.up('KeyD');await page.clock.runFor(400);
  const end=await read();expect(end.renderAttack).toBe('0');expect(end.trailCount).toBe('0');expect(end.renderFacing).toBe(attack.renderFacing);
});

test('deliberate J taps while running advance the three cuts without resets or position jumps',async({page})=>{
  test.setTimeout(90000);
  await page.clock.install({time:new Date('2026-11-01T12:00:00Z')});
  await page.goto('/');await expect(page.locator('canvas')).toBeVisible();
  await page.clock.pauseAt(new Date('2026-11-01T12:01:00Z'));
  await page.locator('#start').press('Enter');await page.clock.runFor(32);
  await page.keyboard.down('KeyD');await page.clock.runFor(120);
  const walkStart=await page.locator('canvas').evaluate(c=>({...c.dataset}));await page.clock.runFor(32);
  const walkEnd=await page.locator('canvas').evaluate(c=>({...c.dataset}));
  // Compare with the existing isometric input speed, not a different world-axis command.
  const speed=Math.hypot(Number(walkEnd.renderX)-Number(walkStart.renderX),Number(walkEnd.renderY)-Number(walkStart.renderY))/(Number(walkEnd.renderTime)-Number(walkStart.renderTime));
  expect(speed).toBeGreaterThan(150);await page.keyboard.down('KeyJ');
  let previous:Record<string,string|undefined>|null=null,transitions=0,lastStart=-1;
  for(let i=0;i<30;i++){
    await page.clock.runFor(32);
    const f=await page.locator('canvas').evaluate(c=>({...c.dataset}));
    if(i===6||i===18){await page.keyboard.up('KeyJ');await page.keyboard.down('KeyJ');}
    if(previous){
      const dt=Number(f.renderTime)-Number(previous.renderTime);
      expect(Math.hypot(Number(f.renderX)-Number(previous.renderX),Number(f.renderY)-Number(previous.renderY))).toBeCloseTo(speed*dt,5);
      if(f.attackId===previous.attackId&&Number(f.renderAttack)>0){expect(Number(f.renderAttack)).toBeLessThan(Number(previous.renderAttack));expect(f.renderFacing).toBe(previous.renderFacing);}
      if(f.attackId!==previous.attackId){const duration=Number(f.comboIndex)===2?.5:.36;const start=Number(f.renderTime)-(duration-Number(f.renderAttack));expect(start-lastStart).toBeGreaterThanOrEqual(.38-1e-8);lastStart=start;transitions++;}
    }
    previous=f;
  }
  expect(transitions).toBeGreaterThanOrEqual(2);
  await page.keyboard.up('KeyJ');await page.keyboard.up('KeyD');await page.clock.runFor(500);
  await expect(page.locator('canvas')).toHaveAttribute('data-render-attack','0');
  await expect(page.locator('canvas')).toHaveAttribute('data-trail-count','0');
});

 test('holding J produces one cut and a buffered tap produces only the next cut',async({page})=>{
  test.setTimeout(90000);await begin(page);await page.keyboard.down('KeyJ');await page.clock.runFor(650);
  await expect(page.locator('canvas')).toHaveAttribute('data-swings','1');
  await expect(page.locator('canvas')).toHaveAttribute('data-render-attack','0');
  await page.keyboard.up('KeyJ');await page.keyboard.press('KeyJ');await page.clock.runFor(64);
  await expect(page.locator('canvas')).toHaveAttribute('data-combo-index','1');
  await page.clock.runFor(600);await expect(page.locator('canvas')).toHaveAttribute('data-swings','2');
 });
