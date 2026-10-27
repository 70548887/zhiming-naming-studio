import React from 'react';
import type { NamingSession } from '../shared/types';
import { safeSourceUrl, sessionSourceStatus, sourceHashLabel } from '../shared/session-sources';
import { sessionFactStatus } from '../shared/candidate-facts';
import { sessionNamingRuleStatus } from '../shared/naming-rule-status';
import './SessionSources.css';

/** This component only reads the saved manifest; it deliberately has no current-source registry prop. */
export function SessionSources({session}:{session:Pick<NamingSession,'dataVersion'|'sourceSnapshot'|'factVerification'|'namingRules'>}) {
  const state = sessionSourceStatus(session);
  const facts = sessionFactStatus(session);
  const naming = sessionNamingRuleStatus(session);
  return <section className="session-sources" aria-label="生成时资料来源">
    <div className={facts.status === 'unverified' ? 'session-source-warning' : 'session-source-notice'}><strong>{facts.label}</strong><p>{facts.notice}</p></div>
    <div className={'session-naming-rule-status '+(naming.status === 'recorded' ? 'session-source-notice' : 'session-source-warning')}><strong>{naming.label}</strong><p>{naming.notice}</p></div>
    <details>
      <summary>生成时资料来源<span>{state.status === 'recorded' ? `${state.sources.length} 项登记` : '未保存有效清单'}</span></summary>
      <p className="session-source-version">方案数据版本：{session.dataVersion}</p>
      <p className={state.status === 'recorded' ? 'session-source-notice' : 'session-source-warning'}>{state.notice}</p>
      {state.sources.map(source=><article className="session-source-record" key={source.id}>
        <h4>{source.name}</h4><p className="session-source-id">{source.id} · {source.license || '未登记许可'}</p>
        <dl>
          <dt>来源地址</dt><dd>{safeSourceUrl(source.url) ? <a href={safeSourceUrl(source.url)} target="_blank" rel="noopener noreferrer">{source.url}</a> : source.url || '未登记'}</dd>
          <dt>提交 / 版本</dt><dd>{source.commit || '未登记'}</dd>
          <dt>{sourceHashLabel(source)}</dt><dd>{source.sha256 || '未登记'}</dd>
        </dl>
        {source.note && <p className="session-source-note">{source.note}</p>}
        {source.files.length > 0 && <details className="session-source-files"><summary>登记文件（{source.files.length}）</summary><ul>{source.files.map((file,index)=><li key={index}>{file}</li>)}</ul></details>}
      </article>)}
    </details>
  </section>;
}
