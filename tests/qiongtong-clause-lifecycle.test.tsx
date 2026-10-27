import {describe,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import type {BirthProfile} from '../src/shared/types';
import type {QiongtongClauseReferenceApi} from '../src/shared/qiongtong-clause-reference-preview';

// A bounded hook harness invokes the actual Panel and its effect setup/cleanup.
// In particular, retry must pass the rendered button and Panel pending guard.
const hooks=vi.hoisted(()=>({index:0,slots:[] as any[],pending:[] as (()=>void)[]}));
vi.mock('react',async load=>{
  const actual=await load<typeof import('react')>();
  return {...actual,useId:()=>`clause-${hooks.index++}`,
    useRef:(value:unknown)=>{const i=hooks.index++;return hooks.slots[i]??(hooks.slots[i]={current:value});},
    useState:(init:unknown)=>{const i=hooks.index++;if(!hooks.slots[i])hooks.slots[i]={value:typeof init==='function'?(init as Function)():init};return[hooks.slots[i].value,(value:unknown)=>{hooks.slots[i].value=typeof value==='function'?(value as Function)(hooks.slots[i].value):value;}];},
    useEffect:(setup:()=>void|(()=>void),deps:unknown[])=>{const i=hooks.index++,old=hooks.slots[i];const changed=!old||deps.some((value,j)=>!Object.is(value,old.deps[j]));const slot=hooks.slots[i]={kind:'effect',deps,setup,cleanup:old?.cleanup};if(changed)hooks.pending.push(()=>{slot.cleanup?.();slot.cleanup=setup();});},
  };
});
import {QiongtongClausePreviewPanel} from '../src/renderer/QiongtongClausePreviewPanel';
import {validClausePreviewResponse} from '../src/renderer/qiongtong-clause-preview-bindings';
import type {QiongtongClauseReferencePreview} from '../src/shared/qiongtong-clause-reference-preview';
const all=(node:any,result:any[]=[]):any[]=>{if(Array.isArray(node))node.forEach(child=>all(child,result));else if(node&&typeof node==='object'&&'props'in node){result.push(node);all(node.props.children,result);}return result;};
const button=(node:ReactElement)=>all(node).find(row=>row.type==='button');
const tick=async()=>{await Promise.resolve();await Promise.resolve();};

describe('actual readonly Panel effect lifecycle',()=>{
  it('re-enables the rendered pending button after reconnection and suppresses the retired response',async()=>{
    hooks.index=0;hooks.slots=[];hooks.pending=[];
    const pending:{resolve:(value:unknown)=>void;reject:(error:Error)=>void}[]=[];
    const method=vi.fn(()=>new Promise((resolve,reject)=>pending.push({resolve,reject})));
    const api={previewQiongtongClauseReferences:method} as unknown as QiongtongClauseReferenceApi;
    const profile:BirthProfile={
      id:'lifecycle-profile',customerName:'生命周期测试',surname:'林',surnamePinyin:'lín',gender:'中性',
      calendar:'solar',birthDate:'2024-02-10',leapMonth:false,birthTime:'09:30',timeUnknown:false,
      birthPlace:'上海',timezone:'Asia/Shanghai',notes:'',
    };
    const render=()=>{hooks.index=0;const tree=QiongtongClausePreviewPanel({profile,api});for(const run of hooks.pending.splice(0))run();return tree;};
    let tree=render();button(tree).props.onClick();tree=render();expect(method).toHaveBeenCalledTimes(1);expect(button(tree).props.disabled).toBe(true);
    for(const slot of hooks.slots)if(slot?.kind==='effect')slot.cleanup?.();
    for(const slot of hooks.slots)if(slot?.kind==='effect')slot.cleanup=slot.setup();
    tree=render();expect(button(tree).props.disabled).toBe(false);
    button(tree).props.onClick();tree=render();expect(method).toHaveBeenCalledTimes(2);expect(button(tree).props.disabled).toBe(true);
    pending[1].reject(Error('isolated-new-request-failure'));await tick();tree=render();expect(button(tree).props.disabled).toBe(false);
    expect(all(tree).some(row=>row.props.role==='alert')).toBe(true);
    // This is a synthetic binding-valid transport reply, not verified source evidence.
    // If an obsolete lease applies it, the current error disappears and this test fails.
    const retiredReply={schema:'qiongtong-clause-reference-preview/1.0.0',profileId:profile.id,analysis:{},reference:{schema:'qiongtong-literal-conditions/1.0.1',school:'qiongtong-wikisource-2294674',input:{complete:false,dayStem:null,monthBranch:null,unknownPositions:['时柱']},rules:[],namingImpact:'none'},sourceVerification:{status:'verified-fixed-resources',school:'qiongtong-wikisource-2294674',revision:'wikisource-revision/2294674',scanCollation:false,label:'Synthetic lifecycle fixture only',sources:[],conditions:{file:'data/qiongtong-clause-conditions-v1.json',schema:'qiongtong-literal-conditions/1.0.0',sha256:'a'.repeat(64)},rules:[]}} as unknown as QiongtongClauseReferencePreview;
    expect(validClausePreviewResponse(retiredReply,profile.id)).toBe(true);
    pending[0].resolve(retiredReply);await tick();tree=render();expect(button(tree).props.disabled).toBe(false);expect(all(tree).some(row=>row.props.role==='alert')).toBe(true);
    for(const slot of hooks.slots)if(slot?.kind==='effect')slot.cleanup?.();
  });
});
