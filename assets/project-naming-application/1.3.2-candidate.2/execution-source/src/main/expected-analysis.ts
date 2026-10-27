import { analyzeProfile,BAZI_RULE_VERSION,BAZI_REN_RULE_VERSION,BAZI_REN_V1_RULE_VERSION,BAZI_REN_ACTION_RULE_VERSION,BAZI_REN_CAPACITY_RULE_VERSION,BAZI_REN_DIRECTION_RULE_VERSION,BAZI_REN_JOINT_BATTLE_RULE_VERSION,QIMEN_RULE_VERSION } from '../domain/engine';
import { calculateLegacyBazi,LEGACY_BAZI_RULE_VERSION } from '../domain/bazi-legacy';
import { calculateBaziV1,BAZI_V1_RULE_VERSION } from '../domain/bazi-v1';
import { calculateBaziV2,BAZI_V2_RULE_VERSION } from '../domain/bazi-v2';
import { calculateBaziV3,BAZI_V3_RULE_VERSION } from '../domain/bazi-v3';
import { calculateBaziV4,BAZI_V4_RULE_VERSION } from '../domain/bazi-v4';
import { calculateBaziV5,BAZI_V5_RULE_VERSION } from '../domain/bazi-v5';
import { calculateBaziV6,BAZI_V6_RULE_VERSION } from '../domain/bazi-v6';
import { calculateQimenProfileV2,QIMEN_V2_RULE_VERSION } from '../domain/qimen-v2';
import {calculateBaziV7,calculateQimenProfileV3,BAZI_V7_RULE_VERSION,QIMEN_V3_RULE_VERSION} from '../domain/engine-v7';
import {calculateBaziV8,BAZI_V8_RULE_VERSION} from '../domain/engine-v8';
import {validateBirthTimeInput} from '../shared/birth-time-basis';
import { normalizeMonthAuthorityMethod } from '../shared/month-authority-method';
import { normalizeSeasonalMethod } from '../shared/seasonal-method';
import { normalizeRenMethod,REN_METHOD,LEGACY_REN_METHOD,REN_ACTION_METHOD,REN_CAPACITY_METHOD,REN_DIRECTION_METHOD,REN_JOINT_BATTLE_METHOD } from '../shared/ren-method';
import type { Analysis,BaziAnalysis,BirthProfile,QimenChart } from '../shared/types';

export type DeepReadonly<T>=T extends (...args:never[])=>unknown?T:T extends readonly (infer Item)[]?readonly DeepReadonly<Item>[]:T extends object?{readonly [Key in keyof T]:DeepReadonly<T[Key]>}:T;
const MAX_EXPECTED_ENTRIES=128;
const expectedCache=new Map<string,DeepReadonly<Analysis|BaziAnalysis|QimenChart>>();
const requiredKeys=['surname','gender','calendar','birthDate','birthTime','timeUnknown','leapMonth','timezone'] as const;

/** Do not retain customer names, parents, places, notes or preferences in validation caches. */
function calculationInput(value:BirthProfile):{profile:BirthProfile;key:string} {
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('出生计算输入结构无效。');
  const read=(key:string,optional=false):unknown=>{
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor){if(optional)return undefined;throw new Error('出生计算字段缺失。');}
    if(!Object.hasOwn(descriptor,'value'))throw new Error('出生计算字段不得为访问器。');
    return descriptor.value;
  };
  const fields=Object.fromEntries(requiredKeys.map(key=>[key,read(key)])) as Pick<BirthProfile,typeof requiredKeys[number]>;
  if(typeof fields.surname!=='string'||!/^\p{Script=Han}{1,4}$/u.test(fields.surname.trim())
    ||!['男','女','中性'].includes(fields.gender)||!['solar','lunar'].includes(fields.calendar)
    ||typeof fields.birthDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate)
    ||typeof fields.birthTime!=='string'||fields.birthTime.length>300
    ||typeof fields.timeUnknown!=='boolean'||typeof fields.leapMonth!=='boolean'
    ||typeof fields.timezone!=='string'||fields.timezone.length>300
    ||!fields.timeUnknown&&!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(fields.birthTime))throw new Error('出生计算字段无效。');
  const method=normalizeMonthAuthorityMethod(read('monthAuthorityMethod',true));
  const seasonalMethod=normalizeSeasonalMethod(read('seasonalMethod',true));
  const renMethod=normalizeRenMethod(read('renMethod',true));
  const timeInput=validateBirthTimeInput({timeBasis:read('timeBasis',true) as BirthProfile['timeBasis'],birthLongitude:read('birthLongitude',true) as number|undefined});
  const profile:BirthProfile={...fields,id:'',customerName:'',surnamePinyin:'',birthPlace:'',notes:'',monthAuthorityMethod:method,seasonalMethod,renMethod,timeBasis:timeInput.basis,...(timeInput.longitude===undefined?{}:{birthLongitude:timeInput.longitude})};
  const key=JSON.stringify([BAZI_RULE_VERSION,QIMEN_RULE_VERSION,fields.surname,fields.gender,fields.calendar,fields.birthDate,fields.birthTime,fields.timeUnknown,fields.leapMonth,fields.timezone,method,seasonalMethod,renMethod,timeInput.basis,timeInput.longitude??null]);
  return {profile,key};
}
function freeze<T>(value:T):DeepReadonly<T> {
  if(value&&typeof value==='object'){
    for(const item of Object.values(value))freeze(item);
    Object.freeze(value);
  }
  return value as DeepReadonly<T>;
}
function cached<T extends Analysis|BaziAnalysis|QimenChart>(key:string,calculate:()=>T):DeepReadonly<T> {
  const found=expectedCache.get(key);
  if(found){expectedCache.delete(key);expectedCache.set(key,found);return found as DeepReadonly<T>;}
  const result=freeze(calculate());
  expectedCache.set(key,result);
  if(expectedCache.size>MAX_EXPECTED_ENTRIES)expectedCache.delete(expectedCache.keys().next().value!);
  return result;
}

