import { types } from 'node:util';

export type PillarPosition = '年柱' | '月柱' | '日柱' | '时柱';
export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
/** Existing SafeChartInput140 shape; completeness and hidden stems are never input fields. */
export interface SafeChartInput140 {
  readonly pillars: readonly { readonly position: PillarPosition; readonly gan: Stem; readonly zhi: Branch }[];
  readonly unknownPositions?: readonly PillarPosition[];
}
export type Applicability = 'matched' | 'not-applicable' | 'insufficient-data';
type PositionPillar = SafeChartInput140['pillars'][number];
interface DerivedFacts {
  readonly complete: boolean;
  readonly dayStem: Stem | null;
  readonly monthBranch: Branch | null;
  readonly unknownPositions: readonly PillarPosition[];
  readonly stems: readonly { readonly position: PillarPosition; readonly stem: Stem }[];
  readonly hiddenStems: readonly { readonly position: PillarPosition; readonly branch: Branch; readonly stem: Stem }[];
}
export interface StemObservation {
  readonly stem: Stem;
  readonly result: 'met' | 'not-seen' | 'unknown';
  readonly exposedPositions: readonly PillarPosition[];
  readonly hiddenPositions: readonly string[];
}
export interface SourceLink {
  readonly sourceId: 'bazi-monthly-qiongtong-2294674';
  readonly revision: 'wikisource-revision/2294674';
  readonly locator: string;
  readonly quote: string;
  readonly quoteSpan: { readonly start: 24089; readonly end: 24113; readonly unit: 'unicode-codepoint'; readonly interval: '[start,end)' };
  readonly entryContextSpan: { readonly start: 24089; readonly end: 24118; readonly unit: 'unicode-codepoint'; readonly interval: '[start,end)' };
}
export interface SeasonalFactsR3 {
  readonly version: 'geng-si-seasonal-facts/1.0.2';
  readonly status: 'pending' | 'not-applicable' | 'insufficient-data';
  readonly applicability: Applicability;
  readonly complete: boolean;
  readonly unknownPositions: readonly PillarPosition[];
  readonly observations: readonly StemObservation[];
  readonly orderPolicy: 'unranked';
  readonly candidateUses: readonly [];
  readonly source: SourceLink;
}
export interface ParagraphReferenceR3 {
  readonly version: 'geng-si-qiongtong-reference/1.0.2';
  readonly ruleId: 'geng-si-seasonal-reference-r3';
  /** matched means 条文适用, never a completed useful-god verdict. */
  readonly status: Applicability;
  readonly statusLabel: '条文适用' | '本条不适用' | '资料不足';
  readonly complete: boolean;
  readonly unknownPositions: readonly PillarPosition[];
  readonly conditions: readonly { readonly id: string; readonly status: 'met' | 'not-met' | 'unknown' | 'not-applicable'; readonly sourceQuote: string }[];
  readonly sourceAssertions: readonly { readonly id: string; readonly status: 'recorded-text'; readonly sourceQuote: string }[];
  readonly referenceSet: { readonly stems: readonly ['壬', '丙', '戊']; readonly elements: readonly ['水', '火', '土']; readonly orderPolicy: 'unranked'; readonly selectionStatus: 'unknown'; readonly observations: readonly StemObservation[] } | null;
  readonly source: SourceLink;
  readonly exclusions: 'none-specified-in-selected-clause';
  readonly followup: { readonly quote: '妻子仝前。'; readonly status: 'uninterpreted'; readonly affectsRule: false };
  readonly limitations: readonly string[];
}

