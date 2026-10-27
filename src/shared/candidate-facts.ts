import type { CandidateFactVerification, NamingSession } from './types';
export const CANDIDATE_FACT_VERSION='candidate-facts/1.0.0' as const;
export function validFactVerification(value:unknown,dataVersion:string):value is CandidateFactVerification {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as CandidateFactVerification;
 return Object.keys(v).every(key=>['version','status','dataVersion','datasetSha256'].includes(key))&&v.version===CANDIDATE_FACT_VERSION&&v.dataVersion===dataVersion
  &&['verified-builtin','verified-archive','unverified-legacy'].includes(v.status)
  &&(v.status==='unverified-legacy'?v.datasetSha256===undefined:typeof v.datasetSha256==='string'&&/^[a-f0-9]{64}$/.test(v.datasetSha256));
}
export function sessionFactStatus(session:Pick<NamingSession,'dataVersion'|'factVerification'>):{status:'builtin'|'archive'|'unverified';label:string;notice:string} {
 const fact=session.factVerification;
 if(!fact||!validFactVerification(fact,session.dataVersion)||fact.status==='unverified-legacy')return {status:'unverified',label:'历史用字与引文未重新核验',notice:'缺少生成时完整知识包，当前保留历史记录并检查基本自洽；不能用当前字库补证当时字义、读音或引文。'};
 if(fact.status==='verified-builtin')return {status:'builtin',label:'已按内置原版本核对用字与引文',notice:'候选读音、字典记录与引文已和生成时对应的内置知识包逐项核对；人工寓意和审阅文字单独保留。此核对不代替姓名适用性审阅。'};
 return {status:'archive',label:'已按生成时知识包归档核对',notice:'候选读音、字典记录与引文和当时完整知识包的内容一致；自定义包的来源为提供者登记，内容一致不等于上游真实性或专家认证。'};
}


/** Raw authenticated rule text only; this type grants no producer authority. */
export type OwnedNamingRuleJsonInputs = Readonly<{
  baseJson:string;
  v5Json:string;
  v6Json:string;
  v7Json:string;
}>;
