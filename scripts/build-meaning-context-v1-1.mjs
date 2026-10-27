import crypto from'node:crypto';import{gunzipSync}from'node:zlib';import{isDeepStrictEqual as equal}from'node:util';
export const FIXED_BASE_HASHES={
 'data/naming-editorial-v7.json':'392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48',
 'data/dataset-v6.json':'3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728',
 'data/raw/moe-revised.json.gz':'cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e',
 'data/raw/moe-README.md':'a93321d9381bc1cf34b4ad844f71607fa748c86c0b228ae37d46720d6a659cb2',
 'data/raw/CC-BY-ND-3.0-TW.html':'04e6ef69a223b6e13c93c97a918ad5fd0dbb9fc34ae307f4449ed264e2d4108f',
 'data/meaning-context-next.json':'3dc77f55dca1516ae3cb4231a022a58aca1874189da6ea99c101c6931b7a1877',
 'data/meaning-context-next-source-lock.json':'cdc25bbb48fe24d84413e71ead37a07fe633ba8758c991c6b481924c7838eb72',
 'data/meaning-context-next-manifest.json':'f5c7664b661229f39919f8b10afe482b3aab65836e1fcc6a674d86296e870371',
 'data/meaning-gap-classification.json':'1be67b4d4a9f02ef38697d1fca8b4385b5eb2ef9abe54ef78dfe962a94615ccc',
 'data/raw/meaning-context-batch1-review.json':'01df11ddaf15780cb472533114ac4175e718ce80b6f1f090d79603c1cdfd3b0c'
};
export const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export const encode=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const ensure=(condition,message)=>{if(!condition)throw new Error('Meaning context evidence: '+message);};
const norm=value=>(value??'').replace(/[（(][^）)]*[）)]/g,'').trim().normalize('NFC');
const identity=entry=>({char:entry.char,pinyin:entry.pinyin,tone:entry.tone,sourceId:entry.sourceId,meaning:entry.meaning,readings:structuredClone(entry.readings??[])});

