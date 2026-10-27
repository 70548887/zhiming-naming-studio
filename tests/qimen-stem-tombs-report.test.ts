import {describe,expect,it} from 'vitest';
import {analyzeProfile} from '../src/domain/engine';
import {qimenStemTombsReport} from '../src/main/qimen-stem-tombs-report';
import type {BirthProfile} from '../src/shared/types';
const profile:BirthProfile={id:'tomb-report',customerName:'报告回归',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2026-10-17',birthTime:'09:30',leapMonth:false,timeUnknown:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:''};
describe('independent tomb-table delivery keeps disagreement and uncertainty visible',()=>{
 it('prints ten explicit checks, retained school disagreement and the unobserved Jia state',()=>{
  const q=analyzeProfile(profile).qimen,html=qimenStemTombsReport(q);
  expect(q.stemTombs?.checks).toHaveLength(10);expect(html).toContain('本表乙墓戌，映射乾六');expect(html).toContain('三奇规则乙入坤二');expect(html).toContain('未直接观测，不判匹配');
  for(const item of q.stemTombs!.checks){expect(html).toContain(`<td>${item.stem}</td>`);expect(html).toContain(item.targetBranch);}
  expect(html).toContain('qimen-go-stem-tombs');expect(html).toContain('4d3f58fa0f401b5b3a337f119138e99e90685dda');
 });
 it('never adds a current table to an old saved chart',()=>{const q=analyzeProfile(profile).qimen;delete q.stemTombs;const html=qimenStemTombsReport(q);expect(html).toContain('历史盘不补算');expect(html).not.toContain('<table>');});
 it('does not emit a tomb analysis for unknown birth time',()=>{expect(qimenStemTombsReport(analyzeProfile({...profile,timeUnknown:true}).qimen)).toBe('');});
 it('escapes source and evidence strings at the output boundary',()=>{const q=analyzeProfile(profile).qimen;q.stemTombs!.rules[0].sources[0].locator='<script>bad</script>';const html=qimenStemTombsReport(q);expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');});
});
