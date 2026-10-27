import {afterEach,describe,expect,it,vi} from 'vitest';
import * as beforeNaming from './helpers/m331-baseline/naming';
import {verifyCandidateFacts as beforeVerifyCandidateFacts} from './helpers/m331-baseline/candidate-facts';
import * as afterNaming from '../src/domain/naming';
import * as afterV7 from '../src/domain/naming-v7';
import {verifyCandidateFacts} from '../src/main/candidate-facts';
import {NAMING_RULE_V4_VERSION,NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION,NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,type NamingRuleVersion} from '../src/shared/naming-rules';
import {benchmarkFixture,manualFixture,projectFixtureForVersion,scalarRows,sessionFromCandidates,transparentMap,type CandidateFixture,type CandidateInput,type ReviewedVersion} from './helpers/m331-candidate-fixture';
import reviewedCitationTable from '../data/naming-editorial-v7.json';
import type {NameCandidate,NamingSession} from '../src/shared/types';

const versions:ReviewedVersion[]=[NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION];
const candidateFields=['id','givenName','fullName','pinyin','style','characters','meaning','reason','citations','evaluation','warnings','traditionalReason','favorite','origin','reviewNote','originalMeaning'].sort();
const pairs=['斐然','安然','南安','南木','琼莹','静朔','安安','龘龘','𠀀安','','安'];
const rows=(names:string[]=pairs):CandidateInput[]=>names.flatMap(givenName=>[{givenName,origin:'local' as const},{givenName,origin:'ai' as const}]);

