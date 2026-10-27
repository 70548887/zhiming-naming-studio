import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal,types} from 'node:util';
import {NAMING_RULE_V71_VERSION,NAMING_RULE_V71_SOURCE_ID} from '../shared/naming-rules';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_SESSION_PREFIX,REVIEWED_DATA_CANDIDATE_PREFIX,REVIEWED_DATA_SOURCE_IDS} from '../shared/reviewed-naming-data';
import {ownReviewedDataJson,reviewedDataNeed as need,reviewedDataDigest as digest,normalizeReviewedDataSelection,createReviewedNamingRecomputation,reviewedCandidateFacts,REVIEWED_DATA_MANUAL_WARNING} from './reviewed-naming-data-generation';
import {semanticAdmissionDatasetV72} from './naming-semantic-admission-v72-data';
import {loadNamingEditorialV71Data} from './naming-editorial-v7-data';
import {normalizeReviewedNumerologySnapshotForAttach} from './reviewed-naming-data-snapshot';
import type {ReviewedNamingDataResources} from './reviewed-naming-data-resources';
import type {FactArchive,FactDataset} from './candidate-facts';
import type {NameCandidate,NamingSession,SourceRecord} from '../shared/types';
import type {ReviewedDataSelection,ReviewedNamingSession,ReviewedDataSessionBinding,ReviewedDataCandidateUse,ReviewedDataSessionAddon,ReviewedNamingGenerationRequest} from '../shared/reviewed-naming-data';
import type {ReviewedNamingCandidateComputation} from './reviewed-naming-data-generation';

const candidateKeys=['id','givenName','fullName','pinyin','style','characters','meaning','reason','citations','evaluation','warnings','traditionalReason','favorite','origin','reviewNote','originalMeaning','namingMeaningReview','reviewedDataUse','parentNamePhoneticReview','wordPronunciationReference','meaningContextReview','modernPracticalEvidence','numerology','yueReading','namePhoneticReviews','yueHomophones'];
const manualElements=['木','火','土','金','水'];
type Runtime=ReturnType<typeof createReviewedNamingRecomputation>;
function footprintField(value:unknown,key:string):PropertyDescriptor|undefined {
 if(value===null||typeof value!=='object')return undefined;
 need(!types.isProxy(value),'footprint Proxy');
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 need(!descriptor||Object.hasOwn(descriptor,'value'),'footprint own data field: '+key);
 return descriptor;
}
function footprintArray(value:unknown,inspect:(row:unknown)=>boolean):boolean {
 if(value===null||typeof value!=='object')return false;
 need(!types.isProxy(value),'footprint array Proxy');if(!Array.isArray(value))return false;
 const descriptor=footprintField(value,'length');need(descriptor&&Number.isSafeInteger(descriptor.value)&&descriptor.value>=0&&descriptor.value<=100000,'footprint array budget');
 for(let index=0;index<descriptor.value;index++){const item=footprintField(value,String(index));if(item&&inspect(item.value))return true;}
 return false;
}
function footprintOwned(value:unknown):boolean {
 const addon=footprintField(value,'reviewedData');if(addon)return true;
 const id=footprintField(value,'id')?.value;if(typeof id==='string'&&id.startsWith(REVIEWED_DATA_SESSION_PREFIX))return true;
 if(footprintArray(footprintField(value,'candidates')?.value,candidate=>{
  if(footprintField(candidate,'reviewedDataUse'))return true;
  const candidateId=footprintField(candidate,'id')?.value;return typeof candidateId==='string'&&candidateId.startsWith(REVIEWED_DATA_CANDIDATE_PREFIX);
 }))return true;
 const snapshot=footprintField(value,'sourceSnapshot')?.value;
 return footprintArray(footprintField(snapshot,'sources')?.value,source=>{
  const sourceId=footprintField(source,'id')?.value;return typeof sourceId==='string'&&(REVIEWED_DATA_SOURCE_IDS as readonly string[]).includes(sourceId);
 });
}
/** Any fragment requires complete new-method verification. An absent addon is
 * never enough to turn a new candidate or dedicated source into old history. */
export function hasReviewedDataFootprint(value:unknown):boolean {return footprintOwned(value);}
/** Run before any existing spread, budget serialization or feature guard.
 * Legacy inputs keep their previous acceptance surface and are not cloned. */
export function assertReviewedDataInput(value:unknown):boolean {
 const present=footprintOwned(value);if(present)ownReviewedDataJson(value);return present;
}

