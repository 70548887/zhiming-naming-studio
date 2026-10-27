import{describe,expect,it}from'vitest';
import{analyzeProfile,calculateQimenPlate,BAZI_RULE_VERSION,QIMEN_RULE_VERSION}from'../src/domain/engine';
import{analyzeProfileV7}from'../src/domain/engine-v7';
import{expectedAnalysis,expectedBazi,expectedQimen}from'../src/main/expected-analysis';
import{validBaziSnapshot,baziSnapshotStatus}from'../src/main/bazi-snapshot';
import{validQimenSnapshot}from'../src/main/qimen-snapshot';
import{validateBirthTimeInput}from'../src/shared/birth-time-basis';
import{noaaEquationOfTime}from'../src/shared/apparent-solar';
import{calculateLegacyBazi}from'../src/domain/bazi-legacy';
import{calculateQimenProfileV2}from'../src/domain/qimen-v2';
import type{BirthProfile}from'../src/shared/types';

const profile=(extra:Partial<BirthProfile>={}):BirthProfile=>({id:'solar-engine',customerName:'真太阳时隔离',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'00:30:00',timeUnknown:false,leapMonth:false,birthPlace:'乌鲁木齐',timezone:'Asia/Shanghai',notes:'',...extra});
const solar=(extra:Partial<BirthProfile>={})=>profile({timeBasis:'apparent-solar',birthLongitude:87.6168,...extra});
const pillarValues=(value:ReturnType<typeof analyzeProfile>)=>value.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi);

