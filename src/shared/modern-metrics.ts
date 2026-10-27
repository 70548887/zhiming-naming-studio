import type {NameCandidate,SourceRecord} from './types';
import {assertModernPlainData,modernRecordView} from './modern-practical-evidence';
import {NAME_PHONETIC_SNAPSHOT_VERSION,NAME_PHONETIC_SOURCE_IDS,NAME_PHONETIC_VERSIONS,ownPhoneticValue} from './name-phonetic-preferences';
import {PARENT_NAME_REVIEW_VERSION} from './parent-name-phonetics-review';
import {PARENT_NAME_PHONETICS_VERSION,normalizeParentCmnToken,normalizeParentDictionaryCmnToken} from './parent-name-phonetics';
import {normalizeSelectedPinyin} from '../../data/name-phonetic/name-phonetic-engine.mjs';
import {validYueHomophoneRuleVersion} from './yue-homophone-types';

export const MODERN_METRICS_SCHEMA='modern-metrics-coverage/1' as const;
export type ModernMetricStatus='measured'|'historical'|'not-measured';
export type ModernMetricId='mandarin-homophone'|'cantonese-homophone'|'parent-name-avoidance'|'official-2021-given-name'|'industry-wording'|'psychological-measurement';
export interface ModernMetricCoverageRow {id:ModernMetricId;label:string;status:ModernMetricStatus;value:string|null;evidence:string;sourceIds:readonly string[];limitations:readonly string[];}
export interface ModernMetricsCoverageMatrix {schema:typeof MODERN_METRICS_SCHEMA;rows:readonly ModernMetricCoverageRow[];boundaries:readonly string[];}
export type ModernMetricsCandidate=Pick<NameCandidate,'id'|'givenName'|'fullName'|'pinyin'|'meaning'|'characters'|'yueReading'|'namePhoneticReviews'|'yueHomophones'|'parentNamePhoneticReview'|'modernPracticalEvidence'>;
type Observation={status:'measured'|'historical';value:string;evidence:string;sourceIds:string[]};
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const sources=(value:unknown):value is string[]=>strings(value)&&value.length>0&&value.every(item=>!!item.trim())&&new Set(value).size===value.length;
const sha=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const modes=(value:unknown)=>value==='strict'||value==='ignore-tone';
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
function sourceRecord(source:SourceRecord|null|undefined):source is SourceRecord{return !!source&&typeof source.id==='string'&&!!source.id&&typeof source.name==='string'&&sha(source.sha256)&&sources(source.files);}
function characterToken(character:NameCandidate['characters'][number]):string{
 const tone=character.tone;
 if(tone!==1&&tone!==2&&tone!==3&&tone!==4&&tone!==5)throw Error('保存字音缺少明确声调');
 return normalizeParentDictionaryCmnToken({pinyin:character.pinyin,tone});
}
/** Match the ordinary candidate adapter's explicit selected-Pinyin parser.
 * The stricter family-input syntax above stays confined to parent comparisons. */
function cmnDefaultCharacterToken(character:NameCandidate['characters'][number]):string{
 const tone=character.tone;
 if(tone!==1&&tone!==2&&tone!==3&&tone!==4&&tone!==5)throw Error('保存字音缺少明确声调');
 const token=normalizeSelectedPinyin(character.pinyin,1)[0];
 if(Number(token.at(-1))!==tone)throw Error('保存字音与声调不符');
 return token;
}
function own<T>(candidate:ModernMetricsCandidate,key:keyof ModernMetricsCandidate):T|undefined{
 const field=ownPhoneticValue(candidate,key);if(field.value===undefined)return undefined;
 assertModernPlainData(field.value);return field.value as T;
}
/** Display guards only. Store retains canonical source/row authentication;
 * these checks never run an evaluator or turn a caller digest into evidence. */
