import type {CharacterEntry,Element,SourceRecord} from './types';
import type {M754AdoptionScope,M754ObjectTheme} from './m754-element-imagery';

export interface M779PublicationIdentity {
 publicationId:'project-element-imagery/1.0.0';manifestSha256:string;
 authority:'project-convention';mappingProfileId:string;mappingPackageLockSha256:string;
 reviewId:'M770-object-element-review/1.0.0';reviewSha256:string;reviewerId:'M770-DECISION';
 semanticAuditId:'M777-element-admission-audit/1.0.0';semanticAuditSha256:string;
}
export interface M779ModuleCoverage {
 baseline:{total:779;tagged:257;untagged:522};
 admitted:{general:5;explicitTheme:5;generalCharacters:string[];themeCharacters:string[]};
 activation:'explicit-trusted-factory';productionServiceConnected:false;productionStoreConnected:false;
}
export interface M779NameBinding {candidateId:string;givenName:string;}
export interface M779PositionProvenance {
 position:number;char:string;pinyin:string;baselineCharacterSha256:string;projectedCharacterSha256:string;
 baselineElements:Element[];effectiveElements:Element[];
 mapping:null|{
  authority:'project-convention';profileId:string;candidateSha256:string;factId:string;
  dictionaryWord:string;sourceRecordId:string;senseRecordId:string;
  sourceEntrySha256:string;sourceReadingSha256:string;sourceDefinitionSha256:string;
  mappingRuleId:string;objectClass:string;element:Element;
  scope:M754AdoptionScope;requiredTheme:M754ObjectTheme|null;requestedTheme:M754ObjectTheme|null;
  condition:string;status:'eligible'|'theme-required';
 };
}
/** Serializable evidence DTO. It is not a Store write, a signature, or permission supplied by a client. */
export interface M779NameProvenance {
 schemaVersion:'m779-admitted-element-imagery-provenance/1.0.0';
 publication:M779PublicationIdentity;binding:M779NameBinding;namingRulesVersion:'naming-editorial-7.1.0';
 scoreEffect:'projected-elements-enter-existing-shortlist-and-traditional-score';
 rows:M779PositionProvenance[];
}
export interface M779AdmittedProjection {
 characters:CharacterEntry[];
 decisions:{char:string;pinyin:string;status:'eligible'|'theme-required';effectiveElements:Element[];scope:M754AdoptionScope;requiredTheme:M754ObjectTheme|null;requestedTheme:M754ObjectTheme|null}[];
 publication:M779PublicationIdentity;coverage:M779ModuleCoverage;sourceRecords:readonly SourceRecord[];
}
