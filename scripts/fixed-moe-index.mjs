import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {runInNewContext} from 'node:vm';
import {StringDecoder} from 'node:string_decoder';

const FIXED_GZIP_SHA='cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e';
const INDEX_VERSION='moe-title-index/3';
const freezeAtImport=Object.freeze;
const decoderWrite=StringDecoder.prototype.write;
const decoderEnd=StringDecoder.prototype.end;
// A private realm supplies independent postcondition/traversal primitives even
// when the caller replaced this realm's globals before importing the module.
const trusted=runInNewContext(`(() => {
 const {freeze,isFrozen,getOwnPropertyDescriptor,getPrototypeOf,setPrototypeOf}=Object;
 const {ownKeys,apply}=Reflect;
 return freeze({freeze,isFrozen,getOwnPropertyDescriptor,getPrototypeOf,setPrototypeOf,ownKeys,apply,parseJson:JSON.parse,isArray:Array.isArray,Array,Map,WeakMap});
})()`);
// Literal creation uses the host realm's intrinsic prototypes even when its
// global Object/Array bindings have been replaced before this import.
const hostObjectPrototype=trusted.getPrototypeOf({});
const hostArrayPrototype=trusted.getPrototypeOf([]);
const indexedRows=new trusted.WeakMap();
let cached;

function checkCapturedFreeze(){
 // Preserve fail-closed behavior for a broken pre-import freeze without ever
 // exposing decoded source data to that potentially altered host function.
 const arrayProbe=[],objectProbe={};
 freezeAtImport(arrayProbe);
 freezeAtImport(objectProbe);
 if(!trusted.isFrozen(arrayProbe)||!trusted.isFrozen(objectProbe))throw new Error('固定MOE原件未实际冻结，拒绝缓存');
}

function freezeJsonTree(root){
 const pending=new trusted.Array(root);
 let count=1;
 while(count){
  const value=pending[--count];
  pending.length=count;
  trusted.setPrototypeOf(value,trusted.isArray(value)?hostArrayPrototype:hostObjectPrototype);
  trusted.freeze(value);
  if(!trusted.isFrozen(value))throw new Error('固定MOE原件未实际冻结，拒绝缓存');
  // Traverse frozen data descriptors, including those of frozen parents.
  const keys=trusted.ownKeys(value);
  for(let index=0;index<keys.length;index++){
   const descriptor=trusted.getOwnPropertyDescriptor(value,keys[index]);
   if(!descriptor||!('value' in descriptor))throw new Error('固定MOE原件不是纯JSON数据');
   const child=descriptor.value;
   if(child&&typeof child==='object')pending[count++]=child;
  }
 }
 return root;
}

function buildTitleLookup(rows){
 const byTitle=new trusted.Map();
 const length=rows.length;
 for(let index=0;index<length;index++){
  const row=rows[index];
  byTitle.set(row.title,trusted.freeze({row,index}));
 }
 return trusted.freeze({get:title=>byTitle.get(title)});
}

export function loadFixedMoeRows(gzipBytes){
 const sha256=createHash('sha256').update(gzipBytes).digest('hex');
 if(sha256!==FIXED_GZIP_SHA)throw new Error('固定MOE原件摘要不一致');
 const key=INDEX_VERSION+':'+sha256;
 if(cached?.key===key)return cached.rows;
 checkCapturedFreeze();
 const decoder=new StringDecoder('utf8');
 const text=trusted.apply(decoderWrite,decoder,[gunzipSync(gzipBytes)])+trusted.apply(decoderEnd,decoder,[]);
 const rows=trusted.parseJson(text);
 if(!trusted.isArray(rows))throw new Error('固定MOE原件格式不符');
 freezeJsonTree(rows);
 indexedRows.set(rows,buildTitleLookup(rows));
 cached={key,rows};
 return rows;
}

export function moeTitleLookup(rawMoe){
 return indexedRows.get(rawMoe)??buildTitleLookup(rawMoe);
}
