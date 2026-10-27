import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Exercise the current App callbacks and their asynchronous responses in a separate
// process. The hook renderer intentionally has no DOM: this is event/state coverage.
const root=process.cwd(),dir=path.join(root,'.local/fix-106');
fs.mkdirSync(dir,{recursive:true});
const output=path.join(dir,'settings-app-compiled.mjs');
const original=fs.readFileSync('src/renderer/main.tsx','utf8');
const source=original.replace(/createRoot\(document\.getElementById\('root'\)!\)\.render\([\s\S]*$/,'export { App };');
assert.notEqual(source,original,'Expected the actual App mount to be found');
const icons=new Set();
for(const f of fs.readdirSync('src/renderer').filter(f=>f.endsWith('.tsx'))){const s=fs.readFileSync(path.join('src/renderer',f),'utf8');for(const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g))for(const x of m[1].split(','))icons.add(x.trim());}
const fakeReact=`
let active;
export const StrictMode='strict',Fragment='fragment';
export const createElement=(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}});
export const useState=init=>{const c=active,i=c.index++;if(!(i in c.slots))c.slots[i]=typeof init==='function'?init():init;return[c.slots[i],v=>c.slots[i]=typeof v==='function'?v(c.slots[i]):v];};
export const useRef=v=>{const c=active,i=c.index++;return c.slots[i]??(c.slots[i]={current:v});};
export const useMemo=fn=>{active.index++;return fn();};
export const useSyncExternalStore=(_subscribe,getSnapshot)=>getSnapshot();
export const useId=()=>{const c=active;return 'settings-test-id-'+c.index++;};
export const useEffect=(fn,deps)=>{const c=active,i=c.index++,old=c.slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j]))){c.effects.push(()=>{old?.cleanup?.();const cleanup=fn();c.slots[i]={deps,cleanup};});}};
export const useLayoutEffect=useEffect;export const createContext=v=>({value:v});
globalThis.__settingsHarness={create:()=>({slots:[],index:0,effects:[]}),render:(c,fn)=>{active=c;c.index=0;const tree=fn();for(const e of c.effects.splice(0))e();return tree;},dispose:c=>{for(const s of c.slots)s?.cleanup?.();}};
export default {createElement,StrictMode,Fragment};`;
await build({stdin:{contents:source,sourcefile:'src/renderer/main.tsx',resolveDir:path.join(root,'src/renderer'),loader:'tsx'},bundle:true,format:'esm',platform:'node',outfile:output,jsx:'transform',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',loader:{'.css':'empty'},plugins:[{name:'settings-source-hook-harness',setup(b){b.onResolve({filter:/^(react|react-dom(?:\/client)?|lucide-react)$/},a=>({path:a.path,namespace:'test-hooks'}));b.onLoad({filter:/.*/,namespace:'test-hooks'},a=>({contents:a.path==='react'?fakeReact:a.path==='lucide-react'?[...icons].map(x=>`export const ${x}='icon-${x}';`).join('\n'):a.path==='react-dom/client'?'export const createRoot=()=>({render(){}});':'export const createPortal=x=>x;',loader:'js'}));}}],logLevel:'silent'});
const {App}=await import(pathToFileURL(output).href);
const clone=v=>structuredClone(v);
const base={studioName:'原工作室',contact:'原联系方式',logoDataUrl:'',apiBaseUrl:'https://provider.example/v1',model:'old-model',timeoutMs:45000,hasApiKey:true,useAi:true};
const all=(node,result=[])=>{if(Array.isArray(node)){for(const n of node)all(n,result);}else if(node&&typeof node==='object'&&node.props){result.push(node);all(node.props.children,result);}return result;};
const text=n=>typeof n==='string'?n:typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):n?.props?text(n.props.children):'';
const results=[];
globalThis.document={getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}};globalThis.requestAnimationFrame=fn=>fn();globalThis.confirm=()=>true;

