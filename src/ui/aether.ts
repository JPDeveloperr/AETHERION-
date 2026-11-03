import {ABILITIES} from '../core/abilities';
import type {World} from '../core/world';
import type {Synth} from '../audio/synth';
export const aetherMarkup=`<div class="aether-label"><span>AETHER</span><span id="energy">0 / 100</span></div><div class="aether-track" role="progressbar" aria-label="Energia Aether" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="energybar"></i></div><div class="abilities"><span id="blade-status"></span><span id="nova-status"></span></div><span id="power-feedback" role="status"></span>`;
export class AetherHUD {
 private perfect=-1;private emissions=-1;
 constructor(private root:HTMLElement,private audio:Synth){}
 update(w:World){
  const p=w.powers,value=this.root.querySelector('#energy')!,bar=this.root.querySelector<HTMLElement>('#energybar')!;
  value.textContent=`${p.energy} / 100`;bar.style.width=`${p.energy}%`;bar.parentElement!.setAttribute('aria-valuenow',String(p.energy));
  bar.parentElement!.dataset.flow=w.time-p.energyEvent.time<.3?(p.energyEvent.delta>0?'gain':'spend'):'idle';
  for(const kind of ['blade','nova'] as const){
   const a=ABILITIES[kind],cd=p.cooldowns[kind],el=this.root.querySelector<HTMLElement>(`#${kind}-status`)!;
   const state=cd>0?'cooldown':p.energy<a.cost?'starved':p.cast||w.player.attack>0||w.dodge>0?'busy':'ready';
   el.dataset.state=state;el.textContent=`${kind==='blade'?'K · RB':'L · LB'} ${kind==='blade'?'LÂMINA':'NOVA'} · ${cd>0?cd.toFixed(1)+'s':a.cost+' ◇'}`;
   el.setAttribute('aria-label',`${a.name}: ${state==='cooldown'?'recarga '+cd.toFixed(1)+' segundos':state==='starved'?'energia insuficiente':state==='busy'?'ação em andamento':'disponível'}`);
  }
  const feedback=this.root.querySelector<HTMLElement>('#power-feedback')!;
  const rejected=p.rejection&&w.time-p.rejection.time<.7;
  const text=p.perfectUntil>w.time?'ESQUIVA PERFEITA':rejected?({energy:'AETHER INSUFICIENTE',cooldown:'HABILIDADE EM RECARGA',busy:'CONCLUA O GOLPE',dodge:'CONCLUA A ESQUIVA'}[p.rejection!.reason]):w.time-p.energyEvent.time<.6?`${p.energyEvent.delta>0?'+':''}${p.energyEvent.delta} AETHER`:'';
  if(feedback.textContent!==text)feedback.textContent=text;
  if(this.perfect>=0&&p.perfectDodges>this.perfect)this.audio.perfect();
  if(this.emissions>=0&&p.emissions>this.emissions)this.audio.special(p.lastKind);
  this.perfect=p.perfectDodges;this.emissions=p.emissions;
 }
}
