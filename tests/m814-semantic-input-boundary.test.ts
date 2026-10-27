import {beforeAll,afterAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessNamingSemanticAdmission,createNamingSemanticAdmissionHandle,createSemanticAdoptionReceiptV72,normalizeSemanticAdmissionContextV72,unionSemanticGenerationPoolV72} from '../src/domain/naming-semantic-admission-v72';
import {loadNamingSemanticAdmissionV72,semanticAdmissionDatasetV72} from '../src/main/naming-semantic-admission-v72-data';
import {createNamingSemanticGenerationV72} from '../src/main/naming-semantic-generation-v72';
import {SEMANTIC_THEMES_V72} from '../src/shared/naming-semantic-admission-v72';
import type {SemanticAdmissionContext,SemanticAdmissionHandle,SemanticGeneratedCandidateV72,SemanticGenerationRequestV72} from '../src/shared/naming-semantic-admission-v72';
import type {CharacterEntry} from '../src/shared/types';
import {catalogSession} from './fixtures/catalog-session';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.join(root,'.local/m814/post');
const observations:Array<Record<string,unknown>>=[];
let handle:SemanticAdmissionHandle,consumer:ReturnType<typeof createNamingSemanticGenerationV72>,characters:CharacterEntry[];
const context=(themeIds:string[]=[],stage:SemanticAdmissionContext['stage']='pool'):SemanticAdmissionContext=>({themeIds,requestedGivenNameLength:2,namePart:'given-name',stage});
const entry=(char:string)=>characters.find(row=>row.char===char)!;
const allLegacy=()=>handle.publication.rows.map(row=>row.baselineCharacter);
const request=(givenName:string,themeIds:string[]=[]):SemanticGenerationRequestV72=>{
 const fixture=catalogSession('m814-synthetic-boundary','2026-10-25T00:00:00Z','m814-synthetic-profile');
 return{profile:{...fixture.profile,customerName:'边界合成夹具',surname:'林',surnamePinyin:'lín',fatherName:'',motherName:''},preferences:{...fixture.preferences,length:[...givenName].length as 1|2,requiredChars:givenName,generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],meanings:'',industry:'',numerology:false,zodiacRules:false,avoidParentNames:true},analysis:fixture.analysis,themeIds};
};
beforeAll(()=>{
 handle=loadNamingSemanticAdmissionV72({decisionRoot:'D:/Codex-NamingStudio-Evidence/m752-meaning-admission-decision/r2',m740Root:'D:/Codex-NamingStudio-Evidence/m740-character-meanings',sourceDataDir:path.join(root,'data'),m744AuditPath:'D:/Codex-NamingStudio-Evidence/m744-data-audit/M744-DATA-AUDIT.json'});
 consumer=createNamingSemanticGenerationV72(handle);characters=semanticAdmissionDatasetV72(handle).characters;
});
afterAll(()=>{
 fs.mkdirSync(evidence,{recursive:true});
 const file=path.join(evidence,'boundary-observations.json');
 fs.writeFileSync(file+'.tmp',JSON.stringify({schema:'M814-boundary-observations/1',syntheticOnly:true,observations},null,2)+'\n');
 fs.renameSync(file+'.tmp',file);
});

