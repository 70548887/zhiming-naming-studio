import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import {ownCulturalJson,culturalCanonicalDigest} from '../domain/qimen-cultural-comparison-canonical';
import {M923_FAMILY,M923_GENERATION_SNAPSHOT_SCHEMA} from '../shared/naming-semantic-m923';
import type {M923GeneratedCandidate,M923GenerationSnapshot,M923Receipt,M923Project} from '../shared/naming-semantic-m923';
import type {BirthProfile,NamingPreferences} from '../shared/types';

/** Pure consistency projection, deliberately distinct from NamingSession and
 * from any persisted-method addon. Its caller still needs the fixed private
 * runtime verifier, session fact/source checks and the existing single writer. */
export interface M923SessionBindingProjection {
  sessionId:string;profileId:string;createdAt:string;
  profile:BirthProfile;preferences:NamingPreferences;candidates:readonly M923GeneratedCandidate[];
}
export interface M923SessionBindingInspection {
  readonly kind:'data-consistent';readonly sourceAuthenticated:false;readonly persistenceVerified:false;
  readonly profileId:string;readonly candidateCount:number;readonly receiptCount:number;readonly zeroAdoptionCandidateCount:number;
}
export class M923SessionBindingError extends Error {
  readonly code='M923_SESSION_BINDING_INVALID';
  constructor(readonly reason:string){super('M923_SESSION_BINDING_INVALID: '+reason);this.name='M923SessionBindingError';}
}
const engineId='m923-existing-constraints-v1' as const;
const themes=Object.freeze(['civic-homeland','water-bubbles','textile-ribbon','agriculture','literary-artwork','herb-plant']);
const familyKeys=Object.keys(M923_FAMILY);
const projectionKeys=['sessionId','profileId','createdAt','profile','preferences','candidates'];
const snapshotKeys=['schema',...familyKeys,'constraintEngineId','constraintContextSHA256','candidateId','fullName','givenName','themeIds','familySelection','generationOrigin','rows','generatedMeaning','baseMeaning','baseReason','baseWarnings','wholeNameMeaning','projectWish','scoreDelta'];
const receiptKeys=['schema',...familyKeys,'registryEntrySHA256','decisionRecordsSHA256','policySHA256','candidateId','fullName','givenName','position','char','pinyin','tone','senseId','reviewId','candidateCaseId','sourceEntrySHA256','sourceDefinitionSHA256','sourceCaseSHA256','lineageSHA256','baseDatasetSHA256','basePackSHA256','projectTextSHA256','projectSHA256','constraintEngineId','constraintContextSHA256','contextSHA256','explanationScope','projectWish','wholeNameMeaning','scoreDelta'];
const candidateRequired=['id','givenName','fullName','pinyin','style','characters','meaning','reason','citations','evaluation','warnings','traditionalReason','favorite','origin','reviewNote','originalMeaning','semanticAdoptionM923'];
const candidateOptional=['parentNamePhoneticReview','wordPronunciationReference','elementAssessment','namingMeaningReview','meaningContextReview','modernPracticalEvidence','numerology','imageReading','yueReading','namePhoneticReviews','yueHomophones'];
const snapshotHashKeys=['registryEntrySHA256','decisionRecordsSHA256','policySHA256','sourceEntrySHA256','sourceDefinitionSHA256','sourceCaseSHA256','lineageSHA256','baseDatasetSHA256','basePackSHA256','projectTextSHA256','projectSHA256','constraintContextSHA256','contextSHA256'] as const;
function need(value:unknown,reason:string):asserts value {if(!value)throw new M923SessionBindingError(reason);}
function exact(value:unknown,required:readonly string[],optional:readonly string[]=[],reason='fields'):asserts value is Record<string,unknown> {
  need(!!value&&typeof value==='object'&&!Array.isArray(value),reason);
  need(required.every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>required.includes(key)||optional.includes(key)),reason);
}
const hash=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
const hashString=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
function family(value:Record<string,unknown>){need(familyKeys.every(key=>value[key]===M923_FAMILY[key as keyof typeof M923_FAMILY]),'family identity');}
function explicitSelection(value:unknown){exact(value,[...familyKeys,'enabled'],[],'exact explicit family selection');family(value);need(value.enabled===true,'family not enabled');}
function knownThemes(value:unknown){need(strings(value)&&value.every(id=>themes.includes(id))&&new Set(value).size===value.length&&equal(value,[...value].sort()),'canonical explicit themes');}
function project(value:unknown):M923Project {
  exact(value,['meaning','projectWish','limits','attribution','license'],[],'project fields');
  need(typeof value.meaning==='string'&&strings(value.limits)&&value.projectWish===null&&value.attribution==='M923 independent project wording decision; dictionary text remains MOE'&&value.license==='CC0-1.0','project scope');
  return value as unknown as M923Project;
}
function inspectReceipt(receipt:M923Receipt,description:M923Project,candidate:M923GeneratedCandidate,snapshot:M923GenerationSnapshot,position:number,input:M923SessionBindingProjection,contextHash:string){
  exact(receipt,receiptKeys,[],'receipt fields');family(receipt as unknown as Record<string,unknown>);
  need(receipt.schema==='m921-m923-character-generation-adoption/1'&&receipt.constraintEngineId===engineId&&receipt.constraintContextSHA256===contextHash,'receipt engine/context');
  need(snapshotHashKeys.every(key=>hashString(receipt[key])),'receipt hash shape');
  const character=candidate.characters[position];
  need(receipt.candidateId===candidate.id&&receipt.fullName===candidate.fullName&&receipt.givenName===candidate.givenName&&receipt.position===position&&receipt.char===character.char&&receipt.pinyin===character.pinyin&&receipt.tone===character.tone,'receipt candidate occurrence');
  need(typeof receipt.candidateCaseId==='string'&&receipt.candidateCaseId.length>0&&typeof receipt.reviewId==='string'&&receipt.reviewId.length>0&&typeof receipt.senseId==='string'&&receipt.senseId.length>0,'receipt identity');
  need(receipt.explanationScope==='characterwise-only'&&receipt.projectWish===null&&receipt.wholeNameMeaning===null&&receipt.scoreDelta===0,'receipt scope');
  const occurrence={candidateId:candidate.id,candidateCaseId:receipt.candidateCaseId,fullName:candidate.fullName,surname:input.profile.surname,givenName:candidate.givenName,position,char:character.char,selectedPinyin:character.pinyin,tone:character.tone,senseId:receipt.senseId,givenNameLength:input.preferences.length,namePart:'given-name',familySelection:snapshot.familySelection,themeIds:snapshot.themeIds,constraintEngineId:engineId,constraintContextSHA256:contextHash};
  need(receipt.contextSHA256===culturalCanonicalDigest(occurrence),'receipt occurrence digest');
  // The fixed publication hashes this field order. This proves consistency
  // with the supplied project, never that a dictionary or registry approved it.
  const projectValue={meaning:description.meaning,projectWish:description.projectWish,limits:description.limits,attribution:description.attribution,license:description.license};
  need(receipt.projectTextSHA256===hash(description.meaning)&&receipt.projectSHA256===hash(JSON.stringify(projectValue)),'receipt project digest');
}
function ownedProjection(value:unknown):M923SessionBindingProjection {
  let input:M923SessionBindingProjection;
  try{input=ownCulturalJson<M923SessionBindingProjection>(value);}catch{throw new M923SessionBindingError('bounded ordinary JSON required');}
  exact(input,projectionKeys,[],'exact session projection');
  need(typeof input.sessionId==='string'&&input.sessionId.length>0&&input.sessionId.length<=256&&typeof input.createdAt==='string'&&Number.isFinite(Date.parse(input.createdAt)),'session identity');
  need(input.profile!==null&&typeof input.profile==='object'&&!Array.isArray(input.profile)&&input.preferences!==null&&typeof input.preferences==='object'&&!Array.isArray(input.preferences),'original profile/preferences');
  need(typeof input.profileId==='string'&&input.profileId.length>0&&input.profileId===input.profile.id&&typeof input.profile.surname==='string'&&/^\p{Script=Han}{1,4}$/u.test(input.profile.surname),'profile identity');
  need(input.preferences.length===1||input.preferences.length===2,'name length');
  need(Object.hasOwn(input.profile,'namingPreferences')&&equal(input.profile.namingPreferences,input.preferences),'frozen effective original preferences');
  need(Array.isArray(input.candidates)&&input.candidates.length<=100&&new Set(input.candidates.map(candidate=>candidate?.id)).size===input.candidates.length,'candidate count/identities');
  return input;
}
function inspectOwned(input:M923SessionBindingProjection):M923SessionBindingInspection {
  const contextHash=culturalCanonicalDigest({schema:'m923-constraint-context/1',engineId,profile:input.profile,preferences:input.preferences});
  let receiptCount=0,zeroAdoptionCandidateCount=0,sessionThemes:readonly string[]|undefined;
  for(const candidate of input.candidates){
    exact(candidate,candidateRequired,candidateOptional,'candidate fields');
    need(typeof candidate.id==='string'&&candidate.id.length>0&&candidate.id.length<=256&&typeof candidate.givenName==='string'&&/^\p{Script=Han}{1,2}$/u.test(candidate.givenName)&&[...candidate.givenName].length===input.preferences.length&&candidate.fullName===input.profile.surname+candidate.givenName,'candidate identity/name');
    need(typeof candidate.favorite==='boolean'&&typeof candidate.reviewNote==='string'&&typeof candidate.pinyin==='string'&&strings(candidate.warnings)&&['local','ai'].includes(candidate.origin),'candidate facts/review fields');
    need(['style','meaning','reason','traditionalReason','originalMeaning'].every(field=>typeof candidate[field as keyof M923GeneratedCandidate]==='string')&&Array.isArray(candidate.citations),'candidate prose/citations');
    exact(candidate.evaluation,['sound','meaning','simplicity','traditional','distinctiveness'],[],'evaluation fields');
    need(Object.values(candidate.evaluation).every(number=>typeof number==='number'&&Number.isFinite(number)&&number>=0&&number<=100),'evaluation range');
    const glyphs=[...candidate.givenName];
    need(Array.isArray(candidate.characters)&&candidate.characters.length===glyphs.length&&candidate.characters.every((character,index)=>character&&character.char===glyphs[index]&&typeof character.pinyin==='string'&&[1,2,3,4,5].includes(character.tone)),'candidate character facts');
    const snapshot=candidate.semanticAdoptionM923;
    exact(snapshot,snapshotKeys,[],'snapshot/2 exact fields');family(snapshot as unknown as Record<string,unknown>);
    need(snapshot.schema===M923_GENERATION_SNAPSHOT_SCHEMA&&snapshot.constraintEngineId===engineId&&snapshot.constraintContextSHA256===contextHash,'snapshot/2 original engine/context');
    explicitSelection(snapshot.familySelection);knownThemes(snapshot.themeIds);
    if(sessionThemes===undefined)sessionThemes=snapshot.themeIds;else need(equal(sessionThemes,snapshot.themeIds),'one original theme selection');
    need(snapshot.candidateId===candidate.id&&snapshot.fullName===candidate.fullName&&snapshot.givenName===candidate.givenName&&snapshot.generationOrigin===candidate.origin,'snapshot candidate identity');
    need(snapshot.wholeNameMeaning===null&&snapshot.projectWish===null&&snapshot.scoreDelta===0&&typeof snapshot.generatedMeaning==='string'&&candidate.meaning===snapshot.generatedMeaning&&candidate.originalMeaning===snapshot.generatedMeaning&&typeof snapshot.baseMeaning==='string'&&typeof snapshot.baseReason==='string'&&strings(snapshot.baseWarnings),'snapshot meaning/scope');
    need(Array.isArray(snapshot.rows)&&snapshot.rows.length===glyphs.length,'snapshot occurrences');
    let adopted=0;
    for(const [position,row]of snapshot.rows.entries()){
      exact(row,['position','char','adoption','project'],[],'snapshot row fields');
      need(row.position===position&&row.char===glyphs[position],'snapshot row occurrence');
      if(row.adoption===null){need(row.project===null,'unadopted project');continue;}
      need(row.adoption!==null&&typeof row.adoption==='object'&&!Array.isArray(row.adoption),'adopted receipt object');
      const description=project(row.project);
      inspectReceipt(row.adoption as unknown as M923Receipt,description,candidate,snapshot,position,input,contextHash);adopted++;
    }
    receiptCount+=adopted;if(adopted===0)zeroAdoptionCandidateCount++;
  }
  return Object.freeze({kind:'data-consistent',sourceAuthenticated:false,persistenceVerified:false,profileId:input.profileId,candidateCount:input.candidates.length,receiptCount,zeroAdoptionCandidateCount});
}
/** Neither this inspection nor a clone of its result is an admission token.
 * In particular it does not replace createNamingSemanticGenerationM923(...)
 * .verifySaved(), private source authentication, CAS or an actual DB commit. */
export function inspectM923SessionBinding(input:unknown):M923SessionBindingInspection {
  need(arguments.length===1,'one projection argument');return inspectOwned(ownedProjection(input));
}
/** Comparison with the actual original session is required at the owning
 * boundary. Candidate notes/favorites are separate from original requests and
 * every other fact, optional addon, warning and snapshot stays immutable. */
export function assertUnchangedM923SessionBinding(original:unknown,next:unknown):void {
  need(arguments.length===2,'two projection arguments');
  const before=ownedProjection(original),after=ownedProjection(next);inspectOwned(before);inspectOwned(after);
  for(const field of ['sessionId','profileId','createdAt','profile','preferences'] as const)need(equal(before[field],after[field]),'immutable session '+field);
  need(before.candidates.length===after.candidates.length,'immutable candidate count/order');
  const facts=(candidate:M923GeneratedCandidate)=>Object.fromEntries(Object.entries(candidate).filter(([field])=>field!=='favorite'&&field!=='reviewNote'));
  for(const [index,candidate]of before.candidates.entries())need(equal(facts(candidate),facts(after.candidates[index])),'immutable candidate facts/order/snapshot');
}
