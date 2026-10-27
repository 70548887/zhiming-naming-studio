import {EventEmitter}from'node:events';
import vm from'node:vm';
import {describe,it,expect}from'vitest';
import type {BrowserWindow}from'electron';
import{refreshCmnSmokeSavedPlans}from'../src/main/smoke-cmn-reading-ui';

/** Component scheduling inputs only. Does not launch Electron,run a real
 * renderer or substitute this proof for the next diagnostic native run. */
function rendererHarness(names:string[],failure?:'load'|'destroy',guidePreference=JSON.stringify({version:1,dismissed:true})){
 const events:string[]=[],contents=new EventEmitter();let mounted=false,queries=0,guideSeen=false,catalogSeen=false;
 Object.assign(contents,{
  isDestroyed:()=>false,
  reload(){
   events.push('real-reload-method-called');
   queueMicrotask(()=>{
    if(failure==='load'){contents.emit('did-fail-load',{},-2,'component load failure','file:///fixture',true);return;}
    if(failure==='destroy'){contents.emit('destroyed');return;}
    mounted=true;events.push('did-finish-load');contents.emit('did-finish-load');
   });
  },
  async executeJavaScript(script:string){
   queries++;
   const nav={textContent:'方案与报告',click(){events.push('catalog-navigation');}},entries=names.map(name=>({textContent:name})),document={querySelectorAll(selector:string){
    if(selector==='[role=dialog]'){if(!guideSeen){guideSeen=true;events.push('query-original-guide-state');}return[];}
    if(selector!=='button')throw Error('Unexpected selector in refresh component test');if(!catalogSeen){catalogSeen=true;events.push('query-original-App-catalog');}return mounted?[nav,...entries]:[nav];
   }},localStorage={getItem(key:string){if(key!=='studio.onboarding.v1')throw Error('Unexpected onboarding preference key');return guidePreference;}};
   // Both the real R4 guide reader and the real catalog script run in VM.
   // The fixture supplies browser APIs only,not a fabricated ready result.
   return vm.runInNewContext(script,{document,localStorage,setTimeout:(fn:()=>void)=>{queueMicrotask(fn);return 0;}});
  },
 });
 return{window:{webContents:contents}as unknown as BrowserWindow,contents,events,queryCount:()=>queries};
}
const names=['普通话桌面虚构验收-长安','普通话桌面虚构验收-沈清'];
describe('real reload/bootstrap boundary for directly generated smoke plans',()=>{
 it('reloads and awaits did-finish-load before reading both original saved catalog entries',async()=>{
  const h=rendererHarness(names),result=await refreshCmnSmokeSavedPlans(h.window,names);
  expect(h.events.slice(0,4)).toEqual(['real-reload-method-called','did-finish-load','query-original-guide-state','query-original-App-catalog']);
  expect([...result.matchedCustomers]).toEqual(names);expect(result.originalAppMountBootstrap).toBe(true);expect(h.queryCount()).toBe(2);
  expect(h.contents.listenerCount('did-finish-load')).toBe(0);expect(h.contents.listenerCount('did-fail-load')).toBe(0);expect(h.contents.listenerCount('destroyed')).toBe(0);
 });
 it('rejects main-frame load failure before executing a saved-entry query',async()=>{
  const h=rendererHarness(names,'load');await expect(refreshCmnSmokeSavedPlans(h.window,names)).rejects.toThrow('component load failure');expect(h.queryCount()).toBe(0);expect(h.contents.listenerCount('did-fail-load')).toBe(0);
 });
 it('still rejects a missing second actual catalog entry instead of accepting a first-match shortcut',async()=>{
  const h=rendererHarness(names.slice(0,1));await expect(refreshCmnSmokeSavedPlans(h.window,names)).rejects.toThrow('post-reload saved entries');expect(h.queryCount()).toBe(2);
 });
 it('does not bypass the real guide readiness check when its stored preference is invalid',async()=>{
  const h=rendererHarness(names,undefined,JSON.stringify({version:1,dismissed:false}));
  await expect(refreshCmnSmokeSavedPlans(h.window,names)).rejects.toThrow('Actual first-use guide state not ready');expect(h.events).not.toContain('query-original-App-catalog');expect(h.events).not.toContain('catalog-navigation');expect(h.queryCount()).toBe(1);
 });
 it('rejects renderer destruction and duplicate expected plan labels',async()=>{
  const h=rendererHarness(names,'destroy');await expect(refreshCmnSmokeSavedPlans(h.window,names)).rejects.toThrow('destroyed');expect(h.queryCount()).toBe(0);
  const duplicate=rendererHarness(names);await expect(refreshCmnSmokeSavedPlans(duplicate.window,[names[0],names[0]])).rejects.toThrow('两个实际已存方案');expect(duplicate.events).toEqual([]);
 });
});
