import {describe,expect,it} from 'vitest';
import {calculateRenCommentary as legacyRen} from '../src/domain/ditian-ren-v1';
import {analyzeProfile} from '../src/domain/engine';
import {calculateRenActionAnalysis,renActionsRules,resolveRenActionPredicates,validRenActionAnalysis} from '../src/domain/ren-actions';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../src/shared/types';
import type {RenActionAnalysis,RenActionPredicate} from '../src/shared/ren-actions-types';

const profile:BirthProfile={id:'ren-actions-domain',customerName:'任注条件动作人工结构测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30:00',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'结构golden不是原书公历',renMethod:'ditian-ren-commentary-2600158/1.0.0'};
const original=analyzeProfile({...profile,renMethod:'none'}).bazi,labels=['年柱','月柱','日柱','时柱'];
/** Explicit artificial stem/branch slots are fed through the frozen graph builder, never treated as a calendar chart. */
function fromSlots(slots:Array<string|null>,complete=slots.every(Boolean)):RenCommentaryAnalysis{
  const pillars=slots.flatMap((ganzhi,index)=>ganzhi?[{label:labels[index],gan:ganzhi[0],zhi:ganzhi[1],element:'',hidden:[],tenGod:''}]:[]);
  return legacyRen({...profile,timeUnknown:!complete},{...original,version:'civil-midnight-fuyi-candidate/1.10.0;lunar-typescript/1.8.6',pillars}as BaziAnalysis)!;
}
const act=(slots:Array<string|null>,complete=slots.every(Boolean))=>calculateRenActionAnalysis(fromSlots(slots,complete));

describe('source-conditional roots preserve literal members and prove limited structural prerequisites',()=>{
  it('keeps Yin/Yang same-element roots, source categories, precise layers and threats without numerical strength',()=>{
    const result=act(['壬亥','乙卯','甲辰','丁未']);
    const roots=result.rootLinks.filter(root=>root.stemNodeId==='day:exposed:甲');
    expect(roots.map(root=>[root.branch,root.hiddenStem,root.category])).toEqual([['亥','甲','growth-lu-wang'],['卯','乙','growth-lu-wang'],['辰','乙','residue'],['未','乙','store']]);
    expect(roots.find(root=>root.rootPosition==='day')).toMatchObject({samePillar:true,hiddenOrder:2,hiddenNodeId:'day:hidden:2',branchNodeId:'day:branch:辰'});
    expect(roots.filter(root=>root.hiddenStem==='乙').every(root=>root.stem==='甲'&&root.effectiveSupport==='unknown')).toBe(true);
    expect(result.checks.find(check=>check.id==='root-prerequisite:day:exposed:甲')?.status).toBe('met');
    expect(result.strengthDecision).toBe('not-evaluated');expect(result.formationDecision).toBe('not-evaluated');
    expect(result.rootLinks.every(root=>root.originalNodesRetained&&root.effectiveSupport==='unknown')).toBe(true);
    expect(result.sourceReferences.every(ref=>ref.sourceId==='bazi-ditian-ren-actions-2600158')).toBe(true);
  });
  it('does not invent unlisted strong-root classes for fire/metal/water/earth from a reverse lifecycle table',()=>{
    const result=act(['丙寅','庚申','壬亥','戊辰']);
    expect(result.rootLinks.find(root=>root.stem==='丙'&&root.branch==='寅')?.category).toBe('selected-same-element');
    expect(result.rootLinks.find(root=>root.stem==='庚'&&root.branch==='申')?.category).toBe('selected-same-element');
    expect(result.rootLinks.find(root=>root.stem==='壬'&&root.branch==='亥')?.category).toBe('selected-same-element');
    expect(result.rootLinks.find(root=>root.stem==='戊'&&root.branch==='辰')?.categoryAuthority).toBe('selected-hidden-vocabulary-only');
  });
  it('contradicts only the selected root subpath when complete, but keeps missing-hour absence unknown',()=>{
    const slots=['壬申','辛酉','甲子','癸丑'];const complete=act(slots),unknown=act([slots[0],slots[1],slots[2],null]);
    expect(complete.checks.find(check=>check.id==='root-prerequisite:day:exposed:甲')).toMatchObject({status:'contradicted',effectiveAction:'unknown',formationDecision:'not-evaluated'});
    expect(unknown.checks.find(check=>check.id==='root-prerequisite:day:exposed:甲')?.status).toBe('unknown');
    expect(unknown.input.complete).toBe(false);expect(unknown.rootLinks.some(root=>root.rootPosition==='hour')).toBe(false);
    expect(complete.limitations.join('')).toContain('不扩大为该干无生机');
  });
  it('never assigns a representative day or relative finance/resource paths when day is unknown',()=>{
    const result=act(['甲辰','丙寅',null,null],false);expect(result.input.dayStem).toBeNull();expect(result.checks.find(check=>check.id==='resource-paths:day-unknown')?.status).toBe('unknown');expect(result.checks.some(check=>check.kind==='resource-rescue')).toBe(false);expect(result.checks.find(check=>check.kind==='wood-triad-clash')?.status).toBe('unknown');
  });
});

