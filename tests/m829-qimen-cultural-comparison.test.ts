import {expect,it} from 'vitest';
import {compareQimenCultural} from '../src/domain/qimen-cultural-comparison';
import {culturalCanonicalDigest,culturalChartDigest} from '../src/domain/qimen-cultural-comparison-canonical';
import {calculateNameImageryReading,nameImageryProfile} from '../src/domain/name-imagery';
import {analyzeProfile} from '../src/domain/engine';
import {CULTURAL_CANONICAL_ALGORITHM,LEGACY_CHART_DIGEST_ALGORITHM,QIMEN_CULTURAL_VERSION} from '../src/shared/qimen-cultural-comparison';
import type {CulturalBirthAnchorView,CulturalComparisonReply,CulturalComparisonSnapshot,CulturalEvidenceRef,CulturalPalaceView,CulturalSourceState,OuterPalace,PreparedCulturalComparisonInput} from '../src/shared/qimen-cultural-comparison';
import type {BirthProfile,CharacterEntry,QimenChart,QimenMarkerRule,SourceRecord} from '../src/shared/types';
import fixture from './fixtures/name-imagery-known-chart.json';
import dataset from '../data/dataset.json';
import markerSources from '../data/qimen-markers-source-lock.json';
import patternSources from '../data/qimen-patterns-source-lock.json';
import tombSources from '../data/qimen-stem-tombs-source-lock.json';

type Mutable<T>=T extends readonly (infer Item)[]?Mutable<Item>[]:T extends object?{-readonly [Key in keyof T]:Mutable<T[Key]>}:T;
const clone=<T>(input:T):Mutable<T>=>JSON.parse(JSON.stringify(input));
const outer:OuterPalace[]=[1,2,3,4,6,7,8,9];
const birth:BirthProfile={id:'m829-domain-fixture',customerName:'项目文化比较测试',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'测试保存盘的静态比较；不认证main来源或capsule'};
const editorial=dataset.sources.find(source=>source.id==='editorial-rules')!;
const dictionary=dataset.sources.find(source=>source.id==='moe-revised')!;
const chartSources=[...markerSources.sources,...patternSources.sources,...tombSources.sources];
const ref=(source:Pick<SourceRecord,'id'|'commit'|'sha256'|'license'>,authority:CulturalEvidenceRef['authority'],locator:string):CulturalEvidenceRef=>({id:source.id,version:source.commit,sha256:source.sha256,locator,authority,license:source.license,note:'Read-only existing fixed metadata; main authentication is a domain-test precondition, not issued here.'});
const labelRef=ref(editorial,'project-editorial-label','data/dataset.json:characters[].elements/elementBasis');
const dictionaryRef=ref(dictionary,'dictionary-fact','data/dataset.json:characters[].readings');
const labelPolicy={id:'m829-existing-project-editorial-labels',version:dataset.version,manifestDigest:culturalCanonicalDigest({source:editorial,version:dataset.version}),dependencies:[{sourceId:editorial.id,version:editorial.commit,sha256:editorial.sha256}]};
function entry(char:string):CharacterEntry {
 const value=dataset.characters.find(row=>row.char===char);if(!value)throw Error('Missing existing character fixture '+char);
 return clone(value) as CharacterEntry;
}
function ruleRefs(rule:QimenMarkerRule):CulturalEvidenceRef[]{
 return rule.sources.map(source=>{
  const publication=chartSources.find(row=>row.id===source.id);if(!publication)throw Error('Missing fixed rule source '+source.id);
  expect(publication.commit).toBe(source.commit);return ref(publication,'saved-chart-rule',source.locator);
 });
}
function palaceViews(chart:QimenChart):Mutable<CulturalPalaceView>[] {
 return outer.map(number=>{
  const palace=chart.palaces.find(value=>value.number===number);if(!palace)throw Error('Missing actual outer palace');
  const observations:Mutable<CulturalPalaceView>['observations']=[];
  for(const marker of chart.auxiliary?.markers??[]){
   if(!marker.palaces.includes(number))continue;
   const rule=chart.auxiliary!.rules.find(value=>value.id===marker.ruleId)!;
   observations.push({palace:number,ruleId:rule.id,ruleVersion:rule.version,scope:'palace-position',label:marker.label,subjects:[...marker.branches],evidence:[...marker.evidence],sourceReferences:ruleRefs(rule),nameEffect:'not-evaluated'});
  }
  for(const finding of chart.patterns?.findings??[]){
   if(!['menpo','jixing','rumu'].includes(finding.kind)||!finding.palaces.includes(number))continue;
   const rule=chart.patterns!.rules.find(value=>value.id===finding.ruleId)!;
   observations.push({palace:number,ruleId:rule.id,ruleVersion:rule.version,scope:'palace-position',label:finding.label,subjects:[...finding.subjects],evidence:[...finding.evidence],sourceReferences:ruleRefs(rule),nameEffect:'not-evaluated'});
  }
  for(const finding of chart.stemTombs?.findings??[]){
   if(finding.palace!==number)continue;
   const rule=chart.stemTombs!.rules.find(value=>value.id===finding.ruleId)!;
   observations.push({palace:number,ruleId:rule.id,ruleVersion:rule.version,scope:'palace-position',label:'独立十干墓支表 · '+finding.role,subjects:[finding.stem,finding.targetBranch],evidence:[...finding.evidence],sourceReferences:ruleRefs(rule),nameEffect:'not-evaluated'});
  }
  // Preserve the complete recorded principal/hosted display string. Do not
  // infer observations by parsing palace.marks or split a new stem algorithm.
  return{palace:number,trigram:palace.trigram,direction:palace.direction,star:palace.star,door:palace.door,god:palace.god,principalAndHostedStems:[palace.heaven],observations};
 });
}
/** The DTO models already authenticated main-provider postconditions. It is not
 * a source-admission capability or a real persisted evidence capsule. All real
 * chart facts, glyphs, readings, labels and source metadata come from old fixtures.
 */
