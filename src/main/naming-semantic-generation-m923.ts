import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual as equal} from 'node:util';
import {semanticV72OwnRecord as own,semanticV72Plain as plain,semanticV72Freeze as freeze} from '../domain/naming-semantic-admission-v72';
import {generateLocalForRuleVersionWithContext} from '../domain/naming';
import {describeNamingMeaningCompositionV7} from '../domain/naming-v7';
import {loadNamingEditorialV71Data} from './naming-editorial-v7-data';
import {finalizeNamingCandidateForRuleVersion} from './naming-meaning-review';
import {getAuthenticatedM923Resources,refreshM921M923Family} from './naming-semantic-m923-data';
import {normalizeM923Constraints,checkM923PoolConstraints,checkM923CandidateConstraints} from './naming-semantic-m923-constraints';
import {M923RuntimeError,normalizeM923FamilySelection,normalizeM923ThemeIds,assessM921M923,issueM921M923Receipt,validateM921M923Receipt,validateAndAssessM921M923Saved} from './naming-semantic-m923';
import {M923_FAMILY,M923_GENERATION_SNAPSHOT_SCHEMA} from '../shared/naming-semantic-m923';
import type {CharacterEntry,NameCandidate} from '../shared/types';
import type {M921M923FamilyHandle,M923AdmissionRecord,M923Context,M923PoolContext,M923GenerationRequest,M923GeneratedCandidate,M923CandidateEvaluation,M923PoolResult,M923ErrorCode,M923Assessment,M923GenerationSnapshot} from '../shared/naming-semantic-m923';

