import { isDeepStrictEqual,types as nodeTypes } from 'node:util';
import { createHash,webcrypto } from 'node:crypto';
import {digestSourceBytes} from './source-byte-digest.mjs';
import { surnameReading,resolveNamingContextForRuleVersion,selectNamingCitationsForRuleVersionWithContext,recomputeCandidateFactsBatchForRuleVersion,createCandidateFactRecomputationGuardForRuleVersion } from '../domain/naming';
import type {ResolvedNamingBasis} from '../domain/naming-element-basis';
import {hasProjectNamingUseFootprint,assertVerifiedSavedProjectNamingBasis} from './verify-project-naming-use';
import {verifyNamingMeaningReviewSnapshot} from './naming-meaning-review';
import { CANDIDATE_FACT_VERSION } from '../shared/candidate-facts';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,isNamingV7BaseRuleVersion,resolveSessionNamingRulesVersion} from '../shared/naming-rules';
import {selectedMeaningBelongsToReading} from '../shared/character-reading';
import {selectedReferenceOnlyReading,validReadingReferenceMetadata} from '../shared/character-reading-reference';
import type { CandidateFactVerification,CharacterEntry,Citation,NameCandidate,NamingSession,SourceRecord } from '../shared/types';

export interface FactDataset {version:string;characters:CharacterEntry[];citations:Citation[];sources:SourceRecord[];}
export interface FactArchive {sha256:string;version:string;pack:Uint8Array;dataset:FactDataset;}
export const ARCHIVE_MAX_COUNT=100,ARCHIVE_MAX_BYTES=150*1024*1024;
export const packSha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

/** The default reading must refer to an actual stored reading/meaning, including on unresolvable legacy snapshots. */
export function validCharacterReading(character:CharacterEntry):boolean {
 if(!character.pinyin.trim()||!character.meaning.trim())return false;
 if(!character.readings?.length)return true;
 if(character.readings.some(reading=>!validReadingReferenceMetadata(reading))||selectedReferenceOnlyReading(character))return false;
 return character.readings.some(reading=>reading.referenceOnly!==true&&reading.pinyin===character.pinyin&&reading.tone===character.tone&&reading.sourceId===character.sourceId
  &&selectedMeaningBelongsToReading(character.meaning,reading.meanings));
}

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {takeStoredCandidateFactReplayInput,type StoredReadOperation} from './store';
import {loadOwnedNamingRuleJsonInputs,loadNamingEditorialV71Data,FIXED_NAMING_EDITORIAL_V71_DATA,NAMING_EDITORIAL_V7_PUBLICATION_PINS,NAMING_EDITORIAL_V71_PINS} from './naming-editorial-v7-data';
import {probeM460PublicationPresence} from './m460-publication-data.mjs';
import {loadNamingEditorialV4Data} from './naming-editorial-v4-data';
import {loadNamingEditorialV5Data} from './naming-editorial-v5-data';
import {loadNamingEditorialV6Data} from './naming-editorial-v6-data';
import {createCitationReadingGateV5} from '../domain/naming-semantics-v5';
import {createCitationReadingGateV6,readLiveCitationReadingDependenciesV6} from '../domain/naming-semantics-v6';
import {readLiveSupplementalNameDependenciesV6} from '../domain/naming-name-rules-v6';
import {createOwnedReviewedCitationContext,recomputeOwnedCitationContextBatch,readLiveReviewedCitationDependenciesV7} from '../domain/naming-v7';
import type {OwnedNamingRuleJsonInputs} from '../shared/candidate-facts';

function candidateFactPrerequisites(session:NamingSession,archive:FactArchive|undefined,projectBasis?:Extract<ResolvedNamingBasis,{source:'project'}>){
 const projectFootprint=hasProjectNamingUseFootprint(session);
 if(projectFootprint)assertVerifiedSavedProjectNamingBasis(projectBasis);
 else if(projectBasis!==undefined)throw new Error('历史方案不得借用其他方案的项目五行复评结果。');
 const namingVersion=resolveSessionNamingRulesVersion(session);
 const namingContext=namingVersion?resolveNamingContextForRuleVersion(namingVersion,archive?{packSha256:archive.sha256,activeVersion:archive.version}:undefined):{context:undefined};
 if(isNamingV7BaseRuleVersion(namingVersion)&&(!archive||!namingContext.context||archive.version!==session.dataVersion))throw new Error('命名7.x方案必须绑定保存版本的完整知识包身份，不能借用自定义包或降级历史。');
 if(namingVersion===NAMING_RULE_V71_VERSION&&!session.profile.namingPreferences)throw new Error('命名7.1方案缺少生成时冻结偏好，不得借用审阅时偏好。');
 const generationVersion=/^civil-midnight-fuyi-candidate\/(\d+)\.(\d+)\.\d+;/.exec(session.analysis.bazi.version);
 const requiresArchive=!!generationVersion&&(Number(generationVersion[1])>1||Number(generationVersion[1])===1&&Number(generationVersion[2])>=4);
 if(requiresArchive&&!archive)throw new Error('当前版方案缺少生成时完整知识包，不能降级为未核验历史。');
 if(session.factVerification?.status==='verified-archive'||session.factVerification?.status==='verified-builtin'){
  if(!archive||session.factVerification.datasetSha256!==archive.sha256)throw new Error('已核验方案的完整知识包归档缺失或SHA-256不一致，不能降级恢复。');
 }
 return {namingVersion,namingContext};
}

function assertArchiveSourceRecords(session:NamingSession,selected:FactDataset|undefined,sourceRegistry:Map<string,SourceRecord>){
 if(selected&&session.sourceSnapshot)for(const source of selected.sources){const recorded=sourceRegistry.get(source.id);if(!recorded||!isDeepStrictEqual(recorded,source))throw new Error('生成时来源快照与候选原知识包登记不一致。');}
}

