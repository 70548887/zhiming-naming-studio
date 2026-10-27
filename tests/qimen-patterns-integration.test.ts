import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { Store, defaults, validSession } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { normalizePreferences } from '../src/shared/workflow';
import { qimenAuxiliaryPalaceMarks } from '../src/domain/qimen-markers';
import { reportHTML } from '../src/main/report';
import type { BirthProfile, NamingSession } from '../src/shared/types';
import { calculateQimenPlate } from '../src/domain/engine';
import{calculateLegacyBazi}from'../src/domain/bazi-legacy';

const stores: Store[] = [], directories: string[] = [];
const wasm = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const profile: BirthProfile = { id: 'pattern-integration', customerName: '结构规则隔离测试', surname: '林', surnamePinyin: 'lín', gender: '中性', calendar: 'solar', birthDate: '2026-10-17', birthTime: '09:30', timeUnknown: false, leapMonth: false, birthPlace: '杭州', timezone: 'Asia/Shanghai', notes: '' };
async function setup(p = profile) {
  const directory = mkdtempSync(join(tmpdir(), 'naming-pattern-')); directories.push(directory);
  const store = await new Store(directory, resolve('data'), wasm).init(); stores.push(store);
  const service = new StudioService(store, { read: () => '', write: () => {} }, false);
  const { session } = await service.generate(p, normalizePreferences());
  return { store, service, session };
}
afterEach(() => { stores.splice(0).forEach(s => s.db.close()); directories.splice(0).forEach(d => rmSync(d, { recursive: true, force: true })); });

