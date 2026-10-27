import { Solar } from 'lunar-typescript';
import { calculateApparentSolarInterval, calculateApparentSolarTime, type ApparentSolarResult, type SolarClock } from './apparent-solar-v8';
import type { BirthContext } from './civil-birth';
import type { BirthProfile, BirthTimeAnalysis, BirthTimeBasis, BirthTimePoint } from './types';

/** One validation policy for direct calculations, IPC profiles and restored databases. */
export function normalizeBirthTimeBasis(value: unknown): BirthTimeBasis {
  if(value===undefined||value==='civil')return 'civil';
  if(value==='apparent-solar')return value;
  throw new Error('出生排盘时间基准无效，请选择民用时间或真太阳时。');
}
export function validBirthTimeBasis(value:unknown):boolean {try{normalizeBirthTimeBasis(value);return true;}catch{return false;}}
export function validateBirthTimeInput(profile: Pick<BirthProfile,'timeBasis'|'birthLongitude'>): {basis:BirthTimeBasis;longitude?:number} {
  const basis=normalizeBirthTimeBasis(profile.timeBasis),longitude=profile.birthLongitude;
  if(longitude!==undefined&&(typeof longitude!=='number'||!Number.isFinite(longitude)||longitude < -180||longitude > 180))throw new Error('出生地经度应为 -180 至 180 的有限数字，东经为正、西经为负。');
  if(basis==='apparent-solar'&&longitude===undefined)throw new Error('选择真太阳时后，请填写出生地经度。');
  return {basis,...(longitude===undefined?{}:{longitude})};
}
export function validBirthTimeInput(profile: Pick<BirthProfile,'timeBasis'|'birthLongitude'>): boolean {
  try {validateBirthTimeInput(profile);return true;}catch{return false;}
}
const pad=(number:number)=>String(number).padStart(2,'0');
const clockText=(clock:SolarClock)=>`${clock.year}-${pad(clock.month)}-${pad(clock.day)} ${pad(clock.hour)}:${pad(clock.minute)}:${pad(clock.second)}`;
const solarFromCoordinate=(epoch:number)=>{const date=new Date(Math.floor(epoch));return Solar.fromYmdHms(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds());};
function civilClock(epoch:number,timezone:string):{text:string;offset:number} {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(epoch);
  const item=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  const coordinate=Date.UTC(Number(item.year),Number(item.month)-1,Number(item.day),Number(item.hour),Number(item.minute),Number(item.second));
  return {text:`${item.year}-${item.month}-${item.day} ${item.hour}:${item.minute}:${item.second}`,offset:(coordinate-epoch)/60000};
}
function dateCandidates(start:number,end:number):string[] {
  const dates:string[]=[];
  for(let day=Math.floor(start/86400000);day<=Math.floor(end/86400000);day++)dates.push(new Date(day*86400000).toISOString().slice(0,10));
  return dates;
}
export interface BirthCalculationClock { trace:BirthTimeAnalysis; clock?:Solar; }

