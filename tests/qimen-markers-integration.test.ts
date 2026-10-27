import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { Store, defaults, validSession } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { reportHTML } from '../src/main/report';
import { compareSessionReviews, normalizePreferences } from '../src/shared/workflow';
import{calculateLegacyBazi}from'../src/domain/bazi-legacy';
import type { BirthProfile, NamingSession } from '../src/shared/types';

const dirs: string[] = [], stores: Store[] = [];
const wasm = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const profile: BirthProfile = { id: 'markers-test', customerName: '奇门隔离测试', surname: '林', surnamePinyin: 'lín', gender: '中性', calendar: 'solar', birthDate: '2026-10-17', leapMonth: false, birthTime: '09:30', timeUnknown: false, birthPlace: '杭州', timezone: 'Asia/Shanghai', notes: '' };
async function setup(p = profile) {
  const dir = mkdtempSync(join(tmpdir(), 'naming-qimen-')); dirs.push(dir);
  const store = await new Store(dir, resolve('data'), wasm).init(); stores.push(store);
  const service = new StudioService(store, { read: () => '', write: () => {} }, false);
  const { session } = await service.generate(p, normalizePreferences());
  return { store, service, session };
}
afterEach(() => { for (const store of stores.splice(0)) store.db.close(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('recorded Qimen auxiliary markers', { timeout: 15_000 }, () => {
  it('preserves the exact marker snapshot through review, revision restoration, and SQLite backup restoration', async () => {
    const { store, service, session } = await setup();
    expect(validSession(session)).toBe(true);
    const original = structuredClone(session.analysis.qimen);
    const draft = structuredClone(session); draft.reviewNote = '人工复核仅记录事实';
    const current=service.saveSession(draft);
    expect(service.listHistory(session.id)[0].session.analysis.qimen).toEqual(original);
    service.restoreHistory(session.id, service.listHistory(session.id)[0].id,current.reviewRevision,current.reviewToken);
    store.restore(store.backupBytes());
    expect(store.rows<NamingSession>('sessions')[0].analysis.qimen).toEqual(original);
  });

  it('blocks forged marker provenance, hour, palace, and evidence before saving any bytes', async () => {
    const { store, session } = await setup();
    const before = store.backupBytes();
    const mutations: ((s: NamingSession) => void)[] = [
      s => { s.analysis.qimen.auxiliary!.rules[0].sources[0].commit = 'fabricated'; },
      s => { s.analysis.qimen.auxiliary!.markers[0].palaces = [5]; },
      s => { s.analysis.qimen.auxiliary!.markers[1].evidence = ['杜撰的验证']; },
      s => { s.analysis.qimen.auxiliary!.hourGanzhi = '甲子'; },
      s => { s.analysis.qimen.xun += '杜撰'; },
      s => { s.analysis.qimen.palaces[0].marks.push('时驿马（杜撰）'); },
      s => { delete s.analysis.qimen.auxiliary; },
      s => { s.analysis.qimen.auxiliary!.version = 'unknown/999'; },
      s => { s.analysis.qimen.version = 'zhuanpan-chaibu-futou-kun2/1.0.0'; delete s.analysis.qimen.auxiliary; },
      s => { s.profile.timeUnknown = true; s.profile.birthTime = ''; },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(session); mutate(forged);
      expect(validSession(forged)).toBe(false);
      expect(() => store.saveSession(forged)).toThrow('奇门快照');
      expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);
    }
  });

  it('rejects an imported forged auxiliary snapshot and preserves the current customer archive', async () => {
    const { store, session } = await setup();
    const before = store.backupBytes(), SQL = await initSqlJs({ locateFile: () => wasm });
    const forged = structuredClone(session); forged.analysis.qimen.auxiliary!.markers[0].branches = ['子'];
    const archive = new SQL.Database(before);
    archive.run('UPDATE sessions SET json=?', [JSON.stringify(forged)]);
    expect(() => store.restore(archive.export())).toThrow('字段不完整');
    archive.close(); expect(Buffer.from(store.backupBytes()).equals(Buffer.from(before))).toBe(true);
  });

  it('accepts an actual old snapshot without adding new marker conclusions', async () => {
    const { store, session } = await setup();
    const old = structuredClone(session);
    old.analysis.bazi=calculateLegacyBazi(old.profile);old.originalFavorable=[...old.analysis.bazi.favorable];
    old.analysis.qimen.version = 'zhuanpan-chaibu-futou-kun2/1.0.0'; delete old.analysis.qimen.auxiliary;
    delete old.analysis.qimen.patterns;delete old.analysis.qimen.stemTombs;
    old.analysis.qimen.palaces.forEach(p => { p.marks = p.number === 5 ? ['中五寄坤，天禽随天芮'] : []; });
    expect(validSession(old)).toBe(true); store.saveSession(old); store.restore(store.backupBytes());
    const restored = store.rows<NamingSession>('sessions')[0];
    expect(restored.analysis.qimen.auxiliary).toBeUndefined();
    expect(reportHTML(restored, defaults)).toContain('未生成旬空、驿马');
    expect(compareSessionReviews(old, session).some(c => c.field === '奇门辅助标记' && c.before.includes('未生成') && c.after.includes('时旬空'))).toBe(true);
  });

  it('does not invent an auxiliary result for unknown birth time', async () => {
    const { store, session } = await setup({ ...profile, timeUnknown: true, birthTime: '' });
    expect(session.analysis.qimen.available).toBe(false);
    expect(session.analysis.qimen.auxiliary).toBeUndefined();
    expect(validSession(session)).toBe(true);
    expect(reportHTML(session, defaults)).not.toContain('<section class="qimen-auxiliary-report"');
    store.restore(store.backupBytes());
    expect(store.rows<NamingSession>('sessions')[0].analysis.qimen.auxiliary).toBeUndefined();
  });

  it('exports exactly the saved marker branches, evidence and versions without a name-to-palace verdict', async () => {
    const { session } = await setup();
    const html = reportHTML(session, defaults), aux = session.analysis.qimen.auxiliary!;
    for (const marker of aux.markers) {
      expect(html).toContain(marker.label);
      for (const branch of marker.branches) expect(html).toContain(branch);
      expect(html).toContain(marker.ruleVersion);
    }
    expect(html).toContain(aux.version);
    expect(html).not.toContain('名字已通过奇门验算');
  });
});