const baseContext=Object.freeze({packSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',activeVersion:'1875aa49dcfa'});
const sourceDataDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../data');
const constraintInputs=(request:M923GenerationRequest)=>({profile:request.profile,preferences:request.preferences});
function need(value:unknown,code:M923ErrorCode='M923_CONTEXT_INVALID'):asserts value {if(!value)throw new M923RuntimeError(code);}
function fresh(handle:M921M923FamilyHandle){
  getAuthenticatedM923Resources(handle);
  const loaded=refreshM921M923Family(handle);
  if(!loaded.ok)throw new M923RuntimeError(loaded.code);
  return {handle:loaded.handle,resources:getAuthenticatedM923Resources(loaded.handle)};
}
function normalizeRequest(input:M923GenerationRequest,resources:ReturnType<typeof getAuthenticatedM923Resources>):M923GenerationRequest {
  const row=own(input,['profile','preferences','familySelection','themeIds'],['profile','preferences','familySelection','themeIds']);
  const familySelection=normalizeM923FamilySelection(row.familySelection),themeIds=normalizeM923ThemeIds(row.themeIds);
  const normalized=normalizeM923Constraints({profile:row.profile,preferences:row.preferences},resources.dataset);
  return freeze({profile:normalized.profile,preferences:normalized.preferences,familySelection,themeIds});
}
function poolContext(record:M923AdmissionRecord,request:M923GenerationRequest):M923PoolContext {
  return {stage:'pool',candidateCaseId:record.candidateCaseId,char:record.identity.char,selectedPinyin:record.identity.pinyin,tone:record.identity.tone as 1|2|3|4|5,senseId:record.identity.senseId,requestedGivenNameLength:request.preferences.length,namePart:'given-name',familySelection:request.familySelection,themeIds:request.themeIds};
}
function occurrence(record:M923AdmissionRecord,request:M923GenerationRequest,givenName:string,position:number,candidateId:string,stage:M923Context['stage']):M923Context {
  return {stage,candidateId,candidateCaseId:record.candidateCaseId,fullName:request.profile.surname+givenName,surname:request.profile.surname,givenName,position,char:record.identity.char,selectedPinyin:record.identity.pinyin,tone:record.identity.tone as 1|2|3|4|5,senseId:record.identity.senseId,givenNameLength:request.preferences.length,namePart:'given-name',familySelection:request.familySelection,themeIds:request.themeIds};
}
function renderedMeaning(base:NameCandidate,projects:Map<number,string>,request:M923GenerationRequest,normalized:ReturnType<typeof normalizeM923Constraints>):string {
  if(projects.size===0)return base.meaning;
  const frame=describeNamingMeaningCompositionV7(baseContext,base.givenName,request.profile,request.preferences,normalized.analysis,base.characters,base.citations,base.style);
  const prior=new Map<number,string>();
  if(base.namingMeaningReview?.version==='naming-editorial-7.1.0')for(const row of base.namingMeaningReview.rows){
    if(row.kind==='character-level-project-explanation'&&row.characterExplanation.status==='character-explanations-ready')prior.set(row.position-1,row.characterExplanation.rows[0].projectMeaning);
  }
  return '逐字取意（M923 项目说明；辞典原义另列）：'+frame.composition.parts.map(part=>`${part.char}：${projects.get(part.position)??prior.get(part.position)??part.text}`).join('；')+'。以上逐字许可不确认全名整体含义、人格或未来结果。';
}
/** Independent opt-in consumer. It has no Store, IPC, UI or default-version wiring. */
export function createNamingSemanticGenerationM923(original:M921M923FamilyHandle){
  need(arguments.length===1);
  getAuthenticatedM923Resources(original);
  function evaluateOwned(handle:M921M923FamilyHandle,request:M923GenerationRequest,givenName:string,origin:'local'|'ai',candidateId?:string):M923CandidateEvaluation {
    need(origin==='local'||origin==='ai');
    need(typeof givenName==='string'&&/^\p{Script=Han}{1,2}$/u.test(givenName)&&[...givenName].length===request.preferences.length,'M923_CANDIDATE_SCOPE_MISMATCH');
    const resources=getAuthenticatedM923Resources(handle),normalized=normalizeM923Constraints(constraintInputs(request),resources.dataset);
    const raw=checkM923CandidateConstraints(givenName,normalized,resources.dataset,origin);
    if(!raw)return {status:'blocked',candidate:null,code:'M923_BLOCKED_EXISTING_CONSTRAINTS'};
    if(candidateId)raw.id=candidateId;
    const base=finalizeNamingCandidateForRuleVersion('naming-editorial-7.1.0',raw,request.profile,request.preferences,normalized.analysis,baseContext,loadNamingEditorialV71Data(sourceDataDir));
    const receipts:M923GenerationSnapshot['rows'][number][]=[],projects=new Map<number,string>();
    for(const [position,char] of [...givenName].entries()){
      const record=resources.records.find(row=>row.identity.char===char);
      if(!record){receipts.push({position,char,adoption:null,project:null});continue;}
      // Required-character admission uses the actual finalized combination too.
      if((request.preferences.requiredChars+request.preferences.generationChar).includes(char)){
        const required=assessM921M923(handle,{...occurrence(record,request,givenName,position,base.id,'required'),stage:'required'},constraintInputs(request));
        if(!required.ok)return {status:'blocked',candidate:null,code:required.code};
      }
      const context={...occurrence(record,request,givenName,position,base.id,origin),stage:origin};
      const assessment=assessM921M923(handle,context,constraintInputs(request));
      if(!assessment.ok)return {status:'blocked',candidate:null,code:assessment.code};
      receipts.push({position,char,adoption:issueM921M923Receipt(handle,context,constraintInputs(request)),project:structuredClone(assessment.project)});
      projects.set(position,assessment.project.meaning);
    }
    const generatedMeaning=renderedMeaning(base,projects,request,normalized);
    const frame=describeNamingMeaningCompositionV7(baseContext,base.givenName,request.profile,request.preferences,normalized.analysis,base.characters,base.citations,base.style);
    const replacedWarnings=new Set(frame.warningRows.filter(row=>row.kind==='unreviewed-character-meaning'&&row.position!==undefined&&projects.has(row.position)).map(row=>row.text));
    const snapshot:M923GenerationSnapshot={schema:M923_GENERATION_SNAPSHOT_SCHEMA,...M923_FAMILY,constraintEngineId:normalized.constraintEngineId,constraintContextSHA256:normalized.constraintContextSHA256,candidateId:base.id,fullName:base.fullName,givenName:base.givenName,themeIds:request.themeIds,familySelection:request.familySelection,generationOrigin:origin,rows:receipts,generatedMeaning,baseMeaning:base.meaning,baseReason:base.reason,baseWarnings:[...base.warnings],wholeNameMeaning:null,projectWish:null,scoreDelta:0};
    const candidate:M923GeneratedCandidate={...base,meaning:generatedMeaning,originalMeaning:generatedMeaning,
      reason:projects.size?'按 M923 固定审核逐字取意；评分沿用原有比较规则，完整组合保留独立依据或待审。':base.reason,
      warnings:[...new Set([...base.warnings.filter(warning=>!replacedWarnings.has(warning)),...receipts.flatMap(row=>row.project?row.project.limits.map(limit=>`${row.char} · M923取意限制：${limit}`):[])])],semanticAdoptionM923:snapshot};
    need(equal(candidate.evaluation,base.evaluation),'M923_REJECTED_INTEGRITY');
    return {status:'generated',candidate};
  }
  return Object.freeze({
    pool(input:M923GenerationRequest,legacyEligiblePool:readonly CharacterEntry[]):M923PoolResult {
      const {handle,resources}=fresh(original),request=normalizeRequest(input,resources);
      plain(legacyEligiblePool);need(Array.isArray(legacyEligiblePool));
      need(new Set(legacyEligiblePool.map(entry=>entry.char)).size===legacyEligiblePool.length,'M923_REJECTED_INTEGRITY');
      for(const entry of legacyEligiblePool)need(equal(entry,resources.dataset.characters.find(fixed=>fixed.char===entry.char)),'M923_REJECTED_INTEGRITY');
      const normalized=normalizeM923Constraints(constraintInputs(request),resources.dataset);
      const pool=new Map(legacyEligiblePool.filter(entry=>checkM923PoolConstraints(entry.char,normalized,resources.dataset)).map(entry=>[entry.char,entry])),eligibleAdopted:string[]=[];
      for(const record of resources.records){
        const result=assessM921M923(handle,poolContext(record,request),constraintInputs(request));
        if(!result.ok)continue;
        const entry=resources.dataset.characters.find(entry=>entry.char===record.identity.char)!;
        pool.set(entry.char,entry);eligibleAdopted.push(record.candidateCaseId);
      }
      return freeze({pool:[...pool.values()],eligibleAdopted,defaultCoverageDelta:0});
    },
    /** Preflight only: the required stage itself needs a real name and is rerun in evaluateOwned. */
    required(input:M923GenerationRequest):Array<{char:string;result:M923Assessment}> {
      const {handle,resources}=fresh(original),request=normalizeRequest(input,resources);
      const chars=[...new Set((request.preferences.requiredChars+request.preferences.generationChar).replace(/[\s,，、]/gu,''))];
      return chars.flatMap(char=>{const record=resources.records.find(row=>row.identity.char===char);return record?[{char,result:assessM921M923(handle,poolContext(record,request),constraintInputs(request))}]:[];});
    },
    evaluate(input:M923GenerationRequest,givenName:string,origin:'local'|'ai'='local'):M923CandidateEvaluation {
      const {handle,resources}=fresh(original);return evaluateOwned(handle,normalizeRequest(input,resources),givenName,origin);
    },
    generateLocal(input:M923GenerationRequest,seed=0,excludeNames:string[]=[]){
      need(Number.isFinite(seed));plain(excludeNames);need(Array.isArray(excludeNames)&&excludeNames.every(name=>typeof name==='string'));
      const {handle,resources}=fresh(original),request=normalizeRequest(input,resources),normalized=normalizeM923Constraints(constraintInputs(request),resources.dataset);
      const local=generateLocalForRuleVersionWithContext('naming-editorial-7.1.0',baseContext,request.profile,request.preferences,normalized.analysis,resources.dataset.characters,resources.dataset.citations,seed,excludeNames);
      const candidates=local.candidates.flatMap(proposal=>{const result=evaluateOwned(handle,request,proposal.givenName,'local',proposal.id);return result.status==='generated'?[result.candidate]:[];});
      return {candidates,messages:[...local.messages,'M923 仅逐字采用已审释义，不增加全名含义或评分许可。']};
    },
    evaluateAiProposals(input:M923GenerationRequest,proposals:readonly unknown[]):M923CandidateEvaluation[] {
      plain(proposals);need(Array.isArray(proposals)&&proposals.length<=36);
      const {handle,resources}=fresh(original),request=normalizeRequest(input,resources);
      return proposals.map(proposal=>{const row=own(proposal,['givenName'],['givenName']);need(typeof row.givenName==='string');return evaluateOwned(handle,request,row.givenName,'ai');});
    },
    verifySaved(candidate:M923GeneratedCandidate,input:M923GenerationRequest,stage:'save'|'restore'):{ok:true;stage:'save'|'restore';receiptCount:number}|{ok:false;code:M923ErrorCode} {
      try {
        plain(candidate);need(stage==='save'||stage==='restore');
        need(typeof candidate.favorite==='boolean'&&typeof candidate.reviewNote==='string','M923_REJECTED_INTEGRITY');
        const {handle,resources}=fresh(original),request=normalizeRequest(input,resources),snapshot=candidate.semanticAdoptionM923;
        need(snapshot?.schema===M923_GENERATION_SNAPSHOT_SCHEMA&&equal(snapshot.familySelection,request.familySelection),'M923_REJECTED_INTEGRITY');
        // Bind EVERY snapshot to its saved effective inputs, including names
        // without an M923-adopted position. A receipt loop alone cannot do this.
        // This is deterministic integrity, not a signature or a retroactive
        // upgrade of unpublished snapshot/1 results.
        const normalized=normalizeM923Constraints(constraintInputs(request),resources.dataset);
        need(snapshot.constraintEngineId===normalized.constraintEngineId&&snapshot.constraintContextSHA256===normalized.constraintContextSHA256,'M923_REJECTED_INTEGRITY');
        need((candidate.origin==='local'||candidate.origin==='ai')&&snapshot.generationOrigin===candidate.origin&&Array.isArray(snapshot.rows)&&snapshot.rows.length===[...candidate.givenName].length,'M923_REJECTED_INTEGRITY');
        // Validate all required receipts before any fresh name qualification.
        for(const [position,char] of [...candidate.givenName].entries()){
          const record=resources.records.find(row=>row.identity.char===char),row=snapshot.rows[position];
          need(row?.position===position&&row.char===char,'M923_REJECTED_INTEGRITY');
          if(!record){need(row.adoption===null&&row.project===null,'M923_REJECTED_INTEGRITY');continue;}
          need(row.adoption!==null,'M923_REJECTED_INTEGRITY');
          const validated=validateM921M923Receipt(handle,row.adoption,occurrence(record,request,candidate.givenName,position,candidate.id,stage),constraintInputs(request));
          if(!validated.ok)return {ok:false,code:validated.code};
        }
        for(const row of snapshot.rows)if(row.adoption){
          const record=resources.records.find(record=>record.candidateCaseId===row.adoption!.candidateCaseId)!;
          const assessed=validateAndAssessM921M923Saved(handle,{context:{...occurrence(record,request,candidate.givenName,row.position,candidate.id,stage),stage},receipt:row.adoption,constraints:constraintInputs(request)});
          if(!assessed.ok)return {ok:false,code:assessed.code};
        }
        const actual=evaluateOwned(handle,request,candidate.givenName,candidate.origin,candidate.id);
        need(actual.status==='generated','M923_REJECTED_INTEGRITY');
        need(equal(actual.candidate.semanticAdoptionM923,snapshot),'M923_REJECTED_INTEGRITY');
        for(const field of ['id','givenName','fullName','pinyin','characters','citations','evaluation','meaning','originalMeaning','reason','traditionalReason','style','origin','warnings','namingMeaningReview'] as const)need(equal(actual.candidate[field],candidate[field]),'M923_REJECTED_INTEGRITY');
        need(Object.keys(candidate).every(key=>Object.hasOwn(actual.candidate,key)),'M923_REJECTED_INTEGRITY');
        return {ok:true,stage,receiptCount:snapshot.rows.filter(row=>row.adoption!==null).length};
      }catch(error){return {ok:false,code:error instanceof M923RuntimeError?error.code:'M923_REJECTED_INTEGRITY'};}
    },
  });
}
