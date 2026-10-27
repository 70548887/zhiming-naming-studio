import {join} from 'node:path';
import {calculateNamePhoneticReview,canonicalPlainJson,normalizeSelectedPinyin} from '../../data/name-phonetic/name-phonetic-engine.mjs';
import {verifyNamePhoneticPackage} from '../../data/name-phonetic/profile-source-loader.mjs';
import type {PhoneticReviewInput,SelectedNamePhonetics,SelectedPhoneticUnit} from '../../data/name-phonetic/name-phonetic-types';
import type {SourceRecord,YueNameReading,YueReadingData} from '../shared/types';
import type {NamePhoneticAdapter,NamePhoneticReviewsSnapshot,PhoneticBirthProfile,PhoneticCandidate,PhoneticEnabledPreferences,PhoneticSession} from '../shared/name-phonetic-review-types';
import {NAME_PHONETIC_SOURCE_IDS,NAME_PHONETIC_VERSIONS,NAME_PHONETIC_SNAPSHOT_VERSION,ownPhoneticValue,readNamePhoneticPreferences} from '../shared/name-phonetic-preferences';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import {calculateYueNameReading,confirmYueNameReading,isCanonicalYueNameReading,yueReadingSelections,YUE_READING_SOURCE_ID} from '../domain/yue-reading';
import {loadYueReadingData} from './yue-reading-data';
import fixedYueTable from '../../data/yue-reading-table.json';

function freeze<T>(value:T):T{
  if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;
}
function same(a:unknown,b:unknown):boolean{return canonicalPlainJson(a)===canonicalPlainJson(b);}
function optionalCanonical(value:unknown):string{return value===undefined?'absent':canonicalPlainJson(value);}
function explicitPinyin(text:string,count:number):string[]|null{
  try{return normalizeSelectedPinyin(text,count);}catch{return null;}
}
function ordinaryUnit(text:string,pinyin:string,referenceIds:string[]):SelectedPhoneticUnit|null{
  const tokens=explicitPinyin(pinyin,[...text].length);
  return tokens?{text,tokens,confirmed:true,origin:'current-default',referenceIds:[...referenceIds]}:null;
}
function surnameAndGiven(profile:PhoneticBirthProfile,candidate:PhoneticCandidate):void{
  const surname=ownPhoneticValue(profile,'surname').value,pinyin=ownPhoneticValue(profile,'surnamePinyin').value;
  const given=ownPhoneticValue(candidate,'givenName').value,characters=ownPhoneticValue(candidate,'characters').value;
  canonicalPlainJson({surname,pinyin,given,characters});
  if(typeof surname!=='string'||!/^\p{Script=Han}{1,4}$/u.test(surname)||typeof pinyin!=='string'||typeof given!=='string'||!/^\p{Script=Han}{1,2}$/u.test(given)||!Array.isArray(characters)||characters.length!==[...given].length||characters.some((row,index)=>row.char!==[...given][index]||typeof row.pinyin!=='string'||typeof row.sourceId!=='string'||!row.sourceId))throw new Error('词音复核必须使用原候选姓名和完整逐字默认读音。');
}
function ordinaryReading(profile:PhoneticBirthProfile,candidate:PhoneticCandidate):SelectedNamePhonetics{
  return{version:'selected-name-phonetics/1.0.0',language:'cmn',surname:{text:profile.surname,selection:ordinaryUnit(profile.surname,profile.surnamePinyin,[])},given:candidate.characters.map(character=>({text:character.char,selection:ordinaryUnit(character.char,character.pinyin,[character.sourceId])}))};
}
function confirmedYueReading(profile:PhoneticBirthProfile,candidate:PhoneticCandidate,data:YueReadingData):SelectedNamePhonetics{
  const saved=ownPhoneticValue(candidate,'yueReading').value;
  if(!isCanonicalYueNameReading(saved,profile.surname,candidate.givenName,data))throw new Error('粤语1.2词汇复核缺少固定来源校验通过的已保存读音。');
  const normalized=confirmYueNameReading(calculateYueNameReading(profile.surname,candidate.givenName,data),yueReadingSelections(saved));
  const unit=(row:YueNameReading['surname'])=>({text:row.text,selection:row.selection?{text:row.text,tokens:[...row.selection.tokens],confirmed:true as const,origin:row.selection.origin,referenceIds:row.selection.origin==='dictionary'?[YUE_READING_SOURCE_ID]:[]}:null});
  return{version:'selected-name-phonetics/1.0.0',language:'yue',surname:unit(normalized.surname),given:normalized.given.map(unit)};
}

