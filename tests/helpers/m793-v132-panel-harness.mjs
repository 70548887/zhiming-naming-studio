import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'m793-v132-panel-'));
// Hook isolation is adapted from 2b827af:tests/helpers/bazi-root-feedback-v132-panel-harness.mjs.
// This executes real Panel handlers and nested function components with separate hook owners.
// Positive display fixtures bind each explicit request through the real main helper.
// The negative capture keeps its original request binding; fixture directions are
// not actual chart results or Service/resource-authentication evidence.
const hooks=String.raw`
let active,nextSuite=0;
export const Fragment='fragment';
export const createElement=(type,props,...children)=>({type,props:{...props,children:children.length?children.length===1?children[0]:children:props?.children}});
export const jsx=(type,props,key)=>({type,props:{...props,key}}),jsxs=jsx,jsxDEV=jsx;
const same=(left,right)=>left&&right&&left.length===right.length&&left.every((value,index)=>Object.is(value,right[index]));
const owner=()=>{if(!active)throw Error('Hook used outside its function component');return active;};
const changed=c=>{if(c.disposed){c.suite.writesAfterDispose++;return false;}c.suite.writes++;return true;};
export const useState=initial=>{const c=owner(),index=c.index++;if(!(index in c.slots))c.slots[index]={kind:'state',value:typeof initial==='function'?initial():initial};const slot=c.slots[index];return [slot.value,value=>{if(changed(c))slot.value=typeof value==='function'?value(slot.value):value;}];};
export const useRef=initial=>{const c=owner(),index=c.index++;return (c.slots[index]??={kind:'ref',value:{current:initial}}).value;};
export const useMemo=(factory,deps)=>{const c=owner(),index=c.index++,old=c.slots[index];if(!old||!same(old.deps,deps))c.slots[index]={kind:'memo',deps,value:factory()};return c.slots[index].value;};
export const useCallback=(callback,deps)=>useMemo(()=>callback,deps);
export const useId=()=>{const c=owner(),index=c.index++;return (c.slots[index]??={kind:'id',value:'m793-'+c.suite.id+'-'+c.id+'-'+index}).value;};
export const useLayoutEffect=(fn,deps)=>{const c=owner(),index=c.index++,old=c.slots[index];if(!old||!same(old.deps,deps))c.slots[index]={kind:'effect',deps,cleanup:old?.cleanup,pending:fn};};
export const useEffect=useLayoutEffect;
export const useSyncExternalStore=(subscribe,getSnapshot)=>{const c=owner(),index=c.index++,old=c.slots[index];if(!old||old.subscribe!==subscribe)c.slots[index]={kind:'store',subscribe,cleanup:old?.cleanup,pending:()=>subscribe(()=>{changed(c);})};return getSnapshot();};
function cleanup(c){if(c.disposed)return;c.disposed=true;for(const slot of c.slots){slot?.cleanup?.();if(slot)slot.pending=undefined;}}
function createSuite(){
 const suite={id:++nextSuite,owners:new Map(),writes:0,writesAfterDispose:0,disposed:false,nextOwner:0};
 function expand(node,location,seen){
  if(Array.isArray(node))return node.map((child,index)=>expand(child,location+'.'+(child?.props?.key??index),seen));
  if(!node?.props)return node;
  if(typeof node.type==='function'){
   let c=suite.owners.get(location);
   if(c&&c.type!==node.type){cleanup(c);suite.owners.delete(location);c=undefined;}
   if(!c){c={suite,id:++suite.nextOwner,type:node.type,index:0,slots:[],disposed:false};suite.owners.set(location,c);}
   seen.add(location);const previous=active;active=c;c.index=0;
   let result;try{result=node.type(node.props);}finally{active=previous;}
   return expand(result,location+'.render',seen);
  }
  return {...node,props:{...node.props,children:expand(node.props.children,location+'.children',seen)}};
 }
 return {
  render(Component,props){if(suite.disposed)return null;const seen=new Set(),tree=expand(createElement(Component,props),'root',seen);for(const [location,c] of suite.owners)if(!seen.has(location)){cleanup(c);suite.owners.delete(location);}return tree;},
  commit(){if(suite.disposed)return;for(const c of suite.owners.values())for(const slot of c.slots)if(slot?.pending){const run=slot.pending;slot.pending=undefined;slot.cleanup?.();slot.cleanup=run();}},
  stats:()=>({writes:suite.writes,writesAfterDispose:suite.writesAfterDispose,owners:suite.owners.size}),
  dispose(){if(suite.disposed)return;suite.disposed=true;for(const c of suite.owners.values())cleanup(c);},
 };
}
globalThis.__m793PreviewHooks={createSuite};
export default {createElement,Fragment};
`;

