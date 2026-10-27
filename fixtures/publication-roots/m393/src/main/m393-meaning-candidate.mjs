import {readFileSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as equal} from 'node:util';
import {M393_PINS} from './m393-meaning-candidate-pins.mjs';

const BATCH = 'M393-D02';
const SOURCE = 'naming-character-meanings-m393-candidate';
const VERSION = 'naming-character-meanings-candidate/M393.1';
const SCOPE = 'per-character-project-explanation-only';
const PREFIX = 'naming-character-meanings-m393';
const FILES = Object.freeze({
  profile: `${PREFIX}-profile.json`,
  subset: `raw/${PREFIX}-subset.json`,
  admission: `${PREFIX}-admission.json`,
  sourceLock: `${PREFIX}-source-lock.json`,
  notice: `${PREFIX}-NOTICE.md`,
  manifest: `${PREFIX}-manifest.json`,
});
const ORIGINALS = Object.freeze(['dataset-v6.json', 'naming-editorial-v7.json', 'raw/moe-revised.json.gz', 'raw/kTraditionalVariant.txt', 'raw/kSimplifiedVariant.txt', 'raw/moe-README.md', 'raw/CC-BY-ND-3.0-TW.html', 'raw/unicode-LICENSE']);
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new Error(`M393 candidate verification failed: ${message}`); };
const need = (condition, message) => { if (!condition) fail(message); };
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const text = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const exactKeys = (value, keys) => plain(value) && equal(Object.keys(value).sort(), [...keys].sort());
const freeze = value => {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
};
const pins = freeze(structuredClone(M393_PINS));

function safePath(directory, relative) {
  need(text(relative) && !relative.includes('\\') && !relative.includes(':') && !relative.startsWith('/') && relative.split('/').every(p => p && p !== '.' && p !== '..'), 'invalid relative file path');
  const base = resolve(directory), file = resolve(base, ...relative.split('/'));
  need(file.startsWith(base + sep), 'file escaped data directory');
  return file;
}
function checkPin(value, label) {
  need(exactKeys(value, ['bytes', 'sha256']) && integer(value.bytes) && value.bytes > 0 && sha(value.sha256), `${label} pin shape`);
}
function pinnedBytes(directory, file, pin) {
  checkPin(pin, file);
  const bytes = readFileSync(safePath(directory, file));
  need(bytes.length === pin.bytes && hash(bytes) === pin.sha256, `${file} fixed bytes/hash differ`);
  return bytes;
}
function candidateFlags(value, label) {
  need(value.activation === 'off' && value.productionApproved === false && value.dispatchToLive === false, `${label} must remain candidate-only`);
  for (const key of ['generationAuthority', 'sourceAuthority']) if (Object.hasOwn(value, key)) need(value[key] === false, `${label} has forbidden authority`);
}
function rowScope(value, label) {
  need(value.scope === SCOPE && value.wholeNameAssessment === 'not-assessed' && value.wholeNameMeaning === null && value.automaticNameRecommendation === false && value.automaticSemanticCreditAllowed === false && value.scoreDelta === 0, `${label} may not confer name/score authority`);
}
function validateRow(row) {
  need(exactKeys(row, ['caseId', 'char', 'selectedPinyin', 'tone', 'baselineCharacter', 'baselineCharacterSha256', 'prior', 'glyph', 'original', 'editorial', 'notWholeWordDerived', 'usageReviewRequired', 'automaticSemanticCreditAllowed', 'scoreDelta', 'scope', 'wholeNameAssessment', 'wholeNameMeaning', 'automaticNameRecommendation']) && text(row.caseId) && typeof row.char === 'string' && [...row.char].length === 1 && text(row.selectedPinyin) && Number.isInteger(row.tone) && row.tone >= 1 && row.tone <= 5, 'invalid character case identity/shape');
  rowScope(row, row.char);
  need(row.notWholeWordDerived === true, `${row.char} whole-word borrowing`);
  need(plain(row.baselineCharacter) && row.baselineCharacter.char === row.char && row.baselineCharacter.pinyin === row.selectedPinyin && row.baselineCharacter.tone === row.tone && sha(row.baselineCharacterSha256), `${row.char} baseline identity`);
  need(hash(JSON.stringify(row.baselineCharacter)) === row.baselineCharacterSha256, `${row.char} baseline snapshot hash`);
  need(exactKeys(row.prior, ['status', 'namingMeaning', 'automaticMeaningAllowed', 'sourceReview', 'sourceReviewSha256']) && row.prior.status === 'pending' && row.prior.namingMeaning === null && row.prior.automaticMeaningAllowed === false && plain(row.prior.sourceReview) && sha(row.prior.sourceReviewSha256), `${row.char} original pending review binding`);
  need(hash(JSON.stringify(row.prior.sourceReview)) === row.prior.sourceReviewSha256, `${row.char} prior snapshot hash`);
  const original = row.original;
  need(exactKeys(original, ['sourceId', 'word', 'rawEntryIndex', 'rawHeteronymIndex', 'rawDefinitionIndex', 'rawFile', 'rawSha256', 'pinyin', 'definition', 'completeOriginalEntry', 'parsedEntrySha256', 'parsedHashConvention', 'license']), `${row.char} original shape`);
  need(original.sourceId === 'moe-revised' && original.rawFile === 'data/raw/moe-revised.json.gz' && original.license === 'CC-BY-ND-3.0-TW' && text(original.word) && [...original.word].length === 1 && original.pinyin === row.selectedPinyin && [original.rawEntryIndex, original.rawHeteronymIndex, original.rawDefinitionIndex].every(integer) && sha(original.rawSha256) && sha(original.parsedEntrySha256) && original.parsedHashConvention === 'sha256(JSON.stringify(parsed complete original entry));not raw byte range' && plain(original.definition) && text(original.definition.def) && plain(original.completeOriginalEntry), `${row.char} original identity`);
  need(original.rawSha256 === pins.originalPins?.['raw/moe-revised.json.gz']?.sha256 && hash(JSON.stringify(original.completeOriginalEntry)) === original.parsedEntrySha256, `${row.char} original snapshot hash`);
  need(['名', '形', '動', '副'].includes(original.definition.type), `${row.char} unsupported source type`);
  need(row.usageReviewRequired === ['動', '副'].includes(original.definition.type), `${row.char} action/adverb usage-review flag differs`);
  const editorial = row.editorial;
  need(exactKeys(editorial, ['attribution', 'license', 'meaning', 'projectWish', 'reason', 'limits']) && editorial.license === 'CC0-1.0' && [editorial.attribution, editorial.meaning, editorial.projectWish, editorial.reason].every(text) && editorial.projectWish.startsWith('项目创作：愿') && Array.isArray(editorial.limits) && editorial.limits.length >= 2 && editorial.limits.every(text), `${row.char} independent project editorial`);
  need(plain(row.glyph) && ['exact-source-glyph', 'unicode-two-way-variant-with-explicit-source-word'].includes(row.glyph.kind) && row.glyph.character === row.char && row.glyph.dictionaryWord === original.word && Array.isArray(row.glyph.proof), `${row.char} glyph shape`);
  if (row.glyph.kind === 'exact-source-glyph') need(row.char === original.word, `${row.char} exact source glyph mismatch`);
  else need(row.char !== original.word && row.glyph.proof.length >= 2, `${row.char} explicit variant proof missing`);
}

