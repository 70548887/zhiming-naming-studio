import {join, resolve, sep} from 'node:path';
import {types} from 'node:util';
import {loadM460V71Publication} from './m460-publication-data.mjs';
import {loadM610MeaningBatch} from '../../scripts/m610-meaning-query.mjs';
import {loadM616MeaningBatch} from '../../scripts/m616-meaning-query.mjs';
import {createManualM690MeaningQuery} from './m690-single-character-meaning-query.mjs';

const SCOPE = 'on-request-supplement-only';
const SCHEMA = 'single-character-meaning-options/1';
const ALLOWED_QUERY_KEYS = new Set(['char', 'pinyin', 'tone']);
const isScalar = value => typeof value === 'string' && [...value].length === 1 && !/[\uD800-\uDFFF]/u.test(value);

const fail = message => { throw new Error(`Single-character meaning query: ${message}`); };
const need = (condition, message) => { if (!condition) fail(message); };
const clone = value => structuredClone(value);
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};
const isPlainObject = value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function parseQuery(query) {
  if (types.isProxy(query)) fail('Proxy query is rejected before property traps.');
  need(isPlainObject(query), 'query must be a plain object');
  const keys = Reflect.ownKeys(query);
  need(keys.every(key => typeof key === 'string' && ALLOWED_QUERY_KEYS.has(key)), 'query contains extra fields');
  const charDescriptor = Object.getOwnPropertyDescriptor(query, 'char');
  need(!!charDescriptor && charDescriptor.enumerable && Object.hasOwn(charDescriptor, 'value'), 'query requires a data property named char');
  const char = charDescriptor.value;
  need(isScalar(char), 'char must contain exactly one Unicode scalar');

  const hasPinyin = Object.hasOwn(query, 'pinyin');
  let pinyin;
  if (hasPinyin) {
    const pinyinDescriptor = Object.getOwnPropertyDescriptor(query, 'pinyin');
    need(!!pinyinDescriptor && pinyinDescriptor.enumerable && Object.hasOwn(pinyinDescriptor, 'value'), 'pinyin must be a data property');
    pinyin = pinyinDescriptor.value;
    need(typeof pinyin === 'string' && pinyin.length > 0 && pinyin.trim().length > 0, 'pinyin cannot be empty');
  }
  let tone;
  if (Object.hasOwn(query, 'tone')) {
    const toneDescriptor = Object.getOwnPropertyDescriptor(query, 'tone');
    need(!!toneDescriptor && toneDescriptor.enumerable && Object.hasOwn(toneDescriptor, 'value'), 'tone must be a data property');
    tone = toneDescriptor.value;
    need(Number.isInteger(tone) && tone >= 1 && tone <= 5, 'tone must be an integer from 1 to 5');
  }
  return {char, pinyin, tone};
}

function assertConfig(config) {
  if (types.isProxy(config)) fail('Proxy config is rejected before property traps.');
  need(isPlainObject(config), 'adapter config must be a plain object');
  const descriptors = Object.getOwnPropertyDescriptors(config);
  const keys = Reflect.ownKeys(descriptors);
  need(keys.every(key => typeof key === 'string' && ['projectRoot', 'dataDir', 'manualM690BatchRoot'].includes(key)), 'config contains extra or symbol fields');
  for (const key of keys) {
    const descriptor = descriptors[key];
    need(descriptor.enumerable && Object.hasOwn(descriptor, 'value'), 'config fields must be enumerable own data properties');
  }
  const values = Object.create(null);
  for (const key of keys) values[key] = descriptors[key].value;
  need(Object.hasOwn(values, 'projectRoot'), 'projectRoot requires an own data property');
  need(typeof values.projectRoot === 'string' && values.projectRoot.trim().length > 0, 'projectRoot must be a literal string');
  if (Object.hasOwn(values, 'dataDir')) need(typeof values.dataDir === 'string' && values.dataDir.trim().length > 0, 'dataDir must be a literal string');
  if (Object.hasOwn(values, 'manualM690BatchRoot')) need(typeof values.manualM690BatchRoot === 'string' && values.manualM690BatchRoot.trim().length > 0, 'manualM690BatchRoot must be a literal directory');
  const projectRoot = resolve(values.projectRoot);
  const dataDir = Object.hasOwn(values, 'dataDir') ? resolve(values.dataDir) : join(projectRoot, 'data');
  const resolved = Object.assign(Object.create(null), {projectRoot, dataDir});
  if (Object.hasOwn(values, 'manualM690BatchRoot')) resolved.manualM690BatchRoot = resolve(values.manualM690BatchRoot);
  return Object.freeze(resolved);
}

function m460BatchMeta(publication) {
  return {
    batchId: 'M460-V71-B02',
    sourceId: publication.identity.sourceId,
    publicationState: 'fixed-approved-character-display-publication',
    admission: 'approved-character-notes',
    activation: publication.admission.activation,
    candidateOnly: false,
    productionApproved: false,
  };
}

