import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import initSqlJs from 'sql.js';
import { analyzeProfile, BAZI_RULE_VERSION } from '../src/domain/engine';
import { calculateLegacyBazi, LEGACY_BAZI_RULE_VERSION } from '../src/domain/bazi-legacy';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import { BAZI_EVIDENCE_VERSION } from '../src/domain/bazi-evidence';
import { Store, defaults, validSession } from '../src/main/store';
import { StudioService } from '../src/main/service';
import { loadBaziSources } from '../src/main/bazi-data';
import { baziSnapshotStatus } from '../src/main/bazi-snapshot';
import { reportHTML } from '../src/main/report';
import { BaziEvidenceView } from '../src/renderer/BaziEvidenceView';
import { compareSessionReviews, normalizePreferences } from '../src/shared/workflow';
import { sessionReferencedSourceIds } from '../src/shared/session-sources';
import type { BirthProfile, NamingSession } from '../src/shared/types';

const wasm = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dirs: string[] = [], stores: Store[] = [];
const profile: BirthProfile = { id: 'bazi-integration', customerName: '八字证据隔离验收', surname: '林', surnamePinyin: 'lín', gender: '中性', calendar: 'solar', birthDate: '2024-02-10', birthTime: '09:30', timeUnknown: false, leapMonth: false, birthPlace: '上海', timezone: 'Asia/Shanghai', notes: '' };
async function open() {
  const dir = mkdtempSync(join(tmpdir(), 'naming-bazi-evidence-')); dirs.push(dir);
  const store = await new Store(dir, resolve('data'), wasm).init(); stores.push(store);
  return { store, service: new StudioService(store, { read: () => '', write: () => {} }, false) };
}
async function setup(p = profile) {
  const { store, service } = await open();
  const { session } = await service.generate(p, normalizePreferences({ zodiacRules: false }));
  return { store, service, session };
}
const current = (store: Store, id: string) => store.rows<NamingSession>('sessions').find(item => item.id === id)!;
const disk = (store: Store) => readFileSync(join(store.userDir, 'customers.sqlite'));
const mutations: { name: string; edit: (session: NamingSession) => void }[] = [
  { name: 'missing evidence', edit: item => { delete item.analysis.bazi.evidence; } },
  { name: 'authority verdict', edit: item => { item.analysis.bazi.evidence!.monthAuthority.status = 'determined'; } },
  { name: 'source revision', edit: item => { item.analysis.bazi.evidence!.sources[0].revision = 'invented-source'; } },
  { name: 'rule condition', edit: item => { item.analysis.bazi.evidence!.rules[0].conditions.push('自编司权条件'); } },
  { name: 'relationship', edit: item => { item.analysis.bazi.evidence!.relations.push({ kind: 'stem-combination', label: '杜撰五合', subjects: ['甲', '甲'], pillars: ['日柱', '时柱'], ruleId: 'bazi-stem-five-combination', evidence: ['杜撰关系'] }); } },
  { name: 'context interval', edit: item => { item.analysis.bazi.evidence!.monthAuthority.segments[0].startAt = '2024-01-01T00:00:00.000Z'; } },
];
afterEach(() => { for (const store of stores.splice(0)) store.db.close(); for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('versioned Bazi evidence across service, persistence and delivery', { timeout: 15_000 }, () => {
  it('generates the new Bazi profile with every evidence and existing result source resolvable in its own manifest', async () => {
    const { service, session } = await setup(), evidence = session.analysis.bazi.evidence!;
    expect(session.analysis.bazi.version).toBe(BAZI_RULE_VERSION);
    expect(session.analysis.bazi.version).toContain('/1.9.0;');
    expect(evidence.version).toBe(BAZI_EVIDENCE_VERSION);
    expect(baziSnapshotStatus(session.analysis.bazi, session.profile)).toBe('verified-current');
    expect(validSession(session)).toBe(true);
    const manifest = session.sourceSnapshot!.sources, required = loadBaziSources(resolve('data'));
    expect(required).toHaveLength(3);
    for (const source of required) {
      expect(manifest.find(item => item.id === source.id)).toEqual(source);
      expect(service.bootstrap().sources.find(item => item.id === source.id)).toEqual(source);
    }
    for (const id of sessionReferencedSourceIds(session)) expect(manifest.some(source => source.id === id), id).toBe(true);
    const evidenceIds = new Set(evidence.sources.map(source => source.id));
    for (const rule of evidence.rules) for (const id of rule.sourceIds) expect(evidenceIds.has(id), rule.id).toBe(true);
    const html = reportHTML(session, defaults);
    expect(html).toContain('<section class="bazi-evidence-report">');
    for (const source of evidence.sources) expect(html).toContain(source.id);
  });

  it('keeps system evidence immutable while saving manual preferences, candidate reviews and restored history with CAS', async () => {
    const { store, service, session } = await setup(), originalEvidence = structuredClone(session.analysis.bazi.evidence), originalManifest = structuredClone(session.sourceSnapshot);
    const draft = structuredClone(session);draft.reviewNote = '核对来源后的总审阅';draft.candidates[0].reviewNote = '保留字义，单独记录取舍';draft.candidates[0].favorite = true;draft.preferences.preferredElements = ['水'];
    draft.analysis.bazi.evidence!.monthAuthority.status = 'determined';
    const saved = service.saveSession(draft);
    expect(saved.preferences.preferredElements).toEqual(['水']);
    expect(saved.analysis.bazi.evidence).toEqual(originalEvidence);
    expect(saved.sourceSnapshot).toEqual(originalManifest);
    expect(saved.candidates[0].favorite).toBe(true);
    const revision = service.listHistory(session.id)[0];
    expect(revision.session.analysis.bazi.evidence).toEqual(originalEvidence);
    const restored = service.restoreHistory(session.id, revision.id, saved.reviewRevision, saved.reviewToken);
    expect(restored.preferences.preferredElements).toEqual(session.preferences.preferredElements);
    expect(restored.reviewNote).toBe(session.reviewNote);
    expect(restored.analysis.bazi.evidence).toEqual(originalEvidence);
    expect(current(store, session.id).analysis.bazi.evidence).toEqual(originalEvidence);
    expect(service.listHistory(session.id)[0].session.reviewNote).toBe('核对来源后的总审阅');
  });

  it('imports an exported complete SQLite archive into a separate local store without changing evidence or source history', async () => {
    const { store, service, session } = await setup();
    const saved = service.saveSession({ ...structuredClone(session), reviewNote: '完整备份往返' });
    const archive = store.backupBytes(), target = await open();target.store.restore(archive);
    const imported = current(target.store, session.id);
    expect(imported.analysis.bazi).toEqual(saved.analysis.bazi);
    expect(imported.sourceSnapshot).toEqual(saved.sourceSnapshot);
    expect(imported.reviewNote).toBe(saved.reviewNote);
    expect(imported.reviewToken).not.toBe(saved.reviewToken);
    const revision = target.service.listHistory(session.id)[0];
    expect(revision.session.analysis.bazi.evidence).toEqual(session.analysis.bazi.evidence);
    const restored = target.service.restoreHistory(session.id, revision.id, imported.reviewRevision, imported.reviewToken);
    expect(restored.analysis.bazi.evidence).toEqual(session.analysis.bazi.evidence);
    target.store.restore(target.store.backupBytes());
    const afterSecondImport = current(target.store, session.id);
    expect(afterSecondImport.analysis.bazi).toEqual(session.analysis.bazi);
    expect(afterSecondImport.sourceSnapshot).toEqual(session.sourceSnapshot);
  });

  it('preserves frozen 1.0.0 output through save and backup and explicitly leaves its old UI/report evidence absent', async () => {
    const { store, session } = await setup(), legacy = structuredClone(session);
    legacy.id = 'frozen-legacy-bazi';legacy.analysis.bazi = calculateLegacyBazi(legacy.profile);legacy.analysis.qimen=calculateQimenProfileV2(legacy.profile);legacy.originalFavorable = [...legacy.analysis.bazi.favorable];delete legacy.sourceSnapshot;delete legacy.namingRules;for(const candidate of legacy.candidates)delete candidate.namingMeaningReview;
    const expected = structuredClone(legacy.analysis.bazi);
    expect(expected.version).toBe(LEGACY_BAZI_RULE_VERSION);
    expect(expected.evidence).toBeUndefined();expect(validSession(legacy)).toBe(true);
    store.saveSession(legacy);store.restore(store.backupBytes());
    const restored = current(store, legacy.id);
    expect(restored.analysis.bazi).toEqual(expected);
    expect(restored).not.toHaveProperty('namingRules');
    expect(baziSnapshotStatus(restored.analysis.bazi, restored.profile)).toBe('verified-legacy');
    for (const html of [renderToStaticMarkup(React.createElement(BaziEvidenceView, { evidence: restored.analysis.bazi.evidence })), reportHTML(restored, defaults)]) {
      expect(html).toContain('原方案未包含');expect(html).toContain('不自动补算');
      expect(html).not.toContain('<section class="bazi-evidence-report">');
    }
    expect(restored.analysis.bazi.evidence).toBeUndefined();
  });

  it('refuses missing and altered evidence at the storage write boundary without changing customer bytes or revisions', async () => {
    const { store, session } = await setup(), archive = store.backupBytes(), before = disk(store);
    for (const mutation of mutations) {
      const altered = structuredClone(session);mutation.edit(altered);
      expect(validSession(altered), mutation.name).toBe(false);
      expect(() => store.saveSession(altered), mutation.name).toThrow(/八字.*快照/);
      expect(disk(store).equals(before), mutation.name).toBe(true);
      expect(Buffer.from(store.backupBytes()).equals(Buffer.from(archive)), mutation.name).toBe(true);
      expect(store.listRevisions(session.id)).toEqual([]);
    }
    const missingSource = structuredClone(session), id = session.analysis.bazi.evidence!.sources[0].id;
    missingSource.sourceSnapshot!.sources = missingSource.sourceSnapshot!.sources.filter(source => source.id !== id);
    expect(validSession(missingSource)).toBe(false);
    expect(() => store.saveSession(missingSource)).toThrow();
    expect(disk(store).equals(before)).toBe(true);
  });

  it('rejects forged evidence in imported live rows and archived revisions without replacing the current archive', async () => {
    const { store, service, session } = await setup();service.saveSession({ ...structuredClone(session), reviewNote: '形成可验证的历史记录' });
    const good = store.backupBytes(), before = disk(store), SQL = await initSqlJs({ locateFile: () => wasm });
    for (const table of ['sessions', 'revisions']) for (const mutation of mutations) {
      const archive = new SQL.Database(good);
      try {
        const row = archive.exec(`SELECT json FROM ${table} LIMIT 1`)[0].values[0][0], altered = JSON.parse(String(row)) as NamingSession;
        mutation.edit(altered);archive.run(`UPDATE ${table} SET json=?`, [JSON.stringify(altered)]);
        expect(() => store.restore(archive.export()), `${table}/${mutation.name}`).toThrow('字段不完整');
      } finally { archive.close(); }
      expect(disk(store).equals(before), `${table}/${mutation.name}`).toBe(true);
      expect(Buffer.from(store.backupBytes()).equals(Buffer.from(good)), `${table}/${mutation.name}`).toBe(true);
    }
  });

  it('rejects a fully self-consistent foreign Bazi snapshot with actual different year and month pillars', async () => {
    const { store, session } = await setup(), foreign = analyzeProfile({ ...profile, birthDate: '2023-12-20' }).bazi;
    expect(foreign.pillars.find(item => item.label === '年柱')).not.toEqual(session.analysis.bazi.pillars.find(item => item.label === '年柱'));
    expect(foreign.pillars.find(item => item.label === '月柱')).not.toEqual(session.analysis.bazi.pillars.find(item => item.label === '月柱'));
    const altered = structuredClone(session);altered.analysis.bazi = foreign;altered.originalFavorable = [...foreign.favorable];
    expect(baziSnapshotStatus(foreign, { ...profile, birthDate: '2023-12-20' })).toBe('verified-current');
    expect(validSession(altered)).toBe(false);
    const before = disk(store), good = store.backupBytes();expect(() => store.saveSession(altered)).toThrow(/八字.*快照/);
    const SQL = await initSqlJs({ locateFile: () => wasm }), archive = new SQL.Database(good);
    try { archive.run('UPDATE sessions SET json=?', [JSON.stringify(altered)]);expect(() => store.restore(archive.export())).toThrow('字段不完整'); } finally { archive.close(); }
    expect(disk(store).equals(before)).toBe(true);
  });

  it('stores and exports Li Chun unknown-hour evidence without fabricating year, month, hour or authority verdicts', async () => {
    const { store, session } = await setup({ ...profile, birthDate: '2024-02-04', timeUnknown: true, birthTime: '' });
    const evidence = session.analysis.bazi.evidence!;
    expect(evidence.stems.map(item => item.pillar)).toEqual(['日柱']);
    expect(evidence.hiddenStems.every(item => item.pillar === '日柱')).toBe(true);
    expect(evidence.monthAuthority.segments).toHaveLength(2);
    expect(evidence.monthAuthority.status).toBe('not-evaluated');
    expect(evidence.monthAuthority.candidates).toEqual([]);
    expect(evidence.opinions.every(item => item.elements.length === 0)).toBe(true);
    store.restore(store.backupBytes());
    const restored = current(store, session.id), html = reportHTML(restored, defaults);
    expect(restored.analysis.bazi.evidence).toEqual(evidence);
    expect(html).toContain('出生时刻未知');expect(html).toContain('不生成缺失时柱');expect(html).toContain('司权未评估');
    expect(html).not.toContain('<section class="qimen-auxiliary-report"');
    expect(html).not.toContain('已定位司权候选');
  });

  it('makes the historical-to-current evidence difference readable in review comparison without rewriting either snapshot', async () => {
    const { session } = await setup(), legacy = structuredClone(session);legacy.analysis.bazi = calculateLegacyBazi(session.profile);
    const before = structuredClone(legacy), after = structuredClone(session);
    const difference = compareSessionReviews(legacy, session).find(item => item.field === '八字分层证据');
    expect(difference?.before).toContain('未保存八字分层证据');
    expect(difference?.after).toContain('明干/');expect(difference?.after).toContain('藏干');
    expect(difference?.after).toContain('月令方法 no-fixed-day/1.0.0');expect(difference?.after).toContain('未按分日定位');expect(difference?.after).toContain('扶抑');expect(difference?.after).toContain('季节意象');
    expect(difference?.after).toContain(BAZI_EVIDENCE_VERSION);
    expect(legacy).toEqual(before);expect(session).toEqual(after);
  });
});
