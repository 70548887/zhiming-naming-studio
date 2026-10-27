import {test} from 'vitest';
import assert from 'node:assert/strict';
import {createNamingCoverageDto} from '../src/domain/naming-coverage';
import type {CoverageAvailableDto, CoverageDto, CoverageFailure, CoverageLoaderSets,
  CoverageWordsInput} from '../src/shared/naming-coverage';

// Existing source identities accepted by the factory; these fixtures issue no authority.
const sourceIds: Readonly<Record<keyof CoverageLoaderSets, string>> = {
  dataset: 'naming-editorial-dictionary-v6-fixed',
  baseMeanings: 'naming-editorial-dictionary-v6-fixed',
  supplementalAutomatic: 'naming-editorial-meanings-v7-fixed',
  standaloneOnRequest: 'naming-character-meanings-v7.1-fixed',
  conditionalWords: 'project-meaning-context-next-138-v1-1',
  b04ReadOnlyOff: 'project-meaning-context-m460-b04-candidate',
  originalElements: 'naming-editorial-dictionary-v6-fixed',
  imageryCandidates: 'project-dictionary-object-elements-v1-fixed'
};
const packSha256 = 'a'.repeat(64);
type AvailableGroup<K extends keyof CoverageLoaderSets> = Extract<CoverageLoaderSets[K], {status: 'available'}>;

function group<K extends keyof CoverageLoaderSets>(key: K, value: AvailableGroup<K>['value']): AvailableGroup<K> {
  return {status: 'available', source: {sourceId: sourceIds[key], sha256: '1'.repeat(64), packSha256,
    readingScope: 'dataset-default'}, value} as AvailableGroup<K>;
}

function word(caseId: string, targetCharacter: string, givenName: string): CoverageWordsInput {
  return {cases: [{caseId, targetCharacter, givenName}], wholeWordOnly: true,
    explicitChoiceRequired: true, confirmedReadingsRequired: true,
    automaticSemanticCreditAllowed: false, standalonePromotion: false};
}

function fixture(): CoverageLoaderSets {
  return {
    dataset: group('dataset', {characters: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '甲'], datasetSha256: 'b'.repeat(64)}),
    baseMeanings: group('baseMeanings', ['甲', '乙', '甲']),
    supplementalAutomatic: group('supplementalAutomatic', ['乙', '丙', '丙']),
    standaloneOnRequest: group('standaloneOnRequest', {characters: ['丙', '丁', '丁'], publication: 'm460-b02',
      wholeNameAssessment: 'not-assessed', automaticNameRecommendation: false, automaticSemanticCreditAllowed: false, scoreDelta: 0}),
    conditionalWords: group('conditionalWords', word('conditional:戊己', '戊', '戊己')),
    b04ReadOnlyOff: group('b04ReadOnlyOff', {...word('b04:庚辛', '庚', '庚辛'), activation: 'off',
      candidateOnly: true, productionApproved: false, formalCoverageAdded: 0}),
    originalElements: group('originalElements', {labeledCharacters: ['甲', '乙'], unknownCharacters: ['丙', '丁', '戊', '己', '庚', '辛']}),
    imageryCandidates: group('imageryCandidates', {candidateCharacters: ['丙', '丁'], unresolvedCharacters: ['戊', '己', '庚', '辛'],
      activation: 'off', defaultEffectiveElements: [], traditionalAssessment: 'pending'})
  };
}

function available(result: CoverageDto): CoverageAvailableDto {
  if (result.status !== 'available') assert.fail(`Expected available coverage, received ${result.reason}`);
  return result;
}