describe('M814 context ownership and pool input boundary',()=>{
 it('rejects context getters before either an empty or complete legacy pool can use them',()=>{
  let calls=0;
  const raw=context();Object.defineProperty(raw,'themeIds',{enumerable:true,get(){calls++;return[];}});
  expect(()=>normalizeSemanticAdmissionContextV72(raw)).toThrow('own enumerable data field');
  for(const legacy of [[],allLegacy()])expect(()=>consumer.pool(legacy,raw)).toThrow('own enumerable data field');
  expect(calls).toBe(0);observations.push({kind:'context-getter',calls,poolCases:2});
 });
 it('rejects top-level and nested Proxy contexts without any trap execution',()=>{
  const calls={get:0,ownKeys:0,getPrototypeOf:0,getOwnPropertyDescriptor:0};
  const traps:ProxyHandler<object>={
   get(){calls.get++;throw Error('unexpected get trap');},
   ownKeys(){calls.ownKeys++;throw Error('unexpected ownKeys trap');},
   getPrototypeOf(){calls.getPrototypeOf++;throw Error('unexpected getPrototypeOf trap');},
   getOwnPropertyDescriptor(){calls.getOwnPropertyDescriptor++;throw Error('unexpected descriptor trap');},
  };
  const top=new Proxy<SemanticAdmissionContext>(context(),traps),nested={...context(),themeIds:new Proxy<string[]>([],traps)};
  for(const raw of [top,nested]){
   expect(()=>normalizeSemanticAdmissionContextV72(raw)).toThrow('Proxy');
   for(const legacy of [[],allLegacy()])expect(()=>consumer.pool(legacy,raw)).toThrow('Proxy');
  }
  expect(calls).toEqual({get:0,ownKeys:0,getPrototypeOf:0,getOwnPropertyDescriptor:0});
  observations.push({kind:'context-proxy',calls,poolCases:4});
 });
 it('returns its own frozen context and theme array without retaining caller state',()=>{
  const raw=context(['water-bubbles','agriculture'],'local'),owned=normalizeSemanticAdmissionContextV72(raw);
  expect(owned).not.toBe(raw);expect(owned.themeIds).not.toBe(raw.themeIds);
  expect(Object.isFrozen(owned)).toBe(true);expect(Object.isFrozen(owned.themeIds)).toBe(true);
  expect(raw.themeIds).toEqual(['water-bubbles','agriculture']);
  (raw.themeIds as string[]).push('herb-plant');raw.stage='restore';raw.requestedGivenNameLength=1;
  expect(owned).toEqual({themeIds:['agriculture','water-bubbles'],requestedGivenNameLength:2,namePart:'given-name',stage:'local'});
  expect(Reflect.set(owned,'stage','save')).toBe(false);expect(Reflect.set(owned.themeIds,'0','unknown-theme')).toBe(false);
 });
 it('preserves caller context and legacy rows while applying the pool stage internally',()=>{
  const raw=context(['civic-homeland'],'restore'),before=JSON.stringify(raw),legacy=[entry('安')],legacyBefore=JSON.stringify(legacy);
  const restoredStagePool=consumer.pool(legacy,raw),poolStagePool=consumer.pool(legacy,context(['civic-homeland']));
  expect(restoredStagePool).toEqual(poolStagePool);expect(JSON.stringify(raw)).toBe(before);expect(JSON.stringify(legacy)).toBe(legacyBefore);
  expect(restoredStagePool[0]).toBe(legacy[0]);
  expect(()=>consumer.pool(legacy,{...raw,stage:'caller-approved'} as never)).toThrow('stage');
  expect(()=>consumer.pool(legacy,{...raw,approved:true} as never)).toThrow('unknown field');
 });
 it('requires all common fields to be own enumerable data fields',()=>{
  for(const field of ['themeIds','requestedGivenNameLength','namePart','stage'] as const){
   const raw:Record<string,unknown>={...context()};delete raw[field];
   expect(()=>normalizeSemanticAdmissionContextV72(raw)).toThrow('required own data fields');
  }
  expect(()=>normalizeSemanticAdmissionContextV72(Object.create(context()))).toThrow('plain prototype');
  const hidden=context();Object.defineProperty(hidden,'stage',{value:'pool',enumerable:false});
  expect(()=>normalizeSemanticAdmissionContextV72(hidden)).toThrow('own enumerable data field');
  expect(normalizeSemanticAdmissionContextV72(Object.assign(Object.create(null),context()))).toEqual(context());
 });
 it('rejects invalid common enums and sparse theme arrays even when no new row can be added',()=>{
  const invalid=[{...context(),requestedGivenNameLength:3},{...context(),namePart:'surname'},{...context(),stage:'trusted'},{...context(),themeIds:new Array(1)}];
  const emptyPublication=structuredClone(handle.publication);
  const emptyHandle=createNamingSemanticAdmissionHandle({...emptyPublication,rows:[],records:[]});
  for(const raw of invalid){
   expect(()=>consumer.pool(allLegacy(),raw as never)).toThrow('Semantic admission7.2:');
   expect(()=>unionSemanticGenerationPoolV72(emptyHandle,[],raw as never)).toThrow('Semantic admission7.2:');
  }
  expect(()=>consumer.pool(allLegacy(),{approved:true} as never)).toThrow('unknown field');
  expect(()=>unionSemanticGenerationPoolV72(emptyHandle,[],{approved:true} as never)).toThrow('unknown field');
  observations.push({kind:'no-new-row-context-validation',allLegacyRows:allLegacy().length,emptyPublicationRows:0,invalidCommonContexts:invalid.length+1});
 });
});

