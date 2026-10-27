import {createHash,randomUUID} from 'node:crypto';
import {isDeepStrictEqual as equal,types} from 'node:util';
import {evaluateNameForRuleVersionWithContext,generateLocalForRuleVersionWithContext,validatePreferences} from '../domain/naming';
import {describeNamingMeaningCompositionV7} from '../domain/naming-v7';
import {assessNamingSemanticAdmission,createSemanticAdoptionReceiptV72,unionSemanticGenerationPoolV72} from '../domain/naming-semantic-admission-v72';
import {NAMING_RULE_V71_VERSION} from '../shared/naming-rules';
import {REVIEWED_DATA_METHOD,REVIEWED_DATA_CANDIDATE_PREFIX,REVIEWED_DATA_OBJECT_THEMES,REVIEWED_DATA_SEMANTIC_THEME_IDS} from '../shared/reviewed-naming-data';
import {semanticAdmissionDatasetV72} from './naming-semantic-admission-v72-data';
import {loadNamingEditorialV71Data} from './naming-editorial-v7-data';
import {finalizeNamingCandidateForRuleVersion} from './naming-meaning-review';
import {refreshReviewedNamingDataResources} from './reviewed-naming-data-resources';
import type {ReviewedNamingDataResources} from './reviewed-naming-data-resources';
import type {CharacterEntry,NameCandidate} from '../shared/types';
import type {SemanticAdmissionContext,SemanticAdmissionStage,SemanticThemeId} from '../shared/naming-semantic-admission-v72';
import type {ReviewedDataSelection,ReviewedDataSemanticUse,ReviewedNamingGenerationRequest} from '../shared/reviewed-naming-data';

export function reviewedDataNeed(value:unknown,reason:string):asserts value {if(!value)throw Error('Reviewed naming data: '+reason);}

/** Capture own plain data before inspecting it. No caller map, iterator,
 * accessor, Proxy trap, inherited intent, hidden field or toJSON is executed. */
