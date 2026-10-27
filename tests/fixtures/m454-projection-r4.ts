/** Exact private projection declarations extracted from R4 main.
 * Pure calculation only: no Store issuer, source verifier or caller authority. */
import {types as nodeTypes} from 'node:util';
const replayOwnDescriptor=Object.getOwnPropertyDescriptor,replayPrototype=Object.getPrototypeOf,replayHasOwn=Object.hasOwn;
const replayOwnNames=Object.getOwnPropertyNames,replayOwnSymbols=Object.getOwnPropertySymbols,replayIsProxy=nodeTypes.isProxy,replayIsMap=nodeTypes.isMap;
function replayOwnKeys(value:object):(string|symbol)[]{const names=replayOwnNames(value),symbols=replayOwnSymbols(value),keys:(string|symbol)[]=replayPrivateArray();for(let i=0;i<names.length;i++)replayAppend(keys,names[i]);for(let i=0;i<symbols.length;i++)replayAppend(keys,symbols[i]);return keys;}

/** Inspect raw live dependencies without invoking a Proxy/accessor or trusting a marker. */
class CitationReplayIneligible extends Error {}
// Trusted bootstrap roots are supplied by the production realm: Object's
// descriptor/prototype primitives and Function call/apply/bind/toString.
// Reflect.apply is never a bootstrap dependency or a later invocation bridge.
const replayCall=Function.prototype.call,replayFunctionApply=Function.prototype.apply,replayBind=Function.prototype.bind;
const replayApply=replayBind.call(replayCall,replayFunctionApply),replayFunctionSource=replayBind.call(replayCall,Function.prototype.toString);
type ReplayIntrinsicSlot={owner:object;key:PropertyKey;descriptor:PropertyDescriptor};
const replayDefineDescriptor=replayOwnDescriptor(Object,'defineProperty'),replayCreateDescriptor=replayOwnDescriptor(Object,'create'),replaySetPrototypeDescriptor=replayOwnDescriptor(Object,'setPrototypeOf');
const replayDefine=replayDefineDescriptor&&replayHasOwn(replayDefineDescriptor,'value')?replayDefineDescriptor.value as typeof Object.defineProperty:undefined;
const replayCreate=replayCreateDescriptor&&replayHasOwn(replayCreateDescriptor,'value')?replayCreateDescriptor.value as typeof Object.create:undefined;
const replaySetObjectPrototype=replaySetPrototypeDescriptor&&replayHasOwn(replaySetPrototypeDescriptor,'value')?replaySetPrototypeDescriptor.value as typeof Object.setPrototypeOf:undefined;
const replayWriteReady=replayNativeFunction(replayDefine,'defineProperty')&&replayNativeFunction(replayCreate,'create')&&replayNativeFunction(replaySetObjectPrototype,'setPrototypeOf');
let replayCaptureValid=replayWriteReady;
const replaySlots:ReplayIntrinsicSlot[]=replayPrivateArray();
function replayNativeFunction(value:unknown,name:string):boolean {
 if(typeof value!=='function'||replayIsProxy(value))return false;
 return replayFunctionSource(value)==='function '+name+'() { [native code] }';
}
/** Only fresh internal growth arrays lose their prototype; inputs are untouched. */
function replayPrivateArray<T>():T[] {
 const rows:T[]=[];
 if(replayWriteReady)replaySetObjectPrototype!(rows,null);
 return rows;
}
/** A private null-prototype Array has no inherited numeric setter or push. */
function replayAppend<T>(rows:T[],value:T):void {
 if(!replayWriteReady){replayCaptureValid=false;return;}
 rows[rows.length]=value;
}
function replayRemember(owner:object,key:PropertyKey,descriptor:PropertyDescriptor):void {replayAppend(replaySlots,{owner,key,descriptor});}
function replayDataSlot(owner:unknown,key:PropertyKey,nativeName?:string):unknown {
 if((typeof owner!=='object'&&typeof owner!=='function')||owner===null||replayIsProxy(owner)){replayCaptureValid=false;return undefined;}
 const descriptor=replayOwnDescriptor(owner,key);
 if(!descriptor||!replayHasOwn(descriptor,'value')||(nativeName!==undefined&&!replayNativeFunction(descriptor.value,nativeName))){replayCaptureValid=false;return undefined;}
 replayRemember(owner,key,descriptor);return descriptor.value;
}
function replayGlobal(name:string,nativeName?:string):unknown {return replayDataSlot(globalThis,name,nativeName);}
const replayObject=replayGlobal('Object','Object'),replayFunction=replayGlobal('Function','Function');
const replayArrayConstructor=replayGlobal('Array','Array') as typeof Array|undefined;
const replayMapConstructor=replayGlobal('Map','Map') as typeof Map|undefined;
const replaySetConstructor=replayGlobal('Set','Set') as typeof Set|undefined;
const replayWeakMapConstructor=replayGlobal('WeakMap','WeakMap') as typeof WeakMap|undefined;
const replayStringConstructor=replayGlobal('String','String');
const replayNumber=replayGlobal('Number','Number'),replayRegExp=replayGlobal('RegExp','RegExp');
replayGlobal('Uint8Array','Uint8Array');
const replayArrayPrototype=replayDataSlot(replayArrayConstructor,'prototype');
const replayMapPrototype=replayDataSlot(replayMapConstructor,'prototype');
const replaySetPrototype=replayDataSlot(replaySetConstructor,'prototype');
const replayWeakMapPrototype=replayDataSlot(replayWeakMapConstructor,'prototype');
const replayStringPrototype=replayDataSlot(replayStringConstructor,'prototype');
const replayRegExpPrototype=replayDataSlot(replayRegExp,'prototype');
const replayObjectPrototype=replayDataSlot(replayObject,'prototype'),replayFunctionPrototype=replayDataSlot(replayFunction,'prototype');
function replayMethods(owner:unknown,names:readonly string[]):void {for(let i=0;i<names.length;i++)replayDataSlot(owner,names[i],names[i]);}
// This list follows only admission, fresh rule validators, gate construction,
// owned initial selection and disposal. It does not rewrite public evaluators.
replayMethods(replayObject,['keys','values','entries','fromEntries','freeze','getOwnPropertyDescriptor','getOwnPropertyDescriptors','getOwnPropertyNames','getOwnPropertySymbols','getPrototypeOf','hasOwn','create','defineProperty','setPrototypeOf']);
replayMethods(replayArrayConstructor,['isArray']);
replayMethods(replayArrayPrototype,['map','find','filter','some','every','flatMap','includes','slice','sort','join','push','entries','values']);
replayMethods(replayMapPrototype,['get','set','has','delete','clear','entries','keys','values','forEach']);
replayMethods(replaySetPrototype,['has','add','delete','clear','values']);
replayMethods(replayWeakMapPrototype,['get','set','has','delete']);
replayMethods(replayStringPrototype,['includes','startsWith','slice','split','trim','trimStart']);
replayMethods(replayNumber,['isFinite','isInteger','isSafeInteger']);
replayMethods(replayRegExpPrototype,['test','exec']);
replayMethods(replayGlobal('Reflect'),['ownKeys']);
replayDataSlot(replayArrayPrototype,'constructor','Array');
function replayArraySpecies():void {
 if(!replayArrayConstructor)return;
 const descriptor=replayOwnDescriptor(replayArrayConstructor,Symbol.species);
 if(!descriptor||!replayHasOwn(descriptor,'get')||!replayHasOwn(descriptor,'set')||!replayNativeFunction(descriptor.get,'get [Symbol.species]')||descriptor.set!==undefined){replayCaptureValid=false;return;}
 replayRemember(replayArrayConstructor,Symbol.species,descriptor);
}
replayArraySpecies();
function replaySizeGetter(owner:unknown):void {
 if(!owner||typeof owner!=='object'||replayIsProxy(owner)){replayCaptureValid=false;return;}
 const descriptor=replayOwnDescriptor(owner,'size');
 if(!descriptor||!replayHasOwn(descriptor,'get')||!replayHasOwn(descriptor,'set')||descriptor.set!==undefined||!replayNativeFunction(descriptor.get,'get size')){replayCaptureValid=false;return;}
 replayRemember(owner,'size',descriptor);
}
replaySizeGetter(replayMapPrototype);replaySizeGetter(replaySetPrototype);
const replayArrayValues=replayDataSlot(replayArrayPrototype,Symbol.iterator,'values');
const replayMapEntries=replayDataSlot(replayMapPrototype,Symbol.iterator,'entries');
const replaySetValues=replayDataSlot(replaySetPrototype,Symbol.iterator,'values');
const replayStringIterator=replayDataSlot(replayStringPrototype,Symbol.iterator,'[Symbol.iterator]');
const replayMapForEach=replayDataSlot(replayMapPrototype,'forEach','forEach') as Map<unknown,unknown>['forEach']|undefined;
const replayArrayIsArray=replayDataSlot(replayArrayConstructor,'isArray','isArray') as typeof Array.isArray|undefined;
const replayNumberIsFinite=replayDataSlot(replayNumber,'isFinite','isFinite') as typeof Number.isFinite|undefined;
const replayPrototypeEdges:Array<{owner:object;prototype:object|null}>=replayPrivateArray();
const replayAbsentReturnOwners:object[]=replayPrivateArray();
function replayAbsentReturn(owner:object):void {
 if(replayOwnDescriptor(owner,'return')){replayCaptureValid=false;return;}
 replayAppend(replayAbsentReturnOwners,owner);
}
function replayRememberPrototype(owner:unknown):object|null|undefined {
 if((typeof owner!=='object'&&typeof owner!=='function')||owner===null||replayIsProxy(owner)){replayCaptureValid=false;return undefined;}
 const prototype=replayPrototype(owner);if(prototype!==null&&replayIsProxy(prototype)){replayCaptureValid=false;return undefined;}
 replayAppend(replayPrototypeEdges,{owner,prototype});return prototype;
}
function replayRememberIterator(iterator:unknown):void {
 const prototype=replayRememberPrototype(iterator);if(!prototype){replayCaptureValid=false;return;}
 replayDataSlot(prototype,'next','next');replayAbsentReturn(prototype);
 const parent=replayRememberPrototype(prototype);if(!parent){replayCaptureValid=false;return;}
 replayDataSlot(parent,Symbol.iterator,'[Symbol.iterator]');replayAbsentReturn(parent);
 let ancestor=replayRememberPrototype(parent);
 while(ancestor){replayAbsentReturn(ancestor);ancestor=replayRememberPrototype(ancestor);}
}
function replayFirstIteratorValue(method:unknown,receiver:object):{done:unknown;value:unknown}|undefined {
 const iterator=replayApply(method,receiver,[]);
 if(!iterator||typeof iterator!=='object'||replayIsProxy(iterator))return undefined;
 const prototype=replayPrototype(iterator);if(!prototype||replayIsProxy(prototype))return undefined;
 const next=replayDataSlot(prototype,'next','next');if(!replayCaptureValid)return undefined;
 const result=replayApply(next,iterator,[]);
 if(!result||typeof result!=='object'||replayIsProxy(result))return undefined;
 const done=replayOwnDescriptor(result,'done'),value=replayOwnDescriptor(result,'value');
 return done&&value&&replayHasOwn(done,'value')&&replayHasOwn(value,'value')?{done:done.value,value:value.value}:undefined;
}
// No unknown constructor or method is invoked while collecting iterator slots.
// Unsupported pre-import bindings leave the private route ineligible.
if(replayCaptureValid&&replayMapConstructor&&replaySetConstructor){
 try{
  const probe=new replayMapConstructor(),key={__proto__:null},value='owned-map-native-receiver-probe';
  const lengthDescriptor=replayCreate!(null) as PropertyDescriptor;lengthDescriptor.value=0;lengthDescriptor.writable=false;lengthDescriptor.enumerable=false;lengthDescriptor.configurable=false;
  replayDefine!(probe,'length',lengthDescriptor);
  const set=replayDataSlot(replayMapPrototype,'set','set'),get=replayDataSlot(replayMapPrototype,'get','get'),has=replayDataSlot(replayMapPrototype,'has','has'),remove=replayDataSlot(replayMapPrototype,'delete','delete');
  if(!replayCaptureValid||replayApply(set,probe,[key,value])!==probe||replayApply(get,probe,[key])!==value||replayApply(has,probe,[key])!==true)replayCaptureValid=false;
  let count=0,exact=true;
  if(replayCaptureValid)replayApply(replayMapForEach,probe,[(actual:unknown,actualKey:unknown,receiver:unknown)=>{count++;if(actual!==value||actualKey!==key||receiver!==probe)exact=false;}]);
  if(count!==1||!exact)replayCaptureValid=false;
  if(replayCaptureValid){
   const entry=replayFirstIteratorValue(replayMapEntries,probe),keys=replayFirstIteratorValue(replayDataSlot(replayMapPrototype,'keys','keys'),probe),values=replayFirstIteratorValue(replayDataSlot(replayMapPrototype,'values','values'),probe);
   const pair=entry?.value;
   if(!entry||entry.done!==false||!replayArrayIsArray!(pair)||pair.length!==2||pair[0]!==key||pair[1]!==value||!keys||keys.done!==false||keys.value!==key||!values||values.done!==false||values.value!==value)replayCaptureValid=false;
   const setProbe=new replaySetConstructor();replayDefine!(setProbe,'length',lengthDescriptor);
   if(replayApply(replayDataSlot(replaySetPrototype,'add','add'),setProbe,[key])!==setProbe||replayApply(replayDataSlot(replaySetPrototype,'has','has'),setProbe,[key])!==true)replayCaptureValid=false;
   const setValue=replayFirstIteratorValue(replaySetValues,setProbe);if(!setValue||setValue.done!==false||setValue.value!==key)replayCaptureValid=false;
  }
  if(replayApply(remove,probe,[key])!==true)replayCaptureValid=false;
  replayRememberIterator(replayApply(replayArrayValues,[],[]));
  replayRememberIterator(replayApply(replayStringIterator,'',[]));
  replayRememberIterator(replayApply(replayMapEntries,new replayMapConstructor(),[]));
  replayRememberIterator(replayApply(replaySetValues,new replaySetConstructor(),[]));
 }catch{replayCaptureValid=false;}
}
const replayPrototypeRoots=[replayObjectPrototype,replayFunctionPrototype,replayArrayPrototype,replayMapPrototype,replaySetPrototype,replayWeakMapPrototype,replayStringPrototype,replayRegExpPrototype];
for(let i=0;i<replayPrototypeRoots.length;i++)replayRememberPrototype(replayPrototypeRoots[i]);
// structuredClone is a platform JavaScript wrapper in supported Node releases.
// Its separately stated initial platform binding is checked by identity; it is
// never described as a native function or authenticated by compacted source.
const replayStructuredClone=replayGlobal('structuredClone');
const replayStructuredCloneDescriptor=replayOwnDescriptor(globalThis,'structuredClone');
const replayStructuredCloneReady=typeof replayStructuredClone==='function'&&!replayIsProxy(replayStructuredClone);
if(!replayStructuredCloneReady)replayCaptureValid=false;
function replayPlatformCloneIntact():boolean {
 const current=replayOwnDescriptor(globalThis,'structuredClone');
 return !!current&&!!replayStructuredCloneDescriptor&&replayHasOwn(current,'value')&&current.value===replayStructuredClone&&replayDescriptorEqual(replayStructuredCloneDescriptor,current);
}
function assertReplayPlatformCloneUnchanged():void {
 if(replayStructuredCloneReady&&!replayPlatformCloneIntact())throw new Error('固定命名引文的启动平台克隆绑定发生变化。');
}
function replayDescriptorEqual(a:PropertyDescriptor,b:PropertyDescriptor):boolean {
 const fields=['value','get','set','writable','enumerable','configurable'] as const;
 for(let i=0;i<fields.length;i++){
  const key=fields[i],ownA=replayHasOwn(a,key),ownB=replayHasOwn(b,key);
  if(ownA!==ownB||ownA&&a[key]!==b[key])return false;
 }
 return true;
}
function replayAdmissionIntrinsicsIntact():boolean {
 if(!replayCaptureValid)return false;
 for(let i=0;i<replaySlots.length;i++){
  const slot=replaySlots[i];if(replayIsProxy(slot.owner))return false;
  const current=replayOwnDescriptor(slot.owner,slot.key);
  if(!current||!replayDescriptorEqual(slot.descriptor,current))return false;
 }
 for(let i=0;i<replayPrototypeEdges.length;i++){
  const edge=replayPrototypeEdges[i];if(replayIsProxy(edge.owner)||replayPrototype(edge.owner)!==edge.prototype)return false;
 }
 for(let i=0;i<replayAbsentReturnOwners.length;i++)if(replayOwnDescriptor(replayAbsentReturnOwners[i],'return'))return false;
 return true;
}
function replayWeakMapIntrinsicsIntact():boolean {return replayAdmissionIntrinsicsIntact();}
function replayMapIntrinsicsIntact():boolean {return replayAdmissionIntrinsicsIntact();}

