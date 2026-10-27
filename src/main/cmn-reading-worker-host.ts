import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import type {CmnReadingQuery} from '../shared/cmn-reading';
import {CMN_READING_INPUTS} from './cmn-reading-pins';

const VERSION='cmn-reading-worker/1.0.0';
const PROFILE_SHA=createHash('sha256').update(JSON.stringify(CMN_READING_INPUTS)).digest('hex');
const RAW_SHA=CMN_READING_INPUTS.find(p=>p.file==='data/raw/moe-revised.json.gz')!.sha256;
const DATASET_SHA=CMN_READING_INPUTS.find(p=>p.file==='data/dataset-v6.json')!.sha256;
type Pending={char:string;dataDirectory:string;resolve:(query:CmnReadingQuery)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>;sent:boolean};
type Slot={worker:Worker;ready:boolean;pending:Map<number,Pending>;idle?:ReturnType<typeof setTimeout>};
export interface CmnReadingWorkerOptions{requestTimeoutMs?:number;idleTimeoutMs?:number;maxPending?:number;}
/** The app already supplies app.getAppPath()/data; preview supplies project/data. */
export function cmnReadingWorkerFile(initialDataDirectory:string):string{
  if(typeof initialDataDirectory!=='string'||!initialDataDirectory)throw new Error('CMN_WORKER: data directory required');
  return path.join(path.dirname(path.resolve(initialDataDirectory)),'dist-electron','cmn-reading-worker.cjs');
}
function validQuery(value:unknown,char:string):value is CmnReadingQuery{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const q=value as CmnReadingQuery;
  return q.profile==='cmn-character-source/1.0.0'&&q.char===char&&q.source?.sourceId==='moe-revised'&&q.source.profile===q.profile&&q.source.language==='cmn'
    &&q.source.profileSha256===PROFILE_SHA&&q.source.rawSha256===RAW_SHA&&q.source.datasetSha256===DATASET_SHA
    &&Array.isArray(q.options)&&Array.isArray(q.references)&&Array.isArray(q.defaultOptionIds)&&Array.isArray(q.limitations)
    &&['available','reference-only','unavailable'].includes(q.status)
    &&(q.status!=='available'||q.options.length>0)
    &&q.options.every(o=>!!o&&typeof o==='object'&&o.char===char&&o.characterIdentitySha256===q.characterIdentitySha256&&o.source?.profile===q.profile&&o.source?.rawSha256===RAW_SHA&&o.source?.profileSha256===PROFILE_SHA)
    &&q.references.every(r=>!!r&&typeof r==='object'&&r.char===char&&r.selectable===false);
}
/** One lazy worker. Every request is bounded; idle workers are unref'd and retired. */
export class CmnReadingWorkerHost{
  private slot?:Slot;private sequence=0;private closed=false;
  private readonly requestTimeoutMs:number;private readonly idleTimeoutMs:number;private readonly maxPending:number;
  constructor(private readonly workerFile:string,options:CmnReadingWorkerOptions={}){
    if(!path.isAbsolute(workerFile))throw new Error('CMN_WORKER: absolute entry required');
    this.requestTimeoutMs=options.requestTimeoutMs??15000;this.idleTimeoutMs=options.idleTimeoutMs??30000;this.maxPending=options.maxPending??32;
    if(!Number.isInteger(this.requestTimeoutMs)||this.requestTimeoutMs<1||!Number.isInteger(this.idleTimeoutMs)||this.idleTimeoutMs<1||!Number.isInteger(this.maxPending)||this.maxPending<1)throw new Error('CMN_WORKER: invalid limits');
  }
  snapshot(){return{active:!!this.slot,pending:this.slot?.pending.size??0,closed:this.closed};}
  query(char:string,dataDirectory:string):Promise<CmnReadingQuery>{
    if(typeof char!=='string'||!/^[\p{Script=Han}]$/u.test(char)||typeof dataDirectory!=='string'||!path.isAbsolute(dataDirectory))return Promise.reject(new Error('CMN_WORKER: invalid query'));
    if(this.closed)return Promise.reject(new Error('CMN_WORKER: closed'));
    let slot:Slot;try{slot=this.slot??this.start();}catch{return Promise.reject(new Error('CMN_WORKER: startup failed'));}
    if(slot.pending.size>=this.maxPending)return Promise.reject(new Error('CMN_WORKER: queue full'));
    if(slot.idle){clearTimeout(slot.idle);slot.idle=undefined;}slot.worker.ref();
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.stop(slot,'request timed out');},this.requestTimeoutMs);
      slot.pending.set(id,{char,dataDirectory,resolve,reject,timer,sent:false});
      if(slot.ready)this.send(slot,id);
    });
  }
  private start():Slot{
    const worker=new Worker(this.workerFile,{workerData:{version:VERSION},execArgv:[],env:{}});
    const slot:Slot={worker,ready:false,pending:new Map()};this.slot=slot;
    worker.on('message',message=>this.message(slot,message));
    worker.on('messageerror',()=>this.stop(slot,'invalid worker message'));
    worker.on('error',()=>this.stop(slot,'worker error'));
    worker.on('exit',()=>{if(this.slot===slot)this.stop(slot,'worker exited');});
    return slot;
  }
  private send(slot:Slot,id:number){
    const p=slot.pending.get(id);if(!p||p.sent)return;p.sent=true;
    try{slot.worker.postMessage({version:VERSION,kind:'query',id,char:p.char,dataDirectory:p.dataDirectory});}
    catch{this.stop(slot,'post failed');}
  }
  private message(slot:Slot,message:unknown){
    if(this.slot!==slot)return;
    const m=message as {version?:unknown;kind?:unknown;id?:unknown;query?:unknown;code?:unknown};
    if(!m||m.version!==VERSION){this.stop(slot,'invalid protocol');return;}
    if(m.kind==='ready'){
      if(slot.ready){this.stop(slot,'duplicate ready');return;}slot.ready=true;
      for(const id of slot.pending.keys())this.send(slot,id);return;
    }
    const p=typeof m.id==='number'?slot.pending.get(m.id):undefined;
    if(!slot.ready||!p||!p.sent){this.stop(slot,'unexpected response');return;}
    if(m.kind==='result'&&validQuery(m.query,p.char)){clearTimeout(p.timer);slot.pending.delete(m.id as number);p.resolve(m.query);}
    else if(m.kind==='rejected'&&(m.code==='SOURCE_UNAVAILABLE'||m.code==='INVALID_REQUEST')){clearTimeout(p.timer);slot.pending.delete(m.id as number);p.reject(new Error('CMN_WORKER: source rejected'));}
    else{this.stop(slot,'invalid response');return;}
    if(!slot.pending.size){slot.worker.unref();slot.idle=setTimeout(()=>{this.stop(slot,'idle');},this.idleTimeoutMs);slot.idle.unref();}
  }
  private stop(slot:Slot,reason:string):Promise<void>{
    if(this.slot===slot)this.slot=undefined;
    if(slot.idle)clearTimeout(slot.idle);
    for(const p of slot.pending.values()){clearTimeout(p.timer);p.reject(new Error('CMN_WORKER: '+reason));}slot.pending.clear();slot.worker.unref();
    return slot.worker.terminate().then(()=>undefined,()=>undefined);
  }
  async close():Promise<void>{
    this.closed=true;const slot=this.slot;if(!slot)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([this.stop(slot,'closed'),new Promise<void>(resolve=>{timer=setTimeout(resolve,2000);})]);}
    finally{if(timer)clearTimeout(timer);}
  }
}
