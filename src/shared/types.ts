export type Element = '木' | '火' | '土' | '金' | '水';
export type MonthAuthorityMethod='no-fixed-day/1.0.0'|'sanming-first-paragraph/1.0.0';
export type SeasonalMethod='no-monthly/1.0.0'|'qiongtong-2294674-initial/1.0.0';
export type RenMethod='none'|'ditian-ren-commentary-2600158/1.0.0'|'ditian-ren-commentary-2600158/1.1.0'|'ditian-ren-commentary-2600158/1.2.0'|'ditian-ren-commentary-2600158/1.3.0'|'ditian-ren-commentary-2600158/1.4.0'|'ditian-ren-commentary-2600158/1.5.0';
export type BirthTimeBasis='civil'|'apparent-solar';
export interface BirthTimePoint {
  label:'birth'|'start'|'end'; utc:string; civilDateTime:string; clockDateTime:string;
  utcOffsetMinutes:number; equationOfTimeMinutes:number; longitudeMinutes:number; correctionMinutes:number;
}
export interface BirthTimeAnalysis {
  version:'birth-time-basis/1.0.0'; basis:BirthTimeBasis;
  methodId:'civil-wall-clock/1.0.0'|'apparent-solar-time/noaa-meeus-1.0.0';
  timezone:string; longitude:number|null; civilDate:string; civilTime:string|null; actualUtc:string|null;
  /** Closed actual-instant interval; unknown input ends at its last valid civil second. */
  civilInterval:{startUtc:string;endUtc:string}; calculationDateTime:string|null;
  calculationInterval:{start:string;end:string}; dayCandidates:string[]; dayStatus:'determined'|'uncertain';
  points:BirthTimePoint[]; sourceId?:string; yearMonthBasis:'actual-instant'; dayBoundary:'00:00';
  precision:'civil-record'|'model-estimate'; policies:string[]; warnings:string[];
}
export interface RuleProfile {
  id:string; version:string; dayBoundary:'midnight'; timeBasis:BirthTimeBasis; baziYearBoundary:'lichun';
  zodiacBoundary:'lunar-new-year'; qimenSchool:'zhuanpan-chaibu-futou'; centerPalace:2;
  heavenBird:'follow-tianrui'; characterElements:'editorial-imagery-v1';
}
export interface BirthProfile {
  id: string; customerName: string; surname: string; surnamePinyin: string; gender: '男'|'女'|'中性';
  calendar: 'solar'|'lunar'; birthDate: string; leapMonth: boolean; birthTime: string;
  timeUnknown: boolean; birthPlace: string; timezone: string; notes: string;
  fatherName?: string; motherName?: string;
  parentNameReadings?:import('./parent-name-phonetics').ParentNameReadings;
  namingPreferences?: NamingPreferences;
  monthAuthorityMethod?:MonthAuthorityMethod;
  seasonalMethod?:SeasonalMethod;
  timeBasis?:BirthTimeBasis;
  birthLongitude?:number;
  renMethod?:RenMethod;
}
export interface NamingPreferences {
  length: 1|2; generationChar: string; requiredChars: string; forbiddenChars: string; elderTaboo: string;
  style: string; meanings: string; industry: string; priority: 'balanced'|'traditional'|'sound'|'classic'|'simple';
  preferredElements: Element[]; zodiacRules: boolean; numerology: boolean;
  namingElementMethod?:import('./project-naming-use').NamingElementMethodSelection;
  avoidParentNames?: boolean;
  parentNamePhonetics?:import('./parent-name-phonetics').ParentNamePhoneticsMode;
  wordPronunciationReference?:boolean;
  elementAssessment?:boolean;
  imageryReading?:boolean;
  yueReading?:boolean;
  namePhonetics?:import('./name-phonetic-review-types').NamePhoneticPreferences;
  yueHomophones?:'none'|'strict'|'ignore-tone';
  yueHomophoneRuleVersion?:import('./yue-homophone-types').YueHomophoneVersion;
}
export interface CharacterEntry {
  char: string; pinyin: string; tone: number; meaning: string; traditional: string; strokes: number|null;
  elements: Element[]; elementBasis: string; tags: string[]; warning: string; sourceId: string; radical?: string;
  readings?: CharacterReading[]; polyphonic?: boolean; variants?: string[];
}
export interface CharacterReading {
 pinyin:string;tone:number;meanings:string[];sourceId:string;word:string;
 referenceOnly?:true;
 sourceReference?:{kind:'dictionary-cross-reference';rawDefinitionIndex:number;text:string};
}
export interface StrokeRecord {
  id:string; character:string; glyph:string; count:number; sourceId:string; sourceLocator:string; note:string;
}
export interface NumerologyRuleProfile { id:string; version:string; name:string; strokePolicy:string; formulaConvention:string; interpretationSourceId?:string; }
export interface NumerologyStrokeChoice { position:number; inputChar:string; role:'surname'|'given'; options:StrokeRecord[]; selectedRecordId?:string; status:'selected'|'missing'|'ambiguous'; }
export interface NumerologyGrid { name:'天格'|'人格'|'地格'|'外格'|'总格'; value:number; formula:string; element:Element; interpretation?:{label:string;keyword:string;sourceId:string}; }
export interface NumerologyAnalysis {
  status:'complete'|'pending'|'unsupported'; fullName:string; rule:NumerologyRuleProfile; dataVersion:string;
  strokes:NumerologyStrokeChoice[]; grids:NumerologyGrid[];
  threeTalents?:{elements:Element[];relationships:{from:Element;to:Element;relation:string}[];description:string}; warnings:string[];
}
export interface Citation { id: string; title: string; chapter: string; text: string; sourceId: string; }
export interface KnowledgeEntry { id: string; category: string; title: string; text: string; sourceId: string; }
export interface SourceRecord { id: string; name: string; url: string; commit: string; license: string; files: string[]; sha256: string; note: string; }
export interface YueDictionaryReading {
  id:string;text:string;tokens:string[];sourceId:'rime-cantonese-jyutping';sourceVersion:'2026.08.10';
  sourceFile:'jyut6ping3.chars.dict.yaml'|'jyut6ping3.words.dict.yaml';sourceLine:number;
}
export interface YueReadingData {
  version:'yue-name-reading/1.0.0';sourceId:'rime-cantonese-jyutping';sourceVersion:'2026.08.10';
  readings:YueDictionaryReading[];aliases:Record<string,string[]>;
}
export interface YueReadingSelection { tokens:string[];origin:'dictionary'|'user';confirmed:true;dictionaryId?:string; }
/** A complete replacement of the selected readings; null clears that component. */
export interface YueReadingSelections { surname:YueReadingSelection|null;given:Array<YueReadingSelection|null>; }
export interface YueReadingUnit { text:string;candidates:YueDictionaryReading[];selection?:YueReadingSelection; }
export interface YueNameReading {
  version:'yue-name-reading/1.0.0';language:'yue';romanization:'Jyutping';surname:YueReadingUnit;given:YueReadingUnit[];
  status:'unconfirmed'|'partial'|'confirmed';fullNameTokens:string[];sourceIds:string[];limitations:string[];
}
/** A generation-time copy of the source registry, never reconstructed from the current knowledge pack. */
export interface SessionSourceSnapshot {
  version:'session-sources/1.0.0'; dataVersion:string; sources:SourceRecord[];
}
export interface Pillar { label: string; gan: string; zhi: string; element: string; hidden: string[]; tenGod: string; }
export interface BaziEvidenceSource { id:string; name:string; url:string; revision:string; locator:string; note:string; }
export interface BaziEvidenceRule { id:string; version:string; name:string; sourceIds:string[]; conditions:string[]; }
export interface BaziHiddenStemFact {
  pillar:string; branch:string; stem:string; element:Element; order:number; tenGod:string; relationToDay:string; ruleId:string;
}
export interface BaziStemFact {
  pillar:string; stem:string; element:Element; tenGod:string; relationToDay:string; ruleId:string;
}
export type BaziRelationKind = 'stem-combination'|'branch-liuhe'|'branch-sanhe'|'branch-sanhui'|'branch-clash'|'branch-harm';
export interface BaziRelationFact {
  kind:BaziRelationKind; label:string; subjects:string[]; pillars:string[]; candidateElement?:Element;
  ruleId:string; evidence:string[];
}
export interface BaziMonthAuthorityCandidate {
  stem?:string; sourceTerm?:string; normalizedStem?:string; monthBranch?:string;
  element:Element; fromDay:number; toDay:number; sourceId:string; sourceLocator?:string;
}
export interface MonthAuthorityTableMonth {
  monthBranch:string; sourceQuote:string; sourceLocator:string;
  segments:{sourceTerm:string;days:number;fromDay:number;toDay:number;element:Element;normalizedStem?:string}[];
}
export interface MonthAuthorityReference {
  version:'sanming-first-paragraph/1.0.0'; sourceId:string; title:string;
  months:MonthAuthorityTableMonth[]; alternativeViews:{title:string;sourceQuote:string;sourceLocator:string;note:string}[];
  limitations:string[];
}
export interface BaziMonthAuthoritySegment {
  monthBranch:string; previousJie:string; previousJieAt:string; startAt:string; endAt:string;
  elapsedStartDays:number; elapsedEndDays:number; candidates:BaziMonthAuthorityCandidate[];
  nextJieAt?:string; status?:'located'|'multiple'|'out-of-table'|'not-evaluated';
  unlocated?:{fromAt:string;toAt:string;reason:string}[];
}
export interface BaziMonthAuthority {
  status:'determined'|'uncertain'|'not-evaluated'; ruleId:string; method:string;
  candidates:BaziMonthAuthorityCandidate[]; segments:BaziMonthAuthoritySegment[]; evidence:string[]; missing:string[];
  methodId?:MonthAuthorityMethod; reference?:MonthAuthorityReference;
}
export interface FavorableElementOpinion {
  method:'fuyi'|'tiaohou'; profile:string; status:'candidate'|'pending'|'not-evaluated'; elements:Element[];
  unfavorable:Element[]; evidence:string[]; missing:string[]; requiresManualReview:true; ruleId:string;
}
export interface PatternCandidate {
  kind:'cong'; name:string; status:'not-evaluated'|'candidate'; supportedBy:string[]; opposedBy:string[]; missing:string[];
}
export type FollowingPatternKind='cong-cai'|'cong-sha'|'cong-er'|'cong-wang';
export type FollowingPatternPredicate=
  | {kind:'stem';stem:string;scope:'exposed'|'hidden'|'any';includeDayMaster:boolean;present:boolean}
  | {kind:'element';element:Element;scope:'exposed'|'hidden'|'any';includeDayMaster:boolean;present:boolean}
  | {kind:'all'|'any';items:FollowingPatternPredicate[]}
  | {kind:'not';item:FollowingPatternPredicate};
