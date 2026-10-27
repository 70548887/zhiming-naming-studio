import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {culturalCanonicalDigest,ownCulturalJson} from '../src/domain/qimen-cultural-comparison-canonical';
import {M923_FAMILY} from '../src/shared/naming-semantic-m923';
import type {M923GeneratedCandidate,M923GenerationRequest,M923Receipt} from '../src/shared/naming-semantic-m923';
import {loadM921M923Family,getAuthenticatedM923Resources} from '../src/main/naming-semantic-m923-data';
import {normalizeM923Constraints} from '../src/main/naming-semantic-m923-constraints';
import {createNamingSemanticGenerationM923} from '../src/main/naming-semantic-generation-m923';
import {inspectM923SessionBinding,assertUnchangedM923SessionBinding,M923SessionBindingError} from '../src/main/semantic-session-binding-m923';
import type {M923SessionBindingProjection} from '../src/main/semantic-session-binding-m923';
import {normalizePreferences} from '../src/shared/workflow';
import {catalogSession} from './fixtures/catalog-session';

const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const sha=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
const engineId='m923-existing-constraints-v1';
const selection={...M923_FAMILY,enabled:true as const};
let consumer:ReturnType<typeof createNamingSemanticGenerationM923>;
let request:M923GenerationRequest;
let fixture:M923SessionBindingProjection;
let compound:M923SessionBindingProjection;
let repeated:M923SessionBindingProjection;

function projection(input:M923GenerationRequest,candidates:readonly M923GeneratedCandidate[],suffix='standard'):M923SessionBindingProjection {
 return clone({sessionId:'m929-session-'+suffix,profileId:input.profile.id,createdAt:'2026-10-26T04:30:00.000Z',profile:input.profile,preferences:input.preferences,candidates});
}
function generated(input:M923GenerationRequest,givenName:string):M923GeneratedCandidate {
 const result=consumer.evaluateAiProposals(input,[{givenName}])[0];
 expect(result.status,'actual fixture '+givenName).toBe('generated');
 if(result.status!=='generated')throw Error('M929 fixture generation blocked '+givenName);
 return result.candidate;
}
function receipt(input=fixture):M923Receipt {
 const found=input.candidates.flatMap(candidate=>candidate.semanticAdoptionM923.rows).find(row=>row.adoption!==null)?.adoption;
 if(!found)throw Error('M929 fixture has no adopted receipt');
 return found;
}
function adoptedCandidate(input=fixture):M923GeneratedCandidate {
 const found=input.candidates.find(candidate=>candidate.semanticAdoptionM923.rows.some(row=>row.adoption!==null));
 if(!found)throw Error('M929 fixture has no adopted candidate');
 return found;
}
function reject(action:()=>unknown):void {
 let thrown:unknown;
 try{action();}catch(error){thrown=error;}
 expect(thrown).toBeInstanceOf(M923SessionBindingError);
 expect(thrown).toMatchObject({name:'M923SessionBindingError',code:'M923_SESSION_BINDING_INVALID',reason:expect.any(String)});
 expect((thrown as M923SessionBindingError).reason.length).toBeGreaterThan(0);
}
function changed(change:(input:any)=>void,source=fixture):M923SessionBindingProjection {
 const input=clone(source);change(input);return input;
}
function contextHash(input:M923SessionBindingProjection):string {
 return culturalCanonicalDigest({schema:'m923-constraint-context/1',engineId,profile:input.profile,preferences:input.preferences});
}
function resealReceipt(input:M923SessionBindingProjection,candidate:M923GeneratedCandidate,position:number):void {
 const snapshot=candidate.semanticAdoptionM923,row=snapshot.rows[position],r=row.adoption;
 if(!r)return;
 const character=candidate.characters[position];
 r.contextSHA256=culturalCanonicalDigest({candidateId:candidate.id,candidateCaseId:r.candidateCaseId,fullName:candidate.fullName,surname:input.profile.surname,givenName:candidate.givenName,position,char:character.char,selectedPinyin:character.pinyin,tone:character.tone,senseId:r.senseId,givenNameLength:input.preferences.length,namePart:'given-name',familySelection:snapshot.familySelection,themeIds:snapshot.themeIds,constraintEngineId:engineId,constraintContextSHA256:snapshot.constraintContextSHA256});
}
function resealContext(input:M923SessionBindingProjection):void {
 for(const candidate of input.candidates){
  const snapshot=candidate.semanticAdoptionM923;snapshot.constraintContextSHA256=contextHash(input);
  for(const [position,row] of snapshot.rows.entries())if(row.adoption){row.adoption.constraintContextSHA256=snapshot.constraintContextSHA256;resealReceipt(input,candidate,position);}
 }
}
function resealProject(input:M923SessionBindingProjection,candidate:M923GeneratedCandidate,position:number):void {
 const row=candidate.semanticAdoptionM923.rows[position],p=row.project,r=row.adoption;
 if(!p||!r)throw Error('M929 project fixture must be adopted');
 r.projectTextSHA256=sha(p.meaning);
 r.projectSHA256=sha(JSON.stringify({meaning:p.meaning,projectWish:p.projectWish,limits:p.limits,attribution:p.attribution,license:p.license}));
 resealReceipt(input,candidate,position);
}

