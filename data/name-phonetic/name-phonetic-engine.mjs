import sourceProfile from './name-phonetic-profile.json' with {type:'json'};
import {PHONETIC_SOURCE_IDS,PHONETIC_PROFILE_SHA256,PHONETIC_SOURCE_LOCK_SHA256} from './package-pins.mjs';

/** Standalone current profiles only. Historical versions use the existing router. */
export const NAME_PHONETIC_VERSIONS=Object.freeze({...sourceProfile.versions});
function freeze(value){if(value&&typeof value==='object'){for(const entry of Object.values(value))freeze(entry);Object.freeze(value);}return value;}
const profile=freeze(sourceProfile);
const han=/^\p{Script=Han}+$/u;
const recordsByLanguage={cmn:profile.rules.filter(r=>r.language==='cmn'),yue:profile.rules.filter(r=>r.language==='yue')};

/** Exact private frozen object used by the evaluator. The caller receives a detached clone. */
export function getImportedNamePhoneticProfile(){return structuredClone(profile);}

/** Descriptor checks occur before reading caller values; no getter is invoked. */
export function canonicalPlainJson(value){
 let nodes=0;const parents=new Set();
 const visit=(item,depth)=>{
  if(depth>100||++nodes>100000)throw new Error('词音输入结构过大或过深。');
  if(item===null||typeof item==='string'||typeof item==='boolean')return JSON.stringify(item);
  if(typeof item==='number'&&Number.isFinite(item))return JSON.stringify(item);
  if(!item||typeof item!=='object')throw new Error('词音输入含非 JSON 值。');
  if(parents.has(item))throw new Error('词音输入不得循环引用。');
  const array=Array.isArray(item),prototype=Object.getPrototypeOf(item);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw new Error('词音输入不得含自定义原型。');
  const keys=Reflect.ownKeys(item);if(keys.some(key=>typeof key!=='string'))throw new Error('词音输入不得含符号字段。');
  if(array&&(keys.length!==item.length+1||keys.some(key=>key!=='length'&&!/^(0|[1-9]\d*)$/.test(key))))throw new Error('词音输入数组含额外字段或空位。');
  parents.add(item);
  const content=(array?Array.from({length:item.length},(_,i)=>String(i)):keys.sort()).map(key=>{
   const descriptor=Object.getOwnPropertyDescriptor(item,key);
   if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('词音输入不得含访问器、隐藏字段或数组空位。');
   return (array?'':JSON.stringify(key)+':')+visit(descriptor.value,depth+1);
  }).join(',');parents.delete(item);return array?'['+content+']':'{'+content+'}';
 };return visit(value,0);
}
const keysExactly=(value,keys)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))throw new Error('词音输入字段不完整或含额外字段。');
};
function nameGlyphs(text,min,max,label){
 if(typeof text!=='string'||!han.test(text)||[...text].length<min||[...text].length>max)throw new Error(label+'须保留完整汉字与字位。');return [...text];
}
function checkUnit(unit,text,language){
 keysExactly(unit,['text','selection']);if(unit.text!==text)throw new Error('姓名字位与已选读音不一致。');
 if(unit.selection===null)return null;
 const selected=unit.selection;keysExactly(selected,['text','tokens','confirmed','origin','referenceIds']);
 if(selected.text!==text||selected.confirmed!==true||!Array.isArray(selected.tokens)||selected.tokens.length!==[...text].length)throw new Error('姓名读音未明确确认或不符合一字一音节。');
 const tokenPattern=language==='cmn'?/^[a-zv]+[1-5]$/:/^[a-z]+[1-6]$/;
 if(selected.tokens.some(token=>typeof token!=='string'||token.length>16||!tokenPattern.test(token)))throw new Error('姓名音节必须使用规范数字调号。');
 if(language==='cmn'?selected.origin!=='current-default':!['dictionary','user'].includes(selected.origin))throw new Error('普通话只评估当前确认的默认读音；粤语只评估已确认选择。');
 if(!Array.isArray(selected.referenceIds)||selected.referenceIds.some(id=>typeof id!=='string'||!id||id.length>200)||new Set(selected.referenceIds).size!==selected.referenceIds.length)throw new Error('姓名读音参考标识无效。');
 return selected.tokens;
}
function validateInput(input,version){
 canonicalPlainJson(input);keysExactly(input,['surname','given','mode','reading']);
 const surname=nameGlyphs(input.surname,1,4,'姓氏'),given=nameGlyphs(input.given,1,2,'给名');
 if(input.mode!=='strict'&&input.mode!=='ignore-tone')throw new Error('词音复核模式无效。');
 const reading=input.reading;keysExactly(reading,['version','language','surname','given']);
 if(reading.version!=='selected-name-phonetics/1.0.0'||!['cmn','yue'].includes(reading.language))throw new Error('姓名读音输入版本或语言无效。');
 const language=reading.language;
 if(version!==undefined&&version!==NAME_PHONETIC_VERSIONS[language])throw new Error('词音 profile 版本不受此新引擎支持；历史记录须使用原路由。');
 if(!Array.isArray(reading.given)||reading.given.length!==given.length)throw new Error('给名逐字读音数量不一致。');
 const tokens=[checkUnit(reading.surname,input.surname,language),...reading.given.map((unit,i)=>checkUnit(unit,given[i],language))];
 return {language,glyphs:[...surname,...given],surnameLength:surname.length,tokens};
}

