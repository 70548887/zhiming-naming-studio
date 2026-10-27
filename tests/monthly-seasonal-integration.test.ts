import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { analyzeProfile, BAZI_RULE_VERSION } from '../src/domain/engine';
import { calculateBaziV2, BAZI_V2_RULE_VERSION } from '../src/domain/bazi-v2';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import { Store, defaults, validSession } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { reportHTML } from '../src/main/report';
import { BaziEvidenceView } from '../src/renderer/BaziEvidenceView';
import { classicDisplay } from '../src/shared/classic-display';
import { normalizePreferences } from '../src/shared/workflow';
import type { BirthProfile, NamingSession, SeasonalMethod } from '../src/shared/types';

const DISABLED: SeasonalMethod = 'no-monthly/1.0.0', SELECTED: SeasonalMethod = 'qiongtong-2294674-initial/1.0.0';
const base: BirthProfile = { id: 'monthly-seasonal-integration', customerName: '逐月原文隔离验收', surname: '林', surnamePinyin: 'lín', gender: '中性', calendar: 'solar', birthDate: '2024-02-10', birthTime: '09:30', timeUnknown: false, leapMonth: false, birthPlace: '上海', timezone: 'Asia/Shanghai', notes: '', monthAuthorityMethod: 'no-fixed-day/1.0.0', seasonalMethod: SELECTED };
const wasm = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dirs: string[] = [], stores: Store[] = [];
async function open() {
  const dir = mkdtempSync(join(tmpdir(), 'naming-source-seasonal-'));dirs.push(dir);
  const store = await new Store(dir, resolve('data'), wasm).init();stores.push(store);
  return { store, service: new StudioService(store, { read: () => '', write: () => {} }, false) };
}
async function setup(overrides: Partial<BirthProfile> = {}) {
  const { store, service } = await open(), profile = { ...base, ...overrides };
  const { session } = await service.generate(profile, normalizePreferences({ zodiacRules: false }));
  return { store, service, session };
}
const current = (store: Store, id: string) => store.rows<NamingSession>('sessions').find(item => item.id === id)!;
const disk = (store: Store) => readFileSync(join(store.userDir, 'customers.sqlite'));
const esc = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
afterEach(() => { for (const store of stores.splice(0)) store.db.close();for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('independent source monthly seasonal method across application boundaries', { timeout: 15_000 }, () => {
  it('persists disabled and selected profile methods and their independent result through a separate Store backup import', async () => {
    const { store, service } = await open();
    for (const method of [DISABLED, SELECTED]) {
      const profile = { ...base, id: `${base.id}-${method === SELECTED ? 'selected' : 'disabled'}`, seasonalMethod: method };
      expect(service.saveProfile(profile).seasonalMethod).toBe(method);
      const { session } = await service.generate(profile, normalizePreferences({ zodiacRules: false }));
      expect(session.analysis.bazi.version).toBe(BAZI_RULE_VERSION);expect(BAZI_RULE_VERSION).toContain('/1.9.0;');
      expect(session.analysis.bazi.evidence!.version).toBe('bazi-evidence-profile/1.7.0');
      expect(session.profile.seasonalMethod).toBe(method);expect(session.analysis.bazi.evidence!.monthlySeasonal!.methodId).toBe(method);
      expect(session.analysis.bazi.evidence!.opinions).toHaveLength(2);
      if (method === DISABLED) { expect(session.analysis.bazi.evidence!.monthlySeasonal!.status).toBe('not-selected');expect(session.analysis.bazi.evidence!.monthlySeasonal!.cases).toEqual([]); }
      else expect(session.analysis.bazi.evidence!.monthlySeasonal!.cases).toHaveLength(1);
    }
    const saved = store.rows<NamingSession>('sessions'), target = await open();target.store.restore(store.backupBytes());
    for (const session of saved) {
      const imported = current(target.store, session.id);
      expect(imported.profile.seasonalMethod).toBe(session.profile.seasonalMethod);
      expect(imported.analysis.bazi.evidence!.monthlySeasonal).toEqual(session.analysis.bazi.evidence!.monthlySeasonal);
      expect(target.store.rows<BirthProfile>('profiles').find(profile => profile.id === session.profileId)!.seasonalMethod).toBe(session.profile.seasonalMethod);
    }
  // Actual integrated multi-case run measured 6.44s and 6.23s; bound this case without changing assertions or the global 5s limit.
  },15000);

  it('shows real current-case use roles and each of the three curated fact conditions in actual UI/report output', async () => {
    const { store, service } = await open();
    const inputs = [
      { id: 'actual-jia-hai', birthDate: '2024-11-16', birthTime: '09:30', day: '甲', month: '亥', condition: 'jia-hai-three-exposed', result: 'not-met' },
      { id: 'actual-jia-chou', birthDate: '2024-01-11', birthTime: '09:30', day: '甲', month: '丑', condition: 'jia-chou-geng-exposed-ding-hidden', result: 'not-met' },
      { id: 'actual-yi-zi', birthDate: '2024-01-02', birthTime: '17:30', day: '乙', month: '子', condition: 'yi-zi-no-bing-anywhere', result: 'met' },
    ];
    for (const input of inputs) {
      const { session } = await service.generate({ ...base, id: input.id, birthDate: input.birthDate, birthTime: input.birthTime }, normalizePreferences({ zodiacRules: false }));
      const monthly = session.analysis.bazi.evidence!.monthlySeasonal!, item = monthly.cases[0], condition = item.conditionBranches.find(branch => branch.id === input.condition)!;
      expect(item.dayMaster).toBe(input.day);expect(item.monthBranch).toBe(input.month);expect(condition.predicate).toBeDefined();expect(condition.result).toBe(input.result);
      expect(item.initialUses.length).toBeGreaterThan(0);
      const html = renderToStaticMarkup(React.createElement(BaziEvidenceView, { evidence: session.analysis.bazi.evidence })), report = reportHTML(session, defaults);
      for (const output of [html, report]) {
        expect(output).toContain(`${input.day}日 · ${input.month}月`);expect(output).toContain(input.condition);expect(output).toContain(item.sourceLocator);
        expect(output).toContain(esc(classicDisplay(item.sourceQuote)));expect(output).toContain(esc(classicDisplay(condition.sourceQuote)));
        expect(output).toContain(input.result === 'met' ? '满足已实现条件' : '未满足已实现条件');
        for (const use of item.initialUses) { expect(output).toContain(esc(classicDisplay(use.quote)));expect(output).toContain(`原文序 ${use.sequence}`); }
        for (const observation of condition.observedEvidence) expect(output).toContain(esc(observation));
        expect(output).toContain('不改变候选姓名评分');
      }
      expect(current(store, session.id).analysis.bazi.evidence!.monthlySeasonal).toEqual(monthly);
    }
  // Actual integrated multi-case run measured 6.48s and 5.97s; bound this case without changing assertions or the global 5s limit.
  },15000);

  it('keeps saved monthly evidence immutable when preferences and reviews change, including CAS history restoration', async () => {
    const { store, service, session } = await setup(), monthly = structuredClone(session.analysis.bazi.evidence!.monthlySeasonal), originalOpinions = structuredClone(session.analysis.bazi.evidence!.opinions);
    const draft = structuredClone(session);draft.reviewNote = '只把所选原文作为独立意见';draft.preferences.preferredElements = ['金'];draft.candidates[0].reviewNote = '人工命名取舍';
    draft.profile.seasonalMethod = DISABLED;draft.analysis = analyzeProfile(draft.profile);
    (draft.preferences as unknown as Record<string, unknown>).seasonalMethod = DISABLED;
    const saved = service.saveSession(draft);
    expect(saved.preferences.preferredElements).toEqual(['金']);expect('seasonalMethod' in saved.preferences).toBe(false);
    expect(saved.profile.seasonalMethod).toBe(SELECTED);expect(saved.analysis.bazi.evidence!.monthlySeasonal).toEqual(monthly);expect(saved.analysis.bazi.evidence!.opinions).toEqual(originalOpinions);
    const revision = service.listHistory(session.id)[0];expect(revision.session.analysis.bazi.evidence!.monthlySeasonal).toEqual(monthly);
    const restored = service.restoreHistory(session.id, revision.id, saved.reviewRevision, saved.reviewToken);
    expect(restored.reviewNote).toBe(session.reviewNote);expect(restored.preferences.preferredElements).toEqual(session.preferences.preferredElements);expect(restored.analysis.bazi.evidence!.monthlySeasonal).toEqual(monthly);
    store.restore(store.backupBytes());expect(current(store, session.id).analysis.bazi.evidence!.monthlySeasonal).toEqual(monthly);
  });
});

const mutations: { name: string; edit: (session: NamingSession) => void }[] = [
  { name: 'source quotation', edit: session => { session.analysis.bazi.evidence!.monthlySeasonal!.cases[0].sourceQuote += '杜撰取用'; } },
  { name: 'use role', edit: session => { const use = session.analysis.bazi.evidence!.monthlySeasonal!.cases[0].initialUses[0];use.role = use.role === 'first' ? 'support' : 'first'; } },
  { name: 'fact predicate', edit: session => { session.analysis.bazi.evidence!.monthlySeasonal!.cases[0].conditionBranches.find(branch => branch.predicate)!.predicate = { kind: 'stem', stem: '甲', scope: 'any', includeDayMaster: true, present: false }; } },
  { name: 'condition result', edit: session => { const branch = session.analysis.bazi.evidence!.monthlySeasonal!.cases[0].conditionBranches.find(branch => branch.predicate)!;branch.result = branch.result === 'met' ? 'not-met' : 'met'; } },
  { name: 'overall status', edit: session => { const monthly = session.analysis.bazi.evidence!.monthlySeasonal!;monthly.status = monthly.status === 'pending' ? 'initial-reference' : 'pending'; } },
  { name: 'stem observation', edit: session => { session.analysis.bazi.evidence!.monthlySeasonal!.cases[0].stemFacts[0].exposedPositions.push('伪造时柱'); } },
];

describe('monthly seasonal snapshot provenance and method binding', { timeout: 15_000 }, () => {
  it.each(mutations)('rejects changed $name in imported current and revision rows without replacing any current bytes', async ({ edit }) => {
    const { store, service, session } = await setup({ birthDate: '2024-11-16' });service.saveSession({ ...structuredClone(session), reviewNote: '合法历史用于导入校验' });
    const before = disk(store), good = store.backupBytes(), SQL = await initSqlJs({ locateFile: () => wasm });
    for (const table of ['sessions', 'revisions']) {
      const archive = new SQL.Database(good);
      try {
        const row = JSON.parse(String(archive.exec(`SELECT json FROM ${table} LIMIT 1`)[0].values[0][0])) as NamingSession;
        edit(row);expect(validSession(row)).toBe(false);archive.run(`UPDATE ${table} SET json=?`, [JSON.stringify(row)]);
        expect(() => store.restore(archive.export())).toThrow('字段不完整');
      } finally { archive.close(); }
      expect(disk(store).equals(before)).toBe(true);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(good))).toBe(true);
    }
  });

  it('rejects a self-consistent disabled analysis copied into a profile that still selects the monthly source', async () => {
    const { store, session } = await setup(), otherProfile = { ...session.profile, seasonalMethod: DISABLED }, other = analyzeProfile(otherProfile);
    expect(baziSnapshotStatus(other.bazi, otherProfile)).toBe('verified-current');expect(other.bazi.evidence!.monthlySeasonal!.status).toBe('not-selected');
    const forged = structuredClone(session);forged.analysis = other;forged.originalFavorable = [...other.bazi.favorable];
    expect(forged.profile.seasonalMethod).toBe(SELECTED);expect(validSession(forged)).toBe(false);
    const before = disk(store), good = store.backupBytes();expect(() => store.saveSession(forged)).toThrow(/八字.*快照/);
    const SQL = await initSqlJs({ locateFile: () => wasm }), archive = new SQL.Database(good);
    try { archive.run('UPDATE sessions SET json=?', [JSON.stringify(forged)]);expect(() => store.restore(archive.export())).toThrow('字段不完整'); } finally { archive.close(); }
    expect(disk(store).equals(before)).toBe(true);expect(Buffer.from(store.backupBytes()).equals(Buffer.from(good))).toBe(true);
  });

  it('preserves frozen Bazi 1.2 with no monthly field and does not supplement its UI or report after backup import', async () => {
    const { store, session } = await setup(), legacy = structuredClone(session);legacy.id = 'frozen-pre-monthly-seasonal';delete legacy.profile.seasonalMethod;delete legacy.sourceSnapshot;delete legacy.namingRules;for(const candidate of legacy.candidates)delete candidate.namingMeaningReview;
    legacy.analysis.bazi = calculateBaziV2(legacy.profile);legacy.analysis.qimen=calculateQimenProfileV2(legacy.profile);legacy.originalFavorable = [...legacy.analysis.bazi.favorable];
    expect(legacy.analysis.bazi.version).toBe(BAZI_V2_RULE_VERSION);expect(BAZI_V2_RULE_VERSION).toContain('/1.2.0;');expect(legacy.analysis.bazi.evidence!.monthlySeasonal).toBeUndefined();
    const original = structuredClone(legacy.analysis.bazi);expect(validSession(legacy)).toBe(true);store.saveSession(legacy);store.restore(store.backupBytes());
    const imported = current(store, legacy.id);expect(imported.analysis.bazi).toEqual(original);expect(imported).not.toHaveProperty('namingRules');expect(baziSnapshotStatus(imported.analysis.bazi, imported.profile)).toBe('verified-legacy');
    for (const output of [renderToStaticMarkup(React.createElement(BaziEvidenceView, { evidence: imported.analysis.bazi.evidence })), reportHTML(imported, defaults)]) {
      expect(output).toContain('逐月调候资料参考');expect(output).toContain('本版未记录');expect(output).toContain('不会补入当前资料或重新推算');expect(output).not.toContain('class="monthly-seasonal-case"');expect(output).not.toContain('class="monthly-seasonal-report-case"');
    }
    const forced = structuredClone(imported);forced.profile.seasonalMethod = SELECTED;expect(validSession(forced)).toBe(false);expect(baziSnapshotStatus(forced.analysis.bazi, forced.profile)).toBe('invalid');
    expect(current(store, legacy.id).analysis.bazi).toEqual(original);
  });
});
