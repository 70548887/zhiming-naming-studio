import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadYueHomophoneData} from '../src/main/yue-homophone-data';
import {loadYueHomophoneExpandedData} from '../src/main/yue-homophone-expanded-data';
import {calculateYueHomophoneReviewForVersion,isCanonicalYueHomophoneReviewForVersion,resolveSessionYueHomophoneVersion,YUE_HOMOPHONE_CURRENT_VERSION,ALL_YUE_HOMOPHONE_SOURCE_IDS,yueHomophoneSourceIdsForVersion} from '../src/domain/yue-homophone-router';
import {namingInputKey,normalizePreferences,compareSessionReviews} from '../src/shared/workflow';
import {validYueHomophoneRuleVersion} from '../src/shared/yue-homophone-types';
import type {BirthProfile,NameCandidate,NamingPreferences,NamingSession,SessionSourceSnapshot} from '../src/shared/types';

interface SavedCase {table:string;rowId:string;profile:BirthProfile;preferences:NamingPreferences;sourceSnapshot:SessionSourceSnapshot;candidates:NameCandidate[];legacyInputKey:string;}
const frozen=JSON.parse(readFileSync(resolve('tests/fixtures/yue-homophone-v1-saved-goldens.json'),'utf8')) as {source:{sha256Before:string;sha256After:string};cases:SavedCase[]};
const {data:legacyData}=loadYueHomophoneData(resolve('data')),{data:expandedData,sources:expandedSources}=loadYueHomophoneExpandedData(resolve('data'));
const legacy='yue-homophone-review/1.0.0' as const;
function expandedSession() {
  const item=structuredClone(frozen.cases.find(item=>item.candidates.some(candidate=>candidate.yueHomophones?.status==='assessed'))!);
  item.preferences.yueHomophoneRuleVersion=YUE_HOMOPHONE_CURRENT_VERSION;
  item.sourceSnapshot.sources=item.sourceSnapshot.sources.filter(source=>!(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id)).concat(structuredClone(expandedSources));
  for(const candidate of item.candidates)candidate.yueHomophones=calculateYueHomophoneReviewForVersion(YUE_HOMOPHONE_CURRENT_VERSION,item.profile.surname,candidate.givenName,candidate.yueReading!,item.preferences.yueHomophones as 'strict'|'ignore-tone',expandedData);
  return item;
}

describe('frozen delivered 1.0 current/history reviews',()=>{
  it.each(frozen.cases)('preserves $table/$rowId without adding new fields or sources',item=>{
    expect(frozen.source.sha256After).toBe(frozen.source.sha256Before);expect(frozen.cases).toHaveLength(7);
    const before=JSON.stringify(item);
    expect(resolveSessionYueHomophoneVersion(item)).toBe(legacy);
    expect(normalizePreferences(item.preferences)).toEqual(item.preferences);
    expect(namingInputKey(item.profile,item.preferences)).toBe(item.legacyInputKey);
    for(const candidate of item.candidates) {
      const mode=item.preferences.yueHomophones as 'strict'|'ignore-tone';
      expect(calculateYueHomophoneReviewForVersion(legacy,item.profile.surname,candidate.givenName,candidate.yueReading!,mode,legacyData)).toEqual(candidate.yueHomophones);
      expect(isCanonicalYueHomophoneReviewForVersion(legacy,candidate.yueHomophones,item.profile.surname,candidate.givenName,candidate.yueReading!,mode,legacyData)).toBe(true);
      expect(isCanonicalYueHomophoneReviewForVersion(YUE_HOMOPHONE_CURRENT_VERSION,candidate.yueHomophones,item.profile.surname,candidate.givenName,candidate.yueReading!,mode,expandedData)).toBe(false);
    }
    expect(JSON.stringify(item)).toBe(before);
  });
  it('cannot attach new raw tags to an old saved result even though the shared type supports them for 1.1',()=>{
    const item=frozen.cases.find(item=>item.candidates.some(candidate=>candidate.yueHomophones!.matches.length))!,candidate=item.candidates.find(candidate=>candidate.yueHomophones!.matches.length)!,altered=structuredClone(candidate.yueHomophones!);
    altered.matches[0].glosses[0].rawTags=[];
    expect(isCanonicalYueHomophoneReviewForVersion(legacy,altered,item.profile.surname,candidate.givenName,candidate.yueReading!,item.preferences.yueHomophones as 'strict'|'ignore-tone',legacyData)).toBe(false);
  });
});

