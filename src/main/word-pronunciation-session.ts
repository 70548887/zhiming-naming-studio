import {isNamingV7BaseRuleVersion} from '../shared/naming-rules';
import {isDeepStrictEqual} from 'node:util';
import {loadNameWordPronunciationReader} from './name-word-pronunciation-reader';
import {loadNamePhoneticAdapter} from './name-phonetic-adapter';
import {packSha,type FactArchive} from './candidate-facts';
import type {NamingSession} from '../shared/types';
import {canonicalPlainJson} from '../shared/plain-json';
import {ownPhoneticValue} from '../shared/name-phonetic-preferences';
import {assertWordPronunciationFields,hasWordPronunciationFootprint,readWordPronunciationPreference,WORD_PRONUNCIATION_VERSION,WORD_PRONUNCIATION_LOCK,WORD_PRONUNCIATION_SOURCE_IDS} from '../shared/word-pronunciation-reference';
const PACK_SHA='1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b';
const same=(a:unknown,b:unknown)=>canonicalPlainJson(a)===canonicalPlainJson(b);

/** Ordinary prose/favorite saves must never bless new source/result JSON. */
export function assertUnchangedWordPronunciation(incoming:NamingSession,saved:NamingSession):void {
 assertWordPronunciationFields(incoming);
 if(readWordPronunciationPreference(incoming.preferences)!==readWordPronunciationPreference(saved.preferences))throw Error('整词参照开关属于生成时选择，普通审阅不得改变；请另行生成。');
 for(const candidate of incoming.candidates){
  const old=saved.candidates.find(c=>c.id===candidate.id);if(!old)throw Error('未找到属于该方案的原候选。');
  const a=ownPhoneticValue(candidate,'wordPronunciationReference'),b=ownPhoneticValue(old,'wordPronunciationReference');
  if(a.present!==b.present||a.present&&!same(a.value,b.value))throw Error('整词读音参照是主进程计算的只读快照，普通审阅不得附加、删改或嫁接。');
 }
 if(hasWordPronunciationFootprint(saved)||hasWordPronunciationFootprint(incoming)){
  const a=ownPhoneticValue(incoming,'sourceSnapshot'),b=ownPhoneticValue(saved,'sourceSnapshot');
  if(a.present!==b.present||a.present&&!same(a.value,b.value))throw Error('整词参照生成时来源不得通过普通审阅改变。');
 }
}
export class WordPronunciationSessionResources {
 readonly #reader:ReturnType<typeof loadNameWordPronunciationReader>;
 readonly #phonetics:ReturnType<typeof loadNamePhoneticAdapter>;
 constructor(dataDirectory:string){
  this.#reader=loadNameWordPronunciationReader(dataDirectory);this.#phonetics=loadNamePhoneticAdapter(dataDirectory);
  if(this.#reader.gate.sourceLockSha256!==WORD_PRONUNCIATION_LOCK)throw Error('整词参照资源版本未注册，不得以当前资料替换旧快照。');
 }
 private eligible(session:NamingSession,archive:FactArchive|undefined):asserts archive is FactArchive {
  if(!isNamingV7BaseRuleVersion(session.namingRules?.version)||!archive||archive.sha256!==PACK_SHA||packSha(archive.pack)!==PACK_SHA||archive.version!==session.dataVersion||archive.version!=='1875aa49dcfa')throw Error('整词参照仅限本方案实际归档的命名7固定完整知识包；旧版、自定义或未知包不得补算。');
  const originals=new Map(archive.dataset.characters.map(c=>[c.char,c]));
  for(const candidate of session.candidates)for(const character of candidate.characters)if(!isDeepStrictEqual(character,originals.get(character.char)))throw Error('整词参照字音事实与本方案完整归档包不一致。');
  this.#phonetics.verifySession(session);
 }
 private verifySources(session:NamingSession):void {
  const recorded=session.sourceSnapshot?.sources.filter(s=>(WORD_PRONUNCIATION_SOURCE_IDS as readonly string[]).includes(s.id))??[];
  if(recorded.length!==this.#reader.sources.length||this.#reader.sources.some(source=>!isDeepStrictEqual(recorded.find(s=>s.id===source.id),source)))throw Error('整词参照来源登记、版本或固定锁不一致。');
 }
 initialize(session:NamingSession,archive:FactArchive|undefined):NamingSession {
  if(!readWordPronunciationPreference(session.preferences))throw Error('未明确开启整词参照，不得生成新字段。');
  this.eligible(session,archive);const next=structuredClone(session);
  if(!next.sourceSnapshot||next.sourceSnapshot.sources.some(s=>(WORD_PRONUNCIATION_SOURCE_IDS as readonly string[]).includes(s.id)))throw Error('整词参照来源缺失或预先附加，未保存。');
  for(const candidate of next.candidates){if(Object.hasOwn(candidate,'wordPronunciationReference'))throw Error('新方案不得接收成品整词参照。');const result=this.#reader.calculate(next.profile,next.preferences,candidate);if(!result)throw Error('整词参照缺少明确语言与模式。');candidate.wordPronunciationReference=result;}
  next.sourceSnapshot.sources.push(...structuredClone(this.#reader.sources));return next;
 }
 refresh(session:NamingSession,candidateId:string,archive:FactArchive|undefined):NamingSession {
  if(!readWordPronunciationPreference(session.preferences))return session;
  this.eligible(session,archive);this.verifySources(session);const next=structuredClone(session),candidate=next.candidates.find(c=>c.id===candidateId);
  if(!candidate?.wordPronunciationReference)throw Error('原方案缺少整词参照，不得借读音确认补字段。');
  if(candidate.wordPronunciationReference.version!==WORD_PRONUNCIATION_VERSION||candidate.wordPronunciationReference.sourceLockSha256!==WORD_PRONUNCIATION_LOCK)throw Error('原整词参照版本不受支持；保留原数据，不按新数据替换。');
  const value=this.#reader.calculate(next.profile,next.preferences,candidate);if(!value)throw Error('无法按已保存模式重算整词参照。');candidate.wordPronunciationReference=value;return next;
 }
 verify(session:NamingSession,archive:FactArchive|undefined):void {
  assertWordPronunciationFields(session);
  if(!readWordPronunciationPreference(session.preferences)){
   if(session.candidates.some(c=>Object.hasOwn(c,'wordPronunciationReference'))||session.sourceSnapshot?.sources.some(s=>(WORD_PRONUNCIATION_SOURCE_IDS as readonly string[]).includes(s.id)))throw Error('未开启的旧方案不得附加整词参照结果或来源。');return;
  }
  this.eligible(session,archive);this.verifySources(session);
  for(const candidate of session.candidates){
   const field=ownPhoneticValue(candidate,'wordPronunciationReference');if(!field.present||!field.value||typeof field.value!=='object')throw Error('已开启的方案缺少逐候选整词参照快照。');
   const value=candidate.wordPronunciationReference!;if(value.version!==WORD_PRONUNCIATION_VERSION||value.sourceLockSha256!==WORD_PRONUNCIATION_LOCK)throw Error('整词参照快照版本未知或来源锁不受支持，未改变原数据。');
   this.#reader.verifySnapshot(value,session.profile,session.preferences,candidate);
  }
 }
}
