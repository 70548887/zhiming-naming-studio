import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal,types} from 'node:util';
import type {CharacterEntry} from '../shared/types';
import {NAMING_EDITORIAL_V72_VERSION} from '../shared/naming-semantic-admission-v72';
import type {SemanticAdmissionHandle,SemanticPublicationV72,SemanticAdmissionContext,SemanticAdmissionContextV72SafeResult,SemanticAdmissionResult,SemanticAdmissionStatus,SemanticAdoptionReceipt,SemanticProjectIntent,SemanticOutputAssertion,SemanticReplayAssertion} from '../shared/naming-semantic-admission-v72';

export function semanticV72Need(condition:unknown,message:string):asserts condition {if(!condition)throw Error('Semantic admission7.2: '+message);}
/** New-module boundary only. Reject proxies before reflection, and never invoke
 * getters/toJSON, hidden fields, inherited intent, or sparse array members. */
export function semanticV72Plain(value:unknown,depth=0,active=new Set<object>()):void {
 semanticV72Need(depth<=70,'input depth');
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;
 semanticV72Need(value!==null&&typeof value==='object'&&!types.isProxy(value),'plain JSON/Proxy');
 semanticV72Need(!active.has(value),'cyclic JSON');
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 semanticV72Need(array?prototype===Array.prototype:prototype===null||prototype===Object.prototype,'plain prototype');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);
 if(array)semanticV72Need(keys.length===value.length+1&&Array.from({length:value.length},(_,i)=>String(i)).every(key=>Object.hasOwn(descriptors,key)),'dense arrays');
 active.add(value);
 for(const key of keys){
  semanticV72Need(typeof key==='string','symbol');
  if(array&&key==='length')continue;
  const d=descriptors[key];semanticV72Need(d.enumerable&&Object.hasOwn(d,'value'),'own enumerable data field');
  semanticV72Plain(d.value,depth+1,active);
 }
 active.delete(value);
}
export function semanticV72OwnRecord(value:unknown,allowed:readonly string[],required:readonly string[]):Record<string,unknown> {
 semanticV72Plain(value);
 semanticV72Need(value!==null&&typeof value==='object'&&!Array.isArray(value),'record required');
 const result=Object.create(null) as Record<string,unknown>;
 for(const key of Reflect.ownKeys(value)){semanticV72Need(typeof key==='string'&&allowed.includes(key),'unknown field '+String(key));result[key]=Object.getOwnPropertyDescriptor(value,key)!.value;}
 semanticV72Need(required.every(key=>Object.hasOwn(result,key)),'required own data fields');
 return result;
}
export function semanticV72Hash(value:string|Uint8Array):string{return createHash('sha256').update(value).digest('hex');}
export function semanticV72Canonical(value:unknown):string {
 semanticV72Plain(value);
 const sort=(node:unknown):unknown=>Array.isArray(node)?node.map(sort):node&&typeof node==='object'?Object.fromEntries(Object.keys(node).sort().map(key=>[key,sort((node as Record<string,unknown>)[key])])):node;
 return JSON.stringify(sort(value));
}
export function semanticV72Freeze<T>(value:T):T {if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(semanticV72Freeze);Object.freeze(value);}return value;}
const structurallyConstructed=new WeakSet<object>();

/** Pure policy constructor. Main separately verifies bytes and remembers its own
 * handle; calling this export cannot mint a main-process resource capability. */
