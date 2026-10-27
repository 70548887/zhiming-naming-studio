import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import actualJson from './fixtures/naming-coverage-actual.json';
import type {CoverageAvailableDto, CoverageDto} from '../src/shared/naming-coverage';
import type {NamingCoverageApi} from '../src/shared/naming-coverage-api';
import {createNamingCoverageProvider, type NamingCoverageCurrentDataset} from '../src/main/naming-coverage-provider';
import {createNamingCoverageController, isNamingCoverageResponse} from '../src/renderer/naming-coverage-state';
import {NamingCoverageView} from '../src/renderer/NamingCoveragePanel';

const actual = actualJson as unknown as CoverageAvailableDto;
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const sourceDataset = JSON.parse(fs.readFileSync(path.join(project, 'data/dataset-v6.json'), 'utf8')) as NamingCoverageCurrentDataset;
const actualDataset: NamingCoverageCurrentDataset = {...sourceDataset, version: hash(fs.readFileSync(path.join(project, 'data/knowledge-v6.sqlite'))).slice(0, 12)};
const evidenceDir = process.env.M669_EVIDENCE_DIR ?? path.resolve(project, '..', 'evidence');
const unavailable: CoverageDto = {schema: 'naming-coverage/1', status: 'unavailable', reason: 'missing-source', message: 'D:/private/source-lock.json'};
const copy = <T,>(value: T): T => structuredClone(value);
function pendingApi() {
  const calls: {args: unknown[]; resolve(value: CoverageDto): void; reject(error: Error): void}[] = [];
  const api: NamingCoverageApi = {getNamingCoverage: (...args: unknown[]) => new Promise((resolve, reject) => calls.push({args, resolve, reject}))};
  return {api, calls};
}

describe('M669 coverage regressions after product wiring', () => {
  it('runs the real provider against the current project data directory without Store generation', async () => {
    const owner = {dataDir: path.join(project, 'data'), dataset: actualDataset};
    const provider = createNamingCoverageProvider(() => owner);
    const dto = await provider.getNamingCoverage();
    expect(dto.status).toBe('available');
    if (dto.status !== 'available') throw Error('provider unavailable');
    expect({total: dto.characters.count, automatic: dto.meanings.defaultAutomatic.count, standalone: dto.meanings.standaloneOnRequest.count,
      words: dto.meanings.conditionalWords.caseCount, b04: dto.meanings.b04ReadOnlyOff.caseCount, imagery: dto.elements.imageryCandidates.count})
      .toEqual({total: 779, automatic: 521, standalone: 60, words: 40, b04: 20, imagery: 56});
    expect(dto.meanings.b04ReadOnlyOff.activation).toBe('off');
    expect(dto.elements.newDefaultEffectiveElements).toEqual([]);
    expect(owner.dataset).toEqual(actualDataset);
  }, 30000);

  it('turns current dataset identity drift into unavailable instead of serving stale counts', async () => {
    const owner = {dataDir: path.join(project, 'data'), dataset: {...actualDataset, version: 'f'.repeat(12)}};
    const dto = await createNamingCoverageProvider(() => owner).getNamingCoverage();
    expect(dto).toEqual(expect.objectContaining({status: 'unavailable', reason: 'source-mismatch'}));
    expect(dto).not.toHaveProperty('characters');
  }, 30000);

  it('reauthenticates independent loader bytes after a previous success', async () => {
    for (const [relative, mutate] of [
      ['naming-editorial-v7.json', (bytes: Buffer) => Buffer.concat([bytes, Buffer.from(' ')])],
      ['naming-editorial-meanings-v7-source-lock.json', (bytes: Buffer) => Buffer.concat([bytes, Buffer.from(' ')])],
      ['element-object/element-overlay.json', (bytes: Buffer) => Buffer.concat([bytes, Buffer.from(' ')])]
    ] as const) {
      const root = fs.mkdtempSync(path.join(evidenceDir, 'source-tamper-'));
      const copiedData = path.join(root, 'data');
      fs.cpSync(path.join(project, 'data'), copiedData, {recursive: true});
      const owner = {dataDir: copiedData, dataset: actualDataset};
      const check = createNamingCoverageProvider(() => owner);
      expect((await check.getNamingCoverage()).status).toBe('available');
      const file = path.join(copiedData, relative), originalBytes = fs.readFileSync(file);
      fs.writeFileSync(file, mutate(originalBytes));
      const failed = await check.getNamingCoverage();
      expect(failed.status).toBe('unavailable');
      if (failed.status === 'unavailable') expect(failed.message).not.toContain('source-lock.json');
    }
  }, 60000);

  it('converts owner getter failures into private-path-free unavailable output', async () => {
    const check = createNamingCoverageProvider(() => { throw Error('D:/private/custom-store/data'); });
    const failed = await check.getNamingCoverage();
    expect(failed).toEqual(expect.objectContaining({status: 'unavailable', reason: 'invalid-data'}));
    expect(JSON.stringify(failed)).not.toContain('D:/private');
  });

  it('invalidates an old API result after replacement and recovers only on explicit retry', async () => {
    const first = pendingApi(), second = pendingApi(); let current: NamingCoverageApi = first.api;
    const controller = createNamingCoverageController({getApi: () => current}); controller.activate();
    const old = controller.query(); first.calls[0].resolve(copy(actual)); await old;
    expect(controller.getSnapshot().phase).toBe('ready');
    current = second.api; controller.refreshApi();
    expect(controller.getSnapshot().phase).toBe('idle'); expect(controller.getSnapshot().result).toBeUndefined();
    const retry = controller.query(); expect(second.calls[0].args).toEqual([]);
    second.calls[0].resolve(copy(unavailable)); await retry;
    expect(controller.getSnapshot().phase).toBe('ready'); expect(controller.getSnapshot().result?.status).toBe('unavailable');
    controller.dispose();
  });

  it('does not allow a late success from the old API to restore hidden counts', async () => {
    const first = pendingApi(), second = pendingApi(); let current: NamingCoverageApi = first.api;
    const controller = createNamingCoverageController({getApi: () => current}); controller.activate();
    const old = controller.query(); current = second.api; controller.refreshApi();
    const fresh = controller.query(); second.calls[0].resolve(copy(actual)); await fresh;
    expect(controller.getSnapshot().phase).toBe('ready');
    first.calls[0].resolve(copy(actual)); await old;
    expect(controller.getSnapshot().result).toEqual(actual);
    controller.dispose();
  });

  it('requires a valid DTO on retry and hides old counts for unavailable or malformed responses', async () => {
    const malformed = {...copy(actual), meanings: {...actual.meanings, defaultAutomatic: {...actual.meanings.defaultAutomatic, count: 0}}} as CoverageDto;
    expect(isNamingCoverageResponse(malformed)).toBe(false);
    const api = {getNamingCoverage: async () => malformed};
    const controller = createNamingCoverageController({getApi: () => api}); controller.activate(); await controller.query();
    expect(controller.getSnapshot()).toEqual({phase: 'error', api, errorKind: 'response'});
    expect(controller.getSnapshot().result).toBeUndefined(); controller.dispose();
  });

  it('renders no stale numbers or internal source paths for an unavailable response', () => {
    const html = renderToStaticMarkup(<NamingCoverageView idPrefix="m669" available state={{phase: 'ready', api: undefined, result: unavailable}} onQuery={() => {}}/>);
    expect(html).toContain('当前不显示覆盖数量');
    expect(html).toContain('重试读取资料覆盖');
    expect(html).not.toContain('<strong>');
    expect(html).not.toContain('D:/private/source-lock.json');
    expect(html).not.toContain('779');
  });
});