const POSITIONS: readonly PillarPosition[] = Object.freeze(['年柱', '月柱', '日柱', '时柱']);
const STEMS: readonly Stem[] = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
const BRANCHES: readonly Branch[] = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
// Private and frozen at both levels. No table, row or query exposing it is exported.
const HIDDEN: Readonly<Record<Branch, readonly Stem[]>> = Object.freeze({
  子: Object.freeze<Stem[]>(['癸']), 丑: Object.freeze<Stem[]>(['己', '癸', '辛']),
  寅: Object.freeze<Stem[]>(['甲', '丙', '戊']), 卯: Object.freeze<Stem[]>(['乙']),
  辰: Object.freeze<Stem[]>(['戊', '乙', '癸']), 巳: Object.freeze<Stem[]>(['丙', '庚', '戊']),
  午: Object.freeze<Stem[]>(['丁', '己']), 未: Object.freeze<Stem[]>(['己', '丁', '乙']),
  申: Object.freeze<Stem[]>(['庚', '壬', '戊']), 酉: Object.freeze<Stem[]>(['辛']),
  戌: Object.freeze<Stem[]>(['戊', '辛', '丁']), 亥: Object.freeze<Stem[]>(['壬', '甲']),
});

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function plainObject(value: unknown, allowed: readonly string[], required: readonly string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || types.isProxy(value)) throw new Error(path + '拒绝代理或非普通对象。');
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(path + '必须为普通对象。');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new Error(path + '含未允许字段。');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(path + '拒绝访问器或隐藏字段。');
    result[key] = descriptor.value;
  }
  if (required.some(key => !Object.hasOwn(result, key))) throw new Error(path + '缺少必需字段。');
  return result;
}

function denseArray(value: unknown, path: string): unknown[] {
  if (!value || typeof value !== 'object' || types.isProxy(value) || !Array.isArray(value)) throw new Error(path + '拒绝代理或非数组。');
  if (Object.getPrototypeOf(value) !== Array.prototype) throw new Error(path + '数组原型无效。');
  const length = Object.getOwnPropertyDescriptor(value, 'length')?.value as number;
  if (!Number.isInteger(length) || length > 4 || Reflect.ownKeys(value).length !== length + 1) throw new Error(path + '数组长度、空位或附加字段无效。');
  const result: unknown[] = [];
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(path + '拒绝空位或访问器。');
    result.push(descriptor.value);
  }
  return result;
}

// The only facts constructor is private. Every public evaluation calls it itself.
function derive(input: SafeChartInput140): DerivedFacts {
  const declaration = plainObject(input, ['pillars', 'unknownPositions'], ['pillars'], '四柱声明');
  const unknown = declaration.unknownPositions === undefined ? [] : denseArray(declaration.unknownPositions, '未知柱位');
  if (unknown.some(p => !POSITIONS.includes(p as PillarPosition)) || new Set(unknown).size !== unknown.length) throw new Error('未知柱位无效或重复。');
  const seen = new Set<PillarPosition>();
  const pillars: PositionPillar[] = denseArray(declaration.pillars, '四柱').map((raw, index) => {
    const row = plainObject(raw, ['position', 'gan', 'zhi'], ['position', 'gan', 'zhi'], '四柱[' + index + ']');
    const position = row.position as PillarPosition, gan = row.gan as Stem, zhi = row.zhi as Branch;
    if (!POSITIONS.includes(position) || seen.has(position)) throw new Error('四柱位置无效或重复。');
    if (unknown.includes(position)) throw new Error('同一柱位同时声明已知和未知。');
    if (!STEMS.includes(gan) || !BRANCHES.includes(zhi)) throw new Error('四柱干支无效。');
    seen.add(position);
    return { position, gan, zhi };
  });
  if (POSITIONS.some(p => !seen.has(p) && !unknown.includes(p))) throw new Error('缺失柱位必须明确声明未知。');
  return freeze({
    complete: unknown.length === 0,
    dayStem: pillars.find(p => p.position === '日柱')?.gan ?? null,
    monthBranch: pillars.find(p => p.position === '月柱')?.zhi ?? null,
    unknownPositions: [...unknown] as PillarPosition[],
    stems: pillars.map(p => ({ position: p.position, stem: p.gan })),
    hiddenStems: pillars.flatMap(p => HIDDEN[p.zhi].map(stem => ({ position: p.position, branch: p.zhi, stem }))),
  });
}

function applicability(facts: DerivedFacts): Applicability {
  // A known exclusion is decisive even when the other applicability fact is unknown.
  if (facts.dayStem !== null && facts.dayStem !== '庚' || facts.monthBranch !== null && facts.monthBranch !== '巳') return 'not-applicable';
  return facts.dayStem === null || facts.monthBranch === null ? 'insufficient-data' : 'matched';
}

