import type { NameCandidate } from './types';

export type CandidateSortMode = 'original' | 'sound' | 'meaning' | 'simplicity' | 'distinctiveness';

export const CANDIDATE_SORT_OPTIONS: ReadonlyArray<{ value: CandidateSortMode; label: string }> = [
  { value: 'original', label: '生成顺序' },
  { value: 'sound', label: '音韵顺畅' },
  { value: 'meaning', label: '语义匹配' },
  { value: 'simplicity', label: '读写便利' },
  { value: 'distinctiveness', label: '辨识度' },
];

/** Display-only ordering. Keep equal scores in their original generation order. */
export function sortCandidatePresentation(candidates: readonly NameCandidate[], mode: CandidateSortMode): NameCandidate[] {
  if (mode === 'original') return [...candidates];
  return candidates.map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => b.candidate.evaluation[mode] - a.candidate.evaluation[mode] || a.index - b.index)
    .map(({ candidate }) => candidate);
}

export function getCandidateSortDescription(mode: CandidateSortMode): string {
  const label = CANDIDATE_SORT_OPTIONS.find(option => option.value === mode)?.label ?? '生成顺序';
  return mode === 'original'
    ? '按本批生成顺序展示。排序只调整展示，不改变原始评分和 PDF 名单顺序。'
    : `按${label}的规则评价从高到低展示，同分保留生成顺序。排序只调整展示，不改变原始评分和 PDF 名单顺序。`;
}