/** Fixed metadata describes the joint source lock, not a new hash of either historical Yue package. */
function sourceRegistry(lockSha256:string):SourceRecord[]{
  const common=['source-lock.json','name-phonetic-profile.json','NOTICE.md','selection-audit.json','reviewed-selection.mjs','name-reading-fixture-evidence.json'];
  const files=(extra:string[])=>[...common,...extra].sort().map(file=>'data/name-phonetic/'+file);
  const note='普通话1.0与粤语1.2独立有限词汇联想资料；登记SHA为共同固定来源锁文件SHA-256。词音来源、逐义标签及实际引擎规则对象在启用时核验；未命中不代表谐音安全，不参与评分。';
  return[
    {id:NAME_PHONETIC_SOURCE_IDS[0],name:'中文维基词典固定词音与义项（普通话1.0／粤语1.2）',url:'https://zh.wiktionary.org/',commit:'snapshot-sha256:3c9fa2e012e6c257b7a0789b581cadc3f19fd8316118dc48235b1eb4ccbd2d10',license:'CC-BY-SA-4.0',files:files(['wiktionary-excerpts.json','CC-BY-SA-4.0.txt']),sha256:lockSha256,note},
    {id:NAME_PHONETIC_SOURCE_IDS[1],name:'Rime Cantonese 固定原词证据（普通话1.0／粤语1.2）',url:'https://github.com/rime/rime-cantonese/tree/259f0e48bba840c3a2e0d117539e96937f3d89bc',commit:'259f0e48bba840c3a2e0d117539e96937f3d89bc',license:'CC-BY-4.0',files:files(['rime-excerpts.json','CC-BY-4.0.txt']),sha256:lockSha256,note:note+'普通话规则中的Rime证据只证明同词存在，普通话音值来自单独标明的维基词典记录。'},
  ];
}

