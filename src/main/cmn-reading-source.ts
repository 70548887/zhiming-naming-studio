import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {CMN_READING_INPUTS} from './cmn-reading-pins';
import type {CmnReadingAdapter, CmnReadingChoice, CmnReadingCoverage, CmnReadingDefinition, CmnReadingGlyphBinding, CmnReadingLabel, CmnReadingOption, CmnReadingQuery, CmnReadingSourceIdentity, CmnReadingTone} from '../shared/cmn-reading';

const PROFILE = 'cmn-character-source/1.0.0' as const;
const CHOICE_VERSION = 'cmn-character-choice/1.0.0' as const;
const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const objectSha = (value: unknown) => sha(JSON.stringify(value));
const clone = <T>(value: T): T => structuredClone(value);
function fact(condition: unknown, message: string): asserts condition { if (!condition) throw new Error('CMN_READING_SOURCE: ' + message); }

interface OriginalDefinition { def: string; type?: string; example?: string[]; quote?: string[]; link?: string[] }
interface RawHeteronym { pinyin?: string; bopomofo?: string; definitions: OriginalDefinition[]; [key: string]: unknown }
interface RawEntry { title: string; heteronyms: RawHeteronym[]; [key: string]: unknown }
interface CharacterIdentity { char: string; traditional: string; pinyin: string; tone: number; sourceId: string; readings?: {sourceId: string; word: string}[]; [key: string]: unknown }

/** Never reads accessors/toJSON from a caller-provided choice. JSON-compatible own data only. */
function assertData(value: unknown): void {
  let nodes = 0;
  const seen = new Set<object>();
  const visit = (v: unknown, depth: number): void => {
    fact(++nodes <= 20000 && depth <= 24, 'data is too deeply nested or too large');
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number') { fact(Number.isFinite(v), 'non-finite number'); return; }
    fact(typeof v === 'object', 'non-JSON value');
    const o = v as object;
    fact(!seen.has(o), 'cyclic or repeated object reference');
    seen.add(o);
    fact(Array.isArray(o) ? Object.getPrototypeOf(o) === Array.prototype : Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null, 'non-plain object');
    fact(Object.getOwnPropertySymbols(o).length === 0, 'symbol keys');
    const descriptors = Object.getOwnPropertyDescriptors(o);
    for (const [key, d] of Object.entries(descriptors)) {
      if (Array.isArray(o) && key === 'length') continue;
      fact('value' in d && d.enumerable, 'accessor or hidden property');
      if (Array.isArray(o)) fact(/^(0|[1-9][0-9]*)$/.test(key), 'extra array property');
      visit(d.value, depth + 1);
    }
    if (Array.isArray(o)) fact(Object.keys(o).length === o.length, 'sparse array');
    seen.delete(o);
  };
  visit(value, 0);
}

function readPinned(dataDirectory: string): Map<string, Buffer> {
  fact(path.isAbsolute(dataDirectory), 'explicit absolute data directory required');
  const root = path.resolve(dataDirectory);
  fact(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), 'data root must be a real directory');
  const result = new Map<string, Buffer>();
  for (const input of CMN_READING_INPUTS) {
    const relative = input.file.replace(/^data\//, '');
    fact(relative !== input.file && !relative.split('/').includes('..'), 'invalid pinned path');
    let current = root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      fact(!fs.lstatSync(current).isSymbolicLink(), 'linked source input: ' + input.file);
    }
    fact(fs.statSync(current).isFile(), 'not a file: ' + input.file);
    const bytes = fs.readFileSync(current);
    fact(bytes.length === input.bytes && sha(bytes) === input.sha256, 'fixed source changed: ' + input.file);
    result.set(input.file, bytes);
  }
  return result;
}

