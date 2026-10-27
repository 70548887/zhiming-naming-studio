import {isDeepStrictEqual as equal} from 'node:util';
import {evaluateNameForRuleVersionWithContext,generateLocalForRuleVersionWithContext,validatePreferences} from '../domain/naming';
import {describeNamingMeaningCompositionV7} from '../domain/naming-v7';
import {assessNamingSemanticAdmission,createSemanticAdoptionReceiptV72,verifyNamingSemanticAdoptionReceipt,unionSemanticGenerationPoolV72,semanticV72Freeze as freeze,semanticV72Need as need,semanticV72Plain,semanticV72OwnRecord,semanticV72Canonical,normalizeSemanticAdmissionContextV72,assertSemanticLegacyReplayV72,assertNamingSemanticOutput} from '../domain/naming-semantic-admission-v72';
import {isAuthenticatedSemanticAdmissionV72,refreshSemanticAdmissionV72,semanticAdmissionDatasetV72} from './naming-semantic-admission-v72-data';
import {loadNamingEditorialV71Data} from './naming-editorial-v7-data';
import {finalizeNamingCandidateForRuleVersion,verifyNamingMeaningReviewSnapshot} from './naming-meaning-review';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../shared/naming-rules';
import {NAMING_EDITORIAL_V72_VERSION,NAMING_EDITORIAL_V72_SOURCE_ID} from '../shared/naming-semantic-admission-v72';
import type {CharacterEntry,NameCandidate} from '../shared/types';
import type {SemanticAdmissionHandle,SemanticAdmissionContext,SemanticAdmissionStage,SemanticGenerationRequestV72,SemanticCandidateEvaluationV72,SemanticGeneratedCandidateV72,SemanticAdoptionSnapshotV72,SemanticReplayAssertion} from '../shared/naming-semantic-admission-v72';

