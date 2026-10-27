import { LunarUtil } from 'lunar-typescript';
import type { Analysis, BirthProfile, QimenChart } from '../shared/types';
import { resolveBirthContext } from '../shared/civil-birth-v8';
import { calculateLegacyBazi } from './bazi-legacy';
import { calculateBaziEvidence } from './bazi-evidence-v8';
import { normalizeMonthAuthorityMethod } from '../shared/month-authority-method';
import { normalizeSeasonalMethod } from '../shared/seasonal-method';
import { calculateQimenAuxiliary, qimenAuxiliaryPalaceMarks } from './qimen-markers-v8';
import { calculateQimenPatterns, qimenPatternPalaceMarks } from './qimen-patterns-v8';
import { calculateQimenStemTombs } from './qimen-stem-tombs-v8';
import { resolveBirthCalculationClock } from '../shared/birth-time-basis-v8';

/** All rule choices are part of the result: a different school must use a new version. */
export const BAZI_V8_RULE_VERSION = 'civil-midnight-fuyi-candidate/1.8.0;lunar-typescript/1.8.6';
export const QIMEN_V4_RULE_VERSION = 'zhuanpan-chaibu-futou-kun2/1.4.0';
const GAN = [...'甲乙丙丁戊己庚辛壬癸'];
const ZHI = [...'子丑寅卯辰巳午未申酉戌亥'];
const mod = (n: number, divisor: number) => ((n % divisor) + divisor) % divisor;

// 三元局数 table agrees with both independently implemented reference projects. Frozen local constants avoid a network dependency.
const TERM_JU: Record<string, number[]> = { 冬至:[1,7,4],小寒:[2,8,5],大寒:[3,9,6],立春:[8,5,2],雨水:[9,6,3],惊蛰:[1,7,4],春分:[3,9,6],清明:[4,1,7],谷雨:[5,2,8],立夏:[4,1,7],小满:[5,2,8],芒种:[6,3,9],夏至:[9,3,6],小暑:[8,2,5],大暑:[7,1,4],立秋:[2,5,8],处暑:[1,4,7],白露:[9,3,6],秋分:[7,1,4],寒露:[6,9,3],霜降:[5,8,2],立冬:[6,9,3],小雪:[5,8,2],大雪:[4,7,1] };
const TERMS=Object.keys(TERM_JU);
const RING=[1,8,3,4,9,2,7,6]; // clockwise by Lo-shu palace number, starting at north
const GRID=[4,9,2,3,5,7,8,1,6];
const STARS: Record<number,string>={1:'天蓬',2:'天芮',3:'天冲',4:'天辅',5:'天禽',6:'天心',7:'天柱',8:'天任',9:'天英'};
const DOORS: Record<number,string>={1:'休门',2:'死门',3:'伤门',4:'杜门',5:'',6:'开门',7:'惊门',8:'生门',9:'景门'};
const DIRECTIONS: Record<number,string>={1:'北',2:'西南',3:'东',4:'东南',5:'中',6:'西北',7:'西',8:'东北',9:'南'};
const TRIGRAMS: Record<number,string>={1:'坎',2:'坤',3:'震',4:'巽',5:'中',6:'乾',7:'兑',8:'艮',9:'离'};
const SIX_INSTRUMENTS=[...'戊己庚辛壬癸丁丙乙'];
const effectivePalace=(n:number)=>n===5?2:n;
const ringOffset=(source:number,target:number)=>mod(RING.indexOf(effectivePalace(target))-RING.indexOf(effectivePalace(source)),8);
const rotatePalace=(palace:number,offset:number)=>RING[mod(RING.indexOf(effectivePalace(palace))+offset,8)];

