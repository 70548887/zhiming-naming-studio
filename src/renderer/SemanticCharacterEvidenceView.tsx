import React,{useId} from 'react';
import {canonicalPlainJson} from '../shared/plain-json';
import {M923_FAMILY,M923_GENERATION_SNAPSHOT_SCHEMA,type M923GeneratedCandidate,type M923GenerationSnapshot,type M923Receipt,type M923Project} from '../shared/naming-semantic-m923';
import {SEMANTIC_THEMES_V72} from '../shared/naming-semantic-admission-v72';
import './semantic-character-evidence-view.css';

export interface SemanticCharacterEvidenceContext {contextKey:string;candidateId:string;fullName:string;givenName:string;}
/** Correlation is supplied by the upstream owner after its own checks. This
 * display contract does not issue a verified flag or source admission. */
export type SemanticCharacterEvidenceAssociation=({status:'upstream-associated'}&SemanticCharacterEvidenceContext)|{status:'pending'|'unavailable'|'stale'};
export interface SemanticCharacterEvidenceViewProps {
 candidate?:M923GeneratedCandidate;current:SemanticCharacterEvidenceContext;
 association:SemanticCharacterEvidenceAssociation;id?:string;
}
const text=(value:unknown,max=10000):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const string=(value:unknown,max=10000):value is string=>typeof value==='string'&&value.length<=max;
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const list=(value:unknown,max=100):value is string[]=>Array.isArray(value)&&value.length<=max&&value.every(item=>string(item));
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const family=(value:unknown)=>object(value)&&Object.entries(M923_FAMILY).every(([key,fixed])=>value[key]===fixed);
const refs=(value:unknown):value is SemanticCharacterEvidenceContext=>object(value)&&text(value.contextKey,1000)&&text(value.candidateId,1000)&&text(value.fullName,100)&&text(value.givenName,10);
const identityMatches=(left:SemanticCharacterEvidenceContext,right:SemanticCharacterEvidenceContext)=>['contextKey','candidateId','fullName','givenName'].every(key=>left[key as keyof typeof left]===right[key as keyof typeof right]);
const projectValid=(value:unknown):value is M923Project=>object(value)&&text(value.meaning)&&value.projectWish===null&&list(value.limits)&&value.attribution==='M923 independent project wording decision; dictionary text remains MOE'&&value.license==='CC0-1.0';
const receiptHashes=['registryEntrySHA256','decisionRecordsSHA256','policySHA256','sourceEntrySHA256','sourceDefinitionSHA256','sourceCaseSHA256','lineageSHA256','baseDatasetSHA256','basePackSHA256','projectTextSHA256','projectSHA256','constraintContextSHA256','contextSHA256'] as const;
function receiptValid(value:unknown,snapshot:M923GenerationSnapshot,position:number,char:string):value is M923Receipt {
 if(!object(value)||!family(value)||value.schema!=='m921-m923-character-generation-adoption/1'||value.candidateId!==snapshot.candidateId||value.fullName!==snapshot.fullName||value.givenName!==snapshot.givenName||value.position!==position||value.char!==char||!text(value.pinyin,100)||![1,2,3,4,5].includes(value.tone as number)||!text(value.senseId,1000)||!text(value.reviewId,1000)||!text(value.candidateCaseId,1000)||value.explanationScope!=='characterwise-only'||value.projectWish!==null||value.wholeNameMeaning!==null||value.scoreDelta!==0||value.constraintEngineId!==snapshot.constraintEngineId||value.constraintContextSHA256!==snapshot.constraintContextSHA256)return false;
 return receiptHashes.every(field=>hash(value[field]));
}
interface Display {candidate:M923GeneratedCandidate;snapshot:M923GenerationSnapshot;adopted:number;}
/** Data-only clone and display consistency checks. These do not hash source
 * bytes, replay constraints, infer coverage, or authenticate a receipt. */