function prepared(names=['梓涵','涵梓','沐清'],chart=clone(fixture.chart) as QimenChart):Mutable<PreparedCulturalComparisonInput>{
 const anchor:Mutable<CulturalBirthAnchorView>={anchorId:'m829-saved-chart-anchor',ownerProfileId:birth.id,sourceSessionId:fixture.sourceSession,sourceRevision:'fixture-original',identity:{qimenVersion:chart.version,digest:culturalChartDigest(chart,LEGACY_CHART_DIGEST_ALGORITHM).digest,digestAlgorithm:LEGACY_CHART_DIGEST_ALGORITHM,sourceDigest:culturalCanonicalDigest(chartSources),birthInputDigest:culturalCanonicalDigest(birth),timeBasisDigest:culturalCanonicalDigest({timezone:birth.timezone})},available:chart.available,unavailableReasons:chart.available?[]:[chart.reason||'出生时辰未知'],birthLabel:'既有固定出生盘样本',timeBasisLabel:'原保存盘时制，不补假设时柱',sourceReferences:chartSources.map(source=>ref(source,'saved-chart-rule','fixed source-lock metadata'))};
 const binding={anchorId:anchor.anchorId,ownerProfileId:anchor.ownerProfileId,sourceSessionId:anchor.sourceSessionId,sourceRevision:anchor.sourceRevision,identity:anchor.identity};
 const candidates=names.map((givenName,index)=>({candidateRef:'m829-candidate-'+index,kind:'saved' as const,fullName:'林'+givenName,givenName,anchorBinding:clone(binding),labelPolicy:clone(labelPolicy),rows:[...givenName].map((char,position)=>{
  const character=entry(char),ready=character.elements.length>0;
  return{position,char,pinyin:character.pinyin,readingState:'selected' as const,sourceState:ready?'ready' as const:'unknown' as const,labelPolicyId:labelPolicy.id,reviewedEvidenceId:ready?'editorial:'+char+':'+character.pinyin:null,dictionarySense:character.meaning,projectIntent:character.elementBasis,elements:character.elements,reasonCodes:ready?[]:['existing-label-unknown'],sourceReferences:ready?[clone(dictionaryRef),clone(labelRef)]:[clone(dictionaryRef)],adoptionReceiptDigest:null};
 })}));
 return{schema:QIMEN_CULTURAL_VERSION,enabled:true,requestId:'m829-request',surname:'林',anchor,qimen:chart,labelPolicy:clone(labelPolicy),candidates,palaceViews:chart.available?palaceViews(chart):[],chartWideObservations:[],observationCoverage:(['auxiliary','patterns','stem-tombs'] as const).map(module=>{
  const value=module==='auxiliary'?chart.auxiliary:module==='patterns'?chart.patterns:chart.stemTombs;
  return{module,status:!chart.available?'not-assessed' as const:value?'recorded' as const:'not-recorded' as const,version:chart.available&&value?value.version:null,reason:!chart.available?'无唯一出生盘':value?null:'原保存盘未登记该模块'};
 }),ruleBasisDifferences:[],sourceReferences:[clone(dictionaryRef),clone(labelRef),...chartSources.map(source=>ref(source,'saved-chart-rule','fixed source-lock metadata'))],evidenceCapsuleDigest:culturalCanonicalDigest({testOnly:'authenticated-main reference placeholder,not actual capsule persistence'})};
}
function result(reply:CulturalComparisonReply):CulturalComparisonSnapshot {
 expect(reply.kind).toBe('result');if(reply.kind!=='result')throw Error('Expected cultural comparison result: '+JSON.stringify(reply));return reply.snapshot;
}
function failed(input:unknown,reason?:string):void {
 const reply=compareQimenCultural(input as PreparedCulturalComparisonInput);expect(reply.kind).toBe('unavailable');
 if(reply.kind==='unavailable'&&reason)expect(reply.reason).toBe(reason);
}
function setRowState(input:Mutable<PreparedCulturalComparisonInput>,state:CulturalSourceState):void {
 const row=input.candidates[0].rows[0];row.sourceState=state;row.elements=[];row.reviewedEvidenceId=null;row.sourceReferences=[clone(dictionaryRef)];
}

