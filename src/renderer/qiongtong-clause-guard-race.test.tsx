import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createClausePreviewLeaseController,ownsClausePreviewLease,validClausePreviewResponse} from './qiongtong-clause-preview-bindings';
import {QiongtongJiaChapterView} from './QiongtongJiaChapterView';
import type {QiongtongClauseReferencePreview,JiaChapterSourceVerification} from '../shared/qiongtong-clause-reference-preview';
import type {JiaLiteralReferenceV11} from '../domain/traditional/qiongtong-jia-v11-types';

const span=(start:number,end:number)=>({start,end,unit:'unicode-codepoint' as const,interval:'[start,end)' as const});
const oldRule=(id='old-rule')=>({id,existingConditionId:id,status:'condition-met' as const,applicability:{dayStem:'met' as const,monthBranch:'met' as const},literalFact:{result:'met' as const,evidence:['事实'],missing:[]},source:{id:'bazi-monthly-qiongtong-2294674' as const,revision:'wikisource-revision/2294674' as const,rawSha256:'a'.repeat(64),quote:'旧条文',locator:'oldid=2294674;codepoint[1,4)',quoteSpan:span(1,4),contextQuote:'旧上下文',contextSpan:span(0,8),scanCollation:false as const},textReferences:[],actionEvaluation:'not-evaluated' as const,usefulGodDecision:'not-evaluated' as const,limitations:[]});
const oldSourceRule=(row:ReturnType<typeof oldRule>)=>({ruleId:row.id,existingConditionId:row.existingConditionId,entryId:row.id,source:row.source});
function oldOnly():QiongtongClauseReferencePreview {
 const rule=oldRule();
 return {schema:'qiongtong-clause-reference-preview/1.0.0',profileId:'profile-1',analysis:{} as never,reference:{schema:'qiongtong-literal-conditions/1.0.1',school:'qiongtong-wikisource-2294674',input:{complete:true,dayStem:'甲',monthBranch:'寅',unknownPositions:[]},rules:[rule],namingImpact:'none'},sourceVerification:{status:'verified-fixed-resources',school:'qiongtong-wikisource-2294674',revision:'wikisource-revision/2294674',label:'《穷通宝鉴》固定电子修订2294674 · 三条字面条件参考',scanCollation:false,sources:[{id:'bazi-monthly-qiongtong-2294674',name:'固定月别',url:'x',commit:'x',license:'CC',files:['x'],sha256:'a'.repeat(64),note:'x'}],conditions:{file:'data/qiongtong-clause-conditions-v1.json',schema:'qiongtong-literal-conditions/1.0.0',sha256:'a'.repeat(64)},rules:[oldSourceRule(rule)]}};
}
function jiaPair(base:QiongtongClauseReferencePreview):QiongtongClauseReferencePreview {
 const chapter={schema:'qiongtong-jia-literal-conditions/1.1.0',school:'qiongtong-wikisource-2294674',source:{id:'bazi-monthly-qiongtong-2294674',revision:'wikisource-revision/2294674',rawSha256:'a'.repeat(64),chapterSpan:span(0,8),scanCollation:false},input:{complete:true,dayStem:'甲',monthBranch:'寅',unknownPositions:[]},checks:[{id:'jia-1',label:'癸藏丙透',status:'condition-met',applicability:{dayStem:'met',monthBranch:'met'},literalFact:{result:'met',evidence:['事实'],missing:[]},source:{quote:'癸藏丙透',locator:'x',quoteSpan:span(1,5),contextSpan:span(0,8),contextSha256:'b'.repeat(64)},decisionLevel:'selected-literal-subclause-only',wholeSourceBranchDecision:'not-evaluated',actionEvaluation:'not-evaluated',usefulGodDecision:'not-evaluated',unresolvedDependencies:[]}],coverage:{firstBatchOnly:true,fullChapterDecisionImplemented:false,newlyExecutablePredicates:4,months:[]},namingImpact:'none'} as unknown as JiaLiteralReferenceV11;
 const verification={schema:'qiongtong-jia-source-verification/1.0.0',status:'verified-fixed-resources',sourceId:'bazi-monthly-qiongtong-2294674',revision:'wikisource-revision/2294674',rawSha256:'a'.repeat(64),scanCollation:false,monthlySources:base.sourceVerification.sources,catalog:{file:'data/qiongtong-jia-v11/catalog.json',version:'qiongtong-jia-literal-conditions/1.1.0',sha256:'c'.repeat(64),bytes:12},managedInputs:[{file:'data/qiongtong-jia-v11/manifest.json',sha256:'d'.repeat(64),bytes:12}],chapter:{span:span(0,8),sha256:'e'.repeat(64)},rules:[{id:'jia-1',quote:'癸藏丙透',locator:'x',quoteSpan:span(1,5),contextSpan:span(0,8),contextSha256:'b'.repeat(64)}]} as unknown as JiaChapterSourceVerification;
 return {...base,jiaChapter:chapter,jiaSourceVerification:verification};
}

