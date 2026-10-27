import {canonicalPlainJson} from '../shared/plain-json';

export type RenDependencyState='met'|'not-met'|'unknown'|'conflict';
export type RenDependencyMode='complete-contract'|'necessary-only'|'sufficient-only';
export interface RenDependencyInput {
  id:string;
  /** Independent evidence for this proposition, never an assumed result of its own dependencies. */
  observed?:RenDependencyState;
  premises:string[];
  inhibitors:string[];
  /**
   * Default complete-contract requires an adopted, closed necessary AND sufficient contract.
   * Mere necessary conditions MUST use necessary-only: satisfying them cannot prove the result.
   * A sufficient-only rule can support its result; failing that rule cannot refute the result.
   */
  mode?:RenDependencyMode;
}
export interface RenDependencyResult {state:RenDependencyState;cycleDetected:boolean;}

const STATES:readonly string[]=['met','not-met','unknown','conflict'];
const MODES:readonly string[]=['complete-contract','necessary-only','sufficient-only'];
const MAX_NODES=4096,MAX_REFERENCES=65536;

/** Bound containers through descriptors before canonical JSON can enumerate or serialize their members. */
function boundedShape(input:readonly RenDependencyInput[]):void{
  const length=(value:unknown,maximum:number,message:string):number=>{
    if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new Error('任注依赖数组原型或字段无效。');
    const descriptor=Object.getOwnPropertyDescriptor(value,'length'),size=descriptor?.value;
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!Number.isSafeInteger(size)||size<0||size>maximum)throw new Error(message);
    return size;
  };
  const data=(value:object,key:string):unknown=>{
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('任注依赖不得包含空位、隐藏字段或访问器。');
    return descriptor.value;
  };
  const size=length(input,MAX_NODES,'任注依赖输入须为最多4096项的数组。');let references=0;
  for(let index=0;index<size;index++){
    const item=data(input,String(index));
    if(!item||typeof item!=='object'||Array.isArray(item)||![Object.prototype,null].includes(Object.getPrototypeOf(item)))throw new Error('任注依赖对象原型无效。');
    const keys=Reflect.ownKeys(item);
    if(keys.some(key=>typeof key!=='string'||!['id','observed','premises','inhibitors','mode'].includes(key)))throw new Error('任注依赖包含额外字段。');
    const id=data(item,'id');if(typeof id!=='string'||!id.trim()||id.length>2048)throw new Error('任注依赖编号无效。');
    for(const key of ['observed','mode']as const)if(keys.includes(key)){const value=data(item,key);if(typeof value!=='string'||!(key==='observed'?STATES:MODES).includes(value))throw new Error('任注依赖模式或状态无效。');}
    for(const key of ['premises','inhibitors']){
      const list=data(item,key),count=length(list,MAX_REFERENCES-references,'任注依赖引用超过65536项。');references+=count;
      for(let reference=0;reference<count;reference++){const value=data(list as string[],String(reference));if(typeof value!=='string'||!value.trim()||value.length>2048)throw new Error('任注依赖引用无效。');}
    }
  }
}

function checkedInput(input:readonly RenDependencyInput[]):Map<string,RenDependencyInput>{
  boundedShape(input);
  // The bounded descriptor pass prevents oversized reference arrays from reaching canonical traversal.
  canonicalPlainJson(input);
  const definitions=new Map<string,RenDependencyInput>();let references=0;
  for(const item of input){
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['id','observed','premises','inhibitors','mode'].includes(key))||typeof item.id!=='string'||!item.id.trim()||item.id.length>2048||!Array.isArray(item.premises)||!Array.isArray(item.inhibitors)||Object.hasOwn(item,'observed')&&!STATES.includes(item.observed!)||Object.hasOwn(item,'mode')&&!MODES.includes(item.mode!))throw new Error('任注依赖编号、字段、模式或状态无效。');
    if(definitions.has(item.id))throw new Error('任注依赖编号重复。');
    for(const list of [item.premises,item.inhibitors]){
      if(list.some((id:unknown)=>typeof id!=='string'||!id.trim())||new Set(list).size!==list.length)throw new Error('任注依赖引用无效或重复。');
      references+=list.length;
    }
    if(references>MAX_REFERENCES)throw new Error('任注依赖引用超过65536项。');
    definitions.set(item.id,item);
  }
  for(const item of definitions.values())for(const reference of [...item.premises,...item.inhibitors])if(!definitions.has(reference))throw new Error('任注依赖引用不存在。');
  return definitions;
}

