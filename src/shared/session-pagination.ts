import type { BirthProfile } from './types';
import type { SessionFilters } from './session-catalog';

export interface SessionCatalogRequest {
  limit?: number;
  cursor?: string;
  filters?: SessionFilters;
}

/** Directory metadata is never evidence that candidate facts or history were verified. */
export interface SessionCatalogSummary {
  id: string;
  profileId: string;
  createdAt: string;
  reviewNote: string;
  dataVersion: string;
  profile: Pick<BirthProfile, 'id' | 'customerName' | 'surname' | 'fatherName' | 'motherName'>;
  candidateCount: number;
  favoriteCount: number;
  candidateFactsVerified: false;
}

export interface SessionCatalogPage {
  items: SessionCatalogSummary[];
  nextCursor?: string;
  total: number;
  matched: number;
  customers: { id: string; label: string }[];
  profileCounts: Record<string, number>;
}
