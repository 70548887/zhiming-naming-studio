import {FIXED_NAMING_EDITORIAL_V71_DATA,namingEditorialV71ForSaved,isTrustedNamingEditorialV71Data} from './naming-editorial-v7-data';
import type {NamingEditorialV71Data} from './naming-editorial-v7-data';
import {composeNamingMeaningV7,describeNamingMeaningCompositionV7} from '../domain/naming-v7';
import {isDeepStrictEqual} from 'node:util';
import table from '../../data/naming-editorial-v7.json';
import publication from '../../data/naming-editorial-meanings-v7-source-lock.json';
import {createNamingReviewLookup,assertPlainJson} from '../domain/naming-review-v7.mjs';
import type {SupplementalReviewTable,TrustedNamingContext} from '../domain/naming-review-v7.mjs';
import {resolveNamingContextForRuleVersion} from '../domain/naming';
import {NAMING_RULE_V4_VERSION,NAMING_RULE_V5_VERSION,NAMING_RULE_V6_VERSION,NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,NAMING_RULE_V7_SOURCE_ID,NAMING_RULE_V71_SOURCE_ID,type NamingRuleVersion} from '../shared/naming-rules';
import type {CharacterEntry,NameCandidate,NamingSession,BirthProfile,NamingPreferences,Analysis} from '../shared/types';
import type {NamingMeaningReviewSnapshot,NamingMeaningReviewSnapshotV7,NamingMeaningReviewRowV7,NamingMeaningReviewRowV71} from '../shared/naming-meaning-review';

const lookup=createNamingReviewLookup(table as unknown as SupplementalReviewTable);
const source=publication.sources.find(row=>row.id===NAMING_RULE_V7_SOURCE_ID)!;
function freeze<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}

/** Only the actual fixed knowledge package can produce a new7 recorded review. */
export function createNamingMeaningReviewSnapshot(givenName:string,characters:CharacterEntry[],trustedContext:TrustedNamingContext|undefined):NamingMeaningReviewSnapshotV7|undefined {
 let selected:ReturnType<typeof resolveNamingContextForRuleVersion>;try{selected=resolveNamingContextForRuleVersion(NAMING_RULE_V7_VERSION,trustedContext);}catch{return undefined;}if(!selected.context)return undefined;
 assertPlainJson(characters);
 if(characters.map(entry=>entry.char).join('')!==givenName)throw new Error('逐字审阅顺序须与完整名字一致。');
 const context={...selected.context,givenName};
 const rows:NamingMeaningReviewRowV7[]=characters.map((entry,index)=>{
  const applicability=lookup.applicability(entry,context),review=lookup.describeReview(entry,context),automaticMeaning=lookup.lookupMeaning(entry,context);
  return {position:index+1,char:entry.char,applicability,...(review?{review}:{}),...(automaticMeaning?{automaticMeaning}:{})};
 });
 return freeze({version:NAMING_RULE_V7_VERSION,sourceId:NAMING_RULE_V7_SOURCE_ID,sourceSha256:source.sha256,packSha256:selected.context.packSha256,activeVersion:selected.context.activeVersion,givenName,recordState:'recorded',automaticSemanticCreditAllowed:false,rows});
}

/** Absence on old/custom records is preserved; a recorded7 value must exactly match the frozen lookup. */
export function verifyNamingMeaningReviewSnapshot(candidate:NameCandidate,session:Pick<NamingSession,'namingRules'>,context:TrustedNamingContext|undefined):void {
 const descriptor=Object.getOwnPropertyDescriptor(candidate,'namingMeaningReview');
 const version=session.namingRules?.version;if(version!==undefined)resolveNamingContextForRuleVersion(version,context);
 if(version!==NAMING_RULE_V7_VERSION&&version!==NAMING_RULE_V71_VERSION){if(descriptor)throw new Error('旧版或自定义知识包方案不得附加命名7.x逐字审阅快照。');return;}
 if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('命名7.0逐字审阅快照缺失或包含访问器。');
 assertPlainJson(descriptor.value);
 const savedPublication=version===NAMING_RULE_V71_VERSION?namingEditorialV71ForSaved(descriptor.value.sourceSha256):undefined;
 const canonical=createNamingMeaningReviewSnapshotForVersion(version,candidate.givenName,candidate.characters,context,savedPublication);
 if(!canonical||!isDeepStrictEqual(descriptor.value,canonical))throw new Error('命名7.0逐字审阅快照、来源或适用条件不一致；不能删改、拼接或降级。');
}

