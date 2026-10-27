import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {types} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createSingleCharacterMeaningAdapter} from '../src/main/single-character-meaning-query.mjs';
import {loadM460V71Publication} from '../src/main/m460-publication-data.mjs';
import {loadM610MeaningBatch} from '../scripts/m610-meaning-query.mjs';
import {loadM616MeaningBatch} from '../scripts/m616-meaning-query.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const adapter = createSingleCharacterMeaningAdapter({projectRoot: root, dataDir});
const M616 = [
  ['澄', 'dèng', 4], ['朝', 'cháo', 2], ['荷', 'hè', 4], ['劲', 'jìng', 4], ['隽', 'jùn', 4],
  ['乐', 'yào', 4], ['和', 'hè', 4], ['音', 'yìn', 4], ['知', 'zhì', 4], ['湛', 'dān', 1],
];

function tempData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm666-data-'));
  const target = path.join(dir, 'data');
  fs.cpSync(dataDir, target, {recursive: true});
  return {dir, target};
}

function cleanup(temp) { fs.rmSync(temp.dir, {recursive: true, force: true}); }

test('M633 unified chain contains 60 approved, 20 M610 candidate, and 10 M616 candidate rows', () => {
  const approved = loadM460V71Publication(dataDir);
  const m610 = loadM610MeaningBatch(dataDir, dataDir);
  const m616 = loadM616MeaningBatch(dataDir, dataDir);
  assert.equal(approved.profile.cases.length, 60);
  assert.equal(m610.profile.cases.length, 20);
  assert.equal(m616.profile.cases.length, 10);
  const sets = [approved, m610, m616].map(batch => new Set(batch.profile.cases.map(row => row.char)));
  assert.equal(new Set([...sets[0], ...sets[1], ...sets[2]]).size, 90);
  assert.equal([...sets[0]].filter(char => sets[1].has(char) || sets[2].has(char)).length, 0);
  assert.equal([...sets[1]].filter(char => sets[2].has(char)).length, 0);
});

test('M616 exact pinyin/tone returns a source-bound candidate option', () => {
  const result = adapter.getSingleCharacterMeaningOptions({char: '知', pinyin: 'zhì', tone: 4});
  const option = result.options[0];
  assert.equal(result.status, 'available');
  assert.equal(result.source.batchId, 'M616-D02');
  assert.equal(result.source.candidateOnly, true);
  assert.equal(result.source.activation, 'off');
  assert.equal(result.source.productionApproved, false);
  assert.equal(option.source.sourcePOS, '名');
  assert.equal(option.source.definition.def, '智慧。');
  assert.equal(option.source.rawEntryIndex, 103895);
  assert.equal(option.source.rawHeteronymIndex, 1);
  assert.equal(option.source.rawDefinitionIndex, 0);
  assert.equal(option.defaultReading.pinyin, 'zhī');
  assert.equal(option.defaultReading.tone, 1);
});

test('all ten M616 non-default readings require exact pinyin and tone', () => {
  for (const [char, pinyin, tone] of M616) {
    const result = adapter.getSingleCharacterMeaningOptions({char, pinyin, tone});
    assert.equal(result.status, 'available', `${char}/${pinyin}/${tone}`);
    assert.equal(result.options.length, 1);
    assert.equal(result.options[0].pinyin, pinyin);
    assert.equal(result.options[0].tone, tone);
    assert.notEqual(result.options[0].source.readings.find(reading => reading.pinyin === pinyin)?.pinyin, undefined);
  }
});

test('M616 char-only and pinyin-only queries are ambiguous and never select an alternate silently', () => {
  assert.equal(adapter.getSingleCharacterMeaningOptions({char: '知'}).status, 'ambiguous-reading');
  assert.equal(adapter.getSingleCharacterMeaningOptions({char: '知', pinyin: 'zhì'}).status, 'ambiguous-reading');
  assert.deepEqual(adapter.getSingleCharacterMeaningOptions({char: '知'}).options, []);
});

test('M616 rejects tone mismatch, default reading, and unmarked pinyin without fallback', () => {
  for (const query of [
    {char: '知', pinyin: 'zhì', tone: 1},
    {char: '湛', pinyin: 'dān', tone: 4},
    {char: '劲', pinyin: 'jìng', tone: 3},
    {char: '知', pinyin: 'zhī', tone: 1},
    {char: '知', pinyin: 'zhi', tone: 4},
  ]) {
    const result = adapter.getSingleCharacterMeaningOptions(query);
    assert.equal(result.status, 'not-covered', JSON.stringify(query));
    assert.deepEqual(result.options, []);
  }
});

