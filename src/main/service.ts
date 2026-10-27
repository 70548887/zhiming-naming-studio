import {createParentNamePhoneticsMainAdapter,readParentNamePhoneticsMode,assertParentNameProfileInput,assertParentNameReviewInput,parentNameBindingFromDraft,assertUnchangedParentNamePhoneticReview} from './parent-name-phonetics-adapter';
import type {ParentNameReadingConfirmIntent} from '../shared/parent-name-phonetics';
import {CmnReadingWorkerHost,cmnReadingWorkerFile} from './cmn-reading-worker-host';
import type {CmnReadingQuery} from '../shared/cmn-reading';
import {assertUnchangedWordPronunciation} from './word-pronunciation-session';
import {assertWordPronunciationFields,readWordPronunciationPreference} from '../shared/word-pronunciation-reference';
import {loadNamePhoneticAdapter} from './name-phonetic-adapter';
import {hasNamePhoneticFootprint,ownPhoneticValue,readNamePhoneticPreferences,validNamePhoneticPreferences,NAME_PHONETIC_SOURCE_IDS} from '../shared/name-phonetic-preferences';
import {canonicalPlainJson} from '../shared/plain-json';
import {assertUnchangedElementAssessment,assertElementInput} from './element-assessment-data';
import type {ElementAssessmentChoiceInput} from '../shared/element-assessment';
import { createHash,randomUUID } from 'node:crypto';
import {loadMeaningContextData} from './meaning-context-data';
import {meaningContextOptions,applyMeaningContextIntent,assertUnchangedMeaningContextReview} from './meaning-context-review';
import {assertMeaningContextUpdateRequest,assertMeaningContextReviewInput} from '../shared/meaning-context-review';
import type {MeaningContextUpdateRequest} from '../shared/meaning-context-review';
import {DataPackPreviewManager} from './data-maintenance';
import type { AiSettings, Analysis, BirthProfile, BrandSettings, GenerateResult, NamingPreferences, NamingSession, StudioSettings } from '../shared/types';
import { analyzeProfile } from '../domain/engine';
import {previewBaziMainchain as calculateBaziMainchainPreview} from './bazi-mainchain-preview';
import {readGengSiReferenceProfile,buildGengSiReferencePreview} from './geng-si-reference-preview';
import type {GengSiReferencePreview} from '../shared/geng-si-reference';
import {buildQiongtongClauseReferencePreview} from './qiongtong-clause-reference-preview';
import {buildJiaHaiControlPreview} from './jia-hai-control-preview';
import type {JiaHaiControlOptions,JiaHaiControlPreview} from '../shared/jia-hai-control-preview';
import {createB04WordContextAdapter} from '../domain/meaning-context-m460-b04-adapter.mjs';
import {createNamingCoverageProvider} from './naming-coverage-provider';
import {createSingleCharacterMeaningAdapter} from './single-character-meaning-query.mjs';
import {ManualCharacterMeaningEntry} from './manual-character-meaning-entry';
import type {ManualCharacterMeaningListRequest,ManualCharacterMeaningSelectRequest} from '../shared/manual-character-meaning-api';
import {existsSync as manualPackExists,statSync as manualPackStat} from 'node:fs';
import type {SingleCharacterMeaningQuery,SingleCharacterMeaningOptions} from '../shared/single-character-meaning';
import type {B04WordContextQuery,B04WordContextOptions} from '../shared/b04-word-context';
import type {QiongtongClauseReferencePreview} from '../shared/qiongtong-clause-reference-preview';
import type {BaziMainchainPreview,BaziMainchainPreviewOptions} from '../shared/bazi-mainchain';
import { generateLocalWithResolvedBasisForRuleVersion,resolveNamingBasisForRuleVersion,NamingElementBasisError,resolveNamingGenerationContext } from '../domain/naming';
import {NAMING_RULE_V6_VERSION,NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,NAMING_RULE_V6_SOURCE_ID,NAMING_RULE_V7_SOURCE_ID,NAMING_RULE_V71_SOURCE_ID,resolveSessionNamingRulesVersion,isNamingV7BaseRuleVersion} from '../shared/naming-rules';
import {loadNamingEditorialV71Data} from './naming-editorial-v7-data';
import {resolve as resolveNamingElementPath} from 'node:path';
import {createNamingElementResolver,NamingElementResolutionError} from './naming-element-resolution';
import {createBaziRootFeedbackFacade} from './bazi-root-feedback-facade';
import {loadRootFeedbackResources} from './bazi-root-feedback-resources';
import {createBaziRootFeedbackV132PreviewAdapter} from './bazi-root-feedback-v132-preview';
import {createCandidate2NamingEligibilityHost} from './candidate2-naming-eligibility-host-v1';
import {captureEligibilityRequest,eligibilityFailure,eligibilityResponse} from './candidate2-naming-eligibility-response-v1';
import {CANDIDATE2_NAMING_SELECTION,type Candidate2NamingRequest} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2EligibilityRequest,Candidate2NamingEligibility} from '../shared/candidate2-naming-eligibility-v1';
import {captureCandidate2ServiceInput} from './candidate2-service-input';
import type {Candidate2NamingSelection} from '../shared/candidate2-naming-consumer-v1';
import type {Candidate2GenerateSavedResult} from '../shared/candidate2-generation-api';
import type {Candidate2AdoptedNamingSessionV2} from '../shared/candidate2-generation-adoption-v2';
import {captureCandidate2ReviewInput} from './candidate2-review-input';
import type {Candidate2ReviewChanges,Candidate2ReviewSavedResult} from '../shared/candidate2-review-api';
import {captureCandidate2HistoryRestoreInput} from './candidate2-history-restore-input';
import type {Candidate2HistoryRestoreSavedResult} from '../shared/candidate2-history-restore-api';
import {readFileSync as readCandidate2Deployment} from 'node:fs';
import {readRootFeedbackV132BoundPreviewRequest,bindRootFeedbackV132PreviewResponse} from './bazi-root-feedback-v132-request-binding';
import type {RootFeedbackFacadeDTO,RootFeedbackFacadeOptions} from '../shared/bazi-root-feedback-facade';
import {readNamingElementMethodSelection} from '../shared/project-naming-use';
import {buildProjectNamingUseSnapshot} from './project-naming-use';
import {assertUnchangedProjectNamingUse,assertProjectNamingUseInput} from './project-naming-identity';
import { generateAIForRuleVersion, testAI } from './ai';
import {REVIEWED_DATA_SESSION_PREFIX,type ReviewedDataSelection,type ReviewedGenerateResult,type ReviewedNamingSession} from '../shared/reviewed-naming-data';
import {loadReviewedNamingDataResources} from './reviewed-naming-data-resources';
import {normalizeReviewedNumerologySnapshotForAttach} from './reviewed-naming-data-snapshot';
import {createReviewedNamingGeneration,normalizeReviewedDataSelection} from './reviewed-naming-data-generation';
import {attachReviewedNamingData,hasReviewedDataFootprint,assertUnchangedReviewedData,assertReviewedDataInput} from './reviewed-naming-data-verification';
import {finalizeNamingCandidateForRuleVersion,assertUnchangedNamingMeaningReview,assertNamingMeaningReviewInput} from './naming-meaning-review';
import { Store, validSession } from './store';
import {assertModernInput,assertUnchangedModernRecord,authorizeModernHistory,authorizeModernMutation,createModernRecord,verifyModernMethodResource,originalReviewBytes} from './modern-practical-evidence';
import { normalizeCredentialEndpoint, type SecretStorage } from './credentials';
import { namingInputKey, normalizePreferences } from '../shared/workflow';
import { analyzeNumerology } from '../domain/numerology';
import { loadNumerologyData } from './numerology-data';
import { loadQimenSources } from './qimen-data';
import { assertReviewRevision } from '../shared/review-version';
import { createSessionSourceSnapshot } from '../shared/session-sources';
import { loadBaziSources } from './bazi-data';
import { validMonthAuthorityMethod } from '../shared/month-authority-method';
import { loadMonthAuthoritySources } from './month-authority-data';
import { validSeasonalMethod } from '../shared/seasonal-method';
import { loadMonthlySeasonalData } from './monthly-seasonal-data';
import { monthlySeasonalKnowledge } from './monthly-seasonal-knowledge';
import {testStructuredNaming} from './ai-capability';
import {loadSeasonalConditionSources} from './seasonal-condition-data';
import {loadCongWealthSources} from './cong-wealth-data';
import {loadCongShaSources} from './cong-sha-data';
import {loadSolarTimeSources} from './solar-time-data';
import {loadFollowingRestrictionsSources} from './following-restrictions-data';
import {loadDitianRenSources} from './ditian-ren-data';
import {loadRenNecessarySources} from './ren-necessary-data';
import {loadRenActionsSources} from './ren-actions-data';
import {loadRenCapacitiesSources} from './ren-capacities-data';
import {loadRenDirectionsSources} from './ren-directions-data';
import {validRenMethod} from '../shared/ren-method';
import {loadRenJointBattleSources} from './ren-joint-battle-data';
import {validateBirthTimeInput} from '../shared/birth-time-basis';
import {loadNameImageryData} from './name-imagery-data';
import {calculateNameImageryReading} from '../domain/name-imagery';
import {loadYueReadingData} from './yue-reading-data';
import {loadYueHomophonePackages,yueHomophonePackageForVersion} from './yue-homophone-packages';
import {validYueHomophoneRuleVersion} from '../shared/yue-homophone-types';
import {YUE_HOMOPHONE_VERSION} from '../domain/yue-homophones';
import {calculateYueHomophoneReviewForVersion,resolveSessionYueHomophoneVersion} from '../domain/yue-homophone-router';
import {calculateYueNameReading,confirmYueNameReading} from '../domain/yue-reading';
import {isDeepStrictEqual} from 'node:util';
import {isCustomerWriteCommittedError,retainWriterSecondaryFailures,type CustomerWriteNoticeScope} from './writer-finalization';
import {CUSTOMER_WRITE_COMMITTED_NOTICE,type CustomerWriteNotice} from '../shared/customer-write-notice';
import type {YueReadingSelections} from '../shared/types';
import {loadClassicsData,searchClassicsData,readClassicSectionData} from './classics-data';
import type {ClassicBookId} from '../shared/classics-types';
import {loadOfficialNamePopularityData} from './official-name-popularity-data';
import {OFFICIAL_NAME_POPULARITY_SOURCE_ID} from '../shared/official-name-popularity';
import type {CulturalAnchorRequest,CulturalProviderAPI,CulturalProviderCandidateRequest,CulturalProviderPreviewRequest} from '../shared/qimen-cultural-provider-v1';
import type {CulturalSaveRequest,CommitCulturalWriteRequest} from '../shared/cultural-storage-v3';
import {captureCandidate2ReportInput} from './candidate2-report-source';
import type {Candidate2ReportDocument} from '../shared/candidate2-report-api';