/** Expected results are recomputed only from validated birth inputs, never from imported analysis fields. */
export function expectedAnalysis(profile:BirthProfile):DeepReadonly<Analysis> {
  const input=calculationInput(profile);
  return cached('analysis:'+input.key,()=>analyzeProfile(input.profile));
}
export function expectedQimen(profile:BirthProfile,version:string):DeepReadonly<QimenChart>{
  const input=calculationInput(profile);
  if(version===QIMEN_RULE_VERSION)return expectedAnalysis(input.profile).qimen;
  if(input.profile.timeBasis==='apparent-solar')throw new Error('旧版奇门快照未启用真太阳时，不得降级算法标签。');
  if(version===QIMEN_V3_RULE_VERSION)return cached(version+':'+input.key,()=>calculateQimenProfileV3(input.profile));
  if(version===QIMEN_V2_RULE_VERSION)return cached(version+':'+input.key,()=>calculateQimenProfileV2(input.profile));
  throw new Error('未支持的奇门算法版本。');
}

/** Each historical version retains its original calculator and a distinct bounded cache key. */
export function expectedBazi(profile:BirthProfile,version:string):DeepReadonly<BaziAnalysis> {
  const input=calculationInput(profile);
  if(version===BAZI_REN_JOINT_BATTLE_RULE_VERSION){if(input.profile.renMethod!==REN_JOINT_BATTLE_METHOD)throw new Error('任注联合动气版本必须保留独立方法。');return expectedAnalysis(input.profile).bazi;}
  if(version===BAZI_REN_DIRECTION_RULE_VERSION){if(input.profile.renMethod!==REN_DIRECTION_METHOD)throw new Error('任注成方局部旺势版本必须保留独立方法。');return expectedAnalysis(input.profile).bazi;}
  if(version===BAZI_REN_CAPACITY_RULE_VERSION){if(input.profile.renMethod!==REN_CAPACITY_METHOD)throw new Error('任注局部能力版本必须保留独立方法。');return expectedAnalysis(input.profile).bazi;}
  if(version===BAZI_REN_ACTION_RULE_VERSION){if(input.profile.renMethod!==REN_ACTION_METHOD)throw new Error('任注条件作用版本必须保留独立方法。');return expectedAnalysis(input.profile).bazi;}
  if(version===BAZI_REN_RULE_VERSION){if(input.profile.renMethod!==REN_METHOD)throw new Error('任注专用版本必须保留所选独立方法。');return expectedAnalysis(input.profile).bazi;}
  if(version===BAZI_REN_V1_RULE_VERSION){if(input.profile.renMethod!==LEGACY_REN_METHOD)throw new Error('任注历史版本必须保留原取法。');return expectedAnalysis(input.profile).bazi;}
  if(input.profile.renMethod!=='none')throw new Error('启用任注的方案不得使用旧版八字标签。');
  if(version===BAZI_RULE_VERSION)return expectedAnalysis(input.profile).bazi;
  if(version===BAZI_V8_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV8(input.profile));
  if(input.profile.timeBasis==='apparent-solar')throw new Error('旧版八字快照未启用真太阳时，不得降级算法标签。');
  if(version===BAZI_V7_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV7(input.profile));
  if(version===BAZI_V6_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV6(input.profile));
  if(version===BAZI_V5_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV5(input.profile));
  if(version===BAZI_V4_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV4(input.profile));
  if(version===BAZI_V3_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV3(input.profile));
  if(input.profile.seasonalMethod!=='no-monthly/1.0.0')throw new Error('旧版快照未启用所选逐月参考。');
  if(version===BAZI_V2_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV2(input.profile));
  if(input.profile.monthAuthorityMethod!=='no-fixed-day/1.0.0')throw new Error('旧版快照未启用所选分日定位。');
  if(version===LEGACY_BAZI_RULE_VERSION)return cached(version+':'+input.key,()=>calculateLegacyBazi(input.profile));
  if(version===BAZI_V1_RULE_VERSION)return cached(version+':'+input.key,()=>calculateBaziV1(input.profile));
  throw new Error('未支持的八字算法版本。');
}