/** Strictly normalizes the three labels actually present in this fixed 779-character scope. */
function parseReading(h: RawHeteronym): {pinyin: string; tone: CmnReadingTone; label: CmnReadingLabel} | null {
  if (typeof h.pinyin !== 'string' || typeof h.bopomofo !== 'string') return null;
  const parseLabel = (s: string): {label: CmnReadingLabel; value: string} => {
    const m = /^（(讀音|語音|又音)）(.*)$/.exec(s);
    return m ? {label: m[1] as CmnReadingLabel, value: m[2]} : {label: null, value: s};
  };
  const p = parseLabel(h.pinyin), b = parseLabel(h.bopomofo);
  if (p.label !== b.label || p.value !== p.value.normalize('NFC') || !/^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/.test(p.value)) return null;
  const accents = ['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ'];
  const marks = [...p.value].flatMap((c, i) => accents.flatMap((group, tone) => group.includes(c) ? [{index: i, tone: tone + 1}] : []));
  if (marks.length > 1) return null;
  const base = p.value.normalize('NFD').replace(/[\u0304\u0301\u030c\u0300]/g, '').normalize('NFC');
  if (!/^[a-zü]{1,6}$/.test(base) || !/[aeiouü]/.test(base)) return null;
  const tone = (marks[0]?.tone ?? 5) as CmnReadingTone;
  if (marks.length) {
    const expected = base.includes('a') ? base.indexOf('a') : base.includes('e') ? base.indexOf('e') : base.includes('ou') ? base.indexOf('o') : Math.max(...[...base].map((c, i) => /[aeiouü]/.test(c) ? i : -1));
    if (marks[0].index !== expected) return null;
  }
  const neutral = /^˙[ㄅ-ㄩ]+$/.test(b.value);
  const stressed = /^([ㄅ-ㄩ]+)([ˊˇˋ]?)$/.exec(b.value);
  const bTone = neutral ? 5 : stressed ? ({'': 1, 'ˊ': 2, 'ˇ': 3, 'ˋ': 4} as const)[stressed[2] as '' | 'ˊ' | 'ˇ' | 'ˋ'] : null;
  if (tone !== bTone) return null;
  return {pinyin: p.value, tone, label: p.label};
}

function definitionKind(d: OriginalDefinition): CmnReadingDefinition['kind'] {
  if (!d.def) return 'empty-definition-reference';
  if (/^(?:\([一二三四五六七八九十]+\)|（[一二三四五六七八九十]+）)?之(?:語音|讀音|又音)。$/.test(d.def)) return 'internal-reading-reference';
  if (/^(?:參見「.*」.*條。|「.*」的異體字。)$/.test(d.def)) return 'dictionary-reference';
  return 'definition';
}

export function createCmnReadingSource(dataDirectory: string): CmnReadingAdapter {
  return buildCmnReadingSource(readPinned(dataDirectory));
}

// All profiles are byte-pinned. The parsed index is path-independent; each
// caller's complete original files must verify before this cache is consulted.
let verifiedIndex: CmnReadingAdapter | undefined;
export function loadVerifiedCmnReadingSource(dataDirectory: string): CmnReadingAdapter {
  const verifiedBytes = readPinned(dataDirectory);
  return verifiedIndex ??= buildCmnReadingSource(verifiedBytes);
}

