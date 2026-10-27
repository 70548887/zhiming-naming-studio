import {WriterLockCleanupError,createCustomerWriteCommitIssuer,retainWriterSecondaryFailures,writerSecondaryFailures,runWriterWithCleanup,readCustomerWriteNotice,recordCustomerWriteNotice,type CustomerWriteNoticeScope,type WriterSecondaryFailure} from './writer-finalization';
import {createCustomerDatabase,assertCustomerDatabaseForeignKeys} from './customer-database-connection';
import {readCulturalCatalogQuery,queryCulturalComparisonCatalog} from './cultural-comparison-catalog';
import {captureCandidate2ReportInput,renderCandidate2ReportSource} from './candidate2-report-source';
import type {Candidate2ReportDocument} from '../shared/candidate2-report-api';
import {createCandidate2GenerationAdoptionV2,createCandidate2SavedVerifierV2} from './candidate2-generation-adoption-v2';
import {adoptionDigest} from './candidate2-generation-adoption-codec-v2';
import {encodeCandidate2NativeStorageV1,insertCandidate2NativeStorageV1,readCandidate2NativeEnvelopeV1,readCandidate2NativeClosedV1,assertCandidate2NativeReadReceiptV1,getCandidate2NativeOwnershipV1,assertCandidate2NativeStorageV1,hasCandidate2NativeFootprint,type Candidate2NativeReadReceiptV1} from './candidate2-native-storage-v1';
import {applyCandidate2NativeReviewV1} from './candidate2-native-review-v1';
import {captureCandidate2HistoryRestoreInput} from './candidate2-history-restore-input';
import {projectCandidate2HistoryReview} from './candidate2-history-restore-projection';
import {snapshotApplicationJson} from './project-application-v132-r2-json';
import {namingInputKey} from '../shared/workflow';
import type {Candidate2NamingSelection} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2OwnedMechanicsV2,Candidate2AdoptedNamingSessionV2,Candidate2AdoptionEnvelopeV2} from '../shared/candidate2-generation-adoption-v2';
import {compactCustomerVersion,COMPACT_CUSTOMER_VERSION,assertRawCustomerSchema,copyCompactSnapshotObjects,isCompactCustomerDatabase,bindCompactCustomerDatabase,assertCompactCustomerSchema,createCompactCustomerDatabase,migrateRawCustomerDatabase,compactCustomerBytes,compactCommitBytes,compactLogicalTableInfo,customerRows,validateCompactCustomerStorage,writeCompactSession,CUSTOMER_DATABASE_MAX_BYTES,CUSTOMER_DATABASE_WARNING_BYTES} from './compact-customer-store';
import {readCustomerRevisionSequence,preserveCustomerRevisionSequence} from './customer-revision-sequence';
import {encodeCustomerBackup,decodeCustomerBackup} from './customer-backup-envelope';
import {CULTURAL_COMPACT_CUSTOMER_VERSION,compactCustomerCapabilities,type CompactCustomerVersion} from './compact-customer-schema';
import {preserveCustomerStoragePreimage} from './customer-storage-preimage';
import type {CustomerRestorePlan,CustomerRestoreResult,CustomerStorageVersion,StorageCounts} from '../shared/cultural-storage-v3';
import type {CulturalHead,CulturalRevision,CulturalSaveRequest,PreparedCulturalWrite,CommitCulturalWriteRequest,CulturalSaveResult,CulturalWriteIdentity,CulturalWriteReceipt,CulturalRevisionResult} from '../shared/cultural-storage-v3';
import type {CulturalProviderAPI} from '../shared/qimen-cultural-provider-v1';
import {ownCulturalJson,culturalCanonicalDigest} from '../domain/qimen-cultural-comparison-canonical';
import {compareQimenCultural} from '../domain/qimen-cultural-comparison';
import {encodeCulturalEvidence,type EncodedCulturalEvidence} from './cultural-source-chunks';
import {encodeCulturalRevisionLeaf} from './cultural-revision-codec';
import {canonicalCulturalWriteIdentity,decodeCulturalWriteIdentity,culturalComparisonId} from './cultural-write-identity';
import {culturalIntent,culturalNoteSha,readCulturalSaveRequest,sameCulturalRetry} from './cultural-persistence-v1';
import {prepareCompactCulturalSemanticsV1,assertCompactCulturalSemanticsV1,readCompactCulturalComparisonV1,listCompactCulturalRevisionsV1,copyCompactCulturalRowsV1,withCompactCulturalSourceReplayOperation,type CompactCulturalSourceReplayOperation} from './compact-cultural-semantics';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import {querySessionCatalog} from './session-catalog-query';
import {REVIEWED_DATA_SOURCE_IDS} from '../shared/reviewed-naming-data';
import {loadReviewedNamingDataResources} from './reviewed-naming-data-resources';
import {hasReviewedDataFootprint,verifyReviewedNamingDataSession,assertUnchangedReviewedData,assertReviewedDataInput} from './reviewed-naming-data-verification';
import type {SessionCatalogRequest,SessionCatalogPage} from '../shared/session-pagination';
import type {CustomerWriteNotice} from '../shared/customer-write-notice';
import {writeCustomerDatabaseAtomically,CustomerDatabaseCleanupError,type CustomerDatabaseCommitReceipt} from './customer-atomic-write';
export {CustomerWriteCommittedError} from './writer-finalization';
import {withParentNameSourceBoundary,PARENT_NAME_METHOD_SOURCE_ID} from './parent-name-source-validator';
import {hasProjectNamingUseFootprint,verifySavedProjectNamingUse,type SavedProjectNamingUseDependencies} from './verify-project-naming-use';
import {assertUnchangedProjectNamingUse,assertProjectNamingUseInput} from './project-naming-identity';
import {loadRootFeedbackResources} from './bazi-root-feedback-resources';
import {createBaziRootFeedbackFacade} from './bazi-root-feedback-facade';
import {verifySessionParentNamePhonetics,validateParentNameProfileSync,assertUnchangedParentNamePhoneticReview,assertParentNameReviewInput} from './parent-name-phonetics-adapter';
import {WordPronunciationSessionResources} from './word-pronunciation-session';
import {assertWordPronunciationFields,hasWordPronunciationFootprint,readWordPronunciationPreference,validWordPronunciationPreference,WORD_PRONUNCIATION_SOURCE_IDS} from '../shared/word-pronunciation-reference';
import {loadNamePhoneticAdapter} from './name-phonetic-adapter';
import {hasNamePhoneticFootprint,readNamePhoneticPreferences,validNamePhoneticPreferences,NAME_PHONETIC_SOURCE_IDS} from '../shared/name-phonetic-preferences';
import {ElementAssessmentPackage,hasElementAssessment,assertElementInput} from './element-assessment-data';
import {ELEMENT_ASSESSMENT_SOURCE_ID} from '../shared/element-assessment';
import {CLASSICS_SOURCE_IDS} from './classics-data';
import {loadMeaningContextData,MEANING_CONTEXT_SOURCE_IDS} from './meaning-context-data';
import {hasMeaningContextReview,verifySessionMeaningContextReviews,assertUnchangedMeaningContextReview,assertMeaningContextHistoryIdentity} from './meaning-context-review';
import type {MeaningContextPack} from './meaning-context-review';
import {assertMeaningContextReviewInput} from '../shared/meaning-context-review';
import {OFFICIAL_NAME_POPULARITY_SOURCE_ID} from '../shared/official-name-popularity';
import {validModernRecord} from '../shared/modern-practical-evidence';
import {verifySessionModernRecords,assertModernTransition,transferModernAuthorization} from './modern-practical-evidence';
import {ALL_NAMING_RULE_SOURCE_IDS,resolveSessionNamingRulesVersion,validSessionNamingRules} from '../shared/naming-rules';
import {loadNamingEditorialV6Data} from './naming-editorial-v6-data';
import {selectedReferenceOnlyReading,validReadingReferenceMetadata} from '../shared/character-reading-reference';
import {loadNamingEditorialPackages,verifySessionNamingEditorialProvenance} from './naming-editorial-packages';
import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, existsSync, mkdirSync, renameSync, writeFileSync, copyFileSync, openSync, closeSync, unlinkSync, statSync, realpathSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash, randomUUID, randomInt } from 'node:crypto';
import { isDeepStrictEqual,types as nodeTypes } from 'node:util';
import { LunarMonth } from 'lunar-typescript';
import {validNumerologySnapshot} from '../domain/numerology';
import {validQimenSnapshot} from './qimen-snapshot';
import {loadNumerologyData,verifyNumerologyProvenance} from './numerology-data';
import {loadQimenSources} from './qimen-data';
import {assertReviewRevision,reviewRevision,validReviewRevision,validReviewToken} from '../shared/review-version';
import {validCivilBirthProfile} from '../shared/civil-birth';
import {validBaziSnapshot} from './bazi-snapshot';
import {createSessionSourceSnapshot,validSessionSources} from '../shared/session-sources';
import {loadBaziSources,verifyBaziProvenance} from './bazi-data';
import {validMonthAuthorityMethod} from '../shared/month-authority-method';
import {loadMonthAuthoritySources,verifyMonthAuthorityProvenance} from './month-authority-data';
import {validSeasonalMethod} from '../shared/seasonal-method';
import {MONTHLY_SEASONAL_KNOWLEDGE_PREFIX} from './monthly-seasonal-knowledge';
import {loadMonthlySeasonalSources,verifyMonthlySeasonalProvenance} from './monthly-seasonal-data';
import {packInfo} from './data-maintenance';
import {loadSeasonalConditionSources,verifySeasonalConditionProvenance} from './seasonal-condition-data';
import {loadCongWealthSources,verifyCongWealthProvenance} from './cong-wealth-data';
import {loadCongShaSources,verifyCongShaProvenance} from './cong-sha-data';
import {loadSolarTimeSources,verifySolarTimeProvenance} from './solar-time-data';
import {loadFollowingRestrictionsSources,verifyFollowingRestrictionsProvenance} from './following-restrictions-data';
import {loadDitianRenSources,verifyDitianRenProvenance} from './ditian-ren-data';
import {loadRenNecessarySources,verifyRenNecessaryProvenance} from './ren-necessary-data';
import {loadRenActionsSources,verifyRenActionsProvenance} from './ren-actions-data';
import {loadRenCapacitiesSources,verifyRenCapacitiesProvenance} from './ren-capacities-data';
import {loadRenDirectionsSources,verifyRenDirectionsProvenance} from './ren-directions-data';
import {loadRenJointBattleSources,verifyRenJointBattleProvenance} from './ren-joint-battle-data';
import {loadNameImageryData,loadNameImagerySources,verifyNameImageryProvenance,NAME_IMAGERY_SOURCE_IDS} from './name-imagery-data';
import {nameImageryProfile,validNameImageryAnalysis} from '../domain/name-imagery';
import yueTable from '../../data/yue-reading-table.json';
import type {YueReadingData} from '../shared/types';
import {isCanonicalYueNameReading,YUE_READING_SOURCE_ID} from '../domain/yue-reading';
import {loadYueReadingData} from './yue-reading-data';
import {verifyYueReadingProvenance} from './yue-reading-provenance';
import yueHomophoneRules from '../../data/yue-homophone-rules.json';
import yueHomophoneExpandedRules from '../../data/yue-homophone-rules-v1-1.json';
import {validYueHomophoneRuleVersion} from '../shared/yue-homophone-types';
import type {YueHomophoneData} from '../shared/yue-homophone-types';
import {isCanonicalYueHomophoneReviewForVersion,resolveSessionYueHomophoneVersion,ALL_YUE_HOMOPHONE_SOURCE_IDS as YUE_HOMOPHONE_SOURCE_IDS} from '../domain/yue-homophone-router';
import {loadYueHomophonePackages,verifySessionYueHomophoneProvenance} from './yue-homophone-packages';
import {validRenMethod} from '../shared/ren-method';
import {validRenCommentarySnapshot as validRenCommentaryAnalysis} from './ren-snapshot';
import {DATA_PACK_BOUNDARY,type DataMaintenanceStatus} from '../shared/data-maintenance';
import {verifyFixedRuleProvenance} from './fixed-rule-provenance';
import {ARCHIVE_MAX_BYTES,ARCHIVE_MAX_COUNT,packSha,verifyCandidateFacts,verifyStoredCandidateFacts,sealStoredReadOperation,retireStoredReadOperation,validCharacterReading,type FactArchive} from './candidate-facts';
import type {ResolvedNamingBasis} from '../domain/naming-element-basis';
import {validFactVerification} from '../shared/candidate-facts';
import {requiresSessionSourceManifest} from './saved-analysis-policy';
import {validBirthTimeInput} from '../shared/birth-time-basis';
import type { BirthProfile, CharacterEntry, Citation, KnowledgeEntry, NameCandidate, NamingPreferences, NamingSession, SessionRevision, SourceRecord, StudioSettings } from '../shared/types';

