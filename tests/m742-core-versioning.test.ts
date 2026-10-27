import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildRootFeedbackV132,verifyRootFeedbackV132BuildSources} from '../scripts/build-root-feedback-v132.mjs';
import {createBaziRootFeedbackFacade,verifyFixedRootFeedbackBaseFacts} from '../src/main/bazi-root-feedback-facade';
import {loadRootFeedbackResources} from '../src/main/bazi-root-feedback-resources';
import {createRootFeedbackV132Engine} from '../src/main/bazi-root-feedback-v132-engine';
import {readNamingElementMethodSelection} from '../src/shared/project-naming-use';
import pins from '../src/main/bazi-root-feedback-v132-pins.json';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';

type Built=typeof import('../src/main/bazi-root-feedback-v132-bundle');
const root=path.resolve('.'),profile=structuredClone(fixture.positive.profile) as BirthProfile;
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'m742-versioning-'));
const deployed=path.join(scratch,'portable'),require=createRequire(import.meta.url);
let built:Built,receipt:Awaited<ReturnType<typeof buildRootFeedbackV132>>;
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const assets=path.join(deployed,'assets');
function copyPublication(label:string){const folder=path.join(scratch,label);fs.cpSync(path.join(root,'assets/bazi-root-feedback/1.3.2'),path.join(folder,'bazi-root-feedback/1.3.2'),{recursive:true});return folder;}
function snapshotSourceRoot(label:string){const folder=path.join(scratch,label);for(const source of pins.executionSources){const target=path.join(folder,source.sourcePath);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,source.sourcePath),target);}fs.mkdirSync(path.join(folder,'src/main'),{recursive:true});fs.copyFileSync(path.join(root,'src/main/bazi-root-feedback-v132-pins.json'),path.join(folder,'src/main/bazi-root-feedback-v132-pins.json'));fs.cpSync(path.join(root,'assets/bazi-root-feedback/1.3.2'),path.join(folder,'assets/bazi-root-feedback/1.3.2'),{recursive:true});return folder;}
beforeAll(async()=>{
 fs.mkdirSync(deployed,{recursive:true});receipt=await buildRootFeedbackV132({root,outfile:path.join(deployed,'root-feedback.cjs')});
 for(const version of ['1.3.1','1.3.2'])fs.cpSync(path.join(root,'assets/bazi-root-feedback',version),path.join(assets,'bazi-root-feedback',version),{recursive:true});
 built=require(path.join(deployed,'root-feedback.cjs')) as Built;
},30000);
afterAll(()=>fs.rmSync(scratch,{recursive:true,force:true}));

