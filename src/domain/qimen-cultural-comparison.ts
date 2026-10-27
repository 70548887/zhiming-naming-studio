import {types} from 'node:util';
import {CULTURAL_CANONICAL_ALGORITHM,QIMEN_CULTURAL_PUBLICATION,QIMEN_CULTURAL_VERSION} from '../shared/qimen-cultural-comparison';
import {CULTURAL_COMPARISON_LIMITATIONS,CULTURAL_ELEMENT_PALACES,CULTURAL_OUTER_PALACES} from '../shared/qimen-cultural-comparison-rules';
import {culturalCanonicalDigest,culturalCanonicalJson,culturalChartDigest,ownCulturalJson} from './qimen-cultural-comparison-canonical';
import type {CulturalAnchorBinding,CulturalBirthAnchorView,CulturalCharacterComparisonRow,CulturalComparisonFailure,CulturalComparisonReply,CulturalComparisonSnapshot,CulturalEvidenceRef,CulturalLabelPolicyIdentity,CulturalPalaceView,CulturalRowStatus,CulturalSourceState,OuterPalace,PreparedCulturalCandidate,PreparedCulturalCharacter,PreparedCulturalComparisonInput} from '../shared/qimen-cultural-comparison';
import type {Element} from '../shared/types';

class ComparisonFailure extends Error{constructor(readonly reason:CulturalComparisonFailure,message:string){super(message);}}
const fail=(reason:CulturalComparisonFailure,message:string):never=>{throw new ComparisonFailure(reason,message);};
const invalid=():never=>fail('invalid-input','比较输入结构不完整或超出支持范围。');
const integrity=():never=>fail('rejected-integrity','出生盘、归属、标签策略或版本绑定不一致，未执行比较。');
const string=(v:unknown,empty=false):v is string=>typeof v==='string'&&(empty||v.length>0)&&v.length<=8192;
const nullable=(v:unknown)=>v===null||string(v,true);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const array=(v:unknown,max=256):v is unknown[]=>Array.isArray(v)&&v.length<=max;
const strings=(v:unknown,max=256):v is string[]=>array(v,max)&&v.every(x=>string(x));
const same=(a:unknown,b:unknown)=>culturalCanonicalJson(a)===culturalCanonicalJson(b);
const exact=(v:object,keys:readonly string[])=>same(Object.keys(v).sort(),[...keys].sort());
const palace=(v:unknown):v is OuterPalace=>(CULTURAL_OUTER_PALACES as readonly unknown[]).includes(v);
const element=(v:unknown):v is Element=>typeof v==='string'&&Object.hasOwn(CULTURAL_ELEMENT_PALACES,v);
const ordered=(v:readonly OuterPalace[]):OuterPalace[]=>CULTURAL_OUTER_PALACES.filter(p=>v.includes(p));
const union=(rows:readonly (readonly OuterPalace[])[]):OuterPalace[]=>ordered(rows.flat());
const refs=(value:unknown):value is CulturalEvidenceRef[]=>array(value)&&value.every(v=>{
 if(!v||typeof v!=='object')return false;
 const r=v as CulturalEvidenceRef;
 return exact(r,['id','version','sha256','locator','authority','license','note'])&&[r.id,r.version,r.locator,r.license].every(x=>string(x))&&string(r.note,true)&&hash(r.sha256)&&['dictionary-fact','project-editorial-label','project-object-convention','palace-table','saved-chart-rule'].includes(r.authority);
});
function policy(value:CulturalLabelPolicyIdentity):void{
 if(!value||typeof value!=='object'||!exact(value,['id','version','manifestDigest','dependencies'])||!string(value.id)||!string(value.version)||!hash(value.manifestDigest)||!array(value.dependencies)||value.dependencies.length===0)invalid();
 const ids=new Set<string>();
 for(const d of value.dependencies){if(!d||typeof d!=='object'||!exact(d,['sourceId','version','sha256'])||!string(d.sourceId)||!string(d.version)||!hash(d.sha256)||ids.has(d.sourceId))invalid();ids.add(d.sourceId);}
}
function binding(anchor:CulturalBirthAnchorView):CulturalAnchorBinding{return{anchorId:anchor.anchorId,ownerProfileId:anchor.ownerProfileId,sourceSessionId:anchor.sourceSessionId,sourceRevision:anchor.sourceRevision,identity:anchor.identity};}
function validateAnchor(input:PreparedCulturalComparisonInput):void{
 const a=input.anchor,id=a?.identity,q=input.qimen;
 if(!a||typeof a!=='object'||!exact(a,['anchorId','ownerProfileId','sourceSessionId','sourceRevision','identity','available','unavailableReasons','birthLabel','timeBasisLabel','sourceReferences'])||![a.anchorId,a.ownerProfileId,a.sourceRevision,a.birthLabel,a.timeBasisLabel].every(x=>string(x))||!nullable(a.sourceSessionId)||typeof a.available!=='boolean'||!strings(a.unavailableReasons)||!refs(a.sourceReferences))invalid();
 if(!id||typeof id!=='object'||!exact(id,['qimenVersion','digest','digestAlgorithm','sourceDigest','birthInputDigest','timeBasisDigest'])||!string(id.qimenVersion)||![id.digest,id.sourceDigest,id.birthInputDigest,id.timeBasisDigest].every(hash))invalid();
 if(!['legacy-json-stringify-sha256/1','cultural-canonical-json/1'].includes(id.digestAlgorithm))fail('unsupported-version','出生盘摘要算法尚不支持，未转换旧摘要。');
 if(!q||typeof q!=='object'||typeof q.available!=='boolean'||!string(q.version)||!array(q.palaces,9))invalid();
 if(a.available!==q.available||id.qimenVersion!==q.version||culturalChartDigest(q,id.digestAlgorithm).digest!==id.digest)integrity();
 if(q.available){
  if(q.palaces.length!==9||new Set(q.palaces.map(p=>p.number)).size!==9||q.palaces.some(p=>!Number.isInteger(p.number)||p.number<1||p.number>9)||a.unavailableReasons.length)integrity();
 }else if(q.palaces.length||a.unavailableReasons.length===0)integrity();
}
function validateViews(input:PreparedCulturalComparisonInput):void{
 if(!array(input.palaceViews,8)||!array(input.chartWideObservations)||!array(input.ruleBasisDifferences)||!array(input.observationCoverage,3)||!refs(input.sourceReferences))invalid();
 const seen=new Set<number>();
 for(const p of input.palaceViews){
  if(!p||!exact(p,['palace','trigram','direction','star','door','god','principalAndHostedStems','observations'])||!palace(p.palace)||seen.has(p.palace)||![p.trigram,p.direction,p.star,p.door,p.god].every(x=>string(x,true))||!strings(p.principalAndHostedStems)||!array(p.observations))invalid();
  seen.add(p.palace);
  const raw=input.qimen.palaces.find(r=>r.number===p.palace);
  if(!raw||raw.trigram!==p.trigram||raw.direction!==p.direction||raw.star!==p.star||raw.door!==p.door||raw.god!==p.god||!string(raw.heaven)||!same(p.principalAndHostedStems,[raw.heaven]))integrity();
  for(const o of p.observations)if(!o||!exact(o,['palace','ruleId','ruleVersion','scope','label','subjects','evidence','sourceReferences','nameEffect'])||o.palace!==p.palace||o.scope!=='palace-position'||o.nameEffect!=='not-evaluated'||![o.ruleId,o.ruleVersion,o.label].every(x=>string(x))||!strings(o.subjects)||!strings(o.evidence)||!refs(o.sourceReferences)||!o.sourceReferences.length)invalid();
 }
 if(input.anchor.available?(seen.size!==8):(seen.size!==0||input.chartWideObservations.length!==0))integrity();
 for(const o of input.chartWideObservations)if(!o||!exact(o,['ruleId','ruleVersion','kind','layer','label','subjects','evidence','sourceReferences','scope','assignedToName'])||o.scope!=='whole-chart'||o.assignedToName!==false||!['stars','doors','other'].includes(o.layer)||![o.ruleId,o.ruleVersion,o.kind,o.label].every(x=>string(x))||!strings(o.subjects)||!strings(o.evidence)||!refs(o.sourceReferences)||!o.sourceReferences.length)invalid();
 const modules=new Set<string>();
 for(const c of input.observationCoverage){
  if(!c||!exact(c,['module','status','version','reason'])||!['auxiliary','patterns','stem-tombs'].includes(c.module)||modules.has(c.module)||!['recorded','not-recorded','not-assessed'].includes(c.status)||!nullable(c.reason)||(c.status==='recorded'?!string(c.version):c.version!==null))invalid();
  if(input.anchor.available){
   const recorded=c.module==='auxiliary'?input.qimen.auxiliary:c.module==='patterns'?input.qimen.patterns:input.qimen.stemTombs;
   if(recorded?(c.status!=='recorded'||c.version!==recorded.version):c.status!=='not-recorded')integrity();
  }else if(c.status!=='not-assessed')integrity();
  modules.add(c.module);
 }
 if(modules.size!==3)invalid();
 for(const d of input.ruleBasisDifferences)if(!d||!exact(d,['kind','ruleRefs','note','mergedVerdict'])||d.kind!=='different-rule-bases'||d.mergedVerdict!==null||!refs(d.ruleRefs)||d.ruleRefs.length<2||!string(d.note))invalid();
}
const sourceStatus:Readonly<Record<Exclude<CulturalSourceState,'ready'|'source-error'>,CulturalRowStatus>>=Object.freeze({unknown:'unknown-label','no-mapping':'unmapped',pending:'pending-admission',disputed:'source-conflict'});
function projectRow(row:PreparedCulturalCharacter,index:number,char:string,input:PreparedCulturalComparisonInput):CulturalCharacterComparisonRow{
 if(!row||!exact(row,['position','char','pinyin','readingState','sourceState','labelPolicyId','reviewedEvidenceId','dictionarySense','projectIntent','elements','reasonCodes','sourceReferences','adoptionReceiptDigest'])||row.position!==index||row.char!==char||!nullable(row.pinyin)||!['selected','required'].includes(row.readingState)||!['ready','unknown','no-mapping','pending','source-error','disputed'].includes(row.sourceState)||row.labelPolicyId!==input.labelPolicy.id||!nullable(row.reviewedEvidenceId)||!nullable(row.dictionarySense)||!nullable(row.projectIntent)||!array(row.elements,5)||!row.elements.every(element)||new Set(row.elements).size!==row.elements.length||!strings(row.reasonCodes)||!refs(row.sourceReferences)||(row.adoptionReceiptDigest!==null&&!hash(row.adoptionReceiptDigest)))invalid();
 if(row.sourceState==='source-error')return fail('source-unavailable','字位依赖来源不可用，未把来源错误降格为正常未知。');
 let status:CulturalRowStatus;
 if(row.readingState==='required'){
  if(row.pinyin!==null||row.elements.length)invalid();status='reading-selection-required';
 }else if(row.sourceState==='ready'){
  if(!string(row.pinyin)||!string(row.reviewedEvidenceId)||row.elements.length===0||row.sourceReferences.length===0)invalid();
  const labels=row.sourceReferences.filter(r=>r.authority==='project-editorial-label'||r.authority==='project-object-convention');
  if(labels.length===0||labels.some(r=>!input.labelPolicy.dependencies.some(d=>d.sourceId===r.id&&d.version===r.version&&d.sha256===r.sha256)))integrity();
  status='mapped';
 }else{
  if(row.elements.length||!row.reasonCodes.length)invalid();status=sourceStatus[row.sourceState];
 }
 const mapped=status==='mapped';
 return{position:index,char:row.char,pinyin:row.pinyin,status,sourceState:row.sourceState,dictionarySense:row.dictionarySense,projectIntent:row.projectIntent,elements:mapped?[...row.elements]:[],staticPalaces:mapped?union(row.elements.map(e=>CULTURAL_ELEMENT_PALACES[e])):[],reasonCodes:[...row.reasonCodes],sourceReferences:[...row.sourceReferences],adoptionReceiptDigest:row.adoptionReceiptDigest};
}
/** Pure deterministic comparison of already main-authenticated immutable data.
 * Structural checks and digest binding detect inconsistent inputs; neither an
 * input DTO nor this output grants source/label/admission or save authority.
 */