function buildCmnReadingSource(bytes: Map<string, Buffer>): CmnReadingAdapter {
  const input = (file: string) => bytes.get(file)!;
  const pin = (file: string) => CMN_READING_INPUTS.find(x => x.file === file)!;
  const dataset = JSON.parse(input('data/dataset-v6.json').toString('utf8')) as {version: string; characters: CharacterIdentity[]};
  fact(dataset.version === '2026.10.20.2' && dataset.characters.length === 779, 'unknown character dataset');
  const characters = new Map(dataset.characters.map(e => [e.char, e]));
  fact(characters.size === 779, 'duplicate character identity');
  const rawJson = gunzipSync(input('data/raw/moe-revised.json.gz'));
  const raw = JSON.parse(rawJson.toString('utf8')) as RawEntry[];
  const entries = new Map<string, {row: RawEntry; index: number}[]>();
  const wantedWords = new Set(dataset.characters.flatMap(e => (e.readings ?? []).filter(r => r.sourceId === 'moe-revised').map(r => r.word)));
  raw.forEach((row, index) => { if (!wantedWords.has(row.title)) return; const hits = entries.get(row.title) ?? []; hits.push({row, index}); entries.set(row.title, hits); });
  const variants = new Map<string, {targets: string[]; line: number; text: string}>();
  input('data/raw/kTraditionalVariant.txt').toString('utf8').split(/\r?\n/).forEach((text, index) => {
    if (!text || text.startsWith('#')) return;
    const [cp, value] = text.split('\t');
    fact(/^[0-9A-F]+$/.test(cp) && typeof value === 'string', 'unknown fixed Unicode line format');
    variants.set(String.fromCodePoint(parseInt(cp, 16)), {targets: [...value.matchAll(/U\+([0-9A-F]+)/g)].map(m => String.fromCodePoint(parseInt(m[1], 16))), line: index + 1, text});
  });
  const source: CmnReadingSourceIdentity = {
    profile: PROFILE, profileSha256: objectSha(CMN_READING_INPUTS), language: 'cmn', standard: 'MOE-Revised-Taiwan-fixed-snapshot',
    sourceId: 'moe-revised', commit: 'a6dc997417507eb510fc29822bc514de2c92728c',
    rawFile: 'data/raw/moe-revised.json.gz', rawSha256: pin('data/raw/moe-revised.json.gz').sha256, rawJsonSha256: sha(rawJson),
    datasetFile: 'data/dataset-v6.json', datasetSha256: pin('data/dataset-v6.json').sha256, datasetVersion: '2026.10.20.2',
    license: 'CC-BY-ND-3.0-TW', url: 'https://github.com/g0v/moedict-data/blob/a6dc997417507eb510fc29822bc514de2c92728c/dict-revised_bkup.json',
  };
  const limitations = [
    '固定MOE臺灣國語辭典來源；未將各地或大陸普通話讀音差異自動統一。',
    '僅返回現779字條已登記的單字詞條身份；Unicode字形對應不等於每個義項均適用於簡體字。',
    '原語音／讀音／又音、文言、姓氏、地名與參見提示原樣保留；未判定適合人名。',
    '未拆分多字詞讀音，未將參見詞條或其他異讀的釋義借入當前讀音。',
    '選擇校驗只證明固定來源及所選原義項一致；不修改現有默認音、評分、方案或歷史。',
  ];
  const cache = new Map<string, CmnReadingQuery>();

  function assertChar(char: string, originalCharacter?: unknown): CharacterIdentity | undefined {
    fact(typeof char === 'string' && [...char].length === 1 && !/[\ud800-\udfff]/u.test(char), 'query requires one Unicode character');
    const e = characters.get(char);
    if (originalCharacter !== undefined) {
      assertData(originalCharacter);
      fact(e && isDeepStrictEqual(originalCharacter, e), 'original CharacterEntry identity differs');
    }
    return e;
  }

  function computeQuery(char: string): CmnReadingQuery {
    const e = characters.get(char);
    const result: CmnReadingQuery = {profile: PROFILE, source: clone(source), char, status: 'unavailable', unavailableReason: null,
      characterIdentitySha256: e ? objectSha(e) : null,
      currentDefault: e ? {pinyin: e.pinyin, tone: e.tone, recordedTraditional: e.traditional, sourceId: e.sourceId} : null,
      defaultOptionIds: [], options: [], references: [], limitations: [...limitations]};
    if (!e) { result.unavailableReason = 'not-in-fixed-character-set'; return result; }
    const readings = e.readings ?? [];
    const words = [...new Set(readings.filter(r => r.sourceId === 'moe-revised').map(r => r.word))];
    if (e.sourceId !== 'moe-revised' || !words.length) { result.unavailableReason = 'no-moe-reading-identity'; return result; }
    for (const word of words) {
      fact(typeof word === 'string' && [...word].length === 1, 'word-level entry cannot be split into a character');
      const variant = variants.get(char);
      fact(char === word || variant?.targets.includes(word), 'dictionary word has no fixed glyph bridge: ' + char);
      const glyph: CmnReadingGlyphBinding = {inputChar: char, recordedTraditional: e.traditional, dictionaryWord: word,
        kind: char === word ? 'same-character' : 'unicode-traditional-variant',
        characterReadingIndices: readings.flatMap((r, i) => r.sourceId === 'moe-revised' && r.word === word ? [i] : []),
        variantEvidence: char === word ? null : {file: 'data/raw/kTraditionalVariant.txt', sha256: pin('data/raw/kTraditionalVariant.txt').sha256, line: variant!.line, text: variant!.text}};
      const hits = entries.get(word) ?? [];
      if (!hits.length) continue;
      fact(hits.length === 1, 'ambiguous raw dictionary title');
      const {row, index} = hits[0];
      fact(row.title === word && Array.isArray(row.heteronyms), 'single-character raw entry differs');
      const entry = {index, path: '/' + index, title: row.title, sha256: objectSha(row)};
      row.heteronyms.forEach((h, heteronymIndex) => {
        const heteronymPath = entry.path + '/heteronyms/' + heteronymIndex;
        const normalized = parseReading(h);
        fact(Array.isArray(h.definitions), 'missing raw definitions');
        for (const d of h.definitions) fact(typeof d.def === 'string' && ['type', 'example', 'quote', 'link'].every(k => d[k as keyof OriginalDefinition] === undefined || (k === 'type' ? typeof d.type === 'string' : Array.isArray(d[k as keyof OriginalDefinition]))), 'unknown definition field format');
        if (!normalized || !h.definitions.some(d => d.def.length > 0)) {
          result.references.push({char, glyph: clone(glyph), entry: clone(entry), heteronym: {index: heteronymIndex, path: heteronymPath, sha256: objectSha(h), original: clone(h)}, reason: normalized ? 'empty-definition-reference' : 'unparsed-reading', selectable: false});
          return;
        }
        const optionId = 'cmnr1-' + objectSha([PROFILE, source.profileSha256, char, result.characterIdentitySha256, glyph, entry, heteronymIndex, objectSha(h), normalized]);
        const option: CmnReadingOption = {optionId, char, characterIdentitySha256: result.characterIdentitySha256!, source: clone(source), glyph: clone(glyph), entry: clone(entry),
          heteronym: {index: heteronymIndex, path: heteronymPath, sha256: objectSha(h), rawPinyin: h.pinyin!, rawBopomofo: h.bopomofo!},
          ...normalized, isCurrentDefault: normalized.pinyin === e.pinyin && normalized.tone === e.tone,
          definitions: h.definitions.map((d, definitionIndex) => ({definitionId: 'cmnd1-' + objectSha([optionId, definitionIndex, d]), path: heteronymPath + '/definitions/' + definitionIndex, index: definitionIndex, original: clone(d), kind: definitionKind(d)})), suitabilityForPersonalName: 'not-assessed'};
        result.options.push(option);
      });
    }
    result.defaultOptionIds = result.options.filter(o => o.isCurrentDefault).map(o => o.optionId);
    result.status = result.options.length ? 'available' : result.references.length ? 'reference-only' : 'unavailable';
    if (result.status === 'unavailable') result.unavailableReason = 'source-entry-missing';
    return result;
  }
  function canonicalQuery(char: string, originalCharacter?: unknown): CmnReadingQuery {
    assertChar(char, originalCharacter);
    if (!cache.has(char)) cache.set(char, computeQuery(char));
    return cache.get(char)!;
  }
  function createChoice(char: string, optionId: string, definitionId: string, originalCharacter?: unknown): CmnReadingChoice {
    fact(typeof optionId === 'string' && typeof definitionId === 'string', 'option and definition IDs required');
    const query = canonicalQuery(char, originalCharacter), option = query.options.find(o => o.optionId === optionId);
    fact(option, 'unknown source option for this character');
    const definition = option.definitions.find(d => d.definitionId === definitionId);
    fact(definition && definition.original.def.length > 0, 'unknown or empty definition for this exact reading');
    return clone({version: CHOICE_VERSION, choiceId: 'cmnc1-' + objectSha([CHOICE_VERSION, optionId, definitionId]), char,
      characterIdentitySha256: option.characterIdentitySha256, optionId, pinyin: option.pinyin, tone: option.tone, isCurrentDefault: option.isCurrentDefault,
      source: option.source, glyph: option.glyph, entry: option.entry, heteronym: option.heteronym, label: option.label, selectedDefinition: definition, suitabilityForPersonalName: 'not-assessed'});
  }
  function validateChoice(char: string, choice: unknown, originalCharacter?: unknown): CmnReadingChoice {
    assertData(choice);
    fact(choice && typeof choice === 'object' && !Array.isArray(choice), 'choice must be an object');
    const c = choice as CmnReadingChoice;
    fact(c.version === CHOICE_VERSION && c.char === char && c.source?.profile === PROFILE && c.source.sourceId === 'moe-revised', 'unknown choice source or version');
    fact(c.selectedDefinition && typeof c.selectedDefinition.definitionId === 'string', 'selected definition required');
    const expected = createChoice(char, c.optionId, c.selectedDefinition.definitionId, originalCharacter);
    fact(isDeepStrictEqual(c, expected), 'reading, glyph, source, marks or definition evidence differs');
    return expected;
  }
  function coverage(): CmnReadingCoverage {
    const queries = [...characters.keys()].map(char => canonicalQuery(char));
    return {characters: queries.length, availableCharacters: queries.filter(q => q.status === 'available').length,
      referenceOnlyCharacters: queries.filter(q => q.status === 'reference-only').length, unavailableCharacters: queries.filter(q => q.status === 'unavailable').length,
      multipleDistinctReadings: queries.filter(q => new Set(q.options.map(o => o.pinyin)).size > 1).length,
      charactersWithNondefaultOptions: queries.filter(q => q.options.some(o => !o.isCurrentDefault)).length,
      options: queries.reduce((n, q) => n + q.options.length, 0), nondefaultOptions: queries.reduce((n, q) => n + q.options.filter(o => !o.isCurrentDefault).length, 0),
      definitions: queries.reduce((n, q) => n + q.options.reduce((m, o) => m + o.definitions.length, 0), 0), references: queries.reduce((n, q) => n + q.references.length, 0),
      defaultNotRepresented: queries.filter(q => !q.defaultOptionIds.length).map(q => q.char), unavailable: queries.filter(q => q.status === 'unavailable').map(q => ({char: q.char, reason: q.unavailableReason}))};
  }
  return Object.freeze({get source() { return clone(source); }, query: (char: string, originalCharacter?: unknown) => clone(canonicalQuery(char, originalCharacter)), createChoice, validateChoice, coverage});
}