/** Manual review may edit its existing prose fields, never this generation-time record. */
export function assertUnchangedNamingMeaningReview(candidate:NameCandidate,original:NameCandidate):void {
 const incoming=Object.getOwnPropertyDescriptor(candidate,'namingMeaningReview'),saved=Object.getOwnPropertyDescriptor(original,'namingMeaningReview');
 if(incoming&&!Object.hasOwn(incoming,'value')||saved&&!Object.hasOwn(saved,'value'))throw new Error('逐字审阅快照不接受访问器。');
 if(incoming)assertPlainJson(incoming.value);
 if(!!incoming!==!!saved||incoming&&!isDeepStrictEqual(incoming.value,saved?.value))throw new Error('生成时逐字审阅快照不得通过人工审阅删改或附加；请另行生成新方案。');
}

/** Inspect this new immutable field before any JSON.stringify can invoke an accessor/toJSON. */
export function assertNamingMeaningReviewInput(value:unknown):void {
 if(!value||typeof value!=='object')return;
 const candidates=Object.getOwnPropertyDescriptor(value,'candidates');
 if(candidates&&!Object.hasOwn(candidates,'value'))throw new Error('候选名单不得包含访问器。');
 if(!Array.isArray(candidates?.value))return;
 const rows=candidates.value;
 for(let index=0;index<rows.length;index++){
  const row=Object.getOwnPropertyDescriptor(rows,String(index));
  if(row&&!Object.hasOwn(row,'value'))throw new Error('候选名单不得包含访问器。');
  if(!row?.value||typeof row.value!=='object')continue;
  const snapshot=Object.getOwnPropertyDescriptor(row.value,'namingMeaningReview');
  if(snapshot){if(!Object.hasOwn(snapshot,'value'))throw new Error('逐字审阅快照不接受访问器。');assertPlainJson(snapshot.value);}
 }
}

/** Saved-version reconstruction never asks which version is current today. */
export function createNamingMeaningReviewSnapshotForVersion(version:NamingRuleVersion,givenName:string,characters:CharacterEntry[],trustedContext:TrustedNamingContext|undefined,publicationData?:NamingEditorialV71Data):NamingMeaningReviewSnapshot|undefined {
 if(version===NAMING_RULE_V7_VERSION)return createNamingMeaningReviewSnapshot(givenName,characters,trustedContext);
 if(version===NAMING_RULE_V4_VERSION||version===NAMING_RULE_V5_VERSION||version===NAMING_RULE_V6_VERSION)return undefined;
 if(version!==NAMING_RULE_V71_VERSION)throw new Error('未知的命名快照版本不能改用当前版本。');
 const selected=resolveNamingContextForRuleVersion(version,trustedContext);if(!selected.context)throw new Error('7.1快照缺少固定归档上下文。');
 const legacy=createNamingMeaningReviewSnapshot(givenName,characters,selected.context);if(!legacy)throw new Error('7.1基础7.0审阅重建失败。');
 if(publicationData&&!isTrustedNamingEditorialV71Data(publicationData))throw new Error('逐字出版物缺少主进程认证。');
 const fixed=publicationData??FIXED_NAMING_EDITORIAL_V71_DATA,known=new Set(fixed.profile.cases.map(row=>row.char));
 const rows:NamingMeaningReviewRowV71[]=legacy.rows.map((row,index)=>known.has(row.char)?{...row,kind:'character-level-project-explanation',characterExplanation:fixed.lookup.characterExplanation(characters[index],selected.context!)}:{...row,kind:'legacy-v7-review'});
 return freeze({version:NAMING_RULE_V71_VERSION,sourceId:NAMING_RULE_V71_SOURCE_ID,sourceSha256:fixed.source.sha256,packSha256:selected.context.packSha256,activeVersion:selected.context.activeVersion,givenName,recordState:'recorded',scope:'per-character-project-explanation-only',wholeNameAssessment:'not-assessed',wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0,rows});
}