describe('selected solar clock changes actual day/hour pillars without moving the birth instant or terms',()=>{
 it('preserves every existing civil value and adds only the new version, evidence metadata and explicit clock trace',()=>{
  const p=profile(),current=analyzeProfile(p),old=analyzeProfileV7(p);
  const{evidence:currentEvidence,timeBasis,monthFollowingRestrictions,...currentBase}=current.bazi,{evidence:oldEvidence,...oldBase}=old.bazi;
  expect({...currentBase,version:oldBase.version}).toEqual(oldBase);expect(timeBasis).toMatchObject({basis:'civil',longitude:null,dayStatus:'determined',calculationDateTime:'2024-02-10 00:30:00'});
  expect({...currentEvidence,version:oldEvidence!.version,profile:oldEvidence!.profile}).toEqual(oldEvidence);
  expect({...current.qimen,version:old.qimen.version}).toEqual(old.qimen);
 });
 it('moves midnight-crossing day and hour together, but preserves civil lunar birthday and zodiac',()=>{
  const p=solar(),a=analyzeProfile(p),civil=analyzeProfile(profile());
  expect(pillarValues(a)).toEqual(['甲辰','丙寅','癸卯','癸亥']);expect(pillarValues(civil)).toEqual(['甲辰','丙寅','甲辰','甲子']);
  expect(a.bazi.solarDate).toBe('2024-02-10 00:30:00');expect(a.bazi.lunarDate).toBe(civil.bazi.lunarDate);expect(a.bazi.zodiac).toBe('龙');
  expect(a.bazi.timeBasis).toMatchObject({basis:'apparent-solar',actualUtc:'2024-02-09T16:30:00.000Z',civilDate:'2024-02-10',dayCandidates:['2024-02-09'],dayStatus:'determined',yearMonthBasis:'actual-instant'});
  expect(a.bazi.timeBasis!.calculationDateTime).toMatch(/^2024-02-09 22:/);expect(a.bazi.evidence!.dayMaster.stem).toBe('癸');expect(a.bazi.evidence!.timeBasis.description).toContain('真太阳钟面');
  const plate=calculateQimenPlate('癸卯','癸亥',a.qimen.solarTerm);expect(a.qimen.palaces).toEqual(plate.palaces);expect(a.qimen.yuan).toBe(plate.yuan);expect(a.qimen.reasons.join('')).toContain('符头由校正日柱回溯');
 });
 it('keeps year, month, monthly intervals and Qimen term on the actual Li Chun instant',()=>{
  for(const time of ['16:26:30','16:27:30']){
   const p=solar({birthDate:'2024-02-04',birthTime:time,seasonalMethod:'qiongtong-2294674-initial/1.0.0',monthAuthorityMethod:'sanming-first-paragraph/1.0.0'}),a=analyzeProfile(p),civil=analyzeProfile({...p,timeBasis:'civil'});
   expect(a.bazi.pillars.slice(0,2)).toEqual(civil.bazi.pillars.slice(0,2));expect(a.qimen.solarTerm).toBe(civil.qimen.solarTerm);expect(a.bazi.evidence!.monthAuthority).toEqual(civil.bazi.evidence!.monthAuthority);
  }
  expect(analyzeProfile(solar({birthDate:'2024-02-04',birthTime:'16:26:30'})).qimen.solarTerm).toBe('大寒');expect(analyzeProfile(solar({birthDate:'2024-02-04',birthTime:'16:27:30'})).qimen.solarTerm).toBe('立春');
 });
 it('uses the actual summer offset once, rejects nonexistent clocks, and preserves first occurrence on folds',()=>{
  const p=solar({birthDate:'2024-07-01',birthTime:'12:30',timezone:'America/New_York',birthLongitude:-74.006}),a=analyzeProfile(p),point=a.bazi.timeBasis!.points[0];
  expect(a.bazi.timeBasis!.actualUtc).toBe('2024-07-01T16:30:00.000Z');expect(point.utcOffsetMinutes).toBe(-240);expect(point.longitudeMinutes).toBeCloseTo(-56.024,8);expect(point.correctionMinutes).toBeCloseTo(point.longitudeMinutes+point.equationOfTimeMinutes,10);expect(point.clockDateTime).toMatch(/^2024-07-01 11:/);
  expect(()=>analyzeProfile(solar({birthDate:'2024-03-10',birthTime:'02:30',timezone:'America/New_York',birthLongitude:-74}))).toThrow('不存在');
  const fold=analyzeProfile(solar({birthDate:'2024-11-03',birthTime:'01:30',timezone:'America/New_York',birthLongitude:-74}));expect(fold.bazi.timeBasis!.actualUtc).toBe('2024-11-03T05:30:00.000Z');expect(fold.bazi.evidence!.timeBasis.ambiguous).toBe(true);expect(fold.bazi.warnings.join('')).toContain('第一次');
 });
 it('withholds the day master and all dependent evidence for an unknown full interval crossing solar midnight',()=>{
  const a=analyzeProfile(solar({timeUnknown:true,birthTime:''}));
  expect(a.bazi.pillars.map(p=>p.label)).toEqual(['年柱','月柱']);expect(a.bazi.pillars.every(p=>p.tenGod==='日主未定')).toBe(true);expect(a.bazi.favorable).toEqual([]);expect(a.bazi.unfavorable).toEqual([]);expect(a.bazi.evidence).toBeUndefined();
  expect(a.bazi.timeBasis).toMatchObject({actualUtc:null,calculationDateTime:null,dayCandidates:['2024-02-09','2024-02-10'],dayStatus:'uncertain'});expect(a.bazi.timeBasis!.points.map(p=>p.label)).toEqual(['start','end']);expect(a.bazi.timeBasis!.points[0].equationOfTimeMinutes).not.toBe(a.bazi.timeBasis!.points[1].equationOfTimeMinutes);
  expect(Object.values(a.bazi.elements).reduce((a,b)=>a+b,0)).toBe(4);expect(a.qimen.available).toBe(false);expect(a.qimen.palaces).toEqual([]);
  expect(a.bazi.warnings.join('')).not.toContain('喜用候选属于不完整资料下的初筛');expect(a.bazi.warnings.join('')).toContain('日主未定，暂停喜用候选');
 });
 it('permits zero certain pillars on an unknown Li Chun date, rather than fabricating a representative day',()=>{
  const a=analyzeProfile(solar({birthDate:'2024-02-04',timeUnknown:true,birthTime:''}));expect(a.bazi.pillars).toEqual([]);expect(a.bazi.evidence).toBeUndefined();expect(a.bazi.favorable).toEqual([]);expect(Object.values(a.bazi.elements)).toEqual([0,0,0,0,0]);expect(a.qimen.available).toBe(false);
 });
 it('can retain a certain solar day on a short DST date without filling a birth hour',()=>{
  const a=analyzeProfile(solar({birthDate:'2024-03-10',birthTime:'',timeUnknown:true,timezone:'America/New_York',birthLongitude:-72.4}));
  expect(a.bazi.timeBasis!.dayStatus).toBe('determined');expect(a.bazi.timeBasis!.dayCandidates).toEqual(['2024-03-10']);expect(a.bazi.pillars.some(p=>p.label==='日柱')).toBe(true);expect(a.bazi.pillars.some(p=>p.label==='时柱')).toBe(false);expect(a.bazi.evidence).toBeDefined();expect(a.qimen.available).toBe(false);
 });
 it('validates the method and full longitude domain, and never infers longitude from place or timezone',()=>{
  for(const longitude of [-180,0,180])expect(()=>analyzeProfile(solar({birthLongitude:longitude}))).not.toThrow();
  for(const value of [NaN,Infinity,-180.0001,180.0001,'87',null])expect(()=>analyzeProfile(solar({birthLongitude:value as number}))).toThrow('经度');
  expect(()=>analyzeProfile({...solar(),birthLongitude:undefined})).toThrow('经度');expect(()=>validateBirthTimeInput({timeBasis:'bad' as never})).toThrow('基准');
 });
 it('keeps a known model result near midnight and emits a review reminder without claiming an error band',()=>{
  const instant=Date.UTC(2024,1,10,0,0),equation=noaaEquationOfTime(instant).equationOfTimeMinutes;
  const a=analyzeProfile(solar({birthTime:'00:00',timezone:'UTC',birthLongitude:(.5-equation)/4}));
  expect(a.bazi.timeBasis!.calculationDateTime).toBe('2024-02-10 00:00:30');expect(a.bazi.timeBasis!.dayStatus).toBe('determined');expect(a.bazi.pillars).toHaveLength(4);expect(a.qimen.available).toBe(true);
  expect(a.bazi.timeBasis!.warnings.join('')).toContain('并非公式误差界');expect(a.bazi.timeBasis!.policies.join('')).toContain('保留按模型估算的点结果');
 });
 it('retains all three possible solar dates on a long DST day whose interval straddles two midnights',()=>{
  const a=analyzeProfile(solar({birthDate:'2024-11-03',birthTime:'',timeUnknown:true,timezone:'America/New_York',birthLongitude:-65}));
  expect(a.bazi.timeBasis!.dayCandidates).toEqual(['2024-11-02','2024-11-03','2024-11-04']);expect(a.bazi.timeBasis!.dayStatus).toBe('uncertain');expect(a.bazi.evidence).toBeUndefined();expect(a.bazi.pillars.every(p=>!['日柱','时柱'].includes(p.label))).toBe(true);
 });
});