async function setup(){
  const requests=[],readers=[],events=new Set();let persisted=clone(base);
  const boot=()=>({settings:clone(persisted),profiles:[],sessions:[],sources:[],stats:{characters:774,citations:1833,knowledge:433,dataVersion:'test',knowledgeCategories:[]}});
  const save=(kind,input,key)=>new Promise((resolve,reject)=>requests.push({kind,input:clone(input),key,complete(patch={}){persisted={...persisted,...input,...patch};resolve(clone(persisted));},fail(){reject(new Error('隔离测试：保存失败'));}}));
  globalThis.window={addEventListener:n=>events.add(n),removeEventListener:n=>events.delete(n),studio:{bootstrap:async()=>boot(),saveBrand:s=>save('brand',s),saveAiSettings:(s,k)=>save('ai',s,k),restore:async()=>true,saveSettings:()=>{throw new Error('UI used old full settings write');}}};
  globalThis.FileReader=class{constructor(){readers.push(this);}readAsDataURL(){}finish(value){this.result=value;this.onload();}fail(){this.onerror();}};
  const {create,render,dispose}=globalThis.__settingsHarness,app=create();let tree=render(app,App);
  const tick=async()=>{await Promise.resolve();await Promise.resolve();await new Promise(r=>setImmediate(r));tree=render(app,App);};
  const find=pred=>{const n=all(tree).find(pred);assert.ok(n,'Missing requested control');return n;};
  const button=label=>find(n=>n.type==='button'&&text(n)===label);
  const click=label=>label==='恢复备份'?find(n=>typeof n.type==='function'&&n.type.name==='DataMaintenance').props.onRestore():button(label).props.onClick();
  const field=label=>all(find(n=>n.props.label===label)).find(n=>n.type==='input');
  const edit=async(label,value)=>{field(label).props.onChange({target:{value}});await tick();};
  const file=async()=>{const upload=find(n=>n.type==='input'&&n.props.type==='file'||typeof n.type==='function'&&n.type.name==='LogoFileInput');assert.equal(typeof upload.props.onChange,'function','Logo upload must use the actual App onChange handler');upload.props.onChange({target:{files:[{size:100,type:'image/png'}],value:'fake.png'}});await tick();return readers.at(-1);};
  await tick();click('工作室设置');await tick();
  return{tick,find,field,edit,button,click,file,requests,readers,events,text:()=>text(tree),dispose:()=>dispose(app)};
}

async function check(name,fn){const app=await setup();try{await fn(app);results.push({name,passed:true});}finally{app.dispose();}}

