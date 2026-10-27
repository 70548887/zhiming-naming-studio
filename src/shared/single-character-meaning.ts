export const SINGLE_CHARACTER_MEANING_SCOPE = 'on-request-supplement-only' as const;

export type SingleCharacterMeaningStatus = 'available' | 'ambiguous-reading' | 'not-covered';

export interface SingleCharacterMeaningQuery {
  char: string;
  pinyin?: string;
  tone?: number;
}

export interface ExistingSingleCharacterMeaningBatchSource {
  batchId: string;
  sourceId: string;
  publicationState: string;
  admission: 'approved-character-notes' | 'candidate-awaiting-independent-review';
  activation: string;
  candidateOnly: boolean;
  productionApproved: false;
}

/** Source authentication is separate from individual naming-sense admission. */
export interface ManualM690MeaningBatchSource extends ExistingSingleCharacterMeaningBatchSource {
  batchId: 'M690-D02';
  sourceId: 'naming-character-meanings-m690-candidate';
  admission: 'candidate-awaiting-independent-review';
  activation: 'off';
  candidateOnly: true;
  manualOnly: true;
  individualAdmission: 'not-granted';
  independentReview: 'scope-only';
}
export type SingleCharacterMeaningBatchSource = ExistingSingleCharacterMeaningBatchSource | ManualM690MeaningBatchSource;

export interface SingleCharacterDictionarySource {
  sourceId: string;
  word: string;
  pinyin: string;
  tone: number;
  definition: Readonly<Record<string, unknown>>;
  sourcePOS: string;
  readings: readonly Readonly<Record<string, unknown>>[];
  originalFile: string;
  rawEntryIndex: number;
  rawHeteronymIndex: number;
  rawDefinitionIndex: number;
  parsedEntrySha256: string;
  license: string;
  completeOriginalEntry: Readonly<Record<string, unknown>>;
}

export interface SingleCharacterProjectExplanation {
  meaning: string;
  projectWish: string | null;
  limits: readonly string[];
  attribution: string;
  license: string;
}

export interface SingleCharacterDefaultReading {
  pinyin: string;
  tone: number;
  word: string;
  meanings: readonly string[];
}

export interface SingleCharacterMeaningOption {
  char: string;
  pinyin: string;
  tone: number;
  defaultReading?: SingleCharacterDefaultReading;
  meaning: string;
  source: SingleCharacterDictionarySource;
  project: SingleCharacterProjectExplanation;
  limits: readonly string[];
  batch: SingleCharacterMeaningBatchSource;
  scope: typeof SINGLE_CHARACTER_MEANING_SCOPE;
  wholeNameMeaning: null;
  automaticNameRecommendation: false;
  automaticSemanticCreditAllowed: false;
  scoreDelta: 0;
}

export interface SingleCharacterMeaningOptions {
  schema: 'single-character-meaning-options/1';
  char: string;
  pinyin: string | null;
  status: SingleCharacterMeaningStatus;
  scope: typeof SINGLE_CHARACTER_MEANING_SCOPE;
  options: readonly SingleCharacterMeaningOption[];
  source: SingleCharacterMeaningBatchSource | null;
  limits: readonly string[];
  wholeNameMeaning: null;
  automaticNameRecommendation: false;
  automaticSemanticCreditAllowed: false;
  scoreDelta: 0;
}
