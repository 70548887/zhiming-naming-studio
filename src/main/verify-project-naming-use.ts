import {isDeepStrictEqual} from 'node:util';
import type {Analysis,NamingSession,SourceRecord} from '../shared/types';
import {canonicalPlainJson} from '../shared/plain-json';
import {readNamingElementMethodSelection,type ProjectNamingUseSnapshot} from '../shared/project-naming-use';
import {assertNamingElementApplicationTuple,NAMING_ELEMENT_APPLICATION_POLICY} from '../shared/naming-element-application';
import {getNamingElementBasis,type ResolvedNamingBasis} from '../domain/naming-element-basis';
import {verifyFixedRootFeedbackBaseFacts,type BaziRootFeedbackFacade} from './bazi-root-feedback-facade';

type ProjectBasis=Extract<ResolvedNamingBasis,{source:'project'}>;
export interface SavedProjectNamingUseDependencies {
 readonly facade:BaziRootFeedbackFacade;
 readonly fixedSourceRecords:readonly SourceRecord[];
}
const reservedIds=['project-bazi-mainchain-145','naming-element-application-v1'] as const;
const verifiedBases=new WeakSet<object>();
type Slot={kind:'absent'}|{kind:'opaque'}|{kind:'data';value:unknown};
function plain(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));}
function slot(value:unknown,key:string):Slot{
 if(!plain(value))return{kind:'opaque'};
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 if(!descriptor)return key in value?{kind:'opaque'}:{kind:'absent'};
 if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)return{kind:'opaque'};
 return{kind:'data',value:descriptor.value};
}
function fail(message:string):never{throw Object.assign(new Error('保存项目命名采用校验：'+message),{code:'invalid-saved-project-naming-use'});}
function fact(condition:unknown,message:string):asserts condition{if(!condition)fail(message);}
function data(value:unknown,key:string):unknown{const result=slot(value,key);fact(result.kind==='data','缺少自身可枚举数据字段 '+key+'，不接受访问器。');return result.value;}
function record(value:unknown,name:string):Record<string,unknown>{fact(plain(value),name+' 须为普通数据对象。');return value;}
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function assertProfileData(profile:Record<string,unknown>):void{
 const optional=new Set(['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod']);
 const inspected=Object.create(null) as Record<string,unknown>;
 for(const key of Reflect.ownKeys(profile)){
  fact(typeof key==='string','出生资料不得含符号字段。');
  const value=data(profile,key);
  if(value===undefined&&optional.has(key))continue;
  inspected[key]=value;
 }
 canonicalPlainJson(inspected);
}

/** Inspect known footprint paths without reading an accessor. An opaque parent
 * or source entry cannot prove legacy absence, so it conservatively counts. */
export function hasProjectNamingUseFootprint(session:unknown):boolean{
 if(!plain(session))return true;
 const analysis=slot(session,'analysis');
 if(analysis.kind==='opaque')return true;
 if(analysis.kind==='data'){
  if(!plain(analysis.value))return true;
  if(slot(analysis.value,'projectNamingUse').kind!=='absent'||slot(analysis.value,'sourceRecipe').kind!=='absent')return true;
 }
 if(slot(session,'sourceRecipe').kind!=='absent')return true;
 for(const parentKey of ['profile','preferences']){
  const parent=slot(session,parentKey);
  if(parent.kind==='opaque')return true;
  if(parent.kind==='absent')continue;
  if(!plain(parent.value))return true;
  let preferences:Slot=parent;
  if(parentKey==='profile')preferences=slot(parent.value,'namingPreferences');
  if(preferences.kind==='opaque')return true;
  if(preferences.kind==='data'){
   if(!plain(preferences.value)||slot(preferences.value,'namingElementMethod').kind!=='absent')return true;
  }
 }
 const snapshot=slot(session,'sourceSnapshot');
 if(snapshot.kind==='opaque')return true;
 if(snapshot.kind==='data'){
  const sources=slot(snapshot.value,'sources');
  if(sources.kind!=='data'||!Array.isArray(sources.value)||Object.getPrototypeOf(sources.value)!==Array.prototype)return true;
  const sourceRows=sources.value,keys=Reflect.ownKeys(sourceRows);
  if(keys.length!==sourceRows.length+1||keys.some(key=>typeof key!=='string'||key!=='length'&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=sourceRows.length)))return true;
  for(let index=0;index<sourceRows.length;index++){
   const descriptor=Object.getOwnPropertyDescriptor(sourceRows,String(index));
   if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)return true;
   const id=slot(descriptor.value,'id');
   if(id.kind!=='data'||typeof id.value!=='string')return true;
   if(reservedIds.some(reserved=>reserved===id.value))return true;
  }
 }
 return false;
}

