import React from 'react';

/** Explicit contract-only replacement for the not-yet-frozen design viewer.
 * This stub does not read a catalog, render cultural facts or grant authority. */
interface Props {ownerProfileId:string|null;contextKey:string;busy:boolean;readOnly:boolean;isBusy:()=>boolean;isOwnerCurrent:()=>boolean;onOpenSource:(reference:{comparisonId:string;ownerProfileId:string;sourceSessionId:string})=>void;}
export function CulturalSavedCatalogViewer(props:Props){
 const reference=props.ownerProfileId?window.__M925_GLUE_SEEDS__.references[props.ownerProfileId]:undefined;
 return <section data-m925-viewer-props data-owner={props.ownerProfileId??''} data-context={props.contextKey} data-read-only={String(props.readOnly)} data-busy={String(props.busy)}>
  <p>未冻结 viewer 的 App props 合同 stub；不是产品文化目录。</p>
  <button type="button" data-m925-open-source disabled={!reference||props.busy} onClick={()=>{if(reference)props.onOpenSource(reference);}}>显式打开已知原方案引用</button>
 </section>;
}
