import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {analyzeProfile} from '../src/domain/engine';
import type {BirthProfile} from '../src/shared/types';
import {REN_JOINT_BATTLE_METHOD,REN_DIRECTION_METHOD} from '../src/shared/ren-method';
import {RenJointBattleView} from '../src/renderer/RenJointBattleView';
import {renJointBattleReport} from '../src/main/ren-joint-battle-report';
import {ditianRenReport} from '../src/main/ditian-ren-report';
import goldens from './fixtures/ren-joint-battle-source-goldens.json';

describe('human readable joint facts retain saved identities and historical layout',()=>{
 it('shows Chinese pillar positions while preserving machine relations in the audit detail',()=>{
  const profile={...goldens.realCases[0].profile,renMethod:REN_JOINT_BATTLE_METHOD} as BirthProfile;
  const ren=analyzeProfile(profile).renCommentary!,before=JSON.stringify(ren),joint=ren.jointBattleAnalysis!,check=joint.checks[0];
  for(const html of [renderToStaticMarkup(<RenJointBattleView analysis={joint} nodes={ren.structureGraph.nodes}/>),renJointBattleReport(joint,ren.structureGraph.nodes)]){
   expect(html).toContain('日柱甲寅、月柱庚申');
   expect(html).toContain('月柱明干庚 → 日柱明干甲（日主）');
   expect(html).not.toContain('day柱');expect(html).not.toContain('month柱');
   expect(html).toContain(check.controlEdgeId);expect(html).toContain(check.clashEdgeId);expect(html).toContain(check.meetingEdgeId!);
  }
  expect(JSON.stringify(ren)).toBe(before);
  const current=ditianRenReport(ren),old=ditianRenReport(analyzeProfile({...profile,renMethod:REN_DIRECTION_METHOD}).renCommentary!);
  expect(current).toContain('<div class="ren-source-tail-group"><h3>有效生扶与制化仍需核定的条件</h3>');
  expect(old).not.toContain('<div class="ren-source-tail-group"><h3>有效生扶与制化仍需核定的条件</h3>');
 });
});