export interface FollowingPatternCriterion {
  id:string;name:string;role:'necessary'|'support'|'exception';scope:string;
  predicate?:FollowingPatternPredicate;result:'met'|'not-met'|'unknown'|'not-implemented';
  sourceQuote:string;sourceLocator:string;observedEvidence:string[];missing:string[];
  decisionUse?:'necessary'|'support-only'|'rejection-premise'|'rejection-signal';
  contributesToVerdict?:boolean;qualificationMissing?:string[];
}
export interface FollowingPatternDecisionBranch {
  id:string;name:string;sourceQuote:string;sourceLocator:string;
  premiseCriterionIds:string[];signalCriterionIds:string[];
  status:'rejected'|'pending'|'not-triggered'|'not-evaluated';
  observedEvidence:string[];missing:string[];doesNotResolveClause:boolean;
}
export interface FollowingPatternCheck {
  id:string;pattern:FollowingPatternKind;name:string;
  status:'candidate'|'pending'|'contradicted'|'not-evaluated';
  applicability:'applicable'|'possible'|'not-applicable';
  sourceId?:string;sourceQuote:string;sourceLocator:string;
  candidateBasis?:'literal-clause-only';statusExplanation:string;
  criteria:FollowingPatternCriterion[];supportedBy:string[];opposedBy:string[];missing:string[];
  requiresManualReview:true;
  decisionBranches?:FollowingPatternDecisionBranch[];
}
export interface FollowingPatternEvidence {
  version:string;profile:string;rules:BaziEvidenceRule[];checks:FollowingPatternCheck[];limitations:string[];
}
export interface TransformationEvidence {
  kind:BaziRelationKind; subjects:string[]; candidateElement?:Element; status:'not-evaluated'|'candidate';
  supportedBy:string[]; opposedBy:string[]; missing:string[]; ruleId:string;
}
export interface MonthlySeasonalUse {
  stem:string; element:Element; role:'first'|'support'|'parallel'|'unranked'; sequence:number; quote:string;
}
export type MonthlySeasonalPredicate=
  | {kind:'stem';stem:string;scope:'exposed'|'hidden'|'any';includeDayMaster:boolean;present:boolean}
  | {kind:'all'|'any';items:MonthlySeasonalPredicate[]}
  | {kind:'not';item:MonthlySeasonalPredicate};
