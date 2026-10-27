import type { Analysis } from './types';

export type LiteralConditionState = 'condition-met' | 'condition-not-met' | 'unknown' | 'not-applicable';
export interface QiongtongClauseReference {
  schema: 'qiongtong-literal-conditions/1.0.1';
  school: 'qiongtong-wikisource-2294674';
  input: { complete: boolean; dayStem: string | null; monthBranch: string | null; unknownPositions: readonly string[] };
  rules: readonly {
    id: string; existingConditionId: string; status: LiteralConditionState;
    applicability: { dayStem: 'met' | 'not-met' | 'unknown'; monthBranch: 'met' | 'not-met' | 'unknown' };
    literalFact: { result: 'met' | 'not-met' | 'unknown' | 'not-evaluated'; evidence: readonly string[]; missing: readonly string[] };
    source: { id: 'bazi-monthly-qiongtong-2294674'; revision: 'wikisource-revision/2294674'; rawSha256: string; quote: string; locator: string; quoteSpan: { start: number; end: number; unit: 'unicode-codepoint'; interval: '[start,end)' }; contextQuote: string; contextSpan: { start: number; end: number; unit: 'unicode-codepoint'; interval: '[start,end)' }; scanCollation: false };
    textReferences: readonly { stem: string; role: string; quote: string; status: 'recorded-text' }[];
    actionEvaluation: 'not-evaluated'; usefulGodDecision: 'not-evaluated';
    limitations: readonly string[];
  }[];
  namingImpact: 'none';
}
export interface FreshQiongtongClauseReference {
  analysis: Analysis;
  reference: QiongtongClauseReference;
}
