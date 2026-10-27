import {describe,expect,it} from 'vitest';
import {followingPatternReport} from '../src/main/following-pattern-report';
import type {FollowingPatternEvidence} from '../src/shared/types';
const evidence=():FollowingPatternEvidence=>({version:'fixture-sha/1',profile:'separate-sha-conditions',rules:[],limitations:['不把一派、水多、癸旺设为任意阈值。'],checks:[{
 id:'dependent-negative',pattern:'cong-sha',name:'丁子从杀月别路径',status:'pending',applicability:'applicable',sourceId:'fixed-source',sourceQuote:'仲冬水多癸旺，全无比印。见丁比出干，难合格局。',sourceLocator:'codepoint[10,40)',statusExplanation:'只记录明示信号，旺度前提仍未核。',supportedBy:[],opposedBy:[],missing:['水多癸旺没有可执行判据。'],requiresManualReview:true,
 criteria:[{id:'water-strong',name:'水多癸旺',role:'necessary',scope:'原句旺度未量化',result:'not-implemented',sourceQuote:'水多癸旺',sourceLocator:'loc10',observedEvidence:[],missing:['未规定旺度取法。'],decisionUse:'rejection-premise',contributesToVerdict:false},{id:'ding-exposed',name:'额外丁明干',role:'exception',scope:'仅非日主的明干',result:'met',sourceQuote:'见丁比出干',sourceLocator:'loc20',observedEvidence:['年柱丁。'],missing:[],decisionUse:'rejection-signal',contributesToVerdict:false,qualificationMissing:['须先核水多癸旺。']}],
 decisionBranches:[{id:'conditional-rejection',name:'丁明干反向分支',sourceQuote:'见丁比出干，难合格局。',sourceLocator:'loc30',premiseCriterionIds:['water-strong'],signalCriterionIds:['ding-exposed'],status:'pending',observedEvidence:['已见年柱丁。'],missing:['前提仍未核，不裁决原句。'],doesNotResolveClause:true}]
}]});
describe('dependent negative clause delivery',()=>{
 it('keeps an observed rejection signal separate from an unresolved whole-clause verdict',()=>{const html=followingPatternReport(evidence());expect(html).toContain('仅局部事实：所列事实符合');expect(html).toContain('前提未齐 · 不裁决整句');expect(html).toContain('不把已见信号等同于全部前提成立');expect(html).not.toContain('与本条指定必要条件不符');expect(html).not.toContain('字面条件候选 · 供人工复核');});
 it('prints dependency names, quotations, missing qualifications and stored observations',()=>{const html=followingPatternReport(evidence());for(const text of ['前提：水多癸旺','所列信号：额外丁明干','须先核水多癸旺','已见年柱丁','loc30'])expect(html).toContain(text);});
 it('renders an explicit branch state without inferring one from the raw criterion role',()=>{const value=evidence();value.checks[0].decisionBranches![0].status='not-triggered';const html=followingPatternReport(value);expect(html).toContain('所列信号未触发');expect(html).toContain('信息或必要条件待核');});
 it('escapes imported branch names and historical quotations',()=>{const value=evidence();value.checks[0].decisionBranches![0].name='<script>test</script>';const html=followingPatternReport(value);expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');});
});