describe('M814 unknown theme rejection independent of selected characters',()=>{
 it('rejects unknown theme enums and preserves exact known enum and uniqueness requirements',()=>{
  expect(()=>normalizeSemanticAdmissionContextV72(context(['unknown-theme']))).toThrow('unknown-theme');
  expect(()=>normalizeSemanticAdmissionContextV72(context(['civic-homeland','unknown-theme']))).toThrow('unknown-theme');
  expect(()=>normalizeSemanticAdmissionContextV72(context(['civic-homeland','civic-homeland']))).toThrow('explicit theme array');
  for(const theme of SEMANTIC_THEMES_V72)expect(normalizeSemanticAdmissionContextV72(context([theme])).themeIds).toEqual([theme]);
 });
 it('keeps fixed theme authority when the public shared enum array is changed',()=>{
  const mutable=SEMANTIC_THEMES_V72 as unknown as string[],original=[...mutable];
  try{
   mutable.splice(0,mutable.length,'unknown-theme');
   expect(()=>normalizeSemanticAdmissionContextV72(context(['unknown-theme']))).toThrow('unknown-theme');
   expect(()=>consumer.pool(allLegacy(),context(['unknown-theme']))).toThrow('unknown-theme');
   for(const theme of original)expect(normalizeSemanticAdmissionContextV72(context([theme])).themeIds).toEqual([theme]);
  }finally{mutable.splice(0,mutable.length,...original);}
  expect(SEMANTIC_THEMES_V72).toEqual(original);observations.push({kind:'fixed-theme-authority',mutatedPublicEnumCannotAuthorize:true,knownThemeEnums:original.length});
 });
 it('returns an integrity rejection for both legacy-only and new-row assessments',()=>{
  for(const char of ['安','纪'])expect(consumer.assess(entry(char),context(['unknown-theme']))).toMatchObject({status:'rejected-integrity',reasonCode:'unknown-theme'});
  expect(assessNamingSemanticAdmission(handle,entry('安'),context())).toMatchObject({status:'not-admitted',recordId:null});
 });
 it('rejects unknown enums for empty, complete legacy and empty-publication pools',()=>{
  for(const legacy of [[],allLegacy()])expect(()=>consumer.pool(legacy,context(['unknown-theme']))).toThrow('unknown-theme');
  const emptyHandle=createNamingSemanticAdmissionHandle({...structuredClone(handle.publication),rows:[],records:[]});
  expect(()=>unionSemanticGenerationPoolV72(emptyHandle,[],context(['unknown-theme']))).toThrow('unknown-theme');
 });
 it('rejects legacy-only unknown-theme requests at every generation entry, including empty AI proposals',()=>{
  const raw=request('安',['unknown-theme']);
  expect(()=>consumer.required(raw)).toThrow('unknown-theme');
  expect(()=>consumer.evaluate(raw,'安')).toThrow('unknown-theme');
  expect(()=>consumer.evaluate({...raw,preferences:{...raw.preferences,requiredChars:'纪'}},'纪')).toThrow('unknown-theme');
  expect(()=>consumer.generateLocal(raw)).toThrow('unknown-theme');
  expect(()=>consumer.evaluateAiProposals(raw,[])).toThrow('unknown-theme');
  observations.push({kind:'unknown-theme-generation',legacyOnly:'rejected',newRow:'rejected',emptyAi:'rejected'});
 });
 it('rejects legacy-only unknown-theme snapshots at both save and restore',()=>{
  const validRequest=request('安'),saved=consumer.evaluate(validRequest,'安').candidate!;
  expect(saved.semanticAdoption72.rows.every(row=>row.adoption===null)).toBe(true);
  const invalidRequest=request('安',['unknown-theme']),invalidSaved=structuredClone(saved);
  invalidSaved.semanticAdoption72.themeIds=['unknown-theme'];
  for(const stage of ['save','restore'] as const){
   expect(()=>consumer.verifySaved(saved,invalidRequest,stage)).toThrow('unknown-theme');
   expect(()=>consumer.verifySaved(invalidSaved,invalidRequest,stage)).toThrow('unknown-theme');
  }
  observations.push({kind:'unknown-theme-legacy-replay',save:'rejected',restore:'rejected',receiptCount:0});
 });
});

