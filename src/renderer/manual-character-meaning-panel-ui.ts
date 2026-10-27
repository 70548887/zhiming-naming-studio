/** Renderer display projection only. A future owner maps the trusted manual
 * directory/result into these fields; this is not a shared service/API DTO. */
export interface ManualCharacterMeaningItemView {
 selectionKey:string;char:string;pinyin:string;tone:number;
 originalMeaning:string;
 sourceCitation:{dictionaryName:string;word:string;pinyin:string;license:string};
 changeMeaning:boolean;
 manualReason:string;limits:readonly string[];
}
export interface ManualCharacterMeaningDirectoryView {
 char:string;status:'available'|'not-covered';items:readonly ManualCharacterMeaningItemView[];
}
export interface ManualCharacterMeaningExplanationView {
 char:string;selectionKey:string;meaning:string;manualReason:string;limits:readonly string[];
}
export interface ManualCharacterMeaningPanelState {
 /** Echo the UI owner's generation captured when it requested this result.
  * It is not a pack identity, source permission or service argument. */
 ownerKey:string;
 phase:'idle'|'querying'|'ready'|'selecting'|'selected'|'error'|'unavailable';
 /** Physical pending state stays true until the owner's actual Promise ends,
  * even after cancellation/input invalidation. Cancellation remains reachable. */
 requestPending:boolean;
 directory:ManualCharacterMeaningDirectoryView|null;
 explanation:ManualCharacterMeaningExplanationView|null;
 notice:string;error:string|null;
}
export interface ManualCharacterMeaningPanelProps {
 value:string;
 /** Advance on input/owner invalidation including A→B→A. The parent must not
  * relabel an old response with the current key or adopt cancelled replies. */
 ownerKey:string;state:ManualCharacterMeaningPanelState;
 disabled?:boolean;blockedReason?:string|null;
 onInputChange:(value:string)=>void;
 /** Explicit user intent only; no query is emitted on mount/input change. */
 onQuery:(char:string)=>void;
 /** Pass the original opaque key only. No sense ID/hash is accepted from UI. */
 onSelect:(selectionKey:string)=>void;
 onCancel:()=>void;
}