await check('AI response preserves newer AI/brand/key edits and canonical saved baseline',async a=>{
  await a.edit('模型名称','submitted-model');await a.edit('API 密钥','submitted-key');a.click('保存 AI 设置');await a.tick();
  await a.edit('模型名称','newer-model');await a.edit('工作室名称','保存期间新品牌');await a.edit('API 密钥','newer-key');
  assert.notEqual(a.field('模型名称').props.disabled,true,'Inputs remain editable while saving');
  a.requests[0].complete();await a.tick();
  assert.equal(a.field('模型名称').props.value,'newer-model');assert.equal(a.field('工作室名称').props.value,'保存期间新品牌');assert.equal(a.field('API 密钥').props.value,'newer-key');
  assert.ok(a.text().includes('AI 设置有未保存修改'));assert.ok(a.text().includes('品牌有未保存修改'));assert.ok(a.events.has('beforeunload'));
});
await check('brand submission excludes dirty invalid AI and new key',async a=>{
  await a.edit('接口地址','未保存的新接口');await a.edit('请求超时（秒）','0');await a.edit('API 密钥','new-provider-key');await a.edit('工作室名称',' 品牌提交 ');
  a.click('保存品牌');await a.tick();assert.deepEqual(a.requests[0].input,{studioName:' 品牌提交 ',contact:base.contact,logoDataUrl:''});assert.equal(a.requests[0].kind,'brand');assert.equal(a.requests[0].key,undefined);
  await a.edit('报告联系方式','保存期间新联系方式');a.requests[0].complete({studioName:'品牌提交'});await a.tick();
  assert.equal(a.field('工作室名称').props.value,'品牌提交');assert.equal(a.field('报告联系方式').props.value,'保存期间新联系方式');assert.equal(a.field('接口地址').props.value,'未保存的新接口');assert.equal(a.field('请求超时（秒）').props.value,0);assert.equal(a.field('API 密钥').props.value,'new-provider-key');
});
await check('successful AI save clears only submitted key and leaves unsaved brand',async a=>{
  await a.edit('工作室名称','未保存品牌');await a.edit('API 密钥','submitted-key');a.click('保存 AI 设置');await a.tick();
  assert.equal(a.requests[0].input.studioName,undefined);assert.equal(a.requests[0].key,'submitted-key');a.requests[0].complete();await a.tick();
  assert.equal(a.field('API 密钥').props.value,'');assert.equal(a.field('工作室名称').props.value,'未保存品牌');assert.ok(a.text().includes('AI 设置已保存'));assert.ok(a.text().includes('品牌有未保存修改'));
});
await check('clear saved key uses persisted AI and preserves all pending settings/key input',async a=>{
  await a.edit('接口地址','未保存的新接口');await a.edit('请求超时（秒）','0');await a.edit('API 密钥','未来的新密钥');await a.edit('工作室名称','未保存品牌');
  a.click('清除已保存密钥');await a.tick();assert.deepEqual(a.requests[0].input,{apiBaseUrl:base.apiBaseUrl,model:base.model,timeoutMs:base.timeoutMs,useAi:true});assert.equal(a.requests[0].key,'');
  await a.edit('模型名称','清除期间新模型');a.requests[0].complete({hasApiKey:false,useAi:false});await a.tick();
  assert.equal(a.field('接口地址').props.value,'未保存的新接口');assert.equal(a.field('请求超时（秒）').props.value,0);assert.equal(a.field('模型名称').props.value,'清除期间新模型');assert.equal(a.field('API 密钥').props.value,'未来的新密钥');assert.equal(a.field('工作室名称').props.value,'未保存品牌');
  assert.equal(a.find(n=>n.type==='input'&&n.props.className==='switch').props.checked,false);
});
await check('image read merges logo into latest brand state only',async a=>{
  const reader=await a.file();await a.edit('报告联系方式','读图期间新联系方式');reader.finish('data:image/png;base64,new');await a.tick();assert.equal(a.field('报告联系方式').props.value,'读图期间新联系方式');assert.ok(a.find(n=>n.type==='img'&&n.props.alt==='品牌标志').props.src.endsWith('new'));
});
await check('older image callback cannot override newer selected image',async a=>{
  const first=await a.file(),second=await a.file();second.finish('data:image/png;base64,second');await a.tick();first.finish('data:image/png;base64,first');await a.tick();assert.ok(a.find(n=>n.type==='img'&&n.props.alt==='品牌标志').props.src.endsWith('second'));
});
await check('remove pending logo invalidates all older reads',async a=>{
  const reader=await a.file();a.click('取消读图并移除');await a.tick();reader.finish('data:image/png;base64,late');await a.tick();assert.ok(!a.text().includes('正在读取品牌图片'));assert.ok(!a.text().includes('移除图片'));assert.equal(a.find(n=>n.type==='div'&&n.props.className==='logo-placeholder').type,'div');
});
await check('image failure preserves existing logo and concurrent contact edit',async a=>{
  const first=await a.file();first.finish('data:image/png;base64,existing');await a.tick();const failed=await a.file();await a.edit('报告联系方式','失败期间的新联系方式');failed.fail();await a.tick();
  assert.equal(a.field('报告联系方式').props.value,'失败期间的新联系方式');assert.ok(a.find(n=>n.type==='img'&&n.props.alt==='品牌标志').props.src.endsWith('existing'));assert.ok(a.text().includes('品牌图片读取失败'));
});
await check('settings edits during save remain after leaving and returning to settings',async a=>{
  a.click('保存品牌');await a.tick();await a.edit('工作室名称','切换面板期间的新名称');a.click('客户档案');await a.tick();a.requests[0].complete();await a.tick();a.click('工作室设置');await a.tick();
  assert.equal(a.field('工作室名称').props.value,'切换面板期间的新名称');assert.ok(a.text().includes('品牌有未保存修改'));
});
await check('failed save retains submitted and newer drafts, key input, and unsaved status',async a=>{
  await a.edit('模型名称','提交的新模型');await a.edit('API 密钥','尚未保存的密钥');a.click('保存 AI 设置');await a.tick();await a.edit('工作室名称','等待失败期间的新品牌');a.requests[0].fail();await a.tick();
  assert.equal(a.field('模型名称').props.value,'提交的新模型');assert.equal(a.field('API 密钥').props.value,'尚未保存的密钥');assert.equal(a.field('工作室名称').props.value,'等待失败期间的新品牌');assert.ok(a.text().includes('隔离测试：保存失败'));assert.ok(a.text().includes('AI 设置有未保存修改'));assert.ok(a.text().includes('品牌有未保存修改'));assert.equal(a.button('保存 AI 设置').props.disabled,false);
});
await check('restoring a backup invalidates pending image callbacks before resetting settings',async a=>{
  const reader=await a.file();a.click('恢复备份');await a.tick();a.click('放弃修改并继续');await a.tick();await a.tick();reader.finish('data:image/png;base64,late-after-restore');await a.tick();
  assert.ok(a.text().includes('品牌已保存'));assert.ok(!a.text().includes('正在读取品牌图片'));assert.ok(!a.text().includes('移除图片'));assert.equal(a.find(n=>n.type==='div'&&n.props.className==='logo-placeholder').type,'div');
});
await check('capability freshness observes config revisions and successful credential saves in the actual App',async a=>{
  const capability=()=>a.find(n=>typeof n.type==='function'&&n.type.name==='AiCapabilityCheck').props;
  const initial=capability();await a.edit('模型名称','temporary-model');await a.edit('模型名称',base.model);assert.ok(capability().configRevision>initial.configRevision);await a.edit('API 密钥','new-draft-key');assert.ok(capability().keyDraftRevision>initial.keyDraftRevision);
  const before=capability().credentialRevision;a.click('保存 AI 设置');await a.tick();a.requests[0].complete();await a.tick();assert.ok(capability().credentialRevision>before);assert.equal(a.field('API 密钥').props.value,'');
});
await check('brand saves leave naming capability credential freshness intact while clearing a key expires it',async a=>{
  const capability=()=>a.find(n=>typeof n.type==='function'&&n.type.name==='AiCapabilityCheck').props;
  const initial=capability().credentialRevision;await a.edit('工作室名称','品牌改变');a.click('保存品牌');await a.tick();a.requests[0].complete();await a.tick();assert.equal(capability().credentialRevision,initial);
  a.click('清除已保存密钥');await a.tick();a.requests[1].complete({hasApiKey:false,useAi:false});await a.tick();assert.ok(capability().credentialRevision>initial);
});
const result={note:'Current App source event handlers run in isolated React hook harness, not DOM/browser validation.',cases:results};
fs.writeFileSync(path.join(dir,'settings-handler-results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
