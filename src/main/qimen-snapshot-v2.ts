/** Frozen pre-ten-stem Qimen validator, preserving1.0/1.1/1.2 routes. */
import { LunarUtil } from 'lunar-typescript';
import { QIMEN_V2_RULE_VERSION as QIMEN_RULE_VERSION } from '../domain/qimen-v2';
import { expectedAnalysis,expectedQimen } from './expected-analysis';
import { qimenAuxiliaryPalaceMarks, validQimenAuxiliarySnapshot } from '../domain/qimen-markers';
import { qimenPatternPalaceMarks, validQimenPatternsSnapshot } from '../domain/qimen-patterns';
import type { BaziAnalysis, BirthProfile, QimenChart } from '../shared/types';

/** Old records stay as recorded. New marker snapshots must match their hour and displayed palace marks. */
export function validQimenSnapshotV2(q: QimenChart, b: BaziAnalysis, profile?: BirthProfile): boolean {
  if(!['zhuanpan-chaibu-futou-kun2/1.0.0','zhuanpan-chaibu-futou-kun2/1.1.0',QIMEN_RULE_VERSION].includes(q.version))return false;
  if(q.stemTombs!==undefined)return false;
  if (!q.available) return q.auxiliary === undefined && q.patterns === undefined && !!profile?.timeUnknown
    &&q.ju===0&&['dun','yuan','solarTerm','xun','chiefStar','chiefDoor'].every(key=>q[key as keyof QimenChart]==='')&&Array.isArray(q.palaces)&&q.palaces.length===0;
  // The core rotating plate did not change across these three publications. Verify
  // its frozen assignments even when later auxiliary/structural fields were absent.
  if(!profile||profile.timeUnknown)return false;
  try{
    const reconstructed=expectedAnalysis(profile),expected=expectedQimen(profile,QIMEN_RULE_VERSION);
    const day=b.pillars.find(item=>item.label==='日柱'),hour=b.pillars.find(item=>item.label==='时柱');
    const actualDay=reconstructed.bazi.pillars.find(item=>item.label==='日柱'),actualHour=reconstructed.bazi.pillars.find(item=>item.label==='时柱');
    if(!day||!hour||!actualDay||!actualHour||day.gan+day.zhi!==actualDay.gan+actualDay.zhi||hour.gan+hour.zhi!==actualHour.gan+actualHour.zhi)return false;
    if(['dun','ju','yuan','solarTerm','xun','chiefStar','chiefDoor'].some(key=>q[key as keyof QimenChart]!==expected[key as keyof QimenChart]))return false;
    if(!Array.isArray(q.palaces)||q.palaces.length!==9||new Set(q.palaces.map(item=>item.number)).size!==9)return false;
    for(const palace of q.palaces){const base=expected.palaces.find(item=>item.number===palace.number);if(!base||['direction','trigram','earth','heaven','star','door','god'].some(key=>palace[key as keyof typeof palace]!==base[key as keyof typeof base]))return false;}
  }catch{return false;}
  if (q.auxiliary === undefined) return q.patterns === undefined && q.version === 'zhuanpan-chaibu-futou-kun2/1.0.0' && q.palaces.every(p => {
    const expected = p.number === 5 ? ['中五寄坤，天禽随天芮'] : [];
    return p.marks.length === expected.length && p.marks.every((mark, i) => mark === expected[i]);
  });
  const legacy = q.version === 'zhuanpan-chaibu-futou-kun2/1.1.0';
  if ((!legacy && q.version !== QIMEN_RULE_VERSION) || !validQimenAuxiliarySnapshot(q.auxiliary)) return false;
  if (legacy ? q.patterns !== undefined : !validQimenPatternsSnapshot(q.patterns, q.palaces)) return false;
  const hour = b.pillars.find(p => p.label === '时柱');
  if (!hour || hour.gan + hour.zhi !== q.auxiliary.hourGanzhi) return false;
  const index = LunarUtil.getJiaZiIndex(q.auxiliary.hourGanzhi);
  const head = '甲' + [...'子戌申午辰寅'][Math.floor(index / 10)];
  const hidden = [...'戊己庚辛壬癸'][Math.floor(index / 10)];
  if (q.xun !== `${head}（遁${hidden}）`) return false;
  return q.palaces.every(p => {
    const expected = [...(p.number === 5 ? ['中五寄坤，天禽随天芮'] : []), ...qimenAuxiliaryPalaceMarks(q.auxiliary!, p.number), ...qimenPatternPalaceMarks(q.patterns, p.number)];
    return p.marks.length === expected.length && p.marks.every((mark, i) => mark === expected[i]);
  });
}
