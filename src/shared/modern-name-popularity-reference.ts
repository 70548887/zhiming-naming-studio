import type {NameCandidate} from './types';
import {lookupOfficialGivenName,OFFICIAL_NAME_POPULARITY_INDEPENDENT_REVIEW_RECORD_SHA256,type OfficialNamePopularityCatalog,type OfficialNamePopularityResult} from './official-name-popularity';
import {modernRecordView,type ModernRecordView} from './modern-practical-evidence';

export const MODERN_NAME_POPULARITY_REFERENCE_SCHEMA='modern-name-popularity-reference/1' as const;

type HistoricalResult=Extract<OfficialNamePopularityResult,{status:'ok'}>;
export interface ModernNamePopularityReference {
  schema:typeof MODERN_NAME_POPULARITY_REFERENCE_SCHEMA;
  givenName:string;
  modernEvidence:{state:ModernRecordView['state'];label:string;notice:string};
  historical:Pick<HistoricalResult,'status'|'givenName'|'datasetId'|'dataVersion'|'report'|'cohort'|'records'|'limitations'|'boundaries'>;
  source:{id:string;name:string;url:string;commit:string;license:string;files:readonly string[];sha256:string;note:string;reportSourceHtmlSha256:string;tableImageSha256s:readonly string[]};
  sourceStatus:'verified-fixed-publication';
  sourceVerification:{status:'canonical-fixed-local';catalogSchema:'official-name-popularity-catalog/1.0.0';dataVersion:string;sourceId:string;sourceSha256:string;reportHtmlSha256:string;tableImageSha256s:readonly string[];independentReviewRecordSha256:string;verifiedReadOnly:true};
  officialEvidence:{statisticalYear:2021;visiblePublishedAt:string;retrievedOn:string;publisher:string;reportTitle:string;sourceHtmlSha256:string;tableImageSha256s:readonly string[];originalReportLicense:'unstated'};
  readWriteBoundary:{readOnly:true;writesPerformed:false;persistsReference:false;writesCustomerDb:false;writesCandidate:false;writesModernEvidence:false;scoringEffect:'none';sortingEffect:'none';affectsTraditionalCore:false;wholePopulationFullNameCount:null;currentNationalDuplicateRate:null;allBirthsCoverageRate:null;unlistedMeansZero:false};
  boundaries:{givenNameOnly:true;wholePopulationFullNameCount:null;currentNationalDuplicateRate:null;allBirthsCoverageRate:null;unlistedMeansZero:false;scoringEffect:'none';sortingEffect:'none';modernEvidenceDoesNotBecomePopularityEvidence:true};
}

const freeze=(value:any):any=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function requireInput(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}

type CandidateInput=Pick<NameCandidate,'givenName'|'meaning'|'modernPracticalEvidence'>;
function candidateInput(candidate:CandidateInput):CandidateInput{
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))throw new Error('现代姓名参考需要候选对象。');
  const givenName=Object.getOwnPropertyDescriptor(candidate,'givenName'),meaning=Object.getOwnPropertyDescriptor(candidate,'meaning');
  if(!givenName||!('value'in givenName)||!givenName.enumerable||typeof givenName.value!=='string')throw new Error('候选给名必须是普通数据字段。');
  if(!meaning||!('value'in meaning)||!meaning.enumerable||typeof meaning.value!=='string')throw new Error('候选寓意必须是普通数据字段。');
  const evidence=Object.getOwnPropertyDescriptor(candidate,'modernPracticalEvidence');
  if(evidence&&!('value'in evidence)||evidence&&!evidence.enumerable)throw new Error('现代证据字段不接受访问器。');
  const normalized:CandidateInput={givenName:givenName.value,meaning:meaning.value};
  if(evidence&&'value'in evidence)normalized.modernPracticalEvidence=evidence.value;
  return normalized;
}

/**
 * Candidate-level historical popularity reference. The historical catalog and
 * saved modern evidence remain separate facts; this DTO adds no population,
 * scoring, ordering, or whole-name inference.
 */
export function buildModernNamePopularityReference(candidate:Pick<NameCandidate,'givenName'|'meaning'|'modernPracticalEvidence'>,catalog:OfficialNamePopularityCatalog):ModernNamePopularityReference{
  const input=candidateInput(candidate);
  const result=lookupOfficialGivenName(catalog,{datasetId:catalog.datasetId,dataVersion:catalog.dataVersion,givenName:input.givenName});
  requireInput(result.status==='ok','固定历史姓名统计查询未返回可用结果。');
  const historical=result as HistoricalResult;
  const modern=modernRecordView(input);
  return freeze({
    schema:MODERN_NAME_POPULARITY_REFERENCE_SCHEMA,
    givenName:input.givenName,
    modernEvidence:{state:modern.state,label:modern.label,notice:modern.notice},
    historical:{status:historical.status,givenName:historical.givenName,datasetId:historical.datasetId,dataVersion:historical.dataVersion,report:structuredClone(historical.report),cohort:structuredClone(historical.cohort),records:structuredClone(historical.records),limitations:[...historical.limitations],boundaries:structuredClone(historical.boundaries)},
    source:{id:historical.source.id,name:historical.source.name,url:historical.source.url,commit:historical.source.commit,license:historical.source.license,files:[...historical.source.files],sha256:historical.source.sha256,note:historical.source.note,reportSourceHtmlSha256:historical.report.sourceHtmlSha256,tableImageSha256s:historical.report.tableImages.map(image=>image.sha256)},
    sourceStatus:'verified-fixed-publication',
    sourceVerification:{status:'canonical-fixed-local',catalogSchema:'official-name-popularity-catalog/1.0.0',dataVersion:historical.dataVersion,sourceId:historical.source.id,sourceSha256:historical.source.sha256,reportHtmlSha256:historical.report.sourceHtmlSha256,tableImageSha256s:historical.report.tableImages.map(image=>image.sha256),independentReviewRecordSha256:OFFICIAL_NAME_POPULARITY_INDEPENDENT_REVIEW_RECORD_SHA256,verifiedReadOnly:true},
    officialEvidence:{statisticalYear:historical.report.statisticalYear,visiblePublishedAt:historical.report.visiblePublishedAt,retrievedOn:historical.report.retrievedOn,publisher:historical.report.publisher,reportTitle:historical.report.title,sourceHtmlSha256:historical.report.sourceHtmlSha256,tableImageSha256s:historical.report.tableImages.map(image=>image.sha256),originalReportLicense:'unstated'},
    readWriteBoundary:{readOnly:true,writesPerformed:false,persistsReference:false,writesCustomerDb:false,writesCandidate:false,writesModernEvidence:false,scoringEffect:'none',sortingEffect:'none',affectsTraditionalCore:false,wholePopulationFullNameCount:null,currentNationalDuplicateRate:null,allBirthsCoverageRate:null,unlistedMeansZero:false},
    boundaries:{givenNameOnly:true,wholePopulationFullNameCount:null,currentNationalDuplicateRate:null,allBirthsCoverageRate:null,unlistedMeansZero:false,scoringEffect:'none',sortingEffect:'none',modernEvidenceDoesNotBecomePopularityEvidence:true},
  });
}
