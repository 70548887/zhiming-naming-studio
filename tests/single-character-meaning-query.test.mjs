import test from 'node:test';
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {loadM460V71Publication} from '../src/main/m460-publication-data.mjs';
import {loadM610MeaningBatch} from '../scripts/m610-meaning-query.mjs';
import {createSingleCharacterMeaningAdapter} from '../src/main/single-character-meaning-query.mjs';

const root = process.cwd();
const dataDir = `${root}/data`;
const adapter = createSingleCharacterMeaningAdapter({projectRoot: root});

test('real loaders expose the approved 60 plus M610 candidate 20 with disjoint status', () => {
  const approved = loadM460V71Publication(dataDir);
  const candidate = loadM610MeaningBatch(dataDir, dataDir);
  assert.equal(approved.profile.cases.length, 60);
  assert.equal(candidate.profile.cases.length, 20);
  const approvedChars = new Set(approved.profile.cases.map(row => row.char));
  assert.equal(candidate.profile.cases.filter(row => approvedChars.has(row.char)).length, 0);
  assert.equal(approved.admission.decision, 'approved-character-notes');
  assert.equal(candidate.manifest.status, 'candidate-source-verified-not-admitted');
});

test('omitted pinyin uses the fixed default reading and keeps source/project fields separate', () => {
  const result = adapter.getSingleCharacterMeaningOptions({char: '静'});
  assert.equal(result.status, 'available');
  assert.equal(result.pinyin, 'jìng');
  assert.equal(result.source.batchId, 'M460-V71-B02');
  const option = result.options[0];
  assert.equal(option.source.sourceId, 'moe-revised');
  assert.equal(option.source.sourcePOS, '形');
  assert.equal(option.source.definition.def, '恬淡、平和。');
  assert.equal(option.source.readings[0].pinyin, 'jìng');
  assert.equal(option.project.meaning, option.meaning);
  assert.notEqual(option.source, option.project);
  assert.equal(option.scope, 'on-request-supplement-only');
  assert.equal(result.wholeNameMeaning, null);
  assert.equal(result.automaticNameRecommendation, false);
  assert.equal(result.automaticSemanticCreditAllowed, false);
  assert.equal(result.scoreDelta, 0);
});

test('M610 candidate remains queryable with candidate publication status', () => {
  const result = adapter.getSingleCharacterMeaningOptions({char: '万', pinyin: 'wàn'});
  assert.equal(result.status, 'available');
  assert.equal(result.source.batchId, 'M610-D02');
  assert.equal(result.source.publicationState, 'candidate-source-verified-not-admitted');
  assert.equal(result.source.candidateOnly, true);
  assert.equal(result.source.productionApproved, false);
  assert.equal(result.options[0].source.sourcePOS, '形');
  assert.equal(result.options[0].source.definition.def, '眾多的。');
});

test('explicit pinyin must match exact diacritic reading and cannot fall back', () => {
  assert.equal(adapter.getSingleCharacterMeaningOptions({char: '静', pinyin: 'jìng'}).status, 'available');
  assert.deepEqual(adapter.getSingleCharacterMeaningOptions({char: '静', pinyin: 'jing'}), {
    schema: 'single-character-meaning-options/1',
    char: '静',
    pinyin: 'jing',
    status: 'not-covered',
    scope: 'on-request-supplement-only',
    options: [],
    source: null,
    limits: [],
    wholeNameMeaning: null,
    automaticNameRecommendation: false,
    automaticSemanticCreditAllowed: false,
    scoreDelta: 0,
  });
});

test('unknown scalar returns not-covered and malformed queries are rejected', () => {
  assert.equal(adapter.getSingleCharacterMeaningOptions({char: '龘'}).status, 'not-covered');
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '\ud800'}), /exactly one Unicode scalar/);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '静', pinyin: ''}), /pinyin cannot be empty/);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '静', extra: 1}), /extra fields/);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '静静'}), /exactly one Unicode scalar/);
});

test('Proxy is rejected before any query property trap runs', () => {
  let trapCount = 0;
  const proxy = new Proxy({char: '静'}, {
    getPrototypeOf() { trapCount += 1; throw new Error('trap'); },
    ownKeys() { trapCount += 1; throw new Error('trap'); },
    getOwnPropertyDescriptor() { trapCount += 1; throw new Error('trap'); },
  });
  assert.equal(types.isProxy(proxy), true);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions(proxy), /Proxy query/);
  assert.equal(trapCount, 0);
});

test('returned DTO is immutable and a later call is unaffected by attempted mutation', () => {
  const first = adapter.getSingleCharacterMeaningOptions({char: '万'});
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.options[0].source), true);
  assert.throws(() => { first.options[0].source.definition.def = 'tampered'; }, TypeError);
  const second = adapter.getSingleCharacterMeaningOptions({char: '万'});
  assert.equal(second.options[0].source.definition.def, '眾多的。');
});

test('missing required source rejects instead of using an old default meaning', () => {
  const broken = createSingleCharacterMeaningAdapter({projectRoot: `${root}/missing-m633-source`});
  assert.throws(() => broken.getSingleCharacterMeaningOptions({char: '静'}), /ENOENT|approved M460 publication is missing/);
});
