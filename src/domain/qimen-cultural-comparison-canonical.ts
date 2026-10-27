import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {CULTURAL_CANONICAL_ALGORITHM,LEGACY_CHART_DIGEST_ALGORITHM} from '../shared/qimen-cultural-comparison';
import type {CulturalChartDigestAlgorithm} from '../shared/qimen-cultural-comparison';
import {CULTURAL_JSON_LIMITS} from '../shared/qimen-cultural-comparison-rules';

const invalid=():never=>{throw Error('CULTURAL_JSON_INVALID: bounded ordinary data descriptors required');};
/** Deterministic main-process utility: no I/O, clock, randomness or source admission.
 * Capture before any Get; Proxy detection precedes prototype/descriptor reflection.
 */
export function ownCulturalJson<T=unknown>(value:unknown):T {
 const ancestors=new WeakSet<object>();let nodes=0,text=0;
 function copy(input:unknown,depth:number):unknown{
  if(depth>CULTURAL_JSON_LIMITS.maxDepth||++nodes>CULTURAL_JSON_LIMITS.maxNodes)return invalid();
  if(input===null||typeof input==='boolean')return input;
  if(typeof input==='number'){if(!Number.isFinite(input)||Object.is(input,-0))return invalid();return input;}
  if(typeof input==='string'){text+=input.length;if(text>CULTURAL_JSON_LIMITS.maxTextCodeUnits)return invalid();return input;}
  if(!input||typeof input!=='object'||types.isProxy(input)||ancestors.has(input))return invalid();
  const array=Array.isArray(input),proto=Object.getPrototypeOf(input);
  if(array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)return invalid();
  const keys=Reflect.ownKeys(input);if(keys.some(key=>typeof key!=='string'))return invalid();
  ancestors.add(input);let result:unknown;
  if(array){
   const length=Object.getOwnPropertyDescriptor(input,'length');
   if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0||length.value>CULTURAL_JSON_LIMITS.maxArrayLength||keys.length!==length.value+1)return invalid();
   const rows:unknown[]=[];
   for(let index=0;index<length.value;index++){
    const descriptor=Object.getOwnPropertyDescriptor(input,String(index));
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)return invalid();
    rows.push(copy(descriptor.value,depth+1));
   }
   result=rows;
  }else{
   const rows:Record<string,unknown>={};
   for(const key of keys as string[]){
    text+=key.length;if(text>CULTURAL_JSON_LIMITS.maxTextCodeUnits)return invalid();
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)return invalid();
    Object.defineProperty(rows,key,{value:copy(descriptor.value,depth+1),enumerable:true,writable:false,configurable:false});
   }
   result=rows;
  }
  ancestors.delete(input);return Object.freeze(result);
 }
 return copy(value,0) as T;
}
function tokens(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(tokens).join(',')+']';
 // Emit key/value tokens directly. Rebuilding an object would reorder 10/2.
 return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+tokens((value as Record<string,unknown>)[key])).join(',')+'}';
}
export function culturalCanonicalJson(value:unknown):string{return tokens(ownCulturalJson(value));}
export function culturalCanonicalDigest(value:unknown):string{return createHash('sha256').update(culturalCanonicalJson(value),'utf8').digest('hex');}
export function culturalChartDigest(qimen:unknown,algorithm:CulturalChartDigestAlgorithm):{algorithm:CulturalChartDigestAlgorithm;digest:string}{
 const owned=ownCulturalJson(qimen);
 if(algorithm!==LEGACY_CHART_DIGEST_ALGORITHM&&algorithm!==CULTURAL_CANONICAL_ALGORITHM)throw Error('CULTURAL_DIGEST_UNSUPPORTED');
 const text=algorithm===LEGACY_CHART_DIGEST_ALGORITHM?JSON.stringify(owned):tokens(owned);
 return{algorithm,digest:createHash('sha256').update(text,'utf8').digest('hex')};
}
