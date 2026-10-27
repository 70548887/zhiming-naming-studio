import {types} from 'node:util';
import sourceCatalog from './qiongtong-jia-branches-v11.json';
import {evaluateMonthlySeasonalPredicate} from '../monthly-seasonal';
import type {MonthlySeasonalPredicate} from '../../shared/types';
import type {JiaLiteralReferenceV11,JiaLiteralState,JiaSourceSpan,JiaMonthCoverage} from './qiongtong-jia-v11-types';

export type PillarPosition = '年柱' | '月柱' | '日柱' | '时柱';

export type Stem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

export type Branch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

export interface SafeChartInput140 {
  readonly pillars: readonly { readonly position: PillarPosition; readonly gan: Stem; readonly zhi: Branch }[];
  readonly unknownPositions?: readonly PillarPosition[];
}

type PositionPillar = SafeChartInput140['pillars'][number];

interface DerivedFacts {
  readonly complete: boolean;
  readonly dayStem: Stem | null;
  readonly monthBranch: Branch | null;
  readonly unknownPositions: readonly PillarPosition[];
  readonly stems: readonly { readonly position: PillarPosition; readonly stem: Stem }[];
  readonly hiddenStems: readonly { readonly position: PillarPosition; readonly branch: Branch; readonly stem: Stem }[];
}

const POSITIONS: readonly PillarPosition[] = Object.freeze(['年柱', '月柱', '日柱', '时柱']);

const STEMS: readonly Stem[] = Object.freeze(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);

const BRANCHES: readonly Branch[] = Object.freeze(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);

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


interface FixedRule {
  id:string;dayStem:'甲';monthBranch:string;label:string;predicate:MonthlySeasonalPredicate;
  source:{quote:string;quoteSpan:JiaSourceSpan;contextSpan:JiaSourceSpan;contextSha256:string;locator:string;};
  unresolved:string[];
}
interface FixedCatalog {
  version:'qiongtong-jia-literal-conditions/1.1.0';
  source:{id:'bazi-monthly-qiongtong-2294674';revision:'wikisource-revision/2294674';rawSha256:string;chapterSpan:JiaSourceSpan;};
  executable:readonly FixedRule[];monthCoverage:readonly JiaMonthCoverage[];
}
// All metadata AND rules are read from this private frozen snapshot. The
// imported JSON module and returned DTO never remain a mutable authority.
const FIXED=freeze(structuredClone(sourceCatalog)) as unknown as FixedCatalog;
if(FIXED.version!=='qiongtong-jia-literal-conditions/1.1.0'||FIXED.executable.length!==4||new Set(FIXED.executable.map(rule=>rule.id)).size!==4)throw new Error('甲木条件1.1.0版本或四条首批规则不完整。');

/** Closed raw input. Reuses the reviewed 1.0.1 derivation nodes unchanged;
 * neither derived facts nor boolean/hidden-stem assertions are public inputs.
 */
export function evaluateQiongtongJiaConditionsV11(input:SafeChartInput140):JiaLiteralReferenceV11 {
  const facts=derive(input);
  const checks=FIXED.executable.map((rule):JiaLiteralReferenceV11['checks'][number]=>{
    const day=facts.dayStem===null?'unknown':facts.dayStem===rule.dayStem?'met':'not-met';
    const month=facts.monthBranch===null?'unknown':facts.monthBranch===rule.monthBranch?'met':'not-met';
    const excluded=day==='not-met'||month==='not-met',applies=day==='met'&&month==='met';
    const literal=applies?evaluateMonthlySeasonalPredicate(rule.predicate,{
      dayMaster:facts.dayStem!,complete:facts.complete,
      stems:facts.stems.map(row=>({pillar:row.position,stem:row.stem})),
      hiddenStems:facts.hiddenStems.map(row=>({pillar:row.position,branch:row.branch,stem:row.stem})),
    }):{result:excluded?'not-evaluated' as const:'unknown' as const,evidence:[],missing:excluded?[]:['已确定日干或月支不足；不任选未知柱。']};
    const status:JiaLiteralState=excluded?'not-applicable':!applies?'unknown':literal.result==='met'?'condition-met':literal.result==='not-met'?'condition-not-met':'unknown';
    return {
      id:rule.id,label:rule.label,status,applicability:{dayStem:day,monthBranch:month},literalFact:literal,
      source:{quote:rule.source.quote,locator:rule.source.locator,quoteSpan:structuredClone(rule.source.quoteSpan),contextSpan:structuredClone(rule.source.contextSpan),contextSha256:rule.source.contextSha256},
      decisionLevel:'selected-literal-subclause-only',wholeSourceBranchDecision:'not-evaluated',actionEvaluation:'not-evaluated',usefulGodDecision:'not-evaluated',
      unresolvedDependencies:[...rule.unresolved,'透藏的结构出现不证明旺衰、有效制化或全局用神。','原句后续结果不作为软件结论。'],
    };
  });
  return freeze({
    schema:FIXED.version,school:'qiongtong-wikisource-2294674',
    source:{id:FIXED.source.id,revision:FIXED.source.revision,rawSha256:FIXED.source.rawSha256,chapterSpan:structuredClone(FIXED.source.chapterSpan),scanCollation:false},
    input:{complete:facts.complete,dayStem:facts.dayStem,monthBranch:facts.monthBranch,unknownPositions:[...facts.unknownPositions]},checks,
    coverage:{firstBatchOnly:true,fullChapterDecisionImplemented:false,newlyExecutablePredicates:4,months:structuredClone(FIXED.monthCoverage)},namingImpact:'none',
  });
}
