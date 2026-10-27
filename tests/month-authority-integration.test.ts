import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { analyzeProfile, BAZI_RULE_VERSION } from '../src/domain/engine';
import { calculateBaziV1, BAZI_V1_RULE_VERSION } from '../src/domain/bazi-v1';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import { generateLocal } from '../src/domain/naming';
import { baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { Store, validSession } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { normalizePreferences } from '../src/shared/workflow';
import type { BirthProfile, MonthAuthorityMethod, NamingSession } from '../src/shared/types';

const DEFAULT: MonthAuthorityMethod = 'no-fixed-day/1.0.0', FIXED: MonthAuthorityMethod = 'sanming-first-paragraph/1.0.0';
const wasm = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dirs: string[] = [], stores: Store[] = [];
const base: BirthProfile = { id: 'monthly-integration', customerName: '月令选表隔离验收', surname: '林', surnamePinyin: 'lín', gender: '中性', calendar: 'solar', birthDate: '2024-02-05', birthTime: '09:30', timeUnknown: false, leapMonth: false, birthPlace: '上海', timezone: 'Asia/Shanghai', notes: '' };
const preferences = normalizePreferences({ zodiacRules: false, numerology: false });
async function open() {
  const dir = mkdtempSync(join(tmpdir(), 'naming-month-method-')); dirs.push(dir);
  const store = await new Store(dir, resolve('data'), wasm).init(); stores.push(store);
  return { store, service: new StudioService(store, { read: () => '', write: () => {} }, false) };
}
async function setup(method: MonthAuthorityMethod = FIXED) {
  const { store, service } = await open();
  const { session } = await service.generate({ ...base, monthAuthorityMethod: method }, preferences);
  return { store, service, session };
}
const current = (store: Store, id: string) => store.rows<NamingSession>('sessions').find(item => item.id === id)!;
const disk = (store: Store) => readFileSync(join(store.userDir, 'customers.sqlite'));
afterEach(() => { for (const store of stores.splice(0)) store.db.close(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('selected monthly method across service, naming and persistence', { timeout: 15_000 }, () => {
  it('saves each profile method and retains it in customer and generated snapshots through complete backup import', async () => {
    const { store, service } = await open();
    for (const method of [DEFAULT, FIXED]) {
      const profile = { ...base, id: `${base.id}-${method === FIXED ? 'fixed' : 'default'}`, monthAuthorityMethod: method };
      expect(service.saveProfile(profile).monthAuthorityMethod).toBe(method);
      const { session } = await service.generate(profile, preferences);
      expect(session.analysis.bazi.version).toBe(BAZI_RULE_VERSION);expect(BAZI_RULE_VERSION).toContain('/1.9.0;');
      expect(session.profile.monthAuthorityMethod).toBe(method);
      expect(session.analysis.bazi.evidence!.monthAuthority.methodId).toBe(method);
    }
    const savedProfiles = store.rows<BirthProfile>('profiles'), savedSessions = store.rows<NamingSession>('sessions'), target = await open();
    target.store.restore(store.backupBytes());
    for (const saved of savedProfiles) expect(target.store.rows<BirthProfile>('profiles').find(profile => profile.id === saved.id)).toEqual(saved);
    for (const saved of savedSessions) {
      const imported = current(target.store, saved.id);
      expect(imported.profile.monthAuthorityMethod).toBe(saved.profile.monthAuthorityMethod);
      expect(imported.analysis.bazi.evidence!.monthAuthority).toEqual(saved.analysis.bazi.evidence!.monthAuthority);
    }
  },15000);

  it('leaves generated names and all evaluations identical for the same profile, preferences and fixed seed across methods', async () => {
    const { store } = await open(), defaultProfile = { ...base, monthAuthorityMethod: DEFAULT }, fixedProfile = { ...base, monthAuthorityMethod: FIXED };
    const ordinary = analyzeProfile(defaultProfile), fixed = analyzeProfile(fixedProfile);
    expect(ordinary.bazi.evidence!.monthAuthority.methodId).toBe(DEFAULT);
    expect(fixed.bazi.evidence!.monthAuthority.methodId).toBe(FIXED);
    expect(ordinary.bazi.evidence!.monthAuthority.candidates).toEqual([]);
    expect(fixed.bazi.evidence!.monthAuthority.candidates.length).toBeGreaterThan(0);
    expect(fixed.bazi.favorable).toEqual(ordinary.bazi.favorable);expect(fixed.bazi.elements).toEqual(ordinary.bazi.elements);
    const generate = (profile: BirthProfile, analysis: ReturnType<typeof analyzeProfile>) => generateLocal(profile, preferences, analysis, store.dataset.characters, store.dataset.citations, 314159);
    const defaultNames = generate(defaultProfile, ordinary), fixedNames = generate(fixedProfile, fixed);
    expect(defaultNames.candidates).toHaveLength(12);expect(fixedNames.candidates).toHaveLength(12);
    expect(fixedNames.candidates.map(item => item.fullName)).toEqual(defaultNames.candidates.map(item => item.fullName));
    expect(fixedNames.candidates.map(item => item.evaluation)).toEqual(defaultNames.candidates.map(item => item.evaluation));
    expect(fixedNames.candidates.map(item => item.characters)).toEqual(defaultNames.candidates.map(item => item.characters));
  });

  it('keeps fixed-method reference and results immutable through manual preferences, review edits and CAS history restoration', async () => {
    const { store, service, session } = await setup(), originalMonth = structuredClone(session.analysis.bazi.evidence!.monthAuthority);
    expect(session.profile.monthAuthorityMethod).toBe(FIXED);expect(originalMonth.methodId).toBe(FIXED);expect(originalMonth.reference!.months).toHaveLength(12);
    expect(originalMonth.candidates.length).toBeGreaterThan(0);expect(originalMonth.candidates[0].sourceTerm).toBe('艮土');
    const draft = structuredClone(session);draft.reviewNote = '所选表仅作人工参考';draft.preferences.preferredElements = ['水'];
    draft.profile.monthAuthorityMethod = DEFAULT;
    draft.analysis = analyzeProfile({ ...draft.profile, monthAuthorityMethod: DEFAULT });
    (draft.preferences as unknown as Record<string, unknown>).monthAuthorityMethod = DEFAULT;
    const saved = service.saveSession(draft);
    expect(saved.preferences.preferredElements).toEqual(['水']);
    expect('monthAuthorityMethod' in saved.preferences).toBe(false);
    expect(saved.profile.monthAuthorityMethod).toBe(FIXED);
    expect(saved.analysis.bazi.evidence!.monthAuthority).toEqual(originalMonth);
    const revision = service.listHistory(session.id)[0];
    expect(revision.session.analysis.bazi.evidence!.monthAuthority).toEqual(originalMonth);
    const restored = service.restoreHistory(session.id, revision.id, saved.reviewRevision, saved.reviewToken);
    expect(restored.preferences.preferredElements).toEqual(session.preferences.preferredElements);
    expect(restored.analysis.bazi.evidence!.monthAuthority).toEqual(originalMonth);
    store.restore(store.backupBytes());
    const imported = current(store, session.id);
    expect(imported.profile.monthAuthorityMethod).toBe(FIXED);expect(imported.analysis.bazi.evidence!.monthAuthority).toEqual(originalMonth);
  });
});

const alterations: { name: string; edit: (session: NamingSession) => void }[] = [
  { name: 'original term', edit: session => { session.analysis.bazi.evidence!.monthAuthority.reference!.months[0].segments[0].sourceTerm = '戊土'; } },
  { name: 'table day count', edit: session => { session.analysis.bazi.evidence!.monthAuthority.reference!.months[0].segments[0].days += 1; } },
  { name: 'source quotation', edit: session => { session.analysis.bazi.evidence!.monthAuthority.reference!.months[0].sourceQuote += '杜撰句'; } },
  { name: 'result status', edit: session => { session.analysis.bazi.evidence!.monthAuthority.status = 'not-evaluated'; } },
  { name: 'candidate result', edit: session => { session.analysis.bazi.evidence!.monthAuthority.candidates[0].sourceTerm = '人工替换'; } },
  { name: 'actual interval', edit: session => { session.analysis.bazi.evidence!.monthAuthority.segments[0].startAt = '2024-01-01T00:00:00.000Z'; } },
];

describe('month method and frozen table cannot be forged through archive import', { timeout: 15_000 }, () => {
  it.each(alterations)('rejects changed $name in live and revision rows without changing any current bytes', async ({ edit }) => {
    const { store, service, session } = await setup();service.saveSession({ ...structuredClone(session), reviewNote: '保存一份合法历史供导入校验' });
    const good = store.backupBytes(), before = disk(store), SQL = await initSqlJs({ locateFile: () => wasm });
    for (const table of ['sessions', 'revisions']) {
      const archive = new SQL.Database(good);
      try {
        const row = JSON.parse(String(archive.exec(`SELECT json FROM ${table} LIMIT 1`)[0].values[0][0])) as NamingSession;
        edit(row);expect(validSession(row)).toBe(false);
        archive.run(`UPDATE ${table} SET json=?`, [JSON.stringify(row)]);
        expect(() => store.restore(archive.export())).toThrow('字段不完整');
      } finally { archive.close(); }
      expect(disk(store).equals(before)).toBe(true);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(good))).toBe(true);
    }
  });

  it('rejects the self-consistent other-method analysis when the saved profile still selects the fixed table', async () => {
    const { store, session } = await setup(), otherProfile = { ...session.profile, monthAuthorityMethod: DEFAULT }, other = analyzeProfile(otherProfile);
    expect(baziSnapshotStatus(other.bazi, otherProfile)).toBe('verified-current');
    expect(other.bazi.evidence!.monthAuthority.methodId).toBe(DEFAULT);
    const forged = structuredClone(session);forged.analysis = other;forged.originalFavorable = [...other.bazi.favorable];
    expect(forged.profile.monthAuthorityMethod).toBe(FIXED);expect(validSession(forged)).toBe(false);
    const before = disk(store), good = store.backupBytes();expect(() => store.saveSession(forged)).toThrow(/八字.*快照/);
    const SQL = await initSqlJs({ locateFile: () => wasm }), archive = new SQL.Database(good);
    try { archive.run('UPDATE sessions SET json=?', [JSON.stringify(forged)]);expect(() => store.restore(archive.export())).toThrow('字段不完整'); } finally { archive.close(); }
    expect(disk(store).equals(before)).toBe(true);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(good))).toBe(true);
  });

  it('retains old Bazi 1.1 without a selected table and rejects attaching a fixed method to that historical output', async () => {
    const { store, session } = await setup(DEFAULT), legacy = structuredClone(session);
    legacy.id = 'monthly-frozen-v1';delete legacy.profile.monthAuthorityMethod;
    legacy.analysis.bazi = calculateBaziV1(legacy.profile);legacy.analysis.qimen=calculateQimenProfileV2(legacy.profile);legacy.originalFavorable = [...legacy.analysis.bazi.favorable];
    expect(legacy.analysis.bazi.version).toBe(BAZI_V1_RULE_VERSION);expect(BAZI_V1_RULE_VERSION).toContain('/1.1.0;');
    expect(legacy.analysis.bazi.evidence!.monthAuthority.methodId).toBeUndefined();expect(legacy.analysis.bazi.evidence!.monthAuthority.reference).toBeUndefined();
    const frozen = structuredClone(legacy.analysis.bazi);
    expect(validSession(legacy)).toBe(true);store.saveSession(legacy);store.restore(store.backupBytes());
    const imported = current(store, legacy.id);
    expect(imported.analysis.bazi).toEqual(frozen);expect(baziSnapshotStatus(imported.analysis.bazi, imported.profile)).toBe('verified-legacy');
    const explicitDefault = { ...imported.profile, monthAuthorityMethod: DEFAULT };
    expect(baziSnapshotStatus(frozen, explicitDefault)).toBe('verified-legacy');
    const forged = structuredClone(imported);forged.profile.monthAuthorityMethod = FIXED;
    expect(baziSnapshotStatus(frozen, forged.profile)).toBe('invalid');expect(validSession(forged)).toBe(false);
    const before = disk(store), good = store.backupBytes();expect(() => store.saveSession(forged)).toThrow(/八字.*快照/);
    const SQL = await initSqlJs({ locateFile: () => wasm }), archive = new SQL.Database(good);
    try { archive.run('UPDATE sessions SET json=? WHERE id=?', [JSON.stringify(forged), forged.id]);expect(() => store.restore(archive.export())).toThrow('字段不完整'); } finally { archive.close(); }
    expect(disk(store).equals(before)).toBe(true);
    expect(current(store, legacy.id).analysis.bazi).toEqual(frozen);
  });
});
