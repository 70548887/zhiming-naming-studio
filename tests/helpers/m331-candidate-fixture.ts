import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {catalogSession} from '../fixtures/catalog-session';
import projectFixture from '../fixtures/project-naming-use-m153.json';
import publication70 from '../../data/naming-editorial-meanings-v7-source-lock.json';
import {analyzeProfile} from '../../src/domain/engine';
import {normalizePreferences} from '../../src/shared/workflow';
import {createSessionSourceSnapshot} from '../../src/shared/session-sources';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,NAMING_RULE_V7_SOURCE_ID,NAMING_RULE_V71_SOURCE_ID,type NamingRuleVersion} from '../../src/shared/naming-rules';
import {createNamingElementResolver} from '../../src/main/naming-element-resolution';
import {loadRootFeedbackResources} from '../../src/main/bazi-root-feedback-resources';
import {createBaziRootFeedbackFacade} from '../../src/main/bazi-root-feedback-facade';
import {buildProjectNamingUseSnapshot} from '../../src/main/project-naming-use';
import {verifySavedProjectNamingUse} from '../../src/main/verify-project-naming-use';
import {createNamingMeaningReviewSnapshotForVersion} from '../../src/main/naming-meaning-review';
import {FIXED_NAMING_EDITORIAL_V71_DATA} from '../../src/main/naming-editorial-v7-data';
import type {ResolvedNamingBasis} from '../../src/domain/naming-element-basis';
import type {TrustedNamingContext} from '../../src/domain/naming-review-v7.mjs';
import type {FactArchive,FactDataset} from '../../src/main/candidate-facts';
import type {Analysis,BirthProfile,CharacterEntry,Citation,NameCandidate,NamingPreferences,NamingSession,SourceRecord} from '../../src/shared/types';

export type CandidateInput={givenName:string;origin:'local'|'ai'};
export type ReviewedVersion=typeof NAMING_RULE_V7_VERSION|typeof NAMING_RULE_V71_VERSION;
export type ScalarEvaluator=(version:NamingRuleVersion,context:TrustedNamingContext|undefined,givenName:string,profile:BirthProfile,preferences:NamingPreferences,analysis:Analysis,characters:CharacterEntry[],citations:Citation[],origin?:'local'|'ai')=>NameCandidate|null;
export type BasisEvaluator=(version:NamingRuleVersion,context:TrustedNamingContext|undefined,basis:ResolvedNamingBasis,givenName:string,profile:BirthProfile,preferences:NamingPreferences,analysis:Analysis,characters:CharacterEntry[],citations:Citation[],origin?:'local'|'ai')=>NameCandidate|null;
export interface CandidateFixture {
 version:ReviewedVersion;context:TrustedNamingContext;profile:BirthProfile;preferences:NamingPreferences;analysis:Analysis;
 characters:CharacterEntry[];citations:Citation[];archive:FactArchive;sourceRecords:SourceRecord[];basis?:ResolvedNamingBasis;
}

/** Full fixed package bytes and JSON are read directly; no SQL, Store or Service is loaded. */
export function fixedPackage(){
 const pack=new Uint8Array(readFileSync(resolve('data/knowledge-v6.sqlite'))),sha256=createHash('sha256').update(pack).digest('hex'),version=sha256.slice(0,12);
 const dataset=JSON.parse(readFileSync(resolve('data/dataset-v6.json'),'utf8')) as FactDataset;
 const archive:FactArchive={sha256,version,pack,dataset:{...dataset,version}};
 return {archive,context:{packSha256:sha256,activeVersion:version}};
}

function dedicatedSource(version:ReviewedVersion):SourceRecord {
 if(version===NAMING_RULE_V71_VERSION)return structuredClone(FIXED_NAMING_EDITORIAL_V71_DATA.source);
 const record=publication70.sources.find(source=>source.id===NAMING_RULE_V7_SOURCE_ID);
 if(!record)throw Error('Missing actual 7.0 publication source');
 return {id:record.id,name:record.name,url:record.url,commit:record.commit,license:record.license,files:[...record.files],sha256:record.sha256,note:record.note};
}

