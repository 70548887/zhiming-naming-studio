import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {buildProjectApplicationV132} from '../scripts/build-project-application-v132.mjs';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';

type BuiltApi={
 createProjectApplicationV132(configuration:{assetDir:string}):any;
 assertProjectApplicationNamingInput(value:unknown):asserts value is object;
};

const root=path.resolve('.');
const baseProfile=structuredClone(fixture.positive.profile) as BirthProfile;
const negativeProfile=structuredClone(fixture.negative.profile) as BirthProfile;
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'m753-project-application-'));
const deployed=path.join(scratch,'portable');
const require=createRequire(import.meta.url);
let built:BuiltApi;
let adapter:any;
let positive:any;

function assetRoot(label:string):string {
 const target=path.join(scratch,label,'assets');
 fs.mkdirSync(target,{recursive:true});
 fs.cpSync(path.join(root,'assets','bazi-root-feedback'),path.join(target,'bazi-root-feedback'),{recursive:true});
 fs.cpSync(path.join(root,'assets','project-naming-application'),path.join(target,'project-naming-application'),{recursive:true});
 return target;
}

function profileAt(id:string,birthDate:string,birthTime:string):BirthProfile {
 return {...baseProfile,id,birthDate,birthTime,timeUnknown:false};
}

beforeAll(async()=>{
 fs.mkdirSync(deployed,{recursive:true});
 const receipt=await buildProjectApplicationV132({root,outfile:path.join(deployed,'project-application.cjs')});
 expect(receipt.identity.policyId).toBe('naming-element-application/1.3.2-candidate.1');
 built=require(path.join(deployed,'project-application.cjs')) as BuiltApi;
 adapter=built.createProjectApplicationV132({assetDir:path.join(root,'assets')});
 positive=adapter.resolve(baseProfile,{enabled:true});
},60000);

afterAll(()=>{
 const absolute=path.resolve(scratch);
 if(absolute.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(absolute).startsWith('m753-project-application-'))fs.rmSync(absolute,{recursive:true,force:true});
});