/** Validate immutable facts against real archived package records, not a candidate-authored checksum. */
function verifyCandidateFactsCore(session:NamingSession,archive:FactArchive|undefined,builtin:FactArchive,projectBasis?:Extract<ResolvedNamingBasis,{source:'project'}>,ownedReplay?:ReplayCitationInputs,operationState?:ReplayOperationState):CandidateFactVerification {
 const {namingVersion,namingContext}=candidateFactPrerequisites(session,archive,projectBasis);
 const sourceRegistry=new Map(session.sourceSnapshot?.sources.map(source=>[source.id,source])??[]);
 const selected=archive?.dataset,characters=new Map((selected?.characters??[]).map(character=>[character.char,character])),citations=new Map((selected?.citations??[]).map(citation=>[citation.id,citation]));
 const builtinCitations=new Map(builtin.dataset.citations.map(citation=>[citation.id,citation])),builtinSources=new Map(builtin.dataset.sources.map(source=>[source.id,source]));
 assertArchiveSourceRecords(session,selected,sourceRegistry);
 const inspectCandidate=(candidate:NameCandidate,expected?:NameCandidate|null):void=>{
  // Review-time manual preferences do not change the saved score. Reproduce
  // only from the frozen generation preferences; retain legacy absence.
  const generationPreferences=session.profile.namingPreferences;
  if(projectBasis||isNamingV7BaseRuleVersion(namingVersion)&&generationPreferences!==undefined){
   if(!isNamingV7BaseRuleVersion(namingVersion)||!archive||!namingContext.context||!generationPreferences)throw new Error('命名复评缺少生成时固定命名规则、知识包或偏好。');
   if(!expected||!isDeepStrictEqual(candidate.evaluation,expected.evaluation))throw new Error('候选评分与生成时命名方法、固定字库及采用五行的真实复算不一致。');
  }
  verifyNamingMeaningReviewSnapshot(candidate,session,namingContext.context);
  if(isNamingV7BaseRuleVersion(namingVersion)&&!isDeepStrictEqual(candidate.citations,selectNamingCitationsForRuleVersionWithContext(namingVersion,namingContext.context,candidate.givenName,candidate.characters,candidate.citations)))throw new Error('命名7.0逐名出处与全名顺序、字音义项或完整原文绑定不一致。');
  const expectedPinyin=[surnameReading(session.profile),...candidate.characters.map(character=>character.pinyin)].filter(Boolean).join(' ');
  if(candidate.pinyin!==expectedPinyin||candidate.characters.some(character=>!validCharacterReading(character)))throw new Error('候选姓名读音与字典读音义项不自洽，未保存。');
  for(const character of candidate.characters){if(selected&&!isDeepStrictEqual(character,characters.get(character.char)))throw new Error('候选字音、字义或字形事实与生成时原知识包不一致。');}
  for(const citation of candidate.citations){
   if(selected){if(!isDeepStrictEqual(citation,citations.get(citation.id)))throw new Error('候选引文事实与生成时原知识包不一致。');}
   else {
    const known=builtinCitations.get(citation.id),declared=sourceRegistry.get(citation.sourceId),builtinSource=builtinSources.get(citation.sourceId);
    // Unknown external legacy packages may have their own IDs/text. A claimed built-in source/ID is still checkable.
    if((declared&&builtinSource&&isDeepStrictEqual(declared,builtinSource)&&!known)
      ||known&&(!declared||builtinSource&&isDeepStrictEqual(declared,builtinSource))&&!isDeepStrictEqual(citation,known))throw new Error('历史方案所称内置引文与已知原条目不一致。');
   }
  }
 };
 const generationPreferences=session.profile.namingPreferences;
 if(session.candidates.length&&(projectBasis||isNamingV7BaseRuleVersion(namingVersion)&&generationPreferences!==undefined)){
  if(!isNamingV7BaseRuleVersion(namingVersion)||!archive||!namingContext.context||!generationPreferences)throw new Error('命名复评缺少生成时固定命名规则、知识包或偏好。');
  // One synchronous traversal owns its private lookup. Each original candidate
  // is fully compared before the next candidate is evaluated; no verdict is cached.
  if(ownedReplay){
   const context=createOwnedReviewedCitationContext({raw:ownedReplay.raw,verifiedV4Table:ownedReplay.verifiedV4Table,version:namingVersion,trustedContext:namingContext.context,profile:session.profile,preferences:generationPreferences,analysis:session.analysis,characters:archive.dataset.characters,citations:archive.dataset.citations,candidates:session.candidates,basis:projectBasis});
   const originalGuard=createCandidateFactRecomputationGuardForRuleVersion(namingVersion,namingContext.context,generationPreferences,session.analysis,projectBasis);
   try{recomputeOwnedCitationContextBatch(context,()=>{originalGuard();assertReplayPlatformCloneUnchanged();if(operationState)assertReplayOperationRuntime(operationState);},(expected,index)=>{inspectCandidate(session.candidates[index],expected);if(operationState)assertReplayOperationRuntime(operationState);});}finally{context.dispose();}
  }else{
  recomputeCandidateFactsBatchForRuleVersion(namingVersion,namingContext.context,session.profile,generationPreferences,session.analysis,archive.dataset.characters,archive.dataset.citations,session.candidates,projectBasis,(expected,index)=>{inspectCandidate(session.candidates[index],expected);});
  }
 }else{for(const candidate of session.candidates)inspectCandidate(candidate);}
 return {version:CANDIDATE_FACT_VERSION,status:archive?(archive.sha256===builtin.sha256?'verified-builtin':'verified-archive'):'unverified-legacy',dataVersion:session.dataVersion,...(archive?{datasetSha256:archive.sha256}:{})};
}

export function verifyCandidateFacts(session:NamingSession,archive:FactArchive|undefined,builtin:FactArchive,projectBasis?:Extract<ResolvedNamingBasis,{source:'project'}>):CandidateFactVerification {
 return verifyCandidateFactsCore(session,archive,builtin,projectBasis);
}

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
const initialCryptoDescriptor=replayOwnDescriptor(globalThis,'crypto');
const initialUUIDPrototype=replayPrototype(webcrypto);
const initialUUIDDescriptor=!initialUUIDPrototype||replayIsProxy(initialUUIDPrototype)?undefined:replayOwnDescriptor(initialUUIDPrototype,'randomUUID');
const replayJSONBinding=replayOwnDescriptor(globalThis,'JSON');
const replayJSON=replayJSONBinding&&replayHasOwn(replayJSONBinding,'value')?replayJSONBinding.value as unknown:undefined;
const replayJSONParse=replayJSON&&typeof replayJSON==='object'&&!replayIsProxy(replayJSON)?replayOwnDescriptor(replayJSON,'parse')?.value:undefined;
const replayJSONStringify=replayJSON&&typeof replayJSON==='object'&&!replayIsProxy(replayJSON)?replayOwnDescriptor(replayJSON,'stringify')?.value:undefined;
function replaySerializationIntact():boolean {
 const globalJSON=replayOwnDescriptor(globalThis,'JSON');
 if(!globalJSON||!replayHasOwn(globalJSON,'value')||globalJSON.value!==replayJSON||!replayJSON||typeof replayJSON!=='object'||replayIsProxy(replayJSON))return false;
 const parse=replayOwnDescriptor(replayJSON,'parse'),stringify=replayOwnDescriptor(replayJSON,'stringify');
 return !!parse&&!!stringify&&replayHasOwn(parse,'value')&&replayHasOwn(stringify,'value')&&parse.value===replayJSONParse&&stringify.value===replayJSONStringify
  &&replayNativeFunction(replayJSONParse,'parse')&&replayNativeFunction(replayJSONStringify,'stringify')
  &&replayPrototype(Object.prototype)===null&&replayPrototype(Array.prototype)===Object.prototype
  &&!replayOwnDescriptor(Object.prototype,'toJSON')&&!replayOwnDescriptor(Array.prototype,'toJSON');
}
/** Proposed explicit platform contract, pending root approval:
 * At verified application startup, before untrusted inputs/callbacks, the
 * standard crypto binding is either own-data node:webcrypto or the platform's
 * own getter returning that same service, without a setter. The getter identity
 * comes from that startup assumption, never a source-text shape or first-seen
 * arbitrary callback. Qualification records/compares descriptors only; it does
 * not call an initial or replacement getter. Preinstalled user replacement of
 * this platform service is outside this proposed owned-path support contract.
 */