function artifact(value, schema, label) {
  need(plain(value) && value.schema === schema && value.batchId === BATCH && value.sourceId === SOURCE && value.version === VERSION, `${label} schema/batch/source/version`);
  candidateFlags(value, label); rowScope(value, label);
}

function validatePublication(manifest, sourceLock) {
  artifact(manifest, 'naming-character-meanings-candidate-publication/1', 'manifest');
  artifact(sourceLock, 'naming-character-meanings-candidate-source-lock/1', 'source-lock');
  need(Array.isArray(manifest.files) && manifest.files.length === 5, 'manifest five-file closure');
  const manifestFiles = new Map();
  for (const row of manifest.files) {
    need(exactKeys(row, ['file', 'bytes', 'sha256']) && Object.hasOwn(pins.filePins, row.file) && !manifestFiles.has(row.file), 'manifest file identity/duplicate');
    need(equal({bytes: row.bytes, sha256: row.sha256}, pins.filePins[row.file]), `manifest file pin differs: ${row.file}`);
    manifestFiles.set(row.file, row);
  }
  need(exactKeys(pins.originalPins, ORIGINALS) && exactKeys(sourceLock.originalFiles, ORIGINALS), 'source-lock original closure');
  for (const file of ORIGINALS) {
    const entry = sourceLock.originalFiles[file]; checkPin(pins.originalPins[file], file);
    need(plain(entry) && Object.keys(entry).every(k => ['bytes', 'sha256', 'license'].includes(k)) && equal({bytes: entry.bytes, sha256: entry.sha256}, pins.originalPins[file]) && (!Object.hasOwn(entry, 'license') || text(entry.license)), `source-lock original pin differs: ${file}`);
  }
  const candidateFiles = Object.values(FILES).filter(f => ![FILES.manifest, FILES.sourceLock].includes(f));
  need(exactKeys(sourceLock.candidateFiles, candidateFiles) && text(sourceLock.sourceHashConvention), 'source-lock four-file candidate closure/convention');
  for (const file of candidateFiles) need(equal(sourceLock.candidateFiles[file], pins.filePins[file]), `source-lock candidate pin differs: ${file}`);
}