function batch(fixture:CandidateFixture,candidates:ReadonlyArray<CandidateInput>,version:NamingRuleVersion=fixture.version,inspect?:(expected:NameCandidate|null,index:number)=>void){
 return afterNaming.recomputeCandidateFactsBatchForRuleVersion(version,fixture.context,fixture.profile,fixture.preferences,fixture.analysis,fixture.characters,fixture.citations,candidates,fixture.basis,inspect);
}
function original(fixture:CandidateFixture,candidates:ReadonlyArray<CandidateInput>){
 return scalarRows(fixture,candidates,beforeNaming.evaluateNameForRuleVersionWithContext,beforeNaming.evaluateNameWithResolvedBasisForRuleVersion);
}
/** Keep UUID in the full comparison, assigning exactly the same deterministic sequence to both runs. */
function deterministic<T>(run:()=>T):T {
 let index=0;const actualCrypto=globalThis.crypto;
 const replacement=new Proxy(actualCrypto,{get(target,key){if(key==='randomUUID')return ()=>`00000000-0000-4000-8000-${String(++index).padStart(12,'0')}`;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 vi.stubGlobal('crypto',replacement);
 try{return run();}finally{vi.unstubAllGlobals();}
}
function outcome(run:()=>unknown){
 try{return {status:'returned' as const,value:run()};}catch(error){const value=error as Error&{code?:string};return {status:'thrown' as const,name:value.name,message:value.message,...(value.code?{code:value.code}:{})};}
}
function matchingRejection(a:()=>unknown,b:()=>unknown,fragment?:string){
 const expected=outcome(a),actual=outcome(b);expect(expected.status).toBe('thrown');expect(actual).toEqual(expected);if(fragment&&actual.status==='thrown')expect(actual.message).toContain(fragment);
}
/** Fixed original publication row; only captured original selectors/evaluation establish its actual binding. */
function boundCitationName(fixture:CandidateFixture){
 const rule=reviewedCitationTable.nameRules.find(row=>row.name==='宜家');if(!rule)throw Error('Missing fixed original 宜家 citation rule');
 const characters=rule.readings.map(binding=>{const character=fixture.characters.find(row=>row.char===binding.char);if(!character)throw Error('Missing actual fixed citation character '+binding.char);return character;});
 const selected=beforeNaming.selectNamingCitationsForRuleVersionWithContext(fixture.version,fixture.context,rule.name,characters,fixture.citations);
 expect(selected).toEqual([rule.citation]);
 const candidate=deterministic(()=>original(fixture,[{givenName:rule.name,origin:'local'}]))[0];
 if(!candidate)throw Error('Captured original scalar rejected the fixed citation fixture');
 expect(candidate.citations).toEqual([rule.citation]);
 return rule.name;
}
function frozenSession(fixture:CandidateFixture,withBoundCitation=false){
 const names=['斐然','南安','安安'];if(withBoundCitation)names.push(boundCitationName(fixture));
 const candidates=deterministic(()=>original(fixture,rows(names))).filter((candidate):candidate is NameCandidate=>candidate!==null);
 expect(candidates.length).toBeGreaterThanOrEqual(4);
 return sessionFromCandidates(fixture,candidates);
}
function verifyBoth(fixture:CandidateFixture,session:NamingSession){
 const project=fixture.basis?.source==='project'?fixture.basis:undefined;
 return [()=>beforeVerifyCandidateFacts(session,fixture.archive,fixture.archive,project),()=>verifyCandidateFacts(session,fixture.archive,fixture.archive,project)] as const;
}

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('M331 full-field candidate equivalence against captured original modules',()=>{
 for(const version of versions){
  for(const mode of ['manual','legacy'] as const)it(`${version} ${mode}: every candidate field, local/AI, invalid names and repeated characters`,()=>{
   const fixture=manualFixture(version,2,mode==='manual'?['水']:[]),inputs=rows();
   const expected=deterministic(()=>original(fixture,inputs)),actual=deterministic(()=>batch(fixture,inputs));
   expect(actual).toEqual(expected);
   expect(actual).toHaveLength(inputs.length);
   expect(actual.slice(-6)).toEqual([null,null,null,null,null,null]);
   expect(actual.some(candidate=>candidate?.givenName==='安安')).toBe(true);
   for(const candidate of actual)if(candidate)expect(Object.keys(candidate).sort()).toEqual(candidateFields);
  });
  it(`${version}: one-character results and required/generation/forbidden constraints remain exact`,()=>{
   const fixture=manualFixture(version,1),inputs=rows(['南','木','安','斐','宁','龘','𠀀','']);
   expect(deterministic(()=>batch(fixture,inputs))).toEqual(deterministic(()=>original(fixture,inputs)));
   const constrained=manualFixture(version);constrained.preferences.requiredChars='安';constrained.preferences.generationChar='南';constrained.preferences.forbiddenChars='木';
   const names=rows(['南安','安南','南木','斐然','安安']);
   expect(deterministic(()=>batch(constrained,names))).toEqual(deterministic(()=>original(constrained,names)));
  });
  it(`${version} project: main resolver issues a real snapshot and fixed replay registers the actual basis`,()=>{
   const fixture=projectFixtureForVersion(version),inputs=rows(['斐然','南安','南木','安安','沐安','龘龘']);
   expect(fixture.basis?.source).toBe('project');expect(fixture.basis?.elements).toEqual(['土','金']);
   expect(deterministic(()=>batch(fixture,inputs))).toEqual(deterministic(()=>original(fixture,inputs)));
   const session=frozenSession(fixture),[a,b]=verifyBoth(fixture,session),before=structuredClone(session);
   expect(b()).toEqual(a());expect(session).toEqual(before);
   matchingRejection(()=>beforeVerifyCandidateFacts(session,fixture.archive,fixture.archive,structuredClone(fixture.basis) as never),()=>verifyCandidateFacts(session,fixture.archive,fixture.archive,structuredClone(fixture.basis) as never),'真实固定重放');
  },20000);
 }
 it('keeps legacy 4/5/6 dispatch on the original public entry',()=>{
  const fixture=manualFixture(),inputs=rows(['斐然','安然','安安','龘龘']);
  for(const version of [NAMING_RULE_V4_VERSION,NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION]){
   const expected=deterministic(()=>inputs.map(row=>beforeNaming.evaluateNameForRuleVersionWithContext(version,fixture.context,row.givenName,fixture.profile,fixture.preferences,fixture.analysis,fixture.characters,fixture.citations,row.origin)));
   expect(deterministic(()=>batch(fixture,inputs,version))).toEqual(expected);
  }
 });
});

describe('M331 preserves all fact verification and public rejection boundaries',()=>{
 for(const version of versions)it(`${version}: canonical fact result and tamper rejection are identical to the captured verifier`,()=>{
  const fixture=manualFixture(version),good=frozenSession(fixture,true),[a,b]=verifyBoth(fixture,good),before=structuredClone(good);
  expect(b()).toEqual(a());expect(b()).toEqual({version:'candidate-facts/1.0.0',status:'verified-builtin',dataVersion:fixture.archive.version,datasetSha256:fixture.archive.sha256});expect(good).toEqual(before);
  const edits:Array<[string,(session:NamingSession)=>void]>=[
   ['source',session=>{session.sourceSnapshot!.sources[0].commit+='-forged';}],
   ['citation',session=>{const candidate=session.candidates.find(row=>row.citations.length);if(!candidate)throw Error('Fixture requires an actual bound citation');candidate.citations[0].text+='伪造';}],
   ['character',session=>{session.candidates[0].characters[0].meaning+='伪造';}],
   ['reading',session=>{session.candidates[0].characters[0].pinyin='fake';}],
   ['score',session=>{session.candidates[0].evaluation.traditional++;}],
   ['unknown-version',session=>{session.namingRules!.version='naming-editorial-99.0.0' as never;}],
   ['review-snapshot',session=>{delete session.candidates[0].namingMeaningReview;}],
   ['frozen-generation-preferences',session=>{delete session.profile.namingPreferences;}],
  ];
  for(const [label,edit]of edits){
   if(label==='frozen-generation-preferences'&&version===NAMING_RULE_V7_VERSION)continue;
   const session=structuredClone(good);edit(session);const unchanged=structuredClone(session),[oldVerify,newVerify]=verifyBoth(fixture,session);
   matchingRejection(oldVerify,newVerify);expect(session,label).toEqual(unchanged);
  }
 });
 it('recomputes every local and AI candidate instead of trusting an earlier accepted score',()=>{
  const fixture=manualFixture(),session=frozenSession(fixture);
  for(const index of [0,1,session.candidates.length-1]){const bad=structuredClone(session);bad.candidates[index].evaluation.sound++;const[a,b]=verifyBoth(fixture,bad);matchingRejection(a,b,'真实复算');}
 });
 it('preserves the first candidate score error before evaluating a later malformed name',()=>{
  const fixture=manualFixture(),session=frozenSession(fixture);session.candidates[0].evaluation.sound++;
  session.candidates[1].givenName=null as unknown as string;
  const[a,b]=verifyBoth(fixture,session);matchingRejection(a,b,'真实复算');
 });
 it('preserves the first candidate score error before reading a later candidate getter',()=>{
  const fixture=manualFixture(),session=frozenSession(fixture);session.candidates[0].evaluation.sound++;let getterCalls=0;
  Object.defineProperty(session.candidates[1],'givenName',{enumerable:true,get(){getterCalls++;throw Error('Later candidate getter executed before first candidate inspection');}});
  const[a,b]=verifyBoth(fixture,session);matchingRejection(a,b,'真实复算');expect(getterCalls).toBe(0);
 });
 it('public evaluators retain exact argument guards and reject caller-provided cache values',()=>{
  const fixture=manualFixture(),args=['南安',fixture.profile,fixture.preferences,fixture.analysis,fixture.characters,fixture.citations,'local',new Map()];
  matchingRejection(()=>Reflect.apply(beforeNaming.evaluateNameForRuleVersionWithContext,undefined,[fixture.version,fixture.context,...args]),()=>Reflect.apply(afterNaming.evaluateNameForRuleVersionWithContext,undefined,[fixture.version,fixture.context,...args]),'不能使用外部缓存');
  matchingRejection(()=>Reflect.apply(beforeNaming.evaluateNameWithResolvedBasisForRuleVersion,undefined,[fixture.version,fixture.context,{source:'manual',elements:['水']},...args]),()=>Reflect.apply(afterNaming.evaluateNameWithResolvedBasisForRuleVersion,undefined,[fixture.version,fixture.context,{source:'manual',elements:['水']},...args]),'不能使用外部缓存');
  expect(()=>Reflect.apply(afterV7.evaluateNameWithContext,undefined,[fixture.context,...args])).toThrow('不接受外部缓存');
  expect(()=>Reflect.apply(afterNaming.recomputeCandidateFactsBatchForRuleVersion,undefined,[fixture.version,fixture.context,fixture.profile,fixture.preferences,fixture.analysis,fixture.characters,fixture.citations,rows(['南安']),undefined,undefined,new Map()])).toThrow('不接受外部缓存');
 });
 it('unknown version and incorrect fixed-package identity still reject before any batch work',()=>{
  const fixture=manualFixture(),input=rows(['南安']);
  matchingRejection(()=>beforeNaming.evaluateNameForRuleVersionWithContext('unknown' as never,fixture.context,'南安',fixture.profile,fixture.preferences,fixture.analysis,fixture.characters,fixture.citations,'local'),()=>batch(fixture,input,'unknown' as never),'未记录或未知');
  const bad={...fixture,context:{...fixture.context,activeVersion:'wrong'}};
  matchingRejection(()=>original(bad,input),()=>batch(bad,input),'完整知识包身份');
  expect(batch(fixture,[],'unknown' as never)).toEqual([]);
 });
});

describe('M331 private synchronous batch lifetime and transparent count evidence',()=>{
 it('empty and pre-lookup rejected names create no character lookup',()=>{
  const fixture=manualFixture(),probe=transparentMap(fixture.characters);fixture.characters=probe.characters;
  expect(batch(fixture,[])).toEqual([]);expect(probe.counts.characterMaps).toBe(0);
  expect(batch(fixture,rows(['','安','三个字']))).toEqual([null,null,null,null,null,null]);expect(probe.counts.characterMaps).toBe(0);
 });
 it('same engineering input uses one complete character map in a batch and retains full equality',()=>{
  const {fixture,rows:inputs}=benchmarkFixture(),oldProbe=transparentMap(fixture.characters),newProbe=transparentMap(fixture.characters);
  const expected=deterministic(()=>original({...fixture,characters:oldProbe.characters},inputs)),actual=deterministic(()=>batch({...fixture,characters:newProbe.characters},inputs));
  expect(actual).toEqual(expected);expect(newProbe.counts.characterMaps).toBe(1);expect(oldProbe.counts.characterMaps).toBeGreaterThan(newProbe.counts.characterMaps);
 });
 it('inspects each complete result synchronously before evaluating the next row',()=>{
  const fixture=manualFixture(),inputs=rows(['南安','斐然']),inspected:Array<{index:number;givenName:string|null;origin:string|null}>=[];
  const expected=deterministic(()=>original(fixture,inputs));
  const actual=deterministic(()=>batch(fixture,inputs,fixture.version,(candidate,index)=>{inspected.push({index,givenName:candidate?.givenName??null,origin:candidate?.origin??null});}));
  expect(actual).toEqual(expected);expect(inspected).toEqual(expected.map((candidate,index)=>({index,givenName:candidate?.givenName??null,origin:candidate?.origin??null})));
 });
 it('rejects Promise or other non-undefined inspection results, then creates a fresh context',()=>{
  const fixture=manualFixture(),probe=transparentMap(fixture.characters);fixture.characters=probe.characters;const inputs=rows(['南安','斐然']);
  for(const inspect of [()=>Promise.resolve(),()=>true]){
   const before=probe.counts.characterMaps;
   expect(()=>batch(fixture,inputs,fixture.version,inspect)).toThrow('必须同步完成且不返回值');expect(probe.counts.characterMaps-before).toBe(1);
   const expected=deterministic(()=>original(fixture,inputs)),beforeFresh=probe.counts.characterMaps;
   expect(deterministic(()=>batch(fixture,inputs))).toEqual(expected);expect(probe.counts.characterMaps-beforeFresh).toBe(1);
  }
 });
 for(const mutation of ['character','citation'] as const)it(`internal inspection rejects same-reference ${mutation} mutation and a later call uses fresh data`,()=>{
  const fixture=manualFixture(),probe=transparentMap(fixture.characters);fixture.characters=probe.characters;const inputs=rows(['南安','斐然']);
  const characters=fixture.characters,citations=fixture.citations,characterLength=characters.length,citationLength=citations.length;
  // This is the new internal callback contract, separate from unchanged public scalar behavior.
  const changed=mutation==='character'?characters.find(row=>row.char==='安'):citations.find(row=>row.id==='shijing-161-3');
  if(!changed)throw Error('Missing actual fixed input for callback mutation fixture');
  expect(()=>batch(fixture,inputs,fixture.version,(_candidate,index)=>{
   if(index!==0)return;
   if('char' in changed)changed.meaning+='inspect mutation';else changed.text+='inspect mutation';
  })).toThrow('固定字库或引文在调用期间发生变化');
  expect(fixture.characters).toBe(characters);expect(fixture.citations).toBe(citations);expect(characters).toHaveLength(characterLength);expect(citations).toHaveLength(citationLength);
  expect(probe.counts.characterMaps).toBe(1);
  const expected=deterministic(()=>original(fixture,inputs)),beforeFresh=probe.counts.characterMaps;
  expect(deterministic(()=>batch(fixture,inputs))).toEqual(expected);expect(probe.counts.characterMaps-beforeFresh).toBe(1);
 });
 it('separate calls rebuild context even for the same array identity, including after an async boundary',async()=>{
  const fixture=manualFixture(),citationName=boundCitationName(fixture),probe=transparentMap(fixture.characters);fixture.characters=probe.characters;const inputs=rows(['南安',citationName]);
  const first=deterministic(()=>batch(fixture,inputs)),firstCount=probe.counts.characterMaps;
  expect(firstCount).toBe(1);
  await Promise.resolve();
  fixture.preferences.preferredElements=['土'];fixture.profile.surname='王';fixture.profile.surnamePinyin='wáng';fixture.analysis.bazi.favorable=['金'];
  const changed=fixture.characters.find(character=>character.char==='安');if(!changed)throw Error('Missing actual 安 dictionary entry');changed.meaning+='请求边界';
  const citation=first.find(candidate=>candidate?.citations.length)?.citations[0];if(!citation)throw Error('Fixture requires a bound citation before the boundary');
  const archivedCitation=fixture.citations.find(row=>row.id===citation.id);if(!archivedCitation)throw Error('Missing actual archived citation');archivedCitation.text+='请求边界';
  const expected=deterministic(()=>original(fixture,inputs)),beforeSecond=probe.counts.characterMaps,second=deterministic(()=>batch(fixture,inputs));
  expect(second).toEqual(expected);expect(second).not.toEqual(first);expect(probe.counts.characterMaps-beforeSecond).toBe(1);
 });
 it('a thrown evaluation cannot leave a reusable cache for a later call',()=>{
  const fixture=manualFixture(),inputs=rows(['南安','斐然']),probe=transparentMap(fixture.characters);fixture.characters=probe.characters;
  const poison=[...inputs,{givenName:null as unknown as string,origin:'local' as const}];
  expect(()=>batch(fixture,poison)).toThrow();
  const before=probe.counts.characterMaps,expected=deterministic(()=>original(fixture,inputs)),afterOriginal=probe.counts.characterMaps;
  expect(afterOriginal).toBeGreaterThan(before);
  const actual=deterministic(()=>batch(fixture,inputs));expect(actual).toEqual(expected);expect(probe.counts.characterMaps-afterOriginal).toBe(1);
 });
 it('retains real parent homophone warnings and scalar equality while sharing the complete batch map',()=>{
  for(const version of versions){
   const fixture=manualFixture(version);fixture.preferences.avoidParentNames=false;fixture.profile.fatherName='林之元';fixture.profile.motherName='王之元';
   const inputs=rows(['知元','南安']),reference=afterV7.mandarinParentNameReference(fixture.profile,'知元',fixture.characters,{warnUnresolved:false});
   expect(reference.matches).toEqual(expect.arrayContaining([expect.objectContaining({role:'father',scope:'given-name',comparison:'exact'}),expect.objectContaining({role:'mother',scope:'given-name',comparison:'exact'})]));
   const expected=deterministic(()=>scalarRows(fixture,inputs,afterNaming.evaluateNameForRuleVersionWithContext,afterNaming.evaluateNameWithResolvedBasisForRuleVersion)),probe=transparentMap(fixture.characters);
   const actual=deterministic(()=>batch({...fixture,characters:probe.characters},inputs));expect(actual).toEqual(expected);expect(probe.counts.characterMaps).toBe(1);
   const child=actual.find(candidate=>candidate?.givenName==='知元');expect(child).toBeTruthy();for(const warning of reference.warnings)expect(child!.warnings).toContain(warning);
  }
 });
 it('public parent references and later batches rebuild from current input without retaining a prior lookup',()=>{
  const fixture=manualFixture();fixture.preferences.avoidParentNames=false;fixture.profile.fatherName='林之元';const probe=transparentMap(fixture.characters);fixture.characters=probe.characters;
  const firstReference=afterV7.mandarinParentNameReference(fixture.profile,'知元',fixture.characters,{warnUnresolved:false});expect(firstReference.matches.some(match=>match.comparison==='exact')).toBe(true);expect(probe.counts.characterMaps).toBe(1);
  const inputs=rows(['知元']),beforeFirst=probe.counts.characterMaps,first=deterministic(()=>batch(fixture,inputs));expect(probe.counts.characterMaps-beforeFirst).toBe(1);
  const parent=fixture.characters.find(entry=>entry.char==='之');if(!parent)throw Error('Missing actual parent reading fixture');parent.pinyin='zhì';parent.tone=4;
  const beforeReference=probe.counts.characterMaps,currentReference=afterV7.mandarinParentNameReference(fixture.profile,'知元',fixture.characters,{warnUnresolved:false});expect(probe.counts.characterMaps-beforeReference).toBe(1);expect(currentReference.matches.some(match=>match.comparison==='tone-only')).toBe(true);
  const expected=deterministic(()=>scalarRows(fixture,inputs,afterNaming.evaluateNameForRuleVersionWithContext,afterNaming.evaluateNameWithResolvedBasisForRuleVersion)),beforeSecond=probe.counts.characterMaps,second=deterministic(()=>batch(fixture,inputs));
  expect(second).toEqual(expected);expect(second).not.toEqual(first);expect(probe.counts.characterMaps-beforeSecond).toBe(1);for(const warning of currentReference.warnings)expect(second[0]!.warnings).toContain(warning);
 });
});
