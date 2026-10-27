import React, { useId, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import { DEFAULT_SESSION_FILTERS, formatSessionCreatedAt, sessionBatchLabel, validateSessionFilters, type SessionFilters } from '../shared/session-catalog';
import type { CatalogState, SessionCatalogController } from './session-catalog-state';
import './SavedSessions.css';
import './PagedSavedSessions.css';

export interface PagedSavedSessionsProps {
  state: CatalogState;
  controller: SessionCatalogController;
  selectedId?: string;
  onSelect: (id: string) => void;
  busy?: boolean;
  detailLoadingId?: string;
  detailError?: string;
  onRetryDetail?: () => void;
}

/** The server owns filtering and ordering. This view never opens or filters candidate snapshots. */
export function PagedSavedSessions({ state, controller, selectedId, onSelect, busy = false, detailLoadingId, detailError, onRetryDetail }: PagedSavedSessionsProps) {
  const id = useId();
  const [dateInputErrors, setDateInputErrors] = useState<Partial<Record<'dateFrom' | 'dateTo', string>>>({});
  const { filters, phase, page } = state;
  const dateError = dateInputErrors.dateFrom || dateInputErrors.dateTo || validateSessionFilters(filters);
  const loading = phase === 'loading' || phase === 'idle';
  const filtered = !!dateError || Object.entries(DEFAULT_SESSION_FILTERS).some(([key, value]) => filters[key as keyof SessionFilters] !== value);
  const change = <K extends keyof SessionFilters>(key: K, value: SessionFilters[K]) => {
    const current = controller.getSnapshot().filters;
    if (current[key] !== value) controller.setFilters({ ...current, [key]: value });
  };
  const changeDate = (key: 'dateFrom' | 'dateTo', input: HTMLInputElement) => {
    const error = input.validity.badInput ? `${key === 'dateFrom' ? '开始' : '结束'}日期无效，请输入完整的年月日。` : undefined;
    setDateInputErrors(current => ({ ...current, [key]: error }));
    // A native incomplete date often exposes an empty value. Do not submit that as a cleared filter.
    if (!error) change(key, input.value);
  };
  const clear = () => { setDateInputErrors({}); controller.setFilters({ ...DEFAULT_SESSION_FILTERS }); };
  const items = !dateError && phase === 'ready' ? page?.items ?? [] : [];

  return <section className="panel saved-sessions session-catalog paged-session-catalog" aria-busy={busy || loading} aria-label="已保存方案目录">
    <div className="panel-title"><History size={18} /><h2>已保存方案</h2><span className="muted tiny">{state.total} 份</span><button type="button" className="text-button" disabled={busy||loading} onClick={()=>{void controller.refresh();}}>刷新目录</button></div>
    <div className="catalog-filters">
      <div className="catalog-field catalog-search"><label htmlFor={`${id}-query`}>搜索方案</label><div className="catalog-search-input"><Search size={15} aria-hidden="true" /><input id={`${id}-query`} data-shortcut-search type="search" value={filters.query} placeholder="客户、父母姓名或候选名字" onChange={event => change('query', event.target.value)} /></div></div>
      <div className="catalog-filter-row">
        <div className="catalog-field"><label htmlFor={`${id}-customer`}>客户</label><select id={`${id}-customer`} value={filters.customerId} onChange={event => change('customerId', event.target.value)}><option value="">全部客户</option>{state.customers.map(customer => <option value={customer.id} key={customer.id}>{customer.label}（{state.profileCounts[customer.id] ?? 0} 份）</option>)}</select></div>
        <div className="catalog-field"><label htmlFor={`${id}-surname`}>姓氏</label><input id={`${id}-surname`} value={filters.surname} placeholder="如：王、欧阳" onChange={event => change('surname', event.target.value)} /></div>
      </div>
      <div className="catalog-filter-row catalog-dates">
        <div className="catalog-field"><label htmlFor={`${id}-from`}>开始日期</label><input id={`${id}-from`} type="date" value={filters.dateFrom} aria-invalid={!!dateError} aria-describedby={`${id}-date-note${dateError ? ` ${id}-date-error` : ''}`} onInput={event => changeDate('dateFrom', event.currentTarget)} onChange={event => changeDate('dateFrom', event.target)} onBlur={event => changeDate('dateFrom', event.target)} /></div>
        <div className="catalog-field"><label htmlFor={`${id}-to`}>结束日期</label><input id={`${id}-to`} type="date" value={filters.dateTo} aria-invalid={!!dateError} aria-describedby={`${id}-date-note${dateError ? ` ${id}-date-error` : ''}`} onInput={event => changeDate('dateTo', event.currentTarget)} onChange={event => changeDate('dateTo', event.target)} onBlur={event => changeDate('dateTo', event.target)} /></div>
      </div>
      <p className="catalog-hint" id={`${id}-date-note`}>按北京时间创建日期，包含起止当天。筛选与排序查询全部已保存方案。</p>
      {dateError && <p className="catalog-error" id={`${id}-date-error`} role="alert">{dateError}筛选暂未应用。</p>}
      <div className="catalog-filter-row">
        <div className="catalog-field"><label htmlFor={`${id}-favorite`}>收藏情况</label><select id={`${id}-favorite`} value={filters.favorite} onChange={event => change('favorite', event.target.value as SessionFilters['favorite'])}><option value="all">全部方案</option><option value="has">有收藏名字</option><option value="none">无收藏名字</option></select></div>
        <div className="catalog-field"><label htmlFor={`${id}-sort`}>生成时间排序</label><select id={`${id}-sort`} value={filters.sort} onChange={event => change('sort', event.target.value as SessionFilters['sort'])}><option value="newest">最新在前</option><option value="oldest">最早在前</option></select></div>
      </div>
      <div className="catalog-result-count"><span role="status" aria-live="polite">{dateError ? `请修正日期 · 共 ${state.total} 份` : page && phase === 'ready' ? `匹配 ${page.matched} / 共 ${page.total} 份` : loading ? `正在读取目录 · 共 ${state.total} 份` : `共 ${state.total} 份`}</span><button type="button" className="text-button" disabled={!filtered} onClick={clear}>清空条件</button></div>
    </div>
    {detailLoadingId && <p className="catalog-detail-status" role="status">正在读取所选方案，当前草稿暂不切换。</p>}
    {detailError && <div className="catalog-detail-status catalog-detail-error" role="alert"><p>{detailError}</p>{onRetryDetail && <button type="button" className="button secondary" disabled={busy || !!detailLoadingId} onClick={onRetryDetail}>重试读取方案</button>}</div>}
    {!dateError && loading && <div className="catalog-empty" role="status">正在读取已保存方案目录…</div>}
    {!dateError && phase === 'error' && <div className="catalog-empty catalog-load-error" role="alert"><strong>方案目录读取失败</strong><p>{state.error || '请重试读取目录。'}</p><button type="button" className="button secondary" onClick={() => { void controller.retry(); }}>重试读取目录</button></div>}
    {!dateError && phase === 'ready' && (items.length ? <div className="catalog-list">{items.map(session => <button type="button" className={`session-item catalog-item ${selectedId === session.id ? 'active' : ''}`} aria-current={selectedId === session.id ? 'true' : undefined} aria-busy={detailLoadingId === session.id} disabled={busy || detailLoadingId === session.id} key={session.id} title={`按需打开出生资料与偏好快照 · 完整方案编号：${session.id}`} onClick={() => onSelect(session.id)}>
      <span className="session-avatar" aria-hidden="true">{session.profile.surname}</span><span className="catalog-item-text"><strong>{session.profile.customerName || `${session.profile.surname}姓宝宝`}</strong><span className="catalog-batch">{sessionBatchLabel(session)}</span><small><time dateTime={session.createdAt}>{formatSessionCreatedAt(session.createdAt)}</time><span className="catalog-counts">{session.candidateCount} 个名字 · {session.favoriteCount} 个收藏</span></small>{detailLoadingId === session.id && <span className="catalog-reading">正在读取完整方案…</span>}</span><ChevronRight size={15} aria-hidden="true" />
    </button>)}</div> : <div className="catalog-empty"><strong>{page?.total === 0 ? '还没有保存的方案' : '没有匹配的方案'}</strong><p>{page?.total === 0 ? '生成的每一组名字，都会作为独立方案保存在这里。' : '试试其他客户、姓氏或时间范围，也可以清空筛选条件。'}</p>{filtered && <button type="button" className="button secondary" onClick={clear}>清空筛选条件</button>}</div>)}
    {!dateError && <nav className="catalog-pagination" aria-label="方案目录分页"><button type="button" className="button secondary" disabled={busy || loading || state.pageNumber <= 1} onClick={() => { void controller.previous(); }}><ChevronLeft size={14} aria-hidden="true" />上一页</button><span aria-live="polite">第 {state.pageNumber} 页{phase === 'ready' && page ? ` · 本页 ${page.items.length} 份` : ''}</span><button type="button" className="button secondary" disabled={busy || phase !== 'ready' || !page?.nextCursor} onClick={() => { void controller.next(); }}>下一页<ChevronRight size={14} aria-hidden="true" /></button></nav>}
  </section>;
}
