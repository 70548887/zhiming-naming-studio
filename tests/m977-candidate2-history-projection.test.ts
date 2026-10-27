import {describe,expect,it} from 'vitest';
import {projectCandidate2HistoryReview} from '../src/main/candidate2-history-restore-projection';
import {captureCandidate2ReviewInput} from '../src/main/candidate2-review-input';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import type {Candidate2AdoptedNamingSessionV2} from '../src/shared/candidate2-generation-adoption-v2';
import type {Candidate2ReviewChanges} from '../src/shared/candidate2-review-api';

// Synthetic plain snapshots exercise this semantic projection only. They are
// deliberately not full M873 contracts, native SQL rows, saved-origin proofs,
// runtime publications, or evidence that anything has been persisted.
const clone=<T>(value:T):T=>structuredClone(value);
const token='11111111-1111-4111-8111-111111111111';
function snapshot():Candidate2AdoptedNamingSessionV2 {
 const profile={id:'synthetic-owner',customerName:'纯逻辑样本',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2001-06-18',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'非真实客户、非存储证明'};
 const preferences={length:1,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
 const analysis={bazi:{favorable:['木'],timeBasis:{kind:'civil'}},qimen:{palaces:[],syntheticFact:'immutable'}};
 const candidates=['沐','安'].map((name,index)=>({
  id:'synthetic-candidate-'+index,givenName:name,fullName:'林'+name,pinyin:index?'lín ān':'lín mù',style:'自然',
  characters:[{char:name,sourceId:'synthetic-data',facts:{position:index}}],citations:[{id:'citation-'+index,text:'合成引文',sourceId:'synthetic-data'}],
  evaluation:{total:80+index,breakdown:{sound:30,meaning:50+index}},warnings:['原始合成警告 '+index],
  meaning:'当前字义 '+index,reason:'当前理由 '+index,traditionalReason:'当前文化备注 '+index,reviewNote:'当前候选审阅 '+index,favorite:false,
  origin:'local',originalMeaning:'原始字义 '+index,namingMeaningReview:{syntheticFact:'immutable-'+index},
 }));
 const id='c2s_'+'1'.repeat(32),createdAt='2026-10-27T01:02:03.000Z';
 const generation={schema:'candidate2-naming-generation/1',status:'generated',consumerVersion:'candidate2-naming-consumer/1.0.0',profile:clone(profile),preferences:clone(preferences),selection:clone(CANDIDATE2_NAMING_SELECTION),baseAnalysis:clone(analysis),candidates:clone(candidates),seed:17,excludeNames:[],digest:'a'.repeat(64),dataIdentity:{activeVersion:'synthetic-v1'},application:{syntheticFact:'immutable'}};
 return {
  id,profileId:profile.id,createdAt,profile,preferences,analysis,candidates,reviewNote:'当前方案审阅',originalFavorable:['木'],dataVersion:'synthetic-v1',
  sourceSnapshot:{version:'session-sources/1.0.0',dataVersion:'synthetic-v1',sources:[{id:'synthetic-data',name:'合成登记',url:'',commit:'fixture',license:'fixture',files:['data/synthetic.json'],sha256:'b'.repeat(64),note:'纯逻辑样本'}]},
  namingRules:{version:'naming-editorial-7.1.0',dataVersion:'synthetic-v1',sourceId:'naming-character-meanings-v7.1-fixed'},reviewRevision:4,reviewToken:token,
  candidate2Naming:{schema:'candidate2-naming-session/1',sessionBinding:{sessionId:id,profileId:profile.id,createdAt},request:{schema:'candidate2-session-request/1',profile:clone(profile),preferences:clone(preferences),selection:clone(CANDIDATE2_NAMING_SELECTION)},generation,sourceCapsule:{role:'candidate2-source-capsule',sha:'c'.repeat(64),rawBytes:1,codec:'deflate-raw/1'},sourceWitnessDigest:'d'.repeat(64),sourceSnapshotDigest:'e'.repeat(64),attachmentDigest:'f'.repeat(64)},
 } as unknown as Candidate2AdoptedNamingSessionV2;
}
function pair(){
 const current=snapshot(),historical=clone(current);
 historical.reviewRevision=1;historical.reviewToken='22222222-2222-4222-8222-222222222222';
 historical.reviewNote='  历史方案备注𠮷😀\r\n保留空白  ';historical.preferences.preferredElements=['金','火'];
 historical.candidates.forEach((candidate,index)=>{
  candidate.meaning='  历史字义 '+index+'𠮷😀  ';candidate.reason='\n历史理由 '+index+'\r\n';candidate.traditionalReason=' 历史文化备注 '+index+' ';
  candidate.reviewNote=' 历史候选备注 '+index+' ';candidate.favorite=index===0;candidate.warnings=['历史人工草稿警告 '+index];
 });
 return{current,historical};
}
function expected(historical:Candidate2AdoptedNamingSessionV2):Candidate2ReviewChanges {
 return {reviewNote:historical.reviewNote,preferredElements:[...historical.preferences.preferredElements],candidates:historical.candidates.map(({id,meaning,reason,traditionalReason,reviewNote,favorite})=>({id,meaning,reason,traditionalReason,reviewNote,favorite}))};
}
function freeze<T>(value:T):T {
 if(value&&typeof value==='object'){
  for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(Object.hasOwn(descriptor,'value'))freeze(descriptor.value);
  Object.freeze(value);
 }
 return value;
}
function rejected(change:(historical:Candidate2AdoptedNamingSessionV2)=>void){const {current,historical}=pair();change(historical);expect(()=>projectCandidate2HistoryReview(current,historical)).toThrow();}

describe('M977 pure historical C2 review projection; no native save authority',()=>{
 it('retains the independent per-session text budget when two owned records together exceed eight million characters',()=>{
  const current=snapshot(),row=current.candidates[0];
  current.candidates=Array.from({length:40},(_,index)=>({...clone(row),id:'budget-candidate-'+index,meaning:'x'.repeat(100000)}));
  const historical=clone(current);historical.reviewNote='large raw projection budget';
  const patch=projectCandidate2HistoryReview(current,historical);
  expect(patch.candidates).toHaveLength(40);expect(patch.candidates[39].meaning).toHaveLength(100000);
  expect(patch.reviewNote).toBe(historical.reviewNote);
 });
 it('projects exactly the historical review fields in current candidate order without rewriting raw text',()=>{
  const {current,historical}=pair(),patch=projectCandidate2HistoryReview(current,historical);
  expect(patch).toEqual(expected(historical));expect(Object.keys(patch).sort()).toEqual(['candidates','preferredElements','reviewNote']);
  expect(patch.candidates.map(row=>row.id)).toEqual(current.candidates.map(row=>row.id));
  for(const row of patch.candidates)expect(Object.keys(row).sort()).toEqual(['favorite','id','meaning','reason','reviewNote','traditionalReason']);
  expect(patch.reviewNote).toBe('  历史方案备注𠮷😀\r\n保留空白  ');expect(patch.candidates[0].reason).toBe('\n历史理由 0\r\n');
 });

 it('accepts deeply frozen input snapshots without mutation and returns detached arrays and rows',()=>{
  const {current,historical}=pair(),beforeCurrent=clone(current),beforeHistory=clone(historical);
  freeze(current);freeze(historical);const patch=projectCandidate2HistoryReview(current,historical);
  expect(current).toEqual(beforeCurrent);expect(historical).toEqual(beforeHistory);
  expect(patch.preferredElements).not.toBe(historical.preferences.preferredElements);expect(patch.candidates).not.toBe(historical.candidates);
  patch.candidates.forEach((row,index)=>expect(row).not.toBe(historical.candidates[index]));
 });

 it('allows different saved review revision and token without projecting either CAS value',()=>{
  const current=snapshot(),historical=clone(current);historical.reviewRevision=0;historical.reviewToken='33333333-3333-4333-8333-333333333333';
  const patch=projectCandidate2HistoryReview(current,historical);expect(patch).toEqual(expected(historical));
  expect(patch).not.toHaveProperty('reviewRevision');expect(patch).not.toHaveProperty('reviewToken');
 });

 it('allows manual-draft warning differences but never copies warnings or candidate facts into the patch',()=>{
  const {current,historical}=pair();historical.candidates[0].warnings=['仅历史草稿提示'];
  const patch=projectCandidate2HistoryReview(current,historical);expect(patch.preferredElements).toEqual(['金','火']);
  for(const row of patch.candidates)for(const field of ['warnings','givenName','fullName','evaluation','characters','citations','originalMeaning','namingMeaningReview'])expect(row).not.toHaveProperty(field);
 });

 it('rejects malformed current or historical snapshots rather than projecting a partial object',()=>{
  for(const invalid of [null,[],{},'snapshot',42]){
   expect(()=>projectCandidate2HistoryReview(invalid as unknown as Candidate2AdoptedNamingSessionV2,snapshot())).toThrow();
   expect(()=>projectCandidate2HistoryReview(snapshot(),invalid as unknown as Candidate2AdoptedNamingSessionV2)).toThrow();
  }
  rejected(value=>{(value as unknown as {candidates:unknown}).candidates=null;});
 });

 it('rejects a snapshot without the C2 attachment on either side',()=>{
  for(const side of ['current','historical'] as const){const values=pair();delete (values[side] as Partial<Candidate2AdoptedNamingSessionV2>).candidate2Naming;expect(()=>projectCandidate2HistoryReview(values.current,values.historical)).toThrow();}
 });

 it('rejects a history row for another session',()=>{rejected(value=>{value.id='c2s_'+'2'.repeat(32);});});
 it('rejects a history row for another customer',()=>{rejected(value=>{value.profileId='another-owner';});});
 it('rejects a changed original creation timestamp',()=>{rejected(value=>{value.createdAt='2026-10-28T01:02:03.000Z';});});
 it('rejects a changed complete profile even when session and customer IDs match',()=>{rejected(value=>{value.profile.notes='altered original profile';});});
 it('rejects a changed base analysis',()=>{rejected(value=>{value.analysis.bazi.favorable=['水'];});});

 it('rejects changed original favorable elements or data version',()=>{
  rejected(value=>{value.originalFavorable=['水'];});rejected(value=>{value.dataVersion='different-data';});
 });

 it('rejects a changed complete source snapshot',()=>{rejected(value=>{value.sourceSnapshot.sources[0].note='rewritten source description';});});
 it('rejects a changed naming-rule identity',()=>{rejected(value=>{value.namingRules.dataVersion='different-rules-data';});});

 it('rejects nested attachment, generation and capsule mutations even when the visible review matches',()=>{
  rejected(value=>{value.candidate2Naming.attachmentDigest='0'.repeat(64);});
  rejected(value=>{value.candidate2Naming.generation.seed=23;});
  rejected(value=>{value.candidate2Naming.sourceCapsule.sha='0'.repeat(64);});
 });

 it('rejects preference changes other than preferredElements',()=>{
  rejected(value=>{value.preferences.requiredChars='改';});rejected(value=>{value.preferences.length=2;});
 });

 it('rejects missing or additional candidate rows',()=>{
  rejected(value=>{value.candidates.pop();});rejected(value=>{value.candidates.push(clone(value.candidates[0]));});
 });

 it('rejects a candidate reorder or changed ID instead of matching by a different row',()=>{
  rejected(value=>{value.candidates.reverse();});rejected(value=>{value.candidates[0].id='another-candidate';});
 });

 it('rejects changed name, character, citation and other immutable candidate facts',()=>{
  const changes:Array<(value:Candidate2AdoptedNamingSessionV2)=>void>=[
   value=>{value.candidates[0].givenName='改';},value=>{value.candidates[0].fullName='林改';},value=>{value.candidates[0].pinyin='gǎi';},
   value=>{value.candidates[0].characters=[];},value=>{value.candidates[0].citations=[];},value=>{value.candidates[0].origin='ai';},
   value=>{value.candidates[0].originalMeaning='changed fact';},value=>{delete value.candidates[0].namingMeaningReview;},
  ];
  for(const change of changes)rejected(change);
 });

 it('rejects changed evaluation scores and unknown candidate fields outside the editable whitelist',()=>{
  rejected(value=>{(value.candidates[0].evaluation as unknown as {total:number}).total++;});
  rejected(value=>{(value.candidates[0] as unknown as Record<string,unknown>).extraImmutableFact='injected';});
 });

 it('uses the real review-input bounds and emits no save, source or generation authority fields',()=>{
  const {current,historical}=pair(),patch=projectCandidate2HistoryReview(current,historical);
  expect(captureCandidate2ReviewInput(current.id,patch,current.reviewRevision,current.reviewToken).changes).toEqual(patch);
  for(const field of ['status','saved','session','generationAuthority','canSave','candidate2Naming','sourceSnapshot','verification'])expect(patch).not.toHaveProperty(field);
  rejected(value=>{value.reviewNote='x'.repeat(100001);});rejected(value=>{value.candidates[0].meaning='x'.repeat(100001);});
  rejected(value=>{value.preferences.preferredElements=['木','木'];});
  rejected(value=>{(value.candidates[0] as unknown as {favorite:unknown}).favorite='true';});
 });
});
