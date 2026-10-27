import {canonicalPlainJson} from './plain-json';
import fixedData from '../../data/official-name-popularity.json';
import fixedLock from '../../data/official-name-popularity-source-lock.json';
import {assertOfficialNamePopularityCatalog,lookupOfficialGivenName,type OfficialNamePopularityCatalog,type OfficialNamePopularitySexCohort} from './official-name-popularity';

export const OFFICIAL_NAME_POPULARITY_REFERENCE_SCHEMA='official-name-popularity-reference-dto/1.1.0' as const;
export interface OfficialNamePopularityReferenceDTO {
  readonly schemaVersion:typeof OFFICIAL_NAME_POPULARITY_REFERENCE_SCHEMA;
  readonly datasetId:OfficialNamePopularityCatalog['datasetId'];
  readonly dataVersion:OfficialNamePopularityCatalog['dataVersion'];
  readonly historicalScope:{readonly statisticalYear:2021;readonly birthYear:2021;readonly registeredBy:'2021-12-31';readonly nameUnit:'given-name-excluding-surname';readonly geography:string};
  readonly tables:ReadonlyArray<{readonly tableNumber:2|3;readonly sexCohort:OfficialNamePopularitySexCohort;readonly title:string;readonly rows:ReadonlyArray<{readonly rank:number;readonly givenName:string;readonly reportedPeople:number}>}>;
  readonly source:{readonly id:string;readonly name:string;readonly url:string;readonly commit:string;readonly sha256:string;readonly license:string;readonly note:string};
  readonly limitations:ReadonlyArray<string>;
  readonly boundaries:{readonly nameUnit:'given-name-excluding-surname';readonly currentNationalDuplicateRate:null;readonly wholePopulationFullNameCount:null;readonly allBirthsCoverageRate:null;readonly scoringEffect:'none';readonly unlistedMeansZero:false};
}
export interface OfficialNamePopularityReferenceQuery {readonly givenName:string;readonly sexCohorts?:ReadonlyArray<OfficialNamePopularitySexCohort>}
export interface OfficialNamePopularityReferenceRecord {readonly sexCohort:OfficialNamePopularitySexCohort;readonly status:'listed'|'not-listed';readonly rank:number|null;readonly reportedPeople:number|null}
export interface OfficialNamePopularityReferenceResult {readonly schemaVersion:'official-name-popularity-reference-result/1.0.0';readonly givenName:string;readonly datasetId:OfficialNamePopularityReferenceDTO['datasetId'];readonly dataVersion:OfficialNamePopularityReferenceDTO['dataVersion'];readonly records:ReadonlyArray<OfficialNamePopularityReferenceRecord>;readonly historicalScope:OfficialNamePopularityReferenceDTO['historicalScope'];readonly source:OfficialNamePopularityReferenceDTO['source'];readonly limitations:ReadonlyArray<string>;readonly boundaries:OfficialNamePopularityReferenceDTO['boundaries']}

function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function requireInput(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}

function projectCatalog(catalog:OfficialNamePopularityCatalog):OfficialNamePopularityReferenceDTO{
  return {schemaVersion:OFFICIAL_NAME_POPULARITY_REFERENCE_SCHEMA,datasetId:catalog.datasetId,dataVersion:catalog.dataVersion,historicalScope:{statisticalYear:catalog.report.statisticalYear,birthYear:catalog.cohort.birthYear,registeredBy:catalog.cohort.registeredBy,nameUnit:catalog.cohort.nameUnit,geography:catalog.cohort.geography},tables:catalog.tables.map(table=>({tableNumber:table.tableNumber,sexCohort:table.sexCohort,title:table.title,rows:table.rows.map(row=>({rank:row.rank,givenName:row.givenName,reportedPeople:row.reportedPeople}))})),source:{id:catalog.source.id,name:catalog.source.name,url:catalog.source.url,commit:catalog.source.commit,sha256:catalog.source.sha256,license:catalog.source.license,note:catalog.source.note},limitations:[...catalog.limitations],boundaries:{nameUnit:'given-name-excluding-surname',currentNationalDuplicateRate:null,wholePopulationFullNameCount:null,allBirthsCoverageRate:null,scoringEffect:'none',unlistedMeansZero:false}};
}
const {fileHashes:_,...fixedSource}=fixedLock.sources[0];
const fixedCatalog:OfficialNamePopularityCatalog=(()=>{const value={...fixedData,source:fixedSource};assertOfficialNamePopularityCatalog(value);return freeze(value);})();
const expectedReferenceCanonical=canonicalPlainJson(projectCatalog(fixedCatalog));

/** Browser contract equality, not source authentication. Source bytes/locks are
 * still checked by the main loader and its existing catalog bridge. There is no
 * caller-controlled digest, approval flag or callback that can authorize facts. */
export function assertOfficialNamePopularityReferenceDTO(value:unknown):asserts value is OfficialNamePopularityReferenceDTO{
  let canonical:string;try{canonical=canonicalPlainJson(value);}catch{throw new Error('历史姓名统计DTO须为完整纯JSON，不得含访问器或隐藏字段。');}
  requireInput(canonical===expectedReferenceCanonical,'历史姓名统计DTO与固定版本、人数或来源不一致。');
}
/** Project only an already validated fixed catalog, keeping every result
 * detached and immutable; the projection grants no new source authority. */
export function createOfficialNamePopularityReferenceDTO(catalog:OfficialNamePopularityCatalog):OfficialNamePopularityReferenceDTO{
  assertOfficialNamePopularityCatalog(catalog);return freeze(projectCatalog(catalog));
}
/** Literal historical lookup. Reuse the established query validator so Unicode,
 * cohort selection and missing counts retain their existing product semantics. */
export function lookupOfficialNamePopularityReference(dto:OfficialNamePopularityReferenceDTO,query:OfficialNamePopularityReferenceQuery):OfficialNamePopularityReferenceResult{
  assertOfficialNamePopularityReferenceDTO(dto);
  try{canonicalPlainJson(query);}catch{throw new Error('历史给名查询参数须为完整纯JSON，不得含访问器或隐藏字段。');}
  requireInput(query!==null&&typeof query==='object'&&!Array.isArray(query),'历史给名查询参数无效。');
  const keys=Object.keys(query as object);requireInput(keys.every(key=>key==='givenName'||key==='sexCohorts')&&Object.hasOwn(query,'givenName'),'历史给名查询字段无效。');
  const result=lookupOfficialGivenName(fixedCatalog,{datasetId:dto.datasetId,dataVersion:dto.dataVersion,givenName:query.givenName,...(Object.hasOwn(query,'sexCohorts')?{sexCohorts:query.sexCohorts as OfficialNamePopularitySexCohort[]}:{} )});
  requireInput(result.status==='ok','固定历史统计数据集不可用。');
  return freeze(structuredClone({schemaVersion:'official-name-popularity-reference-result/1.0.0' as const,givenName:result.givenName,datasetId:dto.datasetId,dataVersion:dto.dataVersion,records:result.records,historicalScope:dto.historicalScope,source:dto.source,limitations:dto.limitations,boundaries:dto.boundaries}));
}
