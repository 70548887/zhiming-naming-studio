import { describe, expect, it } from 'vitest';
import { analyzeProfile, calculateQimenPlate } from '../src/domain/engine';
import type { BirthProfile, QimenChart } from '../src/shared/types';

const profile=(extra:Partial<BirthProfile>={}):BirthProfile=>({id:'fixture',customerName:'测试',surname:'欧阳',surnamePinyin:'ōu yáng',gender:'中性',calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'08:30',timeUnknown:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',...extra});
const pillars=(p:BirthProfile)=>analyzeProfile(p).bazi.pillars.map(x=>x.gan+x.zhi);
const field=(q:QimenChart,key:'earth'|'heaven'|'star'|'door'|'god')=>q.palaces.map(p=>p[key]);
const baseHeaven=(q:QimenChart)=>q.palaces.map(p=>p.number===5?p.earth:p.heaven.replace(/（寄.）/,''));
const baseStar=(q:QimenChart)=>q.palaces.map(p=>p.number===5?'天禽':p.star.replace('、天禽',''));

describe('civil calendar and eight characters',()=>{
  it('has a known lunar New Year conversion and four-pillar value',()=>{
    const a=analyzeProfile(profile());
    expect(pillars(profile())).toEqual(['甲辰','丙寅','甲辰','戊辰']);
    expect(a.bazi.lunarDate).toContain('正月初一');
    expect(a.bazi.zodiac).toBe('龙');
    expect(Object.values(a.bazi.elements).reduce((a,b)=>a+b,0)).toBe(8);
  });
  it('converts the real 2023 leap second month and rejects a nonexistent leap month',()=>{
    expect(analyzeProfile(profile({calendar:'lunar',birthDate:'2023-02-01',leapMonth:true})).bazi.solarDate).toBe('2023-03-22 08:30:00');
    expect(()=>analyzeProfile(profile({calendar:'lunar',birthDate:'2024-02-01',leapMonth:true}))).toThrow('闰月');
    expect(()=>analyzeProfile(profile({calendar:'lunar',birthDate:'2024-01-31'}))).toThrow('日期');
  });
  it('switches year/month at the 2024 Li Chun instant, while zodiac stays on the lunar-year boundary',()=>{
    // 2024 立春 16:27:07 CST, external calendar anchor; samples bracket it by under one minute.
    const before=analyzeProfile(profile({birthDate:'2024-02-04',birthTime:'16:26:30'}));
    const after=analyzeProfile(profile({birthDate:'2024-02-04',birthTime:'16:27:30'}));
    expect(before.bazi.pillars.slice(0,2).map(p=>p.gan+p.zhi)).toEqual(['癸卯','乙丑']);
    expect(after.bazi.pillars.slice(0,2).map(p=>p.gan+p.zhi)).toEqual(['甲辰','丙寅']);
    expect(before.bazi.zodiac).toBe('兔');expect(after.bazi.zodiac).toBe('兔');
    expect(before.qimen.solarTerm).toBe('大寒');expect(after.qimen.solarTerm).toBe('立春');
  });
  it('uses the same date at 23:00, a new date at midnight, and five-rat time stems for each',()=>{
    const night=pillars(profile({birthTime:'23:30'}));
    const midnight=pillars(profile({birthDate:'2024-02-11',birthTime:'00:00'}));
    expect(night.slice(2)).toEqual(['甲辰','甲子']);
    expect(midnight.slice(2)).toEqual(['乙巳','丙子']);
  });
  it('does not invent a time pillar or a unique chart, and suppresses uncertain columns on a term day',()=>{
    const normal=analyzeProfile(profile({timeUnknown:true,birthTime:''}));
    expect(normal.bazi.pillars.map(p=>p.label)).toEqual(['年柱','月柱','日柱']);
    expect(normal.qimen.available).toBe(false);expect(normal.qimen.palaces).toEqual([]);
    const termDay=analyzeProfile(profile({birthDate:'2024-02-04',timeUnknown:true}));
    expect(termDay.bazi.pillars.map(p=>p.label)).toEqual(['日柱']);
    expect(termDay.bazi.favorable).toEqual([]);
    expect(termDay.bazi.warnings.join('')).toContain('待定');
  });
  it('compares seasonal instants across IANA timezones while preserving the birthplace civil hour',()=>{
    const tokyoBefore=analyzeProfile(profile({birthDate:'2024-02-04',birthTime:'17:26:30',timezone:'Asia/Tokyo'}));
    const tokyoAfter=analyzeProfile(profile({birthDate:'2024-02-04',birthTime:'17:27:30',timezone:'Asia/Tokyo'}));
    expect(tokyoBefore.bazi.pillars[0].gan+tokyoBefore.bazi.pillars[0].zhi).toBe('癸卯');
    expect(tokyoAfter.bazi.pillars[0].gan+tokyoAfter.bazi.pillars[0].zhi).toBe('甲辰');
    expect(tokyoAfter.bazi.pillars.at(-1)?.zhi).toBe('酉');
  });
  it('rejects impossible Gregorian dates, times, IANA zones and DST gaps; explains DST folds',()=>{
    for(const birthDate of ['2024-02-30','2023-02-29','2024-13-01','1800-01-01','x']) expect(()=>analyzeProfile(profile({birthDate}))).toThrow();
    expect(()=>analyzeProfile(profile({birthTime:'24:00'}))).toThrow('时刻');
    expect(()=>analyzeProfile(profile({timezone:'Mars/City'}))).toThrow('时区');
    expect(()=>analyzeProfile(profile({birthDate:'2024-03-10',birthTime:'02:30',timezone:'America/New_York'}))).toThrow('不存在');
    expect(analyzeProfile(profile({birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York'})).bazi.warnings.join('')).toContain('第一次');
    expect(analyzeProfile(profile({birthDate:'2018-11-04',birthTime:'08:30',timezone:'America/Sao_Paulo'})).bazi.pillars).toHaveLength(4);
    expect(analyzeProfile(profile({birthDate:'2018-11-04',timeUnknown:true,timezone:'America/Sao_Paulo'})).bazi.pillars).toHaveLength(3);
  });
  it('keeps counts separate from its explicitly heuristic, reviewable seasonal and strength judgments',()=>{
    const a=analyzeProfile(profile());
    expect(a.bazi.reasons.join('')).toContain('不是古籍定量公式');
    expect(a.bazi.reasons.join('')).toContain('不按缺项');
    expect(a.bazi.ruleDescription).toContain('不处理从格');
    expect(a.bazi.seasonalAdvice).toContain('春月');
    expect(a.bazi.version).toContain('1.9.0');
  });
});

describe('fixed-school rotating Qimen, independently sourced reference expectations',()=>{
  it('matches the full Yang 5 / 庚申 golden plate from upstream test.js (not generated by this implementation)',()=>{
    const q=calculateQimenPlate('戊午','庚申','立春');
    expect([q.dun,q.ju,q.yuan,q.chiefStar,q.chiefDoor,q.xun]).toEqual(['阳遁',5,'中元','天蓬','休门','甲寅（遁癸）']);
    expect(field(q,'earth')).toEqual(['乙','壬','丁','丙','戊','庚','辛','癸','己']);
    expect(baseHeaven(q)).toEqual(['丁','庚','己','壬','戊','癸','乙','丙','辛']);
    expect(field(q,'door')).toEqual(['死门','惊门','开门','景门','','休门','杜门','伤门','生门']);
    expect(baseStar(q)).toEqual(['天芮','天柱','天心','天英','天禽','天蓬','天辅','天冲','天任']);
    expect(field(q,'god')).toEqual(['朱雀','九地','九天','勾陈','','值符','六合','太阴','腾蛇']);
    expect(q.palaces.find(p=>p.star.includes('天芮'))?.heaven).toBe('丁（寄戊）');
  });
  it('matches the full Yin 3 / 辛亥 golden plate from the same fixed external fixture',()=>{
    const q=calculateQimenPlate('丁巳','辛亥','夏至');
    expect([q.dun,q.ju,q.chiefStar,q.chiefDoor]).toEqual(['阴遁',3,'天任','生门']);
    expect(field(q,'earth')).toEqual(['乙','辛','己','戊','丙','癸','壬','庚','丁']);
    expect(baseHeaven(q)).toEqual(['庚','壬','戊','丁','丙','乙','癸','己','辛']);
    expect(field(q,'door')).toEqual(['景门','死门','惊门','杜门','','开门','伤门','生门','休门']);
    expect(baseStar(q)).toEqual(['天蓬','天任','天冲','天心','天禽','天辅','天柱','天芮','天英']);
    expect(field(q,'god')).toEqual(['腾蛇','值符','九天','太阴','','九地','六合','白虎','玄武']);
  });
  it('reproduces the transcribed 时悖 classic: Winter Solstice middle yuan, 丁未时, middle 丙 follows 天芮 to 巽四',()=>{
    const q=calculateQimenPlate('丁亥','丁未','冬至');
    expect(q.ju).toBe(7);expect(q.chiefStar).toBe('天芮');
    const xun=q.palaces.find(p=>p.number===4)!;
    expect(xun.earth).toBe('丁');expect(xun.heaven).toContain('寄丙');
    expect(xun.star).toBe('天芮、天禽');expect(xun.god).toBe('值符');
  });
  it('handles a middle-palace 旬首 as 天禽 chief while borrowing 坤死门',()=>{
    // 《元灵经》 upstream-transcribed example: 阳九局丙辰时，甲寅遁癸居中，天禽加兑、死门加兑。
    const q=calculateQimenPlate('戊辰','丙辰','雨水');
    expect(q.ju).toBe(9);expect(q.chiefStar).toBe('天禽');expect(q.chiefDoor).toBe('死门');
    const dui=q.palaces.find(p=>p.number===7)!;
    expect(dui.star).toBe('天芮、天禽');expect(dui.door).toBe('死门');expect(dui.god).toBe('值符');
  });
  it('changes yuan on 甲己符头 rather than each 120 hours after a term',()=>{
    expect(calculateQimenPlate('戊辰','甲子','冬至').yuan).toBe('上元');
    expect(calculateQimenPlate('己巳','甲子','冬至').yuan).toBe('中元');
    expect(calculateQimenPlate('甲戌','甲子','冬至').yuan).toBe('下元');
    expect(calculateQimenPlate('己卯','甲子','冬至').yuan).toBe('上元');
  });
  it('changes dun at the astronomical solstice instant, not at midnight',()=>{
    // 2024 summer solstice 2024-06-20 20:51 UTC (rounded independent astronomical anchor).
    const before=analyzeProfile(profile({birthDate:'2024-06-21',birthTime:'04:50'})).qimen;
    const after=analyzeProfile(profile({birthDate:'2024-06-21',birthTime:'04:52'})).qimen;
    expect(before.dun).toBe('阳遁');expect(after.dun).toBe('阴遁');
    expect(before.solarTerm).toBe('芒种');expect(after.solarTerm).toBe('夏至');
  });
  it('gives eight unique moving sectors, six hidden 甲, and no invented extra verdicts across all hours',()=>{
    for(const birthDate of ['2024-01-15','2024-07-15']) for(let hour=0;hour<24;hour++) {
      const q=analyzeProfile(profile({birthDate,birthTime:String(hour).padStart(2,'0')+':30'})).qimen;
      expect(q.palaces).toHaveLength(9);
      expect(new Set(q.palaces.filter(p=>p.door).map(p=>p.door)).size).toBe(8);
      expect(new Set(q.palaces.filter(p=>p.god).map(p=>p.god)).size).toBe(8);
      expect(new Set(field(q,'earth')).size).toBe(9);
      expect(field(q,'earth')).not.toContain('甲');
      expect(q.palaces.filter(p=>p.star.includes('天禽'))).toHaveLength(2); // central lodging label and actual paired sector
      expect(q.patterns?.checks).toHaveLength(7);
      expect(q.warnings.join('')).toContain('结构辅助已核查');
      expect(q.warnings.join('')).toContain('姓名验局尚未启用');
    }
  });
});
