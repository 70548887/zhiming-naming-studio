import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {beforeAll,afterAll,expect,it} from 'vitest';
import {buildProjectApplicationV132R2} from '../scripts/build-project-application-v132-r2.mjs';
import {createCandidate2NamingConsumer} from '../src/main/candidate2-naming-consumer-v1';
import {generateCandidate2DomainV1} from '../src/domain/candidate2-naming-consumer-v1';
import {loadCandidate2NamingData} from '../src/main/candidate2-naming-data-v1';
import {CANDIDATE2_NAMING_SELECTION} from '../src/shared/candidate2-naming-consumer-v1';
import type {Candidate2NamingGeneration} from '../src/shared/candidate2-naming-consumer-v1';
import {canonicalPlainJson} from '../src/shared/plain-json';
import {normalizePreferences} from '../src/shared/workflow';
import type {BirthProfile} from '../src/shared/types';
import fixture from './fixtures/project-naming-use-m153.json';

const root=process.cwd(),parent=path.resolve(root,'.local/m825-invariant');fs.mkdirSync(parent,{recursive:true});
const owned=fs.mkdtempSync(path.join(parent,'case-'));
const profile=structuredClone(fixture.positive.profile) as BirthProfile;
const preferences=normalizePreferences({length:1,requiredChars:'沐',style:'自然',zodiacRules:false,numerology:false});
const selection=CANDIDATE2_NAMING_SELECTION,request={profile,preferences,selection,seed:17,excludeNames:[] as string[]},context={profile,preferences,selection};
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const digest=(value:unknown)=>createHash('sha256').update(canonicalPlainJson(value)).digest('hex');
let consumer:ReturnType<typeof createCandidate2NamingConsumer>,live:Candidate2NamingGeneration,saved:Candidate2NamingGeneration;
function evidence(name:string,value:unknown){const directory=process.env.M825_EVIDENCE_DIR;if(!directory)return;fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,name+'.json');fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);}
beforeAll(async()=>{
 const receipt=await buildProjectApplicationV132R2({root,outfile:path.join(owned,'candidate2.cjs')});
 consumer=createCandidate2NamingConsumer({applicationBundlePath:path.join(owned,'candidate2.cjs'),assetDir:path.resolve('assets'),dataDir:path.resolve('data'),namingRulesVersion:'naming-editorial-7.1.0'});
 const result=consumer.generate(request);if(result.status!=='generated')throw Error('real positive unavailable');live=result;saved=consumer.createSaved(live);
 evidence('positive-capture',{coreOutput:receipt.output,status:live.status,candidates:live.candidates.map(candidate=>({name:candidate.fullName,traditional:candidate.evaluation.traditional})),recordDigest:saved.digest});
},30000);
afterAll(()=>{const target=path.resolve(owned);if(path.dirname(target)!==parent||!path.basename(target).startsWith('case-'))throw Error('unsafe test cleanup');fs.rmSync(target,{recursive:true,force:true});});

it('rejects the M821 real empty generated envelope using the same live-generation nonempty invariant',()=>{
 const exclusions=['林沐','沐'],data=loadCandidate2NamingData(path.resolve('data'),'naming-editorial-7.1.0');
 const domain=generateCandidate2DomainV1(live.profile,live.preferences,live.baseAnalysis,data.characters,data.citations,data.context,live.domainProjection.applied,17,exclusions);
 expect(domain.candidates).toEqual([]);
 const forged=clone(saved);forged.excludeNames=exclusions;forged.candidates=[];
 forged.messages=[...domain.messages,'本批采用独立 candidate.2 项目意见；原用户偏好和基础分析保持原样，尚未接入生产保存入口。'];
 const {digest:_oldDigest,...body}=forged;forged.digest=digest(body);
 expect(forged.status).toBe('generated');expect(forged.digest).toBe(digest(body));
 expect(()=>consumer.generate({...request,excludeNames:exclusions})).toThrow('CANDIDATE2_NAMING_NO_CANDIDATES');
 expect(()=>consumer.verifySaved(forged,context)).toThrow('CANDIDATE2_NAMING_NO_CANDIDATES');
 evidence('empty-record-rejected',{exclusions,realDomainCandidateCount:0,publicDigestRecomputed:true,liveError:'CANDIDATE2_NAMING_NO_CANDIDATES',replayError:'CANDIDATE2_NAMING_NO_CANDIDATES',noGenerationAuthorityForged:true});
});

it('still captures and verifies a legitimate nonempty JSON roundtrip without granting generation authority',()=>{
 expect(live.candidates.map(candidate=>candidate.fullName)).toEqual(['林沐']);
 expect(live.candidates[0].evaluation.traditional).toBe(40);
 const imported=clone(saved),before=clone(imported),verified=consumer.verifySaved(imported,context);
 expect(verified).toMatchObject({status:'verified-saved',candidateCount:1,generationAuthority:false,replayOrigin:'saved-replay'});
 expect(imported).toEqual(before);expect(consumer.createSaved(live)).toEqual(saved);
 expect(()=>consumer.createSaved(verified as unknown as Candidate2NamingGeneration)).toThrow('GENERATION_REQUIRED');
 evidence('legal-nonempty-replay',{status:verified.status,candidateCount:verified.candidateCount,generationAuthority:verified.generationAuthority,replayOrigin:verified.replayOrigin,recordDigest:verified.recordDigest});
});

it.each(['disabled','pending','blocked','verified-saved',''])('does not reinterpret status %j as generated',status=>{
 const bad=clone(saved) as unknown as Record<string,unknown>;bad.status=status;
 const {digest:_old,...body}=bad;bad.digest=digest(body);
 expect(()=>consumer.verifySaved(bad,context)).toThrow('CANDIDATE2_NAMING_SAVED_INVALID');
});