export function createNamingSemanticAdmissionHandle(publication:SemanticPublicationV72):SemanticAdmissionHandle {
 semanticV72Plain(publication);
 semanticV72Need(publication.identity.ruleVersion===NAMING_EDITORIAL_V72_VERSION&&publication.activation==='not-current'&&publication.productionApproved===false,'publication version/state');
 semanticV72Need(publication.records.length===publication.rows.length&&new Set(publication.records.map(row=>row.candidateCaseId)).size===publication.records.length,'unique cases');
 for(const row of publication.records){
  semanticV72Need(row.ruleVersion===NAMING_EDITORIAL_V72_VERSION,'record version');
  semanticV72Need(row.grants.sourceAuthorityFromCaller===false&&row.grants.automaticSemanticCreditAllowed===false&&row.grants.scoreDelta===0&&row.grants.wholeNameApproved===false&&row.grants.wholeNameMeaning===null&&row.grants.personalityPrediction===false&&row.grants.fortunePrediction===false&&row.grants.elementModification===false,'admission grants');
  semanticV72Need(row.sourceFieldMayBeRewritten===false&&row.project.license==='CC0-1.0'&&row.project.projectWish===null,'project/source separation');
 }
 const handle=semanticV72Freeze({publication:structuredClone(publication)});structurallyConstructed.add(handle);return handle;
}
// Fixed M752 theme IDs are policy authority; the shared runtime array is public.
const fixedSemanticThemesV72=Object.freeze(['civic-homeland','water-bubbles','textile-ribbon','agriculture','literary-artwork','herb-plant'] as const);
class UnknownSemanticThemeV72 extends Error {constructor(){super('Semantic admission7.2: unknown-theme');}}
function normalizeSemanticAdmissionContextShapeV72(value:unknown,deferUnknownTheme:boolean):{context:SemanticAdmissionContext;unknownThemes:readonly string[]} {
 const input=semanticV72OwnRecord(value,['themeIds','requestedGivenNameLength','namePart','stage','givenName','fullName','position','candidateId'],['themeIds','requestedGivenNameLength','namePart','stage']);
 semanticV72Need(Array.isArray(input.themeIds)&&input.themeIds.every(x=>typeof x==='string')&&new Set(input.themeIds).size===input.themeIds.length,'explicit theme array');
 const unknownThemes=input.themeIds.filter(theme=>!fixedSemanticThemesV72.includes(theme as typeof fixedSemanticThemesV72[number]));
 if(!deferUnknownTheme&&unknownThemes.length>0)throw new UnknownSemanticThemeV72();
 semanticV72Need(input.requestedGivenNameLength===1||input.requestedGivenNameLength===2,'requested given-name length');
 semanticV72Need(input.namePart==='given-name','only given-name layer');
 semanticV72Need(['pool','required','local','ai','save','restore'].includes(input.stage as string),'stage');
 const context={themeIds:[...input.themeIds].sort(),requestedGivenNameLength:input.requestedGivenNameLength,namePart:'given-name',stage:input.stage} as SemanticAdmissionContext;
 if(Object.hasOwn(input,'givenName')){
  semanticV72Need(typeof input.givenName==='string'&&/^\p{Script=Han}{1,2}$/u.test(input.givenName)&&[...input.givenName].length===context.requestedGivenNameLength,'given-name context');
  semanticV72Need(typeof input.fullName==='string'&&/^\p{Script=Han}{2,6}$/u.test(input.fullName)&&input.fullName.endsWith(input.givenName)&&[...input.fullName].length>[...input.givenName].length,'full-name context');
  semanticV72Need(Number.isInteger(input.position)&&Number(input.position)>=0&&Number(input.position)<context.requestedGivenNameLength,'position context');
  context.givenName=input.givenName;context.fullName=input.fullName;context.position=Number(input.position);
  if(Object.hasOwn(input,'candidateId')){semanticV72Need(typeof input.candidateId==='string'&&input.candidateId.length>0,'candidate id');context.candidateId=input.candidateId;}
 }else semanticV72Need(!['fullName','position','candidateId'].some(key=>Object.hasOwn(input,key)),'incomplete occurrence');
 return {context:semanticV72Freeze(context),unknownThemes:semanticV72Freeze(unknownThemes)};
}
export function normalizeSemanticAdmissionContextV72(value:unknown):SemanticAdmissionContext {
 const normalized=normalizeSemanticAdmissionContextShapeV72(value,false);
 return normalized.context;
}
/** Normalize the safe structural context even when its theme set is not in the
 * fixed authority list. Unknown IDs are retained, sorted and frozen so callers
 * can fail closed without silently filtering or replacing their request. All
 * other shape, proxy, accessor and enum errors remain strict exceptions. */
