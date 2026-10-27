import {isDeepStrictEqual} from 'node:util';
import type {Analysis,BirthProfile,NamingPreferences,SourceRecord} from '../shared/types';
import {readNamingElementMethodSelection,type NamingElementMethodSelection} from '../shared/project-naming-use';
import {assertNamingElementApplicationTuple} from '../shared/naming-element-application';
import {canonicalPlainJson} from '../shared/plain-json';
import {ROOT_FEEDBACK_APPLICATION_POLICY,ROOT_FEEDBACK_METHOD_ID} from '../shared/bazi-root-feedback-application';
import type {RootFeedbackAppliedApplicationGate,RootFeedbackApplicationReason} from '../shared/bazi-root-feedback-application';
import {getNamingElementBasis,type ResolvedNamingBasis} from '../domain/naming-element-basis';
import {createBaziRootFeedbackFacade} from './bazi-root-feedback-facade';
import {loadRootFeedbackResources,type RootFeedbackResourceConfiguration,type VerifiedRootFeedbackResources} from './bazi-root-feedback-resources';

export type NamingElementResolution=
 |{source:'manual'|'legacy';basis:ResolvedNamingBasis;sourceRecords:readonly SourceRecord[]}
 |{source:'project';basis:Extract<ResolvedNamingBasis,{source:'project'}>;selection:NamingElementMethodSelection;appliedGate:RootFeedbackAppliedApplicationGate;sourceRecords:readonly SourceRecord[]};

export class NamingElementResolutionError extends Error {
 readonly name='NamingElementResolutionError';
 constructor(readonly code:'invalid-naming-element-selection'|'manual-project-conflict'|'unsupported-tuple'|'project-resources-unavailable'|'project-analysis-binding-mismatch'|'project-naming-use-blocked',message:string,readonly methodId:string|null,readonly entryPolicy:string|null,readonly reasons:readonly {code:string;message:string}[]=[]){super(message);}
}
const trusted=new WeakSet<object>();
function freeze<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function errorText(error:unknown){return error instanceof Error?error.message:'项目命名解析失败。';}
function selectionFailure(error:unknown):never {throw new NamingElementResolutionError('invalid-naming-element-selection',errorText(error),null,null,[{code:'invalid-naming-element-selection',message:errorText(error)}]);}
/** Preserve existing optional-own-undefined semantics, while checking every
 * descriptor before structuredClone/deep comparison can read a supplied value. */
function assertDataRecord(value:unknown,optionalUndefined:readonly string[]):void {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('出生资料和基础分析必须是普通数据对象。');
 const inspected=Object.create(null) as Record<string,unknown>;
 for(const key of Reflect.ownKeys(value)){
  if(typeof key!=='string')throw new Error('出生资料和基础分析不得含符号属性。');
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('出生资料和基础分析不得含访问器或隐藏字段。');
  if(descriptor.value===undefined&&optionalUndefined.includes(key))continue;
  inspected[key]=descriptor.value;
 }
 canonicalPlainJson(inspected);
}
const optionalBirthFields=['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'] as const;

