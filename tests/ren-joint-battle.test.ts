import {describe,expect,it} from 'vitest';
import {Solar} from 'lunar-typescript';
import {analyzeProfile} from '../src/domain/engine';
import {calculateRenCommentary as calculateRen14,validRenCommentaryAnalysis as validRen14} from '../src/domain/ditian-ren-v14';
import {calculateRenJointBattleAnalysis,validRenJointBattleAnalysis,renJointBattleRules} from '../src/domain/ren-joint-battle';
import type {BirthProfile,RenCommentaryAnalysis} from '../src/shared/types';
import goldens from './fixtures/ren-joint-battle-source-goldens.json';

function sample(profile:BirthProfile){const analysis=analyzeProfile(profile),bazi=analysis.bazi,base=calculateRen14(profile,bazi)!;expect(validRen14(base,profile,bazi)).toBe(true);return{profile,bazi,base};}
function makeProfile(date:string,time:string,timeUnknown=false):BirthProfile{return{...goldens.realCases[0].profile,id:'joint-test-'+date,birthDate:date,birthTime:time,timeUnknown} as BirthProfile;}
const cache=new Map<string,ReturnType<typeof sample>>();
function real(index:number){const key=goldens.realCases[index].id;if(!cache.has(key))cache.set(key,sample(goldens.realCases[index].profile as BirthProfile));return cache.get(key)!;}

