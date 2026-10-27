import {describe,it,expect,vi}from'vitest';
import{createCmnReadingQuitObserver,type CmnQuitEvent}from'../src/main/smoke-cmn-reading-quit';
/** Lifecycle notifications here are synthetic component inputs,not native
 * button clicks or IPC acceptance evidence. The production dialog is untouched. */
const setup=(timeoutMs=100)=>{
 const events:CmnQuitEvent[]=[],requestQuit=vi.fn();let destroyed=false;
 const observer=createCmnReadingQuitObserver({requestQuit,isDestroyed:()=>destroyed,onEvent:e=>events.push(e),timeoutMs});
 return{observer,events,requestQuit,destroy:()=>{destroyed=true;observer.windowDestroyed();}};
};
describe('native quit observer request identity and actual-return ordering',()=>{
 it('does not let dependent checks execute before a matched native return',async()=>{
  const s=setup();let checked=false;
  const pending=s.observer.request('continue',()=>{}).then(r=>{checked=true;return r;});
  await Promise.resolve();expect(s.requestQuit).toHaveBeenCalledTimes(1);expect(checked).toBe(false);
  const token=s.observer.dialogOpened();await Promise.resolve();expect(checked).toBe(false);
  expect(s.observer.choiceReturned(token,0)).toBe(true);expect(checked).toBe(false);
  const receipt=await pending;expect(checked).toBe(true);expect(receipt.choice).toBe(0);
  expect(receipt.choiceReturnedAt).toBeGreaterThanOrEqual(receipt.dialogOpenedAt);expect(receipt.dialogOpenedAt).toBeGreaterThanOrEqual(receipt.requestedAt);
 });
 it('rejects continue when the actual returned button discards the window',async()=>{
  const s=setup(),pending=s.observer.request('continue',()=>{}),failed=expect(pending).rejects.toThrow('did not match');
  s.observer.choiceReturned(s.observer.dialogOpened(),1);await failed;expect(s.observer.snapshot().pending).toBeNull();
 });
 it('rejects a pending stage on actual window destruction',async()=>{
  const s=setup(),pending=s.observer.request('continue',()=>{}),failed=expect(pending).rejects.toThrow('destroyed');s.destroy();await failed;
 });
 it('rejects a missing real native return within its configured bound',async()=>{
  const s=setup(10);await expect(s.observer.request('continue',()=>{})).rejects.toThrow('timed out');expect(s.observer.snapshot().pending).toBeNull();
 });
 it('never consumes a prior timed-out event for the next request',async()=>{
  const s=setup(15),first=s.observer.request('continue',()=>{}),oldToken=s.observer.dialogOpened();await expect(first).rejects.toThrow('timed out');
  let resolved=false;const second=s.observer.request('continue',()=>{}).then(r=>{resolved=true;return r;});
  expect(s.observer.choiceReturned(oldToken,0)).toBe(false);await Promise.resolve();expect(resolved).toBe(false);
  const fresh=s.observer.dialogOpened();expect(fresh?.requestId).not.toBe(oldToken?.requestId);s.observer.choiceReturned(fresh,0);expect((await second).requestId).toBe(fresh?.requestId);
 });
 it('rejects a copied token even when its visible ID equals the active request',async()=>{
  const s=setup(),pending=s.observer.request('continue',()=>{}),token=s.observer.dialogOpened()!;
  expect(s.observer.choiceReturned({...token},0)).toBe(false);expect(s.observer.snapshot().pending).not.toBeNull();s.observer.choiceReturned(token,0);await pending;
 });
 it('requires a fresh matched discard choice for final closure',async()=>{
  const s=setup(),a=s.observer.request('continue',()=>{}),first=s.observer.dialogOpened();s.observer.choiceReturned(first,0);const continued=await a;
  const b=s.observer.request('discard',()=>{}),second=s.observer.dialogOpened();expect(second?.requestId).not.toBe(continued.requestId);expect(s.observer.choiceReturned(first,1)).toBe(false);s.observer.choiceReturned(second,1);expect((await b).kind).toBe('discard');
 });
 it('does not allow overlapping requests or replace the first one',async()=>{
  const s=setup(),first=s.observer.request('continue',()=>{});await expect(s.observer.request('discard',()=>{})).rejects.toThrow('already pending');s.observer.choiceReturned(s.observer.dialogOpened(),0);await first;
 });
 it('rejects a synchronous initiation failure without leaving a pending request',async()=>{
  const observer=createCmnReadingQuitObserver({requestQuit:()=>{throw Error('initiation failed');},isDestroyed:()=>false,onEvent:()=>{}});
  await expect(observer.request('continue',()=>{})).rejects.toThrow('initiation failed');expect(observer.snapshot().pending).toBeNull();
 });
 it('does not initiate app.quit for an already-destroyed window',async()=>{
  const s=setup();s.destroy();await expect(s.observer.request('continue',()=>{})).rejects.toThrow('destroyed');expect(s.requestQuit).not.toHaveBeenCalled();
 });
 it('rejects if the window is destroyed immediately after a continue return',async()=>{
  const s=setup(),pending=s.observer.request('continue',()=>{}),failed=expect(pending).rejects.toThrow('destroyed after continue');s.observer.choiceReturned(s.observer.dialogOpened(),0);s.destroy();await failed;
 });
 it('rejects duplicate actual dialogs for the same request',async()=>{
  const s=setup(),pending=s.observer.request('continue',()=>{}),failed=expect(pending).rejects.toThrow('duplicate dialog');s.observer.dialogOpened();s.observer.dialogOpened();await failed;
 });
 it('does not turn unbound production dialogs into an armed smoke request',()=>{
  const s=setup();expect(s.observer.dialogOpened()).toBeUndefined();expect(s.observer.choiceReturned(undefined,0)).toBe(false);expect(s.observer.snapshot().pending).toBeNull();
 });
 it('rejects an unexpected dialog value and disposed observers',async()=>{
  const s=setup(),pending=s.observer.request('continue',()=>{}),failed=expect(pending).rejects.toThrow('unexpected choice');s.observer.choiceReturned(s.observer.dialogOpened(),7);await failed;s.observer.dispose();await expect(s.observer.request('continue',()=>{})).rejects.toThrow('destroyed');
 });
 it('announces the exact request before calling real app.quit',async()=>{
  const order:string[]=[],observer=createCmnReadingQuitObserver({requestQuit:()=>order.push('app.quit'),isDestroyed:()=>false,onEvent:e=>order.push(e.phase)}),pending=observer.request('continue',a=>order.push('armed:'+a.requestId));
  expect(order).toEqual(['requested','armed:cmn-native-quit-1','app.quit']);observer.choiceReturned(observer.dialogOpened(),0);await pending;
 });
});
