import {aetherMarkup,AetherHUD} from './ui/aether';
import {clearAbilityEffects} from './core/abilities';
import './style.css';
import { capturePlayer, interpolatePlayer } from './rendering/kael-motion';
import { Scene } from './rendering/scene';
import { createWorld, restoreEncounters, step } from './core/world';
import { Controls } from './input/controls';
import { attackSpec } from './core/attack';
import { Synth } from './audio/synth';
import { browserServices, defaults, type Checkpoint } from './platform/services';
const host=document.querySelector<HTMLElement>('#app')!;
host.innerHTML=`<div id="stage" aria-label="Arena isométrica do Santuário Partido"></div>
<header><span class="sigil">◇</span><div>AETHERION<small>ECHOES OF ETERNITY</small></div><span class="build">O PODER DO AETHER <b>0.3</b></span></header>
<section id="hud" hidden><div class="status"><span class="eyebrow">KAEL · GUARDIÃO DO ECO</span><div class="health"><i id="hpbar"></i></div><span id="hp">100 / 100</span><span id="dodge">ESQUIVA PRONTA</span>${aetherMarkup}</div><div class="quest"><span class="eyebrow">O SANTUÁRIO PARTIDO</span><p id="objective">Derrote a Sentinela Rubra</p><small id="counter">ENCONTROS 0 / 3</small></div><div id="combo" aria-live="polite"></div><button id="pause" class="small">PAUSAR · ESC</button></section>
<section id="panel" class="panel" aria-label="Menu principal"><span class="eyebrow">CAPÍTULO I · O DESPERTAR</span><h1>O último eco<br>da eternidade.</h1><p class="intro">Sob as ruínas de um mundo esquecido,<br>uma luz ainda resiste. Desperte, guardião.</p><div class="rule"></div><div class="actions"><button id="start">INICIAR JORNADA <span>↗</span></button><button id="continue" hidden>CONTINUAR DO MARCO</button><button id="settingsButton" class="secondary">CONFIGURAÇÕES</button></div><p class="note">Uma experiência inteiramente construída com geometria.</p></section>
<section id="settings" class="panel" hidden aria-label="Configurações"><span class="eyebrow">AJUSTES DA JORNADA</span><h2>Configurações</h2><label>Volume <input id="volume" type="range" min="0" max="1" step=".05"></label><label>Zona morta do controle <input id="deadzone" type="range" min=".05" max=".5" step=".01"></label><label>Zoom <input id="zoom" type="range" min=".65" max="1.4" step=".05"></label><label class="check">Reduzir movimento ambiente <input id="motion" type="checkbox"></label><button id="fullscreen" class="secondary">ALTERNAR TELA CHEIA</button><button id="back">SALVAR E VOLTAR</button></section>
<div id="toast" role="status"></div><footer><span>WASD / SETAS <b>MOVER</b> · CLIQUE / J <b>COMBO · 3 TOQUES</b> · K <b>LÂMINA</b> · L <b>NOVA</b> · ESPAÇO <b>ESQUIVAR</b></span><span>CONTROLE <b>X / □ · A / × · RB / LB</b></span></footer>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let world=createWorld(),checkpoint:Checkpoint|null=null,settings={...defaults};
let platform:ReturnType<typeof browserServices>|null=null;
const toast=(s:string)=>{$('toast').textContent=s;};
try{platform=browserServices(window.localStorage);settings=await platform.loadSettings();checkpoint=await platform.loadCheckpoint();}catch{toast('Armazenamento indisponível. A sessão continua sem salvamento.');}
let previousPlayer=capturePlayer(world);
const scene=new Scene();
try{await scene.init($('stage'));}catch{host.textContent='Não foi possível iniciar a renderização. Ative a aceleração gráfica e recarregue.';throw new Error('Renderer initialization failed');}
const input=new Controls(scene.app.canvas),audio=new Synth();const aetherHUD=new AetherHUD($('hud'),audio);
const apply=()=>{scene.zoom=settings.zoom;scene.reducedMotion=settings.reducedMotion;input.deadzone=settings.deadzone;audio.volume=settings.volume;};apply();
const unlock=()=>{void audio.unlock().catch(()=>toast('Áudio indisponível neste dispositivo.'));};
$('continue').hidden=!checkpoint;
function start(resume=false){world=createWorld();world.mode='playing';if(resume&&checkpoint)restoreEncounters(world,checkpoint.completedEncounters);previousPlayer=capturePlayer(world);$('panel').hidden=true;$('settings').hidden=true;$('hud').hidden=false;input.clear();unlock();}
$('start').onclick=()=>start();$('continue').onclick=()=>start(true);
function panel(title:string,description:string,button:string,action:()=>void){$('panel').hidden=false;$('panel').querySelector('h1')!.innerHTML=title;$('panel').querySelector('.intro')!.textContent=description;$('start').textContent=button;$('start').onclick=action;$('continue').hidden=true;$('start').focus();}
function pause(){if(world.mode==='playing'){world.mode='paused';world.effects=[];clearAbilityEffects(world);world.bufferUntil=0;previousPlayer=capturePlayer(world);audio.suspend();input.clear();panel('O eco aguarda.','Respire. Sua jornada continua aqui.','RETOMAR',resume);}else if(world.mode==='paused'&&$('settings').hidden)resume();}
function resume(){world.mode='playing';$('panel').hidden=true;input.clear();unlock();}
$('pause').onclick=pause;
window.addEventListener('keydown',e=>{if(e.code==='Escape'){if(!$('settings').hidden){$('back').click();}else pause();}if(e.code==='F11'){e.preventDefault();$('fullscreen').click();}});
window.addEventListener('blur',()=>{if(world.mode==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&world.mode==='playing')pause();});
$('settingsButton').onclick=()=>{$('panel').hidden=true;$('settings').hidden=false;for(const k of ['volume','deadzone','zoom'] as const)$<HTMLInputElement>(k).value=String(settings[k]);$<HTMLInputElement>('motion').checked=settings.reducedMotion;$('volume').focus();};
$('back').onclick=()=>{settings={volume:Number($<HTMLInputElement>('volume').value),deadzone:Number($<HTMLInputElement>('deadzone').value),zoom:Number($<HTMLInputElement>('zoom').value),reducedMotion:$<HTMLInputElement>('motion').checked};apply();void platform?.saveSettings(settings).catch(()=>toast('Não foi possível salvar as configurações.'));$('settings').hidden=true;$('panel').hidden=false;$('start').focus();};
$('fullscreen').onclick=()=>{if(platform)void platform.fullscreen().catch(()=>toast('Tela cheia não está disponível. Use a opção do navegador.'));};
async function save(){if(!platform)return;checkpoint={version:2,completedEncounters:world.completedEncounters,savedAt:new Date().toISOString()};try{await platform.saveCheckpoint(checkpoint);toast('MARCO SALVO · O eco permanece.');}catch{toast('Não foi possível salvar. Verifique o espaço e as permissões.');}}
let last=performance.now(),accumulator=0,priorHits=0,priorSwings=0,priorEncounters=0,priorMode=world.mode,padWasDown=false,padConfirmWasDown=false,menuWasDown=0;
function frame(now:number){const dt=Math.min((now-last)/1000,.1);last=now;const command=input.sample();
 if(input.padPause&&!padWasDown)pause();padWasDown=input.padPause;
 if(world.mode!=='playing'&&input.menuDirection&&input.menuDirection!==menuWasDown){const container=$('settings').hidden?$('panel'):$('settings');const items=Array.from(container.querySelectorAll<HTMLElement>('button:not([hidden]),input'));const index=items.indexOf(document.activeElement as HTMLElement);items[(index+input.menuDirection+items.length)%items.length]?.focus();}menuWasDown=input.menuDirection;
 if(input.padConfirm&&!padConfirmWasDown&&world.mode!=='playing') {const focused=document.activeElement;if(focused instanceof HTMLButtonElement)focused.click();else if(focused instanceof HTMLInputElement){if(focused.type==='checkbox')focused.checked=!focused.checked;else{const next=Number(focused.value)+Number(focused.step);focused.value=String(next>Number(focused.max)?Number(focused.min):next);}}else $('start').click();}padConfirmWasDown=input.padConfirm;
 accumulator+=dt;let stepped=false;while(accumulator>=1/60){previousPlayer=capturePlayer(world);step(world,command,1/60);command.attackPressed=false;command.bladePressed=false;command.novaPressed=false;stepped=true;accumulator-=1/60;}
 if(stepped)input.consumeAttack();
 if(world.swings>priorSwings)audio.swing(world.comboIndex);priorSwings=world.swings;
 if(world.hits!==priorHits){audio.hit();priorHits=world.hits;}if(world.completedEncounters>priorEncounters)void save();priorEncounters=world.completedEncounters;
 if(world.mode!==priorMode){if(world.mode==='dead')panel('Uma luz<br>se apaga.','Observe os avisos de ataque e esquive das lâminas e projéteis do vazio.','TENTAR NOVAMENTE',()=>start());if(world.mode==='won'){void save();panel('O santuário<br>lembra.','Os três encontros terminaram. O Santuário Partido despertou.','JOGAR NOVAMENTE',()=>start());}priorMode=world.mode;}
 aetherHUD.update(world);
 $('hp').textContent=`${world.player.hp} / 100`;$('hpbar').style.width=`${world.player.hp}%`;$('dodge').textContent=world.dodgeCooldown>0?`ESQUIVA ${world.dodgeCooldown.toFixed(1)}s`:'ESQUIVA PRONTA';$('counter').textContent=`ENCONTROS ${world.completedEncounters} / 3`;$('objective').textContent=world.completedEncounters===3?'Entre no portal a sudeste':world.transition>0?'O santuário reúne suas forças…':['Derrote a Sentinela Rubra','Enfrente o Espectro do Vazio','Supere a guarda do santuário'][world.completedEncounters]!;$('combo').textContent=world.player.attack>0?`${world.comboIndex+1} · ${attackSpec(world.comboIndex).name}`:world.attackId>0&&world.time<world.comboUntil&&world.comboIndex<2?'J · CONTINUAR COMBO':'';scene.render(world,dt,interpolatePlayer(previousPlayer,capturePlayer(world),accumulator/(1/60)));requestAnimationFrame(frame);
}
$('start').focus();requestAnimationFrame(frame);
