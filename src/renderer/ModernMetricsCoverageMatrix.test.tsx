import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {beforeAll,describe,it,expect} from 'vitest';
import type {NameCandidate,NamingSession,CharacterEntry} from '../shared/types';
import type {ParentNamePhoneticSnapshot} from '../shared/parent-name-phonetics-review';
import type {NamePhoneticAdapter} from '../shared/name-phonetic-review-types';
import {buildModernMetricsCoverage,type ModernMetricId} from '../shared/modern-metrics';
import {modernRecordView,validModernRecord} from '../shared/modern-practical-evidence';
import {normalizePreferences} from '../shared/workflow';
import {loadNamePhoneticAdapter} from '../main/name-phonetic-adapter';
import {loadYueReadingData} from '../main/yue-reading-data';
import {calculateYueNameReading,confirmYueNameReading} from '../domain/yue-reading';
import {savedParentNamePhoneticsDisplay} from './SavedParentNamePhoneticsView';
import {normalizeSelectedPinyin} from '../../data/name-phonetic/name-phonetic-engine.mjs';
import {ModernMetricsCoverageMatrix} from './ModernMetricsCoverageMatrix';
import {ModernPracticalEvidenceView} from './ModernPracticalEvidenceView';

const load=<T,>(name:string):T=>JSON.parse(readFileSync(resolve('tests/fixtures',name),'utf8'));
const saved=load<NamingSession>('saved-modern-ui-session.json');
const modernCandidate=saved.candidates.find(candidate=>candidate.modernPracticalEvidence)!;
const empty=():NameCandidate=>{const candidate=structuredClone(modernCandidate);delete candidate.modernPracticalEvidence;return candidate;};
const metric=(candidate:NameCandidate,id:ModernMetricId)=>buildModernMetricsCoverage(candidate).rows.find(row=>row.id===id)!;
const replace=(candidate:NameCandidate,key:keyof NameCandidate,value:unknown)=>Object.defineProperty(candidate,key,{value,enumerable:true,configurable:true,writable:true});
const unmeasured=(candidate:NameCandidate,id:ModernMetricId)=>expect(metric(candidate,id)).toMatchObject({status:'not-measured',value:null,sourceIds:[]});
let bothPhonetics:NameCandidate;
let legacyYue:NameCandidate;
let family:NameCandidate;
let adapter:NamePhoneticAdapter;
let dictionary:CharacterEntry[];

beforeAll(()=>{
 const candidate=empty(),data=loadYueReadingData(resolve('data')).data;
 candidate.yueReading=confirmYueNameReading(calculateYueNameReading(saved.profile.surname,candidate.givenName,data),{
  surname:{tokens:['lei5'],origin:'user',confirmed:true},
  given:[{tokens:['zi1'],origin:'user',confirmed:true},{tokens:['on1'],origin:'user',confirmed:true}]
 });
 adapter=loadNamePhoneticAdapter(resolve('data'));
 candidate.namePhoneticReviews=adapter.calculate(saved.profile,normalizePreferences({yueReading:true,namePhonetics:{cmn:{version:'cmn-homophone-review/1.0.0',mode:'strict'},yue:{version:'yue-homophone-review/1.2.0',mode:'strict'}}}),candidate);
 if(!candidate.namePhoneticReviews)throw Error('Real adapter did not return a saved snapshot');
 bothPhonetics=candidate;
 const records=load<{records:Array<{rawJson:string}>}>('yue-homophone-v1-actual-sessions.json');
 const candidates=records.records.flatMap(record=>(JSON.parse(record.rawJson) as NamingSession).candidates);
 const assessed=candidates.find(row=>row.yueHomophones?.status==='assessed');
 if(!assessed)throw Error('No real assessed legacy Yue snapshot');
 legacyYue=assessed;
 const snapshot=load<{snapshot:ParentNamePhoneticSnapshot}>('saved-parent-review-dev.json').snapshot;
 dictionary=(JSON.parse(readFileSync(resolve('data/dataset-v6.json'),'utf8')) as {characters:CharacterEntry[]}).characters;
 family={...empty(),id:snapshot.candidateId,givenName:snapshot.capture.child.givenName,fullName:snapshot.result.childFullName,
  characters:snapshot.capture.child.characters.map(unit=>{const char=dictionary.find(row=>row.char===unit.char);if(!char)throw Error('Real parent snapshot character missing');return char;}),parentNamePhoneticReview:snapshot};
});

