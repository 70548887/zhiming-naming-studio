import { describe, expect, it } from 'vitest';
import { sessionSourcesReport } from '../src/main/session-sources-report';
import type { NamingSession } from '../src/shared/types';

const session = (status?: 'verified-builtin'|'verified-archive'|'unverified-legacy') => ({
  dataVersion: 'fixture-historical-v1',
  ...(status ? {factVerification: {
    version: 'candidate-facts/1.0.0', status, dataVersion: 'fixture-historical-v1',
    ...(status !== 'unverified-legacy' ? {datasetSha256: 'b'.repeat(64)} : {}),
  }} : {}),
}) satisfies Pick<NamingSession, 'dataVersion'|'sourceSnapshot'|'factVerification'>;

describe('candidate fact provenance in the delivered report', () => {
  it('keeps legacy facts visibly unverified when the generation package is absent', () => {
    const html = sessionSourcesReport(session());
    expect(html).toContain('历史用字与引文未重新核验');
    expect(html).toContain('不能用当前字库补证');
    expect(html).not.toContain('已按内置原版本核对');
  });
  it('distinguishes a known built-in package from subjective review', () => {
    const html = sessionSourcesReport(session('verified-builtin'));
    expect(html).toContain('已按内置原版本核对用字与引文');
    expect(html).toContain('人工寓意和审阅文字单独保留');
  });
  it('does not describe a custom archived package as upstream authentication', () => {
    const html = sessionSourcesReport(session('verified-archive'));
    expect(html).toContain('已按生成时知识包归档核对');
    expect(html).toContain('内容一致不等于上游真实性或专家认证');
  });
  it('rejects mismatched verification metadata at the report boundary', () => {
    const value = session('verified-builtin');
    value.factVerification!.dataVersion = 'different-generation';
    const html = sessionSourcesReport(value);
    expect(html).toContain('历史用字与引文未重新核验');
    expect(html).not.toContain('已按内置原版本核对用字与引文');
  });
});
