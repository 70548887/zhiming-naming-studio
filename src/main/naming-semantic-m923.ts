import {isDeepStrictEqual as equal} from 'node:util';
import {semanticV72OwnRecord as own,semanticV72Plain as plain,semanticV72Canonical as canonical,semanticV72Hash as hash,semanticV72Freeze as freeze} from '../domain/naming-semantic-admission-v72';
import {M923_FAMILY} from '../shared/naming-semantic-m923';
import type {M921M923FamilyHandle,M923Context,M923PoolContext,M923ConstraintInputs,M923Assessment,M923Receipt,M923ErrorCode,M923FamilySelection,M923AdmissionRecord} from '../shared/naming-semantic-m923';
import {getAuthenticatedM923Resources,refreshM921M923Family} from './naming-semantic-m923-data';
import {normalizeM923Constraints,checkM923PoolConstraints,checkM923CandidateConstraints} from './naming-semantic-m923-constraints';

const familyKeys=Object.keys(M923_FAMILY);
const poolKeys=['stage','candidateCaseId','char','selectedPinyin','tone','senseId','requestedGivenNameLength','namePart','familySelection','themeIds'];
const occurrenceKeys=['stage','candidateId','candidateCaseId','fullName','surname','givenName','position','char','selectedPinyin','tone','senseId','givenNameLength','namePart','familySelection','themeIds'];
const fixedThemes=Object.freeze(['civic-homeland','water-bubbles','textile-ribbon','agriculture','literary-artwork','herb-plant']);
const codes:readonly M923ErrorCode[]=['M923_SOURCE_UNAVAILABLE','M923_REJECTED_INTEGRITY','M923_UNTRUSTED_HANDLE','M923_FAMILY_NOT_ENABLED','M923_CONTEXT_INVALID','M923_NOT_ADMITTED','M923_READING_MISMATCH','M923_CANDIDATE_SCOPE_MISMATCH','M923_BLOCKED_EXISTING_CONSTRAINTS'];
export class M923RuntimeError extends Error {
  constructor(readonly code:M923ErrorCode){super(code);this.name='M923RuntimeError';}
}
function need(value:unknown,code:M923ErrorCode):asserts value {if(!value)throw new M923RuntimeError(code);}
function codeOf(error:unknown,fallback:M923ErrorCode='M923_CONTEXT_INVALID'):M923ErrorCode {
  if(error instanceof Error&&'code' in error&&codes.includes(error.code as M923ErrorCode))return error.code as M923ErrorCode;
  return fallback;
}
export function normalizeM923FamilySelection(value:unknown):M923FamilySelection {
  try {
    const selected=own(value,[...familyKeys,'enabled'],[...familyKeys,'enabled']);
    need(selected.enabled===true&&familyKeys.every(key=>selected[key]===M923_FAMILY[key as keyof typeof M923_FAMILY]),'M923_FAMILY_NOT_ENABLED');
    return freeze({...M923_FAMILY,enabled:true});
  }catch{throw new M923RuntimeError('M923_FAMILY_NOT_ENABLED');}
}
export function normalizeM923ThemeIds(value:unknown):M923Context['themeIds'] {
  plain(value);
  need(Array.isArray(value)&&value.every(theme=>typeof theme==='string'&&fixedThemes.includes(theme))&&new Set(value).size===value.length,'M923_CONTEXT_INVALID');
  return freeze([...value].sort()) as M923Context['themeIds'];
}
/** Exact, JSON-only shapes. A pool request deliberately has no future full name. */
export function normalizeM923Context(value:unknown):M923Context|M923PoolContext {
  plain(value);
  need(value!==null&&typeof value==='object'&&!Array.isArray(value),'M923_CONTEXT_INVALID');
  const isPool=(value as {stage?:unknown}).stage==='pool',keys=isPool?poolKeys:occurrenceKeys;
  const row=own(value,keys,keys);
  need(['pool','required','local','ai','save','restore'].includes(row.stage as string),'M923_CONTEXT_INVALID');
  const familySelection=normalizeM923FamilySelection(row.familySelection),themeIds=normalizeM923ThemeIds(row.themeIds);
  need(typeof row.candidateCaseId==='string'&&row.candidateCaseId.length>0&&row.candidateCaseId.length<=256,'M923_CONTEXT_INVALID');
  need(typeof row.char==='string'&&/^\p{Script=Han}$/u.test(row.char),'M923_CONTEXT_INVALID');
  need(typeof row.selectedPinyin==='string'&&row.selectedPinyin.length>0&&[1,2,3,4,5].includes(row.tone as number)&&typeof row.senseId==='string'&&row.senseId.length>0,'M923_CONTEXT_INVALID');
  need(row.namePart==='given-name','M923_CANDIDATE_SCOPE_MISMATCH');
  const length=isPool?row.requestedGivenNameLength:row.givenNameLength;
  need(length===1||length===2,'M923_CANDIDATE_SCOPE_MISMATCH');
  if(!isPool){
    need(typeof row.candidateId==='string'&&row.candidateId.length>0&&row.candidateId.length<=256,'M923_CONTEXT_INVALID');
    need(typeof row.surname==='string'&&/^\p{Script=Han}{1,4}$/u.test(row.surname)&&typeof row.givenName==='string'&&/^\p{Script=Han}{1,2}$/u.test(row.givenName),'M923_CANDIDATE_SCOPE_MISMATCH');
    need([...row.givenName].length===length&&row.fullName===row.surname+row.givenName&&Number.isInteger(row.position)&&Number(row.position)>=0&&Number(row.position)<length&&[...row.givenName][Number(row.position)]===row.char,'M923_CANDIDATE_SCOPE_MISMATCH');
  }
  return freeze({...row,familySelection,themeIds}) as unknown as M923Context|M923PoolContext;
}
function freshResources(handle:M921M923FamilyHandle) {
  // Reject identity forgeries before reading resources; refresh reauthenticates this family.
  getAuthenticatedM923Resources(handle);
  const result=refreshM921M923Family(handle);
  if(!result.ok)throw new M923RuntimeError(result.code);
  return getAuthenticatedM923Resources(result.handle);
}
function binding(handle:M921M923FamilyHandle,input:unknown,constraints:unknown) {
  const context=normalizeM923Context(input),resources=freshResources(handle);
  const normalized=normalizeM923Constraints(constraints,resources.dataset);
  const length=context.stage==='pool'?context.requestedGivenNameLength:context.givenNameLength;
  need(normalized.preferences.length===length,'M923_CANDIDATE_SCOPE_MISMATCH');
  if(context.stage!=='pool')need(context.surname===normalized.profile.surname,'M923_CANDIDATE_SCOPE_MISMATCH');
  const record=resources.records.find((row:M923AdmissionRecord)=>row.candidateCaseId===context.candidateCaseId);
  need(record&&record.identity.char===context.char,'M923_NOT_ADMITTED');
  need(record.identity.pinyin===context.selectedPinyin&&record.identity.tone===context.tone&&record.identity.senseId===context.senseId,'M923_READING_MISMATCH');
  return {context,resources,normalized,record};
}
function qualify(value:ReturnType<typeof binding>):M923Assessment {
  const {context,resources,normalized,record}=value;
  if(context.stage==='pool')need(checkM923PoolConstraints(context.char,normalized,resources.dataset),'M923_BLOCKED_EXISTING_CONSTRAINTS');
  else need(checkM923CandidateConstraints(context.givenName,normalized,resources.dataset,context.stage==='ai'?'ai':'local'),'M923_BLOCKED_EXISTING_CONSTRAINTS');
  return freeze({ok:true,status:'eligible',reviewId:record.reviewId,candidateCaseId:record.candidateCaseId,project:structuredClone(record.project),wholeNameMeaning:null,scoreDelta:0});
}
/** This qualification API cannot be used as the save/restore entry point. */
export function assessM921M923(handle:M921M923FamilyHandle,context:(M923Context&{stage:'required'|'local'|'ai'})|M923PoolContext,constraints:M923ConstraintInputs):M923Assessment {
  try {
    need(arguments.length===3,'M923_CONTEXT_INVALID');
    const bound=binding(handle,context,constraints);
    need(['pool','required','local','ai'].includes(bound.context.stage),'M923_CONTEXT_INVALID');
    return qualify(bound);
  }catch(error){return {ok:false,status:'blocked',code:codeOf(error)};}
}
function expectedReceipt(bound:ReturnType<typeof binding>):M923Receipt {
  const {context,resources,record,normalized}=bound;
  need(context.stage!=='pool','M923_CANDIDATE_SCOPE_MISMATCH');
  const {stage,...occurrence}=context;
  void stage;
  const contextSHA256=hash(canonical({...occurrence,constraintEngineId:normalized.constraintEngineId,constraintContextSHA256:normalized.constraintContextSHA256}));
  return freeze({
    schema:'m921-m923-character-generation-adoption/1',...M923_FAMILY,
    registryEntrySHA256:resources.pins.registryEntrySHA256,
    decisionRecordsSHA256:resources.pins.decisionRecordsSHA256,policySHA256:resources.pins.policySHA256,
    candidateId:context.candidateId,fullName:context.fullName,givenName:context.givenName,position:context.position,
    char:context.char,pinyin:context.selectedPinyin,tone:context.tone,senseId:context.senseId,
    reviewId:record.reviewId,candidateCaseId:record.candidateCaseId,
    sourceEntrySHA256:record.sourceSHA256,sourceDefinitionSHA256:record.identity.definitionSha256,
    sourceCaseSHA256:record.lineage.m921SourceRowSHA256,lineageSHA256:hash(JSON.stringify(record.lineage)),
    baseDatasetSHA256:record.identity.baseDatasetSha256,basePackSHA256:record.identity.basePackSha256,
    projectTextSHA256:record.projectTextSHA256,projectSHA256:record.projectSHA256,
    constraintEngineId:normalized.constraintEngineId,constraintContextSHA256:normalized.constraintContextSHA256,contextSHA256,
    explanationScope:'characterwise-only',projectWish:null,wholeNameMeaning:null,scoreDelta:0,
  });
}
export function issueM921M923Receipt(handle:M921M923FamilyHandle,context:M923Context&{stage:'local'|'ai'},constraints:M923ConstraintInputs):M923Receipt {
  need(arguments.length===3,'M923_CONTEXT_INVALID');
  const bound=binding(handle,context,constraints);
  need(bound.context.stage==='local'||bound.context.stage==='ai','M923_CONTEXT_INVALID');
  qualify(bound);
  return expectedReceipt(bound);
}
export function validateM921M923Receipt(handle:M921M923FamilyHandle,receipt:unknown,savedContext:M923Context,savedConstraints:M923ConstraintInputs):{ok:true}|{ok:false;code:'M923_REJECTED_INTEGRITY'|'M923_UNTRUSTED_HANDLE'|'M923_SOURCE_UNAVAILABLE'} {
  try {
    need(arguments.length===4,'M923_REJECTED_INTEGRITY');
    plain(receipt);
    const bound=binding(handle,savedContext,savedConstraints),expected=expectedReceipt(bound);
    own(receipt,Object.keys(expected),Object.keys(expected));
    need(equal(expected,receipt),'M923_REJECTED_INTEGRITY');
    return {ok:true};
  }catch(error){
    const code=codeOf(error,'M923_REJECTED_INTEGRITY');
    return {ok:false,code:code==='M923_UNTRUSTED_HANDLE'||code==='M923_SOURCE_UNAVAILABLE'?code:'M923_REJECTED_INTEGRITY'};
  }
}
/** Receipt integrity is checked before the independently executable qualification. */
export function validateAndAssessM921M923Saved(handle:M921M923FamilyHandle,request:{context:M923Context&{stage:'save'|'restore'};receipt:unknown;constraints:M923ConstraintInputs}):M923Assessment {
  try {
    need(arguments.length===2,'M923_CONTEXT_INVALID');
    const value=own(request,['context','receipt','constraints'],['context','receipt','constraints']);
    const context=normalizeM923Context(value.context);
    need(context.stage==='save'||context.stage==='restore','M923_CONTEXT_INVALID');
    const validation=validateM921M923Receipt(handle,value.receipt,context,value.constraints as M923ConstraintInputs);
    if(!validation.ok)return {ok:false,status:'blocked',code:validation.code};
    return qualify(binding(handle,context,value.constraints));
  }catch(error){return {ok:false,status:'blocked',code:codeOf(error)};}
}
