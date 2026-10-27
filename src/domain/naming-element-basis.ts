import type {Analysis,Element,NamingPreferences} from '../shared/types';
import {assertPlainJson} from './naming-review-v7.mjs';
import {readNamingElementMethodSelection,type NamingElementMethodSelection} from '../shared/project-naming-use';
import {NAMING_ELEMENT_APPLICATION_POLICY} from '../shared/naming-element-application';

/** Internal main-process resolution. This is not an IPC certificate or a saved fact. */
export type ResolvedNamingBasis=
 |{source:'manual'|'legacy';elements:readonly Element[]}
 |{source:'project';elements:readonly Element[];selection:NamingElementMethodSelection;applicationPolicyVersion:typeof NAMING_ELEMENT_APPLICATION_POLICY};

export class NamingElementBasisError extends Error {
 readonly name='NamingElementBasisError';
 constructor(readonly code:'invalid-resolved-basis'|'missing-resolved-basis'|'manual-project-conflict'|'resolved-basis-mismatch'|'unsupported-tuple',message:string){super(message);}
}
const elements:readonly Element[]=['木','火','土','金','水'];
const applicationPolicyVersion=NAMING_ELEMENT_APPLICATION_POLICY;
function invalid(message:string):never {throw new NamingElementBasisError('invalid-resolved-basis',message);}
function ownData(value:unknown,key:string):unknown{
 if(value===null||typeof value!=='object'||Array.isArray(value))invalid('命名有效五行的输入必须是数据记录。');
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)invalid(`命名有效五行输入 ${key} 必须是显式数据字段。`);
 return descriptor.value;
}
function exactRecord(value:unknown,keys:readonly string[]):value is Record<string,unknown>{
 if(value===null||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
 try{assertPlainJson(value);}catch{return false;}
 return Reflect.ownKeys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
}
function checkedElements(value:unknown,project=false):readonly Element[]{
 try{assertPlainJson(value);}catch{invalid('命名有效五行必须是普通 JSON 数组。');}
 if(!Array.isArray(value)||value.some(item=>!elements.includes(item)))invalid('命名有效五行含未知值。');
 if(project&&(!value.length||new Set(value).size!==value.length||value.join('|')!==elements.filter(element=>value.includes(element)).join('|')))invalid('项目命名有效五行必须非空，并按木火土金水顺序去重。');
 return Object.freeze([...value]) as readonly Element[];
}
/** One shared intent reader; this wrapper only translates its error category for AI propagation. */
function checkedSelection(pref:NamingPreferences):NamingElementMethodSelection|undefined{
 try{return readNamingElementMethodSelection(pref);}catch(error){throw new NamingElementBasisError('invalid-resolved-basis',error instanceof Error?error.message:'命名方法选择无效。');}
}
function sameElements(a:readonly Element[],b:readonly Element[]):boolean{return a.length===b.length&&a.every((element,index)=>element===b[index]);}

/** Validate before any shortlist, AI transport or candidate work; copy/freeze once for async use. */
export function getNamingElementBasis(pref:NamingPreferences,analysis:Analysis,basis?:ResolvedNamingBasis):ResolvedNamingBasis{
 const selected=checkedSelection(pref);
 const manual=checkedElements(ownData(pref,'preferredElements'));
 const legacyElements=()=>checkedElements(ownData(ownData(analysis,'bazi'),'favorable'));
 if(selected&&manual.length)throw new NamingElementBasisError('manual-project-conflict','项目命名方法与客户人工五行选择冲突。');
 if(basis===undefined){
  if(selected)throw new NamingElementBasisError('missing-resolved-basis','项目命名请求缺少主进程已经严格解析的有效五行。');
  return Object.freeze({source:manual.length?'manual':'legacy',elements:manual.length?manual:legacyElements()});
 }
 if(!exactRecord(basis,['source','elements'])&&!exactRecord(basis,['source','elements','selection','applicationPolicyVersion']))invalid('命名 resolved basis 字段无效。');
 const value=basis as ResolvedNamingBasis;
 if(!['manual','legacy','project'].includes(value.source))invalid('未知的命名 resolved basis 来源。');
 if((value.source==='project')!==(Object.keys(value).length===4))invalid('命名 resolved basis 来源与字段不一致。');
 const resolvedElements=checkedElements(value.elements,value.source==='project');
 if(value.source==='project'){
  if(!selected||!exactRecord(value.selection,['methodId','entryPolicy'])||value.selection.methodId!==selected.methodId||value.selection.entryPolicy!==selected.entryPolicy||value.applicationPolicyVersion!==applicationPolicyVersion)throw new NamingElementBasisError('resolved-basis-mismatch','项目命名有效五行的方法、入口策略或应用协议与当前偏好不一致。');
  return Object.freeze({source:'project',elements:resolvedElements,selection:selected,applicationPolicyVersion});
 }
 if(selected)throw new NamingElementBasisError('resolved-basis-mismatch','项目命名请求不得使用人工或旧扶抑 resolved basis。');
 const source=manual.length?'manual':'legacy';
 const expected=manual.length?manual:legacyElements();
 if(value.source!==source||!sameElements(resolvedElements,expected))throw new NamingElementBasisError('resolved-basis-mismatch','人工或旧扶抑有效五行与当前输入不一致。');
 return Object.freeze({source,elements:resolvedElements});
}

export function namingElementBasisLabel(basis:ResolvedNamingBasis):string{return basis.source==='project'?'项目1.3.1采用':basis.source==='manual'?'客户人工选择':'旧扶抑候选';}
export function namingElementBasisPromptTag(basis:ResolvedNamingBasis){
 return basis.source==='project'?{source:basis.source,...basis.selection,applicationPolicyVersion:basis.applicationPolicyVersion}:{source:basis.source};
}