function generationRequest(session:NamingSession,selection:ReviewedDataSelection):ReviewedNamingGenerationRequest {
 need(session.profile&&session.profile.namingPreferences,'frozen generation preferences');
 return {profile:session.profile,preferences:session.profile.namingPreferences,analysis:session.analysis,selection};
}
function assertPreferences(session:NamingSession){
 const frozen=session.profile.namingPreferences,current=session.preferences;need(frozen&&current,'saved/frozen preferences');
 need(Array.isArray(current.preferredElements)&&current.preferredElements.every(element=>manualElements.includes(element)),'manual preferredElements');
 need(equal({...current,preferredElements:[]},{...frozen,preferredElements:[]}),'only preferredElements may be reviewed');
}
function assertSources(session:NamingSession,runtime:Runtime){
 const snapshot=session.sourceSnapshot;need(snapshot&&snapshot.version==='session-sources/1.0.0'&&snapshot.dataVersion===session.dataVersion&&Array.isArray(snapshot.sources),'complete generation source snapshot');
 need(new Set(snapshot.sources.map(source=>source.id)).size===snapshot.sources.length,'unique source identities');
 const baseline=semanticAdmissionDatasetV72(runtime.resources.semantic) as unknown as {sources:readonly SourceRecord[]};
 need(Array.isArray(baseline.sources),'authenticated baseline source records');
 const required=[...baseline.sources,...loadNamingEditorialV71Data(runtime.resources.dataDir).sources,...runtime.resources.sourceRecords];
 for(const source of required){const actual=snapshot.sources.find(row=>row.id===source.id);need(actual&&equal(actual,source),'fixed source record mismatch: '+source.id);}
 const fixedIds=runtime.resources.sourceRecords.map(source=>source.id);
 need(REVIEWED_DATA_SOURCE_IDS.every(id=>fixedIds.includes(id)),'fixed dedicated source registry');
}
function assertSession(session:NamingSession,runtime:Runtime){
 need(typeof session.id==='string'&&session.id.startsWith(REVIEWED_DATA_SESSION_PREFIX)&&session.id.length>REVIEWED_DATA_SESSION_PREFIX.length,'session ID prefix');
 need(typeof session.profileId==='string'&&session.profileId===session.profile.id,'profile identity');
 need(typeof session.createdAt==='string'&&Number.isFinite(Date.parse(session.createdAt)),'createdAt');
 need(session.dataVersion===runtime.context.activeVersion,'fixed baseline dataVersion');
 need(equal(session.namingRules,{version:NAMING_RULE_V71_VERSION,sourceId:NAMING_RULE_V71_SOURCE_ID,dataVersion:session.dataVersion}),'actual original7.1 namingRules');
 need(Array.isArray(session.candidates)&&session.candidates.length<=100&&new Set(session.candidates.map(candidate=>candidate.id)).size===session.candidates.length,'candidate identities');
 need(Array.isArray(session.originalFavorable),'original favorable snapshot');
 assertPreferences(session);assertSources(session,runtime);
}
function sessionBinding(session:NamingSession,runtime:Runtime):ReviewedDataSessionBinding {
 return {sessionId:session.id,profileId:session.profileId,createdAt:session.createdAt,dataVersion:session.dataVersion,namingRulesSha256:digest(session.namingRules),profileSha256:digest(session.profile),generationPreferencesSha256:digest(session.profile.namingPreferences),analysisSha256:digest(session.analysis),sourceSnapshotSha256:digest(session.sourceSnapshot),originalFavorableSha256:digest(session.originalFavorable),sourceRecordsSha256:digest(runtime.resources.sourceRecords)};
}
function assertCandidate(candidate:NameCandidate,expected:NameCandidate){
 need(Object.keys(candidate).every(key=>candidateKeys.includes(key)),'unknown/cross-method candidate field');
 need(typeof candidate.favorite==='boolean'&&typeof candidate.reviewNote==='string','candidate review fields');
 need(Array.isArray(candidate.warnings)&&candidate.warnings.every(warning=>typeof warning==='string'),'candidate warnings');
 const manual=candidate.warnings.filter(warning=>warning===REVIEWED_DATA_MANUAL_WARNING);
 need(manual.length<=1&&(!manual.length||candidate.warnings.at(-1)===REVIEWED_DATA_MANUAL_WARNING),'only the existing manual preference reminder is permitted');
 need(equal(reviewedCandidateFacts(candidate),reviewedCandidateFacts(expected)),'canonical candidate text/style/origin/reading/score facts');
}
function candidateProof(session:NamingSession,runtime:Runtime,computed:ReviewedNamingCandidateComputation,index:number,binding:ReviewedDataSessionBinding):ReviewedDataCandidateUse {
 const candidate=computed.candidate;
 const proof:Omit<ReviewedDataCandidateUse,'proofSha256'>={schemaVersion:'reviewed-naming-data-candidate/1',method:REVIEWED_DATA_METHOD,publication:ownReviewedDataJson(runtime.resources.identity),selectionSha256:digest(runtime.request.selection),binding:{...binding,candidateIndex:index,candidateId:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,origin:candidate.origin},semantic:computed.semantic,imagery:computed.imagery,stylePolicy:'canonical-existing-evaluate-style',canonicalCandidateSha256:digest(reviewedCandidateFacts(candidate))};
 void session;return {...proof,proofSha256:digest(proof)};
}
function sessionAddon(runtime:Runtime,binding:ReviewedDataSessionBinding,proofs:ReviewedDataCandidateUse[]):ReviewedDataSessionAddon {
 const addon:Omit<ReviewedDataSessionAddon,'proofSha256'>={schemaVersion:'reviewed-naming-data-session/1',method:REVIEWED_DATA_METHOD,publication:ownReviewedDataJson(runtime.resources.identity),selection:ownReviewedDataJson(runtime.request.selection),binding,candidateBindings:proofs.map(proof=>({candidateIndex:proof.binding.candidateIndex,candidateId:proof.binding.candidateId,givenName:proof.binding.givenName,fullName:proof.binding.fullName,pinyin:proof.binding.pinyin,origin:proof.binding.origin,proofSha256:proof.proofSha256}))};
 return {...addon,proofSha256:digest(addon)};
}