export interface MonthlySeasonalStemFact {
  stem:string; exposedPositions:string[]; hiddenPositions:string[]; dayMasterSame:boolean; absence:'not-seen'|'unknown';
}
export interface MonthlySeasonalCondition {
  id:string; sourceQuote:string; sourceLocator:string; predicate?:MonthlySeasonalPredicate;
  result:'met'|'not-met'|'unknown'|'not-implemented'; proposedUses:MonthlySeasonalUse[];
  observedEvidence:string[]; missing:string[];
}
export interface MonthlySeasonalCase {
  dayMaster:string; monthBranch:string; sourceId:string; sourceQuote:string; sourceLocator:string;
  reviewStatus:'initial'|'needs-review'; initialUses:MonthlySeasonalUse[];
  conditionBranches:MonthlySeasonalCondition[]; stemFacts:MonthlySeasonalStemFact[]; unresolved:string[];
}
export interface MonthlySeasonalAnalysis {
  version:string; methodId:SeasonalMethod; status:'not-selected'|'initial-reference'|'conditions-reviewed'|'pending';
  ruleId:string; dayMaster:string; monthBranches:string[]; cases:MonthlySeasonalCase[];
  proposedElements:Element[]; requiresManualReview:true; limitations:string[];
}
export interface SeasonalConditionObservation {
  startAt:string;endAt:string;result:'met'|'not-met'|'unknown';evidence:string[];
  fromTermAt?:string;toTermAt?:string;
}
export interface SeasonalConditionCheck {
  id:string;caseId:string;conditionId?:string;dayMaster:string;monthBranch:string;
  sourceId:string;sourceQuote:string;sourceLocator:string;
  scope:'full-fact-predicate'|'partial-prerequisite';
  status:'met'|'not-met'|'uncertain'|'not-evaluated';predicateDescription:string;
  observations:SeasonalConditionObservation[];missing:string[];doesNotResolveOriginalBranch:boolean;
}
export interface SeasonalConditionEvidence {
  version:string;profile:'qiongtong-2294674-conditions';status:'not-selected'|'available'|'pending';
  rules:BaziEvidenceRule[];checks:SeasonalConditionCheck[];warnings:string[];
}
export interface BaziEvidenceAnalysis {
  version:string; profile:string; sources:BaziEvidenceSource[]; rules:BaziEvidenceRule[];
  dayMaster:{stem:string;element:Element}; timeBasis:{timezone:string;timeUnknown:boolean;ambiguous:boolean;description:string};
  stems:BaziStemFact[]; hiddenStems:BaziHiddenStemFact[]; relations:BaziRelationFact[];
  monthAuthority:BaziMonthAuthority; opinions:FavorableElementOpinion[];
  patternCandidates:PatternCandidate[]; transformationEvidence:TransformationEvidence[]; limitations:string[];
  monthlySeasonal?:MonthlySeasonalAnalysis;
  seasonalConditions?:SeasonalConditionEvidence;
  patternEvidence?:FollowingPatternEvidence;
}
export interface BaziAnalysis {
  solarDate: string; lunarDate: string; zodiac: string; pillars: Pillar[];
  elements: Record<Element, number>; favorable: Element[]; unfavorable: Element[];
  strength: string; reasons: string[]; seasonalAdvice: string; warnings: string[];
  version: string; ruleDescription: string; evidence?:BaziEvidenceAnalysis;
  timeBasis?:BirthTimeAnalysis;
  monthFollowingRestrictions?:MonthFollowingRestrictions;
}
export interface MonthFollowingRestriction {
  id:string;name:string;patterns:('cong-cai'|'cong-sha')[];
  status:'applies'|'not-applicable'|'pending';scope:'fixed-source-clause-only';
  sourceId:string;sourceQuote:string;sourceLocator:string;sourceHeading:string;
  targetDayStems:string[];targetMonthBranches:string[];
  dayStem?:string;monthBranches:string[];explanation:string;missing:string[];
}
export interface MonthFollowingRestrictions {
  version:'qiongtong-2294674-monthly-following-restrictions/1.0.0';
  profile:'qiongtong-2294674-fixed-month-restrictions';sourceId:string;
  checks:MonthFollowingRestriction[];limitations:string[];
}
export interface QimenPalace { number: number; direction: string; trigram: string; earth: string; heaven: string; star: string; door: string; god: string; marks: string[]; }
export interface QimenMarkerRule {
  id:string; version:string; name:string;
  sources:{id:string;url:string;commit:string;locator:string}[];
  conditions:string[];
}
export interface QimenAuxiliaryMarker {
  kind:'xunkong'|'yima'; label:string; branches:string[]; palaces:number[];
  ruleId:string; ruleVersion:string; evidence:string[];
}
export interface QimenAuxiliaryAnalysis {
  version:string; hourGanzhi:string; scope:'hour'; rules:QimenMarkerRule[];
  markers:QimenAuxiliaryMarker[]; warnings:string[];
}
export type QimenPatternLayer = 'doors'|'heaven-stems'|'stars';
export interface QimenPatternCheck {
  ruleId:string; ruleVersion:string; layer:QimenPatternLayer;
  status:'matched'|'not-matched'; palaces:number[]; evidence:string[];
}
export interface QimenPatternFinding {
  kind:'menpo'|'jixing'|'rumu'|'fuyin'|'fanyin'; label:string; layer:QimenPatternLayer;
  palaces:number[]; subjects:string[]; ruleId:string; ruleVersion:string; evidence:string[];
}
export interface QimenPatternAnalysis {
  version:string; school:'zhuanpan-chaibu-futou-kun2'; rules:QimenMarkerRule[];
  checks:QimenPatternCheck[]; findings:QimenPatternFinding[]; warnings:string[];
}
export interface QimenStemTombObservation {palace:number;role:'principal'|'lodged';}
export interface QimenStemTombCheck {
  stem:string;targetBranch:string;targetPalace:number;
  status:'matched'|'not-matched'|'not-directly-observed';observations:QimenStemTombObservation[];
  ruleId:string;ruleVersion:string;evidence:string[];
}
export interface QimenStemTombFinding {
  stem:string;palace:number;role:'principal'|'lodged';targetBranch:string;
  ruleId:string;ruleVersion:string;evidence:string[];
}
export interface QimenStemTombAnalysis {
  version:string;profile:'qimen-go-explicit-stem-tombs';rules:QimenMarkerRule[];
  checks:QimenStemTombCheck[];findings:QimenStemTombFinding[];warnings:string[];
}
export interface QimenChart {
  available: boolean; reason?: string; dun: string; ju: number; yuan: string; solarTerm: string;
  xun: string; chiefStar: string; chiefDoor: string; palaces: QimenPalace[];
  reasons: string[]; warnings: string[]; version: string;
  auxiliary?:QimenAuxiliaryAnalysis;
  patterns?:QimenPatternAnalysis;
  stemTombs?:QimenStemTombAnalysis;
}
export interface NameImagerySourceReference {id:string;version:string;locator:string;note:string;}
export interface NameImageryProfile {
  version:'project-character-imagery-outer-palace-set/1.0.0';mode:'project-character-imagery-outer-palace-set/1.0.0';
  authority:'project-experimental';name:string;sourceIds:string[];labelSourceId:'editorial-rules';
  elementPalaces:Record<Element,number[]>;palaceElements:Record<string,Element>;
  palaceBranches:Record<string,string[]>;sourceReferences:NameImagerySourceReference[];policies:string[];
}
export interface NameImageryObservation {
  category:'auxiliary'|'pattern'|'stem-tomb';kind:string;label:string;palace:number;
  ruleId:string;ruleVersion:string;subjects:string[];evidence:string[];sourceReferences:NameImagerySourceReference[];
  status:'saved-structure-intersection';nameEffect:'not-evaluated';
}
export interface NameImageryCharacterRow {
  index:number;char:string;pinyin:string;elements:Element[];labelBasis:string;
  labelSourceId:'editorial-rules';dictionarySourceId:string;state:'mapped'|'unresolved';palaces:number[];
  chartObservationStatus:'assessed-saved-intersection'|'not-assessed';missing:string[];
}
export interface NameImageryPalaceReading {
  palace:number;characterIndexes:number[];snapshot:QimenPalace;
  observations:NameImageryObservation[];intersectionStatus:'registered-intersection'|'no-registered-intersection';
  note:string;
}
export interface NameImageryAnalysis {
  version:'project-character-imagery-outer-palace-set/1.0.0';mode:'project-character-imagery-outer-palace-set/1.0.0';
  authority:'project-experimental';status:'mapped'|'partial'|'chart-unavailable';
  surnameContext:string;surnameMapping:'not-performed';givenName:string;
  characterRows:NameImageryCharacterRow[];unionPalaces:number[];palaceReadings:NameImageryPalaceReading[];
  chart:{sha256:string;version:string;available:boolean;observationStatus:'assessed-saved-intersection'|'not-assessed'};
  sourceReferences:NameImagerySourceReference[];sourceIds:string[];profile:NameImageryProfile;
  wholeLayerRulesNotAssigned:string[];
  formationDecision:'not-evaluated';nameEffect:'not-evaluated';trueVoid:'not-evaluated';trueTomb:'not-evaluated';
  fourHarmRemoval:'not-performed';goodBadScore:null;limitations:string[];
}
export interface RenSourceReference {id:string;sourceId:string;section:string;layer:string;quote:string;locator:string;}
export type RenRelation='peer'|'resource'|'output'|'wealth'|'officer';
export interface RenStructureNode {
  id:string;pillar:'年柱'|'月柱'|'日柱'|'时柱';position:'year'|'month'|'day'|'hour';
  layer:'exposed'|'hidden'|'branch';symbol:string;element:Element;branch?:string;hiddenOrder?:number;
  relation?:RenRelation;tenGod?:string;isDayMaster:boolean;effectiveSupport:'unknown';
}
export interface RenStructuralObservation {
  id:string;contractId:string;name:string;state:'present'|'not-listed'|'unknown';scope:string;
  nodeIds:string[];positions:string[];evidence:string[];missing:string[];sourceReferences:RenSourceReference[];
  interpretationPolicy:string[];
}
export interface RenStructureEdge {
  id:string;kind:'generates'|'controls'|'stem-combination'|'branch-clash'|'branch-sanhe'|'branch-sanhui'|'potential-root'|'cover-carrier';
  from:string[];to:string[];direction:'directed'|'symmetric'|'group';distance?:number;
  dayMasterParticipates:boolean;monthBranch?:string;exposedHidden:string[];memberFacts:string[];
  outputDrainElement?:Element;combinationTargetElement?:Element;
  effectiveAction:'unknown';dependencies:{id:string;state:'unresolved';description:string}[];
  sourceReferences:RenSourceReference[];interpretationPolicy:string[];
}
export interface RenSourceCaseMatch {
  caseId:string;section:string;pillars:string[];authorAssertion:string;authorLabels:string[];
  classificationEvidence:string;confidence:string;labelConfidence:'explicit'|'context-only'|'quarantined';
  status:'author-labelled-example'|'chapter-context'|'quarantined';sourceQuote:string;sourceLocator:string;
  quarantines:{code:string;reason:string;scope:string;scanPage?:number}[];interpretationPolicy:string[];
}
export interface RenSourceClaim {
  caseId:string;label:string;quote:string;locator:string;scope:'exact-source-case-only';
  effectiveAction:'source-claim';nodeIds:string[];edgeIds:string[];quarantined:boolean;interpretationPolicy:string[];
}
export interface RenActionContractResult {
  id:string;name:string;state:'met'|'not-met'|'unknown'|'conflict';sourceReferences:RenSourceReference[];
  premiseDependencies:{id:string;state:'met'|'not-met'|'unknown'|'conflict';description:string}[];
  inhibitorDependencies:{id:string;state:'met'|'not-met'|'unknown'|'conflict';description:string}[];
  nodeIds:string[];edgeIds:string[];cycleDetected:boolean;interpretationPolicy:string[];
}
export interface RenCommentaryAnalysis {
  version:Exclude<RenMethod,'none'>;profileId:Exclude<RenMethod,'none'>;
  authority:'ren-commentary';sourceId:string;
  input:{baziVersion:string;timeBasis:BirthTimeAnalysis|null;pillars:{position:'year'|'month'|'day'|'hour';known:boolean;ganzhi?:string}[];dayStem?:string;monthBranch?:string;complete:boolean};
  sourceRules:RenSourceReference[];sourceCaseMatches:RenSourceCaseMatch[];observations:RenStructuralObservation[];
  structureGraph:{nodes:RenStructureNode[];edges:RenStructureEdge[];actionContracts:RenActionContractResult[]};sourceClaims:RenSourceClaim[];
  formationDecision:'source-case-only'|'unresolved';unresolvedConditions:string[];interpretationPolicy:string[];
  necessaryConditions?:RenNecessaryConditions;
  actionAnalysis?:import('./ren-actions-types').RenActionAnalysis;
  capacityAnalysis?:import('./ren-capacities-types').RenCapacityAnalysis;
  directionAnalysis?:import('./ren-directions-types').RenDirectionAnalysis;
  jointBattleAnalysis?:import('./ren-joint-battle-types').RenJointBattleAnalysis;
}
export interface RenNecessaryCheck {
  id:'child-wealth-required'|'child-output-superset-required';name:string;pattern:'cong-er';
  status:'contradicted'|'not-excluded'|'unknown';scope:string;sourceId:string;sourceQuote:string;sourceLocator:string;
  dayStem?:string;complete:boolean;matchedNodeIds:string[];positions:string[];evidence:string[];missing:string[];
  doesNotResolveFormation:true;
}
export interface RenNecessaryConditions {
  version:'ditian-ren-necessary-clauses/1.0.0';sourceId:'bazi-ditian-ren-necessary-2600158';
  scope:'selected-vocabulary-necessary-prerequisite-only';checks:RenNecessaryCheck[];interpretationPolicy:string[];
}
export interface Analysis { bazi: BaziAnalysis; qimen: QimenChart;renCommentary?:RenCommentaryAnalysis;projectNamingUse?:import('./project-naming-use').ProjectNamingUseSnapshot; }
export interface NameEvaluation { sound: number; meaning: number; simplicity: number; traditional: number; distinctiveness: number; }
export interface NameCandidate {
  parentNamePhoneticReview?: import('./parent-name-phonetics-review').ParentNamePhoneticSnapshot;
  id: string; givenName: string; fullName: string; pinyin: string; style: string;
  characters: CharacterEntry[]; meaning: string; reason: string; citations: Citation[];
  evaluation: NameEvaluation; warnings: string[]; traditionalReason: string; favorite: boolean;
  origin: 'local'|'ai'; reviewNote: string; originalMeaning: string;
  wordPronunciationReference?:import('./word-pronunciation-reference').NameWordPronunciationSnapshot;
  elementAssessment?:import('./element-assessment').ElementCandidateAssessment;
  namingMeaningReview?:import('./naming-meaning-review').NamingMeaningReviewSnapshot;
  meaningContextReview?:import('./meaning-context-review').SavedMeaningContextReview;
  modernPracticalEvidence?:import('./modern-practical-evidence').ModernPracticalRecord;
  numerology?:NumerologyAnalysis;
  imageReading?:NameImageryAnalysis;
  yueReading?:YueNameReading;
  namePhoneticReviews?:import('./name-phonetic-review-types').NamePhoneticReviewsSnapshot;
  yueHomophones?:import('./yue-homophone-types').YueHomophoneReview;
}
export interface NamingSession {
  id: string; profileId: string; createdAt: string; profile: BirthProfile; preferences: NamingPreferences;
  analysis: Analysis; candidates: NameCandidate[]; reviewNote: string;
  originalFavorable: Element[]; dataVersion: string;
  elementAssessmentPreferences?:import('./element-assessment').ElementAssessmentPreferences;
  sourceSnapshot?:SessionSourceSnapshot;
  /** Generation-only rule identity; absent legacy records are never assigned a later editorial version. */
  namingRules?:import('./naming-rules').NamingRulesSnapshot;
  /** Derived by the main process from the original complete knowledge package, never trusted as an imported assertion. */
  factVerification?:CandidateFactVerification;
  /** Missing on legacy records; the persistence layer treats that initial revision as zero. */
  reviewRevision?:number;
  /** Changes on every persisted review and backup restore, preventing stale-client ABA writes. */
  reviewToken?:string;
}
export interface CandidateFactVerification {
  version:'candidate-facts/1.0.0';status:'verified-builtin'|'verified-archive'|'unverified-legacy';
  dataVersion:string;datasetSha256?:string;
}
export interface SessionRevision { id:string; sessionId:string; createdAt:string; session:NamingSession; }
export interface StudioSettings {
  studioName: string; contact: string; logoDataUrl: string; apiBaseUrl: string; model: string;
  timeoutMs: number; hasApiKey: boolean; useAi: boolean;
  credentialNotice?:string;
}
export type BrandSettings = Pick<StudioSettings, 'studioName' | 'contact' | 'logoDataUrl'>;
export type AiSettings = Pick<StudioSettings, 'apiBaseUrl' | 'model' | 'timeoutMs' | 'useAi'>;
export interface GenerateResult { session: NamingSession; messages: string[]; }
export interface Bootstrap { profiles: BirthProfile[]; sessions: NamingSession[]; sessionCatalog?:import('./session-pagination').SessionCatalogPage; storageState?:import('./customer-storage-state').CustomerStorageState; settings: StudioSettings; sources: SourceRecord[]; stats: {characters:number;citations:number;knowledge:number;dataVersion:string;knowledgeCategories?:string[]}; desktop: boolean; maintenance?:import('./data-maintenance').DataMaintenanceStatus; }
export interface StudioAPI {
  getCmnReadingOptions(char:string):Promise<import('./cmn-reading').CmnReadingQuery>;
  getB04WordContextOptions(input:import('./b04-word-context').B04WordContextQuery):Promise<import('./b04-word-context').B04WordContextOptions>;
  getSingleCharacterMeaningOptions(input:import('./single-character-meaning').SingleCharacterMeaningQuery):Promise<import('./single-character-meaning').SingleCharacterMeaningOptions>;
  getNamingCoverage():Promise<import('./naming-coverage').CoverageDto>;
  confirmParentNameReading(profile:BirthProfile,intent:import('./parent-name-phonetics').ParentNameReadingConfirmIntent):Promise<import('./parent-name-phonetics').ParentNameReading>;
  bootstrap(): Promise<Bootstrap>;
  listSessionCatalog(input?:import('./session-pagination').SessionCatalogRequest):Promise<import('./session-pagination').SessionCatalogPage>;
  readSessionDetail(id:string):Promise<NamingSession|null>;
  migrateCustomerStorage():Promise<import('./customer-storage-state').CustomerStorageState>;
  saveProfile(profile: BirthProfile): Promise<BirthProfile>;
  deleteProfile(id: string): Promise<void>;
  analyze(profile: BirthProfile): Promise<Analysis>;
  previewBaziMainchain(profile:BirthProfile,options?:import('./bazi-mainchain').BaziMainchainPreviewOptions):Promise<import('./bazi-mainchain').BaziMainchainPreview>;
  previewBaziRootFeedback(profile:BirthProfile,options?:import('./bazi-root-feedback-facade').RootFeedbackFacadeOptions):Promise<import('./bazi-root-feedback-facade').RootFeedbackFacadeDTO>;
  previewGengSiReference(profile:BirthProfile):Promise<import('./geng-si-reference').GengSiReferencePreview>;
  previewQiongtongClauseReferences(profile:BirthProfile):Promise<import('./qiongtong-clause-reference-preview').QiongtongClauseReferencePreview>;
  previewJiaHaiControl(profile:BirthProfile,options?:import('./jia-hai-control-preview').JiaHaiControlOptions):Promise<import('./jia-hai-control-preview').JiaHaiControlPreview>;
  generate(profile: BirthProfile, preferences: NamingPreferences): Promise<GenerateResult>;
  saveSession(session: NamingSession): Promise<NamingSession>;
  getMeaningContextOptions(sessionId:string,candidateId:string):Promise<import('./meaning-context-review').MeaningContextOptions>;
  updateMeaningContext(sessionId:string,candidateId:string,request:import('./meaning-context-review').MeaningContextUpdateRequest,expectedReviewRevision:number,expectedReviewToken:string):Promise<NamingSession>;
  listHistory(sessionId:string):Promise<SessionRevision[]>;
  recordModernPracticalEvidence(sessionId:string,candidateId:string,expectedReviewRevision:number,expectedReviewToken?:string):Promise<NamingSession>;
  clearModernPracticalEvidence(sessionId:string,candidateId:string,expectedReviewRevision:number,expectedReviewToken?:string):Promise<NamingSession>;
  restoreHistory(sessionId:string,revisionId:string,expectedReviewRevision?:number,expectedReviewToken?:string):Promise<NamingSession>;
  updateNumerology(sessionId:string,candidateId:string,selections:Record<string,string>,expectedReviewRevision?:number,expectedReviewToken?:string):Promise<NamingSession>;
  updateElementAssessment(sessionId:string,candidateId:string,choices:import('./element-assessment').ElementAssessmentChoiceInput[],expectedReviewRevision?:number,expectedReviewToken?:string):Promise<NamingSession>;
  updateYueReading(sessionId:string,candidateId:string,selections:YueReadingSelections,expectedReviewRevision?:number,expectedReviewToken?:string):Promise<NamingSession>;
  searchKnowledge(query: string, category?: string): Promise<KnowledgeEntry[]>;
  searchClassics(query:string,bookId?:import('./classics-types').ClassicBookId,page?:number):Promise<import('./classics-types').ClassicSearchResponse>;
  readClassicSection(id:string):Promise<import('./classics-types').ClassicSection>;
  getOfficialNamePopularity():Promise<import('./official-name-popularity').OfficialNamePopularityCatalog>;
  searchCharacters(query: string): Promise<CharacterEntry[]>;
  saveSettings(settings: StudioSettings, apiKey?: string): Promise<StudioSettings>;
  saveBrand(settings: BrandSettings): Promise<StudioSettings>;
  saveAiSettings(settings: AiSettings, apiKey?: string): Promise<StudioSettings>;
  testConnection(settings: StudioSettings, apiKey?: string): Promise<string>;
  testNamingCapability(settings:AiSettings|StudioSettings,apiKey?:string):Promise<import('./ai-capability').AiNamingCapability>;
  exportReport(session: NamingSession): Promise<string|null>;
  backup(): Promise<string|null>;
  restore(): Promise<import('./restore-result').CustomerRestoreResult>;
  exportDataPack(): Promise<string|null>;
  importDataPack(): Promise<string|null>;
  rollbackDataPack(): Promise<string>;
  previewDataPack():Promise<import('./data-maintenance').DataPackPreview|null>;
  previewBuiltinDataPack():Promise<import('./data-maintenance').DataPackPreview>;
  previewRollbackDataPack():Promise<import('./data-maintenance').DataPackPreview>;
  applyDataPackPreview(id:string):Promise<string>;
  discardDataPackPreview(id:string):Promise<void>;
}
declare global { interface Window { studio: StudioAPI; } }