describe('strict saved-version and source routing',()=>{
  it('rejects an explicit null mode even in an otherwise disabled record without lexical sources',()=>{
    expect(()=>resolveSessionYueHomophoneVersion({preferences:{...normalizePreferences(),yueHomophones:null as never},candidates:[]})).toThrow('模式');
  });
  it('selects an explicitly persisted expanded version and keeps the caller snapshot immutable',()=>{
    const item=expandedSession(),before=JSON.stringify(item);expect(resolveSessionYueHomophoneVersion(item)).toBe(YUE_HOMOPHONE_CURRENT_VERSION);expect(JSON.stringify(item)).toBe(before);
    const ids=yueHomophoneSourceIdsForVersion(YUE_HOMOPHONE_CURRENT_VERSION);(ids as string[]).push('changed');expect(yueHomophoneSourceIdsForVersion(YUE_HOMOPHONE_CURRENT_VERSION)).toHaveLength(2);
  });
  it('allows explicit 1.0 generation inputs without upgrading historical missing-version records',()=>{
    const item=structuredClone(frozen.cases[0]);item.preferences.yueHomophoneRuleVersion=legacy;
    expect(resolveSessionYueHomophoneVersion(item)).toBe(legacy);expect(namingInputKey(item.profile,item.preferences)).toBe(item.legacyInputKey);
    expect(Object.hasOwn(normalizePreferences(frozen.cases[0].preferences),'yueHomophoneRuleVersion')).toBe(false);
    expect(namingInputKey(item.profile,{...item.preferences,yueHomophoneRuleVersion:YUE_HOMOPHONE_CURRENT_VERSION})).not.toBe(item.legacyInputKey);
  });
  it.each([
    ['deleted preference version',(item:SavedCase)=>{delete item.preferences.yueHomophoneRuleVersion;}],
    ['unknown preference version',(item:SavedCase)=>{item.preferences.yueHomophoneRuleVersion='future' as never;}],
    ['legacy preference against expanded results',(item:SavedCase)=>{item.preferences.yueHomophoneRuleVersion=legacy;}],
    ['missing result version',(item:SavedCase)=>{delete (item.candidates[0].yueHomophones as unknown as Record<string,unknown>).version;}],
    ['missing candidate result',(item:SavedCase)=>{delete item.candidates[0].yueHomophones;}],
    ['mixed candidate versions',(item:SavedCase)=>{const other=structuredClone(item.candidates[0]);other.yueHomophones!.version=legacy;item.candidates.push(other);}],
    ['missing fixed source',(item:SavedCase)=>{item.sourceSnapshot.sources.pop();}],
    ['cross-version source',(item:SavedCase)=>{item.sourceSnapshot.sources.push(...frozen.cases[0].sourceSnapshot.sources.filter(source=>source.id==='yue-homophones-wiktionary-fixed'));}],
    ['wrong result source',(item:SavedCase)=>{item.candidates[0].yueHomophones!.sourceIds[0]='yue-homophones-wiktionary-fixed';}],
    ['wrong result mode',(item:SavedCase)=>{item.candidates[0].yueHomophones!.mode=item.preferences.yueHomophones==='strict'?'ignore-tone':'strict';}],
    ['reading disabled',(item:SavedCase)=>{item.preferences.yueReading=false;}],
    ['empty candidates',(item:SavedCase)=>{item.candidates=[];}],
  ] as const)('rejects %s without falling back to latest',(_,change)=>{
    const item=expandedSession();change(item);expect(()=>resolveSessionYueHomophoneVersion(item)).toThrow();
  });
  it('rejects erased preference/results/source combinations instead of reinterpreting them as disabled',()=>{
    const item=expandedSession();item.preferences.yueHomophones='none';
    expect(()=>resolveSessionYueHomophoneVersion(item)).toThrow();delete item.preferences.yueHomophoneRuleVersion;
    expect(()=>resolveSessionYueHomophoneVersion(item)).toThrow();for(const candidate of item.candidates)delete candidate.yueHomophones;
    expect(()=>resolveSessionYueHomophoneVersion(item)).toThrow();item.sourceSnapshot.sources=item.sourceSnapshot.sources.filter(source=>!(ALL_YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id));
    expect(resolveSessionYueHomophoneVersion(item)).toBe(null);
  });
  it('accepts unrelated optional undefined fields while refusing relevant accessors without executing them',()=>{
    const item=expandedSession();item.profile.birthLongitude=undefined;Object.assign(item.candidates[0],{optionalUnrelated:undefined});
    expect(resolveSessionYueHomophoneVersion(item)).toBe(YUE_HOMOPHONE_CURRENT_VERSION);
    let accessed=0;Object.defineProperty(item.preferences,'yueHomophoneRuleVersion',{enumerable:true,get(){accessed++;return YUE_HOMOPHONE_CURRENT_VERSION;}});
    expect(()=>resolveSessionYueHomophoneVersion(item)).toThrow('访问器');expect(accessed).toBe(0);
  });
  it('rejects unsupported explicit routing or data from the other version',()=>{
    const item=frozen.cases[0],candidate=item.candidates[0],args=[item.profile.surname,candidate.givenName,candidate.yueReading!,'strict'] as const;
    expect(()=>calculateYueHomophoneReviewForVersion('future' as never,...args,expandedData)).toThrow();
    expect(()=>calculateYueHomophoneReviewForVersion(legacy,...args,expandedData)).toThrow();
    expect(isCanonicalYueHomophoneReviewForVersion(legacy,candidate.yueHomophones,...args,expandedData)).toBe(false);
    expect(()=>yueHomophoneSourceIdsForVersion('future' as never)).toThrow();
  });
});

