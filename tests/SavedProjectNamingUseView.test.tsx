import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {SavedProjectNamingUseView} from '../src/renderer/SavedProjectNamingUseView';
import type {SessionSourceSnapshot,SourceRecord} from '../src/shared/types';

const METHOD='project-bazi-mainchain-145/1.3.1';
const POLICY='naming-element-application/1.0.0';
const UNSUPPORTED='此保存记录的项目命名取法暂不支持展示';
const fixture=(entryPolicy:'month-branch-only'|'month-stem-proposal'='month-branch-only')=>({
 schema:'project-naming-use/1',selection:{methodId:METHOD,entryPolicy},
 sourceRecipe:{schema:'naming-element-source-recipe/1',source:'project',namingRulesVersion:'naming-editorial-7.0.0',applicationPolicyVersion:POLICY},
 engineCertificate:{
  schema:'bazi-root-feedback-application-certificate/1.0.0',methodId:METHOD,applicationPolicyVersion:POLICY,entryPolicy,profileId:'saved-profile-156',
  resourceIdentity:{schema:'bazi-root-feedback-resource-identity/1',methodId:METHOD,applicationPolicyVersion:POLICY,publicationId:'saved-publication-2025',manifestSha256:'a'.repeat(64),sourceRevision:'saved-resource-revision-2025',kernel:{methodId:'saved-pinned-kernel/1.3.1',sourceRevision:'saved-kernel-revision-2025'},files:[{path:'saved/rules.json',bytes:156,sha256:'b'.repeat(64),kind:'rule'}]},
  mainchainOpinion:{methodId:METHOD,entryPolicy},effectiveElements:{primary:['水'],secondary:['金'],avoid:['火'],applied:['水','金']}
 },
 application:{policyId:POLICY,status:'applied',primary:['水'],secondary:['金'],avoid:['火'],effectiveElements:['水','金']}
});
const source=(id:string,name:string):SourceRecord=>({id,name,url:'https://saved.example.test/2025',commit:`${name}-保存修订`,sha256:`${name}-保存哈希`,license:'保存的许可',files:[`saved/${name}.json`],note:'生成时保存的来源说明'});
const sources=():SessionSourceSnapshot=>({version:'session-sources/1.0.0',dataVersion:'saved-data-v2025',sources:[source('project-bazi-mainchain-145','旧主链资料'),source('naming-element-application-v1','旧采用协议'),source('irrelevant-source','无关资料') ]});
const html=(snapshot:unknown=fixture(),options:{compact?:boolean;sourceSnapshot?:SessionSourceSnapshot;id?:string}={})=>renderToStaticMarkup(<SavedProjectNamingUseView snapshot={snapshot} {...options}/>);

afterEach(()=>vi.unstubAllGlobals());