export interface Dataset { version:string;characters:CharacterEntry[];citations:Citation[];knowledge:KnowledgeEntry[];sources:SourceRecord[]; }
export type StoredReadOperation={readonly directory:string;active:boolean;invalidated:boolean;authenticating:boolean;used:boolean};
interface PreparedCustomerRestoreState {view:CustomerRestorePlan;input:Uint8Array;staging:Uint8Array;expiresAt:number;}
export interface StoredCandidateFactReplayInputs {
  session:NamingSession;archive:FactArchive;builtin:FactArchive;directory:string;
  projectBasis?:Extract<ResolvedNamingBasis,{source:'project'}>;
  readPack:(bytes:Uint8Array)=>Dataset;
  operation?:StoredReadOperation;
}
/** One-use transport only. The runtime-private Store SQL reader is the sole issuer. */
export function takeStoredCandidateFactReplayInput(capsule:object):StoredCandidateFactReplayInputs {
  const input=storedRegistryGet(storedFactReplayInputs,capsule);storedRegistryDelete(storedFactReplayInputs,capsule);
  if(!input)throw new Error('保存事实重放缺少本次内部读取凭据。');return input;
}
type StoredDatabaseRole='current'|'restore-input'|'clean'|'pack';
interface StoredDatabaseRegistration {exec:Database['exec'];close:Database['close'];execOwner:object;closeOwner:object;role:StoredDatabaseRole;}
type Candidate2NativeLocator={table:'sessions'|'revisions';rowId:string|number};
interface StoredRowOrigin {database:Database;registration:StoredDatabaseRegistration;json:string;candidate2Row?:Candidate2NativeLocator;}
const storedGetOwnPropertyDescriptor=Object.getOwnPropertyDescriptor,storedGetPrototypeOf=Object.getPrototypeOf,storedHasOwn=Object.hasOwn;
const storedGetOwnPropertyNames=Object.getOwnPropertyNames,storedGetOwnPropertySymbols=Object.getOwnPropertySymbols;
const storedBootstrapCall=Function.prototype.call,storedBootstrapApply=Function.prototype.apply,storedBootstrapBind=Function.prototype.bind,storedBootstrapToString=Function.prototype.toString;
const storedInvoke=storedBootstrapBind.call(storedBootstrapCall,storedBootstrapApply) as <Result>(fn:Function,thisArg:unknown,args:unknown[])=>Result;
const storedFunctionSource=storedBootstrapBind.call(storedBootstrapCall,storedBootstrapToString) as (fn:Function)=>string;
// This stack invalidates reentrant outer reads; it never supplies a snapshot.
const storedReadOperations={__proto__:null,length:0} as {length:number;[index:number]:StoredReadOperation};
function storedInvalidateReadOperations():void {
  for(let index=0;index<storedReadOperations.length;index++){const outer=storedReadOperations[index];if(outer.active&&(outer.authenticating||outer.used))outer.invalidated=true;}
}
function storedOriginalDispatch(receiver:object,key:'readVerifiedSession'|'rows'|'settings'|'readPack',original:unknown):boolean {
  if(typeof original!=='function')return false;
  let current:object|null=receiver;
  while(current){
    if(nodeTypes.isProxy(current))return false;
    const descriptor=storedGetOwnPropertyDescriptor(current,key);
    if(descriptor)return storedHasOwn(descriptor,'value')&&descriptor.value===original;
    current=storedGetPrototypeOf(current) as object|null;
  }return false;
}
function candidate2OriginalMethod(receiver:object,key:string,original:unknown):boolean {
  let current:object|null=receiver;while(current){if(nodeTypes.isProxy(current))return false;const slot=storedGetOwnPropertyDescriptor(current,key);if(slot)return storedHasOwn(slot,'value')&&slot.value===original;current=storedGetPrototypeOf(current) as object|null;}return false;
}
function storedNativeMethodSlot(value:object,key:'exec'|'close'|'prepare'):{owner:object;value:unknown}|undefined {
  let current:object|null=value;
  while(current){
    if(nodeTypes.isProxy(current))return undefined;
    const field=storedGetOwnPropertyDescriptor(current,key);
    if(field)return storedHasOwn(field,'value')?{owner:current,value:field.value}:undefined;
    current=storedGetPrototypeOf(current) as object|null;
  }return undefined;
}
function storedOwnDataValue(value:unknown,key:PropertyKey):unknown {
  if(value===null||typeof value!=='object'&&typeof value!=='function'||nodeTypes.isProxy(value))return undefined;
  const field=storedGetOwnPropertyDescriptor(value,key);return field&&storedHasOwn(field,'value')?field.value:undefined;
}
const storedJSONBinding=storedGetOwnPropertyDescriptor(globalThis,'JSON');
const storedNativeJSON=storedJSONBinding&&storedHasOwn(storedJSONBinding,'value')?storedJSONBinding.value as unknown:undefined;
const storedNativeJSONParse=storedOwnDataValue(storedNativeJSON,'parse');
const storedNativeJSONStringify=storedOwnDataValue(storedNativeJSON,'stringify');
function storedNativeFunctionSource(value:unknown,name:'WeakMap'|'get'|'set'|'delete'|'parse'|'stringify'):boolean {
  if(typeof value!=='function'||nodeTypes.isProxy(value))return false;
  try{
    // The trusted bootstrap fixes invocation and source inspection before callers run.
    const source=storedFunctionSource(value);
    if(typeof source!=='string')return false;
    return source==='function '+name+'() { [native code] }';
  }catch{return false;}
}
const storedWeakMapConstructorCandidate=storedOwnDataValue(globalThis,'WeakMap');
const storedWeakMapPrototype=storedOwnDataValue(storedWeakMapConstructorCandidate,'prototype');
const storedWeakMapGet=storedOwnDataValue(storedWeakMapPrototype,'get');
const storedWeakMapSet=storedOwnDataValue(storedWeakMapPrototype,'set');
const storedWeakMapDelete=storedOwnDataValue(storedWeakMapPrototype,'delete');
function probeStoredWeakMapConstructor():typeof WeakMap|undefined {
  if(!storedNativeFunctionSource(storedWeakMapConstructorCandidate,'WeakMap')||!storedNativeFunctionSource(storedWeakMapGet,'get')||!storedNativeFunctionSource(storedWeakMapSet,'set')||!storedNativeFunctionSource(storedWeakMapDelete,'delete'))return undefined;
  if(typeof storedWeakMapGet!=='function'||typeof storedWeakMapSet!=='function'||typeof storedWeakMapDelete!=='function')return undefined;
  try{
    const Constructor=storedWeakMapConstructorCandidate as typeof WeakMap,registry=new Constructor<object,string>(),key={__proto__:null},value='stored-registry-probe';
    if(storedInvoke<unknown>(storedWeakMapSet,registry,[key,value])!==registry||storedInvoke<unknown>(storedWeakMapGet,registry,[key])!==value)return undefined;
    if(storedInvoke<unknown>(storedWeakMapDelete,registry,[key])!==true||storedInvoke<unknown>(storedWeakMapGet,registry,[key])!==undefined)return undefined;
    return Constructor;
  }catch{return undefined;}
}
const storedNativeWeakMapConstructor=probeStoredWeakMapConstructor();
function createStoredRegistry<Value>():WeakMap<object,Value>|undefined {
  const Constructor=storedNativeWeakMapConstructor;return Constructor?new Constructor<object,Value>():undefined;
}
function storedRegistryGet<Value>(registry:WeakMap<object,Value>|undefined,key:object):Value|undefined {
  if(!registry||typeof storedWeakMapGet!=='function')return undefined;
  return storedInvoke<Value|undefined>(storedWeakMapGet,registry,[key]);
}
function storedRegistrySet<Value>(registry:WeakMap<object,Value>|undefined,key:object,value:Value):void {
  if(registry&&typeof storedWeakMapSet==='function')storedInvoke<void>(storedWeakMapSet,registry,[key,value]);
}
function storedRegistryDelete<Value>(registry:WeakMap<object,Value>|undefined,key:object):void {
  if(registry&&typeof storedWeakMapDelete==='function')storedInvoke<void>(storedWeakMapDelete,registry,[key]);
}
function storedRegistryCallbacksUnchanged():boolean {
  return !!storedNativeWeakMapConstructor&&storedOwnDataValue(globalThis,'WeakMap')===storedNativeWeakMapConstructor&&storedOwnDataValue(storedNativeWeakMapConstructor,'prototype')===storedWeakMapPrototype&&storedOwnDataValue(storedWeakMapPrototype,'get')===storedWeakMapGet&&storedOwnDataValue(storedWeakMapPrototype,'set')===storedWeakMapSet&&storedOwnDataValue(storedWeakMapPrototype,'delete')===storedWeakMapDelete;
}
const storedFactReplayInputs=createStoredRegistry<StoredCandidateFactReplayInputs>();
function storedNativeJSONMethod(value:unknown,name:'parse'|'stringify'):boolean {
  return storedNativeFunctionSource(value,name);
}
function storedJSONCallbacksUnchanged():boolean {
  const binding=storedGetOwnPropertyDescriptor(globalThis,'JSON');
  if(!binding||!storedHasOwn(binding,'value')||binding.value!==storedNativeJSON||storedNativeJSON===null||typeof storedNativeJSON!=='object'||nodeTypes.isProxy(storedNativeJSON)||Array.isArray(storedNativeJSON))return false;
  const parse=storedOwnDataValue(storedNativeJSON,'parse'),stringify=storedOwnDataValue(storedNativeJSON,'stringify');
  return parse===storedNativeJSONParse&&stringify===storedNativeJSONStringify&&storedNativeJSONMethod(parse,'parse')&&storedNativeJSONMethod(stringify,'stringify');
}
function plainStoredReplayData(value:unknown,ancestors=new Set<object>(),depth=0):boolean {
  if(depth>70)return false;
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return true;
  if(typeof value!=='object'||nodeTypes.isProxy(value)||ancestors.has(value))return false;
  const array=Array.isArray(value),prototype=storedGetPrototypeOf(value);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)return false;
  if(storedGetOwnPropertySymbols(value).length)return false;
  const keys=storedGetOwnPropertyNames(value),length=array?storedGetOwnPropertyDescriptor(value,'length')?.value:0;
  if(array&&(!Number.isSafeInteger(length)||length<0||keys.length!==length+1))return false;
  ancestors.add(value);
  for(let index=0;index<keys.length;index++){const key=keys[index];
    if(array&&key==='length')continue;
    if(typeof key!=='string'||array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=length)){ancestors.delete(value);return false;}
    const field=storedGetOwnPropertyDescriptor(value,key);
    if(!field||!storedHasOwn(field,'value')||!field.enumerable||!plainStoredReplayData(field.value,ancestors,depth+1)){ancestors.delete(value);return false;}
  }
  ancestors.delete(value);return true;
}
function loadStoreRuleSourceIds(directory:string,numerology:ReturnType<typeof loadNumerologyData>):Set<string>{return new Set([...loadLegacyStoreRuleSourceIds(directory,numerology),...REVIEWED_DATA_SOURCE_IDS]);}
function loadLegacyStoreRuleSourceIds(directory:string,numerology:ReturnType<typeof loadNumerologyData>):Set<string>{
  return new Set([...numerology.strokes.sources,...numerology.rules.sources,...loadQimenSources(directory),...loadBaziSources(directory),...loadMonthAuthoritySources(directory),...loadMonthlySeasonalSources(directory),...loadSeasonalConditionSources(directory),...loadCongWealthSources(directory),...loadCongShaSources(directory),...loadSolarTimeSources(directory),...loadFollowingRestrictionsSources(directory),...loadDitianRenSources(directory),...loadRenNecessarySources(directory),...loadRenActionsSources(directory),...loadRenCapacitiesSources(directory),...loadRenDirectionsSources(directory),...loadRenJointBattleSources(directory),...loadNameImagerySources(directory),...loadYueHomophonePackages(directory).sources,...loadYueReadingData(directory).sources.filter(source=>source.id===YUE_READING_SOURCE_ID)].map(source=>source.id).concat([...CLASSICS_SOURCE_IDS,...ALL_NAMING_RULE_SOURCE_IDS,...NAME_PHONETIC_SOURCE_IDS,OFFICIAL_NAME_POPULARITY_SOURCE_ID,ELEMENT_ASSESSMENT_SOURCE_ID,...WORD_PRONUNCIATION_SOURCE_IDS,...MEANING_CONTEXT_SOURCE_IDS,PARENT_NAME_METHOD_SOURCE_ID,'project-bazi-mainchain-145','naming-element-application-v1']));
}
export const defaults:StudioSettings={studioName:'知名起名工作室',contact:'',logoDataUrl:'',apiBaseUrl:'https://api.openai.com/v1',model:'',timeoutMs:45000,hasApiKey:false,useAi:false};
const object=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:any,keys:string[])=>object(v)&&keys.every(k=>typeof v[k]==='string');
const stringArray=(v:any)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const elements=['木','火','土','金','水'];
const elementArray=(v:any)=>stringArray(v)&&v.every((e:string)=>elements.includes(e));
function validPreferences(p:any){return validWordPronunciationPreference(p)&&!!p&&validNamePhoneticPreferences(p)&&(p.elementAssessment===undefined||typeof p.elementAssessment==='boolean')&&strings(p,['generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority'])&&[1,2].includes(p.length)&&['balanced','traditional','sound','classic','simple'].includes(p.priority)&&elementArray(p.preferredElements)&&typeof p.zodiacRules==='boolean'&&typeof p.numerology==='boolean'&&(p.avoidParentNames===undefined||typeof p.avoidParentNames==='boolean')&&(p.imageryReading===undefined||typeof p.imageryReading==='boolean')&&(p.yueReading===undefined||typeof p.yueReading==='boolean')&&(p.yueHomophones===undefined||['none','strict','ignore-tone'].includes(p.yueHomophones))&&(p.yueHomophoneRuleVersion===undefined||validYueHomophoneRuleVersion(p.yueHomophoneRuleVersion))&&((p.yueHomophones??'none')!=='none'||p.yueHomophoneRuleVersion===undefined)&&((p.yueHomophones??'none')==='none'||p.yueReading===true);}
function validBirthDate(p:any){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate))return false;
  const [year,month,day]=p.birthDate.split('-').map(Number);if(year<1900||year>2100||month<1||month>12||day<1||day>31)return false;
  try{new Intl.DateTimeFormat('en',{timeZone:p.timezone.trim()||'Asia/Shanghai'}).format(0);if(p.calendar==='lunar'){const lunar=LunarMonth.fromYm(year,p.leapMonth?-month:month);return !!lunar&&day<=lunar.getDayCount();}const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()+1===month&&d.getUTCDate()===day;}catch{return false;}
}
function validProfile(p:any){return strings(p,['id','customerName','surname','surnamePinyin','birthDate','birthTime','birthPlace','timezone','notes'])&&p.id.trim().length>0&&/^[\p{Script=Han}]{1,4}$/u.test(p.surname)&&(p.timeUnknown||/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(p.birthTime))&&['fatherName','motherName'].every(k=>p[k]===undefined||typeof p[k]==='string'&&[...p[k]].length<=40)&&['男','女','中性'].includes(p.gender)&&['solar','lunar'].includes(p.calendar)&&typeof p.timeUnknown==='boolean'&&typeof p.leapMonth==='boolean'&&validMonthAuthorityMethod(p.monthAuthorityMethod)&&validSeasonalMethod(p.seasonalMethod)&&validBirthTimeInput(p)&&validRenMethod(p.renMethod)&&validBirthDate(p)&&validCivilBirthProfile(p)&&(p.namingPreferences===undefined||validPreferences(p.namingPreferences));}
function validCharacter(c:any){return strings(c,['char','meaning','pinyin','traditional','elementBasis','warning','sourceId'])&&[...c.char].length===1&&Number.isInteger(c.tone)&&c.tone>=0&&c.tone<=5&&(c.strokes===null||Number.isInteger(c.strokes)&&c.strokes>0)&&elementArray(c.elements)&&stringArray(c.tags)&&(c.radical===undefined||typeof c.radical==='string')&&(c.polyphonic===undefined||typeof c.polyphonic==='boolean')&&(c.variants===undefined||stringArray(c.variants))&&(c.readings===undefined||Array.isArray(c.readings)&&c.readings.every((r:any)=>strings(r,['pinyin','sourceId','word'])&&Number.isInteger(r.tone)&&r.tone>=0&&r.tone<=5&&stringArray(r.meanings)&&validReadingReferenceMetadata(r)));}
const validCitation=(c:any)=>strings(c,['id','text','title','chapter','sourceId']);
function validAnalysis(a:any,profile?:BirthProfile){
  if(!object(a)||!object(a.bazi)||!object(a.qimen))return false;
  const b=a.bazi,q=a.qimen;
  return strings(b,['solarDate','lunarDate','zodiac','strength','seasonalAdvice','version','ruleDescription'])&&Array.isArray(b.pillars)&&b.pillars.length<=4&&b.pillars.every((p:any)=>strings(p,['label','gan','zhi','element','tenGod'])&&stringArray(p.hidden))&&object(b.elements)&&elements.every(e=>Number.isFinite(b.elements[e])&&b.elements[e]>=0)&&elementArray(b.favorable)&&elementArray(b.unfavorable)&&stringArray(b.reasons)&&stringArray(b.warnings)&&typeof q.available==='boolean'&&strings(q,['dun','yuan','solarTerm','xun','chiefStar','chiefDoor','version'])&&(q.reason===undefined||typeof q.reason==='string')&&Number.isInteger(q.ju)&&q.ju>=(q.available?1:0)&&q.ju<=9&&Array.isArray(q.palaces)&&q.palaces.length===(q.available?9:0)&&q.palaces.every((p:any)=>strings(p,['direction','trigram','earth','heaven','star','door','god'])&&Number.isInteger(p.number)&&p.number>=1&&p.number<=9&&stringArray(p.marks))&&new Set(q.palaces.map((p:any)=>p.number)).size===q.palaces.length&&stringArray(q.reasons)&&stringArray(q.warnings)&&validQimenSnapshot(q,b,profile)&&!!profile&&validBaziSnapshot(b,profile)&&validRenCommentaryAnalysis(a.renCommentary,profile,b);
}
function validImageryResults(s:NamingSession):boolean {
  try{
    if(s.preferences.imageryReading!==true)return s.candidates.every(candidate=>candidate.imageReading===undefined)&&!s.sourceSnapshot?.sources.some(source=>NAME_IMAGERY_SOURCE_IDS.includes(source.id as typeof NAME_IMAGERY_SOURCE_IDS[number]));
    const metadata={profile:nameImageryProfile(),chartSha256:createHash('sha256').update(JSON.stringify(s.analysis.qimen)).digest('hex')};
    return s.candidates.every(candidate=>validNameImageryAnalysis(candidate.imageReading,s.profile,candidate,s.analysis.qimen,metadata));
  }catch{return false;}
}
function validYueResults(session:NamingSession):boolean {
  try{
    if(session.preferences.yueReading!==true)return session.candidates.every(candidate=>candidate.yueReading===undefined)&&!session.sourceSnapshot?.sources.some(source=>source.id===YUE_READING_SOURCE_ID);
    return session.candidates.every(candidate=>isCanonicalYueNameReading(candidate.yueReading,session.profile.surname,candidate.givenName,yueTable as YueReadingData));
  }catch{return false;}
}
function validYueHomophoneResults(session:NamingSession):boolean{
  try{const version=resolveSessionYueHomophoneVersion(session);if(version===null)return true;
    const mode=session.preferences.yueHomophones as 'strict'|'ignore-tone';
    const data=(version==='yue-homophone-review/1.0.0'?yueHomophoneRules:yueHomophoneExpandedRules) as YueHomophoneData;
    return session.candidates.every(candidate=>!!candidate.yueReading&&isCanonicalYueHomophoneReviewForVersion(version,candidate.yueHomophones,session.profile.surname,candidate.givenName,candidate.yueReading,mode,data));
  }catch{return false;}
}
export function validSession(s:any):s is NamingSession {
  try{assertMeaningContextReviewInput(s);}catch{return false;}
  if(Array.isArray(s?.sourceSnapshot?.sources)&&s.sourceSnapshot.sources.some((source:any)=>source?.id===OFFICIAL_NAME_POPULARITY_SOURCE_ID))return false;
  if(!object(s)||requiresSessionSourceManifest(s.analysis?.bazi?.version)&&s.sourceSnapshot===undefined||!validReviewRevision(s.reviewRevision)||!validReviewToken(s.reviewToken)||!validSessionNamingRules(s)||!validSessionSources(s)||s.factVerification!==undefined&&!validFactVerification(s.factVerification,s.dataVersion)||!isDeepStrictEqual(s.originalFavorable,s.analysis?.bazi?.favorable))return false;
  return strings(s,['id','profileId','createdAt','reviewNote','dataVersion'])&&!!s.id&&Number.isFinite(Date.parse(s.createdAt))&&validProfile(s.profile)&&s.profileId===s.profile.id&&validPreferences(s.preferences)&&elementArray(s.originalFavorable)&&validAnalysis(s.analysis,s.profile)&&!(s.profile.timeUnknown&&s.analysis.qimen.available)&&Array.isArray(s.candidates)&&s.candidates.length<=100&&s.candidates.every((c:any)=>strings(c,['id','givenName','fullName','pinyin','style','meaning','reason','traditionalReason','reviewNote','originalMeaning'])&&!!c.id&&[...c.givenName].length===s.preferences.length&&c.fullName===s.profile.surname+c.givenName&&Array.isArray(c.characters)&&c.characters.length===s.preferences.length&&c.characters.every(validCharacter)&&c.characters.map((ch:any)=>ch.char).join('')===c.givenName&&Array.isArray(c.citations)&&c.citations.every(validCitation)&&stringArray(c.warnings)&&object(c.evaluation)&&['sound','meaning','simplicity','traditional','distinctiveness'].every(k=>Number.isFinite(c.evaluation[k])&&c.evaluation[k]>=0&&c.evaluation[k]<=100)&&typeof c.favorite==='boolean'&&['local','ai'].includes(c.origin)&&(c.numerology===undefined||validNumerologySnapshot(c.numerology,s.profile.surname,c.givenName))&&(!Object.hasOwn(c,'modernPracticalEvidence')||validModernRecord(c.modernPracticalEvidence)))&&new Set(s.candidates.map((c:any)=>c.id)).size===s.candidates.length&&validImageryResults(s)&&validYueResults(s)&&validYueHomophoneResults(s);
}
function validSettings(s:any){return strings(s,['studioName','contact','logoDataUrl','apiBaseUrl','model'])&&Number.isFinite(s.timeoutMs)&&s.timeoutMs>=5000&&s.timeoutMs<=120000&&typeof s.hasApiKey==='boolean'&&typeof s.useAi==='boolean';}
export function atomicWrite(path:string,data:Uint8Array|string){mkdirSync(dirname(path),{recursive:true});const temp=path+'.'+process.pid+'.'+randomUUID()+'.tmp';try{writeFileSync(temp,data);renameSync(temp,path);}finally{if(existsSync(temp))unlinkSync(temp);}}
const schema='CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT,created_at TEXT,json TEXT); CREATE TABLE IF NOT EXISTS profile_versions(id TEXT PRIMARY KEY,token TEXT NOT NULL); CREATE TABLE IF NOT EXISTS knowledge_archives(sha256 TEXT PRIMARY KEY,version TEXT UNIQUE NOT NULL,pack BLOB NOT NULL);';
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
export class CustomerStorageCommittedError extends Error {
  readonly code:'CUSTOMER_STORAGE_MIGRATION_COMMITTED'|'CUSTOMER_STORAGE_RESTORE_COMMITTED';
  readonly committed=true;
  constructor(readonly operation:'migration'|'restore',readonly installed:boolean,cause:unknown){
    super((operation==='migration'?'客户库存储迁移':'客户库恢复')+'已提交，'+(installed?'新库已启用':'状态切换未完成')+'；后续状态读取或清理失败，未回滚。请重新读取当前档案后处理后续错误。',{cause});
    this.name='CustomerStorageCommittedError';this.code=operation==='migration'?'CUSTOMER_STORAGE_MIGRATION_COMMITTED':'CUSTOMER_STORAGE_RESTORE_COMMITTED';
  }
}
export class Store {
  #issueCommittedWriteError=createCustomerWriteCommitIssuer(this);
  #registeredDatabases=createStoredRegistry<StoredDatabaseRegistration>();
  #storedReadCurrentOrigins=createStoredRegistry<{database:Database;registration:StoredDatabaseRegistration}>();
  #ownedDatabaseConstructor?:Awaited<ReturnType<typeof initSqlJs>>['Database'];
  #ownedDatabaseExec?:Database['exec'];
  #ownedDatabaseClose?:Database['close'];
  #ownedDatabasePrototype?:object;
  #ownedDirectory?:string;
  #ownedRuleSourceIds?:Set<string>;
  #legacyWriteDepth=0;
  #storedProjectReplay?:SavedProjectNamingUseDependencies;
  #storedPackReader=(bytes:Uint8Array):Dataset=>this.#readPackCore(bytes,true);
  #candidate2ReadProofs=createStoredRegistry<{database:Database;registration:StoredDatabaseRegistration;records:{session:NamingSession;json:string;rowJson:string;table:'sessions'|'revisions';rowId:string|number;receipt:Candidate2NativeReadReceiptV1}[]}[]>();
  #candidate2Validation?:Map<Database,Map<string,Candidate2NativeReadReceiptV1>>;
  #candidate2ValidationInstalled?:Map<string,string>;
  #candidate2InstalledStamp(mechanics:Candidate2OwnedMechanicsV2):Map<string,string> {
    const config=this.#candidate2Configuration(mechanics),files=[config.applicationBundlePath,config.applicationBundlePath+'.receipt.json',join(config.consumerPublicationDir,'consumer.cjs'),join(config.consumerPublicationDir,'consumer-execution-manifest.json')],manifest=JSON.parse(readFileSync(files[3],'utf8')) as {inputs:{path:string}[]};
    if(!Array.isArray(manifest.inputs)||manifest.inputs.length!==57)throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED');
    for(const input of manifest.inputs){if(typeof input.path!=='string'||input.path.includes('\\')||input.path.includes(':')||input.path.startsWith('/')||input.path.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED');files.push(join(config.consumerPublicationDir,'sources',...input.path.split('/')));}
    for(const relative of ['project-naming-application/1.3.2-candidate.2','bazi-root-feedback/1.3.2-r2']){const base=join(config.assetDir,...relative.split('/')),file=join(base,'resource-manifest.json'),publication=JSON.parse(readFileSync(file,'utf8')) as {files:{path:string}[]};if(!Array.isArray(publication.files)||publication.files.length>4096)throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED');files.push(file);for(const entry of publication.files){if(typeof entry.path!=='string'||entry.path.includes('\\')||entry.path.includes(':')||entry.path.startsWith('/')||entry.path.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED');files.push(join(base,...entry.path.split('/')));}}
    return new Map(files.map(file=>{const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||realpathSync.native(file)!==file)throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED: physical installed file required');return [file,digest(readFileSync(file))];}));
  }
  #assertCandidate2InstalledStamp(stamp:Map<string,string>):void {for(const [file,sha]of stamp){const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||realpathSync.native(file)!==file||digest(readFileSync(file))!==sha)throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED: installed replay material changed before return');}}
  #candidate2ReadInstalled=createStoredRegistry<Map<string,string>>();
  #withCandidate2ValidationScope<T>(body:()=>T):T {const owns=!this.#candidate2Validation;if(owns){this.#candidate2Validation=new Map();this.#candidate2ValidationInstalled=undefined;}try{const result=body();if(this.#candidate2ValidationInstalled)this.#assertCandidate2InstalledStamp(this.#candidate2ValidationInstalled);return result;}finally{if(owns){this.#candidate2Validation=undefined;this.#candidate2ValidationInstalled=undefined;}}}
  #assertStoredReadOperation(operation:StoredReadOperation):void {
    if((operation.used||operation.authenticating)&&(!operation.active||operation.invalidated))throw new Error('本次内部读取期间发生公开重入，认证快照已失效。');
  }
  #assertStoredReadSqlIdentity(operation:StoredReadOperation):void {
    if(!operation.used)return;
    const directory=storedGetOwnPropertyDescriptor(this,'dataDir'),prototype=this.#ownedDatabasePrototype;
    if(this.#ownedDirectory===undefined||!directory||!storedHasOwn(directory,'value')||directory.value!==this.#ownedDirectory||!prototype||nodeTypes.isProxy(prototype))throw new Error('内部读取封口时目录或 SQL 来源身份已变化。');
    const Constructor=this.#ownedDatabaseConstructor;
    if(!Constructor||nodeTypes.isProxy(Constructor))throw new Error('内部读取封口时 SQL 构造来源身份已变化。');
    const constructorPrototype=storedGetOwnPropertyDescriptor(Constructor,'prototype');if(!constructorPrototype||!storedHasOwn(constructorPrototype,'value')||constructorPrototype.value!==prototype)throw new Error('内部读取封口时 SQL 构造原型身份已变化。');
    const exec=storedGetOwnPropertyDescriptor(prototype,'exec'),close=storedGetOwnPropertyDescriptor(prototype,'close');
    if(!exec||!close||!storedHasOwn(exec,'value')||!storedHasOwn(close,'value')||exec.value!==this.#ownedDatabaseExec||close.value!==this.#ownedDatabaseClose)throw new Error('内部读取封口时 SQL 方法身份已变化。');
    const origin=storedRegistryGet(this.#storedReadCurrentOrigins,operation);
    if(origin){
      const current=storedGetOwnPropertyDescriptor(this,'db');
      if(!current||!storedHasOwn(current,'value')||current.value!==origin.database||this.#storedRegistration(origin.database)!==origin.registration)throw new Error('内部读取封口时当前客户库身份已变化。');
    }
  }
  #sealStoredReadOperation(operation:StoredReadOperation):void {
    this.#assertStoredReadOperation(operation);this.#assertStoredReadSqlIdentity(operation);
    this.#sealCandidate2Read(operation);
    sealStoredReadOperation(operation);
    this.#assertStoredReadOperation(operation);this.#assertStoredReadSqlIdentity(operation);
  }
  #retireStoredReadOperation(operation:StoredReadOperation):void {
    operation.active=false;try{retireStoredReadOperation(operation);}finally{storedRegistryDelete(this.#storedReadCurrentOrigins,operation);storedRegistryDelete(this.#candidate2ReadProofs,operation);storedRegistryDelete(this.#candidate2ReadInstalled,operation);}
  }
  #withStoredReadOperation<T>(body:(operation:StoredReadOperation)=>T,mode:'automatic'|'manual'='automatic'):T {
    const ownsCandidate2Scope=this.#candidate2Validation===undefined;if(ownsCandidate2Scope){this.#candidate2Validation=new Map();this.#candidate2ValidationInstalled=undefined;}
    const operation:StoredReadOperation={directory:this.#ownedDirectory??'',active:true,invalidated:false,authenticating:false,used:false};
    storedInvalidateReadOperations();
    const position=storedReadOperations.length;storedReadOperations[position]=operation;storedReadOperations.length=position+1;
    let failed=true;
    try{
      const result=body(operation);
      if(operation.used||operation.authenticating){
        if(result!==null&&(typeof result==='object'||typeof result==='function')){
          let current:object|null=result as object,depth=0;
          while(current){
            if(depth++>70||nodeTypes.isProxy(current))throw new Error('内部读取认证不支持异步或不透明返回值。');
            const then=storedGetOwnPropertyDescriptor(current,'then');
            if(then){if(!storedHasOwn(then,'value')||typeof then.value==='function')throw new Error('内部读取认证不支持 thenable 返回值。');break;}
            current=storedGetPrototypeOf(current) as object|null;
          }
        }
      }
      if(mode==='automatic')this.#sealStoredReadOperation(operation);
      else if(operation.active&&operation.used)throw new Error('内部读取结果尚未完成返回或提交前认证。');
      failed=false;return result;
    }finally{
      try{this.#retireStoredReadOperation(operation);}catch(error){if(!failed)throw error;}
      finally{delete storedReadOperations[position];storedReadOperations.length=position;if(ownsCandidate2Scope){this.#candidate2Validation=undefined;this.#candidate2ValidationInstalled=undefined;}}
    }
  }
  #newOwnedDatabase(bytes:Uint8Array|undefined,role:StoredDatabaseRole):Database {
    const Constructor=this.#ownedDatabaseConstructor,exec=this.#ownedDatabaseExec,close=this.#ownedDatabaseClose;
    const prototype=this.#ownedDatabasePrototype;
    if(!Constructor||!exec||!close||!prototype)throw new Error('内部 SQL 读取器尚未初始化。');
    const database=bytes===undefined?new Constructor():new Constructor(bytes);
    storedRegistrySet(this.#registeredDatabases,database,{exec,close,execOwner:prototype,closeOwner:prototype,role});return database;
  }
  #registerExistingDatabase(database:Database,role:StoredDatabaseRole):Database {
    const prototype=this.#ownedDatabasePrototype,exec=this.#ownedDatabaseExec,close=this.#ownedDatabaseClose;
    if(!prototype||!exec||!close)throw new Error('内部 SQL 读取器尚未初始化。');
    storedRegistrySet(this.#registeredDatabases,database,{exec,close,execOwner:prototype,closeOwner:prototype,role});return database;
  }
  #openCustomerDatabase(bytes:Uint8Array|undefined,role:StoredDatabaseRole,strictSchema=true):Database {
    if(bytes===undefined){const database=createCompactCustomerDatabase(this.SQL);return this.#registerExistingDatabase(database,role);}
    const database=this.#newOwnedDatabase(bytes,role);
    try{if(isCompactCustomerDatabase(database)){bindCompactCustomerDatabase(database);if(strictSchema)assertCompactCustomerSchema(database);}else if(strictSchema)assertRawCustomerSchema(database);return database;}catch(error){this.#forgetDatabase(database);database.close();throw error;}
  }
  #forgetDatabase(database:Database|undefined){if(database)storedRegistryDelete(this.#registeredDatabases,database);}
  #storedRegistration(database:Database):StoredDatabaseRegistration|undefined {
    const registration=storedRegistryGet(this.#registeredDatabases,database);
    const directory=storedGetOwnPropertyDescriptor(this,'dataDir');
    if(this.#legacyWriteDepth||this.#ownedDirectory===undefined||!directory||!storedHasOwn(directory,'value')||directory.value!==this.#ownedDirectory||!registration||registration.role==='pack')return undefined;
    if(!storedJSONCallbacksUnchanged()||!storedRegistryCallbacksUnchanged())return undefined;
    if(nodeTypes.isProxy(Array.prototype)||nodeTypes.isProxy(Object.prototype)||storedGetPrototypeOf(Array.prototype)!==Object.prototype||storedGetPrototypeOf(Object.prototype)!==null)return undefined;
    if(storedGetOwnPropertyDescriptor(Object.prototype,'toJSON')||storedGetOwnPropertyDescriptor(Array.prototype,'toJSON'))return undefined;
    if(registration.role==='current'){const current=storedGetOwnPropertyDescriptor(this,'db');if(!current||!storedHasOwn(current,'value')||current.value!==database)return undefined;}
    const exec=storedNativeMethodSlot(database,'exec'),close=storedNativeMethodSlot(database,'close');
    if(!exec||exec.owner!==registration.execOwner||exec.value!==registration.exec||!close||close.owner!==registration.closeOwner||close.value!==registration.close)return undefined;
    return registration;
  }
  #storedCurrentDatabase(operation?:StoredReadOperation):{database:Database;registration:StoredDatabaseRegistration}|undefined {
    if(operation?.used)this.#assertStoredReadSqlIdentity(operation);
    const field=storedGetOwnPropertyDescriptor(this,'db');if(!field||!storedHasOwn(field,'value')){if(operation?.used)throw new Error('已认证读取的当前客户库不再具备原生读取资格。');return undefined;}
    const database=field.value as Database,registration=this.#storedRegistration(database);
    if(!registration&&operation?.used)throw new Error('已认证读取的当前客户库不再具备原生读取资格。');
    return registration?{database,registration}:undefined;
  }
  #storedRows(database:Database,registration:StoredDatabaseRegistration,sql:string,parameters?:Parameters<Database['exec']>[1]){
    if(this.#storedRegistration(database)!==registration)throw new Error('内部客户行读取器已失效。');
    return storedInvoke<ReturnType<Database['exec']>>(registration.exec,database,[sql,parameters]);
  }
  #parseStoredRow(database:Database,registration:StoredDatabaseRegistration,json:unknown,candidate2Row?:Candidate2NativeLocator):{session:NamingSession;origin:StoredRowOrigin}{
    if(typeof json!=='string'||this.#storedRegistration(database)!==registration)throw new Error('保存行不是本次内部 SQL 的原始 JSON。');
    return {session:JSON.parse(json) as NamingSession,origin:{database,registration,json,...(candidate2Row?{candidate2Row}:{})}};
  }
  #storedArchiveCatalog(database:Database,registration:StoredDatabaseRegistration):Map<string,FactArchive>{
    const catalog=new Map<string,FactArchive>(),rows=this.#storedRows(database,registration,'SELECT sha256,version,pack FROM knowledge_archives')[0]?.values??[];
    if(rows.length>ARCHIVE_MAX_COUNT)throw new Error('知识包历史归档超过100个，未改变当前客户库。');
    let size=0;const hashes=new Set<string>();
    for(const [hash,version,raw]of rows){
      if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)||typeof version!=='string'||version!==hash.slice(0,12)||!(raw instanceof Uint8Array)||hashes.has(hash)||catalog.has(version))throw new Error('知识包历史归档编号、映射或重复记录无效。');
      const pack=new Uint8Array(raw);size+=pack.length;
      if(size>ARCHIVE_MAX_BYTES||packSha(pack)!==hash)throw new Error('知识包历史归档超过150MB或完整原包哈希不一致。');
      const dataset=this.#readPackCore(pack,true);if(dataset.version!==version)throw new Error('知识包历史归档与真实数据版本不一致。');
      hashes.add(hash);catalog.set(version,{sha256:hash,version,pack,dataset});
    }return catalog;
  }
  /** C2 owns a separate native branch; the legacy write depth must not turn a
   * private writer into the old unauthenticated fallback. */
  #candidate2Database(database:Database,requireV3=true):StoredDatabaseRegistration {
    const directory=storedGetOwnPropertyDescriptor(this,'dataDir'),registration=storedRegistryGet(this.#registeredDatabases,database),prototype=this.#ownedDatabasePrototype;
    if(!registration||registration.role==='pack'||!prototype||!directory||!storedHasOwn(directory,'value')||directory.value!==this.#ownedDirectory||nodeTypes.isProxy(database)||!storedJSONCallbacksUnchanged()||!storedRegistryCallbacksUnchanged())throw Error('CANDIDATE2_NATIVE_SQL_INVALID: unowned database or directory');
    const constructorPrototype=this.#ownedDatabaseConstructor&&storedGetOwnPropertyDescriptor(this.#ownedDatabaseConstructor,'prototype');
    if(!constructorPrototype||!storedHasOwn(constructorPrototype,'value')||constructorPrototype.value!==prototype)throw Error('CANDIDATE2_NATIVE_SQL_INVALID: constructor changed');
    for(const [name,expected]of [['exec',this.#ownedDatabaseExec],['close',this.#ownedDatabaseClose],['prepare',this.#culturalNativePrepare]] as const){const slot=storedNativeMethodSlot(database,name);if(!slot||slot.owner!==prototype||slot.value!==expected)throw Error('CANDIDATE2_NATIVE_SQL_INVALID: native method changed');}
    if(registration.role==='current'){const current=storedGetOwnPropertyDescriptor(this,'db');if(!current||!storedHasOwn(current,'value')||current.value!==database)throw Error('CANDIDATE2_NATIVE_SQL_INVALID: current database changed');}
    if(requireV3&&compactCustomerVersion(database)!==CULTURAL_COMPACT_CUSTOMER_VERSION)throw Error('CANDIDATE2_STORAGE_MIGRATION_REQUIRED: explicitly migrate to customer-compact/3');
    this.#managedCustomerDirectory();return registration;
  }
  #candidate2Sql(database:Database,sql:string,parameters?:Parameters<Database['exec']>[1]) {
    const registration=this.#candidate2Database(database);return storedInvoke<ReturnType<Database['exec']>>(registration.exec,database,[sql,parameters]);
  }
  #candidate2Configuration(mechanics:Candidate2OwnedMechanicsV2){
    const dataDir=this.#ownedDirectory!,root=dirname(dataDir);
    return {applicationBundlePath:join(root,'dist-electron','project-naming-application','1.3.2-candidate.2','application.cjs'),assetDir:join(root,'assets'),dataDir,consumerPublicationDir:join(root,'consumer-publication'),mechanics};
  }
  #assertCandidate2Writer():void {for(const [key,method]of candidate2WriterMethods)if(!candidate2OriginalMethod(this,key,method))throw Error('CANDIDATE2_NATIVE_WRITER_INVALID: original Store writer required');this.#candidate2Database(this.db);}
  #candidate2Mutate(action:()=>void):void {let installed=false;try{this.#withCandidate2ValidationScope(()=>{this.mutate(action,()=>{installed=true;});});}catch(error){if(installed){recordCustomerWriteNotice(this,'committed-cleanup');throw this.#issueCommittedWriteError(error,false);}throw error;}}
  #candidate2ReadCommitted(id:string):NamingSession {try{const saved=this.#withStoredReadOperation(operation=>this.#readVerifiedSessionCore(id,operation));if(!saved)throw Error('CANDIDATE2_NATIVE_READBACK_FAILED: committed session missing');return saved;}catch(error){recordCustomerWriteNotice(this,'committed-cleanup');throw this.#issueCommittedWriteError(error,false);}}
  #candidate2CaptureWrittenEnvelope(database:Database,original:Candidate2AdoptionEnvelopeV2,stamp:Map<string,string>):void {
    // Only the just-created, same-owner capture reaches this private call. The
    // entire SQL envelope must equal that fresh actual generation/capture. This
    // reuses its validation within this writer only; the postcommit private read
    // starts a new scope and still performs fixed installed archive replay.
    const nativeJson=this.#candidate2Sql(database,'SELECT json FROM sessions WHERE id=?',[original.session.id])[0]?.values[0]?.[0];if(typeof nativeJson!=='string')throw Error('CANDIDATE2_NATIVE_CAPTURE_CHANGED: native row missing');const nativeSession=JSON.parse(nativeJson) as NamingSession;
    const closed=readCandidate2NativeClosedV1(database,nativeSession),ordered=(value:Candidate2AdoptionEnvelopeV2)=>({...value,sourceBlobs:[...value.sourceBlobs].sort((a,b)=>a.sha<b.sha?-1:a.sha>b.sha?1:0)});
    if(adoptionDigest(ordered(closed.envelope))!==adoptionDigest(ordered(original)))throw Error('CANDIDATE2_NATIVE_CAPTURE_CHANGED: native bytes differ from this fresh generation');
    this.#assertCandidate2InstalledStamp(stamp);assertCandidate2NativeReadReceiptV1(database,original.session,closed.receipt);
    if(nativeJson!==this.#candidate2Sql(database,'SELECT json FROM sessions WHERE id=?',[original.session.id])[0]?.values[0]?.[0])throw Error('CANDIDATE2_NATIVE_CAPTURE_CHANGED: native row changed before capture seal');
    if(!this.#candidate2Validation)throw Error('CANDIDATE2_NATIVE_CAPTURE_INVALID: writer scope required');const entries=this.#candidate2Validation.get(database)??new Map<string,Candidate2NativeReadReceiptV1>();entries.set(adoptionDigest(original.session.candidate2Naming),closed.receipt);this.#candidate2Validation.set(database,entries);
    const installed=this.#candidate2ValidationInstalled??new Map<string,string>();for(const [file,sha]of stamp){if(installed.has(file)&&installed.get(file)!==sha)throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED');installed.set(file,sha);}this.#candidate2ValidationInstalled=installed;
  }
  #candidate2ActivePack(){
    const directory=this.#managedCustomerDirectory(),data=this.#ownedDirectory!,override=join(directory,'knowledge.sqlite'),installed=new Uint8Array(readFileSync(join(data,'knowledge-v6.sqlite'))),active=new Uint8Array(readFileSync(existsSync(override)?override:join(data,'knowledge-v6.sqlite')));
    if(packSha(active)!==packSha(installed))throw Error('CANDIDATE2_ACTIVE_PACK_UNSUPPORTED: active pack differs from installed fixed C2 material');
    return {packSha256:packSha(active),packBytes:active.length,datasetSha256:digest(readFileSync(join(data,'dataset-v6.json')))};
  }
  #verifyCandidate2Stored(session:NamingSession,database:Database,origin?:StoredRowOrigin,operation?:StoredReadOperation,locator?:Candidate2NativeLocator):void {
    const registration=this.#candidate2Database(database);
    if(operation)this.#assertStoredReadOperation(operation);
    if(origin&&(origin.database!==database||origin.registration!==registration||!isDeepStrictEqual(JSON.parse(origin.json),session)))throw Error('CANDIDATE2_NATIVE_ROW_INVALID: original SQL row required');
    // Capture a precise native locator before replay. A historical copy cannot
    // later stand in for a current row which changed during this operation.
    const actual=locator??origin?.candidate2Row;if(!actual||!['sessions','revisions'].includes(actual.table)||actual.table==='sessions'&&(typeof actual.rowId!=='string'||actual.rowId!==session.id)||actual.table==='revisions'&&(!Number.isSafeInteger(actual.rowId)||Number(actual.rowId)<1))throw Error('CANDIDATE2_NATIVE_ROW_INVALID: actual SELECT table and row id required');
    const {table,rowId}=actual,rowJson=this.#candidate2Sql(database,`SELECT json FROM ${table} WHERE id=?`,[rowId])[0]?.values[0]?.[0];
    if(typeof rowJson!=='string'||!isDeepStrictEqual(JSON.parse(rowJson),session)||origin&&rowJson!==origin.json)throw Error('CANDIDATE2_NATIVE_ROW_INVALID: exact selected row changed');
    const previousAuthenticating=operation?.authenticating;if(operation)operation.authenticating=true;
    try{
      const key=adoptionDigest((session as Candidate2AdoptedNamingSessionV2).candidate2Naming),cache=this.#candidate2Validation?.get(database),previous=cache?.get(key);let receipt:Candidate2NativeReadReceiptV1;
      if(previous){if(this.#candidate2ValidationInstalled)this.#assertCandidate2InstalledStamp(this.#candidate2ValidationInstalled);assertCandidate2NativeReadReceiptV1(database,session,previous);receipt=previous;}
      else {const closed=readCandidate2NativeClosedV1(database,session),stamp=this.#candidate2InstalledStamp(closed.envelope.mechanics),owner=createCandidate2SavedVerifierV2(this.#candidate2Configuration(closed.envelope.mechanics));owner.verifySaved(closed.envelope);this.#assertCandidate2InstalledStamp(stamp);assertCandidate2NativeReadReceiptV1(database,session,closed.receipt);receipt=closed.receipt;if(this.#candidate2Validation){const entries=cache??new Map<string,Candidate2NativeReadReceiptV1>();entries.set(key,receipt);this.#candidate2Validation.set(database,entries);const installed=this.#candidate2ValidationInstalled??new Map<string,string>();for(const [file,sha]of stamp){if(installed.has(file)&&installed.get(file)!==sha)throw Error('CANDIDATE2_INSTALLED_SOURCE_CHANGED: replay code changed within operation');installed.set(file,sha);}this.#candidate2ValidationInstalled=installed;}}
      this.#candidate2Database(database);
      if(operation){
        this.#assertStoredReadOperation(operation);operation.used=true;
        if(registration.role==='current')storedRegistrySet(this.#storedReadCurrentOrigins,operation,{database,registration});
        const proofs=storedRegistryGet(this.#candidate2ReadProofs,operation)??[],proof=proofs.find(value=>value.database===database);
        if(proof&&proof.registration!==registration)throw Error('CANDIDATE2_NATIVE_OPERATION_INVALID: database registration changed during read');
        const records=proof?.records??[];records.push({session,json:JSON.stringify(session),rowJson,table,rowId,receipt});if(!proof)proofs.push({database,registration,records});storedRegistrySet(this.#candidate2ReadProofs,operation,proofs);
        if(this.#candidate2ValidationInstalled)storedRegistrySet(this.#candidate2ReadInstalled,operation,new Map(this.#candidate2ValidationInstalled));
      }
    }finally{if(operation)operation.authenticating=previousAuthenticating!;}
  }
  #sealCandidate2Read(operation:StoredReadOperation,closing?:Database):void {
    const installed=storedRegistryGet(this.#candidate2ReadInstalled,operation);if(installed)this.#assertCandidate2InstalledStamp(installed);
    const proofs=storedRegistryGet(this.#candidate2ReadProofs,operation);if(!proofs)return;
    for(const proof of proofs){if(closing&&closing!==proof.database)continue;
      if(this.#candidate2Database(proof.database)!==proof.registration)throw Error('CANDIDATE2_NATIVE_OPERATION_INVALID: native owner retired');
      for(const record of proof.records){
        if(JSON.stringify(record.session)!==record.json)throw Error('CANDIDATE2_NATIVE_OPERATION_INVALID: returned graph changed');
        const row=this.#candidate2Sql(proof.database,`SELECT json FROM ${record.table} WHERE id=?`,[record.rowId])[0]?.values[0]?.[0];
        if(row!==record.rowJson)throw Error('CANDIDATE2_NATIVE_OPERATION_INVALID: exact native row changed');
        assertCandidate2NativeReadReceiptV1(proof.database,record.session,record.receipt);
      }
      this.#candidate2Database(proof.database);
    }
    if(closing)storedRegistrySet(this.#candidate2ReadProofs,operation,proofs.filter(value=>value.database!==closing));
  }
  #sealCandidate2BeforeClose(operation:StoredReadOperation,...databases:(Database|undefined)[]):void {for(const database of databases)if(database)this.#sealCandidate2Read(operation,database);}
  #assertCandidate2DatabaseClosure(database:Database):void {
    // This scan rejects typed C2 orphans even when a stripped attachment tries
    // to make every visible session look ordinary. Generic leaves stay legal.
    if(!isCompactCustomerDatabase(database))return;
    const registration=this.#candidate2Database(database,false),rows=storedInvoke<ReturnType<Database['exec']>>(registration.exec,database,['SELECT json FROM sessions UNION ALL SELECT json FROM revisions'])[0]?.values??[];
    assertCandidate2NativeStorageV1(database,rows.map(row=>JSON.parse(String(row[0]))));
  }
  /** A native profile id is the only customer input: no owner/proposal or
   * externally computed mechanics can cross this Store write boundary. */
  generateAndSaveCandidate2(profileId:string,preferences:NamingPreferences,selection:Candidate2NamingSelection):NamingSession {
    storedInvalidateReadOperations();if(arguments.length!==3||typeof profileId!=='string'||!profileId.trim()||profileId.length>1000)throw Error('CANDIDATE2_GENERATE_INVALID: exactly native profile id, preferences and selection required');
    this.#assertCandidate2Writer();
    const rawPreferences=snapshotApplicationJson(preferences) as unknown as NamingPreferences,rawSelection=snapshotApplicationJson(selection) as unknown as Candidate2NamingSelection;let savedId='';
    this.#candidate2Mutate(()=>{
      const database=this.db,registration=this.#candidate2Database(database);assertCompactCustomerSchema(database);this.#assertCandidate2DatabaseClosure(database);
      const profileRow=this.#candidate2Sql(database,'SELECT json FROM profiles WHERE id=?',[profileId])[0]?.values[0]?.[0];
      if(typeof profileRow!=='string')throw Error('CANDIDATE2_PROFILE_REQUIRED: save the native customer first');
      const profile=JSON.parse(profileRow) as BirthProfile;if(!validProfile(profile)||profile.id!==profileId)throw Error('CANDIDATE2_PROFILE_INVALID');
      const token=this.#candidate2Sql(database,'SELECT token FROM profile_versions WHERE id=?',[profileId])[0]?.values[0]?.[0]??'',epoch=this.profileEpoch,pack=this.#candidate2ActivePack(),signature=namingInputKey(profile,rawPreferences),excluded=new Set<string>();
      const history=this.#candidate2Sql(database,'SELECT \'sessions\',id,json FROM sessions WHERE json_extract(json,\'$.profileId\')=? UNION ALL SELECT \'revisions\',id,json FROM revisions WHERE json_extract(json,\'$.profileId\')=?',[profileId,profileId])[0]?.values??[];
      for(const [table,rowId,json]of history){const session=JSON.parse(String(json)) as NamingSession;if(hasCandidate2NativeFootprint(session))this.#verifyCandidate2Stored(session,database,undefined,undefined,{table:table as 'sessions'|'revisions',rowId:rowId as string|number});else this.#assertSessionCore(session,this.archiveCatalog(database),database);const original=hasCandidate2NativeFootprint(session)?(session as Candidate2AdoptedNamingSessionV2).candidate2Naming.request:{profile:session.profile,preferences:session.preferences};if(namingInputKey(original.profile,original.preferences)===signature)for(const candidate of session.candidates){if(typeof candidate.fullName!=='string'||candidate.fullName.length>100)throw Error('CANDIDATE2_HISTORY_INVALID: unbounded exclusion');excluded.add(candidate.fullName);}}
      if(excluded.size>10000)throw Error('CANDIDATE2_HISTORY_LIMIT: exclusions cannot be truncated');
      const mechanics={seed:randomInt(0,2147483647),excludeNames:[...excluded].sort()},installedStamp=this.#candidate2InstalledStamp(mechanics),owner=createCandidate2GenerationAdoptionV2(this.#candidate2Configuration(mechanics)),proposal=owner.generate(profile,rawPreferences,rawSelection),envelope=owner.createSaved(proposal);this.#assertCandidate2InstalledStamp(installedStamp);
      if(!isDeepStrictEqual(pack,{packSha256:envelope.session.candidate2Naming.generation.dataIdentity.packSha256,packBytes:envelope.session.candidate2Naming.generation.dataIdentity.packBytes,datasetSha256:envelope.session.candidate2Naming.generation.dataIdentity.datasetSha256}))throw Error('CANDIDATE2_ACTIVE_PACK_CHANGED: generated pack differs');
      if(this.#candidate2Database(database)!==registration||database!==this.db||epoch!==this.profileEpoch||profileRow!==this.#candidate2Sql(database,'SELECT json FROM profiles WHERE id=?',[profileId])[0]?.values[0]?.[0]||token!==(this.#candidate2Sql(database,'SELECT token FROM profile_versions WHERE id=?',[profileId])[0]?.values[0]?.[0]??'')||!isDeepStrictEqual(pack,this.#candidate2ActivePack()))throw Error('CANDIDATE2_NATIVE_CAS_CONFLICT: profile, epoch or active pack changed');
      this.#assertCandidate2Writer();this.assertFresh();const encoded=encodeCandidate2NativeStorageV1(envelope);
      this.#candidate2Sql(database,'BEGIN');
      try{insertCandidate2NativeStorageV1(database,encoded);writeCompactSession(database,envelope.session.id,JSON.stringify(envelope.session));this.#candidate2CaptureWrittenEnvelope(database,envelope,installedStamp);this.#candidate2Sql(database,'COMMIT');}catch(error){try{this.#candidate2Sql(database,'ROLLBACK');}catch{}throw error;}
      savedId=envelope.session.id;
    });
    return this.#candidate2ReadCommitted(savedId);
  }
  reviewCandidate2Session(id:string,changes:unknown,expectedRevision:number,expectedToken:string):NamingSession {
    storedInvalidateReadOperations();if(arguments.length!==4||typeof id!=='string'||!/^c2s_[a-f0-9]{32}$/.test(id))throw Error('CANDIDATE2_REVIEW_INVALID: exact four arguments required');const patch=snapshotApplicationJson(changes);
    this.#assertCandidate2Writer();this.#candidate2Mutate(()=>{
      const database=this.db;this.#candidate2Database(database);const json=this.#candidate2Sql(database,'SELECT json FROM sessions WHERE id=?',[id])[0]?.values[0]?.[0];if(typeof json!=='string')throw Error('CANDIDATE2_REVIEW_MISSING');
      const previous=JSON.parse(json) as Candidate2AdoptedNamingSessionV2;assertReviewRevision(previous,expectedRevision,expectedToken);this.#verifyCandidate2Stored(previous,database,undefined,undefined,{table:'sessions',rowId:id});
      this.#applyCandidate2Review(database,id,previous,json,patch);
    });return this.#candidate2ReadCommitted(id);
  }
  #applyCandidate2Review(database:Database,id:string,previous:Candidate2AdoptedNamingSessionV2,json:string,patch:unknown,restore?:{registration:StoredDatabaseRegistration;current:unknown[];selected:unknown[];revisionId:string;expectedRevision:number;expectedToken:string}):void {
    const next=applyCandidate2NativeReviewV1(previous,patch);
    if(restore)this.#recheckCandidate2HistorySelection(database,id,restore);
    if(isDeepStrictEqual(previous,next))return;
    if(previous.reviewRevision!>=Number.MAX_SAFE_INTEGER-1)throw Error('CANDIDATE2_REVIEW_LIMIT');next.reviewRevision=previous.reviewRevision!+1;next.reviewToken=randomUUID();
    this.#candidate2Sql(database,'BEGIN');try{this.#candidate2Sql(database,'INSERT INTO revisions(session_id,created_at,json) VALUES (?,?,?)',[id,new Date().toISOString(),json]);writeCompactSession(database,id,JSON.stringify(next));this.#verifyCandidate2Stored(next,database,undefined,undefined,{table:'sessions',rowId:id});this.#candidate2Sql(database,'COMMIT');}catch(error){try{this.#candidate2Sql(database,'ROLLBACK');}catch{}throw error;}
  }
  #recheckCandidate2HistorySelection(database:Database,id:string,selection:{registration:StoredDatabaseRegistration;current:unknown[];selected:unknown[];revisionId:string;expectedRevision:number;expectedToken:string}):void {
    this.#assertCandidate2Writer();
    if(database!==this.db||this.#candidate2Database(database)!==selection.registration)throw Error('CANDIDATE2_HISTORY_SELECTION_CHANGED: native database changed');
    const current=this.#candidate2Sql(database,'SELECT id,profile_id,snapshot_sha,compact_json(snapshot_sha) FROM session_records WHERE id=?',[id])[0]?.values??[];
    const selected=this.#candidate2Sql(database,'SELECT id,session_id,profile_id,created_at,snapshot_sha,compact_json(snapshot_sha) FROM revision_records WHERE id=? AND CAST(id AS TEXT)=? AND session_id=?',[selection.revisionId,selection.revisionId,id])[0]?.values??[];
    if(current.length!==1||selected.length!==1||!isDeepStrictEqual(current[0],selection.current)||!isDeepStrictEqual(selected[0],selection.selected))throw Error('CANDIDATE2_HISTORY_SELECTION_CHANGED: exact current or historical row changed');
    assertReviewRevision(JSON.parse(String(current[0][3])) as Candidate2AdoptedNamingSessionV2,selection.expectedRevision,selection.expectedToken);
  }
  restoreCandidate2History(sessionId:string,revisionId:string,expectedRevision:number,expectedToken:string):NamingSession {
    storedInvalidateReadOperations();if(arguments.length!==4)throw Error('CANDIDATE2_HISTORY_INPUT_INVALID: exactly session id, revision id, revision and token required');
    const request=captureCandidate2HistoryRestoreInput(sessionId,revisionId,expectedRevision,expectedToken);
    this.#assertCandidate2Writer();this.#candidate2Mutate(()=>{
      const database=this.db,registration=this.#candidate2Database(database);
      const currentRows=this.#candidate2Sql(database,'SELECT id,profile_id,snapshot_sha,compact_json(snapshot_sha) FROM session_records WHERE id=?',[request.sessionId])[0]?.values??[];
      const selectedRows=this.#candidate2Sql(database,'SELECT id,session_id,profile_id,created_at,snapshot_sha,compact_json(snapshot_sha) FROM revision_records WHERE id=? AND CAST(id AS TEXT)=? AND session_id=?',[request.revisionId,request.revisionId,request.sessionId])[0]?.values??[];
      if(currentRows.length!==1||selectedRows.length!==1)throw Error('CANDIDATE2_HISTORY_MISSING: selected revision must belong to the current session');
      const current=currentRows[0],selected=selectedRows[0];
      if(current.length!==4||selected.length!==6||current[0]!==request.sessionId||typeof current[1]!=='string'||typeof current[2]!=='string'||typeof current[3]!=='string'||!Number.isSafeInteger(selected[0])||String(selected[0])!==request.revisionId||selected[1]!==request.sessionId||selected[2]!==current[1]||typeof selected[3]!=='string'||typeof selected[4]!=='string'||typeof selected[5]!=='string')throw Error('CANDIDATE2_HISTORY_IDENTITY_INVALID: native history columns differ');
      const previous=JSON.parse(current[3]) as Candidate2AdoptedNamingSessionV2,historical=JSON.parse(selected[5]) as Candidate2AdoptedNamingSessionV2;
      if(previous.id!==current[0]||previous.profileId!==current[1]||historical.id!==selected[1]||historical.profileId!==selected[2])throw Error('CANDIDATE2_HISTORY_IDENTITY_INVALID: native JSON ownership differs');
      assertReviewRevision(previous,request.expectedRevision,request.expectedToken);
      this.#verifyCandidate2Stored(previous,database,undefined,undefined,{table:'sessions',rowId:request.sessionId});
      this.#verifyCandidate2Stored(historical,database,undefined,undefined,{table:'revisions',rowId:Number(selected[0])});
      const patch=projectCandidate2HistoryReview(previous,historical);
      this.#applyCandidate2Review(database,request.sessionId,previous,current[3],patch,{registration,current,selected,revisionId:request.revisionId,expectedRevision:request.expectedRevision,expectedToken:request.expectedToken});
    });return this.#candidate2ReadCommitted(request.sessionId);
  }
  #deleteCandidate2Profile(id:string):void {
    this.#assertCandidate2Writer();this.#candidate2Mutate(()=>{
      const database=this.db,registration=this.#candidate2Database(database);assertCompactCustomerSchema(database);this.#assertCandidate2DatabaseClosure(database);this.#verifyNamingHistoryLinksCore(database);
      const profile=this.#candidate2Sql(database,'SELECT json FROM profiles WHERE id=?',[id])[0]?.values[0]?.[0],token=this.#candidate2Sql(database,'SELECT token FROM profile_versions WHERE id=?',[id])[0]?.values[0]?.[0]??'',epoch=this.profileEpoch;
      if(typeof profile!=='string')throw Error('C2_DELETE_SOURCE_CHANGED: native profile missing');
      const activeFile=join(this.#managedCustomerDirectory(),'knowledge.sqlite'),activePath=existsSync(activeFile)?activeFile:join(this.#ownedDirectory!,'knowledge-v6.sqlite'),activeSha=digest(readFileSync(activePath));
      if(this.#candidate2Sql(database,'SELECT id FROM cultural_comparisons WHERE profile_id=? LIMIT 1',[id])[0]?.values.length)throw Error('C2_DELETE_CULTURAL_REFERENCE: existing cultural history retains this customer');
      const deleted=new Set<string>(),kept=new Set<string>();
      const live=this.#candidate2Sql(database,'SELECT \'sessions\',id,profile_id,compact_json(snapshot_sha) FROM session_records UNION ALL SELECT \'revisions\',id,profile_id,compact_json(snapshot_sha) FROM revision_records')[0]?.values??[];
      for(const [table,rowId,nativeProfile,json]of live){const session=JSON.parse(String(json)) as NamingSession;if(session.profileId!==nativeProfile)throw Error('C2_DELETE_SOURCE_INVALID: native ownership mismatch');if(!hasCandidate2NativeFootprint(session))continue;this.#verifyCandidate2Stored(session,database,undefined,undefined,{table:table as 'sessions'|'revisions',rowId:rowId as string|number});const receipt=this.#candidate2Validation?.get(database)?.get(adoptionDigest((session as Candidate2AdoptedNamingSessionV2).candidate2Naming));if(!receipt)throw Error('C2_DELETE_SOURCE_INVALID: missing native closure receipt');const ownership=getCandidate2NativeOwnershipV1(database,session,receipt),set=nativeProfile===id?deleted:kept;set.add(ownership.bindingRef.sha);for(const ref of ownership.sourceRefs)set.add(ref.sha);}
      const remove=[...deleted].filter(sha=>!kept.has(sha)).sort(),protectedRows=this.#candidate2Sql(database,'SELECT blob_sha FROM root_leaf_refs UNION SELECT capsule_sha FROM cultural_comparison_revisions UNION SELECT result_sha FROM cultural_comparison_revisions')[0]?.values??[],protectedRefs=new Set(protectedRows.map(row=>String(row[0])));
      if(remove.some(sha=>protectedRefs.has(sha)))throw Error('C2_DELETE_PROTECTED_ORPHAN_CONFLICT: retained structure requires a newly unowned C2 source');
      const currentActivePath=existsSync(activeFile)?activeFile:join(this.#ownedDirectory!,'knowledge-v6.sqlite');this.#assertCandidate2Writer();this.assertFresh();if(database!==this.db||registration!==this.#candidate2Database(database)||epoch!==this.profileEpoch||profile!==this.#candidate2Sql(database,'SELECT json FROM profiles WHERE id=?',[id])[0]?.values[0]?.[0]||token!==(this.#candidate2Sql(database,'SELECT token FROM profile_versions WHERE id=?',[id])[0]?.values[0]?.[0]??'')||currentActivePath!==activePath||activeSha!==digest(readFileSync(currentActivePath)))throw Error('C2_DELETE_SOURCE_CHANGED: native customer or pack changed');
      this.#candidate2Sql(database,'BEGIN');try{
        this.#candidate2Sql(database,'DELETE FROM revision_records WHERE profile_id=?',[id]);this.#candidate2Sql(database,'DELETE FROM session_records WHERE profile_id=?',[id]);this.#candidate2Sql(database,'DELETE FROM profiles WHERE id=?',[id]);this.#candidate2Sql(database,'INSERT INTO profile_versions(id,token) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token',[id,randomUUID()]);
        for(const sha of remove)this.#candidate2Sql(database,'DELETE FROM snapshot_blobs WHERE sha=?',[sha]);
        this.#assertCandidate2DatabaseClosure(database);this.#verifyNamingHistoryLinksCore(database);this.#candidate2Sql(database,'COMMIT');
      }catch(error){try{this.#candidate2Sql(database,'ROLLBACK');}catch{}throw error;}
    });
  }
  #storedFactInputs(session:NamingSession,origin:StoredRowOrigin,operation?:StoredReadOperation):{session:NamingSession;archive:FactArchive;builtin:FactArchive}|undefined{
    if(operation?.used)this.#assertStoredReadSqlIdentity(operation);
    if(this.#storedRegistration(origin.database)!==origin.registration){if(operation?.used)throw new Error('已认证读取的后续原生行来源资格已失效。');return undefined;}
    if(!plainStoredReplayData(session))return undefined;
    const namingVersion=resolveSessionNamingRulesVersion(session);
    if((namingVersion!=='naming-editorial-7.0.0'&&namingVersion!=='naming-editorial-7.1.0')||!session.profile.namingPreferences||!session.candidates.length)return undefined;
    // Reparse the captured native text. No caller object, public Dataset or cached
    // FactArchive.dataset becomes the owned replay input.
    const parsed=JSON.parse(origin.json) as NamingSession;
    if(!isDeepStrictEqual(parsed,session))return undefined;
    const directory=this.#ownedDirectory!,builtinPack=new Uint8Array(readFileSync(join(directory,'knowledge-v6.sqlite'))),builtinSha=packSha(builtinPack);
    // The catalog used by feature guards is not an authority. Read the selected
    // archive again through this instance's captured native SQL operation.
    const archived=this.#storedArchiveCatalog(origin.database,origin.registration).get(session.dataVersion);
    if(archived&&session.dataVersion===builtinSha.slice(0,12)&&archived.sha256!==builtinSha)throw new Error('知识包历史归档与已知内置版本冲突。');
    const pack=archived?new Uint8Array(archived.pack):session.dataVersion===builtinSha.slice(0,12)?builtinPack:undefined;
    if(!pack)return undefined;
    const sha256=packSha(pack);if(sha256.slice(0,12)!==session.dataVersion)throw new Error('知识包历史归档与真实数据版本不一致。');
    const dataset=this.#readPackCore(pack,true),archive={sha256,version:dataset.version,pack,dataset};
    const builtinDataset=sha256===builtinSha?dataset:this.#readPackCore(builtinPack,true);
    return {session:parsed,archive,builtin:{sha256:builtinSha,version:builtinDataset.version,pack:new Uint8Array(builtinPack),dataset:builtinDataset}};
  }
  #storedProjectBasis(session:NamingSession){
    if(!hasProjectNamingUseFootprint(session))return undefined;
    if(!this.#storedProjectReplay){const directory=this.#ownedDirectory!,resources=loadRootFeedbackResources({assetDir:join(directory,'..','assets'),dataDir:directory});this.#storedProjectReplay={facade:createBaziRootFeedbackFacade(resources),fixedSourceRecords:resources.sources};}
    return verifySavedProjectNamingUse(session,this.#storedProjectReplay);
  }
  private meaningContextData?:ReturnType<typeof loadMeaningContextData>;
  meaningContextPackContext(session:NamingSession):MeaningContextPack|undefined{storedInvalidateReadOperations();const archive=this.factArchive(session.dataVersion,this.archiveCatalog());return archive?{packSha256:archive.sha256,activeVersion:archive.version}:undefined;}
  /** Lock-free read preflight, never write authority. Full current validation;
   * linked revisions retain their association and feature/source guards. The
   * writer re-reads/asserts previous and CAS under withWriter -> mutate. */
  readVerifiedSession(id:string):NamingSession|undefined{return this.#withStoredReadOperation(operation=>this.#readVerifiedSessionCore(id,operation));}
  /** Main-owned report source only. Current native read, explicit CAS,
   * settings and pure HTML rendering share the same read seal. No write or
   * historical append is performed and no caller callback is accepted. */
  prepareCandidate2Report(id:string,expectedReviewRevision:number,expectedReviewToken:string):Candidate2ReportDocument{
    if(arguments.length!==3)throw Error('CANDIDATE2_REPORT_INPUT_INVALID: exactly id, explicit review revision and token required');
    const request=captureCandidate2ReportInput(id,expectedReviewRevision,expectedReviewToken);
    return this.#withStoredReadOperation(operation=>{
      const canonical=this.#readVerifiedSessionCore(request.id,operation);
      const rendered=renderCandidate2ReportSource(canonical,this.#settingsCore(operation),request);
      return{...rendered,source:'native-current-canonical' as const,writes:0 as const};
    });
  }
  #readVerifiedSessionCore(id:string,operation:StoredReadOperation):NamingSession|undefined{return withParentNameSourceBoundary(this.dataDir,'Store.readVerifiedSession',()=>{if(typeof id!=='string'||!id.trim()||id.length>1000)throw new Error('方案编号无效。');
    const current=this.#storedCurrentDatabase(operation);
    if(current){const {database,registration}=current;
      this.#verifyNamingHistoryLinksCore(database,id,registration,operation);
      const row=this.#storedRows(database,registration,'SELECT json FROM sessions WHERE id=?',[id])[0]?.values[0]?.[0];if(row===undefined)return undefined;
      const parsed=typeof row==='string'?this.#parseStoredRow(database,registration,row,{table:'sessions',rowId:id}):{session:JSON.parse(String(row)) as NamingSession,origin:undefined};
      const {session,origin}=parsed;this.verifyYueHomophoneReadBoundary(session);this.verifyYueReadBoundary(session);this.verifyImageryReadBoundary(session);this.verifyRenReadBoundary(session);
      this.#assertSessionCore(session,this.#storedArchiveCatalog(database,registration),database,origin,operation);return session;
    }
    this.verifyNamingHistoryLinks(this.db,id);const row=this.db.exec('SELECT json FROM sessions WHERE id=?',[id])[0]?.values[0]?.[0];if(row===undefined)return undefined;const session=JSON.parse(String(row));this.verifyYueHomophoneReadBoundary(session);this.verifyYueReadBoundary(session);this.verifyImageryReadBoundary(session);this.verifyRenReadBoundary(session);if(hasCandidate2NativeFootprint(session))this.#verifyCandidate2Stored(session,this.db,undefined,operation,{table:'sessions',rowId:id});else this.assertSession(session);return session;});}
  /** Generation exclusion reads only the requested profile; each selected row and its linked history keep the complete verified-reader checks. */
  readVerifiedSessionsForProfile(profileId:string):NamingSession[]{return this.#withStoredReadOperation(operation=>{if(typeof profileId!=='string'||!profileId.trim()||profileId.length>1000)throw new Error('客户编号无效。');const current=this.#storedCurrentDatabase(operation),query="SELECT id FROM sessions WHERE json_extract(json,'$.profileId')=? ORDER BY rowid DESC";const ids=(current?this.#storedRows(current.database,current.registration,query,[profileId]):this.db.exec(query,[profileId]))[0]?.values??[];return ids.map(([id])=>{const session=storedOriginalDispatch(this,'readVerifiedSession',storedOriginalReadVerifiedSession)?this.#readVerifiedSessionCore(String(id),operation):(storedInvalidateReadOperations(),this.readVerifiedSession(String(id)));if(!session||session.profileId!==profileId)throw new Error('方案客户归属与查询结果不一致。');return session;});});}
  /** Compatibility name for this feature; all validation lives in the shared reader above. */
  meaningContextSession(id:string):NamingSession|undefined{return this.#withStoredReadOperation(operation=>storedOriginalDispatch(this,'readVerifiedSession',storedOriginalReadVerifiedSession)?this.#readVerifiedSessionCore(id,operation):(storedInvalidateReadOperations(),this.readVerifiedSession(id)));}
  private verifyMeaningContextIntegrity(session:NamingSession,catalog:Map<string,FactArchive>){if(!hasMeaningContextReview(session))return;assertMeaningContextReviewInput(session);const archive=this.factArchive(session.dataVersion,catalog);verifySessionMeaningContextReviews(session,archive?{packSha256:archive.sha256,activeVersion:archive.version}:undefined,this.meaningContextData??=loadMeaningContextData(this.dataDir));}
  db!:Database;dataset!:Dataset;private SQL!:Awaited<ReturnType<typeof initSqlJs>>;private diskHash:string|null=null;
  private profileEpoch=randomUUID();
  #preparedCustomerRestore?:PreparedCustomerRestoreState;
  #managedStorageDirectory?:string;
  #lastCustomerRestoreCleanup?:unknown;
  private projectNamingReplay?:SavedProjectNamingUseDependencies;
  private savedProjectBasis(session:NamingSession){
    if(!hasProjectNamingUseFootprint(session))return undefined;
    if(!this.projectNamingReplay){const resources=loadRootFeedbackResources({assetDir:join(this.dataDir,'..','assets'),dataDir:this.dataDir});this.projectNamingReplay={facade:createBaziRootFeedbackFacade(resources),fixedSourceRecords:resources.sources};}
    return verifySavedProjectNamingUse(session,this.projectNamingReplay);
  }
  constructor(public userDir:string,public dataDir:string,private wasmPath:string){if(typeof dataDir==='string')this.#ownedDirectory=dataDir;}
  #culturalProvider?:CulturalProviderAPI;
  #culturalProviderPreparing?:Promise<CulturalProviderAPI>;
  #culturalNativePrepare?:Database['prepare'];
  #culturalWrites=new Map<string,{view:PreparedCulturalWrite;intent:CulturalWriteIdentity;requestJson:string;encoded?:EncodedCulturalEvidence;result?:CulturalRevisionResult;previewToken?:string;already?:number;capsuleRef?:{sha:string;rawBytes:number}}>();
  #boundCulturalTickets(){for(const [key,value]of this.#culturalWrites)if(Date.now()>Date.parse(value.view.expiresAt))this.#culturalWrites.delete(key);while(this.#culturalWrites.size>=16)this.#culturalWrites.delete(this.#culturalWrites.keys().next().value!);}
  async culturalProvider():Promise<CulturalProviderAPI>{
    if(!this.#culturalProviderPreparing)this.#culturalProviderPreparing=import('./qimen-cultural-provider-v1').then(({createQimenCulturalProvider})=>this.#culturalProvider=createQimenCulturalProvider({userDir:this.#managedCustomerDirectory(),dataDir:this.#ownedDirectory!}));
    return this.#culturalProviderPreparing;
  }
  private wordReferenceResources?:WordPronunciationSessionResources;
  private wordReferences(){return this.wordReferenceResources??=new WordPronunciationSessionResources(this.dataDir);}
  prepareWordPronunciationReference(session:NamingSession){storedInvalidateReadOperations();return this.wordReferences().initialize(session,this.factArchive(session.dataVersion,this.archiveCatalog()));}
  refreshWordPronunciationReference(session:NamingSession,candidateId:string){storedInvalidateReadOperations();return this.wordReferences().refresh(session,candidateId,this.factArchive(session.dataVersion,this.archiveCatalog()));}
  private elementAssessmentResources?:ElementAssessmentPackage;
  prepareElementAssessment(session:NamingSession){storedInvalidateReadOperations();return (this.elementAssessmentResources??=new ElementAssessmentPackage(this.dataDir)).initialize(session,this.factArchive(session.dataVersion,this.archiveCatalog()));}
  confirmElementAssessment(session:NamingSession,candidateId:string,choices:unknown){storedInvalidateReadOperations();return (this.elementAssessmentResources??=new ElementAssessmentPackage(this.dataDir)).confirm(session,this.factArchive(session.dataVersion,this.archiveCatalog()),candidateId,choices);}
  private numerologyResources?:ReturnType<typeof loadNumerologyData>;
  private fixedRuleSourceIds?:Set<string>;
  private baziResources?:ReturnType<typeof loadBaziSources>;
  private monthAuthoritySources?:ReturnType<typeof loadMonthAuthoritySources>;
  private congShaSources?:ReturnType<typeof loadCongShaSources>;
  private solarTimeSources?:ReturnType<typeof loadSolarTimeSources>;
  private followingRestrictionsSources?:ReturnType<typeof loadFollowingRestrictionsSources>;
  private ditianRenSources?:ReturnType<typeof loadDitianRenSources>;
  private renActionsSources?:ReturnType<typeof loadRenActionsSources>;
  private renCapacitiesSources?:ReturnType<typeof loadRenCapacitiesSources>;
  private renDirectionsSources?:ReturnType<typeof loadRenDirectionsSources>;
  private renJointBattleSources?:ReturnType<typeof loadRenJointBattleSources>;
  private renNecessarySources?:ReturnType<typeof loadRenNecessarySources>;
  private yueHomophoneResources?:ReturnType<typeof loadYueHomophonePackages>;
  private yueResources?:ReturnType<typeof loadYueReadingData>;
  private phoneticAdapter?:ReturnType<typeof loadNamePhoneticAdapter>;
  private phonetics(){return this.phoneticAdapter??=loadNamePhoneticAdapter(this.dataDir); }
  private nameImageryResources?:ReturnType<typeof loadNameImageryData>;
  private namingRulePackages?:ReturnType<typeof loadNamingEditorialPackages>;
  private congWealthSources?:ReturnType<typeof loadCongWealthSources>;
  private seasonalConditionSources?:ReturnType<typeof loadSeasonalConditionSources>;
  private monthlySeasonalSources?:ReturnType<typeof loadMonthlySeasonalSources>;
  private activeDatasetBytes!:Uint8Array;
  private builtinArchives?:Map<string,FactArchive>;
  private currentBuiltinArchive?:FactArchive;
  private factDatasetCache=new Map<string,Dataset>();
  private archiveDataset(hash:string,pack:Uint8Array):Dataset {let dataset=this.factDatasetCache.get(hash);if(!dataset){dataset=storedOriginalDispatch(this,'readPack',storedOriginalReadPack)?this.#readPackCore(pack,false):(storedInvalidateReadOperations(),this.readPack(pack));this.factDatasetCache.set(hash,dataset);}return dataset;}
  private builtinFacts(version?:string):FactArchive {
    if(!this.builtinArchives){const archives=new Map<string,FactArchive>();for(const file of ['knowledge.sqlite','knowledge-v5.sqlite','knowledge-v6.sqlite']){const pack=new Uint8Array(readFileSync(join(this.dataDir,file))),sha256=packSha(pack),dataset=this.archiveDataset(sha256,pack),archive={sha256,version:dataset.version,pack,dataset};archives.set(archive.version,archive);if(file==='knowledge-v6.sqlite')this.currentBuiltinArchive=archive;}this.builtinArchives=archives;}
    const selected=version?this.builtinArchives.get(version):undefined;return selected??this.currentBuiltinArchive!;
  }
  private archiveCatalog(database:Database=this.db):Map<string,FactArchive>{
    const catalog=new Map<string,FactArchive>(),rows=database.exec('SELECT sha256,version,pack FROM knowledge_archives')[0]?.values??[];
    if(rows.length>ARCHIVE_MAX_COUNT)throw new Error('知识包历史归档超过100个，未改变当前客户库。');
    let size=0;const hashes=new Set<string>();
    for(const [hash,version,raw]of rows){
      if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)||typeof version!=='string'||version!==hash.slice(0,12)||!(raw instanceof Uint8Array)||hashes.has(hash)||catalog.has(version))throw new Error('知识包历史归档编号、映射或重复记录无效。');
      size+=raw.length;if(size>ARCHIVE_MAX_BYTES||packSha(raw)!==hash)throw new Error('知识包历史归档超过150MB或完整原包哈希不一致。');
      const dataset=this.archiveDataset(hash,raw);if(dataset.version!==version)throw new Error('知识包历史归档与真实数据版本不一致。');
      hashes.add(hash);catalog.set(version,{sha256:hash,version,pack:new Uint8Array(raw),dataset});
    }return catalog;
  }
  private factArchive(version:string,catalog:Map<string,FactArchive>):FactArchive|undefined {
    const builtin=this.builtinFacts(version),archived=catalog.get(version);
    if(archived&&version===builtin.version&&archived.sha256!==builtin.sha256)throw new Error('知识包历史归档与已知内置版本冲突。');
    if(archived)return archived;if(version===builtin.version)return builtin;
    if(version===this.dataset.version){const sha256=packSha(this.activeDatasetBytes);if(sha256.slice(0,12)!==version)throw new Error('当前知识包内容与版本不一致。');return {version,sha256,pack:new Uint8Array(this.activeDatasetBytes),dataset:this.archiveDataset(sha256,this.activeDatasetBytes)};}
    return undefined;
  }
  private verifySessionFacts(session:NamingSession,catalog:Map<string,FactArchive>=this.archiveCatalog(),database:Database=this.db):FactArchive|undefined {return this.#verifySessionFactsCore(session,catalog,database);}
  #verifySessionFactsCore(session:NamingSession,catalog:Map<string,FactArchive>,database:Database,origin?:StoredRowOrigin,operation?:StoredReadOperation):FactArchive|undefined {if(hasCandidate2NativeFootprint(session)){this.#verifyCandidate2Stored(session,database,origin,operation);return undefined;}const reviewedFootprint=assertReviewedDataInput(session);verifySessionParentNamePhonetics(session,this.dataDir);
    if(hasNamePhoneticFootprint(session))this.phonetics().verifySession(session);
    assertWordPronunciationFields(session);
    assertElementInput(session);
    if(session.candidates?.some(candidate=>Object.hasOwn(candidate,'modernPracticalEvidence'))&&!validSession(session))throw new Error('现代说明方案结构无效。');
    if(Array.isArray(session.sourceSnapshot?.sources)&&session.sourceSnapshot.sources.some(source=>source.id===OFFICIAL_NAME_POPULARITY_SOURCE_ID))throw new Error('历史姓名统计仅供独立只读参考，不得附加到方案生成时来源快照。原数据保留。');
    if(operation)this.#assertStoredReadOperation(operation);
    const owned=origin?this.#storedFactInputs(session,origin,operation):undefined;
    if(operation)this.#assertStoredReadOperation(operation);
    if(operation?.used&&origin&&!owned){
      // Classify the captured native SQL JSON, never a changed caller-visible graph.
      if(typeof storedNativeJSONParse!=='function')throw new Error('已认证读取的原生 JSON 解析器不再可用。');
      const initial=storedInvoke<unknown>(storedNativeJSONParse,undefined,[origin.json]),rules=storedOwnDataValue(initial,'namingRules'),version=storedOwnDataValue(rules,'version');
      const preferences=storedOwnDataValue(storedOwnDataValue(initial,'profile'),'namingPreferences'),length=storedOwnDataValue(storedOwnDataValue(initial,'candidates'),'length');
      if((version==='naming-editorial-7.0.0'||version==='naming-editorial-7.1.0')&&preferences&&typeof length==='number'&&length>0)throw new Error('本次已认证读取的后续命名批次失去原生重放资格。');
    }
    const archive=owned?.archive??this.factArchive(session.dataVersion,catalog);
    // Authenticate the original SQL graph before deriving the internal baseline
    // replay. The original record retains its adopted data and proof; the old
    // fact verifier still checks a freshly rebuilt original-package candidate.
    const factSession=reviewedFootprint?verifyReviewedNamingDataSession(owned?.session??session,loadReviewedNamingDataResources(dirname(this.#ownedDirectory??this.dataDir)),archive):owned?.session??session;
    if(owned){
      const capsule={};
      try{storedRegistrySet(storedFactReplayInputs,capsule,{...owned,session:factSession,directory:this.#ownedDirectory!,projectBasis:this.#storedProjectBasis(factSession),readPack:this.#storedPackReader,...(operation?{operation}:{})});session.factVerification=verifyStoredCandidateFacts(capsule);}finally{storedRegistryDelete(storedFactReplayInputs,capsule);}
      if(operation?.used&&origin?.registration.role==='current'){
        const previous=storedRegistryGet(this.#storedReadCurrentOrigins,operation);
        if(previous&&(previous.database!==origin.database||previous.registration!==origin.registration)||this.#storedRegistration(origin.database)!==origin.registration)throw new Error('本次内部读取的当前客户库来源身份已变化。');
        storedRegistrySet(this.#storedReadCurrentOrigins,operation,{database:origin.database,registration:origin.registration});
      }
    }else session.factVerification=verifyCandidateFacts(factSession,archive,this.builtinFacts(session.dataVersion),this.savedProjectBasis(factSession));
    // The private SQL fact reader fixes this operation's publication bundle
    // before the ordinary package loader can perform its first source read.
    if(resolveSessionNamingRulesVersion(session))verifySessionNamingEditorialProvenance(session,this.namingRulePackages??=loadNamingEditorialPackages(this.dataDir));
    const witnessRows=(sql:string)=>owned&&origin?this.#storedRows(database,origin.registration,sql,[session.id]):database.exec(sql,[session.id]);
    verifySessionModernRecords(session,this.dataDir,()=>[...witnessRows('SELECT json FROM sessions WHERE id=?')[0]?.values??[],...witnessRows('SELECT json FROM revisions WHERE session_id=?')[0]?.values??[]].map(row=>JSON.parse(String(row[0]))));if(hasElementAssessment(session))(this.elementAssessmentResources??=new ElementAssessmentPackage(this.dataDir)).verify(session,archive);if(hasWordPronunciationFootprint(session))this.wordReferences().verify(session,archive);
    if(hasMeaningContextReview(session))verifySessionMeaningContextReviews(session,archive?{packSha256:archive.sha256,activeVersion:archive.version}:undefined,this.meaningContextData??=loadMeaningContextData(this.dataDir));
    if(operation)this.#assertStoredReadOperation(operation);
    return archive;
  }
  private ensureArchive(archive:FactArchive|undefined,database:Database=this.db){
    if(!archive)return;const old=database.exec('SELECT sha256,pack FROM knowledge_archives WHERE version=?',[archive.version])[0]?.values[0];
    if(old){if(old[0]!==archive.sha256||!(old[1] instanceof Uint8Array)||packSha(old[1])!==archive.sha256)throw new Error('知识包历史版本映射冲突，未保存。');return;}
    const size=database.exec('SELECT COUNT(*),COALESCE(SUM(length(pack)),0) FROM knowledge_archives')[0]?.values[0]??[0,0];
    if(Number(size[0])>=ARCHIVE_MAX_COUNT||Number(size[1])+archive.pack.length>ARCHIVE_MAX_BYTES)throw new Error('知识包历史归档已达100包或150MB上限，未删除历史，当前操作未保存。');
    database.run('INSERT INTO knowledge_archives(sha256,version,pack) VALUES (?,?,?)',[archive.sha256,archive.version,archive.pack]);
  }
  private ruleSourceIds(){if(!this.fixedRuleSourceIds){const numerology=this.numerologyResources??=loadNumerologyData(this.dataDir);this.fixedRuleSourceIds=loadStoreRuleSourceIds(this.dataDir,numerology);}return this.fixedRuleSourceIds;}
  private verifySessionNumerology(session:NamingSession){const numeric=this.numerologyResources??=loadNumerologyData(this.dataDir);for(const candidate of session.candidates)if(candidate.numerology)verifyNumerologyProvenance(candidate.numerology,numeric);verifyFixedRuleProvenance(session,{qimenSources:loadQimenSources(this.dataDir),numerology:numeric});verifyBaziProvenance(session,this.baziResources??=loadBaziSources(this.dataDir));verifyMonthAuthorityProvenance(session,this.monthAuthoritySources??=loadMonthAuthoritySources(this.dataDir));verifyMonthlySeasonalProvenance(session,this.monthlySeasonalSources??=loadMonthlySeasonalSources(this.dataDir));verifySeasonalConditionProvenance(session,this.seasonalConditionSources??=loadSeasonalConditionSources(this.dataDir));verifyCongWealthProvenance(session,this.congWealthSources??=loadCongWealthSources(this.dataDir));verifyCongShaProvenance(session,this.congShaSources??=loadCongShaSources(this.dataDir));verifySolarTimeProvenance(session,this.solarTimeSources??=loadSolarTimeSources(this.dataDir));verifyFollowingRestrictionsProvenance(session,this.followingRestrictionsSources??=loadFollowingRestrictionsSources(this.dataDir));verifyDitianRenProvenance(session,this.ditianRenSources??=loadDitianRenSources(this.dataDir));verifyRenNecessaryProvenance(session,this.renNecessarySources??=loadRenNecessarySources(this.dataDir));verifyRenActionsProvenance(session,this.renActionsSources??=loadRenActionsSources(this.dataDir));verifyRenCapacitiesProvenance(session,this.renCapacitiesSources??=loadRenCapacitiesSources(this.dataDir));verifyRenDirectionsProvenance(session,this.renDirectionsSources??=loadRenDirectionsSources(this.dataDir));verifyRenJointBattleProvenance(session,this.renJointBattleSources??=loadRenJointBattleSources(this.dataDir));verifyNameImageryProvenance(session,(this.nameImageryResources??=loadNameImageryData(this.dataDir)).sources);verifyYueReadingProvenance(session,(this.yueResources??=loadYueReadingData(this.dataDir)).sources);verifySessionYueHomophoneProvenance(session,this.yueHomophoneResources??=loadYueHomophonePackages(this.dataDir));}
  async init(){storedInvalidateReadOperations();
    mkdirSync(this.userDir,{recursive:true});const actualDirectory=realpathSync.native(this.userDir);if(this.#managedStorageDirectory&&this.#managedStorageDirectory!==actualDirectory)throw new Error('客户存储目录身份已变化。');this.#managedStorageDirectory=actualDirectory;const SQL=await initSqlJs({locateFile:()=>this.wasmPath});this.#ownedDatabaseConstructor=SQL.Database;this.#ownedDatabasePrototype=SQL.Database.prototype;this.#ownedDatabaseExec=SQL.Database.prototype.exec;this.#ownedDatabaseClose=SQL.Database.prototype.close;this.SQL=SQL;
    await prepareCompactCulturalSemanticsV1({scratchRoot:join(this.#managedCustomerDirectory(),'.cultural-offline')});
    this.#culturalNativePrepare=SQL.Database.prototype.prepare;
    const userPath=join(this.userDir,'customers.sqlite'),bytes=existsSync(userPath)?readFileSync(userPath):null;this.diskHash=bytes?digest(bytes):null;this.db=this.#openCustomerDatabase(bytes?new Uint8Array(bytes):undefined,'current');
    const compact=isCompactCustomerDatabase(this.db);if(!compact)this.db.run(schema);this.loadDataset();
    try{this.#withCandidate2ValidationScope(()=>withParentNameSourceBoundary(this.dataDir,'Store.init',()=>{if(compact)validateCompactCustomerStorage(this.db);this.#assertCandidate2DatabaseClosure(this.db);for(const row of (compact?customerRows(this.db,'SELECT id,json FROM profiles'):this.db.exec('SELECT json FROM profiles')[0]?.values??[]))validateParentNameProfileSync(JSON.parse(String(row[compact?1:0])),this.dataDir);this.verifyNamingHistoryLinks(this.db);}));}catch(error){this.#forgetDatabase(this.db);this.db.close();throw error;}
    // Opening a second reader must never rewrite a snapshot over the first writer.
    if(!bytes)this.flush();return this;
  }
  loadDataset(){storedInvalidateReadOperations();
    const override=join(this.userDir,'knowledge.sqlite');const path=existsSync(override)?override:join(this.dataDir,'knowledge-v6.sqlite');
    if(!existsSync(path))throw new Error('缺少本地知识库，请先运行 npm run data:build。');
    this.activeDatasetBytes=new Uint8Array(readFileSync(path));this.dataset=this.readPack(this.activeDatasetBytes);
  }
  readPack(bytes:Uint8Array):Dataset {storedInvalidateReadOperations();return this.#readPackCore(bytes,false);}
  #readPackCore(bytes:Uint8Array,owned:boolean):Dataset {
    if(bytes.length>150*1024*1024)throw new Error('数据包过大。');
    const db=owned?this.#newOwnedDatabase(new Uint8Array(bytes),'pack'):new this.SQL.Database(bytes);
    const registration=owned?storedRegistryGet(this.#registeredDatabases,db):undefined;
    const exec=(sql:string)=>registration?storedInvoke<ReturnType<Database['exec']>>(registration.exec,db,[sql]):db.exec(sql);
    try{
      const read=<T>(table:string):T[]=>{const r=exec(`SELECT json FROM ${table}`);return (r[0]?.values||[]).map(row=>JSON.parse(String(row[0])));};
      const characters=read<CharacterEntry>('characters'),citations=read<Citation>('citations'),knowledge=read<KnowledgeEntry>('knowledge'),sources=read<SourceRecord>('sources');
      if(characters.length<500||characters.length>200000||!citations.length||!knowledge.length||!sources.length)throw new Error('数据包不完整：至少需500个字、引文、知识及来源。');
      if(characters.some(c=>!validCharacter(c)))throw new Error('字库字段不合法。');
      if(new Set(characters.map(c=>c.char)).size!==characters.length)throw new Error('字库含重复字符。');
      if(sources.some(s=>!strings(s,['id','name','url','commit','license','sha256','note'])||!stringArray(s.files)))throw new Error('来源登记字段不合法。');
      if(citations.some(c=>!strings(c,['id','text','title','chapter','sourceId']))||knowledge.some(c=>!strings(c,['id','title','text','category','sourceId'])))throw new Error('引文或知识字段不合法。');
      if(knowledge.some(entry=>entry.id.startsWith(MONTHLY_SEASONAL_KNOWLEDGE_PREFIX)))throw new Error('逐月调候固定知识编号保留给随应用发布的规则资料，知识数据包不得占用。');
      for(const [label,records] of [['来源',sources],['引文',citations],['知识',knowledge]] as const){if(records.some(v=>!v.id.trim())||new Set(records.map(v=>v.id)).size!==records.length)throw new Error(`${label}ID必须非空且唯一，数据包未导入。`);}
      createSessionSourceSnapshot('pack-validation',sources);
      const ruleSourceIds=()=>owned?(this.#ownedRuleSourceIds??=loadStoreRuleSourceIds(this.#ownedDirectory!,loadNumerologyData(this.#ownedDirectory!))):this.ruleSourceIds();
      if(sources.some(source=>ruleSourceIds().has(source.id)))throw new Error('规则来源编号保留给随应用发布的数理、奇门、八字和古籍原文资料，知识数据包不得占用或更新。');
      const ids=new Set(sources.map(s=>s.id));if(characters.some(c=>!ids.has(c.sourceId)||c.readings?.some(r=>!ids.has(r.sourceId)))||citations.some(c=>!ids.has(c.sourceId))||knowledge.some(c=>!ids.has(c.sourceId)))throw new Error('数据条目存在无效来源。');
      if(characters.some(c=>selectedReferenceOnlyReading(c)))throw new Error('所选默认读音只有辞典参照，未提供本读音实体义；请保留它为参照异读并选用有原定义的默认读音。');
      if(characters.some(c=>!validCharacterReading(c)))throw new Error('字库默认读音和对应义项不自洽。');
      const version=createHash('sha256').update(bytes).digest('hex').slice(0,12);return {version,characters,citations,knowledge,sources};
    }finally{this.#forgetDatabase(db);if(registration)storedInvoke<void>(registration.close,db,[]);else db.close();}
  }
  private verifyYueHomophoneReadBoundary(value:any){
    const mode=value?.preferences?.yueHomophones;
    const present=mode!==undefined&&mode!=='none'||Object.prototype.hasOwnProperty.call(value?.preferences??{},'yueHomophoneRuleVersion')||Array.isArray(value?.candidates)&&value.candidates.some((candidate:any)=>candidate?.yueHomophones!==undefined)||Array.isArray(value?.sourceSnapshot?.sources)&&value.sourceSnapshot.sources.some((source:any)=>(YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source?.id));
    if(!present)return;
    if(!validSession(value))throw new Error('粤语词汇复核读取校验失败：所选读音、词表结果或模式不一致。原数据保留。');
    try{verifySessionYueHomophoneProvenance(value,this.yueHomophoneResources??=loadYueHomophonePackages(this.dataDir));}catch{throw new Error('粤语词汇复核读取校验失败：固定来源不一致。原数据保留。');}
  }
  private verifyYueReadBoundary(value:any){
    const present=value?.preferences?.yueReading===true||Array.isArray(value?.candidates)&&value.candidates.some((candidate:any)=>candidate?.yueReading!==undefined)||Array.isArray(value?.sourceSnapshot?.sources)&&value.sourceSnapshot.sources.some((source:any)=>source?.id===YUE_READING_SOURCE_ID);
    if(!present)return;
    if(!validSession(value))throw new Error('粤语读音方案读取校验失败：姓名、候选、所选读音或派生状态不一致。原数据保留，请从有效备份恢复。');
    try{verifyYueReadingProvenance(value,(this.yueResources??=loadYueReadingData(this.dataDir)).sources);}catch{throw new Error('粤语读音方案读取校验失败：固定来源与保存版本不一致。原数据保留，请从有效备份恢复。');}
  }
  private verifyImageryReadBoundary(value:any){
    const present=value?.preferences?.imageryReading===true||Array.isArray(value?.candidates)&&value.candidates.some((candidate:any)=>candidate?.imageReading!==undefined)||Array.isArray(value?.sourceSnapshot?.sources)&&value.sourceSnapshot.sources.some((source:any)=>NAME_IMAGERY_SOURCE_IDS.includes(source?.id));
    if(!present)return;
    if(!validSession(value))throw new Error('文化意象实验方案读取校验失败：名字、标签、保存盘或结果不一致。原数据保留，请从有效备份恢复。');
    try{verifyNameImageryProvenance(value,(this.nameImageryResources??=loadNameImageryData(this.dataDir)).sources);}catch{throw new Error('文化意象实验方案读取校验失败：固定映射来源不一致。原数据保留，请从有效备份恢复。');}
  }
  private verifyRenReadBoundary(value:any){
    const renPresent=value?.analysis?.renCommentary!==undefined||value?.profile?.renMethod!==undefined&&value.profile.renMethod!=='none'||['civil-midnight-fuyi-candidate/1.10.0;lunar-typescript/1.8.6','civil-midnight-fuyi-candidate/1.11.0;lunar-typescript/1.8.6','civil-midnight-fuyi-candidate/1.12.0;lunar-typescript/1.8.6','civil-midnight-fuyi-candidate/1.13.0;lunar-typescript/1.8.6','civil-midnight-fuyi-candidate/1.14.0;lunar-typescript/1.8.6','civil-midnight-fuyi-candidate/1.15.0;lunar-typescript/1.8.6'].includes(value?.analysis?.bazi?.version)||Array.isArray(value?.sourceSnapshot?.sources)&&value.sourceSnapshot.sources.some((source:any)=>['bazi-ditian-ren-2600158','bazi-ditian-ren-necessary-2600158','bazi-ditian-ren-actions-2600158','bazi-ditian-ren-capacities-2600158','bazi-ditian-ren-directions-2600158','bazi-ditian-ren-joint-battle-2600158'].includes(source?.id));
    if(!renPresent)return;
    if(!validSession(value))throw new Error('任注方案读取校验失败：出生资料、分析或来源记录不完整。原数据保留，请从有效备份恢复后再打开。');
    try{verifyDitianRenProvenance(value,this.ditianRenSources??=loadDitianRenSources(this.dataDir));verifyRenNecessaryProvenance(value,this.renNecessarySources??=loadRenNecessarySources(this.dataDir));verifyRenActionsProvenance(value,this.renActionsSources??=loadRenActionsSources(this.dataDir));verifyRenCapacitiesProvenance(value,this.renCapacitiesSources??=loadRenCapacitiesSources(this.dataDir));verifyRenDirectionsProvenance(value,this.renDirectionsSources??=loadRenDirectionsSources(this.dataDir));verifyRenJointBattleProvenance(value,this.renJointBattleSources??=loadRenJointBattleSources(this.dataDir));}catch{throw new Error('任注方案读取校验失败：固定来源与保存版本不一致。原数据保留，请从有效备份恢复后再打开。');}
  }
  rows<T>(table:'profiles'|'sessions'|'settings'):T[]{return this.#withStoredReadOperation(operation=>this.#rowsCore<T>(table,operation));}
  #rowsCore<T>(table:'profiles'|'sessions'|'settings',operation:StoredReadOperation):T[]{return withParentNameSourceBoundary(this.dataDir,'Store.rows',()=>{
    const current=table==='sessions'?this.#storedCurrentDatabase(operation):undefined;
    if(current){const {database,registration}=current;
      this.#verifyNamingHistoryLinksCore(database,undefined,registration,operation);
      const rows=this.#storedRows(database,registration,'SELECT id,json FROM sessions ORDER BY rowid DESC'),catalog=this.#storedArchiveCatalog(database,registration);
      return (rows[0]?.values||[]).map(row=>{const parsed=typeof row[1]==='string'?this.#parseStoredRow(database,registration,row[1],{table:'sessions',rowId:String(row[0])}):{session:JSON.parse(String(row[1])) as NamingSession,origin:undefined};const {session,origin}=parsed;this.verifyYueHomophoneReadBoundary(session);this.verifyYueReadBoundary(session);this.verifyImageryReadBoundary(session);this.verifyRenReadBoundary(session);this.#verifySessionFactsCore(session,catalog,database,origin,operation);return session as unknown as T;});
    }
    if(table==='sessions')this.verifyNamingHistoryLinks(this.db);const rows=this.db.exec(`SELECT id,json FROM ${table} ORDER BY rowid DESC`),catalog=table==='sessions'?this.archiveCatalog():undefined;return (rows[0]?.values||[]).map(row=>{const value=JSON.parse(String(row[1]));if(table==='profiles')validateParentNameProfileSync(value,this.dataDir);if(table==='sessions'){this.verifyYueHomophoneReadBoundary(value);this.verifyYueReadBoundary(value);this.verifyImageryReadBoundary(value);this.verifyRenReadBoundary(value);if(hasCandidate2NativeFootprint(value))this.#verifyCandidate2Stored(value,this.db,undefined,operation,{table:'sessions',rowId:String(row[0])});else this.verifySessionFacts(value,catalog);}return value;});});}
  private assertFresh(){const path=join(this.userDir,'customers.sqlite'),current=existsSync(path)?digest(readFileSync(path)):null;if(current!==this.diskHash)throw new Error('客户库已被另一个窗口或进程更新，本次写入已取消。请重新打开应用以载入最新资料。');}
  private withWriter<T>(action:()=>T,committed?:()=>boolean):T {
    const lockPath=join(this.userDir,'customers.write-lock');let fd:number;
    try{fd=openSync(lockPath,'wx');}catch(error:any){
      if(error.code!=='EEXIST')throw error;
      // A crashed process cannot permanently lock the customer archive.
      let stale=false;try{const pid=Number(readFileSync(lockPath,'utf8'));if(Number.isInteger(pid)&&pid>0){try{process.kill(pid,0);}catch(e:any){stale=e.code==='ESRCH';}}else stale=Date.now()-statSync(lockPath).mtimeMs>30000;}catch{}
      if(!stale)throw new Error('另一个进程正在保存客户库，请稍后重试。');
      try{unlinkSync(lockPath);fd=openSync(lockPath,'wx');}catch{throw new Error('客户库正在由其他进程更新，请稍后重试。');}
    }
    try{return runWriterWithCleanup(()=>{writeFileSync(fd,String(process.pid));this.assertFresh();return action();},()=>closeSync(fd),()=>unlinkSync(lockPath));}
    catch(error){if((error instanceof WriterLockCleanupError||writerSecondaryFailures(error).length)&&!committed?.())recordCustomerWriteNotice(this,'failed-cleanup');throw error;}
  }
  private persist(onCommitted?:(receipt:CustomerDatabaseCommitReceipt)=>void){
    const bytes=isCompactCustomerDatabase(this.db)
      ? compactCommitBytes(this.db,()=>this.#validateStoredContents(this.db))
      : (this.verifyNamingHistoryLinks(this.db),this.db.export());
    const nextHash=digest(bytes);
    const receipt=writeCustomerDatabaseAtomically(join(this.userDir,'customers.sqlite'),bytes);
    onCommitted?.(receipt);this.diskHash=nextHash;return receipt;
  }
  private mutate(action:()=>void,onCommitted?:()=>void){
    if(!isCompactCustomerDatabase(this.db)||!compactCustomerCapabilities(compactCustomerVersion(this.db)!).hasRevisionProfileId)throw new Error('旧客户库在显式迁移前只读，请先执行 migrateCustomerStorage。');
    this.#legacyWriteDepth++;
    try{
    let committed=false,resultFinalized=false;let atomicCleanup:readonly WriterSecondaryFailure[]=[];
    try{this.withWriter(()=>{
      assertCompactCustomerSchema(this.db);
      const before=this.db.export();
      try{
        withParentNameSourceBoundary(this.dataDir,'Store.mutate',()=>action());
        this.persist(receipt=>{committed=true;atomicCleanup=receipt.cleanupFailures;});
        onCommitted?.();resultFinalized=true;
        if(atomicCleanup.length)throw new CustomerDatabaseCleanupError(atomicCleanup);
      }catch(error){
        if(committed){retainWriterSecondaryFailures(error,atomicCleanup);throw error;}
        const secondary:WriterSecondaryFailure[]=[];
        try{this.#forgetDatabase(this.db);this.db.close();}catch(cleanupError){secondary.push({phase:'rollback-close',error:cleanupError});}
        try{this.db=this.#openCustomerDatabase(before,'current',false);}catch(reopenError){secondary.push({phase:'rollback-reopen',error:reopenError});}
        retainWriterSecondaryFailures(error,secondary);throw error;
      }
    },()=>committed);}catch(error){if(committed){recordCustomerWriteNotice(this,'committed-cleanup');throw this.#issueCommittedWriteError(error,resultFinalized);}throw error;}
    }finally{this.#legacyWriteDepth--;}
  }
  put(table:'profiles'|'sessions'|'settings',id:string,obj:unknown){storedInvalidateReadOperations();
    if(!['profiles','sessions','settings'].includes(table)||typeof id!=='string'||!id.trim())throw new Error('保存位置或编号无效。');
    if(table==='profiles'){if(!validProfile(obj)||(obj as BirthProfile).id!==id)throw new Error('客户字段不完整或编号不一致。');this.saveProfile(obj as BirthProfile);return;}
    if(table==='sessions'){if(!object(obj)||(obj as NamingSession).id!==id)throw new Error('方案编号不一致。');this.saveSession(obj as NamingSession);return;}
    if(id!=='main'||!validSettings(obj))throw new Error('设置字段不完整或结构不合法。');
    this.mutate(()=>this.writeRow('settings',id,obj));
  }
  getCustomerWriteNotice(scope:CustomerWriteNoticeScope):CustomerWriteNotice|undefined{storedInvalidateReadOperations();return readCustomerWriteNotice(scope,this);}
  flush(){storedInvalidateReadOperations();this.mutate(()=>{});}
  private writeRow(table:'profiles'|'sessions'|'settings',id:string,obj:unknown){if(table==='profiles')validateParentNameProfileSync(obj as BirthProfile,this.dataDir);if(table==='sessions'&&isCompactCustomerDatabase(this.db))writeCompactSession(this.db,id,JSON.stringify(obj));else this.db.run(`INSERT INTO ${table}(id,json) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json`,[id,JSON.stringify(obj)]);}
  private bumpProfileVersion(id:string){this.db.run('INSERT INTO profile_versions(id,token) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET token=excluded.token',[id,randomUUID()]);}
  profileWriteToken(id:string):string {storedInvalidateReadOperations();
    if(typeof id!=='string'||!id.trim())throw new Error('客户编号无效。');
    this.assertFresh();const version=this.db.exec('SELECT token FROM profile_versions WHERE id=?',[id])[0]?.values[0]?.[0]??'';
    const current=this.db.exec('SELECT json FROM profiles WHERE id=?',[id])[0]?.values[0]?.[0]??null;
    return digest(Buffer.from(JSON.stringify([this.profileEpoch,version,current])));
  }
  saveProfile(p:BirthProfile){storedInvalidateReadOperations();if(!validProfile(p))throw new Error('客户字段不完整或结构不合法。');this.mutate(()=>{this.writeRow('profiles',p.id,p);this.bumpProfileVersion(p.id);});return p;}
  deleteProfile(id:string){storedInvalidateReadOperations();if(typeof id!=='string'||!id.trim())throw new Error('客户编号无效。');const native=this.#candidate2Database(this.db,false),owned=storedInvoke<ReturnType<Database['exec']>>(native.exec,this.db,['SELECT json FROM sessions WHERE json_extract(json,\'$.profileId\')=? UNION ALL SELECT json FROM revisions WHERE json_extract(json,\'$.profileId\')=?',[id,id]])[0]?.values??[];if(owned.some(row=>hasCandidate2NativeFootprint(JSON.parse(String(row[0]))))){this.#deleteCandidate2Profile(id);return;}this.mutate(()=>{const sessions=this.rows<NamingSession>('sessions').filter(s=>s.profileId===id);for(const s of sessions){this.db.run('DELETE FROM revisions WHERE session_id=?',[s.id]);this.db.run('DELETE FROM sessions WHERE id=?',[s.id]);}this.db.run('DELETE FROM profiles WHERE id=?',[id]);this.bumpProfileVersion(id);});}
  private assertSession(s:NamingSession,catalog:Map<string,FactArchive>=this.archiveCatalog(),database:Database=this.db){assertReviewedDataInput(s);this.#assertSessionCore(s,catalog,database);}
  #assertSessionCore(s:NamingSession,catalog:Map<string,FactArchive>,database:Database,origin?:StoredRowOrigin,operation?:StoredReadOperation){if(hasCandidate2NativeFootprint(s)){this.#verifyCandidate2Stored(s,database,origin,operation);return;}assertProjectNamingUseInput(s);assertParentNameReviewInput(s);assertWordPronunciationFields(s);assertElementInput(s);assertMeaningContextReviewInput(s);if(requiresSessionSourceManifest(s?.analysis?.bazi?.version)&&s.sourceSnapshot===undefined)throw new Error('生成时来源快照缺失，当前版本方案不得降级为历史缺失状态。');if(!object(s)||!validAnalysis(s.analysis,s.profile)||s.profile?.timeUnknown&&s.analysis.qimen.available)throw new Error('八字或奇门快照与出生资料、算法版本、来源或宫位标记不一致，请重新生成方案。');if(!validSession(s))throw new Error('方案字段不完整或结构不合法，未保存。');this.verifySessionNumerology(s);if(origin)this.#verifySessionFactsCore(s,catalog,database,origin,operation);else this.verifySessionFacts(s,catalog,database);}
  private writeSession(s:NamingSession,meaningContextChange=false){
    if(hasCandidate2NativeFootprint(s))throw Error('CANDIDATE2_NATIVE_PATH_REQUIRED: ordinary save cannot adopt or review C2');
    this.ensureArchive(this.verifySessionFacts(s));
    const profile=this.db.exec('SELECT json FROM profiles WHERE id=?',[s.profileId])[0]?.values[0]?.[0];if(!profile||!validProfile(JSON.parse(String(profile))))throw new Error('方案对应的客户不存在或资料无效，请先保存客户。');
    const row=this.db.exec('SELECT json FROM sessions WHERE id=?',[s.id])[0]?.values[0]?.[0];
    if(row){
      const previous=JSON.parse(String(row));try{this.assertSession(previous);}catch{throw new Error('已有方案快照无效，无法归档历史；当前方案和客户未改变。');}
      assertUnchangedReviewedData(previous,s);
      assertUnchangedProjectNamingUse(previous,s);
      assertUnchangedParentNamePhoneticReview(s,previous);
      if(hasNamePhoneticFootprint(previous)||hasNamePhoneticFootprint(s))this.phonetics().verifyTransition(previous,s);
      if(!meaningContextChange)for(const candidate of s.candidates){const old=previous.candidates.find((c:NameCandidate)=>c.id===candidate.id);if(old)assertUnchangedMeaningContextReview(candidate,old);}
      if(previous.id!==s.id||previous.profileId!==s.profileId)throw new Error('已有方案编号或客户归属不一致，未保存。');
      if(readWordPronunciationPreference(previous.preferences)!==readWordPronunciationPreference(s.preferences))throw new Error('同一方案的整词参照启用状态不得改变。');
      if(previous.preferences.elementAssessment!==s.preferences.elementAssessment)throw new Error('原方案人工意象开关不得改变。');
      if(Object.prototype.hasOwnProperty.call(previous,'namingRules')!==Object.prototype.hasOwnProperty.call(s,'namingRules')||!isDeepStrictEqual(previous.namingRules,s.namingRules))throw new Error('命名规则版本与原方案不一致，未保存。');
      if(!isDeepStrictEqual(previous.sourceSnapshot,s.sourceSnapshot)||previous.dataVersion!==s.dataVersion)throw new Error('生成时来源快照与原方案不一致，未保存。');
      const facts=(session:NamingSession)=>session.candidates.map(candidate=>({id:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,characters:candidate.characters,citations:candidate.citations,imageReading:candidate.imageReading}));
      if(!isDeepStrictEqual(facts(previous),facts(s)))throw new Error('候选不可编辑事实与原方案不一致，未保存。');
      assertReviewRevision(previous,s.reviewRevision,s.reviewToken);
      assertModernTransition(previous,s);
      const currentRevision=reviewRevision(previous);
      if(isDeepStrictEqual({...previous,reviewRevision:currentRevision},{...s,reviewRevision:currentRevision})){s.reviewRevision=currentRevision;s.reviewToken=previous.reviewToken??randomUUID();if(!previous.reviewToken)this.writeRow('sessions',s.id,s);return;}
      if(currentRevision>=Number.MAX_SAFE_INTEGER-1)throw new Error('方案审阅修订号已达上限，未保存修改。');
      s.reviewRevision=currentRevision+1;s.reviewToken=randomUUID();
      this.db.run('INSERT INTO revisions(session_id,created_at,json) VALUES (?,?,?)',[s.id,new Date().toISOString(),JSON.stringify(previous)]);
    }else {if(hasMeaningContextReview(s))throw new Error('生成路径不得附加用户词义确认快照。');assertModernTransition(undefined,s);s.reviewRevision=0;s.reviewToken=randomUUID();}
    this.writeRow('sessions',s.id,s);
  }
  saveSession(s:NamingSession){storedInvalidateReadOperations();if(hasCandidate2NativeFootprint(s))throw Error('CANDIDATE2_NATIVE_PATH_REQUIRED: ordinary save rejects C2');this.assertSession(s);const saved=structuredClone(s);transferModernAuthorization(s,saved);this.mutate(()=>this.writeSession(saved),()=>{s.reviewRevision=saved.reviewRevision;s.reviewToken=saved.reviewToken;});return saved;}
  /** Main-only dedicated review/history path; it retains the ordinary CAS and immutable facts guard. */
  saveMeaningContextSession(s:NamingSession){storedInvalidateReadOperations();this.assertSession(s);if(!this.db.exec('SELECT id FROM sessions WHERE id=?',[s.id])[0]?.values.length)throw new Error('词义确认需要已保存的方案。');const saved=structuredClone(s);transferModernAuthorization(s,saved);this.mutate(()=>this.writeSession(saved,true),()=>{s.reviewRevision=saved.reviewRevision;s.reviewToken=saved.reviewToken;});return saved;}
  commitGeneratedProfileAndSession(profile:BirthProfile,session:NamingSession,guard?:string):void {storedInvalidateReadOperations();
    if(hasCandidate2NativeFootprint(session))throw Error('CANDIDATE2_NATIVE_PATH_REQUIRED: ordinary generation commit rejects C2');
    if(!validProfile(profile))throw new Error('客户字段不完整或结构不合法。');this.assertSession(session);
    if(profile.id!==session.profileId||!isDeepStrictEqual(profile,session.profile))throw new Error('生成的客户资料与方案快照不一致，未保存。');
    const saved=structuredClone(session);
    this.mutate(()=>{if(guard!==undefined&&guard!==this.profileWriteToken(profile.id))throw new Error('生成期间客户已被修改、删除或恢复，本次结果未保存，请重新生成。');this.writeRow('profiles',profile.id,profile);this.bumpProfileVersion(profile.id);this.writeSession(saved);},()=>{session.reviewRevision=saved.reviewRevision;session.reviewToken=saved.reviewToken;});
  }
  listRevisions(sessionId:string):SessionRevision[]{return this.#withStoredReadOperation(operation=>withParentNameSourceBoundary(this.dataDir,'Store.listRevisions',()=>{
    const current=this.#storedCurrentDatabase(operation);
    if(current){const {database,registration}=current;
      this.#verifyNamingHistoryLinksCore(database,sessionId,registration,operation);
      const rows=this.#storedRows(database,registration,'SELECT id,session_id,created_at,json FROM revisions WHERE session_id=? ORDER BY id DESC',[sessionId]),catalog=this.#storedArchiveCatalog(database,registration);
      return (rows[0]?.values||[]).map(row=>{const parsed=typeof row[3]==='string'?this.#parseStoredRow(database,registration,row[3],{table:'revisions',rowId:Number(row[0])}):{session:JSON.parse(String(row[3])) as NamingSession,origin:undefined};const {session,origin}=parsed;this.verifyYueHomophoneReadBoundary(session);this.verifyYueReadBoundary(session);this.verifyImageryReadBoundary(session);this.verifyRenReadBoundary(session);this.#verifySessionFactsCore(session,catalog,database,origin,operation);return {id:String(row[0]),sessionId:String(row[1]),createdAt:String(row[2]),session};});
    }
    this.verifyNamingHistoryLinks(this.db,sessionId);const rows=this.db.exec('SELECT id,session_id,created_at,json FROM revisions WHERE session_id=? ORDER BY id DESC',[sessionId]),catalog=this.archiveCatalog();return (rows[0]?.values||[]).map(row=>{const session=JSON.parse(String(row[3]));this.verifyYueHomophoneReadBoundary(session);this.verifyYueReadBoundary(session);this.verifyImageryReadBoundary(session);this.verifyRenReadBoundary(session);if(hasCandidate2NativeFootprint(session))this.#verifyCandidate2Stored(session,this.db,undefined,operation,{table:'revisions',rowId:Number(row[0])});else this.verifySessionFacts(session,catalog);return {id:String(row[0]),sessionId:String(row[1]),createdAt:String(row[2]),session};});}));}
  private assertNamingHistoryIdentity(current:NamingSession|undefined,revision:NamingSession){if(hasCandidate2NativeFootprint(current)||hasCandidate2NativeFootprint(revision)){if(!current||!hasCandidate2NativeFootprint(current)||!hasCandidate2NativeFootprint(revision)||!isDeepStrictEqual((current as Candidate2AdoptedNamingSessionV2).candidate2Naming,(revision as Candidate2AdoptedNamingSessionV2).candidate2Naming)||current.id!==revision.id||current.profileId!==revision.profileId)throw Error('CANDIDATE2_HISTORY_IDENTITY_INVALID');return;}if(current){assertUnchangedProjectNamingUse(current,revision);assertUnchangedParentNamePhoneticReview(revision,current);}
    if(current)assertUnchangedReviewedData(current,revision);
    if(current&&readWordPronunciationPreference(current.preferences)!==readWordPronunciationPreference(revision.preferences))throw new Error('历史整词参照启用状态与原方案不一致。');
    if(current&&(hasNamePhoneticFootprint(current)||hasNamePhoneticFootprint(revision)))this.phonetics().verifyTransition(revision,current);
    assertMeaningContextHistoryIdentity(current,revision);
    const currentVersion=current?resolveSessionNamingRulesVersion(current):null,revisionVersion=resolveSessionNamingRulesVersion(revision);
    if(currentVersion===null&&revisionVersion===null)return;
    if(!current||currentVersion!==revisionVersion||!isDeepStrictEqual(current.namingRules,revision.namingRules)||current.dataVersion!==revision.dataVersion||!isDeepStrictEqual(current.sourceSnapshot,revision.sourceSnapshot))throw new Error('命名规则历史关联不一致：同一方案的规则版本、字库版本或来源快照不得改变。原数据保留。');
  }
  /** Known generation identities must agree across every revision; legacy absence never supplies a version. */
  private verifyNamingHistoryLinks(database:Database,sessionId?:string){return this.#verifyNamingHistoryLinksCore(database,sessionId);}
  #verifyNamingHistoryLinksCore(database:Database,sessionId?:string,registration?:StoredDatabaseRegistration,operation?:StoredReadOperation){return withParentNameSourceBoundary(this.dataDir,'Store.verifyNamingHistoryLinks',()=>{
    const parameters=sessionId===undefined?undefined:[sessionId],records=new Map<string,NamingSession>();let meaningCatalog:Map<string,FactArchive>|undefined;
    const exec=(sql:string)=>registration?this.#storedRows(database,registration,sql,parameters):database.exec(sql,parameters);
    const catalog=()=>meaningCatalog??=registration?this.#storedArchiveCatalog(database,registration):this.archiveCatalog(database);
    for(const [id,json]of exec('SELECT id,json FROM sessions'+(sessionId===undefined?'':' WHERE id=?'))[0]?.values??[]){
      const parsed=registration&&typeof json==='string'?this.#parseStoredRow(database,registration,json):{session:JSON.parse(String(json)) as NamingSession,origin:undefined};const {session,origin}=parsed;
      if(hasCandidate2NativeFootprint(session)){if(typeof id!=='string'||session.id!==id)throw Error('CANDIDATE2_HISTORY_ROW_INVALID');this.#verifyCandidate2Stored(session,database,origin,operation,{table:'sessions',rowId:id});records.set(id,session);continue;}
      if(hasReviewedDataFootprint(session)){if(origin)this.#assertSessionCore(session,catalog(),database,origin,operation);else this.assertSession(session,catalog(),database);}
      if(typeof id!=='string'||!id||!session||typeof session!=='object'||Array.isArray(session)||session.id!==id||typeof session.profileId!=='string'||!session.profileId)throw new Error('方案行编号或客户编号与保存快照不一致，原数据保留。');resolveSessionNamingRulesVersion(session);if(hasMeaningContextReview(session))this.verifyMeaningContextIntegrity(session,catalog());verifySessionParentNamePhonetics(session,this.dataDir);if(hasProjectNamingUseFootprint(session)){if(origin)this.#assertSessionCore(session,catalog(),database,origin,operation);else this.assertSession(session,catalog(),database);}records.set(String(id),session);
    }
    for(const [revisionId,id,json]of exec('SELECT id,session_id,json FROM revisions'+(sessionId===undefined?'':' WHERE session_id=?'))[0]?.values??[]){
      const parsed=registration&&typeof json==='string'?this.#parseStoredRow(database,registration,json):{session:JSON.parse(String(json)) as NamingSession,origin:undefined};const {session,origin}=parsed,current=records.get(String(id));
      if(hasCandidate2NativeFootprint(session)||hasCandidate2NativeFootprint(current)){if(typeof id!=='string'||session.id!==id||typeof revisionId!=='number')throw Error('CANDIDATE2_HISTORY_ROW_INVALID');this.assertNamingHistoryIdentity(current,session);this.#verifyCandidate2Stored(session,database,origin,operation,{table:'revisions',rowId:revisionId});continue;}
      if(hasReviewedDataFootprint(session)){if(origin)this.#assertSessionCore(session,catalog(),database,origin,operation);else this.assertSession(session,catalog(),database);}
      if(typeof id!=='string'||!id||!session||typeof session!=='object'||Array.isArray(session)||session.id!==id||typeof session.profileId!=='string'||!session.profileId||!current||session.profileId!==current.profileId)throw new Error('历史方案编号或客户归属与当前方案不一致，原数据保留。');verifySessionParentNamePhonetics(session,this.dataDir);this.assertNamingHistoryIdentity(current,session);if(hasMeaningContextReview(session))this.verifyMeaningContextIntegrity(session,catalog());if(hasProjectNamingUseFootprint(session)||session.candidates?.some((candidate:NamingSession['candidates'][number])=>Object.hasOwn(candidate,'modernPracticalEvidence'))){if(origin)this.#assertSessionCore(session,catalog(),database,origin,operation);else this.assertSession(session,catalog(),database);}
    }
  });}
  settings():StudioSettings{return this.#withStoredReadOperation(operation=>this.#settingsCore(operation));}
  #settingsCore(operation:StoredReadOperation):StudioSettings{return {...defaults,...(storedOriginalDispatch(this,'rows',storedOriginalRows)?this.#rowsCore<StudioSettings>('settings',operation):(storedInvalidateReadOperations(),this.rows<StudioSettings>('settings')))[0]};}
  #customerStorageVersion(database:Database):CustomerStorageVersion {
    return isCompactCustomerDatabase(database)?compactCustomerVersion(database) as CompactCustomerVersion:'raw-legacy';
  }
  #customerStorageCounts(database:Database):StorageCounts {
    const compact=isCompactCustomerDatabase(database),registration=this.#storedRegistration(database);
    if(compact)assertCompactCustomerSchema(database);else assertRawCustomerSchema(database);
    const exec=(sql:string)=>registration?this.#storedRows(database,registration,sql):database.exec(sql);
    const count=(table:string)=>{const value=exec('SELECT COUNT(*) FROM '+table)[0]?.values[0]?.[0];if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw new Error('客户库计数无效。');return value;};
    const hasHistory=compact||!!exec("SELECT 1 FROM sqlite_master WHERE type='table' AND name='revisions'")[0]?.values.length;
    const culture=compact&&compactCustomerCapabilities(compactCustomerVersion(database)!).hasCulturalComparisons;
    return{profiles:count('profiles'),sessions:count(compact?'session_records':'sessions'),namingRevisions:hasHistory?count(compact?'revision_records':'revisions'):0,culturalHeads:culture?count('cultural_comparisons'):0,culturalRevisions:culture?count('cultural_comparison_revisions'):0,culturalWriteReceipts:culture?count('cultural_write_receipts'):0};
  }
  #customerDatabaseGeneration():string {return digest(Buffer.from(this.profileEpoch+'\0'+(this.diskHash??''),'utf8'));}
  #managedCustomerDirectory():string {
    const expected=this.#managedStorageDirectory;
    if(!expected||realpathSync.native(this.userDir)!==expected||realpathSync.native(expected)!==expected)throw new Error('客户存储受管目录身份已变化，未写入。');
    return expected;
  }
  culturalStorageCapabilities(){const version=this.#customerStorageVersion(this.db),capabilities=version==='raw-legacy'?{hasRootLeafRefs:false,hasRevisionProfileId:false,hasCulturalComparisons:false}:compactCustomerCapabilities(version);return{version,hasRootLeafRefs:capabilities.hasRootLeafRefs,hasRevisionProfileId:capabilities.hasRevisionProfileId,hasCulturalTables:capabilities.hasCulturalComparisons};}
  #assertCulturalStorage(full=true){
    this.#managedCustomerDirectory();this.assertFresh();
    const field=storedGetOwnPropertyDescriptor(this,'db');
    if(!field||!storedHasOwn(field,'value')||!this.#storedRegistration(field.value as Database))throw Error('文化 SQL 读取器缺少当前 Store 原生资格。');
    const prepare=storedNativeMethodSlot(field.value as Database,'prepare');
    if(!prepare||prepare.owner!==this.#ownedDatabasePrototype||prepare.value!==this.#culturalNativePrepare)throw Error('文化 SQL 读取方法已变化。');
    assertCustomerDatabaseForeignKeys(this.db);
    if(compactCustomerVersion(this.db)!==CULTURAL_COMPACT_CUSTOMER_VERSION)throw Error('文化保存须先显式迁移至 customer-compact/3。');
    assertCompactCustomerSchema(this.db);if(full)assertCompactCulturalSemanticsV1(this.db);
  }
  #culturalReceipt(profileId:string,key:string):CulturalWriteReceipt|undefined{
    const row=this.db.exec('SELECT request_json,request_sha,comparison_id,result_revision,created_at FROM cultural_write_receipts WHERE profile_id=? AND idempotency_key=?',[profileId,key])[0]?.values[0];
    if(!row)return;
    const request=decodeCulturalWriteIdentity(String(row[0]),String(row[1]));
    return{profileId,idempotencyKey:key,request,requestSha:String(row[1]),comparisonId:String(row[2]),resultRevision:Number(row[3]),createdAt:String(row[4])};
  }
  readCulturalComparison(id:string,revision?:number){this.#assertCulturalStorage(false);return readCompactCulturalComparisonV1(this.db,id,revision);}
  listCulturalRevisions(id:string){this.#assertCulturalStorage(false);return listCompactCulturalRevisionsV1(this.db,id);}
  listCulturalComparisons(ownerProfileId:string,request?:import('../shared/cultural-comparison-catalog').CulturalComparisonCatalogRequest):import('../shared/cultural-comparison-catalog').CulturalComparisonCatalogPage{
    if(arguments.length<1||arguments.length>2)throw Error('CULTURAL_CATALOG_INVALID_INPUT: 文化目录只接受宝宝编号和分页参数。');
    const query=readCulturalCatalogQuery(ownerProfileId,request);
    return this.#withStoredReadOperation(operation=>{
      this.#managedCustomerDirectory();this.assertFresh();const current=this.#storedCurrentDatabase(operation);
      if(!current)throw Error('CULTURAL_CATALOG_NATIVE_READER_REQUIRED: 文化目录缺少当前 Store 原生资格。');
      const prepare=storedNativeMethodSlot(current.database,'prepare');
      if(!prepare||prepare.owner!==this.#ownedDatabasePrototype||prepare.value!==this.#culturalNativePrepare)throw Error('CULTURAL_CATALOG_NATIVE_READER_REQUIRED: 文化目录 SQL 方法已变化。');
      assertCustomerDatabaseForeignKeys(current.database);
      const version=this.#customerStorageVersion(current.database);
      if(version==='raw-legacy')assertRawCustomerSchema(current.database);else assertCompactCustomerSchema(current.database);
      return queryCulturalComparisonCatalog((sql,parameters)=>this.#storedRows(current.database,current.registration,sql,parameters),query,this.#customerDatabaseGeneration(),version);
    });
  }
  getCulturalWriteReceipt(profileId:string,key:string,expectedRequestSha:string){
    this.#assertCulturalStorage(false);if(typeof profileId!=='string'||typeof key!=='string'||typeof expectedRequestSha!=='string')throw Error('文化收据引用无效。');
    const receipt=this.#culturalReceipt(profileId,key);if(!receipt)return null;
    if(receipt.requestSha!==expectedRequestSha)throw Error('文化幂等键对应不同请求。');
    const saved=readCompactCulturalComparisonV1(this.db,receipt.comparisonId,receipt.resultRevision);
    return{receipt,committed:saved.revision,currentHead:saved.head};
  }
  prepareCulturalWrite(value:CulturalSaveRequest):PreparedCulturalWrite{
    const request=readCulturalSaveRequest(value);this.#assertCulturalStorage();
    const receipt=this.#culturalReceipt(request.ownerProfileId,request.idempotencyKey);
    const expiresAt=new Date(Date.now()+5*60*1000).toISOString(),ticket=randomUUID();
    if(receipt){
      if(!sameCulturalRetry(request,receipt.request))throw Error('文化幂等键对应不同请求，未写入。');
      const view:PreparedCulturalWrite={ticket,ownerProfileId:request.ownerProfileId,idempotencyKey:request.idempotencyKey,requestSha:receipt.requestSha,comparisonId:receipt.comparisonId,databaseGeneration:this.#customerDatabaseGeneration(),expiresAt};
      this.#boundCulturalTickets();this.#culturalWrites.set(ticket,{view,intent:receipt.request,requestJson:canonicalCulturalWriteIdentity(receipt.request).json,already:receipt.resultRevision});return ownCulturalJson(view);
    }
    const provider=this.#culturalProvider;if(!provider)throw Error('请先由本 Store 准备文化出生盘预览。');
    const check=provider.verifyOwnedPreview(request.previewToken),materialReply=provider.readMaterial(request.previewToken);
    if(check.kind!=='ok'||materialReply.kind!=='ok')throw Error('文化预览凭据过期或来源已变化。');
    const material=materialReply.value;if(material.ownerProfileId!==request.ownerProfileId||check.value.ownerProfileId!==request.ownerProfileId||check.value.snapshotDigest!==request.expectedSnapshotDigest||check.value.materialDigest!==culturalCanonicalDigest(material))throw Error('文化预览归属或摘要不符。');
    const raw=material.jsons.find(row=>row.id==='prepared-comparison');if(!raw)throw Error('文化预览缺少原计算材料。');
    const compared=compareQimenCultural({...parseSnapshotJsonStrict(raw.exactUtf8Json) as object,evidenceCapsuleDigest:check.value.materialDigest} as never);
    if(compared.kind!=='result'||compared.snapshot.snapshotDigest!==request.expectedSnapshotDigest)throw Error('文化预览结果不符。');
    const actual=new Map<string,Uint8Array>();for(const ref of material.blobs){const bytes=provider.readMaterialBlob(request.previewToken,ref.id);if(bytes.kind!=='ok')throw Error('文化来源原件缺失。');actual.set(ref.id,bytes.value);}
    const encoded=encodeCulturalEvidence(material,actual),identity=culturalIntent(request,material.sourceSessionId,material.sourceRevision,encoded.capsuleBlob.sha),intent=identity.request;
    const previous=request.target.mode==='revise'?readCompactCulturalComparisonV1(this.db,request.target.comparisonId):undefined;
    if(previous&&(previous.head.profileId!==request.ownerProfileId||previous.head.sourceSessionId!==material.sourceSessionId||previous.head.currentRevision!==intent.expectedRevision||previous.head.reviewToken!==intent.expectedReviewToken))throw Error('文化修订 CAS 或归属冲突。');
    const createdAt=new Date().toISOString(),revision=previous?previous.head.currentRevision+1:1;
    if(!Number.isSafeInteger(revision))throw Error('文化修订序号超限。');
    const result:CulturalRevisionResult={schema:'qimen-cultural-revision/1.0.0',comparisonId:intent.comparisonId,revision,profileId:request.ownerProfileId,sourceSessionId:material.sourceSessionId,capsuleDigest:encoded.capsule.capsuleDigest,snapshot:compared.snapshot,note:request.note,noteAuthority:'human-note-only',createdAt,operation:intent.operation,restoredFromRevision:null};
    const view:PreparedCulturalWrite={ticket,ownerProfileId:request.ownerProfileId,idempotencyKey:request.idempotencyKey,requestSha:identity.sha256,comparisonId:intent.comparisonId,databaseGeneration:this.#customerDatabaseGeneration(),expiresAt};
    this.#boundCulturalTickets();
    this.#culturalWrites.set(ticket,{view,intent,requestJson:identity.json,encoded,result,previewToken:request.previewToken});return ownCulturalJson(view);
  }
  commitCulturalWrite(value:CommitCulturalWriteRequest):CulturalSaveResult{
    const request=ownCulturalJson<CommitCulturalWriteRequest>(value);
    if(!request||Object.keys(request).sort().join(',')!=='databaseGeneration,expectedRequestSha,idempotencyKey,ownerProfileId,ticket'||typeof request.ownerProfileId!=='string'||!request.ownerProfileId||request.ownerProfileId.length>300||typeof request.idempotencyKey!=='string'||!request.idempotencyKey||request.idempotencyKey.length>1000||typeof request.expectedRequestSha!=='string'||!/^[a-f0-9]{64}$/.test(request.expectedRequestSha)||typeof request.ticket!=='string'||typeof request.databaseGeneration!=='string')throw Error('文化提交字段无效。');
    this.#assertCulturalStorage(false);
    // Durable idempotency wins before volatile ticket/TTL checks. This path
    // returns an already authenticated committed result and grants no write.
    const durable=this.#culturalReceipt(request.ownerProfileId,request.idempotencyKey);
    if(durable){if(durable.requestSha!==request.expectedRequestSha)return{status:'conflict',reason:'idempotency-conflict'};const saved=readCompactCulturalComparisonV1(this.db,durable.comparisonId,durable.resultRevision);return{status:'already-committed',committed:saved.revision,currentHead:saved.head,requestSha:durable.requestSha};}
    const plan=this.#culturalWrites.get(request.ticket);
    if(!plan||request.ownerProfileId!==plan.view.ownerProfileId||request.idempotencyKey!==plan.view.idempotencyKey||request.expectedRequestSha!==plan.view.requestSha||request.databaseGeneration!==plan.view.databaseGeneration||Date.now()>Date.parse(plan.view.expiresAt))throw Error('文化提交凭据无效或过期。');
    const {intent}=plan;
    const existing=this.#culturalReceipt(intent.profileId,request.idempotencyKey);
    if(existing){if(existing.requestSha!==request.expectedRequestSha)return{status:'conflict',reason:'idempotency-conflict'};const saved=readCompactCulturalComparisonV1(this.db,intent.comparisonId,existing.resultRevision);return{status:'already-committed',committed:saved.revision,currentHead:saved.head,requestSha:existing.requestSha};}
    const head=intent.operation==='create'?undefined:readCompactCulturalComparisonV1(this.db,intent.comparisonId).head;
    if(head&&(head.profileId!==intent.profileId||head.currentRevision!==intent.expectedRevision||head.reviewToken!==intent.expectedReviewToken))return{status:'conflict',reason:'revision-conflict'};
    if(plan.view.databaseGeneration!==this.#customerDatabaseGeneration())return{status:'conflict',reason:'source-changed'};
    if(plan.previewToken){const fresh=this.#culturalProvider?.verifyOwnedPreview(plan.previewToken);if(!fresh||fresh.kind!=='ok'||fresh.value.materialDigest!==plan.encoded?.capsule.materialDigest)return{status:'conflict',reason:'source-changed'};}
    if(!plan.result)throw Error('文化提交缺少本次服务器材料。');
    const result=plan.result,resultLeaf=encodeCulturalRevisionLeaf(result),capsule=plan.encoded?.capsuleBlob??plan.capsuleRef!;
    this.mutate(()=>{
      // All capability, CAS and source checks repeat within the existing writer.
      if(this.#culturalWrites.get(request.ticket)!==plan||Date.now()>Date.parse(plan.view.expiresAt)||plan.view.databaseGeneration!==this.#customerDatabaseGeneration())throw Error('文化写入期间凭据过期或客户库已变化。');
      if(plan.previewToken){const fresh=this.#culturalProvider!.verifyOwnedPreview(plan.previewToken);if(fresh.kind!=='ok'||fresh.value.snapshotDigest!==intent.snapshotDigest)throw Error('文化来源已变化。');}
      this.db.run('BEGIN');try{
        for(const leaf of [...(plan.encoded?.sourceChunks??[]),...(plan.encoded?[plan.encoded.capsuleBlob]:[]),resultLeaf])this.db.run('INSERT OR IGNORE INTO snapshot_blobs(sha,raw_bytes,codec,payload) VALUES(?,?,?,?)',[leaf.sha,leaf.rawBytes,leaf.codec,leaf.payload]);
        if(intent.operation==='create')this.db.run('INSERT INTO cultural_comparisons VALUES(?,?,?,?,?,?)',[intent.comparisonId,intent.profileId,intent.sourceSessionId,1,randomUUID(),result.createdAt]);
        this.db.run('INSERT INTO cultural_comparison_revisions VALUES(?,?,?,?,?,?,?,?,?,?,?)',[intent.comparisonId,result.revision,intent.profileId,result.revision===1?null:result.revision-1,result.operation,result.restoredFromRevision,capsule.sha,capsule.rawBytes,resultLeaf.sha,resultLeaf.rawBytes,result.createdAt]);
        if(intent.operation!=='create'){this.db.run('UPDATE cultural_comparisons SET current_revision=?,review_token=? WHERE id=? AND profile_id=? AND current_revision=? AND review_token=?',[result.revision,randomUUID(),intent.comparisonId,intent.profileId,intent.expectedRevision,intent.expectedReviewToken]);if(this.db.getRowsModified()!==1)throw Error('文化修订 CAS 冲突。');}
        this.db.run('INSERT INTO cultural_write_receipts VALUES(?,?,?,?,?,?,?)',[intent.profileId,request.idempotencyKey,plan.requestJson,request.expectedRequestSha,intent.comparisonId,result.revision,result.createdAt]);this.db.run('COMMIT');
      }catch(error){try{this.db.run('ROLLBACK');}catch{}throw error;}
    });
    this.#culturalWrites.delete(request.ticket);
    // The existing persistence boundary has just authenticated the actual SQL
    // graph. Return its committed metadata without repeating a third full scan.
    const savedHead=this.db.exec('SELECT review_token,created_at FROM cultural_comparisons WHERE id=?',[intent.comparisonId])[0]?.values[0];
    if(!savedHead)throw Error('已提交文化比较缺少当前记录。');
    const currentHead:CulturalHead={id:intent.comparisonId,profileId:intent.profileId,sourceSessionId:intent.sourceSessionId,currentRevision:result.revision,reviewToken:String(savedHead[0]),createdAt:String(savedHead[1])};
    const committed:CulturalRevision={comparisonId:intent.comparisonId,revision:result.revision,profileId:intent.profileId,parentRevision:result.revision===1?null:result.revision-1,operation:result.operation,restoredFromRevision:result.restoredFromRevision,capsule:{sha:capsule.sha,rawBytes:capsule.rawBytes,codec:'deflate-raw/1',role:'evidence'},result:{sha:resultLeaf.sha,rawBytes:resultLeaf.rawBytes,codec:'deflate-raw/1',role:'revision-result'},createdAt:result.createdAt};
    return{status:'committed',committed,currentHead,requestSha:request.expectedRequestSha};
  }
  restoreCulturalRevision(id:string,targetRevision:number,expectedRevision:number,expectedReviewToken:string,idempotencyKey:string):CulturalSaveResult{
    if(typeof id!=='string'||!/^qc_[a-f0-9]{64}$/.test(id)||!Number.isSafeInteger(targetRevision)||targetRevision<1||!Number.isSafeInteger(expectedRevision)||expectedRevision<targetRevision||typeof expectedReviewToken!=='string'||!expectedReviewToken||expectedReviewToken.length>1000||typeof idempotencyKey!=='string'||!idempotencyKey||idempotencyKey.length>1000)throw Error('文化历史恢复引用无效。');
    this.#assertCulturalStorage(false);const target=readCompactCulturalComparisonV1(this.db,id,targetRevision),head=target.head;
    const identity=canonicalCulturalWriteIdentity({schema:'qimen-cultural-write/1.0.0',operation:'restore-revision',profileId:head.profileId,comparisonId:id,expectedRevision,expectedReviewToken,sourceSessionId:head.sourceSessionId,sourceRevision:target.result.snapshot.anchor.sourceRevision,capsuleSha:target.revision.capsule.sha,snapshotDigest:target.result.snapshot.snapshotDigest,noteSha256:culturalNoteSha(target.result.note),restoredFromRevision:targetRevision});
    const existing=this.#culturalReceipt(head.profileId,idempotencyKey);if(existing){if(existing.requestSha!==identity.sha256)return{status:'conflict',reason:'idempotency-conflict'};const saved=readCompactCulturalComparisonV1(this.db,id,existing.resultRevision);return{status:'already-committed',committed:saved.revision,currentHead:saved.head,requestSha:existing.requestSha};}
    if(head.currentRevision!==expectedRevision||head.reviewToken!==expectedReviewToken)return{status:'conflict',reason:'revision-conflict'};
    const ticket=randomUUID(),view:PreparedCulturalWrite={ticket,ownerProfileId:head.profileId,idempotencyKey,requestSha:identity.sha256,comparisonId:id,databaseGeneration:this.#customerDatabaseGeneration(),expiresAt:new Date(Date.now()+300000).toISOString()};
    const result:CulturalRevisionResult={...target.result,revision:expectedRevision+1,createdAt:new Date().toISOString(),operation:'restore-revision',restoredFromRevision:targetRevision};
    this.#boundCulturalTickets();this.#culturalWrites.set(ticket,{view,intent:identity.request,requestJson:identity.json,result,capsuleRef:{sha:target.revision.capsule.sha,rawBytes:target.revision.capsule.rawBytes}});
    return this.commitCulturalWrite({ticket,ownerProfileId:head.profileId,idempotencyKey,expectedRequestSha:identity.sha256,databaseGeneration:view.databaseGeneration});
  }
  previewCulturalStorageMigration(){return this.#withStoredReadOperation(operation=>{this.#validateStoredContents(this.db,undefined,operation);return{from:this.#customerStorageVersion(this.db),to:CULTURAL_COMPACT_CUSTOMER_VERSION,counts:this.#customerStorageCounts(this.db),writes:0 as const};});}
  storageState(){const compact=isCompactCustomerDatabase(this.db),version=compact?compactCustomerVersion(this.db):undefined,bytes=existsSync(join(this.userDir,'customers.sqlite'))?statSync(join(this.userDir,'customers.sqlite')).size:0;return{version:version??'raw-sqlite',migrationRequired:!version||!compactCustomerCapabilities(version).hasRevisionProfileId,bytes,maxPhysicalBytes:CUSTOMER_DATABASE_MAX_BYTES,warning:bytes>=CUSTOMER_DATABASE_WARNING_BYTES};}
  listSessionCatalog(request:SessionCatalogRequest={}):SessionCatalogPage{return querySessionCatalog(this.db,request,JSON.stringify([this.profileEpoch,this.diskHash]));}
  listSessionSummaries(limit=50,cursor?:string){
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('摘要页大小必须为1到100。');
    const start=cursor===undefined?0:Number(cursor);if(!Number.isSafeInteger(start)||start<0)throw new Error('摘要游标无效。');
    const sql=isCompactCustomerDatabase(this.db)
      ? 'SELECT id,profile_id,json_extract(compact_json(snapshot_sha),\'$.createdAt\'),json_extract(compact_json(snapshot_sha),\'$.reviewNote\'),json_extract(compact_json(snapshot_sha),\'$.dataVersion\') FROM session_records ORDER BY rowid DESC LIMIT ? OFFSET ?'
      : 'SELECT id,json_extract(json,\'$.profileId\'),json_extract(json,\'$.createdAt\'),json_extract(json,\'$.reviewNote\'),json_extract(json,\'$.dataVersion\') FROM sessions ORDER BY rowid DESC LIMIT ? OFFSET ?';
    const rows=this.db.exec(sql,[limit+1,start])[0]?.values??[],items=rows.slice(0,limit).map(row=>({id:String(row[0]),profileId:String(row[1]),createdAt:String(row[2]),reviewNote:typeof row[3]==='string'?row[3]:'',dataVersion:String(row[4])}));return{items,nextCursor:rows.length>limit?String(start+limit):undefined};
  }
  migrateCustomerStorage(requestedVersion?:CompactCustomerVersion){return this.#withStoredReadOperation(operation=>{
    const sourceVersion=this.#customerStorageVersion(this.db),targetVersion=requestedVersion??(sourceVersion===CULTURAL_COMPACT_CUSTOMER_VERSION?CULTURAL_COMPACT_CUSTOMER_VERSION:COMPACT_CUSTOMER_VERSION);
    if(!compactCustomerCapabilities(targetVersion).hasRevisionProfileId)throw new Error('客户迁移目标必须为压缩存储版本2或3。');
    if(sourceVersion===targetVersion)return this.storageState();
    this.#validateStoredContents(this.db,undefined,operation);
    const oldDisk=this.diskHash;if(!oldDisk)throw new Error('迁移前客户库缺少已打开的磁盘身份。');
    const replacement=this.#registerExistingDatabase(migrateRawCustomerDatabase(this.SQL,this.db,targetVersion),'clean');
    let committed=false,installed=false,atomicCleanup:readonly WriterSecondaryFailure[]=[];
    try{
      this.#validateStoredContents(replacement,undefined,operation);const output=compactCustomerBytes(replacement),nextHash=digest(output),nextEpoch=randomUUID();
      this.withWriter(()=>{
        if(this.diskHash!==oldDisk)throw new Error('迁移期间客户库已变更，未切换。');
        const directory=this.#managedCustomerDirectory(),file=join(directory,'customers.sqlite'),current=new Uint8Array(readFileSync(file));
        preserveCustomerStoragePreimage(directory,current,oldDisk,{kind:'compact',id:randomUUID()});
        this.#managedCustomerDirectory();
        this.#sealStoredReadOperation(operation);this.#retireStoredReadOperation(operation);
        const receipt=writeCustomerDatabaseAtomically(file,output);committed=true;atomicCleanup=receipt.cleanupFailures;
        const old=this.db;this.db=replacement;const registration=storedRegistryGet(this.#registeredDatabases,replacement);if(registration)registration.role='current';installed=true;
        this.diskHash=nextHash;this.profileEpoch=nextEpoch;this.#preparedCustomerRestore=undefined;this.#forgetDatabase(old);old.close();
        if(atomicCleanup.length)throw new CustomerDatabaseCleanupError(atomicCleanup);
      },()=>committed);
      return this.storageState();
    }catch(error){
      if(!committed&&!installed)try{this.#forgetDatabase(replacement);replacement.close();}catch{}
      if(committed){retainWriterSecondaryFailures(error,[...atomicCleanup,...writerSecondaryFailures(error)]);recordCustomerWriteNotice(this,'committed-cleanup');throw this.#issueCommittedWriteError(error,true);}throw error;
    }
  },'manual');}
  backupBytes(){return this.#withStoredReadOperation(operation=>this.withWriter(()=>{try{this.#validateStoredContents(this.db,undefined,operation);if(isCompactCustomerDatabase(this.db)&&compactCustomerCapabilities(compactCustomerVersion(this.db)!).hasRevisionProfileId)return encodeCustomerBackup(compactCustomerBytes(this.db));const staging=migrateRawCustomerDatabase(this.SQL,this.db);try{this.#validateStoredContents(staging);return encodeCustomerBackup(compactCustomerBytes(staging));}finally{staging.close();}}catch{throw new Error('当前客户库含无效资料、方案或历史快照，或超出备份容量；备份已取消，原始数据保留。');}}));}
  #validateStoredContents(database:Database,clean?:Database,operation?:StoredReadOperation,sourceReplayOperation?:CompactCulturalSourceReplayOperation){return this.#withCandidate2ValidationScope(()=>{if(operation?.used)this.#assertStoredReadSqlIdentity(operation);const registration=this.#storedRegistration(database);if(registration)return this.#validateContentsCore(database,clean,registration,operation,sourceReplayOperation);if(operation?.used)throw new Error('已认证读取的客户库不再具备原生验证资格。');return this.validateContents(database,clean);});}
  private validateContents(test:Database,clean?:Database){return this.#validateContentsCore(test,clean);}
  #validateCompactContentsCore(test:Database,clean?:Database,operation?:StoredReadOperation,sourceReplayOperation?:CompactCulturalSourceReplayOperation){
    this.#assertCandidate2DatabaseClosure(test);
    const registration=this.#storedRegistration(test);if(operation?.used&&!registration)throw new Error('已认证读取的客户库不再具备原生验证资格。');
    assertCustomerDatabaseForeignKeys(test);validateCompactCustomerStorage(test,{sourceReplayOperation});if(clean)copyCompactSnapshotObjects(test,clean);const catalog=registration?this.#storedArchiveCatalog(test,registration):this.archiveCatalog(test),neededArchives=new Map(catalog),profiles=new Set<string>(),sessions=new Map<string,NamingSession>();
    const exec=(sql:string)=>registration?this.#storedRows(test,registration,sql):test.exec(sql),parse=(json:unknown,candidate2Row:Candidate2NativeLocator)=>{if(registration&&typeof json==='string')return this.#parseStoredRow(test,registration,json,candidate2Row);const session=JSON.parse(String(json)) as NamingSession;return {session,origin:hasCandidate2NativeFootprint(session)?{database:test,registration:this.#candidate2Database(test),json:String(json),candidate2Row}:undefined};};
    for(const row of exec('SELECT id,json FROM profiles ORDER BY rowid')[0]?.values??[]){const value=JSON.parse(String(row[1]));validateParentNameProfileSync(value,this.dataDir);if(!validProfile(value)||value.id!==row[0])throw new Error('profile');profiles.add(String(row[0]));clean?.run('INSERT INTO profiles(id,json) VALUES (?,?)',[String(row[0]),String(row[1])]);}
    for(const row of exec('SELECT id,json FROM settings ORDER BY rowid')[0]?.values??[]){const value=JSON.parse(String(row[1]));if(!validSettings(value)||row[0]!=='main')throw new Error('settings');clean?.run('INSERT INTO settings(id,json) VALUES (?,?)',[String(row[0]),String(row[1])]);}
    if(clean)for(const row of exec('SELECT id,token FROM profile_versions ORDER BY rowid')[0]?.values??[]){if(typeof row[0]!=='string'||typeof row[1]!=='string')throw new Error('profile version');clean.run('INSERT INTO profile_versions(id,token) VALUES (?,?)',[row[0],row[1]]);}
    for(const row of exec('SELECT id,profile_id,snapshot_sha,compact_json(snapshot_sha) FROM session_records ORDER BY rowid')[0]?.values??[]){const parsed=parse(row[3],{table:'sessions',rowId:String(row[0])}),session=parsed.session;if(!validSession(session)||session.id!==row[0]||session.profileId!==row[1]||!profiles.has(session.profileId))throw new Error('session');this.verifyMeaningContextIntegrity(session,catalog);this.verifyYueHomophoneReadBoundary(session);this.verifyYueReadBoundary(session);this.verifyImageryReadBoundary(session);this.verifyRenReadBoundary(session);this.verifySessionNumerology(session);const archive=parsed.origin?this.#verifySessionFactsCore(session,catalog,test,parsed.origin,operation):this.verifySessionFacts(session,catalog,test);if(archive)neededArchives.set(archive.version,archive);sessions.set(String(row[0]),session);clean?.run('INSERT INTO session_records(id,profile_id,snapshot_sha) VALUES (?,?,?)',[String(row[0]),String(row[1]),String(row[2])]);}
    const revisionSql=compactCustomerCapabilities(compactCustomerVersion(test)!).hasRevisionProfileId?'SELECT id,session_id,profile_id,created_at,snapshot_sha,compact_json(snapshot_sha) FROM revision_records ORDER BY id':'SELECT r.id,r.session_id,s.profile_id,r.created_at,r.snapshot_sha,compact_json(r.snapshot_sha) FROM revision_records r LEFT JOIN session_records s ON s.id=r.session_id ORDER BY r.id';
    for(const row of exec(revisionSql)[0]?.values??[]){const parsed=parse(row[5],{table:'revisions',rowId:Number(row[0])}),session=parsed.session,current=sessions.get(String(row[1]));if(!current||!validSession(session)||session.id!==row[1]||session.profileId!==row[2]||session.profileId!==current.profileId)throw new Error('revision');this.verifyMeaningContextIntegrity(session,catalog);this.assertNamingHistoryIdentity(current,session);this.verifyYueHomophoneReadBoundary(session);this.verifyYueReadBoundary(session);this.verifyImageryReadBoundary(session);this.verifyRenReadBoundary(session);this.verifySessionNumerology(session);const archive=parsed.origin?this.#verifySessionFactsCore(session,catalog,test,parsed.origin,operation):this.verifySessionFacts(session,catalog,test);if(archive)neededArchives.set(archive.version,archive);clean?.run('INSERT INTO revision_records(id,session_id,profile_id,created_at,snapshot_sha) VALUES (?,?,?,?,?)',[Number(row[0]),String(row[1]),String(row[2]),String(row[3]),String(row[4])]);}
    if(clean){for(const archive of neededArchives.values())this.ensureArchive(archive,clean);preserveCustomerRevisionSequence(test,clean,'revision_records','revision_records');copyCompactCulturalRowsV1(test,clean,{sourceReplayOperation});}
  }
  #validateContentsCore(test:Database,clean?:Database,registration?:StoredDatabaseRegistration,operation?:StoredReadOperation,sourceReplayOperation?:CompactCulturalSourceReplayOperation){return withParentNameSourceBoundary(this.dataDir,'Store.validateContents',()=>{
    if(isCompactCustomerDatabase(test)){this.#validateCompactContentsCore(test,clean,operation,sourceReplayOperation);return;}
    const exec=(sql:string)=>registration?this.#storedRows(test,registration,sql):test.exec(sql);
    if(exec('PRAGMA integrity_check')[0]?.values.some(row=>row[0]!=='ok'))throw new Error('integrity');
    const names=new Set((exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values||[]).map(row=>String(row[0])));
    const requireColumns=(table:string,columns:Record<string,{type:string;pk?:number;required?:boolean}>)=>{
      const result=exec(`PRAGMA table_info(${table})`)[0]?.values||[];
      for(const [name,spec] of Object.entries(columns)){const c=result.find(row=>row[1]===name);if(!c||String(c[2]).toUpperCase()!==spec.type||(spec.pk!==undefined&&Number(c[5])!==spec.pk)||(spec.required&&Number(c[3])!==1))throw new Error('schema');}
    };
    if(names.has('knowledge_archives'))requireColumns('knowledge_archives',{sha256:{type:'TEXT',pk:1},version:{type:'TEXT',required:true},pack:{type:'BLOB',required:true}});
    // Legacy backups have no archive table. Build a fresh empty catalog without changing their input bytes.
    const catalog=names.has('knowledge_archives')?(registration?this.#storedArchiveCatalog(test,registration):this.archiveCatalog(test)):new Map<string,FactArchive>();
    const neededArchives=new Map(catalog);
    const profileIds=new Set<string>(),sessionIds=new Set<string>(),sessionProfiles=new Map<string,string>(),sessionNamingIdentities=new Map<string,NamingSession>();
    for(const table of ['profiles','sessions','settings'] as const){
      requireColumns(table,{id:{type:'TEXT',pk:1},json:{type:'TEXT',required:true}});
      for(const row of exec(`SELECT id,json FROM ${table}`)[0]?.values||[]){const parsed=table==='sessions'&&registration&&typeof row[1]==='string'?this.#parseStoredRow(test,registration,row[1]):{session:JSON.parse(String(row[1])),origin:undefined};const value=parsed.session;
        if(table==='profiles'){validateParentNameProfileSync(value,this.dataDir);if(!validProfile(value)||value.id!==row[0])throw new Error('profile');profileIds.add(value.id);}
        if(table==='sessions'){this.verifyMeaningContextIntegrity(value,catalog);if(!validSession(value)||value.id!==row[0]||!profileIds.has(value.profileId))throw new Error('session');sessionIds.add(value.id);sessionProfiles.set(value.id,value.profileId);sessionNamingIdentities.set(value.id,value);this.verifySessionNumerology(value);const archive=parsed.origin?this.#verifySessionFactsCore(value,catalog,test,parsed.origin,operation):this.verifySessionFacts(value,catalog,test);if(archive)neededArchives.set(archive.version,archive);}
        if(table==='settings'&&(!validSettings(value)||row[0]!=='main'))throw new Error('settings');
        clean?.run(`INSERT INTO ${table}(id,json) VALUES (?,?)`,[String(row[0]),String(row[1])]);
      }
    }
    if(clean&&names.has('profile_versions'))for(const row of exec('SELECT id,token FROM profile_versions ORDER BY rowid')[0]?.values??[]){if(typeof row[0]!=='string'||typeof row[1]!=='string')throw new Error('profile version');clean.run('INSERT INTO profile_versions(id,token) VALUES (?,?)',[row[0],row[1]]);}
    if(names.has('revisions')){
      requireColumns('revisions',{id:{type:'INTEGER',pk:1},session_id:{type:'TEXT'},created_at:{type:'TEXT'},json:{type:'TEXT'}});
      for(const row of exec('SELECT id,session_id,created_at,json FROM revisions')[0]?.values||[]){const parsed=registration&&typeof row[3]==='string'?this.#parseStoredRow(test,registration,row[3]):{session:JSON.parse(String(row[3])) as NamingSession,origin:undefined};const value=parsed.session;this.verifyMeaningContextIntegrity(value,catalog);if(!Number.isInteger(row[0])||Number(row[0])<1||typeof row[1]!=='string'||!sessionIds.has(row[1])||!Number.isFinite(Date.parse(String(row[2])))||!validSession(value)||value.id!==row[1]||value.profileId!==sessionProfiles.get(row[1]))throw new Error('revision');this.assertNamingHistoryIdentity(sessionNamingIdentities.get(value.id),value);this.verifySessionNumerology(value);const archive=parsed.origin?this.#verifySessionFactsCore(value,catalog,test,parsed.origin,operation):this.verifySessionFacts(value,catalog,test);if(archive)neededArchives.set(archive.version,archive);clean?.run('INSERT INTO revisions(id,session_id,created_at,json) VALUES (?,?,?,?)',[row[0],row[1],row[2],String(row[3])]);}
    }
    // Copy large complete package blobs only after every customer/current/history record has passed.
    if(clean){for(const archive of neededArchives.values())this.ensureArchive(archive,clean);preserveCustomerRevisionSequence(test,clean,'revisions','revision_records');}
  });}
  prepareCustomerRestore(bytes:Uint8Array):CustomerRestorePlan {return withCompactCulturalSourceReplayOperation(sourceReplayOperation=>this.#withStoredReadOperation(operation=>{
    if(!ArrayBuffer.isView(bytes)||!(bytes instanceof Uint8Array)||nodeTypes.isProxy(bytes)||bytes.byteLength>200*1024*1024)throw new Error('客户备份字节或200MiB预算无效。');
    const input=new Uint8Array(bytes),currentDiskHash=this.diskHash;if(!currentDiskHash)throw new Error('客户库尚无已打开的磁盘身份。');
    this.#managedCustomerDirectory();this.assertFresh();
    const currentCounts=this.#customerStorageCounts(this.db),currentVersion=this.#customerStorageVersion(this.db),generation=this.#customerDatabaseGeneration();
    let test:Database|undefined,clean:Database|undefined,inputPrepared=false;
    try{
      const decoded=decodeCustomerBackup(input);test=this.#openCustomerDatabase(decoded.sqlite,'restore-input');
      const inputVersion=this.#customerStorageVersion(test),inputCounts=this.#customerStorageCounts(test);
      const targetVersion=inputVersion===CULTURAL_COMPACT_CUSTOMER_VERSION||currentVersion===CULTURAL_COMPACT_CUSTOMER_VERSION?CULTURAL_COMPACT_CUSTOMER_VERSION:COMPACT_CUSTOMER_VERSION;
      clean=this.#registerExistingDatabase(createCompactCustomerDatabase(this.SQL,targetVersion),'clean');
      this.#validateStoredContents(test,clean,operation,sourceReplayOperation);
      // Permission tokens rotate only on current records. Immutable history,
      // source-session provenance and historical receipts retain their bytes.
      for(const row of clean.exec('SELECT id,json FROM sessions')[0]?.values??[]){const value=JSON.parse(String(row[1]));value.reviewRevision=reviewRevision(value);value.reviewToken=randomUUID();clean.run('UPDATE sessions SET json=? WHERE id=?',[JSON.stringify(value),String(row[0])]);}
      if(targetVersion===CULTURAL_COMPACT_CUSTOMER_VERSION)for(const row of clean.exec('SELECT id FROM cultural_comparisons')[0]?.values??[])clean.run('UPDATE cultural_comparisons SET review_token=? WHERE id=?',[randomUUID(),String(row[0])]);
      const imported=clean.exec("SELECT json FROM settings WHERE id='main'")[0]?.values[0]?.[0],local=storedOriginalDispatch(this,'settings',storedOriginalSettings)?this.#settingsCore(operation):(storedInvalidateReadOperations(),this.settings());
      const settings={...defaults,...(imported?JSON.parse(String(imported)):{}),apiBaseUrl:local.apiBaseUrl,model:local.model,timeoutMs:local.timeoutMs,useAi:local.useAi,hasApiKey:local.hasApiKey};
      if(!validSettings(settings))throw new Error('settings');
      clean.run("INSERT INTO settings(id,json) VALUES ('main',?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",[JSON.stringify(settings)]);
      inputPrepared=true;
      this.#validateStoredContents(clean,undefined,operation,sourceReplayOperation);
      const staging=new Uint8Array(compactCustomerBytes(clean,{sourceReplayOperation})),expiresAt=Date.now()+5*60*1000;
      const view:CustomerRestorePlan={planId:randomUUID(),mode:'replace',inputFormat:decoded.format,inputVersion,targetVersion,currentDiskHash,inputDatabaseHash:digest(decoded.sqlite),cleanStagingHash:digest(staging),databaseGeneration:generation,expiresAt:new Date(expiresAt).toISOString(),currentCounts,inputCounts,preimage:{required:true,immutable:true,sha256:currentDiskHash,format:'sqlite'},implicitMerge:false,preimageHistoryPreserved:true,inputHistoryDropped:false};
      // Only one bounded plan owns its input/staging; returned metadata never
      // replaces those private bytes or grants a newly constructed plan.
      this.#preparedCustomerRestore={view:Object.freeze({...view,currentCounts:Object.freeze(currentCounts),inputCounts:Object.freeze(inputCounts),preimage:Object.freeze(view.preimage)}),input,staging,expiresAt};
      this.#sealCandidate2BeforeClose(operation,test,clean);
      return structuredClone(view);
    }catch(error){if(inputPrepared)throw error;throw new Error('备份字段不完整或结构不合法，不是有效的工作室客户库，当前档案未改变。',{cause:error});}
    finally{this.#forgetDatabase(clean);clean?.close();this.#forgetDatabase(test);test?.close();}
  }));}
  commitCustomerRestore(planId:string,expectedCurrentDiskHash:string):CustomerRestoreResult {return withCompactCulturalSourceReplayOperation(sourceReplayOperation=>this.#withStoredReadOperation(operation=>{
    const prepared=this.#preparedCustomerRestore;
    if(typeof planId!=='string'||typeof expectedCurrentDiskHash!=='string'||!prepared||prepared.view.planId!==planId||prepared.view.currentDiskHash!==expectedCurrentDiskHash||prepared.view.databaseGeneration!==this.#customerDatabaseGeneration()||Date.now()>prepared.expiresAt)throw new Error('恢复计划不存在、已过期或客户库已变化。');
    if(digest(prepared.staging)!==prepared.view.cleanStagingHash)throw new Error('恢复计划的私有工作库字节已变化。');
    const replacement=this.#openCustomerDatabase(new Uint8Array(prepared.staging),'clean');
    let committed=false,installed=false,preimagePath='';let atomicCleanup:readonly WriterSecondaryFailure[]=[];
    let restored:StorageCounts=prepared.view.inputCounts;this.#lastCustomerRestoreCleanup=undefined;
    try{
      this.withWriter(()=>{
        if(this.#preparedCustomerRestore!==prepared||this.diskHash!==expectedCurrentDiskHash||prepared.view.databaseGeneration!==this.#customerDatabaseGeneration()||Date.now()>prepared.expiresAt)throw new Error('恢复提交前计划或客户库已变化。');
        this.#validateStoredContents(replacement,undefined,operation,sourceReplayOperation);restored=this.#customerStorageCounts(replacement);
        const output=compactCustomerBytes(replacement,{sourceReplayOperation});if(digest(output)!==prepared.view.cleanStagingHash)throw new Error('恢复工作库与已准备的实际字节不一致。');
        const directory=this.#managedCustomerDirectory(),existing=join(directory,'customers.sqlite'),current=new Uint8Array(readFileSync(existing));
        preimagePath=preserveCustomerStoragePreimage(directory,current,expectedCurrentDiskHash,{kind:'restore',id:prepared.view.planId});
        this.#managedCustomerDirectory();if(Date.now()>prepared.expiresAt)throw new Error('恢复计划已过期，原客户库未替换。');
        this.#sealStoredReadOperation(operation);this.#retireStoredReadOperation(operation);
        const receipt=writeCustomerDatabaseAtomically(existing,output);committed=true;atomicCleanup=receipt.cleanupFailures;
        const previous=this.db;this.db=replacement;const registration=storedRegistryGet(this.#registeredDatabases,replacement);if(registration)registration.role='current';installed=true;
        this.diskHash=digest(output);this.profileEpoch=randomUUID();this.#preparedCustomerRestore=undefined;this.#forgetDatabase(previous);previous.close();
        if(atomicCleanup.length)throw new CustomerDatabaseCleanupError(atomicCleanup);
      },()=>committed);
      return{status:'committed',restored,preimagePath};
    }catch(error){
      if(!committed&&!installed)try{this.#forgetDatabase(replacement);replacement.close();}catch(cleanupError){retainWriterSecondaryFailures(error,[...writerSecondaryFailures(error),{phase:'replacement-close',error:cleanupError}]);recordCustomerWriteNotice(this,'failed-cleanup');}
      if(committed){
        this.#preparedCustomerRestore=undefined;retainWriterSecondaryFailures(error,[...atomicCleanup,...writerSecondaryFailures(error)]);recordCustomerWriteNotice(this,'committed-cleanup');
        if(!installed)throw new CustomerStorageCommittedError('restore',false,error);
        this.#lastCustomerRestoreCleanup=error;return{status:'committed-cleanup',restored,preimagePath};
      }
      throw error;
    }
  },'manual'));}
  restore(bytes:Uint8Array):void {
    const plan=this.prepareCustomerRestore(bytes),result=this.commitCustomerRestore(plan.planId,plan.currentDiskHash);
    if(result.status==='committed-cleanup')throw new CustomerStorageCommittedError('restore',true,this.#lastCustomerRestoreCleanup);
  }
  /** The shipped corrected package is independent from a user's still-active override. */
  fixedBuiltinPackBytes():Uint8Array {storedInvalidateReadOperations();
    const {table}=loadNamingEditorialV6Data(this.dataDir),bytes=new Uint8Array(readFileSync(join(this.dataDir,'knowledge-v6.sqlite')));
    if(packSha(bytes)!==table.newDataset.sqliteSha256)throw new Error('内置字典纠正版与固定发布摘要不一致，未准备预览。');
    return bytes;
  }
  currentPackBytes():Uint8Array {storedInvalidateReadOperations();
    const override=join(this.userDir,'knowledge.sqlite'),bytes=new Uint8Array(readFileSync(existsSync(override)?override:join(this.dataDir,'knowledge-v6.sqlite')));
    if(packSha(bytes)!==packSha(this.activeDatasetBytes))throw new Error('知识库文件已由其他进程修改，请重新打开应用后核对。');return bytes;
  }
  previousPackBytes():Uint8Array|undefined {storedInvalidateReadOperations();const path=join(this.userDir,'knowledge.previous.sqlite');return existsSync(path)?new Uint8Array(readFileSync(path)):undefined;}
  maintenanceStatus():DataMaintenanceStatus {storedInvalidateReadOperations();
    const result:DataMaintenanceStatus={active:packInfo(this.dataset,this.currentPackBytes()),archives:{count:0,bytes:0,maxCount:ARCHIVE_MAX_COUNT,maxBytes:ARCHIVE_MAX_BYTES},ruleBoundary:DATA_PACK_BOUNDARY};
    const builtin=this.builtinFacts();result.builtin=packInfo(this.archiveDataset(builtin.sha256,builtin.pack),builtin.pack);
    const size=this.db.exec('SELECT COUNT(*),COALESCE(SUM(length(pack)),0) FROM knowledge_archives')[0]?.values[0]??[0,0];result.archives.count=Number(size[0]);result.archives.bytes=Number(size[1]);
    try{const bytes=this.previousPackBytes();if(bytes)result.rollback=packInfo(this.readPack(bytes),bytes);}catch(error){result.rollbackError=error instanceof Error?error.message:'回退包校验失败。';}
    return result;
  }
  installPack(bytes:Uint8Array){storedInvalidateReadOperations();const validated=this.readPack(bytes);return this.withWriter(()=>{
    const prior=this.currentPackBytes();if(packSha(prior)===packSha(bytes))return `数据包与当前版本 ${validated.version} 一致，未替换，回退副本保持原样。`;
    const current=join(this.userDir,'knowledge.sqlite'),previous=join(this.userDir,'knowledge.previous.sqlite'),oldPrevious=this.previousPackBytes();
    atomicWrite(previous,prior);
    try{atomicWrite(current,bytes);}catch(error){if(oldPrevious)atomicWrite(previous,oldPrevious);else if(existsSync(previous))unlinkSync(previous);throw error;}
    this.activeDatasetBytes=new Uint8Array(bytes);this.dataset=validated;return `知识库已更新，版本 ${validated.version}；客户档案保持完整。`;
  });}
  rollback(){storedInvalidateReadOperations();const bytes=this.previousPackBytes();if(!bytes)throw new Error('尚无可回退的数据包。');return this.installPack(bytes).replace('更新','回退');}
}
const storedOriginalReadVerifiedSession=storedOwnDataValue(Store.prototype,'readVerifiedSession');
const storedOriginalRows=storedOwnDataValue(Store.prototype,'rows');
const storedOriginalSettings=storedOwnDataValue(Store.prototype,'settings');
const storedOriginalReadPack=storedOwnDataValue(Store.prototype,'readPack');
const candidate2WriterMethods=['mutate','withWriter','persist','assertFresh'].map(key=>[key,storedOwnDataValue(Store.prototype,key)] as const);
