import React, { useEffect, useState } from 'react';
import { Check, CircleHelp } from 'lucide-react';
import type { NumerologyAnalysis } from '../shared/types';

const statusLabels = { complete: '已计算', pending: '待核对字形', unsupported: '当前姓名结构暂不支持' } as const;

export function numerologySummary(analysis?: NumerologyAnalysis): string {
  if (!analysis) return '当前方案未生成姓名数理快照，请重新生成';
  if (analysis.status !== 'complete') return statusLabels[analysis.status];
  return analysis.grids.map(grid => `${grid.name} ${grid.value}（${grid.element}）`).join(' · ');
}

export function NumerologySummary({ analysis, enabled = false }: { analysis?: NumerologyAnalysis; enabled?: boolean }) {
  if (!enabled && !analysis) return null;
  return <div className={`numerology-summary ${analysis?.status === 'complete' ? 'complete' : 'pending'}`}>
    <strong>五格参考 · {analysis ? statusLabels[analysis.status] : '未生成快照'}</strong>
    <p>{numerologySummary(analysis)}</p>
    {analysis?.status === 'complete' && analysis.threeTalents && <small>三才：{analysis.threeTalents.elements.join(' → ')}</small>}
  </div>;
}

/** Defines the saved selection context, independently of response object identity. */
export function numerologySelectionSnapshotKey(analysis?: NumerologyAnalysis): string {
  if (!analysis) return 'no-numerology-snapshot';
  return JSON.stringify({
    fullName: analysis.fullName,
    status: analysis.status,
    rule: { id: analysis.rule.id, version: analysis.rule.version },
    dataVersion: analysis.dataVersion,
    strokes: analysis.strokes.map(choice => ({
      position: choice.position, inputChar: choice.inputChar, role: choice.role,
      status: choice.status, selectedRecordId: choice.selectedRecordId ?? '',
      options: choice.options.map(option => ({
        id: option.id, character: option.character, glyph: option.glyph, count: option.count,
        sourceId: option.sourceId, sourceLocator: option.sourceLocator, note: option.note,
      })),
    })),
  });
}

