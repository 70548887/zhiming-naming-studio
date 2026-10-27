import {isNamingV7BaseRuleVersion} from '../shared/naming-rules';
import {isDeepStrictEqual as equal} from 'node:util';
import type {MeaningContextChoice} from '../domain/meaning-context-next.mjs';
import type {NameCandidate,NamingSession,CharacterEntry} from '../shared/types';
import type {MeaningContextOptions,MeaningContextOption,MeaningContextUpdateRequest,SavedMeaningContextReview,SavedMeaningContextSelection,SavedMeaningContextReading} from '../shared/meaning-context-review';
import {assertMeaningContextJson,validSavedMeaningContextReview} from '../shared/meaning-context-review';
import {createSessionSourceSnapshot} from '../shared/session-sources';
import {MEANING_CONTEXT_PINS as PINS,meaningContextSha,meaningContextDefinitionForSaved,assertMeaningContextData} from './meaning-context-data';
import type {MeaningContextData,MeaningContextDefinition} from './meaning-context-data';

export interface MeaningContextPack {packSha256:string;activeVersion:string;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exactKeys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).sort().join(',')===[...names].sort().join(',');
function fact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('完整词义参考：'+message);}
function canonical(value:unknown):string{assertMeaningContextJson(value);const sort=(v:any):any=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;return JSON.stringify(sort(value));}
const identity=(entry:CharacterEntry)=>({char:entry.char,pinyin:entry.pinyin,tone:entry.tone,sourceId:entry.sourceId,meaning:entry.meaning,readings:entry.readings??[]});
const eligible=(session:NamingSession,pack:MeaningContextPack|undefined)=>isNamingV7BaseRuleVersion(session.namingRules?.version)&&pack?.packSha256===PINS.packSha256&&pack.activeVersion===PINS.activeVersion&&session.dataVersion===PINS.activeVersion;
function rowsFor(candidate:NameCandidate,definition:MeaningContextDefinition){
 return definition.publication.cases.filter(row=>row.givenName===candidate.givenName&&candidate.characters.length===2&&row.characterBindings.every((b,i)=>canonical(identity(candidate.characters[i]))===canonical(b.character))&&row.confirmedReadings.every((r,i)=>r.char===candidate.characters[i].char&&r.pinyin===candidate.characters[i].pinyin&&r.tone===candidate.characters[i].tone));
}
function optionsFor(candidate:NameCandidate,definition:MeaningContextDefinition):MeaningContextOption[]{
 return rowsFor(candidate,definition).flatMap(row=>candidate.characters.flatMap((character,position)=>character.char===row.char?( [{position,char:row.char,caseId:row.selection.caseId,senseId:row.selection.senseId,contextKey:row.selection.contextKey,contextLabel:row.selection.contextLabel,givenName:row.givenName,dictionaryOriginal:row.source.definition.def,reference:{word:row.source.word,pinyin:row.source.pinyin,sourceId:row.source.id,originalFile:row.source.originalFile,originalSha256:row.source.originalSha256,rawEntryIndex:row.source.rawEntryIndex,rawHeteronymIndex:row.source.rawHeteronymIndex,rawDefinitionIndex:row.source.rawDefinitionIndex,license:row.source.license},grammar:structuredClone(row.grammar),reason:row.reason,exclusions:[...row.exclusions],adopted:false as const}] ):[]));
}
function build(session:NamingSession,candidate:NameCandidate,pack:MeaningContextPack,confirmed:SavedMeaningContextReading[],selections:SavedMeaningContextSelection[],definition:MeaningContextDefinition):SavedMeaningContextReview {
 fact(eligible(session,pack),'只适用于已保存命名7及本批固定原知识包。');assertMeaningContextJson(candidate.characters);
 fact(candidate.fullName===session.profile.surname+candidate.givenName&&candidate.characters.map(c=>c.char).join('')===candidate.givenName&&optionsFor(candidate,definition).length>0,'没有与本完整给名、字条及当前读音完全匹配的参考。');
 const readings=candidate.characters.map((c,position)=>confirmed.some(r=>r.position===position)?{char:c.char,pinyin:c.pinyin,tone:c.tone,confirmed:true as const}:null);
 const rows=candidate.characters.map((c,position)=>{
  const selected=selections.find(s=>s.position===position),choice:MeaningContextChoice|undefined=selected?{usage:'entire-given-name',caseId:selected.caseId,senseId:selected.senseId,contextKey:selected.contextKey}:undefined;
  const result=definition.lookup.lookup({char:c.char,givenName:candidate.givenName,characters:candidate.characters,confirmedReadings:readings,...(choice?{choice}:{})},pack);
  if(selected)fact(result.status==='explanation-ready','当前读音、义项或场景条件尚未成立。');
  return{position,char:c.char,result};
 });
 const original=session.sourceSnapshot?.sources.find(s=>s.id==='moe-revised');fact(original,'保存方案缺少原词典来源。');
 const pins=definition.pins,namingRulesVersion=session.namingRules?.version;fact(isNamingV7BaseRuleVersion(namingRulesVersion),'保存的命名规则不属于同基包7.x范围。');
 return{version:pins.version,productionApproved:false,sessionId:session.id,candidateId:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,packSha256:pack.packSha256,activeVersion:pack.activeVersion,namingRulesVersion,binding:{characters:candidate.characters.map((c,position)=>({position,...identity(c),characterSha256:meaningContextSha(canonical(c))}))},source:{sourceId:definition.source.id as SavedMeaningContextReview['source']['sourceId'],sourceSha256:pins.aggregateSha256,dataSha256:pins.dataSha256,sourceLockSha256:pins.lockSha256,dataManifestSha256:pins.manifestSha256},sourceSnapshot:createSessionSourceSnapshot(session.dataVersion,[structuredClone(definition.source),structuredClone(original)]),confirmedReadings:[...confirmed].sort((a,b)=>a.position-b.position),selections:[...selections].sort((a,b)=>a.position-b.position),rows,automaticSemanticCreditAllowed:false,independentCharacterMeaningApproved:false,wholeNameApproved:false,scoreDelta:0};
}

