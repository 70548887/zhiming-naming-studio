import type {CoverageAvailableDto, CoverageDto, CoverageRelationDto, CoverageSetDto, CoverageWordDto} from '../shared/naming-coverage';
import {hasNamingCoverageApi, type NamingCoverageApi} from '../shared/naming-coverage-api';

export interface NamingCoverageState {
  readonly phase: 'idle' | 'loading' | 'ready' | 'error';
  readonly api: NamingCoverageApi | undefined;
  readonly result?: CoverageDto;
  readonly notice?: 'api-changed';
  readonly errorKind?: 'request' | 'response';
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const scalar = (value: unknown): value is string => typeof value === 'string' && [...value].length === 1 && !/^[\uD800-\uDFFF]$/u.test(value);
function set(value: unknown): value is CoverageSetDto {
  return object(value) && count(value.count) && Array.isArray(value.characters) && value.characters.every(scalar)
    && new Set(value.characters).size === value.characters.length && value.count === value.characters.length;
}
const same = (left: CoverageSetDto, right: CoverageSetDto) => left.count === right.count && left.characters.every(char => right.characters.includes(char));
const subset = (left: CoverageSetDto, right: CoverageSetDto) => left.characters.every(char => right.characters.includes(char));
function relation(value: unknown, left: CoverageSetDto, right: CoverageSetDto): value is CoverageRelationDto {
  if (!object(value) || !set(value.intersection) || !set(value.union) || !set(value.leftOnly) || !set(value.rightOnly)) return false;
  const a = new Set(left.characters), b = new Set(right.characters);
  const equal = (actual: CoverageSetDto, expected: string[]) => actual.count === expected.length && expected.every(char => actual.characters.includes(char));
  return equal(value.intersection, left.characters.filter(char => b.has(char)))
    && equal(value.union, [...new Set([...left.characters, ...right.characters])])
    && equal(value.leftOnly, left.characters.filter(char => !b.has(char)))
    && equal(value.rightOnly, right.characters.filter(char => !a.has(char)));
}
function words(value: unknown, universe: CoverageSetDto): value is CoverageWordDto {
  return object(value) && count(value.caseCount) && set(value.targetCharacters) && subset(value.targetCharacters, universe)
    && Array.isArray(value.givenNames) && value.givenNames.every(name => typeof name === 'string' && [...name].length > 1)
    && new Set(value.givenNames).size === value.givenNames.length && value.givenNames.length <= value.caseCount
    && (value.caseCount === 0 ? value.targetCharacters.count === 0 && value.givenNames.length === 0 : value.targetCharacters.count > 0 && value.givenNames.length > 0)
    && value.requiresWholeWord === true && value.requiresConfirmedReadings === true && value.requiresExplicitChoice === true
    && value.includedInAutomatic === false && value.includedInStandalone === false;
}
/** Display-shape and scope checks only. Source qualification stays with the owning provider. */
export function isNamingCoverageResponse(value: unknown): value is CoverageDto {
  try {
    if (!object(value) || value.schema !== 'naming-coverage/1') return false;
    if (value.status === 'unavailable') return ['missing-source', 'unknown-source', 'invalid-data', 'reading-scope-mismatch', 'source-mismatch'].includes(String(value.reason));
    if (value.status !== 'available' || value.readingScope !== 'dataset-default' || !set(value.characters) || value.characters.count === 0
      || !object(value.meanings) || !object(value.elements)) return false;
    const meanings = value.meanings, elements = value.elements, universe = value.characters;
    const base = meanings.base, supplemental = meanings.supplementalAutomatic, defaultAutomatic = meanings.defaultAutomatic;
    const standalone = meanings.standaloneOnRequest, displayUnion = meanings.displayMaterialUnion, without = meanings.withoutAutomaticOrStandalone;
    if (!set(base) || !set(supplemental) || !set(defaultAutomatic) || !set(standalone) || !set(displayUnion) || !set(without)
      || !subset(base, universe) || !subset(supplemental, universe) || !subset(standalone, universe)
      || !relation(meanings.baseVsSupplemental, base, supplemental)
      || !same(defaultAutomatic, meanings.baseVsSupplemental.union)
      || !relation(meanings.automaticVsStandalone, defaultAutomatic, standalone)
      || !same(displayUnion, meanings.automaticVsStandalone.union)
      || !same(without, {count: universe.count - displayUnion.count,
        characters: universe.characters.filter(char => !displayUnion.characters.includes(char))})
      || !words(meanings.conditionalWords, universe) || !words(meanings.b04ReadOnlyOff, universe)) return false;
    const b04 = meanings.b04ReadOnlyOff;
    if (!object(b04) || b04.activation !== 'off' || b04.productionApproved !== false || b04.formalCoverageAdded !== 0) return false;
    const originalLabels = elements.originalLabels, originalUnknown = elements.originalUnknown;
    const imageryCandidates = elements.imageryCandidates, imageryUnresolved = elements.imageryUnresolved;
    if (!set(originalLabels) || !set(originalUnknown) || !set(imageryCandidates) || !set(imageryUnresolved)
      || !subset(originalLabels, universe) || !subset(originalUnknown, universe)
      || originalLabels.count + originalUnknown.count !== universe.count
      || originalLabels.characters.some(char => originalUnknown.characters.includes(char))
      || !subset(imageryCandidates, originalUnknown) || !subset(imageryUnresolved, originalUnknown)
      || imageryCandidates.count + imageryUnresolved.count !== originalUnknown.count
      || imageryCandidates.characters.some(char => imageryUnresolved.characters.includes(char))
      || elements.imageryActivation !== 'off' || elements.imageryEstablishesTraditionalElements !== false
      || !Array.isArray(elements.newDefaultEffectiveElements) || elements.newDefaultEffectiveElements.length !== 0) return false;
    return true;
  } catch { return false; }
}
export function availableCoverage(state: NamingCoverageState): CoverageAvailableDto | undefined {
  return state.phase === 'ready' && state.result?.status === 'available' && isNamingCoverageResponse(state.result) ? state.result : undefined;
}
export interface NamingCoverageController {
  getSnapshot(): NamingCoverageState;
  subscribe(listener: () => void): () => void;
  activate(): void;
  dispose(): void;
  refreshApi(): void;
  query(): Promise<void>;
}
export function createNamingCoverageController({getApi, isDisabled = () => false}: {
  getApi: () => NamingCoverageApi | undefined;
  isDisabled?: () => boolean;
}): NamingCoverageController {
  let alive = false, serial = 0;
  let state: NamingCoverageState = {phase: 'idle', api: getApi()};
  const listeners = new Set<() => void>();
  const publish = (next: NamingCoverageState) => { state = next; for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    activate: () => { alive = true; },
    dispose: () => { alive = false; serial++; state = {phase: 'idle', api: getApi()}; },
    refreshApi: () => {
      const api = getApi();
      if (state.api === api) return;
      serial++;
      publish({phase: 'idle', api, notice: 'api-changed'});
    },
    query: async () => {
      const api = getApi();
      if (!alive || isDisabled() || !hasNamingCoverageApi(api) || state.phase === 'loading' && state.api === api) return;
      const lease = ++serial;
      publish({phase: 'loading', api});
      const owns = () => alive && serial === lease && getApi() === api;
      try {
        const result = await api.getNamingCoverage();
        if (!owns()) return;
        if (!isNamingCoverageResponse(result)) { publish({phase: 'error', api, errorKind: 'response'}); return; }
        publish({phase: 'ready', api, result});
      } catch { if (owns()) publish({phase: 'error', api, errorKind: 'request'}); }
    }
  };
}