it('compares three actual names without confusing the remainder with an exclusive palace set',()=>{
 const input=prepared(),before=JSON.stringify(input),snapshot=result(compareQimenCultural(input));
 expect(input.anchor.identity.digest).toBe(fixture.sourceChartSha);expect(snapshot.status).toBe('ready');
 expect(snapshot.candidateOrder).toEqual(input.candidates.map(row=>row.candidateRef));
 expect(snapshot.candidates.map(row=>row.knownPalaces)).toEqual([[1,3,4],[1,3,4],[1]]);
 expect(snapshot.summary.state).toBe('complete');expect(snapshot.summary.completeSharedPalaces).toEqual([1]);
 expect(snapshot.summary.sharedKnownPalaces).toEqual([1]);
 expect(snapshot.summary.perCandidate.map(row=>row.remainingFromCommon)).toEqual([[3,4],[3,4],[]]);
 expect(snapshot.summary.perCandidate.map(row=>row.exclusiveToCandidate)).toEqual([[],[],[]]);
 expect(snapshot.candidates[0].rows.map(row=>row.char)).toEqual(['梓','涵']);expect(snapshot.candidates[1].rows.map(row=>row.char)).toEqual(['涵','梓']);
 expect(snapshot).toMatchObject({score:null,ranking:'input-order',scoreMutation:false,filtering:false,nameEffect:'not-evaluated',fourHarmRemoval:'not-performed',traditional:{status:'not-admitted',verdict:'not-evaluated',namePalaceMethod:'not-established'}});
 expect(snapshot.summary.interpretation).toBe('positions-only-no-preference');expect(snapshot.digestAlgorithm).toBe(CULTURAL_CANONICAL_ALGORITHM);
 expect(JSON.stringify(input)).toBe(before);expect(Object.isFrozen(snapshot)).toBe(true);
});