/** Loads only fixed candidate bytes. It neither registers nor invokes a live naming method. */
export function loadM393MeaningCandidate(dataDir) {
  need(plain(pins) && pins.batchId === BATCH && sha(pins.manifestSha256) && typeof pins.expectedChars === 'string' && [...pins.expectedChars].length === 20 && new Set([...pins.expectedChars]).size === 20, 'invalid compiled candidate pins');
  need(exactKeys(pins.filePins, Object.values(FILES).filter(f => f !== FILES.manifest)), 'candidate file pin closure');
  const manifestBytes = readFileSync(safePath(dataDir, FILES.manifest));
  need(hash(manifestBytes) === pins.manifestSha256, 'manifest fixed hash differs');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const loaded = {};
  for (const [key, file] of Object.entries(FILES)) {
    if (key === 'manifest') continue;
    const bytes = pinnedBytes(dataDir, file, pins.filePins[file]);
    loaded[key] = key === 'notice' ? bytes.toString('utf8') : JSON.parse(bytes.toString('utf8'));
  }
  const {profile, subset, admission, sourceLock, notice} = loaded;
  artifact(profile, 'naming-character-meanings-candidate/1', 'profile');
  need(profile.candidateOnly === true && profile.generationAuthority === false && profile.sourceAuthority === false, 'profile candidate authority markers');
  need(profile.scope === SCOPE && Array.isArray(profile.cases) && profile.cases.length === 20 && profile.cases.map(r => r.char).join('') === pins.expectedChars && new Set(profile.cases.map(r => r.caseId)).size === 20, 'exact 20 selected character cases');
  for (const row of profile.cases) validateRow(row);
  artifact(subset, 'naming-character-meanings-candidate-subset/1', 'subset');
  need(subset.candidateOnly === true && subset.generationAuthority === false && subset.sourceAuthority === false, 'subset candidate authority markers');
  need(Array.isArray(subset.cases) && equal(subset.cases, profile.cases), 'profile/subset candidate rows differ');
  need(equal(profile.subset, {file: FILES.subset, ...pins.filePins[FILES.subset]}), 'profile subset fixed pointer differs');
  artifact(admission, 'naming-character-meanings-candidate-admission/1', 'admission');
  need(admission.decision === 'candidate-awaiting-independent-review' && Array.isArray(admission.approvedCaseIds) && admission.approvedCaseIds.length === 0, 'candidate admission must remain pending');
  validatePublication(manifest, sourceLock);
  need(text(notice), 'candidate notice missing');
  return freeze({batchId: BATCH, sourceId: SOURCE, activation: 'off', productionApproved: false, dispatchToLive: false, candidateOnly: true, generationAuthority: false, sourceAuthority: false, profile, subset, admission, sourceLock, manifest, notice, cases: profile.cases});
}

function readingContains(meaning, definitions) {
  const walk = (remaining, used, depth) => depth < 3 && definitions.some(definition => !used.has(definition) && (remaining === definition || remaining.startsWith(definition + '；') && walk(remaining.slice(definition.length + 1), new Set([...used, definition]), depth + 1)));
  return typeof meaning === 'string' && Array.isArray(definitions) && definitions.every(text) && walk(meaning, new Set(), 0);
}
function pinyinTone(pinyin) {
  const marks = ['āēīōūǖ', 'áéíóúǘń', 'ǎěǐǒǔǚň', 'àèìòùǜǹ'];
  const tones = marks.flatMap((group, index) => [...pinyin.normalize('NFC')].some(c => group.includes(c)) ? [index + 1] : []);
  need(tones.length <= 1, 'ambiguous pinyin tone marks');
  return tones[0] ?? 5;
}
function validateGlyph(row, raw, originals, lines) {
  const glyph = row.glyph, word = row.original.word;
  const characterCode = row.char.codePointAt(0), wordCode = word.codePointAt(0);
  let forward = false, reverse = false;
  for (const proof of glyph.proof) {
    need(exactKeys(proof, ['originalFile', 'lineNumber', 'originalLine', 'fileSha256']) && ['data/raw/kTraditionalVariant.txt', 'data/raw/kSimplifiedVariant.txt'].includes(proof.originalFile) && Number.isSafeInteger(proof.lineNumber) && proof.lineNumber > 0 && typeof proof.originalLine === 'string' && sha(proof.fileSha256), `${row.char} Unicode proof shape`);
    const file = proof.originalFile.slice(5);
    need(hash(originals.get(file)) === proof.fileSha256 && lines.get(file)[proof.lineNumber - 1] === proof.originalLine, `${row.char} Unicode original line/file differs`);
    const [head, ...rest] = proof.originalLine.split(/\s+/), first = /^[0-9A-Fa-f]+$/.test(head) ? parseInt(head, 16) : NaN;
    const targets = [...rest.join(' ').matchAll(/U\+([0-9A-Fa-f]+)/g)].map(m => parseInt(m[1], 16));
    if (file === 'raw/kTraditionalVariant.txt' && first === characterCode && targets.includes(wordCode)) forward = true;
    if (file === 'raw/kSimplifiedVariant.txt' && first === wordCode && targets.includes(characterCode)) reverse = true;
  }
  if (glyph.kind !== 'exact-source-glyph') need(forward && reverse, `${row.char} Unicode evidence is not a two-way glyph relation`);
  const own = glyph.ownDictionaryEntry;
  if (own != null) need(plain(own) && integer(own.rawEntryIndex) && equal(raw[own.rawEntryIndex], own.completeOriginalEntry) && own.completeOriginalEntry.title === row.char && hash(JSON.stringify(own.completeOriginalEntry)) === own.entrySha256, `${row.char} own glyph dictionary entry differs`);
  else if (glyph.kind !== 'exact-source-glyph') need(!raw.some(entry => entry.title === row.char), `${row.char} existing own glyph entry must be retained`);
}