function realCmnCandidate(glyphs:string[]):NameCandidate{
 const characters=glyphs.map(glyph=>{const value=dictionary.find(char=>char.char===glyph);if(!value)throw Error('Real dictionary character missing: '+glyph);return structuredClone(value);});
 const candidate={...empty(),givenName:glyphs.join(''),fullName:saved.profile.surname+glyphs.join(''),characters,pinyin:[saved.profile.surnamePinyin,...characters.map(char=>char.pinyin)].join(' ')};
 candidate.namePhoneticReviews=adapter.calculate(saved.profile,normalizePreferences({namePhonetics:{cmn:{version:'cmn-homophone-review/1.0.0',mode:'strict'}}}),candidate);
 return candidate;
}

describe('M922 candidate Mandarin reading compatibility',()=>{
 it.each([{char:'学',token:'xue2'},{char:'雪',token:'xue3'},...['岳','悦','越','跃','月','玥'].map(char=>({char,token:'yue4'}))])('preserves a genuine assessed $char晶 $token snapshot',({char,token})=>{
  const candidate=realCmnCandidate([char,'晶']),snapshot=candidate.namePhoneticReviews!;
  adapter.verifySession({...saved,preferences:normalizePreferences({namePhonetics:{cmn:{version:'cmn-homophone-review/1.0.0',mode:'strict'}}}),candidates:[candidate],sourceSnapshot:{...saved.sourceSnapshot!,sources:[...saved.sourceSnapshot!.sources.filter(source=>!adapter.sources.some(actual=>actual.id===source.id)),...adapter.sources]}});
  expect(snapshot.reviews.cmn!.status).toBe('assessed');expect(snapshot.reviews.cmn!.selectedTokens).toEqual(['li3',token,'jing1']);expect(snapshot.selectedReadings.cmn!.given.every(unit=>unit.selection?.confirmed===true)).toBe(true);
  expect(snapshot.reviews.cmn!.sourceIds).toEqual(['phonetic-wiktionary-fixed-137','phonetic-rime-fixed-137']);if(char==='岳'){expect(candidate.characters[0]).toMatchObject({char:'岳',pinyin:'yuè',tone:4});expect(snapshot.reviews.cmn!.matches.map(match=>match.rule.term)).toContain('月經');}
  const before=JSON.stringify(candidate);expect(metric(candidate,'mandarin-homophone').status).toBe('measured');expect(renderToStaticMarkup(<ModernMetricsCoverageMatrix candidate={candidate}/>)).toMatch(/data-metric-id="mandarin-homophone" data-status="measured"/);expect(JSON.stringify(candidate)).toBe(before);
 });
 it('accepts the real adapter token for each of the 779 dictionary default readings',()=>{
  expect(dictionary).toHaveLength(779);
  const failures:Array<{char:string;pinyin:string;reviewStatus:unknown;matrixStatus:string}>=[];
  for(const character of dictionary){const candidate=realCmnCandidate([character.char]),review=candidate.namePhoneticReviews!.reviews.cmn!,row=metric(candidate,'mandarin-homophone');if(review.status!=='assessed'||row.status!=='measured'||review.selectedTokens[1]!==normalizeSelectedPinyin(character.pinyin,1)[0])failures.push({char:character.char,pinyin:character.pinyin,reviewStatus:review.status,matrixStatus:row.status});}
  expect(failures).toEqual([]);
 });
 it('still rejects unknown, malformed, unconfirmed or source-incomplete 岳晶 snapshots',()=>{
  const base=realCmnCandidate(['岳','晶']);
  const unconfirmed=structuredClone(base);Object.defineProperty(unconfirmed.namePhoneticReviews!.selectedReadings.cmn!.given[0].selection!,'confirmed',{value:false});unmeasured(unconfirmed,'mandarin-homophone');
  const missingSource=structuredClone(base);Reflect.deleteProperty(missingSource.namePhoneticReviews!.reviews.cmn!,'sourceIds');unmeasured(missingSource,'mandarin-homophone');
  const wrongTone=structuredClone(base);wrongTone.characters[0].tone=3;unmeasured(wrongTone,'mandarin-homophone');
  const malformed=structuredClone(base);malformed.characters[0].pinyin='yue';unmeasured(malformed,'mandarin-homophone');
  const mixed=structuredClone(base);mixed.characters[0].pinyin='yuè4';unmeasured(mixed,'mandarin-homophone');
  const unsupported=structuredClone(base);replace(unsupported,'namePhoneticReviews',{version:'future'});unmeasured(unsupported,'mandarin-homophone');
 });
});

