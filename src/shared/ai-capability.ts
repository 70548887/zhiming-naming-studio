export type AiCapabilityCheck='passed'|'failed'|'not-run';
export interface AiNamingCapability {
  kind:'structured-naming';status:'passed'|'failed';endpoint:string;model:string;checkedAt:string;
  checks:{transport:AiCapabilityCheck;json:AiCapabilityCheck;candidateShape:AiCapabilityCheck;localConstraints:AiCapabilityCheck};
  message:string;limitations:string[];
}
