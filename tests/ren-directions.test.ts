import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import {analyzeProfile,BAZI_REN_DIRECTION_RULE_VERSION,BAZI_REN_CAPACITY_RULE_VERSION} from '../src/domain/engine';
import {calculateRenCommentary,REN_DIRECTION_COMMENTARY_VERSION,validRenCommentaryAnalysis} from '../src/domain/ditian-ren';
import {calculateRenCommentary as frozenRen13} from '../src/domain/ditian-ren-v13';
import {calculateRenDirectionAnalysis,renDirectionRules,validRenDirectionAnalysis,REN_DIRECTIONS_SOURCE_ID} from '../src/domain/ren-directions';
import {REN_CAPACITY_METHOD,REN_DIRECTION_METHOD,normalizeRenMethod} from '../src/shared/ren-method';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../src/shared/types';
import type {RenDirectionAnalysis,RenDirectionKind} from '../src/shared/ren-directions-types';

const fixture=(file:string)=>JSON.parse(readFileSync(resolve('tests/fixtures/'+file),'utf8'));
const contracts=fixture('ren-directions-contract-goldens.json');
const authors=fixture('ren-directions-source-goldens.json') as {cases:Array<{id:string;pillars:string[]}>};
const calendar=fixture('ren-directions-calendar-goldens.json') as {cases:Array<{civilDate:string;pillars:string[]}>};
const profile:BirthProfile={id:'ren-direction-domain',customerName:'方向局部旺势独立测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2023-02-15',birthTime:'22:00:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',timeBasis:'civil',notes:'真实历法输入；手录作者结构用例单列且不声称原书公历',renMethod:REN_DIRECTION_METHOD};
const plain=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const original=analyzeProfile({...profile,renMethod:'none'}).bazi,labels=['年柱','月柱','日柱','时柱'];
/** Literal manual/source slots go directly through the frozen graph builder; this is not a historical birth-date reconstruction. */
function fromSlots(slots:Array<string|null>):RenCommentaryAnalysis {
 const complete=slots.every(Boolean),pillars=slots.flatMap((ganzhi,index)=>ganzhi?[{label:labels[index],gan:ganzhi[0],zhi:ganzhi[1],element:'',hidden:[],tenGod:''}]:[]);
 return frozenRen13({...profile,renMethod:REN_CAPACITY_METHOD,timeUnknown:!complete},{...original,version:BAZI_REN_CAPACITY_RULE_VERSION,pillars} as BaziAnalysis)!;
}
const selected=(value:RenDirectionAnalysis,kind:RenDirectionKind)=>value.checks.find(check=>check.kind===kind)!;