it('supports a pair and preserves all four inputs without ranking, moving center5 or surname projection',()=>{
 const pair=result(compareQimenCultural(prepared(['梓涵','沐清'])));expect(pair.summary.perCandidate[0].exclusiveToCandidate).toEqual([3,4]);
 const input=prepared(['梓涵','涵梓','沐清','安宁']),snapshot=result(compareQimenCultural(input));
 expect(snapshot.candidates).toHaveLength(4);expect(snapshot.candidateOrder).toEqual(input.candidates.map(row=>row.candidateRef));
 expect(snapshot.summary.completeSharedPalaces).toEqual([]);expect(snapshot.summary.perCandidate[3].exclusiveToCandidate).toEqual([2,8]);
 expect(snapshot.candidates.flatMap(row=>row.knownPalaces)).not.toContain(5);
 const compound=prepared(['安宁','沐清']);compound.surname='欧阳';for(const candidate of compound.candidates)candidate.fullName='欧阳'+candidate.givenName;
 expect(result(compareQimenCultural(compound)).candidates.map(row=>row.knownPalaces)).toEqual([[2,8],[1]]);
});

it('keeps a single candidate as an individual view and rejects zero,five and duplicate candidate references',()=>{
 const one=result(compareQimenCultural(prepared(['安宁'])));expect(one.status).toBe('insufficient-candidates');expect(one.summary.state).toBe('not-evaluated');
 failed(prepared([]),'invalid-input');failed(prepared(['安','宁','沐','清','梓']),'invalid-input');
 const duplicate=prepared(['安宁','沐清']);duplicate.candidates[1].candidateRef=duplicate.candidates[0].candidateRef;failed(duplicate,'invalid-input');
 failed(prepared(['安宁','安宁']),'invalid-input');
});

it('keeps repeated character occurrences,one-character names and entered order without accumulating force',()=>{
 const input=prepared(['安安','安']),snapshot=result(compareQimenCultural(input));
 expect(snapshot.candidates[0].rows.map(row=>[row.position,row.char,row.staticPalaces])).toEqual([[0,'安',[2,8]],[1,'安',[2,8]]]);
 expect(snapshot.candidates.map(row=>row.knownPalaces)).toEqual([[2,8],[2,8]]);expect(snapshot.summary.completeSharedPalaces).toEqual([2,8]);
});

it('keeps the real unknown half of 厚安 unresolved without granting complete whole-name mapping',()=>{
 const snapshot=result(compareQimenCultural(prepared(['厚安','安宁'])));
 expect(snapshot.status).toBe('partial-known-only');expect(snapshot.candidates[0].complete).toBe(false);
 expect(snapshot.candidates[0].rows.map(row=>row.status)).toEqual(['unknown-label','mapped']);
 expect(snapshot.candidates[0].rows[0].elements).toEqual([]);expect(snapshot.candidates[0].knownPalaces).toEqual([2,8]);
 expect(snapshot.summary.state).toBe('known-subsets-only');expect(snapshot.summary.sharedKnownPalaces).toEqual([2,8]);
 expect(snapshot.summary.completeSharedPalaces).toBeNull();
 for(const row of snapshot.summary.perCandidate){expect(row.remainingFromCommon).toBeNull();expect(row.exclusiveToCandidate).toBeNull();}
 const none=result(compareQimenCultural(prepared(['厚德','知微'])));expect(none.status).toBe('no-mapped-labels');expect(none.candidates.every(row=>!row.complete)).toBe(true);
});

it.each([
 {state:'unknown',status:'unknown-label'},{state:'no-mapping',status:'unmapped'},
 {state:'pending',status:'pending-admission'},{state:'disputed',status:'source-conflict'},
] as const)('preserves prepared $state as its distinct unmapped row without guessing elements',({state,status})=>{
 const input=prepared(['厚安','沐清']);setRowState(input,state);
 const snapshot=result(compareQimenCultural(input)),row=snapshot.candidates[0].rows[0];
 expect(row.sourceState).toBe(state);expect(row.status).toBe(status);expect(row.elements).toEqual([]);expect(row.staticPalaces).toEqual([]);
 expect(snapshot.status).toBe('partial-known-only');expect(snapshot.summary.completeSharedPalaces).toBeNull();
});

it('does not turn a source-error into an ordinary unknown or partial result',()=>{
 const input=prepared(['厚安','沐清']);setRowState(input,'source-error');failed(input,'source-unavailable');
});