function observe(body:()=>Observation|null):Observation|null{try{return body();}catch{return null;}}
function savedYueTokens(candidate:ModernMetricsCandidate):string[]|null{
 const reading=own<NameCandidate['yueReading']>(candidate,'yueReading');
 if(!reading||reading.version!=='yue-name-reading/1.0.0'||reading.language!=='yue'||reading.romanization!=='Jyutping'||reading.status!=='confirmed'||!sources(reading.sourceIds)||!reading.sourceIds.includes('rime-cantonese-jyutping')||!Array.isArray(reading.given)||reading.given.map(unit=>unit.text).join('')!==candidate.givenName||reading.surname.text+candidate.givenName!==candidate.fullName)return null;
 const units=[reading.surname,...reading.given];
 if(units.some(unit=>!unit.selection||unit.selection.confirmed!==true||!['dictionary','user'].includes(unit.selection.origin)||!strings(unit.selection.tokens)||unit.selection.tokens.length!==[...unit.text].length||unit.selection.tokens.some(token=>!/^[a-z]+[1-6]$/.test(token))))return null;
 const tokens=units.flatMap(unit=>unit.selection!.tokens);
 return same(tokens,reading.fullNameTokens)?tokens:null;
}
function phonetic(candidate:ModernMetricsCandidate,language:'cmn'|'yue'):Observation|null{return observe(()=>{
 const snapshot=own<NameCandidate['namePhoneticReviews']>(candidate,'namePhoneticReviews');
 if(!snapshot||snapshot.version!==NAME_PHONETIC_SNAPSHOT_VERSION||snapshot.recordState!=='recorded'||snapshot.readingPolicy!=='saved-default-and-confirmed-yue/1.0.0'||!sha(snapshot.engine.profileSha256)||!sha(snapshot.engine.sourceLockSha256)||!sha(snapshot.engine.actualProfileObjectSha256))return null;
 const review=snapshot.reviews[language],reading=snapshot.selectedReadings[language];
 if(!review||review.version!==NAME_PHONETIC_VERSIONS[language]||review.language!==language||review.status!=='assessed'||!modes(review.mode)||review.fullName!==candidate.fullName||!sources(review.sourceIds)||review.sourceIds.length!==NAME_PHONETIC_SOURCE_IDS.length||!NAME_PHONETIC_SOURCE_IDS.every(id=>review.sourceIds.includes(id))||review.profileSha256!==snapshot.engine.profileSha256||review.sourceLockSha256!==snapshot.engine.sourceLockSha256||!Array.isArray(review.matches)||!strings(review.missing)||review.missing.length||!strings(review.limitations)||typeof review.coverageNotice!=='string')return null;
 if(!reading||reading.version!=='selected-name-phonetics/1.0.0'||reading.language!==language||!Array.isArray(reading.given)||reading.given.map(unit=>unit.text).join('')!==candidate.givenName||reading.surname.text+candidate.givenName!==candidate.fullName)return null;
 const tokenPattern=language==='cmn'?/^[a-zv]+[1-5]$/:/^[a-z]+[1-6]$/;
 const units=[reading.surname,...reading.given];
 if(units.some(unit=>!unit.selection||unit.selection.confirmed!==true||unit.selection.text!==unit.text||!strings(unit.selection.tokens)||unit.selection.tokens.length!==[...unit.text].length||unit.selection.tokens.some(token=>!tokenPattern.test(token))||!strings(unit.selection.referenceIds)||!(language==='cmn'?unit.selection.origin==='current-default':['dictionary','user'].includes(unit.selection.origin))))return null;
 const tokens=units.flatMap(unit=>unit.selection!.tokens);
 if(!same(tokens,review.selectedTokens))return null;
 if(language==='cmn'){
  if(candidate.characters.map(char=>char.char).join('')!==candidate.givenName||!same(reading.given.map(unit=>unit.selection!.tokens),candidate.characters.map(char=>[cmnDefaultCharacterToken(char)]))||!same(tokens,normalizeSelectedPinyin(candidate.pinyin,[...candidate.fullName].length)))return null;
 }else if(!same(tokens,savedYueTokens(candidate)))return null;
 if(review.matches.some(match=>!match.rule||match.rule.language!==language||!strings(match.rule.tokens)||!Array.isArray(match.rule.sourceRefs)||!match.rule.sourceRefs.length||match.rule.sourceRefs.some(source=>!review.sourceIds.includes(source.id))||!strings(match.actualTokens)||!same(match.actualTokens,tokens.slice(match.span.start,match.span.endExclusive))||[...candidate.fullName].slice(match.span.start,match.span.endExclusive).join('')!==match.span.text))return null;
 return{status:'measured',value:`已保存${language==='cmn'?'普通话':'粤语'}有限词表复核`,evidence:`保存版本 ${review.version}；仅显示已评估的候选记录。来源 ${review.sourceIds.join('、')}。`,sourceIds:[...review.sourceIds]};
});}
function legacyYue(candidate:ModernMetricsCandidate):Observation|null{return observe(()=>{
 const review=own<NameCandidate['yueHomophones']>(candidate,'yueHomophones');
 if(!review||!validYueHomophoneRuleVersion(review.version)||review.status!=='assessed'||!modes(review.mode)||review.fullName!==candidate.fullName||!sources(review.sourceIds)||!strings(review.selectedTokens)||review.selectedTokens.length!==[...candidate.fullName].length||review.selectedTokens.some(token=>!/^[a-z]+[1-6]$/.test(token))||!Array.isArray(review.matches)||!strings(review.missing)||review.missing.length||!strings(review.limitations)||!Array.isArray(review.sourceReferences)||!review.sourceReferences.length||review.sourceReferences.some(source=>!review.sourceIds.includes(source.id)||typeof source.file!=='string'||!Number.isInteger(source.line)))return null;
 const expected=review.version==='yue-homophone-review/1.0.0'?['yue-homophones-wiktionary-fixed','yue-homophones-rime-fixed']:['yue-homophones-wiktionary-extended-fixed','yue-homophones-rime-extended-fixed'];
 if(review.sourceIds.length!==expected.length||!expected.every(id=>review.sourceIds.includes(id))||!same(review.selectedTokens,savedYueTokens(candidate)))return null;
 if(review.matches.some(match=>!Array.isArray(match.sourceRefs)||!match.sourceRefs.length||match.sourceRefs.some(source=>!review.sourceIds.includes(source.id))||!same(match.actualTokens,review.selectedTokens.slice(match.span.start,match.span.endExclusive))||[...candidate.fullName].slice(match.span.start,match.span.endExclusive).join('')!==match.span.text))return null;
 return{status:'measured',value:'已保存粤语有限词表复核',evidence:`按保存版本 ${review.version} 展示。来源 ${review.sourceIds.join('、')}。`,sourceIds:[...review.sourceIds]};
});}
function parent(candidate:ModernMetricsCandidate):Observation|null{return observe(()=>{
 const saved=own<NameCandidate['parentNamePhoneticReview']>(candidate,'parentNamePhoneticReview');
 if(!saved||saved.version!==PARENT_NAME_REVIEW_VERSION||saved.recordState!=='recorded'||saved.candidateId!==candidate.id||!saved.sessionId||!modes(saved.capture.mode)||saved.capture.child.givenName!==candidate.givenName||saved.capture.child.surname+saved.capture.child.givenName!==candidate.fullName)return null;
 const result=saved.result;
 if(result.version!==PARENT_NAME_PHONETICS_VERSION||result.mode!==saved.capture.mode||result.scope!=='whole-given-name-syllables-only'||result.childGivenName!==candidate.givenName||result.childFullName!==candidate.fullName||!Array.isArray(result.comparisons)||result.comparisons.length!==2||new Set(result.comparisons.map(row=>row.role)).size!==2||!strings(result.limitations)||typeof result.notice!=='string'||result.scoreDelta!==0||result.automaticRejection!==false)return null;
 if(candidate.characters.map(char=>char.char).join('')!==candidate.givenName||candidate.characters.length!==[...candidate.givenName].length||!same(saved.capture.child.characters,candidate.characters.map(({char,pinyin,tone,sourceId})=>({char,pinyin,tone,sourceId}))))return null;
 const method=saved.sourceSnapshot.method;
 if(!sourceRecord(method)||method.id!=='parent-name-phonetics-method-149-v1'||saved.sourceSnapshot.confirmationPolicy!=='family-confirmed-actual-reading'||!Array.isArray(saved.sourceSnapshot.dictionarySources))return null;
 for(const row of result.comparisons){
  if(!['father','mother'].includes(row.role)||!['matched','no-match','not-assessed'].includes(row.status)||row.childGivenName!==candidate.givenName||row.parentFullName!==saved.capture.parentNames[row.role==='father'?'fatherName':'motherName']||typeof row.reason!=='string'||!Array.isArray(row.differentTonePositions))return null;
  if(row.status==='not-assessed'){if(row.comparison!==null)return null;continue;}
  if(!strings(row.actualChildTokens)||!strings(row.parentTokens)||!row.confirmedParentReading||row.confirmedParentReading.fullName!==row.parentFullName||row.confirmedParentReading.givenName!==row.parentGivenName)return null;
  const confirmed=row.confirmedParentReading;
  if(row.parentTokens.some(token=>normalizeParentCmnToken(token)!==token))return null;
  if(confirmed.version!=='parent-name-reading/1.0.0'||confirmed.role!==row.role||!Array.isArray(confirmed.readings)||!row.parentGivenName||confirmed.readings.length!==[...row.parentGivenName].length||confirmed.readings.some((unit,index)=>unit.confirmed!==true||unit.index!==index||unit.char!==[...row.parentGivenName!][index])||!same(row.parentTokens,confirmed.readings.map(unit=>unit.token))||!same(row.actualChildTokens,candidate.characters.map(characterToken)))return null;
  if(row.status==='matched'?!['exact','tone-only'].includes(row.comparison??'')||result.mode==='strict'&&row.comparison==='tone-only':row.comparison!==null)return null;
 }
 const assessed=result.comparisons.filter(row=>row.status!=='not-assessed').length;
 if(!assessed)return null;
 return{status:'measured',value:`已保存家庭给名读音比较（${assessed}/2 位）`,evidence:`只显示已完成的比较；未确认父母仍未测。来源 ${method.id}。`,sourceIds:[method.id]};
});}
function industry(candidate:ModernMetricsCandidate):Observation|null{return observe(()=>{
 const view=modernRecordView(candidate),record=view.record;
 if(!record||!['current','stale'].includes(view.state)||record.capture.candidateId!==candidate.id||record.evidence.status!=='recorded-evidence')return null;
 const evidence=record.evidence,industry=evidence.observations.meaningIndustry.industry,rule=industry.recordedRuleIdentitySource;
 if(evidence.subject.fullName!==candidate.fullName||evidence.subject.givenName!==candidate.givenName||evidence.subject.pinyin!==candidate.pinyin||industry.status!=='limited-project-lexical-rule-observation'||!rule||rule.status!=='saved-source-record'||!sourceRecord(rule.record)||rule.sourceId!==rule.record.id)return null;
 return{status:view.state==='stale'?'historical':'measured',value:view.state==='stale'?'历史已保存行业词面观察':'已保存行业关键词词面观察',evidence:view.state==='stale'?'保存后寓意已修改；仅供历史，不代表当前组合寓意。':`采用现有现代说明记录。来源 ${rule.sourceId}。`,sourceIds:[rule.sourceId]};
});}

