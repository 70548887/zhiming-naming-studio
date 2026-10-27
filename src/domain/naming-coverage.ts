import type {CoverageAvailableDto, CoverageDto, CoverageFailure, CoverageLoaderSets,
  CoverageRelationDto, CoverageSetDto, CoverageSourceIdentity, CoverageWordCase, CoverageWordDto, CoverageWordsInput} from '../shared/naming-coverage';

const sourceIds: Readonly<Record<keyof CoverageLoaderSets, string>> = Object.freeze({
  dataset: 'naming-editorial-dictionary-v6-fixed',
  baseMeanings: 'naming-editorial-dictionary-v6-fixed',
  supplementalAutomatic: 'naming-editorial-meanings-v7-fixed',
  standaloneOnRequest: 'naming-character-meanings-v7.1-fixed',
  conditionalWords: 'project-meaning-context-next-138-v1-1',
  b04ReadOnlyOff: 'project-meaning-context-m460-b04-candidate',
  originalElements: 'naming-editorial-dictionary-v6-fixed',
  imageryCandidates: 'project-dictionary-object-elements-v1-fixed'
});
const groupNames = Object.keys(sourceIds) as (keyof CoverageLoaderSets)[];
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) && value !== '0'.repeat(64);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const scalar = (value: unknown): value is string => text(value) && [...value].length === 1 && !/^[\uD800-\uDFFF]$/u.test(value);
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

class InvalidCoverage extends Error {
  constructor(readonly reason: CoverageFailure) { super(reason); }
}
function requireFact(value: unknown, reason: CoverageFailure = 'invalid-data'): asserts value {
  if (!value) throw new InvalidCoverage(reason);
}
function plainJson(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  requireFact(typeof value === 'object' && value !== null && !seen.has(value));
  requireFact(Array.isArray(value) ? Object.getPrototypeOf(value) === Array.prototype : [Object.prototype, null].includes(Object.getPrototypeOf(value)));
  seen.add(value);
  const keys = Reflect.ownKeys(value);
  if (Array.isArray(value)) {
    requireFact(keys.length === value.length + 1);
    for (let index = 0; index < value.length; index++) {
      const field = Object.getOwnPropertyDescriptor(value, String(index));
      requireFact(field && Object.hasOwn(field, 'value') && field.enumerable);
      plainJson(field.value, seen);
    }
    seen.delete(value);
    return;
  }
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue;
    requireFact(typeof key === 'string');
    const field = Object.getOwnPropertyDescriptor(value, key);
    requireFact(field && Object.hasOwn(field, 'value') && field.enumerable);
    plainJson(field.value, seen);
  }
  seen.delete(value);
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function setOf(values: readonly string[]): CoverageSetDto {
  requireFact(Array.isArray(values) && values.every(scalar));
  const characters = [...new Set(values)].sort(compare);
  return {count: characters.length, characters};
}
function relation(left: CoverageSetDto, right: CoverageSetDto): CoverageRelationDto {
  const a = new Set(left.characters), b = new Set(right.characters);
  return {intersection: setOf(left.characters.filter(char => b.has(char))), union: setOf([...left.characters, ...right.characters]),
    leftOnly: setOf(left.characters.filter(char => !b.has(char))), rightOnly: setOf(right.characters.filter(char => !a.has(char)))};
}
function subset(value: CoverageSetDto, universe: CoverageSetDto): void {
  const allowed = new Set(universe.characters);
  requireFact(value.characters.every(char => allowed.has(char)));
}
function partition(left: CoverageSetDto, right: CoverageSetDto, universe: CoverageSetDto): void {
  subset(left, universe); subset(right, universe);
  const joined = relation(left, right);
  requireFact(joined.intersection.count === 0 && joined.union.count === universe.count);
}
function words(value: CoverageWordsInput, universe: CoverageSetDto): CoverageWordDto {
  requireFact(value && value.wholeWordOnly === true && value.confirmedReadingsRequired === true && value.explicitChoiceRequired === true
    && value.automaticSemanticCreditAllowed === false && value.standalonePromotion === false && Array.isArray(value.cases));
  const cases = new Map<string, CoverageWordCase>();
  for (const row of value.cases) {
    requireFact(row && text(row.caseId) && scalar(row.targetCharacter) && text(row.givenName) && [...row.givenName].length > 1 && [...row.givenName].includes(row.targetCharacter));
    const previous = cases.get(row.caseId);
    requireFact(!previous || previous.targetCharacter === row.targetCharacter && previous.givenName === row.givenName);
    cases.set(row.caseId, row);
  }
  const targetCharacters = setOf([...cases.values()].map(row => row.targetCharacter));
  subset(targetCharacters, universe);
  return {caseCount: cases.size, targetCharacters, givenNames: [...new Set([...cases.values()].map(row => row.givenName))].sort(compare),
    requiresWholeWord: true, requiresConfirmedReadings: true, requiresExplicitChoice: true, includedInAutomatic: false, includedInStandalone: false};
}
function unavailable(reason: CoverageFailure): CoverageDto {
  return freeze({schema: 'naming-coverage/1', status: 'unavailable', reason,
    message: '覆盖资料暂不可用，请在资料核验完成后查看；当前不显示完整覆盖数量。'});
}