const baseContext={packSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',activeVersion:'1875aa49dcfa'};
const requestKeys=['profile','preferences','analysis','themeIds'];
const basePublications=new WeakMap<object,ReturnType<typeof loadNamingEditorialV71Data>>();
function basePublication(handle:SemanticAdmissionHandle){let data=basePublications.get(handle);if(!data){data=loadNamingEditorialV71Data(semanticSourceDirectory(handle));basePublications.set(handle,data);}return data;}
function requestCopy(request:SemanticGenerationRequestV72):SemanticGenerationRequestV72 {
 semanticV72OwnRecord(request,requestKeys,requestKeys);
 const copy=structuredClone(request);
 need(Array.isArray(copy.themeIds),'explicit themeIds');
 // Check the common, name-independent context even when no added row occurs.
 normalizeSemanticAdmissionContextV72({themeIds:copy.themeIds,requestedGivenNameLength:copy.preferences.length,namePart:'given-name',stage:'pool'});
 return copy;
}
const occurrence=(request:SemanticGenerationRequestV72,givenName:string,position:number,stage:SemanticAdmissionStage,candidateId?:string):SemanticAdmissionContext=>({themeIds:request.themeIds,requestedGivenNameLength:request.preferences.length,namePart:'given-name',stage,givenName,fullName:request.profile.surname.trim()+givenName,position,...(candidateId?{candidateId}:{})});
function qualify(handle:SemanticAdmissionHandle,request:SemanticGenerationRequestV72,givenName:string,stage:SemanticAdmissionStage):SemanticCandidateEvaluationV72['qualifications'] {
 const data=semanticAdmissionDatasetV72(handle);
 return [...givenName].flatMap((char,position)=>{
  if(!handle.publication.records.some(row=>row.identity.char===char))return[];
  const entry=data.characters.find(entry=>entry.char===char);
  need(entry,'candidate glyph absent');
  return[{position,char,result:assessNamingSemanticAdmission(handle,entry,occurrence(request,givenName,position,stage))}];
 });
}
function renderCharacterwise(base:NameCandidate,projects:Map<number,string>,handle:SemanticAdmissionHandle,request:SemanticGenerationRequestV72):string {
 if(projects.size===0)return base.meaning;
 const frame=describeNamingMeaningCompositionV7(baseContext,base.givenName,request.profile,request.preferences,request.analysis,base.characters,base.citations,base.style);
 const adoptedNotes=new Map<number,string>();
 const review=base.namingMeaningReview;
 if(review?.version===NAMING_RULE_V71_VERSION)for(const row of review.rows){
  if(row.kind==='character-level-project-explanation'&&row.characterExplanation.status==='character-explanations-ready'){
   const note=row.characterExplanation.rows[0];
   if(!note.caseId.startsWith('single-meaning-m393:'))adoptedNotes.set(row.position-1,note.projectMeaning);
  }
 }
 const lines=frame.composition.parts.map(part=>`${part.char}：${projects.get(part.position)??adoptedNotes.get(part.position)??part.text}`);
 void handle;
 return '逐字取意（7.2项目说明；辞典原义另列）：'+lines.join('；')+'。以上仅说明各字位的取意，不据单字许可确认整体组合含义、人格或未来结果。';
}
function finalize(handle:SemanticAdmissionHandle,base:NameCandidate,request:SemanticGenerationRequestV72,stage:'local'|'ai'):SemanticGeneratedCandidateV72 {
 const qualifications=qualify(handle,request,base.givenName,stage);
 need(qualifications.every(row=>row.result.status==='eligible'),'not every adopted position is eligible');
 const newPositions=new Set(qualifications.map(row=>row.position)),projects=new Map(qualifications.map(row=>[row.position,row.result.project!.meaning]));
 const generatedMeaning=renderCharacterwise(base,projects,handle,request);
 const frame=describeNamingMeaningCompositionV7(baseContext,base.givenName,request.profile,request.preferences,request.analysis,base.characters,base.citations,base.style);
 // Suppress only exact structured unreviewed-character rows whose actual
 // positions gained a7.2 grant. All source/polyphony/phonetic/AI cautions stay.
 const replacedWarnings=new Set(frame.warningRows.filter(row=>row.kind==='unreviewed-character-meaning'&&row.position!==undefined&&newPositions.has(row.position)).map(row=>row.text));
 const warningRevisions:SemanticAdoptionSnapshotV72['warningRevisions'][number][]=[];
 for(const item of qualifications){
  // The old text is reconstructed from the exact pinned7.0 review, not matched
  // by prose patterns. That review belongs to the old selected sense/scope.
  const oldReview=handle.publication.rows.find(row=>row.char===item.char)!.priorV7Review;
  if(oldReview.status==='approved'&&oldReview.automaticMeaningAllowed===false){
   const scope=oldReview.scope,applicability=oldReview.applicability as {reason:string};
   const from=`${item.char}的限定用途需人工确认：${scope}；${applicability.reason}`;
   if(base.warnings.includes(from)){
    const adopted=handle.publication.records.find(row=>row.identity.char===item.char)!;
    const to=`${item.char} · 本版按M752采用义项${adopted.identity.senseId}；旧7.0取意范围保留在历史记录，不转作本版准入条件。`;
    replacedWarnings.add(from);warningRevisions.push({position:item.position,char:item.char,from,to,reason:'versioned-admission-replaces-old-scope'});
   }
  }
 }
 const addedWarnings=qualifications.flatMap(row=>row.result.project!.limits.map(limit=>`${row.char} · 7.2取意限制：${limit}`));
 const snapshot:SemanticAdoptionSnapshotV72={schema:'naming-semantic-generation-snapshot/1',ruleVersion:NAMING_EDITORIAL_V72_VERSION,sourceId:NAMING_EDITORIAL_V72_SOURCE_ID,publication:structuredClone(handle.publication.identity),candidateId:base.id,fullName:base.fullName,givenName:base.givenName,requestedGivenNameLength:request.preferences.length,themeIds:[...request.themeIds].sort(),rows:base.characters.map((entry,position)=>{
  const qualification=qualifications.find(row=>row.position===position);
  return {position,char:entry.char,status:qualification?.result.status??'not-admitted',adoption:qualification?createSemanticAdoptionReceiptV72(handle,entry,occurrence(request,base.givenName,position,stage,base.id)):null,project:qualification?structuredClone(qualification.result.project):null};
 }),baseRuleVersion:NAMING_RULE_V71_VERSION,baseMeaning:base.meaning,baseReason:base.reason,baseWarnings:[...base.warnings],warningRevisions,generationOrigin:stage,generatedMeaning,wholeNameMeaning:null,scoreDelta:0};
 const candidate={...base,meaning:generatedMeaning,originalMeaning:generatedMeaning,reason:projects.size?'依据7.2固定审核逐字取意，保留旧版的约束及原始比较评分；本次逐字许可不认可完整姓名断语。':base.reason,warnings:[...new Set([...base.warnings.filter(warning=>!replacedWarnings.has(warning)),...warningRevisions.map(row=>row.to),...addedWarnings])],semanticAdoption72:snapshot};
 need(assertNamingSemanticOutput(null,{scoreDelta:snapshot.scoreDelta,wholeNameMeaning:snapshot.wholeNameMeaning,generatedText:candidate.meaning,expectedText:renderCharacterwise(base,projects,handle,request)}).ok,'noncanonical generated output');
 need(equal(candidate.evaluation,base.evaluation),'new admission cannot alter scores');
 return candidate;
}
function evaluateOwned(handle:SemanticAdmissionHandle,request:SemanticGenerationRequestV72,givenName:string,origin:'local'|'ai',candidateId?:string):SemanticCandidateEvaluationV72 {
 need(typeof givenName==='string'&&/^\p{Script=Han}{1,2}$/u.test(givenName)&&[...givenName].length===request.preferences.length,'candidate glyph/length');
 const qualifications=qualify(handle,request,givenName,origin);
 if(qualifications.some(row=>row.result.status!=='eligible'))return{status:'blocked-admission',candidate:null,qualifications};
 const data=semanticAdmissionDatasetV72(handle),raw=evaluateNameForRuleVersionWithContext(NAMING_RULE_V7_VERSION,baseContext,givenName,request.profile,request.preferences,request.analysis,data.characters,data.citations,origin);
 if(!raw)return{status:'blocked-existing-constraints',candidate:null,qualifications};
 if(candidateId)raw.id=candidateId;
 const source=basePublication(handle);
 const base=finalizeNamingCandidateForRuleVersion(NAMING_RULE_V71_VERSION,raw,request.profile,request.preferences,request.analysis,baseContext,source);
 return{status:'generated',candidate:finalize(handle,base,request,origin),qualifications};
}
// Data path is held by the private main registry, never read from a candidate.
import {semanticAdmissionSourceDirectoryV72 as semanticSourceDirectory} from './naming-semantic-admission-v72-data';

/** Opt-in next-version consumer only. This is not reachable through CURRENT,
 * StudioService, IPC, Store or UI until a separate integration change. */
export function createNamingSemanticGenerationV72(original:SemanticAdmissionHandle){
 need(isAuthenticatedSemanticAdmissionV72(original),'main-authenticated fixed handle required');
 const fresh=()=>refreshSemanticAdmissionV72(original);
 return Object.freeze({
  assess(entry:CharacterEntry,context:SemanticAdmissionContext){return assessNamingSemanticAdmission(fresh(),entry,context);},
  pool(legacyEligiblePool:readonly CharacterEntry[],context:SemanticAdmissionContext){return unionSemanticGenerationPoolV72(fresh(),legacyEligiblePool,context);},
  required(request:SemanticGenerationRequestV72){const fixed=requestCopy(request),handle=fresh(),data=semanticAdmissionDatasetV72(handle);validatePreferences(fixed.preferences,data.characters,fixed.profile);const chars=[...new Set((fixed.preferences.requiredChars+fixed.preferences.generationChar).replace(/[\s,，、]/gu,''))];return chars.flatMap(char=>{const record=handle.publication.records.find(row=>row.identity.char===char);if(!record)return[];const entry=data.characters.find(entry=>entry.char===char)!;return[{char,result:assessNamingSemanticAdmission(handle,entry,{themeIds:fixed.themeIds,requestedGivenNameLength:fixed.preferences.length,namePart:'given-name',stage:'required'})}];});},
  evaluate(request:SemanticGenerationRequestV72,givenName:string,origin:'local'|'ai'='local'){need(origin==='local'||origin==='ai','candidate origin');return evaluateOwned(fresh(),requestCopy(request),givenName,origin);},
  generateLocal(request:SemanticGenerationRequestV72,seed=0,excludeNames:string[]=[]){
   const fixed=requestCopy(request),handle=fresh(),data=semanticAdmissionDatasetV72(handle);validatePreferences(fixed.preferences,data.characters,fixed.profile);
   const required=[...new Set((fixed.preferences.requiredChars+fixed.preferences.generationChar).replace(/[\s,，、]/gu,''))];
   for(const char of required){const entry=data.characters.find(row=>row.char===char)!;if(handle.publication.records.some(row=>row.identity.char===char)&&assessNamingSemanticAdmission(handle,entry,{themeIds:fixed.themeIds,requestedGivenNameLength:fixed.preferences.length,namePart:'given-name',stage:'required'}).status!=='eligible')return{candidates:[],messages:[`指定字${char}未满足7.2本条准入；不以待审记录补足名额。`]};}
   // Preserve all legacy generation candidates outside this new declared set.
   // Only newly declared pending/theme-restricted cases are gated here.
   const pool=data.characters.filter(entry=>!handle.publication.records.some(row=>row.identity.char===entry.char)||assessNamingSemanticAdmission(handle,entry,{themeIds:fixed.themeIds,requestedGivenNameLength:fixed.preferences.length,namePart:'given-name',stage:'pool'}).status==='eligible');
   const local=generateLocalForRuleVersionWithContext(NAMING_RULE_V71_VERSION,baseContext,fixed.profile,fixed.preferences,fixed.analysis,pool,data.citations,seed,excludeNames);
   const candidates=local.candidates.flatMap(proposal=>{const result=evaluateOwned(handle,fixed,proposal.givenName,'local',proposal.id);return result.candidate?[result.candidate]:[];});
   return{candidates,messages:[...local.messages,'7.2逐字采用条件已按固定record核对；实际少于12个时不回退到待审条目。']};
  },
  evaluateAiProposals(request:SemanticGenerationRequestV72,proposals:readonly unknown[]){
   semanticV72Plain(proposals);need(Array.isArray(proposals)&&proposals.length<=36,'AI string proposal budget');
   const fixed=requestCopy(request),handle=fresh();
   return proposals.map(proposal=>{const row=semanticV72OwnRecord(proposal,['givenName'],['givenName']);need(typeof row.givenName==='string','AI proposes glyph strings only');return evaluateOwned(handle,fixed,row.givenName,'ai');});
  },
  verifySaved(candidate:SemanticGeneratedCandidateV72,request:SemanticGenerationRequestV72,stage:'save'|'restore'){
   semanticV72Plain(candidate);need(stage==='save'||stage==='restore','replay stage');
   const fixed=requestCopy(request),handle=fresh(),snapshot=candidate.semanticAdoption72;
   need(snapshot?.ruleVersion===NAMING_EDITORIAL_V72_VERSION&&equal(snapshot.publication,handle.publication.identity),'saved publication/version');
   need((candidate.origin==='local'||candidate.origin==='ai')&&snapshot.generationOrigin===candidate.origin,'saved generation origin');
   // Receipt validation precedes qualification so changed themes/sense/name
   // are integrity failures rather than a fresh needs-theme result.
   for(const row of snapshot.rows)if(row.adoption){const entry=candidate.characters[row.position];verifyNamingSemanticAdoptionReceipt(handle,entry,occurrence(fixed,candidate.givenName,row.position,stage,candidate.id),row.adoption);}
   const actual=evaluateOwned(handle,fixed,candidate.givenName,candidate.origin,candidate.id);need(actual.candidate,'saved candidate no longer qualifies');
   need(semanticV72Canonical(actual.candidate.semanticAdoption72)===semanticV72Canonical(snapshot),'saved context/prose/occurrence changed');
   for(const field of ['fullName','pinyin','characters','citations','evaluation','meaning','originalMeaning','reason','traditionalReason','style','origin','warnings','namingMeaningReview'] as const)need(equal(actual.candidate[field],candidate[field]),'saved candidate fact '+field);
   return{ok:true as const,stage,receiptCount:snapshot.rows.filter(row=>row.adoption).length};
  },
  replayLegacy(candidate:NameCandidate):{candidate:NameCandidate;assertion:SemanticReplayAssertion}{
   semanticV72Plain(candidate);need(!Object.hasOwn(candidate,'semanticAdoption72'),'old candidate cannot gain new receipt');
   verifyNamingMeaningReviewSnapshot(candidate,{namingRules:{version:NAMING_RULE_V71_VERSION,sourceId:'naming-character-meanings-v7.1-fixed',dataVersion:baseContext.activeVersion}},baseContext);
   const preserved=structuredClone(candidate);return{candidate:preserved,assertion:assertSemanticLegacyReplayV72(candidate,preserved)};
  },
 });
}