describe('saved project naming adoption view',()=>{
 it('leaves absent snapshots absent in full and compact views',()=>{
  expect(renderToStaticMarkup(<SavedProjectNamingUseView/>)).toBe('');
  expect(renderToStaticMarkup(<SavedProjectNamingUseView snapshot={undefined} compact/>)).toBe('');
 });

 it('keeps explicit null, unknown schemas and unknown selections visibly unsupported',()=>{
  for(const snapshot of [null,{},'saved',[],{...fixture(),schema:'project-naming-use/2'}, {...fixture(),selection:{methodId:'project-bazi-mainchain-145/1.4.0',entryPolicy:'month-branch-only'}},{...fixture(),selection:{methodId:METHOD,entryPolicy:'unknown-entry'}},{...fixture(),selection:{...fixture().selection,approved:true}}]){
   const output=html(snapshot);
   expect(output).toContain(UNSUPPORTED);expect(output).not.toContain('主用');expect(output).not.toContain('未保存来源记录');expect(output).not.toContain('旧方案');
  }
 });

 it('requires the exact saved source recipe and registered naming/application tuple',()=>{
  const changes=[{schema:'naming-element-source-recipe/2'},{source:'manual'},{namingRulesVersion:'naming-editorial-6.0.0'},{namingRulesVersion:'naming-editorial-7.2.0'},{applicationPolicyVersion:'naming-element-application/2.0.0'}];
  for(const change of changes){const saved=fixture();Object.assign(saved.sourceRecipe,change);expect(html(saved)).toContain(UNSUPPORTED);}
  const blocked=fixture();blocked.application.status='blocked';expect(html(blocked)).toContain(UNSUPPORTED);
 });

 it('renders the registered saved7.1 tuple while keeping the historical7.0 fixture unchanged',()=>{
  const saved=fixture();saved.sourceRecipe.namingRulesVersion='naming-editorial-7.1.0';const before=JSON.stringify(saved);
  const full=html(saved,{sourceSnapshot:sources()}),compact=html(saved,{compact:true,sourceSnapshot:sources()});
  expect(full).not.toContain(UNSUPPORTED);expect(full).toContain('naming-editorial-7.1.0');
  expect(full).toContain('<dt>实际选字五行</dt><dd>水、金</dd>');expect(full).toContain('saved-publication-2025');
  expect(compact).not.toContain(UNSUPPORTED);expect(compact).toContain('实际选字五行：水、金');
  expect(JSON.stringify(saved)).toBe(before);expect(fixture().sourceRecipe.namingRulesVersion).toBe('naming-editorial-7.0.0');
 });

 it('shows both saved entry policies without selecting an entry or deriving elements',()=>{
  for(const [entryPolicy,label] of [['month-branch-only','月支入式'],['month-stem-proposal','月干透干提案']] as const){
   const output=html(fixture(entryPolicy),{sourceSnapshot:sources(),id:'saved-adoption'});
   expect(output).toContain('本方案已保存的采用记录');expect(output).toContain(label);expect(output).toContain(entryPolicy);expect(output).toContain('aria-labelledby="saved-adoption-heading"');
   expect(output).toContain('<dt>主用</dt><dd>水</dd>');expect(output).toContain('<dt>辅用</dt><dd>金</dd>');expect(output).toContain('<dt>回避</dt><dd>火</dd>');expect(output).toContain('<dt>实际选字五行</dt><dd>水、金</dd>');
  }
 });

 it('labels saved empty element rows as not listed without filling them',()=>{
  const saved=fixture();saved.application.secondary=[];saved.application.avoid=[];saved.application.effectiveElements=['水'];saved.engineCertificate.effectiveElements.secondary=[];saved.engineCertificate.effectiveElements.avoid=[];saved.engineCertificate.effectiveElements.applied=['水'];
  const output=html(saved);expect(output).toContain('<dt>辅用</dt><dd>未列出</dd>');expect(output).toContain('<dt>回避</dt><dd>未列出</dd>');expect(output).toContain('<dt>实际选字五行</dt><dd>水</dd>');
 });

 it('suppresses contradictory certificate entry, method, application and resource identities',()=>{
  const mutations=[
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.entryPolicy='month-stem-proposal';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.methodId='other-method';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.profileId='';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.mainchainOpinion.entryPolicy='month-stem-proposal';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.resourceIdentity.methodId='other-method';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.resourceIdentity.applicationPolicyVersion='other-policy';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.resourceIdentity.kernel.sourceRevision='';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.resourceIdentity.files[0].sha256='not-a-hash';},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.resourceIdentity.files[0].bytes=-1;},
   (saved:ReturnType<typeof fixture>)=>{saved.engineCertificate.effectiveElements.applied=['木'];},
   (saved:ReturnType<typeof fixture>)=>{saved.application.policyId='other-policy';}
  ];
  for(const mutate of mutations){const saved=fixture();mutate(saved);const output=html(saved);expect(output).toContain(UNSUPPORTED);expect(output).not.toContain('实际选字五行');}
 });

 it('does not display malformed, duplicated or conflicting element lists',()=>{
  for(const primary of [['木','木'],['水','风'],null]){const saved=fixture();Object.assign(saved.application,{primary});expect(html(saved)).toContain(UNSUPPORTED);}
  const conflict=fixture();conflict.application.avoid=['水'];conflict.engineCertificate.effectiveElements.avoid=['水'];expect(html(conflict)).toContain(UNSUPPORTED);
 });

 it('keeps the saved revision and file identities visible independently of current globals',()=>{
  const query=vi.fn(()=>{throw Error('saved view queried live state');}),fetch=vi.fn(()=>{throw Error('saved view fetched');});
  const current={sourceRevision:'current-revision-2026',preferredElements:['木'],profileId:'current-profile'};
  vi.stubGlobal('window',{studio:{previewProjectNaming:query},currentSources:current});vi.stubGlobal('fetch',fetch);
  const saved=fixture(),savedSources=sources(),before=JSON.stringify(saved),first=html(saved,{sourceSnapshot:savedSources});
  current.sourceRevision='new-current-revision';current.preferredElements=['土'];
  expect(html(saved,{sourceSnapshot:savedSources})).toBe(first);expect(JSON.stringify(saved)).toBe(before);
  for(const value of [METHOD,'naming-editorial-7.0.0',POLICY,'saved-publication-2025','a'.repeat(64),'saved-resource-revision-2025','saved-pinned-kernel/1.3.1','saved-kernel-revision-2025','saved/rules.json','156','b'.repeat(64),'rule','旧主链资料-保存修订','旧采用协议-保存哈希','保存的许可','saved/旧主链资料.json'])expect(first).toContain(value);
  expect(first).not.toContain('current-revision');expect(first).not.toContain('无关资料');expect(query).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 });

 it('reports each missing fixed saved source without filling from a live registry',()=>{
  const savedSources=sources();savedSources.sources=savedSources.sources.filter(row=>row.id!=='naming-element-application-v1');
  const output=html(fixture(),{sourceSnapshot:savedSources});expect(output).toContain('旧主链资料');expect(output).toContain('未保存来源记录：naming-element-application-v1');
  const missing=html();expect(missing).toContain('未保存来源记录：project-bazi-mainchain-145');expect(missing).toContain('未保存来源记录：naming-element-application-v1');
 });

 it('compact rendering retains saved method, entry and actual elements while omitting details',()=>{
  const output=html(fixture('month-stem-proposal'),{compact:true,sourceSnapshot:sources()});
  expect(output).toContain('本方案已保存的采用记录');expect(output).toContain(METHOD);expect(output).toContain('月干透干提案');expect(output).toContain('实际选字五行：水、金');
  expect(output).not.toContain('<details');expect(output).not.toContain('saved-publication-2025');expect(output).not.toContain('旧主链资料');
 });

 it('renders saved strings as escaped text, including unsafe source URLs',()=>{
  const saved=fixture(),savedSources=sources();saved.engineCertificate.profileId='<script>profile()</script>';saved.engineCertificate.resourceIdentity.publicationId='<img src=x onerror=bad>';saved.engineCertificate.resourceIdentity.files[0].path='<svg onload=bad>';
  savedSources.sources[0].name='<script>source()</script>';savedSources.sources[0].url='javascript:alert(1)';savedSources.sources[0].files=['<img src=x>'];
  const output=html(saved,{sourceSnapshot:savedSources});
  expect(output).toContain('&lt;script&gt;profile()&lt;/script&gt;');expect(output).toContain('&lt;img');expect(output).toContain('&lt;svg');expect(output).toContain('javascript:alert(1)');expect(output).not.toContain('<script>');expect(output).not.toContain('<img');expect(output).not.toContain('href=');
 });

 it('does not invoke accessors or script hooks in supported, unknown or source records',()=>{
  const invoked=vi.fn(()=>{throw Error('record script executed');});
  const accessor=fixture();Object.defineProperty(accessor.engineCertificate.resourceIdentity,'publicationId',{enumerable:true,get:invoked});
  const unknown={schema:'project-naming-use/future'};Object.defineProperty(unknown,'payload',{enumerable:true,get:invoked});
  const scripted={...fixture(),toJSON:invoked};
  for(const saved of [accessor,unknown,scripted])expect(html(saved)).toContain(UNSUPPORTED);
  const sourceAccessor=sources();Object.defineProperty(sourceAccessor.sources[0],'name',{enumerable:true,get:invoked});expect(html(fixture(),{sourceSnapshot:sourceAccessor})).toContain('此保存来源清单暂不支持展示');
  const sourceScript=sources();Object.assign(sourceScript.sources[0],{toJSON:invoked});expect(html(fixture(),{sourceSnapshot:sourceScript})).toContain('此保存来源清单暂不支持展示');
  expect(invoked).not.toHaveBeenCalled();
 });
});
