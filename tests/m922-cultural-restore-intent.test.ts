import {describe,it,expect,vi} from 'vitest';
import {CulturalWorkflowController,type CulturalWorkflowContext} from '../src/renderer/cultural-workflow-controller';
import type {CulturalWorkflowAPI,CulturalComparisonRead} from '../src/shared/cultural-workflow-api';
import type {CulturalRevision,CulturalSaveResult} from '../src/shared/cultural-storage-v3';
import type {CulturalComparisonSnapshot} from '../src/shared/qimen-cultural-comparison';

// Actual controller, reference-only stub transport. The snapshot body is opaque
// and intentionally unused by these scheduling tests: no renderer, comparator,
// source authentication, real Service/Store or persistence is asserted here.
const context:CulturalWorkflowContext={ownerProfileId:'m922-owner',contextKey:'m922-owner-generation',anchorRequest:{kind:'profile',profileId:'m922-owner'},candidates:[{kind:'draft',draftId:'one',givenName:'梓涵'},{kind:'draft',draftId:'two',givenName:'沐清'}],comparisonId:'qc_'+'a'.repeat(64)};
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return{promise,resolve};};
function fixture(){
 const state={head:2},id=context.comparisonId!;
 const revision=(number:number):CulturalRevision=>({comparisonId:id,revision:number,profileId:context.ownerProfileId,parentRevision:number>1?number-1:null,operation:number===1?'create':'revise',restoredFromRevision:null,capsule:{sha:'a'.repeat(64),rawBytes:1,codec:'deflate-raw/1',role:'evidence'},result:{sha:'b'.repeat(64),rawBytes:1,codec:'deflate-raw/1',role:'revision-result'},createdAt:'2026-10-26T00:00:00.000Z'});
 const head=()=>({id,profileId:context.ownerProfileId,sourceSessionId:null,currentRevision:state.head,reviewToken:'review-'+state.head,createdAt:'2026-10-26T00:00:00.000Z'});
 const read=(number=state.head):CulturalComparisonRead=>({head:head(),revision:revision(number),result:{schema:'qimen-cultural-revision/1.0.0',comparisonId:id,revision:number,profileId:context.ownerProfileId,sourceSessionId:null,capsuleDigest:'c'.repeat(64),snapshot:{} as CulturalComparisonSnapshot,note:'reference-only controller fixture',noteAuthority:'human-note-only',createdAt:'2026-10-26T00:00:00.000Z',operation:number===1?'create':'revise',restoredFromRevision:null}});
 const unexpected=async()=>{throw Error('Unexpected transport method in M922 restore test');};
 const restore=vi.fn(async(_id:string,target:number,expected:number,reviewToken:string,_nonce:string):Promise<CulturalSaveResult>=>{
  if(expected!==state.head||reviewToken!=='review-'+state.head)return{status:'conflict',reason:'revision-conflict'};
  state.head++;return{status:'committed',committed:{...revision(state.head),operation:'restore-revision',restoredFromRevision:target},currentHead:head(),requestSha:'d'.repeat(64)};
 });
 const api:CulturalWorkflowAPI={getCulturalStorageCapabilities:vi.fn(unexpected),prepareCulturalBirthAnchor:vi.fn(unexpected),getCulturalCharacterOptions:vi.fn(unexpected),previewCulturalComparison:vi.fn(unexpected),prepareCulturalWrite:vi.fn(unexpected),commitCulturalWrite:vi.fn(unexpected),readCulturalComparison:vi.fn(async(_id,number)=>read(number)),listCulturalRevisions:vi.fn(async()=>Array.from({length:state.head},(_,index)=>revision(state.head-index))),restoreCulturalRevision:restore,previewCulturalStorageMigration:vi.fn(unexpected),migrateCulturalStorage:vi.fn(unexpected)};
 const controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();
 const ready=async()=>{await controller.readSaved();await controller.viewRevision(1);controller.setRestoreConsent(true);};
 return{state,api,controller,restore,cleanup,ready};
}