it('requires a selected reading,reviewed evidence and a matching actual label-authority dependency',()=>{
 const reading=prepared();reading.candidates[0].rows[0].readingState='required';reading.candidates[0].rows[0].pinyin=null;reading.candidates[0].rows[0].elements=[];
 const pending=result(compareQimenCultural(reading));expect(pending.candidates[0].rows[0].status).toBe('reading-selection-required');expect(pending.candidates[0].rows[0].staticPalaces).toEqual([]);
 for(const change of [
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows[0].reviewedEvidenceId=null;},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows[0].pinyin='';},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows[0].sourceReferences=[clone(dictionaryRef)];},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows[0].sourceReferences[1].sha256='f'.repeat(64);},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows[0].labelPolicyId='unbound-policy';},
 ]){const input=prepared();change(input);failed(input);}
});

it('never treats dictionary facts or a palace table as authority to supply project elemental labels',()=>{
 for(const authority of ['dictionary-fact','palace-table','saved-chart-rule'] as const){
  const input=prepared();input.candidates[0].rows[0].sourceReferences=input.candidates[0].rows[0].sourceReferences.map(row=>({...row,authority}));failed(input);
 }
});

it('requires every candidate to share the exact central anchor and canonical label-policy identity',()=>{
 for(const change of [
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[1].anchorBinding.anchorId+='other';},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[1].anchorBinding.ownerProfileId+='other';},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[1].anchorBinding.identity.digest='f'.repeat(64);},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[1].labelPolicy.version+='other';},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[1].labelPolicy.dependencies[0].sha256='f'.repeat(64);},
 ]){const input=prepared();change(input);failed(input,'rejected-integrity');}
 const reordered=prepared();reordered.candidates[1].anchorBinding=Object.fromEntries(Object.entries(reordered.candidates[1].anchorBinding).reverse()) as typeof reordered.candidates[1]['anchorBinding'];
 reordered.candidates[1].labelPolicy=Object.fromEntries(Object.entries(reordered.candidates[1].labelPolicy).reverse()) as typeof reordered.candidates[1]['labelPolicy'];
 expect(result(compareQimenCultural(reordered)).status).toBe('ready');
});

it('rejects name,character occurrence,position and actual chart binding mismatches',()=>{
 for(const change of [
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].fullName='王'+input.candidates[0].givenName;},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].givenName='梓涵安';},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows.reverse();},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows[0].position=1;},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.candidates[0].rows[0].char='安';},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.qimen.palaces[0].star='changed original star';},
  (input:Mutable<PreparedCulturalComparisonInput>)=>{input.palaceViews[0].star='grafted star';},
 ]){const input=prepared();change(input);failed(input);}
});

it('binds the retained principal/hosted text to the exact original heaven field without parsing it',()=>{
 const input=prepared(),original=input.qimen.palaces.find(row=>row.number===input.palaceViews[0].palace)!;
 expect(input.palaceViews[0].principalAndHostedStems).toEqual([original.heaven]);
 expect(result(compareQimenCultural(input)).status).toBe('ready');
 input.palaceViews[0].principalAndHostedStems=['编造主干'];
 failed(input,'rejected-integrity');
 const split=prepared();split.palaceViews[0].principalAndHostedStems=['壬','己'];
 failed(split,'rejected-integrity');
});

it('keeps recorded module coverage bound to actual saved module versions and missing-state facts',()=>{
 const version=prepared();version.observationCoverage[0].version='new-rule-not-in-this-chart';failed(version,'rejected-integrity');
 const hidden=prepared();hidden.observationCoverage[0]={module:'auxiliary',status:'not-recorded',version:null,reason:'incorrectly hidden'};failed(hidden,'rejected-integrity');
 const chart=clone(fixture.chart) as QimenChart;delete chart.auxiliary;
 const invented=prepared(['安宁','沐清'],chart);invented.observationCoverage[0]={module:'auxiliary',status:'recorded',version:'invented',reason:null};failed(invented,'rejected-integrity');
});

