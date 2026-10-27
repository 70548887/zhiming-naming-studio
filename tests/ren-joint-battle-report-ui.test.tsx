import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {analyzeProfile} from '../src/domain/engine';
import {calculateRenCommentary as calculateRen14,validRenCommentaryAnalysis as validRen14} from '../src/domain/ditian-ren-v14';
import {calculateRenJointBattleAnalysis} from '../src/domain/ren-joint-battle';
import type {BirthProfile} from '../src/shared/types';
import {REN_JOINT_SCOPE_TEXT,REN_JOINT_RETAINED_TEXT,renJointBattleStateLabel} from '../src/shared/ren-joint-battle-presentation';
import {RenJointBattleView} from '../src/renderer/RenJointBattleView';
import {RenCommentaryView} from '../src/renderer/RenCommentaryView';
import {renJointBattleReport} from '../src/main/ren-joint-battle-report';
import {ditianRenReport} from '../src/main/ditian-ren-report';
import goldens from './fixtures/ren-joint-battle-source-goldens.json';

const cache=new Map<string,ReturnType<typeof actual>>();
function actual(index=0,changes:Partial<BirthProfile>={}){
 const profile={...goldens.realCases[index].profile,renMethod:'ditian-ren-commentary-2600158/1.5.0',...changes} as BirthProfile,analysis=analyzeProfile(profile),ren=analysis.renCommentary!,joint=ren.jointBattleAnalysis!;
 const profile14={...profile,renMethod:'ditian-ren-commentary-2600158/1.4.0'} as BirthProfile,bazi14={...analysis.bazi,version:'civil-midnight-fuyi-candidate/1.14.0;lunar-typescript/1.8.6'},base14=calculateRen14(profile14,bazi14)!;
 expect(validRen14(base14,profile14,bazi14)).toBe(true);expect(joint).toEqual(calculateRenJointBattleAnalysis(base14,profile14,bazi14));
 return{ren,joint,nodes:ren.structureGraph.nodes,base14};
}
function real(index=0){const key=String(index);if(!cache.has(key))cache.set(key,actual(index));return cache.get(key)!;}
function rendered(item:ReturnType<typeof actual>){return[renderToStaticMarkup(<RenJointBattleView analysis={item.joint} nodes={item.nodes}/>),renJointBattleReport(item.joint,item.nodes)];}
function consequenceParagraph(html:string,consequence:string){const at=html.indexOf(consequence);expect(at).toBeGreaterThan(-1);return html.slice(html.lastIndexOf('<p',at),html.indexOf('</p>',at)+4);}

