import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {ModernPracticalEvidenceView} from '../src/renderer/ModernPracticalEvidenceView';
import {createModernActionController,invokeModernAction,modernActionError,type ModernActionState} from '../src/shared/modern-practical-actions';
import {modernRecordView,modernPracticalEvidenceReport,validModernRecord,assertModernPlainData} from '../src/shared/modern-practical-evidence';
import type {NamingSession,NameCandidate} from '../src/shared/types';
const stored: NamingSession=JSON.parse(readFileSync(new URL('./fixtures/saved-modern-ui-session.json',import.meta.url),'utf8'));
const candidate=stored.candidates.find(row=>row.modernPracticalEvidence)!;
const clone=()=>structuredClone(candidate);
const buttons=(html:string)=>[...html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].map(([,attributes,label])=>({label,disabled:/\bdisabled=""/.test(attributes)}));
function withReferenceBridge(run:(query:ReturnType<typeof vi.fn>)=>void){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),query=vi.fn(async()=>{throw Error('Initial rendering must not query historical data');});
 Object.defineProperty(globalThis,'window',{configurable:true,writable:true,value:{studio:{getOfficialNamePopularity:query}}});
 try{run(query);}finally{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
}

describe('browser-only modern view and action bridge (no Store initialization)',()=>{
 it('missing records have explicit state and a real record action, not automatic generation',()=>{
  const c=clone();delete c.modernPracticalEvidence;const onRecord=vi.fn(async()=>true),html=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} onRecord={onRecord}/>);
  expect(html).toContain('未记录');expect(html).toContain('生成并保存说明');expect(html).toContain('不会自动补算');expect(onRecord).not.toHaveBeenCalled();
  expect(modernPracticalEvidenceReport(c)).toBe('');
 });
 it('detail rendering separates rule scores, facts, absent empirical support and no local debug paths',()=>{
  const html=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={candidate} onRecord={async()=>true} onClear={async()=>true}/>);
  for(const phrase of ['字条事实 · 读音','字条事实 · 书写','项目观察 · 字义与行业','已存规则分','缺乏实证','清除已保存说明'])expect(html).toContain(phrase);
  expect(html).not.toMatch(/\.local[\/]|[A-Z]:[\\/]|src\/domain|node:crypto|implementationReference|inputSha256/);
 });
 it('compare/history use read-only summaries without generation or clearing controls',()=>{
  withReferenceBridge(query=>{
   const c=clone(),before=JSON.stringify(c),onRecord=vi.fn(async()=>true),onClear=vi.fn(async()=>true);
   const html=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} readOnly compact onRecord={onRecord} onClear={onClear}/>);
   expect(html).toContain('<details');expect(html).toContain('已记录');
   // Read-only views retain the separate manual historical lookup, while all
   // controls that write modern evidence remain absent even with callbacks.
   expect(buttons(html)).toEqual([{label:'查看2021年给名参考',disabled:false}]);
   expect(html).not.toContain('candidate-review-actions');expect(html).not.toContain('生成并保存说明');expect(html).not.toContain('清除已保存说明');
   for(const boundary of ['2021年给名参考','历史给名榜不代表当前全国全名重名率','榜外人数未知','不改变评分、排序或保存记录'])expect(html).toContain(boundary);
   expect(html).toContain('aria-expanded="false"');expect(query).not.toHaveBeenCalled();expect(onRecord).not.toHaveBeenCalled();expect(onClear).not.toHaveBeenCalled();expect(JSON.stringify(c)).toBe(before);
  });
 });
 it('dirty or busy detail disables actions while preserving saved data and draft ownership',()=>{
  withReferenceBridge(query=>{
   const c=clone(),before=JSON.stringify(c),onRecord=vi.fn(async()=>true),onClear=vi.fn(async()=>true);
   const expected=[{label:'重新生成并保存说明',disabled:false},{label:'清除已保存说明',disabled:false},{label:'查看2021年给名参考',disabled:false}];
   const clean=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} onRecord={onRecord} onClear={onClear}/>);
   expect(buttons(clean)).toEqual(expected);
   for(const blocked of [{dirty:true},{busy:true}]){
    const html=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} {...blocked} onRecord={onRecord} onClear={onClear}/>);
    expect(buttons(html)).toEqual(expected.map(button=>({...button,disabled:true})));
    if('dirty' in blocked)expect(html).toContain('请先保存或撤销当前草稿');
    expect(JSON.stringify(c)).toBe(before);
   }
   expect(query).not.toHaveBeenCalled();expect(onRecord).not.toHaveBeenCalled();expect(onClear).not.toHaveBeenCalled();
  });
 });
 it('meaning edits present retained old content as historical, not current facts',()=>{
  const c=clone(),saved=JSON.stringify(c.modernPracticalEvidence);c.meaning='新的人工寓意';
  expect(modernRecordView(c).state).toBe('stale');const html=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} readOnly/>);
  expect(html).toContain('保存后寓意已修改');expect(html).toContain('查看原保存说明（仅供历史）');expect(html).not.toContain('<details open');expect(JSON.stringify(c.modernPracticalEvidence)).toBe(saved);
  const report=modernPracticalEvidenceReport(c);expect(report).toContain('保存后寓意已修改');expect(report).not.toContain('字条事实 · 读音');
 });
 it('unknown and malformed DTOs are retained but never treated as usable evidence or rendered into facts',()=>{
  const c=clone();c.modernPracticalEvidence={version:'modern-practical-evidence/999',observations:{text:'<script>future</script>'}};
  expect(modernRecordView(c).state).toBe('unsupported');expect(renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} readOnly/>)).not.toContain('<script>');
  const forged=clone();(forged.modernPracticalEvidence as any).evidence.observations={};expect(modernRecordView(forged).state).toBe('invalid');expect(()=>renderToStaticMarkup(<ModernPracticalEvidenceView candidate={forged}/>)).not.toThrow();
 });
 it('HTML safety escapes literal fact/editorial strings in current records',()=>{
  const c=clone(),r=c.modernPracticalEvidence as any;r.evidence.observations.meaningIndustry.savedInterpretation.text='<img src=x onerror=alert(1)>';r.evidence.observations.meaningIndustry.industry.savedText='<script>alert(1)</script>';
  // Shape-valid but not authoritative: main canonical validation rejects this mutation.
  expect(validModernRecord(r)).toBe(true);const html=renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} readOnly/>),report=modernPracticalEvidenceReport(c);
  expect(html).toContain('&lt;img');expect(report).toContain('&lt;script&gt;');expect(html+report).not.toMatch(/<img src=x|<script>/);
 });
 it('plain DTO guard does not run getters or accept array holes hidden by extra fields',()=>{
  let reads=0;const r={get version(){reads++;return 'modern-practical-evidence/999';}};expect(validModernRecord(r)).toBe(false);expect(reads).toBe(0);
  const array:any[]=new Array(1);(array as any).extra='cover-the-hole';expect(()=>assertModernPlainData(array)).toThrow();
 });
 it('button controller emits loading and success, with a synchronous duplicate-click latch',async()=>{
  const states:ModernActionState[]=[],controller=createModernActionController(state=>states.push(state));let release!:(value:boolean)=>void;
  const action=vi.fn(()=>new Promise<boolean>(resolve=>{release=resolve;}));const running=controller.run('record',action,false);
  expect(states).toEqual([{pending:'record',error:''}]);expect(await controller.run('record',action,false)).toBe(false);expect(action).toHaveBeenCalledTimes(1);
  release(true);expect(await running).toBe(true);expect(states.at(-1)).toEqual({pending:false,error:''});
 });
 it('errors and CAS conflicts release loading, preserve the draft and allow a deliberate retry',async()=>{
  const states:ModernActionState[]=[],controller=createModernActionController(state=>states.push(state)),draft={meaning:'尚未保存的草稿'};
  expect(await controller.run('clear',async()=>{throw new Error('方案已被其他窗口更新，当前草稿仍保留');},false)).toBe(false);
  expect(states.at(-1)?.pending).toBe(false);expect(states.at(-1)?.error).toContain('草稿仍保留');expect(draft.meaning).toBe('尚未保存的草稿');
  expect(await controller.run('clear',async()=>false,false)).toBe(false);expect(states.at(-1)?.error).toContain('操作未保存');
  expect(await controller.run('clear',async()=>true,false)).toBe(true);expect(states.at(-1)?.error).toBe('');
 });
 it('blocked drafts never call the API and bridge submits exactly IDs/revision/token',async()=>{
  const controller=createModernActionController(()=>{}),blocked=vi.fn(async()=>true);expect(await controller.run('record',blocked,true)).toBe(false);expect(blocked).not.toHaveBeenCalled();
  const api={recordModernPracticalEvidence:vi.fn(async()=>stored),clearModernPracticalEvidence:vi.fn(async()=>stored)};
  await invokeModernAction(api,'record',stored,candidate.id);await invokeModernAction(api,'clear',stored,candidate.id);
  const args=[stored.id,candidate.id,stored.reviewRevision??0,stored.reviewToken];expect(api.recordModernPracticalEvidence).toHaveBeenCalledExactlyOnceWith(...args);expect(api.clearModernPracticalEvidence).toHaveBeenCalledExactlyOnceWith(...args);expect(args).toHaveLength(4);
 });
 it('render-only consumers leave score, capture basis and sources byte-identical',()=>{
  const c=clone(),before=JSON.stringify(c);modernRecordView(c);modernPracticalEvidenceReport(c);renderToStaticMarkup(<ModernPracticalEvidenceView candidate={c} readOnly compact/>);expect(JSON.stringify(c)).toBe(before);
 });
 it('owned action errors keep useful CAS text but hide runtime file paths from the user',()=>{
  expect(modernActionError(new Error('ENOENT: E:\\private\\runtime\\modern-method-references.json'))).not.toContain('private');
  expect(modernActionError(new Error('方案已被其他窗口更新，草稿仍保留'))).toContain('方案已被其他窗口更新');
 });
});
