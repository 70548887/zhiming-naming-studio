import {useEffect,useState} from 'react';
import type {NameCandidate} from '../shared/types';
import type {ElementAssessmentChoiceInput,ElementCandidateAssessment} from '../shared/element-assessment';

type ElementEvidence=NonNullable<NonNullable<ElementCandidateAssessment['rows'][number]['assessment']>['matchingSourceCandidates']>[number];
const dictionaryName=(id:string)=>id==='moe-revised'?'教育部《重编国语辞典修订本》':'所载原始词典资料';
function ElementSourceInformation({e,snapshot}:{e?:ElementEvidence;snapshot:ElementCandidateAssessment}){
 return <details className="element-assessment-source-info"><summary>查看来源信息</summary><dl style={{overflowWrap:'anywhere'}}>
  <dt>参考版本</dt><dd>{snapshot.version}</dd><dt>项目方法</dt><dd>{snapshot.profileId}</dd><dt>来源锁摘要</dt><dd>{snapshot.sourceLockSha256}</dd>
  {e&&<><dt>词典</dt><dd>{dictionaryName(e.sourceId)}</dd><dt>来源标识</dt><dd>{e.sourceId}</dd><dt>完整原始记录</dt><dd>{e.sourceRecordId}</dd><dt>项目规则标识</dt><dd>{e.projectRuleId}</dd><dt>原适用范围标识</dt><dd>{e.scope}</dd><dt>词条摘要</dt><dd>{e.sourceEntrySha256}</dd><dt>读音记录摘要</dt><dd>{e.sourceReadingSha256}</dd></>}
 </dl></details>;
}


export function SavedElementAssessment({snapshot}:{snapshot:ElementCandidateAssessment|undefined}){
 if(!snapshot)return null;
 return <section className="saved-element-assessment"><h4>本方案人工采用的意象标签</h4><p className="muted">项目物象约定，与传统流派分开。确认记录代表人工采用意见，不证明现实条件。</p>{snapshot.rows.map(row=><div key={row.position}><b>{row.char} · {row.pinyin}</b><p>{row.decision==='not-applicable'?'人工标记不适用':row.decision==='confirmed'?'已保存人工采用意见':'未确认'} · {row.assessment?.effectiveElements.join('、')||'尚未采用意象标签'}</p>{row.assessment?.matchingSourceCandidates.filter(e=>row.confirmedEvidenceIds.includes(e.evidenceId)).map(e=><blockquote key={e.evidenceId}><p>所选原义：{e.quote}</p><p>具体条件：{e.condition}</p><p>已采用的项目意象：{e.elements.join('、')}（只在上述原义和条件下采用）</p><p>词典来源：{dictionaryName(e.sourceId)}</p><ElementSourceInformation e={e} snapshot={snapshot}/></blockquote>)}</div>)}<ElementSourceInformation snapshot={snapshot}/></section>;
}
export function ElementAssessmentView({candidate,onSave,disabled=false,onDirtyChange}:{candidate:NameCandidate;onSave:(choices:ElementAssessmentChoiceInput[])=>Promise<boolean>;disabled?:boolean;onDirtyChange?:(dirty:boolean)=>void}){
 const snapshot=candidate.elementAssessment;
 const initial=()=>snapshot?.rows.map(row=>({position:row.position,decision:row.decision,confirmedEvidenceIds:[...row.confirmedEvidenceIds]}))??[];
 const [choices,setChoices]=useState<ElementAssessmentChoiceInput[]>(initial),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const saved=JSON.stringify(initial()),dirty=JSON.stringify(choices)!==saved;
 useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
 // A successful save produces exactly the retained draft. External changes remain visible until the user reloads.
 if(!snapshot)return null;
 const change=(position:number,next:Partial<ElementAssessmentChoiceInput>)=>{setError('');setChoices(old=>old.map(c=>c.position===position?{...c,...next}:c));};
 const busy=disabled||saving;
 return <section className="element-assessment-panel"><SavedElementAssessment snapshot={snapshot}/><details><summary>确认原义与项目意象采用意见</summary><p>逐项确认本方案采用的原义与条件；候选未默认勾选，单义也需要人工确认。系统不据此证明现实条件，不改变字库或评分。</p>{snapshot.rows.map(row=>{const choice=choices.find(c=>c.position===row.position)!;const options=row.assessment?.matchingSourceCandidates??[];return <fieldset key={row.position} disabled={busy}><legend>第 {row.position} 字：{row.char}（默认 {row.pinyin}）</legend>{row.unavailableReason&&<p>{row.unavailableReason}</p>}<label>采用状态 <select value={choice.decision} onChange={event=>{const decision=event.target.value as ElementAssessmentChoiceInput['decision'];change(row.position,{decision,confirmedEvidenceIds:decision==='confirmed'?choice.confirmedEvidenceIds:[]});}}><option value="unconfirmed">尚未确认采用</option><option value="not-applicable">本方案不适用</option>{options.length>0&&<option value="confirmed">逐项确认采用意见</option>}</select></label>{options.map(e=><div key={e.evidenceId} className="element-evidence-option"><p>原义：{e.quote}</p><p><strong>具体适用条件：</strong>{e.condition}</p><p>项目意象依据：{e.elements.join('、')}（只在上述原义和条件下采用）</p><p>词典来源：{dictionaryName(e.sourceId)}</p><ElementSourceInformation e={e} snapshot={snapshot}/><label><input type="checkbox" disabled={choice.decision!=='confirmed'||busy} checked={choice.confirmedEvidenceIds.includes(e.evidenceId)} onChange={event=>change(row.position,{confirmedEvidenceIds:event.target.checked?[...choice.confirmedEvidenceIds,e.evidenceId]:choice.confirmedEvidenceIds.filter(id=>id!==e.evidenceId)})}/>我确认本方案采用此原义与所列条件下的意象意见</label></div>)}</fieldset>;})}<p role="status">{dirty?'采用意见尚未保存':'采用意见与已保存记录一致'}</p><button type="button" className="button primary" disabled={busy||!dirty} onClick={async()=>{setError('');setSaving(true);try{if(!await onSave(structuredClone(choices)))setError('未保存；当前选择仍保留，请核对后重试。');}catch(e){setError((e instanceof Error?e.message:'未保存')+'；当前选择仍保留。');}finally{setSaving(false);}}}>保存本方案采用意见</button><button type="button" className="button secondary" disabled={busy} onClick={()=>{setChoices(initial());setError('');}}>重新载入已保存意见</button>{error&&<p role="alert" className="inline-error">{error}</p>}</details></section>;
}