export function ownReviewedDataJson<T>(value:T):T {
 const active=new WeakSet<object>();let nodes=0,units=0;
 const copy=(input:unknown,depth:number):unknown=>{
  reviewedDataNeed(++nodes<=500000&&depth<=64&&!types.isProxy(input),'plain JSON/Proxy budget');
  if(typeof input==='string'){units+=input.length;reviewedDataNeed(units<=16000000,'text budget');return input;}
  if(input===null||typeof input==='boolean'||typeof input==='number'&&Number.isFinite(input))return input;
  reviewedDataNeed(input&&typeof input==='object'&&!active.has(input),'plain acyclic JSON');
  const array=Array.isArray(input),prototype=Object.getPrototypeOf(input);
  reviewedDataNeed(array?prototype===Array.prototype:prototype===null||prototype===Object.prototype,'plain JSON prototype');
  const keys=Reflect.ownKeys(input);reviewedDataNeed(keys.length<=100001,'own field budget');active.add(input);
  try{
   if(array){
    const length=Object.getOwnPropertyDescriptor(input,'length');
    reviewedDataNeed(length&&Object.hasOwn(length,'value')&&Number.isSafeInteger(length.value)&&length.value>=0&&length.value<=100000&&keys.length===length.value+1,'dense own array');
    const output:unknown[]=[];
    for(let index=0;index<length.value;index++){
     const item=Object.getOwnPropertyDescriptor(input,String(index));reviewedDataNeed(item&&item.enumerable&&Object.hasOwn(item,'value'),'own array data');
     Object.defineProperty(output,String(index),{value:copy(item.value,depth+1),enumerable:true,writable:true,configurable:true});
    }
    return output;
   }
   const output:Record<string,unknown>={};
   for(const key of keys){
    reviewedDataNeed(typeof key==='string','string own fields');units+=key.length;reviewedDataNeed(units<=16000000,'text budget');
    const item=Object.getOwnPropertyDescriptor(input,key);reviewedDataNeed(item&&item.enumerable&&Object.hasOwn(item,'value'),'own enumerable data');
    Object.defineProperty(output,key,{value:copy(item.value,depth+1),enumerable:true,writable:true,configurable:true});
   }
   return output;
  }finally{active.delete(input);}
 };
 return copy(value,0) as T;
}
export function reviewedDataCanonical(value:unknown):string {
 const fixed=ownReviewedDataJson(value);
 const sort=(input:unknown):unknown=>Array.isArray(input)?input.map(sort):input&&typeof input==='object'?Object.fromEntries(Object.keys(input).sort().map(key=>[key,sort((input as Record<string,unknown>)[key])])):input;
 return JSON.stringify(sort(fixed));
}
export const reviewedDataDigest=(value:unknown):string=>createHash('sha256').update(reviewedDataCanonical(value)).digest('hex');
function exactKeys(value:object,expected:readonly string[],reason:string){reviewedDataNeed(equal(Object.keys(value).sort(),[...expected].sort()),reason);}
export function normalizeReviewedDataSelection(value:unknown):ReviewedDataSelection {
 const input=ownReviewedDataJson(value);
 reviewedDataNeed(input&&typeof input==='object'&&!Array.isArray(input),'explicit selection');
 exactKeys(input,['method','semanticThemeIds','objectThemes'],'selection fields');
 const selection=input as ReviewedDataSelection;
 reviewedDataNeed(selection.method===REVIEWED_DATA_METHOD,'explicit method');
 reviewedDataNeed(Array.isArray(selection.semanticThemeIds)&&selection.semanticThemeIds.length<=REVIEWED_DATA_SEMANTIC_THEME_IDS.length,'semantic theme array');
 reviewedDataNeed(selection.semanticThemeIds.every(theme=>typeof theme==='string'&&(REVIEWED_DATA_SEMANTIC_THEME_IDS as readonly string[]).includes(theme))&&new Set(selection.semanticThemeIds).size===selection.semanticThemeIds.length,'six exact semantic theme enums');
 reviewedDataNeed(selection.objectThemes&&typeof selection.objectThemes==='object'&&!Array.isArray(selection.objectThemes),'object theme map');
 for(const [char,theme] of Object.entries(selection.objectThemes))reviewedDataNeed(Object.hasOwn(REVIEWED_DATA_OBJECT_THEMES,char)&&REVIEWED_DATA_OBJECT_THEMES[char as keyof typeof REVIEWED_DATA_OBJECT_THEMES]===theme,'five exact char/object theme pairs');
 return {method:REVIEWED_DATA_METHOD,semanticThemeIds:[...selection.semanticThemeIds].sort() as SemanticThemeId[],objectThemes:{...selection.objectThemes}};
}
export function copyReviewedNamingRequest(value:ReviewedNamingGenerationRequest):ReviewedNamingGenerationRequest {
 const request=ownReviewedDataJson(value);exactKeys(request,['profile','preferences','analysis','selection'],'generation request fields');
 request.selection=normalizeReviewedDataSelection(request.selection);
 reviewedDataNeed(request.profile&&request.preferences&&request.analysis,'complete generation request');
 reviewedDataNeed(!request.preferences.elementAssessment&&!request.preferences.imageryReading&&!Object.hasOwn(request.analysis,'projectNamingUse'),'this method does not yet combine elementAssessment, imageryReading or projectNamingUse');
 reviewedDataNeed(request.profile.namingPreferences&&equal(request.profile.namingPreferences,request.preferences),'generation-time frozen profile.namingPreferences');
 return request;
}
export const REVIEWED_DATA_MANUAL_WARNING='人工喜用选择已修改，此批候选保留生成时的用字依据；重新生成可应用新选择。';
export const REVIEWED_DATA_CORE_FIELDS=Object.freeze(['id','givenName','fullName','pinyin','style','characters','meaning','reason','citations','evaluation','warnings','traditionalReason','origin','originalMeaning','namingMeaningReview'] as const);
export function reviewedCandidateFacts(candidate:NameCandidate):Record<string,unknown> {
 const fixed=ownReviewedDataJson(candidate),facts:Record<string,unknown>={};for(const field of REVIEWED_DATA_CORE_FIELDS){reviewedDataNeed(Object.hasOwn(fixed,field),'candidate fact '+field);facts[field]=field==='warnings'?fixed.warnings.filter(warning=>warning!==REVIEWED_DATA_MANUAL_WARNING):fixed[field];}return facts;
}
function reviewedServiceWarnings(candidate:NameCandidate,request:ReviewedNamingGenerationRequest):NameCandidate {
 return request.preferences.numerology?{...candidate,warnings:candidate.warnings.filter(warning=>!warning.includes('尚无完整、经核验的康熙姓名学笔画'))}:candidate;
}
export interface ReviewedNamingCandidateComputation {candidate:NameCandidate;baseline:NameCandidate;semantic:ReviewedDataSemanticUse;imagery:ReturnType<ReviewedNamingDataResources['imagery']['captureNameProvenance']>;}
function occurrence(request:ReviewedNamingGenerationRequest,givenName:string,position:number,stage:SemanticAdmissionStage,candidateId?:string):SemanticAdmissionContext {
 return {themeIds:request.selection.semanticThemeIds,requestedGivenNameLength:request.preferences.length,namePart:'given-name',stage,givenName,fullName:request.profile.surname.trim()+givenName,position,...(candidateId?{candidateId}:{})};
}

/** The complete old generator input remains in the union.521 is an explanation
 * coverage count and is never used as a candidate eligibility whitelist. */