/** Pure plate layer, also exposed to test independently sourced, explicitly supplied historical ju/hour examples. */
export function calculateQimenPlateV4(dayGanzhi: string, hourGanzhi: string, solarTerm: string): QimenChart {
  const dayIndex=LunarUtil.getJiaZiIndex(dayGanzhi), hourIndex=LunarUtil.getJiaZiIndex(hourGanzhi);
  const termIndex=TERMS.indexOf(solarTerm);
  if (dayIndex<0 || hourIndex<0 || termIndex<0) throw new Error('奇门所需干支或节气无效。');
  // Each 5-day block starts on 甲 or 己. 子午卯酉 => upper, 寅申巳亥 => middle, 辰戌丑未 => lower.
  const futouIndex=dayIndex-mod(dayIndex,5), futou=GAN[futouIndex%10]+ZHI[futouIndex%12];
  const yuanIndex=Math.floor(mod(dayIndex,15)/5);
  const yuan=['上元','中元','下元'][yuanIndex];
  const yang=termIndex<12, direction=yang?1:-1, ju=TERM_JU[solarTerm][yuanIndex];
  const earth: Record<number,string>={};
  SIX_INSTRUMENTS.forEach((stem,index)=>{earth[mod(ju-1+index*direction,9)+1]=stem;});
  const xunIndex=Math.floor(hourIndex/10), xunGanZhi=GAN[0]+ZHI[mod(-2*xunIndex,12)], hiddenStem=SIX_INSTRUMENTS[xunIndex];
  const xunPalace=Number(Object.keys(earth).find(key=>earth[Number(key)]===hiddenStem));
  const hourStem=hourGanzhi[0]==='甲'?hiddenStem:hourGanzhi[0];
  const hourPalace=Number(Object.keys(earth).find(key=>earth[Number(key)]===hourStem));
  const starRotation=ringOffset(xunPalace,hourPalace);
  const chiefStar=STARS[xunPalace],chiefDoor=DOORS[effectivePalace(xunPalace)];
  // Door travels through all nine numbered palaces before the 5->2 lodging rule, then the eight-door ring rotates rigidly.
  const rawDoorTarget=mod(xunPalace-1+mod(hourIndex,10)*direction,9)+1;
  const doorTarget=effectivePalace(rawDoorTarget), doorRotation=ringOffset(xunPalace,doorTarget);
  const heaven: Record<number,string>={}, stars: Record<number,string>={},doors: Record<number,string>={},gods: Record<number,string>={};
  for (const palace of RING) {
    const target=rotatePalace(palace,starRotation);
    heaven[target]=earth[palace];stars[target]=STARS[palace];
    doors[rotatePalace(palace,doorRotation)]=DOORS[palace];
  }
  // The middle instrument and 天禽 travel with 天芮, never as a ninth independent rotating sector.
  const lodging=rotatePalace(2,starRotation);
  heaven[lodging]+=`（寄${earth[5]}）`;
  stars[lodging]+='、天禽';
  const godOrder=yang?['值符','腾蛇','太阴','六合','勾陈','朱雀','九地','九天']:['值符','腾蛇','太阴','六合','白虎','玄武','九地','九天'];
  const godStart=effectivePalace(hourPalace);
  godOrder.forEach((god,index)=>gods[rotatePalace(godStart,index*direction)]=god);
  const reasons=[
    `拆补（甲己符头三元版本）：${dayGanzhi}日回溯${mod(dayIndex,5)}日得符头${futou}，定${yuan}；${solarTerm}${yang?'阳遁':'阴遁'}${ju}局。`,
    `${hourGanzhi}时属${xunGanZhi}旬，甲遁${hiddenStem}；旬首仪在${xunPalace}宫，值符${chiefStar}、值使${chiefDoor}。`,
    `值符随时干${hourStem}至${hourPalace}宫${hourPalace===5?'，中五寄坤二':''}；值使顺/逆数${mod(hourIndex,10)}步至${rawDoorTarget}宫${rawDoorTarget===5?'，中五寄坤二':''}。`,
    '九星、天盘按八宫同向刚性转动；中五寄坤二，天禽及中宫干随天芮。八神版本：阳遁勾陈朱雀，阴遁白虎玄武；阳顺阴逆。',
    '来源对照：arc119226/qimen_dunjia@7d94103 的盘层与经典转录例题；MarkChenXY163/qimendunjia_mcp@d5941f4 的日干支三元及局数表。后者交节只到日期，本引擎另用精确交节。'
  ];
  const auxiliary=calculateQimenAuxiliary(hourGanzhi);
  const palaces=GRID.map(number=>({number,direction:DIRECTIONS[number],trigram:TRIGRAMS[number],earth:earth[number],heaven:number===5?'随天禽寄'+TRIGRAMS[lodging]:heaven[number],star:number===5?'天禽寄'+TRIGRAMS[lodging]:stars[number],door:doors[number]||'',god:gods[number]||'',marks:[...(number===5?['中五寄坤，天禽随天芮']:[]),...qimenAuxiliaryPalaceMarks(auxiliary,number)]}));
  const patterns=calculateQimenPatterns(palaces);
  const stemTombs=calculateQimenStemTombs(palaces);
  for(const palace of palaces) palace.marks.push(...qimenPatternPalaceMarks(patterns,palace.number));
  return { available:true,dun:yang?'阳遁':'阴遁',ju,yuan,solarTerm,xun:`${xunGanZhi}（遁${hiddenStem}）`,chiefStar,chiefDoor,
    palaces,
    reasons,warnings:['奇门用于出生盘的传统文化参考；未建立姓名落宫算法，不用于宣称名字已验算吉凶。','结构辅助已核查门迫、天盘宽式六仪击刑、所选三奇入墓与星门整层原位或对宫；四害解除、真假空及姓名验局尚未启用。时旬空与时驿马只作固定地支宫位标记。','三元采用甲己符头规则，不采用交节后每120小时换元，也不启用超神接气置闰。','另列qimen-go固定十干墓支表参考，按实际显式天盘主、寄干核对；甲未直接观测，不与原三奇读法合并。'],version:QIMEN_V4_RULE_VERSION,auxiliary,patterns,stemTombs
  };
}

