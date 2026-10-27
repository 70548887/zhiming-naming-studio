import {createHash} from 'node:crypto';
import type {BirthProfile,NamingPreferences,NameCandidate,SourceRecord,NamingSession} from '../shared/types';
import {safeSourceUrl} from '../shared/session-sources';
import {assertPlainJson} from '../domain/naming-review-v7.mjs';
import {hasReviewedProjectReading as reading4} from '../domain/naming-semantics-v4';
import {hasReviewedProjectReading as reading5} from '../domain/naming-semantics-v5';
import {hasReviewedProjectReading as reading6} from '../domain/naming-semantics-v6';
import methodReferences from '../../data/modern-method-references.json';

export const MODERN_EVIDENCE_VERSION='modern-practical-evidence/1.0.0' as const;
const allowedRules=['naming-editorial-4.0.0','naming-editorial-5.0.0','naming-editorial-6.0.0','naming-editorial-7.0.0','naming-editorial-7.1.0'];
// The four saved naming versions share this project-authored lexical list.
// It is not an occupational, psychological or population model.
const industryRules:Record<string,string[]>={医学:['仁','和','济','安','康','慈','宁'],医疗:['仁','和','安','康'],工程:['衡','建','成','实','毅','立','序'],科技:['知','新','明','思','远','启'],艺术:['雅','乐','音','诗','画','韵','灵'],教育:['文','书','学','知','思','礼'],金融:['信','诚','衡','谨'],农业:['禾','穗','丰','田','雨','润']};

interface InputData {
 sessionId:string;candidateId:string;dataVersion:string;datasetSha256:string|null;
 proofStatus:string;profile:BirthProfile;preferences:NamingPreferences;candidate:NameCandidate;
 sources:SourceRecord[];namingRules:NamingSession['namingRules']|null;
}
export type VerifiedModernInput=Readonly<InputData>;
const approved=new WeakSet<object>();
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
freeze(methodReferences);
function canonical(value:unknown):string {
 assertPlainJson(value);
 const encode=(item:any):string=>Array.isArray(item)?'['+item.map(encode).join(',')+']':item&&typeof item==='object'?'{'+Object.keys(item).sort().map(key=>JSON.stringify(key)+':'+encode(item[key])).join(',')+'}':JSON.stringify(item);
 return encode(value);
}
const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
function trusted(input:VerifiedModernInput){if(!approved.has(input))throw new TypeError('Modern evidence requires the main-process Store verification path; caller flags and cloned snapshots are not proof.');}

/** Main-process composition helper; caller must already have run full Store provenance. Not IPC. */
export function captureValidatedModernSession(session:NamingSession,candidateId:string):VerifiedModernInput {
 const candidate=session.candidates.find(row=>row.id===candidateId);
 if(!candidate)throw new RangeError('Saved naming candidate not found.');
 const input:InputData=structuredClone({sessionId:session.id,candidateId:candidate.id,dataVersion:session.dataVersion,datasetSha256:session.factVerification?.datasetSha256??null,proofStatus:session.factVerification?.status??'unverified-legacy',profile:session.profile,preferences:session.preferences,candidate,sources:session.sourceSnapshot?.sources??[],namingRules:session.namingRules??null});
 freeze(input);approved.add(input);return input;
}

function sourceFor(input:VerifiedModernInput,id:string){
 const record=input.sources.find(row=>row.id===id);
 return {sourceId:id,record:record?structuredClone(record):null,status:record?'saved-source-record':'saved-source-record-missing',factScope:'Matches the saved/archived package; this explanation does not independently re-audit external source content.'};
}
function ruleReading(input:VerifiedModernInput,entry:NameCandidate['characters'][number]):boolean|null {
 const version=input.namingRules?.version;
 if(version==='naming-editorial-4.0.0')return reading4(entry);
 if(version==='naming-editorial-5.0.0')return reading5(entry);
 if(version==='naming-editorial-6.0.0'||version==='naming-editorial-7.0.0'||version==='naming-editorial-7.1.0')return reading6(entry);
 return null;
}

