import {isDeepStrictEqual as equal} from 'node:util';
import {V5_INPUT_HASHES} from './naming-editorial-v5-validation.mjs';
import {moeTitleLookup} from './fixed-moe-index.mjs';

export const V6_VERSION='naming-editorial-6.0.0',V6_DATA_VERSION='2026.10.20.2',V6_SOURCE_ID='naming-editorial-dictionary-v6-fixed';
export const V6_CORRECTED_CHARACTERS=['才','冬','千','秋','沈','咸','旋','郁','致'];
export const V6_INPUT_HASHES={...V5_INPUT_HASHES,
 'data/dataset-v5.json':'0799bd0b5088bb99f3ab34ac02340fbcfc5a8a4072cee46caa41ab963b1d56af',
 'data/knowledge-v5.sqlite':'21bcc3b2e60f4051bdb220c126db6121259ead36947109974b01cc386d87c1df',
 'data/naming-editorial-v5.json':'bb8d3d255b42a6b67932988e13ceb2d7a7a1c6ef8fbbcc65312b9a50b5519da8',
 'data/naming-editorial-names-v5-source-lock.json':'e277c927f24f059e9be1fede52be6be327fb287c27276663711b5834d10d4981',
 'data/raw/naming-editorial-v6-character-overrides.json':'a219d41613dcdedf8e466370900a115df7733010631b2013045d82a6747f30b5',
 'data/raw/naming-editorial-v6-semantic-review.json':'d5212bc3f65c97e050fafb651681d14f5bf34a8ae32b83f68183cf7e921c58c9',
};
const requireFact=(condition,message)=>{if(!condition)throw new Error('命名字典6.0资料校验失败：'+message);};
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const pinyin=value=>(value||'').replace(/[（(][^）)]*[）)]/g,'').trim();
const tone=value=>{for(const [i,chars]of ['āēīōūǖ','áéíóúǘ','ǎěǐǒǔǚ','àèìòùǜ'].entries())if([...value].some(c=>chars.includes(c)))return i+1;return 5;};
export const V6_BASE={version:'naming-editorial-5.0.0',sourceId:'naming-editorial-names-v5-fixed',sha256:V6_INPUT_HASHES['data/naming-editorial-v5.json'],sourceLockSha256:V6_INPUT_HASHES['data/naming-editorial-names-v5-source-lock.json'],dataVersion:'2026.10.20.1',datasetSha256:V6_INPUT_HASHES['data/dataset-v5.json'],knowledgeSqliteSha256:V6_INPUT_HASHES['data/knowledge-v5.sqlite']};

export function deriveV6CharacterOverride(before,sourceEvidence){
 const char=before.char,word=sourceEvidence.afterEntry;
 requireFact(V6_CORRECTED_CHARACTERS.includes(char)&&word?.title===char,'仅允许九字对应原字词条');
 const readings=word.heteronyms.map((heteronym,heteronymIndex)=>{
  const pronunciation=pinyin(heteronym.pinyin),definitions=heteronym.definitions;
  if(definitions.every(definition=>typeof definition.def==='string'&&definition.def.length))return {pinyin:pronunciation,tone:tone(pronunciation),meanings:[...new Set(definitions.map(definition=>definition.def))],sourceId:'moe-revised',word:char};
  requireFact(char==='沈'&&heteronymIndex===0&&pronunciation==='chén'&&equal(definitions,[{def:'',link:['同「沉」。']}]),'空释义必须是已审原参照，不能猜补实体字义');
  return {pinyin:pronunciation,tone:2,meanings:['辞典参照：同「沉」。'],sourceId:'moe-revised',word:char,referenceOnly:true,sourceReference:{kind:'dictionary-cross-reference',rawDefinitionIndex:0,text:'同「沉」。'}};
 });
 requireFact(readings.every(reading=>reading.pinyin&&reading.meanings.length&&reading.meanings.every(value=>typeof value==='string'&&value.length)),'不得删掉原词条合法异读或释义');
 const selected=readings.find(reading=>reading.pinyin===before.pinyin&&reading.tone===before.tone);requireFact(selected&&!selected.referenceOnly,'默认读音必须保留并具有原实体释义');
 const polyphonic=new Set(readings.map(reading=>reading.pinyin)).size>1;
 let warning=(polyphonic?`多音字：本方案采用 ${before.pinyin}，请按姓名用法确认；各读音义项分别保存。 `:'')+`本条字义对应原词条“${char}”；Unicode 简繁与异体对应保留，请按实际字义确认。`;
 if(char==='冬')warning+=' “坚韧”为项目原创季节类比，非字典原义。';
 if(char==='秋')warning+=' “收获”为项目原创季节类比，非字典原义。';
 if(char==='沈')warning+=' shěn 仅据原词条姓义；chén 仅保存辞典参照，不借作沉稳等命名义。';
 if(char==='咸')warning+=' 原辞典卦象括号符号与卦名文字存在冲突，原文保留待核，不用于自动推卦。';
 return {...before,traditional:char,readings,meaning:selected.meanings.slice(0,3).join('；'),polyphonic,warning,...(char==='沈'?{tags:[]}: {})};
}

