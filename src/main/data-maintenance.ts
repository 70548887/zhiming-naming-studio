import { isDeepStrictEqual } from 'node:util';
import { createHash,randomUUID } from 'node:crypto';
import type { Dataset,Store } from './store';
import type { DataPackInfo,DataPackPreview,DataPackTable } from '../shared/data-maintenance';

const TABLES:DataPackTable[]=['characters','citations','knowledge','sources'];
export function packInfo(dataset:Dataset,bytes:Uint8Array):DataPackInfo {
  return {version:dataset.version,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
    counts:{characters:dataset.characters.length,citations:dataset.citations.length,knowledge:dataset.knowledge.length,sources:dataset.sources.length}};
}
export function packPreview(current:Dataset,currentBytes:Uint8Array,incoming:Dataset,incomingBytes:Uint8Array,operation:'import'|'rollback',now:number):DataPackPreview {
  const result:DataPackPreview={id:randomUUID(),operation,current:packInfo(current,currentBytes),incoming:packInfo(incoming,incomingBytes),changes:{} as DataPackPreview['changes'],sourceChanges:[],expiresAt:new Date(now+15*60000).toISOString()};
  for(const table of TABLES){
    const key=(entry:any):string=>table==='characters'?entry.char:entry.id;
    const old=new Map(current[table].map(entry=>[key(entry),entry] as const)),next=new Map(incoming[table].map(entry=>[key(entry),entry] as const));
    const delta={added:0,removed:0,changed:0,unchanged:0};
    for(const[id,value]of next){const previous=old.get(id);const kind=!previous?'added':isDeepStrictEqual(previous,value)?'unchanged':'changed';delta[kind]++;if(table==='sources'&&kind!=='unchanged')result.sourceChanges.push({id,name:(value as any).name,kind});}
    for(const[id,value]of old)if(!next.has(id)){delta.removed++;if(table==='sources')result.sourceChanges.push({id,name:(value as any).name,kind:'removed'});}
    result.changes[table]=delta;
  }
  return result;
}

/** One bounded preview, carrying its original bytes. Approval never reopens a changed selected file. */
export class DataPackPreviewManager {
  private pending?:{preview:DataPackPreview;bytes:Uint8Array};
  constructor(private store:Store,private now:()=>number=Date.now){}
  prepare(bytes:Uint8Array,operation:'import'|'rollback'='import'):DataPackPreview {
    const incoming=this.store.readPack(bytes),currentBytes=this.store.currentPackBytes();
    const preview=packPreview(this.store.dataset,currentBytes,incoming,bytes,operation,this.now());
    this.pending={preview:structuredClone(preview),bytes:new Uint8Array(bytes)};
    return preview;
  }
  prepareRollback():DataPackPreview {
    const bytes=this.store.previousPackBytes();if(!bytes)throw new Error('尚无可回退的数据包。');return this.prepare(bytes,'rollback');
  }
  discard(id:string):void {if(this.pending?.preview.id===id)this.pending=undefined;}
  apply(id:string):string {
    const pending=this.pending;
    if(!pending||pending.preview.id!==id)throw new Error('预览已失效，请重新选择数据包并核对。');
    if(this.now()>=Date.parse(pending.preview.expiresAt)){this.pending=undefined;throw new Error('数据包预览已超过15分钟，请重新核对。');}
    const current=packInfo(this.store.dataset,this.store.currentPackBytes());
    if(current.sha256!==pending.preview.current.sha256){this.pending=undefined;throw new Error('当前知识库已变化，请重新预览，避免覆盖新版本。');}
    const message=this.store.installPack(pending.bytes);this.pending=undefined;
    return pending.preview.operation==='rollback'?message.replace('更新','回退'):message;
  }
}