/** This runs after existing numerology/Yue/phonetic decoration. Only locally
 * reconstructed core facts may gain the bound new-method evidence. */
export function attachReviewedNamingData(input:NamingSession,selection:ReviewedDataSelection,resources:ReviewedNamingDataResources):ReviewedNamingSession {
 const session=normalizeReviewedNumerologySnapshotForAttach(input),chosen=normalizeReviewedDataSelection(selection);
 need(!Object.hasOwn(session,'reviewedData')&&session.candidates.every(candidate=>!Object.hasOwn(candidate,'reviewedDataUse')),'already attached reviewed data');
 const runtime=createReviewedNamingRecomputation(resources,generationRequest(session,chosen));assertSession(session,runtime);
 need(equal(session.preferences,session.profile.namingPreferences),'attach at generation-time preferences');
 const binding=sessionBinding(session,runtime),proofs:ReviewedDataCandidateUse[]=[];
 const candidates=session.candidates.map((candidate,index)=>{
  const computed=runtime.recompute(candidate.givenName,candidate.origin,candidate.id,'save');need(computed,'candidate no longer satisfies original constraints');assertCandidate(candidate,computed.candidate);
  const proof=candidateProof(session,runtime,computed,index,binding);proofs.push(proof);return {...candidate,reviewedDataUse:proof};
 });
 return {...session,candidates,reviewedData:sessionAddon(runtime,binding,proofs)};
}

/** FactArchive is an internal binary carrier, so capture its own fields before
 * touching the typed byte buffer, then bind both bytes and parsed baseline. */
function assertArchive(value:FactArchive|undefined,session:NamingSession,runtime:Runtime):void {
 if(value===undefined)return;
 need(value&&typeof value==='object'&&!types.isProxy(value),'archive carrier/Proxy');
 const prototype=Object.getPrototypeOf(value);need(prototype===Object.prototype||prototype===null,'plain archive carrier');
 const descriptors=Object.getOwnPropertyDescriptors(value);need(equal(Reflect.ownKeys(descriptors).sort(),['dataset','pack','sha256','version']),'archive fields');
 for(const field of Object.values(descriptors))need(field.enumerable&&Object.hasOwn(field,'value'),'archive own data');
 const sha256=descriptors.sha256.value,version=descriptors.version.value,dataset=ownReviewedDataJson(descriptors.dataset.value) as FactDataset,pack=descriptors.pack.value;
 need(!types.isProxy(pack)&&pack&&typeof pack==='object'&&Object.getPrototypeOf(pack)===Uint8Array.prototype,'original archive bytes');
 const sizeGetter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'byteLength')!.get!;
 const size=sizeGetter.call(pack) as number;need(size>0&&size<=150*1024*1024,'archive byte budget');
 // A genuine typed array reads its indexed bytes internally; no caller method,
 // iterator or species constructor participates in this owned copy.
 const bytes=new Uint8Array(size);Uint8Array.prototype.set.call(bytes,pack);
 const actual=createHash('sha256').update(bytes).digest('hex');
 need(sha256===runtime.context.packSha256&&actual===sha256&&version===session.dataVersion&&version===actual.slice(0,12)&&dataset.version===version,'archive SHA/version baseline binding');
 const baseline=semanticAdmissionDatasetV72(runtime.resources.semantic) as unknown as FactDataset;
 need(equal(dataset.characters,baseline.characters)&&equal(dataset.citations,baseline.citations)&&equal(dataset.sources,baseline.sources),'archive parsed dataset must equal actual pinned baseline');
}

