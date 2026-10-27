import {describe,expect,it} from 'vitest';
import {candidate2ProjectReport} from '../src/main/candidate2-report';
import {candidate2GenerationFixture} from './fixtures/m936-candidate2-generation';
import {catalogSession} from './fixtures/catalog-session';
import {canonicalPlainJson} from '../src/shared/plain-json';

it('supports canonical saved JSON property ordering without changing the adopted projection',()=>{
 const original=candidate2GenerationFixture().result.session,canonical=JSON.parse(canonicalPlainJson(original));
 const report=candidate2ProjectReport(canonical);
 expect(report.adoptedLabel).toBe('水（candidate.2 项目采用）');
 expect(report.html).toContain('本次实际项目选字输入');expect(report.html).not.toContain('记录不完整');
});

it('legacy optional undefined fields do not activate the C2 presentation gate',()=>{
 const legacy=catalogSession();legacy.reviewToken=undefined;legacy.reviewRevision=undefined;
 expect(candidate2ProjectReport(legacy)).toEqual({html:'',styles:''});
});

// Pure report presentation fixtures. Hash-shaped values in the existing UI
// fixture do not authenticate sources, create a native Store or qualify a row.
describe('M990 candidate2 report HTML presentation',()=>{
 it('leaves legacy sessions on their existing report path',()=>{
  expect(candidate2ProjectReport(catalogSession())).toEqual({html:'',styles:''});
 });
 it('reports the original five scores and project adoption label separately from manual review',()=>{
  const session=candidate2GenerationFixture().result.session,original={sound:87,meaning:76,simplicity:65,traditional:54,distinctiveness:43};
  session.candidates[0].evaluation={...original};session.candidate2Naming.generation.candidates[0].evaluation={...original};
  session.preferences.preferredElements=['火'];session.candidates[0].traditionalReason='后续人工传统参考说明';
  const before=JSON.stringify(session),result=candidate2ProjectReport(session);
  expect(result.adoptedLabel).toBe('水（candidate.2 项目采用）');
  expect(result.html).toContain('生成时原五项分值（照录，不重新评分）');
  expect(result.html).toContain('<td>87</td><td>76</td><td>65</td><td>54</td><td>43</td>');
  for(const key of ['sound','meaning','simplicity','traditional','distinctiveness'])expect(result.html).toContain('（'+key+'）');
  expect(result.html).toContain('traditional 数值是生成时保存的项目分项，不等于传统体系已认证');
  expect(result.html).toContain('<th>当前人工喜用审阅草稿</th><td>火</td>');
  expect(result.html).toContain('<th>传统参考说明（人工文本）</th><td>后续人工传统参考说明</td>');
  expect(JSON.stringify(session)).toBe(before);expect(session.candidates[0].evaluation).toEqual(original);
  const unsupported=structuredClone(session);(unsupported.candidate2Naming as {schema:string}).schema='candidate2-naming-session/future';
  expect(candidate2ProjectReport(unsupported).adoptedLabel).toBe('未核实（candidate.2 保存依据不完整）');
  expect(candidate2ProjectReport(catalogSession()).adoptedLabel).toBeUndefined();
 });
 it('separates saved project opinions, original favorable values and later human review without mutation',()=>{
  const session=candidate2GenerationFixture().result.session;
  session.originalFavorable=['木'];session.analysis.bazi.favorable=['木'];session.candidate2Naming.generation.baseAnalysis.bazi.favorable=['木'];
  session.preferences.preferredElements=['火'];session.reviewRevision=2;session.reviewNote='当前方案人工意见';
  session.candidates[0].meaning='人工组合寓意';session.candidates[0].reason='人工推荐理由';session.candidates[0].traditionalReason='人工文化说明';session.candidates[0].reviewNote='人工候选备注';session.candidates[0].favorite=true;
  const before=JSON.stringify(session),result=candidate2ProjectReport(session);
  expect(result.html).toContain('<th>项目主用意见</th><td>水</td>');
  expect(result.html).toContain('<th>项目避用意见</th><td>火</td>');
  expect(result.html).toContain('<th>本次实际项目选字输入</th><td>水</td>');
  expect(result.html).toContain('<th>原八字喜用候选</th><td>木</td>');
  expect(result.html).toContain('<th>当前人工喜用审阅草稿</th><td>火</td>');
  for(const value of ['当前方案人工意见','人工组合寓意','人工推荐理由','人工文化说明','人工候选备注','已收藏','传统判断：未知（unknown）','人工喜用草稿未用于本批生成','naming-element-application/1.3.2-candidate.2'])expect(result.html).toContain(value);
  expect(result.styles).toContain('.candidate2-project-report');
  expect(JSON.stringify(session)).toBe(before);
  expect(session.candidates[0].evaluation).toEqual({sound:4,meaning:3,simplicity:2,traditional:1,distinctiveness:0});
 });
 it('escapes every displayed review/source/name string rather than interpreting it as HTML',()=>{
  const session=candidate2GenerationFixture().result.session,attack='<img src=x onerror="alert(1)"><script>bad()</script>&\'';
  session.reviewNote=attack;session.candidates[0].meaning=attack;session.candidates[0].reason=attack;session.candidates[0].traditionalReason=attack;session.candidates[0].reviewNote=attack;
  session.candidates[0].fullName=attack;session.candidate2Naming.generation.candidates[0].fullName=attack;
  session.candidate2Naming.generation.dataIdentity.metadataVersion=attack;
  for(const source of [...session.sourceSnapshot.sources,...session.candidate2Naming.generation.dataIdentity.sources,...session.candidate2Naming.generation.application.certificate.sources]){source.name=attack;source.id=attack;}
  const before=JSON.stringify(session),{html}=candidate2ProjectReport(session);
  expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;&amp;&#39;');
  expect(html).not.toContain(attack);expect(html).not.toMatch(/<(?:img|script|svg|iframe)\b/i);expect(html).not.toContain('href=');
  expect(JSON.stringify(session)).toBe(before);
 });
 it('uses a static unsupported state for unknown, mixed or malformed C2 projections',()=>{
  const unsupported=(change:(value:ReturnType<typeof candidate2GenerationFixture>['result']['session'])=>void)=>{const value=candidate2GenerationFixture().result.session;change(value);return candidate2ProjectReport(value).html;};
  expect(unsupported(value=>{(value.candidate2Naming as {schema:string}).schema='candidate2-naming-session/future';})).toContain('当前报告不支持其保存版本');
  expect(unsupported(value=>{(value.candidate2Naming.generation.application.certificate as {traditionalStatus:string}).traditionalStatus='verified';})).toContain('记录不完整');
  expect(unsupported(value=>{value.candidates[0].evaluation.traditional=999;})).toContain('记录不完整');
  expect(unsupported(value=>{value.candidate2Naming.sessionBinding.profileId='different-owner';})).toContain('记录不完整');
  const missing=catalogSession('c2s_'+'c'.repeat(32));expect(candidate2ProjectReport(missing).html).toContain('记录不完整');
 });
 it('does not run an accessor while selecting the supported presentation projection',()=>{
  const session=candidate2GenerationFixture().result.session;let reads=0;
  Object.defineProperty(session.candidate2Naming.generation.dataIdentity,'metadataVersion',{enumerable:true,get(){reads++;return '<script>accessor</script>';}});
  const result=candidate2ProjectReport(session);expect(reads).toBe(0);expect(result.html).toContain('记录不完整');expect(result.html).not.toContain('<script>');
 });
});
