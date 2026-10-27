import {recordedNamingMeaningSnapshot} from '../shared/naming-meaning-review-display';
import React from 'react';
import type { NamingMeaningReviewSnapshot } from '../shared/naming-meaning-review';
import {
  NamingMeaningReviewView,
  type NamingMeaningReviewViewProps,
} from './NamingMeaningReviewView';
import './saved-naming-meaning-review.css';

export interface SavedNamingMeaningReviewCandidate {
  givenName: string;
  namingMeaningReview?: NamingMeaningReviewSnapshot;
}

/** Do not infer a saved record from current dictionary entries or candidate explanations. */
export function recordedNamingMeaningReview(candidate: SavedNamingMeaningReviewCandidate): NamingMeaningReviewViewProps | undefined {
  const original=candidate.namingMeaningReview;if(!original)return undefined;
  const snapshot=recordedNamingMeaningSnapshot(candidate);
  if(snapshot)return snapshot.version==='naming-editorial-7.1.0'?{givenName:candidate.givenName,ruleVersion:'naming-editorial-7.1.0',recordState:'recorded',rows:snapshot.rows}:{givenName:candidate.givenName,recordState:'recorded',rows:snapshot.rows};
  return{givenName:candidate.givenName,recordState:'unrecorded'};
}

export function SavedNamingMeaningReview({ candidate }: { candidate: SavedNamingMeaningReviewCandidate }) {
  const props = recordedNamingMeaningReview(candidate);
  return props ? <NamingMeaningReviewView {...props} /> : null;
}

/** Comparison and history keep the exact saved details available behind a compact summary. */
export function SavedNamingMeaningReviewSummary({ candidate }: { candidate: SavedNamingMeaningReviewCandidate }) {
  const props = recordedNamingMeaningReview(candidate);
  if (!props) return null;
  const label = props.recordState === 'recorded' ? '查看已保存记录' : '未记录本版审阅';
  return <details className="saved-naming-review-summary">
    <summary>逐字补充审阅 · {label}</summary>
    <NamingMeaningReviewView {...props} />
  </details>;
}