export function validateNamingEditorialV6Inputs({table,baseDataset,nextDataset,base5,base4,corrections,semanticReview,rawMoe}){
 requireFact(plain(table)&&table.version===V6_VERSION&&table.dataVersion===V6_DATA_VERSION&&equal(table.base,V6_BASE),'版本或5.0基件身份不符');
 requireFact(base5.version===V6_BASE.version&&baseDataset.version===V6_BASE.dataVersion&&nextDataset.version===V6_DATA_VERSION,'字库版本不符');
 requireFact(corrections.version==='naming-editorial-character-corrections/6.0.0'&&corrections.baseDatasetSha256===V6_BASE.datasetSha256&&corrections.targetDataVersion===V6_DATA_VERSION&&equal(corrections.overrides?.map(row=>row.char),V6_CORRECTED_CHARACTERS),'九字纠正范围不符');
 const oldChars=new Map(baseDataset.characters.map(row=>[row.char,row])),nextChars=new Map(nextDataset.characters.map(row=>[row.char,row])),moe=moeTitleLookup(rawMoe);
 requireFact(oldChars.size===779&&nextChars.size===779&&equal([...oldChars.keys()],[...nextChars.keys()]),'779字集合和顺序不得改变');
 for(const fix of corrections.overrides){
  const before=oldChars.get(fix.char),proof=fix.sourceEvidence;
  requireFact(equal(fix.before,before)&&equal(proof?.beforeEntry,moe.get(proof?.beforeDictionaryWord)?.row)&&equal(proof?.afterEntry,moe.get(fix.char)?.row)&&proof?.beforeRawEntryIndex===moe.get(proof?.beforeDictionaryWord)?.index&&proof?.afterRawEntryIndex===moe.get(fix.char)?.index&&proof?.rawSha256===V6_INPUT_HASHES['data/raw/moe-revised.json.gz'],'原字典before/after、完整异读或原行身份不符');
  requireFact(equal(fix.allowedChangedFields,['meaning','traditional','readings','polyphonic','warning',...(fix.char==='沈'?['tags']:[])]),'字段变更白名单不符');
  for(const key of new Set([...Object.keys(fix.before),...Object.keys(fix.after)]))if(!fix.allowedChangedFields.includes(key))requireFact(equal(fix.before[key],fix.after[key]),'纠正越过字段边界：'+fix.char+'.'+key);
  requireFact(equal(deriveV6CharacterOverride(before,proof),fix.after)&&equal(nextChars.get(fix.char),fix.after),'纠正后词条身份、释义、异读或canonical traditional不符');
  requireFact(fix.before.pinyin===fix.after.pinyin&&fix.before.tone===fix.after.tone&&equal(fix.before.variants,fix.after.variants),'不得改默认拼音、声调或Unicode variants');
 }
 for(const [char,entry]of oldChars)if(!V6_CORRECTED_CHARACTERS.includes(char))requireFact(equal(entry,nextChars.get(char)),'其余770字不得改写：'+char);
 for(const key of ['citations','knowledge','sources'])requireFact(equal(baseDataset[key],nextDataset[key]),'既有引文/知识/六个字库来源不得改写');
 requireFact(nextDataset.sources.length===6&&!nextDataset.sources.some(row=>row.id===V6_SOURCE_ID),'专用命名来源不得注入知识包原始六来源');
 requireFact(equal(table.characterOverrides,corrections.overrides)&&equal(table.nameRules,base5.nameRules)&&table.nameRules.length===27,'九字纠正证据或27既有姓名规则不一致');
 requireFact(table.correctedCharacterProjectCredit==='explicit-use-only','纠正词条不能自动泛授项目语义信用');
 requireFact(semanticReview.version==='naming-editorial-semantic-review/6.0.0'&&semanticReview.base4Sha256===V6_INPUT_HASHES['data/naming-editorial-v4.json']&&equal(table.semanticMigrations,semanticReview.migrations),'逐用途语义迁移证据不符');
 const migrations=table.semanticMigrations;
 requireFact(plain(migrations?.defaultSenseMap)&&equal(Object.keys(migrations.defaultSenseMap),['冬','秋'])&&Array.isArray(migrations.naturalPairs)&&migrations.naturalPairs.length===1&&migrations.naturalPairs[0].name==='致远','仅允许冬/秋两季节类比与致远自然搭配');
 for(const char of ['冬','秋']){
  const row=migrations.defaultSenseMap[char],label=char==='冬'?'坚韧':'收获';
  requireFact(equal(row.before,base4.defaultSenseMap[char])&&row.after.meaning===`${label}（项目原创季节类比，非字典原义）`&&row.after.status==='bound-default-reading'&&row.review.kind==='project-seasonal-metaphor'&&row.review.dictionaryDefinitionClaim===false&&row.review.standaloneCharacterApproval===false,'项目原创类比与辞典原义必须明确分开');
  requireFact(row.after.readings.length===1&&row.after.readings[0].char===char&&row.after.readings[0].rawHeteronymIndex===0&&row.after.readings[0].rawDefinitionIndex===0,'季节原义锚不符');
 }
 const pair=migrations.naturalPairs[0];requireFact(equal(pair.before,base4.naturalPairs.find(row=>row.name==='致远'))&&pair.after.name==='致远'&&pair.after.status==='bound-default-reading'&&pair.review.kind==='modern-natural-expression'&&pair.review.newCitation===false&&pair.review.standaloneCharacterApproval===false&&equal(pair.after.readings.map(row=>row.char),['致','远'])&&pair.after.readings[0].dictionarySense==='達到。'&&pair.after.readings[0].rawHeteronymIndex===0&&pair.after.readings[0].rawDefinitionIndex===1&&pair.after.readings[1].dictionaryWord==='遠'&&pair.after.readings[1].rawHeteronymIndex===0&&pair.after.readings[1].rawDefinitionIndex===0,'致远只批准達到远处的自然搭配，不新增出处或单字泛义');
 for(const row of [...Object.values(migrations.defaultSenseMap),pair])for(const binding of row.after.readings){
  const entry=nextChars.get(binding.char),record=moe.get(binding.dictionaryWord)?.row,heteronym=record?.heteronyms[binding.rawHeteronymIndex];
  const reading=entry?.readings.find(value=>value.word===binding.dictionaryWord&&value.pinyin===binding.pinyin&&value.tone===binding.tone&&value.sourceId===binding.sourceId&&!value.referenceOnly);
  requireFact(entry&&entry.pinyin===binding.pinyin&&entry.tone===binding.tone&&binding.sourceId==='moe-revised'&&reading&&typeof binding.dictionarySense==='string'&&reading.meanings.includes(binding.dictionarySense)&&pinyin(heteronym?.pinyin)===binding.pinyin&&heteronym?.definitions[binding.rawDefinitionIndex]?.def===binding.dictionarySense,'逐用途必须绑定同原word读音中的真实定义，不能以辞典参照授信');
 }
 requireFact(equal(table.pendingQualityIssues,[{char:'咸',dictionaryWord:'咸',rawHeteronymIndex:0,rawDefinitionIndex:3,kind:'original-trigram-glyph-conflict',originalPreserved:true,usedForAutomaticTrigram:false}]),'咸原卦象符号待核身份不得删除或改写');
 const changed=corrections.overrides.length,oldPoly=baseDataset.characters.filter(row=>row.polyphonic).length,newPoly=nextDataset.characters.filter(row=>row.polyphonic).length;
 requireFact(newPoly===oldPoly+2,'沈/旋两组合法异读不可删减');
 return {characters:779,unchangedCharacters:770,overrides:changed,names:27,oldNames:44,defaultPronunciationChanges:0,addedHeteronyms:2,semanticMigrations:3};
}