function m610BatchMeta(batch) {
  return {
    batchId: batch.manifest.batchId,
    sourceId: batch.manifest.sourceId,
    publicationState: batch.manifest.status,
    admission: batch.admission.decision,
    activation: batch.manifest.activation,
    candidateOnly: batch.manifest.candidateOnly,
    productionApproved: false,
  };
}

function m616BatchMeta(batch) {
  return {
    batchId: batch.manifest.batchId,
    sourceId: batch.manifest.sourceId,
    publicationState: batch.manifest.status,
    admission: batch.admission.decision,
    activation: batch.manifest.activation,
    candidateOnly: batch.manifest.candidateOnly,
    productionApproved: false,
  };
}

function m460Option(row, batch) {
  const original = row.original;
  const baseline = row.baselineCharacter;
  const source = {
    sourceId: original.sourceId,
    word: original.word,
    pinyin: row.selectedPinyin,
    tone: row.tone,
    definition: clone(original.definition),
    sourcePOS: original.definition.type,
    readings: clone(Array.isArray(baseline.readings) ? baseline.readings : []),
    originalFile: original.rawFile,
    rawEntryIndex: original.rawEntryIndex,
    rawHeteronymIndex: original.rawHeteronymIndex,
    rawDefinitionIndex: original.rawDefinitionIndex,
    parsedEntrySha256: original.parsedEntrySha256,
    license: original.license,
    completeOriginalEntry: clone(original.completeOriginalEntry),
  };
  const project = {
    meaning: row.editorial.meaning,
    projectWish: row.editorial.projectWish ?? null,
    limits: [...row.editorial.limits],
    attribution: row.editorial.attribution,
    license: row.editorial.license,
  };
  return {
    char: row.char,
    pinyin: row.selectedPinyin,
    tone: row.tone,
    meaning: project.meaning,
    source,
    project,
    limits: [...project.limits],
    batch,
    scope: SCOPE,
    wholeNameMeaning: null,
    automaticNameRecommendation: false,
    automaticSemanticCreditAllowed: false,
    scoreDelta: 0,
  };
}

function m610Option(row, batch) {
  const original = row.source;
  const source = {
    sourceId: original.sourceId,
    word: original.word,
    pinyin: row.pinyin,
    tone: row.tone,
    definition: clone(original.definition),
    sourcePOS: original.sourcePOS,
    readings: clone(Array.isArray(row.baselineCharacter?.readings) && row.baselineCharacter.readings.length > 0
      ? row.baselineCharacter.readings
      : [row.defaultReading]),
    originalFile: original.originalFile,
    rawEntryIndex: original.rawEntryIndex,
    rawHeteronymIndex: original.rawHeteronymIndex,
    rawDefinitionIndex: original.rawDefinitionIndex,
    parsedEntrySha256: original.parsedEntrySha256,
    license: original.license,
    completeOriginalEntry: clone(original.completeOriginalEntry),
  };
  const project = {
    meaning: row.project.meaning,
    projectWish: row.project.projectWish ?? null,
    limits: [...row.project.limits],
    attribution: row.project.attribution,
    license: row.project.license,
  };
  return {
    char: row.char,
    pinyin: row.pinyin,
    tone: row.tone,
    meaning: project.meaning,
    source,
    project,
    limits: [...project.limits],
    batch,
    scope: SCOPE,
    wholeNameMeaning: null,
    automaticNameRecommendation: false,
    automaticSemanticCreditAllowed: false,
    scoreDelta: 0,
  };
}

function m616Option(row, batch) {
  const original = row.source;
  const baseline = row.baselineCharacter;
  const source = {
    sourceId: original.sourceId,
    word: original.word,
    pinyin: row.selectedReading.pinyin,
    tone: row.selectedReading.tone,
    definition: clone(original.definition),
    sourcePOS: original.sourcePOS,
    readings: clone(Array.isArray(baseline?.readings) ? baseline.readings : []),
    originalFile: original.originalFile,
    rawEntryIndex: original.rawEntryIndex,
    rawHeteronymIndex: original.rawHeteronymIndex,
    rawDefinitionIndex: original.rawDefinitionIndex,
    parsedEntrySha256: original.parsedEntrySha256,
    license: original.license,
    completeOriginalEntry: clone(original.completeOriginalEntry),
  };
  const project = {
    meaning: row.project.meaning,
    projectWish: row.project.projectWish ?? null,
    limits: [...row.project.limits],
    attribution: row.project.attribution,
    license: row.project.license,
  };
  return {
    char: row.char,
    pinyin: row.selectedReading.pinyin,
    tone: row.selectedReading.tone,
    defaultReading: clone(row.defaultReading),
    meaning: project.meaning,
    source,
    project,
    limits: [...project.limits],
    batch,
    scope: SCOPE,
    wholeNameMeaning: null,
    automaticNameRecommendation: false,
    automaticSemanticCreditAllowed: false,
    scoreDelta: 0,
  };
}

