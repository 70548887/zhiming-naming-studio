import {beforeAll, afterAll, describe, expect, it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createNamingCoverageProvider} from '../src/main/naming-coverage-provider';
import type {NamingCoverageCurrentDataset, NamingCoverageStoreView} from '../src/main/naming-coverage-provider';
import type {CoverageDto} from '../src/shared/naming-coverage';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = path.join(project, 'data');
const evidence = process.env.M631_EVIDENCE_DIR ?? path.resolve(project, '..', 'evidence');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const read = (relative: string) => JSON.parse(fs.readFileSync(path.join(original, relative), 'utf8'));
const fixedJson = read('dataset-v6.json');
const dataset = (): NamingCoverageCurrentDataset => ({...structuredClone(fixedJson), version: hash(fs.readFileSync(path.join(original, 'knowledge-v6.sqlite'))).slice(0, 12)});
let directory: string;
let dataDirectory: string;
let current: NamingCoverageStoreView;
let ownerReads = 0;
const provider = createNamingCoverageProvider(() => { ownerReads++; return current; });
const fixtureFiles = new Set<string>();
const m460Core = ['naming-character-meanings-v71-m460-b02-profile.json', 'naming-character-meanings-v71-m460-b02-admission.json',
  'naming-character-meanings-v71-m460-b02-source-lock.json', 'naming-character-meanings-v71-m460-b02-manifest.json',
  'raw/naming-character-meanings-v71-m460-b02-subset.json', 'naming-character-meanings-v71-m460-b02-root-decision.json'];
function unavailable(dto: CoverageDto): void {
  expect(dto.status).toBe('unavailable');
  expect(dto).not.toHaveProperty('characters');
  expect(dto).not.toHaveProperty('meanings');
  expect(dto).not.toHaveProperty('elements');
  expect(JSON.stringify(dto)).not.toMatch(/[A-Za-z]:[\\/]|\.local|source-lock\.json/);
}
function withMissing(relative: string, action: () => Promise<void>): Promise<void> {
  const file = path.join(dataDirectory, relative), saved = file + '.m631-hidden';
  fs.renameSync(file, saved);
  return action().finally(() => fs.renameSync(saved, file));
}

beforeAll(() => {
  fs.mkdirSync(evidence, {recursive: true});
  directory = fs.mkdtempSync(path.join(evidence, 'provider-source-'));
  dataDirectory = path.join(directory, 'data');
  const lockStems = ['naming-editorial-meanings-v7', 'naming-character-meanings-v7.1', 'naming-character-meanings-v71-m460-b02',
    'meaning-context-next', 'meaning-context-v1-1', 'meaning-context-m460-b04'];
  for (const stem of lockStems) {
    fixtureFiles.add(stem + '-source-lock.json');
    const manifest = stem + '-manifest.json';
    if (fs.existsSync(path.join(original, manifest))) fixtureFiles.add(manifest);
    for (const source of read(stem + '-source-lock.json').sources)
      for (const file of source.files) { expect(file.startsWith('data/')).toBe(true); fixtureFiles.add(file.slice(5)); }
  }
  for (const file of m460Core) fixtureFiles.add(file);
  for (const file of fs.readdirSync(path.join(original, 'm460-lexical'), {recursive: true}) as string[]) {
    const relative = path.join('m460-lexical', file);
    if (fs.statSync(path.join(original, relative)).isFile()) fixtureFiles.add(relative);
  }
  const element = read('element-object/source-lock.json');
  fixtureFiles.add('element-object/source-lock.json');
  for (const file of Object.keys(element.projectFiles)) fixtureFiles.add('element-object/' + file);
  for (const source of element.rawSources) fixtureFiles.add(source.path.slice(5));
  for (const file of fixtureFiles) {
    const target = path.join(dataDirectory, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(original, file), target);
  }
  current = {dataDir: dataDirectory, dataset: dataset()};
});

afterAll(() => {
  fs.writeFileSync(path.join(evidence, 'provider-fixture-receipt.json'), JSON.stringify({
    sourceProject: project, copiedSourceFiles: fixtureFiles.size, fixtureDirectory: directory,
    actualLoaderQueries: ownerReads, storeCreated: false, sqlEngine: false, worker: false, browser: false,
    originalSourcesUnchanged: [...fixtureFiles].every(file => hash(fs.readFileSync(path.join(dataDirectory, file))) === hash(fs.readFileSync(path.join(original, file))))
  }, null, 2) + '\n');
});