export function normalizeSemanticAdmissionContextV72Safe(value:unknown):SemanticAdmissionContextV72SafeResult {
 const normalized=normalizeSemanticAdmissionContextShapeV72(value,true);
 if(normalized.unknownThemes.length>0)return semanticV72Freeze({ok:false as const,context:normalized.context,reasonCode:'unknown-theme' as const});
 return semanticV72Freeze({ok:true as const,context:normalized.context});
}
const outcome=(status:SemanticAdmissionStatus,recordId:string|null,reasonCode:string,project:SemanticProjectIntent|null=null):SemanticAdmissionResult=>semanticV72Freeze({status,recordId,reasonCode,project,wholeNameMeaning:null,automaticSemanticCreditAllowed:false,scoreDelta:0});

/** Single exact gate used by every stage. Stage never loosens theme/reading,
 * length, source or pending decisions. No free-text or claimed approval input. */
export function assessNamingSemanticAdmission(handle:SemanticAdmissionHandle,entry:CharacterEntry,rawContext:SemanticAdmissionContext):SemanticAdmissionResult {
 semanticV72Need(structurallyConstructed.has(handle),'unknown policy handle');
 semanticV72Plain(entry);
 const safeContext=normalizeSemanticAdmissionContextV72Safe(rawContext);
 const row=handle.publication.records.find(row=>row.identity.char===entry.char);
 const context=safeContext.context;
 if(!safeContext.ok)return outcome('rejected-integrity',row?.admissionId??null,safeContext.reasonCode);
 if(!row)return outcome('not-admitted',null,'no-current-record');
 const id=row.admissionId;
 if(context.givenName&&[...context.givenName][context.position!]!==entry.char)return outcome('rejected-integrity',id,'occurrence-glyph');
 const candidate=handle.publication.rows.find(candidate=>candidate.caseId===row.candidateCaseId);
 if(!candidate)return outcome('rejected-integrity',id,'candidate-case');
 if(entry.pinyin!==row.identity.pinyin||entry.tone!==row.identity.tone)return outcome('reading-mismatch',id,'selected-default-reading');
 if(!equal(entry,candidate.baselineCharacter))return outcome('rejected-integrity',id,'full-default-character-record');
 if(row.decision==='pending')return outcome('pending-source-identity',id,'pending-source-identity');
 if(row.decision==='manual-only')return outcome('manual-only',id,'no-generation-grant');
 if(row.decision!=='allow-single-character-generation')return outcome('not-admitted',id,'generation-rejected');
 if(row.grants.eligibilityPolicyApproved!==true||row.approvedScope!=='single-character-project-intent-only'||row.sourceIdentityDecision!=='accepted-for-this-glyph-reading-sense-only')return outcome('not-admitted',id,'independent-current-sense-grant-absent');
 const conditions=row.machineConditions,limits=row.candidateConstraints;
 const conditionKeys=['selectedPinyin','tone','senseId','allowedGivenNameLengths','requiredThemeIds','namePart','conflictPolicy'];
 if(Object.keys(conditions).length!==conditionKeys.length||Object.keys(conditions).some(key=>!conditionKeys.includes(key))||conditions.namePart!=='given-name'||limits.namePart!=='given-name'||conditions.conflictPolicy!=='do-not-claim-alternate-sense'||limits.wholeNameApprovalRequired!==false||limits.requiresNewFamilySignature!==false)return outcome('condition-not-supported',id,'unimplemented-predicate');
 if(conditions.selectedPinyin!==row.identity.pinyin||conditions.tone!==row.identity.tone||conditions.senseId!==row.identity.senseId||!equal(conditions.allowedGivenNameLengths,limits.givenNameLengths))return outcome('rejected-integrity',id,'inconsistent-machine-conditions');
 if(!limits.givenNameLengths.includes(context.requestedGivenNameLength))return outcome('candidate-scope-mismatch',id,'given-name-length');
 if(row.usage.mode==='explicit-themes'){
  if(!equal(row.usage.anyOf,conditions.requiredThemeIds))return outcome('rejected-integrity',id,'theme-condition-identity');
  if(!row.usage.anyOf.some(theme=>context.themeIds.includes(theme)))return outcome('needs-theme',id,'explicit-enum-not-selected');
 }else if(row.usage.mode!=='any-context'||conditions.requiredThemeIds.length!==0)return outcome('condition-not-supported',id,'usage-mode');
 return outcome('eligible',id,'reusable-character-intent',structuredClone(row.project));
}
export function createSemanticAdoptionReceiptV72(handle:SemanticAdmissionHandle,entry:CharacterEntry,rawContext:SemanticAdmissionContext):SemanticAdoptionReceipt {
 const context=normalizeSemanticAdmissionContextV72(rawContext),result=assessNamingSemanticAdmission(handle,entry,context);
 semanticV72Need(result.status==='eligible'&&context.givenName&&context.fullName&&context.position!==undefined&&context.candidateId,'eligible bound occurrence receipt required');
 const row=handle.publication.records.find(row=>row.admissionId===result.recordId)!;
 const {stage:_stage,...savedContext}=context;
 return semanticV72Freeze({schema:'single-character-generation-adoption/1',ruleVersion:NAMING_EDITORIAL_V72_VERSION,candidateId:context.candidateId,fullName:context.fullName,givenName:context.givenName,position:context.position,candidateCaseId:row.candidateCaseId,reviewId:row.reviewId,char:entry.char,pinyin:entry.pinyin,tone:entry.tone,senseId:row.identity.senseId,publicationSha256:handle.publication.identity.policySha256,admissionSha256:handle.publication.identity.decisionSha256,sourceSha256:row.identity.sourceCaseSha256,basePackSha256:row.identity.basePackSha256,identitySha256:semanticV72Hash(JSON.stringify(row.identity)),projectSha256:row.projectSha256,contextSha256:semanticV72Hash(semanticV72Canonical(savedContext)),explanationScope:'characterwise-only',wholeNameMeaning:null,scoreDelta:0});
}
export function verifyNamingSemanticAdoptionReceipt(handle:SemanticAdmissionHandle,entry:CharacterEntry,context:SemanticAdmissionContext,saved:SemanticAdoptionReceipt):void {
 semanticV72Plain(saved);semanticV72Need(equal(saved,createSemanticAdoptionReceiptV72(handle,entry,context)),'saved receipt identity/source/context changed');
}
/** Exact project content only. No inference detector or word blacklist can
 * substitute for a reviewed whole-name rule. */