test('M610 and approved M460 results remain unchanged through the added source', () => {
  const m610 = adapter.getSingleCharacterMeaningOptions({char: '万', pinyin: 'wàn'});
  assert.equal(m610.status, 'available');
  assert.equal(m610.source.batchId, 'M610-D02');
  assert.equal(m610.options[0].source.definition.def, '眾多的。');
  const approved = adapter.getSingleCharacterMeaningOptions({char: '静', pinyin: 'jìng'});
  assert.equal(approved.status, 'available');
  assert.equal(approved.source.batchId, 'M460-V71-B02');
  assert.equal(approved.options[0].source.definition.def, '恬淡、平和。');
});

test('M616 option keeps candidate-only authority boundaries', () => {
  const result = adapter.getSingleCharacterMeaningOptions({char: '澄', pinyin: 'dèng', tone: 4});
  const option = result.options[0];
  assert.equal(result.scope, 'on-request-supplement-only');
  assert.equal(option.wholeNameMeaning, null);
  assert.equal(option.automaticNameRecommendation, false);
  assert.equal(option.automaticSemanticCreditAllowed, false);
  assert.equal(option.scoreDelta, 0);
});

test('unknown and default-only inputs return not-covered', () => {
  assert.equal(adapter.getSingleCharacterMeaningOptions({char: '龘', pinyin: 'dá', tone: 2}).status, 'not-covered');
  assert.equal(adapter.getSingleCharacterMeaningOptions({char: '知', pinyin: 'zhī', tone: 1}).status, 'not-covered');
});

test('M616 source indices, complete source entry, and parsed hash are preserved', () => {
  const result = adapter.getSingleCharacterMeaningOptions({char: '和', pinyin: 'hè', tone: 4});
  const source = result.options[0].source;
  assert.equal(source.word, '和');
  assert.equal(source.definition.def, '聲音相應。');
  assert.equal(source.completeOriginalEntry.title, '和');
  assert.equal(source.completeOriginalEntry.heteronyms[1].pinyin, 'hè');
  assert.equal(source.parsedEntrySha256.length, 64);
});

test('returned M616 DTO is frozen and cannot contaminate a later query', () => {
  const first = adapter.getSingleCharacterMeaningOptions({char: '音', pinyin: 'yìn', tone: 4});
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.options[0].source), true);
  assert.throws(() => { first.options[0].source.definition.def = 'tampered'; }, TypeError);
  const second = adapter.getSingleCharacterMeaningOptions({char: '音', pinyin: 'yìn', tone: 4});
  assert.equal(second.options[0].source.definition.def, '樹蔭。');
});

test('M616 rejects malformed query objects and invalid tone properties', () => {
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '知', tone: 0}), /tone must be an integer/);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '知', tone: 1.5}), /tone must be an integer/);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '知', tone: '4'}), /tone must be an integer/);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '知', extra: true}), /extra fields/);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions({char: '知知'}), /exactly one Unicode scalar/);
  const proxy = new Proxy({char: '知'}, {getPrototypeOf() { throw new Error('trap'); }});
  assert.equal(types.isProxy(proxy), true);
  assert.throws(() => adapter.getSingleCharacterMeaningOptions(proxy), /Proxy query/);
});

test('M616 rejects tampered source, profile, manifest, and source-lock copies', () => {
  for (const mutate of [
    data => fs.appendFileSync(path.join(data, 'raw/moe-revised.json.gz'), 'tamper'),
    data => fs.appendFileSync(path.join(data, 'naming-character-meanings-m616-profile.json'), '\n'),
    data => fs.appendFileSync(path.join(data, 'naming-character-meanings-m616-manifest.json'), '\n'),
    data => fs.appendFileSync(path.join(data, 'naming-character-meanings-m616-source-lock.json'), '\n'),
  ]) {
    const temp = tempData();
    try {
      mutate(temp.target);
      const broken = createSingleCharacterMeaningAdapter({projectRoot: temp.dir, dataDir: temp.target});
      assert.throws(() => broken.getSingleCharacterMeaningOptions({char: '知', pinyin: 'zhì', tone: 4}), /M616 candidate|M460 7\.1 publication|source bytes|fixed manifest|fixed source-lock|candidate bytes/);
    } finally { cleanup(temp); }
  }
});

test('M616 source-bound query works after data relocation', () => {
  const temp = tempData();
  try {
    const relocated = createSingleCharacterMeaningAdapter({projectRoot: temp.dir, dataDir: temp.target});
    const result = relocated.getSingleCharacterMeaningOptions({char: '湛', pinyin: 'dān', tone: 1});
    assert.equal(result.status, 'available');
    assert.equal(result.options[0].source.definition.def, '快樂。');
  } finally { cleanup(temp); }
});