describe('original-text sufficient predicates and independent manual contract goldens',()=>{
 it.each([...contracts.cases,...contracts.additionalCases])('$id',(item:any)=>{
  const base=fromSlots(item.pillars),before=JSON.stringify(base),direction=calculateRenDirectionAnalysis(base),check=selected(direction,item.kind);
  expect(check.state).toBe(item.expected.path);expect(check.capability).toBe(item.expected.capability);
  expect(direction.netEffect).toBe(item.expected.netEffect);expect(direction.effectiveRootSupport).toBe(item.expected.effectiveRootSupport);expect(direction.formationDecision).toBe(item.expected.formation);expect(direction.usefulGodDecision).toBe(item.expected.usefulGod);
  expect(direction.proof.nodes.find(node=>node.id===check.dependencyId)!.premises).toEqual([item.kind+':complete-direction',item.kind+':same-element-day-stem']);
  expect(direction.proof.nodes.find(node=>node.id===check.dependencyId)).not.toHaveProperty('observed');
  expect(check.facts.find(fact=>fact.id==='input-completeness')!.contributesToProof).toBe(false);
  expect(validRenDirectionAnalysis(direction,base)).toBe(true);expect(JSON.stringify(base)).toBe(before);
 });
 it.each(authors.cases.slice(0,4))('supports explicit author-positive $id despite the retired project white lists',(item:any)=>{
  const base=fromSlots(item.pillars),direction=calculateRenDirectionAnalysis(base),kind:RenDirectionKind=item.id.startsWith('fire-')?'fire-direction-strength':'wood-direction-strength';
  expect(selected(direction,kind)).toMatchObject({state:'met',capability:'met'});
  expect(selected(direction,kind).facts.filter(fact=>fact.contributesToProof).map(fact=>fact.id)).toEqual(['complete-direction','same-element-day-stem']);
  expect(direction.formationDecision).toBe('not-evaluated');expect(direction.netEffect).toBe('unknown');
  expect(direction.retainedNodeIds).toEqual(base.structureGraph.nodes.map(node=>node.id));
 });
 it('retains wood-overgrowth and effective-metal counterexamples without exporting the local result to another target',()=>{
  const metal=fromSlots(authors.cases.find(item=>item.id==='chen-month-metal-can-control-wood')!.pillars),wood=calculateRenDirectionAnalysis(metal);
  expect(selected(wood,'wood-direction-strength').capability).toBe('met');expect(wood.netEffect).toBe('unknown');
  expect(metal.structureGraph.nodes.filter(node=>node.symbol==='庚')).toHaveLength(2);expect(metal.structureGraph.edges.every(edge=>edge.effectiveAction==='unknown')).toBe(true);
  const fire=fromSlots(authors.cases.find(item=>item.id==='wood-overgrowth-does-not-prove-fire-support')!.pillars),fireResult=calculateRenDirectionAnalysis(fire);
  expect(selected(fireResult,'wood-direction-strength')).toMatchObject({state:'not-met',capability:'unknown'});
  expect(fireResult.effectiveRootSupport).toBe('unknown');expect(fire.actionAnalysis!.rootLinks.every(root=>root.effectiveSupport==='unknown')).toBe(true);
 });
 it('contains no hidden month, fourth-branch, exposed-stem or complete-input proof gate',()=>{
  const rules=renDirectionRules();expect(rules.clauses).toHaveLength(13);
  for(const contract of rules.adoption.contracts) {
   expect(contract).not.toHaveProperty('monthBranches');expect(contract).not.toHaveProperty('branchMultisets');expect(contract).not.toHaveProperty('visibleStems');
   expect(contract.premises.filter(premise=>premise.requiredForProof).map(premise=>premise.kind)).toEqual(['source-premise','source-premise']);
  }
  const all=calculateRenDirectionAnalysis(fromSlots(['庚寅','己卯','甲辰','乙亥']));expect(selected(all,'wood-direction-strength').capability).toBe('met');
 });
});