describe('actual frozen14 to new15 joint presentation, independently of source evaluator tests',()=>{
 it('shows an actual supported joint and its narrow retained scope in both UI and report',()=>{
  const item=real(),before=JSON.stringify(item.ren);expect(item.joint.state).toBe('not-fully-quiet');
  for(const html of rendered(item)){
   expect(html).toContain('天地冲克与方会 · 限定核查');expect(html).toContain(REN_JOINT_SCOPE_TEXT);expect(html).toContain(REN_JOINT_RETAINED_TEXT);expect(html).toContain(renJointBattleStateLabel['not-fully-quiet']);
   expect(html).toContain('日柱明干甲（日主）');expect(html).toContain('月柱明干庚');expect(html).toContain('日柱地支本气寅');
   expect(html).toContain('本条继承证明为 本证明条件齐备');expect(html).toContain(item.joint.checks[0].clashEdgeId);expect(html).toContain(item.joint.checks[0].meetingEdgeId!);
   expect(html).not.toContain('从强已经成立');expect(html).not.toContain('本盘根已被拔');
  }
  expect(JSON.stringify(item.ren)).toBe(before);
 });
 it('marks the actual result as proved while qualifying an unknown result instead of asserting it as current',()=>{
  const known=real(),unknown=actual(0,{timeUnknown:true,birthTime:''});expect(unknown.joint.state).toBe('unknown');expect(unknown.joint.checks).toHaveLength(1);
  for(const html of rendered(known))expect(consequenceParagraph(html,known.joint.checks[0].sourceConsequence)).toContain('本次限定判断：');
  for(const html of rendered(unknown)){
   expect(html).toContain('资料或前提待核');expect(html).toContain('不能把未知当作已经静息或已经受损');expect(html).toContain('方会边 待核');
   const paragraph=consequenceParagraph(html,unknown.joint.checks[0].sourceConsequence);expect(paragraph).toContain('前提齐备且符合本条范围时，才可采用以下后果；当前未作此判断：');expect(paragraph).not.toContain('本次限定判断：');
  }
  expect(unknown.nodes.some(node=>node.position==='hour')).toBe(false);
 });
 it('keeps actual original and Ren authority layers readable and separate from declared project bridges',()=>{
  const item=real();
  for(const html of rendered(item)){
   expect(html).toContain('以下是本产品明示的采用约定，与作者原句分开记录');expect(html).toContain('本条按任氏评注采用；所列原注只供对读，不合并为同一判断');
   expect(html).toContain('任氏评注（天地交战限定条文）');expect(html).toContain('原注（独立对读）');expect(html).not.toContain('ren-commentary;joint-battle-limited-domain');expect(html).not.toContain('original-commentary;context-only');
   for(const bridge of item.joint.projectBridges){expect(html).toContain(bridge.name);expect(html).toContain(bridge.statement);}
   for(const reference of item.joint.sourceReferences){expect(html).toContain(reference.locator);expect(html).toContain(reference.sourceId);expect(html).toContain(reference.quote);}
   const adoption=html.indexOf('本产品采用的解释范围'),sources=html.indexOf('原句、注家与固定出处');expect(adoption).toBeLessThan(sources);expect(html.indexOf(item.joint.projectBridges[0].name)).toBeLessThan(sources);
   expect(html).toContain('或无库神贵神');expect(html).toContain('冲亦有且不宜');
  }
 });
 it('renders the real scattered-pillar negative without calling it quiet, safe, or absent conflict',()=>{
  const item=actual(0,{birthDate:'2000-08-24',birthTime:'06:30'});expect(item.joint.inheritedDirection.capability).toBe('met');expect(item.joint.state).toBe('not-applicable');expect(item.joint.checks).toHaveLength(0);
  for(const html of rendered(item)){expect(html).toContain('不在本条采用范围');expect(html).toContain('不能把空列表当作没有冲克');expect(html).toContain('不据此否定其他冲克、会合或解救');expect(html).not.toContain('本盘已静息');expect(html).not.toContain('安全通过');}
 });
 it('keeps Ding/Mao without a same-pillar Ding root while showing related carrier links honestly',()=>{
  const item=real(3);expect(item.joint.checks[0].samePillarTargetRootLinkIds).toEqual([]);expect(item.joint.checks[0].relatedCarrierRootLinkIds.length).toBeGreaterThan(0);
  for(const html of rendered(item)){expect(html).toMatch(/同柱根联系\s*0\s*项/);expect(html).toContain('目标干在同柱载支没有本系统所选同气藏根，不虚造目标根');expect(html).toContain('不把联系当作有效根');expect(html).not.toContain('丁火有效根已成立');}
 });
 it('adds the actual new layer once through parent UI/report, without backfilling it onto the old14 parent',()=>{
  const item=real(),childUI=renderToStaticMarkup(<RenJointBattleView analysis={item.joint} nodes={item.nodes}/>),childReport=renJointBattleReport(item.joint,item.nodes),parentUI=renderToStaticMarkup(<RenCommentaryView analysis={item.ren}/>),parentReport=ditianRenReport(item.ren);
  expect(parentUI).toContain(childUI);expect(parentReport).toContain(childReport);expect((parentUI.match(/id="ren-joint-battle-title"/g)??[])).toHaveLength(1);expect((parentReport.match(/class="ren-joint-report"/g)??[])).toHaveLength(1);
  expect(renderToStaticMarkup(<RenCommentaryView analysis={item.base14}/>)).not.toContain('天地冲克与方会 · 限定核查');expect(ditianRenReport(item.base14)).not.toContain('class="ren-joint-report"');
  expect(renderToStaticMarkup(<RenJointBattleView/>)).toBe('');expect(renJointBattleReport(undefined,[])).toBe('');
 });
 it('escapes untrusted result, evidence, source, bridge, edge and node labels as plain text',()=>{
  const item=real(),joint=structuredClone(item.joint),nodes=structuredClone(item.nodes),payload='<img src=x onerror="untrusted">&';joint.checks[0].name=payload;joint.checks[0].sourceConsequence=payload;joint.checks[0].evidence=[payload];joint.checks[0].controlEdgeId=payload;joint.sourceReferences[0].quote=payload;joint.projectBridges[0].name=payload;joint.projectBridges[0].statement=payload;nodes.find(n=>n.id===joint.checks[0].target.stemNodeId)!.symbol=payload;
  for(const html of [renderToStaticMarkup(<RenJointBattleView analysis={joint} nodes={nodes}/>),renJointBattleReport(joint,nodes)]){expect(html).toContain('&lt;img');expect(html).toContain('&amp;');expect(html).not.toContain('<img');expect(html).not.toContain('<script');}
 });
 it.each(['target-stem','attacker-branch','meeting','intersection'])('stops report export when a displayed saved node is absent: %s',field=>{
  const item=real(),joint=structuredClone(item.joint),missing='absent-recorded-node';
  if(field==='target-stem')joint.checks[0].target.stemNodeId=missing;if(field==='attacker-branch')joint.checks[0].attacker.branchNodeId=missing;if(field==='meeting')joint.checks[0].meetingNodeIds=[missing];if(field==='intersection')joint.checks[0].meetingClashIntersectionNodeIds=[missing];
  expect(()=>renJointBattleReport(joint,item.nodes)).toThrow('缺失字位');expect(renderToStaticMarkup(<RenJointBattleView analysis={joint} nodes={item.nodes}/>)).toContain('字位待核');
 });
});