describe('M753 independent project application and saved replay',()=>{
 it('admits only the real fixed positive regular result',()=>{
  expect(positive.status).toBe('applicable');
  expect(positive.traditionalStatus).toBe('unknown');
  expect(positive.certificate.branch).toMatch(/^regular-/u);
  expect(positive.certificate.selectedRegimeId).toContain('root-');
  expect(positive.certificate.replay.profile).toEqual(baseProfile);
  expect(positive.certificate.replay.entryPolicy).toBe('month-branch-only');
  expect(positive.certificate.numerical.iterations).toBeGreaterThan(0);
  expect(positive.certificate.numerical.errorBound).toBeGreaterThanOrEqual(0);
  expect(positive.certificate.numerical.residualL1UpperBound).toBeGreaterThanOrEqual(0);
  expect(positive.certificate.sources.length).toBeGreaterThan(0);
 });

 it('keeps the default application gate disabled and requires explicit plain opt-in',()=>{
  expect(adapter.resolve(baseProfile).status).toBe('disabled');
  expect(adapter.resolve(baseProfile,{enabled:false}).status).toBe('disabled');
  expect(()=>adapter.resolve(baseProfile,{enabled:true,root:'inject'})).toThrow();
  expect(()=>adapter.resolve({...baseProfile,root:'inject'},{enabled:true})).toThrow();
  expect(()=>adapter.resolve(baseProfile,new Proxy({enabled:true},{get:()=>true}))).toThrow();
 });

 it('brands generation input and rejects DTOs, clones, forged certificates and cross-adapter resolutions',()=>{
  const input=adapter.toNamingInput(positive);
  expect(input.origin).toBe('generation');
  expect(input.schema).toBe('project-naming-input/1.0.0');
  expect(()=>built.assertProjectApplicationNamingInput(input)).not.toThrow();
  expect(()=>adapter.toNamingInput(JSON.parse(JSON.stringify(positive)))).toThrow();
  expect(()=>adapter.toNamingInput({...positive,certificate:{...positive.certificate,digest:'0'.repeat(64)}})).toThrow();
  expect(()=>adapter.toNamingInput({...positive,certificate:{...positive.certificate,tuple:{...positive.certificate.tuple,policyId:'forged'}}})).toThrow();
  expect(()=>adapter.toNamingInput(input)).toThrow();
  const second=built.createProjectApplicationV132({assetDir:path.join(root,'assets')});
  expect(()=>second.toNamingInput(positive)).toThrow();
  expect(()=>second.createSaved(positive)).toThrow();
 });

 it('creates project-naming-use/2 and verifies a JSON replay as saved-replay only',()=>{
  const saved=adapter.createSaved(positive);
  expect(saved.schema).toBe('project-naming-use/2');
  expect(saved.application.status).toBe('applied');
  expect(saved.tuple.methodId).toBe('project-bazi-mainchain-145/1.3.2');
  expect(saved.tuple.entryPolicy).toBe('month-branch-only');
  expect(saved.digest).toMatch(/^[a-f0-9]{64}$/u);
  const verified=adapter.verifySaved(JSON.parse(JSON.stringify(saved)));
  expect(verified.status).toBe('verified-saved');
  expect(verified.namingInput.origin).toBe('saved-replay');
  expect(verified.namingInput.certificateDigest).toBe(saved.certificate.digest);
  expect(()=>adapter.toNamingInput(verified as never)).toThrow();
  expect(()=>adapter.createSaved(verified as never)).toThrow();
 });

 it('rejects changed certificate, tuple, source and hash even when a saved envelope is cloned',()=>{
  const saved=adapter.createSaved(positive);
  const certificateChanged=structuredClone(saved) as any;
  certificateChanged.certificate.sources[0].sha256='0'.repeat(64);
  expect(()=>adapter.verifySaved(certificateChanged)).toThrow();
  const tupleChanged=structuredClone(saved) as any;
  tupleChanged.tuple.engineFullClosureSha256='f'.repeat(64);
  expect(()=>adapter.verifySaved(tupleChanged)).toThrow();
  const replayChanged=structuredClone(saved) as any;
  replayChanged.replay.profile.birthTime='12:00';
  expect(()=>adapter.verifySaved(replayChanged)).toThrow();
  const hashChanged=structuredClone(saved) as any;
  hashChanged.digest='0'.repeat(64);
  expect(()=>adapter.verifySaved(hashChanged)).toThrow();
 });

 it('blocks multiple roots, missing hour and competing balanced opinions',()=>{
  const multi=adapter.resolve(profileAt('m753-multi-1990','1990-12-05','08:00'),{enabled:true});
  expect(['pending','blocked']).toContain(multi.status);
  const unknown=adapter.resolve({...baseProfile,id:'m753-unknown-hour',birthTime:'',timeUnknown:true},{enabled:true});
  expect(unknown.status).toBe('pending');
  const competing=adapter.resolve(negativeProfile,{enabled:true});
  expect(['pending','blocked']).toContain(competing.status);
  expect(positive.status).toBe('applicable');
 });

 it('blocks unsupported project cong and hua branches even when the r2 preview is numerically complete',()=>{
  const cong=adapter.resolve(profileAt('m753-cong-officer','2022-01-04','11:30'),{enabled:true});
  expect(['pending','blocked']).toContain(cong.status);
  const hua=adapter.resolve(profileAt('m753-hua','2018-08-11','09:30'),{enabled:true});
  expect(['pending','blocked']).toContain(hua.status);
 });

 it('rejects missing application or r2 resources and rejects a one-byte publication tamper at startup',()=>{
  expect(()=>built.createProjectApplicationV132({assetDir:path.join(scratch,'missing','assets')})).toThrow();
  const tampered=assetRoot('tampered');
  const manifestPath=path.join(tampered,'project-naming-application','1.3.2-candidate.1','resource-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')) as {files:{path:string;kind:string}[]};
  const resource=manifest.files.find(file=>file.kind==='runtime-source')!;
  const resourcePath=path.join(tampered,'project-naming-application','1.3.2-candidate.1',...resource.path.split('/'));
  const bytes=fs.readFileSync(resourcePath);bytes[0]^=1;fs.writeFileSync(resourcePath,bytes);
  expect(()=>built.createProjectApplicationV132({assetDir:tampered})).toThrow();
 });

 it('does not alter the old profile or require old 1.3.1 fields for the new adapter',()=>{
  const before=JSON.stringify(baseProfile);
  adapter.resolve(baseProfile,{enabled:true});
  expect(JSON.stringify(baseProfile)).toBe(before);
  expect((fixture as any).methodId).toBe('project-bazi-mainchain-145/1.3.1');
  expect((fixture as any).positive.legacyElements).toEqual(['土','金','水']);
 });
});
