import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadDitianRenData, loadDitianRenSources, verifyDitianRenProvenance, DITIAN_REN_SOURCE_ID, DITIAN_REN_VERSION } from '../src/main/ditian-ren-data';
import { createSessionSourceSnapshot } from '../src/shared/session-sources';
import type { NamingSession } from '../src/shared/types';

const directories: string[] = [];
const root = resolve('data');
const getRaw = (file: string) => JSON.parse(readFileSync(resolve('data/raw', file), 'utf8'));
function isolated() {
  const directory = mkdtempSync(join(tmpdir(), 'ditian-ren-source-122-')); directories.push(directory);
  const lock = JSON.parse(readFileSync(join(root, 'ditian-ren-source-lock.json'), 'utf8'));
  for (const file of ['data/ditian-ren-source-lock.json', ...lock.sources[0].files]) {
    const target = join(directory, file.slice(5)); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, readFileSync(resolve(file)));
  }
  return directory;
}
afterEach(() => directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true })));

describe('independent fixed Ren-commentary data and provenance', () => {
  it('binds42original charts15layered clauses10contracts and9supplemental literal definitions', () => {
    const { table, sources } = loadDitianRenData(root);
    expect(table.version).toBe(DITIAN_REN_VERSION); expect(table.profileId).toBe(DITIAN_REN_VERSION);
    expect(table.sourceId).toBe(DITIAN_REN_SOURCE_ID); expect(table.authority).toBe('ren-commentary');
    expect(table.pillarOrder).toEqual(['year', 'month', 'day', 'hour']);
    expect(table.cases).toHaveLength(42); expect(table.clauses).toHaveLength(15); expect(table.contracts).toHaveLength(10); expect(table.supplementalExcerpts).toHaveLength(9);
    expect(sources).toHaveLength(1); expect(sources[0].commit).toBe('wikisource-revision/2600158'); expect(sources[0].license).toContain('CC-BY-SA-4.0');
    expect(sources[0].files.some(file => file.includes('NOTICE'))).toBe(true); expect(sources[0].files.some(file => file.endsWith('.pdf') || file.endsWith('.jpg'))).toBe(false);
  });

  it('keeps full context in raw archive but runtime quotes only source-exact structure/classification excerpts', () => {
    const { table } = loadDitianRenData(root), archive = getRaw('ditian-ren-excerpts.json');
    expect(archive.sections).toHaveLength(5); expect(archive.caseParagraphs).toHaveLength(42);
    for (const entry of table.cases) {
      const original = archive.caseParagraphs.find((item: any) => item.id === entry.id);
      expect(original.paragraph.quote).toContain(entry.sourceQuote); expect(entry.sourceParagraph.quote).toBe(entry.sourceQuote);
      expect(entry.chart.quote.replace(/\s+/g, '')).toBe(entry.pillars.join(''));
      expect(entry.sourceExcerptIds.every(id => archive.displayExcerpts.some((item: any) => item.id === id && item.caseId === entry.id))).toBe(true);
      expect(entry).not.toHaveProperty('birthDate'); expect(entry).not.toHaveProperty('gregorianDate');
      expect(entry.sourceQuote).not.toMatch(/登科|中乡榜|仕至|亡|贫乏|为僧|性格|婚姻|寿越|克妻|丧服|不能善终/);
    }
    const rawFalseHua = archive.caseParagraphs.find((item: any) => item.id === 'false-hua-jia-2');
    expect(rawFalseHua.paragraph.quote).toContain('因之人品不端');
    expect(table.cases.find(item => item.id === 'false-hua-jia-2')!.sourceQuote).not.toContain('人品');
    expect(table.clauses.find(item => item.id === 'supplement-not-original')!.layer).toBe('compiled-couplet');
    expect(archive.coreClauses.find((item: any) => item.id === 'supplement-not-original').quote).toContain('原文缺，此后人按原注意补');
  });

  it('does not upgrade chapter context into explicitfalse and separates other-stem relations from daymaster transformation', () => {
    const { table } = loadDitianRenData(root);
    for (const id of ['false-sha-pulled-root', 'false-guan-earth', 'false-sha-ding', 'false-hua-ren']) {
      const item = table.cases.find(row => row.id === id)!; expect(item.classificationEvidence).toBe('chapter-only-false'); expect(item.labelConfidence).toBe('context-only');
    }
    expect(table.cases.find(item => item.id === 'false-sha-explicit')!.classificationEvidence).toBe('explicit-false');
    for (const id of ['combine-transform', 'combine-nontransform']) expect(table.cases.find(item => item.id === id)!.classificationScope).toBe('other-stem-combination-relation');
  });

  it('preserves both independently confirmed quarantines without correcting recorded chart or source text', () => {
    const { table } = loadDitianRenData(root), quarantine = table.cases.filter(item => item.quarantines.length), collation = getRaw('ditian-ren-scan-collation.json');
    expect(quarantine.map(item => item.id).sort()).toEqual(['false-hua-gui-contradiction', 'false-sha-xin']);
    expect(quarantine.every(item => item.labelConfidence === 'quarantined' && item.confidence === 'ambiguous-text')).toBe(true);
    const calendar = quarantine.find(item => item.id === 'false-sha-xin')!;
    expect(calendar.pillars).toEqual(['丁卯', '丙寅', '辛亥', '庚寅']); expect(calendar.quarantines[0]).toMatchObject({ code: 'calendrical-conflict', scope: 'birth-calendar', scanPage: 383 });
    const ambiguous = quarantine.find(item => item.id === 'false-hua-gui-contradiction')!;
    expect(ambiguous.sourceQuote).toContain('日主不能从合矣'); expect(ambiguous.quarantines[0]).toMatchObject({ code: 'source-text-ambiguity', scope: 'author-classification', scanPage: 387 });
    expect(collation.collatedPages).toHaveLength(16); expect(collation.metadata.pages).toBe(516); expect(collation.metadata.revision).toBe(708090379); expect(collation.metadata.license).toContain('PD-scan');
  });

  it('retains author examples that ruleout invalid universal strength/root/wealth/辰vetoes', () => {
    const { table } = loadDitianRenData(root), byId = (id: string) => table.cases.find(item => item.id === id)!;
    expect(byId('cai-root').sourceQuote).toContain('蟠根在未'); expect(byId('cai-resource').sourceQuote).toContain('戊土虽生犹死');
    expect(byId('child-jia-chou').pillars).toEqual(['甲午', '丁丑', '甲午', '丙寅']);
    expect(byId('child-bing-chou').sourceQuote).toContain('丑中辛财为用');
    expect(byId('child-xin-winter-2').sourceQuote).toContain('虽天干三透辛金');
    expect(byId('child-wood-fire').pillars[3]).toBe('丁亥'); expect(byId('child-wood-fire').sourceQuote).toContain('格成顺局从儿');
    expect(byId('hua-ren-2').pillars.every(pillar => !pillar.includes('辰'))).toBe(true); expect(byId('hua-ren-2').sourceQuote).toContain('化象更真');
    expect(byId('strong-wood-no').sourceQuote).toContain('非前造从强论');
    for (const contract of table.contracts) expect(contract.sourceClauseIds.length + contract.sourceCaseIds.length + contract.sourceSupplementalIds.length).toBeGreaterThan(0);
    expect(table.contracts.find(item => item.id === 'child-month-food-observation')!.decisionRole).toBe('necessary-wording-scope-unresolved');
  });

  it('binds29directed action clauses and11premisecontracts without substitutingpairpresenceforeffect', () => {
    const { table } = loadDitianRenData(root), archive = getRaw('ditian-ren-excerpts.json');
    expect(table.graphClauses).toHaveLength(29); expect(table.graphContracts).toHaveLength(11); expect(table.graphSourceClaims).toHaveLength(16);
    expect(table.graphClauses).toEqual(archive.graphClauses); expect(table.graphContracts).toEqual(archive.graphContracts);
    for (const clause of table.graphClauses) {
      const match = /^oldid=2600158;codepoint\[(\d+),(\d+)\)$/.exec(clause.locator)!;
      expect(match).not.toBeNull(); expect(Number(match[2]) - Number(match[1])).toBe([...clause.quote].length);
      expect(clause.sourceQuote).toBe(clause.quote); expect(clause.sourceLocator).toBe(clause.locator); expect(clause.layer).toBe(clause.authority);
    }
    for (const contract of table.graphContracts) {
      expect(table.graphClauses.some(item => item.id === contract.sourceClauseId)).toBe(true);
      expect(contract.sourceRefs).toEqual([contract.sourceClauseId]); expect(contract.premises.length).toBeGreaterThan(0); expect(contract.guards.length).toBeGreaterThan(0);
      expect(contract.effectPolicy).toContain('前提独立成立');
    }
    expect(table.graphClauses.find(item => item.id === 'root-heavy-light')!.quote).toContain('奶之轻者');
    expect(table.graphClauses.find(item => item.id === 'root-heavy-light')!.interpretationStatus).toBe('source-variant-retained');
    expect(table.graphClauses.find(item => item.id === 'same-chart-wealth-damage')!.layer).toBe('ren-case');
    expect(table.graphPolicy.noCircularity).toContain('neverbootstrap');
  });

  it('keeps16exact-author-effect claims source-exact, life-prosefree and nevergeneral sufficient predicates', () => {
    const { table } = loadDitianRenData(root), archive = getRaw('ditian-ren-excerpts.json');
    for (const claim of table.graphSourceClaims) {
      const original = archive.graphCaseParagraphs.find((item: any) => item.id === claim.id);
      expect(original.sourceParagraph.quote).toContain(claim.authorEffect.quote); expect(claim.authorEffect.quote).not.toMatch(/登科|仕至|中乡榜|亡|性格|克妻/);
      expect(claim.notGeneralSufficientPredicate).toBe(true); expect(claim.classificationScope).toBe('exact-author-case-effect-only');
      expect(claim.chart.quote.replace(/\s+/g, '')).toBe(claim.pillars.join(''));
      expect(claim.authorEffect.sourceLocator).toBe(claim.authorEffect.locator);
    }
    const eight = table.supplementalExcerpts.find(item => item.id === 'ren-clash-eight-members')!.quote;
    for (const pair of ['子午冲', '卯酉冲', '寅申冲', '巳亥冲']) expect(eight).toContain(pair);
    const store = table.supplementalExcerpts.find(item => item.id === 'ren-clash-store-members')!.quote;
    expect(store).toContain('三月之辰'); expect(store).toContain('逢戌冲'); expect(store).toContain('六月之未'); expect(store).toContain('逢丑冲');
  });

  it('rejects an altered source registration before trusting its alleged files', () => {
    const directory = isolated(), file = join(directory, 'ditian-ren-source-lock.json'); writeFileSync(file, readFileSync(file, 'utf8') + ' ');
    expect(() => loadDitianRenData(directory)).toThrow('来源登记校验失败');
  });

  it.each(['ditian-ren-table.json', 'raw/ditian-ren-excerpts.json', 'raw/ditian-ren-scan-collation.json', 'raw/ditian-ren-NOTICE.md', 'raw/CC-BY-SA-4.0.txt'])('rejects alteredtable/raw/collation/license %s', filename => {
    const directory = isolated(), file = join(directory, filename); writeFileSync(file, readFileSync(file, 'utf8') + 'changed');
    expect(() => loadDitianRenData(directory)).toThrow('原文、规则、校勘或许可校验失败');
  });

  it('requires complete fixed sources for enabled Ren analysis including unknown-time results', () => {
    const sources = loadDitianRenSources(root), session = { dataVersion: 'test', analysis: { renCommentary: { state: 'unknown' } }, sourceSnapshot: createSessionSourceSnapshot('test', sources) } as unknown as NamingSession;
    expect(() => verifyDitianRenProvenance(session, sources)).not.toThrow();
    session.sourceSnapshot!.sources[0].commit = 'forged'; expect(() => verifyDitianRenProvenance(session, sources)).toThrow('固定评注版本不一致');
    delete session.sourceSnapshot; expect(() => verifyDitianRenProvenance(session, sources)).toThrow('完整生成时来源清单');
  });

  it('checks a recorded Ren source even if the analysisfield was removed and never backfills legacy', () => {
    const sources = loadDitianRenSources(root), session = { dataVersion: 'test', analysis: {}, sourceSnapshot: createSessionSourceSnapshot('test', sources) } as unknown as NamingSession;
    expect(() => verifyDitianRenProvenance(session, sources)).toThrow('来源不得附着未启用');
    session.sourceSnapshot!.sources[0].sha256 = 'f'.repeat(64); expect(() => verifyDitianRenProvenance(session, sources)).toThrow('来源不得附着未启用');
    const old = { analysis: { bazi: {} } } as unknown as NamingSession; expect(() => verifyDitianRenProvenance(old, sources)).not.toThrow(); expect(old.sourceSnapshot).toBeUndefined();
  });
});
