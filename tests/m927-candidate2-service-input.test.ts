import {describe,expect,it} from 'vitest';
import {captureCandidate2ServiceInput} from '../src/main/candidate2-service-input';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import type {NamingPreferences} from '../src/shared/types';

const selection=CANDIDATE2_NAMING_SELECTION;
const requiredKeys=['length','generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry','priority','preferredElements','zodiacRules','numerology'] as const;
const optionalKeys=['avoidParentNames','parentNamePhonetics','wordPronunciationReference','elementAssessment','imageryReading','yueReading','namePhonetics','yueHomophones','yueHomophoneRuleVersion'] as const;
const stringKeys=['generationChar','requiredChars','forbiddenChars','elderTaboo','style','meanings','industry'] as const;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

function preferences():NamingPreferences {
 return{length:1,generationChar:'',requiredChars:' 沐 ',forbiddenChars:' 忌 ',elderTaboo:' 长辈 ',style:' 清朗 ',meanings:' 平安 ',industry:' 文化 ',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
}
function expandedPreferences():NamingPreferences {
 return{...preferences(),length:2,preferredElements:['木','金'],zodiacRules:true,numerology:true,
  avoidParentNames:false,parentNamePhonetics:'ignore-tone',wordPronunciationReference:true,
  elementAssessment:true,imageryReading:true,yueReading:true,
  namePhonetics:{cmn:{version:'cmn-homophone-review/1.0.0',mode:'ignore-tone'}},
  yueHomophones:'strict',yueHomophoneRuleVersion:'yue-homophone-review/1.1.0'};
}
function deepFrozen(value:unknown):void {
 if(value===null||typeof value!=='object')return;
 expect(Object.isFrozen(value)).toBe(true);
 for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(Object.hasOwn(descriptor,'value'))deepFrozen(descriptor.value);
}
function proxyFor(target:object){
 const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
 const proxy=new Proxy(target,{
  get(){traps.get++;throw Error('unexpected caller get');},
  ownKeys(){traps.ownKeys++;throw Error('unexpected caller ownKeys');},
  getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected caller descriptor');},
  getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected caller prototype');},
 });
 return{proxy,traps};
}

describe('M927 pure candidate.2 Service input capture',{timeout:30000},()=>{
 it('returns only three detached owned values without Store, status or authority fields',()=>{
  const pref=preferences(),inputSelection=clone(selection),captured=captureCandidate2ServiceInput('  profile-id  ',pref,inputSelection);
  expect(captured).toEqual({profileId:'  profile-id  ',preferences:pref,selection});
  expect(Object.keys(captured).sort()).toEqual(['preferences','profileId','selection']);
  expect(captured.preferences).not.toBe(pref);expect(captured.preferences.preferredElements).not.toBe(pref.preferredElements);
  expect(captured.selection).not.toBe(inputSelection);
  for(const field of ['store','status','saved','canSave','authority','generationAuthority','proposal','mechanics'])expect(captured).not.toHaveProperty(field);
  deepFrozen(captured);
 });

 it('preserves required, forbidden, elder, parent and enabled extension intent without dropping it',()=>{
  const pref=expandedPreferences(),before=clone(pref),captured=captureCandidate2ServiceInput('raw-id',pref,selection);
  expect(captured.preferences).toEqual(before);expect(Object.keys(captured.preferences).sort()).toEqual(Object.keys(before).sort());
  expect(captured.preferences.requiredChars).toBe(' 沐 ');expect(captured.preferences.forbiddenChars).toBe(' 忌 ');
  expect(captured.preferences.elderTaboo).toBe(' 长辈 ');expect(captured.preferences.avoidParentNames).toBe(false);
  expect(captured.preferences.preferredElements).toEqual(['木','金']);
  for(const key of ['zodiacRules','numerology','wordPronunciationReference','elementAssessment','imageryReading','yueReading'] as const)expect(captured.preferences[key]).toBe(true);
  expect(captured.preferences.parentNamePhonetics).toBe('ignore-tone');expect(captured.preferences.namePhonetics).toEqual(before.namePhonetics);
  expect(captured.preferences.yueHomophones).toBe('strict');expect(captured.preferences.yueHomophoneRuleVersion).toBe('yue-homophone-review/1.1.0');
  expect(pref).toEqual(before);
 });

 it('does not backfill absent optional keys or trim blank naming strings',()=>{
  const pref={...preferences(),generationChar:'  ',requiredChars:'',forbiddenChars:' ',elderTaboo:'',style:'',meanings:'  ',industry:''};
  const captured=captureCandidate2ServiceInput(' id ',pref,selection);
  expect(captured.preferences).toEqual(pref);expect(Object.keys(captured.preferences).sort()).toEqual([...requiredKeys].sort());
  for(const key of optionalKeys)expect(Object.hasOwn(captured.preferences,key)).toBe(false);
  expect(captured.profileId).toBe(' id ');
 });

 it('remains frozen and detached after callers mutate arrays, nested phonetic options and selection',()=>{
  const pref=expandedPreferences(),inputSelection=clone(selection),before=clone(pref);
  const captured=captureCandidate2ServiceInput('p',pref,inputSelection);
  pref.preferredElements.push('火');pref.requiredChars='changed';pref.namePhonetics!.cmn!.mode='strict';
  (inputSelection as {entryPolicy:string}).entryPolicy='caller-changed';
  expect(captured.preferences).toEqual(before);expect(captured.selection).toEqual(selection);deepFrozen(captured);
  expect(Object.isFrozen(pref)).toBe(false);expect(Object.isFrozen(pref.preferredElements)).toBe(false);
 });

 it('accepts the exact 1000-character raw profile ID without rewriting it',()=>{
  const id=' p'+ '甲'.repeat(996)+'p ';
  expect(id.length).toBe(1000);expect(captureCandidate2ServiceInput(id,preferences(),selection).profileId).toBe(id);
 });

 it.each([undefined,null,'',123,true,{},[],{id:'p',birthDate:'2022-02-13'},'甲'.repeat(1001)])('rejects invalid profile ID %j instead of accepting a full profile',id=>{
  expect(()=>captureCandidate2ServiceInput(id,preferences(),selection)).toThrow();
 });

 it.each(requiredKeys)('requires the explicit preference field %s instead of silently defaulting it',key=>{
  const pref=clone(preferences()) as unknown as Record<string,unknown>;delete pref[key];
  expect(()=>captureCandidate2ServiceInput('p',pref,selection)).toThrow();
 });

 it.each(optionalKeys)('rejects explicitly undefined optional field %s',key=>{
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),[key]:undefined},selection)).toThrow();
 });

 it.each(stringKeys)('rejects a nonstring required preference %s',key=>{
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),[key]:23},selection)).toThrow();
 });

 it.each([
  {name:'invalid length',change:{length:3}},
  {name:'string length',change:{length:'1'}},
  {name:'unknown priority',change:{priority:'caller-priority'}},
  {name:'manual nonarray',change:{preferredElements:'木'}},
  {name:'unknown manual element',change:{preferredElements:['风']}},
  {name:'nonstring manual element',change:{preferredElements:[23]}},
  {name:'nonboolean zodiac',change:{zodiacRules:'false'}},
  {name:'nonboolean numerology',change:{numerology:0}},
  {name:'nonboolean parent avoidance',change:{avoidParentNames:'false'}},
  {name:'unknown parent mode',change:{parentNamePhonetics:'caller-mode'}},
  {name:'nonboolean word reference',change:{wordPronunciationReference:'true'}},
  {name:'nonboolean element flag',change:{elementAssessment:1}},
  {name:'nonboolean imagery flag',change:{imageryReading:null}},
  {name:'nonboolean Yue reading',change:{yueReading:'true'}},
  {name:'unknown Yue mode',change:{yueHomophones:'caller-mode'}},
  {name:'unknown Yue rule version',change:{yueHomophones:'strict',yueReading:true,yueHomophoneRuleVersion:'yue-homophone-review/99'}},
  {name:'empty phonetic selection',change:{namePhonetics:{}}},
  {name:'wrong Mandarin version',change:{namePhonetics:{cmn:{version:'cmn-homophone-review/99',mode:'strict'}}}},
  {name:'wrong phonetic mode',change:{namePhonetics:{cmn:{version:'cmn-homophone-review/1.0.0',mode:'caller-mode'}}}},
 ])('rejects malformed typed preference: $name',({change})=>{
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),...change},selection)).toThrow();
 });

 it.each(['balanced','traditional','sound','classic','simple'] as const)('preserves supported priority %s',priority=>{
  const pref={...preferences(),priority};expect(captureCandidate2ServiceInput('p',pref,selection).preferences).toEqual(pref);
 });

 it.each(['none','strict','ignore-tone'] as const)('preserves supported parent mode %s',parentNamePhonetics=>{
  const pref={...preferences(),parentNamePhonetics};expect(captureCandidate2ServiceInput('p',pref,selection).preferences).toEqual(pref);
 });

 it.each(['yue-homophone-review/1.0.0','yue-homophone-review/1.1.0'] as const)('validates a supported Yue version without substituting %s',yueHomophoneRuleVersion=>{
  const pref={...preferences(),yueReading:true,yueHomophones:'ignore-tone' as const,yueHomophoneRuleVersion};
  expect(captureCandidate2ServiceInput('p',pref,selection).preferences).toEqual(pref);
 });

 it('preserves the current new Yue phonetic selection exactly after shared validation',()=>{
  const pref:NamingPreferences={...preferences(),yueReading:true,namePhonetics:{yue:{version:'yue-homophone-review/1.2.0',mode:'strict'}}};
  expect(captureCandidate2ServiceInput('p',pref,selection).preferences).toEqual(pref);
 });

 it.each(['mechanics','seed','excludeNames','path','owner','proposal','runtime','store','callback','canSave'])('rejects unknown preference field %s',key=>{
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),[key]:{claimed:true}},selection)).toThrow();
 });

 it('rejects legacy namingElementMethod as a conflict without deleting it',()=>{
  const pref={...preferences(),namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'}};
  const before=clone(pref);expect(()=>captureCandidate2ServiceInput('p',pref,selection)).toThrow();expect(pref).toEqual(before);
 });

 it.each([
  undefined,null,false,{},[],{enabled:false},
  {...selection,methodId:'project-bazi-mainchain-145/1.3.1'},
  {...selection,policyId:'naming-element-application/1.3.2-candidate.1'},
  {...selection,publicationId:'project-naming-application/1.3.2-candidate.1'},
  {...selection,entryPolicy:'month-stem-proposal'},
  {...selection,owner:{claimed:true}},
  {...selection,enabled:undefined},
 ])('rejects a nonexact, disabled, absent or old selection %j',value=>{
  expect(()=>captureCandidate2ServiceInput('p',preferences(),value)).toThrow();
 });

 it('enforces exact arity and does not call a fourth fake Store or caller callback',()=>{
  const capture=captureCandidate2ServiceInput as (...args:unknown[])=>unknown;
  expect(capture.length).toBe(3);let saves=0,callbacks=0;
  const fakeStore={saveSession(){saves++;}},callback=()=>{callbacks++;return preferences();};
  for(const args of [[],['p'],['p',preferences()],['p',preferences(),selection,fakeStore]])expect(()=>capture(...args)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),callback},selection)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',callback,selection)).toThrow();
  expect(saves).toBe(0);expect(callbacks).toBe(0);
 });

 it('rejects explicit root and nested undefined values rather than dropping them during capture',()=>{
  expect(()=>captureCandidate2ServiceInput('p',undefined,selection)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),requiredChars:undefined},selection)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),preferredElements:[undefined]},selection)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),namePhonetics:{cmn:undefined}},selection)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),namePhonetics:{cmn:{version:undefined,mode:'strict'}}},selection)).toThrow();
 });

 it('rejects getters and toJSON without executing them at root or nested fields',()=>{
  let getters=0,serializers=0;
  const pref=Object.defineProperty(preferences(),'requiredChars',{enumerable:true,get(){getters++;return '沐';}});
  expect(()=>captureCandidate2ServiceInput('p',pref,selection)).toThrow();
  const nested=Object.defineProperty({},'cmn',{enumerable:true,get(){getters++;return {version:'cmn-homophone-review/1.0.0',mode:'strict'};}});
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),namePhonetics:nested},selection)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),toJSON(){serializers++;return preferences();}},selection)).toThrow();
  const serializer={version:'cmn-homophone-review/1.0.0',mode:'strict',toJSON(){serializers++;return {version:'cmn-homophone-review/1.0.0',mode:'strict'};}};
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),namePhonetics:{cmn:serializer}},selection)).toThrow();
  expect(getters).toBe(0);expect(serializers).toBe(0);
 });

 it('rejects custom prototypes, hidden metadata, symbols, cycles and sparse arrays',()=>{
  expect(()=>captureCandidate2ServiceInput('p',Object.assign(Object.create({inherited:true}),preferences()),selection)).toThrow();
  const hidden=Object.defineProperty(preferences(),'hidden',{value:true,enumerable:false});
  expect(()=>captureCandidate2ServiceInput('p',hidden,selection)).toThrow();
  const symbol={...preferences(),[Symbol('caller')]:true};expect(()=>captureCandidate2ServiceInput('p',symbol,selection)).toThrow();
  const cyclic:Record<string,unknown>={...preferences()};cyclic.namePhonetics=cyclic;
  expect(()=>captureCandidate2ServiceInput('p',cyclic,selection)).toThrow();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),preferredElements:new Array(1)},selection)).toThrow();
  const nested={version:'cmn-homophone-review/1.0.0',mode:'strict'};Object.defineProperty(nested,Symbol('nested'),{value:true,enumerable:true});
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),namePhonetics:{cmn:nested}},selection)).toThrow();
 });

 it.each(['profile-id','preferences','selection','manual-array','nested-phonetic'] as const)('rejects %s Proxy with zero traps',where=>{
  const target=where==='selection'?clone(selection):where==='manual-array'?['木']:where==='nested-phonetic'?{version:'cmn-homophone-review/1.0.0',mode:'strict'}:preferences();
  const {proxy,traps}=proxyFor(target);
  const id=where==='profile-id'?proxy:'p';
  const pref=where==='preferences'?proxy:where==='manual-array'?{...preferences(),preferredElements:proxy}:where==='nested-phonetic'?{...preferences(),namePhonetics:{cmn:proxy}}:preferences();
  expect(()=>captureCandidate2ServiceInput(id,pref,where==='selection'?proxy:selection)).toThrow();
  expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
 });

 it('rejects a revoked nested Proxy without invoking caller code',()=>{
  const traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
  const revoked=Proxy.revocable({version:'cmn-homophone-review/1.0.0',mode:'strict'},{
   get(){traps.get++;throw Error('unexpected get');},ownKeys(){traps.ownKeys++;throw Error('unexpected ownKeys');},
   getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('unexpected descriptor');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('unexpected prototype');},
  });revoked.revoke();
  expect(()=>captureCandidate2ServiceInput('p',{...preferences(),namePhonetics:{cmn:revoked.proxy}},selection)).toThrow();
  expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
 });
});