describe('real calendar reachability without author-example date invention',()=>{
 it.each(calendar.cases)('reaches literal independently recorded pillars on $civilDate',(item:any)=>{
  const [birthDate,birthTime]=item.civilDate.split(' '),result=analyzeProfile({...profile,birthDate,birthTime});
  expect(result.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(item.pillars);
  const kind:RenDirectionKind=item.pillars[2][0]==='甲'?'wood-direction-strength':'fire-direction-strength';
  expect(selected(result.renCommentary!.directionAnalysis!,kind)).toMatchObject({state:'met',capability:'met'});
  expect(result.bazi.version).toBe(BAZI_REN_DIRECTION_RULE_VERSION);expect(result.renCommentary!.version).toBe(REN_DIRECTION_COMMENTARY_VERSION);
 });
 it('proves the known three wood members without inventing an unknown fourth pillar or all-root validity',()=>{
  const result=analyzeProfile({...profile,timeUnknown:true,birthTime:''}),ren=result.renCommentary!,direction=ren.directionAnalysis!,check=selected(direction,'wood-direction-strength');
  expect(result.bazi.pillars.map(pillar=>pillar.gan+pillar.zhi)).toEqual(['癸卯','甲寅','甲辰']);expect(ren.input.complete).toBe(false);expect(direction.input.complete).toBe(false);
  expect(check).toMatchObject({state:'met',capability:'met'});expect(check.facts.find(fact=>fact.id==='input-completeness')).toMatchObject({state:'unknown',contributesToProof:false});
  expect(direction.proof.results[check.dependencyId]).toEqual({state:'met',cycleDetected:false});
  expect(ren.structureGraph.nodes.some(node=>node.position==='hour')).toBe(false);expect(direction.retainedNodeIds.some(id=>id.startsWith('hour:'))).toBe(false);expect(direction.effectiveRootSupport).toBe('unknown');
 });
 it('leaves missing fire-member input unknown and a complete missing member only outside this sufficient path',()=>{
  const missing=analyzeProfile({...profile,birthDate:'1977-06-18',timeUnknown:true,birthTime:''}).renCommentary!.directionAnalysis!;
  expect(selected(missing,'fire-direction-strength')).toMatchObject({state:'unknown',capability:'unknown'});
  const full=analyzeProfile({...profile,birthDate:'2023-02-16'}).renCommentary!.directionAnalysis!;
  expect(selected(full,'wood-direction-strength')).toMatchObject({state:'not-met',capability:'unknown'});
 });
 it('does not borrow a representative day when unknown time plus apparent solar correction leaves the day unresolved',()=>{
  const result=analyzeProfile({...profile,timeUnknown:true,birthTime:'',timeBasis:'apparent-solar',birthLongitude:0}),ren=result.renCommentary!,direction=ren.directionAnalysis!;
  expect(result.bazi.timeBasis?.dayStatus).toBe('uncertain');expect(direction.input.dayStem).toBeNull();
  expect(ren.structureGraph.nodes.every(node=>node.position!=='day'&&node.position!=='hour')).toBe(true);
  expect(direction.checks.every(check=>check.state==='unknown'&&check.capability==='unknown')).toBe(true);
 });
 it('preserves every repeated 午 and its actual 庚己 hidden nodes while supporting only local fire strength',()=>{
  const current=analyzeProfile({...profile,birthDate:'1977-06-18',birthTime:'14:00:00'}),ren=current.renCommentary!,direction=ren.directionAnalysis!,check=selected(direction,'fire-direction-strength');
  expect(check.sourceNodeIds).toEqual(['year:branch:巳','month:branch:午','day:branch:午','hour:branch:未']);
  expect(check.targetNodeIds).toEqual(['day:exposed:丙']);
  expect(ren.structureGraph.nodes.filter(node=>node.layer==='branch'&&node.symbol==='午')).toHaveLength(2);
  expect(ren.structureGraph.nodes.find(node=>node.id==='year:hidden:2')).toMatchObject({symbol:'庚',element:'金'});
  expect(ren.structureGraph.nodes.find(node=>node.id==='month:hidden:2')).toMatchObject({symbol:'己',element:'土'});
  expect(direction.retainedRootLinkIds).toEqual(ren.actionAnalysis!.rootLinks.map(root=>root.id));expect(ren.actionAnalysis!.rootLinks.every(root=>root.effectiveSupport==='unknown')).toBe(true);
 });
 it('keeps a concrete 辰戌 opposition as unresolved structure instead of treating it as an automatic cancellation',()=>{
  const ren=analyzeProfile({...profile,birthTime:'20:00:00'}).renCommentary!,direction=ren.directionAnalysis!;
  expect(selected(direction,'wood-direction-strength').capability).toBe('met');
  expect(ren.structureGraph.edges.some(edge=>edge.kind==='branch-clash'&&edge.memberFacts.join('').includes('辰')&&edge.memberFacts.join('').includes('戌'))).toBe(true);
  expect(ren.structureGraph.nodes.some(node=>node.symbol==='戌'&&node.position==='hour')).toBe(true);expect(direction.netEffect).toBe('unknown');
 });
});

describe('independent1.4 routing, immutable1.3 nested layer and exact result validation',()=>{
 it.each([{birthDate:'2023-02-15',birthTime:'22:00:00'},{birthDate:'2012-03-15',birthTime:'14:00:00'},{birthDate:'1977-06-18',birthTime:'14:00:00'}])('keeps full inherited1.3 calculations on $birthDate',changes=>{
  const current=analyzeProfile({...profile,...changes}),prior=analyzeProfile({...profile,...changes,renMethod:REN_CAPACITY_METHOD}),ren=current.renCommentary!;
  expect({...current.bazi,version:prior.bazi.version}).toEqual(prior.bazi);expect(current.qimen).toEqual(prior.qimen);
  expect(ren.capacityAnalysis).toEqual(prior.renCommentary!.capacityAnalysis);expect(ren.actionAnalysis).toEqual(prior.renCommentary!.actionAnalysis);expect(ren.structureGraph).toEqual(prior.renCommentary!.structureGraph);
  const {directionAnalysis,version,profileId,input,sourceRules,...rest}=ren;
  expect({...rest,version:prior.renCommentary!.version,profileId:prior.renCommentary!.profileId,input:{...input,baziVersion:prior.bazi.version},sourceRules:sourceRules.filter(reference=>reference.sourceId!==REN_DIRECTIONS_SOURCE_ID)}).toEqual(prior.renCommentary);
 });
 it('requires explicit1.4 and matching1.14 Bazi; old13 never gains the new layer',()=>{
  const current=analyzeProfile(profile);expect(normalizeRenMethod(REN_DIRECTION_METHOD)).toBe(REN_DIRECTION_METHOD);expect(validRenCommentaryAnalysis(current.renCommentary,profile,current.bazi)).toBe(true);
  expect(()=>calculateRenCommentary(profile,{...current.bazi,version:BAZI_REN_CAPACITY_RULE_VERSION})).toThrow('不得嫁接');
  expect(validRenCommentaryAnalysis(current.renCommentary,{...profile,renMethod:REN_CAPACITY_METHOD},current.bazi)).toBe(false);
  expect(analyzeProfile({...profile,renMethod:REN_CAPACITY_METHOD}).renCommentary).not.toHaveProperty('directionAnalysis');
 });
 it('rejects forged capability, dependency/metadata gate, targets, roots, source and JSON accessors',()=>{
  const base=analyzeProfile({...profile,renMethod:REN_CAPACITY_METHOD}).renCommentary!,actual=calculateRenDirectionAnalysis(base);let getters=0;
  const edits=[
   (value:RenDirectionAnalysis)=>{value.checks[0].capability='unknown';},
   (value:RenDirectionAnalysis)=>{value.proof.nodes.find(node=>node.id===value.checks[0].dependencyId)!.premises.push('wood-direction-strength:input-completeness');},
   (value:RenDirectionAnalysis)=>{value.checks[0].facts[2].contributesToProof=true;},
   (value:RenDirectionAnalysis)=>{value.checks[0].targetNodeIds=[];},
   (value:RenDirectionAnalysis)=>{value.retainedRootLinkIds.pop();},
   (value:RenDirectionAnalysis)=>{value.sourceReferences[0].quote='altered';},
   (value:RenDirectionAnalysis)=>{Object.defineProperty(value,'netEffect',{enumerable:true,get(){getters++;return 'unknown';}});},
  ];
  for(const edit of edits){const altered=structuredClone(actual);edit(altered);expect(validRenDirectionAnalysis(altered,base)).toBe(false);}expect(getters).toBe(0);
  const altered=structuredClone(base);altered.structureGraph.nodes.splice(altered.structureGraph.nodes.findIndex(node=>node.layer==='hidden'),1);expect(()=>calculateRenDirectionAnalysis(altered)).toThrow();
  const alteredCapacity=structuredClone(base);alteredCapacity.capacityAnalysis!.checks[0].capability='met';expect(()=>calculateRenDirectionAnalysis(alteredCapacity)).toThrow('原1.3');
 });
});
