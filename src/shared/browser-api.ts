import type { StudioAPI } from './types';
import type {GengSiReferenceApi} from './geng-si-reference';
import type {QiongtongClauseReferenceApi} from './qiongtong-clause-reference-preview';
import type {JiaHaiControlPreviewApi} from './jia-hai-control-preview';
import type {BaziRootFeedbackV132PreviewApi} from './bazi-root-feedback-v132-preview-api';
import type {ReviewedNamingDataApi} from './reviewed-naming-data';
import type {Candidate2NamingEligibilityApi} from './candidate2-naming-eligibility-v1';
import type {Candidate2GenerationAPI} from './candidate2-generation-api';
import type {Candidate2ReviewAPI} from './candidate2-review-api';
import type {Candidate2HistoryRestoreAPI} from './candidate2-history-restore-api';
import type {Candidate2ReportAPI} from './candidate2-report-api';
import type {ManualCharacterMeaningAPI} from './manual-character-meaning-api';
import {CULTURAL_WORKFLOW_METHODS,type CulturalWorkflowAPI} from './cultural-workflow-api';
import {CULTURAL_COMPARISON_CATALOG_METHODS,type CulturalComparisonCatalogAPI} from './cultural-comparison-catalog';
import {postCustomerWriteNoticeFromHeader} from './customer-write-notice-delivery';
if(!window.studio){
  const methods=['listSessionCatalog','readSessionDetail','migrateCustomerStorage','bootstrap','saveProfile','deleteProfile','analyze','generate','saveSession','listHistory','restoreHistory','updateNumerology','updateYueReading','updateElementAssessment','recordModernPracticalEvidence','clearModernPracticalEvidence','searchKnowledge','searchClassics','readClassicSection','getOfficialNamePopularity','searchCharacters','saveSettings','saveBrand','saveAiSettings','testConnection','testNamingCapability','exportReport','backup','restore','exportDataPack','importDataPack','rollbackDataPack','previewDataPack','previewRollbackDataPack','previewBuiltinDataPack','applyDataPackPreview','discardDataPackPreview'];
  methods.push('getMeaningContextOptions','updateMeaningContext','previewBaziMainchain','previewBaziRootFeedback','previewBaziRootFeedbackV132','previewGengSiReference','previewQiongtongClauseReferences','previewJiaHaiControl','getB04WordContextOptions');
  methods.push('getCmnReadingOptions','confirmParentNameReading','getSingleCharacterMeaningOptions','getNamingCoverage');
  methods.push('generateReviewed');
  methods.push('checkCandidate2NamingEligibility');
  methods.push('generateCandidate2');
  methods.push('reviewCandidate2');
  methods.push('restoreCandidate2History');
  methods.push('previewCandidate2Report');
  methods.push('listManualCharacterMeanings','selectManualCharacterMeaning');
  methods.push('exportCandidate2Report');
  methods.push(...CULTURAL_WORKFLOW_METHODS);
  methods.push(...CULTURAL_COMPARISON_CATALOG_METHODS);
  const api:Record<string,(...args:unknown[])=>Promise<unknown>>={};
  for(const method of methods)api[method]=async(...args:unknown[])=>{
    if(method==='listCulturalComparisons'){
      if(args.length===2&&args[1]===undefined)args.pop();
    }else if((CULTURAL_WORKFLOW_METHODS as readonly string[]).includes(method)){
      // Only this legal optional argument may be omitted. Keeping every other
      // slot lets JSON encode undefined as null without erasing illegal arity.
      if(method==='readCulturalComparison'&&args.length===2&&args[1]===undefined)args.pop();
    }else if(!['generateCandidate2','reviewCandidate2','restoreCandidate2History','previewCandidate2Report','exportCandidate2Report','listManualCharacterMeanings','selectManualCharacterMeaning'].includes(method))while(args.length&&args[args.length-1]===undefined)args.pop();
    if(method==='exportCandidate2Report')throw new Error('项目方案 PDF 导出请在桌面应用中操作；浏览器可预览已保存报告。');
    const response=await fetch('/__studio_api/'+method,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Local-Request':'1'},body:JSON.stringify(args)});
    postCustomerWriteNoticeFromHeader(window,response);
    if(!response.ok){const err=await response.json().catch(()=>({error:'本地服务连接失败'}));throw new Error(err.error||'请求失败');}
    return response.json();
  };
  window.studio=api as unknown as StudioAPI & GengSiReferenceApi & QiongtongClauseReferenceApi & JiaHaiControlPreviewApi & BaziRootFeedbackV132PreviewApi & ReviewedNamingDataApi & Candidate2NamingEligibilityApi & Candidate2GenerationAPI & Candidate2ReviewAPI & Candidate2HistoryRestoreAPI & Candidate2ReportAPI & ManualCharacterMeaningAPI & CulturalWorkflowAPI & CulturalComparisonCatalogAPI;
}
