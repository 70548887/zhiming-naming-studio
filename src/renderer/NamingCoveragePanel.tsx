import React, {useEffect, useId, useMemo, useRef, useSyncExternalStore} from 'react';
import type {CoverageAvailableDto} from '../shared/naming-coverage';
import {hasNamingCoverageApi, type NamingCoverageApi} from '../shared/naming-coverage-api';
import {availableCoverage, createNamingCoverageController, type NamingCoverageState} from './naming-coverage-state';
import './naming-coverage.css';
import {NamingMeaningReviewStatusPanel} from './NamingMeaningReviewStatusPanel';

export function NamingCoverageResults({coverage}: {coverage: CoverageAvailableDto}) {
  const {meanings, elements} = coverage;
  return <div className="naming-coverage-results">
    <p className="naming-coverage-total">当前字库 <strong>{coverage.characters.count}</strong> 字<span>按字库默认读音去重统计</span></p>
    <dl className="naming-coverage-grid">
      <div><dt>默认可展示的项目字义</dt><dd><strong>{meanings.defaultAutomatic.count}</strong> 字</dd><p>基础 {meanings.base.count} 字 · 自动补充 {meanings.supplementalAutomatic.count} 字 · 重叠 {meanings.baseVsSupplemental.intersection.count} 字</p></div>
      <div><dt>按需逐字说明</dt><dd><strong>{meanings.standaloneOnRequest.count}</strong> 字</dd><p>与默认字义重叠 {meanings.automaticVsStandalone.intersection.count} 字；合并展示材料 {meanings.displayMaterialUnion.count} 字，其中默认自动展示仍为 {meanings.defaultAutomatic.count} 字。</p></div>
      <div><dt>有条件的完整词语</dt><dd><strong>{meanings.conditionalWords.caseCount}</strong> 条</dd><p>须确认完整给名、读音、义项和场景，不叠加为自动字义或独立单字覆盖。</p></div>
      <div><dt>新增词语候选 <span className="naming-coverage-tag">默认关闭</span></dt><dd><strong>{meanings.b04ReadOnlyOff.caseCount}</strong> 条</dd><p>仅供只读查阅，正式覆盖增加 {meanings.b04ReadOnlyOff.formalCoverageAdded}；不计入自动字义。</p></div>
      <div><dt>原有项目五行标签</dt><dd><strong>{elements.originalLabels.count}</strong> 字</dd><p>{elements.originalUnknown.count} 字原无标签；原有标签也不表示传统姓名学的唯一归属。</p></div>
      <div><dt>意象候选 <span className="naming-coverage-tag">默认未激活</span></dt><dd><strong>{elements.imageryCandidates.count}</strong> 字</dd><p>均在原无标签字中，另有 {elements.imageryUnresolved.count} 字尚未闭合。需确认原义和条件，不等于传统五行已经确定。</p></div>
    </dl>
    <p className="naming-coverage-scope">这是当前默认读音的资料覆盖，不代表某个另选读音、整个姓名或推荐资格；查阅不改变候选排序、评分或五行归属。</p>
  </div>;
}

export interface NamingCoverageViewProps {
  readonly idPrefix: string;
  readonly state: NamingCoverageState;
  readonly available: boolean;
  readonly disabled?: boolean;
  readonly onQuery: () => void;
}
export function NamingCoverageView({idPrefix: id, state, available, disabled = false, onQuery}: NamingCoverageViewProps) {
  const loading = state.phase === 'loading', result = availableCoverage(state);
  const unavailable = state.phase === 'ready' && state.result?.status === 'unavailable';
  const failed = state.phase === 'error' || state.phase === 'ready' && !result && !unavailable;
  return <>
  <NamingMeaningReviewStatusPanel/>
  <section className="naming-coverage panel" aria-labelledby={id + '-heading'} aria-busy={loading}>
    <header className="naming-coverage-heading"><div><h2 id={id + '-heading'}>资料覆盖</h2><p>手动查看当前字库的字义、词语与五行资料范围。</p></div>
      <button className="button secondary" type="button" disabled={disabled || !available || loading} onClick={onQuery}>
        {loading ? '正在读取覆盖资料…' : failed || unavailable ? '重试读取资料覆盖' : result ? '重新读取资料覆盖' : '查看资料覆盖'}
      </button>
    </header>
    {!available ? <p className="naming-coverage-notice" role="status">资料覆盖服务尚未接通。</p>
      : state.phase === 'idle' ? <p className="naming-coverage-notice" role="status">{state.notice === 'api-changed' ? '资料服务已更新，请重新读取。' : '点击“查看资料覆盖”后读取，不会自动查询。'}</p> : null}
    {loading && <p className="naming-coverage-notice" role="status">正在核验当前资料，请稍候。</p>}
    {failed && <p className="naming-coverage-error" role="alert">暂时未能读取可核验的覆盖资料，请重试；当前不显示覆盖数量。</p>}
    {unavailable && <p className="naming-coverage-error" role="status">覆盖资料暂不可用，需待资料核验完成后重试；当前不显示覆盖数量。</p>}
    {available && result && <NamingCoverageResults coverage={result}/>}
  </section></>;
}

export interface NamingCoveragePanelProps {readonly api?: NamingCoverageApi; readonly disabled?: boolean;}
export function NamingCoveragePanel({api, disabled = false}: NamingCoveragePanelProps) {
  const id = useId(), latest = useRef({api, disabled});
  latest.current = {api, disabled};
  const controller = useMemo(() => createNamingCoverageController({getApi: () => latest.current.api, isDisabled: () => latest.current.disabled}), []);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  useEffect(() => controller.refreshApi(), [controller, api]);
  // Hide results in the render where the API changes, before the effect invalidates its request lease.
  const current: NamingCoverageState = state.api === api ? state : {phase: 'idle', api, notice: 'api-changed'};
  return <NamingCoverageView idPrefix={id} state={current} available={hasNamingCoverageApi(api)} disabled={disabled} onQuery={() => void controller.query()}/>;
}