/** Internal main capability; a cloned, imported or client-shaped basis fails. */
export function assertVerifiedSavedProjectNamingBasis(value:unknown):asserts value is ProjectBasis{
 if(!value||typeof value!=='object'||!verifiedBases.has(value))fail('候选复评只接受本模块真实固定重放返回的项目 basis。');
}

/** Authenticate the recorded version, never a current preview or AI appraisal.
 * The caller retains the full FactArchive/candidate evaluator and immutable
 * before/after Store identity guards. No result is assigned back into session. */
export function verifySavedProjectNamingUse(session:NamingSession,dependencies:SavedProjectNamingUseDependencies):ProjectBasis|undefined{
 if(!hasProjectNamingUseFootprint(session))return undefined;
 const input=record(session,'方案'),profile=record(data(input,'profile'),'生成时出生资料');
 const generationPreferences=record(data(profile,'namingPreferences'),'生成时命名偏好');
 // Check selection before a manual branch or generic traversal of manual input.
 const selection=readNamingElementMethodSelection(generationPreferences);
 fact(selection,'项目 footprint 存在，但生成时方法选择缺失，不能降级为旧路径。');
 const reviewPreferences=record(data(input,'preferences'),'保存审阅偏好');
 const reviewSelection=readNamingElementMethodSelection(reviewPreferences);
 fact(isDeepStrictEqual(reviewSelection,selection),'生成时与保存审阅的方法选择不一致。');
 canonicalPlainJson(generationPreferences);
 const manual=data(generationPreferences,'preferredElements');
 fact(Array.isArray(manual)&&manual.length===0,'项目采用与生成时非空人工五行冲突。');
 assertProfileData(profile);
 fact(typeof profile.id==='string'&&data(input,'profileId')===profile.id,'方案与生成时客户编号不一致。');
 const analysis=record(data(input,'analysis'),'保存分析');
 fact(slot(analysis,'sourceRecipe').kind==='absent'&&slot(input,'sourceRecipe').kind==='absent','sourceRecipe 只允许保存在正式 projectNamingUse 内。');
 const saved=data(analysis,'projectNamingUse');
 canonicalPlainJson(saved);
 const snapshot=record(saved,'项目采用快照') as unknown as ProjectNamingUseSnapshot;
 const recipe=record(data(snapshot,'sourceRecipe'),'来源采用协议');
 const namingRules=record(data(input,'namingRules'),'生成时命名规则');
 const namingVersion=data(namingRules,'version');
 fact(namingVersion==='naming-editorial-7.0.0'||namingVersion==='naming-editorial-7.1.0','保存命名版本未明确登记，不能按当前版本升级或降级。');
 assertNamingElementApplicationTuple(namingVersion,selection.methodId,data(recipe,'applicationPolicyVersion'));
 fact(isDeepStrictEqual(recipe,{schema:'naming-element-source-recipe/1',source:'project',namingRulesVersion:namingVersion,applicationPolicyVersion:NAMING_ELEMENT_APPLICATION_POLICY}),'sourceRecipe 字段、命名版本或采用协议不一致。');
 fact(isDeepStrictEqual(snapshot.selection,selection),'保存快照的方法或入口与生成时偏好不一致。');
 const sourceSnapshot=record(data(input,'sourceSnapshot'),'生成时来源登记');
 const sources=data(sourceSnapshot,'sources');
 canonicalPlainJson(sources);
 fact(Array.isArray(sources),'生成时来源登记须为数组。');
 const fixed=dependencies.fixedSourceRecords;
 canonicalPlainJson(fixed);
 fact(Array.isArray(fixed)&&fixed.length===reservedIds.length,'主进程固定项目来源闭包不完整。');
 for(const id of reservedIds){
  const expected=fixed.filter(source=>source.id===id),actual=sources.filter(source=>plain(source)&&source.id===id);
  fact(expected.length===1&&actual.length===1&&isDeepStrictEqual(actual[0],expected[0]),'保留来源 '+id+' 缺失、重复或完整字段被替换。');
 }
 const ren=slot(analysis,'renCommentary');
 fact(ren.kind!=='opaque','保存基础分析不得含隐藏或访问器的 renCommentary。');
 const savedBaseAnalysis={bazi:data(analysis,'bazi'),qimen:data(analysis,'qimen'),...(ren.kind==='data'&&ren.value!==undefined?{renCommentary:ren.value}:{})} as Analysis;
 canonicalPlainJson(savedBaseAnalysis);
 const facts=verifyFixedRootFeedbackBaseFacts(session.profile,savedBaseAnalysis);
 const replay=dependencies.facade.fromVerifiedFixedBase(facts,{fromOutputMonthStem:selection.entryPolicy==='month-stem-proposal'});
 const gate=replay.applicationGate;
 fact(replay.methodId===selection.methodId&&replay.entryPolicy===selection.entryPolicy&&gate.status==='applicable','保存版本的真实重放没有通过所选项目采用门。');
 fact(isDeepStrictEqual(gate.effectiveElements,gate.certificate.effectiveElements),'真实 gate 与完整证书采用元素不一致。');
 const basis=getNamingElementBasis(generationPreferences as unknown as NamingSession['preferences'],savedBaseAnalysis,{source:'project',elements:gate.effectiveElements.applied,selection,applicationPolicyVersion:NAMING_ELEMENT_APPLICATION_POLICY});
 fact(basis.source==='project','真实重放未得到项目 basis。');
 // The exact official DTO projection is shared with the owner generation
 // contract; replay does not assign an imported object a generation brand.
 const expected:ProjectNamingUseSnapshot={
  schema:'project-naming-use/1',selection:structuredClone(selection),
  sourceRecipe:{schema:'naming-element-source-recipe/1',source:'project',namingRulesVersion:namingVersion,applicationPolicyVersion:NAMING_ELEMENT_APPLICATION_POLICY},
  engineCertificate:structuredClone(gate.certificate),
  application:{policyId:NAMING_ELEMENT_APPLICATION_POLICY,status:'applied',primary:[...gate.effectiveElements.primary],secondary:[...gate.effectiveElements.secondary],avoid:[...gate.effectiveElements.avoid],effectiveElements:[...basis.elements]}
 };
 canonicalPlainJson(expected);
 fact(isDeepStrictEqual(snapshot,expected),'完整保存快照、证书、采用元素、资源身份或来源协议与真实固定重放不同。');
 for(const source of fixed){
  const identity=gate.certificate.resourceIdentity;
  fact(Array.isArray(source.files)&&source.files.every((file:string)=>identity.files.some(resource=>resource.path===file))&&identity.files.some(resource=>resource.kind==='publication'&&resource.sha256===source.sha256&&source.files.includes(resource.path)),'固定 SourceRecord 与实际证书资源出版身份不一致。');
 }
 const verified=freeze(basis);
 verifiedBases.add(verified);
 return verified;
}
