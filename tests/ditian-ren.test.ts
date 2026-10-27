import {describe,expect,it} from 'vitest';
import independent from './fixtures/ditian-ren-independent-case-expectations.json';
import sourceTable from '../data/ditian-ren-table.json';
import {analyzeProfile,BAZI_RULE_VERSION,BAZI_REN_RULE_VERSION} from '../src/domain/engine';
import {calculateRenCommentary,matchRenSourceCases,validRenCommentaryAnalysis,resolveRenDependencies} from '../src/domain/ditian-ren';
import {REN_METHOD} from '../src/shared/ren-method';
import type {BaziAnalysis,BirthProfile,Pillar} from '../src/shared/types';
const profile:BirthProfile={id:'ren-domain',customerName:'任注结构验收',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'1914-11-25',birthTime:'13:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
const selected={...profile,renMethod:REN_METHOD};
const LABELS=['年柱','月柱','日柱','时柱'];
function sourceCaseInput(id:string){const source=independent.cases.find(item=>item.caseId===id)!;const actual=analyzeProfile(profile).bazi;const bazi:BaziAnalysis={...actual,version:BAZI_REN_RULE_VERSION,pillars:source.pillars.map((gz,index)=>({label:LABELS[index],gan:gz[0],zhi:gz[1],element:'',hidden:[],tenGod:''}) as Pillar)};return {bazi,result:calculateRenCommentary(selected,bazi)!};}

describe('independent Ren commentary preserves exact original classifications and all matching source occurrences',()=>{
 it.each(independent.cases)('matches source record without rewriting its author category: $caseId',source=>{
  const matches=matchRenSourceCases(source.pillars),match=matches.find(item=>item.caseId===source.caseId)!;expect(match).toBeDefined();expect(match.authorAssertion).toBe(source.authorAssertion);expect(match.classificationEvidence).toBe(source.classificationEvidence);expect(match.quarantines.length>0).toBe(source.quarantined);expect(matches.map(item=>item.caseId)).toEqual(independent.cases.filter(item=>item.pillars.join('|')===source.pillars.join('|')).map(item=>item.caseId));
  expect(match.sourceQuote).not.toMatch(/登科|仕至|贫无立锥|生三子/);expect(match.sourceLocator).toMatch(/^oldid=2600158;codepoint\[/);
 });
 it('never turns a missing hour, nonmatching chart or chapter context into a false formation result',()=>{
  expect(matchRenSourceCases(independent.cases[0].pillars,false)).toEqual([]);expect(matchRenSourceCases(independent.cases[0].pillars.slice(0,3))).toEqual([]);expect(matchRenSourceCases(['甲子','丙寅','甲子','甲子'])).toEqual([]);
  const {result}=sourceCaseInput('false-sha-pulled-root');expect(result.sourceCaseMatches[0].status).toBe('chapter-context');expect(result.sourceCaseMatches[0].classificationEvidence).toBe('chapter-only-false');expect(result.formationDecision).toBe('unresolved');
 });
 it('retains contradictory and calendrically inconsistent source records in quarantine',()=>{
  for(const id of ['false-sha-xin','false-hua-gui-contradiction']){const {result}=sourceCaseInput(id);expect(result.sourceCaseMatches[0].status).toBe('quarantined');expect(result.formationDecision).toBe('unresolved');expect(result.sourceClaims[0].quarantined).toBe(true);}
 });
});

describe('Ren structural rules separate positions, candidate edges and unresolved effective action',()=>{
 it('records roots and exposed resources without vetoing the original following-wealth source assertion',()=>{
  const root=sourceCaseInput('cai-root').result;expect(root.structureGraph.edges.some(edge=>edge.kind==='potential-root')).toBe(true);expect(root.structureGraph.nodes.some(node=>node.layer==='hidden'&&node.symbol==='乙'&&node.branch==='未')).toBe(true);expect(root.formationDecision).toBe('source-case-only');
  const resource=sourceCaseInput('cai-resource').result;expect(resource.observations.find(item=>item.id==='relation:resource:exposed')!.state).toBe('present');expect(resource.structureGraph.nodes.filter(node=>node.symbol==='戊').every(node=>node.effectiveSupport==='unknown')).toBe(true);expect(resource.sourceCaseMatches[0].authorAssertion).toBe('从财');
 });
 it('does not require exposed wealth or a month main-qi output to validate the from-child wording',()=>{
  const hidden=sourceCaseInput('child-bing-chou').result;expect(hidden.observations.find(item=>item.id==='child:wealth:exposed')!.state).toBe('not-listed');expect(hidden.observations.find(item=>item.id==='child:wealth:hidden')!.state).toBe('present');
  const jia=sourceCaseInput('child-jia-chou').result;expect(jia.observations.find(item=>item.id==='child:month-main-output')!.state).toBe('not-listed');expect(jia.observations.find(item=>item.id==='child:month-all-hidden-output')!.state).toBe('not-listed');expect(jia.sourceCaseMatches[0].authorAssertion).toContain('从儿');
  const wu=sourceCaseInput('child-wu-chen').result;expect(wu.observations.find(item=>item.id==='child:month-main-output')!.state).toBe('not-listed');expect(wu.observations.find(item=>item.id==='child:month-exposed-output')!.state).toBe('present');
 });
 it('preserves extra peer and hidden resource facts without generic from-child rejection',()=>{
  const peer=sourceCaseInput('child-xin-winter-2').result;expect(peer.observations.find(item=>item.id==='child:peer-no-veto')!.state).toBe('present');expect(peer.sourceCaseMatches[0].authorAssertion).toContain('从儿');expect(peer.formationDecision).toBe('source-case-only');
  const print=sourceCaseInput('child-wood-fire').result;expect(print.observations.find(item=>item.id==='relation:resource:hidden')!.state).toBe('present');expect(print.structureGraph.nodes.some(node=>node.layer==='hidden'&&node.symbol==='壬')).toBe(true);
 });
 it('separates day-master combination from other exposed combinations and never treats them as transformation facts',()=>{
  const relation=sourceCaseInput('combine-transform').result;expect(relation.structureGraph.edges.filter(edge=>edge.kind==='stem-combination').every(edge=>!edge.dayMasterParticipates)).toBe(true);expect(relation.observations.find(item=>item.id==='day-combination:own')!.state).toBe('not-listed');expect(relation.observations.find(item=>item.id==='day-combination:other')!.state).toBe('present');
  expect(relation.structureGraph.actionContracts.find(contract=>contract.id==='combination-formation')!.premiseDependencies[0].state).toBe('unknown');
  const transformed=sourceCaseInput('hua-ren-2').result;expect(transformed.structureGraph.edges.some(edge=>edge.kind==='stem-combination'&&edge.dayMasterParticipates&&edge.combinationTargetElement==='木')).toBe(true);expect(transformed.observations.find(item=>item.id==='transformation:chen-no-veto')!.state).toBe('not-listed');expect(transformed.sourceCaseMatches[0].authorAssertion).toContain('更真');
 });
 it('keeps full member sets and original nodes even when exact source prose claims clash removes a root',()=>{
  const a=sourceCaseInput('false-sha-pulled-root').result;expect(a.structureGraph.edges.some(edge=>edge.kind==='branch-clash')).toBe(true);expect(a.structureGraph.nodes.some(node=>node.layer==='hidden'&&node.branch==='寅'&&node.symbol==='甲')).toBe(true);expect(a.structureGraph.edges.some(edge=>edge.kind==='potential-root')).toBe(true);
  const metal=sourceCaseInput('sha-true-metal').result;expect(metal.structureGraph.edges.some(edge=>edge.kind==='branch-sanhe')).toBe(true);expect(metal.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);expect(metal.structureGraph.nodes.every(node=>node.effectiveSupport==='unknown')).toBe(true);
 });
 it('keeps same-pillar cover/carrier and distant edges without a universal distance veto',()=>{
  const a=sourceCaseInput('false-sha-ding').result;expect(a.structureGraph.edges.filter(edge=>edge.kind==='cover-carrier')).toHaveLength(4);const remote=a.structureGraph.edges.find(edge=>edge.kind==='controls'&&edge.from.some(id=>a.structureGraph.nodes.find(node=>node.id===id)?.position==='year')&&edge.to.some(id=>a.structureGraph.nodes.find(node=>node.id===id)?.position==='hour'));expect(remote).toBeDefined();expect(remote!.distance).toBe(3);expect(remote!.effectiveAction).toBe('unknown');
 });
 it('attaches exact source references, unresolved premises and inhibitors to all eleven effect contracts',()=>{
  const a=sourceCaseInput('cai-resource').result;expect(a.structureGraph.actionContracts).toHaveLength(11);expect(a.structureGraph.actionContracts.every(contract=>contract.state==='unknown'&&contract.name!==contract.id&&contract.sourceReferences.length&&contract.premiseDependencies.length&&contract.inhibitorDependencies.length)).toBe(true);
  for(const edge of a.structureGraph.edges){expect(edge.sourceReferences.length).toBeGreaterThan(0);expect(edge.sourceReferences.every(ref=>ref.quote&&ref.locator&&ref.id)).toBe(true);expect(edge.dependencies.length).toBeGreaterThan(0);expect(edge.effectiveAction).toBe('unknown');}
 });
 it('marks observed branches and same-pillar carriers as known facts while keeping effective action unresolved',()=>{
  const a=sourceCaseInput('cai-resource').result;
  const root=a.structureGraph.actionContracts.find(contract=>contract.id==='root-candidate')!;
  expect(root.premiseDependencies.map(item=>item.state)).toEqual(['met','met']);
  expect(root.premiseDependencies[1].description).toBe('已观测到实际地支柱位');
  const carrier=a.structureGraph.actionContracts.find(contract=>contract.id==='carrier-priority')!;expect(carrier.premiseDependencies[0].state).toBe('met');
  expect(a.structureGraph.actionContracts.every(contract=>contract.state==='unknown')).toBe(true);expect(a.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);
 });
 it('uses fixed Chinese project wording for every effect premise, guard, consequence and source-claim scope',()=>{
  for(const source of independent.cases){const a=sourceCaseInput(source.caseId).result;
   for(const contract of a.structureGraph.actionContracts){const wording=[contract.name,...contract.premiseDependencies.map(item=>item.description),...contract.inhibitorDependencies.map(item=>item.description),...contract.interpretationPolicy];for(const text of wording)expect(text).not.toMatch(/[A-Za-z]{2,}/);expect(contract.interpretationPolicy.some(text=>text.startsWith('原合同所列可能后果'))).toBe(true);}
   for(const claim of a.sourceClaims)for(const text of claim.interpretationPolicy)expect(text).not.toMatch(/[A-Za-z]{2,}/);
  }
 });
 it('fails on an untranslated research phrase instead of leaking English wording into the product',()=>{
  const guards=sourceTable.graphContracts[0].guards;guards.push('unregistered research wording');
  try{expect(()=>analyzeProfile(selected)).toThrow('缺少固定中文释义');}finally{guards.pop();}
 });
 it('uses source effect claims only at exact four-pillar matches and never promotes them to effective graph truth',()=>{
  const a=sourceCaseInput('false-sha-pulled-root').result;expect(a.sourceClaims.some(claim=>claim.quote.includes('紧贴相冲'))).toBe(true);expect(a.sourceClaims.every(claim=>claim.scope==='exact-source-case-only'&&claim.effectiveAction==='source-claim')).toBe(true);expect(a.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);
 });
});

describe('dependency evaluation refuses missing proof, circular bootstrapping and contradictory outcomes',()=>{
 it('requires every independent prerequisite and no inhibitor before a contract can be met',()=>{
  expect(resolveRenDependencies([{id:'p',observed:'met',premises:[],inhibitors:[]},{id:'i',observed:'not-met',premises:[],inhibitors:[]},{id:'effect',premises:['p'],inhibitors:['i']}]).effect.state).toBe('met');
  expect(resolveRenDependencies([{id:'p',observed:'unknown',premises:[],inhibitors:[]},{id:'effect',premises:['p'],inhibitors:[]}]).effect.state).toBe('unknown');
  expect(resolveRenDependencies([{id:'p',observed:'met',premises:[],inhibitors:[]},{id:'effect',observed:'met',premises:[],inhibitors:['p']}]).effect.state).toBe('conflict');
 });
 it('does not derive formation from a premise whose only proof depends on that same formation',()=>{
  const r=resolveRenDependencies([{id:'formation',premises:['no-rivalry'],inhibitors:[]},{id:'no-rivalry',premises:['formation'],inhibitors:[]}]);expect(r.formation).toEqual({state:'unknown',cycleDetected:true});expect(r['no-rivalry']).toEqual({state:'unknown',cycleDetected:true});
  expect(()=>resolveRenDependencies([{id:'a',premises:['absent'],inhibitors:[]}])).toThrow('引用');expect(()=>resolveRenDependencies([{id:'a',premises:[],inhibitors:[]},{id:'a',premises:[],inhibitors:[]}])).toThrow('重复');
 });
});

describe('optional Ren profile remains separate from default snapshots and actual birth-time uncertainty',()=>{
 it('preserves default output exactly and chooses its own supported Bazi version only when explicitly selected',()=>{
  const a=analyzeProfile(profile),b=analyzeProfile({...profile,renMethod:'none'});expect(a).toEqual(b);expect(a.renCommentary).toBeUndefined();expect(a.bazi.version).toBe(BAZI_RULE_VERSION);
  const enabled=analyzeProfile(selected);expect(enabled.bazi.version).toBe(BAZI_REN_RULE_VERSION);expect({...enabled.bazi,version:a.bazi.version}).toEqual(a.bazi);expect(enabled.qimen).toEqual(a.qimen);expect(enabled.renCommentary!.sourceCaseMatches.map(item=>item.caseId)).toEqual(['strong-wood-yes']);
 });
 it('does not match a complete source case when time or corrected day is unknown',()=>{
  const a=analyzeProfile({...selected,timeUnknown:true,birthTime:''});expect(a.renCommentary!.sourceCaseMatches).toEqual([]);expect(a.renCommentary!.input.complete).toBe(false);expect(a.renCommentary!.input.pillars[3].known).toBe(false);
  const solar=analyzeProfile({...selected,birthDate:'2024-02-10',timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:87.6168});expect(solar.renCommentary!.input.dayStem).toBeUndefined();expect(solar.renCommentary!.structureGraph.nodes.every(node=>node.relation===undefined)).toBe(true);expect(solar.renCommentary!.observations.find(item=>item.id==='relation:peer:exposed')!.state).toBe('unknown');
 });
 it('binds strict canonical values to actual saved time inputs and refuses unselected, grafted and tampered profiles',()=>{
  const a=analyzeProfile(selected),ren=a.renCommentary!;expect(validRenCommentaryAnalysis(ren,selected,a.bazi)).toBe(true);expect(validRenCommentaryAnalysis(ren,profile,a.bazi)).toBe(false);expect(validRenCommentaryAnalysis(undefined,profile,analyzeProfile(profile).bazi)).toBe(true);
  expect(validRenCommentaryAnalysis(ren,{...selected,birthDate:'1914-11-26'},a.bazi)).toBe(false);expect(validRenCommentaryAnalysis(ren,selected,{...a.bazi,version:BAZI_RULE_VERSION})).toBe(false);
  const changed=structuredClone(ren);changed.structureGraph.edges[0].effectiveAction='met' as never;expect(validRenCommentaryAnalysis(changed,selected,a.bazi)).toBe(false);
  const extra=structuredClone(ren) as any;extra.extra=undefined;expect(validRenCommentaryAnalysis(extra,selected,a.bazi)).toBe(false);const symbol=structuredClone(ren) as any;symbol.sourceCaseMatches[Symbol('extra')]='x';expect(validRenCommentaryAnalysis(symbol,selected,a.bazi)).toBe(false);
  const accessor=structuredClone(ren);Object.defineProperty(accessor,'authority',{get:()=> 'ren-commentary'});expect(validRenCommentaryAnalysis(accessor,selected,a.bazi)).toBe(false);
 });
});
