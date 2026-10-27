/** Controlled presentation contract. These fields are UI state, not source or
 * storage authority. The eligibility diagnostic is intentionally not an input. */
export const CANDIDATE2_GENERATION_UI_VERSION='candidate2-generation-ui/1.0.0' as const;
export type Candidate2GenerationPhase='idle'|'blocked'|'unavailable'|'generating'|'delivering'|'ready'|'error';
export interface Candidate2GenerationUiState {
 enabled:boolean;phase:Candidate2GenerationPhase;requestPending:boolean;canGenerate:boolean;
 blockedReason:string|null;notice:string;error:string|null;
 savedSummary?:{sessionId:string;profileId:string;candidateCount:number;traditionalStatus:'unknown'};
}
export interface Candidate2GenerationPanelProps {
 state:Candidate2GenerationUiState;disabled?:boolean;
 onEnabledChange:(enabled:boolean)=>void;onGenerate:()=>void;onCancel:()=>void;onRetryDelivery:()=>void;
}