export function calculateNamePhoneticReview(input,version){
 const {language,glyphs,surnameLength,tokens}=validateInput(input,version);
 const missing=tokens.flatMap((token,i)=>token?[]:[i===0?'姓氏实际读音尚未确认。':`给名第${i}字实际读音尚未确认。`]);
 const base={version:NAME_PHONETIC_VERSIONS[language],language,mode:input.mode,fullName:input.surname+input.given,selectedTokens:[],matches:[],missing,sourceIds:[...PHONETIC_SOURCE_IDS],profileSha256:PHONETIC_PROFILE_SHA256,sourceLockSha256:PHONETIC_SOURCE_LOCK_SHA256,coverageNotice:'',limitations:[...profile.limitations]};
 if(missing.length)return {...base,status:'not-assessed',coverageNotice:'存在未确认读音，本语言的词汇联想复核暂停。'};
 const selectedTokens=tokens.flat(),matches=[],stripTone=token=>token.slice(0,-1);
 for(const rule of recordsByLanguage[language])for(let start=0;start+rule.tokens.length<=selectedTokens.length;start++){
  const endExclusive=start+rule.tokens.length;if(endExclusive<=surnameLength)continue;
  const actualTokens=selectedTokens.slice(start,endExclusive),exact=actualTokens.every((token,i)=>token===rule.tokens[i]);
  if(!exact&&(input.mode!=='ignore-tone'||!actualTokens.every((token,i)=>stripTone(token)===stripTone(rule.tokens[i]))))continue;
  const scope=start===0&&endExclusive===glyphs.length?'whole-full-name':start===surnameLength&&endExclusive===glyphs.length?'whole-given-name':start<surnameLength?'cross-surname-given':'given-subspan';
  matches.push({rule:structuredClone(rule),span:{start,endExclusive,text:glyphs.slice(start,endExclusive).join(''),scope},actualTokens,comparison:exact?'exact':'tone-only',differentTonePositions:actualTokens.flatMap((token,i)=>token===rule.tokens[i]?[]:[start+i])});
 }
 return {...base,status:'assessed',selectedTokens,matches,coverageNotice:matches.length?'当前固定词表存在词汇联想命中，请按原词义、所选读音与语境复核。':'当前固定有限词表内无命中；这不表示姓名谐音安全。'};
}

export function calculateCombinedNamePhoneticReviews(inputs){
 canonicalPlainJson(inputs);
 if(!inputs||typeof inputs!=='object'||Array.isArray(inputs)||!Object.keys(inputs).length||Object.keys(inputs).some(key=>key!=='cmn'&&key!=='yue'))throw new Error('联合词音复核须按 cmn/yue 提供输入。');
 const result={};let name;
 for(const language of ['cmn','yue'])if(Object.hasOwn(inputs,language)){
  const review=calculateNamePhoneticReview(inputs[language]);if(review.language!==language)throw new Error('联合词音复核语言键不一致。');
  const pair=canonicalPlainJson([inputs[language].surname,inputs[language].given]);if(name!==undefined&&name!==pair)throw new Error('联合词音复核不能混合不同姓名。');name=pair;result[language]=review;
 }return result;
}

export function isCanonicalNamePhoneticReview(value,input,version){
 try{return canonicalPlainJson(value)===canonicalPlainJson(calculateNamePhoneticReview(input,version));}catch{return false;}
}

/** Convert explicit separated selected Pinyin; never segment a fused word or infer a missing tone. */
export function normalizeSelectedPinyin(text,expectedSyllables){
 if(typeof text!=='string'||text.length>100||!Number.isInteger(expectedSyllables)||expectedSyllables<1||expectedSyllables>4)throw new Error('已选普通话读音输入无效。');
 const parts=text.toLowerCase().trim().split(/\s+/);if(parts.length!==expectedSyllables)throw new Error('普通话姓氏或逐字读音须显式分隔，不能猜测音节边界。');
 return parts.map(part=>{
  let normalized=part.normalize('NFD').replace(/u\u0308/g,'v').replace(/u:/g,'v');
  const marks=[...normalized.matchAll(/[\u0304\u0301\u030c\u0300]/g)].map(match=>({'\u0304':'1','\u0301':'2','\u030c':'3','\u0300':'4'})[match[0]]);
  const number=normalized.match(/[1-5]$/)?.[0];if(marks.length>1||marks.length&&number)throw new Error('普通话音节不能混合或重复标调。');
  const tone=number||marks[0];if(!tone)throw new Error('普通话读音缺少明确声调；轻声必须明确写 5。');
  normalized=normalized.replace(/[\u0304\u0301\u030c\u0300]/g,'').replace(/[1-5]$/,'');
  if(!/^[a-zv]+$/.test(normalized)||normalized.length>15)throw new Error('普通话音节格式无效。');return normalized+tone;
 });
}

export function getNamePhoneticProfileInfo(){
 return {versions:{...NAME_PHONETIC_VERSIONS},languages:Object.fromEntries(['cmn','yue'].map(language=>[language,{terms:new Set(recordsByLanguage[language].map(r=>r.term)).size,rules:recordsByLanguage[language].length}])),limitations:[...profile.limitations]};
}
