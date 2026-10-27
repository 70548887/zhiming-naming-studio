import type {CharacterEntry} from '../shared/types';
import {NAMING_RULE_V6_VERSION,isNamingV7BaseRuleVersion} from '../shared/naming-rules';
import {selectedMeaningBelongsToReading} from '../shared/character-reading';

const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export const dictionaryReadingReportStyles='.dictionary-records{margin:14px 0;font-size:9pt;line-height:1.65}.dictionary-records h2{font-size:14pt;letter-spacing:0;break-after:avoid}.dictionary-entry{border:1px solid #d9dfd9;border-radius:6px;padding:10px 13px;margin:8px 0;break-inside:avoid;page-break-inside:avoid}.dictionary-entry h4{font-family:inherit;font-size:10pt;margin:0 0 5px;letter-spacing:0}.dictionary-entry .reading-origin{font-size:8pt;color:#64766c;overflow-wrap:anywhere}.dictionary-records .dictionary-intro{font-size:8.5pt;color:#64766c}';

/** New schemes show their saved dictionary facts; historical report bodies receive no new section. */
export function dictionaryReadingReport(characters:CharacterEntry[],version:string|undefined):string{
 if(version!==NAMING_RULE_V6_VERSION&&!isNamingV7BaseRuleVersion(version))return '';
 const records=characters.map(entry=>{
  const readings=entry.readings||[],matching=readings.filter(row=>row.pinyin===entry.pinyin&&row.tone===entry.tone&&row.sourceId===entry.sourceId);
  if(matching.some(row=>row.referenceOnly)||entry.meaning.startsWith('辞典参照：'))throw new Error('默认读音只有辞典参照，未提供实体义，暂停导出。');
  const selected=matching.find(row=>selectedMeaningBelongsToReading(entry.meaning,row.meanings));
  const other=[...new Set(readings.filter(row=>row.pinyin!==entry.pinyin).map(row=>row.pinyin))];
  const references=readings.filter(row=>row.referenceOnly&&row.sourceReference).map(row=>`<p class="reading-origin">${esc(row.pinyin)} · 辞典参照：${esc(row.sourceReference!.text)}（未用于当前名字解释）</p>`).join('');
  return `<article class="dictionary-entry"><h4>${esc(entry.char)} · ${esc(entry.pinyin)}</h4><p class="reading-origin">${selected?'原字典词条：'+esc(selected.word):'原词条或义项未匹配，保留生成时资料待核。'}</p><p>${esc(entry.meaning)}</p>${other.length?`<p class="reading-origin">其他登记读音：${esc(other.join('、'))}；本名解释采用 ${esc(entry.pinyin)}。</p>`:''}${references}</article>`;
 }).join('');
 return `<section class="dictionary-records"><h2>生成时字库原义与读音</h2><p class="dictionary-intro">以下保留本方案生成时的字库资料；项目类比和家庭期许另列。其他读音与辞典参照不并入当前解释。</p>${records}</section>`;
}