function unavailable(result: CoverageDto, reason: CoverageFailure): void {
  if (result.status !== 'unavailable') assert.fail('Invalid input produced available coverage');
  assert.equal(result.reason, reason);
  assert.deepEqual(Object.keys(result).sort(), ['schema', 'status', 'reason', 'message'].sort());
  assert.equal(JSON.stringify(result).includes('"count"'), false);
  assert.equal(Object.isFrozen(result), true);
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function inputGroup(input: Record<string, unknown>, key: keyof CoverageLoaderSets): Record<string, unknown> {
  return record(input[key]);
}
function inputValue(input: Record<string, unknown>, key: keyof CoverageLoaderSets): Record<string, unknown> {
  return record(inputGroup(input, key).value);
}
function changed(mutate: (input: Record<string, unknown>) => void): CoverageDto {
  const input = structuredClone(fixture()) as unknown as Record<string, unknown>;
  mutate(input);
  return createNamingCoverageDto(input as unknown as CoverageLoaderSets);
}
function sorted(...values: string[]): string[] { return values.sort(); }

test('overlapping loader sets use measured intersections and unique character unions', () => {
  const dto = available(createNamingCoverageDto(fixture()));
  assert.equal(dto.characters.count, 8);
  assert.equal(dto.meanings.base.count, 2);
  assert.equal(dto.meanings.supplementalAutomatic.count, 2);
  assert.deepEqual(dto.meanings.baseVsSupplemental.intersection.characters, ['乙']);
  assert.deepEqual(dto.meanings.baseVsSupplemental.leftOnly.characters, ['甲']);
  assert.deepEqual(dto.meanings.baseVsSupplemental.rightOnly.characters, ['丙']);
  assert.deepEqual(dto.meanings.defaultAutomatic.characters, sorted('甲', '乙', '丙'));
  assert.equal(dto.meanings.defaultAutomatic.count, 3);
  assert.equal(dto.meanings.standaloneOnRequest.count, 2);
  assert.deepEqual(dto.meanings.automaticVsStandalone.intersection.characters, ['丙']);
  assert.deepEqual(dto.meanings.displayMaterialUnion.characters, sorted('甲', '乙', '丙', '丁'));
  assert.deepEqual(dto.meanings.withoutAutomaticOrStandalone.characters, sorted('戊', '己', '庚', '辛'));
});

test('identical word-case rows deduplicate while conflicting identities make coverage unavailable', () => {
  const identical = changed(input => {
    for (const key of ['conditionalWords', 'b04ReadOnlyOff'] as const) {
      const value = inputValue(input, key), cases = value.cases as unknown[];
      value.cases = [...cases, structuredClone(cases[0])];
    }
  });
  const dto = available(identical);
  assert.equal(dto.meanings.conditionalWords.caseCount, 1);
  assert.equal(dto.meanings.b04ReadOnlyOff.caseCount, 1);
  assert.deepEqual(dto.meanings.conditionalWords.givenNames, ['戊己']);
  for (const key of ['conditionalWords', 'b04ReadOnlyOff'] as const) {
    unavailable(changed(input => {
      const value = inputValue(input, key), cases = value.cases as Record<string, unknown>[];
      value.cases = [...cases, {...cases[0], givenName: key === 'conditionalWords' ? '戊辛' : '庚甲'}];
    }), 'invalid-data');
  }
});

test('missing and unknown source groups return unavailable without zero or partial counts', () => {
  unavailable(changed(input => { delete input.baseMeanings; }), 'missing-source');
  unavailable(changed(input => { input.standaloneOnRequest = {status: 'unavailable', reason: 'missing-source'}; }), 'missing-source');
  unavailable(changed(input => { record(inputGroup(input, 'imageryCandidates').source).sourceId = 'unreviewed-source'; }), 'unknown-source');
  unavailable(changed(input => { input.b04ReadOnlyOff = {status: 'unavailable', reason: 'unknown-source'}; }), 'unknown-source');
});

test('omitted and corrupt required values never become valid empty coverage', () => {
  const cases: ReadonlyArray<readonly [CoverageFailure, (input: Record<string, unknown>) => void]> = [
    ['missing-source', input => { delete inputGroup(input, 'supplementalAutomatic').value; }],
    ['invalid-data', input => { delete inputValue(input, 'dataset').characters; }],
    ['source-mismatch', input => { delete inputValue(input, 'dataset').datasetSha256; }],
    ['invalid-data', input => { inputGroup(input, 'baseMeanings').value = ['甲', '']; }],
    ['invalid-data', input => { delete inputValue(input, 'standaloneOnRequest').automaticSemanticCreditAllowed; }],
    ['invalid-data', input => { delete inputValue(input, 'conditionalWords').cases; }],
    ['invalid-data', input => { delete inputValue(input, 'originalElements').unknownCharacters; }]
  ];
  for (const [reason, mutate] of cases) unavailable(changed(mutate), reason);
});

test('full-word and B04 case targets contribute neither automatic nor standalone characters', () => {
  const dto = available(createNamingCoverageDto(fixture()));
  assert.deepEqual(dto.meanings.conditionalWords.targetCharacters.characters, ['戊']);
  assert.deepEqual(dto.meanings.b04ReadOnlyOff.targetCharacters.characters, ['庚']);
  for (const words of [dto.meanings.conditionalWords, dto.meanings.b04ReadOnlyOff]) {
    assert.equal(words.requiresWholeWord, true);
    assert.equal(words.requiresConfirmedReadings, true);
    assert.equal(words.requiresExplicitChoice, true);
    assert.equal(words.includedInAutomatic, false);
    assert.equal(words.includedInStandalone, false);
    for (const target of words.targetCharacters.characters) {
      assert.equal(dto.meanings.defaultAutomatic.characters.includes(target), false);
      assert.equal(dto.meanings.standaloneOnRequest.characters.includes(target), false);
      assert.equal(dto.meanings.displayMaterialUnion.characters.includes(target), false);
    }
  }
  assert.equal(dto.meanings.withoutAutomaticOrStandalone.count, 4);
});

test('B04 remains off and imagery candidates cannot acquire activation or traditional authority', () => {
  const dto = available(createNamingCoverageDto(fixture()));
  assert.equal(dto.meanings.b04ReadOnlyOff.activation, 'off');
  assert.equal(dto.meanings.b04ReadOnlyOff.productionApproved, false);
  assert.equal(dto.meanings.b04ReadOnlyOff.formalCoverageAdded, 0);
  assert.equal(dto.elements.imageryActivation, 'off');
  assert.deepEqual(dto.elements.newDefaultEffectiveElements, []);
  assert.equal(dto.elements.imageryEstablishesTraditionalElements, false);
  const violations: ReadonlyArray<readonly [keyof CoverageLoaderSets, string, unknown]> = [
    ['b04ReadOnlyOff', 'activation', 'on'], ['b04ReadOnlyOff', 'candidateOnly', false],
    ['b04ReadOnlyOff', 'productionApproved', true], ['b04ReadOnlyOff', 'formalCoverageAdded', 1],
    ['b04ReadOnlyOff', 'automaticSemanticCreditAllowed', true], ['conditionalWords', 'standalonePromotion', true],
    ['conditionalWords', 'explicitChoiceRequired', false], ['imageryCandidates', 'activation', 'on'],
    ['imageryCandidates', 'defaultEffectiveElements', ['木']], ['imageryCandidates', 'traditionalAssessment', 'confirmed']
  ];
  for (const [key, field, value] of violations) {
    unavailable(changed(input => { inputValue(input, key)[field] = value; }), 'invalid-data');
  }
});

test('default-reading coverage rejects selected-reading scope and mixed source-pack identities', () => {
  const dto = available(createNamingCoverageDto(fixture()));
  assert.equal(dto.readingScope, 'dataset-default');
  assert.equal(dto.packSha256, packSha256);
  unavailable(changed(input => { record(inputGroup(input, 'supplementalAutomatic').source).readingScope = 'selected-readings'; }), 'reading-scope-mismatch');
  unavailable(changed(input => { record(inputGroup(input, 'standaloneOnRequest').source).packSha256 = 'c'.repeat(64); }), 'source-mismatch');
  unavailable(changed(input => { record(inputGroup(input, 'dataset').source).sha256 = '0'.repeat(64); }), 'source-mismatch');
});

test('element partitions and every character set must close over their actual universe', () => {
  const dto = available(createNamingCoverageDto(fixture()));
  assert.equal(dto.elements.originalLabels.count + dto.elements.originalUnknown.count, dto.characters.count);
  assert.equal(dto.elements.imageryCandidates.count + dto.elements.imageryUnresolved.count, dto.elements.originalUnknown.count);
  const violations: ReadonlyArray<(input: Record<string, unknown>) => void> = [
    input => { inputValue(input, 'originalElements').labeledCharacters = ['甲', '乙', '丙']; },
    input => { inputValue(input, 'originalElements').unknownCharacters = ['丙', '丁', '戊', '己', '庚']; },
    input => { inputValue(input, 'imageryCandidates').candidateCharacters = ['丙', '甲']; },
    input => { inputValue(input, 'imageryCandidates').unresolvedCharacters = ['戊', '己', '庚']; },
    input => { inputGroup(input, 'baseMeanings').value = ['壬']; },
    input => { inputValue(input, 'conditionalWords').cases = [{caseId: 'outside', targetCharacter: '壬', givenName: '壬甲'}]; }
  ];
  for (const mutate of violations) unavailable(changed(mutate), 'invalid-data');
});

test('the returned DTO is deeply frozen and isolated from later mutable input changes', () => {
  const input = structuredClone(fixture()) as unknown as Record<string, unknown>;
  const dto = available(createNamingCoverageDto(input as unknown as CoverageLoaderSets));
  const snapshot = JSON.stringify(dto);
  (inputGroup(input, 'baseMeanings').value as string[]).push('辛');
  record(inputGroup(input, 'dataset').source).sha256 = 'd'.repeat(64);
  const cases = inputValue(input, 'conditionalWords').cases as Record<string, unknown>[];
  cases[0].givenName = '戊辛';
  (inputValue(input, 'originalElements').unknownCharacters as string[]).pop();
  assert.equal(JSON.stringify(dto), snapshot);
  assert.equal(Object.isFrozen(input), false);
  const assertDeepFrozen = (value: unknown): void => {
    if (value && typeof value === 'object') {
      assert.equal(Object.isFrozen(value), true);
      Object.values(value).forEach(assertDeepFrozen);
    }
  };
  assertDeepFrozen(dto);
  assert.throws(() => { (dto.meanings.defaultAutomatic.characters as string[]).push('辛'); }, TypeError);
  assert.equal(Reflect.set(dto, 'readingScope', 'selected-readings'), false);
  assert.equal(Reflect.set(dto.sources[0], 'sha256', 'e'.repeat(64)), false);
  assert.equal(JSON.stringify(dto), snapshot);
});

test('sparse arrays cannot hide holes behind extra enumerable fields', () => {
  const hole = new Array<string>(2);
  hole[0] = '甲';
  Object.defineProperty(hole, 'padding', {value: '乙', enumerable: true});
  unavailable(changed(input => { inputGroup(input, 'baseMeanings').value = hole; }), 'invalid-data');
  const accessor = ['甲'];
  Object.defineProperty(accessor, '0', {enumerable: true, get() { throw new Error('must not execute'); }});
  unavailable(changed(input => { inputGroup(input, 'baseMeanings').value = accessor; }), 'invalid-data');
});
