import {describe,expect,it} from 'vitest';
import {resolve} from 'node:path';
import {loadOfficialNamePopularityData} from '../src/main/official-name-popularity-data';
import {lookupOfficialGivenName,OFFICIAL_NAME_POPULARITY_DATASET_ID,OFFICIAL_NAME_POPULARITY_DATA_VERSION,type OfficialNamePopularityQuery} from '../src/shared/official-name-popularity';

const catalog=loadOfficialNamePopularityData(resolve('data')).catalog;
const query=(givenName:string,extra:Partial<OfficialNamePopularityQuery>={})=>({datasetId:OFFICIAL_NAME_POPULARITY_DATASET_ID,dataVersion:OFFICIAL_NAME_POPULARITY_DATA_VERSION,givenName,...extra});

describe('literal historical given-name reference lookup',()=>{
 it('keeps homophones separate and leaves the other-sex count unpublished',()=>{
  const first=lookupOfficialGivenName(catalog,query('沐宸')),second=lookupOfficialGivenName(catalog,query('沐辰'));
  expect(first.status).toBe('ok');expect(second.status).toBe('ok');if(first.status!=='ok'||second.status!=='ok')throw new Error('fixture');
  expect(first.records).toEqual([{sexCohort:'male',status:'listed',rank:1,reportedPeople:22958},{sexCohort:'female',status:'not-listed',rank:null,reportedPeople:null}]);expect(second.records[0].reportedPeople).toBe(15660);
  expect(first.givenName).toBe('沐宸');expect(first.cohort.registeredBy).toBe('2021-12-31');expect(first.report.statisticalYear).toBe(2021);expect(first.boundaries.currentNationalDuplicateRate).toBeNull();
 });
 it.each(['知远','王沐宸','藝涵','𠮷','若溪'])('does not make zero/unique claims, remove surnames or normalize variants for %s',name=>{
  const result=lookupOfficialGivenName(catalog,query(name));expect(result.status).toBe('ok');if(result.status!=='ok')throw new Error('fixture');expect(result.givenName).toBe(name);expect(result.records.every(row=>row.status==='not-listed'&&row.rank===null&&row.reportedPeople===null)).toBe(true);expect(result.boundaries).toMatchObject({wholePopulationFullNameCount:null,currentNationalDuplicateRate:null,allBirthsCoverageRate:null,unlistedMeansZero:false,scoringEffect:'none'});
 });
 it('shows optional approximate cohort shares only when explicitly requested, retaining rounded denominator text',()=>{
  const plain=lookupOfficialGivenName(catalog,query('若汐')),shown=lookupOfficialGivenName(catalog,query('若汐',{sexCohorts:['female'],includeIndicativeShare:true}));
  if(plain.status!=='ok'||shown.status!=='ok')throw new Error('fixture');expect(plain.records.every(row=>!Object.hasOwn(row,'indicativeShare'))).toBe(true);expect(shown.records[0].indicativeShare).toEqual({displayPercent:'0.44%',approximate:true,denominatorPublished:'419.2万'});
 });
 it('does not silently substitute a current or unknown report/version',()=>{
  for(const change of [{datasetId:'latest'},{dataVersion:'2026'},{datasetId:OFFICIAL_NAME_POPULARITY_DATASET_ID.toUpperCase()}])expect(lookupOfficialGivenName(catalog,query('若汐',change))).toMatchObject({status:'unsupported-dataset',supportedDatasetId:OFFICIAL_NAME_POPULARITY_DATASET_ID,supportedDataVersion:OFFICIAL_NAME_POPULARITY_DATA_VERSION});
 });
 it.each(['',' ','沐宸 ','沐\n宸','\ud800','\udc00','沐\ud800宸','名'.repeat(101)])('rejects malformed input without trimming, truncating or repairing it: %j',name=>{expect(()=>lookupOfficialGivenName(catalog,query(name))).toThrow();});
 it.each([{sexCohorts:[]},{sexCohorts:['male','male']},{sexCohorts:['other']},{sexCohorts:null},{includeIndicativeShare:1},{fullName:'王沐宸'},{givenName:23}])('rejects unsupported query structure: %j',value=>{expect(()=>lookupOfficialGivenName(catalog,{...query('沐宸'),...value} as never)).toThrow();});
 it('rejects poisoned catalog/query objects without invoking accessors',()=>{
  let reads=0;const poisoned=structuredClone(catalog);Object.defineProperty(poisoned.tables[0].rows[0],'reportedPeople',{enumerable:true,get(){reads++;return 0;}});expect(()=>lookupOfficialGivenName(poisoned,query('沐宸'))).toThrow();
  const input=query('沐宸');Object.defineProperty(input,'givenName',{enumerable:true,get(){reads++;return '若汐';}});expect(()=>lookupOfficialGivenName(catalog,input)).toThrow();expect(reads).toBe(0);
  expect(()=>lookupOfficialGivenName(catalog,Object.assign(Object.create({inherited:true}),query('沐宸')))).toThrow();expect(()=>lookupOfficialGivenName(catalog,JSON.parse('{"datasetId":"'+OFFICIAL_NAME_POPULARITY_DATASET_ID+'","dataVersion":"'+OFFICIAL_NAME_POPULARITY_DATA_VERSION+'","givenName":"沐宸","__proto__":{}}'))).toThrow();
 });
 it('rejects deleted limitations or falsified metadata instead of presenting the result as official',()=>{
  for(const mutate of [(value:any)=>value.limitations.pop(),(value:any)=>value.report.statisticalYear=2026,(value:any)=>value.tables[0].rows[0].reportedPeople=23000,(value:any)=>value.source.url='https://example.invalid']){const changed=structuredClone(catalog);mutate(changed);expect(()=>lookupOfficialGivenName(changed,query('沐宸'))).toThrow('不一致');}
 });
 it('returns independent result copies and leaves the input catalog byte-equal',()=>{
  const before=JSON.stringify(catalog),result=lookupOfficialGivenName(catalog,query('若汐'));if(result.status!=='ok')throw new Error('fixture');result.source.name='changed';result.cohort.denominators.female.published='0万';result.limitations.length=0;expect(JSON.stringify(catalog)).toBe(before);expect(lookupOfficialGivenName(catalog,query('若汐'))).not.toEqual(result);
 });
});