function replayStartupCryptoBindingSupported():boolean {
 if(!initialCryptoDescriptor)return false;
 if(replayHasOwn(initialCryptoDescriptor,'value'))return initialCryptoDescriptor.value===webcrypto;
 return replayHasOwn(initialCryptoDescriptor,'get')&&replayHasOwn(initialCryptoDescriptor,'set')
  &&typeof initialCryptoDescriptor.get==='function'&&!replayIsProxy(initialCryptoDescriptor.get)
  &&initialCryptoDescriptor.set===undefined;
}
function nativeReplayCallbacksUnchanged():boolean {
 if(!replaySerializationIntact()||!replayWeakMapIntrinsicsIntact())return false;
 const current=replayOwnDescriptor(globalThis,'crypto');
 if(!current||!initialCryptoDescriptor||!replayStartupCryptoBindingSupported()||!replayDescriptorEqual(current,initialCryptoDescriptor))return false;
 const uuidPrototype=replayPrototype(webcrypto);if(!uuidPrototype||uuidPrototype!==initialUUIDPrototype||replayIsProxy(uuidPrototype))return false;
 const uuid=replayOwnDescriptor(uuidPrototype,'randomUUID');
 return !!uuid&&!!initialUUIDDescriptor&&replayHasOwn(uuid,'value')&&typeof uuid.value==='function'&&!replayIsProxy(uuid.value)
  &&replayDescriptorEqual(uuid,initialUUIDDescriptor)&&!replayHasOwn(webcrypto,'randomUUID');
}
interface ReplayCitationInputs {raw:OwnedNamingRuleJsonInputs;verifiedV4Table:ReturnType<typeof loadNamingEditorialV4Data>['table'];}
/** Lexical producer: no caller can supply expected hashes, lookup objects or a verdict. */
function loadReplayCitationInputs(directory:string,archive:FactArchive,readPack:(bytes:Uint8Array)=>FactDataset&{knowledge:unknown[]},namingVersion:ReturnType<typeof resolveSessionNamingRulesVersion>,session:NamingSession):{inputs:ReplayCitationInputs;archive:FactArchive;eligible:boolean} {
 const bundle=readReplayPublicationBundle(directory,assertReplayPlatformCloneUnchanged),publication=selectReplayPublication(session,namingVersion);
 const raw=loadOwnedNamingRuleJsonInputs(directory);
 const verified4=loadNamingEditorialV4Data(directory).table,verified5=loadNamingEditorialV5Data(directory).table,verified6=loadNamingEditorialV6Data(directory).table;
 if(publication!=='base')authenticateReplayPublication(directory,publication,session,bundle);
 if(publication!=='base'&&bundle.mode==='all-present')assertReplayApproved60Files(directory,assertReplayPlatformCloneUnchanged);
 if(!isDeepStrictEqual(readReplayPublicationBundle(directory,assertReplayPlatformCloneUnchanged),bundle))throw new Error('本次固定命名认证期间可选出版资料的存在状态发生变化。');
 const base=JSON.parse(raw.baseJson),v5=JSON.parse(raw.v5Json),v6=JSON.parse(raw.v6Json),v7=JSON.parse(raw.v7Json);
 if(!isDeepStrictEqual(v5,verified5)||!isDeepStrictEqual(v6,verified6))throw new Error('首次引文上下文的固定规则原件与真实校验结果不一致。');
 if(v7.base?.datasetJsonFile!=='data/dataset-v6.json'||v7.base.knowledgePackFile!=='data/knowledge-v6.sqlite'||typeof v7.base.datasetJsonSha256!=='string'||!/^[a-f0-9]{64}$/.test(v7.base.datasetJsonSha256))throw new Error('首次引文上下文的固定字库路径或身份无效。');
 const datasetBytes=readFileSync(join(directory,'dataset-v6.json'));
 if(packSha(datasetBytes)!==v7.base.datasetJsonSha256)throw new Error('首次引文上下文的原字库JSON与本次认证的原件身份不一致。');
 const expected=JSON.parse(datasetBytes.toString('utf8')),pack=new Uint8Array(archive.pack);
 if(packSha(pack)!==archive.sha256||archive.sha256!==v7.base.knowledgePackSha256||archive.version!==v7.base.activeVersion||archive.version!==archive.sha256.slice(0,12))throw new Error('首次引文上下文的实际归档原包身份不一致。');
 const actual=readPack(pack);
 if(actual.version!==archive.version||!isDeepStrictEqual([actual.characters,actual.citations,actual.knowledge,actual.sources],[expected.characters,expected.citations,expected.knowledge,expected.sources]))throw new Error('首次引文上下文的实际原包四表与已认证JSON全字段或原顺序不一致。');
 const freshArchive:FactArchive={sha256:archive.sha256,version:archive.version,pack,dataset:actual};
 let eligible=replayAdmissionIntrinsicsIntact()&&nativeReplayCallbacksUnchanged();
 if(eligible){
  try{
   const gate5=createCitationReadingGateV5(verified4,v5),gate6=createCitationReadingGateV6(v6,gate5);
   const live={review:readLiveReviewedCitationDependenciesV7(),reading:readLiveCitationReadingDependenciesV6(),names:readLiveSupplementalNameDependenciesV6()};
   const expectedDependencies={review:{base,v7,lookupInputJson:JSON.stringify(v7)},reading:gate6.readDependencies(),names:{nameRules:v6.nameRules}};
   eligible=isDeepStrictEqual(dependencyValue(live),dependencyValue(expectedDependencies));
  }catch(error){if(error instanceof CitationReplayIneligible)eligible=false;else throw error;}
 }
 return {inputs:{raw,verifiedV4Table:verified4},archive:freshArchive,eligible};
}
interface ReplaySourceReceiptRow {file:string;sha256:string;bytes?:number;}
type ReplayPublicationKind='base'|'legacy40'|'approved60';
type ReplayPublicationBundle=ReturnType<typeof probeM460PublicationPresence>;
interface ReplayFixedSnapshot {
 inputs:ReplayCitationInputs;
 expected:FactDataset&{knowledge:unknown[]};
 expectedDependencyProjection:unknown;
 packSha256:string;packVersion:string;
 receipt:ReadonlyArray<ReplaySourceReceiptRow>;
 publication:ReplayPublicationKind;
 publicationSource?:SourceRecord;
}
interface ReplayOperationState {operation:StoredReadOperation;retired:boolean;snapshots:Map<string,ReplayFixedSnapshot>|undefined;publicationBundle?:ReplayPublicationBundle;receipt?:ReadonlyArray<ReplaySourceReceiptRow>;legacy40Authenticated?:boolean;presentV71Authenticated?:boolean;}
function replayOperationOwnMethod(key:'get'|'set'|'delete'):unknown {
 const descriptor=replayWeakMapPrototype?replayOwnDescriptor(replayWeakMapPrototype,key):undefined;
 return descriptor&&replayHasOwn(descriptor,'value')?descriptor.value:undefined;
}
const replayOperationGet=replayOperationOwnMethod('get'),replayOperationSet=replayOperationOwnMethod('set'),replayOperationDelete=replayOperationOwnMethod('delete');
const replayOperationStates:WeakMap<object,ReplayOperationState>|undefined=(()=>{
 if(!replayWeakMapConstructor||!replayNativeFunction(replayWeakMapConstructor,'WeakMap')||!replayNativeFunction(replayOperationGet,'get')||!replayNativeFunction(replayOperationSet,'set')||!replayNativeFunction(replayOperationDelete,'delete'))return undefined;
 try{const probe=new replayWeakMapConstructor(),key={__proto__:null},value={__proto__:null};if(replayApply(replayOperationSet,probe,[key,value])!==probe||replayApply(replayOperationGet,probe,[key])!==value||replayApply(replayOperationDelete,probe,[key])!==true)return undefined;return new replayWeakMapConstructor();}catch{return undefined;}
})();
function findReplayOperation(operation:object):ReplayOperationState|undefined {
 return replayOperationStates?replayApply(replayOperationGet,replayOperationStates,[operation]) as ReplayOperationState|undefined:undefined;
}
/** Registration happens only after the real Store capsule has been consumed. */
function consumedReplayOperation(owned:ReturnType<typeof takeStoredCandidateFactReplayInput>):ReplayOperationState|undefined {
 const operation=owned.operation;if(!operation||!replayOperationStates||!replayCaptureValid||!replayMapConstructor)return undefined;
 if(!operation.active||operation.invalidated||operation.directory!==owned.directory)throw new Error('本次内部读取操作已失效或目录不一致。');
 let state=findReplayOperation(operation);
 if(!state){state={operation,retired:false,snapshots:new replayMapConstructor(),publicationBundle:undefined,receipt:undefined,legacy40Authenticated:false,presentV71Authenticated:false};replayApply(replayOperationSet,replayOperationStates,[operation,state]);}
 assertReplayOperationActive(state);return state;
}
function assertReplayOperationActive(state:ReplayOperationState):void {
 if(state.retired||!state.operation.active||state.operation.invalidated)throw new Error('本次内部读取操作因结束或公开重入已失效。');
}
function assertReplayOperationRuntime(state:ReplayOperationState):void {
 assertReplayOperationActive(state);assertReplayPlatformCloneUnchanged();
 if(!replayAdmissionIntrinsicsIntact()||!replaySerializationIntact()||!nativeReplayCallbacksUnchanged())throw new Error('本次内部读取期间原生绑定或固定规则运行环境发生变化。');
}
function authenticatingReplayOperation<T>(state:ReplayOperationState,body:()=>T):T {
 assertReplayOperationActive(state);const previous=state.operation.authenticating;state.operation.authenticating=true;
 try{const result=body();assertReplayOperationRuntime(state);return result;}finally{state.operation.authenticating=previous;}
}
function freezeReplayExpected<T>(value:T):T {
 if(value&&typeof value==='object'){for(const child of Object.values(value))freezeReplayExpected(child);Object.freeze(value);}return value;
}
function replaySourcePath(file:string):string {
 if(!file.startsWith('data/')||file.includes('\\')||file.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('固定命名来源收据路径无效。');
 return file.slice(5);
}
function replayReceiptRead(state:ReplayOperationState,file:string,expected:string):Buffer {
 assertReplayOperationRuntime(state);
 if(!/^[a-f0-9]{64}$/.test(expected))throw new Error('固定命名来源收据摘要无效。');
 const bytes=readFileSync(join(state.operation.directory,replaySourcePath(file)));
 assertReplayOperationRuntime(state);
 if(replayIsProxy(bytes)||digestSourceBytes(bytes)!==expected)throw new Error('命名固定来源资料校验失败：原件摘要不一致：'+file);
 return bytes;
}
/** Authenticate the exact UTF8 bytes represented by this primitive before parse.
 * No method/property on an FS-returned Buffer becomes a decoding callback. */
function replayReceiptText(state:ReplayOperationState,file:string,expected:string):string {
 assertReplayOperationRuntime(state);
 if(!/^[a-f0-9]{64}$/.test(expected))throw new Error('固定命名来源收据摘要无效。');
 const text=readFileSync(join(state.operation.directory,replaySourcePath(file)),'utf8');
 assertReplayOperationRuntime(state);
 if(typeof text!=='string'||createHash('sha256').update(text,'utf8').digest('hex')!==expected)throw new Error('命名固定来源资料校验失败：原件摘要不一致：'+file);
 return text;
}
function addReplayReceipt(rows:Map<string,string>,file:string,expected:string):void {
 replaySourcePath(file);if(typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected))throw new Error('固定命名来源收据缺少逐件摘要。');
 const previous=rows.get(file);if(previous!==undefined&&previous!==expected)throw new Error('固定命名来源收据存在冲突：'+file);rows.set(file,expected);
}
function readReplayReceiptLock(state:ReplayOperationState,rows:Map<string,string>,file:string,expected:string):{sources:Array<{files:string[];fileHashes:Record<string,string>}>} {
 const text=replayReceiptText(state,file,expected),lock=JSON.parse(text);
 if(!lock||typeof lock!=='object'||!Array.isArray(lock.sources)||lock.sources.length!==1||!Array.isArray(lock.sources[0].files)||!lock.sources[0].fileHashes||typeof lock.sources[0].fileHashes!=='object')throw new Error('固定命名来源收据锁结构无效。');
 addReplayReceipt(rows,file,expected);
 const source=lock.sources[0];
 if(!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),[...source.files].sort()))throw new Error('固定命名来源收据锁的清单与逐件摘要不一致。');
 for(const path of source.files)addReplayReceipt(rows,path,source.fileHashes[path]);return lock;
}
function buildReplaySourceReceipt(state:ReplayOperationState,version71:boolean,existing?:ReadonlyArray<ReplaySourceReceiptRow>):ReadonlyArray<ReplaySourceReceiptRow> {
 const rows=new (replayMapConstructor as typeof Map)<string,string>();if(existing)for(const row of existing)addReplayReceipt(rows,row.file,row.sha256);
 if(!existing){
  const pins=NAMING_EDITORIAL_V7_PUBLICATION_PINS,v7=readReplayReceiptLock(state,rows,'data/'+pins.lockFile,pins.lockSha256);
  const v6File='data/naming-editorial-dictionary-v6-source-lock.json',v6=readReplayReceiptLock(state,rows,v6File,v7.sources[0].fileHashes[v6File]);
  for(const file of ['data/naming-editorial-names-v5-source-lock.json','data/naming-editorial-readings-source-lock.json'])readReplayReceiptLock(state,rows,file,v6.sources[0].fileHashes[file]);
  if(rows.size!==35)throw new Error('命名7.0完整来源收据未覆盖35件固定原件。');
 }
 if(version71){
  const pins=NAMING_EDITORIAL_V71_PINS,lock=readReplayReceiptLock(state,rows,pins.lock.file,pins.lock.sha256);
  for(const row of [pins.subset,pins.profile,pins.admission])addReplayReceipt(rows,row.file,row.sha256);
  const manifestText=replayReceiptText(state,pins.manifest.file,pins.manifest.sha256),manifest=JSON.parse(manifestText);addReplayReceipt(rows,pins.manifest.file,pins.manifest.sha256);
  const expectedFiles=[...lock.sources[0].files,pins.lock.file].sort();
  if(!Array.isArray(manifest.files)||manifest.files.length!==30||!isDeepStrictEqual(manifest.files.map((row:{file:string})=>row.file),expectedFiles))throw new Error('命名7.1完整出版收据清单不一致。');
  for(const row of manifest.files){if(rows.get(row.file)!==row.sha256)throw new Error('命名7.1出版收据逐件摘要不一致。');const bytes=replayReceiptRead(state,row.file,row.sha256);if(bytes.length!==row.bytes)throw new Error('命名7.1出版收据字节数不一致。');}
  if(rows.size!==45)throw new Error('命名7.1完整来源收据未覆盖45件固定原件。');
 }
 const receipt:ReplaySourceReceiptRow[]=[...rows].map(([file,sha256])=>({file,sha256}));receipt.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
 for(const row of receipt)replayReceiptRead(state,row.file,row.sha256);
 return freezeReplayExpected(receipt);
}

