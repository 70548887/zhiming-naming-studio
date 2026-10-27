import fixedData from '../../data/official-name-popularity.json';
import fixedLock from '../../data/official-name-popularity-source-lock.json';
import {canonicalPlainJson} from './plain-json';
import type {SourceRecord} from './types';

export const OFFICIAL_NAME_POPULARITY_DATASET_ID='mps-national-2021-registered-newborn-top10-per-sex' as const;
export const OFFICIAL_NAME_POPULARITY_DATA_VERSION='mps-2021-registered-newborn-given-name-top10-per-sex/1.0.0' as const;
export const OFFICIAL_NAME_POPULARITY_SOURCE_ID='official-name-popularity-mps-2021-fixed' as const;
export const OFFICIAL_NAME_POPULARITY_INDEPENDENT_REVIEW_RECORD_SHA256='4880bf9bf9c21358ae1d8d65efb633baf706b8e2309596cd0d395ab073161815' as const;
export type OfficialNamePopularitySexCohort='male'|'female';
export interface OfficialNamePopularityDenominator {
  published:string;nominalPeople:number;publishedResolutionPeople:1000;exactPeopleKnown:false;roundingRulePublished:false;publishedSexShare?:string;
}
export interface OfficialNamePopularityReport {
  title:string;statisticalYear:2021;publisher:string;hostName:string;url:string;visiblePublishedAt:string;urlPathDate:string;htmlMetaPubDate:string;htmlGenerationDate:string;retrievedOn:string;sourceHtmlSha256:string;
  tableImages:Array<{tableNumber:2|3;title:string;url:string;sha256:string}>;
}
export interface OfficialNamePopularityCohort {
  birthYear:2021;registeredBy:'2021-12-31';description:string;geography:string;nameUnit:'given-name-excluding-surname';
  denominators:{total:OfficialNamePopularityDenominator;male:OfficialNamePopularityDenominator;female:OfficialNamePopularityDenominator};registrationCoverageRate:null;
}
export interface OfficialNamePopularityTable {
  tableNumber:2|3;sexCohort:OfficialNamePopularitySexCohort;title:string;rows:Array<{rank:number;givenName:string;reportedPeople:number}>;
}
export interface OfficialNamePopularityCatalog {
  schemaVersion:'official-name-popularity-catalog/1.0.0';datasetId:typeof OFFICIAL_NAME_POPULARITY_DATASET_ID;dataVersion:typeof OFFICIAL_NAME_POPULARITY_DATA_VERSION;
  report:OfficialNamePopularityReport;cohort:OfficialNamePopularityCohort;tables:OfficialNamePopularityTable[];source:SourceRecord;
  limitations:string[];usage:'historical-given-name-reference-only';scoringEffect:'none';
}
export interface OfficialNamePopularityQuery {
  datasetId:string;dataVersion:string;givenName:string;sexCohorts?:OfficialNamePopularitySexCohort[];includeIndicativeShare?:boolean;
}
export interface OfficialNamePopularityRecord {
  sexCohort:OfficialNamePopularitySexCohort;status:'listed'|'not-listed';rank:number|null;reportedPeople:number|null;
  indicativeShare?:{displayPercent:string;approximate:true;denominatorPublished:string};
}
export type OfficialNamePopularityResult={
  status:'ok';givenName:string;datasetId:typeof OFFICIAL_NAME_POPULARITY_DATASET_ID;dataVersion:typeof OFFICIAL_NAME_POPULARITY_DATA_VERSION;
  report:OfficialNamePopularityReport;cohort:OfficialNamePopularityCohort;source:SourceRecord;records:OfficialNamePopularityRecord[];limitations:string[];
  boundaries:{nameUnit:'given-name-excluding-surname';wholePopulationFullNameCount:null;currentNationalDuplicateRate:null;allBirthsCoverageRate:null;unlistedMeansZero:false;scoringEffect:'none'};
}|{
  status:'unsupported-dataset';requestedDatasetId:string;requestedDataVersion:string;supportedDatasetId:typeof OFFICIAL_NAME_POPULARITY_DATASET_ID;supportedDataVersion:typeof OFFICIAL_NAME_POPULARITY_DATA_VERSION;message:string;
};

const {fileHashes:_,...source}=fixedLock.sources[0];
const expectedCatalog={...fixedData,source};
const expectedCanonical=canonicalPlainJson(expectedCatalog);

