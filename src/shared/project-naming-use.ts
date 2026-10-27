import type {Element} from './types';
import type {RootFeedbackApplicationCertificate} from './bazi-root-feedback-application';

export const PROJECT_NAMING_METHOD_ID='project-bazi-mainchain-145/1.3.1' as const;
export type NamingElementMethodSelection={
 methodId:typeof PROJECT_NAMING_METHOD_ID;
 entryPolicy:'month-branch-only'|'month-stem-proposal';
};

/** Generation-time record. A structurally valid record still requires replay of
 * its pinned engine, resource identity and candidate evaluation when read. */
export type ProjectNamingUseSnapshot={
 schema:'project-naming-use/1';
 selection:NamingElementMethodSelection;
 sourceRecipe:{
  schema:'naming-element-source-recipe/1';
  source:'project';
  namingRulesVersion:'naming-editorial-7.0.0'|'naming-editorial-7.1.0';
  applicationPolicyVersion:'naming-element-application/1.0.0';
 };
 engineCertificate:RootFeedbackApplicationCertificate;
 application:{
  policyId:'naming-element-application/1.0.0';
  status:'applied';
  primary:Element[];
  secondary:Element[];
  avoid:Element[];
  effectiveElements:Element[];
 };
};

function invalid(message:string):never{throw Object.assign(new Error(message),{code:'invalid-naming-element-selection'});}
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));}
function dataFields(value:Record<string,unknown>):void{
 for(const key of Reflect.ownKeys(value)){
  if(typeof key!=='string'||['__proto__','prototype','constructor'].includes(key))invalid('命名偏好不得含符号或原型污染字段。');
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)invalid('命名偏好只接受自身可枚举数据字段，不接受访问器或隐藏字段。');
 }
}

/** Read before manual selection. This validates intent; it does not authenticate an engine result. */
export function readNamingElementMethodSelection(preferences:unknown):NamingElementMethodSelection|undefined{
 if(!record(preferences))invalid('命名偏好必须是普通数据对象。');
 const descriptor=Object.getOwnPropertyDescriptor(preferences,'namingElementMethod');
 if(!descriptor){
  if('namingElementMethod' in preferences)invalid('命名方法不得来自继承属性。');
  dataFields(preferences);return undefined;
 }
 if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)invalid('命名方法必须是自身可枚举数据字段。');
 const selection:unknown=descriptor.value;
 if(!record(selection))invalid('显式命名方法不得为 undefined、null 或非普通数据对象。');
 const keys=Reflect.ownKeys(selection);
 if(keys.length!==2||!keys.includes('methodId')||!keys.includes('entryPolicy'))invalid('项目命名方法只允许 methodId 与 entryPolicy 两字段。');
 dataFields(selection);
 const method=Object.getOwnPropertyDescriptor(selection,'methodId')!.value;
 const policy=Object.getOwnPropertyDescriptor(selection,'entryPolicy')!.value;
 if(method!==PROJECT_NAMING_METHOD_ID)invalid('未知项目命名方法，本批仅支持明确登记的 1.3.1 取法。');
 if(policy!=='month-branch-only'&&policy!=='month-stem-proposal')invalid('未知项目命名入口策略。');
 // Unknown intent is rejected before a sibling manual-elements accessor could run.
 dataFields(preferences);
 return Object.freeze({methodId:method,entryPolicy:policy});
}