/** Builds a separate value; never writes candidate fields or recomputes saved scores. */
export function buildModernPracticalEvidence(input:VerifiedModernInput){
 trusted(input);
 const candidate=input.candidate;
 // Bind only facts actually consumed. A separately stored report, favorite or
 // reviewer note must not fingerprint itself or force historical backfills.
 const identity={sessionId:input.sessionId,candidateId:input.candidateId,dataVersion:input.dataVersion,datasetSha256:input.datasetSha256,inputSha256:digest({sessionId:input.sessionId,candidateId:input.candidateId,dataVersion:input.dataVersion,datasetSha256:input.datasetSha256,proofStatus:input.proofStatus,profile:{surname:input.profile.surname,surnamePinyin:input.profile.surnamePinyin},preferences:{industry:input.preferences.industry,meanings:input.preferences.meanings},sources:input.sources,namingRules:input.namingRules,candidate:{id:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,characters:candidate.characters,meaning:candidate.meaning,origin:candidate.origin,evaluation:candidate.evaluation,namingMeaningReview:candidate.namingMeaningReview??null}})};
 if(!['verified-builtin','verified-archive'].includes(input.proofStatus)||!input.datasetSha256)return {version:MODERN_EVIDENCE_VERSION,status:'unavailable-unverified-record' as const,identity,observations:null,storedEvaluation:null,notice:'旧记录的字条原包未核验，不生成事实说明或补用当前字库。'};
 const characters=candidate.characters;
 const pronunciation=characters.map((entry,index)=>{
  const readings=entry.readings??[];
  const direct=readings.filter(row=>row.referenceOnly!==true);
  const references=readings.filter(row=>row.referenceOnly===true);
  const distinct=new Set(direct.map(row=>row.pinyin+'|'+row.tone));
  return {index,char:entry.char,selected:{pinyin:entry.pinyin,tone:entry.tone,source:sourceFor(input,entry.sourceId)},recordedDirectReadings:direct.map(row=>({pinyin:row.pinyin,tone:row.tone,word:row.word,meanings:[...row.meanings],source:sourceFor(input,row.sourceId)})),referenceOnlyReadings:references.map(row=>({pinyin:row.pinyin,tone:row.tone,referenceText:row.sourceReference?.text??'',source:sourceFor(input,row.sourceId)})),savedPolyphonicFlag:entry.polyphonic??null,ambiguity:distinct.size>1?'multiple-direct-readings-recorded':entry.polyphonic?'entry-flagged-but-no-additional-direct-reading-proved':'no-additional-direct-reading-recorded',readingCompleteness:'not-established',nameUseConfirmation:'not-recorded-by-this-model'};
 });
 const ordinary=characters.map((entry,index)=>{const exact=entry.strokes!==null&&Number.isSafeInteger(entry.strokes)&&entry.strokes>0;return {index,char:entry.char,strokes:exact?entry.strokes:null,storedStrokeValue:entry.strokes,countState:entry.strokes===null?'missing':exact?'recorded-exact-integer':'unsafe-count-not-used',source:sourceFor(input,entry.sourceId),field:'candidate.characters['+index+'].strokes'};});
 const unknown=ordinary.filter(row=>row.strokes===null).map(row=>row.char);
 const knownTotalExact=ordinary.reduce((sum,row)=>sum+BigInt(row.strokes??0),0n);
 const knownTotal=knownTotalExact<=BigInt(Number.MAX_SAFE_INTEGER)?Number(knownTotalExact):null;
 const version=input.namingRules?.version??null;
 const knownRule=version!==null&&allowedRules.includes(version);
 //7.1 changes only per-character prose; the saved score methodology remains7.0.
 const implementationRuleVersion=version==='naming-editorial-7.1.0'?'naming-editorial-7.0.0':version;
 const originalImplementation=implementationRuleVersion?structuredClone(methodReferences.rules[implementationRuleVersion]):null;
 const implementationReference=version==='naming-editorial-7.1.0'&&originalImplementation?{...originalImplementation,consumedByRuleVersion:'naming-editorial-7.1.0',baseScoringRuleVersion:'naming-editorial-7.0.0',additionalCharacterNotesAffectScoring:false}:originalImplementation;
 const keywordMatches=knownRule?Object.entries(industryRules).filter(([keyword])=>input.preferences.industry.includes(keyword)).map(([keyword,list])=>({keyword,characters:characters.filter(entry=>list.includes(entry.char)&&ruleReading(input,entry)===true).map(entry=>entry.char)})).filter(row=>row.characters.length):[];
 const namingReview=candidate.namingMeaningReview;
 const namingReviewSummary=namingReview?(namingReview.version==='naming-editorial-7.1.0'?{version:'naming-editorial-7.1.0' as const,sourceId:'naming-character-meanings-v7.1-fixed' as const,sourceSha256:namingReview.sourceSha256,automaticSemanticCreditAllowed:false as const,scope:'saved per-character project explanations; no new scoring or whole-name credit'}:{version:'naming-editorial-7.0.0' as const,sourceId:'naming-editorial-meanings-v7-fixed' as const,sourceSha256:namingReview.sourceSha256,automaticSemanticCreditAllowed:namingReview.automaticSemanticCreditAllowed,scope:'display permission and project family wish; not automatic scoring credit'}):null;
 return {
  version:MODERN_EVIDENCE_VERSION,status:'recorded-evidence' as const,identity,
  subject:{fullName:candidate.fullName,givenName:candidate.givenName,pinyin:candidate.pinyin},
  storedEvaluation:structuredClone(candidate.evaluation),
  scorePolicy:'仅保留已保存项目排序值；本模块不重新求分、不替换4/5/6/7分数，不产生心理、职业或运势分。',
  observations:{
   pronunciation:{scope:'saved-given-character-readings',characters:pronunciation,surname:{text:input.profile.surname,explicitPinyin:input.profile.surnamePinyin.trim()||null,basis:input.profile.surnamePinyin.trim()?'saved-profile-input':'project-surname-table-fallback',dictionaryCharacterCoverage:'not-part-of-candidate-given-characters'},limitations:['所列为保存读音资料，不表示读音全集，也不表示已经由家庭确认命名读法。','辞典参照项单列，不作为本字可选义或独立命名读音。','本项没有读音流行度、误读率或口头传播实验数据。']},
   writing:{scope:'given-name-saved-ordinary-strokes',characters:ordinary,givenNameCharacterCount:[...candidate.givenName].length,fullNameCharacterCount:[...candidate.fullName].length,knownGivenStrokeTotal:knownTotal,knownGivenStrokeTotalExact:knownTotalExact.toString(),givenStrokeTotal:unknown.length?null:knownTotal,unknownStrokeCharacters:unknown,fullNameStrokeTotal:null,handwritingTime:null,recognitionErrorRate:null,limitations:['普通笔画只覆盖保存的给名字条；不等于全名书写成本。','不借普通笔画推认康熙姓名学笔画或繁体选择。','未核字体结构、笔顺熟悉度、输入法可达或实际书写时长；未知不以10或12画补齐。','超出安全整数的记录不参与计数；总数超界保留精确字符串，不当作可用的总笔画值。']},
   meaningIndustry:{savedMeaningPreferenceText:input.preferences.meanings,meaningPreferenceScope:"Saved literal request; no negation-aware semantic fit is certified.",lexicalEntries:characters.map((entry,index)=>({index,char:entry.char,pinyin:entry.pinyin,savedSelectedMeaning:entry.meaning,source:sourceFor(input,entry.sourceId),scope:'saved-selected-reading-dictionary-entry; not automatically an appropriate naming wish'})),savedInterpretation:{text:candidate.meaning,kind:'saved-project-ai-or-reviewed-interpretation',origin:candidate.origin,dictionaryQuotationVerification:'not-certified-as-a-whole'},recordedNaming7Review:namingReviewSummary,industry:{savedText:input.preferences.industry,literalProjectKeywordMatches:keywordMatches,ruleVersion:version,recordedRuleIdentitySource:input.namingRules?sourceFor(input,input.namingRules.sourceId):null,implementationReference,status:knownRule?'limited-project-lexical-rule-observation':'saved-rule-version-not-recorded',negationAndAliasUnderstanding:'not-implemented-by-these-saved-rules',occupationalOutcomeEvidence:null},limitations:['字典原义、项目家庭期许和保存的组合解释分列；不可将转参、姓义或字典中的任一义项当命名适用义。','行业关联是关键词与固定项目词表的编辑规则；例如否定文本仍可能命中关键词，未命中也不表示不适合该行业。','没有行业能力、职业成功或人格结果实证。']},
   distinctiveness:{storedProjectValue:candidate.evaluation.distinctiveness,recordedRuleVersion:version,basis:knownRule?'project-reviewed-imagery-coverage-heuristic':'unrecorded-rule-version; historical value not reinterpreted',recordedRuleIdentitySource:input.namingRules?sourceFor(input,input.namingRules.sourceId):null,implementationReference,populationFrequency:null,currentFullNameDuplicateRate:null,rareCharacterProbability:null,psychologicalMeasurement:null,limitations:[knownRule?'已保存4/5/6/7辨识值是意象/组合审阅覆盖启发式，不是人口字频、重名率或心理测量。':'此记录未保存生成规则版本，分值成因不据当前或旧算法补推。','本说明未消费2021给名榜；历史给名榜也不能当当前全名重名率，未上榜不等于零重名。','不能由高项目值断言独特、罕见、易记或更有职业优势。']}
  },
  evidenceBoundary:'来源验证证明保存字条与原知识包一致，不证明统计流行度、心理效果或职业结果。',
 };
}
export type ModernPracticalEvidence=ReturnType<typeof buildModernPracticalEvidence>;
