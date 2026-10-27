import type {NameCandidate,NamingSession} from '../shared/types';
import {verifySavedMeaningContextReview} from './meaning-context-review';
import {safeSourceUrl} from '../shared/session-sources';
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const meaningContextReportStyles='.meaning-context-review{margin:16px 0;font-size:9pt;line-height:1.65}.meaning-context-review h2{font-size:14pt;break-after:avoid}.meaning-context-row,.meaning-context-source{break-inside:avoid;padding:9px 0;border-top:1px solid #d9dfd9}.meaning-context-review p{overflow-wrap:anywhere}.meaning-context-original{white-space:pre-wrap;border-left:3px solid #b69962;padding-left:10px}.meaning-context-source{font-size:8pt;color:#64766b}';

/** Render only the stored snapshot, authenticated by its recorded fixed version. No live data lookup supplies displayed prose. */
export function meaningContextReviewReport(candidate:NameCandidate,session:NamingSession):string {
 const saved=Object.getOwnPropertyDescriptor(candidate,'meaningContextReview');if(!saved)return '';
 try{verifySavedMeaningContextReview(session,candidate,session.factVerification?.datasetSha256?{packSha256:session.factVerification.datasetSha256,activeVersion:session.dataVersion}:undefined);}catch{return '<section class="meaning-context-review"><h2>完整词义参考</h2><p>保存参考校验未通过，未展示为已采用解释。</p></section>';}
 const review=candidate.meaningContextReview!,ready=review.rows.filter(row=>row.result.status==='explanation-ready');
 return `<section class="meaning-context-review"><h2>完整给名词义参考</h2><p>读音确认：${review.confirmedReadings.length}/2；此确认仅记录本方案采用的当前读音，不表示唯一读法。</p>${ready.length?ready.map(row=>{
  const result=row.result;if(result.status!=='explanation-ready')return '';
  return `<article class="meaning-context-row"><p><b>第${row.position+1}字「${esc(row.char)}」引用完整给名「${esc(result.givenName)}」的词义</b></p><p><b>词典原文</b></p><p class="meaning-context-original">${esc(result.dictionaryOriginal)}</p><p><b>用户明确选定的场景</b>：${esc(result.selectedContext.contextLabel)}</p><p><b>项目解释与适用限制</b>：${esc(result.reason)}</p><ul>${result.exclusions.map(line=>`<li>${esc(line)}</li>`).join('')}</ul><p class="meaning-context-source">原词：${esc(result.source.word)} · 原读音：${esc(result.source.pinyin)} · ${esc(result.source.id)}<br>原件：${esc(result.source.originalFile)}；词条/读音/义项：${esc(result.source.rawEntryIndex)}/${esc(result.source.rawHeteronymIndex)}/${esc(result.source.rawDefinitionIndex)}<br>许可：${esc(result.source.license)}</p></article>`;
 }).join(''):'<p>尚未同时完成读音确认及具体词义场景选择，没有已采用的词义解释。</p>'}<p>本项仅提供完整词义参考；单字原审阅状态、综合分和既有整名推荐保持原记录，不表示姓名通过或心理、命运效果。</p><div class="meaning-context-source"><b>本次词义参考的独立来源登记</b>${review.sourceSnapshot.sources.map(source=>{const href=safeSourceUrl(source.url);return `<p>${esc(source.name)} · ${esc(source.id)}<br>${href?`<a href="${esc(href)}">${esc(source.url)}</a>`:esc(source.url)}<br>许可：${esc(source.license)}；登记SHA-256：${esc(source.sha256)}</p>`;}).join('')}<p>资料SHA-256：${esc(review.source.dataSha256)}<br>来源锁SHA-256：${esc(review.source.sourceLockSha256)}</p></div></section>`;
}
