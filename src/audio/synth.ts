export class Synth {
 private context:AudioContext|null=null; volume=.3;
 async unlock(){this.context??=new AudioContext();await this.context.resume();}
 suspend(){void this.context?.suspend();}
 private tone(type:OscillatorType,from:number,to:number,duration:number,level:number,delay=0){
  const c=this.context;if(!c||c.state!=='running')return;
  const osc=c.createOscillator(),gain=c.createGain(),t=c.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(from,t);osc.frequency.exponentialRampToValueAtTime(to,t+duration);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,this.volume*level),t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(gain).connect(c.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+duration+.01);
 }
 /** Airy descending blade, followed by a short metallic harmonic. No remote assets. */
 swing(index=0){this.tone('triangle',index===2?1100:index===1?1600:1450,index===2?140:index===1?260:210,index===2?.18:.14,index===2?.095:.075);this.tone('sine',2400,850,.11,.035,.015);}
 perfect(){this.tone('sine',880,1760,.18,.1);this.tone('triangle',1320,2640,.22,.04,.04);}
 special(kind:'blade'|'nova'){if(kind==='blade'){this.tone('triangle',1800,180,.28,.12);this.tone('sine',900,450,.25,.07,.04);}else{this.tone('sine',85,38,.4,.22);this.tone('triangle',650,180,.32,.1);this.tone('sine',1760,440,.35,.05,.04);}}
 hit(){this.tone('triangle',240,55,.16,.18);this.tone('sine',1850,420,.09,.055);}
}
