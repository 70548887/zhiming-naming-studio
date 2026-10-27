/** Frozen publication1.3 and prior civil-time policy. Do not repair old recorded results in place. */
import { Lunar, LunarMonth, Solar } from 'lunar-typescript';
import type { BirthProfile } from './types';

export interface CivilTime { year: number; month: number; day: number; hour: number; minute: number; second: number; }
export interface BirthContext {
  local: Solar; seasonal: Lunar; startSeasonal: Lunar; endSeasonal: Lunar; warnings: string[]; timezone: string;
  /** instantEpoch is only a calculation representative when the actual birth time is unknown. */
  instantEpoch:number; startEpoch:number; endEpoch:number; ambiguous:boolean;
}

function civilFromDate(date: Date, timezone: string): CivilTime {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:timezone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year:Number(value.year),month:Number(value.month),day:Number(value.day),hour:Number(value.hour),minute:Number(value.minute),second:Number(value.second) };
}
const civilEpoch = (c: CivilTime) => Date.UTC(c.year,c.month-1,c.day,c.hour,c.minute,c.second);

function civilCandidates(civil:CivilTime,timezone:string):number[] {
  const nominal = civilEpoch(civil);
  const offsets = new Set<number>();
  for (const delta of [-36,-12,0,12,36]) {
    const trial = nominal + delta*3600000;
    offsets.add(civilEpoch(civilFromDate(new Date(trial),timezone))-trial);
  }
  const candidates = [...offsets].map(offset => nominal-offset).filter(epoch => civilEpoch(civilFromDate(new Date(epoch),timezone)) === nominal).sort((a,b)=>a-b);
  if (!candidates.length) throw new Error('出生时刻在该时区的夏令时跳转中不存在，请核对民用时间。');
  return candidates;
}

/** Resolve a wall clock without depending on the operating system timezone. Gaps are rejected; folds choose the earlier instant. */
export function resolveCivil(civil: CivilTime, timezone: string): { epoch: number; ambiguous: boolean } {
  const candidates=civilCandidates(civil,timezone);
  return { epoch:candidates[0],ambiguous:candidates.length>1 };
}

function shanghaiLunar(epoch: number): Lunar {
  // The library's astronomical terms are in UTC+08:00, independently of the host timezone.
  const date = new Date(epoch+8*3600000);
  return Solar.fromYmdHms(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),date.getUTCHours(),date.getUTCMinutes(),date.getUTCSeconds()).getLunar();
}

