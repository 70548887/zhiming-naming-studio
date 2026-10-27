import {describe,expect,it} from 'vitest';
import sourceCases from './fixtures/ditian-ren-independent-case-expectations.json';
import {analyzeProfile,BAZI_RULE_VERSION,BAZI_REN_RULE_VERSION,BAZI_REN_V1_RULE_VERSION} from '../src/domain/engine';
import {calculateRenCommentary,validRenCommentaryAnalysis,renNecessaryRules} from '../src/domain/ditian-ren';
import {calculateRenCommentary as oldCalculation} from '../src/domain/ditian-ren-v1';
import {REN_METHOD,LEGACY_REN_METHOD,normalizeRenMethod} from '../src/shared/ren-method';
import type {BaziAnalysis,BirthProfile,Pillar,RenCommentaryAnalysis} from '../src/shared/types';
const profile:BirthProfile={id:'necessary-domain',customerName:'必要条件隔离验证',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2020-01-04',birthTime:'00:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',renMethod:REN_METHOD};
const checks=(ren:RenCommentaryAnalysis)=>ren.necessaryConditions!.checks;
function fromSource(id:string){const source=sourceCases.cases.find(item=>item.caseId===id)!;const base=analyzeProfile(profile).bazi;const bazi:BaziAnalysis={...base,pillars:source.pillars.map((ganzhi,index)=>({label:['年柱','月柱','日柱','时柱'][index],gan:ganzhi[0],zhi:ganzhi[1],element:'',hidden:[],tenGod:''}) as Pillar)};return {source,bazi,ren:calculateRenCommentary(profile,bazi)!};}
describe('Ren1.1 returns actual finite necessary-member judgements without claiming full formation',()=>{
  it('contradicts the wealth wording only for a complete actual chart with no exposed or hidden wealth',()=>{
    const analysis=analyzeProfile(profile),ren=analysis.renCommentary!;expect(analysis.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(['己亥','丙子','丙午','戊子']);
    expect(checks(ren).map(check=>check.status)).toEqual(['contradicted','not-excluded']);expect(checks(ren)[0]).toMatchObject({complete:true,dayStem:'丙',matchedNodeIds:[],doesNotResolveFormation:true});
    expect(checks(ren)[0].evidence.join('')).toContain('仅本条所选字面必要前提不符');expect(ren.formationDecision).toBe('unresolved');expect(ren.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);
  });
  it('contradicts the broad prerequisite of output in the month only when all selected exposed and hidden output is absent',()=>{
    const a=analyzeProfile({...profile,birthDate:'2020-03-13',birthTime:'06:30:00'}),ren=a.renCommentary!;expect(a.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(['庚子','己卯','乙卯','己卯']);
    expect(checks(ren).map(check=>check.status)).toEqual(['not-excluded','contradicted']);expect(checks(ren)[1].matchedNodeIds).toEqual([]);expect(checks(ren)[1].missing.join('')).toContain('提纲窄范围仍待核');expect(ren.formationDecision).toBe('unresolved');
  });
  it('does not exclude known hidden wealth and preserves the source author label as a separate field',()=>{
    const {ren}=fromSource('child-bing-chou'),wealth=checks(ren)[0];expect(wealth.status).toBe('not-excluded');expect(wealth.positions.every(position=>position.includes('藏辛'))).toBe(true);
    expect(wealth.evidence.join('')).toContain('不证明有效作用或成格');expect(ren.sourceCaseMatches[0].authorAssertion).toBe('格成火土从儿');
    expect(ren.observations.find(item=>item.id==='child:wealth:exposed')!.state).toBe('not-listed');expect(ren.structureGraph.nodes.filter(node=>wealth.matchedNodeIds.includes(node.id)).every(node=>node.layer==='hidden')).toBe(true);
  });
  it('keeps month-main-qi and month-all-hidden shortages from becoming a rejection when the broad output set exists',()=>{
    const {ren}=fromSource('child-jia-chou');expect(ren.observations.find(item=>item.id==='child:month-main-output')!.state).toBe('not-listed');expect(ren.observations.find(item=>item.id==='child:month-all-hidden-output')!.state).toBe('not-listed');
    expect(checks(ren)[1].status).toBe('not-excluded');expect(checks(ren)[1].evidence.join('')).toContain('上位集合');expect(checks(ren)[1].missing.join('')).toContain('未证明其有效或确在任注所说的提纲');
  });
  it.each(['child-not-wei','child-alternative-resource'])('does not call both memberships sufficient when the author uses another judgement: %s',id=>{
    const {ren}=fromSource(id);expect(checks(ren).map(check=>check.status)).toEqual(['not-excluded','not-excluded']);expect(ren.sourceCaseMatches[0].classificationEvidence).toMatch(/negative|alternative/);expect(checks(ren).every(check=>check.doesNotResolveFormation)).toBe(true);
  });
  it('returns unknown for absent targets in partial pillars and never uses noon to fill the missing hour',()=>{
    const a=analyzeProfile({...profile,birthTime:'',timeUnknown:true}),ren=a.renCommentary!;expect(a.bazi.pillars.map(p=>p.label)).toEqual(['年柱','月柱','日柱']);expect(checks(ren)[0].status).toBe('unknown');expect(checks(ren)[0].complete).toBe(false);expect(checks(ren)[1].status).toBe('not-excluded');expect(ren.sourceCaseMatches).toEqual([]);
  });
  it('can retain observed existence without a known hour while keeping effective action unresolved',()=>{
    const a=analyzeProfile({...profile,birthDate:'1902-11-24',birthTime:'',timeUnknown:true}),ren=a.renCommentary!;expect(checks(ren).map(check=>check.status)).toEqual(['not-excluded','not-excluded']);expect(checks(ren).every(check=>!check.complete)).toBe(true);expect(ren.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);
  });
  it('keeps both relative checks unknown when solar correction leaves the day master undetermined',()=>{
    const a=analyzeProfile({...profile,birthDate:'2024-02-10',birthTime:'',timeUnknown:true,timeBasis:'apparent-solar',birthLongitude:87.6168}),ren=a.renCommentary!;
    expect(a.bazi.evidence).toBeUndefined();expect(checks(ren).map(check=>check.status)).toEqual(['unknown','unknown']);expect(checks(ren).every(check=>check.dayStem===undefined&&check.matchedNodeIds.length===0&&!check.complete)).toBe(true);expect(ren.input.pillars.some(p=>p.position==='day'&&p.known)).toBe(false);
  });
});
describe('all original source cases constrain necessity without changing author labels or the old graph',()=>{
  const childPositives=['child-gui-spring-1','child-gui-spring-2','child-bing-chou','child-bing-wei','child-jia-chou','child-wu-chen','child-xin-winter-1','child-xin-winter-2','child-wood-fire'];
  it.each(sourceCases.cases)('preserves original fields and source classification: $caseId',source=>{
    const {bazi,ren}=fromSource(source.caseId),old=oldCalculation({...profile,renMethod:LEGACY_REN_METHOD},{...bazi,version:BAZI_REN_V1_RULE_VERSION})!;
    const {necessaryConditions,...without}=ren;expect({...without,version:old.version,profileId:old.profileId,input:{...without.input,baziVersion:old.input.baziVersion},sourceRules:without.sourceRules.filter(ref=>ref.sourceId!=='bazi-ditian-ren-necessary-2600158')}).toEqual(old);
    if(childPositives.includes(source.caseId))expect(necessaryConditions!.checks.map(check=>check.status)).toEqual(['not-excluded','not-excluded']);
    expect(ren.sourceCaseMatches.find(item=>item.caseId===source.caseId)!.authorAssertion).toBe(source.authorAssertion);expect(ren.structureGraph).toEqual(old.structureGraph);
  });
});
describe('explicit method and version boundaries retain old1.0 and reject grafted new results',()=>{
  it('uses none/default1.9, legacy1.0/B1.10, and new1.1/B1.11 without upgrading an old selection',()=>{
    expect(normalizeRenMethod(undefined)).toBe('none');expect(normalizeRenMethod(LEGACY_REN_METHOD)).toBe(LEGACY_REN_METHOD);
    const plain=analyzeProfile({...profile,renMethod:undefined}),old=analyzeProfile({...profile,renMethod:LEGACY_REN_METHOD}),current=analyzeProfile(profile);
    expect(plain.bazi.version).toBe(BAZI_RULE_VERSION);expect(plain.renCommentary).toBeUndefined();expect(old.bazi.version).toBe(BAZI_REN_V1_RULE_VERSION);expect(old.renCommentary!.necessaryConditions).toBeUndefined();expect(current.bazi.version).toBe(BAZI_REN_RULE_VERSION);expect(current.renCommentary!.necessaryConditions).toBeDefined();
    expect({...current.bazi,version:plain.bazi.version}).toEqual(plain.bazi);expect(current.qimen).toEqual(plain.qimen);expect(old.qimen).toEqual(current.qimen);
  });
  it('canonically checks every new source, verdict and missing prerequisite while preserving old validation',()=>{
    const a=analyzeProfile(profile),ren=a.renCommentary!;expect(validRenCommentaryAnalysis(ren,profile,a.bazi)).toBe(true);
    for(const change of [(value:RenCommentaryAnalysis)=>{delete value.necessaryConditions;},(value:RenCommentaryAnalysis)=>{value.necessaryConditions!.checks[0].status='not-excluded';},(value:RenCommentaryAnalysis)=>{value.necessaryConditions!.checks[0].missing=[];},(value:RenCommentaryAnalysis)=>{value.necessaryConditions!.checks[0].sourceQuote='必要有财';},(value:RenCommentaryAnalysis)=>{value.sourceRules=value.sourceRules.filter(ref=>ref.sourceId!=='bazi-ditian-ren-necessary-2600158');}]){const altered=structuredClone(ren);change(altered);expect(validRenCommentaryAnalysis(altered,profile,a.bazi)).toBe(false);}
    expect(validRenCommentaryAnalysis(ren,{...profile,renMethod:LEGACY_REN_METHOD},{...a.bazi,version:BAZI_REN_V1_RULE_VERSION})).toBe(false);expect(validRenCommentaryAnalysis(ren,{...profile,birthDate:'2020-01-05'},a.bazi)).toBe(false);
    const oldProfile={...profile,renMethod:LEGACY_REN_METHOD},old=analyzeProfile(oldProfile);expect(validRenCommentaryAnalysis(old.renCommentary,oldProfile,old.bazi)).toBe(true);expect(validRenCommentaryAnalysis(old.renCommentary,profile,a.bazi)).toBe(false);
    const extra=structuredClone(ren) as any;extra.necessaryConditions.extra=undefined;expect(validRenCommentaryAnalysis(extra,profile,a.bazi)).toBe(false);const symbol=structuredClone(ren) as any;symbol.necessaryConditions.checks[Symbol('extra')]='x';expect(validRenCommentaryAnalysis(symbol,profile,a.bazi)).toBe(false);
  });
  it('retains the full quoted necessary context and fresh metadata for consumers',()=>{
    const rules=renNecessaryRules();expect(rules).toHaveLength(2);for(const rule of rules){expect(rule.sourceQuote).toContain('必要局中有财');expect(rule.sourceQuote).toContain('必要食伤在提纲');expect(rule.sourceQuote).toContain('四柱虽有比劫');}
    rules[0].sourceQuote='改变';expect(renNecessaryRules()[0].sourceQuote).not.toBe('改变');
  });
});