describe('explicit preference version normalization and history visibility',()=>{
  it('keeps disabled and historical preference shapes while validating known enabled versions',()=>{
    expect(normalizePreferences().yueHomophoneRuleVersion).toBeUndefined();
    for(const version of [legacy,YUE_HOMOPHONE_CURRENT_VERSION])expect(normalizePreferences({yueHomophones:'strict',yueHomophoneRuleVersion:version}).yueHomophoneRuleVersion).toBe(version);
    expect(validYueHomophoneRuleVersion(undefined)).toBe(false);expect(validYueHomophoneRuleVersion('future')).toBe(false);
    expect(()=>normalizePreferences({yueHomophones:'none',yueHomophoneRuleVersion:legacy})).toThrow();
    expect(()=>normalizePreferences({yueHomophones:'strict',yueHomophoneRuleVersion:undefined})).toThrow();
    expect(()=>normalizePreferences({yueHomophones:'strict',yueHomophoneRuleVersion:'future' as never})).toThrow();
  });
  it('shows the changed rule version in review comparisons even when matched terms are otherwise identical',()=>{
    const old=structuredClone(frozen.cases[0]) as unknown as NamingSession,next=structuredClone(old);
    Object.assign(old,{analysis:{bazi:{},qimen:{available:false}},reviewNote:''});Object.assign(next,{analysis:{bazi:{},qimen:{available:false}},reviewNote:''});
    old.candidates[0].yueHomophones!.version=legacy;next.candidates[0].yueHomophones!.version=YUE_HOMOPHONE_CURRENT_VERSION;
    const change=compareSessionReviews(old,next).find(change=>change.field==='粤语词汇联想复核');
    expect(change?.before).toContain(legacy);expect(change?.after).toContain(YUE_HOMOPHONE_CURRENT_VERSION);
  });
});
