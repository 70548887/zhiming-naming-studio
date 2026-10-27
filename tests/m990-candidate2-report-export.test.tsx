import React from 'react';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {Candidate2ReportExport,captureCandidate2ReportReference,dispatchCandidate2ReportExport} from '../src/renderer/Candidate2ReportExport';
import type {Candidate2ReportExportProps,Candidate2ReportReference} from '../src/renderer/Candidate2ReportExport';

const reference=():Candidate2ReportReference=>({id:'session-c2-1',expectedReviewRevision:2,expectedReviewToken:'actual-read-token'});
const props=(patch:Partial<Candidate2ReportExportProps>={}):Candidate2ReportExportProps=>({source:reference(),busy:false,onExport:()=>{},...patch});
const exportButton=(html:string)=>html.match(/<button\b[^>]*data-c2-report-action="export"[^>]*>/)?.[0];
describe('M990 controlled report export',()=>{
 it('renders the saved-source boundary without dispatching or mutating canonical reference',()=>{
  const source=Object.freeze(reference()),calls:unknown[]=[];
  const html=renderToStaticMarkup(<Candidate2ReportExport {...props({source,onExport:ref=>calls.push(ref)})}/>);
  expect(calls).toEqual([]);expect(source).toEqual(reference());
  expect(html).toContain('data-c2-report-export');expect(html).toContain('不保存草稿、不追加审阅历史');expect(html).toContain('传统判断保持未知');expect(exportButton(html)).not.toContain('disabled');
 });
 it('emits a fresh frozen exact-three reference only for an explicit allowed action',()=>{
  const source=reference(),calls:Array<Readonly<Candidate2ReportReference>>=[];
  expect(dispatchCandidate2ReportExport(props({source,onExport:ref=>calls.push(ref)}))).toBe(true);
  expect(calls).toEqual([source]);expect(calls[0]).not.toBe(source);expect(Object.isFrozen(calls[0])).toBe(true);
  expect(Object.keys(calls[0]).sort()).toEqual(['expectedReviewRevision','expectedReviewToken','id']);
 });
 it.each([{busy:true},{disabled:true},{blockedReason:'当前方案待核对'},{source:null}])('blocks both rendered and callback actions for %j',patch=>{
  const calls:unknown[]=[];const input=props({...patch,onExport:ref=>calls.push(ref)});
  expect(exportButton(renderToStaticMarkup(<Candidate2ReportExport {...input}/>))).toContain('disabled');
  expect(dispatchCandidate2ReportExport(input)).toBe(false);expect(calls).toEqual([]);
 });
 it('does not treat a dirty draft as report content or perform an implicit save',()=>{
  const calls:unknown[]=[];const input=props({draftDirty:true,onExport:ref=>calls.push(ref)});
  const html=renderToStaticMarkup(<Candidate2ReportExport {...input}/>);
  expect(html).toContain('报告只包含已保存版本，草稿不进入报告');expect(calls).toEqual([]);
  expect(dispatchCandidate2ReportExport(input)).toBe(true);expect(calls).toEqual([reference()]);
 });
 it('escapes all controlled status, blocking and error text in SSR',()=>{
  const attack='<img src=x onerror="alert(1)"><script>window.x=1</script>';
  const html=renderToStaticMarkup(<Candidate2ReportExport {...props({notice:attack,error:attack,blockedReason:attack})}/>);
  expect(html).not.toContain('<img');expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).toContain('&quot;');
 });
 it('rejects a client snapshot, extra fields and accessors without invoking getters',()=>{
  let getters=0;const source=reference();
  expect(captureCandidate2ReportReference({...source,session:{candidates:[]}})).toBe(null);
  expect(captureCandidate2ReportReference({id:'client-full-session',candidates:[],analysis:{}})).toBe(null);
  expect(captureCandidate2ReportReference({...source,get expectedReviewToken(){getters++;return 'should-not-read';}})).toBe(null);expect(getters).toBe(0);
 });
 it.each([-1,NaN,Infinity,1.2,Number.MAX_SAFE_INTEGER+1])('rejects invalid explicit revision %s',revision=>{
  expect(captureCandidate2ReportReference({...reference(),expectedReviewRevision:revision})).toBe(null);
 });
 it('accepts revision zero and preserves exact opaque strings without trimming authority values',()=>{
  const source={id:' session-id ',expectedReviewRevision:0,expectedReviewToken:' token '};
  expect(captureCandidate2ReportReference(source)).toEqual(source);
 });
 it('does not swallow owner callback errors or silently fall back to a save route',()=>{
  const error=new Error('actual report route failed');
  expect(()=>dispatchCandidate2ReportExport(props({onExport:()=>{throw error;}}))).toThrow(error);
 });
 it('allows an explicit same-reference retry after controlled busy settles',()=>{
  const source=reference(),calls:unknown[]=[];const base=props({source,onExport:value=>calls.push(value)});
  expect(dispatchCandidate2ReportExport(base)).toBe(true);
  expect(dispatchCandidate2ReportExport({...base,busy:true})).toBe(false);
  expect(dispatchCandidate2ReportExport({...base,busy:false})).toBe(true);
  expect(calls).toEqual([source,source]);
 });
});
