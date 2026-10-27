import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {NamingMeaningReviewStatusPanel} from '../src/renderer/NamingMeaningReviewStatusPanel';
import {assertNamingMeaningSemanticReview,loadNamingMeaningSemanticReview,namingMeaningSemanticReviewStatus,M916_MEANING_REVIEW_INPUT_SHA256,M916_MEANING_REVIEW_RAW_SHA256} from '../src/shared/naming-meaning-semantic-review';

describe('M917 read-only candidate meaning review consumer',()=>{
 it('renders candidate-only status without presenting general rows as active coverage',()=>{
  const html=renderToStaticMarkup(<NamingMeaningReviewStatusPanel/>);
  expect(html).toContain('候选审查状态');expect(html).toContain('candidate-only');expect(html).toContain('审查总数</dt><dd>40 条');
  expect(html).toContain('一般逐字审查</dt><dd>38 条<span>候选，不自动生效');expect(html).toContain('显式主题准入</dt><dd>0 条');expect(html).toContain('待定</dt><dd>2 条');
  expect(html).toContain('admissionGranted=false');expect(html).toContain('activation=off');expect(html).toContain('formalCoverageAdded=0');expect(html).toContain('全名评估未完成');
  expect(html).toContain('方');expect(html).toContain('锋');expect(html).not.toContain('已自动生效');
 });
 it('loads the fixed review with its version and source/input bindings',()=>{
  const review=loadNamingMeaningSemanticReview(),status=namingMeaningSemanticReviewStatus(review);
  expect(review.reviewId).toBe('M916-D01');expect(review.ruleVersion).toBe('naming-editorial-7.2.0');expect(review.inputSHA256).toBe(M916_MEANING_REVIEW_INPUT_SHA256);
  expect(status.source.rawSHA256).toBe(M916_MEANING_REVIEW_RAW_SHA256);expect(status.counts).toEqual({total:40,general:38,explicitTheme:0,pending:2});
  expect(status.pending.map(item=>item.char)).toEqual(['方','锋']);expect(status.admission.admissionGranted).toBe(false);
 });
 it('rejects tampered, missing and caller-extended review records',()=>{
  const review=loadNamingMeaningSemanticReview();
  const changed=structuredClone(review);(changed.rows[0] as unknown as {admissionGranted:boolean}).admissionGranted=true;expect(()=>assertNamingMeaningSemanticReview(changed)).toThrow();
  const missing=structuredClone(review);delete (missing as {rows?:unknown}).rows;expect(()=>assertNamingMeaningSemanticReview(missing)).toThrow();
  expect(()=>assertNamingMeaningSemanticReview({...review,approved:true})).toThrow();
 });
 it('returns detached frozen snapshots and does not mutate the bundled input',()=>{
  const one=loadNamingMeaningSemanticReview(),two=loadNamingMeaningSemanticReview();expect(one).toEqual(two);expect(one).not.toBe(two);expect(Object.isFrozen(one)).toBe(true);expect(Object.isFrozen(one.rows[0])).toBe(true);
  expect(()=>((one.rows[0] as {char:string}).char='改')).toThrow();expect(loadNamingMeaningSemanticReview().rows[0].char).toBe('安');
 });
});