export function deriveMeaningContextPackageV11(readBytes){
 const inputPaths=[...Object.keys(FIXED_BASE_HASHES),'data/raw/meaning-context-batch2-review.json','data/raw/meaning-context-gap-policy.json'],input=new Map(inputPaths.map(file=>[file,Buffer.from(readBytes(file))]));
 for(const[file,expected]of Object.entries(FIXED_BASE_HASHES))ensure(hash(input.get(file))===expected,'fixed original differs '+file);
 const json=file=>JSON.parse(input.get(file).toString('utf8')),base=json('data/naming-editorial-v7.json'),dataset=json('data/dataset-v6.json'),raw=JSON.parse(gunzipSync(input.get('data/raw/moe-revised.json.gz'))),review=json('data/raw/meaning-context-batch2-review.json'),previousTable=json('data/meaning-context-next.json'),policy=json('data/raw/meaning-context-gap-policy.json');
 ensure(review.task==='D02-138-MEANING-COVERAGE'&&review.phase==='increment-for-review-only','new review task/scope differs');
 ensure(review.reviews.length===20&&new Set(review.reviews.map(row=>row.char)).size===20,'second batch must contain exactly20unique target characters');
 const gaps=base.meaningReviews.filter(row=>row.status==='pending'||row.status==='approved'&&!row.automaticMeaningAllowed),gapByChar=new Map(gaps.map(row=>[row.char,row])),chars=new Map(dataset.characters.map(entry=>[entry.char,entry]));
 ensure(gaps.length===243&&gaps.filter(row=>row.status==='approved').length===161&&gaps.filter(row=>row.status==='pending').length===82,'recomputed243gap differs');
 const wordIndex=new Map();for(const[index,entry]of raw.entries()){const list=wordIndex.get(entry.title)??[];list.push(index);wordIndex.set(entry.title,list);}
 const classify=row=>{
  const groups=policy.explicitGroups.filter(group=>[...group.chars].includes(row.char));ensure(groups.length<=1,'ambiguous primary gap group '+row.char);
  const selected=groups[0]??policy.kindGroups[row.useKind]??policy.fallback;
  return{categoryId:selected.id,category:selected.label,nextEvidence:selected.next,basis:groups.length?'explicit per-character gap-policy group':'frozen v7 useKind '+row.useKind};
 };
 ensure(previousTable.cases.length===20&&review.reviews.every(row=>!previousTable.cases.some(old=>old.char===row.char)),'second batch overlaps first batch');
 const cases=review.reviews.map(row=>{
  const previous=gapByChar.get(row.char);ensure(previous,'target is outside243gap '+row.char);ensure(classify(previous).categoryId!=='source-identity-policy','do not bypass unresolved character identity '+row.char);
  const nameChars=[...row.givenName];ensure(nameChars.length===2&&nameChars.includes(row.char),'complete two-character given name must contain target');
  const word=raw[row.rawEntryIndex],heteronym=word?.heteronyms?.[row.rawHeteronymIndex],definition=heteronym?.definitions?.[row.rawDefinitionIndex];
  ensure(word&&heteronym&&definition&&typeof definition.def==='string'&&definition.def.trim()&&!/^(?:參見|通「|同「)/u.test(definition.def),'selected compound definition missing/reference only');
  const bindings=nameChars.map(char=>{
   const original=chars.get(char);ensure(original&&original.sourceId==='moe-revised','current779char missing or not MOE '+char);
   const selected=(original.readings??[]).filter(value=>value.pinyin===original.pinyin&&value.tone===original.tone&&value.sourceId===original.sourceId);
   ensure(selected.length===1&&[...selected[0].word].length===1,'default source reading is not singular '+char);
   const indices=wordIndex.get(selected[0].word)??[];ensure(indices.length===1,'default original dictionary word ambiguous '+char);
   const entry=raw[indices[0]],hs=entry.heteronyms.map((h,index)=>({h,index})).filter(({h})=>norm(h.pinyin)===norm(original.pinyin));ensure(hs.length===1,'default original pronunciation ambiguous '+char);
   return{character:identity(original),selectedDictionaryWord:selected[0].word,defaultOriginal:{rawEntryIndex:indices[0],rawHeteronymIndex:hs[0].index,word:entry.title,pinyin:hs[0].h.pinyin,definitions:structuredClone(hs[0].h.definitions)},independentCharacterMeaningUnchanged:true};
  });
  ensure(bindings.map(binding=>binding.selectedDictionaryWord).join('')===word.title,'original compound spelling differs from actual current word identities '+row.givenName);
  ensure(norm(heteronym.pinyin)===norm(bindings.map(binding=>binding.character.pinyin).join(' ')),'compound reading differs from confirmed default characters '+row.givenName);
  ensure([row.contextKey,row.contextLabel,row.grammar,row.reason].every(value=>typeof value==='string'&&value.trim())&&row.exclusions.length>=3,'individual conditions or grammar reasons missing');
  const caseId='meaning-context-v1.1:'+row.char+':'+row.rawEntryIndex+':'+row.rawHeteronymIndex+':'+row.rawDefinitionIndex,senseId='moe:'+row.rawEntryIndex+':'+row.rawHeteronymIndex+':'+row.rawDefinitionIndex;
  return{caseId,char:row.char,priorReview:{pendingIndex:previous.pendingIndex,status:previous.status,automaticMeaningAllowed:previous.automaticMeaningAllowed,scope:previous.scope},givenName:row.givenName,targetPositions:nameChars.flatMap((char,index)=>char===row.char?[index]:[]),characterBindings:bindings,confirmedReadings:bindings.map(binding=>({char:binding.character.char,pinyin:binding.character.pinyin,tone:binding.character.tone,confirmed:true})),source:{id:'moe-revised',originalFile:'data/raw/moe-revised.json.gz',originalSha256:FIXED_BASE_HASHES['data/raw/moe-revised.json.gz'],rawEntryIndex:row.rawEntryIndex,rawHeteronymIndex:row.rawHeteronymIndex,rawDefinitionIndex:row.rawDefinitionIndex,word:word.title,pinyin:heteronym.pinyin,definition:structuredClone(definition),completeOriginalEntry:structuredClone(word),parsedEntrySha256:hash(JSON.stringify(word)),hashConvention:'sha256(JSON.stringify(parsed original entry));not individual original byte span',license:'CC-BY-ND-3.0-TW'},selection:{usage:'entire-given-name',caseId,senseId,contextKey:row.contextKey,contextLabel:row.contextLabel,explicitChoiceRequired:true},grammar:{text:row.grammar,attribution:'Project grammar note;not an original MOE POS label',license:'CC0-1.0'},reason:row.reason,exclusions:[...row.exclusions],defaultState:'needs-explicit-choice',independentCharacterMeaningApproved:false,wholeNameApproved:false,automaticSemanticCreditAllowed:false,projectWish:null};
 });
 const newCases=cases,allCases=[...previousTable.cases,...newCases];
 const casesByChar=new Map(allCases.map(row=>[row.char,row])),counts={};
 const classifications=gaps.map(row=>{const group=classify(row);counts[group.categoryId]=(counts[group.categoryId]??0)+1;return{char:row.char,pendingIndex:row.pendingIndex,baseStatus:row.status,automaticMeaningAllowed:false,sourceBinding:structuredClone(row.binding),originalScope:row.scope,originalReason:row.reason,originalCondition:row.applicability.reason,classification:group,firstBatchCaseId:previousTable.cases.find(c=>c.char===row.char)?.caseId??null,secondBatchCaseId:newCases.find(c=>c.char===row.char)?.caseId??null,remainingState:casesByChar.has(row.char)?'conditional-full-word-evidence-added-needs-choice':'unresolved-no-new-consumable-context'};});
 ensure(classifications.length===243&&new Set(classifications.map(row=>row.char)).size===243&&Object.values(counts).reduce((a,b)=>a+b,0)===243,'gap categories do not partition all243rows');
 const contextManual=cases.filter(row=>row.priorReview.status==='approved').length,contextPending=cases.filter(row=>row.priorReview.status==='pending').length;
 const coverage={...previousTable.coverage,secondBatchDistinctCharacters:newCases.length,secondBatchDistinctFullWords:new Set(newCases.map(c=>c.givenName)).size,secondBatchDistinctApplicableSenses:new Set(newCases.map(c=>c.selection.senseId)).size,secondBatchManualCharacters:contextManual,secondBatchPendingCharacters:contextPending,totalConditionalDistinctCharacters:new Set(allCases.map(c=>c.char)).size,totalConditionalDistinctFullWords:new Set(allCases.map(c=>c.givenName)).size,totalConditionalDistinctApplicableSenses:new Set(allCases.map(c=>c.selection.senseId)).size,remainingWithoutNewContext:243-allCases.length,remainingManualWithoutNewContext:161-allCases.filter(c=>c.priorReview.status==='approved').length,remainingPendingWithoutNewContext:82-allCases.filter(c=>c.priorReview.status==='pending').length};
 ensure(coverage.secondBatchDistinctFullWords===20&&coverage.secondBatchDistinctApplicableSenses===20&&coverage.totalConditionalDistinctCharacters===40,'unique coverage differs');
 ensure(coverage.baseAutomaticDisplayCharacters===304&&coverage.excludedNotRecommended===15,'frozen score/negative boundary differs');
 const table={schema:'conditional-meaning-context-increment/1',task:review.task,phase:'for-independent-audit-not-active-method',base:{namingTableFile:'data/naming-editorial-v7.json',namingTableSha256:FIXED_BASE_HASHES['data/naming-editorial-v7.json'],datasetJsonSha256:FIXED_BASE_HASHES['data/dataset-v6.json'],knowledgePackSha256:base.base.knowledgePackSha256,activeVersion:base.base.activeVersion,originalMoeSha256:FIXED_BASE_HASHES['data/raw/moe-revised.json.gz']},coverage,policy:{fullWordOnly:true,confirmedReadingsRequired:true,explicitExactSenseAndContextRequired:true,automaticSemanticCreditAllowed:false,independentCharacterMeaningApproved:false,wholeNameApproved:false,overwritesHistoricalResults:false,newApplicationMethodVersionDefined:false},dataVersion:'meaning-context-data/1.1.0',previousPublication:{dataSha256:FIXED_BASE_HASHES['data/meaning-context-next.json'],caseCount:20,caseBytesUnchanged:true},cases:allCases};
 const gapTable={schema:'meaning-gap-classification/1',task:review.task,coverage,classificationCounts:counts,classificationIsTriageOnly:true,rows:classifications};
 const notice=`# 完整词义参考数据1.1 · 第二批待审增量

新增20个不同目标汉字、20个完整给名词、20个精确义项；其中13个人工范围、7个待审范围，均来自原243缺口，未重复第一批20字。总条件证据40字/40词/40义，仍有203字没有新增可消费语境；并非40字已获独立命名批准。完整词中的其他待核字不随目标字一并晋级。

历史1.0的数据、来源锁、manifest、20个case与解释保持原字节。当前1.1仅供用户显式建立新审阅版本。无新增评分、无独立字义回填、无整名批准。楚楚仍只计一个目标汉字与一个义项；君子选择才德称谓，群英保留复数集合，千寻保留长度单位义，小雅保留篇类专名，斯文保留礼乐教化义与sī wén读音，碧云保留赠别语境，九如仅为祝寿文化出处。

教育部《重编国语辞典修订本》固定g0v/moedict-data a6dc997417507eb510fc29822bc514de2c92728c。完整原entry、definitions、quote、example、link和索引不改；原gz、README与CC-BY-ND-3.0-TW原件入锁。词典原文不重新授权；项目场景、语法说明和边界元数据独立CC0-1.0，不冒充词典原文。不提供姓名影响命运或孩子品质的事实判断。
`;

 const outputs=new Map([['data/meaning-context-v1-1.json',encode(table)],['data/meaning-gap-classification-v1-1.json',encode(gapTable)],['data/meaning-context-v1-1-NOTICE.md',Buffer.from(notice)]]);
 const files=[...inputPaths,...outputs.keys()].sort(),fileHashes=Object.fromEntries(files.map(file=>[file,hash(outputs.get(file)??input.get(file))]));
 const source={id:'project-meaning-context-next-138-v1-1',name:'项目完整词义参考1.1（第二批待独立审计）',url:'local:data/meaning-context-v1-1.json',commit:'D02-138-MEANING-COVERAGE;data1.1;batch2',license:'CC0-1.0 project metadata only;original MOE CC-BY-ND-3.0-TW retained',files,sha256:hash(JSON.stringify(fileHashes)),note:'新增20字/20完整词/20义；总40字条件证据，203字仍无新语境；不改变独立字义、旧快照或评分。',fileHashes};
 outputs.set('data/meaning-context-v1-1-source-lock.json',encode({schema:'meaning-context-source-lock/1',hashConvention:'sha256(JSON.stringify(fileHashes));sorted relative paths',sources:[source]}));
 const manifestFiles=[...outputs.keys(),...inputPaths].sort().map(logicalTarget=>({logicalTarget,sha256:hash(outputs.get(logicalTarget)??input.get(logicalTarget)),bytes:(outputs.get(logicalTarget)??input.get(logicalTarget)).length}));
 outputs.set('data/meaning-context-v1-1-manifest.json',encode({schema:'meaning-context-publication-manifest/1',task:review.task,status:'draft',productionApproved:false,dataVersion:'meaning-context-data/1.1.0',files:manifestFiles}));
 return{outputs,coverage,classifications:counts,inputHashes:Object.fromEntries([...input].map(([file,bytes])=>[file,hash(bytes)]))};
}

// Offline deterministic CLI. Writes only the requested dataset directory.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const directory=path.resolve(process.argv[2]??'data'),check=process.argv.includes('--check'),result=deriveMeaningContextPackageV11(file=>fs.readFileSync(path.join(directory,file.slice(5))));
 for(const[file,bytes]of result.outputs){const target=path.join(directory,file.slice(5));if(check){ensure(fs.existsSync(target)&&fs.readFileSync(target).equals(bytes),'offline reproduction differs '+file);}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',bytes);fs.renameSync(target+'.tmp',target);}}
 console.log(JSON.stringify({status:check?'reproduced':'built',coverage:result.coverage,files:[...result.outputs].map(([file,b])=>({file,sha256:hash(b),bytes:b.length}))}));
}
