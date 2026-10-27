import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { NamingSession, SourceRecord } from '../shared/types';
import { validSessionSourceSnapshot } from '../shared/session-sources';

export const DITIAN_REN_SOURCE_ID = 'bazi-ditian-ren-2600158';
export const DITIAN_REN_VERSION = 'ditian-ren-commentary-2600158/1.0.0';
const LOCK_SHA256 = '7f24f1417dbd102bf608a4caf8e62f04f89cc9d0193f2bacbd7a69b3928f6037';
const ORIGINAL_SHA256 = '1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d';
const SCAN_SHA256 = 'd6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803';
const HASH_CONVENTION = 'sha256(JSON.stringify(fileHashes)); sorted relative path keys';
const EXPECTED_FILES = ['data/ditian-ren-table.json', 'data/raw/CC-BY-SA-4.0.txt', 'data/raw/ditian-ren-NOTICE.md', 'data/raw/ditian-ren-excerpts.json', 'data/raw/ditian-ren-scan-collation.json'];
const hash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

export interface DitianRenExcerpt { quote: string; locator: string; }
export interface DitianRenClause extends DitianRenExcerpt {
  id: string; section: string; layer: string; sourceQuote: string; sourceLocator: string; displayScope: string;
}
export interface DitianRenQuarantine {
  code: 'calendrical-conflict' | 'source-text-ambiguity'; reason: string;
  scope: 'birth-calendar' | 'author-classification'; scanPage: number;
}
export interface DitianRenCase {
  id: string; section: string; pillars: [string, string, string, string];
  authorAssertion: string; authorLabels: string[]; classificationEvidence: string;
  confidence: 'explicit-text' | 'context-only' | 'ambiguous-text';
  labelConfidence: 'explicit' | 'context-only' | 'quarantined'; authority: 'ren-case-commentary';
  sourceParagraph: DitianRenExcerpt; sourceQuote: string; sourceLocator: string;
  sourceExcerptIds: string[]; chart: DitianRenExcerpt; quarantines: DitianRenQuarantine[];
  boundaryNote: string; independentScanPage?: number; datePolicy: string;
  classificationScope: 'other-stem-combination-relation' | 'source-case-author-assertion';
}
export interface DitianRenContract {
  id: string; name: string; predicate: string; sourceClauseIds: string[]; sourceCaseIds: string[];
  sourceSupplementalIds: string[]; scope: string; evaluation: string; decisionRole: string;
  authority: 'project-structural-observation-from-ren-text'; limitations: string[];
}
export interface DitianRenGraphClause extends DitianRenExcerpt {
  id: string; section: string; layer: string; authority: string; sourceLocator: string;
  sourceQuote: string; scopeNote: string; interpretationStatus: string;
}
export interface DitianRenGraphContract {
  id: string; sourceClauseId: string; sourceClauseIds: string[]; sourceRefs: string[];
  premises: string[]; result: string[]; guards: string[]; sourceCaseConstraints: string[];
  behavior: string; authority: string; effectPolicy: string;
}
export interface DitianRenGraphSourceClaim {
  id: string; pillars: [string, string, string, string]; layer: string;
  authorEffect: DitianRenExcerpt & { sourceLocator: string }; chart: DitianRenExcerpt;
  scopeNote: string; notGeneralSufficientPredicate: true; temporalScope: string;
  sourceRefs: string[]; classificationScope: 'exact-author-case-effect-only';
}
export interface DitianRenTable {
  version: typeof DITIAN_REN_VERSION; profileId: typeof DITIAN_REN_VERSION; sourceId: typeof DITIAN_REN_SOURCE_ID;
  authority: 'ren-commentary'; pillarOrder: ['year', 'month', 'day', 'hour'];
  source: { id: string; title: string; author: string; revision: number; pageid: number; timestamp: string; url: string; fullWikitextSha256: string; fullWikitextCodepoints: number; defaultAuthority: string };
  clauses: DitianRenClause[];
  supplementalExcerpts: Array<DitianRenExcerpt & { id: string; section: string; layer: string }>;
  contracts: DitianRenContract[]; cases: DitianRenCase[]; limits: string[];
  graphClauses: DitianRenGraphClause[]; graphContracts: DitianRenGraphContract[];
  graphSourceClaims: DitianRenGraphSourceClaim[];
  graphPolicy: { nodePreservation: string; effectPolicy: string; noCircularity: string; conflictPolicy: string };
}
type LockedSource = SourceRecord & { fileHashes: Record<string, string> };
type ArchivedCase = { id: string; section: string; layer: string; pillars: string[]; chart: DitianRenExcerpt; paragraph: DitianRenExcerpt };
type Archive = {
  version: string; source: DitianRenTable['source'];
  sections: Array<DitianRenExcerpt & { title: string }>;
  coreClauses: Array<DitianRenExcerpt & { id: string; section: string; layer: string }>;
  supplementalExcerpts: DitianRenTable['supplementalExcerpts'];
  caseParagraphs: ArchivedCase[];
  displayExcerpts: Array<DitianRenExcerpt & { id: string; caseId: string; section: string; layer: string }>;
  graphClauses: DitianRenGraphClause[]; graphContracts: DitianRenGraphContract[];
  graphSourceClaims: DitianRenGraphSourceClaim[];
  graphCaseParagraphs: Array<{ id: string; pillars: string[]; layer: string; authorEffect: { quote: string; sourceLocator: string }; sourceParagraph: { quote: string; sourceLocator: string }; chart: { quote: string; sourceLocator: string } }>;
};