interface NumerologyViewProps {
  analysis?: NumerologyAnalysis; enabled?: boolean; busy?: boolean;
  onConfirm?: (selections: Record<string, string>) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Displays only the recorded, source-backed result. No counts or judgments are inferred here. */
export function NumerologyView(props: NumerologyViewProps) {
  return <NumerologyEditor key={numerologySelectionSnapshotKey(props.analysis)} {...props} />;
}

function NumerologyEditor({ analysis, enabled = false, busy = false, onConfirm, onDirtyChange }: NumerologyViewProps) {
  const [selections, setSelections] = useState<Record<string, string>>(() => Object.fromEntries((analysis?.strokes ?? [])
    .filter(choice => choice.selectedRecordId)
    .map(choice => [String(choice.position), choice.selectedRecordId!])));
  const changed = analysis?.strokes.some(choice => selections[String(choice.position)] !== choice.selectedRecordId) ?? false;
  useEffect(() => onDirtyChange?.(changed), [changed, onDirtyChange]);
  if (!enabled && !analysis) return null;
  if (!analysis) return <div className="detail-section numerology-section">
    <h3>康熙笔画 · 五格三才</h3>
    <p className="inline-warning"><CircleHelp size={15} />当前方案未生成姓名数理快照，请重新生成后查看。</p>
  </div>;
  const allSelected = analysis.strokes.length > 0 && analysis.strokes.every(choice =>
    choice.options.some(option => option.id === selections[String(choice.position)]));
  return <div className="detail-section numerology-section">
    <div className="section-title-row"><h3>康熙笔画 · 五格三才</h3><span className={`tag numerology-status ${analysis.status}`}>{statusLabels[analysis.status]}</span></div>
    <p className="muted small">按记录中的康熙字形与所选规则计算，作为独立的姓名文化参考。</p>
    <div className="numerology-strokes">{analysis.strokes.map(choice => {
      const recorded = choice.options.find(option => option.id === choice.selectedRecordId);
      const fieldId = `numerology-choice-${choice.position}`;
      return <article key={choice.position}>
        <div className="stroke-position"><strong>{choice.inputChar}</strong><span>{choice.role === 'surname' ? '姓氏' : '名字'} · 第 {choice.position + 1} 字</span></div>
        {recorded ? <div className="stroke-record"><p>本次采用：<strong>{recorded.glyph} · {recorded.count} 画</strong></p><small>来源 {recorded.sourceId} · {recorded.sourceLocator}</small>{recorded.note && <p className="muted small">{recorded.note}</p>}</div>
          : <p className="inline-warning">{choice.status === 'missing' ? '尚未收录可核对的康熙笔画记录，五格结果待核对。' : '字形映射或同字形的来源计数存在差异，请按所用资料确认；保存前不生成五格。'}</p>}
        {choice.options.length > 0 && onConfirm && analysis.status !== 'unsupported' && <div className="stroke-selector">
          <label htmlFor={fieldId}>核对“{choice.inputChar}”的字形记录</label>
          <select id={fieldId} disabled={busy} value={selections[String(choice.position)] ?? ''} onChange={event => setSelections(current => ({ ...current, [String(choice.position)]: event.target.value }))}>
            <option value="">请选择字形与来源</option>
            {choice.options.map(option => <option key={option.id} value={option.id}>{option.glyph} · {option.count} 画 · {option.sourceId} · {option.sourceLocator}</option>)}
          </select>
          {selections[String(choice.position)] !== choice.selectedRecordId && <small>选择尚未保存；确认后重算并保留审阅历史。</small>}
          {choice.options.find(option=>option.id===selections[String(choice.position)])?.note&&<p className="muted small">所选记录说明：{choice.options.find(option=>option.id===selections[String(choice.position)])!.note}</p>}
        </div>}
        {!onConfirm && !recorded && choice.options.length > 0 && <div className="stroke-options">可核对记录：{choice.options.map(option => `${option.glyph} ${option.count} 画（${option.sourceId} · ${option.sourceLocator}）`).join('；')}</div>}
      </article>;
    })}</div>
    {onConfirm && analysis.status !== 'unsupported' && analysis.strokes.some(choice => choice.options.length > 0) && <button className="button secondary numerology-confirm" disabled={busy || !allSelected || !changed} onClick={() => onConfirm(selections)}><Check size={15} />确认字形并重新计算</button>}
    {analysis.status === 'complete' && <>
      <div className="numerology-grids">{analysis.grids.map(grid => <article key={grid.name}><span>{grid.name}</span><strong>{grid.value}<small>{grid.element}</small></strong><p>{grid.formula}</p>{grid.interpretation && <p className="grid-interpretation">{grid.interpretation.label} · {grid.interpretation.keyword}<small>来源 {grid.interpretation.sourceId}</small></p>}</article>)}</div>
      {analysis.threeTalents && <div className="three-talents"><h4>三才五行 · {analysis.threeTalents.elements.join(' → ')}</h4><p>{analysis.threeTalents.relationships.map(relation => `${relation.from} → ${relation.to}：${relation.relation}`).join('；')}</p><p className="muted small">{analysis.threeTalents.description}</p></div>}
    </>}
    {analysis.warnings.length > 0 && <div className="numerology-warnings">{analysis.warnings.map((warning, index) => <p className="inline-warning" key={index}>{warning}</p>)}</div>}
    <details className="numerology-provenance"><summary>本次所用规则与数据版本</summary><p>{analysis.rule.name} · {analysis.rule.id} / {analysis.rule.version}</p><p>笔画口径：{analysis.rule.strokePolicy}</p><p>公式约定：{analysis.rule.formulaConvention}</p><p>数据版本：{analysis.dataVersion}</p>{analysis.rule.interpretationSourceId && <p>数理释义来源：{analysis.rule.interpretationSourceId}</p>}</details>
  </div>;
}
