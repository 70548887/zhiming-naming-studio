import {describe, expect, it} from 'vitest';
import {resolve} from 'node:path';
import {loadOfficialNamePopularityData} from '../src/main/official-name-popularity-data';
import {buildModernNamePopularityReference} from '../src/shared/modern-name-popularity-reference';

const catalog = loadOfficialNamePopularityData(resolve('data')).catalog;
const candidate = (givenName: string) => ({givenName, meaning: '现代指标只读测试'});

describe('M706 modern naming metrics evidence closure', () => {
  it('carries explicit fixed-publication status and official 2021 evidence', () => {
    const dto = buildModernNamePopularityReference(candidate('沐宸'), catalog);
    expect(dto.sourceStatus).toBe('verified-fixed-publication');
    expect(dto.officialEvidence).toMatchObject({statisticalYear: 2021, visiblePublishedAt: catalog.report.visiblePublishedAt, retrievedOn: catalog.report.retrievedOn, sourceHtmlSha256: catalog.report.sourceHtmlSha256, originalReportLicense: 'unstated'});
    expect(dto.sourceVerification).toMatchObject({status:'canonical-fixed-local',catalogSchema:'official-name-popularity-catalog/1.0.0',sourceId:catalog.source.id,sourceSha256:catalog.source.sha256,independentReviewRecordSha256:'4880bf9bf9c21358ae1d8d65efb633baf706b8e2309596cd0d395ab073161815',verifiedReadOnly:true});
    expect(dto.officialEvidence.tableImageSha256s).toEqual(catalog.report.tableImages.map(row => row.sha256));
  });

  it('exposes a read/write boundary that cannot become scoring or current duplicate evidence', () => {
    const dto = buildModernNamePopularityReference(candidate('若汐'), catalog);
    expect(dto.readWriteBoundary).toEqual({readOnly: true, writesPerformed:false, persistsReference:false, writesCustomerDb: false, writesCandidate: false, writesModernEvidence: false, scoringEffect: 'none', sortingEffect: 'none', affectsTraditionalCore:false, wholePopulationFullNameCount: null, currentNationalDuplicateRate: null, allBirthsCoverageRate: null, unlistedMeansZero: false});
    expect(dto.boundaries.currentNationalDuplicateRate).toBeNull();
    expect(dto.boundaries.wholePopulationFullNameCount).toBeNull();
    expect(dto.boundaries.unlistedMeansZero).toBe(false);
  });

  it('keeps the canonical catalog and source identity unchanged after DTO construction', () => {
    const before = JSON.stringify(catalog), dto = buildModernNamePopularityReference(candidate('知远'), catalog);
    expect(dto.historical.records.every(row => row.status === 'not-listed' && row.reportedPeople === null)).toBe(true);
    expect(JSON.stringify(catalog)).toBe(before);
  });
});