/** Shared calendar/civil-time resolution for normal saves, analysis and restored birth inputs. */
export function resolveBirthContext(profile: BirthProfile,options:{legacyUnknownDayEndpoints?:true}={}): BirthContext {
  if (!profile || !profile.surname?.trim()) throw new Error('请填写姓氏。');
  if (!['solar','lunar'].includes(profile.calendar)) throw new Error('请选择公历或农历。');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profile.birthDate || '');
  if (!match) throw new Error('出生日期格式应为 YYYY-MM-DD。');
  let [,yearText,monthText,dayText] = match;
  const year=Number(yearText), month=Number(monthText), day=Number(dayText);
  if (year<1900 || year>2100) throw new Error('当前历法与规则核验范围为 1900–2100 年。');
  if (month<1 || month>12 || day<1) throw new Error('出生日期的月、日无效。');
  const time = profile.timeUnknown ? [12,0] : /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(profile.birthTime || '')?.slice(1).map(n=>Number(n || 0));
  if (!time || time[0]>23 || time[1]>59 || (time[2] || 0)>59) throw new Error('出生时刻应为 00:00–23:59。');
  let local: Solar;
  if (profile.calendar==='lunar') {
    const lunarMonth = LunarMonth.fromYm(year,profile.leapMonth ? -month : month);
    if (!lunarMonth || day>lunarMonth.getDayCount()) throw new Error('该农历年份没有所选闰月，或日期超出农历月天数。');
    local = Lunar.fromYmdHms(year,profile.leapMonth ? -month : month,day,time[0],time[1],time[2] || 0).getSolar();
  } else {
    const check = new Date(Date.UTC(year,month-1,day));
    if (check.getUTCFullYear()!==year || check.getUTCMonth()+1!==month || check.getUTCDate()!==day) throw new Error('公历日期无效，请检查月份天数。');
    local = Solar.fromYmdHms(year,month,day,time[0],time[1],time[2] || 0);
  }
  const timezone = profile.timezone?.trim() || 'Asia/Shanghai';
  try { new Intl.DateTimeFormat('en',{timeZone:timezone}).format(0); } catch { throw new Error('时区无效，请使用 Asia/Shanghai 等 IANA 时区名称。'); }
  const civil: CivilTime = { year:local.getYear(),month:local.getMonth(),day:local.getDay(),hour:local.getHour(),minute:local.getMinute(),second:local.getSecond() };
  const warnings: string[] = [];
  // Some IANA zones jump at midnight. Known valid times must not be rejected because an unrelated day endpoint is in a gap.
  const dayEndpoint=(start:boolean):number=>{
    for (let offset=0;offset<1440;offset++) {
      const minuteOfDay=start?offset:1439-offset;
      try {
        const candidates=civilCandidates({...civil,hour:Math.floor(minuteOfDay/60),minute:minuteOfDay%60,second:start?0:59},timezone);
        // Known clocks retain the first-occurrence policy. An unknown date includes the
        // final occurrence of its last wall-clock second, even when 23:00 repeats.
        // Frozen 1.0.0 snapshots explicitly retain their original first-endpoint policy.
        return start||options.legacyUnknownDayEndpoints?candidates[0]:candidates.at(-1)!;
      }
      catch (error) { if (!(error instanceof Error) || !error.message.includes('不存在')) throw error; }
    }
    throw new Error('所选民用日期在该时区不存在，请核对日期。');
  };
  // The legacy profile resolved its noon surrogate first, including its former noon-gap
  // rejection. Keep that exact behavior for old snapshots, while a new unknown-time
  // profile is valid whenever its civil date contains an actual instant.
  let resolved=(!profile.timeUnknown||options.legacyUnknownDayEndpoints)?resolveCivil(civil,timezone):undefined;
  const start=profile.timeUnknown?dayEndpoint(true):resolved!.epoch;
  const end=profile.timeUnknown?dayEndpoint(false):resolved!.epoch;
  if(!resolved){
    try {resolved=resolveCivil(civil,timezone);}
    catch(error){
      if(!(error instanceof Error)||!error.message.includes('不存在'))throw error;
      resolved={epoch:start,ambiguous:false};
      warnings.push('出生时刻未知，且该日12:00处于民用时间跳转缺口；仅用该日有效起点作历算代表，未填入出生时刻或时柱。年、月柱仍按全日区间核对，交节不确定时保留待定。');
    }
  }
  if(resolved.ambiguous&&(!profile.timeUnknown||options.legacyUnknownDayEndpoints))warnings.push('该民用时刻处于夏令时回拨的重复小时，采用第一次出现的时刻；请起名师复核。');
  if(timezone!=='Asia/Shanghai')warnings.push(`采用 ${timezone} 出生地民用日期定日柱、民用钟定时柱；年/月柱按该瞬间对应的北京时间交节。公农历按中国历法的同名日期换算，未作真太阳时校正。`);
  return { local, seasonal:shanghaiLunar(resolved.epoch), startSeasonal:shanghaiLunar(start),endSeasonal:shanghaiLunar(end),warnings,timezone,instantEpoch:resolved.epoch,startEpoch:start,endEpoch:end,ambiguous:!profile.timeUnknown&&resolved.ambiguous };
}

/** Input shape checks belong to callers; this gate shares the exact engine's calendar and time semantics. */
export function validCivilBirthProfile(profile: BirthProfile): boolean {
  try { resolveBirthContext(profile); return true; } catch { return false; }
}
