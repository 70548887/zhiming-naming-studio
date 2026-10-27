import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildRootFeedbackV132R2,verifyRootFeedbackV132R2BuildSources} from '../scripts/build-root-feedback-v132-r2.mjs';
import {createBaziRootFeedbackFacade,verifyFixedRootFeedbackBaseFacts} from '../src/main/bazi-root-feedback-facade';
import {loadRootFeedbackResources} from '../src/main/bazi-root-feedback-resources';
import {createRootFeedbackV132Engine} from '../src/main/bazi-root-feedback-v132-r2-engine';
import pins from '../src/main/bazi-root-feedback-v132-r2-pins.json';
import fixture from './fixtures/project-naming-use-m153.json';
import type {BirthProfile} from '../src/shared/types';

type Built=typeof import('../src/main/bazi-root-feedback-v132-r2-bundle');
const root=path.resolve('.'),profile=structuredClone(fixture.positive.profile) as BirthProfile;
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'m742-full-closure-r2-')),deployed=path.join(scratch,'portable'),require=createRequire(import.meta.url),assets=path.join(deployed,'assets');
let built:Built,receipt:Awaited<ReturnType<typeof buildRootFeedbackV132R2>>;
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function copyPublication(label:string){const folder=path.join(scratch,label);fs.cpSync(path.join(root,'assets/bazi-root-feedback/1.3.2-r2'),path.join(folder,'bazi-root-feedback/1.3.2-r2'),{recursive:true});return folder;}
function sourceSnapshot(label:string){
 const folder=path.join(scratch,label);
 for(const source of pins.closure.files){const target=path.join(folder,source.sourcePath);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,source.sourcePath),target);}
 const target=path.join(folder,'src/main/bazi-root-feedback-v132-r2-pins.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,'src/main/bazi-root-feedback-v132-r2-pins.json'),target);
 fs.cpSync(path.join(root,'assets/bazi-root-feedback/1.3.2-r2'),path.join(folder,'assets/bazi-root-feedback/1.3.2-r2'),{recursive:true});return folder;
}
beforeAll(async()=>{
 fs.mkdirSync(deployed,{recursive:true});receipt=await buildRootFeedbackV132R2({root,outfile:path.join(deployed,'root-feedback.cjs')});
 for(const version of ['1.3.1','1.3.2-r2'])fs.cpSync(path.join(root,'assets/bazi-root-feedback',version),path.join(assets,'bazi-root-feedback',version),{recursive:true});
 built=require(path.join(deployed,'root-feedback.cjs')) as Built;
},30000);
afterAll(()=>fs.rmSync(scratch,{recursive:true,force:true}));

