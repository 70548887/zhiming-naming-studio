import {types} from 'node:util';
import {analyzeProfile} from '../domain/engine';
import type {Analysis,BirthProfile} from '../shared/types';
import type {FreshQiongtongClauseReference} from '../shared/qiongtong-clause-reference';
import {evaluateQiongtongClauseReferences,type SafeChartInput140,type PillarPosition,type Stem,type Branch} from '../domain/traditional/qiongtong-clause-reference';

const POSITIONS: readonly PillarPosition[] = ['年柱', '月柱', '日柱', '时柱'];

const PROFILE_KEYS = ['id', 'customerName', 'surname', 'surnamePinyin', 'gender', 'calendar', 'birthDate', 'leapMonth', 'birthTime', 'timeUnknown', 'birthPlace', 'timezone', 'notes', 'fatherName', 'motherName', 'parentNameReadings', 'namingPreferences', 'monthAuthorityMethod', 'seasonalMethod', 'timeBasis', 'birthLongitude', 'renMethod'];

const OPTIONAL_PROFILE_KEYS = ['fatherName', 'motherName', 'parentNameReadings', 'namingPreferences', 'monthAuthorityMethod', 'seasonalMethod', 'timeBasis', 'birthLongitude', 'renMethod'];

function copyPlain(value: unknown, path = '出生资料', ancestors = new Set<object>(), depth = 0): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || depth > 24 || types.isProxy(value)) throw new Error(path + '拒绝代理或非JSON数据。');
  if (ancestors.has(value)) throw new Error(path + '拒绝循环引用。');
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  if (array ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) throw new Error(path + '原型无效。');
  ancestors.add(value);
  try {
    const keys = Reflect.ownKeys(value);
    const result: unknown[] | Record<string, unknown> = array ? [] : {};
    if (array) {
      const length = Object.getOwnPropertyDescriptor(value, 'length')!.value as number;
      if (length > 4096 || keys.length !== length + 1) throw new Error(path + '拒绝稀疏或附加数组字段。');
      for (let i = 0; i < length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(path + '拒绝访问器或隐藏字段。');
        (result as unknown[]).push(copyPlain(descriptor.value, path + '[' + i + ']', ancestors, depth + 1));
      }
    } else for (const key of keys) {
      if (typeof key !== 'string' || key === '__proto__') throw new Error(path + '拒绝符号或原型字段。');
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(path + '拒绝访问器或隐藏字段。');
      Object.defineProperty(result, key, { value: copyPlain(descriptor.value, path + '.' + key, ancestors, depth + 1), enumerable: true, writable: true, configurable: true });
    }
    return result;
  } finally { ancestors.delete(value); }
}

function profileCopy(raw: BirthProfile): BirthProfile {
  if (!raw || typeof raw !== 'object' || types.isProxy(raw) || ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) throw new Error('出生资料拒绝代理或非普通对象。');
  const topLevel: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== 'string' || !PROFILE_KEYS.includes(key)) throw new Error('出生资料含未允许字段。');
    const descriptor = Object.getOwnPropertyDescriptor(raw, key)!;
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error('出生资料拒绝访问器或隐藏字段。');
    if (descriptor.value === undefined && OPTIONAL_PROFILE_KEYS.includes(key)) continue;
    Object.defineProperty(topLevel, key, { value: descriptor.value, enumerable: true, writable: true, configurable: true });
  }
  const value = copyPlain(topLevel) as Record<string, unknown>;
  for (const key of ['id', 'customerName', 'surname', 'surnamePinyin', 'birthDate', 'birthTime', 'birthPlace', 'timezone', 'notes']) if (typeof value[key] !== 'string') throw new Error('出生资料缺少文本字段：' + key);
  if (typeof value.timeUnknown !== 'boolean' || typeof value.leapMonth !== 'boolean') throw new Error('出生资料时间标记无效。');
  if (!['solar', 'lunar'].includes(String(value.calendar)) || !['男', '女', '中性'].includes(String(value.gender))) throw new Error('出生资料历法或性别无效。');
  return value as unknown as BirthProfile;
}

function declarationFromEngine(profile: BirthProfile, analysis: Analysis): SafeChartInput140 {
  const rows = analysis.bazi.pillars;
  if (profile.timeUnknown && rows.some(row => row.label === '时柱')) throw new Error('未知时刻的排盘输出包含时柱。');
  const known = rows.map(row => row.label as PillarPosition);
  const unknownPositions = POSITIONS.filter(position => !known.includes(position));
  // The public evaluators validate duplicates, labels, stems, branches and coverage.
  return { pillars: rows.map(row => ({ position: row.label as PillarPosition, gan: row.gan as Stem, zhi: row.zhi as Branch })), unknownPositions };
}

/** Pure fresh analysis only; no Service, persistence, ranking or saved-record input. */
export function analyzeFreshQiongtongClauseReferences(profile:BirthProfile):FreshQiongtongClauseReference {
  const detached=profileCopy(profile),analysis=analyzeProfile(detached);
  return {analysis,reference:evaluateQiongtongClauseReferences(declarationFromEngine(detached,analysis))};
}
