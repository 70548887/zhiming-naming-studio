import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {sessionNamingRuleStatus} from '../src/shared/naming-rule-status';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import {CURRENT_NAMING_RULE_VERSION,NAMING_RULE_SOURCE_ID,NAMING_RULE_V4_VERSION,NAMING_RULE_V4_SOURCE_ID,NAMING_RULE_V5_VERSION,NAMING_RULE_V5_SOURCE_ID,NAMING_RULE_V6_VERSION,NAMING_RULE_V6_SOURCE_ID,NAMING_RULE_V7_VERSION,NAMING_RULE_V7_SOURCE_ID,NAMING_RULE_V71_VERSION,NAMING_RULE_V71_SOURCE_ID} from '../src/shared/naming-rules';
import {SessionSources} from '../src/renderer/SessionSources';
import {sessionSourcesReport} from '../src/main/session-sources-report';
import type {NamingSession,SourceRecord} from '../src/shared/types';

const source:SourceRecord={id:NAMING_RULE_SOURCE_ID,name:'读音适用规则',url:'',commit:CURRENT_NAMING_RULE_VERSION,license:'CC0-1.0',files:[],sha256:'a'.repeat(64),note:'测试展示；有效来源另由主进程核验'};
const current={dataVersion:'pack-1',namingRules:{version:CURRENT_NAMING_RULE_VERSION,dataVersion:'pack-1',sourceId:NAMING_RULE_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot('pack-1',[source])};

describe('saved naming rule boundary in UI and PDF',()=>{
 it('keeps the explicit saved7.0 display-only review scope and separate whole-name source checks',()=>{
  const saved={dataVersion:'original-pack7',namingRules:{version:NAMING_RULE_V7_VERSION,dataVersion:'original-pack7',sourceId:NAMING_RULE_V7_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot('original-pack7',[{...source,id:NAMING_RULE_V7_SOURCE_ID,commit:NAMING_RULE_V7_VERSION}])};
  const state=sessionNamingRuleStatus(saved);expect(state.status).toBe('recorded');
  for(const text of ['304字逐字说明仅供展示','不额外增加语义、主题或行业评分','需要人工确认、待审及暂不推荐','完整名字的出处另按原文、摘录和义项独立核对','词典原义、项目取意与家庭期许分别保留','不表示每个字义或名字均已通过人工审定'])expect(state.notice).toContain(text);
  expect(state.label).toBe('逐字释义与整名出处分别核对');
  expect(state.notice).toContain(NAMING_RULE_V7_VERSION);expect(state.notice).not.toContain(CURRENT_NAMING_RULE_VERSION);
  for(const html of [renderToStaticMarkup(<SessionSources session={saved}/>),sessionSourcesReport(saved)]){expect(html).toContain(state.label);expect(html).toContain(NAMING_RULE_V7_VERSION);expect(html).not.toContain(CURRENT_NAMING_RULE_VERSION);expect(html).not.toContain('历史方案保留原解释与评分');}
 });
 it('shows the actual current7.1 branch without relabeling saved7.0 scope',()=>{
  expect(current.namingRules.version).toBe(NAMING_RULE_V71_VERSION);expect(current.namingRules.sourceId).toBe(NAMING_RULE_V71_SOURCE_ID);
  const state=sessionNamingRuleStatus(current);expect(state.status).toBe('recorded');expect(state.label).toBe('逐字项目说明与整名采用义分别保存');
  for(const text of ['沿用7.0选名、出处与排序','新增40条说明仅按已审字音与实际字位提供独立项目取意','不表示完整姓名已获批准','不增加语义、行业或其他排序分','历史方案按各自保存版本保留'])expect(state.notice).toContain(text);
  expect(state.notice).toContain(CURRENT_NAMING_RULE_VERSION);expect(state.notice).not.toContain('304字逐字说明仅供展示');
  for(const html of [renderToStaticMarkup(<SessionSources session={current}/>),sessionSourcesReport(current)]){expect(html).toContain(state.label);expect(html).toContain(CURRENT_NAMING_RULE_VERSION);expect(html).not.toContain('历史方案保留原解释与评分');}
 });
 it('keeps the exact saved6 notice without applying7 display-only additions',()=>{
  const saved={dataVersion:'original-pack6',namingRules:{version:NAMING_RULE_V6_VERSION,dataVersion:'original-pack6',sourceId:NAMING_RULE_V6_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot('original-pack6',[{...source,id:NAMING_RULE_V6_SOURCE_ID,commit:NAMING_RULE_V6_VERSION}])};
  const before=JSON.stringify(saved),state=sessionNamingRuleStatus(saved);expect(state.status).toBe('recorded');expect(state.notice).toBe('项目释义、组合寓意与语义加分仅用于登记的读音、字典词条及已审用途；词条以本方案生成时保存的字库为准。其他读音保留对应字典释义或参照并提示待审。逐名出处仍须匹配原文、摘录和义项。规则 naming-editorial-6.0.0；本项不表示每个字义或名字均已通过人工审定。');expect(state.notice).not.toContain('304字');expect(state.notice).not.toContain(CURRENT_NAMING_RULE_VERSION);expect(JSON.stringify(saved)).toBe(before);
  for(const html of [renderToStaticMarkup(<SessionSources session={saved}/>),sessionSourcesReport(saved)]){expect(html).toContain(state.notice);expect(html).not.toContain(CURRENT_NAMING_RULE_VERSION);}
 });
 it('keeps saved5 scope and wording without claiming the new dictionary review applied to it',()=>{
  const saved={dataVersion:'original-pack5',namingRules:{version:NAMING_RULE_V5_VERSION,dataVersion:'original-pack5',sourceId:NAMING_RULE_V5_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot('original-pack5',[{...source,id:NAMING_RULE_V5_SOURCE_ID,commit:NAMING_RULE_V5_VERSION}])};
  const before=JSON.stringify(saved),state=sessionNamingRuleStatus(saved);expect(state.status).toBe('recorded');expect(state.notice).toBe('项目释义、组合寓意与语义加分仅用于登记的读音和字典词条；逐名出处还须匹配所审原文、摘录与义项。其他读音保留对应字典释义并提示待审。规则 naming-editorial-5.0.0；本项不表示每个字义或名字均已通过人工审定。');expect(state.notice).not.toContain('已审用途');expect(state.notice).not.toContain(CURRENT_NAMING_RULE_VERSION);expect(JSON.stringify(saved)).toBe(before);
 });
 it('keeps the explicit saved4 explanation rather than displaying the new5 scope on it',()=>{
  const saved={dataVersion:'original-pack4',namingRules:{version:NAMING_RULE_V4_VERSION,dataVersion:'original-pack4',sourceId:NAMING_RULE_V4_SOURCE_ID},sourceSnapshot:createSessionSourceSnapshot('original-pack4',[{...source,id:NAMING_RULE_V4_SOURCE_ID,commit:NAMING_RULE_V4_VERSION}])};
  const before=JSON.stringify(saved),state=sessionNamingRuleStatus(saved);expect(state.status).toBe('recorded');expect(state.notice).toContain(NAMING_RULE_V4_VERSION);expect(state.notice).not.toContain('逐名出处');expect(state.notice).not.toContain(CURRENT_NAMING_RULE_VERSION);expect(JSON.stringify(saved)).toBe(before);
 });
 it('preserves legacy absence while making archived-fact verification and semantic review distinct',()=>{
  const session:Pick<NamingSession,'dataVersion'|'factVerification'>={dataVersion:'old',factVerification:{version:'candidate-facts/1.0.0',status:'verified-archive',dataVersion:'old',datasetSha256:'b'.repeat(64)}};
  const before=JSON.stringify(session),state=sessionNamingRuleStatus(session);expect(state.status).toBe('legacy');
  for(const html of [renderToStaticMarkup(<SessionSources session={session}/>),sessionSourcesReport(session)]){expect(html).toContain('已按生成时知识包归档核对');expect(html).toContain('历史方案保留原解释与评分');expect(html).toContain('未按新规则重算');expect(html).not.toContain(CURRENT_NAMING_RULE_VERSION);}
  expect(JSON.stringify(session)).toBe(before);expect(Object.hasOwn(session,'namingRules')).toBe(false);
 });
 it('does not display a malformed or one-sided marker as current or assign it to legacy',()=>{
  for(const value of [{...current,namingRules:undefined},{...current,sourceSnapshot:undefined},{...current,namingRules:{...current.namingRules,dataVersion:'other'}},{...current,namingRules:{...current.namingRules,version:'naming-editorial-99.0.0'}}]){
   const state=sessionNamingRuleStatus(value as typeof current);expect(state.status).toBe('invalid');expect(state.label).toBe('命名释义规则记录不一致');expect(sessionSourcesReport(value as typeof current)).not.toContain('命名释义已绑定适用读音');
  }
 });
});
