import {describe,expect,it} from 'vitest';
import {resolve} from 'node:path';
import {loadOfficialNamePopularityData} from '../src/main/official-name-popularity-data';
import {buildModernNamePopularityReference} from '../src/shared/modern-name-popularity-reference';

const catalog=loadOfficialNamePopularityData(resolve('data')).catalog;
const candidate=(givenName:string,meaning='现代组合寓意')=>({givenName,meaning});

describe('candidate-level historical popularity reference boundary',()=>{
  it('keeps historical records and source provenance separate from modern evidence',()=>{
    const result=buildModernNamePopularityReference(candidate('沐宸'),catalog);
    expect(result.schema).toBe('modern-name-popularity-reference/1');
    expect(result.givenName).toBe('沐宸');
    expect(result.modernEvidence.state).toBe('missing');
    expect(result.historical.records[0]).toEqual({sexCohort:'male',status:'listed',rank:1,reportedPeople:22958});
    expect(result.source).toMatchObject({id:catalog.source.id,sha256:catalog.source.sha256,reportSourceHtmlSha256:catalog.report.sourceHtmlSha256});
    expect(result.source.tableImageSha256s).toHaveLength(2);
    expect(result.sourceStatus).toBe('verified-fixed-publication');
    expect(result.sourceVerification.independentReviewRecordSha256).toBe('4880bf9bf9c21358ae1d8d65efb633baf706b8e2309596cd0d395ab073161815');
    expect(result.officialEvidence).toMatchObject({statisticalYear:2021,sourceHtmlSha256:catalog.report.sourceHtmlSha256,originalReportLicense:'unstated'});
    expect(result.readWriteBoundary).toMatchObject({readOnly:true,writesPerformed:false,persistsReference:false,writesCustomerDb:false,writesCandidate:false,writesModernEvidence:false,scoringEffect:'none',sortingEffect:'none',affectsTraditionalCore:false});
    expect(result).not.toHaveProperty('evaluation');
    expect(result.boundaries).toEqual({givenNameOnly:true,wholePopulationFullNameCount:null,currentNationalDuplicateRate:null,allBirthsCoverageRate:null,unlistedMeansZero:false,scoringEffect:'none',sortingEffect:'none',modernEvidenceDoesNotBecomePopularityEvidence:true});
  });

  it('keeps unlisted names unpublished rather than treating them as zero or unique',()=>{
    const result=buildModernNamePopularityReference(candidate('知远'),catalog);
    expect(result.historical.records).toEqual([
      {sexCohort:'male',status:'not-listed',rank:null,reportedPeople:null},
      {sexCohort:'female',status:'not-listed',rank:null,reportedPeople:null},
    ]);
    expect(result.boundaries.currentNationalDuplicateRate).toBeNull();
    expect(result.boundaries.unlistedMeansZero).toBe(false);
  });

  it('returns a frozen independent DTO and rejects accessor fields',()=>{
    const first=buildModernNamePopularityReference(candidate('若汐'),catalog);
    expect(Object.isFrozen(first)).toBe(true);expect(Object.isFrozen(first.source)).toBe(true);expect(Object.isFrozen(first.historical.records)).toBe(true);
    expect(()=>{first.source.name='changed';}).toThrow();
    const second=buildModernNamePopularityReference(candidate('若汐'),catalog);expect(second.source.name).toBe(first.source.name);
    let reads=0;const poisoned={...candidate('沐宸')};Object.defineProperty(poisoned,'givenName',{enumerable:true,get(){reads++;return '若汐';}});
    expect(()=>buildModernNamePopularityReference(poisoned,catalog)).toThrow();expect(reads).toBe(0);
  });
});