export function createReviewedNamingRecomputation(resources:ReviewedNamingDataResources,input:ReviewedNamingGenerationRequest){
 const fixed=refreshReviewedNamingDataResources(resources),request=copyReviewedNamingRequest(input),handle=fixed.semantic,data=semanticAdmissionDatasetV72(handle);
 const originals=ownReviewedDataJson(data.characters);
 reviewedDataNeed(equal(originals,fixed.imagery.baselineCharacters()),'semantic/imagery complete baseline identity');
 const pool=unionSemanticGenerationPoolV72(handle,originals,{themeIds:request.selection.semanticThemeIds,requestedGivenNameLength:request.preferences.length,namePart:'given-name',stage:'pool'});
 reviewedDataNeed(originals.every(entry=>pool.some(row=>equal(row,entry))),'legacy generation pool union');
 const projection=fixed.imagery.project(pool,request.selection.objectThemes),context={packSha256:handle.publication.identity.basePackSha256,activeVersion:handle.publication.identity.basePackSha256.slice(0,12)},publication71=loadNamingEditorialV71Data(fixed.dataDir);
 validatePreferences(request.preferences,projection.characters,request.profile);
 // Exercise exactly the same single-character gate for explicitly required
 // glyphs. A non-adopted old-permitted glyph keeps its original7.1 path.
 for(const char of new Set((request.preferences.requiredChars+request.preferences.generationChar).replace(/[\s,，、]/gu,''))){
  const entry=originals.find(row=>row.char===char);reviewedDataNeed(entry,'required baseline glyph');
  assessNamingSemanticAdmission(handle,entry,{themeIds:request.selection.semanticThemeIds,requestedGivenNameLength:request.preferences.length,namePart:'given-name',stage:'required'});
 }
 const originalByChar=new Map(originals.map(entry=>[entry.char,entry]));
 const finalized=(givenName:string,characters:CharacterEntry[],origin:'local'|'ai',id:string):NameCandidate|null=>{
  const raw=evaluateNameForRuleVersionWithContext(NAMING_RULE_V71_VERSION,context,givenName,request.profile,request.preferences,request.analysis,characters,data.citations,origin);
  if(!raw)return null;raw.id=id;
  return reviewedServiceWarnings(finalizeNamingCandidateForRuleVersion(NAMING_RULE_V71_VERSION,raw,request.profile,request.preferences,request.analysis,context,publication71),request);
 };
 const recompute=(givenName:string,origin:'local'|'ai',candidateId:string,stage:SemanticAdmissionStage=origin):ReviewedNamingCandidateComputation|null=>{
  reviewedDataNeed(origin==='local'||origin==='ai','candidate origin');
  reviewedDataNeed(typeof candidateId==='string'&&candidateId.startsWith(REVIEWED_DATA_CANDIDATE_PREFIX)&&candidateId.length>REVIEWED_DATA_CANDIDATE_PREFIX.length,'candidate ID prefix');
  if(typeof givenName!=='string'||!/^\p{Script=Han}{1,2}$/u.test(givenName)||[...givenName].length!==request.preferences.length)return null;
  const baseline=finalized(givenName,originals,origin,candidateId),projected=finalized(givenName,projection.characters,origin,candidateId);
  // Both paths must satisfy the real original constraints. No semantic grant
  // overrides forbidden names, required glyphs, readings or phonetic checks.
  if(!baseline||!projected)return null;
  for(const field of ['sound','meaning','simplicity','distinctiveness'] as const)reviewedDataNeed(projected.evaluation[field]===baseline.evaluation[field],'imagery projection may only affect the existing traditional score: '+field);
  const rows:ReviewedDataSemanticUse['rows']=projected.characters.map((entry,position)=>{
   const original=originalByChar.get(entry.char);reviewedDataNeed(original,'complete baseline occurrence');
   const qualification=assessNamingSemanticAdmission(handle,original,occurrence(request,givenName,position,stage,candidateId)),adopted=qualification.status==='eligible';
   return {position,char:original.char,pinyin:original.pinyin,tone:original.tone,baselineCharacterSha256:reviewedDataDigest(original),projectedCharacterSha256:reviewedDataDigest(entry),adoptionStatus:adopted?'adopted':'not-adopted',qualification,adoption:adopted?createSemanticAdoptionReceiptV72(handle,original,occurrence(request,givenName,position,stage,candidateId)):null,project:adopted?qualification.project:null};
  });
  const projects=new Map(rows.flatMap(row=>row.adoptionStatus==='adopted'?[[row.position,row.project!.meaning] as const]:[]));
  const frame=describeNamingMeaningCompositionV7(context,givenName,request.profile,request.preferences,request.analysis,projected.characters,projected.citations,projected.style);
  let meaning=projected.meaning;
  if(projects.size){
   const existing=new Map<number,string>(),review=projected.namingMeaningReview;
   if(review?.version===NAMING_RULE_V71_VERSION)for(const row of review.rows){if(row.kind==='character-level-project-explanation'&&row.characterExplanation.status==='character-explanations-ready'){const note=row.characterExplanation.rows[0];if(!note.caseId.startsWith('single-meaning-m393:'))existing.set(row.position-1,note.projectMeaning);}}
   meaning='逐字取意（7.2项目说明；辞典原义另列）：'+frame.composition.parts.map(part=>`${part.char}：${projects.get(part.position)??existing.get(part.position)??part.text}`).join('；')+'。以上仅说明各字位的取意，不据单字许可确认整体组合含义、人格或未来结果。';
  }
  const replaced=new Set(frame.warningRows.filter(row=>row.kind==='unreviewed-character-meaning'&&row.position!==undefined&&projects.has(row.position)).map(row=>row.text)),warningRevisions:ReviewedDataSemanticUse['warningRevisions'][number][]=[];
  for(const row of rows)if(row.adoptionStatus==='adopted'){
   const prior=handle.publication.rows.find(item=>item.char===row.char)!.priorV7Review;
   if(prior.status==='approved'&&prior.automaticMeaningAllowed===false){
    const from=`${row.char}的限定用途需人工确认：${prior.scope}；${(prior.applicability as {reason:string}).reason}`;
    if(projected.warnings.includes(from)){
     const adopted=handle.publication.records.find(item=>item.identity.char===row.char)!;
     const to=`${row.char} · 本版按M752采用义项${adopted.identity.senseId}；旧7.0取意范围保留在历史记录，不转作本版准入条件。`;
     replaced.add(from);warningRevisions.push({position:row.position,char:row.char,from,to,reason:'versioned-admission-replaces-old-scope'});
    }
   }
  }
  const warnings=[...new Set([...projected.warnings.filter(warning=>!replaced.has(warning)),...warningRevisions.map(row=>row.to),...rows.flatMap(row=>row.project?row.project.limits.map(limit=>`${row.char} · 7.2取意限制：${limit}`):[])])];
  const candidate:NameCandidate={...projected,meaning,originalMeaning:meaning,reason:projects.size?'依据固定审核逐字取意；评分由原7.1算法按本版实际投影用字计算，逐字许可不增加语义分，也不认可完整姓名断语。':projected.reason,warnings};
  const semantic:ReviewedDataSemanticUse={publication:ownReviewedDataJson(handle.publication.identity),rows,warningRevisions,generatedMeaning:meaning,wholeNameMeaning:null,scoreDelta:0,explanationPolicy:'eligible-characterwise-only-otherwise-preserve-7.1'};
  const imagery=fixed.imagery.captureNameProvenance({candidateId,givenName},originals,request.selection.objectThemes);
  return {candidate,baseline,semantic,imagery};
 };
 return {resources:fixed,request,characters:projection.characters,citations:ownReviewedDataJson(data.citations),context,recompute};
}

