import type {CustomerWriteNotice} from '../shared/customer-write-notice';
import {readCustomerWriteNoticeDelivery,type CustomerWriteNoticeSource} from '../shared/customer-write-notice-delivery';

export interface CustomerWriteNoticeItem {
  readonly source:CustomerWriteNoticeSource;
  readonly notice:CustomerWriteNotice;
}
export interface CustomerWriteNoticeFeed {
  getSnapshot():readonly CustomerWriteNoticeItem[];
  subscribe(listener:()=>void):()=>void;
  dismiss(id:string):void;
  dispose():void;
}

type NoticeWindow=Pick<Window,'addEventListener'|'removeEventListener'|'location'>;
const nativeDataGetter=typeof MessageEvent==='function'?Object.getOwnPropertyDescriptor(MessageEvent.prototype,'data')?.get:undefined;

function dataFromMessage(event:MessageEvent):unknown {
  const own=Object.getOwnPropertyDescriptor(event,'data');
  if(own)return Object.hasOwn(own,'value')?own.value:undefined;
  if(typeof MessageEvent==='function'&&event instanceof MessageEvent&&nativeDataGetter){
    try{return nativeDataGetter.call(event);}catch{return undefined;}
  }
  return undefined;
}

function sameWindowOrigin(event:MessageEvent,target:NoticeWindow):boolean {
  if(event.origin===target.location.origin)return true;
  return target.location.protocol==='file:'&&event.origin==='null';
}

/** Subscribes immediately, so a notice posted before React effects is retained. */
export function createCustomerWriteNoticeFeed(target:NoticeWindow):CustomerWriteNoticeFeed {
  let current:readonly CustomerWriteNoticeItem[]=Object.freeze([]);
  let disposed=false;
  const seen=new Set<string>(),listeners=new Set<()=>void>();
  const notify=()=>{for(const listener of listeners)listener();};
  const onMessage=(event:MessageEvent)=>{
    if(disposed||event.source!==target||!sameWindowOrigin(event,target))return;
    const delivery=readCustomerWriteNoticeDelivery(dataFromMessage(event));
    if(!delivery||seen.has(delivery.notice.id))return;
    seen.add(delivery.notice.id);
    current=Object.freeze([...current,Object.freeze({source:delivery.source,notice:delivery.notice})]);
    notify();
  };
  target.addEventListener('message',onMessage);
  return{
    getSnapshot:()=>current,
    subscribe(listener){if(disposed)return()=>{};listeners.add(listener);return()=>listeners.delete(listener);},
    dismiss(id){if(disposed||!seen.has(id))return;const next=current.filter(item=>item.notice.id!==id);if(next.length!==current.length){current=Object.freeze(next);notify();}},
    dispose(){if(disposed)return;disposed=true;target.removeEventListener('message',onMessage);listeners.clear();},
  };
}

// The renderer entry imports this module before App effects. Keep one page-lifetime
// receiver even when React StrictMode replays component mounts.
export const customerWriteNoticeFeed=typeof window==='undefined'?undefined:createCustomerWriteNoticeFeed(window);