/** Iterative strongly connected components avoid recursive stack limits and traversal-order artefacts. */
function cycleReachability(dependencies:number[][],dependents:number[][]):boolean[]{
  const visited=new Uint8Array(dependencies.length),order:number[]=[];
  for(let start=0;start<dependencies.length;start++){
    if(visited[start])continue;visited[start]=1;
    const stack:Array<{node:number;next:number}>=[{node:start,next:0}];
    while(stack.length){
      const current=stack[stack.length-1],next=dependencies[current.node][current.next++];
      if(next===undefined){order.push(current.node);stack.pop();}
      else if(!visited[next]){visited[next]=1;stack.push({node:next,next:0});}
    }
  }
  const assigned=new Uint8Array(dependencies.length),cyclic:boolean[]=Array(dependencies.length).fill(false);
  for(let index=order.length-1;index>=0;index--){
    const start=order[index];if(assigned[start])continue;assigned[start]=1;
    const component:number[]=[],stack=[start];
    while(stack.length){const node=stack.pop()!;component.push(node);for(const next of dependents[node])if(!assigned[next]){assigned[next]=1;stack.push(next);}}
    if(component.length>1||dependencies[start].includes(start))for(const node of component)cyclic[node]=true;
  }
  // A consumer of an unresolved cycle must retain that provenance even if independent evidence refutes it.
  const queue=cyclic.flatMap((value,index)=>value?[index]:[]);
  for(let index=0;index<queue.length;index++)for(const next of dependents[queue[index]])if(!cyclic[next]){cyclic[next]=true;queue.push(next);}
  return cyclic;
}

/**
 * Source-neutral evidence closure, independent from the frozen historical Ren calculators.
 * Each proposition accumulates independent support and refutation bits: neither=unknown, both=conflict.
 * A conjunction is supported only when every premise has support AND every inhibitor has refutation;
 * one refuted necessary premise or one supported inhibitor refutes a complete/necessary contract.
 * Unknown never means absent. Conflicting evidence is retained, with no majority vote or explosion.
 * No empty rule or unseeded positive/negative cycle supplies its own evidence.
 */
export function resolveRenDependencies(input:readonly RenDependencyInput[]):Record<string,RenDependencyResult>{
  const definitions=checkedInput(input),items=[...definitions.values()],indices=new Map(items.map((item,index)=>[item.id,index]));
  const premises=items.map(item=>item.premises.map(id=>indices.get(id)!)),inhibitors=items.map(item=>item.inhibitors.map(id=>indices.get(id)!));
  const dependencies=items.map((_,index)=>[...premises[index],...inhibitors[index]]),dependents:number[][]=items.map(()=>[]);
  dependencies.forEach((references,index)=>{for(const reference of references)dependents[reference].push(index);});
  const cycles=cycleReachability(dependencies,dependents);
  const support=items.map(item=>item.observed==='met'||item.observed==='conflict');
  const refutation=items.map(item=>item.observed==='not-met'||item.observed==='conflict');
  const queue=items.map((_,index)=>index),queued=items.map(()=>true);
  for(let cursor=0;cursor<queue.length;cursor++){
    const index=queue[cursor],item=items[index];queued[index]=false;
    if(!dependencies[index].length)continue;
    const mode=item.mode??'complete-contract';let changed=false;
    if(mode!=='necessary-only'&&!support[index]&&premises[index].every(reference=>support[reference])&&inhibitors[index].every(reference=>refutation[reference])){support[index]=true;changed=true;}
    if(mode!=='sufficient-only'&&!refutation[index]&&(premises[index].some(reference=>refutation[reference])||inhibitors[index].some(reference=>support[reference]))){refutation[index]=true;changed=true;}
    if(changed)for(const dependent of dependents[index])if(!queued[dependent]){queued[dependent]=true;queue.push(dependent);}
  }
  return Object.fromEntries(items.map((item,index)=>[item.id,{state:support[index]?(refutation[index]?'conflict':'met'):(refutation[index]?'not-met':'unknown'),cycleDetected:cycles[index]}]));
}
