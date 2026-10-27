import { contextBridge, ipcRenderer } from 'electron';
import type { StudioAPI } from '../shared/types';
import type {GengSiReferenceApi} from '../shared/geng-si-reference';
import type {QiongtongClauseReferenceApi} from '../shared/qiongtong-clause-reference-preview';
import type {JiaHaiControlPreviewApi} from '../shared/jia-hai-control-preview';
import type {BaziRootFeedbackV132PreviewApi} from '../shared/bazi-root-feedback-v132-preview-api';
import type {ReviewedNamingDataApi} from '../shared/reviewed-naming-data';
import type {Candidate2NamingEligibilityApi} from '../shared/candidate2-naming-eligibility-v1';
import type {Candidate2GenerationAPI} from '../shared/candidate2-generation-api';
import type {Candidate2ReviewAPI} from '../shared/candidate2-review-api';
import type {Candidate2HistoryRestoreAPI} from '../shared/candidate2-history-restore-api';
import type {Candidate2ReportAPI} from '../shared/candidate2-report-api';
import type {ManualCharacterMeaningAPI} from '../shared/manual-character-meaning-api';
import type {CulturalWorkflowAPI} from '../shared/cultural-workflow-api';
import type {CulturalComparisonCatalogAPI} from '../shared/cultural-comparison-catalog';
import {postCustomerWriteNotice} from '../shared/customer-write-notice-delivery';
const invoke=(name:string,...args:unknown[])=>ipcRenderer.invoke('studio:'+name,...args);
ipcRenderer.on('studio:customer-write-notice',(_event,value:unknown)=>postCustomerWriteNotice(window,value,'desktop'));
const api:StudioAPI & GengSiReferenceApi & QiongtongClauseReferenceApi & JiaHaiControlPreviewApi & BaziRootFeedbackV132PreviewApi & ReviewedNamingDataApi & Candidate2NamingEligibilityApi & Candidate2GenerationAPI & Candidate2ReviewAPI & Candidate2HistoryRestoreAPI & Candidate2ReportAPI & ManualCharacterMeaningAPI & CulturalWorkflowAPI & CulturalComparisonCatalogAPI={
  listManualCharacterMeanings:(...args)=>invoke('listManualCharacterMeanings',...args),
  selectManualCharacterMeaning:(...args)=>invoke('selectManualCharacterMeaning',...args),
  previewCandidate2Report:(...args)=>invoke('previewCandidate2Report',...args),
  exportCandidate2Report:(...args)=>invoke('exportCandidate2Report',...args),
  listCulturalComparisons:(...args)=>invoke('listCulturalComparisons',...args),
  getCulturalStorageCapabilities:(...args)=>invoke('getCulturalStorageCapabilities',...args),
  prepareCulturalBirthAnchor:(...args)=>invoke('prepareCulturalBirthAnchor',...args),
  getCulturalCharacterOptions:(...args)=>invoke('getCulturalCharacterOptions',...args),
  previewCulturalComparison:(...args)=>invoke('previewCulturalComparison',...args),
  prepareCulturalWrite:(...args)=>invoke('prepareCulturalWrite',...args),
  commitCulturalWrite:(...args)=>invoke('commitCulturalWrite',...args),
  readCulturalComparison:(...args)=>invoke('readCulturalComparison',...args),
  listCulturalRevisions:(...args)=>invoke('listCulturalRevisions',...args),
  restoreCulturalRevision:(...args)=>invoke('restoreCulturalRevision',...args),
  previewCulturalStorageMigration:(...args)=>invoke('previewCulturalStorageMigration',...args),
  migrateCulturalStorage:(...args)=>invoke('migrateCulturalStorage',...args),
  getCmnReadingOptions:char=>invoke('getCmnReadingOptions',char),
  confirmParentNameReading:(profile,intent)=>invoke('confirmParentNameReading',profile,intent),
  listSessionCatalog:input=>invoke('listSessionCatalog',input),
  readSessionDetail:id=>invoke('readSessionDetail',id),
  migrateCustomerStorage:()=>invoke('migrateCustomerStorage'),
  bootstrap:()=>invoke('bootstrap'),saveProfile:p=>invoke('saveProfile',p),deleteProfile:id=>invoke('deleteProfile',id),analyze:p=>invoke('analyze',p),
  previewBaziMainchain:(p,o)=>invoke('previewBaziMainchain',p,o),
  previewBaziRootFeedback:(p,o)=>invoke('previewBaziRootFeedback',p,o),
  previewBaziRootFeedbackV132:(p,o)=>invoke('previewBaziRootFeedbackV132',p,o),
  checkCandidate2NamingEligibility:(...args)=>invoke('checkCandidate2NamingEligibility',...args),
  generateCandidate2:(...args)=>invoke('generateCandidate2',...args),
  reviewCandidate2:(...args)=>invoke('reviewCandidate2',...args),
  restoreCandidate2History:(...args)=>invoke('restoreCandidate2History',...args),
  generateReviewed:(p,n,s)=>invoke('generateReviewed',p,n,s),
  previewGengSiReference:p=>invoke('previewGengSiReference',p),
  previewQiongtongClauseReferences:p=>invoke('previewQiongtongClauseReferences',p),
  previewJiaHaiControl:(p,o)=>invoke('previewJiaHaiControl',p,o),
  getB04WordContextOptions:input=>invoke('getB04WordContextOptions',input),getSingleCharacterMeaningOptions:input=>invoke('getSingleCharacterMeaningOptions',input),getNamingCoverage:()=>invoke('getNamingCoverage'),
  generate:(p,n)=>invoke('generate',p,n),saveSession:s=>invoke('saveSession',s),searchKnowledge:(q,c)=>invoke('searchKnowledge',q,c),searchClassics:(q,b,p)=>invoke('searchClassics',q,b,p),readClassicSection:id=>invoke('readClassicSection',id),getOfficialNamePopularity:()=>invoke('getOfficialNamePopularity'),searchCharacters:q=>invoke('searchCharacters',q),
  listHistory:id=>invoke('listHistory',id),restoreHistory:(id,revision,expected,token)=>invoke('restoreHistory',id,revision,expected,token),
  updateElementAssessment:(id,candidate,choices,expected,token)=>invoke('updateElementAssessment',id,candidate,choices,expected,token),
  recordModernPracticalEvidence:(id,candidate,expected,token)=>invoke('recordModernPracticalEvidence',id,candidate,expected,token),
  clearModernPracticalEvidence:(id,candidate,expected,token)=>invoke('clearModernPracticalEvidence',id,candidate,expected,token),
  updateYueReading:(id,candidate,selections,expected,token)=>invoke('updateYueReading',id,candidate,selections,expected,token),
  updateNumerology:(id,candidate,selections,expected,token)=>invoke('updateNumerology',id,candidate,selections,expected,token),
  getMeaningContextOptions:(id,candidate)=>invoke('getMeaningContextOptions',id,candidate),
  updateMeaningContext:(id,candidate,request,expected,token)=>invoke('updateMeaningContext',id,candidate,request,expected,token),
  saveSettings:(s,k)=>invoke('saveSettings',s,k),testConnection:(s,k)=>invoke('testConnection',s,k),exportReport:s=>invoke('exportReport',s),backup:()=>invoke('backup'),restore:()=>invoke('restore'),
  saveBrand:s=>invoke('saveBrand',s),saveAiSettings:(s,k)=>invoke('saveAiSettings',s,k),
  testNamingCapability:(s,k)=>invoke('testNamingCapability',s,k),
  exportDataPack:()=>invoke('exportDataPack'),importDataPack:()=>invoke('importDataPack'),rollbackDataPack:()=>invoke('rollbackDataPack'),
  previewDataPack:()=>invoke('previewDataPack'),previewRollbackDataPack:()=>invoke('previewRollbackDataPack'),previewBuiltinDataPack:()=>invoke('previewBuiltinDataPack'),
  applyDataPackPreview:id=>invoke('applyDataPackPreview',id),discardDataPackPreview:id=>invoke('discardDataPackPreview',id)
};contextBridge.exposeInMainWorld('studio',api);
