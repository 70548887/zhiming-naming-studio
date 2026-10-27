import ruleData from '../../data/ren-joint-battle-rules.json';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../shared/types';
import type {RenJointBattleAnalysis,RenJointBattleCheck,RenJointBattleDirectionUse,RenJointBattleNodePair,RenJointBattleState} from '../shared/ren-joint-battle-types';
import {canonicalPlainJson} from '../shared/plain-json';
import {validRenCommentaryAnalysis as validInheritedRen14} from './ditian-ren-v14';

export const REN_JOINT_BATTLE_VERSION='1.0.0' as const;
export const REN_JOINT_BATTLE_PROFILE='ren-source-wood-direction-joint-battle/1.0.0' as const;
export const REN_JOINT_BATTLE_SOURCE_ID='bazi-ditian-ren-joint-battle-2600158' as const;
const BASE_METHOD='ditian-ren-commentary-2600158/1.4.0' as const;
const SAME_PILLAR_PAIRS=[['jia-yin-geng-shen','甲寅','庚申'],['yi-mao-xin-you','乙卯','辛酉'],['bing-yin-ren-shen','丙寅','壬申'],['ding-mao-gui-you','丁卯','癸酉']];
const PROFILE_OPTIONAL=new Set(['fatherName','motherName','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod']);
const PREFERENCE_OPTIONAL=new Set(['avoidParentNames','imageryReading','yueReading','yueHomophones','yueHomophoneRuleVersion']);
/** UI input may carry absent optional values; inspect descriptors before omitting only those values. */
function normalizedProfile(value:BirthProfile):BirthProfile {
 function object(input:unknown,optional:Set<string>,profileLevel:boolean):Record<string,unknown>{
  if(!input||typeof input!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw new Error('任注出生输入必须是普通数据对象。');
  const copy:Record<string,unknown>=Object.create(null);
  for(const key of Reflect.ownKeys(input)){
   if(typeof key!=='string')throw new Error('任注出生输入含无效属性键。');
   const descriptor=Object.getOwnPropertyDescriptor(input,key)!;
   if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('任注出生输入不得含访问器或隐藏属性。');
   if(descriptor.value===undefined&&optional.has(key))continue;
   copy[key]=profileLevel&&key==='namingPreferences'?object(descriptor.value,PREFERENCE_OPTIONAL,false):descriptor.value;
  }
  return copy;
 }
 return JSON.parse(canonicalPlainJson(object(value,PROFILE_OPTIONAL,true))) as BirthProfile;
}

/** Fixed author clauses and explicit project bridges are separate from inherited1.4 facts. */
export function renJointBattleRules():typeof ruleData {
 canonicalPlainJson(ruleData);
 if(ruleData.version!==REN_JOINT_BATTLE_VERSION||ruleData.sourceId!==REN_JOINT_BATTLE_SOURCE_ID||ruleData.profileId!==REN_JOINT_BATTLE_PROFILE||ruleData.methodVersion!=='ditian-ren-commentary-2600158/1.5.0'||ruleData.clauses.length!==7||ruleData.adoption.bridges.length!==2||canonicalPlainJson(ruleData.patterns.map(p=>[p.id,p.targetGanzhi,p.attackerGanzhi]))!==canonicalPlainJson(SAME_PILLAR_PAIRS)||ruleData.adoption.requiredBaseMethod!==BASE_METHOD||ruleData.adoption.adjacencyRequired!==false||ruleData.adoption.completeInputIsMetadataOnly!==true)throw new Error('任注联合动气固定来源或采用范围不一致。');
 return structuredClone(ruleData);
}
function sameSet(a:string[],b:string[]):boolean{return a.length===b.length&&a.every(id=>b.includes(id));}

/** This layer consumes a fully authenticated frozen1.4 result, never a caller's met label alone. */
export function calculateRenJointBattleAnalysis(base14:RenCommentaryAnalysis,profile14:BirthProfile,bazi14:BaziAnalysis):RenJointBattleAnalysis {
 canonicalPlainJson(base14);canonicalPlainJson(bazi14);const inputProfile=normalizedProfile(profile14);
 if(base14.version!==BASE_METHOD||base14.profileId!==BASE_METHOD||inputProfile.renMethod!==BASE_METHOD||Object.hasOwn(base14,'jointBattleAnalysis')||!base14.directionAnalysis||!base14.actionAnalysis||!validInheritedRen14(base14,inputProfile,bazi14))throw new Error('任注联合动气层需要与出生输入一致、经冻结验证的原版1.4完整分析。');
 const rules=renJointBattleRules(),nodes=base14.structureGraph.nodes,edges=base14.structureGraph.edges,direction=base14.directionAnalysis;
 const wood=direction.checks.find(check=>check.kind==='wood-direction-strength');
 if(!wood)throw new Error('任注联合动气层缺少原1.4木方证明。');
 const proof=direction.proof.results[wood.dependencyId];
 if(!proof||proof.cycleDetected||wood.capability==='met'&&(wood.state!=='met'||proof.state!=='met'))throw new Error('任注联合动气层的木方资格与继承证明不一致。');
 const inheritedDirection:RenJointBattleDirectionUse={methodVersion:BASE_METHOD,sourceId:'bazi-ditian-ren-directions-2600158',checkId:wood.id,dependencyId:wood.dependencyId,capability:wood.capability,state:wood.state,proofResult:proof.state,sourceNodeIds:[...wood.sourceNodeIds],targetNodeIds:[...wood.targetNodeIds],validatedWholeInheritedAnalysis:true};
 const qualified=wood.capability==='met'&&wood.state==='met'&&proof.state==='met';
 const meeting=qualified?edges.find(edge=>edge.kind==='branch-sanhui'&&sameSet(edge.from,wood.sourceNodeIds)&&edge.from.every(id=>nodes.some(node=>node.id===id&&node.layer==='branch'&&['寅','卯','辰'].includes(node.symbol)))):undefined;
 if(qualified&&!meeting)throw new Error('已证明木方与同一三会边身份不一致。');
 function pair(position:string,ganzhi:string):RenJointBattleNodePair {
  const stem=nodes.find(node=>node.position===position&&node.layer==='exposed'),branch=nodes.find(node=>node.position===position&&node.layer==='branch');
  if(!stem||!branch||stem.symbol+branch.symbol!==ganzhi)throw new Error('任注天地交战必须保留同柱明干和地支。');
  return{position,ganzhi,stemNodeId:stem.id,branchNodeId:branch.id};
 }
 const checks:RenJointBattleCheck[]=[];
 for(const pattern of rules.patterns)for(const targetPillar of base14.input.pillars.filter(p=>p.known&&p.ganzhi===pattern.targetGanzhi))for(const attackerPillar of base14.input.pillars.filter(p=>p.known&&p.ganzhi===pattern.attackerGanzhi)){
  const target=pair(targetPillar.position,pattern.targetGanzhi),attacker=pair(attackerPillar.position,pattern.attackerGanzhi);
  const control=edges.find(edge=>edge.kind==='controls'&&sameSet(edge.from,[attacker.stemNodeId])&&sameSet(edge.to,[target.stemNodeId]));
  const clash=edges.find(edge=>edge.kind==='branch-clash'&&sameSet([...edge.from,...edge.to],[target.branchNodeId,attacker.branchNodeId]));
  if(!control||!clash)throw new Error('真实同柱交战对子缺少同靶克边或冲边。');
  const intersection=meeting?.from.filter(id=>[target.branchNodeId,attacker.branchNodeId].includes(id))??[];
  const localQualified=qualified&&!!meeting&&intersection.includes(target.branchNodeId);
  const state:RenJointBattleState=localQualified?'not-fully-quiet':wood.state==='not-met'?'not-applicable':'unknown';
  const targetRoots=base14.actionAnalysis.rootLinks.filter(root=>root.stemNodeId===target.stemNodeId&&root.branchNodeId===target.branchNodeId);
  const carrierRoots=base14.actionAnalysis.rootLinks.filter(root=>root.branchNodeId===target.branchNodeId);
  checks.push({id:`joint:${pattern.id}:${target.position}:${attacker.position}`,patternId:pattern.id,name:`${target.ganzhi}与${attacker.ganzhi}的联合动气`,state,scope:'selected-original-chart-joint-stem-and-branch-conflict',target,attacker,controlEdgeId:control.id,clashEdgeId:clash.id,meetingEdgeId:meeting?.id??null,meetingNodeIds:meeting?[...meeting.from]:[],meetingClashIntersectionNodeIds:intersection,inheritedDirection:structuredClone(inheritedDirection),samePillarTargetRootLinkIds:targetRoots.map(root=>root.id),relatedCarrierRootLinkIds:carrierRoots.map(root=>root.id),sourceClauseIds:[...pattern.sourceClauseIds,'ren-effective-quieting-qualification','ren-movement-can-activate-use','ren-combination-and-clash-qualified'],projectBridgeIds:rules.adoption.bridges.map(bridge=>bridge.id),sourceConsequence:rules.adoption.consequence,evidence:[`真实同柱对子为${target.position}柱${target.ganzhi}、${attacker.position}柱${attacker.ganzhi}，没有跨柱拼干支。`,`所选明干克边${control.id}与地支冲边${clash.id}均绑定这两个柱位。`,localQualified?'冻结1.4木方证明已通过；同一会边与这次冲边在目标载支相交，采用任注联合动气未全静。':'本次所需木方资格尚未成立，不能据已知交战对子单独推出本层结论。',targetRoots.length?`同柱目标根联系仅记录${targetRoots.length}条，原有效性仍待核。`:'目标干在同柱载支没有本系统所选同气藏根，不虚造目标根。'],missing:localQualified?['联合动气由哪一分量维持、哪方攻击有效及其他救法仍待核。']:wood.state==='not-met'?['本句所采用的1.4木方充分路径不适用；不反判所有旺势或所有救法。']:['1.4木方局部证明或同一会边资格待核。'],branchClashNetEffect:'unknown',rootNetEffect:'unknown',effectiveAttackSide:'unknown',otherRescueMechanisms:'unknown'});
 }
 const state:RenJointBattleState=checks.some(check=>check.state==='not-fully-quiet')?'not-fully-quiet':wood.state==='not-met'?'not-applicable':checks.length||!base14.input.complete?'unknown':'not-applicable';
 return{version:REN_JOINT_BATTLE_VERSION,profileId:REN_JOINT_BATTLE_PROFILE,sourceId:REN_JOINT_BATTLE_SOURCE_ID,authority:'ren-commentary-with-explicit-project-bridges',state,stateScope:'some-selected-joint-in-the-adopted-domain',input:{baseMethodVersion:BASE_METHOD,baseBaziVersion:bazi14.version,complete:base14.input.complete,dayStem:base14.input.dayStem??null,pillars:structuredClone(base14.input.pillars)},inheritedDirection,checks,sourceReferences:rules.clauses.map(({id,sourceId,section,layer,quote,locator})=>({id,sourceId,section,layer,quote,locator})),projectBridges:rules.adoption.bridges.map(bridge=>({...bridge,authority:'project-adoption'})),originalNodesRetained:true,retainedNodeIds:nodes.map(node=>node.id),retainedRootLinkIds:base14.actionAnalysis.rootLinks.map(root=>root.id),branchClashNetEffect:'unknown',effectiveRootSupport:'unknown',effectiveAttackSide:'unknown',clashRescueResolved:'unknown',resourceProtectionResolved:'unknown',strengthDecision:'not-evaluated',formationDecision:'not-evaluated',usefulGodDecision:'not-evaluated',limitations:[...rules.adoption.nonConclusions,'本层状态只覆盖受限采用域内所选联合对象；不把单条路径或联合仍动扩成全盘救应失败。','原注与任氏评注分层保留；可存可发是结局，不用来偷换“是否全静”的对象。','没有同柱对子或采用域不适用时，不反判交战已静。']};
}
export function validRenJointBattleAnalysis(value:unknown,base14:RenCommentaryAnalysis,profile14:BirthProfile,bazi14:BaziAnalysis):value is RenJointBattleAnalysis {
 try{return canonicalPlainJson(value)===canonicalPlainJson(calculateRenJointBattleAnalysis(base14,profile14,bazi14));}catch{return false;}
}
