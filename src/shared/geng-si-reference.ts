import type { Analysis, BirthProfile, SourceRecord } from './types';
import type { SeasonalFactsR3, ParagraphReferenceR3 } from '../domain/traditional/geng-si-reference-r3';

export const GENG_SI_PREVIEW_SCHEMA = 'geng-si-reference-preview/1.0.0' as const;
/** Read-only live analysis. This DTO is not an adopted naming-use or saved-session field. */
export interface GengSiReferencePreview {
  schema: typeof GENG_SI_PREVIEW_SCHEMA;
  profileId: string;
  analysis: Analysis;
  explanation: {
    schema: 'geng-si-analysis-explanation/1.0.0'; label: '调候条文旁证（无排序）'; baziVersion: string;
    seasonalFacts: SeasonalFactsR3; paragraph: ParagraphReferenceR3;
    rankingImpact: 'none'; selectionCertificate: 'not-created-or-modified';
  };
  sourceVerification: {
    status: 'verified-fixed-resources'; school: 'qiongtong-wikisource-2294674';
    label: '《穷通宝鉴》固定电子修订2294674 · 调候条文旁证';
    scanCollation: false; sources: SourceRecord[];
    quote: string; locator: string;
    quoteSpan: { start: number; end: number; unit: 'unicode-codepoint'; interval: '[start,end)' };
    entryContextSpan: { start: number; end: number; unit: 'unicode-codepoint'; interval: '[start,end)' };
  };
}
/** Standalone additive API until root owns the one-method StudioAPI declaration. */
export interface GengSiReferenceApi {
  previewGengSiReference(profile: BirthProfile): Promise<GengSiReferencePreview>;
}