describe('solar clock snapshots and expected-calculation cache bind method and longitude',()=>{
 it('does not share computations across longitude or method, rejects forged trace and never mutates frozen calculations',()=>{
  const p=solar(),a=expectedAnalysis(p),same=expectedAnalysis({...p,birthPlace:'无关地址',customerName:'其他客户'});
  expect(a).toBe(same);expect(Object.isFrozen(a.bazi.timeBasis!.points)).toBe(true);expect(expectedAnalysis({...p,birthLongitude:88})).not.toBe(a);expect(expectedAnalysis({...p,timeBasis:'civil'})).not.toBe(a);
  expect(validBaziSnapshot(a.bazi,p)).toBe(true);expect(validQimenSnapshot(a.qimen as never,a.bazi as never,p)).toBe(true);
  const forged=structuredClone(a.bazi) as ReturnType<typeof analyzeProfile>['bazi'];forged.timeBasis!.points[0].equationOfTimeMinutes+=1;expect(validBaziSnapshot(forged,p)).toBe(false);expect(validBaziSnapshot(a.bazi,{...p,birthLongitude:88})).toBe(false);
  const wrongDay=structuredClone(a.bazi) as ReturnType<typeof analyzeProfile>['bazi'];wrongDay.pillars.find(p=>p.label==='日柱')!.gan='甲';expect(validQimenSnapshot(a.qimen as never,wrongDay,p)).toBe(false);
 });
 it('rejects solar profiles bound to frozen civil labels and keeps a genuine old civil snapshot old',()=>{
  const p=solar(),legacy=analyzeProfileV7(profile());expect(()=>expectedBazi(p,legacy.bazi.version)).toThrow('旧版');expect(()=>expectedQimen(p,legacy.qimen.version)).toThrow('旧版');
  expect(baziSnapshotStatus(legacy.bazi,profile())).toBe('verified-legacy');expect(validQimenSnapshot(legacy.qimen,legacy.bazi,profile())).toBe(true);expect(baziSnapshotStatus(legacy.bazi,p)).toBe('invalid');expect(validQimenSnapshot(legacy.qimen,legacy.bazi,p)).toBe(false);
  expect(BAZI_RULE_VERSION).toContain('1.9.0');expect(QIMEN_RULE_VERSION).toContain('1.4.0');
 });
 it('does not let the old unknown-hour empty-plate branch accept a newly solar-bound profile',()=>{
  const civil=profile({timeUnknown:true,birthTime:''}),bazi=calculateLegacyBazi(civil),old=calculateQimenProfileV2(civil);
  expect(validQimenSnapshot(old,bazi,civil)).toBe(true);expect(validQimenSnapshot(old,bazi,{...civil,timeBasis:'apparent-solar',birthLongitude:87.6168})).toBe(false);
 });
});