function display(props:SemanticCharacterEvidenceViewProps):Display|null {
 try{
  const relation=JSON.parse(canonicalPlainJson({current:props.current,association:props.association}));
  if(!refs(relation.current)||!refs(relation.association)||relation.association.status!=='upstream-associated'||!identityMatches(relation.current,relation.association)||!props.candidate)return null;
  const json=canonicalPlainJson(props.candidate);if(json.length>4_000_000)return null;
  const candidate=JSON.parse(json) as M923GeneratedCandidate,snapshot=candidate.semanticAdoptionM923,current=relation.current as SemanticCharacterEvidenceContext;
  if(!candidate||!snapshot||snapshot.schema!==M923_GENERATION_SNAPSHOT_SCHEMA||!family(snapshot)||!family(snapshot.familySelection)||snapshot.familySelection.enabled!==true||snapshot.constraintEngineId!=='m923-existing-constraints-v1'||!hash(snapshot.constraintContextSHA256)||snapshot.candidateId!==current.candidateId||snapshot.fullName!==current.fullName||snapshot.givenName!==current.givenName||candidate.id!==current.candidateId||candidate.fullName!==current.fullName||candidate.givenName!==current.givenName)return null;
  const characters=[...current.givenName];
  if(!/^\p{Script=Han}{1,2}$/u.test(current.givenName)||!current.fullName.endsWith(current.givenName)||current.fullName.length<=current.givenName.length||!['local','ai'].includes(candidate.origin)||snapshot.generationOrigin!==candidate.origin||!text(candidate.pinyin,200)||!string(candidate.meaning)||candidate.meaning!==snapshot.generatedMeaning||candidate.originalMeaning!==snapshot.generatedMeaning||!string(snapshot.generatedMeaning)||!string(snapshot.baseMeaning)||!string(snapshot.baseReason)||!list(snapshot.baseWarnings)||snapshot.wholeNameMeaning!==null||snapshot.projectWish!==null||snapshot.scoreDelta!==0||!Array.isArray(snapshot.themeIds)||snapshot.themeIds.some(theme=>!SEMANTIC_THEMES_V72.includes(theme))||!Array.isArray(candidate.characters)||candidate.characters.length!==characters.length||!Array.isArray(snapshot.rows)||snapshot.rows.length!==characters.length)return null;
  let adopted=0;
  for(const [position,char] of characters.entries()){
   const row=snapshot.rows[position],entry=candidate.characters[position];
   if(!row||row.position!==position||row.char!==char||!entry||entry.char!==char||!text(entry.pinyin,100)||!string(entry.meaning)||!text(entry.sourceId,1000))return null;
   if(row.adoption===null){if(row.project!==null)return null;continue;}
   if(!receiptValid(row.adoption,snapshot,position,char)||!projectValid(row.project))return null;
   const selected=row.adoption;
   if(!(entry.pinyin===selected.pinyin&&entry.tone===selected.tone)&&!(Array.isArray(entry.readings)&&entry.readings.some(reading=>reading.pinyin===selected.pinyin&&reading.tone===selected.tone)))return null;
   adopted++;
  }
  return{candidate,snapshot,adopted};
 }catch{return null;}
}
function TechnicalReceipt({receipt}:{receipt:M923Receipt}){return <dl className="sce-technical-fields"><div><dt>释义标识</dt><dd>{receipt.senseId}</dd></div><div><dt>审阅标识</dt><dd>{receipt.reviewId}</dd></div><div><dt>字例标识</dt><dd>{receipt.candidateCaseId}</dd></div><div><dt>发布来源</dt><dd>{receipt.sourceId}</dd></div><div><dt>发布版本</dt><dd>{receipt.publicationVersion}</dd></div><div><dt>独立规则族</dt><dd>{receipt.familyId}</dd></div><div><dt>决议版本</dt><dd>{receipt.decisionVersion}</dd></div><div><dt>规则版本</dt><dd>{receipt.ruleVersion}</dd></div>{receiptHashes.map(field=><div key={field}><dt>{field}</dt><dd>{receipt[field]}</dd></div>)}</dl>;}

