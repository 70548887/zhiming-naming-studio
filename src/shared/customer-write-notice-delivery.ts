import {validateCustomerWriteNotice,type CustomerWriteNotice} from './customer-write-notice';

/** Local notification transport only. This is never naming input or commit proof. */
export const CUSTOMER_WRITE_NOTICE_MESSAGE='studio:customer-write-notice/1' as const;
export const CUSTOMER_WRITE_NOTICE_HEADER='X-Studio-Customer-Write-Notice';
export type CustomerWriteNoticeSource='desktop'|'browser';
export interface CustomerWriteNoticeDelivery {
  type:typeof CUSTOMER_WRITE_NOTICE_MESSAGE;
  source:CustomerWriteNoticeSource;
  notice:CustomerWriteNotice;
}
export function readCustomerWriteNoticeDelivery(value:unknown):CustomerWriteNoticeDelivery|undefined {
  try{
    if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return;
    const names=['type','source','notice'],keys=Reflect.ownKeys(value);
    if(keys.length!==names.length||keys.some(key=>typeof key!=='string'||!names.includes(key)))return;
    const fields:Record<string,unknown>=Object.create(null);
    for(const name of names){const descriptor=Object.getOwnPropertyDescriptor(value,name);if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))return;fields[name]=descriptor.value;}
    if(fields.type!==CUSTOMER_WRITE_NOTICE_MESSAGE||fields.source!=='desktop'&&fields.source!=='browser')return;
    return{type:CUSTOMER_WRITE_NOTICE_MESSAGE,source:fields.source,notice:validateCustomerWriteNotice(fields.notice)};
  }catch{return;}
}

/** Receiver lookup or postMessage failure must never replace the business result. */
export function postCustomerWriteNotice(target:{postMessage:(data:unknown,targetOrigin:string)=>void},value:unknown,source:CustomerWriteNoticeSource):void {
  try{const notice=validateCustomerWriteNotice(value);target.postMessage({type:CUSTOMER_WRITE_NOTICE_MESSAGE,source,notice},'*');}catch{/* Preserve the main invocation result or error. */}
}

/** HTTP sideband leaves every existing success/error body unchanged. */
export function customerWriteNoticeHeader(value:unknown):string|undefined {
  try{return encodeURIComponent(JSON.stringify(validateCustomerWriteNotice(value)));}catch{return;}
}
export function readCustomerWriteNoticeHeader(value:unknown):CustomerWriteNotice|undefined {
  try{if(typeof value!=='string'||value.length>8192)return;return validateCustomerWriteNotice(JSON.parse(decodeURIComponent(value)));}catch{return;}
}
export function publishCustomerWriteNoticeHeader(response:{setHeader:(name:string,value:string)=>unknown},notice:unknown):void {
  try{const encoded=customerWriteNoticeHeader(notice);if(encoded)response.setHeader(CUSTOMER_WRITE_NOTICE_HEADER,encoded);}catch{/* Header lookup/encoding/publication must not affect the result. */}
}
export function postCustomerWriteNoticeFromHeader(target:{postMessage:(data:unknown,targetOrigin:string)=>void},response:{headers:{get:(name:string)=>string|null}}):void {
  try{const notice=readCustomerWriteNoticeHeader(response.headers.get(CUSTOMER_WRITE_NOTICE_HEADER));if(notice)postCustomerWriteNotice(target,notice,'browser');}catch{/* Preserve the original response parsing and primary error. */}
}
