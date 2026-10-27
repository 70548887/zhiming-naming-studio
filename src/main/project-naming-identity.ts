import {isDeepStrictEqual} from 'node:util';
import {hasProjectNamingUseFootprint} from './verify-project-naming-use';

type OwnValue={present:false}|{present:true;value:unknown};
function own(value:unknown,key:string):OwnValue {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('项目命名身份必须使用普通数据对象。');
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 if(!descriptor){if(key in value)throw new Error('项目命名身份不得来自继承属性。');return {present:false};}
 if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('项目命名身份不得使用访问器或隐藏字段。');
 return {present:true,value:descriptor.value};
}
/** Preserve optional-own-undefined identity while inspecting descriptors before
 * deep comparison. A rejected object must never execute a supplied getter. */
function assertDataTree(value:unknown,seen:Set<object>,budget:{remaining:number}):void {
 if(--budget.remaining<0)throw new Error('项目命名身份结构过大。');
 if(value===null||['undefined','string','boolean'].includes(typeof value))return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('项目命名身份含无效数值。');return;}
 if(typeof value!=='object'||seen.has(value))throw new Error('项目命名身份含循环或非数据值。');
 if(Array.isArray(value)?Object.getPrototypeOf(value)!==Array.prototype:![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('项目命名身份含非普通数据对象。');
 seen.add(value);
 try{for(const key of Reflect.ownKeys(value)){
  if(Array.isArray(value)&&key==='length')continue;
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('项目命名身份含访问器、符号或隐藏字段。');
  assertDataTree(descriptor.value,seen,budget);
 }}finally{seen.delete(value);}
}
/** Run before serializers, size budgets or feature-specific readers. A direct
 * main-process input with accessors must be rejected without evaluating them.
 * Historical optional own-undefined values remain supported. */
export function assertProjectNamingUseInput(value:unknown):void {
 if(hasProjectNamingUseFootprint(value))assertDataTree(value,new Set(),{remaining:200000});
}
function identity(session:unknown){
 const fixed=Object.fromEntries(['profile','profileId','analysis','sourceSnapshot','dataVersion','namingRules','originalFavorable'].map(key=>[key,own(session,key)]));
 const preferences=own(session,'preferences');
 const selection=preferences.present?own(preferences.value,'namingElementMethod'):{present:false} as OwnValue;
 const candidates=own(session,'candidates');
 if(!candidates.present||!Array.isArray(candidates.value))throw new Error('项目命名候选身份缺失。');
 assertDataTree(candidates.value,new Set(),{remaining:200000});
 const evaluations=candidates.value.map(candidate=>Object.fromEntries(['id','givenName','fullName','evaluation'].map(key=>[key,own(candidate,key)])));
 // Review-time manual choices are a draft for future generation. The frozen
 // profile.namingPreferences and computed evaluation stay in fixed identity.
 const value={fixed,selection,evaluations};assertDataTree(value,new Set(),{remaining:200000});return value;
}
/** Call before Service replaces any incoming immutable field, and at Store
 * write/history boundaries. This prevents deleting every project footprint to
 * turn an existing project session into an apparently legacy session. */
export function assertUnchangedProjectNamingUse(previous:unknown,next:unknown):void {
 const before=hasProjectNamingUseFootprint(previous),after=hasProjectNamingUseFootprint(next);
 if(!before&&!after)return;
 if(before!==after||!isDeepStrictEqual(identity(previous),identity(next)))throw new Error('项目命名的生成资料、采用记录、方法或来源不得通过审阅及历史恢复改变；请重新生成方案。');
}
