import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {afterAll,beforeAll,expect,it} from 'vitest';
import {buildProjectApplicationV132R2} from '../scripts/build-project-application-v132-r2.mjs';
import {inspectProjectApplicationV132} from '../src/main/project-application-v132-policy';
import {analyzeChart145} from '../src/domain/bazi-mainchain/project-v132';
import {analyzeProfile} from '../src/domain/engine';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';
import type {createProjectApplicationV132R2} from '../src/main/project-application-v132-r2';

type Api=typeof import('../src/main/project-application-v132-r2');
const root=process.cwd(),require=createRequire(import.meta.url),profile=structuredClone(fixture.positive.profile) as BirthProfile;
const parent=path.resolve(root,'.local/m786-input-tests');fs.mkdirSync(parent,{recursive:true});
const owned=fs.mkdtempSync(path.join(parent,'case-'));
let api:Api,adapter:ReturnType<typeof createProjectApplicationV132R2>,saved:any,positive:ReturnType<ReturnType<typeof createProjectApplicationV132R2>['resolve']>;
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
function evidence(name:string,value:unknown):void {
 const directory=process.env.M786_EVIDENCE_DIR;if(!directory)return;fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,name+'.json');fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n');fs.renameSync(file+'.tmp',file);
}
beforeAll(async()=>{
 const receipt=await buildProjectApplicationV132R2({root,outfile:path.join(owned,'candidate2.cjs')});
 api=require(path.join(owned,'candidate2.cjs'));adapter=api.createProjectApplicationV132R2({assetDir:path.join(root,'assets')});
 positive=adapter.resolve(profile,{enabled:true});expect(positive.status).toBe('applicable');saved=adapter.createSaved(positive);
 evidence('build-and-positive',{identity:receipt.identity,output:receipt.output,resolution:positive.status,tuple:saved.tuple,elements:saved.application.elements});
},30000);
afterAll(()=>{const resolved=path.resolve(owned);if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('case-'))throw Error('unsafe test cleanup');fs.rmSync(resolved,{recursive:true,force:true});});

it('keeps explicit generation and legal saved JSON roundtrip available under the new exact tuple',()=>{
 expect(adapter.resolve(profile).status).toBe('disabled');
 const input=adapter.toNamingInput(positive);api.assertProjectApplicationNamingInput(input);
 expect(input.elements.primary).toEqual(['土']);expect(input.elements.secondary).toEqual(['金']);
 const replay=adapter.verifySaved(clone(saved));api.assertProjectApplicationNamingInput(replay.namingInput);
 expect(replay.status).toBe('verified-saved');expect(replay.namingInput.origin).toBe('saved-replay');
 expect(replay.namingInput.elements).toEqual(input.elements);
 expect(saved.tuple.policyPublicationId).toBe('project-naming-application/1.3.2-candidate.2');
 expect(()=>adapter.toNamingInput(replay as never)).toThrow('UNTRUSTED_RESOLUTION');
 const old=clone(saved);old.tuple.policyPublicationId='project-naming-application/1.3.2-candidate.1';
 expect(()=>adapter.verifySaved(old)).toThrow('unsupported exact engine/application tuple');
 evidence('legal-roundtrip',{generation:input.origin,replay:replay.status,origin:replay.namingInput.origin,elements:replay.namingInput.elements,tuple:input.tuple});
});

it('rejects M784 nested value-disagreement Proxy before all traps, including the ordinary get trap',()=>{
 const input=clone(saved),traps={get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0};
 input.certificate.effectiveElements=new Proxy(input.certificate.effectiveElements,{
  get(target,key,receiver){traps.get++;if(key==='primary')return['火'];return Reflect.get(target,key,receiver);},
  ownKeys(target){traps.ownKeys++;return Reflect.ownKeys(target);},
  getOwnPropertyDescriptor(target,key){traps.getOwnPropertyDescriptor++;return Reflect.getOwnPropertyDescriptor(target,key);},
  getPrototypeOf(target){traps.getPrototypeOf++;return Reflect.getPrototypeOf(target);},
 });
 expect(()=>adapter.verifySaved(input)).toThrow(/^PROJECT_APPLICATION_INPUT_INVALID: Proxy/);
 expect(traps).toEqual({get:0,ownKeys:0,getOwnPropertyDescriptor:0,getPrototypeOf:0});
 evidence('nested-proxy-rejected',{accepted:false,traps,trustedGenerationPrimary:adapter.toNamingInput(positive).elements.primary});
});

