// The renderer consumes capabilities, never Node, filesystem paths, or Steam SDKs.
export interface Settings { volume:number; deadzone:number; zoom:number; reducedMotion:boolean }
export interface Checkpoint {version:2;completedEncounters:number;savedAt:string}
export interface PlatformServices { loadSettings():Promise<Settings>; saveSettings(value:Settings):Promise<void>; loadCheckpoint():Promise<Checkpoint|null>; saveCheckpoint(value:Checkpoint):Promise<void>; fullscreen():Promise<void> }
export const defaults:Settings={volume:.3,deadzone:.18,zoom:1,reducedMotion:false};
export function parseSettings(raw:string|null):Settings {
 try {const v:unknown=JSON.parse(raw??'null');if(!v||typeof v!=='object')return {...defaults};const o=v as Record<string,unknown>;
 const number=(k:string,d:number,lo:number,hi:number)=>typeof o[k]==='number'&&Number.isFinite(o[k])?Math.max(lo,Math.min(hi,o[k] as number)):d;
 return {volume:number('volume',.3,0,1),deadzone:number('deadzone',.18,.05,.5),zoom:number('zoom',1,.65,1.4),reducedMotion:o.reducedMotion===true};}catch{return {...defaults};}
}
export function parseCheckpoint(raw:string|null):Checkpoint|null {
 try {
  const v=JSON.parse(raw??'null');
  if(!v||typeof v.savedAt!=='string'||!Number.isFinite(Date.parse(v.savedAt)))return null;
  if(v.version===1&&typeof v.enemyDefeated==='boolean')return {version:2,completedEncounters:v.enemyDefeated?1:0,savedAt:v.savedAt};
  if(v.version===2&&Number.isInteger(v.completedEncounters)&&v.completedEncounters>=0&&v.completedEncounters<=3)
   return {version:2,completedEncounters:v.completedEncounters,savedAt:v.savedAt};
  return null;
 }catch{return null;}
}
export function browserServices(storage:Pick<Storage, 'getItem'|'setItem'>):PlatformServices {return {
 async loadSettings(){return parseSettings(storage.getItem('aetherion.settings.v1'));},
 async saveSettings(v){storage.setItem('aetherion.settings.v1',JSON.stringify(parseSettings(JSON.stringify(v))));},
 async loadCheckpoint(){return parseCheckpoint(storage.getItem('aetherion.checkpoint.v2'))??parseCheckpoint(storage.getItem('aetherion.checkpoint.v1'));},
 async saveCheckpoint(v){storage.setItem('aetherion.checkpoint.v2',JSON.stringify(v));},
 async fullscreen(){if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
};}