// These exact data pins come from M476 full-source-receipt.json c2b0f4a8...;
// module code and its actual exported loader are pinned by the integration manifest.
const replayApproved60SourceSha256='870846c44faa368c913536467cf62b60cf5a96d43256f796644856dc1ae007a4';
const replayApproved60Receipt:ReadonlyArray<ReplaySourceReceiptRow>=[
 {
  "file": "data/dataset-v6.json",
  "bytes": 1563457,
  "sha256": "3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728"
 },
 {
  "file": "data/knowledge-v6.sqlite",
  "bytes": 1454080,
  "sha256": "1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b"
 },
 {
  "file": "data/m460-lexical/naming-character-meanings-m393-NOTICE.md",
  "bytes": 1396,
  "sha256": "d1f21e9ffc7e207c816486ed74cb551b48a4c1ba46c49020f891a7cd290893c0"
 },
 {
  "file": "data/m460-lexical/naming-character-meanings-m393-admission.json",
  "bytes": 811,
  "sha256": "5df9ef749c6aebdcaef4f8866930e1689a856db6115d8b837224a3ee2fe6bbc3"
 },
 {
  "file": "data/m460-lexical/naming-character-meanings-m393-manifest.json",
  "bytes": 2932,
  "sha256": "23137c2c605a4807c603b9bdfcf7a2f7558872ac8d1661d0ff6b8a60a66332b4"
 },
 {
  "file": "data/m460-lexical/naming-character-meanings-m393-profile.json",
  "bytes": 162031,
  "sha256": "eee6a01e1d28a34c3992c8dd81d547352222caa62d04f363f3ec43edfcd5acd8"
 },
 {
  "file": "data/m460-lexical/naming-character-meanings-m393-source-lock.json",
  "bytes": 2727,
  "sha256": "f2f42e2370e4dce0b1701375764f5254493d0062c102bafe317129b84c017e76"
 },
 {
  "file": "data/m460-lexical/raw/naming-character-meanings-m393-subset.json",
  "bytes": 161637,
  "sha256": "cbf3add7ab417a01a6d433723366608c31b61ae5d0ab3065504a4947fad85b86"
 },
 {
  "file": "data/m460-lexical/reviews/M412.json",
  "bytes": 13128,
  "sha256": "2585b4c41defc938411b4128f8fe94aa9c990257c1ce5043ce0f92b0e8093159"
 },
 {
  "file": "data/m460-lexical/reviews/M418-r3.json",
  "bytes": 6077,
  "sha256": "71fe4fa10d7a0ac2b1bfd8f9baae201b4014c946fb75ec12457267da030afb06"
 },
 {
  "file": "data/naming-character-meanings-v7.1-NOTICE.md",
  "bytes": 1435,
  "sha256": "46d3fb85a1cf217a0b7e72c1002fb1c36dbbd3f34191306385388f4f14c7e243"
 },
 {
  "file": "data/naming-character-meanings-v7.1-admission.json",
  "bytes": 4760,
  "sha256": "425909be7aa94e251a37d45a77c759d0b3dfd323beef0af6882f3e0596b4d313"
 },
 {
  "file": "data/naming-character-meanings-v7.1-profile.json",
  "bytes": 257013,
  "sha256": "6e619be92c16dc018715fc77425f150b6a2c9af2e01be63b309035c81dd6a85b"
 },
 {
  "file": "data/naming-character-meanings-v71-m460-b02-NOTICE.md",
  "bytes": 1315,
  "sha256": "fdee9a0835dd391d106325cfd43ebeed580323d04d3538f995289b48f05330bc"
 },
 {
  "file": "data/naming-character-meanings-v71-m460-b02-admission.json",
  "bytes": 7207,
  "sha256": "cea582cc66ddc3adbd49d185edf0104cb829478b82312888bae1653ac471c98d"
 },
 {
  "file": "data/naming-character-meanings-v71-m460-b02-manifest.json",
  "bytes": 8115,
  "sha256": "f0b8db3f8edb64796687b57627c3fd4a306dd710b1fdad3c91338cbe43a51cb0"
 },
 {
  "file": "data/naming-character-meanings-v71-m460-b02-profile.json",
  "bytes": 419345,
  "sha256": "2c4be917bbfcdc3fec9279b2d9d928f5215e6ee1386d60e7d62265cd8e3eb2d1"
 },
 {
  "file": "data/naming-character-meanings-v71-m460-b02-root-decision.json",
  "bytes": 4718,
  "sha256": "b5d447fd84cdd877f260b51735f097feb82c98dea032bfdfb45e75835756e894"
 },
 {
  "file": "data/naming-character-meanings-v71-m460-b02-source-lock.json",
  "bytes": 8225,
  "sha256": "4b928ca58557ec7516fea74f6c20760c7800b8f2f6f495683b5354b00d9ad67f"
 },
 {
  "file": "data/naming-editorial-dictionary-v6-source-lock.json",
  "bytes": 4919,
  "sha256": "06331d11a1c757a0245891fae357c7952db597d07c3c770d4052277c0bfac8da"
 },
 {
  "file": "data/naming-editorial-meanings-v7-source-lock.json",
  "bytes": 3979,
  "sha256": "2945297a7f4bca1489e12018cce2848909fc35716c999b7d309e9a79633f7476"
 },
 {
  "file": "data/naming-editorial-v4.json",
  "bytes": 380418,
  "sha256": "d24898eb63438d7b24262668eb3b36770f211fade015b28eeb361700a58ca6ce"
 },
 {
  "file": "data/naming-editorial-v5.json",
  "bytes": 65361,
  "sha256": "bb8d3d255b42a6b67932988e13ceb2d7a7a1c6ef8fbbcc65312b9a50b5519da8"
 },
 {
  "file": "data/naming-editorial-v6.json",
  "bytes": 109426,
  "sha256": "35de5f749f438e849543e5fde6e405b89ba01cba20597e82e7c4f518dd4363ab"
 },
 {
  "file": "data/naming-editorial-v7-NOTICE.md",
  "bytes": 2380,
  "sha256": "c7dc728945bf2ceed14feb23e1635a6e6fd3ce8e5a135489554ec075e963a1b3"
 },
 {
  "file": "data/naming-editorial-v7.json",
  "bytes": 1301005,
  "sha256": "392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48"
 },
 {
  "file": "data/naming-editorial.json",
  "bytes": 31147,
  "sha256": "97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195"
 },
 {
  "file": "data/raw/CC-BY-ND-3.0-TW.html",
  "bytes": 31775,
  "sha256": "04e6ef69a223b6e13c93c97a918ad5fd0dbb9fc34ae307f4449ed264e2d4108f"
 },
 {
  "file": "data/raw/kSimplifiedVariant.txt",
  "bytes": 88425,
  "sha256": "a7f0c9dbbca85cffd90517fa6ea9be97d2e6f811328a59b6b303d58a418ac9be"
 },
 {
  "file": "data/raw/kTraditionalVariant.txt",
  "bytes": 86288,
  "sha256": "4eca6285d45070548e6e6c06e4b48c3ca6866d4380e8cb980c512f5d1fc71895"
 },
 {
  "file": "data/raw/moe-README.md",
  "bytes": 1214,
  "sha256": "a93321d9381bc1cf34b4ad844f71607fa748c86c0b228ae37d46720d6a659cb2"
 },
 {
  "file": "data/raw/moe-revised.json.gz",
  "bytes": 20310688,
  "sha256": "cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e"
 },
 {
  "file": "data/raw/naming-character-meanings-v7.1-subset.json",
  "bytes": 259062,
  "sha256": "59be39f7d9cbed1db5220721c015445546a19aa9967e59d4db0f820f3bcee8c1"
 },
 {
  "file": "data/raw/naming-character-meanings-v71-m460-b02-subset.json",
  "bytes": 422594,
  "sha256": "f009bf99327d964371b0e11b305e041215c88d1f067f583b18d6d63953c7a545"
 },
 {
  "file": "data/raw/naming-citations-v7-errata-r2.json",
  "bytes": 10617,
  "sha256": "e61707d9e3ac04110cdcaa924dd53a32b8bcc0ae8a0d0b0cbf9016a83108b945"
 },
 {
  "file": "data/raw/naming-citations-v7-review.json",
  "bytes": 70982,
  "sha256": "e5d3909b04812c418feffbbb34cdecd3224527130a4ddfa91b62432e7ef59cc3"
 },
 {
  "file": "data/raw/naming-meanings-v7-errata-r1.json",
  "bytes": 2174,
  "sha256": "e0bafe66312b98df77a367402915da57a3d5fa2c43ce56ca6af85a41cb4c3c0a"
 },
 {
  "file": "data/raw/naming-meanings-v7-review.json",
  "bytes": 692058,
  "sha256": "8bdf895484e9b88daaa822fdd873901ee3dba994f23961cc836692f340446b1c"
 },
 {
  "file": "data/raw/poetry-LICENSE",
  "bytes": 1076,
  "sha256": "c195319aeaa3ffcbe16aa5d26eec19eae5a42f84337dd2b3dc3c9d5ccbbd6507"
 },
 {
  "file": "data/raw/shijing.json",
  "bytes": 156972,
  "sha256": "3c7ca54d59424542ada99adfcc85420287fbbd5c8a511e9baf705cb2b04051e7"
 },
 {
  "file": "data/raw/unicode-LICENSE",
  "bytes": 2033,
  "sha256": "fe5c62b543e287981db198f2acfa0ca732d12591a1024536dc8fd85dacd77104"
 },
 {
  "file": "data/raw/zhouyi-LICENSE",
  "bytes": 1070,
  "sha256": "0506d67239c89a3d3b14e253ed29e20e2e9259b41c4b32031eab5ac22ed2811f"
 },
 {
  "file": "data/raw/zhouyi.tar.gz",
  "bytes": 123007,
  "sha256": "0a847c0b9b876f9926e4896399e31ee44f88292db107bc865d70e2d7308b15a0"
 },
 {
  "file": "data/source-lock.json",
  "bytes": 5953,
  "sha256": "b1d206cdcfa2da184009442ba705d2231d8f0a43c2f5a9885a122a3e5d353bba"
 }
];
const replayPublicationBundleFiles:ReadonlyArray<string>=["data/naming-character-meanings-v71-m460-b02-admission.json","data/naming-character-meanings-v71-m460-b02-manifest.json","data/naming-character-meanings-v71-m460-b02-profile.json","data/naming-character-meanings-v71-m460-b02-root-decision.json","data/naming-character-meanings-v71-m460-b02-source-lock.json","data/raw/naming-character-meanings-v71-m460-b02-subset.json"];
/** The pinned real loader owns lstat/read and rejects partial, symlink or unreadable bundles. */
function readReplayPublicationBundle(directory:string,afterRead:()=>void):ReplayPublicationBundle {
 const presence=probeM460PublicationPresence(directory);afterRead();
 if(!presence||presence.schema!=='m460-publication-presence/1'||!Array.isArray(presence.files)||!isDeepStrictEqual(presence.files.map(row=>row.file),replayPublicationBundleFiles))throw new Error('固定7.1可选出版资料探测接口身份不一致。');
 if(presence.mode==='all-absent'){
  if(presence.files.some(row=>row.state!=='absent'))throw new Error('固定7.1可选出版资料缺失状态不一致。');
 }else if(presence.mode==='all-present'){
  if(presence.files.some(row=>row.state!=='present'||!Number.isSafeInteger(row.bytes)||row.bytes<0||!/^[a-f0-9]{64}$/.test(row.sha256)))throw new Error('固定7.1可选出版资料实际字节身份无效。');
 }else throw new Error('固定7.1可选出版资料存在状态无效。');
 return presence;
}
function assertReplayPublicationBundle(state:ReplayOperationState):ReplayPublicationBundle {
 const current=readReplayPublicationBundle(state.operation.directory,()=>assertReplayOperationRuntime(state));
 if(state.publicationBundle===undefined)state.publicationBundle=current;
 else if(!isDeepStrictEqual(state.publicationBundle,current))throw new Error('本次内部读取期间可选出版资料的存在状态或字节身份发生变化。');
 return current;
}
function selectedReplayPublicationSource(session:NamingSession):SourceRecord {
 const sources=session.sourceSnapshot?.sources.filter(source=>source.id===NAMING_EDITORIAL_V71_PINS.sourceId);
 if(!sources||sources.length!==1)throw new Error('命名7.1必须保存唯一的实际出版来源身份。');
 return sources[0];
}
function selectReplayPublication(session:NamingSession,version:ReturnType<typeof resolveSessionNamingRulesVersion>):ReplayPublicationKind {
 if(version!==NAMING_RULE_V71_VERSION)return 'base';
 const sha=selectedReplayPublicationSource(session).sha256;
 if(sha===NAMING_EDITORIAL_V71_PINS.sourceAggregateSha256)return 'legacy40';
 if(sha===replayApproved60SourceSha256)return 'approved60';
 throw new Error('未知或未准入的7.1出版摘要，不能借用当前资料。');
}
/** The real public loader authenticates legacy40 first, then an optional approved60. */
function authenticateReplayPublication(directory:string,publication:Exclude<ReplayPublicationKind,'base'>,session:NamingSession,bundle:ReplayPublicationBundle):SourceRecord {
 const loaded=loadNamingEditorialV71Data(directory);
 const actualExpected=bundle.mode==='all-present'?replayApproved60SourceSha256:NAMING_EDITORIAL_V71_PINS.sourceAggregateSha256;
 if(!loaded||loaded.identity.ruleVersion!==NAMING_RULE_V71_VERSION||loaded.identity.sourceId!==NAMING_EDITORIAL_V71_PINS.sourceId||loaded.identity.sourceSha256!==actualExpected||loaded.source.id!==NAMING_EDITORIAL_V71_PINS.sourceId||loaded.source.sha256!==actualExpected)throw new Error('实际完整7.1出版认证与可选资料字节身份不一致。');
 if(publication==='approved60'&&bundle.mode!=='all-present')throw new Error('保存的新7.1出版来源缺少完整已准入资料。');
 const selected=publication==='legacy40'?FIXED_NAMING_EDITORIAL_V71_DATA.source:loaded.source;
 const expected=publication==='legacy40'?NAMING_EDITORIAL_V71_PINS.sourceAggregateSha256:replayApproved60SourceSha256;
 if(selected.sha256!==expected||!isDeepStrictEqual(selectedReplayPublicationSource(session),selected))throw new Error('命名7.1保存来源与实际完整出版认证身份不一致。');
 return selected;
}
function assertReplayApproved60Files(directory:string,afterRead:()=>void):void {
 for(const row of replayApproved60Receipt){
  const bytes=readFileSync(join(directory,replaySourcePath(row.file)));afterRead();
  if(replayIsProxy(bytes)||packSha(bytes)!==row.sha256||bytes.length!==row.bytes)throw new Error('新7.1完整出版原件摘要或字节数不一致：'+row.file);
 }
}
function assertReplayReceiptRow(state:ReplayOperationState,row:ReplaySourceReceiptRow):void {
 const bytes=replayReceiptRead(state,row.file,row.sha256);
 if(row.bytes!==undefined&&bytes.length!==row.bytes)throw new Error('固定命名来源收据字节数不一致：'+row.file);
}
/** The all-present public loader consumes the real old45 union approved44: sixty files. */
function buildReplayPresentV71Receipt(state:ReplayOperationState):ReadonlyArray<ReplaySourceReceiptRow> {
 const rows=new (replayMapConstructor as typeof Map)<string,ReplaySourceReceiptRow>();
 for(const row of buildReplaySourceReceipt(state,true))rows.set(row.file,row);
 for(const row of replayApproved60Receipt){const previous=rows.get(row.file);if(previous&&previous.sha256!==row.sha256)throw new Error('新7.1与固定基础来源收据冲突：'+row.file);rows.set(row.file,row);}
 const receipt=[...rows.values()];receipt.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
 if(receipt.length!==60)throw new Error('可选7.1完整来源收据未覆盖60件固定原件。');
 for(const row of receipt)assertReplayReceiptRow(state,row);
 return freezeReplayExpected(receipt);
}
function mergeReplayOperationReceipt(state:ReplayOperationState,publication:ReplayPublicationKind,receipt:ReadonlyArray<ReplaySourceReceiptRow>):void {
 const rows=new (replayMapConstructor as typeof Map)<string,ReplaySourceReceiptRow>();
 for(const row of state.receipt??[])rows.set(row.file,row);
 for(const row of receipt){
  const previous=rows.get(row.file);
  if(previous&&(previous.sha256!==row.sha256||previous.bytes!==undefined&&row.bytes!==undefined&&previous.bytes!==row.bytes))throw new Error('本次内部读取的完整来源收据冲突：'+row.file);
  rows.set(row.file,previous?.bytes!==undefined?previous:row);
 }
 const legacy40=state.legacy40Authenticated||publication==='legacy40',presentV71=state.presentV71Authenticated||publication!=='base'&&state.publicationBundle?.mode==='all-present';
 const expectedCount=presentV71?60:(legacy40?45:35);
 const merged=[...rows.values()];merged.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
 if(merged.length!==expectedCount)throw new Error('本次内部读取的出版来源闭包数量不一致。');
 state.receipt=freezeReplayExpected(merged);state.legacy40Authenticated=legacy40;state.presentV71Authenticated=presentV71;
}

