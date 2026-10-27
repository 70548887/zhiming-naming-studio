import React, { useId, useMemo, useState } from 'react';
import { ChevronRight, History, Search } from 'lucide-react';
import type { NamingSession } from '../shared/types';
import {
  DEFAULT_SESSION_FILTERS, filterSessions, formatSessionCreatedAt, sessionBatchLabel,
  sessionCustomerOptions, sessionFavoriteCount, validateSessionFilters,
} from '../shared/session-catalog';
import type { SessionFilters } from '../shared/session-catalog';

export interface SavedSessionsProps {
  sessions: NamingSession[];
  selectedId?: string;
  onSelect: (session: NamingSession) => void;
  busy?: boolean;
}

export function SavedSessions({ sessions, selectedId, onSelect, busy = false }: SavedSessionsProps) {
  const [filters, setFilters] = useState<SessionFilters>({ ...DEFAULT_SESSION_FILTERS });
  const [dateInputErrors, setDateInputErrors] = useState<Partial<Record<'dateFrom' | 'dateTo', string>>>({});
  const id = useId();
  const dateError = dateInputErrors.dateFrom || dateInputErrors.dateTo || validateSessionFilters(filters);
  const visible = useMemo(() => dateError ? [] : filterSessions(sessions, filters), [sessions, filters, dateError]);
  const customers = useMemo(() => sessionCustomerOptions(sessions), [sessions]);
  const filtered = !!dateError || Object.entries(DEFAULT_SESSION_FILTERS).some(([key, value]) => filters[key as keyof SessionFilters] !== value);
  const change = <K extends keyof SessionFilters>(key: K, value: SessionFilters[K]) => setFilters(current => ({ ...current, [key]: value }));
  const changeDate = (key: 'dateFrom' | 'dateTo', input: HTMLInputElement) => {
    setDateInputErrors(current => ({ ...current, [key]: input.validity.badInput ? `${key === 'dateFrom' ? '开始' : '结束'}日期无效，请输入完整的年月日。` : undefined }));
    change(key, input.value);
  };
  const clear = () => { setFilters({ ...DEFAULT_SESSION_FILTERS }); setDateInputErrors({}); };

  return <section className="panel saved-sessions session-catalog" aria-busy={busy} aria-label="已保存方案目录">
    <div className="panel-title"><History size={18} /><h2>已保存方案</h2><span className="muted tiny">{sessions.length} 份</span></div>
    {sessions.length === 0 ? <div className="catalog-empty"><strong>还没有保存的方案</strong><p>生成的每一组名字，都会作为独立方案保存在这里。</p></div> : <>
      <div className="catalog-filters">
        <div className="catalog-field catalog-search"><label htmlFor={`${id}-query`}>搜索方案</label><div className="catalog-search-input"><Search size={15} aria-hidden="true" /><input id={`${id}-query`} data-shortcut-search type="search" value={filters.query} placeholder="客户、父母姓名或候选名字" onChange={event => change('query', event.target.value)} /></div></div>
        <div className="catalog-filter-row">
          <div className="catalog-field"><label htmlFor={`${id}-customer`}>客户</label><select id={`${id}-customer`} value={filters.customerId} onChange={event => change('customerId', event.target.value)}><option value="">全部客户</option>{customers.map(customer => <option value={customer.id} key={customer.id}>{customer.label}</option>)}</select></div>
          <div className="catalog-field"><label htmlFor={`${id}-surname`}>姓氏</label><input id={`${id}-surname`} value={filters.surname} placeholder="如：王、欧阳" onChange={event => change('surname', event.target.value)} /></div>
        </div>
        <div className="catalog-filter-row catalog-dates">
          <div className="catalog-field"><label htmlFor={`${id}-from`}>开始日期</label><input id={`${id}-from`} type="date" value={filters.dateFrom} aria-invalid={!!dateError} aria-describedby={`${id}-date-note${dateError ? ` ${id}-date-error` : ''}`} onInput={event => changeDate('dateFrom', event.currentTarget)} onChange={event => changeDate('dateFrom', event.target)} onBlur={event => changeDate('dateFrom', event.target)} /></div>
          <div className="catalog-field"><label htmlFor={`${id}-to`}>结束日期</label><input id={`${id}-to`} type="date" value={filters.dateTo} aria-invalid={!!dateError} aria-describedby={`${id}-date-note${dateError ? ` ${id}-date-error` : ''}`} onInput={event => changeDate('dateTo', event.currentTarget)} onChange={event => changeDate('dateTo', event.target)} onBlur={event => changeDate('dateTo', event.target)} /></div>
        </div>
        <p className="catalog-hint" id={`${id}-date-note`}>按北京时间创建日期，包含起止当天。</p>
        {dateError && <p className="catalog-error" id={`${id}-date-error`} role="alert">{dateError}筛选暂未应用。</p>}
        <div className="catalog-filter-row">
          <div className="catalog-field"><label htmlFor={`${id}-favorite`}>收藏情况</label><select id={`${id}-favorite`} value={filters.favorite} onChange={event => change('favorite', event.target.value as SessionFilters['favorite'])}><option value="all">全部方案</option><option value="has">有收藏名字</option><option value="none">无收藏名字</option></select></div>
          <div className="catalog-field"><label htmlFor={`${id}-sort`}>生成时间排序</label><select id={`${id}-sort`} value={filters.sort} onChange={event => change('sort', event.target.value as SessionFilters['sort'])}><option value="newest">最新在前</option><option value="oldest">最早在前</option></select></div>
        </div>
        <div className="catalog-result-count"><span role="status" aria-live="polite">{dateError ? `请修正日期 · 共 ${sessions.length} 份` : `匹配 ${visible.length} / 共 ${sessions.length} 份`}</span><button className="text-button" disabled={!filtered} onClick={clear}>清空条件</button></div>
      </div>
      {!dateError && (visible.length ? <div className="catalog-list">{visible.map(session => <button className={`session-item catalog-item ${selectedId === session.id ? 'active' : ''}`} aria-current={selectedId === session.id ? 'true' : undefined} disabled={busy} key={session.id} title={`打开出生资料与偏好快照 · 完整方案编号：${session.id}`} onClick={() => onSelect(session)}>
        <span className="session-avatar" aria-hidden="true">{session.profile.surname}</span><span className="catalog-item-text"><strong>{session.profile.customerName || `${session.profile.surname}姓宝宝`}</strong><span className="catalog-batch">{sessionBatchLabel(session)}</span><small><time dateTime={session.createdAt}>{formatSessionCreatedAt(session.createdAt)}</time><span className="catalog-counts">{session.candidates.length} 个名字 · {sessionFavoriteCount(session)} 个收藏</span></small></span><ChevronRight size={15} aria-hidden="true" />
      </button>)}</div> : <div className="catalog-empty"><strong>没有匹配的方案</strong><p>试试其他客户、姓氏或时间范围，也可以清空筛选条件。</p><button className="button secondary" onClick={clear}>清空筛选条件</button></div>)}
    </>}
  </section>;
}
