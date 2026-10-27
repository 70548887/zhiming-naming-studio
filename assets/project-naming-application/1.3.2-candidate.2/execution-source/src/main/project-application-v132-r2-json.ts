import {types} from 'node:util';

const MAX_DEPTH=100,MAX_NODES=1_000_000,MAX_ARRAY_LENGTH=100_000,MAX_TEXT=8_000_000;
const invalid=(detail:string):never=>{throw Error('PROJECT_APPLICATION_INPUT_INVALID: '+detail);};

/** Copy only data descriptors into a detached frozen tree. Proxy detection is
 * the first operation on every object, including nested and revoked proxies.
 * No ordinary Get, getter, toJSON, caller iterator or serialization hook runs.
 */
export function snapshotApplicationJson(value:unknown):unknown {
 const ancestors=new WeakSet<object>();let nodes=0,text=0;
 function copy(input:unknown,depth:number):unknown {
  if(depth>MAX_DEPTH||++nodes>MAX_NODES)return invalid('JSON tree exceeds the fixed depth or node limit');
  if(input===null||typeof input==='boolean')return input;
  if(typeof input==='string'){text+=input.length;if(text>MAX_TEXT)return invalid('JSON text exceeds the fixed limit');return input;}
  if(typeof input==='number'){if(!Number.isFinite(input))return invalid('non-finite JSON number');return input;}
  if(typeof input!=='object')return invalid('only ordinary JSON data is accepted');
  if(types.isProxy(input))return invalid('Proxy objects, including nested or revoked proxies, are rejected');
  if(ancestors.has(input))return invalid('circular JSON data');
  const array=Array.isArray(input),prototype=Object.getPrototypeOf(input);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)return invalid('custom JSON prototypes are rejected');
  const keys=Reflect.ownKeys(input);
  if(keys.some(key=>typeof key!=='string'))return invalid('symbol JSON fields are rejected');
  ancestors.add(input);
  let output:unknown;
  if(array){
   const descriptor=Object.getOwnPropertyDescriptor(input,'length');
   if(!descriptor||!Object.hasOwn(descriptor,'value'))return invalid('array length is not a data descriptor');
   const length=descriptor.value;
   if(!Number.isSafeInteger(length)||length<0||length>MAX_ARRAY_LENGTH||keys.length!==length+1)return invalid('array is sparse, oversized or has extra fields');
   const result:unknown[]=[];
   for(let index=0;index<length;index++){
    const row=Object.getOwnPropertyDescriptor(input,String(index));
    if(!row||!Object.hasOwn(row,'value')||!row.enumerable)return invalid('array contains a hole, accessor or hidden field');
    result.push(copy(row.value,depth+1));
   }
   output=result;
  }else{
   const result:Record<string,unknown>={};
   for(const key of keys as string[]){
    text+=key.length;if(text>MAX_TEXT)return invalid('JSON text exceeds the fixed limit');
    const row=Object.getOwnPropertyDescriptor(input,key);
    if(!row||!Object.hasOwn(row,'value')||!row.enumerable)return invalid('object contains an accessor or hidden field');
    // defineProperty keeps special names such as __proto__ as inert data.
    Object.defineProperty(result,key,{value:copy(row.value,depth+1),enumerable:true,writable:false,configurable:false});
   }
   output=result;
  }
  ancestors.delete(input);return Object.freeze(output);
 }
 return copy(value,0);
}