function assertReplayReceiptUnchanged(state:ReplayOperationState,receipt:ReadonlyArray<ReplaySourceReceiptRow>):void {
 for(const row of receipt)assertReplayReceiptRow(state,row);
 assertReplayOperationRuntime(state);
}
function replayCurrentDependencyProjection():unknown {
 return dependencyValue({review:readLiveReviewedCitationDependenciesV7(),reading:readLiveCitationReadingDependenciesV6(),names:readLiveSupplementalNameDependenciesV6()});
}
function assertReplayLiveExpected(state:ReplayOperationState,snapshot:ReplayFixedSnapshot):boolean {
 assertReplayOperationRuntime(state);let eligible=false;
 try{eligible=isDeepStrictEqual(replayCurrentDependencyProjection(),snapshot.expectedDependencyProjection);}catch(error){if(!(error instanceof CitationReplayIneligible))throw error;}
 if(!eligible&&state.operation.used)throw new Error('本次操作已使用的固定命名live依赖发生变化，不得混合不同时期结果。');
 return eligible;
}
interface ReplayPureTexts {baseJson:string;v4Json:string;v5Json:string;v6Json:string;v7Json:string;datasetJson:string;}
interface ReplayPureGraph {
 base:unknown;v4:ReturnType<typeof loadNamingEditorialV4Data>['table'];v5:ReturnType<typeof loadNamingEditorialV5Data>['table'];v6:ReturnType<typeof loadNamingEditorialV6Data>['table'];v7:unknown;
 expected:FactDataset&{knowledge:unknown[]};expectedDependencyProjection:unknown;
}
interface ReplayPureEntry {key:string;graph:ReplayPureGraph;}
const replayPureBuilderVersion='m472-replay-pure-graph/1';
const replayPureGate5Binding=createCitationReadingGateV5,replayPureGate6Binding=createCitationReadingGateV6,replayPureMeaningBinding=selectedMeaningBelongsToReading;
let replayPureSlot0:ReplayPureEntry|undefined,replayPureSlot1:ReplayPureEntry|undefined;
function replayPureBuildersUnchanged():boolean {
 return createCitationReadingGateV5===replayPureGate5Binding&&createCitationReadingGateV6===replayPureGate6Binding&&selectedMeaningBelongsToReading===replayPureMeaningBinding;
}
function replayPureContentKey(version:ReturnType<typeof resolveSessionNamingRulesVersion>,texts:ReplayPureTexts):string {
 const sha=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
 return replayPureBuilderVersion+'|naming='+version+'|base='+sha(texts.baseJson)+'|v4='+sha(texts.v4Json)+'|v5='+sha(texts.v5Json)+'|v6='+sha(texts.v6Json)+'|v7='+sha(texts.v7Json)+'|dataset='+sha(texts.datasetJson);
}
/** Own JSON graphs only. Gates and their mutable Maps remain local to this build. */
function buildReplayPureGraph(texts:ReplayPureTexts):ReplayPureGraph {
 const base=JSON.parse(texts.baseJson),v4=JSON.parse(texts.v4Json),v5=JSON.parse(texts.v5Json),v6=JSON.parse(texts.v6Json),v7=JSON.parse(texts.v7Json),expected=JSON.parse(texts.datasetJson);
 const gate5=createCitationReadingGateV5(v4,v5),gate6=createCitationReadingGateV6(v6,gate5);
 const expectedDependencyProjection=dependencyValue({review:{base,v7,lookupInputJson:JSON.stringify(v7)},reading:gate6.readDependencies(),names:{nameRules:v6.nameRules}});
 return freezeReplayExpected({base,v4,v5,v6,v7,expected,expectedDependencyProjection});
}
function getReplayPureGraph(state:ReplayOperationState,version:ReturnType<typeof resolveSessionNamingRulesVersion>,texts:ReplayPureTexts,fresh:{v4:ReplayPureGraph['v4'];v5:ReplayPureGraph['v5'];v6:ReplayPureGraph['v6'];v7:unknown}):ReplayPureGraph {
 try{
  assertReplayOperationRuntime(state);
  let cacheable=replayPureBuildersUnchanged();if(!cacheable){replayPureSlot0=undefined;replayPureSlot1=undefined;}
  const key=replayPureContentKey(version,texts),entry=cacheable?(replayPureSlot0?.key===key?replayPureSlot0:replayPureSlot1?.key===key?replayPureSlot1:undefined):undefined;
  assertReplayOperationRuntime(state);
  let graph=entry?.graph??buildReplayPureGraph(texts);
  const compareFresh=(value:ReplayPureGraph)=>{
   if(!isDeepStrictEqual(value.v4,fresh.v4)||!isDeepStrictEqual(value.v5,fresh.v5)||!isDeepStrictEqual(value.v6,fresh.v6))throw new Error('首次引文上下文的固定规则原件与真实校验结果不一致。');
   if(!isDeepStrictEqual(value.v7,fresh.v7))throw new Error('固定命名纯图与本次完整7.0原文不一致。');
   assertReplayOperationRuntime(state);
  };
  compareFresh(graph);
  if(entry&&!replayPureBuildersUnchanged()){
   replayPureSlot0=undefined;replayPureSlot1=undefined;cacheable=false;
   graph=buildReplayPureGraph(texts);compareFresh(graph);
  }
  assertReplayOperationRuntime(state);
  if(!replayPureBuildersUnchanged()){replayPureSlot0=undefined;replayPureSlot1=undefined;}
  else if(cacheable&&!entry){const next=Object.freeze({key,graph});assertReplayOperationRuntime(state);replayPureSlot1=replayPureSlot0;replayPureSlot0=next;}
  return graph;
 }catch(error){replayPureSlot0=undefined;replayPureSlot1=undefined;throw error;}
}
function loadReplayFixedSnapshot(state:ReplayOperationState,version:ReturnType<typeof resolveSessionNamingRulesVersion>,publication:ReplayPublicationKind,session:NamingSession):ReplayFixedSnapshot {
 return authenticatingReplayOperation(state,()=>{
  const directory=state.operation.directory,raw=loadOwnedNamingRuleJsonInputs(directory);assertReplayOperationRuntime(state);
  const verified4=loadNamingEditorialV4Data(directory).table;assertReplayOperationRuntime(state);
  const verified5=loadNamingEditorialV5Data(directory).table;assertReplayOperationRuntime(state);
  const verified6=loadNamingEditorialV6Data(directory).table;assertReplayOperationRuntime(state);
  const publicationSource=publication==='base'?undefined:authenticateReplayPublication(directory,publication,session,state.publicationBundle!);assertReplayOperationRuntime(state);
  const v7=JSON.parse(raw.v7Json);
  if(v7.base?.datasetJsonFile!=='data/dataset-v6.json'||v7.base.knowledgePackFile!=='data/knowledge-v6.sqlite'||typeof v7.base.datasetJsonSha256!=='string'||!/^[a-f0-9]{64}$/.test(v7.base.datasetJsonSha256))throw new Error('首次引文上下文的固定字库路径或身份无效。');
  const datasetText=replayReceiptText(state,'data/dataset-v6.json',v7.base.datasetJsonSha256);
  const receipt=publication!=='base'&&state.publicationBundle?.mode==='all-present'?buildReplayPresentV71Receipt(state):buildReplaySourceReceipt(state,publication==='legacy40');
  assertReplayPublicationBundle(state);
  const v4Receipt=receipt.find(row=>row.file==='data/naming-editorial-v4.json'),datasetReceipt=receipt.find(row=>row.file==='data/dataset-v6.json');
  if(!v4Receipt||!datasetReceipt||datasetReceipt.sha256!==v7.base.datasetJsonSha256)throw new Error('固定命名纯图的4.0或字库原件收据身份不一致。');
  const v4Text=replayReceiptText(state,v4Receipt.file,v4Receipt.sha256);
  const graph=getReplayPureGraph(state,version,{baseJson:raw.baseJson,v4Json:v4Text,v5Json:raw.v5Json,v6Json:raw.v6Json,v7Json:raw.v7Json,datasetJson:datasetText},{v4:verified4,v5:verified5,v6:verified6,v7});
  const ownRaw=Object.freeze({baseJson:raw.baseJson,v5Json:raw.v5Json,v6Json:raw.v6Json,v7Json:raw.v7Json});
  const inputs=Object.freeze({raw:ownRaw,verifiedV4Table:graph.v4});
  assertReplayOperationRuntime(state);
  return Object.freeze({inputs,expected:graph.expected,expectedDependencyProjection:graph.expectedDependencyProjection,packSha256:v7.base.knowledgePackSha256,packVersion:v7.base.activeVersion,receipt,publication,publicationSource});
 });
}
function prepareReplayOperationBatch(state:ReplayOperationState,archive:FactArchive,readPack:(bytes:Uint8Array)=>FactDataset&{knowledge:unknown[]},version:ReturnType<typeof resolveSessionNamingRulesVersion>,session:NamingSession):{inputs:ReplayCitationInputs;archive:FactArchive;eligible:boolean} {
 return authenticatingReplayOperation(state,()=>{
 assertReplayOperationRuntime(state);
 assertReplayPublicationBundle(state);
 const publication=selectReplayPublication(session,version);
 const pack=new Uint8Array(archive.pack),actualSha=packSha(pack),key=actualSha+'/'+archive.version+'/'+publication;
 const snapshots=state.snapshots!;let snapshot=snapshots.get(key);
 if(!snapshot){snapshot=loadReplayFixedSnapshot(state,version,publication,session);assertReplayOperationActive(state);snapshots.set(key,snapshot);mergeReplayOperationReceipt(state,publication,snapshot.receipt);}
 if(publication!=='base'&&(!snapshot.publicationSource||!isDeepStrictEqual(selectedReplayPublicationSource(session),snapshot.publicationSource)))throw new Error('本次内部读取的保存出版来源身份发生变化。');
 assertReplayReceiptUnchanged(state,state.receipt!);assertReplayPublicationBundle(state);
 if(actualSha!==archive.sha256||archive.sha256!==snapshot.packSha256||archive.version!==snapshot.packVersion||archive.version!==archive.sha256.slice(0,12))throw new Error('首次引文上下文的实际归档原包身份不一致。');
 const actual=readPack(pack);assertReplayOperationRuntime(state);
 const expected=snapshot.expected;
 if(actual.version!==archive.version||!isDeepStrictEqual([actual.characters,actual.citations,actual.knowledge,actual.sources],[expected.characters,expected.citations,expected.knowledge,expected.sources]))throw new Error('首次引文上下文的实际原包四表与已认证JSON全字段或原顺序不一致。');
 const eligible=assertReplayLiveExpected(state,snapshot);
 if(eligible)state.operation.used=true;
 return{inputs:snapshot.inputs,archive:{sha256:archive.sha256,version:archive.version,pack,dataset:actual},eligible};
 });
}
/** Lifecycle consumer only: unknown objects never register an operation. */
export function sealStoredReadOperation(operation:StoredReadOperation):void {
 const state=findReplayOperation(operation);if(!state||!state.operation.used)return;
 authenticatingReplayOperation(state,()=>{
  assertReplayPublicationBundle(state);
  assertReplayReceiptUnchanged(state,state.receipt!);
  assertReplayPublicationBundle(state);
  assertReplayOperationRuntime(state);
  for(const snapshot of state.snapshots!.values())assertReplayLiveExpected(state,snapshot);
  assertReplayOperationRuntime(state);
 });
}
/** Always-safe finally retirement; no source read or caller callback occurs. */
export function retireStoredReadOperation(operation:StoredReadOperation):void {
 const state=findReplayOperation(operation);if(!state)return;
 state.retired=true;replayApply(replayOperationDelete,replayOperationStates,[operation]);state.snapshots=undefined;state.receipt=undefined;state.publicationBundle=undefined;state.legacy40Authenticated=false;state.presentV71Authenticated=false;
}

