import type { BaziAnalysis, BirthProfile, Element, Pillar } from '../shared/types';
import { resolveBirthContext, type BirthContext } from '../shared/civil-birth-v1';

/** Frozen 1.0.0 output profile. New evidence never rewrites saved legacy snapshots or its weights. */
export const LEGACY_BAZI_RULE_VERSION='civil-midnight-fuyi-candidate/1.0.0;lunar-typescript/1.8.6';
const GAN = [...'甲乙丙丁戊己庚辛壬癸'];
const ZHI = [...'子丑寅卯辰巳午未申酉戌亥'];
const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];
const GAN_ELEMENT: Record<string, Element> = { 甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水' };
const ZHI_ELEMENT: Record<string, Element> = { 子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水' };
// Standard 本气、中气、余气 order; the weights below are an explicit heuristic, not a classical numerical formula.
const HIDDEN: Record<string, string[]> = { 子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲'] };
const mod = (n: number, divisor: number) => ((n % divisor) + divisor) % divisor;
const generatedBy = (element: Element): Element => ELEMENTS[mod(ELEMENTS.indexOf(element)-1, 5)];
const generates = (element: Element): Element => ELEMENTS[mod(ELEMENTS.indexOf(element)+1, 5)];
const controls = (element: Element): Element => ELEMENTS[mod(ELEMENTS.indexOf(element)+2, 5)];
const controlledBy = (element: Element): Element => ELEMENTS[mod(ELEMENTS.indexOf(element)+3, 5)];
const emptyElements = (): Record<Element, number> => ({ 木:0,火:0,土:0,金:0,水:0 });
const pad = (n: number) => String(n).padStart(2, '0');

function tenGod(dayGan: string, gan: string): string {
  const self=GAN_ELEMENT[dayGan], other=GAN_ELEMENT[gan];
  const samePolarity=GAN.indexOf(dayGan)%2===GAN.indexOf(gan)%2;
  if (self===other) return samePolarity?'比肩':'劫财';
  if (generates(self)===other) return samePolarity?'食神':'伤官';
  if (controls(self)===other) return samePolarity?'偏财':'正财';
  if (controlledBy(self)===other) return samePolarity?'七杀':'正官';
  return samePolarity?'偏印':'正印';
}

function makePillar(label: string, gz: string, dayGan: string): Pillar {
  const [gan,zhi] = [...gz];
  return { label,gan,zhi,element:GAN_ELEMENT[gan]+ZHI_ELEMENT[zhi],hidden:[...HIDDEN[zhi]],tenGod:label==='日柱'?'日主':tenGod(dayGan,gan) };
}

export function calculateLegacyBazi(profile: BirthProfile, context: BirthContext = resolveBirthContext(profile,{legacyUnknownDayEndpoints:true})): BaziAnalysis {
  const {local,seasonal,startSeasonal,endSeasonal}=context;
  const localLunar=local.getLunar();
  const day=localLunar.getDayInGanZhiExact2();
  const dayGan=day[0];
  const warnings=[...context.warnings,'五行明字数量仅为天干与地支本气计数，不代表喜用神；扶抑结果为规则候选，特殊格局须人工复核。'];
  const pillars: Pillar[]=[];
  const yearUncertain=profile.timeUnknown && startSeasonal.getYearInGanZhiExact()!==endSeasonal.getYearInGanZhiExact();
  const monthUncertain=profile.timeUnknown && startSeasonal.getMonthInGanZhiExact()!==endSeasonal.getMonthInGanZhiExact();
  if (!yearUncertain) pillars.push(makePillar('年柱',seasonal.getYearInGanZhiExact(),dayGan));
  else warnings.push('出生时刻未知且当日跨立春，年柱待定，未纳入计数或喜用推断。');
  if (!monthUncertain) pillars.push(makePillar('月柱',seasonal.getMonthInGanZhiExact(),dayGan));
  else warnings.push('出生时刻未知且当日交节，月柱待定，未纳入计数或喜用推断。');
  pillars.push(makePillar('日柱',day,dayGan));
  if (!profile.timeUnknown) {
    const branchIndex=Math.floor((local.getHour()+1)/2)%12;
    // Explicit five-rat rule ties the time stem to the midnight-switch day. The library's time stem uses its own 23:00 convention.
    const stemIndex=(GAN.indexOf(dayGan)%5*2+branchIndex)%10;
    pillars.push(makePillar('时柱',GAN[stemIndex]+ZHI[branchIndex],dayGan));
  } else warnings.push('出生时刻未知：仅列确定的柱，不生成时柱；喜用候选属于不完整资料下的初筛。');

  const elements=emptyElements(), weighted=emptyElements();
  for (const pillar of pillars) {
    elements[GAN_ELEMENT[pillar.gan]]++;
    elements[ZHI_ELEMENT[pillar.zhi]]++;
    weighted[GAN_ELEMENT[pillar.gan]]+=1;
    const weights=pillar.hidden.length===1?[1]:pillar.hidden.length===2?[.7,.3]:[.6,.25,.15];
    pillar.hidden.forEach((gan,index)=>weighted[GAN_ELEMENT[gan]]+=weights[index]*(pillar.label==='月柱'?2:1));
  }
  const self=GAN_ELEMENT[dayGan], resource=generatedBy(self);
  const total=Object.values(weighted).reduce((sum,n)=>sum+n,0);
  const share=(weighted[self]+weighted[resource])/total;
  const roots=pillars.filter(p=>p.hidden.some(g=>GAN_ELEMENT[g]===self)).map(p=>p.label+p.zhi);
  const exposed=pillars.filter(p=>p.label!=='日柱' && [self,resource].includes(GAN_ELEMENT[p.gan])).map(p=>p.label+p.gan);
  let favorable: Element[]=[],unfavorable: Element[]=[],strength='接近平衡，候选结论不唯一';
  if (!monthUncertain && share<.38) { strength='扶抑初筛：日主偏弱';favorable=[resource,self];unfavorable=[generates(self),controls(self)]; }
  if (!monthUncertain && share>.55) { strength='扶抑初筛：日主偏强';favorable=[generates(self),controls(self),controlledBy(self)];unfavorable=[self,resource]; }
  if (monthUncertain) strength='月令待定，暂不输出喜用候选';
  const month=pillars.find(p=>p.label==='月柱');
  const season = month?.zhi;
  const seasonalAdvice=!season ? '月令待定，调候建议暂缺。' : '亥子丑'.includes(season)
    ? '冬月偏寒，调候可关注温暖、向阳的火意象；是否适用仍须结合全局，调候意见不自动覆盖扶抑候选。'
    : '巳午未'.includes(season)
      ? '夏月偏热，调候可关注清润、涵养的水意象；是否适用仍须结合全局，调候意见不自动覆盖扶抑候选。'
      : '寅卯辰'.includes(season) ? '春月关注木气与寒暖燥湿的具体组合，暂不按季节机械指定补益元素。' : '秋月关注燥润与金气的具体组合，暂不按季节机械指定补益元素。';
  return {
    solarDate:local.toYmd()+(profile.timeUnknown?' 时刻未知':` ${pad(local.getHour())}:${pad(local.getMinute())}`),
    lunarDate:localLunar.getYearInChinese()+'年'+localLunar.getMonthInChinese()+'月'+localLunar.getDayInChinese(),
    zodiac:localLunar.getYearShengXiao(),pillars,elements,favorable,unfavorable,strength,
    reasons:[
      `日主${dayGan}${self}；${month ? `月令${month.zhi}${ZHI_ELEMENT[month.zhi]}`:'月令未定'}。`,
      `通根检查（地支藏干含日主同类）：${roots.join('、')||'未见'}；同类或印星透干：${exposed.join('、')||'未见'}。`,
      '扶抑候选使用本产品可解释启发式：透干权重1，支藏干本/中/余气按1或0.7/0.3或0.6/0.25/0.15，月支权重2；此权重不是古籍定量公式。',
      `比印加权占比${Math.round(share*100)}%，小于38%初筛偏弱，大于55%初筛偏强，其余保留多解；候选按生扶或泄耗制衡关系选择，不按缺项选择。`,
      `出生地民用时间 ${context.timezone}，00:00换日；年柱立春、月柱节令，以精确交节时刻划分；生肖按农历年，可能与年柱年界不同。`
    ],seasonalAdvice,warnings,version:LEGACY_BAZI_RULE_VERSION,
    ruleDescription:'扶抑启发式候选：月令加权、通根、透干及生克关系；不处理从格、化气格和天干地支合化，不能替代起名师的流派判断。'
  };
}

