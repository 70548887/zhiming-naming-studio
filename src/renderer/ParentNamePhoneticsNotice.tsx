import React from 'react';
import './parent-name-readings.css';
/** Projection from the shared calculator, never a renderer comparison algorithm. */
export interface ParentPhoneticNoticeRow {
 role:'father'|'mother';fullName:string;givenName?:string;
 status:'not-assessed'|'matched'|'not-matched';
 reason:string;parentReading?:string;candidateReading?:string;
 matchKind?:'same-tones'|'tone-difference';
}
export function ParentNamePhoneticsNotice({mode,rows}:{mode:'none'|'strict'|'ignore-tone';rows:readonly ParentPhoneticNoticeRow[]}) {
 return <section className="parent-phonetics-notice" aria-label="与家庭给名的读音核对"><h4>与家庭给名的读音核对</h4><p>{mode==='none'?'本方案未启用家庭给名同音比较。':mode==='strict'?'本次按完整给名的音节与声调比较。':'本次按完整给名音节比较，忽略声调；命中时单列声调是否相同。'}</p>
  {mode!=='none'&&rows.map((row,index)=><article className={`pnr-comparison-row pnr-${row.status}`} key={`${row.role}-${index}`}><strong>{row.role==='father'?'爸爸':'妈妈'} · {row.fullName||'姓名未填写'}</strong><p>{row.status==='not-assessed'?'尚未比较':row.status==='not-matched'?'本次未命中完整给名同音':row.matchKind==='tone-difference'?'完整给名音节相同，声调有差异':row.matchKind==='same-tones'?'完整给名音节与声调相同':'完整给名音节匹配，声调状态未返回'}</p>{row.parentReading&&row.candidateReading&&<p>家人给名：{row.givenName} · {row.parentReading}<br/>本候选给名：{row.candidateReading}</p>}<p className="pnr-small">{row.reason}</p></article>)}
  <p className="pnr-small">仅为读音核对提醒，不作分数、心理影响或安全结论；字形避讳不在此项替代。</p>
 </section>;
}