import {loadNamingEditorialPackages,namingEditorialPackageForVersion} from './naming-editorial-packages';

export type { SecretStorage } from './credentials';
// Capture the native entry once at trusted module initialization. Caller object
// shape and later public overrides cannot issue a successful saved result.
const nativeCandidate2Generate=Object.getOwnPropertyDescriptor(Store.prototype,'generateAndSaveCandidate2')?.value as Store['generateAndSaveCandidate2'];
if(typeof nativeCandidate2Generate!=='function')throw new Error('CANDIDATE2_NATIVE_ENTRY_UNAVAILABLE');
const invokeNativeCandidate2=Reflect.apply;
const nativeCandidate2Review=Object.getOwnPropertyDescriptor(Store.prototype,'reviewCandidate2Session')?.value as Store['reviewCandidate2Session'];
if(typeof nativeCandidate2Review!=='function')throw new Error('CANDIDATE2_NATIVE_REVIEW_ENTRY_UNAVAILABLE');
const invokeNativeCandidate2Review=Reflect.apply;
const nativeCandidate2HistoryRestore=Object.getOwnPropertyDescriptor(Store.prototype,'restoreCandidate2History')?.value as Store['restoreCandidate2History'];
if(typeof nativeCandidate2HistoryRestore!=='function')throw new Error('CANDIDATE2_NATIVE_HISTORY_ENTRY_UNAVAILABLE');
const invokeNativeCandidate2HistoryRestore=Reflect.apply;
const nativeCandidate2Report=Object.getOwnPropertyDescriptor(Store.prototype,'prepareCandidate2Report')?.value as Store['prepareCandidate2Report'];
if(typeof nativeCandidate2Report!=='function')throw new Error('CANDIDATE2_NATIVE_REPORT_ENTRY_UNAVAILABLE');
const invokeNativeCandidate2Report=Reflect.apply;
/** Readonly phonetic snapshots must be inspected before a generic JSON budget
 * can invoke accessors, and before ordinary review rebuilds from saved facts. */
