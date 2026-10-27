import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const FIXED_MANIFEST_SHA256 = '500230c50d313a80422034116b4db288b1505a8bdf6b483a2e65a5d84e15d864';
const FIXED_SOURCE_LOCK_SHA256 = '58e13c5f79d0bd3c66ba2a04e1e9584cc463d56532fa94b071006af23b4480d0';
const need = (ok, message) => { if (!ok) throw new Error(`M616 candidate: ${message}`); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const safeData = (base, file) => {
  need(typeof file === 'string' && !file.includes('\\') && !file.includes(':') && file.split('/').every(part => part && part !== '.' && part !== '..'), 'unsafe path');
  return path.resolve(base, file);
};
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

export function loadM616ReadingMeaningBatch(batchDir, sourceDir) {
  const manifestPath = path.join(batchDir, 'naming-character-meanings-m616-manifest.json');
  const lockPath = path.join(batchDir, 'naming-character-meanings-m616-source-lock.json');
  need(hash(fs.readFileSync(manifestPath)) === FIXED_MANIFEST_SHA256, 'fixed manifest bytes');
  need(hash(fs.readFileSync(lockPath)) === FIXED_SOURCE_LOCK_SHA256, 'fixed source-lock bytes');
  const manifest = readJson(manifestPath);
  const lock = readJson(lockPath);
  need(manifest.status === 'candidate-source-verified-not-admitted' && manifest.candidateOnly === true && manifest.activation === 'off' && manifest.productionApproved === false, 'batch must remain candidate-only');
  need(lock.schema === 'naming-character-meanings-single-nondefault-reading-source-lock/1' && lock.batchId === 'M616-D02', 'source lock identity');
  const lockCandidateFiles = Object.values(lock.candidateFiles).map(row => ({file: row.file, bytes: row.bytes, sha256: row.sha256})).sort((a, b) => a.file.localeCompare(b.file));
  const manifestCandidateFiles = manifest.files.filter(row => row.file !== 'naming-character-meanings-m616-source-lock.json').map(row => ({file: row.file, bytes: row.bytes, sha256: row.sha256})).sort((a, b) => a.file.localeCompare(b.file));
  need(JSON.stringify(lockCandidateFiles) === JSON.stringify(manifestCandidateFiles), 'manifest/source-lock candidate closure');
  need(manifest.files.some(row => row.file === 'naming-character-meanings-m616-source-lock.json' && row.sha256 === FIXED_SOURCE_LOCK_SHA256), 'manifest source-lock entry');
  for (const [file, pin] of Object.entries(lock.originalFiles)) {
    const bytes = fs.readFileSync(safeData(sourceDir, file));
    need(bytes.length === pin.bytes && hash(bytes) === pin.sha256, `source bytes ${file}`);
  }
  for (const row of manifest.files) {
    const bytes = fs.readFileSync(safeData(batchDir, row.file));
    need(bytes.length === row.bytes && hash(bytes) === row.sha256, `candidate bytes ${row.file}`);
  }
  const profile = readJson(path.join(batchDir, 'naming-character-meanings-m616-profile.json'));
  const subset = readJson(path.join(batchDir, 'raw/naming-character-meanings-m616-subset.json'));
  const admission = readJson(path.join(batchDir, 'naming-character-meanings-m616-admission.json'));
  need(profile.cases.length === 10 && JSON.stringify(profile.cases) === JSON.stringify(subset.cases), 'profile/subset mismatch');
  need(admission.decision === 'candidate-awaiting-independent-review' && admission.approvedCaseIds.length === 0, 'admission must remain pending');
  const raw = JSON.parse(gunzipSync(fs.readFileSync(safeData(sourceDir, 'raw/moe-revised.json.gz'))));
  const chars = new Set();
  for (const row of profile.cases) {
    need(!chars.has(row.char + '\u0000' + row.selectedReading.pinyin), `duplicate reading ${row.char}/${row.selectedReading.pinyin}`);
    chars.add(row.char + '\u0000' + row.selectedReading.pinyin);
    need(row.readingBindingKind === 'explicit-non-default' && (row.defaultReading.pinyin !== row.selectedReading.pinyin || row.defaultReading.tone !== row.selectedReading.tone), `default/non-default binding ${row.char}`);
    need(row.readingBinding && row.readingBinding.referenceOnly === false && row.readingBinding.sourceId === row.selectedReading.sourceId, `reading binding ${row.char}`);
    need(row.baselineCharacter && row.baselineCharacter.char === row.char && row.baselineCharacterSha256 === hash(JSON.stringify(row.baselineCharacter)), `baseline character ${row.char}`);
    const entry = raw[row.source.rawEntryIndex];
    const heteronym = entry?.heteronyms?.[row.source.rawHeteronymIndex];
    const definition = heteronym?.definitions?.[row.source.rawDefinitionIndex];
    need(entry && JSON.stringify(entry) === JSON.stringify(row.source.completeOriginalEntry), `complete source entry ${row.char}`);
    need(row.source.parsedEntrySha256 === hash(JSON.stringify(entry)), `source entry hash ${row.char}`);
    need(heteronym && heteronym.pinyin === row.selectedReading.pinyin && definition && JSON.stringify(definition) === JSON.stringify(row.source.definition), `source definition ${row.char}`);
    need(row.source.sourcePOS === definition.type, `source POS ${row.char}`);
    need(row.automaticSemanticCreditAllowed === false && row.wholeNameMeaning === null && row.scoreDelta === 0 && row.productionApproved === false, `authority boundary ${row.char}`);
  }
  return Object.freeze({ manifest, lock, profile, subset, admission });
}

export async function getM616ReadingMeaningOptions(batch, query) {
  if (!plain(query) || Object.keys(query).some(key => !['char', 'pinyin', 'tone'].includes(key)) || typeof query.char !== 'string' || [...query.char].length !== 1) {
    throw new Error('M616 query requires one exact character, with optional pinyin/tone binding.');
  }
  const rows = batch.profile.cases.filter(row => row.char === query.char && (query.pinyin === undefined || row.selectedReading.pinyin === query.pinyin) && (query.tone === undefined || row.selectedReading.tone === query.tone));
  if (!rows.length) return Object.freeze({ schema: 'm616-single-nondefault-reading-options/1', char: query.char, status: 'not-covered', activation: 'off', options: [] });
  if (query.pinyin === undefined && query.tone === undefined && rows.length > 1) return Object.freeze({ schema: 'm616-single-nondefault-reading-options/1', char: query.char, status: 'ambiguous-reading', activation: 'off', options: [] });
  return Object.freeze({ schema: 'm616-single-nondefault-reading-options/1', char: query.char, status: 'available', activation: 'off', options: rows.map(row => Object.freeze({
    pinyin: row.selectedReading.pinyin, tone: row.selectedReading.tone, word: row.selectedReading.word, meaning: row.project.meaning, limits: [...row.project.limits],
    defaultReading: { ...row.defaultReading, meanings: [...row.defaultReading.meanings] }, sourcePOS: row.source.sourcePOS,
    source: { sourceId: row.source.sourceId, word: row.source.word, pinyin: row.source.pinyin, definition: row.source.definition, originalFile: row.source.originalFile, rawEntryIndex: row.source.rawEntryIndex, rawHeteronymIndex: row.source.rawHeteronymIndex, rawDefinitionIndex: row.source.rawDefinitionIndex, parsedEntrySha256: row.source.parsedEntrySha256, license: row.source.license },
    automaticSemanticCreditAllowed: false, wholeNameMeaning: null, automaticNameRecommendation: false, scoreDelta: 0,
  })) });
}

export const getM616MeaningOptions = getM616ReadingMeaningOptions;
export const loadM616MeaningBatch = loadM616ReadingMeaningBatch;
