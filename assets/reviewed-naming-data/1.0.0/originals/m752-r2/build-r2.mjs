import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const dir=path.dirname(fileURLToPath(import.meta.url));
const old=path.dirname(dir),audit='D:/Codex-NamingStudio-Evidence/m762-meaning-contract-audit/M762-AUDIT.json';
export const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const jsonBytes=v=>Buffer.from(JSON.stringify(v,null,2)+'\n','utf8');
export function buildArtifacts(){
 const originals=[];
 const get=name=>{const bytes=fs.readFileSync(path.join(old,name)); originals.push({file:name,bytes:bytes.length,sha256:hash(bytes)});return{bytes,value:JSON.parse(bytes)};};
 const rows=get('m740-generation-admission.json'),themes=get('theme-registry.json'),priorContract=get('generation-admission-contract.json'),oldCases=get('acceptance-cases.json');
 const auditBytes=fs.readFileSync(audit),auditData=JSON.parse(auditBytes);
 const legacyInputPath='D:/Codex-NamingStudio-Evidence/m751-meaning-admission/tests/fixtures/naming71-accepted40.json';
 const legacyInputBytes=fs.readFileSync(legacyInputPath);
 const legacyDependency={status:'depends-on-M751-actual-replay',input:{path:legacyInputPath,sha256:hash(legacyInputBytes),kind:'fixed40-golden-input-not-full-NameCandidate'},method:'M751 actual fixed loader -> evaluateNameForRuleVersionWithContext(7.0) -> finalize(7.1); generate 南安/南木 and compare before/after JSON bytes plus receipt; separate runtime receipt required',executedHere:false};
 if(auditData.auditId!=='M762-DATA-DECISION')throw Error('M762 identity');
 const records=rows.value.records,byChar=new Map(records.map(r=>[r.identity.char,r]));
 const assessStates=priorContract.value.runtimeStates;
 const stages=['pool','required','local','ai','save','restore'];
 const validBase=(r,length=r.candidateConstraints.givenNameLengths[0]??2)=>({
   id:'baseline:'+r.candidateCaseId,recordRef:'m740-generation-admission.json#/records/'+records.indexOf(r),
   verifiedPublicationRef:'fixed-source-loader-result',recordId:r.candidateCaseId,
   entryRef:'exact-baseline-record-from-M740',
   context:{candidateId:'m752-r2-case-'+records.indexOf(r),namePart:'given-name',selectedPinyin:r.identity.pinyin,tone:r.identity.tone,senseId:r.identity.senseId,
     themeIds:r.decision==='pending'?[]:r.usage.mode==='explicit-themes'?[...r.usage.anyOf]:[],requestedGivenNameLength:length,
     surname:'林',givenName:length===1?r.identity.char:r.identity.char+'年',fullName:'林'+(length===1?r.identity.char:r.identity.char+'年'),position:0},
   receiptPreparation:'Qualification-only assess needs no receipt and can return pending/needs-theme at every caller stage. Receipt-validation cases require an actual eligible producer receipt; a pending row can never supply one. Actual storage/restore success additionally requires the receipt-validation gate.',
 });
 const baselines=records.map(r=>validBase(r));
 const operationFor=id=>id==='PAST-SNAPSHOT'?'legacy-replay':['NO-BONUS','FULL-NAME-CLAIM'].includes(id)?'output-assertion':'assess';
 const outputCodes={'NO-BONUS':'reject-semantic-credit','FULL-NAME-CLAIM':'reject-unreviewed-claim'};
 const expectations=oldCases.value.fixtures.map(f=>{
   const r=byChar.get(f.char); if(!r)throw Error('unknown fixture char '+f.id);
   const operation=operationFor(f.id); const base={id:f.id,action:operation,baselineRef:'baseline:'+r.candidateCaseId,description:f.reason,productExecution:'not-run'};
   if(operation==='legacy-replay')return{...base,stage:'restore',legacyFixtureRef:'dependencies.legacyReplay',dependencyStatus:'depends-on-M751-actual-replay',mutation:{admissionRecordWouldNowBeAvailable:true},expected:{assertionKind:'preserve-legacy',ok:true,oldBytesUnchanged:true,noNewReceipt:true}};
   if(operation==='output-assertion')return{...base,stage:'local',candidateOutputPatch:f.id==='NO-BONUS'?{scoreDelta:10}:{wholeNameMeaning:'孩子必定长寿'},expected:{assertionKind:outputCodes[f.id],ok:false},prerequisite:'Assess result may be eligible; these assertions inspect output and never add assess statuses.'};
   const inputPatch={},faultInjection={};
   const c=f.context??{};
   for(const k of ['selectedPinyin','tone','namePart','themeIds','surname','fullName','givenName','position','requiredChars','memorialEvent','familySignature','freeText','familyIndustry','wholeNameReview','existingParentAvoidanceHit'])if(Object.hasOwn(c,k))inputPatch[k]=c[k];
   if(Object.hasOwn(c,'givenNameLength'))inputPatch.requestedGivenNameLength=c.givenNameLength;
   const baseline=baselines.find(b=>b.recordId===r.candidateCaseId).context;
   if(Object.hasOwn(c,'givenNameLength')&&!Object.hasOwn(c,'givenName'))inputPatch.givenName=c.givenNameLength===1?r.identity.char:r.identity.char+'年';
   if(Object.hasOwn(inputPatch,'surname')||Object.hasOwn(inputPatch,'givenName'))inputPatch.fullName=(inputPatch.surname??baseline.surname)+(inputPatch.givenName??baseline.givenName);
   if(Object.hasOwn(c,'definitionIndex'))faultInjection.rawDefinitionIndex=c.definitionIndex;
   if(c.source&&c.source!=='verified-fixed-publication')faultInjection.source=c.source;
   if(c.aiClaimsApproved)faultInjection.callerApproved=true;
   if(f.id==='BLOCKED-PARENT')faultInjection.existingConstraintResult='blocked';
   return{...base,assessmentScope:'qualification',stage:f.id==='AI-CLAIM'?'ai':f.id==='FORCE-YE'?'required':'local',inputPatch,faultInjection,expected:{status:f.expected}};
 });
 expectations.push({id:'OUTPUT-VALID',action:'output-assertion',stage:'local',baselineRef:'baseline:'+byChar.get('纪').candidateCaseId,candidateOutputPatch:{scoreDelta:0,wholeNameMeaning:null,projectTextRef:'admitted-record-exact-project-text'},expected:{assertionKind:null,ok:true},productExecution:'not-run'});
 const matrix=[];
 for(const r of records)for(const stage of stages){
  matrix.push({id:'STAGE-'+r.identity.char+'-'+stage,action:'assess',stage,baselineRef:'baseline:'+r.candidateCaseId,inputPatch:{},faultInjection:{},expected:{status:r.decision==='pending'?'pending-source-identity':'eligible'},productExecution:'not-run'});
  if(r.decision==='allow-single-character-generation'&&r.usage.mode==='explicit-themes')matrix.push({id:'STAGE-'+r.identity.char+'-'+stage+'-no-theme',action:'assess',stage,baselineRef:'baseline:'+r.candidateCaseId,inputPatch:{themeIds:[]},faultInjection:{},expected:{status:'needs-theme'},productExecution:'not-run'});
 }
 for(const stage of stages){
  matrix.push({id:'LEAF-BAD-THEME-'+stage,action:'assess',stage,baselineRef:'baseline:'+byChar.get('叶').candidateCaseId,inputPatch:{themeIds:[null]},faultInjection:{},expected:{status:'rejected-integrity'},productExecution:'not-run'});
  matrix.push({id:'LEAF-BAD-ID-'+stage,action:'assess',stage,baselineRef:'baseline:'+byChar.get('叶').candidateCaseId,inputPatch:{},faultInjection:{candidateCaseId:'pending'},expected:{status:'rejected-integrity'},productExecution:'not-run'});
 }
 for(const char of ['纪','邦'])for(const stage of ['save','restore'])matrix.push({id:'RECEIPT-TAMPER-'+char+'-'+stage,action:'assess',stage,baselineRef:'baseline:'+byChar.get(char).candidateCaseId,inputPatch:{},faultInjection:{receiptContextDigest:'changed'},expected:{status:'rejected-integrity'},productExecution:'not-run'});
 for(const fault of ['missing-source','changed-selected-reading','changed-senseId','changed-fullName','changed-position'])for(const stage of ['save','restore'])matrix.push({id:'RECEIPT-'+fault+'-'+stage,action:'assess',stage,baselineRef:'baseline:'+byChar.get('纪').candidateCaseId,inputPatch:{},faultInjection:{receiptOrSource:fault},expected:{status:fault==='missing-source'?'source-unavailable':'rejected-integrity'},productExecution:'not-run'});
 for(const x of matrix)x.assessmentScope=x.id.startsWith('RECEIPT-')?'receipt-validation':'qualification';
 const conflicts=[...new Set(records.flatMap(r=>r.conflictIds))].map(id=>({
  id,kind:id==='source-identity'?'source-admission':id.startsWith('other-reading:')?'reading-alias-warning':id.startsWith('association:')?'display-association':'excluded-interpretation',
  affectsAssess:id==='source-identity'||id.startsWith('other-reading:'),
  predicateRef:id==='source-identity'?'record.decision / sourceIdentityDecision':id.startsWith('other-reading:')?'exact-machine-selectedPinyin-and-tone':null,
  enforcement:id==='source-identity'?'valid pending record -> pending-source-identity':id.startsWith('other-reading:')?'the selected default reading must exactly equal record.machineConditions':'render only pinned project text and limits; do not generate or certify these interpretations',
  wholeNameMatcher:null,exhaustiveSemanticDetector:false,
 }));
 const contract={...priorContract.value,schema:'M752-generation-admission-contract/2',revision:'r2',
  supersedes:'r1 machine fixture dispatch only; original artifacts remain immutable',
  admissionRowsChanged:false,productFilesWritten:0,formalCoverageAdded:0,
  operations:{
   assess:{stageValues:stages,returns:{discriminator:'status',enum:assessStates},neverReturns:['reject-semantic-credit','reject-unreviewed-claim','preserve-legacy']},
   'output-assertion':{stageValues:['local','ai'],returns:{discriminator:'assertionKind',enum:[null,'reject-semantic-credit','reject-unreviewed-claim'],success:{ok:true,assertionKind:null},failure:{ok:false,assertionKind:'reject-semantic-credit|reject-unreviewed-claim'}},purpose:'inspect candidate output; a rejected output is not a new eligibility status'},
   'legacy-replay':{stageValues:['restore'],returns:{discriminator:'assertionKind',enum:['preserve-legacy']},purpose:'legacy7.1 remains byte-equivalent and has no new receipt; do not route to v72 assess'},
  },
  validationOrder:['plain context schema incl. valid theme enum and exact known caseId','trusted source/identity checks; if a receipt is supplied or required by receipt-validation, validate it','decision pending/manual/reject','exact selected reading/sense/name-part/length','theme constraints','existing hard candidate constraints'],
  assessScopes:{qualification:'Run the same eligibility policy at all six caller stages, before attempting receipt issue. Pending and no-theme cases need no successful receipt. These tests do not perform actual persistence.', 'receipt-validation':'Actual eligible producer receipt is required. Tampered context/reading/sense/name/position is rejected-integrity, never needs-theme. Actual save/restore success requires this check in addition to qualification.'},
  leafRule:{validCaseId:byChar.get('叶').candidateCaseId,themeIds:[],allValidStages:'pending-source-identity',invalidThemeOrCaseId:'rejected-integrity',requiresTheme:false},
  evidenceGates:priorContract.value.evidenceGates.map(g=>g.id==='E4-machine-conditions'?{...g,required:'Execute only explicit machineConditions: exact reading/tone/sense, namePart, allowed length, explicit theme IDs, and pending source identity. conditionIds label these fields; conflictIds are classified in conflict-registry.json, not an unspecified semantic predicate.'}:g),
  knownSenseConflictPolicy:{registry:'conflict-registry.json',freeTextMayDefinePredicate:false,unimplementedDeclaredPredicate:'condition-not-supported',nonPredicateConflictLabels:'Do not block all names merely because a warning label exists. Keep pinned limitations and no alternate whole-name claim.',wholeNameClaims:'Separate approved rule required only when actually making a whole-name claim; no claim => no per-future-name signature requirement.',scope:'Existing product hard constraints continue outside the new addition; this contract adds no unseen matcher/score.'},
  fixturePolicy:{baselineFile:'acceptance-cases.json#/baselines',baselineResolution:'recordRef resolves exact pinned M752 row; entryRef resolves M740 baselineCharacter by candidateCaseId; resource handle is actual fixed loader result, not a constructed object',patchMerge:'shallow top-level context field replacement; arrays fully replaced; null is literal and not deletion; absent preserves baseline; no implicit deletion or source mutation; fixtures explicitly update givenName/fullName when length/surname changes',faultInjection:'harness-only alteration of source reads or receipt after obtaining actual trusted baseline; never expose as app API',trustedHandle:'M751 fixed loader must create actual verified handle; string labels confer no authority',saveRestore:'qualification-only stage templates are NOT storage success; actual save/restore needs eligible producer receipt and receipt-validation; missing legacy runtime receipt means not-executed',assertedCountsAreExpectations:true,productTestsExecuted:false},
  auditIssuesAddressed:auditData.P2.concat(auditData.P3).map(x=>x.id),
 };
 const fixturePackage={schema:'M752-acceptance-cases/2',revision:'r2',baselines,dependencies:{legacyReplay:legacyDependency},fixtures:expectations,stageAssertions:matrix,operations:contract.operations,mergePolicy:contract.fixturePolicy,originalExpectedCounts:{fixtures:42,stageAssertions:49},currentExpectedCounts:{fixtures:expectations.length,stageAssertions:matrix.length},productTestsExecuted:false};
 const types=`/** M752-r2 decision interchange only. No serializable value authenticates a source. */
export type ThemeId='civic-homeland'|'water-bubbles'|'textile-ribbon'|'agriculture'|'literary-artwork'|'herb-plant';
export type Stage=${stages.map(x=>JSON.stringify(x)).join('|')};
export type AssessStatus=${assessStates.map(x=>JSON.stringify(x)).join('|')};
export interface AdmissionRecord {
 candidateCaseId:string;reviewId:string;decision:'allow-single-character-generation'|'manual-only'|'pending'|'reject';
 identity:{char:string;pinyin:string;tone:number;senseId:string;[key:string]:unknown};
 usage:{mode:'any-context'}|{mode:'explicit-themes';anyOf:ThemeId[]};
 conditionIds:string[];conflictIds:string[];
 machineConditions:{selectedPinyin:string;tone:number;senseId:string;allowedGivenNameLengths:(1|2)[];requiredThemeIds:ThemeId[];namePart:'given-name';conflictPolicy:'do-not-claim-alternate-sense'};
 project:{meaning:string;projectWish:null;limits:string[];attribution:string;license:string};
 [key:string]:unknown;
}
export interface SourceIdentity {char:string;pinyin:string;tone:number;senseId:string;sourceId:string;sourceWord:string;rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number;definitionSha256:string;baselineCharacterSha256:string;[key:string]:unknown;}
export interface AdoptionReceipt {candidateId:string;fullName:string;givenName:string;position:number;candidateCaseId:string;selectedPinyin:string;tone:number;senseId:string;identitySha256:string;contextSha256:string;sourceSha256:string;admissionSha256:string;ruleVersion:'naming-editorial-7.2.0';[key:string]:unknown;}
export type AssessmentExpectation={action:'assess';stage:Stage;assessmentScope:'qualification'|'receipt-validation';baselineRef:string;inputPatch:Record<string,unknown>;faultInjection:Record<string,unknown>;expected:{status:AssessStatus}};
export type OutputExpectation={action:'output-assertion';stage:'local'|'ai';baselineRef:string;candidateOutputPatch:Record<string,unknown>;expected:{assertionKind:null;ok:true}|{assertionKind:'reject-semantic-credit'|'reject-unreviewed-claim';ok:false}};
export type ReplayExpectation={action:'legacy-replay';stage:'restore';baselineRef:string;legacyFixtureRef:string;mutation:Record<string,unknown>;expected:{assertionKind:'preserve-legacy';ok:true;oldBytesUnchanged:true;noNewReceipt:true}};
export type AcceptanceExpectation=(AssessmentExpectation|OutputExpectation|ReplayExpectation)&{id:string;productExecution:'not-run'};
export type AssessResult={status:AssessStatus};
export type OutputAssertionResult={ok:true;assertionKind:null}|{ok:false;assertionKind:'reject-semantic-credit'|'reject-unreviewed-claim'};
export type LegacyReplayResult={ok:true;assertionKind:'preserve-legacy';oldBytesUnchanged:true;noNewReceipt:true};
`;
 const notes=`# M752-r2 机器契约修订\n\n接收 M762 两项 P2 与一项 P3。原 M752、M740 文件保留；本目录仅替换验收契约表达。\n\n- 资格评估只使用 assess/status。拒绝加分和未经审阅断语使用 output-assertion/assertionKind。旧版保留使用 legacy-replay/assertionKind，7.1 不进入7.2评估。\n- 叶合法输入六阶段统一 pending-source-identity，真实caseId、themeIds=[]。null主题/伪造caseId另列完整性负例。\n- 条件字段定义为精确读音/声调/义项/给名字位/长度/显式主题与source pending。conflictIds 分类为来源/读音关联、展示联想、禁止扩大解释；不是不明的全名语义识别器。\n- 3通用、6主题、叶pending的逐字审阅数据原样复制，SHA保持不变。明确所有阶段使用同一评估，但pool不伪造已保存receipt。\n- ${expectations.length}基础用例与${matrix.length}阶段预期只是合同数据；原49条阶段预期有缺陷，不能说49产品测试通过。验证器只证明契约结构/枚举/引用/原件完整性及可重建，不是运行M751产品。\n\n主文件：generation-admission-contract.json、acceptance-cases.json、generation-admission-v72.d.ts、conflict-registry.json；verification.json记录本轮真实检查。\n`;
 return new Map([
  ['m740-generation-admission.json',rows.bytes],['theme-registry.json',themes.bytes],
  ['generation-admission-contract.json',jsonBytes(contract)],['acceptance-cases.json',jsonBytes(fixturePackage)],
  ['conflict-registry.json',jsonBytes({schema:'M752-conflict-registry/2',conflicts})],
  ['generation-admission-v72.d.ts',Buffer.from(types)],['M752-R2-DECISION.md',Buffer.from(notes)],
  ['input-pins.json',jsonBytes({schema:'M752-r2-input-pins/1',originalFiles:originals,m762Audit:{path:audit,bytes:auditBytes.length,sha256:hash(auditBytes)},legacyReplayInput:legacyDependency.input})],
 ]);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 for(const[name,bytes]of buildArtifacts()){const p=path.join(dir,name),tmp=p+'.tmp';fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,p);}
 console.log(JSON.stringify({revision:'r2',artifacts:8,productTestsExecuted:false}));
}
