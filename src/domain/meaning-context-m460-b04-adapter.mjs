import {types} from 'node:util';
import {loadVerifiedB04ContextCandidate} from '../../scripts/meaning-context-m460-b04-candidate.mjs';

export const B04_WORD_CONTEXT_OPTIONS_SCHEMA='b04-word-context-options/1';
const plain=value=>{if(value===null||typeof value!=='object'||Array.isArray(value))return false;try{return [Object.prototype,null].includes(Object.getPrototypeOf(value));}catch{return false;}};
const requirePlain=(value,message)=>{if(types.isProxy(value))throw new Error(message);if(!plain(value))throw new Error(message);return value;};
const inputKeys=['char','pinyin'];
function readInput(input){
  requirePlain(input,'B04词语查询拒绝代理或非普通对象。');
  const output={};
  for(const key of Reflect.ownKeys(input)){
    if(typeof key!=='string'||!inputKeys.includes(key))throw new Error('B04词语查询包含未允许字段。');
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('B04词语查询拒绝访问器或隐藏字段。');
    output[key]=descriptor.value;
  }
  if(typeof output.char!=='string'||[...output.char].length!==1)throw new Error('B04词语查询需要一个汉字。');
  if(Object.hasOwn(output,'pinyin')&&(typeof output.pinyin!=='string'||output.pinyin.length===0))throw new Error('B04词语查询读音必须为非空文字；省略字段表示不筛选。');
  return output;
}
const sourceAnchor=source=>({sourceId:source.id,word:source.word,pinyin:source.pinyin,originalFile:source.originalFile,originalSha256:source.originalSha256,rawEntryIndex:source.rawEntryIndex,rawHeteronymIndex:source.rawHeteronymIndex,rawDefinitionIndex:source.rawDefinitionIndex,definition:structuredClone(source.definition),parsedEntrySha256:source.parsedEntrySha256,license:source.license});

/**
 * Independent B04 read-only adapter. It authenticates the candidate package on
 * every query and returns options only; it never writes a session, score or
 * naming recommendation and never accepts a caller-supplied choice as proof.
 */
export function createB04WordContextAdapter({candidateDataDir,originalDataDir}){
  if(typeof candidateDataDir!=='string'||typeof originalDataDir!=='string')throw new Error('B04适配器需要固定数据目录。');
  return Object.freeze({
    async getB04WordContextOptions(input){
      const query=readInput(input),capsule=loadVerifiedB04ContextCandidate(candidateDataDir,originalDataDir);
      const options=capsule.publication.cases.filter(row=>row.char===query.char&&(!query.pinyin||row.confirmedReadings.some(reading=>reading.char===row.char&&reading.pinyin===query.pinyin))).map(row=>({
        givenName:row.givenName,word:row.source.word,targetPositions:[...row.targetPositions],confirmedReadings:structuredClone(row.confirmedReadings),
        selection:{usage:row.selection.usage,caseId:row.selection.caseId,senseId:row.selection.senseId,contextKey:row.selection.contextKey},contextLabel:row.selection.contextLabel,
        source:sourceAnchor(row.source),grammar:structuredClone(row.grammar),reason:row.reason,exclusions:[...row.exclusions],limits:[...row.exclusions],
        wholeWordOnly:true,sourcePOS:'unknown',activation:'off',productionApproved:false,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,wholeNameApproved:false,wholeNameMeaning:null,scoreDelta:0,projectWish:null,
      }));
      return Object.freeze({schema:B04_WORD_CONTEXT_OPTIONS_SCHEMA,char:query.char,pinyin:query.pinyin??null,status:options.length?'available':'not-covered',activation:'off',wholeWordOnly:true,sourcePOS:'unknown',options:Object.freeze(options),sourceAnchors:Object.freeze(options.map(option=>option.source)),productionApproved:false,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,wholeNameApproved:false,wholeNameMeaning:null,scoreDelta:0});
    },
  });
}

export function b04WordContextOptionSelection(option){
  requirePlain(option,'B04选项不是受信的只读结果。');if(typeof option.givenName!=='string')throw new Error('B04选项不是受信的只读结果。');requirePlain(option.selection,'B04选项不是受信的只读结果。');
  return Object.freeze({usage:option.selection.usage,caseId:option.selection.caseId,senseId:option.selection.senseId,contextKey:option.selection.contextKey});
}
