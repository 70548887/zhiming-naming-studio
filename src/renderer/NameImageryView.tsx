import React from 'react';
import type {NameImageryAnalysis} from '../shared/types';
import './name-reading.css';

const statusLabel={mapped:'已列出意象集合',partial:'部分用字标签待定','chart-unavailable':'出生参考盘未确定'} as const;
const palaceLabel=(values:number[])=>values.length?values.map(value=>`${value}宫`).join('、'):'标签待定';

export function NameImagerySummary({analysis}:{analysis?:NameImageryAnalysis}){
  if(!analysis)return null;
  return <div className="name-reading-summary"><strong>项目文化比较</strong><p>{analysis.characterRows.map(row=>`${row.char}：${palaceLabel(row.palaces)}`).join('；')}</p><small>方法：姓名意象与九宫对照 · {statusLabel[analysis.status]} · 不作吉凶评分</small></div>;
}

export function NameImageryView({analysis}:{analysis?:NameImageryAnalysis}){
  if(!analysis)return null;
  return <section className="detail-section name-imagery" aria-label="项目文化比较 · 姓名意象与九宫对照">
    <h3>项目文化比较 <span className="tag">实验</span></h3>
    <p>方法说明：姓名意象与九宫对照。把本项目保存的用字元素标签，与保存出生参考盘的外八宫元素并列参考。标签是项目约定，不是辞书统一认定的汉字五行。姓氏只保留为上下文；此处不作传统姓名验局或改名效果判断。</p>
    <div className="name-reading-units">{analysis.characterRows.map(row=><article key={row.index}>
      <h4>{row.char} <small>{row.pinyin}</small></h4><p>{row.elements.join('、')||'元素标签待定'} → {palaceLabel(row.palaces)}</p>
      <p className="muted small">{row.labelBasis}</p>{row.missing.map((message,index)=><p className="inline-warning" key={index}>{message}</p>)}
    </article>)}</div>
    {analysis.palaceReadings.length>0&&<details className="name-reading-provenance"><summary>查看保存盘中的对应位置</summary>{analysis.palaceReadings.map(reading=><article className="name-imagery-palace" key={reading.palace}>
      <h4>{reading.snapshot.trigram}{reading.palace}宫 · {reading.snapshot.direction}</h4><p>{reading.snapshot.star} / {reading.snapshot.door} / {reading.snapshot.god}；天盘 {reading.snapshot.heaven}，地盘 {reading.snapshot.earth}</p><p>{reading.note}</p>
      {reading.observations.map((observation,index)=><details key={index}><summary>{observation.label} · {observation.subjects.join('、')}</summary><ul>{observation.evidence.map((item,i)=><li key={i}>{item}</li>)}</ul><p className="muted small">规则 {observation.ruleId} / {observation.ruleVersion}</p><ul>{observation.sourceReferences.map((source,i)=><li key={i}>{source.id} · {source.locator} · {source.version}</li>)}</ul></details>)}
    </article>)}</details>}
    <details className="name-reading-provenance"><summary>方法、来源与尚未评估的范围</summary>
      <p>{analysis.profile.name} · {analysis.version}</p><p>状态：{statusLabel[analysis.status]}。不判成格、姓名作用、真假空墓或四害解除；不改变候选排序。</p>
      {analysis.wholeLayerRulesNotAssigned.length>0&&<p>星盘、门盘的整层规则保留在原盘，不归到姓名宫位：{analysis.wholeLayerRulesNotAssigned.join('、')}。</p>}
      <ul>{analysis.limitations.map((item,index)=><li key={index}>{item}</li>)}</ul>
      <ul>{analysis.sourceReferences.map((source,index)=><li key={index}>{source.id} · {source.locator} · {source.version}<br/>{source.note}</li>)}</ul>
      <p className="muted small">保存盘 SHA-256：{analysis.chart.sha256}</p>
    </details>
  </section>;
}
