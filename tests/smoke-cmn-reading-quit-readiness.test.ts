import vm from'node:vm';import{describe,it,expect}from'vitest';
import{cmnSmokeQuitDraftIsReady,type CmnSmokeQuitDraftSnapshot}from'../src/main/smoke-cmn-reading-ui';
import oldInput from'./fixtures/cmn-quit-guard-programmatic.json';
import nativeInput from'./fixtures/cmn-quit-guard-native-insert.json';
const draft=nativeInput.immediate.note.value,asSnapshot=(v:unknown)=>v as CmnSmokeQuitDraftSnapshot;
/** Byte-preserved actual product-renderer measurements,not invented Appflags.
 * Syntheticguardreadiness does not certify realOSunload or a buttonchoice. */
describe('quit preparation requires the real App guard after local dirty rendering',()=>{
 it('rejects the recorded dirty caption interval before the App effect has registered its guard',()=>{
  expect(oldInput.immediate.dirtyCaption).toBe('审阅尚未保存');expect(oldInput.immediate.saveEnabled).toBe(true);expect(oldInput.immediate.activation.hasBeenActive).toBe(true);
  expect(cmnSmokeQuitDraftIsReady(asSnapshot(oldInput.immediate),draft)).toBe(false);
  expect(cmnSmokeQuitDraftIsReady(asSnapshot(oldInput.ready.snapshot),draft)).toBe(true);
 });
 it('does not treat actual trusted native input as proof that the higher App guard is already ready',()=>{
  expect(nativeInput.inputEvents.some(e=>e.type==='input'&&e.isTrusted===true)).toBe(true);
  expect(cmnSmokeQuitDraftIsReady(asSnapshot(nativeInput.immediate),draft)).toBe(false);
  expect(cmnSmokeQuitDraftIsReady(asSnapshot(nativeInput.ready.snapshot),draft)).toBe(true);
 });
 it('rejects absent activation,disabled save,wrong note identity or a noncanceling handler',()=>{
  const good=asSnapshot(nativeInput.ready.snapshot);
  for(const changed of[
   {...good,activation:{...good.activation,hasBeenActive:false}},
   {...good,saveEnabled:false},
   {...good,note:{...good.note!,labels:['咨询备注']}},
   {...good,note:{...good.note!,value:'different draft'}},
   {...good,guardProbe:{...good.guardProbe,defaultPrevented:false,dispatchReturned:true}},
  ])expect(cmnSmokeQuitDraftIsReady(changed,draft)).toBe(false);
 });
 it('leaves the actual measurement records untouched',()=>{
  const before=JSON.stringify(nativeInput);cmnSmokeQuitDraftIsReady(asSnapshot(nativeInput.immediate),draft);cmnSmokeQuitDraftIsReady(asSnapshot(nativeInput.ready.snapshot),draft);expect(JSON.stringify(nativeInput)).toBe(before);
 });
 it('the exact predicate serialized into the renderer remains self-contained and cannot accept caption-only state',()=>{
  const inRenderer=vm.runInNewContext('('+cmnSmokeQuitDraftIsReady.toString()+')');
  expect(inRenderer(nativeInput.immediate,draft)).toBe(false);expect(inRenderer(nativeInput.ready.snapshot,draft)).toBe(true);
 });
});
