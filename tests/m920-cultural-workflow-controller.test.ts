import {describe,it,expect,vi} from 'vitest';
import {CulturalWorkflowController,type CulturalWorkflowContext} from '../src/renderer/cultural-workflow-controller';
import type {CulturalWorkflowAPI} from '../src/shared/cultural-workflow-api';
import {CULTURAL_WORKFLOW_METHODS} from '../src/shared/cultural-workflow-api';

// Transport stubs exercise UI request scheduling only. They do not authenticate
// main-provider material, persisted capsules, SQL semantics or real services.
const context:CulturalWorkflowContext={ownerProfileId:'ui-owner',contextKey:'owner-draft-generation-1',anchorRequest:{kind:'profile',profileId:'ui-owner'},candidates:[{kind:'draft',draftId:'one',givenName:'梓涵'},{kind:'draft',draftId:'two',givenName:'沐清'}]};
const caps={version:'customer-compact/2' as const,hasRootLeafRefs:true,hasRevisionProfileId:true,hasCulturalTables:false};
const deferred=<T,>()=>{let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function transport():CulturalWorkflowAPI {
 const unused=()=>Promise.reject(Error('Unexpected UI transport call'));
 return{getCulturalStorageCapabilities:vi.fn(async()=>caps),prepareCulturalBirthAnchor:vi.fn(async()=>({kind:'unavailable' as const,reason:'source-unavailable' as const,sourceState:'source-error' as const,message:'真实传输错误状态夹具'})),getCulturalCharacterOptions:vi.fn(unused),previewCulturalComparison:vi.fn(unused),prepareCulturalWrite:vi.fn(unused),commitCulturalWrite:vi.fn(unused),readCulturalComparison:vi.fn(unused),listCulturalRevisions:vi.fn(unused),restoreCulturalRevision:vi.fn(unused),previewCulturalStorageMigration:vi.fn(unused),migrateCulturalStorage:vi.fn(unused)};
}
const allCalls=(api:CulturalWorkflowAPI)=>CULTURAL_WORKFLOW_METHODS.reduce((sum,name)=>sum+vi.mocked(api[name]).mock.calls.length,0);

describe('M920 workflow scheduling guards (stub transport only)',()=>{
 it('keeps mount and explicit enable free from reads and writes',()=>{
  const api=transport(),controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();expect(allCalls(api)).toBe(0);controller.enable();expect(controller.getSnapshot().enabled).toBe(true);expect(allCalls(api)).toBe(0);cleanup();
 });
 it('is reactivatable after StrictMode effect setup-cleanup-setup',async()=>{
  const api=transport(),controller=new CulturalWorkflowController(api,context);controller.mount()();const cleanup=controller.mount();controller.enable();await controller.prepare();expect(api.getCulturalStorageCapabilities).toHaveBeenCalledTimes(1);expect(controller.getSnapshot().error).toContain('真实传输错误');cleanup();
 });
 it('cancels waiting before a late reply can prepare a birth anchor',async()=>{
  const api=transport(),wait=deferred<typeof caps>();api.getCulturalStorageCapabilities=vi.fn(()=>wait.promise);const controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();const running=controller.prepare();controller.cancel();wait.resolve(caps);await running;expect(api.prepareCulturalBirthAnchor).not.toHaveBeenCalled();expect(controller.getSnapshot().busy).toBeNull();expect(controller.getSnapshot().anchor).toBeUndefined();cleanup();
 });
 it('drops old errors after cancel and a newer request succeeds in reaching its own failure',async()=>{
  const api=transport(),old=deferred<typeof caps>();api.getCulturalStorageCapabilities=vi.fn().mockImplementationOnce(()=>old.promise).mockResolvedValue(caps);const controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();const first=controller.prepare();controller.cancel();await controller.prepare();expect(controller.getSnapshot().error).toBe('真实传输错误状态夹具');old.reject(Error('旧请求错误不得覆盖'));await first;expect(controller.getSnapshot().error).toBe('真实传输错误状态夹具');cleanup();
 });
 it('drops delivery after unmount without calling any subsequent API',async()=>{
  const api=transport(),wait=deferred<typeof caps>();api.getCulturalStorageCapabilities=vi.fn(()=>wait.promise);const controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();const running=controller.prepare();cleanup();wait.resolve(caps);await running;expect(controller.getSnapshot().enabled).toBe(false);expect(api.prepareCulturalBirthAnchor).not.toHaveBeenCalled();
 });
 it('does not mix old and replacement methods on the same API object',async()=>{
  const api=transport(),wait=deferred<typeof caps>();api.getCulturalStorageCapabilities=vi.fn(()=>wait.promise);const controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();const running=controller.prepare();const replacement=vi.fn(async()=>({kind:'unavailable' as const,reason:'closed' as const,sourceState:null,message:'new resource'}));api.prepareCulturalBirthAnchor=replacement;wait.resolve(caps);await running;expect(replacement).not.toHaveBeenCalled();expect(controller.getSnapshot().error).toContain('API 连接已变化');expect(controller.getSnapshot().busy).toBeNull();cleanup();
 });
 it('does not invoke missing API functions or accept a prototype-only bridge',async()=>{
  const inherited=Object.create(transport()) as CulturalWorkflowAPI;for(const api of [undefined,inherited]){const controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();await controller.prepare();expect(controller.getSnapshot().error).toContain('尚未接入');cleanup();}
 });
 it.each([1,5])('rejects %i candidates before reading storage or preparing charts',async count=>{
  const api=transport(),controller=new CulturalWorkflowController(api,{...context,candidates:Array.from({length:count},(_,i)=>({kind:'draft',draftId:String(i),givenName:'梓涵'}))}),cleanup=controller.mount();controller.enable();await controller.prepare();expect(allCalls(api)).toBe(0);expect(controller.getSnapshot().error).toContain('2 至 4');cleanup();
 });
 it('does not migrate before an explicit preview and confirmation',async()=>{
  const api=transport(),controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();await controller.migrate();expect(api.migrateCulturalStorage).not.toHaveBeenCalled();expect(controller.getSnapshot().error).toContain('预览');cleanup();
 });
 it('retains user notes without attaching them to comparison requests',()=>{
  const api=transport(),controller=new CulturalWorkflowController(api,context),cleanup=controller.mount();controller.enable();controller.setNote('<script>人工备注</script>');expect(controller.getSnapshot().note).toBe('<script>人工备注</script>');expect(allCalls(api)).toBe(0);cleanup();
 });
});