/** One post-merge local/AI finalizer. No model prose or request admission enters. */
export function finalizeNamingCandidateForRuleVersion(version:NamingRuleVersion,candidate:NameCandidate,profile:BirthProfile,preferences:NamingPreferences,analysis:Analysis,context:TrustedNamingContext|undefined,validated71?:NamingEditorialV71Data):NameCandidate {
 if(Object.hasOwn(candidate,'namingMeaningReview'))throw new Error('生成收尾不得接受外部已算逐字审阅快照。');
 if(version===NAMING_RULE_V7_VERSION){const snapshot=createNamingMeaningReviewSnapshot(candidate.givenName,candidate.characters,context);if(!snapshot)throw new Error('7.0生成快照缺少真实固定知识包。');return{...candidate,namingMeaningReview:snapshot};}
 if(version!==NAMING_RULE_V71_VERSION){resolveNamingContextForRuleVersion(version,context);return candidate;}
 if(!isTrustedNamingEditorialV71Data(validated71))throw new Error('7.1生成缺少主进程验证的完整出版与准入。');
 const snapshot=createNamingMeaningReviewSnapshotForVersion(version,candidate.givenName,candidate.characters,context,validated71);if(!snapshot||snapshot.version!==NAMING_RULE_V71_VERSION)throw new Error('7.1生成快照身份不同。');
 const frame=describeNamingMeaningCompositionV7(context,candidate.givenName,profile,preferences,analysis,candidate.characters,candidate.citations,candidate.style),baseMeaning=composeNamingMeaningV7(frame.composition);
 if(candidate.meaning!==baseMeaning||candidate.originalMeaning!==baseMeaning)throw new Error('生成解释不是同一基础结构的本地结果，禁止接纳AI原始文字。');
 if(!isDeepStrictEqual(candidate.warnings.slice(0,frame.baseWarnings.length),frame.baseWarnings))throw new Error('生成提示与基础结构不一致，禁止按文本猜删。');
 const displayNotes=snapshot.rows.flatMap(row=>row.kind==='character-level-project-explanation'&&row.characterExplanation.status==='character-explanations-ready'?[{position:row.position-1,note:row.characterExplanation.rows[0]}]:[]),notes=displayNotes.filter(row=>!row.note.caseId.startsWith('single-meaning-m393:')),byPosition=new Map(notes.map(row=>[row.position,row.note]));
 const parts=frame.composition.parts.map(part=>{const note=byPosition.get(part.position);return note?{...part,text:note.projectMeaning}:part;}),wishMap=new Map(frame.composition.wishes.map(part=>[part.position,part]));
 for(const {position,note}of notes){if(!note||note.char!==candidate.characters[position].char)throw new Error('逐字解释位置或完整子请求不同。');wishMap.set(position,{position,char:note.char,text:note.projectWish});}
 let meaning=composeNamingMeaningV7({...frame.composition,parts,wishes:[...wishMap.values()].sort((a,b)=>a.position-b.position)});
 if(frame.composition.originalCitationMeaning&&notes.length){const isolated=composeNamingMeaningV7({parts:notes.map(({position,note})=>({position,char:note.char,text:note.projectMeaning})),wishes:notes.map(({position,note})=>({position,char:note.char,text:note.projectWish})),combination:'本栏仅为独立逐字参考，不改原句选义与既有组合解释。',originalCitationMeaning:false});meaning=baseMeaning+' 独立逐字项目说明（不作原句采用义）：'+isolated;}
 const warningRows=frame.warningRows.filter(row=>row.kind!=='unreviewed-character-meaning'||row.position===undefined||!byPosition.has(row.position)),warnings=[...new Set(warningRows.map(row=>row.text)),...candidate.warnings.slice(frame.baseWarnings.length)];
 if(notes.length)warnings.push('命名7.1新增说明仅按实际字位与已审读音展示，不增加主题、行业、品格或辨识评分；完整组合仍依独立原依据或保留待审。');
 if(displayNotes.some(row=>row.note.caseId.startsWith('single-meaning-m393:')))warnings.push('新增逐字参考仅供词义展示；姓名用途仍待语境确认，未改整体寓意、待审提醒或评分。');
 for(const row of snapshot.rows)if(row.kind==='character-level-project-explanation'&&row.characterExplanation.status!=='character-explanations-ready')warnings.push(`${row.char}本位未满足7.1固定字音／来源条件，未采用新逐字说明。`);
 return{...candidate,meaning,originalMeaning:meaning,warnings:[...new Set(warnings)],namingMeaningReview:snapshot};
}