/** Pure read-only aggregation of existing loaders' outputs. It never authenticates a
 * publication, relaxes its lookup, activates a candidate, or grants naming authority. */
export function createNamingCoverageDto(input: Readonly<CoverageLoaderSets>): CoverageDto {
  try {
    plainJson(input);
    requireFact(input && groupNames.every(key => Object.hasOwn(input, key)), 'missing-source');
    const sources: CoverageSourceIdentity[] = [];
    let packSha256: string | undefined;
    for (const key of groupNames) {
      const group = input[key];
      requireFact(group, 'missing-source');
      if (group.status === 'unavailable') throw new InvalidCoverage(group.reason === 'missing-source' ? 'missing-source' : group.reason === 'unknown-source' ? 'unknown-source' : 'invalid-data');
      requireFact(group.status === 'available' && Object.hasOwn(group, 'value'), 'missing-source');
      requireFact(group.source && group.source.sourceId === sourceIds[key], 'unknown-source');
      requireFact(group.source.readingScope === 'dataset-default', 'reading-scope-mismatch');
      requireFact(hash(group.source.sha256) && hash(group.source.packSha256), 'source-mismatch');
      if (packSha256 === undefined) packSha256 = group.source.packSha256;
      requireFact(group.source.packSha256 === packSha256, 'source-mismatch');
      sources.push({sourceId: group.source.sourceId, sha256: group.source.sha256,
        packSha256: group.source.packSha256, readingScope: group.source.readingScope});
    }
    // Discriminants were checked for every required group; never substitute missing sets with [].
    const get = <K extends keyof CoverageLoaderSets>(key: K): Extract<CoverageLoaderSets[K], {status: 'available'}>['value'] => {
      const group = input[key];
      requireFact(group.status === 'available', 'missing-source');
      return group.value as Extract<CoverageLoaderSets[K], {status: 'available'}>['value'];
    };
    const dataset = get('dataset');
    requireFact(hash(dataset.datasetSha256), 'source-mismatch');
    const characters = setOf(dataset.characters);
    requireFact(characters.count > 0);
    const base = setOf(get('baseMeanings')), supplementalAutomatic = setOf(get('supplementalAutomatic'));
    subset(base, characters); subset(supplementalAutomatic, characters);
    const baseVsSupplemental = relation(base, supplementalAutomatic);
    const standalone = get('standaloneOnRequest');
    requireFact(standalone.publication === 'm460-b02' && standalone.wholeNameAssessment === 'not-assessed'
      && standalone.automaticNameRecommendation === false && standalone.automaticSemanticCreditAllowed === false && standalone.scoreDelta === 0);
    const standaloneOnRequest = setOf(standalone.characters);
    subset(standaloneOnRequest, characters);
    const automaticVsStandalone = relation(baseVsSupplemental.union, standaloneOnRequest);
    const conditionalWords = words(get('conditionalWords'), characters);
    const b04 = get('b04ReadOnlyOff');
    requireFact(b04.activation === 'off' && b04.candidateOnly === true && b04.productionApproved === false && b04.formalCoverageAdded === 0);
    const b04ReadOnlyOff = {...words(b04, characters), activation: 'off' as const, productionApproved: false as const, formalCoverageAdded: 0 as const};
    const original = get('originalElements');
    const originalLabels = setOf(original.labeledCharacters), originalUnknown = setOf(original.unknownCharacters);
    partition(originalLabels, originalUnknown, characters);
    const imagery = get('imageryCandidates');
    requireFact(imagery.activation === 'off' && Array.isArray(imagery.defaultEffectiveElements) && imagery.defaultEffectiveElements.length === 0 && imagery.traditionalAssessment === 'pending');
    const imageryCandidates = setOf(imagery.candidateCharacters), imageryUnresolved = setOf(imagery.unresolvedCharacters);
    partition(imageryCandidates, imageryUnresolved, originalUnknown);
    const result: CoverageAvailableDto = {
      schema: 'naming-coverage/1', status: 'available', readingScope: 'dataset-default', datasetSha256: dataset.datasetSha256, packSha256: packSha256!, characters,
      meanings: {base, supplementalAutomatic, baseVsSupplemental, defaultAutomatic: baseVsSupplemental.union,
        standaloneOnRequest, automaticVsStandalone, displayMaterialUnion: automaticVsStandalone.union,
        withoutAutomaticOrStandalone: relation(characters, automaticVsStandalone.union).leftOnly, conditionalWords, b04ReadOnlyOff},
      elements: {originalLabels, originalUnknown, imageryCandidates, imageryUnresolved, imageryActivation: 'off', newDefaultEffectiveElements: [], imageryEstablishesTraditionalElements: false},
      sources,
      explanations: [
        {id: 'total', title: '字库范围', text: `当前资料包含 ${characters.count} 个去重汉字，以下统计按字库默认读音计算。`},
        {id: 'automatic', title: '默认可展示的项目字义', text: `基础项目字义 ${base.count} 字，自动补充 ${supplementalAutomatic.count} 字，两者重叠 ${baseVsSupplemental.intersection.count} 字，合计 ${baseVsSupplemental.union.count} 字。补充展示不增加推荐或评分许可。`},
        {id: 'standalone', title: '按需逐字说明', text: `另有 ${standaloneOnRequest.count} 字可按请求展示独立逐字说明；与默认可展示字义重叠 ${automaticVsStandalone.intersection.count} 字。两类展示材料合计 ${automaticVsStandalone.union.count} 字，默认自动展示仍为 ${baseVsSupplemental.union.count} 字，不能理解为整个姓名已经获认可。`},
        {id: 'conditional-words', title: '需要确认的完整词语', text: `${conditionalWords.caseCount} 条完整词语参考须确认完整给名、读音、义项和场景；不叠加为自动字义或独立单字覆盖。`},
        {id: 'b04-off', title: '新增词语候选 · 默认关闭', text: `${b04ReadOnlyOff.caseCount} 条新增词语候选仅供只读查看，默认关闭，未增加正式覆盖或自动字义。`},
        {id: 'elements', title: '原有五行标签', text: `${originalLabels.count} 字保留原有项目标签，${originalUnknown.count} 字原无标签；原有标签也不表示传统姓名学的唯一归属。`},
        {id: 'imagery', title: '意象候选 · 默认未激活', text: `原无标签字中，${imageryCandidates.count} 字有需确认原义和条件的意象候选，${imageryUnresolved.count} 字尚未闭合；候选默认未激活，不等于传统五行已经确定。`}
      ]
    };
    return freeze(result);
  } catch (error) {
    return unavailable(error instanceof InvalidCoverage ? error.reason : 'invalid-data');
  }
}