describe('M922 restore intent boundaries; actual controller with stub transport',()=>{
 it.each(['refreshHead','readSaved'] as const)('retires a definite conflict only after successful explicit %s and fresh consent',async action=>{
  const f=fixture();try{
   await f.ready();f.state.head=3;await f.controller.restore();const original=f.restore.mock.calls[0];expect(original.slice(0,4)).toEqual([context.comparisonId,1,2,'review-2']);expect(f.controller.getSnapshot().uncertainWrite).toBe(false);
   await f.controller[action]();expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(3);expect(f.controller.getSnapshot().saved?.head.currentRevision).toBe(3);expect(f.controller.getSnapshot().restoreConsent).toBe(false);
   await f.controller.restore();expect(f.restore).toHaveBeenCalledTimes(1);
   f.controller.setRestoreConsent(true);await f.controller.restore();const next=f.restore.mock.calls[1];expect(next.slice(0,4)).toEqual([context.comparisonId,3,3,'review-3']);expect(next[4]).not.toBe(original[4]);expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(4);
  }finally{f.cleanup();}
 });
 it('preserves the original target/CAS/nonce for direct retry after a rejected reply',async()=>{
  const f=fixture();try{
   await f.ready();f.restore.mockRejectedValueOnce(Error('restore reply lost'));await f.controller.restore();expect(f.controller.getSnapshot().uncertainWrite).toBe(true);const original=f.restore.mock.calls[0],reads=vi.mocked(f.api.readCulturalComparison).mock.calls.length;
   await f.controller.refreshHead();await f.controller.readSaved();await f.controller.viewRevision(2);await f.controller.prepare();expect(vi.mocked(f.api.readCulturalComparison).mock.calls).toHaveLength(reads);expect(f.api.getCulturalStorageCapabilities).not.toHaveBeenCalled();expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(1);
   f.controller.setRestoreConsent(true);await f.controller.restore();expect(f.restore.mock.calls[1]).toEqual(original);expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(3);
  }finally{f.cleanup();}
 });
 it.each(['read','history'] as const)('keeps the conflicted original intent when the explicit refresh %s fails',async failure=>{
  const f=fixture();try{
   await f.ready();f.state.head=3;await f.controller.restore();const original=f.restore.mock.calls[0];
   if(failure==='read')vi.mocked(f.api.readCulturalComparison).mockRejectedValueOnce(Error('refresh read failed'));
   else vi.mocked(f.api.listCulturalRevisions).mockRejectedValueOnce(Error('refresh history failed'));
   await f.controller.refreshHead();expect(f.controller.getSnapshot().error).toContain('failed');expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(1);expect(f.controller.getSnapshot().saved?.head.currentRevision).toBe(2);
   f.controller.setRestoreConsent(true);await f.controller.restore();expect(f.restore.mock.calls[1]).toEqual(original);
   await f.controller.refreshHead();expect(f.controller.getSnapshot().restoreConsent).toBe(false);expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(3);
  }finally{f.cleanup();}
 });
 it('keeps an unsettled cancelled restore intent until transport settles, then retries the exact original refs',async()=>{
  const f=fixture(),pending=deferred<CulturalSaveResult>();let running:Promise<void>|undefined;
  try{
   await f.ready();f.restore.mockImplementationOnce(()=>pending.promise);running=f.controller.restore();const original=f.restore.mock.calls[0];f.controller.cancel();const reads=vi.mocked(f.api.readCulturalComparison).mock.calls.length;
   await f.controller.refreshHead();await f.controller.readSaved();await f.controller.viewRevision(2);await f.controller.prepare();expect(vi.mocked(f.api.readCulturalComparison).mock.calls).toHaveLength(reads);
   f.controller.setRestoreConsent(true);await f.controller.restore();expect(f.restore).toHaveBeenCalledTimes(1);expect(f.controller.getSnapshot().uncertainWrite).toBe(true);
   pending.resolve({status:'conflict',reason:'revision-conflict'});await running;expect(f.controller.getSnapshot().uncertainWrite).toBe(true);expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(1);
   f.controller.setRestoreConsent(true);await f.controller.restore();expect(f.restore.mock.calls[1]).toEqual(original);expect(f.controller.getSnapshot().viewed?.revision.revision).toBe(3);
  }finally{pending.resolve({status:'conflict',reason:'revision-conflict'});await running;f.cleanup();}
 });
});