function dependencyValue(value:unknown,seen:object[]=replayPrivateArray(),depth=0):unknown {
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&replayNumberIsFinite!(value))return value;
 if(typeof value!=='object'||depth>70||replayIsProxy(value))throw new CitationReplayIneligible();
 for(let i=0;i<seen.length;i++)if(seen[i]===value)throw new CitationReplayIneligible();
 const prototype=replayPrototype(value);replayAppend(seen,value);
 try{
  if(prototype===replayMapPrototype){
   if(!replayIsMap(value))throw new CitationReplayIneligible();
   if(replayOwnKeys(value).length)throw new CitationReplayIneligible();
   if(!replayMapIntrinsicsIntact()||!replayMapForEach)throw new CitationReplayIneligible();
   const entries:unknown[]=replayPrivateArray();
   // The captured native intrinsic reads the real Map's slots. No current
   // entries/iterator/next method or caller-supplied projection is invoked.
   replayApply(replayMapForEach,value,[(item:unknown,key:unknown)=>{replayAppend(entries,[dependencyValue(key,seen,depth+1),dependencyValue(item,seen,depth+1)]);}]);
   return {mapEntries:entries};
  }
  if(replayArrayIsArray!(value)){
   if(prototype!==replayArrayPrototype||replayOwnKeys(value).length!==value.length+1)throw new CitationReplayIneligible();
   const rows:unknown[]=replayPrivateArray();
   for(let index=0;index<value.length;index++){const descriptor=replayOwnDescriptor(value,''+index);if(!descriptor||!replayHasOwn(descriptor,'value')||!descriptor.enumerable)throw new CitationReplayIneligible();replayAppend(rows,dependencyValue(descriptor.value,seen,depth+1));}
   return rows;
  }
  if(prototype!==Object.prototype&&prototype!==null)throw new CitationReplayIneligible();
  const output:Record<string,unknown>=replayCreate!(null);
  const keys=replayOwnKeys(value);
  for(let i=0;i<keys.length;i++){
   const key=keys[i];
   const descriptor=replayOwnDescriptor(value,key);
   if(typeof key!=='string'||!descriptor||!replayHasOwn(descriptor,'value')||!descriptor.enumerable)throw new CitationReplayIneligible();
   output[key]=dependencyValue(descriptor.value,seen,depth+1);
  }
  return output;
 }finally{seen.length=seen.length-1;}
}

export {dependencyValue as projectCitationDependencies,replayAdmissionIntrinsicsIntact as projectionIntrinsicsIntact,CitationReplayIneligible};
export const actualMainSHA256='3c6190d549c5fd03b97d7776674475f1fc086c3b7a2380569c45edd9096552c9';
export const actualProjectionRegionSHA256='b02407f77f0c25f0ccff175206061103cf5dc6217a8d2ecd2f2d50d99f023020';
