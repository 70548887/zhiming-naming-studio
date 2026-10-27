import { types } from 'node:util';
import type { BirthProfile } from '../shared/types';
import { GENG_SI_PREVIEW_SCHEMA, type GengSiReferencePreview } from '../shared/geng-si-reference';
import { loadMonthlySeasonalData, MONTHLY_SEASONAL_SOURCE_ID } from './monthly-seasonal-data';
import { loadBaziSources } from './bazi-data';
import { analyzeFreshWithGengSiReference } from './geng-si-reference-explanation';

const FIELDS = ['id','customerName','surname','surnamePinyin','gender','calendar','birthDate','leapMonth','birthTime','timeUnknown','birthPlace','timezone','notes','fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];
const OPTIONAL = ['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];

/** Descriptor-safe request check runs before Service.validateProfile can read request properties. */
export function readGengSiReferenceProfile(input: unknown): BirthProfile {
  function copy(value: unknown, depth: number, ancestors: Set<object>): unknown {
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value || typeof value !== 'object' || types.isProxy(value) || depth > 24 || ancestors.has(value)) throw new Error('条文预览拒绝代理、循环或非数据输入。');
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
    if (depth === 0 && array || (array ? prototype !== Array.prototype : ![Object.prototype,null].includes(prototype))) throw new Error('条文预览输入须为普通资料。');
    ancestors.add(value);
    try {
      const keys = Reflect.ownKeys(value), output: Record<string,unknown> | unknown[] = array ? [] : {};
      if (array) {
        const length = Object.getOwnPropertyDescriptor(value,'length')!.value as number;
        if (length > 4096 || keys.length !== length + 1) throw new Error('条文预览数组不完整。');
        for (let index=0;index<length;index++) {
          const item=Object.getOwnPropertyDescriptor(value,String(index));
          if (!item || !Object.hasOwn(item,'value') || !item.enumerable) throw new Error('条文预览拒绝访问器、隐藏项或空位。');
          (output as unknown[]).push(copy(item.value,depth+1,ancestors));
        }
      } else for (const key of keys) {
        if (typeof key !== 'string' || key === '__proto__' || depth === 0 && !FIELDS.includes(key)) throw new Error('条文预览包含未允许字段。');
        const field=Object.getOwnPropertyDescriptor(value,key)!;
        if (!Object.hasOwn(field,'value') || !field.enumerable) throw new Error('条文预览拒绝访问器或隐藏字段。');
        if (depth===0 && field.value===undefined && OPTIONAL.includes(key)) continue;
        Object.defineProperty(output,key,{value:copy(field.value,depth+1,ancestors),enumerable:true,writable:true,configurable:true});
      }
      return output;
    } finally { ancestors.delete(value); }
  }
  return copy(input,0,new Set()) as BirthProfile;
}

/** Re-verify the existing complete source packages on every request; cached labels are not authority. */
export function buildGengSiReferencePreview(profile: BirthProfile, dataDirectory: string): GengSiReferencePreview {
  const monthly = loadMonthlySeasonalData(dataDirectory);
  const baziSources = loadBaziSources(dataDirectory);
  const lunar = baziSources.find(source=>source.id==='bazi-evidence-lunar186');
  const entry = monthly.table.entries.find(item=>item.id==='庚-巳');
  const clause = entry?.conditions.find(item=>item.id==='geng-si-no-fixed-order');
  if (!entry || !clause || !lunar || monthly.table.sourceId!==MONTHLY_SEASONAL_SOURCE_ID || monthly.table.source.revisionId!==2294674) throw new Error('条文预览的固定流派来源不完整。');
  const result = analyzeFreshWithGengSiReference(profile), source=result.gengSiReference.paragraph.source;
  if (clause.sourceQuote!==source.quote || clause.sourceSpan.start!==source.quoteSpan.start || clause.sourceSpan.end!==source.quoteSpan.end || entry.sourceSpan.start!==source.entryContextSpan.start || entry.sourceSpan.end!==source.entryContextSpan.end || clause.sourceLocator!==source.locator) throw new Error('条文预览解释与已核原文定位不一致。');
  return {
    schema:GENG_SI_PREVIEW_SCHEMA,profileId:profile.id,analysis:result.analysis,explanation:result.gengSiReference,
    sourceVerification:{status:'verified-fixed-resources',school:'qiongtong-wikisource-2294674',label:'《穷通宝鉴》固定电子修订2294674 · 调候条文旁证',scanCollation:false,sources:[...monthly.sources,lunar],quote:clause.sourceQuote,locator:clause.sourceLocator,quoteSpan:{...clause.sourceSpan},entryContextSpan:{...entry.sourceSpan}},
  };
}
