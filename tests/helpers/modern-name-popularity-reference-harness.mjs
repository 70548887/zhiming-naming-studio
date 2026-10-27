import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'m686-modern-reference-'));
// Every rendered function component owns a separate hook cursor and slots.
const hooks=String.raw`
let active,nextSuite=0;
export const Fragment='fragment';
export const createElement=(type,props,...children)=>({type,props:{...props,children:children.length?children.length===1?children[0]:children:props?.children}});
export const jsx=(type,props,key)=>({type,props:{...props,key}}),jsxs=jsx,jsxDEV=jsx;
const same=(left,right)=>left&&right&&left.length===right.length&&left.every((value,index)=>Object.is(value,right[index]));
const owner=()=>{if(!active)throw Error('Hook used without its function-component owner');return active;};
const changed=c=>{if(c.disposed){c.suite.writesAfterDispose++;return false;}c.suite.writes++;return true;};
export const useState=initial=>{const c=owner(),index=c.index++;if(!(index in c.slots))c.slots[index]={kind:'state',value:typeof initial==='function'?initial():initial};const slot=c.slots[index];return [slot.value,value=>{if(changed(c))slot.value=typeof value==='function'?value(slot.value):value;}];};
export const useRef=initial=>{const c=owner(),index=c.index++;return (c.slots[index]??={kind:'ref',value:{current:initial}}).value;};
export const useMemo=(factory,deps)=>{const c=owner(),index=c.index++,old=c.slots[index];if(!old||!same(old.deps,deps))c.slots[index]={kind:'memo',deps,value:factory()};return c.slots[index].value;};
export const useId=()=>{const c=owner(),index=c.index++;return (c.slots[index]??={kind:'id',value:'m686-'+c.suite.id+'-'+c.id+'-'+index}).value;};
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
globalThis.__m686ModernReferenceHooks={createSuite};
export default {createElement,Fragment};
`;