/** Solar coordinates determine only day/hour pillars; actual UTC ranges are never shifted. */
export function resolveBirthCalculationClock(profile:BirthProfile,context:BirthContext):BirthCalculationClock {
  const {basis,longitude}=validateBirthTimeInput(profile),unknown=profile.timeUnknown;
  const common={version:'birth-time-basis/1.0.0' as const,basis,timezone:context.timezone,civilDate:context.local.toYmd(),civilTime:unknown?null:context.local.toYmdHms().slice(11),actualUtc:unknown?null:new Date(context.instantEpoch).toISOString(),civilInterval:{startUtc:new Date(context.startEpoch).toISOString(),endUtc:new Date(context.endEpoch).toISOString()},yearMonthBasis:'actual-instant' as const,dayBoundary:'00:00' as const};
  if(basis==='civil') {
    const point=(label:BirthTimePoint['label'],epoch:number):BirthTimePoint=>{const item=civilClock(epoch,context.timezone);return {label,utc:new Date(epoch).toISOString(),civilDateTime:item.text,clockDateTime:item.text,utcOffsetMinutes:item.offset,equationOfTimeMinutes:0,longitudeMinutes:0,correctionMinutes:0};};
    const points=unknown?[point('start',context.startEpoch),point('end',context.endEpoch)]:[point('birth',context.instantEpoch)];
    return {clock:context.local,trace:{...common,methodId:'civil-wall-clock/1.0.0',longitude:null,calculationDateTime:unknown?null:context.local.toYmdHms(),calculationInterval:{start:points[0].clockDateTime,end:points.at(-1)!.clockDateTime},dayCandidates:[context.local.toYmd()],dayStatus:'determined',points,precision:'civil-record',policies:['采用出生地民用午夜00:00换日、民用钟定时柱。','年柱立春、月柱节令及奇门节气均按实际UTC瞬间比对，生肖按原民用日期对应的农历年。',...(unknown?['出生时刻未知，保留该民用日期的全部有效实际时段，不生成时柱；所列起止秒均计入有效区间。']:[])],warnings:[...context.warnings]}};
  }
  const results=unknown?calculateApparentSolarInterval({startEpoch:context.startEpoch,endEpoch:context.endEpoch,longitudeDegrees:longitude!,timezone:context.timezone}):undefined;
  const values=unknown?[results!.start,results!.end]:[calculateApparentSolarTime({instantEpoch:context.instantEpoch,longitudeDegrees:longitude!,timezone:context.timezone})];
  const start=values[0],end=values.at(-1)!,days=dateCandidates(start.apparentSolarEpoch,end.apparentSolarEpoch),dayStatus=days.length===1?'determined':'uncertain';
  const point=(value:ApparentSolarResult,label:BirthTimePoint['label']):BirthTimePoint=>({label,utc:new Date(value.instantEpoch).toISOString(),civilDateTime:clockText(value.civilClock),clockDateTime:clockText(value.apparentSolarClock),utcOffsetMinutes:value.timezoneOffsetMinutes,equationOfTimeMinutes:value.equationOfTimeMinutes,longitudeMinutes:value.longitudeCorrectionMinutes,correctionMinutes:value.totalCorrectionMinutes});
  const points=values.map((value,index)=>point(value,unknown?index===0?'start':'end':'birth'));
  const warnings=[...new Set(values.flatMap(value=>value.warnings)),...(context.ambiguous?['民用时刻处于重复小时，沿用第一次实际瞬间；未另算第二次。']:[]),...(unknown?['未知出生时刻只校正实际区间端点，不用12:00或其他代表时刻确定日主。']:[]),...(dayStatus==='uncertain'?['有效出生区间校正后跨越真太阳日界：日柱和日主待定，暂停喜用候选、逐月及从格等依赖日主的证据。']:[])];
  return {...(dayStatus==='determined'?{clock:solarFromCoordinate(start.apparentSolarEpoch)}:{}),trace:{...common,methodId:'apparent-solar-time/noaa-meeus-1.0.0',longitude:longitude!,calculationDateTime:unknown?null:points[0].clockDateTime,calculationInterval:{start:points[0].clockDateTime,end:points.at(-1)!.clockDateTime},dayCandidates:days,dayStatus,points,sourceId:start.sourceId,precision:'model-estimate',policies:['排盘钟面=实际UTC+经度×4分钟+均时差；经度东正西负，不归一化到24小时，保留跨日。','IANA时区只用于从民用记录还原实际瞬间及解释修正；夏令时已含在UTC偏移中，不重复减除。','日柱按校正钟面00:00换日，时柱按校正钟面时辰及五鼠遁；奇门日时干支采用同一基准。','年柱立春、月柱节令、月令分段及奇门节气均保持原实际UTC瞬间；公农历生日显示及生肖保持原民用记录。','60秒近界窗口只提示人工复核，仍保留按模型估算的点结果，不作为公式误差界。',...(unknown?['全日区间各端点分别计算均时差；所列实际起止秒均计入有效区间；跨真太阳日界时不选定日柱、日主或喜用，且不生成时柱或唯一奇门盘。']:[])],warnings}};
}
