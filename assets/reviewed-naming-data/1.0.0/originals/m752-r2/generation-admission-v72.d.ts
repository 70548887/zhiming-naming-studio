/** M752-r2 decision interchange only. No serializable value authenticates a source. */
export type ThemeId='civic-homeland'|'water-bubbles'|'textile-ribbon'|'agriculture'|'literary-artwork'|'herb-plant';
export type Stage="pool"|"required"|"local"|"ai"|"save"|"restore";
export type AssessStatus="eligible"|"needs-theme"|"pending-source-identity"|"manual-only"|"not-admitted"|"reading-mismatch"|"candidate-scope-mismatch"|"source-unavailable"|"rejected-integrity"|"condition-not-supported"|"blocked-existing-constraints";
export interface AdmissionRecord {
 candidateCaseId:string;reviewId:string;decision:'allow-single-character-generation'|'manual-only'|'pending'|'reject';
 identity:{char:string;pinyin:string;tone:number;senseId:string;[key:string]:unknown};
 usage:{mode:'any-context'}|{mode:'explicit-themes';anyOf:ThemeId[]};
 conditionIds:string[];conflictIds:string[];
 machineConditions:{selectedPinyin:string;tone:number;senseId:string;allowedGivenNameLengths:(1|2)[];requiredThemeIds:ThemeId[];namePart:'given-name';conflictPolicy:'do-not-claim-alternate-sense'};
 project:{meaning:string;projectWish:null;limits:string[];attribution:string;license:string};
 [key:string]:unknown;
}
export interface SourceIdentity {char:string;pinyin:string;tone:number;senseId:string;sourceId:string;sourceWord:string;rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number;definitionSha256:string;baselineCharacterSha256:string;[key:string]:unknown;}
export interface AdoptionReceipt {candidateId:string;fullName:string;givenName:string;position:number;candidateCaseId:string;selectedPinyin:string;tone:number;senseId:string;identitySha256:string;contextSha256:string;sourceSha256:string;admissionSha256:string;ruleVersion:'naming-editorial-7.2.0';[key:string]:unknown;}
export type AssessmentExpectation={action:'assess';stage:Stage;assessmentScope:'qualification'|'receipt-validation';baselineRef:string;inputPatch:Record<string,unknown>;faultInjection:Record<string,unknown>;expected:{status:AssessStatus}};
export type OutputExpectation={action:'output-assertion';stage:'local'|'ai';baselineRef:string;candidateOutputPatch:Record<string,unknown>;expected:{assertionKind:null;ok:true}|{assertionKind:'reject-semantic-credit'|'reject-unreviewed-claim';ok:false}};
export type ReplayExpectation={action:'legacy-replay';stage:'restore';baselineRef:string;legacyFixtureRef:string;mutation:Record<string,unknown>;expected:{assertionKind:'preserve-legacy';ok:true;oldBytesUnchanged:true;noNewReceipt:true}};
export type AcceptanceExpectation=(AssessmentExpectation|OutputExpectation|ReplayExpectation)&{id:string;productExecution:'not-run'};
export type AssessResult={status:AssessStatus};
export type OutputAssertionResult={ok:true;assertionKind:null}|{ok:false;assertionKind:'reject-semantic-credit'|'reject-unreviewed-claim'};
export type LegacyReplayResult={ok:true;assertionKind:'preserve-legacy';oldBytesUnchanged:true;noNewReceipt:true};
