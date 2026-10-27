import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import published from './fixtures/ren-session-1.0.25.json';
import {analyzeProfile,BAZI_REN_ACTION_RULE_VERSION,BAZI_REN_CAPACITY_RULE_VERSION} from '../src/domain/engine';
import {calculateRenCommentary,REN_CAPACITY_COMMENTARY_VERSION,validRenCommentaryAnalysis} from '../src/domain/ditian-ren';
import {calculateRenCapacityAnalysis,renCapacityRules,validRenCapacityAnalysis} from '../src/domain/ren-capacities';
import {REN_ACTION_METHOD,REN_CAPACITY_METHOD,normalizeRenMethod} from '../src/shared/ren-method';
import type {BirthProfile,NamingSession,RenCommentaryAnalysis} from '../src/shared/types';

const plain=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const profile:BirthProfile={id:'ren-capacity-real',customerName:'木局有限能力独立验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2012-03-15',birthTime:'14:00:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'已知公历输入；不由原书命局反造出生日期',renMethod:REN_CAPACITY_METHOD};
const expected=[
  {birthDate:'2012-03-15',birthTime:'14:00:00',pillars:['壬辰','癸卯','乙亥','癸未'],chen:'year:branch:辰',targets:['month:branch:卯','day:branch:亥','hour:branch:未']},
  {birthDate:'2003-04-01',birthTime:'22:00:00',pillars:['癸未','乙卯','甲辰','乙亥'],chen:'day:branch:辰',targets:['year:branch:未','month:branch:卯','hour:branch:亥']}
];

describe('source-sufficient wood-group and specific 辰 support capacities',()=>{
  it.each(expected)('proves both local positive abilities on the real date $birthDate without scalar force or case labels',example=>{
    const result=analyzeProfile({...profile,birthDate:example.birthDate,birthTime:example.birthTime});
    expect(result.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(example.pillars);
    expect(result.bazi.version).toBe(BAZI_REN_CAPACITY_RULE_VERSION);expect(result.renCommentary?.version).toBe(REN_CAPACITY_COMMENTARY_VERSION);
    const capacity=result.renCommentary!.capacityAnalysis!;
    expect(capacity.checks.map(check=>[check.kind,check.state,check.capability])).toEqual([['wood-group-strength','met','met'],['chen-wood-support-capacity','met','met']]);
    const support=capacity.checks[1];expect(support.sourceNodeIds).toEqual([example.chen]);expect(support.targetNodeIds).toEqual(example.targets);
    expect(support.sourceGeneral).toContain('能生助木神');expect(capacity.checks[0].sourceGeneral).toContain('旺之极矣');
    expect(support.sourceClauseIds).toEqual(['chen-supports-wood-group']);expect(support.productRestrictions.join('')).toContain('不是作者公布的全部必要条件');
    expect(capacity.proof.nodes.filter(n=>n.id.startsWith('capacity:')).every(n=>n.mode==='sufficient-only'&&!Object.hasOwn(n,'observed'))).toBe(true);
    expect(capacity.proof.results['capacity:chen-wood-support-capacity']).toEqual({state:'met',cycleDetected:false});
    expect(capacity.checks.every(check=>check.netEffect==='unknown')).toBe(true);expect(capacity.effectiveRootSupport).toBe('unknown');expect(capacity.strengthDecision).toBe('not-evaluated');expect(capacity.formationDecision).toBe('not-evaluated');
  });
  it('retains the actual 未 fire and 辰/未 earth while source-positive support is established',()=>{
    const result=analyzeProfile(profile).renCommentary!,nodes=result.structureGraph.nodes;
    expect(nodes.find(n=>n.id==='year:hidden:1')).toMatchObject({symbol:'戊',element:'土'});
    expect(nodes.find(n=>n.id==='hour:hidden:1')).toMatchObject({symbol:'己',element:'土'});
    expect(nodes.find(n=>n.id==='hour:hidden:2')).toMatchObject({symbol:'丁',element:'火'});
    expect(result.capacityAnalysis?.checks.every(check=>check.capability==='met')).toBe(true);
    expect(result.actionAnalysis?.rootLinks.every(root=>root.effectiveSupport==='unknown'&&root.originalNodesRetained)).toBe(true);
    expect(result.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);
    expect(result.capacityAnalysis?.limitations.join('')).toContain('辰生助能力不等于所有根联系已有效');
  });
  it('does not turn local wood strength into immunity to metal or later luck, or alter the inherited nodes',()=>{
    const current=analyzeProfile(profile).renCommentary!,prior=analyzeProfile({...profile,renMethod:REN_ACTION_METHOD}).renCommentary!,capacity=current.capacityAnalysis!;
    const strength=capacity.checks[0];expect(strength.sourceNodeIds).toEqual(['month:branch:卯','day:branch:亥','hour:branch:未','year:branch:辰']);expect(strength.targetNodeIds).toEqual(['month:branch:卯','day:branch:亥','hour:branch:未']);
    expect(strength.capability).toBe('met');expect(strength.netEffect).toBe('unknown');expect(capacity.formationDecision).toBe('not-evaluated');expect(capacity.effectiveRootSupport).toBe('unknown');
    expect(current.structureGraph.nodes).toEqual(prior.structureGraph.nodes);expect(current.structureGraph.edges).toEqual(prior.structureGraph.edges);
    expect(strength.evidence.join('')).toContain('不能推出后续金运无害');expect(capacity.limitations.join('')).toContain('不能推出木局永不受金克');
    const withMetal=analyzeProfile({...profile,birthDate:'2000-03-18'}).renCommentary!.capacityAnalysis!;expect(withMetal.checks.every(check=>check.capability==='unknown')).toBe(true);
  });
  it('adds the source capacities without changing nested1.2 results, base values or Qimen',()=>{
    const current=analyzeProfile(profile),old=analyzeProfile({...profile,renMethod:REN_ACTION_METHOD});
    expect({...current.bazi,version:old.bazi.version}).toEqual(old.bazi);expect(current.qimen).toEqual(old.qimen);
    const {capacityAnalysis,version,profileId,input,sourceRules,...rest}=current.renCommentary!;
    expect({...rest,version:old.renCommentary!.version,profileId:old.renCommentary!.profileId,input:{...input,baziVersion:BAZI_REN_ACTION_RULE_VERSION},sourceRules:sourceRules.slice(0,old.renCommentary!.sourceRules.length)}).toEqual(old.renCommentary);
    expect(capacityAnalysis?.sourceReferences.every(ref=>sourceRules.some(rule=>rule.id===ref.id&&rule.sourceId===ref.sourceId))).toBe(true);
    expect(renCapacityRules().sourceId).toBe('bazi-ditian-ren-capacities-2600158');
  });
  it('leaves a missing-hour proof and its capacity unknown, without claiming no hidden metal',()=>{
    const result=analyzeProfile({...profile,timeUnknown:true}).renCommentary!.capacityAnalysis!;
    expect(result.input.pillars[3]).toEqual({position:'hour',known:false});expect(result.checks.every(check=>check.state==='unknown'&&check.capability==='unknown')).toBe(true);
    expect(result.checks[0].facts.find(f=>f.id==='selected-metal-absent')?.state).toBe('unknown');
    expect(result.proof.results['capacity:chen-wood-support-capacity'].state).toBe('unknown');
  });
  it('keeps day and hour absent when apparent solar correction leaves the day unresolved',()=>{
    const result=analyzeProfile({...profile,timeUnknown:true,timeBasis:'apparent-solar',birthLongitude:0}).renCommentary!.capacityAnalysis!;
    expect(result.input.dayStem).toBeNull();expect(result.input.pillars.filter(p=>!p.known).map(p=>p.position)).toEqual(['day','hour']);expect(result.checks.every(check=>check.capability==='unknown')).toBe(true);
  });
  it('does not invert a failed sufficient path on a real chart containing the exact four branches and metal',()=>{
    const result=analyzeProfile({...profile,birthDate:'2000-03-18'}),capacity=result.renCommentary!.capacityAnalysis!;
    expect(result.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(['庚辰','己卯','乙亥','癸未']);
    expect(capacity.checks.every(check=>check.state==='not-met'&&check.capability==='unknown')).toBe(true);
    expect(capacity.checks[0].facts.find(f=>f.id==='selected-metal-absent')).toMatchObject({state:'not-met',nodeIds:['year:exposed:庚']});
    expect(capacity.proof.results['capacity:wood-group-strength'].state).toBe('unknown');
  });
  it('requires the actual wood group rather than the month symbol and one 辰 alone',()=>{
    const result=analyzeProfile({...profile,birthTime:'16:00:00'}),capacity=result.renCommentary!.capacityAnalysis!;
    expect(result.bazi.pillars.map(p=>p.gan+p.zhi)).toEqual(['壬辰','癸卯','乙亥','甲申']);
    expect(capacity.checks.every(check=>check.state==='not-met'&&check.capability==='unknown')).toBe(true);expect(capacity.checks[0].facts.find(f=>f.id==='selected-metal-absent')?.nodeIds).toContain('hour:hidden:1');
  });
  it.each([{label:'missing hour',timeUnknown:true,birthTime:'14:00:00'},{label:'known outside subset',timeUnknown:false,birthTime:'16:00:00'}])('describes only known nodes in the $label evidence without inventing a 未 carrier',changes=>{
    const result=analyzeProfile({...profile,...changes}).renCommentary!,capacity=result.capacityAnalysis!;
    expect(result.structureGraph.nodes.some(node=>node.layer==='branch'&&node.symbol==='未')).toBe(false);
    for(const check of capacity.checks){
      expect(check.capability).toBe('unknown');expect(check.evidence.join('')).toContain('本盘已知柱的全部所选明藏节点保留');
      expect(check.evidence.join('')).not.toContain('未中己丁乙');expect(check.evidence.join('')).not.toContain('未中丁火');
      expect(check.productRestrictions.join('')).toContain('采用域内的未藏丁火');
      expect(check.sourceNodeIds.concat(check.targetNodeIds).every(id=>result.structureGraph.nodes.some(node=>node.id===id))).toBe(true);
    }
  });
});

describe('explicit1.3 version boundary and exact historical output',()=>{
  it('requires an explicit method and matching Bazi version',()=>{
    const current=analyzeProfile(profile);expect(normalizeRenMethod(REN_CAPACITY_METHOD)).toBe(REN_CAPACITY_METHOD);
    expect(validRenCommentaryAnalysis(current.renCommentary,profile,current.bazi)).toBe(true);
    expect(()=>calculateRenCommentary(profile,{...current.bazi,version:BAZI_REN_ACTION_RULE_VERSION})).toThrow('不得嫁接');
    expect(validRenCommentaryAnalysis(current.renCommentary,{...profile,renMethod:REN_ACTION_METHOD},current.bazi)).toBe(false);
    expect(analyzeProfile({...profile,renMethod:'none'}).renCommentary).toBeUndefined();
  });
  it.each(published.provenance.records)('preserves the complete real1.0.25 current/history analysis: $key',record=>{
    const session=published.sessions[record.key as keyof typeof published.sessions] as unknown as NamingSession;
    expect(hash(session)).toBe(record.sessionJsonSha256);expect(plain(analyzeProfile(session.profile))).toEqual(session.analysis);
    expect(session.analysis.renCommentary?.capacityAnalysis).toBeUndefined();
  });
  it('rejects modified ability, target, proof premise, source or concealed JSON metadata',()=>{
    const base=analyzeProfile({...profile,renMethod:REN_ACTION_METHOD}).renCommentary!,actual=calculateRenCapacityAnalysis(base);
    expect(validRenCapacityAnalysis(actual,base)).toBe(true);
    const edits=[(v:any)=>v.checks[1].capability='unknown',(v:any)=>v.checks[1].targetNodeIds.pop(),(v:any)=>v.proof.nodes.at(-1).premises.pop(),(v:any)=>v.sourceReferences.pop(),(v:any)=>v.input.pillars[0].ganzhi='壬戌'];
    for(const edit of edits){const bad=structuredClone(actual);edit(bad);expect(validRenCapacityAnalysis(bad,base)).toBe(false);}
    const hidden=structuredClone(actual);Object.defineProperty(hidden,'concealed',{value:true});expect(validRenCapacityAnalysis(hidden,base)).toBe(false);
    let accessed=0;const bad=structuredClone(actual);Object.defineProperty(bad,'version',{get(){accessed++;return'1.0.0';},enumerable:true});expect(validRenCapacityAnalysis(bad,base)).toBe(false);expect(accessed).toBe(0);
  });
  it('rejects a changed inherited root/node or appended capacity before proof evaluation',()=>{
    const base=analyzeProfile({...profile,renMethod:REN_ACTION_METHOD}).renCommentary!;
    const node=structuredClone(base);node.structureGraph.nodes[0].symbol='庚';expect(()=>calculateRenCapacityAnalysis(node)).toThrow();
    const root=structuredClone(base);root.actionAnalysis!.rootLinks[0].hiddenStem='庚';expect(()=>calculateRenCapacityAnalysis(root)).toThrow();
    const appended=structuredClone(base);appended.capacityAnalysis=calculateRenCapacityAnalysis(base);expect(()=>calculateRenCapacityAnalysis(appended)).toThrow('未追加能力');
  });
});