describe('limited Ren joint nonquieting consumes a genuine frozen1.4 proof',()=>{
 it.each(goldens.realCases.map((row,index)=>({row,index})))('binds actual same-pillar pair, wood proof and the same meeting/clash: $row.id',({row,index})=>{
  const {profile,bazi,base}=real(index),before=JSON.stringify(base),value=calculateRenJointBattleAnalysis(base,profile,bazi),expected=row.expected;
  expect(value.state).toBe(expected.state);expect(value.inheritedDirection).toMatchObject({capability:'met',state:'met',proofResult:'met',validatedWholeInheritedAnalysis:true});
  expect(value.checks).toHaveLength(1);const check=value.checks[0];
  expect(check).toMatchObject({state:expected.state,target:expected.target,attacker:expected.attacker,controlEdgeId:expected.controlEdgeId,clashEdgeId:expected.clashEdgeId,meetingEdgeId:expected.meetingEdgeId,meetingClashIntersectionNodeIds:expected.intersection,samePillarTargetRootLinkIds:expected.samePillarTargetRootLinkIds,branchClashNetEffect:'unknown',rootNetEffect:'unknown',effectiveAttackSide:'unknown',otherRescueMechanisms:'unknown'});
  expect(check.meetingNodeIds).toEqual(base.directionAnalysis!.checks.find(c=>c.kind==='wood-direction-strength')!.sourceNodeIds);
  expect(value.retainedNodeIds).toEqual(base.structureGraph.nodes.map(node=>node.id));expect(value.retainedRootLinkIds).toEqual(base.actionAnalysis!.rootLinks.map(root=>root.id));
  expect(value).toMatchObject({branchClashNetEffect:'unknown',effectiveRootSupport:'unknown',effectiveAttackSide:'unknown',clashRescueResolved:'unknown',resourceProtectionResolved:'unknown',formationDecision:'not-evaluated',strengthDecision:'not-evaluated',usefulGodDecision:'not-evaluated'});
  expect(JSON.stringify(base)).toBe(before);expect(base.structureGraph.edges.every(e=>e.effectiveAction==='unknown')).toBe(true);expect(base.actionAnalysis!.rootLinks.every(r=>r.effectiveSupport==='unknown')).toBe(true);
  expect(validRenJointBattleAnalysis(value,base,profile,bazi)).toBe(true);
 });
 it('does not demand adjacency or require that the paired target is the day master',()=>{
  const a=real(1),b=real(2),valueA=calculateRenJointBattleAnalysis(a.base,a.profile,a.bazi),valueB=calculateRenJointBattleAnalysis(b.base,b.profile,b.bazi);
  expect(valueA.checks[0].attacker.position).toBe('year');expect(valueA.checks[0].target.position).toBe('day');expect(valueB.checks[0].target.position).toBe('hour');expect(valueB.checks[0].attacker.position).toBe('year');
 });
 it('does not manufacture a Ding root on Mao or borrow the other Wood roots on that carrier',()=>{
  const {base,profile,bazi}=real(3),check=calculateRenJointBattleAnalysis(base,profile,bazi).checks[0];
  expect(check.target.ganzhi).toBe('丁卯');expect(check.samePillarTargetRootLinkIds).toEqual([]);expect(check.relatedCarrierRootLinkIds.length).toBeGreaterThan(0);
  const related=base.actionAnalysis!.rootLinks.filter(root=>check.relatedCarrierRootLinkIds.includes(root.id));expect(related.every(root=>root.stemNodeId!==check.target.stemNodeId)).toBe(true);
 });
 it.each(goldens.boundaryCases)('does not turn outside or unknown input into a quieting verdict: $id',row=>{
  const {base,profile:p,bazi}=sample(makeProfile(row.date,row.time??'',row.timeUnknown??false)),value=calculateRenJointBattleAnalysis(base,p,bazi);
  expect(value.state).toBe(row.expectedState);expect(value.clashRescueResolved).toBe('unknown');
  if('pillars'in row)expect(base.input.pillars.map(p=>p.ganzhi)).toEqual(row.pillars);
  if(row.id==='unlisted-shen-pillar-cannot-borrow-geng'){expect(value.inheritedDirection.capability).toBe('met');expect(base.structureGraph.edges.some(e=>e.kind==='branch-clash')).toBe(true);expect(value.checks).toEqual([]);}
  if(row.id==='scattered-geng-and-shen-are-not-geng-shen'){expect(value.inheritedDirection.capability).toBe('met');expect(base.structureGraph.nodes.some(n=>n.layer==='exposed'&&n.symbol==='庚')).toBe(true);expect(base.structureGraph.nodes.some(n=>n.layer==='branch'&&n.symbol==='申')).toBe(true);expect(base.input.pillars.some(p=>p.ganzhi==='庚申')).toBe(false);expect(value.checks).toEqual([]);}
  if(row.id==='positive-jia-hour-unknown'){expect(value.checks).toHaveLength(1);expect(value.checks[0].state).toBe('unknown');expect(value.checks[0].meetingEdgeId).toBeNull();expect(base.input.pillars.find(p=>p.position==='hour')!.known).toBe(false);expect(value.retainedNodeIds.some(id=>id.startsWith('hour:'))).toBe(false);}
 });
 it('does not treat known Wood-domain failure as either a global strength or a rescue failure',()=>{
  const {base,profile:p,bazi}=sample(makeProfile('1977-06-18','14:00')),value=calculateRenJointBattleAnalysis(base,p,bazi);expect(value.inheritedDirection.state).toBe('not-met');expect(value.state).toBe('not-applicable');expect(value.clashRescueResolved).toBe('unknown');
 });
 it('rejects a forged met label without its actual inherited full proof',()=>{
  const {base,profile,bazi}=sample(makeProfile('2023-08-24','',true)),forged=structuredClone(base),wood=forged.directionAnalysis!.checks.find(c=>c.kind==='wood-direction-strength')!;wood.capability='met';wood.state='met';forged.directionAnalysis!.proof.results[wood.dependencyId].state='met';
  expect(()=>calculateRenJointBattleAnalysis(forged,profile,bazi)).toThrow('冻结验证');
 });
 it('rejects mixing inherited charts, wrong same-pillar nodes, or a grafted meeting from a different chart',()=>{
  const a=real(0),b=real(1);expect(()=>calculateRenJointBattleAnalysis(a.base,b.profile,b.bazi)).toThrow('冻结验证');
  const forged=structuredClone(a.base);forged.structureGraph.nodes.find(node=>node.id==='month:exposed:庚')!.position='year';expect(()=>calculateRenJointBattleAnalysis(forged,a.profile,a.bazi)).toThrow('冻结验证');
  const value=calculateRenJointBattleAnalysis(a.base,a.profile,a.bazi);value.checks[0].meetingEdgeId=goldens.realCases[1].expected.meetingEdgeId;value.checks[0].meetingNodeIds=[...goldens.realCases[1].expected.intersection];expect(validRenJointBattleAnalysis(value,a.base,a.profile,a.bazi)).toBe(false);
 });
 it('rejects a joint result attached before or after the exact frozen1.4 input boundary',()=>{
  const {base,profile,bazi}=real(0);expect(()=>calculateRenJointBattleAnalysis({...base,version:'ditian-ren-commentary-2600158/1.3.0'},profile,bazi)).toThrow('原版1.4');
  const forged=structuredClone(base)as unknown as Record<string,unknown>;forged.jointBattleAnalysis={};expect(()=>calculateRenJointBattleAnalysis(forged as unknown as RenCommentaryAnalysis,profile,bazi)).toThrow('原版1.4');
 });
 it('accepts legitimate optional undefined UI inputs without loosening the saved analysis vocabulary',()=>{
  const {base,profile,bazi}=real(0),input={...profile,birthLongitude:undefined,fatherName:undefined,motherName:undefined,namingPreferences:undefined},expected=calculateRenJointBattleAnalysis(base,profile,bazi);
  expect(calculateRenJointBattleAnalysis(base,input,bazi)).toEqual(expected);expect(Object.hasOwn(input,'birthLongitude')).toBe(true);
  const forged=structuredClone(base) as RenCommentaryAnalysis&{unrecorded?:unknown};forged.unrecorded=undefined;expect(()=>calculateRenJointBattleAnalysis(forged,input,bazi)).toThrow('非JSON');
 });
 it('normalizes only optional preference undefined values and rejects required undefined input',()=>{
  const {base,profile,bazi}=real(0),input:BirthProfile={...profile,namingPreferences:{length:2,generationChar:'',requiredChars:'',forbiddenChars:'',elderTaboo:'',style:'',meanings:'',industry:'',priority:'balanced',preferredElements:[],zodiacRules:false,numerology:false,avoidParentNames:undefined,yueHomophones:undefined}};
  expect(calculateRenJointBattleAnalysis(base,input,bazi).state).toBe('not-fully-quiet');expect(()=>calculateRenJointBattleAnalysis(base,{...profile,notes:undefined} as unknown as BirthProfile,bazi)).toThrow('非JSON');
 });
 it('rejects a getter without executing it while checking a supplied profile',()=>{
  const {base,profile,bazi}=real(0),input={...profile};let invoked=0;Object.defineProperty(input,'birthLongitude',{enumerable:true,get(){invoked++;return undefined;}});expect(()=>calculateRenJointBattleAnalysis(base,input,bazi)).toThrow('访问器');expect(invoked).toBe(0);
 });
 it('keeps adopted actual joint motion distinct from author authority, all rescue, and personal fate',()=>{
  const {base,profile,bazi}=real(0),value=calculateRenJointBattleAnalysis(base,profile,bazi),rules=renJointBattleRules();
  expect(value.projectBridges).toHaveLength(2);expect(value.projectBridges.every(b=>b.authority==='project-adoption')).toBe(true);
  expect(value.sourceReferences.filter(r=>r.layer.startsWith('original-commentary;')).length).toBe(2);expect(rules.clauses.filter(c=>c.layer.startsWith('original-commentary;')).every(c=>c.use==='context-only')).toBe(true);
  expect(value.checks[0].sourceConsequence).toBe('所选天地交战的联合动气，未由本次所指木方会完全平息。');expect(value.checks[0].sourceConsequence).not.toMatch(/凶|根拔|克尽|有效攻击/);
 });
 it.each(goldens.realCases)('uses real calendar fixtures without inventing author birth dates: $id',row=>{
  const [y,m,d]=row.profile.birthDate.split('-').map(Number),[h,min]=row.profile.birthTime.split(':').map(Number),eight=Solar.fromYmdHms(y,m,d,h,min,0).getLunar().getEightChar();eight.setSect(2);expect([eight.getYear(),eight.getMonth(),eight.getDay(),eight.getTime()]).toEqual(row.pillars);
 });
});
