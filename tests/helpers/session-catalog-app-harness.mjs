import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'m733-app-'));
const original=fs.readFileSync('src/renderer/main.tsx','utf8');
const source=original.replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\([\s\S]*$/,'export {App};');
assert.notEqual(source,original);
const icons=new Set();
for(const file of fs.readdirSync('src/renderer').filter(f=>f.endsWith('.tsx')))for(const match of fs.readFileSync(path.join('src/renderer',file),'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g))for(const icon of match[1].split(','))icons.add(icon.trim());
const hooks=`let active;
export const StrictMode='strict',Fragment='fragment';
export const createElement=(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}});
export const useState=init=>{const c=active,i=c.index++;if(!(i in c.slots))c.slots[i]=typeof init==='function'?init():init;return[c.slots[i],v=>{if(c.disposed){c.lateWrites++;return;}c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
export const useRef=value=>{const c=active,i=c.index++;return c.slots[i]??(c.slots[i]={current:value});};
export const useMemo=(fn,deps)=>{const c=active,i=c.index++,old=c.slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))c.slots[i]={deps,value:fn()};return c.slots[i].value;};
export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
export const useSyncExternalStore=(_s,get)=>{active.index++;return get();};
export const useId=()=>('catalog-id-'+active.index++);
export const useEffect=(fn,deps)=>{const c=active,i=c.index++,old=c.slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j]))){c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});}};
export const useLayoutEffect=useEffect;export const createContext=value=>({value});
globalThis.__catalogAppHooks={create:()=>({slots:[],index:0,effects:[],disposed:false,lateWrites:0}),render:(c,fn)=>{active=c;c.index=0;const tree=fn();for(const effect of c.effects.splice(0))effect();return tree;},dispose:c=>{c.disposed=true;for(const slot of c.slots)slot?.cleanup?.();}};
export default {createElement,StrictMode,Fragment};`;
const output=path.join(temporary,'app.mjs');
await build({stdin:{contents:source+"\nexport {catalogSession} from '../../tests/fixtures/catalog-session';",sourcefile:'src/renderer/main.tsx',resolveDir:path.join(root,'src/renderer'),loader:'tsx'},bundle:true,format:'esm',platform:'node',outfile:output,jsx:'transform',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',loader:{'.css':'empty'},plugins:[{name:'catalog-App-hooks',setup(b){b.onResolve({filter:/^(react|react-dom(?:\/client)?|lucide-react)$/},a=>({path:a.path,namespace:'m733'}));b.onLoad({filter:/.*/,namespace:'m733'},a=>({contents:a.path==='react'?hooks:a.path==='lucide-react'?[...icons].map(icon=>`export const ${icon}='icon-${icon}';`).join('\n'):a.path==='react-dom/client'?'export const createRoot=()=>({render(){}});':'export const createPortal=x=>x;',loader:'js'}));}}],logLevel:'silent'});
const {App,catalogSession}=await import(pathToFileURL(output).href),clone=structuredClone;
const all=(node,result=[])=>{if(Array.isArray(node))for(const child of node)all(child,result);else if(node?.props){result.push(node);all(node.props.children,result);all(node.props.action,result);}return result;};
const text=node=>node===null||node===undefined||typeof node==='boolean'?'':Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):String(node);
const flush=async()=>{await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const summary=s=>({id:s.id,profileId:s.profileId,createdAt:s.createdAt,reviewNote:s.reviewNote,dataVersion:s.dataVersion,profile:{id:s.profile.id,customerName:s.profile.customerName,surname:s.profile.surname},candidateCount:s.candidates.length,favoriteCount:0,candidateFactsVerified:false});
const settings={studioName:'分页测试工作室',contact:'原联系',logoDataUrl:'',apiBaseUrl:'',model:'',timeoutMs:45000,hasApiKey:false,useAi:false};
globalThis.document={getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}};
globalThis.requestAnimationFrame=fn=>fn();globalThis.confirm=()=>true;
const cases=[],unhandled=[];process.on('unhandledRejection',error=>unhandled.push(String(error)));

async function setup({migrationRequired=false}={}){
  const a=catalogSession('saved-A'),b=catalogSession('saved-B');a.reviewNote='原先保存的非空意见';a.candidates=[];b.candidates=[];b.profile.customerName='乙家长';
  const profiles=[clone(a.profile)];delete profiles[0].namingPreferences;
  const firstPage={items:[summary(a)],nextCursor:'opaque-next',total:63,matched:63,customers:[{id:a.profileId,label:'王家长'}],profileCounts:{[a.profileId]:63}};
  let storage={version:'fixture',migrationRequired,bytes:900,maxPhysicalBytes:1000,warning:true},bootCalls=0,saveCalls=0,exported;
  const reads=[],lists=[],historyReads=[];let saveFailure=false;
  const api={
    bootstrap:async()=>{bootCalls++;return {profiles:clone(profiles),sessions:[],sessionCatalog:clone(firstPage),storageState:clone(storage),settings:clone(settings),sources:[],stats:{characters:779,citations:10,knowledge:20,dataVersion:'fixture'}};},
    listSessionCatalog:input=>{const p=deferred();lists.push({...p,input:clone(input)});return p.promise;},
    readSessionDetail:id=>{const p=deferred();reads.push({...p,id});return p.promise;},
    listHistory:id=>{const p=deferred();historyReads.push({...p,id});return p.promise;},
    saveSession:async s=>{saveCalls++;if(saveFailure)throw Error('方案已被其他窗口更新');return {...clone(s),reviewRevision:(s.reviewRevision??0)+1};},
    exportReport:async s=>{exported=clone(s);return '/fixture/report.pdf';},
    saveBrand:async s=>({...settings,...s}),
    migrateCustomerStorage:async()=>{storage={...storage,migrationRequired:false};return clone(storage);},
  };
  globalThis.window={studio:api,addEventListener(){},removeEventListener(){},confirm:()=>true};
  const hooks=globalThis.__catalogAppHooks,app=hooks.create();let tree=hooks.render(app,App);
  const draw=()=>{globalThis.window.studio=api;tree=hooks.render(app,App);};
  const tick=async()=>{await flush();draw();await flush();draw();};
  const nodes=()=>all(tree),find=predicate=>{const node=nodes().find(predicate);assert(node,'Expected App node');return node;};
  const component=name=>find(n=>typeof n.type==='function'&&n.type.name===name).props;
  const click=label=>find(n=>n.type==='button'&&text(n)===label).props.onClick();
  const field=label=>all(find(n=>n.props.label===label)).find(n=>n.type==='input'||n.type==='textarea'||n.type==='select');
  const edit=(label,value)=>field(label).props.onChange({target:{value}});
  const discard=async()=>{await tick();const button=nodes().find(n=>n.type==='button'&&text(n)==='放弃修改并继续');if(button){button.props.onClick();await tick();}};
  await tick();
  const open=async(id,value)=>{click('方案与报告');await tick();component('PagedSavedSessions').onSelect(id);await discard();if(value!==undefined){reads.at(-1).resolve(clone(value));await tick();}};
  return {a,b,api,reads,lists,historyReads,component,click,field,edit,discard,tick,draw,find,nodes,open,text:()=>text(tree),bootCalls:()=>bootCalls,saveCalls:()=>saveCalls,exported:()=>exported,failSave:()=>{saveFailure=true;},setMigrated:()=>{storage={...storage,migrationRequired:false};return clone(storage);},dispose:()=>hooks.dispose(app),lateWrites:()=>app.lateWrites};
}
async function check(name,work){const app=await setup();try{await work(app);cases.push({name,passed:true});}finally{app.dispose();}}
try{
  await check('production bootstrap stays summary-only; global counts and cursor requests never hydrate all sessions',async app=>{
    assert.equal(app.reads.length,0);assert.equal(app.lists.length,0);assert.equal(app.component('PagedSavedSessions').state.total,63);
    app.click('客户档案');await app.tick();assert(app.text().includes('63 份方案'));
    app.click('方案与报告');await app.tick();const c=app.component('PagedSavedSessions').controller;const next=c.next();assert.equal(app.lists[0].input.cursor,'opaque-next');assert.equal(app.reads.length,0);
    app.lists[0].resolve({items:[summary(app.b)],total:63,matched:63,customers:[],profileCounts:{[app.a.profileId]:63}});await next;await app.tick();assert.equal(app.component('PagedSavedSessions').state.page.items[0].id,'saved-B');
  });
  await check('detail failure and missing preserve selected canonical and report baseline',async app=>{
    await app.open('saved-A',app.a);assert(app.text().includes('方案意见已保存'));assert(!app.text().includes('有未保存的方案意见'));
    app.component('PagedSavedSessions').onSelect('missing');await app.discard();app.reads.at(-1).resolve(null);await app.tick();assert(app.text().includes('原先保存的非空意见')===false);assert.equal(app.find(n=>n.type==='textarea'&&n.props.id==='report-review-note').props.value,app.a.reviewNote);assert(app.component('PagedSavedSessions').detailError.includes('不存在'));
    app.component('PagedSavedSessions').onSelect('broken');await app.discard();app.reads.at(-1).reject(Error('读取失败'));await app.tick();assert.equal(app.find(n=>n.type==='textarea'&&n.props.id==='report-review-note').props.value,app.a.reviewNote);assert(app.component('PagedSavedSessions').detailError.includes('读取失败'));
  });
  await check('actual A-to-B-to-A selection suppresses earlier details',async app=>{
    await app.open('saved-A');app.component('PagedSavedSessions').onSelect('saved-B');await app.tick();app.component('PagedSavedSessions').onSelect('saved-A');await app.tick();
    assert.equal(app.reads.length,3);app.reads[0].resolve({...app.a,reviewNote:'stale-first'});app.reads[1].resolve(app.b);await app.tick();assert(!app.nodes().some(n=>n.type==='textarea'&&n.props.id==='report-review-note'));
    app.reads[2].resolve({...app.a,reviewNote:'latest-third'});await app.tick();assert.equal(app.find(n=>n.type==='textarea'&&n.props.id==='report-review-note').props.value,'latest-third');
  });
  await check('editing a draft retires a pending detail without replacing the newer input',async app=>{
    app.component('PagedSavedSessions').onSelect('saved-A');await app.tick();app.edit('客户 / 家长称呼','等待期间新草稿');await app.tick();app.reads[0].resolve(app.a);await app.tick();assert.equal(app.field('客户 / 家长称呼').props.value,'等待期间新草稿');
  });
  await check('profile without stored preferences fetches only its newest summary/detail before applying',async app=>{
    app.click('客户档案');await app.tick();app.nodes().find(n=>n.type==='button'&&text(n).includes('打开档案')).props.onClick();await app.discard();
    assert.equal(app.lists[0].input.limit,1);assert.equal(app.lists[0].input.filters.customerId,app.a.profileId);assert.equal(app.lists[0].input.filters.sort,'newest');
    app.lists[0].resolve({items:[summary(app.a)],total:63,matched:63,customers:[],profileCounts:{[app.a.profileId]:63}});await app.tick();assert.equal(app.reads[0].id,'saved-A');app.reads[0].resolve({...app.a,preferences:{...app.a.preferences,requiredChars:'历史偏好'}});await app.tick();app.click('起名偏好');await app.tick();assert.equal(app.field('指定用字').props.value,'历史偏好');
  });
  await check('report save and export use returned canonical without repopulating bootstrap sessions',async app=>{
    await app.open('saved-A',app.a);const textarea=()=>app.find(n=>n.type==='textarea'&&n.props.id==='report-review-note');textarea().props.onChange({target:{value:'新的报告意见'}});await app.tick();assert(app.text().includes('有未保存的方案意见'));
    app.click('保存方案意见');await app.tick();assert.equal(app.saveCalls(),1);assert(app.text().includes('方案意见已保存'));assert.equal(app.bootCalls(),1);assert.equal(app.lists.length,1);
    app.click('导出 PDF 报告');await app.tick();const plan=app.component('ExportConfirmation');assert.equal(plan.reportDirty,false);await plan.onConfirm();await app.tick();assert.equal(app.exported().reviewNote,'新的报告意见');assert(app.exported().reviewRevision>=2);
  });
  await check('conflict recovery calls detail reader instead of bootstrap and keeps current report draft',async app=>{
    await app.open('saved-A',app.a);app.find(n=>n.type==='textarea'&&n.props.id==='report-review-note').props.onChange({target:{value:'未提交的本地意见'}});await app.tick();app.failSave();app.click('保存方案意见');await app.tick();assert.equal(app.reads.at(-1).id,'saved-A');assert.equal(app.bootCalls(),1);
    app.reads.at(-1).resolve({...app.a,reviewNote:'另一个窗口的新意见'});await app.tick();assert(app.text().includes('方案已在其他窗口更新'));assert.equal(app.find(n=>n.type==='textarea'&&n.props.id==='report-review-note').props.value,'未提交的本地意见');
  });
  await check('history request is retired across same-id reopens and unmount drops pending details',async app=>{
    await app.open('saved-A',app.a);app.click('查看与比较审阅历史');await app.tick();app.component('PagedSavedSessions').onSelect('saved-A');await app.discard();app.reads.at(-1).resolve(app.a);await app.tick();app.historyReads[0].resolve([{id:'late',sessionId:'saved-A',session:app.a,createdAt:app.a.createdAt}]);await app.tick();assert(!app.nodes().some(n=>n.type?.name==='SessionHistory'));
    app.component('PagedSavedSessions').onSelect('saved-B');await app.tick();app.dispose();app.reads.at(-1).resolve(app.b);await flush();assert.equal(app.lateWrites(),0);
  });
  await check('candidate dirty callback keeps its identity across parent state updates',async app=>{
    const withCandidates=catalogSession('saved-A');await app.open('saved-A',withCandidates);app.click('起名工作台');await app.tick();
    app.component('NameCard').onOpen();await app.tick();const callback=app.component('CandidateDetail').onDirtyChange;
    callback(true);await app.tick();assert.equal(app.component('CandidateDetail').onDirtyChange,callback);
    app.draw();assert.equal(app.component('CandidateDetail').onDirtyChange,callback);
    callback(false);await app.tick();assert.equal(app.component('CandidateDetail').onDirtyChange,callback);
  });
  const migration=await setup({migrationRequired:true});
  try{
    migration.edit('客户 / 家长称呼','迁移前草稿');await migration.tick();migration.click('工作室设置');await migration.tick();migration.edit('工作室名称','迁移前品牌草稿');await migration.tick();migration.click('保存品牌');await migration.tick();assert(migration.text().includes('当前只读'));
    const props=migration.component('CustomerStorageMigration');await props.onMigrated(migration.setMigrated());await migration.tick();assert.equal(migration.field('工作室名称').props.value,'迁移前品牌草稿');migration.click('起名工作台');await migration.tick();assert.equal(migration.field('客户 / 家长称呼').props.value,'迁移前草稿');assert.equal(migration.bootCalls(),2);
    cases.push({name:'migration refresh preserves draft/settings and lifts the readonly state only after success',passed:true});
  }finally{migration.dispose();}
  assert.deepEqual(unhandled,[]);
  process.stdout.write(JSON.stringify({passed:true,cases,unhandled,scope:'Actual App callbacks and bounded API mocks in an isolated hook renderer; no SQL/browser/installer.'}));
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
