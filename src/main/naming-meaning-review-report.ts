import {legacyNamingMeaningDisplayState,recordedCharacterExplanation71,recordedNamingMeaningSnapshot} from '../shared/naming-meaning-review-display';
import type {NamingMeaningReviewSnapshot} from '../shared/naming-meaning-review';
import {formatNamingReviewWarning} from '../shared/naming-review-warning';
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const labels:Record<string,string>={applicable:'可自动展示','manual-confirmation-required':'需人工确认',pending:'待审','not-recommended':'暂不推荐','not-reviewed-by-overlay':'本次补充审阅未覆盖','not-applicable':'当前选择不适用',approved:'已审限定用途'};
export const namingMeaningReviewReportStyles='.meaning-review-report{font-size:9pt;line-height:1.65;margin:14px 0}.meaning-review-report h2{font-size:14pt;letter-spacing:0;break-after:avoid}.meaning-review-row{border:1px solid #d9dfd9;border-radius:6px;padding:10px 13px;margin:8px 0;break-inside:avoid;page-break-inside:avoid}.meaning-review-row h4{font-family:inherit;font-size:10pt;margin:0 0 5px;letter-spacing:0}.meaning-review-row p,.meaning-review-row li{overflow-wrap:anywhere}.meaning-review-provenance{font-size:8pt;color:#64766c;overflow-wrap:anywhere}.naming7-use-notes{break-inside:avoid;page-break-inside:avoid}';

/** Rendering consumes the immutable recorded value, never the current table or a new lookup. */
export function namingMeaningReviewReport(snapshot:NamingMeaningReviewSnapshot|undefined,givenName?:string,savedVersion?:string):string {
 if(!snapshot)return '';
 if(arguments.length>2&&savedVersion!==snapshot.version)return '';
 if(!recordedNamingMeaningSnapshot({givenName:givenName??snapshot.givenName,namingMeaningReview:snapshot}))return '';
 const records=snapshot.rows.map(row=>{
  if(snapshot.version==='naming-editorial-7.1.0'&&row.kind==='character-level-project-explanation')return character71ReportRow(row);
  const state=legacyNamingMeaningDisplayState(row,row.char),review=row.review,automatic=state==='automatic'?row.automaticMeaning:undefined,binding=review?.binding;
  const applicabilityReason=row.applicability.status==='not-reviewed-by-overlay'?'沿用本方案已有的字义与读音记录。':row.applicability.reason;
  return `<article class="meaning-review-row"><h4>名字第 ${esc(row.position)} 字 · ${esc(row.char)} · ${esc(labels[row.applicability.status]||row.applicability.status)}</h4>${applicabilityReason?`<p>${esc(applicabilityReason)}</p>`:''}${automatic?`<p><b>单字通用取意（独立参考）：</b>${esc(automatic.meaning)}</p><p><b>逐字家庭期许（项目创作）：</b>${esc(automatic.projectWish)}</p>`:''}${review?`${!automatic&&review.namingMeaning?`<p><b>限定用途说明（供人工核对，未自动采用）：</b>${esc(review.namingMeaning)}</p>`:''}<p><b>审阅范围：</b>${esc(review.scope)}</p><p><b>采用条件：</b>${esc(review.applicability.reason)}</p><p><b>审阅理由：</b>${esc(review.reason)}</p>${binding?`<p><b>字典原词条与读音：</b>${esc(binding.dictionaryWord)} · ${esc(binding.pinyin)} · ${esc(binding.tone)} 声</p><p><b>词典原义（保留原文）：</b>${esc(binding.dictionarySense)}</p><p class="meaning-review-provenance">《重编国语辞典修订本》 · ${esc(binding.sourceId)}</p>`:'<p>本条尚未绑定可采用的独立词典义项，保留生成时字库原记录。</p>'}${review.warnings.length?`<ul>${review.warnings.map(warning=>`<li>${esc(formatNamingReviewWarning(warning))}</li>`).join('')}</ul>`:''}`:'<p>本字未列入本次补充审阅；既有解释以方案原记录为准。</p>'}</article>`;
 }).join('');
 return `<section class="meaning-review-report"><h2>逐字命名释义 · 补充审阅</h2><p>以下为单字通用取意的独立参考，不代表本名出处采用义；本名选义以完整名字解释和原句为准。所列读音、词典原义与可用范围保留，家庭期许属于项目创作。新增逐字说明不增加语义、主题或行业评分。</p>${records}<p class="meaning-review-provenance">规则 ${esc(snapshot.version)} · 来源 ${esc(snapshot.sourceId)} · 来源 SHA-256 ${esc(snapshot.sourceSha256)}<br>知识包 ${esc(snapshot.activeVersion)} · SHA-256 ${esc(snapshot.packSha256)}<br>词典原文：CC BY-ND 3.0 TW；项目说明及家庭期许：CC0 1.0。</p></section>`;
}

export const namingMeaningReviewV71ReportStyles='.meaning-review-character71{background:#f8fbf9}.meaning-review-character71 .meaning-review-limits{margin:6px 0;padding-left:18px}';
function character71ReportRow(row:import('../shared/naming-meaning-review').NamingMeaningReviewRow):string {
 const note=recordedCharacterExplanation71(row,row.char);
 if(!note)return `<article class="meaning-review-row"><h4>名字第 ${esc(row.position)} 字 · ${esc(row.char)} · 本位未采用新说明</h4><p>保存的字音、来源或资料条件不满足本位7.1说明范围，未借用其他义项。</p></article>`;
 return `<article class="meaning-review-row meaning-review-character71"><h4>名字第 ${esc(row.position)} 字 · ${esc(row.char)} · ${note.caseId.startsWith('single-meaning-m393:')?'新增逐字参考 · 姓名用途待审':'已审逐字项目说明'}</h4>${note.caseId.startsWith('single-meaning-m393:')?`<p>源词类：${esc(note.originalSourceBinding.definition.type)}；仅展示所选词义，不自动用于姓名组合解释。</p>`:''}<p><b>逐字项目取意：</b>${esc(note.projectMeaning)}</p><p><b>逐字家庭期许（项目创作）：</b>${esc(note.projectWish)}</p><p><b>字典原词条与读音：</b>${esc(note.originalSourceBinding.word)} · ${esc(note.selectedPinyin)} · ${esc(note.tone)} 声</p><p><b>词典原义（保留原文）：</b>${esc(note.dictionaryOriginal)}</p><p>以下仅为本字的独立参考，完整姓名适用性未评估；不增加主题、行业或其他排序分。</p><ul class="meaning-review-limits">${note.limits.map(limit=>`<li>${esc(limit)}</li>`).join('')}</ul><p class="meaning-review-provenance">《重编国语辞典修订本》 · ${esc(note.originalSourceBinding.sourceId)} · 词典CC BY-ND 3.0 TW／项目CC0 1.0</p></article>`;
}
