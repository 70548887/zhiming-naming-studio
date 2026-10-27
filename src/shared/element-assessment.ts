import type {ElementPlanBinding,PlanElementAssessment} from '../../data/element-object/lookup-element-assessment.mjs';
export type ElementAssessmentDecision='unconfirmed'|'confirmed'|'not-applicable';
export interface ElementAssessmentChoiceInput {position:number;decision:ElementAssessmentDecision;confirmedEvidenceIds:string[];}
export interface ElementAssessmentPreferences {version:'element-assessment-preferences/1.0.0';sessionId:string;candidates:{candidateId:string;choices:ElementAssessmentChoiceInput[]}[];}
export interface ElementAssessmentRow {position:number;char:string;pinyin:string;binding:ElementPlanBinding|null;decision:ElementAssessmentDecision;confirmedEvidenceIds:string[];assessment:PlanElementAssessment|null;unavailableReason:string;}
export interface ElementCandidateAssessment {version:'element-assessment-snapshot/1.0.0';profileId:'project-dictionary-object-elements/1.0.0';sourceLockSha256:string;sessionId:string;candidateId:string;sourceIds:string[];rows:ElementAssessmentRow[];}
export const ELEMENT_ASSESSMENT_SOURCE_ID='project-dictionary-object-elements-v1-fixed';
export const ELEMENT_ASSESSMENT_PROFILE='project-dictionary-object-elements/1.0.0' as const;
export const ELEMENT_ASSESSMENT_LOCK='9c42d9649c3a07cf94a690b1d4059b30352f85eb84cb902fc3ccd67ac49c221f';