const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
function uniqueIds(rows: Array<{ id: string }>, count: number): boolean {
  return Array.isArray(rows) && rows.length === count && rows.every(row => row && nonempty(row.id)) && new Set(rows.map(row => row.id)).size === count;
}
function coordinates(excerpt: DitianRenExcerpt): [number, number] | undefined {
  if (!excerpt || !nonempty(excerpt.quote) || !nonempty(excerpt.locator)) return;
  const match = /^oldid=2600158;codepoint\[(\d+),(\d+)\)$/.exec(excerpt.locator);
  if (!match) return;
  const from = Number(match[1]), to = Number(match[2]);
  if (from < 0 || to <= from || to > 143701 || to - from !== [...excerpt.quote].length) return;
  return [from, to];
}
/** Check a literal child excerpt against the archived complete paragraph, preserving absolute codepoints. */
function contained(parent: DitianRenExcerpt, child: DitianRenExcerpt): boolean {
  const p = coordinates(parent), c = coordinates(child);
  return !!p && !!c && c[0] >= p[0] && c[1] <= p[1] && [...parent.quote].slice(c[0] - p[0], c[1] - p[0]).join('') === child.quote;
}

/** Load fixed, separately licensed Ren-commentary material. Full scan is never a packaged dependency. */
export function loadDitianRenData(directory: string): { table: DitianRenTable; sources: SourceRecord[] } {
  const rawLock = readFileSync(join(directory, 'ditian-ren-source-lock.json'));
  if (hash(rawLock) !== LOCK_SHA256) throw new Error('任注来源登记校验失败。');
  const lock = JSON.parse(rawLock.toString('utf8')) as { version: string; hashConvention: string; sources: LockedSource[] };
  if (lock.version !== DITIAN_REN_VERSION || lock.hashConvention !== HASH_CONVENTION || !Array.isArray(lock.sources) || lock.sources.length !== 1 || lock.sources[0].id !== DITIAN_REN_SOURCE_ID) throw new Error('任注来源版本不完整。');
  const source = lock.sources[0], actual: Record<string, string> = {};
  if (!Array.isArray(source.files) || !isDeepStrictEqual([...source.files].sort(), EXPECTED_FILES) || !source.fileHashes || Object.keys(source.fileHashes).length !== EXPECTED_FILES.length) throw new Error('任注原件登记不完整。');
  for (const file of [...source.files].sort()) {
    if (!file.startsWith('data/') || file.split('/').some(part => part === '..' || part === '.') || !/^[a-f0-9]{64}$/.test(source.fileHashes[file] ?? '')) throw new Error('任注原件定位无效。');
    actual[file] = hash(readFileSync(join(directory, file.slice(5))));
    if (actual[file] !== source.fileHashes[file]) throw new Error('任注原文、规则、校勘或许可校验失败。');
  }
  if (hash(JSON.stringify(actual)) !== source.sha256) throw new Error('任注来源汇总校验失败。');
  const table = JSON.parse(readFileSync(join(directory, 'ditian-ren-table.json'), 'utf8')) as DitianRenTable;
  const archive = JSON.parse(readFileSync(join(directory, 'raw/ditian-ren-excerpts.json'), 'utf8')) as Archive;
  const collation = JSON.parse(readFileSync(join(directory, 'raw/ditian-ren-scan-collation.json'), 'utf8')) as { metadata: { revision: number; sha256: string; pages: number }; collatedPages: Array<{ page: number }>; conflicts: Array<{ caseId: string; scanPage: number }> };
  if (table.version !== DITIAN_REN_VERSION || table.profileId !== DITIAN_REN_VERSION || table.sourceId !== DITIAN_REN_SOURCE_ID || table.authority !== 'ren-commentary' || !isDeepStrictEqual(table.pillarOrder, ['year', 'month', 'day', 'hour']) || table.source.fullWikitextSha256 !== ORIGINAL_SHA256 || table.source.revision !== 2600158 || table.source.fullWikitextCodepoints !== 143701) throw new Error('任注规则版本或权威层级不一致。');
  if (!uniqueIds(table.cases, 42) || !uniqueIds(table.clauses, 15) || !uniqueIds(table.contracts, 10) || !uniqueIds(table.supplementalExcerpts, 9) || !uniqueIds(archive.caseParagraphs, 42) || !uniqueIds(archive.coreClauses, 15) || !Array.isArray(archive.sections) || archive.sections.length !== 5 || !isDeepStrictEqual(archive.source, table.source)) throw new Error('任注条文、结构合同或判例范围不一致。');
  const caseIds = new Set(table.cases.map(item => item.id)), clauseIds = new Set(table.clauses.map(item => item.id)), supplementalIds = new Set(table.supplementalExcerpts.map(item => item.id));
  for (const item of table.clauses) {
    const original = archive.coreClauses.find(row => row.id === item.id);
    if (!original || item.layer !== original.layer || item.section !== original.section || !contained(original, item) || item.sourceQuote !== item.quote || item.sourceLocator !== item.locator) throw new Error('任注核心句原文或层级不一致。');
  }
  if (!isDeepStrictEqual(table.supplementalExcerpts, archive.supplementalExcerpts) || table.supplementalExcerpts.some(item => !coordinates(item))) throw new Error('任注补充定义原文不一致。');
  for (const item of table.cases) {
    const original = archive.caseParagraphs.find(row => row.id === item.id);
    if (!original || !Array.isArray(item.pillars) || item.pillars.length !== 4 || item.pillars.some(pillar => !/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(pillar)) || !isDeepStrictEqual(item.pillars, original.pillars) || item.chart.quote !== original.chart.quote || item.chart.locator !== original.chart.locator || item.chart.quote.replace(/\s+/g, '') !== item.pillars.join('') || !coordinates(item.chart) || !contained(original.paragraph, item.sourceParagraph)) throw new Error('任注四柱或原例节录不一致。');
    if (item.sourceQuote !== item.sourceParagraph.quote || item.sourceLocator !== item.sourceParagraph.locator || !nonempty(item.authorAssertion) || !isDeepStrictEqual(item.authorLabels, [item.authorAssertion]) || !Array.isArray(item.sourceExcerptIds) || !item.sourceExcerptIds.length || new Set(item.sourceExcerptIds).size !== item.sourceExcerptIds.length) throw new Error('任注原例标签或节录引用不完整。');
    for (const id of item.sourceExcerptIds) {
      const display = archive.displayExcerpts.find(row => row.id === id && row.caseId === item.id);
      if (!display || !contained(original.paragraph, display)) throw new Error('任注原例显示节录越出原段。');
    }
    const firstDisplay = archive.displayExcerpts.find(row => row.id === item.sourceExcerptIds[0]);
    if (!firstDisplay || firstDisplay.quote !== item.sourceQuote || firstDisplay.locator !== item.sourceLocator) throw new Error('任注首节录与显示原句不一致。');
  }
  for (const contract of table.contracts) {
    if (contract.predicate !== contract.id || !nonempty(contract.name) || !nonempty(contract.scope) || !nonempty(contract.evaluation) || !Array.isArray(contract.sourceClauseIds) || !Array.isArray(contract.sourceCaseIds) || !Array.isArray(contract.sourceSupplementalIds) || !contract.sourceClauseIds.length && !contract.sourceCaseIds.length && !contract.sourceSupplementalIds.length || contract.sourceClauseIds.some(id => !clauseIds.has(id)) || contract.sourceCaseIds.some(id => !caseIds.has(id)) || contract.sourceSupplementalIds.some(id => !supplementalIds.has(id))) throw new Error('任注结构合同引用了不存在的来源，不能忽略依赖。');
  }
  if (!uniqueIds(table.graphClauses, 29) || !uniqueIds(table.graphContracts, 11) || !uniqueIds(table.graphSourceClaims, 16) || !uniqueIds(archive.graphCaseParagraphs, 16) || !isDeepStrictEqual(table.graphClauses, archive.graphClauses) || !isDeepStrictEqual(table.graphContracts, archive.graphContracts) || !isDeepStrictEqual(table.graphSourceClaims, archive.graphSourceClaims)) throw new Error('任注有向作用原句或必要依赖合同缺失。');
  const graphClauseIds = new Set(table.graphClauses.map(item => item.id));
  for (const clause of table.graphClauses) if (!coordinates(clause) || clause.sourceLocator !== clause.locator || clause.sourceQuote !== clause.quote || clause.layer !== clause.authority || !nonempty(clause.scopeNote)) throw new Error('任注有向作用原句定位或层级不一致。');
  for (const contract of table.graphContracts) if (!graphClauseIds.has(contract.sourceClauseId) || !Array.isArray(contract.premises) || !contract.premises.length || !Array.isArray(contract.guards) || !contract.guards.length || !Array.isArray(contract.result) || !contract.result.length || !isDeepStrictEqual(contract.sourceClauseIds, [contract.sourceClauseId]) || !isDeepStrictEqual(contract.sourceRefs, [contract.sourceClauseId]) || !Array.isArray(contract.sourceCaseConstraints) || contract.sourceCaseConstraints.some(id => !caseIds.has(id)) || !nonempty(contract.effectPolicy)) throw new Error('任注有向作用合同不能省略前提或来源依赖。');
  for (const claim of table.graphSourceClaims) {
    const original = archive.graphCaseParagraphs.find(item => item.id === claim.id);
    if (!original || !isDeepStrictEqual(claim.pillars, original.pillars) || !isDeepStrictEqual(claim.authorEffect.quote, original.authorEffect.quote) || claim.authorEffect.locator !== original.authorEffect.sourceLocator || claim.authorEffect.sourceLocator !== claim.authorEffect.locator || !contained({ quote: original.sourceParagraph.quote, locator: original.sourceParagraph.sourceLocator }, claim.authorEffect) || claim.chart.quote !== original.chart.quote || claim.chart.locator !== original.chart.sourceLocator || !coordinates(claim.chart) || claim.chart.quote.replace(/\s+/g, '') !== claim.pillars.join('') || claim.notGeneralSufficientPredicate !== true || claim.classificationScope !== 'exact-author-case-effect-only') throw new Error('任注原例动作节录越出原段，或被误作通用充分规则。');
  }
  const quarantined = table.cases.filter(item => item.quarantines.length);
  if (!isDeepStrictEqual(quarantined.map(item => item.id).sort(), ['false-hua-gui-contradiction', 'false-sha-xin']) || quarantined.some(item => item.labelConfidence !== 'quarantined' || item.confidence !== 'ambiguous-text') || table.cases.some(item => !Array.isArray(item.quarantines)) || collation.metadata.revision !== 708090379 || collation.metadata.sha256 !== SCAN_SHA256 || collation.metadata.pages !== 516 || collation.collatedPages.length !== 16 || new Set(collation.collatedPages.map(item => item.page)).size !== 16) throw new Error('任注疑文隔离或影印校勘范围不一致。');
  for (const item of quarantined) for (const quarantine of item.quarantines) if (!collation.conflicts.some(conflict => conflict.caseId === item.id && conflict.scanPage === quarantine.scanPage)) throw new Error('任注疑文缺少独立校勘定位。');
  const { id, name, url, commit, license, files, sha256, note } = source;
  return { table, sources: [{ id, name, url, commit, license, files: [...files], sha256, note }] };
}

export function loadDitianRenSources(directory: string): SourceRecord[] { return loadDitianRenData(directory).sources; }

/** Enabled modern snapshots require the fixed independent source, including unknown-time results. */
export function verifyDitianRenProvenance(session: NamingSession, sources: SourceRecord[]): void {
  const used = (session.analysis as unknown as { renCommentary?: unknown }).renCommentary !== undefined;
  const recorded = session.sourceSnapshot?.sources.filter(source => source.id === DITIAN_REN_SOURCE_ID) ?? [];
  if (!used && !recorded.length) return;
  if (!used && recorded.length) throw new Error('任注来源不得附着未启用方案。');
  if (!session.sourceSnapshot || !validSessionSourceSnapshot(session.sourceSnapshot, session.dataVersion)) throw new Error('任注方案缺少完整生成时来源清单。');
  const expected = sources.filter(source => source.id === DITIAN_REN_SOURCE_ID);
  if (expected.length !== 1 || recorded.length !== 1 || !isDeepStrictEqual(expected[0], recorded[0])) throw new Error('任注生成时来源与固定评注版本不一致。');
}
