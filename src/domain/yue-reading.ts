import type {YueNameReading,YueReadingData,YueReadingSelection,YueReadingSelections,YueReadingUnit} from '../shared/types';

export const YUE_READING_VERSION='yue-name-reading/1.0.0' as const;
export const YUE_READING_SOURCE_ID='rime-cantonese-jyutping' as const;
export const YUE_READING_ALIAS_SOURCE_ID='unicode-17' as const;
export const YUE_DICTIONARY_VERSION='2026.08.10' as const;
const LIMITATIONS=[
  '字词读音候选来自固定版粤拼词典；单一候选也须确认，字典词音不自动证明姓名义项。',
  '复姓只展示已有完整词条，不按单字候选拼出姓氏读音；缺项可由家庭明确确认。',
  '此处记录选定音节，未实现连读音变、地区差异或经审阅的粤语不雅谐音检查。',
  '词典输入权重不代表人口重名率；本参考不作谐音安全、命运或低重名率结论。',
];
const han=/^[\p{Script=Han}]+$/u;
const jyutping=/^[a-z]+[1-6]$/;
/** Inspect descriptors before reading caller values; JSON cloning must not hide malformed structures. */
function assertPlainJson(value:unknown):void{
  let nodes=0;const parents=new Set<object>();
  const visit=(item:unknown,depth:number):void=>{
    if(depth>80||++nodes>100000)throw new Error('粤语读音结构过大或过深。');
    if(item===null||typeof item==='string'||typeof item==='boolean')return;
    if(typeof item==='number'&&Number.isFinite(item))return;
    if(typeof item!=='object'||!item)throw new Error('粤语读音须为完整 JSON 结构，不得含未定义值。');
    if(parents.has(item))throw new Error('粤语读音结构不得循环引用。');
    const array=Array.isArray(item),prototype=Object.getPrototypeOf(item);
    if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)throw new Error('粤语读音结构不得使用自定义原型。');
    const keys=Reflect.ownKeys(item);
    if(keys.some(key=>typeof key!=='string'))throw new Error('粤语读音结构不得含符号字段。');
    if(array){
      const length=Object.getOwnPropertyDescriptor(item,'length')?.value;
      if(!Number.isSafeInteger(length)||length<0||length>100000||keys.length!==length+1||keys.some(key=>key!=='length'&&!/^(0|[1-9]\d*)$/.test(key as string)))throw new Error('粤语读音数组含额外字段或空位。');
      for(let index=0;index<length;index++)if(!Object.hasOwn(item,String(index)))throw new Error('粤语读音数组不得含空位。');
    }
    parents.add(item);
    for(const key of keys){
      if(array&&key==='length')continue;
      const descriptor=Object.getOwnPropertyDescriptor(item,key);
      if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('粤语读音结构不得含访问器或隐藏字段。');
      visit(descriptor.value,depth+1);
    }
    parents.delete(item);
  };
  visit(value,0);
}
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function exactKeys(value:Record<string,unknown>,keys:string[]):boolean{return Object.keys(value).length===keys.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(value,key));}
function validTokens(value:unknown,count:number):value is string[]{return Array.isArray(value)&&value.length===count&&value.every(token=>typeof token==='string'&&token.length<=16&&jyutping.test(token));}

/** Only explicit Jyutping tones 1–6 are accepted; no fuzzy sounds or inferred missing tone. */
export function parseJyutpingInput(text:string,expectedSyllables:number):string[]{
  if(typeof text!=='string'||text.length>80||!Number.isInteger(expectedSyllables)||expectedSyllables<1||expectedSyllables>4)throw new Error('粤拼输入须在80字符以内，且音节数量有效。');
  const tokens=text.trim().toLowerCase().split(/\s+/u);
  if(!validTokens(tokens,expectedSyllables))throw new Error(`请填写 ${expectedSyllables} 个以空格分隔的粤拼音节，每个音节使用 ASCII 字母及 1–6 调号。`);
  return tokens;
}

function inputCharacters(text:string,min:number,max:number,label:string):string[]{
  if(typeof text!=='string'||!han.test(text)||[...text].length<min||[...text].length>max)throw new Error(`${label}须为 ${min===max?min:`${min}–${max}`} 个汉字。`);
  return [...text];
}
function aliasesFor(text:string,data:YueReadingData):string[]{
  let choices=[''];
  for(const char of text){const variants=data.aliases[char]??[char];choices=choices.flatMap(prefix=>variants.map(alias=>prefix+alias));}
  return choices;
}
function makeUnit(text:string,data:YueReadingData,word:boolean):YueReadingUnit{
  const forms=new Set(aliasesFor(text,data)),file=word?'jyut6ping3.words.dict.yaml':'jyut6ping3.chars.dict.yaml';
  return{text,candidates:data.readings.filter(row=>row.sourceFile===file&&forms.has(row.text)).map(row=>structuredClone(row))};
}
function finalize(surname:YueReadingUnit,given:YueReadingUnit[]):YueNameReading{
  const units=[surname,...given],selected=units.filter(unit=>!!unit.selection).length;
  const status=selected===0?'unconfirmed':selected===units.length?'confirmed':'partial';
  return{version:YUE_READING_VERSION,language:'yue',romanization:'Jyutping',surname,given,status,
    fullNameTokens:status==='confirmed'?units.flatMap(unit=>unit.selection!.tokens):[],
    sourceIds:[YUE_READING_SOURCE_ID,YUE_READING_ALIAS_SOURCE_ID],limitations:[...LIMITATIONS]};
}

