import {describe,expect,it} from 'vitest';
import {dictionaryReadingReport} from '../src/main/dictionary-reading-report';
import {NAMING_RULE_V4_VERSION,NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION} from '../src/shared/naming-rules';
import type {CharacterEntry} from '../src/shared/types';
import table from '../data/naming-editorial-v6.json';
const entry=(char:string)=>structuredClone(table.characterOverrides.find(row=>row.char===char)!.after) as CharacterEntry;
describe('saved dictionary facts printed only for6schemes',()=>{
 it('separates the selected winter definition from the project seasonal metaphor',()=>{
  const html=dictionaryReadingReport([entry('冬')],NAMING_RULE_V6_VERSION);
  for(const text of ['生成时字库原义与读音','原字典词条：冬','dōng','一年四季中的最後一季','项目类比和家庭期许另列'])expect(html).toContain(text);
  expect(html).not.toContain('敲鼓');expect(html).not.toContain('坚韧');
 });
 it('prints shen3surname facts and marks chen2only as an unused dictionary reference',()=>{
  const html=dictionaryReadingReport([entry('沈')],NAMING_RULE_V6_VERSION);
  for(const text of ['沈 · shěn','原字典词条：沈','姓。如宋代有沈括。','chén · 辞典参照：同「沉」。','未用于当前名字解释'])expect(html).toContain(text);
  for(const text of ['沉稳','深沉','明朗','汁。'])expect(html).not.toContain(text);
 });
 it('leaves historical bodies empty and stops an invalid reference-only default',()=>{
  const ref=entry('沈');ref.pinyin='chén';ref.tone=2;ref.meaning='辞典参照：同「沉」。';
  for(const version of [undefined,NAMING_RULE_V4_VERSION,NAMING_RULE_V5_VERSION])expect(dictionaryReadingReport([ref],version)).toBe('');
  expect(()=>dictionaryReadingReport([ref],NAMING_RULE_V6_VERSION)).toThrow('未提供实体义');
 });
 it('escapes saved character and dictionary text without evaluating it',()=>{
  const value=entry('冬');value.char='<svg>';value.meaning='<script>x</script>';value.readings![0].meanings=[value.meaning];value.readings![0].word='<iframe>';
  const html=dictionaryReadingReport([value],NAMING_RULE_V6_VERSION);expect(html).toContain('&lt;svg&gt;');expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;iframe&gt;');expect(html).not.toContain('<script>');
 });
});
