import{describe,expect,it,vi}from'vitest';
import{readFileSync}from'node:fs';
import{resolve}from'node:path';
import{createReviewedDataUiController,emptyReviewedSelection,type ReviewedResultLease}from'../src/renderer/reviewed-naming-data-state';
import{createReviewedDirtyGuard}from'../src/renderer/reviewed-naming-data-app';
import type{BirthProfile,NamingPreferences}from'../src/shared/types';
import type{ReviewedNamingDataApi}from'../src/shared/reviewed-naming-data';

const profile:BirthProfile={id:'m858-app',customerName:'M858',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-10',birthTime:'09:30',timeUnknown:false,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
const preferences:NamingPreferences={length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'清雅',meanings:'平安',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false};
describe('M858 App reviewed generation boundary',()=>{
 it('keeps legacy mode on the old path and reviewed mode is opt-in',async()=>{
  const generateReviewed=vi.fn();const api={generateReviewed} as unknown as ReviewedNamingDataApi;let delivered=0;
  const controller=createReviewedDataUiController({getContext:()=>({profile,preferences,revision:1}),getApi:()=>api,isDisabled:()=>false,onGenerated:()=>{delivered++;}});controller.activate();
  expect(await controller.generate()).toBe('legacy-path');expect(generateReviewed).not.toHaveBeenCalled();
  controller.setMode('reviewed');expect(controller.getSelection()).toEqual(emptyReviewedSelection());
  expect(await controller.generate()).toBe('failed');expect(generateReviewed).toHaveBeenCalledTimes(1);expect(delivered).toBe(0);
  controller.dispose();
 });
 it('blocks duplicate reviewed clicks while the first physical request owns its lease',async()=>{
  let release:(value:unknown)=>void=()=>{};const generateReviewed=vi.fn(()=>new Promise(resolve=>{release=resolve;}));const api={generateReviewed} as unknown as ReviewedNamingDataApi;const controller=createReviewedDataUiController({getContext:()=>({profile,preferences,revision:1}),getApi:()=>api,isDisabled:()=>false,onGenerated:()=>{}});controller.activate();controller.setMode('reviewed');
  const first=controller.generate();await new Promise(resolve=>setImmediate(resolve));const second=await controller.generate();expect(second).toBe('blocked');expect(generateReviewed).toHaveBeenCalledTimes(1);release({session:{}});await first;controller.dispose();
 });
 it('main flow disables the legacy generate buttons in reviewed mode and mounts the real panel callback',()=>{
  const source=readFileSync(resolve('src/renderer/main.tsx'),'utf8');
  expect(source).toContain('reviewedMode||!projectGenerationAllowed');
  expect(source).toContain('<ReviewedNamingDataPanel');
  expect(readFileSync(resolve('src/renderer/reviewed-naming-data-app.ts'),'utf8')).toContain('generateReviewed');
  expect(source).toContain('ReviewedNamingDataProvenance display={reviewedFlow.display}');
 });
 it('dirty confirmation cancels without dispatch and confirms exactly once',async()=>{
  let calls=0,allow=false;const guard=createReviewedDirtyGuard(()=>true,async()=>allow);
  expect(await guard()).toBe(false);expect(calls).toBe(0);allow=true;expect(await guard()).toBe(true);calls++;
  expect(calls).toBe(1);
 });
 it('panel remount restores the parent-owned reviewed choice instead of resetting to legacy',()=>{
  const api={generateReviewed:vi.fn()} as unknown as ReviewedNamingDataApi;const reviewed={mode:'reviewed' as const,selection:emptyReviewedSelection()};const controller=createReviewedDataUiController({initialChoice:reviewed,getContext:()=>({profile,preferences,revision:1}),getApi:()=>api,isDisabled:()=>false,onGenerated:()=>{}});
  controller.activate();expect(controller.getSelection()).toEqual(reviewed.selection);controller.dispose();
 });
});
