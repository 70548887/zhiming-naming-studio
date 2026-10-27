import {test, afterAll as after} from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createCmnReadingSource} from '../src/main/cmn-reading-source';
import {CMN_READING_INPUTS} from '../src/main/cmn-reading-pins';
import type {CmnReadingChoice, CmnReadingOption} from '../src/shared/cmn-reading';

const data = path.resolve('data');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const fixedBefore = CMN_READING_INPUTS.map(p => ({file: p.file, sha256: sha(fs.readFileSync(path.join(data, p.file.slice(5))))}));
const dataset = JSON.parse(fs.readFileSync(path.join(data, 'dataset-v6.json'), 'utf8'));
const raw = JSON.parse(gunzipSync(fs.readFileSync(path.join(data, 'raw/moe-revised.json.gz'))).toString('utf8'));
const source = createCmnReadingSource(data);
const entry = (char: string) => dataset.characters.find((e: {char: string}) => e.char === char);
const option = (char: string, pinyin: string): CmnReadingOption => {
  const found = source.query(char).options.find(o => o.pinyin === pinyin);
  assert.ok(found, char + ' ' + pinyin + ' must be an actual source option');
  return found;
};
const choice = (char = '朝', pinyin = 'cháo') => {const o = option(char, pinyin); return source.createChoice(char, o.optionId, o.definitions[0].definitionId, entry(char));};
const mutate = (f: (c: CmnReadingChoice) => void) => {const c = choice(); f(c); assert.throws(() => source.validateChoice('朝', c, entry('朝')), /CMN_READING_SOURCE/);};

test('fixed source identity and current default are separate from alternative readings', () => {
  const q = source.query('朝', entry('朝'));
  assert.equal(q.source.commit, 'a6dc997417507eb510fc29822bc514de2c92728c');
  assert.equal(q.source.standard, 'MOE-Revised-Taiwan-fixed-snapshot');
  assert.equal(q.source.rawSha256, 'cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e');
  assert.deepEqual(q.options.map(o => [o.pinyin, o.tone, o.isCurrentDefault]), [['zhāo', 1, true], ['cháo', 2, false]]);
  assert.equal(q.currentDefault?.pinyin, 'zhāo');
  assert.deepEqual(q.defaultOptionIds, [q.options[0].optionId]);
  assert.equal(q.options[0].entry.index, 73844);
  assert.equal(q.options[1].heteronym.path, '/73844/heteronyms/1');
  assert.equal(q.options[1].definitions[2].original.def, '對、向。');
});

test('行 returns all four single-character readings with their own meanings', () => {
  assert.deepEqual(source.query('行').options.map(o => o.pinyin), ['xíng', 'háng', 'xìng', 'hàng']);
  assert.equal(option('行', 'xìng').definitions[0].original.def, '行為舉止。');
  assert.equal(option('行', 'háng').definitions[0].original.def, '行列。直列為行，橫排為列。');
  assert.equal(option('行', 'hàng').definitions[0].kind, 'dictionary-reference');
  assert.equal(option('行', 'hàng').definitions[0].original.def, '參見「行行」、「樹行子」等條。');
});

test('乐 preserves 樂, Unicode line and all four actual source readings', () => {
  const q = source.query('乐', entry('乐'));
  assert.deepEqual(q.options.map(o => o.pinyin), ['yuè', 'lào', 'lè', 'yào']);
  assert.equal(q.options[0].glyph.dictionaryWord, '樂');
  assert.equal(q.options[0].entry.index, 78102);
  assert.equal(q.options[0].glyph.kind, 'unicode-traditional-variant');
  assert.match(q.options[0].glyph.variantEvidence!.text, /U\+6A02/);
  assert.equal(q.options[3].definitions[0].original.def, '喜好、欣賞。用於文言文。');
  assert.deepEqual(q.options.filter(o => o.isCurrentDefault).map(o => o.pinyin), ['lè']);
});

test('冠 distinguishes guān hat from guàn leading and preserves source context', () => {
  assert.equal(option('冠', 'guān').definitions[0].original.def, '帽子。');
  const alternative = option('冠', 'guàn');
  const sense = alternative.definitions.find(d => d.original.def === '超越、領先。')!;
  assert.equal(sense.path, '/17665/heteronyms/1/definitions/3');
  assert.deepEqual(sense.original.example, ['如：「獨冠群芳」。']);
  assert.equal(source.validateChoice('冠', source.createChoice('冠', alternative.optionId, sense.definitionId)).selectedDefinition.definitionId, sense.definitionId);
});

test('current dictionary words for 采,启,曲 are honored without correcting traditional fields', () => {
  for (const [char, traditional, word, index] of [['采', '埰', '採', 63430], ['启', '啓', '啟', 29222], ['曲', '麯', '曲', 72424]] as const) {
    const q = source.query(char, entry(char));
    assert.equal(q.currentDefault!.recordedTraditional, traditional);
    assert.equal(q.options[0].glyph.dictionaryWord, word);
    assert.equal(q.options[0].entry.index, index);
    assert.ok(q.defaultOptionIds.length);
    assert.equal(entry(char).traditional, traditional);
  }
  assert.deepEqual(source.query('曲').options.map(o => o.pinyin), ['qū', 'qǔ']);
});

