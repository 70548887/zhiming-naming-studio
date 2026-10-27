import { describe, expect, it } from 'vitest';
import type { NameCandidate } from '../src/shared/types';
import { CANDIDATE_SORT_OPTIONS, getCandidateSortDescription, sortCandidatePresentation } from '../src/shared/candidate-presentation';

const candidate = (id: string, sound: number, meaning: number, simplicity: number, distinctiveness: number): NameCandidate => ({
  id, fullName: `林${id}`, givenName: id, pinyin: 'lín míng', style: '典雅', characters: [], meaning: '寓意', reason: '理由',
  citations: [], evaluation: { sound, meaning, simplicity, distinctiveness, traditional: 80 }, warnings: [], traditionalReason: '依据',
  favorite: false, origin: 'local', reviewNote: '', originalMeaning: '寓意',
});

describe('candidate display sorting', () => {
  const candidates = [candidate('甲', 80, 90, 70, 60), candidate('乙', 90, 70, 70, 80), candidate('丙', 90, 80, 90, 70)];

  it('keeps the original array and candidate records unchanged', () => {
    const before = structuredClone(candidates);
    const sorted = sortCandidatePresentation(candidates, 'sound');
    expect(sorted).not.toBe(candidates);
    expect(sorted.map(value => value.id)).toEqual(['乙', '丙', '甲']);
    expect(sorted[0]).toBe(candidates[1]);
    expect(candidates).toEqual(before);
  });

  it.each([
    ['original', ['甲', '乙', '丙']], ['meaning', ['甲', '丙', '乙']],
    ['simplicity', ['丙', '甲', '乙']], ['distinctiveness', ['乙', '丙', '甲']],
  ] as const)('sorts %s descending while preserving generation order at equal scores', (mode, ids) => {
    expect(sortCandidatePresentation(candidates, mode).map(value => value.id)).toEqual(ids);
  });

  it('does not offer numerical fortune scores and explains the presentation scope', () => {
    expect(CANDIDATE_SORT_OPTIONS.map(option => option.value)).toEqual(['original', 'sound', 'meaning', 'simplicity', 'distinctiveness']);
    for (const option of CANDIDATE_SORT_OPTIONS) {
      const description = getCandidateSortDescription(option.value);
      expect(description).toContain('不改变原始评分和 PDF 名单顺序');
      expect(description).not.toContain('运势');
    }
  });

  it('accepts empty input without retaining a mutable shared array', () => {
    expect(sortCandidatePresentation([], 'sound')).toEqual([]);
    expect(sortCandidatePresentation([], 'original')).toEqual([]);
  });
});
