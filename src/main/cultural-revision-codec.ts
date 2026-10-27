import {deflateRawSync} from 'node:zlib';
import {culturalCanonicalDigest,ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import {CULTURAL_CANONICAL_ALGORITHM,QIMEN_CULTURAL_PUBLICATION,QIMEN_CULTURAL_VERSION,type CulturalComparisonSnapshot} from '../shared/qimen-cultural-comparison';
import {CULTURAL_COMPARISON_LIMITATIONS,CULTURAL_OUTER_PALACES} from '../shared/qimen-cultural-comparison-rules';
import {CULTURAL_REVISION_SCHEMA,type CulturalRevisionResult} from '../shared/cultural-storage-v3';
import {decodeSnapshotBlobText,SNAPSHOT_CODEC,SNAPSHOT_LEAF_MAX_BYTES,snapshotSha,type SnapshotBlob} from './snapshot-blob-codec';
import {parseSnapshotJsonStrict} from './snapshot-json-spans';
import {readCulturalEvidenceCapsule} from './cultural-source-chunks';
import type {CulturalEvidenceCapsule} from '../shared/cultural-source-chunks';

const invalid=():never=>{throw new Error('文化修订叶子的类型、关联或内部摘要无效。');};
function check(value:unknown):asserts value {if(!value)invalid();}
const string=(value:unknown,empty=false):value is string=>typeof value==='string'&&(empty||value.length>0)&&value.length<=8192;
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const integer=(value:unknown,min=0):value is number=>Number.isSafeInteger(value)&&Number(value)>=min;
const nullableString=(value:unknown)=>value===null||string(value,true);
function record(value:unknown,keys:string):Record<string,unknown>{
  check(value&&typeof value==='object'&&!Array.isArray(value));
  check(Object.keys(value).sort().join(',')===keys.split(',').sort().join(','));return value as Record<string,unknown>;
}
function rows(value:unknown,max=256):unknown[]{check(Array.isArray(value)&&value.length<=max);return value;}
function strings(value:unknown,max=256):string[]{const result=rows(value,max);check(result.every(v=>string(v,true)));return result as string[];}
const one=(value:unknown,values:readonly unknown[])=>values.includes(value);
function palaces(value:unknown):unknown[]{const result=rows(value,8);check(result.every(v=>one(v,CULTURAL_OUTER_PALACES))&&new Set(result).size===result.length);check(result.every((v,i)=>i===0||Number(result[i-1])<Number(v)));return result;}
function refs(value:unknown):void{
  for(const item of rows(value)){
    const r=record(item,'id,version,sha256,locator,authority,license,note');
    check([r.id,r.version,r.locator,r.license].every(v=>string(v))&&string(r.note,true)&&hash(r.sha256));
    check(one(r.authority,['dictionary-fact','project-editorial-label','project-object-convention','palace-table','saved-chart-rule']));
  }
}
function policy(value:unknown):void{
  const p=record(value,'id,version,manifestDigest,dependencies');check(string(p.id)&&string(p.version)&&hash(p.manifestDigest));
  const dependencies=rows(p.dependencies);check(dependencies.length>0);
  const ids=new Set<unknown>();for(const item of dependencies){const d=record(item,'sourceId,version,sha256');check(string(d.sourceId)&&string(d.version)&&hash(d.sha256)&&!ids.has(d.sourceId));ids.add(d.sourceId);}
}
function observation(value:unknown):void{
  const o=record(value,'palace,ruleId,ruleVersion,scope,label,subjects,evidence,sourceReferences,nameEffect');
  check(one(o.palace,CULTURAL_OUTER_PALACES)&&string(o.ruleId)&&string(o.ruleVersion)&&string(o.label)&&o.scope==='palace-position'&&o.nameEffect==='not-evaluated');strings(o.subjects);strings(o.evidence);refs(o.sourceReferences);
}
function palaceViews(value:unknown):void{
  const seen=new Set<unknown>();for(const item of rows(value,8)){
    const p=record(item,'palace,trigram,direction,star,door,god,principalAndHostedStems,observations');
    check(one(p.palace,CULTURAL_OUTER_PALACES)&&!seen.has(p.palace)&&[p.trigram,p.direction,p.star,p.door,p.god].every(v=>string(v,true)));seen.add(p.palace);
    check(strings(p.principalAndHostedStems,1).length===1);for(const o of rows(p.observations))observation(o);
  }
}
/** Structural and internal-digest decoding. This function does not admit any
 * provider material, labels or source. Store must perform fixed source replay. */
export function readCulturalSnapshot(value:unknown):CulturalComparisonSnapshot {
  const v=ownCulturalJson<CulturalComparisonSnapshot>(value);
  const s=record(v,'schema,rulePublicationId,labelPolicy,anchor,candidateOrder,candidates,status,summary,chartWideObservations,observationCoverage,ruleBasisDifferences,traditional,score,ranking,scoreMutation,filtering,nameEffect,fourHarmRemoval,sourceReferences,limitations,requestDigest,snapshotDigest,evidenceCapsuleDigest,digestAlgorithm');
  check(s.schema===QIMEN_CULTURAL_VERSION&&s.rulePublicationId===QIMEN_CULTURAL_PUBLICATION&&s.digestAlgorithm===CULTURAL_CANONICAL_ALGORITHM);policy(s.labelPolicy);
  const a=record(s.anchor,'anchorId,ownerProfileId,sourceSessionId,sourceRevision,identity,available,unavailableReasons,birthLabel,timeBasisLabel,sourceReferences');
  check([a.anchorId,a.ownerProfileId,a.sourceRevision,a.birthLabel,a.timeBasisLabel].every(v=>string(v))&&nullableString(a.sourceSessionId)&&typeof a.available==='boolean');strings(a.unavailableReasons);refs(a.sourceReferences);
  const identity=record(a.identity,'qimenVersion,digest,digestAlgorithm,sourceDigest,birthInputDigest,timeBasisDigest');
  check(string(identity.qimenVersion)&&one(identity.digestAlgorithm,['legacy-json-stringify-sha256/1',CULTURAL_CANONICAL_ALGORITHM])&&[identity.digest,identity.sourceDigest,identity.birthInputDigest,identity.timeBasisDigest].every(hash));
  const order=strings(s.candidateOrder,4),candidates=rows(s.candidates,4);check(order.length>0&&new Set(order).size===order.length&&candidates.length===order.length);
  for(let index=0;index<candidates.length;index++){
    const c=record(candidates[index],'candidateRef,fullName,givenName,inputIndex,rows,knownPalaces,complete,palaceViews');
    check(c.candidateRef===order[index]&&string(c.fullName)&&string(c.givenName)&&c.inputIndex===index&&typeof c.complete==='boolean');palaces(c.knownPalaces);palaceViews(c.palaceViews);
    const chars=rows(c.rows,2);check(chars.length>0&&/^\p{Script=Han}{1,2}$/u.test(c.givenName as string)&&chars.length===Array.from(c.givenName as string).length);
    for(let position=0;position<chars.length;position++){
      const r=record(chars[position],'position,char,pinyin,status,sourceState,dictionarySense,projectIntent,elements,staticPalaces,reasonCodes,sourceReferences,adoptionReceiptDigest');
      check(r.position===position&&r.char===Array.from(c.givenName as string)[position]&&nullableString(r.pinyin)&&nullableString(r.dictionarySense)&&nullableString(r.projectIntent));
      check(one(r.status,['mapped','unknown-label','unmapped','pending-admission','reading-selection-required','source-conflict'])&&one(r.sourceState,['ready','unknown','no-mapping','pending','source-error','disputed']));
      const elements=rows(r.elements,5);check(elements.every(v=>one(v,['木','火','土','金','水']))&&new Set(elements).size===elements.length);palaces(r.staticPalaces);strings(r.reasonCodes);refs(r.sourceReferences);check(r.adoptionReceiptDigest===null||hash(r.adoptionReceiptDigest));
    }
  }
  check(one(s.status,['ready','partial-known-only','unknown-chart','insufficient-candidates','no-mapped-labels']));
  const summary=record(s.summary,'state,sharedKnownPalaces,completeSharedPalaces,perCandidate,interpretation');
  check(one(summary.state,['complete','known-subsets-only','not-evaluated'])&&summary.interpretation==='positions-only-no-preference');palaces(summary.sharedKnownPalaces);if(summary.completeSharedPalaces!==null)palaces(summary.completeSharedPalaces);
  const perCandidate=rows(summary.perCandidate,4);check(perCandidate.length===order.length);
  for(let index=0;index<perCandidate.length;index++){const p=record(perCandidate[index],'candidateRef,knownPalaces,remainingFromCommon,exclusiveToCandidate');check(p.candidateRef===order[index]);palaces(p.knownPalaces);if(p.remainingFromCommon!==null)palaces(p.remainingFromCommon);if(p.exclusiveToCandidate!==null)palaces(p.exclusiveToCandidate);}
  for(const item of rows(s.chartWideObservations)){
    const o=record(item,'ruleId,ruleVersion,kind,layer,label,subjects,evidence,sourceReferences,scope,assignedToName');
    check([o.ruleId,o.ruleVersion,o.kind,o.label].every(v=>string(v))&&one(o.layer,['stars','doors','other'])&&o.scope==='whole-chart'&&o.assignedToName===false);strings(o.subjects);strings(o.evidence);refs(o.sourceReferences);
  }
  const modules=new Set<unknown>();for(const item of rows(s.observationCoverage,3)){const o=record(item,'module,status,version,reason');check(one(o.module,['auxiliary','patterns','stem-tombs'])&&!modules.has(o.module)&&one(o.status,['recorded','not-recorded','not-assessed'])&&nullableString(o.version)&&nullableString(o.reason));modules.add(o.module);}
  check(modules.size===3);
  for(const item of rows(s.ruleBasisDifferences)){const d=record(item,'kind,ruleRefs,note,mergedVerdict');check(d.kind==='different-rule-bases'&&string(d.note,true)&&d.mergedVerdict===null);refs(d.ruleRefs);}
  const traditional=record(s.traditional,'status,verdict,namePalaceMethod');check(traditional.status==='not-admitted'&&traditional.verdict==='not-evaluated'&&traditional.namePalaceMethod==='not-established');
  check(s.score===null&&s.ranking==='input-order'&&s.scoreMutation===false&&s.filtering===false&&s.nameEffect==='not-evaluated'&&s.fourHarmRemoval==='not-performed');refs(s.sourceReferences);
  check(JSON.stringify(strings(s.limitations))===JSON.stringify(CULTURAL_COMPARISON_LIMITATIONS)&&[s.requestDigest,s.snapshotDigest,s.evidenceCapsuleDigest].every(hash));
  const projection={...v};delete (projection as Partial<CulturalComparisonSnapshot>).snapshotDigest;
  check(culturalCanonicalDigest(projection)===v.snapshotDigest);return v;
}
export function readCulturalRevisionResult(value:unknown):CulturalRevisionResult {
  const v=ownCulturalJson<CulturalRevisionResult>(value),r=record(v,'schema,comparisonId,revision,profileId,sourceSessionId,capsuleDigest,snapshot,note,noteAuthority,createdAt,operation,restoredFromRevision');
  check(r.schema===CULTURAL_REVISION_SCHEMA&&typeof r.comparisonId==='string'&&/^qc_[a-f0-9]{64}$/.test(r.comparisonId)&&integer(r.revision,1)&&string(r.profileId)&&nullableString(r.sourceSessionId)&&hash(r.capsuleDigest)&&typeof r.note==='string'&&r.noteAuthority==='human-note-only'&&typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt)));
  check(one(r.operation,['create','revise','restore-revision']));
  if(r.revision===1)check(r.operation==='create'&&r.restoredFromRevision===null);else check(r.operation!=='create');
  if(r.operation==='restore-revision')check(integer(r.restoredFromRevision,1)&&Number(r.restoredFromRevision)<Number(r.revision));else check(r.restoredFromRevision===null);
  const snapshot=readCulturalSnapshot(r.snapshot);check(snapshot.anchor.ownerProfileId===r.profileId&&snapshot.anchor.sourceSessionId===r.sourceSessionId);
  // Storage capsule C and provider material D are distinct. Their bindings
  // are checked against the decoded capsule in the complete SQL verifier.
  return v;
}
export function encodeCulturalRevisionLeaf(value:unknown):SnapshotBlob {
  const result=readCulturalRevisionResult(value),bytes=Buffer.from(JSON.stringify(result),'utf8');check(bytes.length>0&&bytes.length<=SNAPSHOT_LEAF_MAX_BYTES);
  return{sha:snapshotSha(bytes),rawBytes:bytes.length,codec:SNAPSHOT_CODEC,payload:deflateRawSync(bytes,{level:6})};
}
export function decodeCulturalRevisionLeaf(blob:SnapshotBlob):CulturalRevisionResult {
  return readCulturalRevisionResult(parseSnapshotJsonStrict(decodeSnapshotBlobText(blob),SNAPSHOT_LEAF_MAX_BYTES));
}
/** Relationship checks after native SQL reconstruction. This still requires
 * the fixed offline source authenticator; no caller-supplied verdict is used. */
export function assertCulturalRevisionEvidenceBindings(result:CulturalRevisionResult,value:CulturalEvidenceCapsule):void {
  const capsule=readCulturalEvidenceCapsule(value),r=readCulturalRevisionResult(result),material=capsule.materialDescriptor;
  check(r.capsuleDigest===capsule.capsuleDigest&&r.snapshot.evidenceCapsuleDigest===capsule.materialDigest);
  check(r.profileId===material.ownerProfileId&&r.sourceSessionId===material.sourceSessionId&&r.snapshot.anchor.sourceRevision===material.sourceRevision);
}