it('maps actual metal/fire,earth,wood/water labels to all and only their outer palace sets',()=>{
 const snapshot=result(compareQimenCultural(prepared(['钧烨','安宁','梓涵'])));
 expect(snapshot.candidates.map(c=>c.knownPalaces)).toEqual([[6,7,9],[2,8],[1,3,4]]);
 expect(snapshot.candidates[0].rows.map(r=>r.staticPalaces)).toEqual([[6,7],[9]]);
 expect(snapshot.summary.completeSharedPalaces).toEqual([]);
});

it('unions a coherent multi-element provider postcondition without adding weight or admitting that provider',()=>{
 // Isolated pure-domain boundary, not a claim that existing 梓 has new labels.
 // Main-provider authentication is deliberately outside this module's scope.
 const input=prepared(['梓','清']);input.candidates[0].rows[0].elements=['木','水'];
 const snapshot=result(compareQimenCultural(input));
 expect(snapshot.candidates[0].rows[0].elements).toEqual(['木','水']);
 expect(snapshot.candidates[0].rows[0].staticPalaces).toEqual([1,3,4]);
 expect(snapshot.candidates[0].knownPalaces).toEqual([1,3,4]);
 expect(snapshot.summary.completeSharedPalaces).toEqual([1]);
 expect(snapshot.score).toBeNull();expect(snapshot.traditional.status).toBe('not-admitted');
});

it('preserves actual palace observations under their separate rule bases and never turns marks into conclusions',()=>{
 const input=prepared(['钧烨','梓涵']),sixInput=input.palaceViews.find(row=>row.palace===6)!;
 const qi=sixInput.observations.find(row=>row.ruleId==='qimen-heaven-qi-rumu')!,tomb=sixInput.observations.find(row=>row.ruleId==='qimen-go-heaven-explicit-stem-tombs')!;
 input.ruleBasisDifferences=[{kind:'different-rule-bases',ruleRefs:[clone(qi.sourceReferences[0]),clone(tomb.sourceReferences[0])],note:'同一保存盘的三奇入墓表与独立十干墓支表分开照读，不合并真假结论。',mergedVerdict:null}];
 const snapshot=result(compareQimenCultural(input));
 for(const candidate of snapshot.candidates)for(const view of candidate.palaceViews){
  const original=input.palaceViews.find(row=>row.palace===view.palace)!;
  expect(view).toEqual(original);expect(view.observations.every(row=>row.nameEffect==='not-evaluated')).toBe(true);
 }
 const six=snapshot.candidates[0].palaceViews.find(row=>row.palace===6)!;
 expect(six.observations.some(row=>row.ruleId==='qimen-heaven-qi-rumu')).toBe(true);
 expect(six.observations.some(row=>row.ruleId==='qimen-go-heaven-explicit-stem-tombs')).toBe(true);
 expect(snapshot.ruleBasisDifferences).toEqual(input.ruleBasisDifferences);expect(snapshot.ruleBasisDifferences[0].mergedVerdict).toBeNull();
 expect(snapshot.fourHarmRemoval).toBe('not-performed');
});

it('keeps missing historical observation modules unrecorded and never recalculates them from marks',()=>{
 const chart=clone(fixture.chart) as QimenChart;delete chart.auxiliary;delete chart.patterns;delete chart.stemTombs;
 const input=prepared(['安宁','沐清'],chart),snapshot=result(compareQimenCultural(input));
 expect(snapshot.observationCoverage.map(row=>row.status)).toEqual(['not-recorded','not-recorded','not-recorded']);
 expect(snapshot.candidates.flatMap(row=>row.palaceViews).every(view=>view.observations.length===0)).toBe(true);
 expect(snapshot.chartWideObservations).toEqual([]);expect(snapshot.nameEffect).toBe('not-evaluated');
});

