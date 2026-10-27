import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {describe,expect,it,vi} from 'vitest';
import data from '../data/official-name-popularity.json';
import lock from '../data/official-name-popularity-source-lock.json';
import nativeFixture from './fixtures/desktop176-old70-canonical.json';
import type {NameCandidate} from '../src/shared/types';
import type {OfficialNamePopularityCatalog} from '../src/shared/official-name-popularity';
import {MODERN_PRACTICAL_VERSION,modernRecordView} from '../src/shared/modern-practical-evidence';
import {ModernNamePopularityReferencePanel,ModernNamePopularityReferenceView} from '../src/renderer/ModernNamePopularityReferencePanel';
import {createModernNamePopularityReferenceController,currentModernReferenceState,readModernReferenceFrame,type ModernReferenceCandidate,type ModernNamePopularityReferenceApi} from '../src/renderer/modern-name-popularity-reference-state';

const {fileHashes:_,...source}=lock.sources[0];
const catalog={...data,source} as OfficialNamePopularityCatalog;
const copy=<T,>(value:T):T=>structuredClone(value);
const candidate=(givenName='沐宸'):ModernReferenceCandidate=>({id:'saved-candidate',givenName,meaning:'保存寓意'});
function deferredApi(){
  const calls:{args:unknown[];resolve:(value:OfficialNamePopularityCatalog)=>void;reject:(error:Error)=>void}[]=[];
  const api:ModernNamePopularityReferenceApi={getOfficialNamePopularity:(...args:unknown[])=>new Promise((resolve,reject)=>calls.push({args,resolve,reject}))};
  return {api,calls};
}
function setup(initial=candidate(),initialApi:ModernNamePopularityReferenceApi=deferredApi().api){
  let current=initial,api=initialApi,disabled=false;
  const frame=()=>readModernReferenceFrame(current,api,disabled);
  const controller=createModernNamePopularityReferenceController({getFrame:frame});controller.activate();
  return {controller,frame,current:()=>current,setCandidate:(value:ModernReferenceCandidate)=>{current=value;},setApi:(value:ModernNamePopularityReferenceApi)=>{api=value;},setDisabled:(value:boolean)=>{disabled=value;},view:()=>currentModernReferenceState(controller.getSnapshot(),frame())};
}
const html=(state:ReturnType<ReturnType<typeof setup>['view']>)=>renderToStaticMarkup(<ModernNamePopularityReferenceView id="test-reference" state={state} onQuery={()=>{}} onClose={()=>{}}/>);