/** Reconstruct every immutable candidate and both independent subproofs before
 * returning a private original-package7.1 mirror for the unchanged old checker.
 * No base candidate or checksum supplied inside the DTO is an authority. */
export function verifyReviewedNamingDataSession(input:NamingSession,resources:ReviewedNamingDataResources,archive?:FactArchive):NamingSession {
 const session=ownReviewedDataJson(input) as ReviewedNamingSession;
 need(footprintOwned(session)&&session.reviewedData&&session.reviewedData.method===REVIEWED_DATA_METHOD,'complete new-method addon required; cannot downgrade');
 const selection=normalizeReviewedDataSelection(session.reviewedData.selection),runtime=createReviewedNamingRecomputation(resources,generationRequest(session,selection));
 assertSession(session,runtime);assertArchive(archive,session,runtime);
 const binding=sessionBinding(session,runtime),proofs:ReviewedDataCandidateUse[]=[],baselines:NameCandidate[]=[];
 for(let index=0;index<session.candidates.length;index++){
  const candidate=session.candidates[index];need(Object.hasOwn(candidate,'reviewedDataUse'),'every candidate proof required');
  const computed=runtime.recompute(candidate.givenName,candidate.origin,candidate.id,'restore');need(computed,'saved candidate failed canonical recomputation');assertCandidate(candidate,computed.candidate);
  const proof=candidateProof(session,runtime,computed,index,binding);need(equal(candidate.reviewedDataUse,proof),'candidate source/semantic/imagery/occurrence proof mismatch');proofs.push(proof);baselines.push(computed.baseline);
 }
 need(equal(session.reviewedData,sessionAddon(runtime,binding,proofs)),'session publication/frozen context/order proof mismatch');
 const mirror=ownReviewedDataJson(session) as NamingSession&{reviewedData?:unknown};delete mirror.reviewedData;
 mirror.candidates=session.candidates.map((candidate,index)=>{
  const result={...candidate,...baselines[index],favorite:candidate.favorite,reviewNote:candidate.reviewNote} as NameCandidate&{reviewedDataUse?:unknown};delete result.reviewedDataUse;
  if(candidate.warnings.includes(REVIEWED_DATA_MANUAL_WARNING))result.warnings=[...result.warnings,REVIEWED_DATA_MANUAL_WARNING];
  return result;
 });
 return mirror;
}

/** Ordinary review and history may retain notes, favorites and the existing
 * manual preference reminder. New-method identity and canonical prose remain
 * bound to the actual generation-time profile and candidate order. */
export function assertUnchangedReviewedData(originalInput:unknown,nextInput:unknown):void {
 const before=footprintOwned(originalInput),after=footprintOwned(nextInput);
 if(!before&&!after)return;need(before&&after,'review cannot add/remove new-method identity');
 const original=ownReviewedDataJson(originalInput),next=ownReviewedDataJson(nextInput);
 const old=original as ReviewedNamingSession,value=next as ReviewedNamingSession;
 need(old.reviewedData&&value.reviewedData&&equal(old.reviewedData,value.reviewedData),'reviewed session proof is immutable');
 for(const key of ['id','profileId','createdAt','dataVersion','namingRules','profile','analysis','sourceSnapshot','originalFavorable'] as const)need(equal(old[key],value[key]),'reviewed immutable session '+key);
 assertPreferences(value);
 need(Array.isArray(old.candidates)&&Array.isArray(value.candidates)&&old.candidates.length===value.candidates.length,'reviewed candidate order/count');
 for(let index=0;index<old.candidates.length;index++){
  const previous=old.candidates[index],candidate=value.candidates[index];
  need(previous.reviewedDataUse&&candidate.reviewedDataUse&&equal(previous.reviewedDataUse,candidate.reviewedDataUse),'reviewed candidate proof is immutable');
  need(equal(reviewedCandidateFacts(previous),reviewedCandidateFacts(candidate)),'reviewed candidate text/style/origin/score is immutable');
 }
}