describe('M742 independent fixed execution and publication',()=>{
 it('runs the new built engine and fixed loader from a source-free portable directory',()=>{
  const child=spawnSync(process.execPath,['-e',`const fs=require('node:fs'),api=require('./root-feedback.cjs');if(fs.existsSync('./src'))throw Error('source directory present');const result=api.createVersionedBaziRootFeedbackFacade({assetDir:require('node:path').resolve('assets')},{methodId:'project-bazi-mainchain-145/1.3.2',purpose:'preview'}).facade.previewBaziRootFeedbackProfile(${JSON.stringify(profile)});console.log(JSON.stringify({methodId:result.methodId,schema:result.branches[0].root.schema,identity:result.resourceIdentity,gate:result.applicationGate}));`],{cwd:deployed,encoding:'utf8'});
  expect(child.status,child.stderr).toBe(0);const result=JSON.parse(child.stdout);
  expect(result.methodId).toBe('project-bazi-mainchain-145/1.3.2');expect(result.schema).toBe('bazi-root-feedback-preview/1.3.2');
  expect(result.identity.manifestSha256).toBe(pins.manifestSha256);expect(result.identity.implementationSha256).toBe(pins.implementationSha256);expect(result.identity.publicationId).toBe(pins.publicationId);
  expect(result.gate).toMatchObject({status:'blocked',reasons:[{code:'version-not-admitted-for-application'}]});expect(result.gate).not.toHaveProperty('certificate');expect(result.gate).not.toHaveProperty('effectiveElements');
  expect(receipt.identity.implementationSha256).toBe(pins.implementationSha256);expect(receipt.inputs.some(input=>input.file.endsWith('project-v132/root-feedback.ts'))).toBe(true);expect(receipt.output.sha256).toMatch(/^[0-9a-f]{64}$/);
 });
 it('preserves the fixed1.3.1 result and saved certificate replay after importing the next module',()=>{
  const fixed=createBaziRootFeedbackFacade(loadRootFeedbackResources({assetDir:path.join(root,'assets')})),expected=fixed.previewBaziRootFeedbackProfile(profile);
  const selected=built.createVersionedBaziRootFeedbackFacade({assetDir:assets},{methodId:'project-bazi-mainchain-145/1.3.1',purpose:'saved-replay'});
  expect(selected.facade.previewBaziRootFeedbackProfile(profile)).toEqual(expected);
  expect(expected.methodId).toBe('project-bazi-mainchain-145/1.3.1');expect(expected.branches[0].root.schema).toBe('bazi-root-feedback-preview/1.0.0');
  expect(digest(expected)).toBe('2d4d97646b5edc5c791de99a493e337ef9d96437937ce76bcf4312701d60f9d2');
  expect(expected.applicationGate.status).toBe('applicable');
  if(expected.applicationGate.status!=='applicable')throw Error('fixed positive gate missing');
  const facts=verifyFixedRootFeedbackBaseFacts(profile,expected.baseAnalysis),saved=structuredClone(expected.applicationGate.certificate),before=digest(saved);
  expect(before).toBe('0f5bcb5f8c159d234fa85fc7ed416fb83eb7e86e693b1d5e269b313b00ef01ae');
  expect(fixed.verifyApplicationCertificate(saved,facts)).toEqual(saved);expect(digest(saved)).toBe(before);
 });
 it('rejects unverified builds, wrong engines, cloned handles and handles from another engine instance',()=>{
  expect(()=>createRootFeedbackV132Engine()).toThrow('BUILD_UNVERIFIED');
  expect(()=>built.loadRootFeedbackV132Resources({assetDir:assets},{identity:{methodId:'project-bazi-mainchain-145/1.3.1'}} as never)).toThrow('ENGINE_INVALID');
  const first=built.createRootFeedbackV132Engine(),second=built.createRootFeedbackV132Engine(),resources=built.loadRootFeedbackV132Resources({assetDir:assets},first);
  expect(()=>built.createBaziRootFeedbackV132Facade(first,structuredClone(resources))).toThrow('RESOURCES_UNAVAILABLE');
  expect(()=>built.createBaziRootFeedbackV132Facade(second,resources)).toThrow('RESOURCES_UNAVAILABLE');
  const legacy=loadRootFeedbackResources({assetDir:path.join(root,'assets')});expect(()=>built.createBaziRootFeedbackV132Facade(first,legacy as never)).toThrow('RESOURCES_UNAVAILABLE');
 });
 it('rejects missing packages, wrong manifest pins and a valid old package relabelled as next',()=>{
  const engine=built.createRootFeedbackV132Engine();
  expect(()=>built.loadRootFeedbackV132Resources({assetDir:path.join(scratch,'absent')},engine)).toThrow('missing fixed resource');
  const wrongPin=copyPublication('wrong-pin');fs.appendFileSync(path.join(wrongPin,'bazi-root-feedback/1.3.2/resource-manifest.json'),'\n');
  expect(()=>built.loadRootFeedbackV132Resources({assetDir:wrongPin},engine)).toThrow('manifest bytes differ');
  const wrongVersion=path.join(scratch,'wrong-version');fs.cpSync(path.join(root,'assets/bazi-root-feedback/1.3.1'),path.join(wrongVersion,'bazi-root-feedback/1.3.2'),{recursive:true});
  expect(()=>built.loadRootFeedbackV132Resources({assetDir:wrongVersion},engine)).toThrow('manifest bytes differ');
 });
 it('rejects a changed runtime-source resource and a changed actual execution implementation before building',()=>{
  const engine=built.createRootFeedbackV132Engine(),wrongSource=copyPublication('wrong-runtime');
  const source=pins.executionSources.find(file=>file.sourcePath.endsWith('project-v132/root-feedback.ts'))!;
  fs.appendFileSync(path.join(wrongSource,'bazi-root-feedback/1.3.2',source.resourcePath),'\n// changed runtime source\n');
  expect(()=>built.loadRootFeedbackV132Resources({assetDir:wrongSource},engine)).toThrow('resource bytes differ');
  const changed=snapshotSourceRoot('wrong-implementation');fs.appendFileSync(path.join(changed,source.sourcePath),'\n// changed executed implementation\n');
  expect(()=>verifyRootFeedbackV132BuildSources(changed)).toThrow('executed source differs');
  const changedPins=snapshotSourceRoot('wrong-source-pin'),file=path.join(changedPins,'src/main/bazi-root-feedback-v132-pins.json'),value=JSON.parse(fs.readFileSync(file,'utf8'));value.executionSources[0].sha256='0'.repeat(64);fs.writeFileSync(file,JSON.stringify(value));
  expect(()=>verifyRootFeedbackV132BuildSources(changedPins)).toThrow('implementation map differs');
 });
 it('rejects unknown selection and unadmitted new saved replay without fallback',()=>{
  expect(()=>built.createVersionedBaziRootFeedbackFacade({assetDir:assets},{methodId:'project-bazi-mainchain-145/1.3.2',purpose:'saved-replay'})).toThrow('VERSION_UNSUPPORTED');
  expect(()=>built.createVersionedBaziRootFeedbackFacade({assetDir:assets},{methodId:'project-bazi-mainchain-145/latest',purpose:'preview'} as never)).toThrow('VERSION_UNSUPPORTED');
  const next=built.createVersionedBaziRootFeedbackFacade({assetDir:assets},{methodId:'project-bazi-mainchain-145/1.3.2',purpose:'preview'});expect(()=>next.facade.verifyApplicationCertificate({} as never,{} as never)).toThrow('SAVED_REPLAY_UNSUPPORTED');
  expect(()=>readNamingElementMethodSelection({namingElementMethod:{methodId:'project-bazi-mainchain-145/1.3.2',entryPolicy:'month-branch-only'}})).toThrow();
 });
 it('carries M739 preparation evidence in the actual built engine when the fixed kernel fails',()=>{
  const engine=built.createRootFeedbackV132Engine(),result=engine.analyze({id:'m742-built-failure',provenance:'artificial-four-pillars-not-a-calendar-claim',pillars:{year:{gan:'癸',zhi:'卯'},month:{gan:'乙',zhi:'丑'},day:{gan:'庚',zhi:'午'},hour:{gan:'丙',zhi:'子'}}},{},['missing-edge']);
  const dto=engine.project(result),step=dto.explanationChain.steps.find(item=>item.id==='relations-and-transformations');
  expect(dto.methodId).toBe('project-bazi-mainchain-145/1.3.2');expect(result.resolution).toBe('pending-regime-resolution');expect(dto.possibleIds).toHaveLength(16);expect(dto.consistentIds).toHaveLength(0);
  expect(step?.projectStatus).toBe('pending');expect(step?.sourceIds.length).toBeGreaterThan(0);expect(dto.preparation.relations.map(item=>item.kind+':'+item.status)).toEqual(expect.arrayContaining(['clash:applied','liuhe:observed','stem-combination:binding-only']));
 });
});