describe('explicit same-column source directions never become global force judgments',()=>{
  const cases=[
    {slot:'甲寅',expected:['wood-carried-support','wood-covered-support']},
    {slot:'乙酉',expected:['wood-carried-restraint']},
    {slot:'丙子',expected:['fire-carried-restraint']},
    {slot:'丁卯',expected:['fire-carried-support']},
    {slot:'庚寅',expected:['wood-covered-restraint']},
    {slot:'壬午',expected:['fire-covered-restraint']},
    {slot:'甲巳',expected:['fire-covered-support']},
    {slot:'辛丑',expected:[]},
  ];
  it.each(cases)('uses exact listed direction for $slot only',({slot,expected})=>{
    const result=act([slot,'戊辰','戊辰','戊辰']),checks=result.checks.filter(check=>check.kind==='cover-carrier'&&check.id.startsWith('cover:year:'));expect(checks.map(check=>check.id.replace('cover:year:',''))).toEqual(expected);expect(checks.every(check=>check.status==='met'&&check.effectiveAction==='unknown'&&check.nodeIds.includes(`year:exposed:${slot[0]}`)&&check.nodeIds.includes(`year:branch:${slot[1]}`))).toBe(true);
  });
  it('does not carry a far branch into the same-column pattern',()=>{const result=act(['甲酉','戊寅','戊辰','戊辰']);expect(result.checks.filter(check=>check.id.startsWith('cover:year:')).map(check=>check.id)).toEqual(['cover:year:wood-carried-restraint']);});
});

describe('general wood-triad sentence has independent positive, negative and boundary expectations',()=>{
  const cases=[
    {branches:['亥','卯','酉','未'],expected:'met'},
    {branches:['亥','酉','卯','未'],expected:'met'},
    {branches:['亥','卯','丑','未'],expected:'met'},
    {branches:['未','丑','卯','亥'],expected:'met'},
    {branches:['卯','亥','酉','未'],expected:'unknown'},
    {branches:['亥','未','卯','酉'],expected:'unknown'},
    {branches:['丑','未','亥','卯'],expected:'unknown'},
    {branches:['亥','卯','辰','未'],expected:'contradicted'},
    {branches:['亥','酉','午','未'],expected:'contradicted'},
  ];
  it.each(cases)('checks artificial slots $branches => $expected without asserting a real birth chart',({branches,expected})=>{const result=act(branches.map(branch=>'戊'+branch)),check=result.checks.find(item=>item.id==='wood-triad:internal-tight-clash')!;expect(check.status).toBe(expected);expect(check.effectiveAction).toBe('unknown');expect(check.sourceClauseIds).toContain('wood-triad-internal');});
  it('does not fill the fourth branch when unknown',()=>{const result=act(['戊亥','戊卯','戊酉',null]);expect(result.checks.find(item=>item.id==='wood-triad:internal-tight-clash')?.status).toBe('unknown');expect(result.input.pillars[3]).toEqual({position:'hour',known:false});});
});

