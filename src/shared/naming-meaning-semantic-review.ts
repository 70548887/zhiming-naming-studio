import reviewInput from './naming-meaning-semantic-review.json';
import {canonicalPlainJson} from './plain-json';

export const M916_MEANING_REVIEW_SCHEMA='m916-meaning-semantic-review-input/1' as const;
export const M916_MEANING_REVIEW_ID='M916-D01' as const;
export const M916_MEANING_REVIEW_RULE_VERSION='naming-editorial-7.2.0' as const;
export const M916_MEANING_REVIEW_RAW_SHA256='55c0a6f9fd33b61e4a219da6d30275b9001e8bf519a33daf525ff269006555cf' as const;
export const M916_MEANING_REVIEW_INPUT_SHA256='54b0285005b1525db073deb8b9ac9fb9362aa5aefbc1b282ee2eef3fe355d095' as const;

export type MeaningReviewClassification='general'|'pending';
export interface MeaningReviewRow {
  readonly candidateId:string; readonly sourceSHA256:string; readonly rawFileSHA256:string; readonly char:string;
  readonly pinyin:string; readonly tone:number; readonly sourceId:string; readonly dictionaryWord:string; readonly sourcePOS:string;
  readonly rawEntryIndex:number; readonly rawHeteronymIndex:number; readonly rawDefinitionIndex:number; readonly dictionarySense:string;
  readonly sourceDefinition:Readonly<Record<string,unknown>>; readonly projectMeaning:string; readonly projectWish:string;
  readonly candidateThemeLabel:string; readonly themeDisposition:string; readonly classification:MeaningReviewClassification;
  readonly semanticDecision:string; readonly admissionGranted:false; readonly activation:'off'; readonly productionApproved:false;
  readonly projectMeaningBasis:string; readonly limits:readonly string[]; readonly prohibitedInferences:readonly string[];
  readonly scope:'single-character-project-intent-only'; readonly wholeNameAssessment:'not-assessed';
  readonly automaticSemanticCreditAllowed:false; readonly scoreDelta:0; readonly reviewNotes:readonly string[];
}
export interface NamingMeaningSemanticReview {
  readonly schema:typeof M916_MEANING_REVIEW_SCHEMA; readonly reviewId:typeof M916_MEANING_REVIEW_ID;
  readonly inputSHA256:typeof M916_MEANING_REVIEW_INPUT_SHA256; readonly ruleVersion:typeof M916_MEANING_REVIEW_RULE_VERSION;
  readonly contract:Readonly<Record<string,unknown>>; readonly sourceBindings:Readonly<Record<string,unknown>>;
  readonly rows:readonly MeaningReviewRow[];
  readonly summary:{readonly total:40;readonly general:38;readonly explicitTheme:0;readonly pending:2;readonly activation:'off';readonly productionApproved:false;readonly formalCoverageAdded:0;readonly defaultAutomaticSemanticCreditAllowed:false;readonly automaticSemanticCreditAllowed:false;readonly wholeNameAssessment:'not-assessed'};
}
export interface NamingMeaningSemanticReviewStatus {
  readonly schema:'m916-meaning-semantic-review-status/1'; readonly reviewId:typeof M916_MEANING_REVIEW_ID; readonly ruleVersion:typeof M916_MEANING_REVIEW_RULE_VERSION;
  readonly source:{readonly rawSHA256:typeof M916_MEANING_REVIEW_RAW_SHA256;readonly inputSHA256:typeof M916_MEANING_REVIEW_INPUT_SHA256;readonly candidateOnly:true};
  readonly counts:{readonly total:40;readonly general:38;readonly explicitTheme:0;readonly pending:2};
  readonly admission:{readonly admissionGranted:false;readonly activation:'off';readonly productionApproved:false;readonly formalCoverageAdded:0;readonly automaticSemanticCreditAllowed:false;readonly wholeNameAssessment:'not-assessed'};
  readonly pending:readonly {readonly char:string;readonly reason:string;readonly sourceSHA256:string}[];
}

function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function requireReview(value:unknown):asserts value is NamingMeaningSemanticReview{
  let actual:string;try{actual=canonicalPlainJson(value);}catch{throw new Error('M916候选审查资料格式无效。');}
  if(actual!==fixedCanonical)throw new Error('M916候选审查资料与固定版本或来源摘要不一致。');
}
const fixedReview=reviewInput as unknown as NamingMeaningSemanticReview;
const fixedCanonical=canonicalPlainJson(fixedReview);
if(fixedReview.schema!==M916_MEANING_REVIEW_SCHEMA||fixedReview.reviewId!==M916_MEANING_REVIEW_ID||fixedReview.ruleVersion!==M916_MEANING_REVIEW_RULE_VERSION||fixedReview.inputSHA256!==M916_MEANING_REVIEW_INPUT_SHA256||fixedReview.summary.total!==40||fixedReview.summary.general!==38||fixedReview.summary.explicitTheme!==0||fixedReview.summary.pending!==2||fixedReview.summary.activation!=='off'||fixedReview.summary.productionApproved!==false||fixedReview.summary.formalCoverageAdded!==0||fixedReview.summary.automaticSemanticCreditAllowed!==false||fixedReview.summary.wholeNameAssessment!=='not-assessed')throw new Error('M916候选审查固定输入不符合版本边界。');

/** Returns a detached fixed candidate review. The snapshot is candidate-only;
 * loading it never registers a source, changes coverage, or grants admission. */
export function loadNamingMeaningSemanticReview():NamingMeaningSemanticReview{return freeze(structuredClone(fixedReview));}
export function assertNamingMeaningSemanticReview(value:unknown):asserts value is NamingMeaningSemanticReview{requireReview(value);}
export function namingMeaningSemanticReviewStatus(review:NamingMeaningSemanticReview=loadNamingMeaningSemanticReview()):NamingMeaningSemanticReviewStatus{
  requireReview(review);
  return freeze({schema:'m916-meaning-semantic-review-status/1' as const,reviewId:M916_MEANING_REVIEW_ID,ruleVersion:M916_MEANING_REVIEW_RULE_VERSION,source:{rawSHA256:M916_MEANING_REVIEW_RAW_SHA256,inputSHA256:M916_MEANING_REVIEW_INPUT_SHA256,candidateOnly:true as const},counts:{total:40,general:38,explicitTheme:0,pending:2},admission:{admissionGranted:false as const,activation:'off' as const,productionApproved:false as const,formalCoverageAdded:0,automaticSemanticCreditAllowed:false as const,wholeNameAssessment:'not-assessed' as const},pending:review.rows.filter(row=>row.classification==='pending').map(row=>({char:row.char,reason:row.reviewNotes.join('；'),sourceSHA256:row.sourceSHA256}))});
}
