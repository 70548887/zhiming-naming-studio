import {describe,it,expect,vi} from 'vitest';
import {CULTURAL_WORKFLOW_METHODS} from '../src/shared/cultural-workflow-api';
import {createCulturalRecordContinuation,type CulturalContinuationContext} from '../src/renderer/cultural-record-continuation';
import {catalogSession} from './fixtures/catalog-session';
import type {CulturalWorkflowAPI} from '../src/shared/cultural-workflow-api';
import {createCulturalAppHost,createCulturalWorkflowAppApi} from '../src/renderer/cultural-workflow-app';

const comparisonId='qc_'+'a'.repeat(64);
function setup(){
 const loaded=catalogSession('original-session','2026-10-17T16:00:00Z','original-baby');loaded.reviewToken='11111111-1111-4111-8111-111111111111';loaded.reviewRevision=3;
 let context:CulturalContinuationContext={profile:loaded.profile,preferences:loaded.preferences,session:structuredClone(loaded),savedSession:structuredClone(loaded),sessionCurrent:true,formDirty:false,reviewDirty:false,contextKey:JSON.stringify({ownerEpoch:1,draftEpoch:7,databaseEpoch:'db-one',notes:'完整原始上下文'.repeat(300)})};
 let source:Record<string,unknown>=Object.fromEntries(['readSessionDetail',...CULTURAL_WORKFLOW_METHODS].map(method=>[method,vi.fn()]));
 const reference={comparisonId,ownerProfileId:loaded.profileId,sourceSessionId:loaded.id};
 const controller=createCulturalRecordContinuation({getContext:()=>context,getSource:()=>source});
 return{loaded,reference,controller,source,getContext:()=>context,setContext:(next:CulturalContinuationContext)=>{context=next;},replaceSource:()=>{source={...source};}};
}
describe('M928 App-owned continuation intent, without cultural source/write authority',()=>{
 it('makes no API calls and does not pick a comparison on construction',()=>{const a=setup();expect(a.controller.getSnapshot()).toEqual({});for(const method of Object.values(a.source))expect(method).not.toHaveBeenCalled();});
 it('offers only after the exact loaded source is the current canonical saved session, without auto-adopting',()=>{const a=setup();const offer=a.controller.offerAfterSourceApplied(a.reference,a.loaded)!;expect(offer.status).toBe('awaiting-explicit-choice');expect(a.controller.getSnapshot().intent).toBeUndefined();expect(a.controller.panelContext(offer.offerId)).toBeUndefined();expect(Object.keys(offer).sort()).toEqual(['comparisonId','offerId','ownerProfileId','sourceSessionId','status']);});
 it('requires a separate exact explicit choice then supplies only references to a default-off Panel',()=>{const a=setup(),offer=a.controller.offerAfterSourceApplied(a.reference,a.loaded)!;expect(a.controller.choose('unrelated-offer')).toBeUndefined();const intent=a.controller.choose(offer.offerId)!;expect(intent.status).toBe('explicit-record-choice');expect(a.controller.panelContext(intent.intentId)).toEqual({ownerProfileId:a.loaded.profileId,anchorRequest:{kind:'session',sessionId:a.loaded.id,expectedReviewToken:a.loaded.reviewToken},contextKey:intent.intentId,candidates:[],comparisonId});for(const method of Object.values(a.source))expect(method).not.toHaveBeenCalled();});
 it.each(['different-owner','different-session','missing-session-token','dirty-form','dirty-review','stale-session','not-canonical','foreign-record'] as const)('rejects %s before creating an offer',mode=>{
  const a=setup(),context=a.getContext(),loaded=structuredClone(a.loaded),ref={...a.reference};
  if(mode==='different-owner')ref.ownerProfileId='foreign';if(mode==='different-session')ref.sourceSessionId='foreign';if(mode==='missing-session-token')loaded.reviewToken=undefined;if(mode==='dirty-form')context.formDirty=true;if(mode==='dirty-review')context.reviewDirty=true;if(mode==='stale-session')context.sessionCurrent=false;if(mode==='not-canonical')context.savedSession=null;if(mode==='foreign-record')ref.comparisonId='made-up-id';
  expect(a.controller.offerAfterSourceApplied(ref,loaded)).toBeUndefined();expect(a.controller.getSnapshot()).toEqual({});
 });
 it.each(['owner','input','review-token','candidate-roster','database','bridge-method','bridge-source','bridge-getter'] as const)('retires a choice on %s changes rather than reusing old record/CAS state',mode=>{
  const a=setup(),offer=a.controller.offerAfterSourceApplied(a.reference,a.loaded)!,intent=a.controller.choose(offer.offerId)!;const next=structuredClone(a.getContext()),getter=vi.fn();
  if(mode==='owner')next.profile.id='other';if(mode==='input')next.profile.notes+='new';if(mode==='review-token')next.savedSession!.reviewToken='22222222-2222-4222-8222-222222222222';if(mode==='candidate-roster')next.savedSession!.candidates.reverse();if(mode==='database')next.contextKey+='new-database';
  if(mode==='bridge-method')a.source.readCulturalComparison=vi.fn();if(mode==='bridge-source')a.replaceSource();if(mode==='bridge-getter')Object.defineProperty(a.source,'readCulturalComparison',{get:getter,configurable:true});
  a.setContext(next);expect(a.controller.panelContext(intent.intentId)).toBeUndefined();expect(a.controller.getSnapshot()).toEqual({});expect(getter).not.toHaveBeenCalled();
 });
 it('does not revive A after an A-B-A edit boundary or after explicit cancel',()=>{const a=setup(),original=structuredClone(a.getContext()),first=a.controller.offerAfterSourceApplied(a.reference,a.loaded)!;a.setContext({...original,contextKey:original.contextKey+'-B'});a.controller.refresh();a.setContext(original);expect(a.controller.choose(first.offerId)).toBeUndefined();const second=a.controller.offerAfterSourceApplied(a.reference,a.loaded)!;expect(second.offerId).not.toBe(first.offerId);a.controller.clear();expect(a.controller.choose(second.offerId)).toBeUndefined();});
 it('leaves fresh cultural record/head/history reads and nonce/CAS to the existing Panel API workflow',()=>{const a=setup(),offer=a.controller.offerAfterSourceApplied(a.reference,a.loaded)!,intent=a.controller.choose(offer.offerId)!,context=a.controller.panelContext(intent.intentId)!;expect(context.candidates).toEqual([]);expect(context).not.toHaveProperty('head');expect(context).not.toHaveProperty('expectedRevision');expect(context).not.toHaveProperty('expectedReviewToken');expect(context).not.toHaveProperty('snapshot');expect(context).not.toHaveProperty('note');expect(a.source.readCulturalComparison).not.toHaveBeenCalled();expect(a.source.listCulturalRevisions).not.toHaveBeenCalled();expect(a.source.restoreCulturalRevision).not.toHaveBeenCalled();});
 it('requires the original record revise target before preparing a continuation write',async()=>{
  const a=setup();let busy=false;
  const host=createCulturalAppHost({isBusy:()=>busy,setBusy:value=>{busy=value;}}),source=a.source as unknown as CulturalWorkflowAPI;
  source.prepareCulturalWrite=vi.fn(async()=>({ticket:'original'} as never));
  const offer=a.controller.offerAfterSourceApplied(a.reference,a.loaded)!,intent=a.controller.choose(offer.offerId)!;
  const api=createCulturalWorkflowAppApi({source,getSource:()=>source,isCurrent:()=>!!a.controller.panelContext(intent.intentId),getBlockReason:()=>'',isReadOnly:()=>false,host,getContinuationComparisonId:()=>a.controller.panelContext(intent.intentId)?.comparisonId})!;
  await expect(api.prepareCulturalWrite({target:{mode:'create'}} as never)).rejects.toThrow('先明确读回');
  await expect(api.prepareCulturalWrite({target:{mode:'revise',comparisonId:'qc_'+'b'.repeat(64)}} as never)).rejects.toThrow('先明确读回');
  expect(source.prepareCulturalWrite).not.toHaveBeenCalled();expect(busy).toBe(false);
  const exact={target:{mode:'revise',comparisonId,expectedRevision:7,expectedReviewToken:'fresh-from-api'}};
  await api.prepareCulturalWrite(exact as never);expect(source.prepareCulturalWrite).toHaveBeenCalledWith(exact);
 });
 it('never reads or restores a different record through an active continuation facade',async()=>{
  const a=setup(),host=createCulturalAppHost({isBusy:()=>false,setBusy:()=>{}}),source=a.source as unknown as CulturalWorkflowAPI;
  const api=createCulturalWorkflowAppApi({source,getSource:()=>source,isCurrent:()=>true,getBlockReason:()=>'',isReadOnly:()=>false,host,getContinuationComparisonId:()=>comparisonId})!;
  for(const method of ['readCulturalComparison','listCulturalRevisions','restoreCulturalRevision'] as const){await expect((api[method] as (...args:unknown[])=>Promise<unknown>)('qc_'+'b'.repeat(64))).rejects.toThrow('明确选择');expect(source[method]).not.toHaveBeenCalled();}
 });
});
