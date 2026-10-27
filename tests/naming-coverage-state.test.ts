import {describe, expect, it, vi} from 'vitest';
import type {CoverageAvailableDto, CoverageDto, CoverageSetDto} from '../src/shared/naming-coverage';
import type {NamingCoverageApi} from '../src/shared/naming-coverage-api';
import {createNamingCoverageController, isNamingCoverageResponse} from '../src/renderer/naming-coverage-state';
import actualJson from './fixtures/naming-coverage-actual.json';

const actual = actualJson as unknown as CoverageAvailableDto;
const unavailable: CoverageDto = {schema: 'naming-coverage/1', status: 'unavailable', reason: 'missing-source', message: 'D:/private/source.json'};
const copy = <T,>(value: T): T => structuredClone(value);
function pendingApi() {
  const calls: {args: unknown[]; resolve(value: CoverageDto): void; reject(error: Error): void}[] = [];
  const api: NamingCoverageApi = {getNamingCoverage: (...args: unknown[]) => new Promise((resolve, reject) => { calls.push({args, resolve, reject}); })};
  return {api, calls};
}

describe('manual coverage request state', () => {
  it('does not query while activating and makes one zero-argument read per explicit action', async () => {
    const pending = pendingApi(), controller = createNamingCoverageController({getApi: () => pending.api});
    const listener = vi.fn(), unsubscribe = controller.subscribe(listener);
    controller.activate();
    expect(controller.getSnapshot().phase).toBe('idle');
    expect(pending.calls).toHaveLength(0);
    const first = controller.query();
    void controller.query();
    expect(pending.calls).toHaveLength(1);
    expect(pending.calls[0].args).toEqual([]);
    const result = copy(actual), before = copy(result);
    pending.calls[0].resolve(result); await first;
    expect(controller.getSnapshot().result).toBe(result);
    expect(result).toEqual(before);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe(); controller.dispose();
  });

  it('clears counts when refreshing and rejects old success and failure across API replacements', async () => {
    for (const settle of ['resolve', 'reject'] as const) {
      const first = pendingApi(), replacement = pendingApi(); let current = first.api;
      const controller = createNamingCoverageController({getApi: () => current}); controller.activate();
      const old = controller.query();
      current = replacement.api; controller.refreshApi();
      expect(controller.getSnapshot()).toEqual({phase: 'idle', api: replacement.api, notice: 'api-changed'});
      expect(replacement.calls).toHaveLength(0);
      const latest = controller.query();
      if (settle === 'resolve') first.calls[0].resolve(copy(actual)); else first.calls[0].reject(Error('D:/old/private.json'));
      await old;
      expect(controller.getSnapshot().phase).toBe('loading');
      expect(controller.getSnapshot().result).toBeUndefined();
      replacement.calls[0].resolve(copy(actual)); await latest;
      expect(controller.getSnapshot().phase).toBe('ready');
      controller.dispose();
    }
  });

  it('invalidates A-to-B-to-A request leases and also checks API identity before its effect runs', async () => {
    const first = pendingApi(), second = pendingApi(); let current = first.api;
    const controller = createNamingCoverageController({getApi: () => current}); controller.activate();
    const old = controller.query();
    current = second.api; controller.refreshApi(); current = first.api; controller.refreshApi();
    first.calls[0].resolve(copy(actual)); await old;
    expect(controller.getSnapshot().phase).toBe('idle');
    const next = controller.query(); current = second.api;
    first.calls[1].resolve(copy(actual)); await next;
    expect(controller.getSnapshot().result).toBeUndefined();
    controller.refreshApi();
    expect(controller.getSnapshot().phase).toBe('idle');
    controller.dispose();
  });

  it('ignores settled work after unmount and a StrictMode-style reactivation until a new query', async () => {
    for (const settle of ['resolve', 'reject'] as const) {
      const pending = pendingApi(), controller = createNamingCoverageController({getApi: () => pending.api}); controller.activate();
      const old = controller.query(); controller.dispose(); controller.activate();
      if (settle === 'resolve') pending.calls[0].resolve(copy(actual)); else pending.calls[0].reject(Error('disposed'));
      await old;
      expect(controller.getSnapshot().phase).toBe('idle');
      expect(controller.getSnapshot().result).toBeUndefined();
      const fresh = controller.query(); pending.calls[1].resolve(copy(actual)); await fresh;
      expect(controller.getSnapshot().phase).toBe('ready'); controller.dispose();
    }
  });

  it('hides previously available counts during retry, failure and unavailable without storing thrown paths', async () => {
    const pending = pendingApi(), controller = createNamingCoverageController({getApi: () => pending.api}); controller.activate();
    const first = controller.query(); pending.calls[0].resolve(copy(actual)); await first;
    const retry = controller.query(); expect(controller.getSnapshot().result).toBeUndefined();
    pending.calls[1].reject(Error('D:/private/source-lock.json')); await retry;
    expect(controller.getSnapshot()).toEqual({phase: 'error', api: pending.api, errorKind: 'request'});
    expect(pending.calls).toHaveLength(2);
    const third = controller.query(); pending.calls[2].resolve(copy(unavailable)); await third;
    expect(controller.getSnapshot().result?.status).toBe('unavailable');
    expect(controller.getSnapshot().result).not.toHaveProperty('characters');
    controller.dispose();
  });

  it('rejects wrong scope, inconsistent counts and promoted candidates at the display boundary', async () => {
    const wrongScope = {...copy(actual), readingScope: 'selected-reading'};
    const wrongCount = copy(actual); (wrongCount.meanings as unknown as {defaultAutomatic: CoverageSetDto}).defaultAutomatic = {...wrongCount.meanings.defaultAutomatic, count: wrongCount.meanings.displayMaterialUnion.count};
    const promoted = copy(actual); (promoted.elements as unknown as {imageryActivation: string}).imageryActivation = 'on';
    const promotedWords = copy(actual); (promotedWords.meanings.b04ReadOnlyOff as unknown as {formalCoverageAdded: number}).formalCoverageAdded = 1;
    const duplicates = copy(actual); (duplicates as unknown as {characters: CoverageSetDto}).characters = {...duplicates.characters, characters: [...duplicates.characters.characters, duplicates.characters.characters[0]]};
    for (const invalid of [wrongScope, wrongCount, promoted, promotedWords, duplicates]) {
      expect(isNamingCoverageResponse(invalid)).toBe(false);
      const api = {getNamingCoverage: async () => invalid as CoverageDto};
      const controller = createNamingCoverageController({getApi: () => api}); controller.activate(); await controller.query();
      expect(controller.getSnapshot()).toEqual({phase: 'error', api, errorKind: 'response'}); controller.dispose();
    }
  });

  it('blocks disabled and absent services without manufacturing an empty result', async () => {
    const pending = pendingApi(), disabled = createNamingCoverageController({getApi: () => pending.api, isDisabled: () => true});
    disabled.activate(); await disabled.query(); expect(pending.calls).toHaveLength(0); expect(disabled.getSnapshot().phase).toBe('idle'); disabled.dispose();
    const missing = createNamingCoverageController({getApi: () => undefined}); missing.activate(); await missing.query();
    expect(missing.getSnapshot()).toEqual({phase: 'idle', api: undefined}); missing.dispose();
    expect(isNamingCoverageResponse(copy(actual))).toBe(true);
  });
});