beforeAll(()=>{
 const loaded=loadM921M923Family();expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error(loaded.code);
 const resources=getAuthenticatedM923Resources(loaded.handle);consumer=createNamingSemanticGenerationM923(loaded.handle);
 const source=catalogSession();
 const effective=(surname='赵',requiredChars='明'):M923GenerationRequest=>{
  const normalized=normalizeM923Constraints({profile:{...source.profile,id:'m929-binding-profile',surname,surnamePinyin:surname==='欧阳'?'ōu yáng':'zhào',fatherName:'',motherName:'',notes:'M929 original input'},preferences:normalizePreferences({length:2,requiredChars,generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],meanings:'',industry:'',numerology:false,zodiacRules:false,avoidParentNames:true})},resources.dataset);
  return {profile:normalized.profile,preferences:normalized.preferences,familySelection:{...selection},themeIds:[]};
 };
 request=effective();
 const local=consumer.generateLocal(request,929).candidates;
 expect(local.length).toBeGreaterThan(0);
 expect(local.every(candidate=>candidate.origin==='local'&&candidate.givenName.includes('明'))).toBe(true);
 const ai=generated(request,'安明');
 const zero=local.find(candidate=>candidate.semanticAdoptionM923.rows.every(row=>row.adoption===null))??generated(request,'明远');
 expect(zero.semanticAdoptionM923.rows.every(row=>row.adoption===null)).toBe(true);
 const chosen=[ai,zero,...local.filter(candidate=>candidate.id!==ai.id&&candidate.id!==zero.id)].slice(0,4);
 expect(new Set(chosen.map(candidate=>candidate.id)).size).toBe(chosen.length);
 fixture=projection(request,chosen);
 const compoundRequest=effective('欧阳');compound=projection(compoundRequest,[generated(compoundRequest,'安明')],'compound');
 const repeatedRequest=effective('赵','安');repeated=projection(repeatedRequest,[generated(repeatedRequest,'安安')],'repeated');
},180000);
afterEach(()=>vi.restoreAllMocks());

