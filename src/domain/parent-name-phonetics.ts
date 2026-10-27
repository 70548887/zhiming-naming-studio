import {canonicalPlainJson} from '../shared/plain-json';
import {PARENT_NAME_PHONETICS_VERSION,normalizeParentCmnToken,parentFullName,validateParentNameReadings} from '../shared/parent-name-phonetics';
import type {ParentNamePhoneticInput,ParentNamePhoneticResult,ParentNamePhoneticComparison,TrustedParentCmnQueries} from '../shared/parent-name-phonetics';

/** Complete-given-name comparison only. Caller supplies the actually saved child
 * character readings and family-confirmed parent record, never enumerated polyphony.
 * Main authenticates any dictionary query map before invoking this pure module.
 */
export function calculateParentNamePhonetics(input:ParentNamePhoneticInput,queries?:TrustedParentCmnQueries):ParentNamePhoneticResult{
 const serialized=canonicalPlainJson(input);if(serialized.length>80000)throw Error('家庭读音比较输入过大。');
 if(!input||!['none','strict','ignore-tone'].includes(input.mode)||!input.child||Object.keys(input).some(k=>!['mode','profile','child','readings'].includes(k)))throw Error('家庭读音比较模式或字段无效。');
 const parents=validateParentNameReadings(input.readings,input.profile,queries),child=input.child;let childTokens:string[]|null=null,childReason='';
 try{
  if(!/^\p{Script=Han}{1,4}$/u.test(child.surname)||!/^\p{Script=Han}{1,2}$/u.test(child.givenName)||!Array.isArray(child.characters)||child.characters.length!==[...child.givenName].length||child.characters.some((r,i)=>r.char!==[...child.givenName][i]||typeof r.sourceId!=='string'||!r.sourceId))throw Error('候选给名与保存字位不完整。');
  childTokens=child.characters.map(r=>{const token=normalizeParentCmnToken(r.pinyin);if(!Number.isInteger(r.tone)||Number(token.at(-1))!==r.tone)throw Error('候选字的保存读音与声调不符。');return token;});
 }catch(error){childTokens=null;childReason=String(error instanceof Error?error.message:error);}
 const comparisons:ParentNamePhoneticComparison[]=(['father','mother'] as const).map(role=>{
  const parent=parents.find(r=>r.role===role),fullName=parentFullName(input.profile,role),base={role,status:'not-assessed' as const,comparison:null,parentFullName:fullName,parentGivenName:parent?.givenName??null,childGivenName:child.givenName,actualChildTokens:childTokens,parentTokens:parent?.readings.map(r=>r.token)??null,differentTonePositions:[],confirmedParentReading:parent?structuredClone(parent):null};
  if(input.mode==='none')return{...base,reason:'家庭给名读音比较未启用。'};
  if(!childTokens)return{...base,reason:'候选给名实际保存读音不完整，未比较：'+childReason};
  if(!fullName||!parent)return{...base,reason:fullName?'尚未完整确认该位家人的给名读音；未从姓名文字猜测。':'未填写该位家人的完整姓名，未比较。'};
  const parentTokens=parent.readings.map(r=>r.token),exact=parentTokens.length===childTokens.length&&parentTokens.every((r,i)=>r===childTokens![i]),sameSyllables=parentTokens.length===childTokens.length&&parentTokens.every((r,i)=>r.slice(0,-1)===childTokens![i].slice(0,-1));
  if(exact)return{...base,status:'matched' as const,comparison:'exact' as const,reason:'双方确认的完整给名音节与声调相同；仅作家庭重音提醒，不决定名字适合度。'};
  if(input.mode==='ignore-tone'&&sameSyllables)return{...base,status:'matched' as const,comparison:'tone-only' as const,differentTonePositions:parentTokens.flatMap((r,i)=>r===childTokens![i]?[]:[i]),reason:'忽略声调时完整给名音节相同，标出的字位声调不同；这不是严格同音。'};
  return{...base,status:'no-match' as const,reason:'按本次确认读音、模式与完整给名范围未匹配；不代表姓名谐音安全。'};
 });
 const units=parents.flatMap(r=>r.readings),dictionarySourceIds=[...new Set(units.flatMap(r=>r.origin==='dictionary'?[r.source.sourceId]:[]))];
 return{version:PARENT_NAME_PHONETICS_VERSION,mode:input.mode,scope:'whole-given-name-syllables-only',childFullName:child.surname+child.givenName,childGivenName:child.givenName,comparisons,readingOrigins:{dictionarySourceIds,hasFamilyConfirmedInput:units.some(r=>r.origin==='family-confirmed')},notice:'只比较父母与孩子完整给名的实际采用音节；字形避讳与有限词表检查另行保留，未命中不表示安全。',limitations:['父母原姓名与姓/给名边界须明确确认；不自动猜复姓或枚举多音。','手输来源是家庭确认，不冒充字典或普通话认证。MOE候选明确来自台湾教育部固定词典，不当作大陆标准或真人实际读法证明。','忽略声调只去末尾数字调，不合并n/l、平翘舌、前后鼻音或ü/u；不推断连读音变。','只比较整个给名，不匹配单字、子串或父母姓氏，不判断完整姓名词义或心理影响。'],scoreDelta:0,automaticRejection:false,wholeNameSuitability:'not-assessed'};
}
