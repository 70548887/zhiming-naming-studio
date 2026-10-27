import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assessNamingSemanticAdmission,createNamingSemanticAdmissionHandle,normalizeSemanticAdmissionContextV72,normalizeSemanticAdmissionContextV72Safe,unionSemanticGenerationPoolV72} from '../src/domain/naming-semantic-admission-v72';
import {loadNamingSemanticAdmissionV72,semanticAdmissionDatasetV72} from '../src/main/naming-semantic-admission-v72-data';
import {createNamingSemanticGenerationV72} from '../src/main/naming-semantic-generation-v72';
import {SEMANTIC_THEMES_V72} from '../src/shared/naming-semantic-admission-v72';
import {reviewedNamingSense} from '../src/domain/naming-semantics-v6';
import {createNamingReviewLookup} from '../src/domain/naming-review-v7.mjs';
import type {SupplementalReviewTable} from '../src/domain/naming-review-v7.mjs';
import type {SemanticAdmissionContext,SemanticAdmissionHandle,SemanticGenerationRequestV72} from '../src/shared/naming-semantic-admission-v72';
import type {CharacterEntry} from '../src/shared/types';
import {catalogSession} from './fixtures/catalog-session';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.join(root,'.local/m910');
const config={decisionRoot:'D:/Codex-NamingStudio-Evidence/m752-meaning-admission-decision/r2',m740Root:'D:/Codex-NamingStudio-Evidence/m740-character-meanings',sourceDataDir:path.join(root,'data'),m744AuditPath:'D:/Codex-NamingStudio-Evidence/m744-data-audit/M744-DATA-AUDIT.json'};
let handle:SemanticAdmissionHandle,consumer:ReturnType<typeof createNamingSemanticGenerationV72>,characters:CharacterEntry[];
const context=(themeIds:string[]=[],stage:SemanticAdmissionContext['stage']='pool'):SemanticAdmissionContext=>({themeIds,requestedGivenNameLength:2,namePart:'given-name',stage});
const entry=(char:string)=>characters.find(row=>row.char===char)!;
const legacy=()=>{const table=JSON.parse(fs.readFileSync(path.join(root,'data/naming-editorial-v7.json'),'utf8')) as SupplementalReviewTable;const lookup=createNamingReviewLookup(table);const baseContext={packSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',activeVersion:'1875aa49dcfa'};return characters.filter(row=>!!reviewedNamingSense(row)||!!lookup.lookupMeaning(row,baseContext));};
const request=(givenName:string,themeIds:string[]=[]):SemanticGenerationRequestV72=>{const base=catalogSession('m910-safe-context','2026-10-25T00:00:00Z','m910-safe-profile');return{profile:{...base.profile,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:''},preferences:{...base.preferences,length:[...givenName].length as 1|2,requiredChars:givenName,generationChar:'',forbiddenChars:'',elderTaboo:'',preferredElements:[],meanings:'',industry:'',numerology:false,zodiacRules:false,avoidParentNames:true},analysis:base.analysis,themeIds};};
const counts=(rows:CharacterEntry[])=>rows.map(row=>row.char);

beforeAll(()=>{handle=loadNamingSemanticAdmissionV72(config);consumer=createNamingSemanticGenerationV72(handle);characters=semanticAdmissionDatasetV72(handle).characters;fs.mkdirSync(evidence,{recursive:true});});
afterAll(()=>{fs.writeFileSync(path.join(evidence,'m910-focused-observations.json'),JSON.stringify({schema:'m910-safe-context-normalization/1',publicationRows:handle.publication.rows.length,admittedRecords:handle.publication.records.filter(row=>row.decision==='allow-single-character-generation').length,formalCoverageAdded:0,defaultAutomaticCoverageAdded:0},null,2)+'\n');});

describe('M910 safe context normalization',()=>{
 it('returns an owned sorted frozen context and leaves the strict normalizer unchanged',()=>{
  const raw=context(['water-bubbles','agriculture'],'restore');
  const strict=normalizeSemanticAdmissionContextV72(raw),safe=normalizeSemanticAdmissionContextV72Safe(raw);
  expect(safe).toEqual({ok:true,context:strict});expect(safe.context).not.toBe(raw);expect(safe.context.themeIds).not.toBe(raw.themeIds);
  expect(safe.context).toEqual({themeIds:['agriculture','water-bubbles'],requestedGivenNameLength:2,namePart:'given-name',stage:'restore'});
  expect(Object.isFrozen(safe)).toBe(true);expect(Object.isFrozen(safe.context)).toBe(true);expect(Object.isFrozen(safe.context.themeIds)).toBe(true);
  (raw.themeIds as string[]).push('herb-plant');raw.stage='save';expect(safe.context.themeIds).toEqual(['agriculture','water-bubbles']);expect(safe.context.stage).toBe('restore');
  expect(Reflect.set(safe.context,'stage','save')).toBe(false);expect(Reflect.set(safe.context.themeIds,'0','unknown-theme')).toBe(false);
 });
 it('statefully normalizes unknown themes without filtering them, while strict callers still throw',()=>{
  const safe=normalizeSemanticAdmissionContextV72Safe(context(['water-bubbles','unknown-theme'],'local'));
  expect(safe).toMatchObject({ok:false,reasonCode:'unknown-theme',context:{themeIds:['unknown-theme','water-bubbles'],stage:'local'}});
  expect(safe.context.themeIds).toEqual(['unknown-theme','water-bubbles']);expect(Object.isFrozen(safe.context)).toBe(true);
  expect(()=>normalizeSemanticAdmissionContextV72(context(['unknown-theme']))).toThrow('unknown-theme');
  expect(()=>consumer.pool([],context(['unknown-theme']))).toThrow('unknown-theme');
  expect(assessNamingSemanticAdmission(handle,entry('安'),context(['unknown-theme']))).toMatchObject({status:'rejected-integrity',reasonCode:'unknown-theme'});
  expect(assessNamingSemanticAdmission(handle,entry('纪'),context(['unknown-theme']))).toMatchObject({status:'rejected-integrity',reasonCode:'unknown-theme'});
 });
 it('keeps structural errors strict and gives duplicate precedence over unknown membership',()=>{
  const getter=context();let reads=0;Object.defineProperty(getter,'themeIds',{enumerable:true,get(){reads++;return[];}});
  expect(()=>normalizeSemanticAdmissionContextV72Safe(getter)).toThrow('own enumerable data field');expect(reads).toBe(0);
  expect(()=>normalizeSemanticAdmissionContextV72Safe(context(['civic-homeland','civic-homeland']))).toThrow('explicit theme array');
  expect(()=>normalizeSemanticAdmissionContextV72Safe(context(['civic-homeland','civic-homeland','unknown-theme']))).toThrow('explicit theme array');
  const traps={get:0,ownKeys:0,getPrototypeOf:0,getOwnPropertyDescriptor:0};const proxy=new Proxy(context(),{get(){traps.get++;throw Error('trap');},ownKeys(){traps.ownKeys++;throw Error('trap');},getPrototypeOf(){traps.getPrototypeOf++;throw Error('trap');},getOwnPropertyDescriptor(){traps.getOwnPropertyDescriptor++;throw Error('trap');}});
  expect(()=>normalizeSemanticAdmissionContextV72Safe(proxy)).toThrow('Proxy');expect(traps).toEqual({get:0,ownKeys:0,getPrototypeOf:0,getOwnPropertyDescriptor:0});
 });
});

describe('M910 compatibility and admission counts',()=>{
 it('preserves all old and six explicit-theme pool counts and ordering',()=>{
  expect(handle.publication.rows).toHaveLength(10);expect(handle.publication.records.filter(row=>row.decision==='allow-single-character-generation')).toHaveLength(9);
  const expectedNoTheme=['纪','年','岁'],expectedAll=['邦','沫','纪','纶','年','农','作','岁','萧'];
  expect(counts(consumer.pool([],context()))).toEqual(expectedNoTheme);
  expect(counts(consumer.pool([],context([...SEMANTIC_THEMES_V72])))).toEqual(expectedAll);
  expect(consumer.pool(legacy(),context())).toHaveLength(524);expect(consumer.pool(legacy(),context([...SEMANTIC_THEMES_V72]))).toHaveLength(530);
  expect(handle.publication.activation).toBe('not-current');expect(handle.publication.productionApproved).toBe(false);
 });
 it('keeps each historical theme, empty themes and reversed ordering deterministic',()=>{
  const expected:Record<string,string[]>={
   'civic-homeland':['邦','纪','年','岁'],'water-bubbles':['沫','纪','年','岁'],'textile-ribbon':['纪','纶','年','岁'],
   agriculture:['纪','年','农','岁'],'literary-artwork':['纪','年','作','岁'],'herb-plant':['纪','年','岁','萧'],
  };
  for(const theme of SEMANTIC_THEMES_V72){expect(counts(consumer.pool([],context([theme])))).toEqual(expected[theme]);expect(counts(consumer.pool([],context([theme].reverse())))).toEqual(expected[theme]);}
  expect(counts(consumer.pool([],context()))).toEqual(['纪','年','岁']);
 });
 it('does not alter caller legacy rows or produce a receipt for unknown-theme legacy requests',()=>{
  const supplied=legacy(),before=structuredClone(supplied);expect(consumer.pool(supplied,context(['civic-homeland'],'restore'))).toEqual(consumer.pool(supplied,context(['civic-homeland'])));expect(supplied).toEqual(before);
  const unknown=request('安',['unknown-theme']);expect(()=>consumer.required(unknown)).toThrow('unknown-theme');expect(()=>consumer.evaluate(unknown,'安')).toThrow('unknown-theme');expect(()=>consumer.generateLocal(unknown)).toThrow('unknown-theme');expect(()=>consumer.evaluateAiProposals(unknown,[])).toThrow('unknown-theme');
  expect(()=>consumer.verifySaved(consumer.evaluate(request('安'),'安').candidate!,unknown,'save')).toThrow('unknown-theme');expect(()=>consumer.verifySaved(consumer.evaluate(request('安'),'安').candidate!,unknown,'restore')).toThrow('unknown-theme');
 });
});