it('retains static sets for a genuine unknown-hour result without a noon plate,palace facts or common-set summary',()=>{
 const unknown=analyzeProfile({...birth,timeUnknown:true,birthTime:''}).qimen;expect(unknown.available).toBe(false);expect(unknown.palaces).toEqual([]);
 const input=prepared(['安宁','沐清'],unknown),snapshot=result(compareQimenCultural(input));
 expect(snapshot.status).toBe('unknown-chart');expect(snapshot.candidates.map(row=>row.knownPalaces)).toEqual([[2,8],[1]]);
 expect(snapshot.candidates.every(row=>row.palaceViews.length===0)).toBe(true);expect(snapshot.chartWideObservations).toEqual([]);
 expect(snapshot.observationCoverage.every(row=>row.status==='not-assessed')).toBe(true);
 expect(snapshot.summary.state).toBe('not-evaluated');expect(snapshot.summary.completeSharedPalaces).toBeNull();
 const grafted=clone(input);grafted.palaceViews=palaceViews(clone(fixture.chart) as QimenChart);failed(grafted,'rejected-integrity');
});

it('keeps digest algorithm identity explicit and rejects unsupported comparison versions',()=>{
 const input=prepared(),canonical=clone(input);
 const digest=culturalChartDigest(canonical.qimen,CULTURAL_CANONICAL_ALGORITHM);canonical.anchor.identity.digest=digest.digest;canonical.anchor.identity.digestAlgorithm=digest.algorithm;
 for(const candidate of canonical.candidates)candidate.anchorBinding.identity=clone(canonical.anchor.identity);
 expect(result(compareQimenCultural(canonical)).candidates.map(row=>row.knownPalaces)).toEqual([[1,3,4],[1,3,4],[1]]);
 expect(result(compareQimenCultural(canonical)).anchor.identity.digest).not.toBe(input.anchor.identity.digest);
 const wrong=prepared();wrong.schema='future-unknown' as never;failed(wrong,'unsupported-version');
});

it('rejects nested accessors and proxies before any caller getter or reflection trap',()=>{
 let getters=0;const accessor=prepared();Object.defineProperty(accessor.candidates[0].rows[0],'elements',{enumerable:true,get(){getters++;return['木'];}});failed(accessor,'invalid-input');expect(getters).toBe(0);
 const input=prepared(),traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
 input.candidates[0].rows[0].elements=new Proxy(input.candidates[0].rows[0].elements,{
  get(target,key,receiver){traps.get++;return Reflect.get(target,key,receiver);},ownKeys(target){traps.ownKeys++;return Reflect.ownKeys(target);},
  getOwnPropertyDescriptor(target,key){traps.getOwnPropertyDescriptor++;return Reflect.getOwnPropertyDescriptor(target,key);},getPrototypeOf(target){traps.getPrototypeOf++;return Reflect.getPrototypeOf(target);},
 });
 failed(input,'invalid-input');expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
});

it('returns disabled without manufacturing a comparison and leaves old imageReading and its saved chart unchanged',()=>{
 const chars=[...'安宁'].map(char=>entry(char)),chart=clone(fixture.chart) as QimenChart;
 const metadata={profile:nameImageryProfile(),chartSha256:fixture.sourceChartSha};
 const old=calculateNameImageryReading('林','安宁',chars,chart,metadata),oldBefore=JSON.stringify(old),chartBefore=JSON.stringify(chart);
 const input=prepared(),before=JSON.stringify(input);input.enabled=false;expect(compareQimenCultural(input)).toEqual({kind:'disabled'});
 input.enabled=true;expect(JSON.stringify(input)).toBe(before);result(compareQimenCultural(input));
 expect(JSON.stringify(old)).toBe(oldBefore);expect(JSON.stringify(chart)).toBe(chartBefore);
 expect(calculateNameImageryReading('林','安宁',chars,chart,metadata)).toEqual(old);
 expect(old.goodBadScore).toBeNull();expect(old.unionPalaces).toEqual([2,8]);
});

it('does not walk disabled chart or candidate getters',()=>{
 let calls=0;const input={enabled:false};
 Object.defineProperty(input,'qimen',{enumerable:true,get(){calls++;throw Error('disabled chart must not execute');}});
 Object.defineProperty(input,'candidates',{enumerable:true,get(){calls++;throw Error('disabled candidates must not execute');}});
 expect(compareQimenCultural(input as PreparedCulturalComparisonInput)).toEqual({kind:'disabled'});expect(calls).toBe(0);
});
