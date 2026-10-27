import {isDeepStrictEqual as equal} from 'node:util';
import {moeTitleLookup} from './fixed-moe-index.mjs';
export const V5_VERSION='naming-editorial-5.0.0',V5_DATA_VERSION='2026.10.20.1',V5_SOURCE_ID='naming-editorial-names-v5-fixed';
export const V5_INPUT_HASHES={
 'data/dataset.json':'c5e6934fab8892e2f162cb584c0869c253b838b5f41d7087d9e7630f648fe6ae',
 'data/knowledge.sqlite':'f264eb26f631441a31324e9be14058f38d02d444070e00e9e0690b4f0b9ff7cc',
 'data/naming-editorial.json':'97c3162238c9493174544580a338fb0852d2784fbeac712fbd8e234f99945195',
 'data/naming-editorial-v4.json':'d24898eb63438d7b24262668eb3b36770f211fade015b28eeb361700a58ca6ce',
 'data/naming-editorial-readings-source-lock.json':'33d1cac2da2ec2dc6705ecbaa160900f20e6c71ec10c52d065a0b631199f6d43',
 'data/raw/moe-revised.json.gz':'cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e',
 'data/raw/naming-editorial-v5-name-review.json':'27bc7df6f1d7267ae9bef094e6cbfe0b8685d1265755b82d99b34bc0ec2978a2',
 'data/raw/naming-editorial-v5-character-overrides.json':'6cbc8488bd9d1dc90f2054bbe3df3cc2dc5a82f735112102fbc8fffc2926e037',
};
const requireFact=(condition,message)=>{if(!condition)throw new Error('命名出处5.0资料校验失败：'+message);};
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const pinyin=value=>(value||'').replace(/[（(][^）)]*[）)]/g,'').trim();
const tone=value=>{for(const [i,chars]of ['āēīōūǖ','áéíóúǘ','ǎěǐǒǔǚ','àèìòùǜ'].entries())if([...value].some(c=>chars.includes(c)))return i+1;return 5;};
const citationKeys=['id','title','chapter','text','sourceId'];
export function deriveV5CharacterOverride(before,sourceEvidence){
 const char=before.char,word=sourceEvidence.afterEntry;
 requireFact(['志','家'].includes(char)&&word?.title===char,'仅允许志、家两字对应原word');
 const readings=word.heteronyms.map(h=>({pinyin:pinyin(h.pinyin),tone:tone(pinyin(h.pinyin)),meanings:[...new Set(h.definitions.map(d=>d.def))],sourceId:'moe-revised',word:char}));
 requireFact(readings.every(r=>r.pinyin&&r.meanings.length&&r.meanings.every(s=>typeof s==='string'&&s.length)),'不得删掉原词条合法异读或释义');
 const selected=readings.find(r=>r.pinyin===before.pinyin&&r.tone===before.tone);requireFact(selected,'原默认拼音和声调必须保持');
 const polyphonic=new Set(readings.map(r=>r.pinyin)).size>1;
 return {...before,traditional:char,readings,meaning:selected.meanings.slice(0,3).join('；'),polyphonic,warning:(polyphonic?`多音字：本方案采用 ${before.pinyin}，请按姓名用法确认；各读音义项分别保存。 `:'')+`本条字义对应原词条“${char}”；Unicode 简繁与异体对应保留，请按实际字义确认。`};
}
export function materializeV5NameRules(review){
 return review.reviewedNames.map(row=>({name:row.name,ruleId:row.proposedRuleId,citation:row.citation,excerpt:row.excerpt,extraction:row.extraction,context:row.proposedContext,meaning:row.proposedMeaning,sourceMeaning:row.sourceMeaning,projectWish:row.projectWish,readings:row.expectedReadings.map(r=>({char:r.char,pinyin:r.pinyin,tone:r.tone,sourceId:r.sourceId,dictionaryWord:r.dictionaryWord,dictionarySense:r.dictionarySense,rawHeteronymIndex:r.rawDictionary.heteronymIndexZeroBased,rawDefinitionIndex:r.rawDictionary.definitionIndexZeroBased}))}));
}
export function validateNamingEditorialV5Inputs({table,baseDataset,nextDataset,base4,review,corrections,rawMoe,rawPoems}){
 requireFact(plain(table)&&table.version===V5_VERSION&&table.dataVersion===V5_DATA_VERSION,'版本不符');
 requireFact(equal(table.base,{version:'naming-editorial-4.0.0',sourceId:'naming-editorial-readings-v4-fixed',sha256:V5_INPUT_HASHES['data/naming-editorial-v4.json'],sourceLockSha256:V5_INPUT_HASHES['data/naming-editorial-readings-source-lock.json'],dataVersion:'2026.10.18.1',datasetSha256:V5_INPUT_HASHES['data/dataset.json'],knowledgeSqliteSha256:V5_INPUT_HASHES['data/knowledge.sqlite']}),'4.0和原字库基件身份不符');
 requireFact(base4.version===table.base.version&&baseDataset.version===table.base.dataVersion&&nextDataset.version===V5_DATA_VERSION,'字库版本不符');
 requireFact(review.version==='naming-editorial-name-review/5.0.0'&&review.count===27&&review.reviewedNames.length===27&&review.directNames===23&&review.recombinedNames===4,'27名审阅清单不完整');
 requireFact(corrections.version==='naming-editorial-character-corrections/5.0.0'&&corrections.baseDatasetSha256===V5_INPUT_HASHES['data/dataset.json']&&corrections.targetDataVersion===V5_DATA_VERSION&&equal(corrections.overrides.map(r=>r.char),['志','家']),'两字纠正范围不符');
 const moe=moeTitleLookup(rawMoe),oldChars=new Map(baseDataset.characters.map(c=>[c.char,c])),newChars=new Map(nextDataset.characters.map(c=>[c.char,c]));
 requireFact(oldChars.size===779&&newChars.size===779&&equal([...oldChars.keys()],[...newChars.keys()]),'779字集合和顺序不得改变');
 for(const fix of corrections.overrides){
  const before=oldChars.get(fix.char),proof=fix.sourceEvidence;
  requireFact(equal(fix.before,before)&&equal(proof.beforeEntry,moe.get(proof.beforeDictionaryWord)?.row)&&equal(proof.afterEntry,moe.get(fix.char)?.row)&&proof.beforeRawEntryIndex===moe.get(proof.beforeDictionaryWord)?.index&&proof.afterRawEntryIndex===moe.get(fix.char)?.index&&proof.rawSha256===V5_INPUT_HASHES['data/raw/moe-revised.json.gz'],'原字典before/after或heteronyms证据不符');
  requireFact(equal(deriveV5CharacterOverride(before,proof),fix.after)&&equal(newChars.get(fix.char),fix.after),'纠正后词条身份、释义、异读或canonical traditional不符');
  requireFact(equal(fix.before.variants,fix.after.variants)&&fix.before.pinyin===fix.after.pinyin&&fix.before.tone===fix.after.tone,'不得改默认拼音、声调或Unicode variant集合');
 }
 for(const [char,entry]of oldChars)if(!['志','家'].includes(char))requireFact(equal(entry,newChars.get(char)),'其余777字不得改写：'+char);
 for(const key of ['citations','knowledge','sources'])requireFact(equal(baseDataset[key],nextDataset[key]),'旧引文/知识/6来源不得改写或注入专用命名source5');
 requireFact(nextDataset.sources.length===6&&!nextDataset.sources.some(r=>r.id===V5_SOURCE_ID),'专用来源不能伪装成字库原始来源');
 requireFact(equal(table.characterOverrides,corrections.overrides)&&equal(table.nameRules,materializeV5NameRules(review)),'正式表与独立手录审阅证据不一致');
 const oldNames=new Set(base4.citations.flatMap(r=>r.names)),names=new Set(),ids=new Set(),canonical=new Map(baseDataset.citations.map(c=>[c.id,c]));
 for(const [index,rule]of table.nameRules.entries()){
  requireFact(typeof rule.name==='string'&&[...rule.name].length===2&&!oldNames.has(rule.name)&&!names.has(rule.name)&&typeof rule.ruleId==='string'&&!ids.has(rule.ruleId),'新增名字或独立ruleId重复/覆盖旧44名');names.add(rule.name);ids.add(rule.ruleId);
  const original=canonical.get(rule.citation?.id);requireFact(original&&citationKeys.every(k=>rule.citation[k]===original[k])&&Object.keys(rule.citation).length===5,'引文完整五字段不一致');
  requireFact(typeof rule.excerpt==='string'&&rule.excerpt.length&&original.text.includes(rule.excerpt)&&[...rule.name].every(c=>rule.excerpt.includes(c)),'摘录或姓名用字不在同一原句');
  requireFact((rule.extraction==='continuous'&&rule.excerpt.includes(rule.name))||(rule.extraction==='recombined'&&!rule.excerpt.includes(rule.name)&&/重组|重新组合/.test(rule.context)),'连续/同句重组身份不符');
  requireFact([rule.context,rule.meaning,rule.sourceMeaning,rule.projectWish].every(s=>typeof s==='string'&&s.trim())&&rule.context.includes('期许'),'原义与项目家庭期许必须分开');
  requireFact(rule.readings.length===2&&rule.readings.every((r,i)=>r.char===[...rule.name][i]),'逐字读音数量或顺序不符');
  for(const binding of rule.readings){
   const entry=newChars.get(binding.char),reading=entry?.readings.find(r=>r.word===binding.dictionaryWord&&r.pinyin===binding.pinyin&&r.tone===binding.tone&&r.sourceId===binding.sourceId),word=moe.get(binding.dictionaryWord)?.row,heteronym=word?.heteronyms[binding.rawHeteronymIndex];
   requireFact(entry&&entry.pinyin===binding.pinyin&&entry.tone===binding.tone&&entry.sourceId===binding.sourceId&&reading&&reading.meanings.includes(binding.dictionarySense),'默认读音word或完整义项未覆盖选义');
   requireFact(Number.isInteger(binding.rawHeteronymIndex)&&Number.isInteger(binding.rawDefinitionIndex)&&binding.rawHeteronymIndex>=0&&binding.rawDefinitionIndex>=0&&pinyin(heteronym?.pinyin)===binding.pinyin&&heteronym?.definitions[binding.rawDefinitionIndex]?.def===binding.dictionarySense,'原heteronym/definition下标或原文不符');
  }
  const evidence=review.reviewedNames[index],context=evidence.wholeContext;
  if(original.sourceId==='shijing'){
   const [,n,b]=original.id.split('-').map((s,i)=>i?Number(s):s),poem=rawPoems[n-1];requireFact(poem&&poem.content[b-1]===original.text&&equal(context.content,poem.content)&&context.title===poem.title&&context.matchedBlockIndexOneBased===b,'诗经全篇语境、原字形或定位不符');
  }else{const prefix=original.id.split('-').slice(0,2).join('-')+'-',full=baseDataset.citations.filter(c=>c.id.startsWith(prefix));requireFact(original.sourceId==='zhouyi'&&equal(context.citations,full)&&full.length>=8,'固定全卦语境不完整');}
 }
 return {characters:779,unchangedCharacters:777,overrides:2,names:names.size,oldNames:oldNames.size,defaultPronunciationChanges:0,addedHeteronyms:1};
}