describe('specific lifecycle proof guards and same-target blocking/rescue paths',()=>{
  it.each([['丁','酉'],['乙','午'],['己','酉'],['辛','子'],['癸','卯'],['乙','亥'],['癸','申'],['己','寅'],['辛','巳']])('rejects reverse-stage sole proof for %s/%s while preserving literal nodes',(stem,branch)=>{
    const result=act([stem+branch,'戊辰','戊辰','戊辰']),guard=result.checks.find(check=>check.kind==='lifecycle-proof-guard'&&check.id.startsWith(`lifecycle:year:exposed:${stem}:year:branch:${branch}:`));expect(guard?.status).toBe('met');expect(guard?.effectiveAction).toBe('unknown');if(stem==='己'&&branch==='寅')expect(guard?.nodeIds).toContain('year:hidden:2');if(stem==='辛'&&branch==='巳')expect(guard?.nodeIds).toContain('year:hidden:3');
  });
  it('binds attacks to the exact carrier, never to another root or automatically uproots it',()=>{
    const result=act(['甲寅','庚申','甲卯','戊辰']),root=result.rootLinks.find(link=>link.stemNodeId==='day:exposed:甲'&&link.rootPosition==='year')!,check=result.checks.find(item=>item.id===`root-damage:${root.id}`)!;
    expect(root.threatNodeIds).toContain('month:branch:申');expect(check.predicates.find(p=>p.id==='clash-on-this-carrier')?.state).toBe('met');expect(check.status).toBe('unknown');expect(root.effectiveSupport).toBe('unknown');
    const untouched=result.rootLinks.find(link=>link.stemNodeId==='day:exposed:甲'&&link.branch==='卯')!,untouchedCheck=result.checks.find(item=>item.id===`root-damage:${untouched.id}`)!;expect(untouchedCheck.status).toBe('contradicted');expect(untouched.originalNodesRetained).toBe(true);
  });
  it('uses a particular wealth→resource target and a particular officer bridge; presence never restores it',()=>{
    const result=act(['辛酉','癸丑','丙辰','乙卯']),damage=result.checks.find(check=>check.id==='resource-damage:hour:exposed:乙')!,rescue=result.checks.find(check=>check.id==='resource-rescue:year:exposed:辛:hour:exposed:乙')!;
    expect(damage.nodeIds).toEqual(expect.arrayContaining(['hour:exposed:乙','year:exposed:辛']));expect(damage.status).toBe('unknown');expect(rescue.nodeIds).toContain('month:exposed:癸');expect(rescue.predicates.find(p=>p.id==='same-target-rescue-members')?.state).toBe('met');expect(rescue.status).toBe('unknown');expect(rescue.effectiveAction).toBe('unknown');
    const absent=act(['甲卯','乙卯','丙午','丁未']);expect(absent.checks.filter(check=>check.kind==='resource-damage').every(check=>check.status==='contradicted')).toBe(true);
  });
  it('actually propagates contradicted/unknown/met/conflict necessary premises without circular promotion',()=>{
    const p=(state:RenActionPredicate['state']):RenActionPredicate=>({id:state,label:state,state,nodeIds:[],evidence:[]});expect(resolveRenActionPredicates([p('met'),p('met')])).toBe('met');expect(resolveRenActionPredicates([p('met'),p('unknown')])).toBe('unknown');expect(resolveRenActionPredicates([p('contradicted'),p('unknown')])).toBe('contradicted');expect(resolveRenActionPredicates([p('conflict'),p('contradicted')])).toBe('conflict');expect(resolveRenActionPredicates([])).toBe('unknown');
  });
});

describe('strict conditional-action canonical boundary',()=>{
  const base=fromSlots(['壬亥','乙卯','甲辰','丁未']);
  it('accepts exact recomputed values and rejects arbitrary extra/result/source fields',()=>{
    const value=calculateRenActionAnalysis(base);expect(validRenActionAnalysis(value,base)).toBe(true);const edits:Array<(value:RenActionAnalysis)=>void>=[v=>{v.rootLinks[0].hiddenStem='癸';},v=>{v.checks[0].status='contradicted';},v=>{v.sourceReferences[0].quote='伪句';},v=>{(v as any).formed=true;},v=>{(v.checks[0]as any).score=90;},v=>{v.limitations=[];},v=>{(v.rootLinks[0]as any).effectiveSupport='met';}];for(const edit of edits){const invalid=structuredClone(value);edit(invalid);expect(validRenActionAnalysis(invalid,base)).toBe(false);}
  });
  it('rejects sparse arrays, accessors without executing, symbols, hidden fields and unsupported values',()=>{
    const result=calculateRenActionAnalysis(base),sparse=structuredClone(result);sparse.rootLinks=new Array(result.rootLinks.length);expect(validRenActionAnalysis(sparse,base)).toBe(false);
    let getterReads=0;const accessor=structuredClone(result);Object.defineProperty(accessor,'version',{get(){getterReads++;return'1.0.0';},enumerable:true});expect(validRenActionAnalysis(accessor,base)).toBe(false);expect(getterReads).toBe(0);
    for(const modify of [(value:any)=>value[Symbol('extra')]=1,(value:any)=>Object.defineProperty(value,'extra',{value:1}),(value:any)=>value.extra=undefined,(value:any)=>value.extra=NaN,(value:any)=>value.extra=value]){const invalid=structuredClone(result);modify(invalid);expect(validRenActionAnalysis(invalid,base)).toBe(false);}
  });
  it('rejects malformed or grafted base node identity and unknown-day promotion',()=>{
    for(const edit of [(value:RenCommentaryAnalysis)=>{value.structureGraph.nodes[0].symbol='癸';},(value:RenCommentaryAnalysis)=>{value.input.pillars[0].position='hour';},(value:RenCommentaryAnalysis)=>{value.input.dayStem='庚';}]){const invalid=structuredClone(base);edit(invalid);expect(()=>calculateRenActionAnalysis(invalid)).toThrow();}
    const sparse=structuredClone(base);sparse.structureGraph.nodes=new Array(base.structureGraph.nodes.length);expect(()=>calculateRenActionAnalysis(sparse)).toThrow();
    expect(renActionsRules().clauses).toHaveLength(19);
  });
});