export function SemanticCharacterEvidenceView(props:SemanticCharacterEvidenceViewProps){
 const generated=useId(),id=props.id??`semantic-character-${generated}`,shown=display(props);
 if(!shown)return <section className="sce-view" data-semantic-character-evidence="unavailable" aria-labelledby={`${id}-title`}><h3 id={`${id}-title`}>单字释义说明</h3><p role="status">当前单字说明不可用，请由上游重新核对当前候选关联后提供。</p></section>;
 const {candidate,snapshot,adopted}=shown;
 return <section className="sce-view" data-semantic-character-evidence="available" aria-labelledby={`${id}-title`}>
  <header className="sce-header"><div><p className="sce-eyebrow">候选名字 · 只读说明</p><h3 id={`${id}-title`}>{candidate.fullName} · 单字释义</h3><p>{candidate.pinyin}</p></div><span className="sce-badge">仅单字说明</span></header>
  <p className="sce-count" role="status">本名实际采用 {adopted}/{snapshot.rows.length} 个字位的本批新增说明。{adopted===0?'未采用本批新增说明；下方仅保留候选原有的通用字义。':''}</p>
  <p className="sce-boundary">本面板只展示上游传来的当前候选说明及其关联范围，不独立认证来源。单字采用不代表整名含义已确认，也不改变评分。</p>
  <ol className="sce-characters" aria-label="逐字说明，保持名字中的位置">{snapshot.rows.map((row,index)=>{const entry=candidate.characters[index],receipt=row.adoption,project=row.project;return <li key={row.position} data-semantic-position={row.position}>
   <h4>第 {index+1} 字 · {row.char}</h4>
   <section aria-labelledby={`${id}-baseline-${index}`}><h5 id={`${id}-baseline-${index}`}>候选原有通用字义</h5><p>{entry.meaning||'候选未提供通用字义。'}</p><p className="sce-muted">候选原读音：{entry.pinyin} · 原字义来源标识：{entry.sourceId}</p><p className="sce-hint">这是候选本已有的字义说明，不替代本次采用义项的辞典原文。</p></section>
   {receipt&&project?<section className="sce-adopted" aria-labelledby={`${id}-adopted-${index}`}><h5 id={`${id}-adopted-${index}`}>本次采用的单字取意</h5><dl><div><dt>选定读音</dt><dd>{receipt.pinyin} · {receipt.tone===5?'轻声':`${receipt.tone} 声`}</dd></div><div><dt>单字取意</dt><dd>{project.meaning}</dd></div></dl><h6>使用限制</h6>{project.limits.length?<ul>{project.limits.map((limit,i)=><li key={i}>{limit}</li>)}</ul>:<p>本条未列出额外限制；说明范围仍限于单字。</p>}<p className="sce-scope">说明范围：仅此字位的项目取意；未形成整名愿景或家庭许愿。</p><details><summary>查看本字出处标识与说明范围</summary><p>单字释义发布：{receipt.publicationVersion}；来源标识：{receipt.sourceId}。</p><p>项目措辞：{project.attribution}；许可：{project.license}。此公开回执未包含辞典原始释义全文，面板不补写引文。</p><TechnicalReceipt receipt={receipt}/></details></section>:<section className="sce-unadopted"><h5>本字位未采用本批新增说明</h5><p>保留候选已有通用字义，不据此增加本批采用回执或评分。</p></section>}
  </li>;})}</ol>
  <section className="sce-whole" aria-labelledby={`${id}-whole`}><h4 id={`${id}-whole`}>整名含义需人工核对</h4><p>本快照没有提供整名寓意或项目愿景。请结合姓氏、组合语境与家庭偏好另行核对；逐字说明不能代替整名结论。</p></section>
  <details className="sce-technical"><summary>查看记录版本与显示范围</summary><dl><div><dt>快照版本</dt><dd>{snapshot.schema}</dd></div><div><dt>发布来源</dt><dd>{snapshot.sourceId}</dd></div><div><dt>发布版本</dt><dd>{snapshot.publicationVersion}</dd></div><div><dt>约束引擎标识</dt><dd>{snapshot.constraintEngineId}</dd></div><div><dt>约束上下文标识</dt><dd>{snapshot.constraintContextSHA256}</dd></div><div><dt>说明引入的评分变化</dt><dd>0</dd></div></dl><p>以上标识只供核对显示材料；本面板没有重算摘要或授予来源、生成、保存权限。</p><p>生成时的组合说明仅作记录，不作为整名原典或家庭愿景：</p><p>{snapshot.generatedMeaning}</p></details>
 </section>;
}
