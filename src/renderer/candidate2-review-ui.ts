/** Controlled renderer display only. No API, saved-session proof or writer. */
export interface Candidate2ReviewUiState {
 phase:'idle'|'blocked'|'unavailable'|'saving'|'delivering'|'ready'|'reconcile';
 requestPending:boolean;canSave:boolean;canRetryDelivery:boolean;requiresReadback:boolean;requiresRestart:boolean;
 blockedReason:string|null;notice:string;error:string|null;
 savedSummary?:{sessionId:string;reviewRevision:number;traditionalStatus:'unknown'};
}
/** Owner supplies read/compare capabilities only after the corresponding real
 * route and dirty-draft guards exist. These flags never authorize a write. */
export type Candidate2ReviewFeedbackState=Omit<Candidate2ReviewUiState,'canSave'|'savedSummary'>&{
 draftDirty:boolean;canReadSaved:boolean;canLoadLatest:boolean;canCompareDraft:boolean;
};
export interface Candidate2ReviewFeedbackProps {
 state:Candidate2ReviewFeedbackState;disabled?:boolean;
 onCancelWait:()=>void;onRetryDelivery:()=>void;onReadSaved:()=>void;onLoadLatest:()=>void;onCompareDraft:()=>void;
}
