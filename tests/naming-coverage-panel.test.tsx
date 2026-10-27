import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import type {CoverageAvailableDto, CoverageSetDto, CoverageWordDto} from '../src/shared/naming-coverage';
import {NamingCoveragePanel, NamingCoverageView} from '../src/renderer/NamingCoveragePanel';
import {isNamingCoverageResponse} from '../src/renderer/naming-coverage-state';
import actualJson from './fixtures/naming-coverage-actual.json';

const actual = actualJson as unknown as CoverageAvailableDto;
const render = (result: CoverageAvailableDto) => renderToStaticMarkup(<NamingCoverageView idPrefix="coverage" available state={{phase: 'ready', api: undefined, result}} onQuery={() => {}}/>);
// A display-only synthetic DTO proves the component uses supplied sets, not historical totals.
function smallDisplayFixture(): CoverageAvailableDto {
  const set = (characters: readonly string[]): CoverageSetDto => ({count: characters.length, characters});
  const relation = (left: readonly string[], right: readonly string[]) => ({intersection: set(left.filter(char => right.includes(char))), union: set([...new Set([...left, ...right])]), leftOnly: set(left.filter(char => !right.includes(char))), rightOnly: set(right.filter(char => !left.includes(char)))});
  const word = (target: string, givenName: string): CoverageWordDto => ({caseCount: 1, targetCharacters: set([target]), givenNames: [givenName], requiresWholeWord: true, requiresConfirmedReadings: true, requiresExplicitChoice: true, includedInAutomatic: false, includedInStandalone: false});
  const baseVsSupplemental = relation(['甲', '乙'], ['乙', '丙']), automaticVsStandalone = relation(baseVsSupplemental.union.characters, ['丙', '丁']);
  return {...structuredClone(actual), sources: [], explanations: [], characters: set(['甲', '乙', '丙', '丁', '戊']),
    meanings: {base: set(['甲', '乙']), supplementalAutomatic: set(['乙', '丙']), baseVsSupplemental, defaultAutomatic: baseVsSupplemental.union,
      standaloneOnRequest: set(['丙', '丁']), automaticVsStandalone, displayMaterialUnion: automaticVsStandalone.union, withoutAutomaticOrStandalone: set(['戊']),
      conditionalWords: word('甲', '甲乙'), b04ReadOnlyOff: {...word('丁', '丁戊'), activation: 'off', productionApproved: false, formalCoverageAdded: 0}},
    elements: {originalLabels: set(['甲', '乙']), originalUnknown: set(['丙', '丁', '戊']), imageryCandidates: set(['丁']), imageryUnresolved: set(['丙', '戊']), imageryActivation: 'off', newDefaultEffectiveElements: [] as const, imageryEstablishesTraditionalElements: false}};
}

describe('read-only naming coverage panel', () => {
  it('renders one manual action without querying on render or accepting a path or reading input', () => {
    const getNamingCoverage = vi.fn(async () => actual);
    const html = renderToStaticMarkup(<NamingCoveragePanel api={{getNamingCoverage}}/>);
    expect(getNamingCoverage).not.toHaveBeenCalled();
    expect(html).toContain('资料覆盖'); expect(html).toContain('查看资料覆盖'); expect(html).toContain('不会自动查询');
    expect([...html.matchAll(/<button\b/g)].length).toBe(1);
    expect(html).not.toContain('<input'); expect(html).not.toContain('<strong>'); expect(html).not.toMatch(/保存|AI|评分按钮/);
    const missing = renderToStaticMarkup(<NamingCoveragePanel/>);
    expect(missing).toContain('资料覆盖服务尚未接通'); expect(missing).toMatch(/<button[^>]*disabled/);
  });

  it('shows actual DTO counts in distinct automatic, on-request, words and inactive element scopes', () => {
    const before = JSON.stringify(actual), html = render(actual);
    expect(html).toContain('当前字库 <strong>' + actual.characters.count + '</strong> 字');
    expect(html).toContain('默认可展示的项目字义</dt><dd><strong>' + actual.meanings.defaultAutomatic.count + '</strong> 字');
    expect(html).toContain('按需逐字说明</dt><dd><strong>' + actual.meanings.standaloneOnRequest.count + '</strong> 字');
    expect(html).toContain('合并展示材料 ' + actual.meanings.displayMaterialUnion.count + ' 字，其中默认自动展示仍为 ' + actual.meanings.defaultAutomatic.count + ' 字');
    expect(html).toContain('有条件的完整词语</dt><dd><strong>' + actual.meanings.conditionalWords.caseCount + '</strong> 条');
    expect(html).toContain('默认关闭'); expect(html).toContain('正式覆盖增加 ' + actual.meanings.b04ReadOnlyOff.formalCoverageAdded);
    expect(html).toContain('默认未激活'); expect(html).toContain('不等于传统五行已经确定'); expect(html).toContain('不代表某个另选读音');
    expect(html).not.toMatch(/datasetSha256|packSha256|sourceId|[A-Z]:[\\/]/);
    expect(JSON.stringify(actual)).toBe(before);
  });

  it('uses changed and overlapping input sets instead of adding historical totals or word cases', () => {
    const fixture = smallDisplayFixture(); expect(isNamingCoverageResponse(fixture)).toBe(true);
    const html = render(fixture);
    expect(html).toContain('当前字库 <strong>5</strong> 字');
    expect(html).toContain('默认可展示的项目字义</dt><dd><strong>3</strong> 字');
    expect(html).toContain('基础 2 字 · 自动补充 2 字 · 重叠 1 字');
    expect(html).toContain('合并展示材料 4 字，其中默认自动展示仍为 3 字');
    expect(html).toContain('不叠加为自动字义或独立单字覆盖');
    expect(html).not.toMatch(/779|217|304|521|581|257|522/);
  });

  it('hides counts while loading, on unavailable and errors, and never renders service error text', () => {
    const unavailable = {schema: 'naming-coverage/1', status: 'unavailable', reason: 'missing-source', message: 'D:/private/raw/license.json', characters: actual.characters} as const;
    const states = [
      {phase: 'loading' as const, api: undefined, result: actual},
      {phase: 'error' as const, api: undefined, result: actual, errorKind: 'request' as const},
      {phase: 'ready' as const, api: undefined, result: unavailable}
    ];
    for (const state of states) {
      const html = renderToStaticMarkup(<NamingCoverageView idPrefix="coverage" available state={state} onQuery={() => {}}/>);
      expect(html).not.toContain('<strong>'); expect(html).not.toContain('779'); expect(html).not.toContain('D:/'); expect(html).not.toContain('license.json');
      if (state.phase === 'loading') { expect(html).toContain('aria-busy="true"'); expect(html).toMatch(/<button[^>]*disabled/); }
      else { expect(html).toContain('当前不显示覆盖数量'); expect(html).toContain('重试读取资料覆盖'); }
    }
    const changed = renderToStaticMarkup(<NamingCoverageView idPrefix="coverage" available state={{phase: 'idle', api: undefined, notice: 'api-changed'}} onQuery={() => {}}/>);
    expect(changed).toContain('资料服务已更新，请重新读取'); expect(changed).not.toContain('<strong>');
  });
});
