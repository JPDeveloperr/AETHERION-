export class Synth {
 private context:AudioContext|null=null; volume=.3;
 async unlock(){this.context??=new AudioContext();await this.context.resume();}
 suspend(){void this.context?.suspend();}
 hit(){const c=this.context;if(!c||c.state!=='running')return;const osc=c.createOscillator(),gain=c.createGain();osc.type='triangle';osc.frequency.setValueAtTime(270,c.currentTime);osc.frequency.exponentialRampToValueAtTime(65,c.currentTime+.13);gain.gain.setValueAtTime(this.volume*.18,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+.15);osc.connect(gain).connect(c.destination);osc.start();osc.stop(c.currentTime+.16);}
}
