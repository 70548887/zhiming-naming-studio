import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const root=process.cwd(),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'naming-yue-ui-'));
const hooks=`let active;
export const createElement=(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}});
export const jsx=(type,props,key)=>({type,props:{...props,key}}),jsxs=jsx;
export const Fragment='fragment';
export const useState=init=>{const c=active,i=c.index++;if(!(i in c.slots))c.slots[i]=typeof init==='function'?init():init;return[c.slots[i],next=>{const value=typeof next==='function'?next(c.slots[i]):next;if(!Object.is(c.slots[i],value)){c.slots[i]=value;c.pending=true;}}];};
export const useId=()=>{const c=active,i=c.index++;return c.slots[i]??(c.slots[i]='yue-test-'+i);};
export const useEffect=(fn,deps)=>{const c=active,i=c.index++,old=c.slots[i];if(!old||!deps||deps.some((value,index)=>!Object.is(value,old.deps?.[index])))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
globalThis.__yueTestHooks={create:()=>({slots:[],index:0,effects:[],pending:false}),render:(c,fn)=>{let tree;for(let count=0;count<10;count++){active=c;c.index=0;c.pending=false;tree=fn();for(const effect of c.effects.splice(0))effect();if(!c.pending)return tree;}throw new Error('Unsettled renderer');},dispose:c=>{for(const slot of c.slots)slot?.cleanup?.();}};
export default {createElement,Fragment};`;

