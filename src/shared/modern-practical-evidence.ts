import type {NameCandidate} from './types';
import type {ModernEvidenceDocument,RecordedModernEvidence} from './modern-practical-evidence-types';
import {validReviewRevision,validReviewToken} from './review-version';
export const MODERN_PRACTICAL_VERSION='modern-practical-evidence/1.0.0' as const;
export const MODERN_INTEGRATION_RELEASE=Object.freeze({draft:true,productionApproved:false});
export interface ModernPracticalEvidenceRecord {
 version:typeof MODERN_PRACTICAL_VERSION;recordState:'recorded';recordedAt:string;
 basis:{meaning:string};capture:{sessionId:string;candidateId:string;reviewRevision:number;reviewToken:string|null;dataVersion:string;datasetSha256:string;characterSha256:string;sourceSnapshotSha256:string};evidence:ModernEvidenceDocument;
}
export interface UnknownModernPracticalRecord {version:string;[key:string]:unknown;}
export type ModernPracticalRecord=ModernPracticalEvidenceRecord|UnknownModernPracticalRecord;
const exact=(value:unknown,keys:string[]):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
/** Browser-safe bounded DTO guard. Authenticity/canonical evidence is checked by main. */
export function assertModernPlainData(value:unknown){
 const active=new Set<object>();let count=0;
 const visit=(item:unknown,depth:number)=>{if(++count>150000||depth>35)throw new Error('现代说明结构过大。');if(item===null||typeof item==='string'||typeof item==='boolean')return;if(typeof item==='number'&&Number.isFinite(item))return;if(!item||typeof item!=='object'||active.has(item))throw new Error('现代说明不是普通JSON。');const array=Array.isArray(item),prototype=Object.getPrototypeOf(item);if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw new Error('现代说明结构无效。');active.add(item);const keys=Reflect.ownKeys(item);if(array&&(keys.length!==(item as unknown[]).length+1||keys.some(key=>typeof key!=='string'||key!=='length'&&!/^(0|[1-9]\d*)$/.test(key))))throw new Error('现代说明数组无效。');if(array)for(let i=0;i<(item as unknown[]).length;i++)if(!Object.hasOwn(item,i))throw new Error('现代说明数组缺少记录。');for(const key of keys){if(array&&key==='length')continue;if(typeof key!=='string')throw new Error('现代说明字段无效。');const d=Object.getOwnPropertyDescriptor(item,key);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)throw new Error('现代说明不接受访问器。');visit(d.value,depth+1);}active.delete(item);};visit(value,0);
 if(JSON.stringify(value).length>400000)throw new Error('现代说明过大。');
}
export function validModernRecord(value:unknown):value is ModernPracticalRecord {
 try{
  assertModernPlainData(value);if(!value||typeof value!=='object'||Array.isArray(value)||typeof (value as any).version!=='string'||!(value as any).version.length||(value as any).version.length>100)return false;
  if((value as any).version!==MODERN_PRACTICAL_VERSION)return true;
  if(!exact(value,['version','recordState','recordedAt','basis','capture','evidence'])||value.recordState!=='recorded'||typeof value.recordedAt!=='string'||!Number.isFinite(Date.parse(value.recordedAt))||new Date(value.recordedAt).toISOString()!==value.recordedAt||!exact(value.basis,['meaning'])||typeof value.basis.meaning!=='string'||value.basis.meaning.length>20000)return false;
  if(!exact(value.capture,['sessionId','candidateId','reviewRevision','reviewToken','dataVersion','datasetSha256','characterSha256','sourceSnapshotSha256']))return false;
  const capture=value.capture;
  if(!['sessionId','candidateId','dataVersion'].every(k=>typeof capture[k]==='string'&&!!capture[k])||capture.reviewRevision===undefined||!validReviewRevision(capture.reviewRevision)||!(capture.reviewToken===null||capture.reviewToken!==undefined&&validReviewToken(capture.reviewToken))||!['datasetSha256','characterSha256','sourceSnapshotSha256'].every(k=>typeof capture[k]==='string'&&/^[a-f0-9]{64}$/.test(capture[k] as string)))return false;
  const e=value.evidence as any;
  if(!e||e.version!==MODERN_PRACTICAL_VERSION||e.status!=='recorded-evidence'||!e.identity||!['sessionId','candidateId','dataVersion','datasetSha256','inputSha256'].every(k=>typeof e.identity[k]==='string')||!/^[a-f0-9]{64}$/.test(e.identity.inputSha256)||e.identity.sessionId!==capture.sessionId||e.identity.candidateId!==capture.candidateId||e.identity.dataVersion!==capture.dataVersion||e.identity.datasetSha256!==capture.datasetSha256||!e.observations||!e.storedEvaluation)return false;
  const strings=(rows:any)=>Array.isArray(rows)&&rows.every(row=>typeof row==='string');
  const o=e.observations;
  return ['sound','meaning','simplicity','traditional','distinctiveness'].every(k=>typeof e.storedEvaluation[k]==='number'&&e.storedEvaluation[k]>=0&&e.storedEvaluation[k]<=100)&&Array.isArray(o.pronunciation?.characters)&&o.pronunciation.characters.every((r:any)=>typeof r.char==='string'&&typeof r.selected?.pinyin==='string'&&Array.isArray(r.recordedDirectReadings)&&Array.isArray(r.referenceOnlyReadings)&&typeof r.ambiguity==='string')&&strings(o.pronunciation.limitations)&&Array.isArray(o.writing?.characters)&&o.writing.characters.every((r:any)=>typeof r.char==='string'&&(r.strokes===null||Number.isSafeInteger(r.strokes)&&r.strokes>=0))&&(o.writing.givenStrokeTotal===null||Number.isSafeInteger(o.writing.givenStrokeTotal))&&strings(o.writing.limitations)&&Array.isArray(o.meaningIndustry?.lexicalEntries)&&o.meaningIndustry.lexicalEntries.every((r:any)=>['char','pinyin','savedSelectedMeaning'].every(k=>typeof r[k]==='string'))&&typeof o.meaningIndustry.savedMeaningPreferenceText==='string'&&typeof o.meaningIndustry.savedInterpretation?.text==='string'&&typeof o.meaningIndustry.industry?.savedText==='string'&&Array.isArray(o.meaningIndustry.industry.literalProjectKeywordMatches)&&o.meaningIndustry.industry.literalProjectKeywordMatches.every((r:any)=>typeof r.keyword==='string'&&strings(r.characters))&&strings(o.meaningIndustry.limitations)&&strings(o.distinctiveness?.limitations);
 }catch{return false;}
}
export type ModernRecordView={state:'missing'|'unsupported'|'invalid'|'stale'|'current';label:string;notice:string;record:ModernPracticalEvidenceRecord|null};
export function modernRecordView(candidate:Pick<NameCandidate,'meaning'|'modernPracticalEvidence'>):ModernRecordView {
 const own=Object.getOwnPropertyDescriptor(candidate,'modernPracticalEvidence');
 if(!own)return {state:'missing',label:'未记录',notice:'尚未生成并保存现代实用性说明；不会自动补算旧记录。',record:null};
 if(!('value'in own)||!validModernRecord(own.value))return {state:'invalid',label:'记录不可用',notice:'保存说明格式无效，暂不展示为已核事实。',record:null};
 if(own.value.version!==MODERN_PRACTICAL_VERSION)return {state:'unsupported',label:'版本暂不支持',notice:'保留原保存版本，不自动升级或重新生成。',record:null};
 const record=own.value as ModernPracticalEvidenceRecord;
 const meaning=Object.getOwnPropertyDescriptor(candidate,'meaning');
 if(!meaning||!('value'in meaning)||record.basis.meaning!==meaning.value)return {state:'stale',label:'保存后寓意已修改',notice:'原说明保留作历史记录，不代表当前组合寓意。需要时请明确重新生成并保存。',record};
 return {state:'current',label:'已记录',notice:'字条事实、项目规则观察与缺乏实证分别说明；未改变已存规则分。',record};
}
export function modernRecordLabel(candidate:Pick<NameCandidate,'meaning'|'modernPracticalEvidence'>){const view=modernRecordView(candidate);return view.label+(view.record?' · '+view.record.recordedAt:'');}
export function modernEvidenceDisplayRows(e:RecordedModernEvidence){
 const o=e.observations;
 const ambiguity=(s:string)=>s==='multiple-direct-readings-recorded'?'已保存多种本字读音，仍需确认命名读法':s==='entry-flagged-but-no-additional-direct-reading-proved'?'条目标注多音，额外本字读音尚未证实':'未保存额外本字读音，不等于只有一种读音';
 return [
  {title:'字条事实 · 读音',lines:o.pronunciation.characters.map(row=>`${row.char}：保存读音${row.selected.pinyin}，本字读音资料${row.recordedDirectReadings.length}项、辞典转参${row.referenceOnlyReadings.length}项；${ambiguity(row.ambiguity)}`).concat(o.pronunciation.limitations)},
  {title:'字条事实 · 书写',lines:o.writing.characters.map(row=>`${row.char}：普通笔画${row.strokes===null?'未知':row.strokes}`).concat([`给名合计：${o.writing.givenStrokeTotal===null?'未知，不补数':o.writing.givenStrokeTotal}；全名笔画及书写时长未评估。`,...o.writing.limitations])},
  {title:'项目观察 · 字义与行业',lines:[...o.meaningIndustry.lexicalEntries.map(row=>`${row.char}（${row.pinyin}）保存字典义：${row.savedSelectedMeaning}`),`保存期许原文：${o.meaningIndustry.savedMeaningPreferenceText||'未填写'}`,`保存的组合解释：${o.meaningIndustry.savedInterpretation.text}`,`行业原文：${o.meaningIndustry.industry.savedText||'未填写'}`,`项目关键词命中：${o.meaningIndustry.industry.literalProjectKeywordMatches.map(row=>row.keyword+'／'+row.characters.join('、')).join('；')||'未记录命中，不能判不适合'}`,...o.meaningIndustry.limitations]},
  {title:'已存规则分 · 缺乏实证的边界',lines:[`读音${e.storedEvaluation.sound}、寓意${e.storedEvaluation.meaning}、书写${e.storedEvaluation.simplicity}、传统参考${e.storedEvaluation.traditional}、辨识${e.storedEvaluation.distinctiveness}；均为保存的项目排序值，未重算。`,...o.distinctiveness.limitations]}
 ];
}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** No record produces exactly no HTML, preserving old report output. */
export function modernPracticalEvidenceReport(candidate:Pick<NameCandidate,'meaning'|'modernPracticalEvidence'>){
 const view=modernRecordView(candidate);if(view.state==='missing')return '';
 if(view.state!=='current'||!view.record)return '<section class="modern-practical-report"><h2>现代实用性说明</h2><p>'+esc(view.label)+'：'+esc(view.notice)+'</p></section>';
 const e=view.record.evidence;if(e.status!=='recorded-evidence')return '';
 return '<section class="modern-practical-report"><h2>现代实用性说明 · 已保存</h2><p>'+esc(view.notice)+'</p>'+modernEvidenceDisplayRows(e).map(row=>'<h4>'+esc(row.title)+'</h4><ul>'+row.lines.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>').join('')+'<p>本说明不读取另行保存的语境选择、粤语确认、词组参照或元素确认记录。</p><p>来源按保存字条与独立说明方法核对；不代表人口、心理或职业结果实证。</p></section>';
}
