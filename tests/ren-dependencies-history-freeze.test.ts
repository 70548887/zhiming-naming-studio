import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import published from './fixtures/ren-session-1.0.25.json';
import {analyzeProfile} from '../src/domain/engine';
import type {BirthProfile,NamingSession} from '../src/shared/types';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain=<T>(value:T):T=>JSON.parse(JSON.stringify(value));

describe('new dependency solver does not rewrite actual published1.0.25 current/history output',()=>{
  it('uses six complete installed SQLite rows captured without generating old expectations',()=>{
    expect(published.provenance.appVersion).toBe('1.0.25');expect(published.provenance.sourceInstallerSha256).toBe('66ab5c6d1d04c21983420269f70b37bf5fff836bd3278dddd6848aebddbd3a56');
    expect(published.provenance.sourceDatabaseSha256).toBe('0e67f367ccd7dc7d67e4f8f9cceb85dab3b9859464d951066eee4011fac240f5');expect(published.provenance.sourceDatabaseSha256AfterRead).toBe(published.provenance.sourceDatabaseSha256);expect(published.provenance.records).toHaveLength(6);expect(published.provenance.records.some(record=>record.table==='revisions')).toBe(true);
  });
  it.each(published.provenance.records)('preserves complete analysis and source snapshots: $key',record=>{
    const session=published.sessions[record.key as keyof typeof published.sessions] as unknown as NamingSession;
    expect(hash(session)).toBe(record.sessionJsonSha256);expect(hash(session.analysis)).toBe(record.analysisJsonSha256);
    expect(plain(analyzeProfile(session.profile as BirthProfile))).toEqual(session.analysis);
    expect(session.analysis.renCommentary?.actionAnalysis?.checks.every(check=>check.effectiveAction==='unknown')??true).toBe(true);
    expect(session.analysis.renCommentary?.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')??true).toBe(true);
    expect(session.sourceSnapshot?.sources.some(source=>source.id.includes('126')||source.id.includes('dependency-solver'))??false).toBe(false);
  });
});
