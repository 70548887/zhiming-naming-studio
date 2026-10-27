import React from 'react';
import {loadNamingMeaningSemanticReview,namingMeaningSemanticReviewStatus} from '../shared/naming-meaning-semantic-review';
import './naming-coverage.css';

/** Candidate review facts only. This panel never contributes to coverage,
 * ranking, admission or score calculations. */
export function NamingMeaningReviewStatusPanel(){
  const status=namingMeaningSemanticReviewStatus(loadNamingMeaningSemanticReview());
  return <section className="naming-coverage-review" aria-label="候选审查状态" data-review-schema={status.schema} data-review-source-sha256={status.source.rawSHA256}>
    <header className="naming-coverage-review-heading"><div><h3>候选审查状态</h3><p>读取固定的 M916 逐字语义审查快照，仅作只读参考。</p></div><span className="naming-coverage-tag">candidate-only</span></header>
    <dl className="naming-coverage-review-grid">
      <div><dt>审查总数</dt><dd>{status.counts.total} 条</dd></div>
      <div><dt>一般逐字审查</dt><dd>{status.counts.general} 条<span>候选，不自动生效</span></dd></div>
      <div><dt>显式主题准入</dt><dd>{status.counts.explicitTheme} 条<span>未授权主题</span></dd></div>
      <div><dt>待定</dt><dd>{status.counts.pending} 条</dd></div>
    </dl>
    <p className="naming-coverage-review-boundary">admissionGranted=false · activation=off · formalCoverageAdded=0 · 全名评估未完成 · 不改变默认覆盖、候选排序或评分。</p>
    <p className="naming-coverage-review-source">版本 {status.ruleVersion} · 审查 {status.reviewId} · 原始输入摘要已固定校验。</p>
    {status.pending.length>0&&<div className="naming-coverage-review-pending"><h4>待定原因</h4><ul>{status.pending.map(item=><li key={item.char}><b>{item.char}</b>：{item.reason}</li>)}</ul></div>}
  </section>;
}
