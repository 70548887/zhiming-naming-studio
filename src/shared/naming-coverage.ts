/** Read-only coverage facts. These types do not issue source or naming authority. */
export type CoverageFailure = 'missing-source' | 'unknown-source' | 'invalid-data' | 'reading-scope-mismatch' | 'source-mismatch';
export interface CoverageSourceIdentity {
  readonly sourceId: string;
  readonly sha256: string;
  readonly packSha256: string;
  readonly readingScope: 'dataset-default';
}
export type CoverageSourceResult<T> = Readonly<{
  status: 'available'; source: CoverageSourceIdentity; value: T;
}> | Readonly<{status: 'unavailable'; reason: CoverageFailure}>;

export interface CoverageWordCase {
  readonly caseId: string;
  readonly targetCharacter: string;
  readonly givenName: string;
}
export interface CoverageWordsInput {
  readonly cases: readonly CoverageWordCase[];
  readonly wholeWordOnly: true;
  readonly explicitChoiceRequired: true;
  readonly confirmedReadingsRequired: true;
  readonly automaticSemanticCreditAllowed: false;
  readonly standalonePromotion: false;
}
/** Every group must be projected from the existing real loaders, after their source gates.
 * Strings, scope labels and this DTO factory are never substitute qualification tokens. */
export interface CoverageLoaderSets {
  readonly dataset: CoverageSourceResult<Readonly<{characters: readonly string[]; datasetSha256: string}>>;
  readonly baseMeanings: CoverageSourceResult<readonly string[]>;
  readonly supplementalAutomatic: CoverageSourceResult<readonly string[]>;
  readonly standaloneOnRequest: CoverageSourceResult<Readonly<{
    characters: readonly string[]; publication: 'm460-b02';
    wholeNameAssessment: 'not-assessed'; automaticNameRecommendation: false;
    automaticSemanticCreditAllowed: false; scoreDelta: 0;
  }>>;
  readonly conditionalWords: CoverageSourceResult<CoverageWordsInput>;
  readonly b04ReadOnlyOff: CoverageSourceResult<CoverageWordsInput & Readonly<{
    activation: 'off'; candidateOnly: true; productionApproved: false; formalCoverageAdded: 0;
  }>>;
  readonly originalElements: CoverageSourceResult<Readonly<{
    labeledCharacters: readonly string[]; unknownCharacters: readonly string[];
  }>>;
  readonly imageryCandidates: CoverageSourceResult<Readonly<{
    candidateCharacters: readonly string[]; unresolvedCharacters: readonly string[];
    activation: 'off'; defaultEffectiveElements: readonly string[];
    traditionalAssessment: 'pending';
  }>>;
}

export interface CoverageSetDto { readonly count: number; readonly characters: readonly string[]; }
export interface CoverageRelationDto {
  readonly intersection: CoverageSetDto;
  readonly union: CoverageSetDto;
  readonly leftOnly: CoverageSetDto;
  readonly rightOnly: CoverageSetDto;
}
export interface CoverageWordDto {
  readonly caseCount: number;
  readonly targetCharacters: CoverageSetDto;
  readonly givenNames: readonly string[];
  readonly requiresWholeWord: true;
  readonly requiresConfirmedReadings: true;
  readonly requiresExplicitChoice: true;
  readonly includedInAutomatic: false;
  readonly includedInStandalone: false;
}
export interface CoverageMeaningDto {
  readonly base: CoverageSetDto;
  readonly supplementalAutomatic: CoverageSetDto;
  readonly baseVsSupplemental: CoverageRelationDto;
  readonly defaultAutomatic: CoverageSetDto;
  readonly standaloneOnRequest: CoverageSetDto;
  readonly automaticVsStandalone: CoverageRelationDto;
  readonly displayMaterialUnion: CoverageSetDto;
  readonly withoutAutomaticOrStandalone: CoverageSetDto;
  readonly conditionalWords: CoverageWordDto;
  readonly b04ReadOnlyOff: CoverageWordDto & Readonly<{activation: 'off'; productionApproved: false; formalCoverageAdded: 0}>;
}
export interface CoverageElementDto {
  readonly originalLabels: CoverageSetDto;
  readonly originalUnknown: CoverageSetDto;
  readonly imageryCandidates: CoverageSetDto;
  readonly imageryUnresolved: CoverageSetDto;
  readonly imageryActivation: 'off';
  readonly newDefaultEffectiveElements: readonly [];
  readonly imageryEstablishesTraditionalElements: false;
}
export interface CoverageExplanation {
  readonly id: 'total' | 'automatic' | 'standalone' | 'conditional-words' | 'b04-off' | 'elements' | 'imagery';
  readonly title: string;
  readonly text: string;
}
export interface CoverageAvailableDto {
  readonly schema: 'naming-coverage/1';
  readonly status: 'available';
  readonly readingScope: 'dataset-default';
  readonly datasetSha256: string;
  readonly packSha256: string;
  readonly characters: CoverageSetDto;
  readonly meanings: CoverageMeaningDto;
  readonly elements: CoverageElementDto;
  readonly sources: readonly CoverageSourceIdentity[];
  readonly explanations: readonly CoverageExplanation[];
}
export interface CoverageUnavailableDto {
  readonly schema: 'naming-coverage/1';
  readonly status: 'unavailable';
  readonly reason: CoverageFailure;
  readonly message: string;
}
export type CoverageDto = CoverageAvailableDto | CoverageUnavailableDto;