export function createReviewedNamingGeneration(resources:ReviewedNamingDataResources,input:ReviewedNamingGenerationRequest){
 const fixedInput=copyReviewedNamingRequest(input),runtime=createReviewedNamingRecomputation(resources,fixedInput);
 return {
  characters:ownReviewedDataJson(runtime.characters),
  evaluate(givenName:string,origin:'local'|'ai',candidateId=REVIEWED_DATA_CANDIDATE_PREFIX+randomUUID()):NameCandidate|null{
   const current=createReviewedNamingRecomputation(resources,fixedInput);
   return current.recompute(givenName,origin,candidateId)?.candidate??null;
  },
  generateLocal(seed=0,excludeNames:string[]=[]):{candidates:NameCandidate[];messages:string[]}{
   reviewedDataNeed(Number.isFinite(seed),'generation seed');const excluded=ownReviewedDataJson(excludeNames);reviewedDataNeed(Array.isArray(excluded)&&excluded.every(name=>typeof name==='string'),'excluded name strings');
   const current=createReviewedNamingRecomputation(resources,fixedInput),request=current.request;
   const proposal=generateLocalForRuleVersionWithContext(NAMING_RULE_V71_VERSION,current.context,request.profile,request.preferences,request.analysis,current.characters,current.citations,seed,excluded);
   const candidates=proposal.candidates.flatMap(row=>{const result=current.recompute(row.givenName,'local',REVIEWED_DATA_CANDIDATE_PREFIX+randomUUID());return result?[result.candidate]:[];});
   return {candidates,messages:[...proposal.messages,'本批显式采用独立已审资料；逐字许可不增加语义分，物象投影按原算法参与元素筛选与传统分。']};
  },
 };
}