test('raw annotation and cross-reference are not silently expanded into other meanings', () => {
  const b = option('柏', 'bǎi');
  assert.equal(b.heteronym.rawPinyin, '（語音）bǎi');
  assert.equal(b.heteronym.rawBopomofo, '（語音）ㄅㄞˇ');
  assert.equal(b.label, '語音');
  assert.equal(b.definitions[0].original.def, '(一)之語音。');
  assert.equal(b.definitions[0].kind, 'internal-reading-reference');
  assert.equal(b.definitions.length, 1);
  assert.ok(!JSON.stringify(b.definitions).includes('柏科'));
  assert.equal(option('瑾', 'jìn').definitions[0].original.def, '(一)之又音。');
});

test('neutral tones require original neutral Bopomofo evidence', () => {
  assert.equal(option('和', 'huo').tone, 5);
  assert.equal(option('和', 'huo').heteronym.rawBopomofo, '˙ㄏㄨㄛ');
  assert.equal(option('子', 'zi').tone, 5);
});

test('沈 chén with empty definition remains an unselectable original reference', () => {
  const q = source.query('沈');
  assert.deepEqual(q.options.map(o => o.pinyin), ['shěn']);
  assert.equal(q.references.length, 1);
  const r = q.references[0];
  assert.equal(r.reason, 'empty-definition-reference');
  assert.equal(r.selectable, false);
  assert.deepEqual((r.heteronym.original as {definitions: unknown[]}).definitions, [{def: '', link: ['同「沉」。']}]);
  assert.throws(() => source.createChoice('沈', 'chén', '/83184/heteronyms/0/definitions/0'), /unknown source option/);
});

test('unknown character 重 and non-MOE 燚 receive no invented candidates; words are rejected', () => {
  assert.equal(entry('重'), undefined);
  assert.equal(source.query('重').unavailableReason, 'not-in-fixed-character-set');
  assert.equal(source.query('燚').unavailableReason, 'no-moe-reading-identity');
  assert.equal(source.query('燚').options.length, 0);
  for (const value of ['朝阳', '', '朝 ', '\ud800']) assert.throws(() => source.query(value), /one Unicode character/);
});

test('every selectable option and definition is byte-faithful to its single-character original path', () => {
  for (const e of dataset.characters) {
    const q = source.query(e.char, e);
    for (const o of q.options) {
      const originalEntry = raw[o.entry.index], h = originalEntry.heteronyms[o.heteronym.index];
      assert.equal([...originalEntry.title].length, 1);
      assert.equal(originalEntry.title, o.glyph.dictionaryWord);
      assert.equal(o.entry.sha256, sha(JSON.stringify(originalEntry)));
      assert.equal(o.heteronym.sha256, sha(JSON.stringify(h)));
      assert.equal(o.heteronym.rawPinyin, h.pinyin);
      assert.equal(o.heteronym.rawBopomofo, h.bopomofo);
      assert.deepEqual(o.definitions.map(d => d.original), h.definitions);
      for (const d of o.definitions) assert.equal(d.path, '/' + o.entry.index + '/heteronyms/' + o.heteronym.index + '/definitions/' + d.index);
    }
  }
});

test('legitimate alternative choice validates and returned objects cannot poison later queries', () => {
  const c = choice();
  assert.equal(c.isCurrentDefault, false);
  assert.deepEqual(source.validateChoice('朝', c, entry('朝')), c);
  const q = source.query('朝'); q.options[0].pinyin = 'poison'; q.source.rawSha256 = 'poison';
  const returned = source.validateChoice('朝', c); returned.selectedDefinition.original.def = 'poison';
  assert.equal(source.query('朝').options[0].pinyin, 'zhāo');
  assert.notEqual(source.query('朝').source.rawSha256, 'poison');
  assert.deepEqual(source.validateChoice('朝', c), c);
  assert.ok(Object.isFrozen(CMN_READING_INPUTS) && CMN_READING_INPUTS.every(Object.isFrozen));
});

test('wrong character and option grafts are rejected', () => {
  assert.throws(() => source.validateChoice('冠', choice()), /unknown choice source/);
  mutate(c => {c.optionId = option('乐', 'yuè').optionId;});
  mutate(c => {c.glyph.dictionaryWord = '冠';});
  mutate(c => {c.glyph.recordedTraditional = '晁';});
  mutate(c => {c.entry.index = 17665;});
  mutate(c => {c.characterIdentitySha256 = '0'.repeat(64);});
});

test('wrong sense, examples, definition path and heteronym grafts are rejected', () => {
  mutate(c => {c.selectedDefinition = structuredClone(option('朝', 'zhāo').definitions[0]);});
  mutate(c => {c.selectedDefinition.original.def = '早晨。';});
  mutate(c => {c.selectedDefinition.original.quote = ['伪造引文'];});
  mutate(c => {c.selectedDefinition.path = '/73844/heteronyms/0/definitions/0';});
  mutate(c => {c.heteronym.index = 0;});
  mutate(c => {c.selectedDefinition.index += 1;});
});

