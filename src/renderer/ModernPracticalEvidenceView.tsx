import React,{useState,useMemo} from 'react';
import type {NameCandidate} from '../shared/types';
import {modernRecordView,modernEvidenceDisplayRows} from '../shared/modern-practical-evidence';
import {createModernActionController,type ModernActionState} from '../shared/modern-practical-actions';
import {ModernNamePopularityReferencePanel} from './ModernNamePopularityReferencePanel';
import {ModernMetricsCoverageMatrix} from './ModernMetricsCoverageMatrix';
export interface ModernEvidenceViewProps {candidate:NameCandidate;readOnly?:boolean;busy?:boolean;dirty?:boolean;onRecord?:()=>Promise<boolean>;onClear?:()=>Promise<boolean>;compact?:boolean;}
export function ModernPracticalEvidenceView({candidate,readOnly=false,busy=false,dirty=false,onRecord,onClear,compact=false}:ModernEvidenceViewProps){
 const view=modernRecordView(candidate),[actionState,setActionState]=useState<ModernActionState>({pending:false,error:''});
 const controller=useMemo(()=>createModernActionController(setActionState),[]),{pending,error}=actionState;
 const act=(kind:'record'|'clear')=>controller.run(kind,kind==='record'?onRecord:onClear,busy||dirty);
 const rows=view.record?.evidence.status==='recorded-evidence'?modernEvidenceDisplayRows(view.record.evidence):[];
 const content=<>
  <p role="status"><strong>{view.label}</strong> · {view.notice}</p>
  <p className="muted small">本说明不读取另行保存的语境选择、粤语确认、词组参照或元素确认记录。</p>
  {view.record&&<p className="muted small">保存于 {new Date(view.record.recordedAt).toLocaleString('zh-CN')}</p>}
  {rows.length>0&&<details open={!compact&&view.state==='current'}><summary>{view.state==='stale'?'查看原保存说明（仅供历史）':'查看四类保存观察'}</summary>{rows.map(row=><section key={row.title}><h4>{row.title}</h4><ul>{row.lines.map((line,index)=><li key={index}>{line}</li>)}</ul></section>)}</details>}
  <ModernMetricsCoverageMatrix candidate={candidate}/>
  {!readOnly&&<div className="candidate-review-actions"><span className="muted small">{dirty?'请先保存或撤销当前草稿，说明只读取已保存内容。':'只使用已保存字条与规则记录，不增加新分数。'}</span><button className="button secondary" disabled={busy||!!pending||dirty||!onRecord} onClick={()=>void act('record')}>{pending==='record'?'正在生成并保存…':view.state==='missing'?'生成并保存说明':'重新生成并保存说明'}</button>{view.state!=='missing'&&<button className="button secondary" disabled={busy||!!pending||dirty||!onClear} onClick={()=>void act('clear')}>{pending==='clear'?'正在清除…':'清除已保存说明'}</button>}</div>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
  <ModernNamePopularityReferencePanel candidate={candidate} disabled={busy||dirty}/>
 </>;
 return compact?<details className="modern-practical-view"><summary>现代实用性说明 · {view.label}</summary>{content}</details>:<section className="detail-section modern-practical-view"><h3>现代实用性说明</h3>{content}</section>;
}