const all=(node,result=[])=>{if(Array.isArray(node))for(const child of node)all(child,result);else if(node?.props){result.push(node);all(node.props.children,result);}return result;};
const text=node=>node===null||node===undefined||typeof node==='boolean'?'':Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):String(node);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const flush=async()=>{await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
const unhandled=[],cases=[];let writesAfterDispose=0,requests=0;
const onUnhandled=reason=>unhandled.push(String(reason));
process.on('unhandledRejection',onUnhandled);
try{
 const compiled=path.join(temporary,'m793-v132-panel.mjs');
 await build({stdin:{contents:"export {BaziRootFeedbackV132PreviewPanel} from './BaziRootFeedbackV132PreviewPanel';export {previewProfile,previewBoundDto} from '../../tests/fixtures/m793-v132-ui';export {bindPreviewFixtureResponse} from '../../tests/helpers/m812-bound-preview-response';",sourcefile:'src/renderer/m793-panel-harness.ts',resolveDir:path.join(root,'src/renderer'),loader:'ts'},outfile:compiled,bundle:true,platform:'node',format:'esm',jsx:'transform',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',loader:{'.css':'empty'},plugins:[{name:'component-owned-isolated-hooks',setup(b){b.onResolve({filter:/^react(?:\/jsx-runtime|\/jsx-dev-runtime)?$/},()=>({path:'react',namespace:'m793-isolated'}));b.onLoad({filter:/.*/,namespace:'m793-isolated'},()=>({contents:hooks,loader:'js'}));}}],logLevel:'silent'});
 const {BaziRootFeedbackV132PreviewPanel,previewProfile,previewBoundDto,bindPreviewFixtureResponse}=await import(pathToFileURL(compiled).href),{createSuite}=globalThis.__m793PreviewHooks;
 const capture=freeze(JSON.parse(gunzipSync(fs.readFileSync(path.join(root,'tests/fixtures/m793-fixed-facade-capture.json.gz'))).toString('utf8'))),original=capture.cases.unique;
 assert.equal(original.profile.birthDate,'2022-02-13');assert.equal(original.profile.birthTime,'11:30');assert.equal(original.options.fromOutputMonthStem,false);assert.equal(Object.hasOwn(original.dto,'requestBinding'),false);
 const originalBound=freeze(bindPreviewFixtureResponse(original.dto,original.profile,original.options)),bindingChecks=[];
 function setup({profile=previewProfile(),api,disabled=false}={}){
  const suite=createSuite();let currentProfile=freeze(structuredClone(profile)),currentApi=api,currentDisabled=disabled,tree,disposed=false;
  const draw=({commit=true}={})=>{tree=suite.render(BaziRootFeedbackV132PreviewPanel,{profile:currentProfile,api:currentApi,disabled:currentDisabled,currentModelLabel:'原命名模型 1.3.1'});if(commit)suite.commit();return tree;};
  const nodes=()=>all(tree),results=()=>nodes().filter(node=>String(node.props.className??'').split(' ').includes('v132-result'));
  const button=pattern=>nodes().find(node=>node.type==='button'&&(typeof pattern==='string'?text(node)===pattern:pattern.test(text(node))));
  const click=pattern=>{const found=button(pattern);assert(found,'Missing real Panel button '+pattern);assert(!found.props.disabled,'Disabled Panel button '+text(found));found.props.onClick();draw();};
  const tick=async()=>{await flush();draw();await flush();draw();};
  const dispose=()=>{if(disposed)return;disposed=true;suite.dispose();};
  draw();
  return {draw,tick,click,button,nodes,results,text:()=>text(tree),stats:suite.stats,
   setProfile(next,options){currentProfile=freeze(structuredClone(next));draw(options);},
   setApi(next,options){currentApi=next;draw(options);},
   setDisabled(next,options){currentDisabled=next;draw(options);},
   changeProposal(value){const checkbox=nodes().find(node=>node.type==='input'&&node.props.type==='checkbox');assert(checkbox,'Missing real proposal checkbox');assert(!checkbox.props.disabled);checkbox.props.onChange({target:{checked:value}});draw();},
   commit:()=>suite.commit(),dispose,finish:()=>{dispose();writesAfterDispose+=suite.stats().writesAfterDispose;},
  };
 }
 const recording=implementation=>({previewBaziRootFeedbackV132(profile,options){requests++;return implementation.call(this,profile,options);}});
 async function check(name,run){const mounted=[];const make=options=>{const value=setup(options);mounted.push(value);return value;};try{await run(make);await flush();assert.deepEqual(unhandled,[]);cases.push({name,passed:true});}finally{for(const value of mounted)value.finish();}}
 const assertReady=(a,label='一项一致结论')=>{assert.equal(a.results().length,1);assert(a.text().includes(label));assert(a.text().includes('尚未用于起名'));assert(a.text().includes('阻塞'));};
 const assertError=(a,context='request')=>{assert.equal(a.results().length,0,context+' must not display a ready result');assert(a.nodes().some(node=>node.props.role==='alert'),context+' must display retryable error');assert(a.text().includes('未完成'));assert(a.button('重试'));assert(!a.button('重试').props.disabled);};

 await check('default off and actual button loading; optional undefined is omitted from the request snapshot',async make=>{
  const pending=deferred(),captured=[],profile={...previewProfile('m793-default'),fatherName:undefined},api=recording(function(p,o){assert.equal(this,api);captured.push({profile:structuredClone(p),options:structuredClone(o)});return pending.promise;});
  const before=requests,a=make({profile,api});await a.tick();assert.equal(requests,before);assert.equal(a.results().length,0);assert(a.text().includes('默认不运行'));assert(a.text().includes('原命名模型 1.3.1'));
  a.click('预览当前出生资料');assert.equal(requests,before+1);assert.equal(captured.length,1);const expected={...profile};delete expected.fatherName;assert.deepEqual(captured[0],{profile:expected,options:{fromOutputMonthStem:false}});assert(a.text().includes('正在'));assert.equal(a.results().length,0);
  const running=a.button(/正在读取/);assert(running?.props.disabled);running.props.onClick();assert.equal(requests,before+1,'Repeated real handler while loading must not dispatch twice');
  pending.resolve(previewBoundDto(captured[0].profile,captured[0].options));await a.tick();assertReady(a);assert(a.stats().owners>=4,'Nested Panel components must have their own hooks');
 });

 await check('wrong profile, entry, version, gate, identity or branch response is retryable and never ready',async make=>{
  const mutations=[
   ['profileId',dto=>{dto.profileId='other-profile';}],
   ['entryPolicy',dto=>{dto.entryPolicy='month-stem-proposal';}],
   ['version',dto=>{dto.schema='bazi-root-feedback-facade/1.3.1';}],
   ['applicationGate',dto=>{dto.applicationGate.status='allowed';}],
   ['publication',dto=>{dto.resourceIdentity.publicationId='other-publication';}],
   ['kernel identity',dto=>{dto.resourceIdentity.kernel.methodId='other-kernel';}],
   ['branch schema',dto=>{dto.branches[0].root.schema='bazi-root-feedback-preview/1.3.1';}],
  ];
  for(const [name,mutate] of mutations){
   const profile=previewProfile('m793-reject-'+name),bad=previewBoundDto(profile,{fromOutputMonthStem:false});mutate(bad);let calls=0;
   const a=make({profile,api:recording(async(p,o)=>++calls===1?bad:previewBoundDto(p,o))});a.click('预览当前出生资料');await a.tick();assertError(a,name);assert(/一致|未展示/.test(a.text()));assert(!a.text().includes('项目主方向：'));
   a.click('重试');await a.tick();assert.equal(calls,2);assertReady(a);
  }
 });

 await check('same-id date and hour changes reject the original real DTO binding and retry with a fresh synthetic response',async make=>{
  for(const [field,value] of [['birthDate','2022-02-14'],['birthTime','13:30']]){
   const current={...original.profile,[field]:value},captured=[];let calls=0;
   const a=make({profile:original.profile,api:recording(async(p,o)=>{captured.push({profile:structuredClone(p),options:structuredClone(o)});return ++calls<=2?originalBound:previewBoundDto(p,o);})});
   a.click('预览当前出生资料');await a.tick();assertReady(a);
   a.setProfile(current,{commit:false});assert.equal(a.results().length,0,'Changed raw profile must mask the original ready result before effects');a.commit();
   a.click('预览当前出生资料');await a.tick();assert.equal(calls,2);assert.equal(captured[1].profile.id,original.profile.id);assert.equal(captured[1].profile[field],value);assertError(a,field+' original real DTO binding');assert(!a.text().includes('项目主方向：'));
   a.click('重试');await a.tick();assert.equal(calls,3);assertReady(a);assert.deepEqual(captured[2],captured[1]);
   bindingChecks.push({field,currentValue:value,originalValue:original.profile[field],sameProfileId:true,staleRealDtoRejected:true,retry:'Fresh explicit synthetic previewBoundDto(current profile, options); old real DTO was not rebound.'});
  }
 });

 await check('a real captured DTO without request binding is retryable and never ready',async make=>{
  const captured=[];let calls=0;
  const a=make({profile:original.profile,api:recording(async(p,o)=>{captured.push({profile:structuredClone(p),options:structuredClone(o)});return ++calls===1?original.dto:previewBoundDto(p,o);})});
  a.click('预览当前出生资料');await a.tick();assertError(a,'missing request binding');assert.equal(calls,1);assert.equal(original.dto.profileId,captured[0].profile.id);
  a.click('重试');await a.tick();assert.equal(calls,2);assertReady(a);assert.deepEqual(captured[1],captured[0]);bindingChecks.push({field:'requestBinding',missing:true,realDtoRejected:true,retry:'Fresh explicit synthetic previewBoundDto for the original actual request.'});
 });

 await check('resource and unsupported rejection have ordinary Chinese retry messages without internal errors',async make=>{
  for(const [code,copy] of [['ROOT_FEEDBACK_V132_R2_PREVIEW_UNAVAILABLE','固定资料'],['ROOT_FEEDBACK_VERSION_UNSUPPORTED','不支持']]){
   const profile=previewProfile('m793-retry-'+code);let calls=0;const a=make({profile,api:recording(async(p,o)=>{if(++calls===1)throw new Error(code+': secret/internal/path');return previewBoundDto(p,o);})});
   a.click('预览当前出生资料');await a.tick();assertError(a);assert(a.text().includes(copy));assert(!a.text().includes('secret/internal/path'));assert(!a.text().includes('ROOT_FEEDBACK'));a.click('重试');await a.tick();assert.equal(calls,2);assertReady(a);
  }
 });

 await check('profile A to B to A retires late success and rejection and masks ready data before effects',async make=>{
  for(const outcome of ['resolve','reject']){
   const original=previewProfile('m793-profile-a'),pending=deferred(),api=recording(()=>pending.promise),a=make({profile:original,api});
   a.click('预览当前出生资料');a.setProfile(previewProfile('m793-profile-b'),{commit:false});assert.equal(a.results().length,0);a.commit();a.setProfile(original,{commit:false});assert.equal(a.results().length,0);a.commit();
   const before=a.stats().writes;pending[outcome](outcome==='resolve'?previewBoundDto(original,{fromOutputMonthStem:false}):new Error('retired profile request'));await a.tick();assert.equal(a.results().length,0);assert.equal(a.stats().writes,before);
   a.setApi(recording(async(p,o)=>previewBoundDto(p,o)));a.click('预览当前出生资料');await a.tick();assertReady(a);a.setProfile(previewProfile('m793-profile-next'),{commit:false});assert.equal(a.results().length,0);assert(/失效|改变|重新预览/.test(a.text()));a.commit();
  }
 });

 await check('API object and same-object method replacement, including callable A to B to A, reject stale settlement',async make=>{
  for(const replacement of ['object','method']){
   const profile=previewProfile('m793-api-'+replacement),old=deferred(),first=recording(()=>old.promise),a=make({profile,api:first});a.click('预览当前出生资料');
   const next=recording(async(p,o)=>previewBoundDto(p,o));if(replacement==='method')first.previewBaziRootFeedbackV132=next.previewBaziRootFeedbackV132;
   a.setApi(replacement==='method'?first:next,{commit:false});assert.equal(a.results().length,0);a.commit();a.click('预览当前出生资料');await a.tick();assertReady(a);
   const before=a.stats().writes;old.resolve(previewBoundDto(profile,{fromOutputMonthStem:false},'no-consistent-regime'));await a.tick();assertReady(a);assert.equal(a.stats().writes,before);
   const later=recording(async(p,o)=>previewBoundDto(p,o,'no-consistent-regime'));if(replacement==='method')first.previewBaziRootFeedbackV132=later.previewBaziRootFeedbackV132;a.setApi(replacement==='method'?first:later,{commit:false});assert.equal(a.results().length,0);a.commit();
  }
  const profile=previewProfile('m793-method-aba'),pending=deferred(),api=recording(()=>pending.promise),firstMethod=api.previewBaziRootFeedbackV132,a=make({profile,api});a.click('预览当前出生资料');
  api.previewBaziRootFeedbackV132=recording(async(p,o)=>previewBoundDto(p,o,'no-consistent-regime')).previewBaziRootFeedbackV132;a.setApi(api);api.previewBaziRootFeedbackV132=firstMethod;a.setApi(api);
  const before=a.stats().writes;pending.resolve(previewBoundDto(profile,{fromOutputMonthStem:false}));await a.tick();assert.equal(a.results().length,0);assert.equal(a.stats().writes,before);a.click('预览当前出生资料');await a.tick();assertReady(a);
 });

 await check('unknown-hour pending and the explicit month-stem proposal remain valid positive responses',async make=>{
  const profile=previewProfile('m793-unknown',true),a=make({profile,api:recording(async(p,o)=>previewBoundDto(p,o,'pending-regime-resolution'))});a.click('预览当前出生资料');await a.tick();assertReady(a,'结果待定');assert(a.text().includes('出生时刻未知'));assert(a.text().includes('可能时段分支'));
  const known=previewProfile('m793-proposal'),captured=[],b=make({profile:known,api:recording(async(p,o)=>{captured.push(structuredClone(o));return previewBoundDto(p,o);})});
  b.click('预览当前出生资料');await b.tick();assertReady(b);b.changeProposal(true);assert.equal(b.results().length,0);b.click('预览当前出生资料');await b.tick();assertReady(b);assert.deepEqual(captured,[{fromOutputMonthStem:false},{fromOutputMonthStem:true}]);
 });

 await check('multiple consistent conclusions retain both explicit synthetic regimes',async make=>{
  const profile=previewProfile('m812-multiple'),a=make({profile,api:recording(async(p,o)=>previewBoundDto(p,o,'multiple-consistent-regimes'))});a.click('预览当前出生资料');await a.tick();assertReady(a,'多项一致结论');assert(a.text().includes('未合并为唯一结果'));assert.deepEqual(a.nodes().filter(node=>node.props['data-regime-id']).map(node=>node.props['data-regime-id']),['regime-a','regime-b']);
 });

 await check('disabled controls and a captured handler cannot dispatch; disable also retires an outstanding result',async make=>{
  const profile=previewProfile('m793-disabled'),pending=deferred(),api=recording(()=>pending.promise),before=requests,a=make({profile,api,disabled:true}),blocked=a.button('预览当前出生资料');assert(blocked.props.disabled);blocked.props.onClick();await a.tick();assert.equal(requests,before);assert.equal(a.results().length,0);
  a.setDisabled(false);const staleHandler=a.button('预览当前出生资料').props.onClick;a.setDisabled(true);staleHandler();await a.tick();assert.equal(requests,before);a.setDisabled(false);a.click('预览当前出生资料');assert.equal(requests,before+1);a.setDisabled(true,{commit:false});assert.equal(a.results().length,0);a.commit();const writes=a.stats().writes;
  pending.resolve(previewBoundDto(profile,{fromOutputMonthStem:false}));await a.tick();assert.equal(a.results().length,0);assert.equal(a.stats().writes,writes);a.setDisabled(false);a.click('预览当前出生资料');await a.tick();assertReady(a);
 });

 await check('unmounted success and rejection produce no notification writes or unhandled rejection',async make=>{
  for(const outcome of ['resolve','reject']){
   const profile=previewProfile('m793-unmount'),pending=deferred(),a=make({profile,api:recording(()=>pending.promise)});a.click('预览当前出生资料');a.dispose();const before=a.stats().writes;
   pending[outcome](outcome==='resolve'?previewBoundDto(profile,{fromOutputMonthStem:false}):new Error('unmounted failure'));await flush();assert.equal(a.stats().writes,before);assert.equal(a.stats().writesAfterDispose,0);
  }
 });

 await flush();assert.equal(writesAfterDispose,0);assert.deepEqual(unhandled,[]);
 process.stdout.write(JSON.stringify({passed:true,cases,requests,writesAfterDispose,unhandled,bindingChecks,provenance:{hooks:'2b827af:tests/helpers/bazi-root-feedback-v132-panel-harness.mjs',fixtures:'tests/fixtures/m793-v132-ui.ts; synthetic typed display fixture, not an actual chart result',requestBinding:'Real main readRootFeedbackV132BoundPreviewRequest/bindRootFeedbackV132PreviewResponse through tests/helpers/m812-bound-preview-response.ts; metadata correlation only.',negativeCapture:'tests/fixtures/m793-fixed-facade-capture.json.gz#cases.unique; actual fixed-facade DTO bound ONLY to its original 2022-02-13 11:30 profile/options; no recomputation or authentication claimed.'},scope:'Real Panel handlers with component-owned isolated React hooks and fixture API; no Service, real browser, database, scoring, sorting, generation authorization or full suite.'}));
}finally{
 process.removeListener('unhandledRejection',onUnhandled);
 delete globalThis.__m793PreviewHooks;
 fs.rmSync(temporary,{recursive:true,force:true});
}