export function analyzeProfileV8(profile: BirthProfile): Analysis {
  const context=resolveBirthContext(profile);
  const clock=resolveBirthCalculationClock(profile,context),solar=clock.trace.basis==='apparent-solar';
  const civil=calculateLegacyBazi(profile,context);
  const chosen=clock.clock?calculateLegacyBazi(profile,{...context,local:clock.clock}):civil;
  const base={...chosen,solarDate:profile.timeUnknown?civil.solarDate:context.local.toYmdHms(),lunarDate:civil.lunarDate,zodiac:civil.zodiac};
  if(solar){
    base.warnings=base.warnings.filter(value=>!value.includes('出生地民用日期定日柱'));
    base.warnings.push(...clock.trace.warnings);
    base.reasons=base.reasons.map(value=>value.startsWith('出生地民用时间 ')?`排盘日、时柱采用经度${clock.trace.longitude}°的真太阳钟面、00:00换日；年柱立春、月柱节令仍按原实际UTC瞬间精确交节；生肖及公农历生日显示保持原民用记录。`:value);
  }
  if(clock.trace.dayStatus==='uncertain'){
    base.warnings=base.warnings.filter(value=>!value.includes('喜用候选属于不完整资料下的初筛'));
    base.warnings.push('真太阳日界待定，日主未定，暂停喜用候选；不生成日柱或时柱。');
    base.pillars=base.pillars.filter(pillar=>pillar.label!=='日柱'&&pillar.label!=='时柱').map(pillar=>({...pillar,tenGod:'日主未定'}));
    base.elements={木:0,火:0,土:0,金:0,水:0};
    const elements:Record<string,keyof typeof base.elements>={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水',子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
    for(const pillar of base.pillars){base.elements[elements[pillar.gan]]++;base.elements[elements[pillar.zhi]]++;}
    base.favorable=[];base.unfavorable=[];base.strength='真太阳日界待定，日主及喜用候选暂停';
    base.reasons=[`出生时刻未知，实际有效区间校正后覆盖${clock.trace.dayCandidates.join('、')}；不使用12:00代表时刻选定日柱。`,'仅保留实际UTC区间内一致的年、月柱；缺失日主时不分配十神，不输出扶抑、逐月调候及从格证据。','五行数量只统计当前确定年、月柱的明干及地支本气，不以未确定的柱补齐计数。','年、月柱和奇门节气仍按原实际UTC瞬间判断，原民用公农历生日与生肖保持不变。'];
  }
  const bazi={...base,version:BAZI_V8_RULE_VERSION,timeBasis:clock.trace,...(clock.trace.dayStatus==='determined'?{evidence:calculateBaziEvidence(base,{timezone:context.timezone,timeUnknown:profile.timeUnknown,ambiguous:context.ambiguous,monthAuthorityMethod:normalizeMonthAuthorityMethod(profile.monthAuthorityMethod),seasonalMethod:normalizeSeasonalMethod(profile.seasonalMethod),ranges:[{startEpoch:context.startEpoch,endEpoch:context.endEpoch}],...(solar?{timeBasisDescription:'日、时柱按经度和均时差校正后的真太阳钟面、00:00换日；年/月交节、月令分段保持原实际UTC瞬间。公农历生日显示及生肖保持原民用记录。'+(context.ambiguous?'重复民用小时只计算第一次实际瞬间，第二次未计算。':'')}:{})})}:{})};
  let qimen: QimenChart;
  if (profile.timeUnknown) qimen={ available:false,reason:'出生时刻未知，不能生成唯一的时家奇门盘。',dun:'',ju:0,yuan:'',solarTerm:'',xun:'',chiefStar:'',chiefDoor:'',palaces:[],reasons:[],warnings:['请补充出生时刻后重新排盘。'],version:QIMEN_V4_RULE_VERSION };
  else {
    const day=bazi.pillars.find(p=>p.label==='日柱')!;
    const hour=bazi.pillars.find(p=>p.label==='时柱')!;
    const previousTerm=context.seasonal.getPrevJieQi(false);
    qimen=calculateQimenPlateV4(day.gan+day.zhi,hour.gan+hour.zhi,previousTerm.getName());
    qimen.reasons.push(`当前节气交接时刻：${previousTerm.getSolar().toYmdHms()} UTC+08:00；${solar?`日、时干支按经度${clock.trace.longitude}°的真太阳钟面、00:00换日；符头由校正日柱回溯，节气保持原实际UTC瞬间。`:`出生地时间基准 ${context.timezone}，民用午夜换日，未作真太阳时校正。`}`);
    qimen.warnings.push(...context.warnings.filter(value=>!solar||!value.includes('出生地民用日期定日柱')));
    if(solar)qimen.warnings.push(...clock.trace.warnings);
  }
  return {bazi,qimen};
}

/** Complete published1.0.20 analysis; no later monthly restrictions are added. */
export const calculateBaziV8=(profile:BirthProfile)=>analyzeProfileV8(profile).bazi;
export const calculateQimenProfileV4=(profile:BirthProfile)=>analyzeProfileV8(profile).qimen;