describe('M921 modern metrics saved-state boundary',()=>{
 it('represents every missing metric as null and renders 未测',()=>{
  const before=JSON.stringify(empty()),matrix=buildModernMetricsCoverage(empty());
  expect(matrix.rows).toHaveLength(6);expect(matrix.rows.every(row=>row.status==='not-measured'&&row.value===null)).toBe(true);
  const html=renderToStaticMarkup(<ModernMetricsCoverageMatrix candidate={empty()}/>);
  expect(html).toContain('现代命名指标覆盖矩阵');expect(html.match(/data-status="not-measured"/g)).toHaveLength(6);expect(html).toContain('未测');expect(html).toContain('当前全国全名重名率');expect(JSON.stringify(empty())).toBe(before);
 });
 it('uses the existing modern current-state decision for a genuine saved record',()=>{
  expect(validModernRecord(modernCandidate.modernPracticalEvidence)).toBe(true);expect(modernRecordView(modernCandidate).state).toBe('current');
  expect(metric(modernCandidate,'industry-wording')).toMatchObject({status:'measured',value:'已保存行业关键词词面观察'});
  expect(metric(modernCandidate,'industry-wording').sourceIds).toContain('naming-editorial-meanings-v7-fixed');
 });
 it.each([{version:'future'},{version:'modern-practical-evidence/1.0.0'},null])('never treats an unknown or malformed modern record as measured: %j',value=>{
  const candidate=empty();replace(candidate,'modernPracticalEvidence',value);unmeasured(candidate,'industry-wording');
  expect(()=>renderToStaticMarkup(<ModernMetricsCoverageMatrix candidate={candidate}/>)).not.toThrow();
 });
 it('labels a genuine stale modern record as historical without claiming current measurement',()=>{
  const candidate=structuredClone(modernCandidate);candidate.meaning='后来修改的寓意';
  expect(modernRecordView(candidate).state).toBe('stale');expect(metric(candidate,'industry-wording')).toMatchObject({status:'historical',value:'历史已保存行业词面观察'});
  const html=renderToStaticMarkup(<ModernMetricsCoverageMatrix candidate={candidate}/>);expect(html).toContain('历史观察');expect(html).toContain('不代表当前组合寓意');
 });
 it('rejects modern evidence transplanted to a different candidate with the same meaning',()=>{
  const candidate=structuredClone(modernCandidate);candidate.id='another-candidate';unmeasured(candidate,'industry-wording');
 });
 it('does not call an uninterpreted industry rule or a missing rule source measured',()=>{
  for(const kind of ['unknown-status','missing-source']){const candidate=structuredClone(modernCandidate),view=modernRecordView(candidate);if(!view.record||view.record.evidence.status!=='recorded-evidence')throw Error('Real record missing');const industry=view.record.evidence.observations.meaningIndustry.industry;if(kind==='unknown-status')industry.status='future';else industry.recordedRuleIdentitySource=null;unmeasured(candidate,'industry-wording');}
 });
 it('retains genuine assessed Mandarin and new Yue1.2 results from the real adapter',()=>{
  for(const id of ['mandarin-homophone','cantonese-homophone'] as const){expect(metric(bothPhonetics,id).status).toBe('measured');expect(metric(bothPhonetics,id).sourceIds).toEqual(['phonetic-wiktionary-fixed-137','phonetic-rime-fixed-137']);}
 });
 it('retains genuine supported legacy Yue evidence without recomputing it',()=>{
  const before=JSON.stringify(legacyYue);expect(metric(legacyYue,'cantonese-homophone').status).toBe('measured');expect(JSON.stringify(legacyYue)).toBe(before);
 });
 it('does not mark an unconfirmed name-phonetic or legacy Yue reading as measured',()=>{
  const phonetic=structuredClone(bothPhonetics);phonetic.namePhoneticReviews!.reviews.cmn!.status='not-assessed';phonetic.namePhoneticReviews!.reviews.yue!.status='not-assessed';
  unmeasured(phonetic,'mandarin-homophone');unmeasured(phonetic,'cantonese-homophone');
  const legacy=structuredClone(legacyYue);legacy.yueHomophones!.status='not-assessed';unmeasured(legacy,'cantonese-homophone');
 });
 it('rejects missing sourceIds without throwing instead of converting a record into measured evidence',()=>{
  const current=structuredClone(bothPhonetics);Reflect.deleteProperty(current.namePhoneticReviews!.reviews.cmn!,'sourceIds');Reflect.deleteProperty(current.namePhoneticReviews!.reviews.yue!,'sourceIds');
  unmeasured(current,'mandarin-homophone');unmeasured(current,'cantonese-homophone');
  const legacy=structuredClone(legacyYue);Reflect.deleteProperty(legacy.yueHomophones!,'sourceIds');unmeasured(legacy,'cantonese-homophone');
 });
 it('rejects missing or fabricated legacy source identities even when references are changed to agree',()=>{
  const partial=structuredClone(legacyYue);partial.yueHomophones!.sourceIds.pop();unmeasured(partial,'cantonese-homophone');
  const fabricated=structuredClone(legacyYue),review=fabricated.yueHomophones!;review.sourceIds=['foreign-source'];for(const source of review.sourceReferences)source.id='foreign-source';for(const match of review.matches)for(const source of match.sourceRefs)source.id='foreign-source';unmeasured(fabricated,'cantonese-homophone');
 });
 it('does not use a same-name phonetic snapshot after the adopted reading changes',()=>{
  const cmn=structuredClone(bothPhonetics);cmn.characters[0].pinyin='zhì';cmn.characters[0].tone=4;unmeasured(cmn,'mandarin-homophone');
  const yue=structuredClone(bothPhonetics);yue.yueReading!.given[0].selection!.tokens=['zi3'];unmeasured(yue,'cantonese-homophone');
  const old=structuredClone(legacyYue);delete old.yueReading;unmeasured(old,'cantonese-homophone');
  const missingSource=structuredClone(bothPhonetics);Reflect.deleteProperty(missingSource.yueReading!,'sourceIds');unmeasured(missingSource,'cantonese-homophone');
 });
 it('rejects unsupported phonetic versions, malformed wrappers and foreign-name bindings',()=>{
  for(const value of [{version:'future'},{version:'name-phonetic-reviews/1.0.0',reviews:{cmn:{},yue:{}}},null]){const candidate=empty();replace(candidate,'namePhoneticReviews',value);unmeasured(candidate,'mandarin-homophone');unmeasured(candidate,'cantonese-homophone');}
  const foreign=structuredClone(bothPhonetics);foreign.namePhoneticReviews!.reviews.cmn!.fullName='外来记录';foreign.namePhoneticReviews!.reviews.yue!.fullName='外来记录';unmeasured(foreign,'mandarin-homophone');unmeasured(foreign,'cantonese-homophone');
  const legacy=structuredClone(legacyYue);replace(legacy,'yueHomophones',{version:'future',status:'assessed'});unmeasured(legacy,'cantonese-homophone');
 });
 it('uses the saved family comparison bounds and states which parent was actually assessed',()=>{
  expect(savedParentNamePhoneticsDisplay(family).state).toBe('recorded');expect(metric(family,'parent-name-avoidance')).toMatchObject({status:'measured',value:'已保存家庭给名读音比较（1/2 位）'});
 });
 it('does not treat wholly unassessed, unsupported, malformed or foreign family records as measured',()=>{
  const absent=structuredClone(family);for(const row of absent.parentNamePhoneticReview!.result.comparisons){row.status='not-assessed';row.comparison=null;}unmeasured(absent,'parent-name-avoidance');
  const foreign=structuredClone(family);foreign.id='another-candidate';unmeasured(foreign,'parent-name-avoidance');
  for(const value of [{version:'future'},{version:'parent-name-phonetic-review/1.0.0'},null]){const candidate=empty();replace(candidate,'parentNamePhoneticReview',value);unmeasured(candidate,'parent-name-avoidance');}
 });
 it('rejects empty or changed assessed parent tokens and missing method-source identity',()=>{
  const changed=structuredClone(family),row=changed.parentNamePhoneticReview!.result.comparisons.find(item=>item.status==='matched')!;row.actualChildTokens=[];row.parentTokens=[];unmeasured(changed,'parent-name-avoidance');
  const method=structuredClone(family);Reflect.deleteProperty(method.parentNamePhoneticReview!.sourceSnapshot.method,'id');unmeasured(method,'parent-name-avoidance');
 });
 it('rejects malformed confirmed parent sounds and empty given-name character bindings',()=>{
  for(const token of ['', 'bogus']){const candidate=structuredClone(family),row=candidate.parentNamePhoneticReview!.result.comparisons.find(item=>item.status==='matched')!;row.parentTokens![0]=token;row.confirmedParentReading!.readings[0].token=token;unmeasured(candidate,'parent-name-avoidance');}
  const candidate=structuredClone(family);candidate.characters=[];candidate.parentNamePhoneticReview!.capture.child.characters=[];const row=candidate.parentNamePhoneticReview!.result.comparisons.find(item=>item.status==='matched')!;row.actualChildTokens=[];unmeasured(candidate,'parent-name-avoidance');
 });
 it('ignores inherited records and never invokes snapshot accessors',()=>{
  let calls=0;for(const key of ['modernPracticalEvidence','namePhoneticReviews','yueHomophones','parentNamePhoneticReview'] as const){const candidate=empty();Object.defineProperty(candidate,key,{enumerable:true,get(){calls++;throw Error('must not run');}});expect(()=>buildModernMetricsCoverage(candidate)).not.toThrow();expect(buildModernMetricsCoverage(candidate).rows.filter(row=>row.id!=='official-2021-given-name'&&row.id!=='psychological-measurement').every(row=>row.value===null)).toBe(true);}expect(calls).toBe(0);
 });
 it('keeps a matrix render read-only and never duplicates the official lookup',()=>{
  const before=JSON.stringify(bothPhonetics),html=renderToStaticMarkup(<ModernMetricsCoverageMatrix candidate={bothPhonetics}/>);
  expect(html).not.toContain('<button');expect(html).toContain('本矩阵未执行查询');expect(JSON.stringify(bothPhonetics)).toBe(before);
  for(const id of ['official-2021-given-name','psychological-measurement'] as const)expect(metric(bothPhonetics,id)).toMatchObject({status:'not-measured',value:null});
 });
 it('shows unknown modern evidence as unmeasured within the existing parent view',()=>{
  const candidate=empty();candidate.modernPracticalEvidence={version:'future'};const html=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={candidate} readOnly/>);
  expect(html).toContain('版本暂不支持');expect(html).toMatch(/data-metric-id="industry-wording" data-status="not-measured"/);
 });
});