/** A catalog is the exact fixed publication, including its limitations and source identity. */
export function assertOfficialNamePopularityCatalog(value:unknown):asserts value is OfficialNamePopularityCatalog{
  let actual:string;try{actual=canonicalPlainJson(value);}catch{throw new Error('官方历史姓名统计资料只接受完整纯JSON，不得含访问器、隐藏字段或非JSON值。');}
  if(actual!==expectedCanonical)throw new Error('官方历史姓名统计资料与固定版本、人数或来源不一致。');
}
function requireInput(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}
function validUnicodeName(value:string):void{
  for(let index=0;index<value.length;index++){
    const unit=value.charCodeAt(index);
    if(unit>=0xd800&&unit<=0xdbff){const next=value.charCodeAt(++index);requireInput(next>=0xdc00&&next<=0xdfff,'给名含不完整Unicode字符，请重新输入。');}
    else requireInput(unit<0xdc00||unit>0xdfff,'给名含不完整Unicode字符，请重新输入。');
  }
  requireInput(value.length>0&&!/[\s\p{Cc}]/u.test(value),'请输入不含空白或控制字符的给名；未自动去姓或改写。');
  requireInput([...value].length<=100,'给名查询最多100个Unicode字符；未截断输入。');
}

/** Literal, local historical lookup; absence never supplies a zero or a current duplicate rate. */
export function lookupOfficialGivenName(catalog:OfficialNamePopularityCatalog,query:OfficialNamePopularityQuery):OfficialNamePopularityResult{
  assertOfficialNamePopularityCatalog(catalog);
  try{canonicalPlainJson(query);}catch{throw new Error('历史给名查询参数须为完整纯JSON，不得含访问器、隐藏字段或非JSON值。');}
  requireInput(!!query&&typeof query==='object'&&!Array.isArray(query),'历史给名查询参数无效。');
  const keys=Object.keys(query),allowed=['datasetId','dataVersion','givenName','sexCohorts','includeIndicativeShare'];
  requireInput(keys.every(key=>allowed.includes(key))&&['datasetId','dataVersion','givenName'].every(key=>Object.hasOwn(query,key)),'历史给名查询字段无效；请明确传入给名，不接受全名字段。');
  requireInput(typeof query.datasetId==='string'&&query.datasetId.length>0&&typeof query.dataVersion==='string'&&query.dataVersion.length>0,'请明确选择历史统计数据集和版本。');
  requireInput(typeof query.givenName==='string','给名必须是文字。');validUnicodeName(query.givenName);
  if(Object.hasOwn(query,'sexCohorts'))requireInput(Array.isArray(query.sexCohorts)&&query.sexCohorts.length>=1&&query.sexCohorts.length<=2&&new Set(query.sexCohorts).size===query.sexCohorts.length&&query.sexCohorts.every(sex=>sex==='male'||sex==='female'),'请选择有效且不重复的报告性别分榜。');
  if(Object.hasOwn(query,'includeIndicativeShare'))requireInput(typeof query.includeIndicativeShare==='boolean','占比显示选项必须为布尔值。');
  if(query.datasetId!==OFFICIAL_NAME_POPULARITY_DATASET_ID||query.dataVersion!==OFFICIAL_NAME_POPULARITY_DATA_VERSION)return {status:'unsupported-dataset',requestedDatasetId:query.datasetId,requestedDataVersion:query.dataVersion,supportedDatasetId:OFFICIAL_NAME_POPULARITY_DATASET_ID,supportedDataVersion:OFFICIAL_NAME_POPULARITY_DATA_VERSION,message:'该历史统计数据集或版本不可用，未以其他年份替代。'};
  const cohorts:OfficialNamePopularitySexCohort[]=query.sexCohorts??['male','female'];
  const records=cohorts.map((sexCohort):OfficialNamePopularityRecord=>{
    const row=catalog.tables.find(table=>table.sexCohort===sexCohort)!.rows.find(item=>item.givenName===query.givenName);
    if(!row)return {sexCohort,status:'not-listed',rank:null,reportedPeople:null};
    const result:OfficialNamePopularityRecord={sexCohort,status:'listed',rank:row.rank,reportedPeople:row.reportedPeople};
    if(query.includeIndicativeShare){const denominator=catalog.cohort.denominators[sexCohort];result.indicativeShare={displayPercent:(row.reportedPeople*100/denominator.nominalPeople).toFixed(2)+'%',approximate:true,denominatorPublished:denominator.published};}
    return result;
  });
  return {status:'ok',givenName:query.givenName,datasetId:catalog.datasetId,dataVersion:catalog.dataVersion,report:structuredClone(catalog.report),cohort:structuredClone(catalog.cohort),source:structuredClone(catalog.source),records,limitations:[...catalog.limitations],boundaries:{nameUnit:'given-name-excluding-surname',wholePopulationFullNameCount:null,currentNationalDuplicateRate:null,allBirthsCoverageRate:null,unlistedMeansZero:false,scoringEffect:'none'}};
}