describe('actual Store-owned parameterless coverage provider, no Store generation', () => {
  it('does no owner read at construction and rejects caller selectors before loading', async () => {
    expect(ownerReads).toBe(0);
    const dto = await Reflect.apply(provider.getNamingCoverage, provider, [{dataDir: 'D:/caller-selected'}]);
    unavailable(dto);
    expect(ownerReads).toBe(0);
  });

  it('uses real source loaders and the current Store-shaped dataset to produce dynamic scoped coverage', async () => {
    const before = structuredClone(current.dataset);
    const dto = await provider.getNamingCoverage();
    expect(dto.status).toBe('available');
    if (dto.status !== 'available') throw Error('Actual provider qualification failed');
    expect({total: dto.characters.count, base: dto.meanings.base.count, supplement: dto.meanings.supplementalAutomatic.count,
      overlap: dto.meanings.baseVsSupplemental.intersection.count, automatic: dto.meanings.defaultAutomatic.count,
      standalone: dto.meanings.standaloneOnRequest.count, material: dto.meanings.displayMaterialUnion.count,
      words: dto.meanings.conditionalWords.caseCount, b04: dto.meanings.b04ReadOnlyOff.caseCount,
      originalElements: dto.elements.originalLabels.count, unknown: dto.elements.originalUnknown.count, imagery: dto.elements.imageryCandidates.count
    }).toEqual({total: 779, base: 217, supplement: 304, overlap: 0, automatic: 521, standalone: 60, material: 581,
      words: 40, b04: 20, originalElements: 257, unknown: 522, imagery: 56});
    expect(dto.meanings.b04ReadOnlyOff.activation).toBe('off');
    expect(dto.elements.newDefaultEffectiveElements).toEqual([]);
    expect(dto.elements.imageryEstablishesTraditionalElements).toBe(false);
    expect(current.dataset).toEqual(before);
    fs.writeFileSync(path.join(evidence, 'actual-provider-dto.json'), JSON.stringify(dto, null, 2) + '\n');
  }, 30000);

  it('does not borrow fixed coverage after the actual dataset version, reading, knowledge or source changes', async () => {
    const originalOwner = current;
    for (const change of [
      (value: NamingCoverageCurrentDataset) => ({...value, version: 'f'.repeat(12)}),
      (value: NamingCoverageCurrentDataset) => ({...value, characters: value.characters.map((row, i) => i ? row : {...row, pinyin: 'wrong'})}),
      (value: NamingCoverageCurrentDataset) => ({...value, knowledge: value.knowledge.slice(1)}),
      (value: NamingCoverageCurrentDataset) => ({...value, sources: value.sources.slice(1)})
    ]) {
      current = {...originalOwner, dataset: change(dataset())};
      unavailable(await provider.getNamingCoverage());
    }
    current = originalOwner;
  }, 30000);

  it('returns unavailable after a required source is removed despite an earlier successful read', async () => {
    await withMissing('meaning-context-v1-1-manifest.json', async () => unavailable(await provider.getNamingCoverage()));
  }, 30000);

  it('refuses legacy40 fallback when all required current M460 core files are absent', async () => {
    expect(read('naming-character-meanings-v7.1-profile.json').cases).toHaveLength(40);
    for (const file of m460Core) fs.renameSync(path.join(dataDirectory, file), path.join(dataDirectory, file + '.m631-hidden'));
    try { unavailable(await provider.getNamingCoverage()); }
    finally { for (const file of m460Core) fs.renameSync(path.join(dataDirectory, file + '.m631-hidden'), path.join(dataDirectory, file)); }
  }, 30000);

  it('reauthenticates B04 bytes per call and hides internal loader errors without keeping old counts', async () => {
    const file = path.join(dataDirectory, 'meaning-context-m460-b04-manifest.json'), bytes = fs.readFileSync(file);
    fs.writeFileSync(file, Buffer.concat([bytes, Buffer.from(' ')]));
    try { unavailable(await provider.getNamingCoverage()); }
    finally { fs.writeFileSync(file, bytes); }
  }, 30000);

  it('uses the current owner directory rather than retaining a previous successful path, and recovers only after fresh verification', async () => {
    const originalOwner = current;
    const missing = fs.mkdtempSync(path.join(evidence, 'missing-current-source-'));
    current = {...originalOwner, dataDir: missing};
    unavailable(await provider.getNamingCoverage());
    current = originalOwner;
    expect((await provider.getNamingCoverage()).status).toBe('available');
  }, 30000);
});