describe('versioned Qimen structural evidence across storage and delivery', { timeout: 15_000 }, () => {
  it('preserves checks and source evidence through review history and complete backup roundtrips', async () => {
    const { store, service, session } = await setup();
    expect(session.analysis.qimen.patterns?.checks).toHaveLength(7);
    expect(validSession(session)).toBe(true);
    const original = structuredClone(session.analysis.qimen.patterns);
    const current=service.saveSession({ ...structuredClone(session), reviewNote: '逐条核对规则条件，不据此判断名字吉凶。' });
    const revision = service.listHistory(session.id)[0];
    expect(revision.session.analysis.qimen.patterns).toEqual(original);
    service.restoreHistory(session.id, revision.id,current.reviewRevision,current.reviewToken); store.restore(store.backupBytes());
    const restored = store.rows<NamingSession>('sessions')[0];
    expect(restored.analysis.qimen.patterns).toEqual(original);
    const html = reportHTML(restored, defaults);
    expect(html).toContain(original!.version);
    for (const rule of original!.rules) expect(html).toContain(rule.name);
  });

  it('rejects forged rule versions, checked states, conditions, evidence and missing snapshots before persisting', async () => {
    const { store, session } = await setup(), before = store.backupBytes();
    const mutations: ((s: NamingSession) => void)[] = [
      s => { s.analysis.qimen.patterns!.version = 'unknown/999'; },
      s => { s.analysis.qimen.patterns!.rules[0].sources[0].commit = 'invented'; },
      s => { s.analysis.qimen.patterns!.rules[0].conditions = ['名字笔画落宫']; },
      s => { s.analysis.qimen.patterns!.checks[0].status = s.analysis.qimen.patterns!.checks[0].status === 'matched' ? 'not-matched' : 'matched'; },
      s => { s.analysis.qimen.patterns!.checks[0].evidence = ['AI自行编写的结论']; },
      s => { s.analysis.qimen.patterns!.checks.pop(); },
      s => { delete s.analysis.qimen.patterns; },
      s => { s.analysis.qimen.palaces[0].marks.push('自编结构标记'); },
    ];
    for (const mutate of mutations) {
      const invalid = structuredClone(session); mutate(invalid);
      expect(validSession(invalid)).toBe(false);
      expect(() => store.saveSession(invalid)).toThrow('奇门快照');
      expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);
    }
  });

  it('binds the structural snapshot to the base plate rather than allowing an unrelated edited plate', async () => {
    const { store, session } = await setup();
    const edited = structuredClone(session), q = edited.analysis.qimen;
    const outer = q.palaces.filter(p => p.number !== 5);
    [outer[0].god, outer[1].god] = [outer[1].god, outer[0].god];
    expect(validSession(edited)).toBe(false);
    expect(() => store.saveSession(edited)).toThrow('奇门快照');
    const wrongJu = structuredClone(session); wrongJu.analysis.qimen.ju = wrongJu.analysis.qimen.ju % 9 + 1;
    expect(validSession(wrongJu)).toBe(false);
  });

  it('rejects a self-consistent plate computed from a season that does not match the saved birth record', async () => {
    const { store, session } = await setup();
    const forged = structuredClone(session), b = forged.analysis.bazi;
    const day = b.pillars.find(p => p.label === '日柱')!, hour = b.pillars.find(p => p.label === '时柱')!;
    expect(session.analysis.qimen.solarTerm).not.toBe('冬至');
    forged.analysis.qimen = calculateQimenPlate(day.gan + day.zhi, hour.gan + hour.zhi, '冬至');
    expect(validSession(forged)).toBe(false);
    expect(() => store.saveSession(forged)).toThrow('奇门快照');
    const before = store.backupBytes(), SQL = await initSqlJs({ locateFile: () => wasm }), archive = new SQL.Database(before);
    archive.run('UPDATE sessions SET json=?', [JSON.stringify(forged)]);
    expect(() => store.restore(archive.export())).toThrow('字段不完整'); archive.close();
    expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);
  });

  it('rejects a forged imported pattern in a revision and leaves the live archive untouched', async () => {
    const { store, service, session } = await setup();
    service.saveSession({ ...structuredClone(session), reviewNote: '创建历史' });
    const before = store.backupBytes(), SQL = await initSqlJs({ locateFile: () => wasm }), archive = new SQL.Database(before);
    const revision = service.listHistory(session.id)[0].session;
    revision.analysis.qimen.patterns!.checks[0].ruleVersion = 'other';
    archive.run('UPDATE revisions SET json=?', [JSON.stringify(revision)]);
    expect(() => store.restore(archive.export())).toThrow('字段不完整'); archive.close();
    expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);
  });

  it('keeps both historical basic and hour-marker-only records without inventing structural conclusions', async () => {
    const { store, session } = await setup();
    for (const version of ['zhuanpan-chaibu-futou-kun2/1.0.0', 'zhuanpan-chaibu-futou-kun2/1.1.0']) {
      const current=store.rows<NamingSession>('sessions').find(row=>row.id===session.id)!;
      const historical = { ...structuredClone(session),reviewRevision:current.reviewRevision,reviewToken:current.reviewToken }, q = historical.analysis.qimen;
      historical.analysis.bazi=calculateLegacyBazi(historical.profile);historical.originalFavorable=[...historical.analysis.bazi.favorable];
      q.version = version; delete q.patterns;delete q.stemTombs;
      if (version.endsWith('/1.0.0')) delete q.auxiliary;
      q.palaces.forEach(p => { p.marks = [...(p.number === 5 ? ['中五寄坤，天禽随天芮'] : []), ...qimenAuxiliaryPalaceMarks(q.auxiliary, p.number)]; });
      expect(validSession(historical), version).toBe(true);
      store.saveSession(historical); store.restore(store.backupBytes());
      expect(store.rows<NamingSession>('sessions')[0].analysis.qimen.patterns).toBeUndefined();
    }
  });

  it('does not infer any structural state when the birth hour is unknown', async () => {
    const { store, session } = await setup({ ...profile, timeUnknown: true, birthTime: '' });
    expect(session.analysis.qimen.patterns).toBeUndefined(); expect(session.analysis.qimen.palaces).toEqual([]);
    expect(validSession(session)).toBe(true); store.restore(store.backupBytes());
    expect(reportHTML(session, defaults)).not.toContain('<section class="qimen-patterns-report"');
    const hiddenKnown = structuredClone(session); hiddenKnown.profile.timeUnknown = false; hiddenKnown.profile.birthTime = '09:30';
    expect(validSession(hiddenKnown)).toBe(false);
    expect(() => store.saveSession(hiddenKnown)).toThrow('奇门快照');
  });
});