function assertPhoneticReviewInput(value:unknown):void {
  if(!value||typeof value!=='object')return;
  const slot=ownPhoneticValue(value,'candidates');if(!slot.present)return;
  if(!Array.isArray(slot.value)||Object.getPrototypeOf(slot.value)!==Array.prototype||Reflect.ownKeys(slot.value).length!==slot.value.length+1)throw new Error('词音复核候选列表无效。');
  for(let index=0;index<slot.value.length;index++){
    const row=Object.getOwnPropertyDescriptor(slot.value,String(index));if(!row||!Object.hasOwn(row,'value')||!row.enumerable)throw new Error('词音候选不得含空位或访问器。');
    const field=ownPhoneticValue(row.value,'namePhoneticReviews');if(field.present)canonicalPlainJson(field.value);
  }
}
export class StudioService {
  getCustomerWriteNotice(scope:CustomerWriteNoticeScope):CustomerWriteNotice|undefined{return this.store.getCustomerWriteNotice(scope);}
  private recoverCommittedWrite<T>(action:()=>T,recover:()=>T):T {
    try{return action();}catch(error){
      if(!isCustomerWriteCommittedError(error,this.store)||error.resultFinalized!==true)throw error;
      try{return recover();}catch(recoveryError){retainWriterSecondaryFailures(error,[{phase:'result-recovery',error:recoveryError}]);throw error;}
    }
  }
  // Recovery checks the committed Store snapshot after a genuine finalized persist.
  // This is not an independent cold-disk verification or a second write attempt.
  private committedSessionResult(expected:NamingSession):NamingSession {
    const saved=this.store.readVerifiedSession(expected.id);
    if(!saved||!isDeepStrictEqual(saved,JSON.parse(JSON.stringify(expected))))throw new Error('已提交方案的完整读回结果与本次提交不一致，需要核对最新资料。');
    return saved;
  }
  private saveReviewedSession(session:NamingSession,meaningContext=false):NamingSession {
    return this.recoverCommittedWrite(()=>meaningContext?this.store.saveMeaningContextSession(session):this.store.saveSession(session),()=>this.committedSessionResult(session));
  }
  private putSettingsWithRecovery(settings:StudioSettings):void {
    this.recoverCommittedWrite(()=>this.store.put('settings','main',settings),()=>{if(!isDeepStrictEqual(this.store.settings(),JSON.parse(JSON.stringify(settings))))throw new Error('已提交设置的完整读回结果不一致，需要核对最新资料。');});
  }
  private parentNameAdapter?:ReturnType<typeof createParentNamePhoneticsMainAdapter>;
  private parentNames(){return this.parentNameAdapter??=createParentNamePhoneticsMainAdapter(this.store.dataDir,char=>this.getCmnReadingOptions(char));}
  async confirmParentNameReading(draftProfile:BirthProfile,intent:ParentNameReadingConfirmIntent){
    if(arguments.length!==2)throw new Error('家庭确认只接受草稿资料和确认意图，不接受候选Map或verified参数。');
    canonicalPlainJson(intent);const names=parentNameBindingFromDraft(draftProfile);return this.parentNames().confirm(names,intent);
  }
  private cmnWorker?:CmnReadingWorkerHost;
  private cmnWorkerClosed=false;
  private phoneticAdapter?:ReturnType<typeof loadNamePhoneticAdapter>;
  private phonetics(){return this.phoneticAdapter??=loadNamePhoneticAdapter(this.store.dataDir);}
  private singleCharacterMeaningAdapter?:ReturnType<typeof createSingleCharacterMeaningAdapter>;
  #manualMeaningEntry?:ManualCharacterMeaningEntry;
  #manualMeanings(){return this.#manualMeaningEntry??=new ManualCharacterMeaningEntry(()=>{
    const override=resolveNamingElementPath(this.store.userDir,'knowledge.sqlite'),actualPackFile=manualPackExists(override)?override:resolveNamingElementPath(this.store.dataDir,'knowledge-v6.sqlite');
    // Existing active-pack owner checks disk bytes against the Store's selected
    // dataset. Caller input never supplies a path, hash, archive or approval.
    const bytes=this.store.currentPackBytes(),stamp=manualPackStat(actualPackFile);
    return{dataDir:this.store.dataDir,actualPackFile,owner:this.store.dataset,identity:canonicalPlainJson([actualPackFile,createHash('sha256').update(bytes).digest('hex'),stamp.dev,stamp.ino,stamp.size,stamp.mtimeMs,stamp.ctimeMs])};
  });}
  private meaningContextData?:ReturnType<typeof loadMeaningContextData>;
  private packPreviews:DataPackPreviewManager;
  private namingCharacter71?:ReturnType<typeof loadNamingEditorialV71Data>;
  private namingElementResolver?:ReturnType<typeof createNamingElementResolver>;
  private namingElements(){return this.namingElementResolver??=createNamingElementResolver({assetDir:resolveNamingElementPath(this.store.dataDir,'..','assets'),dataDir:this.store.dataDir});}
  private rootFeedbackPreviewFacade?:ReturnType<typeof createBaziRootFeedbackFacade>;
  private rootFeedbackV132PreviewAdapter?:ReturnType<typeof createBaziRootFeedbackV132PreviewAdapter>;
  private candidate2EligibilityHost?:ReturnType<typeof createCandidate2NamingEligibilityHost>;
  private candidate2Eligibility(){return this.candidate2EligibilityHost??=createCandidate2NamingEligibilityHost({applicationBundlePath:resolveNamingElementPath(this.store.dataDir,'..','dist-electron/project-naming-application/1.3.2-candidate.2/application.cjs'),assetDir:resolveNamingElementPath(this.store.dataDir,'..','assets'),dataDir:this.store.dataDir,namingRulesVersion:NAMING_RULE_V71_VERSION});}
  prepareDataPack(bytes:Uint8Array){return this.packPreviews.prepare(bytes);}
  previewBuiltinDataPack(){return this.prepareDataPack(this.store.fixedBuiltinPackBytes());}
  previewRollbackDataPack(){return this.packPreviews.prepareRollback();}
  applyDataPackPreview(id:string){return this.packPreviews.apply(id);}
  discardDataPackPreview(id:string){this.packPreviews.discard(id);}
  private numerology:ReturnType<typeof loadNumerologyData>;
  private qimenSources:ReturnType<typeof loadQimenSources>;
  private baziSources:ReturnType<typeof loadBaziSources>;
  private monthAuthoritySources:ReturnType<typeof loadMonthAuthoritySources>;
  private monthlySeasonal:ReturnType<typeof loadMonthlySeasonalData>;
  private congShaSources:ReturnType<typeof loadCongShaSources>;
  private solarTimeSources:ReturnType<typeof loadSolarTimeSources>;
  private followingRestrictionsSources:ReturnType<typeof loadFollowingRestrictionsSources>;
  private ditianRenSources:ReturnType<typeof loadDitianRenSources>;
  private renActionsSources:ReturnType<typeof loadRenActionsSources>;
  private renCapacitiesSources:ReturnType<typeof loadRenCapacitiesSources>;
  private renDirectionsSources:ReturnType<typeof loadRenDirectionsSources>;
  private renJointBattleSources:ReturnType<typeof loadRenJointBattleSources>;
  private renNecessarySources:ReturnType<typeof loadRenNecessarySources>;
  private yueHomophones:ReturnType<typeof loadYueHomophonePackages>;
  private yueReading:ReturnType<typeof loadYueReadingData>;
  private nameImagery:ReturnType<typeof loadNameImageryData>;
  private congWealthSources:ReturnType<typeof loadCongWealthSources>;
  private seasonalConditionSources:ReturnType<typeof loadSeasonalConditionSources>;
  private seasonalKnowledge:ReturnType<typeof monthlySeasonalKnowledge>;
  private classics:ReturnType<typeof loadClassicsData>;
  private officialNamePopularity:ReturnType<typeof loadOfficialNamePopularityData>;
  private namingEditorialPackages:ReturnType<typeof loadNamingEditorialPackages>;
  private culturalWorkflowProvider?:Promise<CulturalProviderAPI>;
  private culturalWorkflowClosed=false;
  private culturalWorkflowOwner?:Store;

  constructor(public store:Store,private secret:SecretStorage,private desktop=true,private readonly cmnWorkerEntry=cmnReadingWorkerFile(store.dataDir),private readonly rootFeedbackAssetDir=resolveNamingElementPath(store.dataDir,'..','assets')){this.namingEditorialPackages=loadNamingEditorialPackages(store.dataDir);this.classics=loadClassicsData(store.dataDir);this.officialNamePopularity=loadOfficialNamePopularityData(store.dataDir);this.packPreviews=new DataPackPreviewManager(store);this.nameImagery=loadNameImageryData(store.dataDir);this.yueReading=loadYueReadingData(store.dataDir);this.yueHomophones=loadYueHomophonePackages(store.dataDir);this.congShaSources=loadCongShaSources(store.dataDir);this.solarTimeSources=loadSolarTimeSources(store.dataDir);this.followingRestrictionsSources=loadFollowingRestrictionsSources(store.dataDir);this.ditianRenSources=loadDitianRenSources(store.dataDir);this.renNecessarySources=loadRenNecessarySources(store.dataDir);this.renActionsSources=loadRenActionsSources(store.dataDir);this.renCapacitiesSources=loadRenCapacitiesSources(store.dataDir);this.renDirectionsSources=loadRenDirectionsSources(store.dataDir);this.renJointBattleSources=loadRenJointBattleSources(store.dataDir);this.congWealthSources=loadCongWealthSources(store.dataDir);this.seasonalConditionSources=loadSeasonalConditionSources(store.dataDir);this.numerology=loadNumerologyData(store.dataDir);this.qimenSources=loadQimenSources(store.dataDir);this.baziSources=loadBaziSources(store.dataDir);this.monthAuthoritySources=loadMonthAuthoritySources(store.dataDir);this.monthlySeasonal=loadMonthlySeasonalData(store.dataDir);this.seasonalKnowledge=monthlySeasonalKnowledge(this.monthlySeasonal.table.entries);}
  /** Metadata only: complete saved facts remain behind the verified detail reader. */
  listSessionCatalog(input?:import('../shared/session-pagination').SessionCatalogRequest){
    if(arguments.length>1)throw new Error('方案目录只接受一个查询参数。');
    return this.store.listSessionCatalog(input);
  }
  readSessionDetail(id:string):NamingSession|null{
    if(arguments.length!==1||typeof id!=='string'||!id.trim()||id.length>1000)throw new Error('方案编号无效。');
    return this.store.readVerifiedSession(id)??null;
  }
  private customerStorageState(state=this.store.storageState()):import('../shared/customer-storage-state').CustomerStorageState{
    if(typeof state.version!=='string'||!state.version)throw new Error('客户库存储版本无效，原数据保留。');
    return {...state,version:state.version};
  }
  migrateCustomerStorage():import('../shared/customer-storage-state').CustomerStorageState{
    if(arguments.length!==0)throw new Error('迁移客户库不接受额外参数。');
    return this.customerStorageState(this.store.migrateCustomerStorage());
  }
  private culturalWorkflowStore():Store {
    if(this.culturalWorkflowClosed)throw new Error('文化工作流已关闭。');
    const owner=this.culturalWorkflowOwner??=this.store;
    if(owner!==this.store)throw new Error('文化工作流不能更换所属 Store。');
    return owner;
  }
  private async culturalWorkflow():Promise<CulturalProviderAPI>{
    const store=this.culturalWorkflowStore();
    const provider=await(this.culturalWorkflowProvider??=store.culturalProvider());
    if(this.culturalWorkflowClosed){provider.close();throw new Error('文化工作流已关闭。');}
    if(store!==this.culturalWorkflowStore())throw new Error('文化工作流所属 Store 已变化。');
    return provider;
  }
  getCulturalStorageCapabilities(){if(arguments.length!==0)throw new Error('文化存储能力不接受参数。');return this.culturalWorkflowStore().culturalStorageCapabilities();}
  async prepareCulturalBirthAnchor(request:CulturalAnchorRequest){if(arguments.length!==1)throw new Error('文化出生盘只接受原始档案或方案引用。');return(await this.culturalWorkflow()).prepareBirthAnchor(request);}
  async getCulturalCharacterOptions(handle:string,candidate:CulturalProviderCandidateRequest){if(arguments.length!==2)throw new Error('文化字义选项只接受出生盘凭据与候选引用。');return(await this.culturalWorkflow()).queryCharacterOptions(handle,candidate);}
  async previewCulturalComparison(handle:string,request:CulturalProviderPreviewRequest){if(arguments.length!==2)throw new Error('文化比较只接受出生盘凭据、候选与证据引用。');return(await this.culturalWorkflow()).preview(handle,request);}
  prepareCulturalWrite(request:CulturalSaveRequest){if(arguments.length!==1)throw new Error('文化保存只接受本 Store 预览凭据与保存意图。');return this.culturalWorkflowStore().prepareCulturalWrite(request);}
  commitCulturalWrite(request:CommitCulturalWriteRequest){if(arguments.length!==1)throw new Error('文化提交只接受准备阶段签发的提交引用。');return this.culturalWorkflowStore().commitCulturalWrite(request);}
  readCulturalComparison(id:string,revision?:number):import('../shared/cultural-workflow-api').CulturalComparisonRead{if(arguments.length<1||arguments.length>2||typeof id!=='string'||!/^qc_[a-f0-9]{64}$/.test(id)||revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1))throw new Error('文化读取引用无效。');const saved=this.culturalWorkflowStore().readCulturalComparison(id,revision);return{head:saved.head,revision:saved.revision,result:saved.result};}
  listCulturalRevisions(id:string){if(arguments.length!==1||typeof id!=='string'||!/^qc_[a-f0-9]{64}$/.test(id))throw new Error('文化历史引用无效。');return this.culturalWorkflowStore().listCulturalRevisions(id);}
  listCulturalComparisons(ownerProfileId:string,request?:import('../shared/cultural-comparison-catalog').CulturalComparisonCatalogRequest){if(arguments.length<1||arguments.length>2)throw new Error('文化目录只接受宝宝编号和分页参数。');return this.culturalWorkflowStore().listCulturalComparisons(ownerProfileId,request);}
  restoreCulturalRevision(id:string,targetRevision:number,expectedRevision:number,expectedReviewToken:string,idempotencyKey:string){if(arguments.length!==5)throw new Error('文化恢复只接受历史和当前修订引用。');return this.culturalWorkflowStore().restoreCulturalRevision(id,targetRevision,expectedRevision,expectedReviewToken,idempotencyKey);}
  previewCulturalStorageMigration(){if(arguments.length!==0)throw new Error('文化迁移预览不接受参数。');return this.culturalWorkflowStore().previewCulturalStorageMigration();}
  migrateCulturalStorage(){if(arguments.length!==0)throw new Error('文化迁移须作为显式独立操作，不接受目标替换。');return this.customerStorageState(this.culturalWorkflowStore().migrateCustomerStorage('customer-compact/3'));}
  async closeCulturalWorkflow(){this.culturalWorkflowClosed=true;const provider=await this.culturalWorkflowProvider;provider?.close();}
  bootstrap(){const d=this.store.dataset,settings=this.store.settings(),hasApiKey=!!this.secret.read(settings.apiBaseUrl);const sources=[...new Map([...d.sources,...this.numerology.strokes.sources,...this.numerology.rules.sources,...this.qimenSources,...this.baziSources,...this.monthAuthoritySources,...this.monthlySeasonal.sources,...this.seasonalConditionSources,...this.congWealthSources,...this.congShaSources,...this.followingRestrictionsSources,...this.ditianRenSources,...this.renNecessarySources,...this.renActionsSources,...this.renCapacitiesSources,...this.renDirectionsSources,...this.renJointBattleSources,...this.nameImagery.sources,...this.yueHomophones.sources,...this.yueReading.sources.filter(source=>source.id==='rime-cantonese-jyutping'),...this.solarTimeSources,...this.classics.sources,...this.officialNamePopularity.sources,...this.namingEditorialPackages.sources].map(s=>[s.id,s])).values()];const knowledge=[...d.knowledge,...this.seasonalKnowledge];return {profiles:this.store.rows<BirthProfile>('profiles'),sessions:[] as NamingSession[],sessionCatalog:this.listSessionCatalog({limit:25}),storageState:this.customerStorageState(),settings:{...settings,hasApiKey,credentialNotice:this.secret.warning?.()||''},sources,stats:{characters:d.characters.length,citations:d.citations.length,knowledge:knowledge.length,dataVersion:d.version,knowledgeCategories:[...new Set(knowledge.map(k=>k.category))]},desktop:this.desktop,maintenance:this.store.maintenanceStatus()};}
  validatePreferences(pref:NamingPreferences){
    const namingElementMethod=readNamingElementMethodSelection(pref);
    if(namingElementMethod){canonicalPlainJson(pref.preferredElements);if(Array.isArray(pref.preferredElements)&&pref.preferredElements.length)throw new NamingElementResolutionError('manual-project-conflict','项目命名方法与非空人工五行选择冲突；请明确退出项目方法后重新生成。',namingElementMethod.methodId,namingElementMethod.entryPolicy);}
    const parentNamePhonetics=readParentNamePhoneticsMode(pref);
    assertElementInput({preferences:pref});
    if(!pref||![1,2].includes(pref.length))throw new Error('起名偏好不合法。');
    for(const k of ['generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority'] as const)if(typeof pref[k]!=='string'||pref[k].length>1000)throw new Error('起名偏好字段不合法或过长。');
    if(!['balanced','traditional','sound','classic','simple'].includes(pref.priority)||!Array.isArray(pref.preferredElements)||pref.preferredElements.some(e=>!['木','火','土','金','水'].includes(e)))throw new Error('推荐侧重或五行选择不合法。');
    for(const k of ['zodiacRules','numerology'] as const)if(typeof pref[k]!=='boolean')throw new Error('传统规则选项无效。');
    if(pref.avoidParentNames!==undefined&&typeof pref.avoidParentNames!=='boolean')throw new Error('父母姓名避讳选项无效。');
    if(pref.yueReading!==undefined&&typeof pref.yueReading!=='boolean')throw new Error('粤语读音参考选项无效。');
    if(pref.yueHomophones!==undefined&&!['none','strict','ignore-tone'].includes(pref.yueHomophones)||pref.yueHomophones!==undefined&&pref.yueHomophones!=='none'&&pref.yueReading!==true)throw new Error('粤语词汇复核须开启读音参考，并选择明确比对方式。');
    if(pref.yueHomophoneRuleVersion!==undefined&&(!validYueHomophoneRuleVersion(pref.yueHomophoneRuleVersion)||(pref.yueHomophones??'none')==='none'))throw new Error('粤语词汇版本须与已启用的复核方式一同保存。');
    if(pref.elementAssessment!==undefined&&typeof pref.elementAssessment!=='boolean')throw new Error('项目意象开关无效。');
    if(pref.imageryReading!==undefined&&typeof pref.imageryReading!=='boolean')throw new Error('文化意象对读实验选项无效。');
    const {length,generationChar,requiredChars,forbiddenChars,elderTaboo,style,meanings,industry,priority,preferredElements,zodiacRules,numerology,avoidParentNames,imageryReading,yueReading,yueHomophones,yueHomophoneRuleVersion}=pref;
    const wordReference=readWordPronunciationPreference(pref);
    const namePhonetics=readNamePhoneticPreferences(pref);
    return normalizePreferences({...(namingElementMethod?{namingElementMethod}:{}),...(parentNamePhonetics!==undefined?{parentNamePhonetics}:{}),...(wordReference?{wordPronunciationReference:true}:{}),...(namePhonetics?{namePhonetics}:{}),...(pref.elementAssessment!==undefined?{elementAssessment:pref.elementAssessment}:{}),length,generationChar,requiredChars,forbiddenChars,elderTaboo,style,meanings,industry,priority,preferredElements,zodiacRules,numerology,avoidParentNames,imageryReading,yueReading,yueHomophones,...((yueHomophones??'none')!=='none'?{yueHomophoneRuleVersion:yueHomophoneRuleVersion??YUE_HOMOPHONE_VERSION}:{})});
  }
  validateProfile(p:BirthProfile){
    assertParentNameProfileInput(p);
    if(!p||typeof p!=='object'||typeof p.surname!=='string'||!/^[\p{Script=Han}]{1,4}$/u.test(p.surname.trim()))throw new Error('请输入1–4个汉字的姓氏。');
    if(!['男','女','中性'].includes(p.gender)||!['solar','lunar'].includes(p.calendar))throw new Error('资料中的性别或历法选项无效。');
    for(const k of ['id','customerName','surnamePinyin','birthDate','birthTime','birthPlace','timezone','notes'] as const){if(typeof p[k]!=='string'||p[k].length>(k==='notes'?10000:300))throw new Error('资料字段不合法或过长。');}
    if(typeof p.timeUnknown!=='boolean'||typeof p.leapMonth!=='boolean')throw new Error('出生时间选项不合法。');
    if(!validMonthAuthorityMethod(p.monthAuthorityMethod))throw new Error('月令参考方法无效，请重新选择。');
    if(!validSeasonalMethod(p.seasonalMethod))throw new Error('逐月调候参考方法无效，请重新选择。');
    if(!validRenMethod(p.renMethod))throw new Error('任注独立参考方法无效，请重新选择。');
    validateBirthTimeInput(p);
    for(const [label,value] of [['爸爸姓名',p.fatherName],['妈妈姓名',p.motherName]] as const){if(value!==undefined&&(typeof value!=='string'||[...value].length>40))throw new Error(`${label}请填写40个字符以内的姓名。`);}
    const namingPreferences=p.namingPreferences?this.validatePreferences(p.namingPreferences):undefined;
    analyzeProfile(p);const normalized={...p,id:p.id||randomUUID(),surname:p.surname.trim(),fatherName:p.fatherName?.trim()||'',motherName:p.motherName?.trim()||'',...(namingPreferences?{namingPreferences}:{})};return Object.hasOwn(normalized,'parentNameReadings')?this.parentNames().validateProfile(normalized):normalized;
  }
  saveProfile(p:BirthProfile){const profile=this.validateProfile(p);return this.recoverCommittedWrite(()=>this.store.saveProfile(profile),()=>{const saved=this.store.rows<BirthProfile>('profiles').find(row=>row.id===profile.id);if(!saved||!isDeepStrictEqual(saved,JSON.parse(JSON.stringify(profile))))throw new Error('已提交客户档案的完整读回结果不一致，需要核对最新资料。');return saved;});}
  deleteProfile(id:string){if(typeof id!=='string')throw new Error('客户编号无效。');this.recoverCommittedWrite(()=>this.store.deleteProfile(id),()=>{if(this.store.rows<BirthProfile>('profiles').some(row=>row.id===id)||this.store.rows<NamingSession>('sessions').some(row=>row.profileId===id))throw new Error('客户删除已提交但读回仍有相关资料，需要核对最新档案。');});}
  analyze(p:BirthProfile):Analysis{return analyzeProfile(this.validateProfile(p));}
  async previewGengSiReference(p:BirthProfile):Promise<GengSiReferencePreview> {
    if(arguments.length!==1)throw new Error('条文预览只接受一份出生资料。');
    const profile=this.validateProfile(readGengSiReferenceProfile(p));
    return buildGengSiReferencePreview(profile,this.store.dataDir);
  }
  getB04WordContextOptions(input:B04WordContextQuery):Promise<B04WordContextOptions>{return createB04WordContextAdapter({candidateDataDir:this.store.dataDir,originalDataDir:this.store.dataDir}).getB04WordContextOptions(input);}
  private singleCharacterMeanings(){return this.singleCharacterMeaningAdapter??=createSingleCharacterMeaningAdapter({projectRoot:resolveNamingElementPath(this.store.dataDir,'..'),dataDir:this.store.dataDir});}
  getSingleCharacterMeaningOptions(input:SingleCharacterMeaningQuery):SingleCharacterMeaningOptions{return this.singleCharacterMeanings().getSingleCharacterMeaningOptions(input);}
  listManualCharacterMeanings(input:ManualCharacterMeaningListRequest){if(arguments.length!==1)throw Error('MANUAL_MEANING_INPUT_INVALID: exactly one list request required');return this.#manualMeanings().list(input);}
  selectManualCharacterMeaning(input:ManualCharacterMeaningSelectRequest){if(arguments.length!==1)throw Error('MANUAL_MEANING_INPUT_INVALID: exactly one selection request required');return this.#manualMeanings().select(input);}
  getNamingCoverage(){if(arguments.length!==0)throw new Error('命名覆盖读取不接受调用方参数。');return createNamingCoverageProvider(()=>({dataDir:this.store.dataDir,dataset:this.store.dataset})).getNamingCoverage();}
  async previewQiongtongClauseReferences(p:BirthProfile):Promise<QiongtongClauseReferencePreview> {
    if(arguments.length!==1)throw new Error('字面条件预览只接受一份出生资料。');
    return buildQiongtongClauseReferencePreview(p,this.store.dataDir);
  }
  async previewJiaHaiControl(p:BirthProfile,options?:JiaHaiControlOptions):Promise<JiaHaiControlPreview> {
    if(arguments.length<1||arguments.length>2)throw new Error('甲亥项目预览只接受出生资料和显式推演选项。');
    return buildJiaHaiControlPreview(p,options,this.store.dataDir);
  }
  previewBaziMainchain(p:BirthProfile,options?:BaziMainchainPreviewOptions):BaziMainchainPreview {
    const profile=this.validateProfile(p);
    return calculateBaziMainchainPreview(profile,options);
  }
  previewBaziRootFeedback(p:BirthProfile,options?:RootFeedbackFacadeOptions):RootFeedbackFacadeDTO {
    if(arguments.length>2)throw new Error('根反馈预览只接受出生资料和明确入口选项。');
    const profile=this.validateProfile(p);
    const facade=this.rootFeedbackPreviewFacade??=createBaziRootFeedbackFacade(loadRootFeedbackResources({assetDir:resolveNamingElementPath(this.store.dataDir,'..','assets'),dataDir:this.store.dataDir}));
    return facade.previewBaziRootFeedbackProfile(profile,options);
  }
  async previewBaziRootFeedbackV132(p:BirthProfile,options?:RootFeedbackFacadeOptions){
    if(arguments.length<1||arguments.length>2)throw new Error('1.3.2 用神预览只接受出生资料和显式推演选项。');
    const request=readRootFeedbackV132BoundPreviewRequest(p,options);
    const profile=this.validateProfile(request.profile);
    const adapter=this.rootFeedbackV132PreviewAdapter??=createBaziRootFeedbackV132PreviewAdapter(this.rootFeedbackAssetDir);
    return bindRootFeedbackV132PreviewResponse(request,adapter.previewBaziRootFeedbackProfile(profile,request.options));
  }
  /** Readonly diagnostics. Legacy validators inspect independent copies only;
   * the fixed checker receives the original owned request, never their rewritten
   * ID/name/preferences, or a caller runtime, certificate or lookup callback. */
  async checkCandidate2NamingEligibility(profile:BirthProfile,preferences:NamingPreferences,selection?:Candidate2NamingRequest['selection']):Promise<Candidate2NamingEligibility>{
    if(arguments.length<2||arguments.length>3)throw new Error('candidate.2 资格检查只接受原始出生资料、偏好和可选的明确取法。');
    let request:Candidate2EligibilityRequest|null=null;
    try{request=captureEligibilityRequest(profile,preferences,selection);}catch(error){return eligibilityFailure(error,request);}
    const chosen=request.selection;
    if(!request.selectionWasProvided||chosen&&Object.keys(chosen).length===1&&chosen.enabled===false)return this.candidate2Eligibility().checkEligibility(request.profile,request.preferences,(request.selectionWasProvided?chosen:undefined) as Candidate2NamingRequest['selection']);
    if(canonicalPlainJson(chosen)!==canonicalPlainJson(CANDIDATE2_NAMING_SELECTION))return eligibilityResponse('blocked',request,[{code:'CANDIDATE2_NAMING_UNSUPPORTED_SELECTION',message:'请选择完整登记的 candidate.2 取法；当前选择不能自动升级或降级。'}]);
    try{this.validateProfile(structuredClone(request.profile));this.validatePreferences(structuredClone(request.preferences));}
    catch{return eligibilityResponse('blocked',request,[{code:'service-input-invalid',message:'出生资料或命名偏好未通过服务输入核验，请核对原始资料后重试。'}]);}
    const unavailable=()=>eligibilityResponse('unavailable',request,[{code:'active-naming-data-unavailable',message:'当前活动数据包或命名规则不支持固定 candidate.2；不会借用内置包、已审资料投影或其他版本替代。'}]);
    let activeSha256:string;
    try{
      const activePack=this.store.currentPackBytes();activeSha256=createHash('sha256').update(activePack).digest('hex');
      const active=resolveNamingGenerationContext({packSha256:activeSha256,activeVersion:this.store.dataset.version});
      if(active.version!==NAMING_RULE_V71_VERSION||!active.context)return unavailable();
    }catch{return unavailable();}
    try{
      // Recheck deployment availability even after this Service has warmed its
      // single host. This reads fixed bytes; it neither builds nor evaluates a
      // caller-selected artifact or a fresh application instance.
      const bundle=readCandidate2Deployment(resolveNamingElementPath(this.store.dataDir,'..','dist-electron/project-naming-application/1.3.2-candidate.2/application.cjs'));
      if(bundle.length!==2002922||createHash('sha256').update(bundle).digest('hex')!=='906b191c88ce2e6f0335c674727c39bcae14edf2968d2c1c5cdffcb04079b47a')throw new Error('CANDIDATE2_NAMING_RUNTIME_INVALID: fixed deployment missing or changed');
      const result=this.candidate2Eligibility().checkEligibility(request.profile,request.preferences,chosen as Candidate2NamingRequest['selection']);
      if(result.status==='eligible'&&(result.dataIdentity?.packSha256!==activeSha256||result.dataIdentity.activeVersion!==this.store.dataset.version))return unavailable();
      return result;
    }catch(error){return eligibilityFailure(error,request);}
  }
  async restoreCandidate2History(sessionId:string,revisionId:string,expectedRevision:number,expectedToken:string):Promise<Candidate2HistoryRestoreSavedResult>{
    if(arguments.length!==4)throw new Error('CANDIDATE2_HISTORY_INPUT_INVALID: exactly session id, revision id, revision and token required');
    const request=captureCandidate2HistoryRestoreInput(sessionId,revisionId,expectedRevision,expectedToken);
    const session=invokeNativeCandidate2HistoryRestore(nativeCandidate2HistoryRestore,this.store,[request.sessionId,request.revisionId,request.expectedRevision,request.expectedToken]) as Candidate2AdoptedNamingSessionV2;
    return{schema:'candidate2-history-restore-saved/1',status:'saved',session,traditionalStatus:'unknown'};
  }
  async reviewCandidate2(sessionId:string,changes:Candidate2ReviewChanges,expectedRevision:number,expectedToken:string):Promise<Candidate2ReviewSavedResult>{
    if(arguments.length!==4)throw new Error('CANDIDATE2_REVIEW_INPUT_INVALID: exactly session id, changes, revision and token required');
    const request=captureCandidate2ReviewInput(sessionId,changes,expectedRevision,expectedToken);
    // Native review owns CAS, immutable facts, no-change writes and its scoped
    // private canonical readback. Preserve its result and committed exceptions.
    const session=invokeNativeCandidate2Review(nativeCandidate2Review,this.store,[request.sessionId,request.changes,request.expectedRevision,request.expectedToken]) as Candidate2AdoptedNamingSessionV2;
    return{schema:'candidate2-review-saved/1',status:'saved',session,traditionalStatus:'unknown'};
  }
  previewCandidate2Report(id:string,expectedReviewRevision:number,expectedReviewToken:string):Candidate2ReportDocument{
    if(arguments.length!==3)throw Error('CANDIDATE2_REPORT_INPUT_INVALID: exactly id, explicit review revision and token required');
    const request=captureCandidate2ReportInput(id,expectedReviewRevision,expectedReviewToken);
    return invokeNativeCandidate2Report(nativeCandidate2Report,this.store,[request.id,request.expectedReviewRevision,request.expectedReviewToken]) as Candidate2ReportDocument;
  }
  async generateCandidate2(profileId:string,preferences:NamingPreferences,selection:Candidate2NamingSelection):Promise<Candidate2GenerateSavedResult>{
    if(arguments.length!==3)throw new Error('CANDIDATE2_SERVICE_INPUT_INVALID: exactly profile id, preferences and explicit selection required');
    const request=captureCandidate2ServiceInput(profileId,preferences,selection);
    // This captured real Store method enforces its own private receiver, native
    // writer, canonical SQL readback and physical seal. No public reader or
    // shape-only assertion is used as supplementary save authority here.
    const session=invokeNativeCandidate2(nativeCandidate2Generate,this.store,[request.profileId,request.preferences,request.selection]) as Candidate2AdoptedNamingSessionV2;
    return{schema:'candidate2-generate-saved/1',status:'saved',session,messages:[...session.candidate2Naming.generation.messages],traditionalStatus:'unknown'};
  }
  async generate(profile:BirthProfile,pref:NamingPreferences):Promise<GenerateResult>{return this.generateInternal(profile,pref);}
  async generateReviewed(profile:BirthProfile,pref:NamingPreferences,selection:ReviewedDataSelection):Promise<ReviewedGenerateResult>{
    if(arguments.length!==3)throw new Error('已审资料生成只接受出生资料、偏好和明确版本选择。');
    return this.generateInternal(profile,pref,normalizeReviewedDataSelection(selection)) as Promise<ReviewedGenerateResult>;
  }
  private async generateInternal(profile:BirthProfile,pref:NamingPreferences,reviewedSelection?:ReviewedDataSelection):Promise<GenerateResult>{
    const p=this.validateProfile(profile);pref=this.validatePreferences(pref);p.namingPreferences=pref;
    const writeToken=this.store.profileWriteToken(p.id);
    const analysis=analyzeProfile(p),d=this.store.dataset;
    const namingContext=resolveNamingGenerationContext({packSha256:createHash('sha256').update(this.store.currentPackBytes()).digest('hex'),activeVersion:d.version});
    const namingElementResolution=this.namingElements().resolve(p,pref,analysis,namingContext.version);
    const projectNamingUse=buildProjectNamingUseSnapshot(namingElementResolution,namingContext.version);
    if(projectNamingUse)analysis.projectNamingUse=projectNamingUse;
    const resolvedBasis=resolveNamingBasisForRuleVersion(namingContext.version,namingContext.context,pref,analysis,namingElementResolution.basis);
    if(readWordPronunciationPreference(pref)&&!namingContext.context)throw new Error('整词参照仅支持命名7固定完整知识包的新方案。');
    const namingRuleSources=namingEditorialPackageForVersion(this.namingEditorialPackages,namingContext.version).sources;
    const naming71=namingContext.version===NAMING_RULE_V71_VERSION?(this.namingCharacter71??=loadNamingEditorialV71Data(this.store.dataDir)):undefined;
    if(reviewedSelection&&namingContext.version!==NAMING_RULE_V71_VERSION)throw new Error('已审资料新方法只支持固定7.1原知识包，不得借用其他字库。');
    const reviewedResources=reviewedSelection?loadReviewedNamingDataResources(resolveNamingElementPath(this.store.dataDir,'..')):undefined;
    const reviewedGenerator=reviewedResources&&reviewedSelection?createReviewedNamingGeneration(reviewedResources,{profile:p,preferences:pref,analysis,selection:reviewedSelection}):undefined;
    const signature=namingInputKey(p,pref);
    const previous=this.store.readVerifiedSessionsForProfile(p.id).filter(s=>namingInputKey(s.profile,s.preferences)===signature);
    const versionPrevious=(namingContext.version===NAMING_RULE_V71_VERSION?previous.filter(session=>resolveSessionNamingRulesVersion(session)===NAMING_RULE_V71_VERSION):previous).filter(session=>reviewedSelection?hasReviewedDataFootprint(session)&&isDeepStrictEqual((session as ReviewedNamingSession).reviewedData.selection,reviewedSelection):!hasReviewedDataFootprint(session));
    const excludedNames=[...new Set(versionPrevious.flatMap(s=>s.candidates.map(c=>c.givenName)))];
    const local=reviewedGenerator?reviewedGenerator.generateLocal(Date.now()%100000,excludedNames):generateLocalWithResolvedBasisForRuleVersion(namingContext.version,namingContext.context,resolvedBasis,p,pref,analysis,d.characters,d.citations,Date.now()%100000,excludedNames);let candidates=local.candidates;const messages=[...local.messages];
    const settings=this.store.settings();
    if(settings.useAi){try{const ai=await generateAIForRuleVersion(namingContext.version,settings,this.secret.read(settings.apiBaseUrl),p,pref,analysis,reviewedGenerator?.characters??d.characters,d.citations,excludedNames,undefined,namingContext.context,resolvedBasis);const audited=reviewedGenerator?ai.candidates.flatMap(candidate=>{const accepted=reviewedGenerator.evaluate(candidate.givenName,'ai');return accepted?[accepted]:[];}):ai.candidates;candidates=[...audited,...local.candidates.filter(c=>!audited.some(a=>a.givenName===c.givenName))].slice(0,12);if(ai.warning)messages.push(ai.warning);}catch(e){if(e instanceof NamingElementBasisError||e instanceof NamingElementResolutionError)throw e;messages.push(e instanceof Error?e.message:'AI 请求失败，已使用本地候选。');}}
    if(!reviewedGenerator)candidates=candidates.map(candidate=>finalizeNamingCandidateForRuleVersion(namingContext.version,candidate,p,pref,analysis,namingContext.context,naming71));
    if(pref.numerology){
      for(const candidate of candidates){candidate.numerology=analyzeNumerology(p.surname,candidate.givenName,this.numerology.strokes,this.numerology.rules);candidate.warnings=candidate.warnings.filter(w=>!w.includes('尚无完整、经核验的康熙姓名学笔画'));}
      messages.push('五格三才作为独立文化参考，不参与综合排序；字形或笔画来源不唯一时请在详情确认。');
    }
    if(pref.yueReading){
      for(const candidate of candidates)candidate.yueReading=calculateYueNameReading(p.surname,candidate.givenName,this.yueReading.data);
      messages.push('粤语读音候选已随方案保存，请在详情确认家庭采用的读音；本项未进行粤语谐音词检查，不改变评分或排序。');
    }
    const homophonePackage=pref.yueHomophones&&pref.yueHomophones!=='none'?yueHomophonePackageForVersion(this.yueHomophones,pref.yueHomophoneRuleVersion!):undefined;
    if(homophonePackage){for(const candidate of candidates)candidate.yueHomophones=calculateYueHomophoneReviewForVersion(homophonePackage.data.version,p.surname,candidate.givenName,candidate.yueReading!,pref.yueHomophones as 'strict'|'ignore-tone',homophonePackage.data);messages.push('已启用有限粤语词汇联想复核；须确认全名读音后才检查，不自动淘汰候选或降低评分。');}
    const namePhonetics=readNamePhoneticPreferences(pref);
    if(namePhonetics)for(const candidate of candidates)candidate.namePhoneticReviews=this.phonetics().calculate(p,pref,candidate);
    if(pref.imageryReading){
      const metadata={profile:this.nameImagery.profile,chartSha256:createHash('sha256').update(JSON.stringify(analysis.qimen)).digest('hex')};
      for(const candidate of candidates)candidate.imageReading=calculateNameImageryReading(p.surname,candidate.givenName,candidate.characters,analysis.qimen,metadata);
      messages.push('文化意象与外八宫集合对读属于项目实验；只照读保存盘结构，不判断吉凶、真假空墓或四害解除，也不参与评分和排序。');
    }
    const yueSources=pref.yueReading?this.yueReading.sources.filter(source=>{const existing=d.sources.find(record=>record.id===source.id);if(existing&&!isDeepStrictEqual(existing,source))throw new Error('所选知识包的字形来源与粤语固定参考不一致，请核对数据包。');return !existing;}):[];
    const sourceSnapshot=createSessionSourceSnapshot(d.version,[...d.sources,...this.numerology.strokes.sources,...this.numerology.rules.sources,...this.qimenSources,...this.baziSources,...this.monthAuthoritySources,...this.monthlySeasonal.sources,...this.seasonalConditionSources,...this.congWealthSources,...this.congShaSources,...this.followingRestrictionsSources,...(analysis.renCommentary?this.ditianRenSources:[]),...(analysis.renCommentary?.necessaryConditions?this.renNecessarySources:[]),...(analysis.renCommentary?.actionAnalysis?this.renActionsSources:[]),...(analysis.renCommentary?.capacityAnalysis?this.renCapacitiesSources:[]),...(analysis.renCommentary?.directionAnalysis?this.renDirectionsSources:[]),...(analysis.renCommentary?.jointBattleAnalysis?this.renJointBattleSources:[]),...(analysis.bazi.timeBasis?.sourceId?this.solarTimeSources:[]),...(pref.imageryReading?this.nameImagery.sources:[]),...yueSources,...(homophonePackage?.sources??[]),...(namePhonetics?this.phonetics().sources:[]),...this.parentNames().sources(pref,p,d.sources),...namingRuleSources,...namingElementResolution.sourceRecords]);
    const reviewedSources=reviewedResources?.sourceRecords.filter(source=>{const existing=sourceSnapshot.sources.find(row=>row.id===source.id);if(existing&&!isDeepStrictEqual(existing,source))throw new Error('已审资料与生成时固定来源记录不一致。');return !existing;})??[];
    const generatedSourceSnapshot=reviewedResources?createSessionSourceSnapshot(d.version,[...sourceSnapshot.sources,...reviewedSources]):sourceSnapshot;
    const session:NamingSession={id:(reviewedSelection?REVIEWED_DATA_SESSION_PREFIX:'')+randomUUID(),profileId:p.id,createdAt:new Date().toISOString(),profile:p,preferences:pref,analysis,candidates,reviewNote:'',originalFavorable:[...analysis.bazi.favorable],dataVersion:d.version,sourceSnapshot:generatedSourceSnapshot,namingRules:namingContext.context?(namingContext.version===NAMING_RULE_V71_VERSION?{version:NAMING_RULE_V71_VERSION,dataVersion:d.version,sourceId:NAMING_RULE_V71_SOURCE_ID}:{version:NAMING_RULE_V7_VERSION,dataVersion:d.version,sourceId:NAMING_RULE_V7_SOURCE_ID}):{version:NAMING_RULE_V6_VERSION,dataVersion:d.version,sourceId:NAMING_RULE_V6_SOURCE_ID}};
    this.parentNames().attachNew(session);
    let savedSession=pref.elementAssessment===true?this.store.prepareElementAssessment(session):session;
    if(readWordPronunciationPreference(pref))savedSession=this.store.prepareWordPronunciationReference(savedSession);
    if(reviewedResources&&reviewedSelection)savedSession=attachReviewedNamingData(savedSession,reviewedSelection,reviewedResources);
    let cleanupWarning=false;const canonical=this.recoverCommittedWrite(()=>{this.store.commitGeneratedProfileAndSession(p,savedSession,writeToken);return savedSession;},()=>{const recovered=this.committedSessionResult(savedSession);cleanupWarning=true;return recovered;});return {session:canonical,messages:cleanupWarning?[...messages,CUSTOMER_WRITE_COMMITTED_NOTICE]:messages};
  }
  saveSession(s:NamingSession){
    assertReviewedDataInput(s);
    assertProjectNamingUseInput(s);
    assertParentNameReviewInput(s);
    assertPhoneticReviewInput(s);
    assertWordPronunciationFields(s);
    assertElementInput(s);
    assertMeaningContextReviewInput(s);
    assertModernInput(s);
    assertNamingMeaningReviewInput(s);
    if(!s||typeof s.id!=='string'||!Array.isArray(s.candidates)||s.candidates.length>100||originalReviewBytes(s)>2000000)throw new Error('方案格式无效。');
    if(Array.isArray(s.sourceSnapshot?.sources)&&s.sourceSnapshot.sources.some(source=>source.id===OFFICIAL_NAME_POPULARITY_SOURCE_ID))throw new Error('历史姓名统计仅供独立只读参考，不得附加到方案生成时来源快照。');
    const original=this.store.readVerifiedSession(s.id);if(!original)throw new Error('未找到该方案，请先生成。');
    assertReviewRevision(original,s.reviewRevision,s.reviewToken);
    assertUnchangedReviewedData(original,s);
    assertUnchangedProjectNamingUse(original,s);
    assertUnchangedParentNamePhoneticReview(s,original);
    assertUnchangedElementAssessment(s,original);
    assertUnchangedWordPronunciation(s,original);
    if(Object.prototype.hasOwnProperty.call(s,'namingRules')!==Object.prototype.hasOwnProperty.call(original,'namingRules')||!isDeepStrictEqual(s.namingRules,original.namingRules))throw new Error('方案命名规则版本不得通过审阅改变；请另行生成新方案。');
    if(typeof s.reviewNote!=='string'||s.reviewNote.length>10000)throw new Error('方案审阅意见需为10000字以内的文字。');
    if(s.candidates.length!==original.candidates.length||new Set(s.candidates.map(c=>c?.id)).size!==s.candidates.length||s.candidates.some(c=>!c||!original.candidates.some(x=>x.id===c.id&&x.fullName===c.fullName)))throw new Error('候选名单不得缺失或重复；修改姓名后请重新生成，以执行完整校验。');
    s.createdAt=original.createdAt;s.originalFavorable=original.originalFavorable;s.analysis=original.analysis;s.dataVersion=original.dataVersion;s.profile=original.profile;s.profileId=original.profileId;if(Object.hasOwn(original,'sourceSnapshot'))s.sourceSnapshot=original.sourceSnapshot;else delete s.sourceSnapshot;
    const manual=s.preferences?.preferredElements;
    if(!Array.isArray(manual)||manual.some(e=>!['木','火','土','金','水'].includes(e)))throw new Error('人工五行选择无效。');
    s.preferences={...original.preferences,preferredElements:manual};
    const changed=manual.join()!==original.preferences.preferredElements.join();
    for(let i=0;i<s.candidates.length;i++){
      const c=s.candidates[i],old=original.candidates.find(x=>x.id===c.id)!;
      assertUnchangedNamingMeaningReview(c,old);
      assertUnchangedMeaningContextReview(c,old);
      assertUnchangedModernRecord(c,old);
      const phonetic=ownPhoneticValue(c,'namePhoneticReviews'),savedPhonetic=ownPhoneticValue(old,'namePhoneticReviews');
      if(phonetic.present!==savedPhonetic.present||phonetic.present&&!isDeepStrictEqual(phonetic.value,savedPhonetic.value))throw new Error('词音复核是主进程保存的只读快照，普通审阅不得附加、删改或嫁接。');
      if(typeof c.meaning!=='string'||typeof c.reason!=='string'||typeof c.reviewNote!=='string'||typeof c.traditionalReason!=='string')throw new Error('审阅字段不合法。');
      s.candidates[i]={...old,meaning:c.meaning,reason:c.reason,traditionalReason:c.traditionalReason,reviewNote:c.reviewNote,favorite:!!c.favorite};
      if(changed&&!s.candidates[i].warnings.includes('人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。'))s.candidates[i].warnings.push('人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。');
    }
    if(!validSession(s))throw new Error('方案字段不完整或格式不合法，未保存修改。');
    return this.saveReviewedSession(s);
  }
  recordModernPracticalEvidence(sessionId:string,candidateId:string,expectedReviewRevision:number,expectedReviewToken?:string){
    if(arguments.length<3||arguments.length>4||typeof sessionId!=='string'||!sessionId.trim()||typeof candidateId!=='string'||!candidateId.trim()||!Number.isSafeInteger(expectedReviewRevision)||expectedReviewRevision<0)throw new Error('现代说明仅接受已保存方案、候选编号和审阅版本。');
    const original=this.store.readVerifiedSession(sessionId);if(!original)throw new Error('未找到已保存方案。');
    assertReviewRevision(original,expectedReviewRevision,expectedReviewToken);verifyModernMethodResource(this.store.dataDir);
    const session=structuredClone(original),candidate=session.candidates.find(value=>value.id===candidateId);if(!candidate)throw new Error('候选不属于该方案。');
    candidate.modernPracticalEvidence=createModernRecord(session,candidateId);authorizeModernMutation(session,candidateId,'record');
    return this.saveReviewedSession(session);
  }
  clearModernPracticalEvidence(sessionId:string,candidateId:string,expectedReviewRevision:number,expectedReviewToken?:string){
    if(arguments.length<3||arguments.length>4||typeof sessionId!=='string'||!sessionId.trim()||typeof candidateId!=='string'||!candidateId.trim()||!Number.isSafeInteger(expectedReviewRevision)||expectedReviewRevision<0)throw new Error('现代说明清除仅接受方案、候选编号和审阅版本。');
    const original=this.store.readVerifiedSession(sessionId);if(!original)throw new Error('未找到已保存方案。');assertReviewRevision(original,expectedReviewRevision,expectedReviewToken);
    const session=structuredClone(original),candidate=session.candidates.find(value=>value.id===candidateId);if(!candidate)throw new Error('候选不属于该方案。');
    if(!Object.hasOwn(candidate,'modernPracticalEvidence'))return original;
    delete candidate.modernPracticalEvidence;authorizeModernMutation(session,candidateId,'clear');return this.saveReviewedSession(session);
  }
  listHistory(sessionId:string){if(typeof sessionId!=='string'||!this.store.readVerifiedSession(sessionId))throw new Error('未找到该方案。');return this.store.listRevisions(sessionId);}
  restoreHistory(sessionId:string,revisionId:string,expectedReviewRevision=0,expectedReviewToken?:string){
    const current=this.store.readVerifiedSession(sessionId);
    const revision=this.listHistory(sessionId).find(r=>r.id===revisionId);
    if(!current||!revision||revision.session.id!==current.id||revision.session.profileId!==current.profileId)throw new Error('未找到属于该方案的历史版本。');
    assertReviewRevision(current,expectedReviewRevision,expectedReviewToken);
    assertUnchangedProjectNamingUse(current,revision.session);
    assertUnchangedReviewedData(current,revision.session);
    const restored=structuredClone(revision.session);restored.profile=current.profile;restored.analysis=current.analysis;restored.originalFavorable=current.originalFavorable;restored.dataVersion=current.dataVersion;restored.createdAt=current.createdAt;restored.reviewRevision=current.reviewRevision;restored.reviewToken=current.reviewToken;if(Object.hasOwn(current,'sourceSnapshot'))restored.sourceSnapshot=current.sourceSnapshot;else delete restored.sourceSnapshot;
    authorizeModernHistory(restored,revision.session);
    return this.saveReviewedSession(restored,true);
  }
  updateElementAssessment(sessionId:string,candidateId:string,choices:ElementAssessmentChoiceInput[],expectedReviewRevision=0,expectedReviewToken?:string){
    if(typeof sessionId!=='string'||typeof candidateId!=='string')throw new Error('人工意象方案或候选编号无效。');
    const original=this.store.rows<NamingSession>('sessions').find(s=>s.id===sessionId);if(!original)throw new Error('未找到该方案。');
    assertReviewRevision(original,expectedReviewRevision,expectedReviewToken);
    return this.saveReviewedSession(this.store.confirmElementAssessment(original,candidateId,choices));
  }
  getMeaningContextOptions(sessionId:string,candidateId:string){
    if(typeof sessionId!=='string'||typeof candidateId!=='string')throw new Error('词义参考方案或候选编号无效。');
    const session=this.store.meaningContextSession(sessionId),candidate=session?.candidates.find(c=>c.id===candidateId);
    if(!session||!candidate)throw new Error('未找到该已保存方案中的名字。');
    const pack=this.store.meaningContextPackContext(session);let data:ReturnType<typeof loadMeaningContextData>|undefined;
    if(isNamingV7BaseRuleVersion(session.namingRules?.version))try{data=this.meaningContextData??=loadMeaningContextData(this.store.dataDir);}catch{/* A read never backfills a missing or untrusted optional publication. */}
    return meaningContextOptions(session,candidate,pack,data);
  }
  updateMeaningContext(sessionId:string,candidateId:string,request:MeaningContextUpdateRequest,expectedReviewRevision:number,expectedReviewToken:string){
    assertMeaningContextUpdateRequest(request);
    if(typeof sessionId!=='string'||typeof candidateId!=='string'||!Number.isSafeInteger(expectedReviewRevision)||typeof expectedReviewToken!=='string')throw new Error('词义确认需要有效编号及当前审阅版本和令牌。');
    const original=this.store.meaningContextSession(sessionId);if(!original)throw new Error('未找到该已保存方案。');
    assertReviewRevision(original,expectedReviewRevision,expectedReviewToken);
    const session=structuredClone(original),candidate=session.candidates.find(c=>c.id===candidateId);if(!candidate)throw new Error('未找到该方案中的名字。');
    const data=this.meaningContextData??=loadMeaningContextData(this.store.dataDir);
    applyMeaningContextIntent(session,candidate,this.store.meaningContextPackContext(original),data,request);
    return this.saveReviewedSession(session,true);
  }
  updateYueReading(sessionId:string,candidateId:string,selections:YueReadingSelections,expectedReviewRevision=0,expectedReviewToken?:string){
    if(typeof sessionId!=='string'||typeof candidateId!=='string')throw new Error('粤语读音方案或候选编号无效。');
    const original=this.store.rows<NamingSession>('sessions').find(session=>session.id===sessionId);
    if(!original||original.preferences.yueReading!==true)throw new Error('请先开启粤语读音参考并生成方案。');
    assertReviewRevision(original,expectedReviewRevision,expectedReviewToken);
    const homophoneVersion=resolveSessionYueHomophoneVersion(original);
    const session=structuredClone(original),candidate=session.candidates.find(value=>value.id===candidateId);
    if(!candidate?.yueReading)throw new Error('未找到该方案中的粤语读音快照。');
    candidate.yueReading=confirmYueNameReading(candidate.yueReading,selections);
    if(readNamePhoneticPreferences(session.preferences))candidate.namePhoneticReviews=this.phonetics().calculate(session.profile,session.preferences,candidate);
    const mode=session.preferences.yueHomophones;if(mode&&mode!=='none'){if(!homophoneVersion)throw new Error('已保存词汇复核缺少明确版本。');candidate.yueHomophones=calculateYueHomophoneReviewForVersion(homophoneVersion,session.profile.surname,candidate.givenName,candidate.yueReading,mode,yueHomophonePackageForVersion(this.yueHomophones,homophoneVersion).data);}
    const savedSession=readWordPronunciationPreference(session.preferences)?this.store.refreshWordPronunciationReference(session,candidateId):session;
    return this.saveReviewedSession(savedSession);
  }
  updateNumerology(sessionId:string,candidateId:string,selections:Record<string,string>,expectedReviewRevision=0,expectedReviewToken?:string){
    if(typeof sessionId!=='string'||typeof candidateId!=='string'||!selections||typeof selections!=='object'||Array.isArray(selections)||Object.keys(selections).length>8)throw new Error('数理字形选择格式无效。');
    const original=this.store.rows<NamingSession>('sessions').find(s=>s.id===sessionId);
    if(!original||!original.preferences.numerology)throw new Error('请先开启姓名数理并生成对应方案。');
    assertReviewRevision(original,expectedReviewRevision,expectedReviewToken);
    const session=structuredClone(original),candidate=session.candidates.find(c=>c.id===candidateId);
    if(!candidate)throw new Error('未找到该方案中的名字。');
    candidate.numerology=analyzeNumerology(session.profile.surname,candidate.givenName,this.numerology.strokes,this.numerology.rules,selections);
    return this.saveReviewedSession(hasReviewedDataFootprint(session)?normalizeReviewedNumerologySnapshotForAttach(session):session);
  }
  searchClassics(query:string,bookId?:ClassicBookId|null,page=1){return searchClassicsData(this.classics,query,bookId===null?undefined:bookId,page);}
  readClassicSection(id:string){return readClassicSectionData(this.classics,id);}
  getOfficialNamePopularity(...args:unknown[]){if(args.length)throw new Error('历史姓名统计目录不接受查询参数；请在本地明确查询给名。');return structuredClone(this.officialNamePopularity.catalog);}
  searchKnowledge(query:string,category?:string){const q=String(query||'').trim().slice(0,200);return [...this.store.dataset.knowledge,...this.seasonalKnowledge].filter(x=>(!category||category==='全部'||x.category===category)&&(!q||(x.title+x.text).includes(q))).slice(0,150);}
  async getCmnReadingOptions(char:string):Promise<CmnReadingQuery>{
    if(typeof char!=='string'||!/^[\p{Script=Han}]$/u.test(char))throw new Error('请输入一个完整的汉字。');
    try{if(this.cmnWorkerClosed)throw new Error('CMN worker closed');return await (this.cmnWorker??=new CmnReadingWorkerHost(this.cmnWorkerEntry)).query(char,this.store.dataDir);}
    catch{throw new Error('普通话读音来源不可用或校验失败，请恢复内置资料后重试。');}
  }
  async closeCmnReadingWorker(){this.cmnWorkerClosed=true;const results=await Promise.allSettled([this.cmnWorker?.close(),this.closeCulturalWorkflow()]);for(const result of results)if(result.status==='rejected')throw result.reason;}
  searchCharacters(query:string){const q=String(query||'').trim().slice(0,200);return this.store.dataset.characters.filter(c=>!q||(c.char+c.pinyin+c.meaning+c.tags.join('')).includes(q)).sort((a,b)=>Number(b.char===q)-Number(a.char===q)).slice(0,100);}
  saveBrand(brand:BrandSettings){
    if(!brand||typeof brand.studioName!=='string'||brand.studioName.length>100||typeof brand.contact!=='string'||brand.contact.length>500)throw new Error('工作室信息格式不合法。');
    if(typeof brand.logoDataUrl!=='string'||brand.logoDataUrl.length>2000000||brand.logoDataUrl&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(brand.logoDataUrl))throw new Error('标志需为不超过1.5MB的PNG、JPEG或WebP。');
    const stored=this.store.settings();
    const safe={...stored,studioName:brand.studioName,contact:brand.contact,logoDataUrl:brand.logoDataUrl,hasApiKey:!!this.secret.read(stored.apiBaseUrl),credentialNotice:this.secret.warning?.()||''};
    this.putSettingsWithRecovery(safe);return safe;
  }
  saveAiSettings(ai:AiSettings,apiKey?:string){
    if(!ai||typeof ai.apiBaseUrl!=='string'||typeof ai.model!=='string'||typeof ai.timeoutMs!=='number'||typeof ai.useAi!=='boolean')throw new Error('AI 配置字段不合法。');
    return this.saveSettings({...this.store.settings(),apiBaseUrl:ai.apiBaseUrl,model:ai.model,timeoutMs:ai.timeoutMs,useAi:ai.useAi},apiKey);
  }
  saveSettings(settings:StudioSettings,apiKey?:string){
    if(!settings||typeof settings.studioName!=='string'||settings.studioName.length>100||typeof settings.contact!=='string'||settings.contact.length>500)throw new Error('工作室信息格式不合法。');
    if(typeof settings.apiBaseUrl!=='string'||settings.apiBaseUrl.length>2000||typeof settings.model!=='string'||settings.model.length>200)throw new Error('AI 配置格式不合法。');
    if(!Number.isFinite(settings.timeoutMs)||settings.timeoutMs<5000||settings.timeoutMs>120000)throw new Error('超时需为5–120秒。');
    if(typeof settings.useAi!=='boolean')throw new Error('AI 开关字段不合法。');
    if(typeof settings.logoDataUrl!=='string'||settings.logoDataUrl.length>2000000||settings.logoDataUrl&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(settings.logoDataUrl))throw new Error('标志需为不超过1.5MB的PNG、JPEG或WebP。');
    const normalized=normalizeCredentialEndpoint(settings.apiBaseUrl),oldSettings=this.store.settings();
    const previous=normalizeCredentialEndpoint(oldSettings.apiBaseUrl),oldKey=this.secret.read(oldSettings.apiBaseUrl);let credentialChanged=false;
    if(apiKey!=null&&(typeof apiKey!=='string'||apiKey.length>10000))throw new Error('密钥格式无效。');
    try{
      if(apiKey!=null){this.secret.write(apiKey.trim(),settings.apiBaseUrl);credentialChanged=true;}
      else if(normalized!==previous){this.secret.write('',settings.apiBaseUrl);credentialChanged=true;}
      const safe={...settings,hasApiKey:!!this.secret.read(settings.apiBaseUrl),credentialNotice:this.secret.warning?.()||''};if(!safe.hasApiKey)safe.useAi=false;this.putSettingsWithRecovery(safe);return safe;
    }catch(error){
      if(credentialChanged&&!isCustomerWriteCommittedError(error,this.store)){try{this.secret.write(oldKey,oldSettings.apiBaseUrl);}catch{throw new Error('设置保存失败，系统也未能恢复原密钥，请重新填写适用接口的密钥。');}}
      throw error;
    }
  }
  testConnection(s:StudioSettings,key?:string){
    const sameEndpoint=normalizeCredentialEndpoint(s.apiBaseUrl)===normalizeCredentialEndpoint(this.store.settings().apiBaseUrl);
    return testAI(s,key?.trim()||(sameEndpoint?this.secret.read(s.apiBaseUrl):''));
  }
  testNamingCapability(s:AiSettings|StudioSettings,key?:string){
    if(key!==undefined&&(typeof key!=='string'||key.length>10000))throw new Error('密钥格式无效。');
    let selected='';
    try{const same=normalizeCredentialEndpoint(s.apiBaseUrl)===normalizeCredentialEndpoint(this.store.settings().apiBaseUrl);selected=key?.trim()||(same?this.secret.read(s.apiBaseUrl):'');}catch{/* The checker reports invalid endpoints without using a saved credential. */}
    return testStructuredNaming(s,selected,this.store.dataset);
  }
}