describe('M929 pure M923 session consistency inspection',()=>{
 it('accepts actual normalized local/AI multi-candidate snapshot/2 data without granting source or save authority',()=>{
  const before=JSON.stringify(fixture),result=inspectM923SessionBinding(fixture);
  expect(result).toEqual({kind:'data-consistent',sourceAuthenticated:false,persistenceVerified:false,profileId:fixture.profileId,candidateCount:fixture.candidates.length,receiptCount:fixture.candidates.flatMap(candidate=>candidate.semanticAdoptionM923.rows).filter(row=>row.adoption!==null).length,zeroAdoptionCandidateCount:fixture.candidates.filter(candidate=>candidate.semanticAdoptionM923.rows.every(row=>row.adoption===null)).length});
  expect(result.receiptCount).toBeGreaterThan(0);expect(result.zeroAdoptionCandidateCount).toBeGreaterThan(0);
  expect(Object.isFrozen(result)).toBe(true);expect(JSON.stringify(fixture)).toBe(before);
  expect(Object.keys(result).sort()).toEqual(['kind','sourceAuthenticated','persistenceVerified','profileId','candidateCount','receiptCount','zeroAdoptionCandidateCount'].sort());
  for(const forbidden of ['saved','permissions','authority','handle','sourceVerified','receipt','candidate'])expect(result).not.toHaveProperty(forbidden);
 });
 it('retains given-name occurrence zero with a real compound surname',()=>{
  expect(compound.candidates[0].fullName).toBe('欧阳安明');
  expect(compound.candidates[0].semanticAdoptionM923.rows[0]).toMatchObject({position:0,char:'安'});
  expect(inspectM923SessionBinding(compound)).toMatchObject({candidateCount:1,receiptCount:1,zeroAdoptionCandidateCount:0});
 });
 it('accepts frozen readonly ordinary data and independently cloned JSON data',()=>{
  expect(inspectM923SessionBinding(ownCulturalJson(fixture))).toEqual(inspectM923SessionBinding(clone(fixture)));
 });
 it('makes no file reads during inspection or review comparison',()=>{
  const read=vi.spyOn(fs,'readFileSync').mockImplementation(()=>{throw Error('pure checker attempted I/O');});
  expect(inspectM923SessionBinding(fixture).kind).toBe('data-consistent');
  expect(()=>assertUnchangedM923SessionBinding(fixture,clone(fixture))).not.toThrow();
  expect(read).not.toHaveBeenCalled();
 });
 it('reports empty data as zero counts with no persisted or family authority',()=>{
  expect(inspectM923SessionBinding({...fixture,candidates:[]})).toEqual({kind:'data-consistent',sourceAuthenticated:false,persistenceVerified:false,profileId:fixture.profileId,candidateCount:0,receiptCount:0,zeroAdoptionCandidateCount:0});
 });
 const inputChanges:Array<[string,(input:any)=>void]>=[
  ['profile ID',(input)=>{input.profileId='different-profile';}],
  ['effective original profile ID',(input)=>{input.profile.id='different-profile';}],
  ['father name',(input)=>{input.profile.fatherName='赵远';}],
  ['mother name',(input)=>{input.profile.motherName='陈清';}],
  ['profile notes',(input)=>{input.profile.notes+=' changed';}],
  ['birth date',(input)=>{input.profile.birthDate='2026-10-25';}],
  ['preference',(input)=>{input.preferences.requiredChars='安';}],
  ['both preference copies',(input)=>{input.preferences.style='自然';input.profile.namingPreferences=clone(input.preferences);}],
  ['missing effective preference copy',(input)=>{delete input.profile.namingPreferences;}],
  ['wrong effective preference copy',(input)=>{input.profile.namingPreferences.requiredChars='安';}],
  ['noncanonical raw profile',(input)=>{input.profile.surname=' 赵 ';}],
  ['invalid creation time',(input)=>{input.createdAt='not-a-date';}],
 ];
 it.each(inputChanges)('rejects changed %s against original generation context',(_label,change)=>reject(()=>inspectM923SessionBinding(changed(change))));
 const boundChanges:Array<[string,(input:any)=>void]>=[
  ['candidate ID',(input)=>{input.candidates[0].id+='-changed';}],
  ['candidate full name',(input)=>{input.candidates[0].fullName='李安明';}],
  ['candidate origin',(input)=>{input.candidates[0].origin='local';}],
  ['candidate character order',(input)=>{input.candidates[0].characters.reverse();}],
  ['candidate character pinyin',(input)=>{input.candidates[0].characters[0].pinyin='wrong';}],
  ['snapshot engine',(input)=>{input.candidates[0].semanticAdoptionM923.constraintEngineId='caller-engine';}],
  ['snapshot context hash',(input)=>{input.candidates[0].semanticAdoptionM923.constraintContextSHA256='0'.repeat(64);}],
  ['snapshot family',(input)=>{input.candidates[0].semanticAdoptionM923.familyId='old-family';}],
  ['snapshot selected family',(input)=>{input.candidates[0].semanticAdoptionM923.familySelection.sourceId='old-family';}],
  ['snapshot disabled family',(input)=>{input.candidates[0].semanticAdoptionM923.familySelection.enabled=false;}],
  ['snapshot duplicate themes',(input)=>{input.candidates[0].semanticAdoptionM923.themeIds=['agriculture','agriculture'];}],
  ['snapshot unknown theme',(input)=>{input.candidates[0].semanticAdoptionM923.themeIds=['free text'];}],
  ['snapshot unsorted themes',(input)=>{input.candidates[0].semanticAdoptionM923.themeIds=['literary-artwork','agriculture'];}],
  ['snapshot full name',(input)=>{input.candidates[0].semanticAdoptionM923.fullName='李安明';}],
  ['snapshot given name',(input)=>{input.candidates[0].semanticAdoptionM923.givenName='明安';}],
  ['snapshot row order',(input)=>{input.candidates[0].semanticAdoptionM923.rows.reverse();}],
  ['snapshot row position',(input)=>{input.candidates[0].semanticAdoptionM923.rows[0].position=1;}],
  ['snapshot row glyph',(input)=>{input.candidates[0].semanticAdoptionM923.rows[0].char='明';}],
  ['snapshot row dropped',(input)=>{input.candidates[0].semanticAdoptionM923.rows.pop();}],
  ['snapshot row added',(input)=>{input.candidates[0].semanticAdoptionM923.rows.push(clone(input.candidates[0].semanticAdoptionM923.rows[0]));}],
  ['generated meaning',(input)=>{input.candidates[0].meaning+=' invented';}],
  ['original meaning',(input)=>{input.candidates[0].originalMeaning+=' invented';}],
  ['whole-name meaning scope',(input)=>{input.candidates[0].semanticAdoptionM923.wholeNameMeaning='approved';}],
  ['duplicate candidate ID',(input)=>{input.candidates.push(clone(input.candidates[0]));}],
  ['legacy missing snapshot',(input)=>{delete input.candidates[0].semanticAdoptionM923;}],
  ['old snapshot/1',(input)=>{input.candidates[0].semanticAdoptionM923.schema='m921-m923-character-generation-snapshot/1';}],
 ];
 it.each(boundChanges)('rejects %s',(_label,change)=>reject(()=>inspectM923SessionBinding(changed(change))));
 it('rejects every independently changed or removed receipt field and receipt additions',()=>{
  const fields=Object.keys(receipt());
  for(const field of fields){
   const modified=clone(fixture),r=receipt(modified) as unknown as Record<string,unknown>,original=r[field];
   r[field]=field==='reviewId'?'':typeof original==='string'?original+'x':typeof original==='number'?original+1:original===null?'forged':false;
   reject(()=>inspectM923SessionBinding(modified));
   const missing=clone(fixture);delete (receipt(missing) as unknown as Record<string,unknown>)[field];reject(()=>inspectM923SessionBinding(missing));
  }
  reject(()=>inspectM923SessionBinding(changed(input=>{(receipt(input) as any).extra=true;})));
 });
 it('rejects receipt grafts across candidates and across repeated-character occurrences',()=>{
  const graft=clone(fixture),target=adoptedCandidate(graft),donor=repeated.candidates[0].semanticAdoptionM923.rows[0].adoption;
  (target.semanticAdoptionM923.rows[0] as any).adoption=clone(donor);reject(()=>inspectM923SessionBinding(graft));
  const swapped=clone(repeated),rows=swapped.candidates[0].semanticAdoptionM923.rows;
  (rows[0] as any).adoption=clone(rows[1].adoption);reject(()=>inspectM923SessionBinding(swapped));
 });
 it('requires project/adoption null pairs and matching project text and object digests',()=>{
  const cases:Array<(adopted:any,empty:any)=>void>=[
   (adopted)=>{adopted.project=null;},
   (adopted)=>{adopted.adoption=null;},
   (adopted,empty)=>{empty.project=clone(adopted.project);},
   (adopted)=>{adopted.project.meaning+=' forged';},
   (adopted)=>{adopted.project.limits.push('forged limit');},
  ];
  for(const mutate of cases){
   const input=clone(fixture),rows=adoptedCandidate(input).semanticAdoptionM923.rows;
   mutate(rows.find(row=>row.adoption!==null),rows.find(row=>row.adoption===null));reject(()=>inspectM923SessionBinding(input));
  }
 });
 it('binds zero-adoption snapshots to effective profile/preferences too',()=>{
  const zero=clone(fixture);zero.candidates=zero.candidates.filter(candidate=>candidate.semanticAdoptionM923.rows.every(row=>row.adoption===null));
  expect(inspectM923SessionBinding(zero).zeroAdoptionCandidateCount).toBeGreaterThan(0);
  zero.profile.notes+=' changed';reject(()=>inspectM923SessionBinding(zero));
 });
 it('rejects differing original themes even when each candidate receipt is internally resealed',()=>{
  const mixed=clone(fixture),candidate=mixed.candidates[1];candidate.semanticAdoptionM923.themeIds=['agriculture'];
  candidate.semanticAdoptionM923.rows.forEach((_row,position)=>resealReceipt(mixed,candidate,position));
  reject(()=>inspectM923SessionBinding(mixed));
 });
 it('keeps attacker-resealed project/source hashes explicitly unauthenticated until private fixed runtime verification',()=>{
  const input=clone(fixture),candidate=adoptedCandidate(input),position=candidate.semanticAdoptionM923.rows.findIndex(row=>row.adoption!==null),row=candidate.semanticAdoptionM923.rows[position];
  row.adoption!.sourceEntrySHA256='0'.repeat(64);row.adoption!.reviewId+='-caller-resealed';row.project!.meaning+='（调用方自改）';resealProject(input,candidate,position);
  expect(inspectM923SessionBinding(input)).toMatchObject({kind:'data-consistent',sourceAuthenticated:false,persistenceVerified:false});
  expect(consumer.verifySaved(candidate,request,'restore')).toEqual({ok:false,code:'M923_REJECTED_INTEGRITY'});
  reject(()=>assertUnchangedM923SessionBinding(fixture,input));
 });
});