let compiled;
try{
 compiled=path.join(temporary,'modern-reference-consumer.mjs');
 await build({stdin:{contents:"export {ModernPracticalEvidenceView} from './ModernPracticalEvidenceView';import data from '../../data/official-name-popularity.json';import lock from '../../data/official-name-popularity-source-lock.json';const {fileHashes,...source}=lock.sources[0];export const catalog={...data,source};",sourcefile:'src/renderer/m686-consumer-harness.ts',resolveDir:path.join(root,'src/renderer'),loader:'ts'},outfile:compiled,bundle:true,platform:'node',format:'esm',jsx:'transform',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',loader:{'.css':'empty'},plugins:[{name:'component-owned-isolated-hooks',setup(b){b.onResolve({filter:/^react(?:\/jsx-runtime|\/jsx-dev-runtime)?$/},()=>({path:'react',namespace:'m686-isolated'}));b.onLoad({filter:/.*/,namespace:'m686-isolated'},()=>({contents:hooks,loader:'js'}));}}],logLevel:'silent'});
 const {ModernPracticalEvidenceView,catalog}=await import(pathToFileURL(compiled).href),{createSuite}=globalThis.__m686ModernReferenceHooks;
 const flush=async()=>{await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
 const all=(node,result=[])=>{if(Array.isArray(node))for(const child of node)all(child,result);else if(node?.props){result.push(node);all(node.props.children,result);}return result;};
 const text=node=>node===null||node===undefined||typeof node==='boolean'?'':Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):String(node);
 const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
 const freshCandidate=()=>freeze({id:'m686-consumer',givenName:'沐宸',fullName:'王沐宸',meaning:'沐光而行，心有远意。',evaluation:{sound:86,meaning:88,simplicity:90,traditional:84,distinctiveness:80},favorite:false,reviewNote:'已保存的审阅文字'});
 const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
 const cases=[],contexts=['detail','comparison','history'],unhandled=[];let apiRequests=0,customerWrites=0,writesAfterDispose=0;
 const onUnhandled=reason=>unhandled.push(String(reason));process.on('unhandledRejection',onUnhandled);
 const originalWindow=globalThis.window;
 function setup({context='detail',api,candidate=freshCandidate()}={}){
  const suite=createSuite(),initialCandidate=candidate;let currentCandidate=candidate,currentApi=api??{getOfficialNamePopularity:async()=>structuredClone(catalog)},tree,disposed=false;
  const bridge=next=>{
   const method=next.getOfficialNamePopularity;
   return {...next,getOfficialNamePopularity(){apiRequests++;return method.call(next);},saveSession(){customerWrites++;throw Error('Unexpected customer write');},recordModernPracticalEvidence(){customerWrites++;throw Error('Unexpected modern write');},clearModernPracticalEvidence(){customerWrites++;throw Error('Unexpected modern write');}};
  };
  currentApi=bridge(currentApi);
  const activate=()=>{globalThis.window={studio:currentApi};};
  const props=()=>({candidate:currentCandidate,readOnly:context!=='detail',compact:context!=='detail',onRecord:async()=>{customerWrites++;return true;},onClear:async()=>{customerWrites++;return true;}});
  const draw=({commit=true}={})=>{activate();tree=suite.render(ModernPracticalEvidenceView,props());if(commit)suite.commit();return tree;};
  const tick=async()=>{activate();await flush();draw();await flush();draw();};
  const nodes=()=>all(tree),results=()=>nodes().filter(node=>node.props.className==='modern-name-reference-cohort');
  const button=label=>nodes().find(node=>node.type==='button'&&text(node)===label);
  const click=label=>{activate();const found=button(label);assert(found,'Missing nested button '+label);assert(!found.props.disabled,'Nested button is disabled: '+label);found.props.onClick();draw();};
  const dispose=()=>{if(disposed)return;disposed=true;activate();suite.dispose();};
  draw();
  return {draw,tick,click,nodes,results,button,stats:suite.stats,text:()=>text(tree),tree:()=>tree,initialCandidate,
   setCandidate(next,options){currentCandidate=freeze(next);draw(options);},
   setApi(next,options){currentApi=bridge(next);draw(options);},
   commit:()=>suite.commit(),dispose,
   finish:()=>{dispose();writesAfterDispose+=suite.stats().writesAfterDispose;},
  };
 }
 async function check(name,run){const mounted=[];const make=options=>{const value=setup(options);mounted.push(value);return value;};try{await run(make);await flush();assert.equal(unhandled.length,0);cases.push({name,passed:true});}finally{for(const value of mounted)value.finish();}}
 const assertCounts=a=>{
  assert.equal(a.results().length,2);const male=a.results().find(node=>node.props['data-sex-cohort']==='male'),female=a.results().find(node=>node.props['data-sex-cohort']==='female');
  assert.equal(male.props['data-result-status'],'listed');assert.equal(male.props['data-reported-people'],22958);
  assert.equal(female.props['data-result-status'],'not-listed');assert.equal(female.props['data-reported-people'],undefined);
  assert(a.text().includes('人数未公布'));assert(!a.text().includes('0.49%'));
 };

 await check('detail comparison and history expose manual nested read-only handlers without automatic lookup',async make=>{
  for(const context of contexts){
   const beforeRequests=apiRequests,a=make({context}),before=JSON.stringify(a.initialCandidate);await a.tick();
   assert.equal(apiRequests,beforeRequests);assert.equal(a.results().length,0);assert(a.button('查看2021年给名参考'));
   assert.equal(a.tree().type,context==='detail'?'section':'details');
   if(context!=='detail')assert(!a.nodes().some(node=>node.type==='button'&&text(node).includes('生成并保存说明')));
   a.click('查看2021年给名参考');assert(a.text().includes('正在读取本地固定历史榜单'));await a.tick();assertCounts(a);
   assert.equal(apiRequests,beforeRequests+1);assert(a.text().includes('original report open license not stated'));
   assert(a.text().includes('未重新认证现代说明'));assert.equal(JSON.stringify(a.initialCandidate),before);
   assert(a.stats().owners>=4,'Nested component hooks must have independent owners');
   a.click('收起给名参考');assert.equal(a.results().length,0);assert(a.button('查看2021年给名参考'));a.dispose();
  }
 });

 await check('given name meaning and modern-record edits mask ready counts before layout effects',async make=>{
  const variants=[{givenName:'沐辰'},{meaning:'新的已保存寓意。'},{modernPracticalEvidence:{version:'modern-practical-evidence/999'}}];
  for(const change of variants){
   const a=make();a.click('查看2021年给名参考');await a.tick();assertCounts(a);
   a.setCandidate({...a.initialCandidate,...change},{commit:false});assert.equal(a.results().length,0);assert(a.button('查看2021年给名参考'));
   a.commit();await a.tick();assert.equal(a.results().length,0);a.dispose();
  }
 });

 await check('API replacement masks old counts and a changed source fails closed until a valid retry',async make=>{
  const a=make();a.click('查看2021年给名参考');await a.tick();assertCounts(a);let reads=0;
  const changed=structuredClone(catalog);changed.tables[0].rows[0].reportedPeople=1;changed.source.name='changed-source';
  a.setApi({getOfficialNamePopularity:async()=>++reads===1?changed:structuredClone(catalog)},{commit:false});
  assert.equal(a.results().length,0);a.commit();a.click('查看2021年给名参考');await a.tick();
  assert.equal(a.results().length,0);assert(a.text().includes('固定来源不一致'));
  a.click('重新读取参考');await a.tick();assertCounts(a);assert.equal(reads,2);
 });

 await check('late API success and rejection cannot overwrite the replacement API result',async make=>{
  for(const outcome of ['resolve','reject']){
   const old=deferred(),a=make({api:{getOfficialNamePopularity:()=>old.promise}});a.click('查看2021年给名参考');
   a.setApi({getOfficialNamePopularity:async()=>structuredClone(catalog)},{commit:false});assert.equal(a.results().length,0);a.commit();
   a.click('查看2021年给名参考');await a.tick();assertCounts(a);const before=a.stats().writes;
   old[outcome](outcome==='resolve'?structuredClone(catalog):new Error('Superseded request'));await a.tick();
   assertCounts(a);assert.equal(a.stats().writes,before);a.dispose();
  }
 });

 await check('close and candidate replacement invalidate an in-flight result',async make=>{
  for(const invalidation of ['close','candidate']){
   const pending=deferred(),a=make({api:{getOfficialNamePopularity:()=>pending.promise}});a.click('查看2021年给名参考');
   if(invalidation==='close')a.click('收起给名参考');else a.setCandidate({...a.initialCandidate,meaning:'较新的保存寓意。'},{commit:false});
   assert.equal(a.results().length,0);a.commit();const before=a.stats().writes;pending.resolve(structuredClone(catalog));await a.tick();
   assert.equal(a.results().length,0);assert.equal(a.stats().writes,before);assert(a.button('查看2021年给名参考'));a.dispose();
  }
 });

 await check('unmounted pending requests settle without notification writes or unhandled rejection',async make=>{
  for(const outcome of ['resolve','reject']){
   const pending=deferred(),a=make({api:{getOfficialNamePopularity:()=>pending.promise}});a.click('查看2021年给名参考');a.dispose();const before=a.stats().writes;
   pending[outcome](outcome==='resolve'?structuredClone(catalog):new Error('Unmounted request'));await flush();
   assert.equal(a.stats().writes,before);assert.equal(a.stats().writesAfterDispose,0);
  }
 });

 await flush();assert.equal(customerWrites,0);assert.equal(writesAfterDispose,0);assert.equal(unhandled.length,0);
 process.removeListener('unhandledRejection',onUnhandled);
 if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
 process.stdout.write(JSON.stringify({passed:true,cases,contexts,apiRequests,customerOrScoreWrites:false,writesAfterDispose,unhandled,scope:'Actual ModernPracticalEvidenceView to Panel event handlers with independent component hook owners; no Store, server, native DOM, or full suite.'}));
}finally{
 fs.rmSync(temporary,{recursive:true,force:true});
}