function assertDisjoint(approved, candidate) {
  const chars = new Set(approved.profile.cases.map(row => row.char));
  for (const row of candidate.profile.cases) need(!chars.has(row.char), `approved/candidate overlap at ${row.char}`);
}

function assertPairwiseDisjoint(...batches) {
  for (let i = 0; i < batches.length; i += 1) {
    for (let j = i + 1; j < batches.length; j += 1) assertDisjoint(batches[i], batches[j]);
  }
}

function ambiguousReading(char, pinyin, tone) {
  return deepFreeze({
    schema: SCHEMA,
    char,
    pinyin: pinyin ?? null,
    status: 'ambiguous-reading',
    scope: SCOPE,
    options: [],
    source: null,
    limits: [],
    wholeNameMeaning: null,
    automaticNameRecommendation: false,
    automaticSemanticCreditAllowed: false,
    scoreDelta: 0,
  });
}

function notCovered(char, pinyin) {
  return deepFreeze({
    schema: SCHEMA,
    char,
    pinyin: pinyin ?? null,
    status: 'not-covered',
    scope: SCOPE,
    options: [],
    source: null,
    limits: [],
    wholeNameMeaning: null,
    automaticNameRecommendation: false,
    automaticSemanticCreditAllowed: false,
    scoreDelta: 0,
  });
}

function resolveQuery(query, config, manualM690) {
  const input = parseQuery(query);
  // Both source packages are reauthenticated for every request. A broken required
  // source therefore throws instead of falling back to an older default meaning.
  const approved = loadM460V71Publication(config.dataDir);
  need(approved, 'approved M460 publication is missing');
  const candidate = loadM610MeaningBatch(config.dataDir, config.dataDir);
  const m616 = loadM616MeaningBatch(config.dataDir, config.dataDir);
  assertPairwiseDisjoint(approved, candidate, m616);

  const approvedRow = approved.profile.cases.find(row => row.char === input.char);
  const candidateRow = candidate.profile.cases.find(row => row.char === input.char);
  const m616Row = m616.profile.cases.find(row => row.char === input.char);
  if (m616Row) {
    if (input.pinyin === undefined || input.tone === undefined) return ambiguousReading(input.char, input.pinyin, input.tone);
    if (input.pinyin !== m616Row.selectedReading.pinyin || input.tone !== m616Row.selectedReading.tone) return notCovered(input.char, input.pinyin);
    const batch = m616BatchMeta(m616);
    const option = m616Option(m616Row, batch);
    return deepFreeze({
      schema: SCHEMA,
      char: input.char,
      pinyin: option.pinyin,
      status: 'available',
      scope: SCOPE,
      options: [option],
      source: batch,
      limits: [...option.limits],
      wholeNameMeaning: null,
      automaticNameRecommendation: false,
      automaticSemanticCreditAllowed: false,
      scoreDelta: 0,
    });
  }
  const row = approvedRow ?? candidateRow;
  if (!row) return manualM690 ? manualM690.getSingleCharacterMeaningOptions({char:input.char,...(input.pinyin!==undefined?{pinyin:input.pinyin}:{}),...(input.tone!==undefined?{tone:input.tone}:{})}) : notCovered(input.char, input.pinyin);
  const selectedPinyin = approvedRow ? row.selectedPinyin : row.pinyin;
  const selectedTone = row.tone;
  if (input.pinyin !== undefined && input.pinyin !== selectedPinyin) return notCovered(input.char, input.pinyin);
  if (input.tone !== undefined && input.tone !== selectedTone) return notCovered(input.char, input.pinyin);

  const batch = approvedRow ? m460BatchMeta(approved) : m610BatchMeta(candidate);
  const option = approvedRow ? m460Option(row, batch) : m610Option(row, batch);
  return deepFreeze({
    schema: SCHEMA,
    char: input.char,
    pinyin: selectedPinyin,
    status: 'available',
    scope: SCOPE,
    options: [option],
    source: batch,
    limits: [...option.limits],
    wholeNameMeaning: null,
    automaticNameRecommendation: false,
    automaticSemanticCreditAllowed: false,
    scoreDelta: 0,
  });
}

export function createSingleCharacterMeaningAdapter(config) {
  const resolved = assertConfig(config);
  const manualM690 = Object.hasOwn(resolved, 'manualM690BatchRoot') ? createManualM690MeaningQuery({batchRoot:resolved.manualM690BatchRoot,sourceDataDir:resolved.dataDir}) : undefined;
  const adapter = {
    getSingleCharacterMeaningOptions(query) {
      return resolveQuery(query, resolved, manualM690);
    },
  };
  return Object.freeze(adapter);
}

export const createSingleCharacterMeaningService = createSingleCharacterMeaningAdapter;
