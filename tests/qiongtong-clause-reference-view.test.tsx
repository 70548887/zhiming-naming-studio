import React from 'react';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {QiongtongClauseReferenceView} from '../src/renderer/QiongtongClauseReferenceView';
import type {QiongtongClauseReference} from '../src/shared/qiongtong-clause-reference';
import {evaluateQiongtongClauseReferences,type SafeChartInput140} from '../src/domain/traditional/qiongtong-clause-reference';
import dates from './fixtures/m548-six-date-rule-results.json';

const positions=['年柱','月柱','日柱','时柱'] as const;
function declaration(row:typeof dates[number]):SafeChartInput140 {
 return{pillars:row.actualPillars.map((text,index)=>({position:positions[index],gan:Array.from(text)[0] as SafeChartInput140['pillars'][number]['gan'],zhi:Array.from(text)[1] as SafeChartInput140['pillars'][number]['zhi']}))};
}
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const plain=(html:string)=>html.replace(/<[^>]*>/g,'');
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
function blocks(html:string){return [...html.matchAll(/<article\b[^>]*data-clause-id="([^"]+)"[^>]*>/g)].map(start=>{const tokens=/<\/?article\b[^>]*>/gi;tokens.lastIndex=start.index!;let depth=0;for(let token=tokens.exec(html);token;token=tokens.exec(html)){depth+=token[0].startsWith('</')?-1:1;if(depth===0)return{id:start[1],html:html.slice(start.index,tokens.lastIndex)};}throw Error('Unclosed clause article');});}
function render(reference:QiongtongClauseReference){const before=JSON.stringify(reference),html=renderToStaticMarkup(<QiongtongClauseReferenceView reference={freeze(reference)}/>);expect(JSON.stringify(reference)).toBe(before);return html;}

describe('M548 actual M508 DTO readonly rendering',()=>{
 it.each(dates)('$profile.birthDate $profile.birthTime $kind preserves its actual $status result',row=>{
  const result=evaluateQiongtongClauseReferences(declaration(row)),target=result.rules.find(rule=>rule.id===row.ruleId)!;
  expect(target.status).toBe(row.status);expect(target.literalFact).toEqual(row.literalFact);expect(target.source).toEqual(row.source);
  const html=render(result),rendered=blocks(html);expect(rendered.map(block=>block.id)).toEqual(result.rules.map(rule=>rule.existingConditionId));
  for(const [index,rule]of result.rules.entries()){
   const block=rendered[index].html;expect(block).toContain('data-clause-status="'+rule.status+'"');for(const value of [...rule.literalFact.evidence,...rule.literalFact.missing,rule.source.quote,rule.source.contextQuote,rule.source.locator,...rule.limitations])expect(block).toContain(escape(value));
   expect(block).toContain('这只是字句条件参考');expect(block).toContain('完整用神、从格和合化仍未裁定');expect(block).toContain('不是本次已选用神');expect(rule.actionEvaluation).toBe('not-evaluated');expect(rule.usefulGodDecision).toBe('not-evaluated');
   for(const item of rule.textReferences){expect(block).toContain(escape(item.stem));expect(block).toContain(escape(item.quote));}
  }
  expect(html).toContain(row.status==='condition-met'?'符合字面条件':'不符合字面条件');expect(html).toContain('不在本条适用范围');expect(html).toContain('完整用神、从格、合化和有效制化仍未判断');expect(html).toContain('固定电子转录');expect(result.namingImpact).toBe('none');
  expect(html).not.toMatch(/\bdata-(?:score|rank|recommendation)=/i);expect(plain(html)).not.toMatch(/(?:^|[。！？])(?:喜用已定|整名适合|已取用)[。！？]|评分[：:]\s*\d/);
 });
 it('shows missing and zero-rule states without claiming any completed condition',()=>{
  const empty=renderToStaticMarkup(<QiongtongClauseReferenceView/>);expect(empty).toContain('当前没有可展示');expect(blocks(empty)).toEqual([]);
  const zero={...evaluateQiongtongClauseReferences(declaration(dates[0])),rules:[]} as QiongtongClauseReference;const html=render(zero);expect(html).toContain('不把空列表解释为条件已满足');expect(blocks(html)).toEqual([]);
 });
 it('keeps missing-hour/unknown separate from decisive known negatives and not-applicable rules',()=>{
  const omitted=(index:number,position:typeof positions[number]):SafeChartInput140=>({pillars:declaration(dates[index]).pillars.filter(row=>row.position!==position),unknownPositions:[position]});
  const unknown=evaluateQiongtongClauseReferences(omitted(0,'时柱')),unknownRule=unknown.rules.find(rule=>rule.existingConditionId==='jia-hai-three-exposed')!;expect(unknownRule.status).toBe('unknown');const html=render(unknown);expect(html).toContain('部分出生资料尚未确定：时柱');expect(html).toContain('字面条件待定');expect(html).toContain('不在本条适用范围');
  // This true M508 negative still has a known 丙 in the retained 日支巳; removing the hour must not upgrade it to unknown.
  const knownNegative=evaluateQiongtongClauseReferences(omitted(5,'时柱')),negativeRule=knownNegative.rules.find(rule=>rule.existingConditionId==='yi-zi-no-bing-anywhere')!;expect(knownNegative.input.complete).toBe(false);expect(negativeRule.status).toBe('condition-not-met');const negativeHtml=render(knownNegative);expect(negativeHtml).toContain('部分出生资料尚未确定：时柱');expect(blocks(negativeHtml).find(block=>block.id==='yi-zi-no-bing-anywhere')!.html).toContain('不符合字面条件');
  const missingDay=evaluateQiongtongClauseReferences(omitted(0,'日柱'));expect(missingDay.input.dayStem).toBeNull();expect(render(missingDay)).toContain('日干：未知');
 });
 it('provides distinct region/heading names and native source disclosures without write or scoring controls',()=>{
  const html=renderToStaticMarkup(<><QiongtongClauseReferenceView reference={evaluateQiongtongClauseReferences(declaration(dates[0]))}/><QiongtongClauseReferenceView reference={evaluateQiongtongClauseReferences(declaration(dates[2]))}/></>),ids=[...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(match=>match[1]);
  expect(new Set(ids).size).toBe(ids.length);for(const id of ids)expect(html).toContain('id="'+id+'"');expect(html).toContain('<summary>查看本条原文和适用范围');expect(html).toContain('<summary>查看限制与仍待判断内容');expect(html).not.toMatch(/<(?:input|button|select|form)\b/i);
 });
 it('escapes detached hostile text instead of interpreting it as a source or action',()=>{
  const detached=structuredClone(evaluateQiongtongClauseReferences(declaration(dates[0])));detached.rules[0].literalFact.evidence=['<img src=x onerror=alert(1)>'];detached.rules[0].source.quote='<script>not a real source fixture</script>';
  const html=render(detached);expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');expect(html).not.toContain('<script>');expect(html).not.toContain('<img ');
 });
 it('M797 presents unknown input conditionally without requiring a guessed hour and keeps known-input semantics and unresolved scope explicit',()=>{
  const base=declaration(dates[0]),unknown=evaluateQiongtongClauseReferences({pillars:base.pillars.filter(row=>row.position!=='时柱'),unknownPositions:['时柱']}),html=render(unknown);expect(html).toContain('部分出生资料尚未确定：时柱');expect(html).toContain('当前按已知资料和本次实际返回的状态显示');expect(html).toContain('如后续取得完整记录，可补充后重新查阅');expect(html).not.toContain('请补全后重新查阅');expect(html).toContain('本条依据与待补资料');expect(html).toContain('这只是字句条件参考');expect(html).toContain('从格和合化仍未裁定');expect(html).toContain('查看本条原文和适用范围');
  const known=render(evaluateQiongtongClauseReferences(base));expect(known).toContain('四柱资料已知');expect(known).toContain('符合字面条件');expect(known).not.toMatch(/部分出生资料尚未确定|如后续取得完整记录/);expect(known).toContain('完整用神、从格、合化和有效制化仍未判断');
 });
});

describe('M755 r2 compiled CSS selector',()=>{
 it('compiles the actual stylesheet without warnings and targets the rendered boundary class',async()=>{
  const css=readFileSync(new URL('../src/renderer/QiongtongClauseReferenceView.css',import.meta.url),'utf8'),result=await transform(css,{loader:'css',logLevel:'silent'});
  expect(css).not.toContain('\\n');expect(result.warnings).toEqual([]);expect(result.code).toMatch(/(?:^|\n)\.qt-clause-user-boundary\s*\{/);expect(result.code).not.toMatch(/(?:^|\n)n\.qt-clause-user-boundary/);
  const {QiongtongClausePreviewPanel}=await import('../src/renderer/QiongtongClausePreviewPanel'),html=renderToStaticMarkup(<QiongtongClausePreviewPanel profile={dates[0].profile as unknown as import('../src/shared/types').BirthProfile}/>);
  expect(html).toContain('<p class="qt-clause-user-boundary">');
 });
});
