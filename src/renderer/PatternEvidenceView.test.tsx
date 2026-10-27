import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BaziEvidenceSource, FollowingPatternCheck, FollowingPatternEvidence } from '../shared/types';
import { followingPatternStatusLabel, PatternEvidenceView } from './PatternEvidenceView';
import { analyzeProfile } from '../domain/engine';
import type { BirthProfile } from '../shared/types';

const sources:BaziEvidenceSource[]=[{id:'cong-fixed-source',name:'所选月别原句固定修订',url:'https://example.test/oldid=2294674',revision:'fixed-2294674',locator:'甲辰、乙午未、庚卯',note:'只核明确字面条件，不推完整成格。'}];
function active():FollowingPatternCheck{return {id:'yi-wu-clause',pattern:'cong-cai',name:'乙日午月原句路径',status:'candidate',applicability:'applicable',candidateBasis:'literal-clause-only',sourceId:sources[0].id,sourceQuote:"'''若無一點水'''，又無比劫出干，方合從財格。",sourceLocator:'oldid=2294674;codepoint[100,130)',statusExplanation:'仅原句明确字面条件齐备；三夏背景尚需对读，不称真从。',criteria:[
 {id:'no-water',name:'全局未见水',role:'necessary',scope:'explicit-any-element',predicate:{kind:'element',element:'水',scope:'any',includeDayMaster:false,present:false},result:'met',sourceQuote:'無一點水',sourceLocator:'oldid=2294674;codepoint[102,107)',observedEvidence:['四柱所选明干藏干表未见水行。'],missing:[]},
 {id:'no-peer',name:'未见比劫明干',role:'necessary',scope:'explicit-exposed-stems',predicate:{kind:'stem',stem:'甲',scope:'exposed',includeDayMaster:false,present:false},result:'met',sourceQuote:'無比劫出干',sourceLocator:'oldid=2294674;codepoint[108,113)',observedEvidence:['除日主自身外，明干未见甲乙。'],missing:[]},
 ],supportedBy:['全局未见水：已知事实符合。','未见比劫明干：已知事实符合。'],opposedBy:[],missing:['三夏背景尚需对读：三夏木性枯槁。（上下文定位）','气势与充分性尚未裁决。'],requiresManualReview:true};}
function fixture():FollowingPatternEvidence{return {version:'following-test/1.0',profile:'literal-clause-profile',rules:[{id:'following-rule',version:'rule-v1',name:'限定原句必要条件核对',sourceIds:[sources[0].id],conditions:['不同月别原句不能拼成统一取法。','不以扶抑权重或姓名笔画断从。']}],checks:[active(),{id:'cong-sha-unimplemented',pattern:'cong-sha',name:'从杀待独立取法',status:'not-evaluated',applicability:'not-applicable',sourceQuote:'',sourceLocator:'',statusExplanation:'未接入可独立核对的同条条件，不套用从财。',criteria:[],supportedBy:[],opposedBy:[],missing:['来源仍待整理。'],requiresManualReview:true}],limitations:['本项不改变喜用或名字排序。','缺时柱不猜全局无根。']};}
const render=(evidence?:FollowingPatternEvidence)=>renderToStaticMarkup(<PatternEvidenceView evidence={evidence} sources={sources}/>);

