// Captures consecutive frames of the REAL game, including phase boundaries and a second held-J attack.
// Start Vite on port 5173 first. Does not set world state or suppress camera/body animation.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const out='docs/screenshots/attack-stability';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
const runs=[];
try {
 for(const running of [false,true]){
  const name=running?'running':'standing';
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-11-01T12:00:00Z')});
  await page.goto('http://127.0.0.1:5173');await page.locator('canvas').waitFor();
  await page.clock.pauseAt(new Date('2026-11-01T12:01:00Z'));
  await page.locator('#start').press('Enter');await page.clock.runFor(128);
  if(running){await page.keyboard.down('KeyD');await page.clock.runFor(128);}
  await page.keyboard.down('KeyJ');
  const frames=[];
  // Every 16 ms: includes both sides of 75, 195 and 360 ms transitions.
  for(let i=0;i<=27;i++){
   if(i)await page.clock.runFor(16);
   const state=await page.locator('canvas').evaluate(c=>({...c.dataset}));
   const file=`${name}-${String(i).padStart(2,'0')}.png`;
   await page.screenshot({path:`${out}/${file}`,clip:{x:425,y:310,width:500,height:280}});
   frames.push({file,ms:i*16,state});
  }
  runs.push({name,frames,errors});await page.close();
  console.log(`${name}: ${frames.length} consecutive frames, ${errors.length} browser errors`);
  if(errors.length)throw new Error(errors.join('\n'));
 }
 await writeFile(`${out}/frames.json`,JSON.stringify(runs,null,2));
 const data=JSON.stringify(runs);
 const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Kael — continuidade do ataque</title>
<style>body{background:#07111c;color:#d9eceb;font:14px system-ui;margin:24px}button{margin:8px;padding:10px;background:#193441;color:inherit;border:1px solid #668b97;cursor:pointer}img{display:block;max-width:100%}.contact{display:grid;grid-template-columns:repeat(4,350px);gap:8px}figure{margin:0;background:#142431}figcaption{padding:7px;font-size:12px}.contact img{width:350px}#playback{width:500px;border:1px solid #688c95}</style>
<h1>Kael — sequências do gameplay</h1><p>28 frames consecutivos por sequência, a cada 16 ms. J mantido; sem mudança da câmera ou do estado do jogo para capturar. O mouse não participa da orientação.</p>
<button id="standing">Reproduzir parado</button><button id="running">Reproduzir correndo</button><button id="stop">Pausar</button><img id="playback" alt="Reprodução dos frames"><p id="caption"></p><main id="sheets"></main>
<script>const runs=${data};let timer;const img=document.getElementById('playback'),caption=document.getElementById('caption');function play(run){clearInterval(timer);let i=0;timer=setInterval(()=>{const f=run.frames[i++%run.frames.length];img.src=f.file;caption.textContent=run.name+' · '+f.ms+' ms · '+f.state.renderPhase;},16);}for(const run of runs){document.getElementById(run.name).onclick=()=>play(run);const h=document.createElement('h2');h.textContent=run.name==='standing'?'Parado':'Correndo';document.getElementById('sheets').append(h);const grid=document.createElement('div');grid.id=run.name+'-sheet';grid.className='contact';for(const f of run.frames){const fig=document.createElement('figure');fig.innerHTML='<img src="'+f.file+'" alt="'+run.name+' '+f.ms+' ms"><figcaption>'+f.ms+' ms · golpe '+f.state.attackId+' · '+f.state.renderPhase+'</figcaption>';grid.append(fig);}document.getElementById('sheets').append(grid);}document.getElementById('stop').onclick=()=>clearInterval(timer);img.src=runs[0].frames[0].file;</script></html>`;
 await writeFile(`${out}/index.html`,html);
 const sheet=await browser.newPage({viewport:{width:1470,height:1000}});
 await sheet.goto('http://127.0.0.1:5173/'+out+'/index.html');
 await sheet.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 for(const run of runs)await sheet.locator(`#${run.name}-sheet`).screenshot({path:`${out}/${run.name}-contact.png`});
 await sheet.close();
} finally {await browser.close();}
