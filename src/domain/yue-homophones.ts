import type {YueNameReading} from '../shared/types';
import type {YueHomophoneData,YueHomophoneMatch,YueHomophoneMode,YueHomophoneReview,YueHomophoneScope} from '../shared/yue-homophone-types';
import {canonicalPlainJson} from '../shared/plain-json';
import {confirmYueNameReading,yueReadingSelections} from './yue-reading';

export const YUE_HOMOPHONE_VERSION='yue-homophone-review/1.0.0' as const;
export const YUE_HOMOPHONE_WIKI_SOURCE_ID='yue-homophones-wiktionary-fixed';
export const YUE_HOMOPHONE_RIME_SOURCE_ID='yue-homophones-rime-fixed';
export const YUE_HOMOPHONE_SOURCE_IDS=[YUE_HOMOPHONE_WIKI_SOURCE_ID,YUE_HOMOPHONE_RIME_SOURCE_ID] as const;

/** Compare explicitly selected character-aligned syllables; no ranking, filtering or polyphonic enumeration. */
export function calculateYueHomophoneReview(surname:string,given:string,reading:YueNameReading,mode:YueHomophoneMode,data:YueHomophoneData):YueHomophoneReview{
  canonicalPlainJson(reading);canonicalPlainJson(data);
  if(typeof surname!=='string'||!/^\p{Script=Han}{1,4}$/u.test(surname)||typeof given!=='string'||!/^\p{Script=Han}{1,2}$/u.test(given))throw new Error('粤语词汇复核须保留完整中文姓氏与给名。');
  if(mode!=='strict'&&mode!=='ignore-tone')throw new Error('粤语词汇复核模式无效。');
  if(data.version!==YUE_HOMOPHONE_VERSION||canonicalPlainJson(data.sourceIds)!==canonicalPlainJson([...YUE_HOMOPHONE_SOURCE_IDS])||data.rules.length!==12)throw new Error('粤语词汇规则版本不一致。');
  if(reading.surname.text!==surname||reading.given.length!==[...given].length||reading.given.some((unit,index)=>unit.text!==[...given][index]))throw new Error('粤语读音记录与当前姓名不一致。');
  if(canonicalPlainJson(confirmYueNameReading(reading,yueReadingSelections(reading)))!==canonicalPlainJson(reading))throw new Error('粤语读音确认状态或音节记录无效。');
  const base={version:YUE_HOMOPHONE_VERSION,mode,fullName:surname+given,sourceIds:[...data.sourceIds],sourceReferences:structuredClone(data.sourceReferences),limitations:[...data.limitations]};
  const units=[reading.surname,...reading.given],missing=units.flatMap((unit,index)=>unit.selection?[]:[`${index===0?'姓氏':`名字第${index}字`}“${unit.text}”的实际读音尚未确认。`]);
  if(missing.length)return{...base,status:'not-assessed',selectedTokens:[],matches:[],missing};
  const selectedTokens=units.flatMap(unit=>unit.selection!.tokens),glyphs=[...surname,...given],surnameLength=[...surname].length,matches:YueHomophoneMatch[]=[];
  if(selectedTokens.length!==glyphs.length)throw new Error('粤语姓名音节与字位不一致。');
  const withoutTone=(token:string)=>token.replace(/[1-6]$/u,'');
  for(const rule of data.rules){
    for(let start=0;start+rule.tokens.length<=selectedTokens.length;start++){
      const endExclusive=start+rule.tokens.length;
      if(endExclusive<=surnameLength)continue;
      const scope:YueHomophoneScope|null=start===0&&endExclusive===glyphs.length?'whole-full-name':start===surnameLength&&endExclusive===glyphs.length?'whole-given-name':start<surnameLength&&endExclusive>surnameLength?'cross-surname-given':null;
      if(!scope||!rule.scopes.includes(scope))continue;
      const actualTokens=selectedTokens.slice(start,endExclusive);
      const exact=actualTokens.every((token,index)=>token===rule.tokens[index]);
      if(!exact&&(mode!=='ignore-tone'||!actualTokens.every((token,index)=>withoutTone(token)===withoutTone(rule.tokens[index]))))continue;
      matches.push({ruleId:rule.id,term:rule.term,category:rule.category,register:[...rule.register],glosses:structuredClone(rule.glosses),sourceRefs:structuredClone(rule.sourceRefs),
        span:{start,endExclusive,text:glyphs.slice(start,endExclusive).join(''),scope},actualTokens:[...actualTokens],ruleTokens:[...rule.tokens],comparison:exact?'exact':'tone-only',
        differentTonePositions:actualTokens.flatMap((token,index)=>token===rule.tokens[index]?[]:[start+index]),notice:rule.notice});
    }
  }
  return{...base,status:'assessed',selectedTokens:[...selectedTokens],matches,missing:[]};
}

/** Main callers also authenticate the unchanged YueNameReading against its own fixed reading package. */
export function isCanonicalYueHomophoneReview(value:unknown,surname:string,given:string,reading:YueNameReading,mode:YueHomophoneMode,data:YueHomophoneData):value is YueHomophoneReview{
  try{return canonicalPlainJson(value)===canonicalPlainJson(calculateYueHomophoneReview(surname,given,reading,mode,data));}catch{return false;}
}