function observe(facts: DerivedFacts): StemObservation[] {
  return (['壬', '丙', '戊'] as const).map(stem => {
    const exposedPositions = facts.stems.filter(p => p.stem === stem).map(p => p.position);
    const hiddenPositions = facts.hiddenStems.filter(p => p.stem === stem).map(p => p.position + '·' + p.branch);
    return { stem, result: exposedPositions.length || hiddenPositions.length ? 'met' : facts.complete ? 'not-seen' : 'unknown', exposedPositions, hiddenPositions };
  });
}

function link(): SourceLink {
  return { sourceId: 'bazi-monthly-qiongtong-2294674', revision: 'wikisource-revision/2294674', locator: 'oldid=2294674;论庚;codepoint[24089,24113)',
    quote: '四月庚金，须用壬丙戊，但非拘执先后，宜分病用药。',
    quoteSpan: { start: 24089, end: 24113, unit: 'unicode-codepoint', interval: '[start,end)' },
    entryContextSpan: { start: 24089, end: 24118, unit: 'unicode-codepoint', interval: '[start,end)' } };
}

/** Public raw-chart entry; no function accepting DerivedFacts is exported. */
export function evaluateGengSiSeasonalFactsR3(input: SafeChartInput140): SeasonalFactsR3 {
  const facts = derive(input), state = applicability(facts);
  return freeze({ version: 'geng-si-seasonal-facts/1.0.2', status: state === 'matched' ? 'pending' : state, applicability: state,
    complete: facts.complete, unknownPositions: [...facts.unknownPositions], observations: state === 'matched' ? observe(facts) : [],
    orderPolicy: 'unranked', candidateUses: [], source: link() });
}

/** matched is only 条文适用. No ranking, weight or selection certificate is produced. */
export function evaluateGengSiCompleteRuleR3(input: SafeChartInput140): ParagraphReferenceR3 {
  const facts = derive(input), state = applicability(facts);
  return freeze({ version: 'geng-si-qiongtong-reference/1.0.2', ruleId: 'geng-si-seasonal-reference-r3', status: state,
    statusLabel: state === 'matched' ? '条文适用' : state === 'not-applicable' ? '本条不适用' : '资料不足',
    complete: facts.complete, unknownPositions: [...facts.unknownPositions],
    conditions: [
      { id: 'day-stem', status: facts.dayStem === null ? 'unknown' : facts.dayStem === '庚' ? 'met' : 'not-met', sourceQuote: '四月庚金' },
      { id: 'month-branch', status: facts.monthBranch === null ? 'unknown' : facts.monthBranch === '巳' ? 'met' : 'not-met', sourceQuote: '四月庚金' },
      { id: 'disease-specific-selection', status: state === 'not-applicable' ? 'not-applicable' : 'unknown', sourceQuote: '宜分病用药' },
    ],
    sourceAssertions: [
      { id: 'named-reference-set', status: 'recorded-text', sourceQuote: '须用壬丙戊' },
      { id: 'unranked-order', status: 'recorded-text', sourceQuote: '但非拘执先后' },
    ],
    referenceSet: state === 'matched' ? { stems: ['壬', '丙', '戊'], elements: ['水', '火', '土'], orderPolicy: 'unranked', selectionStatus: 'unknown', observations: observe(facts) } : null,
    source: link(), exclusions: 'none-specified-in-selected-clause', followup: { quote: '妻子仝前。', status: 'uninterpreted', affectsRule: false },
    limitations: ['matched仅表示庚日巳月条文适用，不是完整全局喜用结论。', '壬丙戊为无排序条文参考集合；分病用药仍未裁定。', '固定藏干表只证明结构出现，不证明有效根气、制化或取用。', '未知柱位保留unknown，不从未见推断不存在。', '不引入邻月排除，不实施妻子仝前所引的关系或命运断语。', '固定电子转录未作影印底本独立校勘。'] });
}