describe('M742 r2 complete facade execution identity',()=>{
 it('runs without checkout sources and binds every compiled owned/data/vendor input into the public full closure',()=>{
  const child=spawnSync(process.execPath,['-e',`const fs=require('node:fs'),api=require('./root-feedback.cjs');if(fs.existsSync('src')||fs.existsSync('node_modules'))throw Error('development inputs present');const result=api.createVersionedBaziRootFeedbackFacade({assetDir:require('node:path').resolve('assets')},{methodId:'project-bazi-mainchain-145/1.3.2',purpose:'preview'}).facade.previewBaziRootFeedbackProfile(${JSON.stringify(profile)});console.log(JSON.stringify({schema:result.schema,identity:result.resourceIdentity,pillars:result.baseAnalysis.bazi.pillars.map(p=>p.gan+p.zhi),gate:result.applicationGate}));`],{cwd:deployed,encoding:'utf8'});
  expect(child.status,child.stderr).toBe(0);const result=JSON.parse(child.stdout);
  expect(result.schema).toBe('bazi-root-feedback-facade/1.3.2-r2');expect(result.pillars[2]).toBe('丁酉');expect(result.identity.fullClosureSha256).toBe(pins.fullClosureSha256);expect(result.identity.manifestSha256).toBe(pins.manifestSha256);expect(result.identity.publicationId).toBe(pins.publicationId);expect(result.identity.runtimeEnvironment.node).toBe(process.versions.node);
  expect(result.gate).toMatchObject({status:'blocked'});expect(result.gate).not.toHaveProperty('certificate');
  expect(receipt.compiledExecutionSources.map(file=>file.sourcePath).sort()).toEqual(pins.closure.executionInputs);
  expect(receipt.compiledExecutionSources).toHaveLength(133);expect(receipt.resolutionMetadata).toHaveLength(5);expect(receipt.virtualInputs).toHaveLength(1);expect(receipt.externalRuntimeModules).toEqual(['node:crypto','node:fs','node:path','node:util']);
  for(const file of receipt.compiledExecutionSources)expect(pins.closure.files).toContainEqual(file);
  expect(pins.closure.executionInputs).toEqual(expect.arrayContaining(['src/domain/engine.ts','src/domain/bazi-root-calendar-branches.ts','data/monthly-seasonal-table.json','node_modules/lunar-typescript/dist/index.mjs']));
 });
 it('rejects the independently reproduced engine.ts day-stem tamper with the old full-closure pins in precheck and official build',async()=>{
  const changed=sourceSnapshot('changed-birth-engine'),filename=path.join(changed,'src/domain/engine.ts'),original=fs.readFileSync(filename,'utf8');
  const tampered=original.replace('return analyzeV14(profile);',"return {...analyzeV14(profile),bazi:{...analyzeV14(profile).bazi,pillars:analyzeV14(profile).bazi.pillars.map((pillar,index)=>index===2?{...pillar,gan:'己'}:pillar)}};");
  expect(tampered).not.toBe(original);fs.writeFileSync(filename,tampered);
  expect(()=>verifyRootFeedbackV132R2BuildSources(changed)).toThrow('actual facade dependency differs from the fixed publication: src/domain/engine.ts');
  const output=path.join(changed,'must-not-publish.cjs');await expect(buildRootFeedbackV132R2({root:changed,outfile:output})).rejects.toThrow('src/domain/engine.ts');expect(fs.existsSync(output)).toBe(false);
 });
 it.each(['src/domain/bazi-root-calendar-branches.ts','data/monthly-seasonal-table.json','node_modules/lunar-typescript/dist/index.mjs'])('rejects a changed actual compiler dependency: %s',source=>{
  const changed=sourceSnapshot('changed-'+source.replaceAll('/','-'));fs.appendFileSync(path.join(changed,source),'\n ');
  expect(()=>verifyRootFeedbackV132R2BuildSources(changed)).toThrow('actual facade dependency differs from the fixed publication: '+source);
 });
 it.each(['package.json','tsconfig.json','node_modules/lunar-typescript/package.json'])('rejects changed resolution metadata before compiler resolution: %s',source=>{
  const changed=sourceSnapshot('changed-metadata-'+source.replaceAll('/','-')),filename=path.join(changed,source),value=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(source==='tsconfig.json')value.compilerOptions.target='ES2020';else if(source.startsWith('node_modules'))value.sideEffects=!value.sideEffects;else value.type='commonjs';
  fs.writeFileSync(filename,JSON.stringify(value));expect(()=>verifyRootFeedbackV132R2BuildSources(changed)).toThrow('actual facade dependency differs from the fixed publication: '+source);
 });
 it('rejects missing packages, r1 package substitution, changed published engine source and forged/cross-engine handles',()=>{
  const engine=built.createRootFeedbackV132Engine();expect(()=>createRootFeedbackV132Engine()).toThrow('BUILD_UNVERIFIED');expect(()=>built.loadRootFeedbackV132Resources({assetDir:path.join(scratch,'absent')},engine)).toThrow('missing fixed resource');
  const wrong=copyPublication('changed-published-engine');fs.appendFileSync(path.join(wrong,'bazi-root-feedback/1.3.2-r2/execution-source/src/domain/engine.ts'),'\n ');expect(()=>built.loadRootFeedbackV132Resources({assetDir:wrong},engine)).toThrow('resource bytes differ');
  const substituted=path.join(scratch,'r1-substitution');fs.cpSync(path.join(root,'assets/bazi-root-feedback/1.3.2'),path.join(substituted,'bazi-root-feedback/1.3.2-r2'),{recursive:true});expect(()=>built.loadRootFeedbackV132Resources({assetDir:substituted},engine)).toThrow('manifest bytes differ');
  expect(()=>built.loadRootFeedbackV132Resources({assetDir:assets},structuredClone(engine.identity) as never)).toThrow('ENGINE_INVALID');
  const resources=built.loadRootFeedbackV132Resources({assetDir:assets},engine);expect(()=>built.createBaziRootFeedbackV132Facade(built.createRootFeedbackV132Engine(),resources)).toThrow('RESOURCES_UNAVAILABLE');expect(()=>built.createBaziRootFeedbackV132Facade(engine,structuredClone(resources))).toThrow('RESOURCES_UNAVAILABLE');
 });
 it.each(['src/main/package.json','src/domain/package.json','node_modules/lunar-typescript/dist/package.json','src/shared/jsconfig.json'])('rejects newly introduced resolver metadata: %s',source=>{
  const changed=sourceSnapshot('injected-metadata-'+source.replaceAll('/','-')),filename=path.join(changed,source);fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,JSON.stringify({type:'commonjs',sideEffects:false}));
  expect(()=>verifyRootFeedbackV132R2BuildSources(changed)).toThrow('unexpected resolver metadata: '+source);
 });
 it('keeps legacy fixed preview/certificate bytes and M739 failed-kernel relationship evidence',()=>{
  const selected=built.createVersionedBaziRootFeedbackFacade({assetDir:assets},{methodId:'project-bazi-mainchain-145/1.3.1',purpose:'saved-replay'});if(selected.methodId!=='project-bazi-mainchain-145/1.3.1')throw Error('wrong fixed selection');const legacy=selected.facade.previewBaziRootFeedbackProfile(profile);
  expect(digest(legacy)).toBe('2d4d97646b5edc5c791de99a493e337ef9d96437937ce76bcf4312701d60f9d2');expect(legacy.applicationGate.status).toBe('applicable');if(legacy.applicationGate.status!=='applicable')throw Error('fixed positive certificate missing');
  expect(digest(legacy.applicationGate.certificate)).toBe('0f5bcb5f8c159d234fa85fc7ed416fb83eb7e86e693b1d5e269b313b00ef01ae');
  expect(selected.facade.verifyApplicationCertificate(legacy.applicationGate.certificate,built.verifyFixedRootFeedbackBaseFacts(profile,legacy.baseAnalysis))).toEqual(legacy.applicationGate.certificate);
  const fixed=createBaziRootFeedbackFacade(loadRootFeedbackResources({assetDir:path.join(root,'assets')}));expect(fixed.verifyApplicationCertificate(legacy.applicationGate.certificate,verifyFixedRootFeedbackBaseFacts(profile,legacy.baseAnalysis))).toEqual(legacy.applicationGate.certificate);
  const engine=built.createRootFeedbackV132Engine(),dto=engine.project(engine.analyze({id:'m742-r2-built-failure',provenance:'artificial-four-pillars-not-a-calendar-claim',pillars:{year:{gan:'癸',zhi:'卯'},month:{gan:'乙',zhi:'丑'},day:{gan:'庚',zhi:'午'},hour:{gan:'丙',zhi:'子'}}},{},['missing-edge']));
  expect(dto.possibleIds).toHaveLength(16);expect(dto.consistentIds).toHaveLength(0);expect(dto.explanationChain.steps.find(step=>step.id==='relations-and-transformations')?.projectStatus).toBe('pending');expect(dto.preparation.relations.map(item=>item.kind+':'+item.status)).toEqual(expect.arrayContaining(['clash:applied','liuhe:observed','stem-combination:binding-only']));
  expect(()=>built.createVersionedBaziRootFeedbackFacade({assetDir:assets},{methodId:'project-bazi-mainchain-145/1.3.2',purpose:'saved-replay'})).toThrow('VERSION_UNSUPPORTED');
 });
});