export function calculateYueNameReading(surname:string,givenName:string,data:YueReadingData):YueNameReading{
  inputCharacters(surname,1,4,'姓氏');const given=inputCharacters(givenName,1,2,'名字');
  assertPlainJson(data);
  if(data.version!==YUE_READING_VERSION||data.sourceId!==YUE_READING_SOURCE_ID||data.sourceVersion!==YUE_DICTIONARY_VERSION)throw new Error('粤语读音数据版本不匹配。');
  return finalize(makeUnit(surname,data,[...surname].length>1),given.map(char=>makeUnit(char,data,false)));
}

function selectedUnit(unit:YueReadingUnit,value:unknown):YueReadingUnit{
  const result:YueReadingUnit={text:unit.text,candidates:structuredClone(unit.candidates)};
  if(value===null)return result;
  if(!record(value)||value.confirmed!==true||!validTokens(value.tokens,[...unit.text].length))throw new Error('粤语读音确认记录不完整或音节数不符。');
  const tokens=value.tokens;
  if(value.origin==='dictionary'){
    if(!exactKeys(value,['tokens','origin','confirmed','dictionaryId'])||typeof value.dictionaryId!=='string')throw new Error('字典读音确认须保留对应候选记录。');
    const candidate=unit.candidates.find(row=>row.id===value.dictionaryId);
    if(!candidate||candidate.tokens.length!==tokens.length||candidate.tokens.some((token,index)=>token!==tokens[index]))throw new Error('选定粤拼与该位置的字典候选不一致。');
    result.selection={tokens:[...candidate.tokens],origin:'dictionary',confirmed:true,dictionaryId:candidate.id};
  }else if(value.origin==='user'){
    if(!exactKeys(value,['tokens','origin','confirmed']))throw new Error('家庭确认的手工读音不能附带字典来源标记。');
    result.selection={tokens:[...tokens],origin:'user',confirmed:true};
  }else throw new Error('粤语读音确认方式无效。');
  return result;
}

/** Selections replace every unit explicitly; confirmed readings are never inferred from candidate order. */
export function confirmYueNameReading(existing:YueNameReading,selections:YueReadingSelections):YueNameReading{
  assertPlainJson(existing);assertPlainJson(selections);
  if(!record(selections)||!exactKeys(selections,['surname','given'])||!Array.isArray(selections.given)||selections.given.length!==existing.given.length)throw new Error('请按姓氏和每个名字用字提供完整的读音选择。');
  if(existing.version!==YUE_READING_VERSION||existing.language!=='yue'||existing.romanization!=='Jyutping')throw new Error('粤语读音参考版本无效。');
  return finalize(selectedUnit(existing.surname,selections.surname),existing.given.map((unit,index)=>selectedUnit(unit,selections.given[index])));
}

function sameValue(a:unknown,b:unknown):boolean{
  if(a===b)return true;
  if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,index)=>sameValue(value,b[index]));
  if(!record(a)||!record(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&sameValue(a[key],b[key]));
}

/** Recompute candidates and all derived fields from the fixed source; do not trust imported assertions. */
export function isCanonicalYueNameReading(value:unknown,surname:string,givenName:string,data:YueReadingData):value is YueNameReading{
  try{
    assertPlainJson(value);
    if(!record(value)||!record(value.surname)||!Array.isArray(value.given)||value.given.some(unit=>!record(unit)))return false;
    const selections:YueReadingSelections={surname:(value.surname.selection??null) as YueReadingSelection|null,
      given:value.given.map(unit=>(unit.selection??null) as YueReadingSelection|null)};
    const expected=confirmYueNameReading(calculateYueNameReading(surname,givenName,data),selections);
    return sameValue(value,expected);
  }catch{return false;}
}

export function yueReadingSelections(value:YueNameReading):YueReadingSelections{
  assertPlainJson(value);
  return{surname:value.surname.selection?structuredClone(value.surname.selection):null,given:value.given.map(unit=>unit.selection?structuredClone(unit.selection):null)};
}
