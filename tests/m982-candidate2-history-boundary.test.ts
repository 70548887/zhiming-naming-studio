import {describe,it,expect,vi} from 'vitest';
import {captureCandidate2ReviewBase} from '../src/renderer/candidate2-review-boundary';
import {captureCandidate2HistoryRows,correlateCandidate2HistoryRestoreResult,validCandidate2HistoryId} from '../src/renderer/candidate2-history-boundary';
import {candidate2GenerationFixture} from './fixtures/m936-candidate2-generation';
import type {Candidate2AdoptedNamingSessionV2} from '../src/shared/candidate2-generation-adoption-v2';

/** Synthetic renderer correlation only; no native history row/source/save is
 * authenticated here, and no historical snapshot is passed to a writer. */
const clone=<T,>(value:T):T=>structuredClone(value);
const manual='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
function setup(){
 const current=clone(candidate2GenerationFixture().result.session);current.reviewRevision=7;current.reviewToken='ABCD1234-ABCD-4ABC-8ABC-ABCDEF123456';
 const historical=clone(current);historical.reviewRevision=2;historical.reviewToken='22222222-2222-4222-8222-222222222222';historical.reviewNote='历史总体意见';historical.preferences.preferredElements=['水','木'];historical.candidates[0].favorite=true;historical.candidates[0].meaning='历史人工寓意';historical.candidates.forEach((candidate,index)=>{candidate.warnings=[...historical.candidate2Naming.generation.candidates[index].warnings,manual];});
 const rows=[{id:'31',sessionId:current.id,createdAt:'2026-10-27T01:00:00Z',session:historical},{id:'7',sessionId:current.id,createdAt:'2026-10-26T01:00:00Z',session:clone(current)}];
 const saved=clone(historical);saved.reviewRevision=8;saved.reviewToken='33333333-3333-4333-8333-333333333333';
 return{current,historical,base:captureCandidate2ReviewBase(current),rows,result:{schema:'candidate2-history-restore-saved/1',status:'saved',session:saved,traditionalStatus:'unknown'}};
}
describe('M982 owned existing-history rows',()=>{
 it('preserves actual native row references and order while owning frozen rows and original facts',()=>{const f=setup(),rows=captureCandidate2HistoryRows(f.rows,f.base);expect(rows.map(row=>row.id)).toEqual(['31','7']);expect(rows).toEqual(f.rows);expect(rows).not.toBe(f.rows);expect(Object.isFrozen(rows[0].session.candidates[0].evaluation)).toBe(true);f.rows[0].session.reviewNote='caller mutation';expect(rows[0].session.reviewNote).toBe('历史总体意见');expect(rows[0].session.analysis).toEqual(f.current.analysis);expect((rows[0].session as Candidate2AdoptedNamingSessionV2).candidate2Naming).toEqual(f.current.candidate2Naming);});
 it('accepts an explicitly empty history without generating or inventing a revision',()=>{const f=setup();expect(captureCandidate2HistoryRows([],f.base)).toEqual([]);});
 it.each(['0','01',' 1','1 ','1e2','+1','1.0','-1','9007199254740992',1,null,undefined])('rejects non-native revision id %s',id=>{expect(validCandidate2HistoryId(id)).toBe(false);});
 it.each(['duplicate','row-session','inner-session','customer','profile','analysis','score','candidate-order','candidate-count','generation','request','source-capsule','rules','created-at','extra-row','missing-row','manual-warning'] as const)('rejects unrelated or malformed history %s',mode=>{
  const f=setup(),rows=f.rows as any[],row=rows[0],session=row.session;
  if(mode==='duplicate')rows[1].id=row.id;if(mode==='row-session')row.sessionId='other';if(mode==='inner-session')session.id='c2s_'+'f'.repeat(32);if(mode==='customer')session.profileId='other';if(mode==='profile')session.profile.notes='other';if(mode==='analysis')session.analysis.bazi.version='other';if(mode==='score')session.candidates[0].evaluation.sound++;if(mode==='candidate-order')session.candidates.reverse();if(mode==='candidate-count')session.candidates.pop();if(mode==='generation')session.candidate2Naming.generation.messages=['other'];if(mode==='request')session.candidate2Naming.request.profile.notes='other';if(mode==='source-capsule')session.candidate2Naming.sourceCapsule.codec='other';if(mode==='rules')session.namingRules.version='other';if(mode==='created-at')row.createdAt='not a date';if(mode==='extra-row')row.canRestore=true;if(mode==='missing-row')delete row.session;if(mode==='manual-warning')session.candidates[0].warnings=[];
  expect(()=>captureCandidate2HistoryRows(rows,f.base)).toThrow();
 });
 it.each(['row-getter','nested-getter','sparse','array-extra','hidden','undefined','custom-prototype'] as const)('rejects unsafe history %s without evaluating accessors',mode=>{
  const f=setup(),getter=vi.fn(),rows=f.rows as any[];
  if(mode==='row-getter')Object.defineProperty(rows,'0',{get:getter,enumerable:true});if(mode==='nested-getter')Object.defineProperty(rows[0].session,'analysis',{get:getter,enumerable:true});if(mode==='sparse')delete rows[0];if(mode==='array-extra')Object.defineProperty(rows,'extra',{get:getter,enumerable:true});if(mode==='hidden')Object.defineProperty(rows[0],'hidden',{value:true});if(mode==='undefined')rows[0].createdAt=undefined;if(mode==='custom-prototype')Object.setPrototypeOf(rows[0],{authority:true});
  expect(()=>captureCandidate2HistoryRows(rows,f.base)).toThrow();expect(getter).not.toHaveBeenCalled();
 });
});
describe('M982 actual restore reply correlation without a client historical-content CAS',()=>{
 it('accepts only the actual returned owned canonical and keeps current immutable facts',()=>{const f=setup(),reply=correlateCandidate2HistoryRestoreResult(f.result,f.base)!;expect(reply.session).toEqual(f.result.session);expect(reply.session).not.toBe(f.result.session);expect(Object.isFrozen(reply.session)).toBe(true);expect(reply.session.analysis).toEqual(f.current.analysis);expect(reply.session.candidate2Naming).toEqual(f.current.candidate2Naming);});
 it('accepts the complete original canonical and its unchanged CAS for native no-change',()=>{const f=setup();f.result.session=clone(f.current);expect(correlateCandidate2HistoryRestoreResult(f.result,f.base)?.session).toEqual(f.current);});
 it('does not impose an unrequested client view-CAS on the writer-time selected row contents',()=>{const f=setup();f.result.session.candidates[0].meaning='所选行在writer认证时的允许人工文字';expect(correlateCandidate2HistoryRestoreResult(f.result,f.base)?.session.candidates[0].meaning).toBe('所选行在writer认证时的允许人工文字');});
 it.each(['schema','status','authority','extra','score','facts','order','footprint','same-revision','skip-revision','same-token','invalid-token'] as const)('rejects reply %s',mode=>{const f=setup(),r=f.result as any;if(mode==='schema')r.schema='ordinary';if(mode==='status')r.status='generated';if(mode==='authority')r.traditionalStatus='verified';if(mode==='extra')r.canSave=true;if(mode==='score')r.session.candidates[0].evaluation.sound++;if(mode==='facts')r.session.analysis.bazi.version='new';if(mode==='order')r.session.candidates.reverse();if(mode==='footprint')r.session.candidate2Naming.request.preferences.style='new';if(mode==='same-revision')r.session.reviewRevision=7;if(mode==='skip-revision')r.session.reviewRevision=9;if(mode==='same-token')r.session.reviewToken=f.current.reviewToken;if(mode==='invalid-token')r.session.reviewToken='invalid';expect(correlateCandidate2HistoryRestoreResult(r,f.base)).toBeUndefined();});
});