describe('M665 Jia preview guard and request lease boundaries',()=>{
 it('accepts the old three-rule envelope without a Jia pair',()=>expect(validClausePreviewResponse(oldOnly(),'profile-1')).toBe(true));
 it('rejects a half Jia pair and a source binding mismatch',()=>{
  const base=oldOnly(),pair=jiaPair(base);
  const half={...pair,jiaSourceVerification:undefined} as unknown as QiongtongClauseReferencePreview;expect(validClausePreviewResponse(half,'profile-1')).toBe(false);
  const mismatch={...pair,jiaSourceVerification:{...pair.jiaSourceVerification!,sourceId:'other-source'}} as unknown as QiongtongClauseReferencePreview;expect(validClausePreviewResponse(mismatch,'profile-1')).toBe(false);
 });
 it('rejects a Jia pair whose chapter input is inconsistent with the old reference',()=>{
  const pair=jiaPair(oldOnly()),jia={...pair.jiaChapter!,input:{...pair.jiaChapter!.input,monthBranch:'辰'}};
  expect(validClausePreviewResponse({...pair,jiaChapter:jia},'profile-1')).toBe(false);
 });
 it('accepts only the current lease when two responses resolve out of order',()=>{
  const apiA={},apiB={},first={key:'A',api:apiA,epoch:1,request:1},latest={key:'A',api:apiA,epoch:1,request:2};
  expect(ownsClausePreviewLease({alive:true,...latest},first)).toBe(false);
  expect(ownsClausePreviewLease({alive:true,...latest},latest)).toBe(true);
  expect(ownsClausePreviewLease({alive:true,key:'B',api:apiB,epoch:2,request:2},latest)).toBe(false);
  expect(ownsClausePreviewLease({alive:false,...latest},latest)).toBe(false);
 });
 it('keeps the latest delayed Promise and discards the earlier response',async()=>{
  const controller=createClausePreviewLeaseController(),deferred=(value:string)=>{let resolve:(value:string)=>void=()=>{};const promise=new Promise<string>(r=>{resolve=r});return{promise,resolve};};
  controller.setIdentity('A',{});const first=controller.begin(),slow=deferred('slow');controller.setIdentity('A',{});const latest=controller.begin(),fast=deferred('fast');let accepted:string[]=[];
  const consume=async(lease:typeof first,promise:Promise<string>)=>{const value=await promise;if(controller.owns(lease))accepted.push(value);};
  const pending=[consume(first,slow.promise),consume(latest,fast.promise)];fast.resolve('latest');slow.resolve('stale');await Promise.all(pending);expect(accepted).toEqual(['latest']);controller.dispose();
 });
 it('accepts a fresh request after StrictMode effect reactivation while retiring the old promise',async()=>{
  const controller=createClausePreviewLeaseController();controller.setIdentity('same-profile',{});controller.activate();
  const first=controller.begin();let releaseOld!:(value:string)=>void;
  const oldPromise=new Promise<string>(resolve=>{releaseOld=resolve;});const accepted:string[]=[];
  const consume=async()=>{const value=await oldPromise;if(controller.owns(first))accepted.push(value);};const pending=consume();
  controller.dispose();controller.activate();const next=controller.begin();
  expect(controller.owns(next)).toBe(true);expect(controller.owns(first)).toBe(false);
  releaseOld('retired');await pending;expect(accepted).toEqual([]);controller.dispose();
 });
 it('renders an unknown-hour Jia result as unknown scope without inventing a time',()=>{
  const reference={schema:'qiongtong-jia-literal-conditions/1.1.0',school:'qiongtong-wikisource-2294674',source:{id:'bazi-monthly-qiongtong-2294674',revision:'wikisource-revision/2294674',rawSha256:'a'.repeat(64),chapterSpan:span(0,8),scanCollation:false},input:{complete:false,dayStem:'甲',monthBranch:'寅',unknownPositions:['时柱']},checks:[{id:'jia-1',label:'癸藏丙透',status:'unknown',applicability:{dayStem:'met',monthBranch:'met'},literalFact:{result:'unknown',evidence:[],missing:['时柱']},source:{quote:'癸藏丙透',locator:'x',quoteSpan:span(1,5),contextSpan:span(0,8),contextSha256:'b'.repeat(64)},decisionLevel:'selected-literal-subclause-only',wholeSourceBranchDecision:'not-evaluated',actionEvaluation:'not-evaluated',usefulGodDecision:'not-evaluated',unresolvedDependencies:[]}],coverage:{firstBatchOnly:true,fullChapterDecisionImplemented:false,newlyExecutablePredicates:4,months:[]},namingImpact:'none'} as unknown as JiaLiteralReferenceV11;
  const html=renderToStaticMarkup(<QiongtongJiaChapterView reference={reference}/>);
  expect(html).toContain('时柱未知');expect(html).toContain('待定');expect(html).not.toContain('12:00');
 });
});