/** Verifies original data by reading the fixed MOE gzip at most once per call. */
export function verifyM393MeaningCandidate(dataDir, originalDataDir) {
  const capsule = loadM393MeaningCandidate(dataDir);
  need(exactKeys(pins.originalPins, ORIGINALS), 'original file pin closure');
  const originals = new Map();
  // Cheap sources and original review constraints precede the large dictionary read.
  for (const file of ORIGINALS.filter(f => f !== 'raw/moe-revised.json.gz')) originals.set(file, pinnedBytes(originalDataDir, file, pins.originalPins[file]));
  const dataset = JSON.parse(originals.get('dataset-v6.json').toString('utf8'));
  const oldReview = JSON.parse(originals.get('naming-editorial-v7.json').toString('utf8'));
  need(Array.isArray(dataset.characters) && Array.isArray(oldReview.meaningReviews), 'original dataset/review schema');
  const byCharacter = new Map(dataset.characters.map(row => [row.char, row]));
  const byReview = new Map(oldReview.meaningReviews.map(row => [row.char, row]));
  for (const row of capsule.cases) {
    const baseline = byCharacter.get(row.char), prior = byReview.get(row.char);
    need(equal(baseline, row.baselineCharacter) && hash(JSON.stringify(baseline)) === row.baselineCharacterSha256, `${row.char} original baseline differs`);
    need(prior?.status === 'pending' && prior.namingMeaning === null && prior.automaticMeaningAllowed === false && equal(prior, row.prior.sourceReview) && hash(JSON.stringify(prior)) === row.prior.sourceReviewSha256, `${row.char} original pending diagnostic differs`);
    const readings = baseline.readings?.filter(r => r.pinyin === row.selectedPinyin && r.tone === row.tone && r.sourceId === 'moe-revised' && !Object.hasOwn(r, 'referenceOnly') && !Object.hasOwn(r, 'sourceReference'));
    need(baseline.sourceId === 'moe-revised' && readings?.length === 1 && readings[0].word === row.original.word && readingContains(baseline.meaning, readings[0].meanings) && readings[0].meanings.includes(row.original.definition.def) && pinyinTone(row.selectedPinyin) === row.tone, `${row.char} exact default reading/word/tone differs`);
  }
  const gzip = pinnedBytes(originalDataDir, 'raw/moe-revised.json.gz', pins.originalPins['raw/moe-revised.json.gz']);
  originals.set('raw/moe-revised.json.gz', gzip);
  const raw = JSON.parse(gunzipSync(gzip).toString('utf8'));
  need(Array.isArray(raw), 'MOE original entries must be an array');
  const lines = new Map(['raw/kTraditionalVariant.txt', 'raw/kSimplifiedVariant.txt'].map(file => [file, originals.get(file).toString('utf8').split(/\r?\n/)]));
  for (const row of capsule.cases) {
    const original = row.original, entry = raw[original.rawEntryIndex], heteronym = entry?.heteronyms?.[original.rawHeteronymIndex], definition = heteronym?.definitions?.[original.rawDefinitionIndex];
    need(original.rawSha256 === pins.originalPins['raw/moe-revised.json.gz'].sha256 && equal(entry, original.completeOriginalEntry) && entry?.title === original.word && original.parsedEntrySha256 === hash(JSON.stringify(entry)), `${row.char} complete MOE original entry differs`);
    need(heteronym?.pinyin === row.selectedPinyin && equal(definition, original.definition), `${row.char} exact MOE heteronym/definition differs`);
    validateGlyph(row, raw, originals, lines);
  }
  return freeze({...capsule, verification: {status: 'passed-source-data-only', caseCount: capsule.cases.length, originalFiles: ORIGINALS.map(file => ({file, ...pins.originalPins[file]})), candidateOnly: true, generationAuthority: false, sourceAuthority: false}});
}