describe('M929 descriptor-only ordinary JSON boundary',()=>{
 it('rejects getters without invoking them at root or nested depth',()=>{
  let calls=0;const root=clone(fixture),nested=clone(fixture);
  Object.defineProperty(root,'candidates',{enumerable:true,get(){calls++;throw Error('root getter ran');}});
  Object.defineProperty(nested.candidates[0],'reviewNote',{enumerable:true,get(){calls++;throw Error('nested getter ran');}});
  reject(()=>inspectM923SessionBinding(root));reject(()=>inspectM923SessionBinding(nested));expect(calls).toBe(0);
 });
 it('rejects root and nested Proxies before running any Proxy traps',()=>{
  let calls=0;const traps:ProxyHandler<object>={get(){calls++;throw Error('get trap');},getPrototypeOf(){calls++;throw Error('prototype trap');},ownKeys(){calls++;throw Error('keys trap');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor trap');}};
  reject(()=>inspectM923SessionBinding(new Proxy(fixture,traps)));
  const nested=clone(fixture);(nested.candidates as M923GeneratedCandidate[])[0]=new Proxy(nested.candidates[0],traps) as M923GeneratedCandidate;reject(()=>inspectM923SessionBinding(nested));expect(calls).toBe(0);
 });
 const corruptions:Array<[string,(input:any)=>void]>=[
  ['symbol property',(input)=>{input[Symbol('invisible')]=true;}],
  ['hidden property',(input)=>{Object.defineProperty(input,'hidden',{value:true});}],
  ['candidate array hole',(input)=>{delete input.candidates[0];}],
  ['character array hole',(input)=>{delete input.candidates[0].characters[0];}],
  ['array extra property',(input)=>{input.candidates.extra=true;}],
  ['inherited profile',(input)=>{Object.setPrototypeOf(input.profile,{inherited:true});}],
  ['Date object',(input)=>{input.profile.notes=new Date('2026-10-26');}],
  ['toJSON function',(input)=>{input.profile.toJSON=()=>({});}],
  ['cyclic profile',(input)=>{input.profile.cycle=input.profile;}],
  ['negative zero',(input)=>{input.candidates[0].evaluation.meaning=-0;}],
  ['NaN score',(input)=>{input.candidates[0].evaluation.meaning=NaN;}],
  ['undefined nested property',(input)=>{input.profile.notes=undefined;}],
  ['extra full-session analysis',(input)=>{input.analysis={};}],
  ['caller source authority',(input)=>{input.sourceAuthenticated=true;}],
  ['dropped projection field',(input)=>{delete input.sessionId;}],
  ['extra snapshot field',(input)=>{input.candidates[0].semanticAdoptionM923.saved=true;}],
  ['extra candidate field',(input)=>{input.candidates[0].permission='saved';}],
 ];
 it.each(corruptions)('rejects %s',(_label,change)=>reject(()=>inspectM923SessionBinding(changed(change))));
 it('rejects extra inspector arguments and missing comparison arguments',()=>{
  reject(()=>(inspectM923SessionBinding as (...args:unknown[])=>unknown)(fixture,true));
  reject(()=>(assertUnchangedM923SessionBinding as (...args:unknown[])=>unknown)(fixture));
 });
});

describe('M929 immutable original binding during candidate review',()=>{
 it('allows only boolean favorites and string candidate review notes without changing either input',()=>{
  const next=changed(input=>{input.candidates[0].favorite=true;input.candidates[0].reviewNote='复核安字项目说明';input.candidates[1].favorite=true;input.candidates[1].reviewNote='零采用候选复核';});
  const originalText=JSON.stringify(fixture),nextText=JSON.stringify(next);
  expect(()=>assertUnchangedM923SessionBinding(fixture,next)).not.toThrow();
  expect(JSON.stringify(fixture)).toBe(originalText);expect(JSON.stringify(next)).toBe(nextText);
 });
 it.each([
  ['favorite string',(input:any)=>{input.candidates[0].favorite='true';}],
  ['review note object',(input:any)=>{input.candidates[0].reviewNote={text:'review'};}],
 ])('rejects invalid %s',(_label,change)=>reject(()=>assertUnchangedM923SessionBinding(fixture,changed(change))));
 it('rejects reordered, removed, or added candidates even if both full projections inspect successfully',()=>{
  const reordered=changed(input=>{input.candidates.reverse();}),removed=changed(input=>{input.candidates.pop();}),added=clone(removed);
  added.candidates=[...added.candidates,clone(fixture.candidates[fixture.candidates.length-1])];
  for(const [before,after] of [[fixture,reordered],[fixture,removed],[removed,added]]){
   expect(inspectM923SessionBinding(before).kind).toBe('data-consistent');expect(inspectM923SessionBinding(after).kind).toBe('data-consistent');
   reject(()=>assertUnchangedM923SessionBinding(before,after));
  }
 });
 it('freezes every candidate fact field, including prose, scores, source attributes and optional snapshots',()=>{
  const sample=fixture.candidates[0] as unknown as Record<string,unknown>;
  for(const field of Object.keys(sample).filter(key=>key!=='favorite'&&key!=='reviewNote')){
   const next=clone(fixture),candidate=next.candidates[0] as unknown as Record<string,unknown>,value=candidate[field];
   candidate[field]=typeof value==='string'?value+' changed':Array.isArray(value)?[...value,'changed']:typeof value==='object'?{...value,changed:true}:false;
   reject(()=>assertUnchangedM923SessionBinding(fixture,next));
  }
  const nested=changed(input=>{input.candidates[0].characters[0].sourceId+='-changed';});
  expect(inspectM923SessionBinding(nested).kind).toBe('data-consistent');reject(()=>assertUnchangedM923SessionBinding(fixture,nested));
 });
 it.each(['sessionId','createdAt','profileId','profile','preferences'] as const)('rejects self-consistent replacement of immutable session %s',(field)=>{
  const next=clone(fixture);
  if(field==='sessionId')next.sessionId+='-replacement';
  if(field==='createdAt')next.createdAt='2026-10-26T05:00:00.000Z';
  if(field==='profileId'){next.profileId+='-replacement';next.profile.id=next.profileId;}
  if(field==='profile')next.profile.notes+=' replacement';
  if(field==='preferences'){next.preferences.style='自然';next.profile.namingPreferences=clone(next.preferences);}
  resealContext(next);expect(inspectM923SessionBinding(next).kind).toBe('data-consistent');
  reject(()=>assertUnchangedM923SessionBinding(fixture,next));
 });
 it('inspects both original and next projections instead of trusting a valid-looking next review',()=>{
  const invalid=changed(input=>{input.candidates[0].semanticAdoptionM923.schema='m921-m923-character-generation-snapshot/1';});
  reject(()=>assertUnchangedM923SessionBinding(invalid,fixture));reject(()=>assertUnchangedM923SessionBinding(fixture,invalid));
 });
});