export function compareQimenCultural(input:PreparedCulturalComparisonInput):CulturalComparisonReply{
 try{
  // Disabled mode never walks the chart, candidates, evidence or getter fields.
  if(!input||typeof input!=='object'||types.isProxy(input))invalid();
  const enabled=Object.getOwnPropertyDescriptor(input,'enabled');
  if(!enabled||!Object.hasOwn(enabled,'value')||!enabled.enumerable||typeof enabled.value!=='boolean')return invalid();
  if(!enabled.value)return Object.freeze({kind:'disabled'});
  const own=ownCulturalJson<PreparedCulturalComparisonInput>(input);
  if(!exact(own,['schema','enabled','requestId','surname','anchor','qimen','labelPolicy','candidates','palaceViews','chartWideObservations','observationCoverage','ruleBasisDifferences','sourceReferences','evidenceCapsuleDigest']))invalid();
  if(own.schema!==QIMEN_CULTURAL_VERSION)fail('unsupported-version','文化比较版本尚不支持。');
  if(!string(own.requestId)||!/^\p{Script=Han}{1,4}$/u.test(own.surname)||!hash(own.evidenceCapsuleDigest)||!array(own.candidates,4)||own.candidates.length<1)invalid();
  policy(own.labelPolicy);validateAnchor(own);validateViews(own);
  const seenRefs=new Set<string>(),duplicateNames=new Set<string>();
  const candidates=own.candidates.map((candidate:PreparedCulturalCandidate,inputIndex)=>{
   if(!candidate||!exact(candidate,['candidateRef','kind','fullName','givenName','anchorBinding','labelPolicy','rows'])||!string(candidate.candidateRef)||seenRefs.has(candidate.candidateRef)||!['saved','draft'].includes(candidate.kind)||typeof candidate.givenName!=='string'||!/^\p{Script=Han}{1,2}$/u.test(candidate.givenName)||candidate.fullName!==own.surname+candidate.givenName||!array(candidate.rows,2)||candidate.rows.length!==[...candidate.givenName].length)invalid();
   seenRefs.add(candidate.candidateRef);
   if(!same(candidate.anchorBinding,binding(own.anchor))||!same(candidate.labelPolicy,own.labelPolicy)||candidate.kind==='saved'&&own.anchor.sourceSessionId===null)integrity();
   const rows=[...candidate.givenName].map((char,index)=>projectRow(candidate.rows[index],index,char,own));
   const duplicate=culturalCanonicalJson({name:candidate.fullName,readings:rows.map(row=>row.pinyin)});
   if(duplicateNames.has(duplicate))invalid();duplicateNames.add(duplicate);
   const knownPalaces=union(rows.map(row=>row.staticPalaces));
   return{candidateRef:candidate.candidateRef,fullName:candidate.fullName,givenName:candidate.givenName,inputIndex,rows,knownPalaces,complete:rows.every(row=>row.status==='mapped'),palaceViews:own.anchor.available?knownPalaces.map(p=>own.palaceViews.find(v=>v.palace===p)!):[]};
  });
  const available=own.anchor.available,multiple=candidates.length>1,anyMapped=candidates.some(c=>c.knownPalaces.length>0),allComplete=candidates.every(c=>c.complete);
  const joint=available&&multiple&&anyMapped;
  const shared=joint?CULTURAL_OUTER_PALACES.filter(p=>candidates.every(c=>c.knownPalaces.includes(p))):[];
  const complete=joint&&allComplete;
  const status:CulturalComparisonSnapshot['status']=!available?'unknown-chart':!multiple?'insufficient-candidates':!anyMapped?'no-mapped-labels':!allComplete?'partial-known-only':'ready';
  const perCandidate=candidates.map((candidate,index)=>({candidateRef:candidate.candidateRef,knownPalaces:candidate.knownPalaces,remainingFromCommon:complete?candidate.knownPalaces.filter(p=>!shared.includes(p)):null,exclusiveToCandidate:complete?candidate.knownPalaces.filter(p=>!candidates.some((other,j)=>j!==index&&other.knownPalaces.includes(p))):null}));
  const evidence=[...own.sourceReferences,...own.anchor.sourceReferences,...candidates.flatMap(c=>c.rows.flatMap(r=>r.sourceReferences)),...own.palaceViews.flatMap(p=>p.observations.flatMap(o=>o.sourceReferences)),...own.chartWideObservations.flatMap(o=>o.sourceReferences),...own.ruleBasisDifferences.flatMap(d=>d.ruleRefs)];
  const sourceReferences=[...new Map(evidence.map(r=>[culturalCanonicalJson(r),r])).values()];
  const body:Omit<CulturalComparisonSnapshot,'snapshotDigest'>={schema:QIMEN_CULTURAL_VERSION,rulePublicationId:QIMEN_CULTURAL_PUBLICATION,labelPolicy:own.labelPolicy,anchor:own.anchor,candidateOrder:candidates.map(c=>c.candidateRef),candidates,status,summary:{state:complete?'complete':joint?'known-subsets-only':'not-evaluated',sharedKnownPalaces:shared,completeSharedPalaces:complete?shared:null,perCandidate,interpretation:'positions-only-no-preference'},chartWideObservations:own.chartWideObservations,observationCoverage:own.observationCoverage,ruleBasisDifferences:own.ruleBasisDifferences,traditional:{status:'not-admitted',verdict:'not-evaluated',namePalaceMethod:'not-established'},score:null,ranking:'input-order',scoreMutation:false,filtering:false,nameEffect:'not-evaluated',fourHarmRemoval:'not-performed',sourceReferences,limitations:[...CULTURAL_COMPARISON_LIMITATIONS],requestDigest:culturalCanonicalDigest(own),evidenceCapsuleDigest:own.evidenceCapsuleDigest,digestAlgorithm:CULTURAL_CANONICAL_ALGORITHM};
  const snapshot={...body,snapshotDigest:culturalCanonicalDigest(body)};
  return ownCulturalJson<CulturalComparisonReply>({kind:'result',snapshot});
 }catch(error){
  if(error instanceof ComparisonFailure)return Object.freeze({kind:'unavailable',reason:error.reason,message:error.message});
  return Object.freeze({kind:'unavailable',reason:'invalid-input',message:'比较输入未通过有界普通数据校验，未执行比较。'});
 }
}