export function buildModernMetricsCoverage(candidate:ModernMetricsCandidate):ModernMetricsCoverageMatrix{
 // Only relevant own data fields are inspected. Invalid snapshots fail closed
 // per row without invoking accessors or affecting unrelated valid evidence.
 const make=(id:ModernMetricId,label:string,result:Observation|null,evidence:string,limitations:string[]):ModernMetricCoverageRow=>({id,label,status:result?.status??'not-measured',value:result?.value??null,evidence:result?.evidence??evidence,sourceIds:result?.sourceIds??[],limitations});
 let input:ModernMetricsCandidate|undefined;
 try{
  const id=own<string>(candidate,'id'),givenName=own<string>(candidate,'givenName'),fullName=own<string>(candidate,'fullName'),pinyin=own<string>(candidate,'pinyin'),meaning=own<string>(candidate,'meaning'),characters=own<NameCandidate['characters']>(candidate,'characters');
  if(typeof id==='string'&&id&&typeof givenName==='string'&&givenName&&typeof fullName==='string'&&fullName&&typeof pinyin==='string'&&typeof meaning==='string'&&Array.isArray(characters))input={id,givenName,fullName,pinyin,meaning,characters};
 }catch{}
 const valid=(body:(value:ModernMetricsCandidate)=>Observation|null)=>input?observe(()=>body(candidate)):null;
 return{schema:MODERN_METRICS_SCHEMA,rows:[
  make('mandarin-homophone','普通话谐音',valid(c=>phonetic(c,'cmn')),'未保存可解释且已评估的普通话复核；未知版本、缺少来源或未确认均未测。',['有限词表复核不代表姓名安全、社会接受度或心理因果。']),
  make('cantonese-homophone','粤语谐音',valid(c=>{const newer=own<NameCandidate['namePhoneticReviews']>(c,'namePhoneticReviews');const older=own<NameCandidate['yueHomophones']>(c,'yueHomophones');if(newer?.reviews?.yue&&older)return null;return newer?.reviews?.yue?phonetic(c,'yue'):legacyYue(c);}),'未保存可解释且已评估的粤语复核；只有读音或尚未确认不算已测。',['词表未命中不表示没有其他谐音或语境风险。']),
  make('parent-name-avoidance','父母姓名避让',valid(parent),'未保存可解释且已完成的父母给名比较；未确认仍未测。',['只比较保存的完整给名读音；不推断家庭关系、心理效果或全面避讳。']),
  make('official-2021-given-name','官方 2021 给名榜单',null,'已有独立只读榜单查询入口；本矩阵未执行查询，不重复展示统计结果。',['仅统计给名，不含姓氏；未列榜人数未知；不能推导当前全国全名重名率。']),
  make('industry-wording','行业／营销词面观察',valid(industry),'现代说明未记录、格式无效、版本不支持或不属于本候选，未测。',['只描述字面规则观察；未测转化率、市场效果、职业结果或因果关系。']),
  make('psychological-measurement','心理测量／心理因果',null,'未提供心理量表、受试者数据或因果实验，未测。',['不把寓意、音韵或家长期许解释为心理测量结果。'])
 ],boundaries:['只读已保存记录；格式和候选绑定检查不代替主进程的完整来源认证。','历史观察不代表当前结果；未测值保持 null，不推断安全、流行、心理或营销效果。','矩阵不参与评分、排序、生成、候选淘汰或传统术数判断。']};
}