/** Main-only capability: callers cannot supply an engine/profile/gate or mutate the verified rule object. */
export function loadNamePhoneticAdapter(dataDirectory:string):NamePhoneticAdapter{
  const verified=verifyNamePhoneticPackage(join(dataDirectory,'name-phonetic'));
  if(verified.status!=='passed'||verified.engineProfileMatched!==true||!same(verified.profileVersions,NAME_PHONETIC_VERSIONS)||!same(verified.sourceIds,[...NAME_PHONETIC_SOURCE_IDS]))throw new Error('词音资料与主进程接线版本不一致。');
  const gate=freeze({profileSha256:verified.profileSha256,sourceLockSha256:verified.sourceLockSha256,actualProfileObjectSha256:verified.actualProfileObjectSha256,engineProfileMatched:true as const});
  const sources=freeze(sourceRegistry(verified.sourceLockSha256));
  let yueData:YueReadingData|undefined;
  const getYueData=()=>{
    if(!yueData){const loaded=loadYueReadingData(dataDirectory);if(!same(loaded.data,fixedYueTable))throw new Error('粤语读音运行资料与应用内固定字词表不一致。');yueData=freeze(structuredClone(loaded.data));}return yueData;
  };
  const calculate=(profile:PhoneticBirthProfile,preferences:PhoneticEnabledPreferences,candidate:PhoneticCandidate):NamePhoneticReviewsSnapshot|undefined=>{
    const selected=readNamePhoneticPreferences(preferences);if(!selected)return undefined;
    surnameAndGiven(profile,candidate);
    const selectedReadings:NamePhoneticReviewsSnapshot['selectedReadings']={},reviews:NamePhoneticReviewsSnapshot['reviews']={};
    for(const language of ['cmn','yue'] as const){const option=selected[language];if(!option)continue;
      const reading=language==='cmn'?ordinaryReading(profile,candidate):confirmedYueReading(profile,candidate,getYueData());
      const input:PhoneticReviewInput={surname:profile.surname,given:candidate.givenName,mode:option.mode,reading};
      selectedReadings[language]=reading;reviews[language]=calculateNamePhoneticReview(input,option.version);
    }
    return freeze({version:NAME_PHONETIC_SNAPSHOT_VERSION,recordState:'recorded',readingPolicy:'saved-default-and-confirmed-yue/1.0.0',engine:{profileSha256:gate.profileSha256,sourceLockSha256:gate.sourceLockSha256,actualProfileObjectSha256:gate.actualProfileObjectSha256},selectedReadings,reviews});
  };
  const verifySession=(session:PhoneticSession):void=>{
    const pref=ownPhoneticValue(session,'preferences').value as PhoneticEnabledPreferences,selected=readNamePhoneticPreferences(pref);
    const candidates=ownPhoneticValue(session,'candidates').value;
    if(!Array.isArray(candidates)||Object.getPrototypeOf(candidates)!==Array.prototype||Reflect.ownKeys(candidates).length!==candidates.length+1)throw new Error('词音复核候选列表无效。');
    const rows=Array.from({length:candidates.length},(_,index)=>{const descriptor=Object.getOwnPropertyDescriptor(candidates,String(index));if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('词音候选不得含空位或访问器。');return descriptor.value as PhoneticCandidate;});
    const snapshot=ownPhoneticValue(session,'sourceSnapshot').value as PhoneticSession['sourceSnapshot'];
    if(snapshot!==undefined)canonicalPlainJson(snapshot);
    const reserved=(snapshot?.sources??[]).filter(source=>(NAME_PHONETIC_SOURCE_IDS as readonly string[]).includes(source.id));
    if(!selected){if(reserved.length||rows.some(candidate=>ownPhoneticValue(candidate,'namePhoneticReviews').present))throw new Error('未启用独立词音复核的方案附带结果或专用来源。');return;}
    if(!rows.length||rows.length>100||!snapshot||!validSessionSourceSnapshot(snapshot,session.dataVersion)||reserved.length!==sources.length||sources.some(source=>!same(reserved.find(row=>row.id===source.id)??null,source)))throw new Error('词音复核方案缺少完整候选或固定生成时来源。');
    const profile=ownPhoneticValue(session,'profile').value as PhoneticBirthProfile;
    for(const candidate of rows){const actual=ownPhoneticValue(candidate,'namePhoneticReviews');if(!actual.present||!same(actual.value,calculate(profile,pref,candidate)))throw new Error('词音复核保存结果、选定读音、规则版本或完整引文与可信重算不一致。');}
  };
  const verifyTransition=(previous:PhoneticSession,next:PhoneticSession):void=>{
    verifySession(previous);verifySession(next);
    if(optionalCanonical(readNamePhoneticPreferences(previous.preferences))!==optionalCanonical(readNamePhoneticPreferences(next.preferences)))throw new Error('同一方案的词音复核启用状态、语言、版本或模式不得在审阅时变更。');
    if(!readNamePhoneticPreferences(previous.preferences))return;
    if(previous.dataVersion!==next.dataVersion||!same(previous.sourceSnapshot,next.sourceSnapshot)||!same({surname:previous.profile.surname,pinyin:previous.profile.surnamePinyin},{surname:next.profile.surname,pinyin:next.profile.surnamePinyin})||previous.candidates.length!==next.candidates.length)throw new Error('同一方案的词音输入或来源身份不得改变。');
    for(let index=0;index<previous.candidates.length;index++){
      const old=previous.candidates[index],current=next.candidates[index];
      if(old.givenName!==current.givenName||!same(old.characters,current.characters)||optionalCanonical(old.namePhoneticReviews?.reviews.cmn)!==optionalCanonical(current.namePhoneticReviews?.reviews.cmn)||optionalCanonical(old.namePhoneticReviews?.selectedReadings.cmn)!==optionalCanonical(current.namePhoneticReviews?.selectedReadings.cmn))throw new Error('同一方案的默认普通话读音或候选事实不得改变。');
    }
  };
  return freeze({sources,gate,calculate,verifySession,verifyTransition});
}
