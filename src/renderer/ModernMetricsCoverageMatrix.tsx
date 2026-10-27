import React from 'react';
import {buildModernMetricsCoverage,type ModernMetricsCandidate} from '../shared/modern-metrics';
import {savedParentNamePhoneticsDisplay} from './SavedParentNamePhoneticsView';

export function ModernMetricsCoverageMatrix({candidate}:{candidate:ModernMetricsCandidate}){
 const matrix=buildModernMetricsCoverage(candidate);
 const parent=savedParentNamePhoneticsDisplay(candidate);
 const rows=matrix.rows.map(row=>row.id==='parent-name-avoidance'&&parent.state!=='recorded'?{...row,status:'not-measured' as const,value:null,sourceIds:[],evidence:parent.state==='uninterpreted'?parent.reason:row.evidence}:row);
 return <section className="modern-metrics-coverage" aria-label="现代命名指标覆盖矩阵">
  <div className="modern-metrics-coverage__heading"><h4>现代命名指标覆盖矩阵</h4><span>只读覆盖状态</span></div>
  <div className="modern-metrics-coverage__grid">{rows.map(row=><article key={row.id} className={`modern-metrics-coverage__row modern-metrics-coverage__row--${row.status}`} data-metric-id={row.id} data-status={row.status}>
    <div className="modern-metrics-coverage__row-head"><strong>{row.label}</strong><span>{row.status==='measured'?'已测':row.status==='historical'?'历史观察':'未测'}</span></div>
    <p>{row.value??'未测'}</p><p>{row.evidence}</p><small>{row.limitations.join(' ')}</small>
  </article>)}</div>
  <ul className="modern-metrics-coverage__boundaries">{matrix.boundaries.map(line=><li key={line}>{line}</li>)}</ul>
 </section>;
}
