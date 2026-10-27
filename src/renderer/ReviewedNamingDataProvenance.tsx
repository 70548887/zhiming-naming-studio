import React from 'react';
import type {ReviewedNamingSession,ReviewedNameCandidate} from '../shared/reviewed-naming-data';
import {isReviewedSessionDisplayShape} from './reviewed-naming-data-state';

/** Only a parent holding a successful backend generation/detail response supplies this marker. */
export type ReviewedBackendDisplay={status:'not-verified'}|{status:'verified-generation'|'verified-detail';session:ReviewedNamingSession;candidateId?:string};
const qualificationLabels:Record<string,string>={eligible:'条件适用', 'needs-theme':'未选匹配主题，不适用','reading-mismatch':'读音不匹配，不适用','pending-source-identity':'来源身份待核对，不适用','manual-only':'仅供人工审阅，不采用','not-admitted':'未准入此项采用','candidate-scope-mismatch':'用字位置或范围不适用','source-unavailable':'来源未就绪，不适用','rejected-integrity':'资料一致性核对未通过','condition-not-supported':'必要条件未满足，不适用','blocked-existing-constraints':'既有用字条件不满足，不适用'};
const reasonLabels:Record<string,string>={
 'no-current-record':'本版没有对应采用记录','selected-default-reading':'实际所选默认读音不匹配',
 'pending-source-identity':'来源身份仍待核对','no-generation-grant':'此项没有生成采用范围',
 'generation-rejected':'本项生成采用未通过','given-name-length':'本次给名字数不在所审范围',
 'explicit-enum-not-selected':'未明确选择所需主题','unimplemented-predicate':'必要条件尚未支持',
 'reusable-character-intent':'已按本次字位核对逐字取意条件',
};
export function ReviewedNamingDataProvenance({display}:{display?:ReviewedBackendDisplay}){
 if(!display||display.status==='not-verified')return <p className="reviewed-data-notice" role="status">尚未取得经后端核对的完整方案，目录摘要或主题选择不作为采用来源。</p>;
 const session=display.session;
 if(!isReviewedSessionDisplayShape(session))return <p className="reviewed-data-error" role="alert">资料采用记录不完整或与方案归属不一致，暂不展示来源。</p>;
 const addon=session.reviewedData;
 const allCandidates=session.candidates as readonly ReviewedNameCandidate[];
 const candidates=display.candidateId?allCandidates.filter(candidate=>candidate.id===display.candidateId):allCandidates;
 if(!candidates.length||candidates.some(candidate=>candidate.reviewedDataUse?.binding.sessionId!==session.id||candidate.reviewedDataUse?.binding.candidateId!==candidate.id))return <p className="reviewed-data-error" role="alert">未取得对应候选的后端采用记录，暂不展示来源。</p>;
 return <section className="reviewed-data-provenance" aria-label="已审项目资料采用来源"><h4>本方案已审项目资料 · 只读记录</h4><p>来源由父层传入的后端完整方案提供；此处不自行验证身份摘要，不把摘要称为数字签名，也不从主题选择自授采用许可。</p>
  {candidates.map(candidate=><article key={candidate.id}><h5>{candidate.fullName}</h5><p>生成时说明：{candidate.meaning}</p>
   {candidate.reviewedDataUse.semantic.rows.map(row=><section key={'semantic-'+row.position}><strong>给名第 {row.position+1} 字 · {row.char}（{row.pinyin}）</strong><p>字库原义：{candidate.characters[row.position]?.meaning??'未附原字典义'}</p><p>{row.adoptionStatus==='adopted'?'本次已采用逐字项目取意':'本次未采用该项取意'} · {qualificationLabels[row.qualification.status]??'状态待核对'}</p>{row.project&&row.adoptionStatus==='adopted'&&<><p>项目说明：{row.project.meaning}</p><ul>{row.project.limits.map((line,index)=><li key={index}>{line}</li>)}</ul></>}<p className="reviewed-data-reason">原因记录：{(reasonLabels[row.qualification.reasonCode]??row.qualification.reasonCode)||'未提供原因码'}</p></section>)}
   {candidate.reviewedDataUse.imagery.rows.map(row=><section key={'imagery-'+row.position}><p>给名第 {row.position} 字 · {row.char}（{row.pinyin}）：{row.mapping?.status==='theme-required'?'精确主题未满足，不适用':row.mapping?'本次采用项目物象规则':'保留原有物象资料'}；生成时元素：{row.effectiveElements.join('、')||'未采用新元素'}</p>{row.mapping&&<p>物象条件记录：{row.mapping.condition}</p>}</section>)}
  </article>)}
  <details><summary>查看生成时版本与来源边界</summary><p>方法：{addon.method}</p><p>资料出版：{addon.publication.publicationId}</p><p>本批说明、取意、传统依据、风格、评分和来源只读；审阅不改写采用主题或事实。收藏和备注由父层既有审阅流程处理。</p><p>本界面不把本批采用计入原有生产默认覆盖，也不改变旧方案。</p></details>
 </section>;
}
