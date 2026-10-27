/** Source queries only. No saved-plan mutation or pronunciation scoring is performed. */
export type CmnReadingTone = 1 | 2 | 3 | 4 | 5;
export type CmnReadingLabel = '讀音' | '語音' | '又音' | null;
export interface CmnReadingFileIdentity { file: string; sha256: string; bytes: number; }
export interface CmnReadingSourceIdentity {
  profile: 'cmn-character-source/1.0.0';
  profileSha256: string;
  language: 'cmn';
  standard: 'MOE-Revised-Taiwan-fixed-snapshot';
  sourceId: 'moe-revised';
  commit: 'a6dc997417507eb510fc29822bc514de2c92728c';
  rawFile: 'data/raw/moe-revised.json.gz';
  rawSha256: string;
  rawJsonSha256: string;
  datasetFile: 'data/dataset-v6.json';
  datasetSha256: string;
  datasetVersion: '2026.10.20.2';
  license: 'CC-BY-ND-3.0-TW';
  url: string;
}
export interface CmnReadingGlyphBinding {
  inputChar: string;
  recordedTraditional: string;
  dictionaryWord: string;
  kind: 'same-character' | 'unicode-traditional-variant';
  /** Existing CharacterEntry.readings array positions, not a guessed conversion. */
  characterReadingIndices: number[];
  variantEvidence: null | {
    file: 'data/raw/kTraditionalVariant.txt'; sha256: string; line: number; text: string;
  };
}
export interface CmnReadingDefinition {
  definitionId: string;
  path: string;
  index: number;
  /** Original MOE fields are preserved verbatim, including reference-only text. */
  original: { def: string; type?: string; example?: string[]; quote?: string[]; link?: string[] };
  kind: 'definition' | 'dictionary-reference' | 'internal-reading-reference' | 'empty-definition-reference';
}
export interface CmnReadingOption {
  optionId: string;
  char: string;
  characterIdentitySha256: string;
  source: CmnReadingSourceIdentity;
  glyph: CmnReadingGlyphBinding;
  entry: { index: number; path: string; title: string; sha256: string };
  heteronym: { index: number; path: string; sha256: string; rawPinyin: string; rawBopomofo: string };
  pinyin: string;
  tone: CmnReadingTone;
  label: CmnReadingLabel;
  isCurrentDefault: boolean;
  definitions: CmnReadingDefinition[];
  suitabilityForPersonalName: 'not-assessed';
}
export interface CmnReadingReference {
  char: string; glyph: CmnReadingGlyphBinding;
  entry: { index: number; path: string; title: string; sha256: string };
  heteronym: { index: number; path: string; sha256: string; original: unknown };
  reason: 'unparsed-reading' | 'empty-definition-reference';
  selectable: false;
}
export interface CmnReadingQuery {
  profile: 'cmn-character-source/1.0.0';
  source: CmnReadingSourceIdentity;
  char: string;
  status: 'available' | 'reference-only' | 'unavailable';
  unavailableReason: null | 'not-in-fixed-character-set' | 'no-moe-reading-identity' | 'source-entry-missing';
  characterIdentitySha256: string | null;
  currentDefault: { pinyin: string; tone: number; recordedTraditional: string; sourceId: string } | null;
  defaultOptionIds: string[];
  options: CmnReadingOption[];
  references: CmnReadingReference[];
  limitations: string[];
}
export interface CmnReadingChoice {
  version: 'cmn-character-choice/1.0.0';
  choiceId: string;
  char: string;
  characterIdentitySha256: string;
  optionId: string;
  pinyin: string;
  tone: CmnReadingTone;
  isCurrentDefault: boolean;
  source: CmnReadingSourceIdentity;
  glyph: CmnReadingGlyphBinding;
  entry: CmnReadingOption['entry'];
  heteronym: CmnReadingOption['heteronym'];
  label: CmnReadingLabel;
  selectedDefinition: CmnReadingDefinition;
  suitabilityForPersonalName: 'not-assessed';
}
export interface CmnReadingCoverage {
  characters: number;
  availableCharacters: number;
  referenceOnlyCharacters: number;
  unavailableCharacters: number;
  multipleDistinctReadings: number;
  charactersWithNondefaultOptions: number;
  options: number;
  nondefaultOptions: number;
  definitions: number;
  references: number;
  defaultNotRepresented: string[];
  unavailable: { char: string; reason: CmnReadingQuery['unavailableReason'] }[];
}
export interface CmnReadingAdapter {
  readonly source: CmnReadingSourceIdentity;
  /** Optional originalCharacter must equal the complete fixed CharacterEntry, including its default. */
  query(char: string, originalCharacter?: unknown): CmnReadingQuery;
  createChoice(char: string, optionId: string, definitionId: string, originalCharacter?: unknown): CmnReadingChoice;
  /** Recomputes trusted evidence; rejects extra properties, altered marks, paths, meanings and sources. */
  validateChoice(char: string, choice: unknown, originalCharacter?: unknown): CmnReadingChoice;
  coverage(): CmnReadingCoverage;
}