/** Main-process construction only; no resource handle, birth pillars, result or certificate comes from IPC. */
export function createNamingElementResolver(configuration:RootFeedbackResourceConfiguration){
 let resources:VerifiedRootFeedbackResources|undefined;
 let facade:ReturnType<typeof createBaziRootFeedbackFacade>|undefined;
 return {
  resolve(profile:BirthProfile,preferences:NamingPreferences,baseAnalysis:Analysis,namingRuleVersion:string):NamingElementResolution {
   let selection:NamingElementMethodSelection|undefined;
   // The selection is checked before a manual early return. An unknown method
   // cannot disappear into the otherwise valid legacy/manual branch.
   try{selection=readNamingElementMethodSelection(preferences);}catch(error){return selectionFailure(error);}
   if(!selection){
    const basis=getNamingElementBasis(preferences,baseAnalysis);
    if(basis.source==='project')throw new Error('项目命名解析缺少方法选择。');
    const value:NamingElementResolution=freeze({source:basis.source,basis,sourceRecords:[]});trusted.add(value);return value;
   }
   const manual=Object.getOwnPropertyDescriptor(preferences,'preferredElements');
   if(!manual||!Object.hasOwn(manual,'value')||!manual.enumerable)throw new NamingElementResolutionError('invalid-naming-element-selection','人工五行必须是明确的数据数组，不接受访问器或隐藏字段。',selection.methodId,selection.entryPolicy);
   try{canonicalPlainJson(manual.value);}catch(error){throw new NamingElementResolutionError('invalid-naming-element-selection',errorText(error),selection.methodId,selection.entryPolicy);}
   if(!Array.isArray(manual.value)||manual.value.some(element=>!['木','火','土','金','水'].includes(element)))throw new NamingElementResolutionError('invalid-naming-element-selection','人工五行字段无效。',selection.methodId,selection.entryPolicy);
   if(manual.value.length)throw new NamingElementResolutionError('manual-project-conflict','项目命名方法与人工五行选择冲突；请明确退出项目方法后重新生成。',selection.methodId,selection.entryPolicy,[{code:'manual-project-conflict',message:'项目方法与非空人工五行不能同时采用。'}]);
   try{assertNamingElementApplicationTuple(namingRuleVersion,selection.methodId,ROOT_FEEDBACK_APPLICATION_POLICY);}catch(error){throw new NamingElementResolutionError('unsupported-tuple',errorText(error),selection.methodId,selection.entryPolicy,[{code:'unsupported-tuple',message:errorText(error)}]);}
   try{assertDataRecord(profile,optionalBirthFields);assertDataRecord(baseAnalysis,['renCommentary']);}catch(error){throw new NamingElementResolutionError('project-analysis-binding-mismatch',errorText(error),selection.methodId,selection.entryPolicy,[{code:'project-analysis-binding-mismatch',message:errorText(error)}]);}
   try{resources??=loadRootFeedbackResources(configuration);facade??=createBaziRootFeedbackFacade(resources);}catch(error){throw new NamingElementResolutionError('project-resources-unavailable',errorText(error),selection.methodId,selection.entryPolicy,[{code:'project-resources-unavailable',message:errorText(error)}]);}
   const preview=facade.previewBaziRootFeedbackProfile(profile,{fromOutputMonthStem:selection.entryPolicy==='month-stem-proposal'});
   if(!isDeepStrictEqual(preview.baseAnalysis,baseAnalysis))throw new NamingElementResolutionError('project-analysis-binding-mismatch','项目命名与本次原始八字/奇门分析不一致，未生成候选。',selection.methodId,selection.entryPolicy,[{code:'project-analysis-binding-mismatch',message:'真实出生资料重算与本次基础分析不一致。'}]);
   const gate=preview.applicationGate;
   if(gate.status!=='applicable'){
    const reasons:RootFeedbackApplicationReason[]=structuredClone(gate.reasons);
    throw new NamingElementResolutionError('project-naming-use-blocked','项目命名应用门未通过：'+reasons.map(reason=>reason.message).join('；'),selection.methodId,selection.entryPolicy,reasons);
   }
   if(gate.certificate.methodId!==ROOT_FEEDBACK_METHOD_ID||gate.certificate.entryPolicy!==selection.entryPolicy||gate.certificate.applicationPolicyVersion!==ROOT_FEEDBACK_APPLICATION_POLICY)throw new NamingElementResolutionError('project-analysis-binding-mismatch','项目命名证书与所选方法、入口或应用策略不一致。',selection.methodId,selection.entryPolicy);
   const basis=getNamingElementBasis(preferences,baseAnalysis,{source:'project',elements:gate.effectiveElements.applied,selection,applicationPolicyVersion:ROOT_FEEDBACK_APPLICATION_POLICY});
   if(basis.source!=='project')throw new Error('项目命名解析未得到项目有效五行。');
   const value:NamingElementResolution=freeze({source:'project',basis,selection:structuredClone(selection),appliedGate:gate,sourceRecords:resources.sources});trusted.add(value);return value;
  }
 };
}

/** Internal capability check for a snapshot builder; a client-shaped object is not a resolution. */
export function assertTrustedNamingElementResolution(value:unknown):asserts value is NamingElementResolution {
 if(!value||typeof value!=='object'||!trusted.has(value))throw new Error('命名有效五行只接受本进程主解析器的真实结果。');
}