export function manualFixture(version:ReviewedVersion=NAMING_RULE_V7_VERSION,length:1|2=2,preferredElements:NamingPreferences['preferredElements']=['水']):CandidateFixture {
 const sample=catalogSession('m331-pure-candidate'),{archive,context}=fixedPackage();
 const preferences=normalizePreferences({...sample.preferences,length,preferredElements,requiredChars:'',generationChar:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',numerology:false,zodiacRules:false});
 const profile:BirthProfile={...sample.profile,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:'',namingPreferences:structuredClone(preferences)};
 return {version,context,profile,preferences,analysis:structuredClone(sample.analysis),characters:archive.dataset.characters,citations:archive.dataset.citations,archive,sourceRecords:[...archive.dataset.sources,dedicatedSource(version)]};
}

/** A project basis is minted and then registered by the actual main-process replay. */
export function projectFixtureForVersion(version:ReviewedVersion):CandidateFixture {
 const value=manualFixture(version),configuration={assetDir:resolve('assets'),dataDir:resolve('data')};
 const preferences: NamingPreferences={...value.preferences,preferredElements:[],namingElementMethod:{methodId:projectFixture.methodId as 'project-bazi-mainchain-145/1.3.1',entryPolicy:'month-branch-only'}};
 const profile={...structuredClone(projectFixture.positive.profile),namingPreferences:structuredClone(preferences)} as BirthProfile;
 const base=analyzeProfile(profile),resources=loadRootFeedbackResources(configuration),facade=createBaziRootFeedbackFacade(resources);
 const resolution=createNamingElementResolver(configuration).resolve(profile,preferences,base,version),snapshot=buildProjectNamingUseSnapshot(resolution,version);
 if(!snapshot)throw Error('Actual project resolver did not issue a project snapshot');
 const fixture={...value,profile,preferences,analysis:{...base,projectNamingUse:snapshot},sourceRecords:[...value.sourceRecords,...resources.sources]};
 const session=sessionFromCandidates(fixture,[]),basis=verifySavedProjectNamingUse(session,{facade,fixedSourceRecords:resources.sources});
 if(!basis)throw Error('Actual fixed project replay did not register its basis');
 return {...fixture,basis};
}

export function scalarRows(fixture:CandidateFixture,rows:ReadonlyArray<CandidateInput>,evaluate:ScalarEvaluator,evaluateWithBasis:BasisEvaluator):Array<NameCandidate|null> {
 return rows.map(row=>fixture.basis?evaluateWithBasis(fixture.version,fixture.context,fixture.basis,row.givenName,fixture.profile,fixture.preferences,fixture.analysis,fixture.characters,fixture.citations,row.origin):evaluate(fixture.version,fixture.context,row.givenName,fixture.profile,fixture.preferences,fixture.analysis,fixture.characters,fixture.citations,row.origin));
}

export function sessionFromCandidates(fixture:CandidateFixture,candidates:NameCandidate[]):NamingSession {
 const {version,profile,preferences,analysis,archive}=fixture;
 const namingRules:NamingSession['namingRules']=version===NAMING_RULE_V71_VERSION?{version:NAMING_RULE_V71_VERSION,sourceId:NAMING_RULE_V71_SOURCE_ID,dataVersion:archive.version}:{version:NAMING_RULE_V7_VERSION,sourceId:NAMING_RULE_V7_SOURCE_ID,dataVersion:archive.version};
 return {id:'m331-frozen-session',profileId:profile.id,createdAt:'2026-10-23T00:00:00.000Z',profile,preferences,analysis,
  candidates:candidates.map(candidate=>({...candidate,namingMeaningReview:createNamingMeaningReviewSnapshotForVersion(version,candidate.givenName,candidate.characters,fixture.context)})),reviewNote:'',originalFavorable:[...analysis.bazi.favorable],dataVersion:archive.version,
  namingRules,sourceSnapshot:createSessionSourceSnapshot(archive.version,fixture.sourceRecords)};
}

/** The probe calls the native map exactly once, preserving callback arguments and values. */
export function transparentMap(characters:CharacterEntry[]){
 const counts={maps:0,characterMaps:0};
 const array=new Proxy(characters,{get(target,key,receiver){
  if(key!=='map')return Reflect.get(target,key,receiver);
  return function<T>(callback:(value:CharacterEntry,index:number,array:CharacterEntry[])=>T,thisArg?:unknown):T[]{
   counts.maps++;
   const result=Array.prototype.map.call(receiver,callback,thisArg) as T[];
   if(result.length===target.length&&result.every((entry,index)=>Array.isArray(entry)&&entry.length===2&&entry[0]===target[index].char&&entry[1]===target[index]))counts.characterMaps++;
   return result;
  };
 }});
 return {characters:array,counts};
}

/** One engineering workload shared by correctness, count evidence and timing. */
export function benchmarkFixture(version:ReviewedVersion=NAMING_RULE_V7_VERSION){
 const fixture=manualFixture(version),names=['斐然','安然','南安','南木','琼莹','静朔','安宁','清和'];
 const rows:CandidateInput[]=Array.from({length:24},(_,index)=>({givenName:names[index%names.length],origin:index%2?'ai':'local'}));
 return {fixture,rows};
}
