import type {
  SingleCharacterMeaningOptions,
  SingleCharacterMeaningQuery,
} from '../shared/single-character-meaning';

export interface SingleCharacterMeaningAdapterConfig {
  projectRoot: string;
  dataDir?: string;
  /** Absent by default. Enables manual candidate queries, never generation. */
  manualM690BatchRoot?: string;
}

export interface SingleCharacterMeaningAdapter {
  getSingleCharacterMeaningOptions(query: SingleCharacterMeaningQuery): SingleCharacterMeaningOptions;
}

export function createSingleCharacterMeaningAdapter(
  config: SingleCharacterMeaningAdapterConfig,
): SingleCharacterMeaningAdapter;

export const createSingleCharacterMeaningService: typeof createSingleCharacterMeaningAdapter;