it('rejects M784 third-serialization tuple mutation before ownKeys or descriptor traps',()=>{
 const input=clone(saved);let ownKeysCalls=0,descriptors=0,gets=0,mutation=false;
 input.tuple=new Proxy(input.tuple,{get(target,key,receiver){gets++;return Reflect.get(target,key,receiver);},ownKeys(target){ownKeysCalls++;return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){descriptors++;if(ownKeysCalls===3&&key==='policyId'){input.replay.profile.birthTime='12:00';input.application.elements.primary=['火'];mutation=true;}return Reflect.getOwnPropertyDescriptor(target,key);}});
 expect(()=>adapter.verifySaved(input)).toThrow(/^PROJECT_APPLICATION_INPUT_INVALID: Proxy/);
 expect({ownKeysCalls,descriptors,gets,mutation}).toEqual({ownKeysCalls:0,descriptors:0,gets:0,mutation:false});
 expect(input.replay.profile.birthTime).toBe(profile.birthTime);expect(input.application.elements.primary).toEqual(['土']);
 evidence('tuple-toctou-rejected',{accepted:false,ownKeysCalls,descriptors,gets,mutation,recordedBirthTime:input.replay.profile.birthTime});
});

it('rejects revoked nested proxies and descriptor accessors/toJSON without invoking caller code',()=>{
 const revoked=Proxy.revocable({},{});revoked.revoke();const nested=clone(saved);nested.certificate=revoked.proxy;
 expect(()=>adapter.verifySaved(nested)).toThrow(/^PROJECT_APPLICATION_INPUT_INVALID: Proxy/);
 let getter=0,toJSON=0;const accessor=clone(saved);
 Object.defineProperty(accessor.certificate.effectiveElements,'primary',{enumerable:true,get(){getter++;return['土'];}});
 expect(()=>adapter.verifySaved(accessor)).toThrow(/^PROJECT_APPLICATION_INPUT_INVALID/);
 const serializer=clone(saved);serializer.replay.toJSON=()=>{toJSON++;return saved.replay;};
 expect(()=>adapter.verifySaved(serializer)).toThrow(/^PROJECT_APPLICATION_INPUT_INVALID/);
 expect({getter,toJSON}).toEqual({getter:0,toJSON:0});
});

it('keeps owned generation, replay and future saved output stable after outside input mutation',()=>{
 const config={assetDir:path.join(root,'assets')},other=api.createProjectApplicationV132R2(config);config.assetDir=path.join(owned,'caller-mutated');
 const birth=clone(profile),resolution=other.resolve(birth,{enabled:true});expect(resolution.status).toBe('applicable');
 birth.birthTime='12:00';const firstSaved=other.createSaved(resolution);expect(firstSaved.replay.profile.birthTime).toBe(profile.birthTime);
 const caller=clone(firstSaved),verified=other.verifySaved(caller),before=clone(verified.namingInput);
 caller.replay.profile.birthTime='12:00';caller.application.elements.primary=['火'];caller.certificate.effectiveElements.primary=['火'];
 expect(verified.namingInput).toEqual(before);expect(verified.namingInput.elements.primary).toEqual(['土']);expect(Object.isFrozen(verified.namingInput.elements.primary)).toBe(true);
 expect(other.createSaved(resolution)).toEqual(firstSaved);expect(()=>other.verifySaved(caller)).toThrow('SAVED_INVALID');
 evidence('outside-mutation-isolated',{generationBirthTime:firstSaved.replay.profile.birthTime,mutatedCallerBirthTime:caller.replay.profile.birthTime,replayedPrimary:verified.namingInput.elements.primary,callerPrimary:caller.application.elements.primary,immutable:true});
});

it('retains unique/certificate acceptance and multiple, no-consistent and unknown-hour barriers',()=>{
 const multiple=adapter.resolve({...profile,id:'m786-multi',birthDate:'1990-12-05',birthTime:'08:00'},{enabled:true});
 expect(multiple.status).toBe('pending');expect(multiple.reasons.some(reason=>reason.code==='multiple-regimes')).toBe(true);
 const unknown=adapter.resolve({...profile,id:'m786-hour-unknown',birthTime:'',timeUnknown:true},{enabled:true});
 expect(unknown.status).toBe('pending');expect(unknown.reasons.some(reason=>reason.code==='unknown-birth-time')).toBe(true);
 // Isolated deterministic policy boundary: the public adapter never accepts a
 // caller root DTO. No-consistent evidence must still supply no application.
 const base=analyzeProfile(profile),rootResult=analyzeChart145({id:profile.id,provenance:'m786-policy-boundary',pillars:{year:{gan:'壬',zhi:'寅'},month:{gan:'壬',zhi:'寅'},day:{gan:'丁',zhi:'酉'},hour:{gan:'丙',zhi:'午'}}});
 rootResult.resolution='no-consistent-regime';rootResult.consistentIds=[];
 const noConsistent=inspectProjectApplicationV132({profile,baseAnalysis:base,root:rootResult,entryPolicy:'month-branch-only'});
 expect(noConsistent.status).toBe('pending');expect(noConsistent.reasons.some(reason=>reason.code==='no-consistent-regime')).toBe(true);expect(noConsistent.effectiveElements).toBeUndefined();
 evidence('unchanged-policy-barriers',{multiple:multiple.status,unknown:unknown.status,noConsistent:noConsistent.status,noConsistentCase:'isolated policy boundary; caller DTOs not accepted by application API'});
});