/** Verify the recorded version using its immutable publication. Do not replace the saved result. */
export function verifySavedMeaningContextReview(session:NamingSession,candidate:NameCandidate,pack:MeaningContextPack|undefined):void {
 const d=Object.getOwnPropertyDescriptor(candidate,'meaningContextReview');if(!d)return;
 fact(Object.hasOwn(d,'value')&&validSavedMeaningContextReview(d.value),'保存快照格式、访问器或版本无效。');
 fact(eligible(session,pack),'保存快照与命名版本或原知识包身份不一致。');
 const value=d.value as SavedMeaningContextReview,definition=meaningContextDefinitionForSaved(value.source);fact(definition,'未知或不匹配的保存资料版本。');
 for(const r of value.confirmedReadings){const c=candidate.characters[r.position];fact(c&&equal(r,{position:r.position,char:c.char,pinyin:c.pinyin,tone:c.tone,confirmed:true}),'确认记录不对应当前保存读音。');}
 const expected=build(session,candidate,pack!,value.confirmedReadings,value.selections,definition);
 fact(equal(value,expected),'保存词义、字条、姓名、来源锁或解释结果被删改／嫁接。');
}
export function verifySessionMeaningContextReviews(session:NamingSession,pack:MeaningContextPack|undefined,data:MeaningContextData):void {
 assertMeaningContextData(data);
 for(const candidate of session.candidates)verifySavedMeaningContextReview(session,candidate,pack);
}
export function hasMeaningContextReview(session:NamingSession):boolean{return session.candidates.some(c=>Object.hasOwn(c,'meaningContextReview'));}
export function assertUnchangedMeaningContextReview(candidate:NameCandidate,original:NameCandidate):void {
 const a=Object.getOwnPropertyDescriptor(candidate,'meaningContextReview'),b=Object.getOwnPropertyDescriptor(original,'meaningContextReview');
 if(a){fact(Object.hasOwn(a,'value'),'快照不得为访问器。');assertMeaningContextJson(a.value);}
 fact(!!a===!!b&&(!a||equal(a.value,b?.value)),'此快照仅可通过专用词义确认接口变更，普通审阅不得删除或附加。');
}
export function assertMeaningContextHistoryIdentity(current:NamingSession|undefined,revision:NamingSession):void {
 if(!hasMeaningContextReview(revision)&&(!current||!hasMeaningContextReview(current)))return;
 fact(current,'审阅历史缺少当前方案。');
 const bound=(s:NamingSession)=>s.candidates.map(c=>({id:c.id,givenName:c.givenName,fullName:c.fullName,pinyin:c.pinyin,characters:c.characters,namingMeaningReview:c.namingMeaningReview}));
 fact(equal(bound(current),bound(revision)),'词义参考历史的候选或原命名7字条身份不一致。');
}