/** Store's runtime-private SQL branch is the only issuer of this one-use input. */
export function verifyStoredCandidateFacts(capsule:object):CandidateFactVerification {
 const owned=takeStoredCandidateFactReplayInput(capsule);
 const operation=consumedReplayOperation(owned);
 // structuredClone is an explicit trusted startup platform service. A later
 // replacement is rejected without calling a new getter/wrapper, including
 // through a fallback that would otherwise enter the old clone operations.
 assertReplayPlatformCloneUnchanged();
 // Qualification itself uses only fixed reflection and index loops. Replaced
 // methods return to the original public path before any fresh loader runs.
 if(!replayAdmissionIntrinsicsIntact()){if(operation?.operation.used)throw new Error('本次内部读取期间原生绑定发生变化。');return verifyCandidateFactsCore(owned.session,owned.archive,owned.builtin,owned.projectBasis);}
 // Preserve original version/project/archive preconditions before new admission.
 const {namingVersion}=candidateFactPrerequisites(owned.session,owned.archive,owned.projectBasis);
 assertArchiveSourceRecords(owned.session,owned.archive.dataset,new Map(owned.session.sourceSnapshot?.sources.map(source=>[source.id,source])??[]));
 if(!replaySerializationIntact()||!replayMapIntrinsicsIntact()||!nativeReplayCallbacksUnchanged()){if(operation?.operation.used)throw new Error('本次内部读取期间固定规则运行环境发生变化。');return verifyCandidateFactsCore(owned.session,owned.archive,owned.builtin,owned.projectBasis);}
 const prepared=operation?prepareReplayOperationBatch(operation,owned.archive,owned.readPack,namingVersion,owned.session):loadReplayCitationInputs(owned.directory,owned.archive,owned.readPack,namingVersion,owned.session);
 // Ineligibility is decided before the first replayed candidate. All fresh
 // source and four-table failures above propagate; no catch/retry exists.
 const result=verifyCandidateFactsCore(owned.session,prepared.archive,owned.builtin,owned.projectBasis,prepared.eligible?prepared.inputs:undefined,prepared.eligible?operation:undefined);
 if(operation?.operation.used)authenticatingReplayOperation(operation,()=>{
  assertReplayPublicationBundle(operation);
  assertReplayReceiptUnchanged(operation,operation.receipt!);
  assertReplayPublicationBundle(operation);
  assertReplayOperationRuntime(operation);
 });
 return result;
}
