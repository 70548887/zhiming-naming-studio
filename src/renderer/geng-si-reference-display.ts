import type {ParagraphReferenceR3,SeasonalFactsR3} from '../domain/traditional/geng-si-reference-r3';

/** Renderer-only shape for the existing core r4 readonly envelope; no new StudioAPI method. */
export interface GengSiReferenceDisplayEnvelope {
 readonly schema:'geng-si-analysis-explanation/1.0.0';readonly label:'调候条文旁证（无排序）';readonly baziVersion:string;
 readonly seasonalFacts:SeasonalFactsR3;readonly paragraph:ParagraphReferenceR3;
 readonly rankingImpact:'none';readonly selectionCertificate:'not-created-or-modified';
}
export function gengSiReferenceDisplay(value:GengSiReferenceDisplayEnvelope|undefined){
 if(!value||value.schema!=='geng-si-analysis-explanation/1.0.0'||value.rankingImpact!=='none'||value.selectionCertificate!=='not-created-or-modified'||value.paragraph.version!=='geng-si-qiongtong-reference/1.0.2'||value.seasonalFacts.applicability!==value.paragraph.status)return undefined;
 return{reference:value.paragraph,baziVersion:value.baziVersion};
}