export function meaningContextOptions(session:NamingSession,candidate:NameCandidate,pack:MeaningContextPack|undefined,data?:MeaningContextData):MeaningContextOptions {
 const old=candidate.meaningContextReview,definition=data;
 if(data)assertMeaningContextData(data);
 const status:MeaningContextOptions['status']=!isNamingV7BaseRuleVersion(session.namingRules?.version)?'legacy-unavailable':!eligible(session,pack)?'unsupported-pack':!data?'data-unavailable':optionsFor(candidate,definition!).length?'available':'not-covered';
 const notice=status==='available'?'新审阅使用完整词义数据1.1；已保存记录按原资料版本保留。先确认当前读音，再明确选择整词义项与场景；不表示唯一读法或完整姓名通过。':status==='legacy-unavailable'?'此历史命名版本未采用本批整词参考，保持原记录。':status==='unsupported-pack'?'原知识包不属于本批固定范围，不套用参考表。':status==='not-covered'?'本批没有与这个完整给名和当前字音条目完全匹配的参考。':'本批受信资料尚未提供，未生成或回填解释。';
 return{version:'meaning-context-options/1.0.0',productionApproved:false,sessionId:session.id,candidateId:candidate.id,reviewRevision:session.reviewRevision??0,...(session.reviewToken?{reviewToken:session.reviewToken}:{}),status,currentReadings:candidate.characters.map((c,position)=>({position,char:c.char,pinyin:c.pinyin,tone:c.tone,confirmed:old?.confirmedReadings.some(r=>r.position===position)??false})),options:status==='available'?optionsFor(candidate,definition!):[],...(old?{savedReview:structuredClone(old)}:{}),notice};
}
export function applyMeaningContextIntent(session:NamingSession,candidate:NameCandidate,pack:MeaningContextPack|undefined,data:MeaningContextData,request:MeaningContextUpdateRequest):void {
 assertMeaningContextJson(request);fact(object(request),'确认意图格式无效。');
 if(request.action==='clear'){fact(exactKeys(request,['action']),'清除意图包含额外字段。');delete candidate.meaningContextReview;return;}
 assertMeaningContextData(data);const definition=data;
 fact(eligible(session,pack)&&optionsFor(candidate,definition).length>0,'此保存名字或原知识包不适用本批参考。');
 const old=candidate.meaningContextReview,confirmed=structuredClone(old?.confirmedReadings??[]),selections=structuredClone(old?.selections??[]);
 if(request.action==='confirm-current-readings'){
  fact(exactKeys(request,['action','positions'])&&Array.isArray(request.positions)&&request.positions.length>0&&request.positions.length<=2&&new Set(request.positions).size===request.positions.length&&request.positions.every(p=>Number.isInteger(p)&&p>=0&&p<2),'确认字位须为0开始的唯一字位集合。');
  for(const position of request.positions){const c=candidate.characters[position];if(!confirmed.some(r=>r.position===position))confirmed.push({position,char:c.char,pinyin:c.pinyin,tone:c.tone,confirmed:true});}
 }else if(request.action==='choose-context'){
  fact(exactKeys(request,['action','position','caseId','senseId','contextKey'])&&Number.isInteger(request.position)&&request.position>=0&&request.position<2&&['caseId','senseId','contextKey'].every(k=>typeof request[k as keyof typeof request]==='string'),'义项选择格式无效。');
  fact(confirmed.length===2,'必须先逐位确认完整给名的当前两个读音。');
  fact(optionsFor(candidate,definition).some(o=>o.position===request.position&&o.caseId===request.caseId&&o.senseId===request.senseId&&o.contextKey===request.contextKey),'完整名字、字位、原义项或具体场景不匹配。');
  const selection={position:request.position,caseId:request.caseId,senseId:request.senseId,contextKey:request.contextKey},index=selections.findIndex(s=>s.position===request.position);if(index<0)selections.push(selection);else selections[index]=selection;
 }else throw new Error('完整词义参考：不支持的确认意图。');
 candidate.meaningContextReview=build(session,candidate,pack!,confirmed,selections,definition);
}
