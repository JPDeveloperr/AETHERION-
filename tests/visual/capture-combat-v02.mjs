// Real game frames: three separate J taps, camera and locomotion unchanged.
// Run Vite on 5173 first. PNGs are test evidence, never game art.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/screenshots/combat-v02';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
const runs=[];
try{
 for(const running of [false,true]){
  const name=running?'running':'standing';
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-11-03T12:00:00Z')});
  await page.goto('http://127.0.0.1:5173');await page.locator('canvas').waitFor();
  await page.clock.pauseAt(new Date('2026-11-03T12:01:00Z'));
  await page.locator('#start').press('Enter');await page.clock.runFor(128);
  if(running){await page.keyboard.down('KeyD');await page.clock.runFor(128);}
  const frames=[];
  for(let i=0;i<90;i++){
   if(i===0||i===18||i===42)await page.keyboard.press('KeyJ');
   if(i)await page.clock.runFor(16);
   const state=await page.locator('canvas').evaluate(c=>({...c.dataset}));
   const file=`${name}-${String(i).padStart(2,'0')}.png`;
   await page.screenshot({path:`${out}/${file}`,clip:{x:400,y:290,width:650,height:330}});
   frames.push({file,ms:i*16,state});
  }
  const ids=new Set(frames.map(f=>f.state.attackId));
  if(!ids.has('3')||errors.length)throw new Error(`Capture did not reach cut 3: ${errors}`);
  await page.keyboard.up('KeyD');await page.close();runs.push({name,frames,errors});
  console.log(`${name}: ${frames.length} consecutive frames / three attacks / ${errors.length} page errors`);
 }
 await writeFile(`${out}/frames.json`,JSON.stringify(runs,null,2));
 const html=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Aetherion 0.2 · combo</title>
 <style>body{background:#07111c;color:#d9eceb;font:14px system-ui;margin:24px}button{padding:10px;margin:8px}img{max-width:100%;display:block}.sheet{display:grid;grid-template-columns:repeat(4,325px);gap:8px}figure{margin:0;background:#132332}figcaption{padding:6px}#playback{width:650px}</style>
 <h1>AETHERION 0.2 — três entradas, três golpes</h1><p>90 frames consecutivos por sequência, em intervalos de 16 ms. Sem reposicionar o jogador ou a câmera. As imagens são evidência, não arte carregada pelo jogo.</p>
 <button id="standing">Parado</button><button id="running">Correndo</button><button id="stop">Pausar</button><img id="playback" alt="Frames reais do combo"><p id="caption"></p><main id="sheets"></main>
 <script>const runs=${JSON.stringify(runs)};let timer;const img=document.getElementById('playback');function play(run){clearInterval(timer);let i=0;timer=setInterval(()=>{const f=run.frames[i++%run.frames.length];img.src=f.file;document.getElementById('caption').textContent=run.name+' · '+f.ms+' ms · golpe '+(Number(f.state.comboIndex)+1)+' · '+f.state.renderPhase;},16)}for(const run of runs){document.getElementById(run.name).onclick=()=>play(run);const h=document.createElement('h2');h.textContent=run.name;document.getElementById('sheets').append(h);const grid=document.createElement('div');grid.id=run.name+'-sheet';grid.className='sheet';for(const f of run.frames.filter((_,i)=>i%5===0||[17,18,23,24,41,42,47,48,60,61,78,79].includes(i))){const fig=document.createElement('figure');fig.innerHTML='<img src="'+f.file+'" alt="'+run.name+' '+f.ms+' ms"><figcaption>'+f.ms+' ms · golpe '+(Number(f.state.comboIndex)+1)+' · '+f.state.renderPhase+'</figcaption>';grid.append(fig)}document.getElementById('sheets').append(grid)}document.getElementById('stop').onclick=()=>clearInterval(timer);img.src=runs[0].frames[0].file;</script></html>`;
 await writeFile(`${out}/index.html`,html);
 const sheet=await browser.newPage({viewport:{width:1370,height:1000}});await sheet.goto('http://127.0.0.1:5173/'+out+'/index.html');
 await sheet.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
 for(const run of runs)await sheet.locator(`#${run.name}-sheet`).screenshot({path:`${out}/${run.name}-contact.png`});
 await sheet.close();
}finally{await browser.close();}