describe('M814 preserves existing legal generation, replay and main capabilities',()=>{
 it('keeps all supplied legacy rows even when pending or missing a selected theme',()=>{
  const legacy=allLegacy(),before=JSON.stringify(legacy),pool=consumer.pool(legacy,context());
  expect(pool).toHaveLength(10);expect(pool).toEqual(legacy);expect(JSON.stringify(legacy)).toBe(before);
  expect(pool.some(row=>row.char==='叶')).toBe(true);expect(pool.some(row=>row.char==='邦')).toBe(true);
  const withOrdinary=consumer.pool([entry('安')],context());
  expect(withOrdinary.map(row=>row.char)).toEqual(['安','纪','年','岁']);
 });
 it('retains general characters, all six exact themes and legacy 安 through save and restore',()=>{
  const cases:Array<[string,string[]]>=[['纪',[]],['年',[]],['岁',[]],['邦',['civic-homeland']],['沫',['water-bubbles']],['纶安',['textile-ribbon']],['农',['agriculture']],['作安',['literary-artwork']],['萧安',['herb-plant']],['安',[]]];
  for(const [name,themes] of cases){
   const raw=request(name,themes),actual=consumer.evaluate(raw,name);expect(actual.status,name).toBe('generated');
   for(const stage of ['save','restore'] as const)expect(consumer.verifySaved(actual.candidate!,raw,stage).ok,name).toBe(true);
   expect(actual.candidate!.semanticAdoption72.scoreDelta).toBe(0);expect(actual.candidate!.semanticAdoption72.wholeNameMeaning).toBeNull();
  }
  for(const theme of SEMANTIC_THEMES_V72)expect(consumer.evaluate(request('安',[theme]),'安').status).toBe('generated');
  observations.push({kind:'legal-generation-and-replay',names:cases.map(([name])=>name),knownThemeEnums:SEMANTIC_THEMES_V72.length});
 },120000);
 it.each([['纪',[]],['邦',['civic-homeland']]] as const)('replays the original d80 saved %s receipt without changing the candidate or sealed file',(name,themes)=>{
  const file=path.join('D:/Codex-NamingStudio-Evidence/m751-meaning-admission/.local/m751-tests',`saved-${name}.json`);
  const bytes=fs.readFileSync(file),saved=JSON.parse(bytes.toString('utf8')) as SemanticGeneratedCandidateV72,before=JSON.stringify(saved),raw=request(name,[...themes]);
  expect(consumer.verifySaved(saved,raw,'save')).toMatchObject({ok:true,receiptCount:1});
  expect(consumer.verifySaved(saved,raw,'restore')).toMatchObject({ok:true,receiptCount:1});
  expect(JSON.stringify(saved)).toBe(before);expect(fs.readFileSync(file).equals(bytes)).toBe(true);
  const receipt=saved.semanticAdoption72.rows[0].adoption!;expect(Object.keys(receipt)).toHaveLength(22);
  const occurrence={themeIds:[...themes],requestedGivenNameLength:1 as const,namePart:'given-name' as const,givenName:name,fullName:saved.fullName,position:0,candidateId:saved.id};
  const saveReceipt=createSemanticAdoptionReceiptV72(handle,entry(name),{...occurrence,stage:'save'});
  const restoreReceipt=createSemanticAdoptionReceiptV72(handle,entry(name),{...occurrence,stage:'restore'});
  expect(saveReceipt).toEqual(receipt);expect(restoreReceipt).toEqual(receipt);
  observations.push({kind:'sealed-d80-receipt-replay',name,receiptFields:Object.keys(receipt).length,unchanged:true,stageHashUnchanged:true});
 });
 it('rejects borrowed, copied, proxied and pure-domain handles at the existing main boundary',()=>{
  const pure=createNamingSemanticAdmissionHandle(handle.publication),borrowed=Object.create(handle) as SemanticAdmissionHandle;
  const copied={publication:handle.publication};let traps=0;
  const proxied=new Proxy(handle,{get(){traps++;throw Error('unexpected handle trap');}});
  for(const supplied of [borrowed,copied,pure,proxied,structuredClone(handle)])expect(()=>createNamingSemanticGenerationV72(supplied)).toThrow('main-authenticated');
  expect(traps).toBe(0);expect(Object.isFrozen(consumer)).toBe(true);
  observations.push({kind:'main-handle-identity',rejectedVariants:5,proxyTraps:traps});
 });
 it('checks the existing domain handle identity before reading publication fields',()=>{
  let traps=0;
  const proxied=new Proxy(handle,{get(){traps++;throw Error('unexpected publication read');},ownKeys(){traps++;throw Error('unexpected handle reflection');}});
  for(const supplied of [proxied,Object.create(handle) as SemanticAdmissionHandle,{publication:handle.publication},structuredClone(handle)]){
   expect(()=>unionSemanticGenerationPoolV72(supplied,[],context())).toThrow('unknown policy handle');
  }
  expect(traps).toBe(0);
  const pure=createNamingSemanticAdmissionHandle(handle.publication);
  expect(unionSemanticGenerationPoolV72(pure,[],context()).map(row=>row.char)).toEqual(['纪','年','岁']);
  observations.push({kind:'domain-pool-handle-identity',rejectedVariants:4,proxyTraps:traps,existingPureConstructorPreserved:true});
 });
});