try{
 const output=path.join(temporary,'yue-ui-compiled.mjs');
 await build({stdin:{contents:"export {YueReadingView} from './src/renderer/YueReadingView';export {loadYueReadingData} from './src/main/yue-reading-data';export {calculateYueNameReading,confirmYueNameReading} from './src/domain/yue-reading';",sourcefile:'yue-ui-entry.ts',resolveDir:root,loader:'ts'},outfile:output,bundle:true,platform:'node',format:'esm',jsx:'transform',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',loader:{'.css':'empty'},plugins:[{name:'isolated-yue-renderer',setup(builder){builder.onResolve({filter:/^(react(?:\/jsx-runtime)?|lucide-react)$/},args=>({path:args.path==='react/jsx-runtime'?'react':args.path,namespace:'isolated'}));builder.onLoad({filter:/.*/,namespace:'isolated'},args=>({contents:args.path==='react'?hooks:"export const Check='check-icon';",loader:'js'}));}}],logLevel:'silent'});
 const {YueReadingView,loadYueReadingData,calculateYueNameReading,confirmYueNameReading}=await import(pathToFileURL(output).href);
 const {data}=loadYueReadingData(path.join(root,'data')),runtime=globalThis.__yueTestHooks;
 const all=(node,result=[])=>{if(Array.isArray(node))for(const child of node)all(child,result);else if(node?.props){result.push(node);all(node.props.children,result);}return result;};
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
 const initial=calculateYueNameReading('陈','清',data);
 const surname=initial.surname.candidates.find(row=>row.tokens.join(' ')==='can4'),given=initial.given[0].candidates.find(row=>row.tokens.join(' ')==='cing1');
 assert.ok(surname&&given,'Expected source fixture readings');
 const dictionary=row=>({tokens:[...row.tokens],dictionaryId:row.id,origin:'dictionary',confirmed:true});
 const flush=async()=>{await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
 function fixture({origin='user',accept=true,pending=false}={}){
  let analysis=confirmYueNameReading(initial,{surname:dictionary(surname),given:[origin==='user'?{tokens:['cing1'],origin:'user',confirmed:true}:dictionary(given)]}),tree,parentDirty=false,busy=false,complete;
  const state=runtime.create(),dirtyEvents=[],saves=[];
  const onDirtyChange=dirty=>{parentDirty=dirty;dirtyEvents.push(dirty);};
  const onConfirm=async selections=>{
   saves.push(structuredClone(selections));
   if(pending){busy=true;await new Promise(resolve=>complete=resolve);}
   if(accept)analysis=confirmYueNameReading(analysis,selections);
   busy=false;return accept;
  };
  const draw=()=>{tree=runtime.render(state,()=>YueReadingView({analysis,busy,onConfirm,onDirtyChange}));};
  const snapshot=()=>({status:all(tree).filter(node=>node.props.role==='status').map(text),alerts:all(tree).filter(node=>node.props.role==='alert').map(text),saveEnabled:!all(tree).find(node=>node.type==='button').props.disabled,parentDirty,manualValues:all(tree).filter(node=>node.type==='input').map(node=>node.props.value),controlsDisabled:all(tree).filter(node=>node.type==='input'||node.type==='select').every(node=>node.props.disabled),storedGiven:structuredClone(analysis.given[0].selection),saveCalls:saves.length});
  draw();
  assert.equal(parentDirty,false,'A saved initial reading must be clean before any user action');
  return{snapshot,manual(value){const input=all(tree).find(node=>node.type==='input');assert.ok(input);assert.equal(input.props.disabled,false,'A user cannot edit a disabled control');input.props.onChange({target:{value}});draw();},selectGiven(value){const control=all(tree).filter(node=>node.type==='select')[1];assert.equal(control.props.disabled,false);control.props.onChange({target:{value}});draw();},async save(){const button=all(tree).find(node=>node.type==='button');assert.equal(button.props.disabled,false,'A user cannot click a disabled save button');button.props.onClick();await flush();draw();},async finish(){assert.ok(complete,'No pending save');complete();await flush();draw();},saves,dirtyEvents,dictionaryId:given.id,dispose:()=>runtime.dispose(state)};
 }
 const cases=[];
 async function check(id,options,work){const state=fixture(options);try{const observed=await work(state);cases.push({id,passed:true,...observed});}finally{state.dispose();}}
 for(const [id,input]of [['case-only-is-clean','CING1'],['whitespace-only-is-clean',' cing1 ']])await check(id,{},async state=>{
  state.manual(input);const after=state.snapshot();assert.equal(after.parentDirty,false);assert.equal(after.saveEnabled,false);assert.deepEqual(after.status,['粤语读音选择已保存']);assert.equal(after.saveCalls,0);assert.deepEqual(after.storedGiven.tokens,['cing1']);return{after};
 });
 await check('dictionary-revert-is-clean',{origin:'dictionary'},async state=>{
  state.selectGiven('user');state.manual('cing1');assert.equal(state.snapshot().parentDirty,true);state.selectGiven(state.dictionaryId);const after=state.snapshot();assert.equal(after.parentDirty,false);assert.equal(after.saveEnabled,false);assert.equal(after.saveCalls,0);assert.deepEqual(after.status,['粤语读音选择已保存']);return{after};
 });
 await check('real-change-saves',{},async state=>{
  state.manual('cing2');const edited=state.snapshot();assert.equal(edited.parentDirty,true);assert.equal(edited.saveEnabled,true);await state.save();const after=state.snapshot();assert.equal(after.parentDirty,false);assert.equal(after.saveEnabled,false);assert.deepEqual(after.storedGiven.tokens,['cing2']);assert.equal(after.saveCalls,1);return{edited,after};
 });
 await check('failed-save-preserves-input',{accept:false},async state=>{
  state.manual('cing2');await state.save();const after=state.snapshot();assert.equal(after.parentDirty,true);assert.equal(after.saveEnabled,true);assert.deepEqual(after.manualValues,['cing2']);assert.deepEqual(after.storedGiven.tokens,['cing1']);assert.ok(after.alerts.some(message=>message.includes('未保存')));return{after};
 });
 await check('invalid-input-remains-unsaved',{},async state=>{
  state.manual('cing');assert.equal(state.snapshot().parentDirty,true);await state.save();const after=state.snapshot();assert.equal(after.parentDirty,true);assert.equal(after.saveEnabled,true);assert.deepEqual(after.manualValues,['cing']);assert.equal(after.saveCalls,0);assert.ok(after.alerts.some(message=>message.includes('调号')));return{after};
 });
 await check('pending-save-locks-controls',{pending:true},async state=>{
  state.manual('cing2');await state.save();const pending=state.snapshot();assert.equal(pending.parentDirty,true);assert.equal(pending.saveEnabled,false);assert.equal(pending.controlsDisabled,true);await state.finish();const after=state.snapshot();assert.equal(after.parentDirty,false);assert.equal(after.controlsDisabled,false);assert.deepEqual(after.manualValues,['cing2']);assert.deepEqual(after.storedGiven.tokens,['cing2']);return{pending,after};
 });
 console.log(JSON.stringify({scope:'Actual renderer component handlers, isolated hooks, fixed source/domain confirmation; no browser or customer database.',cases}));
}finally{
 if(path.dirname(path.resolve(temporary))!==path.resolve(os.tmpdir())||!path.basename(temporary).startsWith('naming-yue-ui-'))throw new Error('Unexpected temporary cleanup target');
 fs.rmSync(temporary,{recursive:true,force:true});
}