describe('manual modern historical reference consumer',()=>{
  it('starts closed without requests and loads exact separate cohorts only on an explicit zero-argument action',async()=>{
    const pending=deferredApi(),input={...candidate(),evaluation:{sound:71},sourceSnapshot:{historical:true}},before=JSON.stringify(input);
    const app=setup(input,pending.api),listener=vi.fn();app.controller.subscribe(listener);
    expect(app.view().expanded).toBe(false);expect(pending.calls).toHaveLength(0);
    const first=app.controller.query();void app.controller.query();
    expect(pending.calls).toHaveLength(1);expect(pending.calls[0].args).toEqual([]);
    expect(app.view().phase).toBe('loading');expect(html(app.view())).toContain('正在读取');
    pending.calls[0].resolve(copy(catalog));await first;
    expect(app.view().result?.historical.records).toEqual([{sexCohort:'male',status:'listed',rank:1,reportedPeople:22958},{sexCohort:'female',status:'not-listed',rank:null,reportedPeople:null}]);
    expect(html(app.view())).toContain('22,958');expect(html(app.view())).toContain('人数未公布');expect(html(app.view())).not.toContain('data-reported-people="0"');
    expect(JSON.stringify(input)).toBe(before);expect(listener).toHaveBeenCalledTimes(2);app.controller.dispose();
  });

  it('renders unknown literal names as null with expandable source/year/license boundaries and escaped text',async()=>{
    for(const givenName of ['知远','王沐宸','<script>name</script>']){
      const input=candidate(givenName),before=JSON.stringify(input),app=setup(input,{getOfficialNamePopularity:async()=>copy(catalog)});
      await app.controller.query();
      expect(app.view().result?.historical.records.every(record=>record.reportedPeople===null&&record.rank===null)).toBe(true);
      const rendered=html(app.view());expect(rendered.match(/人数未公布/g)).toHaveLength(2);
      for(const expected of ['2021-12-31','查看年份、统计群体与来源','公安部户政管理研究中心','2022-01-24 09:16','原报告图文未声明开放许可','未重新认证现代说明','不改变评分、排序或保存记录','证据状态','统计年份','样本范围','当前全国全名重名率／频率：','不可由本历史给名榜推导','来源状态：已核验的固定官方历史出版物','只读，不写入客户库、候选或现代说明','来源 ID','来源闭包 SHA-256','独立盲录审阅 SHA-256','公布母数精度'])expect(rendered).toContain(expected);
      expect((rendered.match(/data-reference-fact=/g)||[])).toHaveLength(3);
      expect(rendered).toContain(catalog.source.license);expect(rendered).not.toContain('<script>');expect(rendered).not.toContain('<img');expect(rendered).not.toContain('indicativeShare');expect(rendered).not.toContain('已重新认证');
      expect(JSON.stringify(input)).toBe(before);app.controller.dispose();
    }
  });

  it('discards all previous counts for failed loads or altered fixed source catalogs, then permits a valid retry',async()=>{
    const pending=deferredApi(),app=setup(candidate(),pending.api);
    let request=app.controller.query();pending.calls.at(-1)!.resolve(copy(catalog));await request;
    expect(app.view().phase).toBe('ready');
    for(const mutate of [(v:OfficialNamePopularityCatalog)=>{v.tables[0].rows[0].reportedPeople=1;},(v:OfficialNamePopularityCatalog)=>{v.source.url='https://invalid.local';},(v:OfficialNamePopularityCatalog)=>{v.limitations=[];}]){
      request=app.controller.query();expect(app.view().result).toBeUndefined();const altered=copy(catalog);mutate(altered);pending.calls.at(-1)!.resolve(altered);await request;
      expect(app.view().errorKind).toBe('source');expect(app.view().result).toBeUndefined();expect(html(app.view())).not.toContain('22,958');expect(html(app.view())).toContain('固定来源不一致');
    }
    request=app.controller.query();pending.calls.at(-1)!.reject(Error('D:/private/source-lock.json'));await request;
    expect(app.view().errorKind).toBe('request');expect(html(app.view())).not.toContain('D:/private');
    request=app.controller.query();pending.calls.at(-1)!.resolve(copy(catalog));await request;expect(app.view().phase).toBe('ready');app.controller.dispose();
  });

  it('retires old success and failure on API replacement, same-object method replacement and A-to-B-to-A',async()=>{
    for(const settle of ['resolve','reject'] as const){
      const first=deferredApi(),second=deferredApi(),app=setup(candidate(),first.api);
      const old=app.controller.query();app.setApi(second.api);
      expect(app.view().phase).toBe('idle');expect(app.view().result).toBeUndefined();app.controller.refresh();
      const latest=app.controller.query();
      if(settle==='resolve')first.calls[0].resolve(copy(catalog));else first.calls[0].reject(Error('late'));
      await old;expect(app.view().phase).toBe('loading');second.calls[0].resolve(copy(catalog));await latest;
      const methodReplacement=deferredApi();second.api.getOfficialNamePopularity=methodReplacement.api.getOfficialNamePopularity;
      expect(app.view().phase).toBe('idle');app.controller.refresh();const oldAgain=app.controller.query();
      app.setApi(first.api);app.controller.refresh();app.setApi(second.api);app.controller.refresh();
      methodReplacement.calls[0].resolve(copy(catalog));await oldAgain;expect(app.view().phase).toBe('idle');app.controller.dispose();
    }
  });

  it('synchronously hides ready counts and retires pending leases when candidate name, meaning, modern record, owner or disabled state changes',async()=>{
    for(const change of [(v:ModernReferenceCandidate)=>({...v,givenName:'沐辰'}),(v:ModernReferenceCandidate)=>({...v,meaning:'保存后的新寓意'}),(v:ModernReferenceCandidate)=>({...v,modernPracticalEvidence:{version:'future/1',state:'preserved'}}),(v:ModernReferenceCandidate)=>({...v,id:'another-saved-candidate'}),(v:ModernReferenceCandidate)=>({...v})]){
      const pending=deferredApi(),app=setup(candidate(),pending.api);let request=app.controller.query();pending.calls[0].resolve(copy(catalog));await request;
      app.setCandidate(change(app.current()));expect(app.view().phase).toBe('idle');expect(html(app.view())).not.toContain('22,958');app.controller.refresh();
      request=app.controller.query();app.setCandidate(candidate());app.controller.refresh();pending.calls[1].resolve(copy(catalog));await request;expect(app.view().phase).toBe('idle');
      request=app.controller.query();pending.calls[2].resolve(copy(catalog));await request;app.setDisabled(true);expect(app.view().result).toBeUndefined();app.controller.refresh();await app.controller.query();expect(pending.calls).toHaveLength(3);app.controller.dispose();
    }
    let reads=0;const poisoned=candidate();Object.defineProperty(poisoned,'meaning',{enumerable:true,get(){reads++;return 'poisoned';}});const api=deferredApi(),invalid=setup(poisoned,api.api);await invalid.controller.query();expect(invalid.view().errorKind).toBe('input');expect(api.calls).toHaveLength(0);expect(reads).toBe(0);invalid.controller.dispose();
  });

  it('ignores success and rejection after close/unmount, including StrictMode reactivation until a fresh manual query',async()=>{
    for(const settle of ['resolve','reject'] as const){
      const pending=deferredApi(),app=setup(candidate(),pending.api),listener=vi.fn();app.controller.subscribe(listener);
      const old=app.controller.query();app.controller.dispose();app.controller.activate();listener.mockClear();
      if(settle==='resolve')pending.calls[0].resolve(copy(catalog));else pending.calls[0].reject(Error('unmounted'));
      await old;expect(listener).not.toHaveBeenCalled();expect(app.view().phase).toBe('idle');
      const closed=app.controller.query();app.controller.close();pending.calls[1].resolve(copy(catalog));await closed;expect(app.view().expanded).toBe(false);expect(app.view().result).toBeUndefined();
      const fresh=app.controller.query();pending.calls[2].resolve(copy(catalog));await fresh;expect(app.view().phase).toBe('ready');app.controller.dispose();
    }
  });

  it('preserves all existing modern status semantics as display state without asserting main authentication',async()=>{
    const session=(nativeFixture.current[0].original as unknown as {candidates:NameCandidate[]});
    const original=session.candidates.find(row=>row.modernPracticalEvidence?.version===MODERN_PRACTICAL_VERSION)!;
    expect(original).toBeTruthy();
    const record=original.modernPracticalEvidence;
    const variants:ModernReferenceCandidate[]=[candidate(),{...candidate(),modernPracticalEvidence:{version:'future/1'}},{...candidate(),modernPracticalEvidence:{version:MODERN_PRACTICAL_VERSION}},{...candidate(),meaning:original.meaning,modernPracticalEvidence:record},{...candidate(),meaning:original.meaning+'changed',modernPracticalEvidence:record}];
    const before=JSON.stringify(variants);
    for(const [index,input]of variants.entries()){
      const expected=['missing','unsupported','invalid','current','stale'][index];expect(modernRecordView(input).state).toBe(expected);
      const app=setup(input,{getOfficialNamePopularity:async()=>copy(catalog)});await app.controller.query();expect(app.view().result?.modernEvidence.state).toBe(expected);expect(html(app.view())).toContain('此处仅展示保存记录状态');app.controller.dispose();
    }
    expect(JSON.stringify(variants)).toBe(before);
    const api={getOfficialNamePopularity:vi.fn(async()=>copy(catalog))};const first=renderToStaticMarkup(<ModernNamePopularityReferencePanel candidate={candidate()} api={api}/>);expect(first).toContain('aria-expanded="false"');expect(first).not.toContain('22,958');expect(api.getOfficialNamePopularity).not.toHaveBeenCalled();
  });

  it('runs real attached component buttons in detail/comparison/history with isolated hooks',()=>{
    const result=JSON.parse(execFileSync(process.execPath,[resolve('tests/helpers/modern-name-popularity-reference-harness.mjs')],{cwd:process.cwd(),encoding:'utf8',timeout:20000}));
    expect(result.passed).toBe(true);expect(result.contexts).toEqual(['detail','comparison','history']);expect(result.unhandled).toEqual([]);
  },25000);
});
