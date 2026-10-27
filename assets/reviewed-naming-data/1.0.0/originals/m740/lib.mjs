import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as equal} from 'node:util';

export const ROOT = import.meta.dirname;
export const PRODUCT_ROOT = 'D:/Codex-NamingStudio-Evidence/m587-product-integration/work';
export const DATA_ROOT = path.join(PRODUCT_ROOT, 'data');
export const BASE_HEAD = '9ac38f2285f928c451caa10bad41ca226f7f5f51';
export const BOUNDARY = Object.freeze({candidateOnly:true,activation:'off',productionApproved:false,formalCoverageAdded:0,wholeNameAssessment:'not-assessed',wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0});
export const need = (condition, message) => {if (!condition) throw new Error('M740: '+message);};
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const filePin = file => {const bytes=fs.readFileSync(file);return {bytes:bytes.length,sha256:hash(bytes)};};
export function atomicWrite(file, value) {
  const full=path.resolve(ROOT,file);need(full.startsWith(path.resolve(ROOT)+path.sep),'output escaped M740');
  fs.mkdirSync(path.dirname(full),{recursive:true});
  fs.writeFileSync(full+'.tmp',typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
  fs.renameSync(full+'.tmp',full);
}
const productFiles = [
 'dataset-v6.json','naming-editorial-v4.json','naming-editorial-v5.json','naming-editorial-v6.json','naming-editorial-v7.json',
 'meaning-context-v1-1.json','meaning-context-m460-b04.json',
 'naming-character-meanings-v7.1-profile.json','naming-character-meanings-v71-m460-b02-profile.json',
 'm460-lexical/naming-character-meanings-m393-profile.json','naming-character-meanings-m610-profile.json','naming-character-meanings-m616-profile.json',
 'raw/moe-revised.json.gz','raw/kTraditionalVariant.txt','raw/kSimplifiedVariant.txt','raw/moe-README.md','raw/CC-BY-ND-3.0-TW.html','raw/unicode-LICENSE',
];
export function sourceSpecs() {
 const sources = productFiles.map(file=>({root:'product-data',file,absolute:path.join(DATA_ROOT,file)}));
 for(const file of ['src/domain/naming-semantics-v5.ts','src/domain/naming-semantics-v6.ts','src/shared/character-reading.ts'])sources.push({root:'product-root',file,absolute:path.join(PRODUCT_ROOT,file)});
 sources.push({root:'m690',file:'data/profile.json',absolute:'D:/Codex-NamingStudio-Evidence/m690-meanings-batch-next/data/profile.json'});
 sources.push({root:'m690',file:'selection.json',absolute:'D:/Codex-NamingStudio-Evidence/m690-meanings-batch-next/selection.json'});
 const external=readJson(path.join(ROOT,'inventory-sources.json'));
 for(const row of external.files)sources.push({root:'old-batch-occupancy',file:row.file,absolute:row.absolute});
 return sources;
}
export function readInputs(specs=sourceSpecs()) {
 const sources=new Map(specs.map(row=>[row.root+':'+row.file,fs.readFileSync(row.absolute)]));
 const product=file=>JSON.parse(sources.get('product-data:'+file));
 return {sources, product, dataset:product('dataset-v6.json'),v7:product('naming-editorial-v7.json'),raw:JSON.parse(gunzipSync(sources.get('product-data:raw/moe-revised.json.gz')))};
}
function selectedMeaningBelongsToReading(meaning,definitions) {
 const matches=(remaining,used,depth)=>depth<3&&definitions.some(definition=>!used.has(definition)&&(remaining===definition||remaining.startsWith(definition+'；')&&matches(remaining.slice(definition.length+1),new Set([...used,definition]),depth+1)));
 return typeof meaning==='string'&&definitions.every(d=>typeof d==='string')&&matches(meaning,new Set(),0);
}
export function baseMeaningCharacters(input) {
 const v4=input.product('naming-editorial-v4.json'),v5=input.product('naming-editorial-v5.json'),v6=input.product('naming-editorial-v6.json');
 const corrections=new Map(v5.characterOverrides.map(({char,after})=>{const r=after.readings?.find(r=>r.pinyin===after.pinyin&&r.tone===after.tone&&r.sourceId===after.sourceId&&selectedMeaningBelongsToReading(after.meaning,r.meanings));need(r,'v5 correction reading');return[char,{char,pinyin:r.pinyin,tone:r.tone,sourceId:r.sourceId,dictionaryWord:r.word}];}));
 const overrides=new Set(v6.characterOverrides.map(r=>r.char));
 const matches=(entry,binding)=>!!binding&&binding.char===entry.char&&binding.pinyin===entry.pinyin&&binding.tone===entry.tone&&binding.sourceId===entry.sourceId&&!!binding.dictionaryWord&&entry.readings?.some(r=>r.pinyin===binding.pinyin&&r.tone===binding.tone&&r.sourceId===binding.sourceId&&r.word===binding.dictionaryWord&&r.referenceOnly!==true&&selectedMeaningBelongsToReading(entry.meaning,r.meanings)&&(binding.dictionarySense===undefined||r.meanings.includes(binding.dictionarySense)));
 return input.dataset.characters.filter(entry=>{
  const sense=overrides.has(entry.char)?v6.semanticMigrations.defaultSenseMap[entry.char]?.after:v4.defaultSenseMap[entry.char];
  if(sense?.status!=='bound-default-reading'||sense.readings.length!==1)return false;
  const binding=overrides.has(entry.char)?sense.readings[0]:{...sense.readings[0],...(corrections.get(sense.readings[0].char)??{})};
  return !!sense.meaning&&matches(entry,binding);
 }).map(r=>r.char);
}
const unique=values=>[...new Set(values)];
export function coverageInventory(input) {
 const chars=input.dataset.characters.map(r=>r.char),reviews=new Map(input.v7.meaningReviews.map(r=>[r.char,r]));
 const base=baseMeaningCharacters(input),automatic=input.v7.meaningReviews.filter(r=>r.automaticMeaningAllowed===true).map(r=>r.char);
 const m460=input.product('naming-character-meanings-v71-m460-b02-profile.json').cases.map(r=>r.char);
 const m610=input.product('naming-character-meanings-m610-profile.json').cases.map(r=>r.char);
 const m616=input.product('naming-character-meanings-m616-profile.json').cases.map(r=>r.char);
 const m690=JSON.parse(input.sources.get('m690:data/profile.json')).cases.map(r=>r.char);
 const notRecommended=input.v7.meaningReviews.filter(r=>r.status==='not-recommended').map(r=>r.char);
 const contexts=input.product('meaning-context-v1-1.json').cases;
 const b04=input.product('meaning-context-m460-b04.json').cases;
 const older=[];
 for(const spec of sourceSpecs().filter(r=>r.root==='old-batch-occupancy')) {
  const value=JSON.parse(input.sources.get(spec.root+':'+spec.file));
  const rows=Array.isArray(value)?value:value.cases??[];
  older.push({file:spec.file,targetCharacters:unique(rows.map(r=>r.char).filter(Boolean)),givenNameCharacters:unique(rows.flatMap(r=>[...(r.givenName??'')]))});
 }
 const selectedOccupancy=unique([...m460,...m610,...m616,...m690,...older.flatMap(r=>r.targetCharacters),...contexts.map(r=>r.char),...b04.map(r=>r.char)]);
 const forbidden=unique([...base,...automatic,...notRecommended,...selectedOccupancy]);
 const automaticUnion=unique([...base,...automatic]),currentStandaloneUnion=unique([...automaticUnion,...m460]);
 const outstanding=chars.filter(c=>!currentStandaloneUnion.includes(c));
 const remainingForNew=chars.filter(c=>!forbidden.includes(c));
 return {schema:'m740-recomputed-coverage/1',countBasis:'computed from fixed current file content; never imported old recount totals',datasetCharacters:chars.length,
  reviewCounts:{reviewed:input.v7.meaningReviews.length,approved:input.v7.meaningReviews.filter(r=>r.status==='approved').length,pending:input.v7.meaningReviews.filter(r=>r.status==='pending').length,manual:input.v7.meaningReviews.filter(r=>r.status==='approved'&&!r.automaticMeaningAllowed).length,notRecommended:notRecommended.length},
  baseProjectMeanings:{count:base.length,characters:base},supplementalAutomatic:{count:automatic.length,characters:automatic},automaticDefaultUnion:{count:automaticUnion.length,characters:automaticUnion},
  standaloneOnRequest:{count:unique(m460).length,characters:unique(m460),source:'M46060; display-only independent meanings; not automatic generation authority'},
  currentAutomaticOrStandaloneUnion:{count:currentStandaloneUnion.length,characters:currentStandaloneUnion},
  outstandingDefault:{count:outstanding.length,characters:outstanding,pending:outstanding.filter(c=>reviews.get(c)?.status==='pending').length,manual:outstanding.filter(c=>reviews.get(c)?.status==='approved'&&!reviews.get(c).automaticMeaningAllowed).length,notRecommended:outstanding.filter(c=>reviews.get(c)?.status==='not-recommended').length},
  existingCandidateOccupancy:{m610:{count:unique(m610).length,characters:unique(m610),defaultCoverageAdded:0},m616:{count:unique(m616).length,characters:unique(m616),readingRole:'non-default-only',defaultCoverageAdded:0},m690:{count:unique(m690).length,characters:unique(m690),defaultCoverageAdded:0},olderWordOrCharacterBatches:older,allSelectedCharacters:{count:selectedOccupancy.length,characters:selectedOccupancy}},
  wholeWordContextOnly:{v11:{rows:contexts.length,distinctTargets:unique(contexts.map(r=>r.char)).length,characters:unique(contexts.map(r=>r.char))},b04:{rows:b04.length,distinctTargets:unique(b04.map(r=>r.char)).length,characters:unique(b04.map(r=>r.char))},independentCharacterCoverageAdded:0},
  exclusionCharacters:forbidden,remainingUnselectedDefaultPool:{count:remainingForNew.length,characters:remainingForNew},formalCoverageAdded:0};
}
export function glyphEvidence(char,word,input) {
 const cp=value=>'U+'+value.codePointAt(0).toString(16).toUpperCase();
 if(char===word)return {kind:'exact-source-glyph',character:char,dictionaryWord:word,characterCodePoint:cp(char),dictionaryWordCodePoint:cp(word),proof:[]};
 const proof=[];
 for(const [file,left,right]of [['raw/kTraditionalVariant.txt',char,word],['raw/kSimplifiedVariant.txt',word,char]]){
  const lines=input.sources.get('product-data:'+file).toString('utf8').split(/\r?\n/u);
  const code=left.codePointAt(0).toString(16).toUpperCase();
  const lineIndex=lines.findIndex(line=>line.split('\t')[0]===code&&line.split('\t')[1]?.split(/\s+/u).some(token=>token.split('<')[0]===cp(right)));
  need(lineIndex>=0,'glyph mapping absent '+char+'/'+word+' '+file);
  proof.push({file,lineNumberOneBased:lineIndex+1,line:lines[lineIndex],sha256:hash(input.sources.get('product-data:'+file))});
 }
 return {kind:'fixed-unicode-traditional-simplified-relation',character:char,dictionaryWord:word,characterCodePoint:cp(char),dictionaryWordCodePoint:cp(word),proof,semanticEquivalenceClaim:false,registrationGlyphApproval:false};
}
export function makeCases(input,selection,coverage) {
 return selection.selected.map(selected=>{
  need(!coverage.exclusionCharacters.includes(selected.char),'selected occupied/excluded '+selected.char);
  const baseline=input.dataset.characters.find(r=>r.char===selected.char);need(baseline,'missing baseline '+selected.char);
  need(baseline.pinyin===selected.pinyin&&baseline.tone===selected.tone,'default reading changed '+selected.char);
  const reading=baseline.readings.find(r=>r.pinyin===baseline.pinyin&&r.tone===baseline.tone&&r.sourceId===baseline.sourceId&&r.referenceOnly!==true);need(reading,'direct default absent '+selected.char);
  const entry=input.raw[selected.rawEntryIndex],heteronym=entry?.heteronyms?.[selected.rawHeteronymIndex],definition=heteronym?.definitions?.[selected.rawDefinitionIndex];
  need([...entry.title].length===1&&entry.title===reading.word,'single original title identity '+selected.char);
  need(heteronym.pinyin===baseline.pinyin&&equal(heteronym.definitions.map(d=>d.def),reading.meanings),'complete default reading definitions '+selected.char);
  need(definition.def===selected.dictionarySense&&definition.type===selected.sourcePOS,'source sense/POS '+selected.char);
  need(!/^(參見|通「|同「|姓|人名)/u.test(definition.def),'indirect/name/surname sense '+selected.char);
  const prior=input.v7.meaningReviews.find(r=>r.char===selected.char);need(prior&&!prior.automaticMeaningAllowed,'already automatic '+selected.char);
  const source={sourceId:'moe-revised',word:entry.title,pinyin:heteronym.pinyin,tone:baseline.tone,originalFile:'raw/moe-revised.json.gz',originalSha256:hash(input.sources.get('product-data:raw/moe-revised.json.gz')),rawEntryIndex:selected.rawEntryIndex,rawHeteronymIndex:selected.rawHeteronymIndex,rawDefinitionIndex:selected.rawDefinitionIndex,sourcePOS:definition.type,definition,completeOriginalEntry:entry,parsedEntrySha256:hash(JSON.stringify(entry)),hashConvention:'sha256(JSON.stringify(parsed complete original entry)); not original byte span',license:'CC-BY-ND-3.0-TW'};
  return {caseId:`single-meaning-m740:${selected.char}:${selected.rawEntryIndex}:${selected.rawHeteronymIndex}:${selected.rawDefinitionIndex}`,char:selected.char,pinyin:baseline.pinyin,tone:baseline.tone,
   defaultReading:structuredClone(reading),baselineCharacter:structuredClone(baseline),baselineCharacterSha256:hash(JSON.stringify(baseline)),
   binding:{char:selected.char,pinyin:baseline.pinyin,tone:baseline.tone,sourceId:'moe-revised',dictionaryWord:entry.title,rawEntryIndex:selected.rawEntryIndex,rawHeteronymIndex:selected.rawHeteronymIndex,rawDefinitionIndex:selected.rawDefinitionIndex,dictionarySense:definition.def},
   glyph:glyphEvidence(selected.char,entry.title,input),source,
   project:{meaning:selected.projectMeaning,projectWish:null,limits:selected.limits,attribution:'M740-D02 project-authored single-character explanation; not a dictionary quotation or measured child trait',license:'CC0-1.0'},
   priorV7Status:prior.applicability.mode,priorV7Review:prior,priorV7ReviewSha256:hash(JSON.stringify(prior)),
   review:{status:'pending-independent-review',historicalStatusRetained:true,historicalApplicability:prior.applicability.mode,wholeNameUsage:'not-assessed',unknowns:prior.status==='pending'?['原来源身份待审结论保留；当前字形关系证据不构成准入。']:[],requiredChecks:['独立核对单字原义及默认读音','确认项目取意与原文分栏','保留历史 manual/pending 及完整姓名消歧','实际 query/generation 接线由 root 后续安排']},
   readingRole:'dataset-default-direct-reading',scope:'on-request-supplement-only',notWholeWordDerived:true,usageReviewRequired:true,...BOUNDARY};
 });
}