describe('clause-specific following-pattern evidence UI',()=>{
 it('does not supplement old records or introduce current sources without a saved evidence snapshot',()=>{
  const html=render();expect(html).toContain('本版未记录');expect(html).toContain('不补入当前取法或重新定格');expect(html).not.toContain('fixed-2294674');expect(html).not.toContain('无一點水');
 });
 it('keeps a literal candidate distinct from a confirmed pattern or complete necessary-condition judgment',()=>{
  const value=fixture(),before=structuredClone(value),html=render(value);
  for(const word of ['字面条件候选 · 供人工复核','仅软件字面结构，未裁定原典成立','不是真从或充分成格结论','历史引文，不作软件结论','原句与适用背景','三夏背景尚需对读','方合從財格'])expect(html).toContain(word);
  expect(html).not.toContain('&#39;&#39;&#39;');expect(html).not.toContain('&#x27;&#x27;&#x27;');expect(value).toEqual(before);
 });
 it('ties a contradiction to the exact necessary criterion rather than negating every method',()=>{
  const value=fixture(),check=value.checks[0];check.status='contradicted';delete check.candidateBasis;check.criteria[0].result='not-met';check.criteria[0].observedEvidence=['月柱辰藏癸，已见水行。'];check.opposedBy=['全局未见水：与本句明确必要条件不符。'];
  const html=render(value);for(const word of ['与本条必要条件不符','全局未见水','针对本条的反对事实','月柱辰藏癸，已见水行。','反证仅限本条明确条件','不代表所有从格、其他原句或流派都被否定'])expect(html).toContain(word);
  expect(html).not.toContain('class="pattern-evidence-check candidate"');
 });
 it('shows pending and unknown necessary conditions without proving absence or completing missing hour facts',()=>{
  const value=fixture(),check=value.checks[0];check.status='pending';check.applicability='possible';delete check.candidateBasis;check.criteria[0].result='unknown';check.criteria[0].missing=['缺时柱，已知柱未见不能证明全局没有。'];check.criteria[1].result='not-implemented';check.criteria[1].missing=['比劫取法尚未明确。'];
  const html=render(value);for(const word of ['条件待核','当前月支仍待定','资料不足 · 未知','取法尚未实现','已知柱未见不证明全局没有','不补时柱或推定无根','缺时柱','比劫取法尚未明确'])expect(html).toContain(word);
 });
 it('keeps inapplicable and unavailable patterns in a short scope list rather than generating detailed case cards',()=>{
  const value=fixture();value.checks[0].applicability='not-applicable';value.checks[0].status='not-evaluated';
  const html=render(value);expect(html).toContain('当前日干、月支没有本版可执行的适用路径');expect(html).toContain('不适用 · 未评估');expect(html).toContain('从杀待独立取法');expect(html).not.toContain('class="pattern-evidence-check');expect(html).not.toContain('class="pattern-criterion ');
  expect(html).toContain('未评估当作已排除从格');
 });
 it('retains criterion-level source, version, support, opposition and missing conditions in collapsed keyboard-native disclosures',()=>{
  const value=fixture(),html=render(value);for(const check of value.checks.filter(item=>item.applicability!=='not-applicable'))for(const criterion of check.criteria)for(const word of [criterion.id,criterion.name,criterion.scope,criterion.sourceQuote,criterion.sourceLocator,...criterion.observedEvidence,...criterion.missing])expect(html).toContain(word);
  for(const rule of value.rules)for(const word of [rule.id,rule.name,rule.version,...rule.conditions])expect(html).toContain(word);
  for(const source of sources)for(const word of [source.id,source.name,source.revision,source.url,source.locator,source.note])expect(html).toContain(word);
  expect(html).toContain('aria-labelledby="pattern-evidence-heading"');expect(html).toContain('逐项条件、事实范围与依据');expect(html).not.toContain('<details open');
 });
 it('escapes malicious imported prose and renders unsafe source schemes as unlinked text',()=>{
  const value=fixture();value.checks[0].sourceQuote='<script>quote()</script>';value.checks[0].criteria[0].sourceQuote='<img src=x>';value.checks[0].criteria[0].observedEvidence=['<iframe>'];value.limitations=['<svg onload="x">'];const hostile=[{...sources[0],url:'javascript:attack()',name:'<script>source()</script>'}];
  const html=renderToStaticMarkup(<PatternEvidenceView evidence={value} sources={hostile}/>);for(const word of ['&lt;script&gt;','&lt;img','&lt;iframe&gt;','&lt;svg'])expect(html).toContain(word);for(const word of ['<script>','<img','<iframe>','<svg','href="javascript:'])expect(html).not.toContain(word);
 });
 it('labels candidate and unsupported scope explicitly without relying on color',()=>{
  expect(followingPatternStatusLabel(active())).toBe('字面条件候选 · 供人工复核');expect(followingPatternStatusLabel({...active(),status:'not-evaluated'})).toBe('本条未评估');expect(followingPatternStatusLabel({...active(),applicability:'not-applicable'})).toBe('不适用 · 未评估');
 });
 it('retains all historical background text inside contextual reading rather than repeating it in default missing facts',()=>{
  const value=fixture();value.checks[0].missing.push('原文背景尚需对读：富屋贫人原句（oldid-codepoint）');const html=render(value);
  expect(html).toContain('原文背景尚需对读：富屋贫人原句（oldid-codepoint）');expect(html).toContain('背景原文对读 · 尚未核定');
  const defaultMissing=html.slice(html.indexOf('class="pattern-evidence-triad"'),html.indexOf('class="pattern-evidence-criteria"'));expect(defaultMissing).not.toContain('富屋贫人原句');expect(defaultMissing).toContain('历史背景对读');expect(value.checks[0].missing.at(-1)).toBe('原文背景尚需对读：富屋贫人原句（oldid-codepoint）');
 });
 it('renders real current candidate, unknown-time and exposed-stem counterexamples without upgrading saved judgments',()=>{
  const base:BirthProfile={id:'pattern-ui-real',customerName:'隔离阅读',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2029-06-24',birthTime:'03:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
  const inputs=[{profile:base,status:'candidate',expected:'字面条件候选 · 供人工复核'},{profile:{...base,timeUnknown:true,birthTime:''},status:'pending',expected:'资料不足 · 未知'},{profile:{...base,birthDate:'2020-03-08',birthTime:'01:30:00'},status:'contradicted',expected:'与本条必要条件不符'}] as const;
  for(const input of inputs){const result=analyzeProfile(input.profile).bazi.evidence!,before=structuredClone(result.patternEvidence),html=renderToStaticMarkup(<PatternEvidenceView evidence={result.patternEvidence} sources={result.sources}/>);expect(result.patternEvidence!.checks.some(check=>check.status===input.status&&check.applicability==='applicable')).toBe(true);expect(html).toContain(input.expected);expect(html.match(/class="pattern-evidence-check /g)).toHaveLength(1);expect(result.patternEvidence).toEqual(before);expect(html).toContain('从儿待独立取法');expect(html).toContain('从旺待独立取法');expect(html).toContain('本版其他范围');const inactive=html.slice(html.indexOf('class="pattern-evidence-inactive"'),html.indexOf('class="pattern-evidence-provenance"'));expect(inactive).toContain('不适用 · 未评估');for(const check of result.patternEvidence!.checks.filter(item=>item.pattern==='cong-sha')){expect(check.applicability).toBe('not-applicable');expect(inactive).toContain(check.name);}expect(inactive).not.toContain('class="pattern-criterion');}
 });
 it('does not promote a met local rejection signal to opposition when its full-clause dependency is unresolved',()=>{
  const value=fixture(),check=value.checks[0];check.name='己日子月从杀原句';check.pattern='cong-sha';check.status='pending';delete check.candidateBasis;check.statusExplanation='水多、无火等原句前提未核，仅列有甲无戊的局部观察。';check.supportedBy=[];check.opposedBy=[];check.criteria=[
   {id:'water-many',name:'水多的原句前提',role:'necessary',scope:'strength-scope-not-operationalized',result:'not-implemented',sourceQuote:'水多無火',sourceLocator:'fixed[1,5)',observedEvidence:[],missing:['水多未有明确量化取法。'],decisionUse:'rejection-premise',contributesToVerdict:false,qualificationMissing:['强弱及水势尚未核定。']},
   {id:'jia-without-wu',name:'有甲无戊的局部信号',role:'exception',scope:'explicit-exposed',result:'met',sourceQuote:'有甲無戊，不能從殺',sourceLocator:'fixed[6,16)',observedEvidence:['年干甲已见，已知明干未见戊。'],missing:[],decisionUse:'rejection-signal',contributesToVerdict:false,qualificationMissing:['不能脱离水多无火背景，把局部观察当整句反证。']},
  ];check.decisionBranches=[{id:'conditional-rejection',name:'依赖水多前提的否定分支',sourceQuote:'水多無火，有甲無戊，不能從殺',sourceLocator:'fixed[1,16)',premiseCriterionIds:['water-many'],signalCriterionIds:['jia-without-wu'],status:'pending',observedEvidence:['已见局部信号；前提尚未齐备。'],missing:['水多没有完成取法。'],doesNotResolveClause:true}];
  const html=render(value);for(const word of ['局部事实：已知事实符合','只核局部事实，整句尚未裁决','前提未齐 · 整句尚未裁决','否定分支的局部信号','水多的原句前提','必须先核对的前提','有甲无戊的局部信号','不能脱离水多无火背景','不裁决整条从杀原句'])expect(html).toContain(word);
  expect(html).not.toContain('class="pattern-criterion opposed"');expect(html).not.toContain('针对本条的反对事实');expect(html).toContain('class="pattern-evidence-check pending"');
 });
 it('keeps actual Ding Zi and Gui Wu met signals local while their unresolved rejection prerequisites remain pending',()=>{
  const base:BirthProfile={id:'actual-sha-ui',customerName:'独立从杀阅读',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-12-09',birthTime:'13:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
  const cases=[{profile:base,id:'ding-zi-monthly-cong-sha',signal:'ding-zi-extra-ding-exposed'},{profile:{...base,birthDate:'2020-06-09',birthTime:'03:30:00'},id:'gui-wu-monthly-cong-sha',signal:'gui-wu-jia-exposed-signal'}];
  for(const input of cases){const evidence=analyzeProfile(input.profile).bazi.evidence!,snapshot=structuredClone(evidence.patternEvidence),check=evidence.patternEvidence!.checks.find(item=>item.id===input.id)!,signal=check.criteria.find(item=>item.id===input.signal)!;expect(check.status).toBe('pending');expect(check.opposedBy).toEqual([]);expect(signal.result).toBe('met');expect(signal.contributesToVerdict).toBe(false);expect(check.decisionBranches!.every(branch=>branch.status==='pending')).toBe(true);const html=renderToStaticMarkup(<PatternEvidenceView evidence={evidence.patternEvidence} sources={evidence.sources}/>);for(const word of [check.name,'局部事实：已知事实符合','只核局部事实，整句尚未裁决','前提未齐 · 整句尚未裁决',...signal.observedEvidence,...signal.qualificationMissing!])expect(html).toContain(word);expect(html.match(/class="pattern-evidence-check /g)).toHaveLength(1);expect(html).not.toContain('class="pattern-criterion opposed"');expect(html).not.toContain('针对本条的反对事实');expect(evidence.patternEvidence).toEqual(snapshot);}
 });
 it('renders actual unknown-hour Sha observations as unknown without manufacturing a whole-clause rejection',()=>{
  const base:BirthProfile={id:'actual-sha-unknown-ui',customerName:'未知时刻阅读',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-12-09',birthTime:'',timeUnknown:true,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
  for(const profile of [base,{...base,birthDate:'2020-06-09'},{...base,birthDate:'2022-06-16'}]){const bazi=analyzeProfile(profile).bazi,evidence=bazi.evidence!,check=evidence.patternEvidence!.checks.find(item=>item.pattern==='cong-sha'&&item.applicability==='applicable')!;expect(check.status).toBe('pending');expect(check.opposedBy).toEqual([]);expect(check.criteria.some(item=>item.result==='unknown')).toBe(true);expect(bazi.pillars.some(pillar=>pillar.label==='时柱')).toBe(false);const html=renderToStaticMarkup(<PatternEvidenceView evidence={evidence.patternEvidence} sources={evidence.sources}/>);expect(html).toContain('条件待核');expect(html).toContain('资料不足 · 未知');expect(html).toContain('已知柱未见不证明全局没有');expect(html).not.toContain('class="pattern-criterion opposed"');expect(html).not.toContain('class="pattern-evidence-check contradicted"');}
 });
 it('keeps the actual Geng Wu source strength and control prerequisites unimplemented despite known exposed-stem facts',()=>{
  const profile:BirthProfile={id:'actual-geng-wu-ui',customerName:'庚午条件阅读',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2022-06-16',birthTime:'01:30:00',timeUnknown:false,leapMonth:false,birthPlace:'上海',timezone:'Asia/Shanghai',notes:''};
  const evidence=analyzeProfile(profile).bazi.evidence!,check=evidence.patternEvidence!.checks.find(item=>item.id==='geng-wu-monthly-cong-sha')!;expect(check.status).toBe('pending');expect(check.criteria.some(item=>item.result==='not-implemented')).toBe(true);expect(check.opposedBy).toEqual([]);const html=renderToStaticMarkup(<PatternEvidenceView evidence={evidence.patternEvidence} sources={evidence.sources}/>);expect(html).toContain(check.name);expect(html).toContain('条件待核');expect(html).toContain('取法尚未实现');for(const criterion of check.criteria)for(const missing of criterion.missing)expect(html).toContain(missing);expect(html.match(/class="pattern-evidence-check /g)).toHaveLength(1);expect(html).not.toContain('class="pattern-evidence-check candidate"');
 });
});