test('wrong pinyin, tone, annotation or original Bopomofo are rejected', () => {
  mutate(c => {c.pinyin = 'chāo';});
  mutate(c => {c.tone = 1;});
  mutate(c => {c.heteronym.rawBopomofo = 'ㄓㄠ';});
  mutate(c => {c.heteronym.rawPinyin = '（又音）cháo';});
  mutate(c => {c.label = '又音';});
  mutate(c => {c.isCurrentDefault = true;});
});

test('unknown source/version, changed original digest, unknown definition and extra claims are rejected', () => {
  mutate(c => {(c.source as {sourceId: string}).sourceId = 'unregistered-source';});
  mutate(c => {(c as {version: string}).version = 'cmn-character-choice/9.0.0';});
  mutate(c => {c.source.rawSha256 = '1'.repeat(64);});
  mutate(c => {c.source.profileSha256 = '2'.repeat(64);});
  mutate(c => {c.selectedDefinition.definitionId = 'unregistered-sense';});
  mutate(c => {Object.assign(c, {nameSuitabilityApproved: true});});
});

test('original CharacterEntry is bound including default pronunciation, identity and sources', () => {
  for (const field of ['pinyin', 'traditional', 'sourceId', 'meaning']) {
    const e = structuredClone(entry('朝')); e[field] = 'changed';
    assert.throws(() => source.query('朝', e), /CharacterEntry identity differs/);
    assert.throws(() => source.validateChoice('朝', choice(), e), /CharacterEntry identity differs/);
  }
  const e = structuredClone(entry('朝')); e.readings[1].word = '朝阳';
  assert.throws(() => source.query('朝', e), /CharacterEntry identity differs/);
});

test('accessors, sparse arrays, symbols and non-JSON choice values are rejected without getter execution', () => {
  let reads = 0; const c = choice();
  Object.defineProperty(c, 'pinyin', {enumerable: true, get() {reads++; return 'cháo';}});
  assert.throws(() => source.validateChoice('朝', c), /accessor/); assert.equal(reads, 0);
  const s = choice(); (s as unknown as Record<symbol, unknown>)[Symbol('extra')] = true;
  assert.throws(() => source.validateChoice('朝', s), /symbol keys/);
  const a = choice(); a.selectedDefinition.original.quote = new Array(2);
  assert.throws(() => source.validateChoice('朝', a), /sparse array/);
  assert.throws(() => source.validateChoice('朝', new Date()), /non-plain object/);
});

test('changed raw source, glyph map, identity dataset and source lock fail before use', () => {
  const tmp = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'cmn-reading-source-')));
  const targetData = path.join(tmp, 'data'); fs.mkdirSync(targetData);
  try {
    for (const p of CMN_READING_INPUTS) {const dst = path.join(targetData, p.file.slice(5)); fs.mkdirSync(path.dirname(dst), {recursive: true}); fs.copyFileSync(path.join(data, p.file.slice(5)), dst); fs.chmodSync(dst, 0o600);}
    for (const file of ['raw/moe-revised.json.gz', 'raw/kTraditionalVariant.txt', 'dataset-v6.json', 'source-lock.json']) {
      const p = path.join(targetData, file), original = fs.readFileSync(p);
      const changed = Buffer.from(original); changed[changed.length - 1] ^= 1; fs.writeFileSync(p, changed);
      assert.throws(() => createCmnReadingSource(targetData), /fixed source changed/);
      fs.writeFileSync(p, original);
    }
    fs.unlinkSync(path.join(targetData, 'raw/moe-revised.json.gz'));
    assert.throws(() => createCmnReadingSource(targetData), /ENOENT/);
  } finally {assert.ok(tmp.startsWith(fs.realpathSync.native(os.tmpdir()) + path.sep)); fs.rmSync(tmp, {recursive: true, force: true});}
});

test('stable IDs survive a fresh source adapter with no changed input bytes', () => {
  const second = createCmnReadingSource(data);
  assert.deepEqual(second.query('乐'), source.query('乐'));
  assert.deepEqual(second.validateChoice('朝', choice()), choice());
});

test('coverage accounts for all 779 characters and exposes real exclusions', () => {
  const c = source.coverage();
  assert.equal(c.characters, 779);
  assert.equal(c.availableCharacters + c.referenceOnlyCharacters + c.unavailableCharacters, 779);
  assert.ok(c.multipleDistinctReadings >= 100);
  assert.deepEqual(c.unavailable, [{char: '燚', reason: 'no-moe-reading-identity'}]);
  assert.deepEqual(c.defaultNotRepresented, ['燚']);
});

after(() => {
  assert.deepEqual(CMN_READING_INPUTS.map(p => ({file: p.file, sha256: sha(fs.readFileSync(path.join(data, p.file.slice(5))))})), fixedBefore, 'source bytes and default dictionary must remain unchanged');
});
