import type {RenCommentaryAnalysis,RenRelation,RenSourceCaseMatch,RenStructureEdge,RenStructureNode} from './types';
export const renRelationLabel:Record<RenRelation,string>={peer:'比劫',resource:'印',output:'食伤',wealth:'财',officer:'官杀'};
export const renPositionLabel={year:'年柱',month:'月柱',day:'日柱',hour:'时柱'};
export const renLayerLabel={exposed:'明干',hidden:'藏干',branch:'地支本气'};
export const renEdgeLabel:Record<RenStructureEdge['kind'],string>={generates:'相生关系',controls:'相克关系','stem-combination':'明干五合成员','branch-clash':'地支六冲成员','branch-sanhe':'完整三合成员','branch-sanhui':'完整三会成员','potential-root':'同五行藏根候选','cover-carrier':'同柱载覆位置'};
export const renObservationLabel={present:'已见所列结构','not-listed':'所查位置未见',unknown:'资料不足 · 待核'};
export const renDependencyStateLabel={met:'所列前提符合','not-met':'所列前提不符',unknown:'必要条件待核',conflict:'依据冲突 · 暂不裁决'};
export const renNecessaryStatusLabel={contradicted:'本条必要字面条件不符','not-excluded':'已见所需字面成员 · 未据此排除',unknown:'资料不足 · 缺项尚不能确定'};
export const renAuthorityLabel=(layer:string):string=>({'ren-commentary;joint-battle-limited-domain':'任氏评注（天地交战限定条文）','original-commentary;context-only':'原注（独立对读）','ren-commentary;source-sufficient-direction-capacity':'任氏评注（成方局部旺势条文）','ren-commentary;source-sufficient-local-capacity':'任氏评注（限定能力条文）','compiled-couplet':'编校补句（仅对读）','original-note':'原注（独立对读）','ren-commentary':'任氏评注','ren-continuation':'任注续文'}[layer]??layer);
export const renCaseEvidenceLabel=(value:string):string=>({asserted:'原文直接取此分类','asserted-relation':'原文关系解释，不等同日主化格','chapter-only':'仅按所在章节登记','chapter-only-false':'仅处于假从／假化章节','explicit-alternative':'原文明确另取其他方法','explicit-false':'原文明确标为假','explicit-negative':'原文明确否定此取法','explicit-negative-counterfactual':'实际原盘不取；反事实仅供对读','explicit-negative-relation':'原文否定此项化成关系','explicit-true':'原文明确标为真','not-specific':'原文未明确细分格类',quarantined:'疑文隔离，保留原记录'}[value]??value);
export const renCaseStatusLabel=(item:RenSourceCaseMatch):string=>item.status==='quarantined'?'疑文隔离 · 不作结论':item.status==='chapter-context'?'仅章节语境 · 非明确真假标签':'原作者对本例的分类';
export const renNodeText=(node:RenStructureNode):string=>`${node.pillar}${renLayerLabel[node.layer]}${node.symbol}${node.isDayMaster?'（日主）':''}`;
export function renEdgeNodes(data:RenCommentaryAnalysis,ids:string[]):string {
  return ids.map(id=>{const node=data.structureGraph.nodes.find(item=>item.id===id);return node?renNodeText(node):id;}).join('、');
}
export function renSummary(data:RenCommentaryAnalysis):string {
  return data.sourceCaseMatches.length?`四柱与原书 ${data.sourceCaseMatches.length} 个记录相同；原作者分类按各条语境保留，不作为任意新盘的通用判格。`:'未匹配完整原书四柱例；这不表示格局不成立，有效生扶与制化仍待核。';
}