export function assertNamingSemanticOutput(recordId:string|null,output:{scoreDelta:unknown;wholeNameMeaning:unknown;generatedText:string;expectedText:string}):SemanticOutputAssertion {
 semanticV72Plain(output);
 if(output.scoreDelta!==0)return{ok:false,assertionKind:'reject-semantic-credit',reasonCode:'new-score-credit'};
 if(output.wholeNameMeaning!==null||output.generatedText!==output.expectedText)return{ok:false,assertionKind:'reject-unreviewed-claim',reasonCode:'noncanonical-characterwise-output'};
 void recordId;return{ok:true,assertionKind:null};
}
export function assertSemanticLegacyReplayV72(before:unknown,after:unknown):SemanticReplayAssertion {
 semanticV72Need(semanticV72Canonical(before)===semanticV72Canonical(after),'legacy replay changed bytes');
 semanticV72Need(!Object.hasOwn(after as object,'semanticAdoption72'),'legacy record gained7.2 receipt');
 return{ok:true,assertionKind:'preserve-legacy',oldBytesUnchanged:true,noNewReceipt:true};
}
/** Preserve the caller's established legacy pool. Only add actually eligible
 * new rows; this helper does not reinterpret521 as a generator whitelist. */
export function unionSemanticGenerationPoolV72(handle:SemanticAdmissionHandle,legacyEligiblePool:readonly CharacterEntry[],rawContext:SemanticAdmissionContext):CharacterEntry[] {
 semanticV72Need(structurallyConstructed.has(handle),'unknown policy handle');
 const normalized=normalizeSemanticAdmissionContextV72(rawContext),context=semanticV72Freeze({...normalized,stage:'pool' as const});
 semanticV72Plain(legacyEligiblePool);
 const pool=[...legacyEligiblePool],seen=new Set(pool.map(row=>row.char));
 for(const row of handle.publication.rows){if(!seen.has(row.char)&&assessNamingSemanticAdmission(handle,row.baselineCharacter,context).status==='eligible'){pool.push(structuredClone(row.baselineCharacter));seen.add(row.char);}}
 return pool;
}
