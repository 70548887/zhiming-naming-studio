import {describe, expect, it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import packageJson from '../package.json';
import catalog from '../data/official-name-popularity.json';
import lock from '../data/official-name-popularity-source-lock.json';
import {buildModernNamePopularityReference} from '../src/shared/modern-name-popularity-reference';
import {loadOfficialNamePopularityData} from '../src/main/official-name-popularity-data';

const sha = (value: Buffer | string) => crypto.createHash('sha256').update(value).digest('hex');
const root = path.resolve('.');
const read = (relative: string) => fs.readFileSync(path.join(root, relative));
const source = lock.sources[0];

describe('M723 modern metrics package and source closure', () => {
  it('declares all canonical official 2021 files in the package resource list', () => {
    const files = (packageJson as {build: {files: string[]}}).build.files;
    expect(files).toEqual(expect.arrayContaining([
      'data/official-name-popularity.json',
      'data/official-name-popularity-source-lock.json',
      'data/official-name-popularity-NOTICE.md',
    ]));
  });

  it('passes the source-lock hash chain from files to canonical catalog', () => {
    expect(sha(read('data/official-name-popularity-source-lock.json'))).toBe('42c2b7169edfe0ae1557068196488139d3bca48d4cde147d6eb1caf43f5680db');
    expect(source.files).toEqual(['data/official-name-popularity-NOTICE.md', 'data/official-name-popularity.json']);
    for (const [file, expected] of Object.entries(source.fileHashes)) expect(sha(read(file)).toLowerCase()).toBe(expected);
    expect(source.sha256).toBe(sha(JSON.stringify(source.fileHashes)));
    expect(catalog.schemaVersion).toBe('official-name-popularity-catalog/1.0.0');
    expect(catalog.datasetId).toBe('mps-national-2021-registered-newborn-top10-per-sex');
    expect(catalog.dataVersion).toBe('mps-2021-registered-newborn-given-name-top10-per-sex/1.0.0');
  });

  it('retains the official 2021 evidence strings in the shipped NOTICE', () => {
    const notice = read('data/official-name-popularity-NOTICE.md').toString('utf8');
    expect(notice).toContain('统计出生年2021，登记截止2021-12-31');
    expect(notice).toContain('原HTML SHA256：ba66436cb672da2f428b5f201a380049f9c445bb70ccdace84f50592129f18d8');
    expect(notice).toContain('独立盲录审阅记录 SHA256：4880bf9bf9c21358ae1d8d65efb633baf706b8e2309596cd0d395ab073161815');
    expect(notice).toContain('本包不影响命名评分');
    const reviewed = JSON.parse(read('tests/fixtures/official-name-popularity-2021-reviewed.json').toString('utf8')) as {provenance?: {independentRecordSha256?: string}};
    expect(reviewed.provenance?.independentRecordSha256).toBe('4880bf9bf9c21358ae1d8d65efb633baf706b8e2309596cd0d395ab073161815');
  });

  it('propagates M706 source verification and read/write boundaries without changing the catalog', () => {
    const loaded = loadOfficialNamePopularityData(path.join(root, 'data')).catalog;
    const before = JSON.stringify(loaded);
    const dto = buildModernNamePopularityReference({givenName: '沐宸', meaning: 'M723 contract'}, loaded);
    expect(dto.sourceStatus).toBe('verified-fixed-publication');
    expect(dto.sourceVerification).toMatchObject({status: 'canonical-fixed-local', catalogSchema: 'official-name-popularity-catalog/1.0.0', sourceId: source.id, sourceSha256: source.sha256, verifiedReadOnly: true});
    expect(dto.sourceVerification.reportHtmlSha256).toBe(catalog.report.sourceHtmlSha256);
    expect(dto.sourceVerification.tableImageSha256s).toEqual(catalog.report.tableImages.map(row => row.sha256));
    expect(dto.sourceVerification.independentReviewRecordSha256).toBe('4880bf9bf9c21358ae1d8d65efb633baf706b8e2309596cd0d395ab073161815');
    expect(dto.readWriteBoundary).toMatchObject({readOnly: true, writesPerformed: false, persistsReference: false, writesCustomerDb: false, writesCandidate: false, writesModernEvidence: false, scoringEffect: 'none', sortingEffect: 'none', affectsTraditionalCore: false});
    expect(JSON.stringify(loaded)).toBe(before);
  });

  it('does not claim package evidence is a current nationwide duplicate-rate metric', () => {
    const dto = buildModernNamePopularityReference({givenName: '知远', meaning: 'M723 boundary'}, loadOfficialNamePopularityData(path.join(root, 'data')).catalog);
    expect(dto.boundaries.currentNationalDuplicateRate).toBeNull();
    expect(dto.boundaries.wholePopulationFullNameCount).toBeNull();
    expect(dto.boundaries.unlistedMeansZero).toBe(false);
    expect(dto.readWriteBoundary.affectsTraditionalCore).toBe(false);
    expect(dto.historical.limitations.join('')).toContain('不是当前全国全名重名率');
  });

  it('keeps the modern DTO source fields independent from package paths', () => {
    const dto = buildModernNamePopularityReference({givenName: '若汐', meaning: 'M723 no path'}, loadOfficialNamePopularityData(path.join(root, 'data')).catalog);
    expect(JSON.stringify(dto)).not.toContain('D:/');
    expect(JSON.stringify(dto)).not.toContain('E:/');
    expect(dto.source.files).toEqual(['data/official-name-popularity-NOTICE.md', 'data/official-name-popularity.json']);
  });
});
