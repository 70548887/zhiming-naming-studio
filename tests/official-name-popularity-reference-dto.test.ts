import {describe,expect,it} from 'vitest';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {loadOfficialNamePopularityData} from '../src/main/official-name-popularity-data';
import {lookupOfficialGivenName} from '../src/shared/official-name-popularity';
import {assertOfficialNamePopularityReferenceDTO,createOfficialNamePopularityReferenceDTO,lookupOfficialNamePopularityReference} from '../src/shared/official-name-popularity-reference';

const catalog=loadOfficialNamePopularityData(resolve('data')).catalog;
const dto=createOfficialNamePopularityReferenceDTO(catalog);
const query=(givenName:string,sexCohorts?:('male'|'female')[])=>sexCohorts?{givenName,sexCohorts}:{givenName};

describe('M916 browser-compatible official historical popularity DTO consumer',()=>{
 it('emits a detached frozen DTO for the fixed 2021 registered-newborn given-name tables',()=>{
  expect(dto).toMatchObject({schemaVersion:'official-name-popularity-reference-dto/1.1.0',datasetId:'mps-national-2021-registered-newborn-top10-per-sex',dataVersion:'mps-2021-registered-newborn-given-name-top10-per-sex/1.0.0',historicalScope:{statisticalYear:2021,birthYear:2021,registeredBy:'2021-12-31',nameUnit:'given-name-excluding-surname'}});
  expect(dto.tables).toHaveLength(2);expect(dto.tables.every(table=>table.rows)).toBe(true);expect(dto.tables.flatMap(table=>table.rows)).toHaveLength(20);
  expect(Object.isFrozen(dto)).toBe(true);expect(Object.isFrozen(dto.tables[0])).toBe(true);expect(Object.isFrozen(dto.tables[0].rows[0])).toBe(true);
  expect(dto.boundaries).toMatchObject({currentNationalDuplicateRate:null,wholePopulationFullNameCount:null,allBirthsCoverageRate:null,scoringEffect:'none',unlistedMeansZero:false});
  expect(dto).not.toHaveProperty('integritySha256');expect(dto.tables).not.toBe(catalog.tables);expect(dto.tables[0].rows[0]).not.toBe(catalog.tables[0].rows[0]);
 });
 it('keeps exact listed facts and null absence without current duplicate-rate claims',()=>{
  const first=lookupOfficialNamePopularityReference(dto,query('沐宸'));if(first.records[0].status!=='listed')throw new Error('fixture');
  expect(first.records).toEqual([{sexCohort:'male',status:'listed',rank:1,reportedPeople:22958},{sexCohort:'female',status:'not-listed',rank:null,reportedPeople:null}]);
  const absent=lookupOfficialNamePopularityReference(dto,query('知远'));expect(absent.records.every(row=>row.status==='not-listed'&&row.reportedPeople===null)).toBe(true);expect(absent.boundaries.currentNationalDuplicateRate).toBeNull();
  expect(absent.limitations.join('')).toContain('不是当前全国全名重名率');
 });
 it('preserves requested cohort order and rejects full-name or unsupported cohort input',()=>{
  expect(lookupOfficialNamePopularityReference(dto,query('若汐',['female'])).records).toHaveLength(1);
  expect(lookupOfficialNamePopularityReference(dto,query('沐宸',['female','male'])).records.map(row=>row.sexCohort)).toEqual(['female','male']);
  for(const bad of [{fullName:'王沐宸'},{sexCohorts:[]},{sexCohorts:['male','male']},{sexCohorts:['other']},{givenName:' '}])expect(()=>lookupOfficialNamePopularityReference(dto,bad as never)).toThrow();
 });
 it('returns detached results and never changes the catalog or DTO',()=>{
  const before=JSON.stringify(dto),result=lookupOfficialNamePopularityReference(dto,query('沐宸'));expect(()=>((result.source as {name:string}).name='changed')).toThrow();expect(()=>((result.limitations as string[]).length=0)).toThrow();
  expect(JSON.stringify(dto)).toBe(before);expect(Object.isFrozen(result)).toBe(true);expect(Object.isFrozen(result.records)).toBe(true);
 });
 it('rejects tampered DTO metadata before presenting historical facts',()=>{
  for(const mutate of [(value:any)=>{value.datasetId='latest';},(value:any)=>{value.historicalScope.registeredBy='2026-12-31';},(value:any)=>{value.tables[0].rows[0].reportedPeople=0;}]){const changed=structuredClone(dto);mutate(changed);expect(()=>lookupOfficialNamePopularityReference(changed as never,query('沐宸'))).toThrow();}
 });
 it('compares fixed content instead of trusting a caller-recomputed digest or approval field',()=>{
  const changed=structuredClone(dto);Object.assign(changed.tables[0].rows[0],{reportedPeople:1});
  const counterfeit={...changed,integritySha256:createHash('sha256').update(JSON.stringify(changed)).digest('hex')};
  expect(()=>lookupOfficialNamePopularityReference(counterfeit,query('沐宸'))).toThrow('固定版本');
  const claimed={...dto,approved:true};expect(()=>lookupOfficialNamePopularityReference(claimed,query('沐宸'))).toThrow('固定版本');
  expect(()=>lookupOfficialNamePopularityReference({...dto,schemaVersion:'official-name-popularity-reference-dto/1.0.0'} as never,query('沐宸'))).toThrow('固定版本');
  expect(lookupOfficialNamePopularityReference(structuredClone(dto),query('沐宸'))).toEqual(lookupOfficialNamePopularityReference(dto,query('沐宸')));
  const catalogChanged=structuredClone(catalog);catalogChanged.tables[0].rows[0].reportedPeople=1;catalogChanged.source.sha256=createHash('sha256').update(JSON.stringify(catalogChanged.tables)).digest('hex');
  expect(()=>createOfficialNamePopularityReferenceDTO(catalogChanged)).toThrow('固定版本');
 });
 it('retains the established Unicode, exact-glyph and cohort lookup contract',()=>{
  for(const givenName of ['沐宸','沐辰','艺涵','藝涵','知远','王沐宸','𠮷','<script>文本</script>']){
   const actual=lookupOfficialNamePopularityReference(dto,query(givenName)),old=lookupOfficialGivenName(catalog,{datasetId:catalog.datasetId,dataVersion:catalog.dataVersion,givenName});
   if(old.status!=='ok')throw Error('fixed catalog');expect(actual.records).toEqual(old.records);expect(actual.givenName).toBe(givenName);expect(actual.boundaries).toEqual(old.boundaries);
  }
  for(const givenName of ['',' ','沐宸 ','沐\n宸','\ud800','\udc00','名'.repeat(101)])expect(()=>lookupOfficialNamePopularityReference(dto,query(givenName))).toThrow();
  for(const extra of [{sexCohorts:null},{sexCohorts:undefined},{includeIndicativeShare:true},{fullName:'林沐宸'}])expect(()=>lookupOfficialNamePopularityReference(dto,{givenName:'沐宸',...extra} as never)).toThrow();
 });
 it('rejects DTO/query accessors and inherited or hidden inputs without invoking getters',()=>{
  let getters=0;const poisoned=structuredClone(dto);Object.defineProperty(poisoned.tables[0].rows[0],'reportedPeople',{enumerable:true,get(){getters++;return 1;}});
  expect(()=>assertOfficialNamePopularityReferenceDTO(poisoned)).toThrow();
  const request=query('沐宸');Object.defineProperty(request,'givenName',{enumerable:true,get(){getters++;return '若汐';}});
  expect(()=>lookupOfficialNamePopularityReference(dto,request)).toThrow();expect(getters).toBe(0);
  const hidden=query('沐宸');Object.defineProperty(hidden,'secret',{value:true,enumerable:false});
  for(const request of [hidden,Object.create(query('沐宸')),Object.assign(Object.create({inherited:true}),query('沐宸'))])expect(()=>lookupOfficialNamePopularityReference(dto,request)).toThrow();
 });
});
