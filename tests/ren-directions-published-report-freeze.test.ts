import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import saved from './fixtures/ren-session-1.3-saved.json';
import expected from './fixtures/ren1.3-parent-report-published127-hashes.json';
import {ditianRenReport} from '../src/main/ditian-ren-report';
import type {RenCommentaryAnalysis} from '../src/shared/types';
const sha=(value:string)=>createHash('sha256').update(value).digest('hex');
describe('old1.3 parent report remains identical to independently compiled published1.0.27 report',()=>{
 it('keeps published-source and actual-saved-input provenance distinct from the new report',()=>{
  expect(expected.provenance.actualSavedRelease).toBe('1.0.26');expect(expected.provenance.published127Asar.sha256).toBe('42a3cdeead5821082558850b5938c92c532a5cf08e2f482796fd5a814ce58158');expect(expected.provenance.published127Asar.installerSha256).toBe('c9e97364ac45f4b6368d4abcbb0b1badccdea11971dc36f396571b8d88df7c8f');expect(expected.provenance.scope).toContain('No new evaluator or current report module used');
  expect(expected.provenance.originalModules).toHaveLength(6);expect(expected.provenance.originalModules.map(module=>module.path)).toContain('src/main/ditian-ren-report.ts');expect(expected.records).toHaveLength(6);
 });
 it.each(expected.records)('freezes complete parent HTML for actual $key',record=>{
  const original=saved.records.find(item=>item.key===record.key)!;expect(original.sessionJsonSha256).toBe(record.sessionJsonSha256);expect(sha(JSON.stringify(original.session.analysis))).toBe(record.analysisJsonSha256);const data=original.session.analysis.renCommentary as unknown as RenCommentaryAnalysis;expect(data.version).toBe('ditian-ren-commentary-2600158/1.3.0');expect(Object.hasOwn(data,'directionAnalysis')).toBe(false);expect(sha(JSON.stringify(data))).toBe(record.renJsonSha256);
  const html=ditianRenReport(data);expect(Buffer.byteLength(html)).toBe(record.htmlBytes);expect(sha(html)).toBe(record.htmlSha256);expect(html).not.toContain('direction-strength-report');
 });
});
