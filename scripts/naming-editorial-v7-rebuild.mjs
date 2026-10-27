import {V71_RULE_VERSION,V71_PROFILE_VERSION,V71_SOURCE_ID,V71_FILES,V71_INPUT_HASHES,V71_PUBLICATION_PINS,V71_EXACT_CASE_IDS,V71_NOTICE} from './naming-editorial-v7-fixed.mjs';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { isDeepStrictEqual as equal } from 'node:util';
import { V7_INPUT_HASHES, V7_NOTICE, V7_PUBLICATION_PINS, V7_SOURCE_METADATA } from './naming-editorial-v7-fixed.mjs';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const encode=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const ensure=(condition,message)=>{if(!condition)throw new Error('Naming7 offline rebuild: '+message);};
const normalize=value=>(value??'').replace(/[（(][^）)]*[）)]/g,'').trim();
const dictionaryRecord=entry=>({char:entry.char,pinyin:entry.pinyin,tone:entry.tone,sourceId:entry.sourceId,meaning:entry.meaning,readings:structuredClone(entry.readings??[])});

/** Pure reconstruction: the callback is invoked only for the 18 pinned data inputs. */
export function rebuildNamingEditorialV7(readBytes) {
  const inputs=new Map();
  for(const[file,expected]of Object.entries(V7_INPUT_HASHES)){
    const bytes=Buffer.from(readBytes(file));
    ensure(sha(bytes)===expected,'fixed input bytes differ: '+file);
    inputs.set(file,bytes);
  }
  const json=file=>JSON.parse(inputs.get(file).toString('utf8'));
  const dataset=json('data/dataset-v6.json'),old6=json('data/naming-editorial-v6.json');
  const meanings=json('data/raw/naming-meanings-v7-review.json'),citations=json('data/raw/naming-citations-v7-review.json');
  const errata1=json('data/raw/naming-meanings-v7-errata-r1.json'),errata2=json('data/raw/naming-citations-v7-errata-r2.json');
  const raw=JSON.parse(gunzipSync(inputs.get('data/raw/moe-revised.json.gz')).toString('utf8'));
  const characters=new Map(dataset.characters.map(entry=>[entry.char,entry]));
  const base={namingRuleVersion:old6.version,namingRuleSha256:sha(inputs.get('data/naming-editorial-v6.json')),datasetJsonFile:'data/dataset-v6.json',datasetJsonSha256:sha(inputs.get('data/dataset-v6.json')),knowledgePackFile:'data/knowledge-v6.sqlite',knowledgePackSha256:sha(inputs.get('data/knowledge-v6.sqlite')),datasetMetadataVersion:dataset.version,activeVersion:sha(inputs.get('data/knowledge-v6.sqlite')).slice(0,12),rawMoeFile:'data/raw/moe-revised.json.gz',rawMoeSha256:sha(inputs.get('data/raw/moe-revised.json.gz')),rawMoeCommit:'a6dc997417507eb510fc29822bc514de2c92728c'};
  ensure(meanings.version==='naming-meaning-manual-review/7.0.0'&&citations.version==='naming-citation-review/7.0.0','final review version differs');
  ensure(equal(meanings.base,base),'final review base differs from fixed input bytes');
  const reviews=meanings.meaningReviews,statuses=reviews.reduce((counts,row)=>(counts[row.status]=(counts[row.status]??0)+1,counts),{});
  ensure(reviews.length===562&&new Set(reviews.map(row=>row.char)).size===562&&reviews.every((row,index)=>row.pendingIndex===index&&characters.has(row.char)),'final reviewed character order/coverage differs');
  ensure(dataset.characters.length===779&&citations.rules.length===20&&citations.rejectedCandidates.length===11,'fixed publication coverage differs');
  function checkBinding(binding){
    const entry=characters.get(binding.char),word=raw[binding.rawEntryIndex],heteronym=word?.heteronyms?.[binding.rawHeteronymIndex],definition=heteronym?.definitions?.[binding.rawDefinitionIndex];
    ensure(entry&&binding.pinyin===entry.pinyin&&binding.tone===entry.tone&&binding.sourceId===entry.sourceId&&binding.sourceId==='moe-revised','default reading/source differs: '+binding.char);
    ensure(word?.title===binding.dictionaryWord&&normalize(heteronym?.pinyin)===binding.pinyin&&definition?.def===binding.dictionarySense,'original dictionary identity differs: '+binding.char);
  }
  for(const row of reviews)if(row.binding)checkBinding(row.binding);
  // The final raw review already contains these errata. Verify them; never apply twice.
  for(const correction of errata1.corrections){
    const row=reviews.find(row=>row.pendingIndex===correction.pendingIndex&&row.char===correction.char),source=correction.originalSource;
    ensure(row&&Object.entries(correction.after).every(([key,value])=>equal(row[key],value))&&row.applicability.reason===correction.automaticReasonAfter,'final character erratum is absent: '+correction.char);
    const definition=raw[source.rawEntryIndex]?.heteronyms?.[source.rawHeteronymIndex]?.definitions?.[source.rawDefinitionIndex];
    ensure(definition?.def===source.dictionarySense&&definition?.type===source.type,'character erratum source differs');
  }
  ensure(errata2.schema==='naming-citation-source-errata/137.r2'&&errata2.revision==='137.r2','citation errata identity differs');
  for(const correction of errata2.corrections){
    if(correction.action==='replace-contextual-sense')ensure(equal(citations.rules.find(rule=>rule.name===correction.name),correction.after),'final corrected full-name rule differs');
    else if(correction.action==='defer-without-new-combination-credit')ensure(!citations.rules.some(rule=>rule.name===correction.name)&&equal(citations.rejectedCandidates.find(rule=>rule.name===correction.name),correction.after),'deferred full name was readmitted');
    else throw new Error('Naming7 offline rebuild: unknown citation erratum action');
  }
  const canonical=new Map(dataset.citations.map(citation=>[citation.id,citation]));
  for(const rule of citations.rules){ensure(equal(rule.citation,canonical.get(rule.citation.id)),'complete citation identity differs: '+rule.name);for(const binding of rule.readings)checkBinding(binding);}
  const table={version:'naming-editorial-7.0.0',scope:'supplemental-meaning-and-citation-only',sourceIds:['naming-editorial-meanings-v7-fixed','moe-revised','shijing','zhouyi'],base,coverage:{totalCharacters:dataset.characters.length,previouslyReviewed:dataset.characters.length-reviews.length,totalPreviousPending:562,reviewedInThisArtifact:reviews.length,approvedAdditions:statuses.approved??0,automaticallyDisplayableAdditions:reviews.filter(row=>row.automaticMeaningAllowed).length,manualReviewedAdditions:reviews.filter(row=>row.status==='approved'&&!row.automaticMeaningAllowed).length,pending:statuses.pending??0,notRecommended:statuses['not-recommended']??0,complete:true},policy:{dictionaryDefinitions:'verbatim source definitions with exact source word/default pronunciation/source indices',editorial:'Original project review and family wishes;never relabel these as dictionary definition',automaticMeaning:'Only true eligibility plus machine-enforceable any-name/allowed-name conditions;manual rows never gain automatic credit',automaticSemanticCredit:false,elementChanges:false,oldRules:'Keep v3/4/5/6 unchanged;this is an independent supplemental publication',activeIdentity:'Trusted actual SQLite SHA and runtime SHA-prefix version;JSON metadata version is documented separately'},baselineCharacters:dataset.characters.map(dictionaryRecord),meaningReviews:reviews,nameRules:citations.rules,rejectedCitationCandidates:citations.rejectedCandidates};
  const outputs=new Map([['data/naming-editorial-v7.json',encode(table)],['data/naming-editorial-v7-NOTICE.md',Buffer.from(V7_NOTICE)]]);
  const files=[...inputs.keys(),...outputs.keys()].sort();
  const fileHashes=Object.fromEntries(files.map(file=>[file,sha(outputs.get(file)??inputs.get(file))]));
  const source={id:V7_SOURCE_METADATA.id,name:V7_SOURCE_METADATA.name,url:V7_SOURCE_METADATA.url,commit:V7_SOURCE_METADATA.commit,license:V7_SOURCE_METADATA.license,files,sha256:sha(JSON.stringify(fileHashes)),note:V7_SOURCE_METADATA.note,fileHashes};
  outputs.set('data/naming-editorial-meanings-v7-source-lock.json',encode({version:table.version,hashConvention:'sha256(JSON.stringify(fileHashes)); sorted relative path keys',sources:[source]}));
  ensure(sha(outputs.get('data/naming-editorial-v7.json'))===V7_PUBLICATION_PINS.tableSha256,'rebuilt table differs from fixed r2 pin');
  ensure(sha(outputs.get('data/naming-editorial-meanings-v7-source-lock.json'))===V7_PUBLICATION_PINS.lockSha256&&source.sha256===V7_PUBLICATION_PINS.sourceSha256,'rebuilt source lock differs from fixed r2 pin');
  return{outputs,inputFiles:[...inputs.keys()],sourceFileCount:files.length,coverage:table.coverage};
}

/** Compare the three independently rebuilt products. Never read a product as a reconstruction input. */
export function verifyNamingEditorialV7(readBytes){
  const rebuilt=rebuildNamingEditorialV7(readBytes),artifacts=[];
  for(const[file,expected]of rebuilt.outputs){const actual=Buffer.from(readBytes(file));ensure(actual.equals(expected),'published output differs: '+file);artifacts.push({file,bytes:expected.length,sha256:sha(expected)});}
  return{passed:true,mode:'verify-no-writes',fixedInputs:rebuilt.inputFiles.length,derivedOutputs:artifacts.length,sourceFilesChecked:rebuilt.sourceFileCount,coverage:rebuilt.coverage,artifacts,networkRequests:0};
}

/** Explicit7.1 branch. The curated subset is an independently fixed input;
 * profile/admission/NOTICE/lock/manifest are deterministic derived resources. */
export function rebuildNamingCharacterMeanings71(readBytes){
 const inputs=new Map();for(const[file,expected]of Object.entries(V71_INPUT_HASHES)){const bytes=Buffer.from(readBytes(file));ensure(sha(bytes)===expected,'7.1 fixed input bytes differ: '+file);inputs.set(file,bytes);}
 const names=V71_FILES,RULE=V71_RULE_VERSION,PROFILE=V71_PROFILE_VERSION,SOURCE=V71_SOURCE_ID;
 const subset=JSON.parse(inputs.get(names.subset).toString('utf8')),dataset=JSON.parse(inputs.get('data/dataset-v6.json').toString('utf8')),old7=JSON.parse(inputs.get('data/naming-editorial-v7.json').toString('utf8'));
 ensure(subset.schema==='naming-character-meanings-v7.1-subset/1'&&subset.ruleVersion===RULE&&subset.profileVersion===PROFILE&&subset.sourceId===SOURCE,'7.1 source identity differs');
 ensure(subset.cases.length===40&&new Set(subset.cases.map(r=>r.char)).size===40&&equal(subset.cases.map(r=>r.caseId).sort(),V71_EXACT_CASE_IDS),'7.1 exact40 admission set differs');
 ensure(subset.scope==='per-character-project-explanation-only'&&subset.wholeNameAssessment==='not-assessed'&&subset.wholeNameMeaning===null&&subset.automaticNameRecommendation===false&&subset.automaticSemanticCreditAllowed===false&&subset.scoreDelta===0,'7.1 scope changed');
 const raw=JSON.parse(gunzipSync(inputs.get('data/raw/moe-revised.json.gz')).toString('utf8'));
 for(const row of subset.cases){
  const character=dataset.characters.find(c=>c.char===row.char),prior=old7.meaningReviews.find(r=>r.char===row.char),origin=raw[row.original.rawEntryIndex],reading=origin?.heteronyms[row.original.rawHeteronymIndex],definition=reading?.definitions[row.original.rawDefinitionIndex];
  ensure(character&&prior&&!prior.automaticMeaningAllowed&&equal(character,row.baselineCharacter)&&sha(JSON.stringify(character))===row.baselineCharacterSha256,'7.1 full baseline or old304 overlap differs: '+row.char);
  ensure(origin?.title===row.original.word&&normalize(reading?.pinyin)===row.selectedPinyin&&row.selectedPinyin===character.pinyin&&row.tone===character.tone&&equal(origin,row.original.completeOriginalEntry)&&equal(definition,row.original.definition)&&sha(JSON.stringify(origin))===row.original.parsedEntrySha256,'7.1 complete original entry/reading/definition differs: '+row.char);
  ensure(character.readings.filter(r=>r.pinyin===character.pinyin&&r.tone===character.tone&&r.sourceId==='moe-revised'&&r.word===row.original.word).length===1,'7.1 exact existing dictionary word differs');
  ensure(['名','形'].includes(definition.type)&&row.editorial.license==='CC0-1.0'&&row.editorial.projectWish.startsWith('项目创作：')&&row.editorial.limits.length>=3&&row.scope===subset.scope&&row.wholeNameAssessment==='not-assessed'&&row.wholeNameMeaning===null&&row.automaticNameRecommendation===false&&row.automaticSemanticCreditAllowed===false&&row.scoreDelta===0,'7.1 editorial/scoped row differs');
  for(const proof of row.glyph.proof){ensure(['data/raw/kTraditionalVariant.txt','data/raw/kSimplifiedVariant.txt'].includes(proof.originalFile)&&inputs.has(proof.originalFile)&&sha(inputs.get(proof.originalFile))===proof.fileSha256,'7.1 glyph original identity differs');ensure(inputs.get(proof.originalFile).toString('utf8').split(/\r?\n/)[proof.lineNumber-1]===proof.originalLine,'7.1 glyph original line differs');}
  if(row.glyph.ownDictionaryEntry)ensure(equal(raw[row.glyph.ownDictionaryEntry.rawEntryIndex],row.glyph.ownDictionaryEntry.completeOriginalEntry),'7.1 own glyph original differs');
 }
 ensure(old7.meaningReviews.filter(r=>r.automaticMeaningAllowed).length===304,'Old7.0 coverage changed');
 const outputs=new Map([[names.subset,Buffer.from(inputs.get(names.subset))]]);
 const profile={schema:'naming-character-meanings-profile/1',profileVersion:PROFILE,ruleVersion:RULE,sourceId:SOURCE,subset:{file:names.subset,sha256:sha(outputs.get(names.subset))},base:subset.base,scope:subset.scope,policy:{perPositionSingleCharacterRequest:true,completeRequestMustBeAdmitted:true,wholeNameAssessment:'not-assessed',wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0,defaultDictionaryUnchanged:true,oldV7SelectionAndScoringUnchanged:true,noHistoricalBackfill:true},cases:subset.cases};outputs.set(names.profile,encode(profile));
const admission={schema:'naming-character-meanings-admission/1',profileVersion:PROFILE,ruleVersion:RULE,sourceId:SOURCE,profileSha256:sha(outputs.get(names.profile)),decision:'approved-character-notes',activation:RULE,testOnly:false,approvedCaseIds:subset.cases.map(r=>r.caseId).sort(),reviewedSelection:subset.reviewedSelection,scope:subset.scope,wholeNameAssessment:'not-assessed',wholeNameMeaning:null,automaticNameRecommendation:false,automaticSemanticCreditAllowed:false,scoreDelta:0};outputs.set(names.admission,encode(admission));
const notice=`# 逐字项目说明7.1固定候选出版\n\n精确40条独立字义项目说明，身份${RULE}／${PROFILE}／${SOURCE}。现字库779和旧7.0数据、算法、304范围及历史原件不改。此候选尚未注册产品；只有7.1加载/生成/保存/重开/历史/备份/UI/PDF实际验收完成后，才可报告相应读音与范围条件下344逐字说明覆盖。\n\nMOE重编国语辞典文本按固定a6dc997417507eb510fc29822bc514de2c92728c原件逐字保留，CC-BY-ND-3.0-TW；原定义、type、例句和引文没有改写或重新授权。Unicode字形原行按固定Unicode17原件及原许可保留，不概括任意异体同义。项目取意、家庭期许、理由与limits独立标作CC0-1.0项目创作，不冒称原典、人格测定或运势事实。\n\n新增许可只有per-character-project-explanation-only。单字请求必须完整准入，外层按候选位置装配；混名不是partial整名批准，wholeNameAssessment=not-assessed、wholeNameMeaning=null、automaticNameRecommendation=false、automaticSemanticCreditAllowed=false、scoreDelta=0。旧研究提案any-name不构成权限，profile没有这类运行许可。\n\n六修沿审定语境，霆保所引古籍的闪电用字背景，黎保通梨／黧黑色语境；不换成更常见义。词典原义、项目逐字说明、项目期许与独立既有组合依据分别展示。\n`;
outputs.set(names.notice,Buffer.from(notice));
const files=[...new Set([...inputs.keys(),...outputs.keys()])].sort(),fileHashes=Object.fromEntries(files.map(file=>[file,sha(outputs.get(file)??inputs.get(file))]));
const source={id:SOURCE,name:'项目逐字说明7.1 · 固定40条独立字义',url:'local:'+names.profile,commit:'naming-editorial-7.1.0;M148-fixed40',license:'CC0-1.0 project explanations only; original MOE CC-BY-ND-3.0-TW and Unicode terms retained',files,fileHashes,sha256:sha(JSON.stringify(fileHashes)),note:'Only exact admitted per-character explanations; full-name applicability unassessed; source/scoring/history identities remain explicit.'};
outputs.set(names.lock,encode({version:RULE,profileVersion:PROFILE,hashConvention:'sha256(JSON.stringify(fileHashes)); sorted relative path keys',sources:[source]}));
const published=[...files,names.lock].sort(),manifest={schema:'naming-character-meanings-v7.1-publication/1',ruleVersion:RULE,profileVersion:PROFILE,sourceId:SOURCE,publicationState:'fixed-candidate-awaiting-runtime-acceptance',files:published.map(file=>{const b=outputs.get(file)??inputs.get(file);return{file,sha256:sha(b),bytes:b.length};}),scope:subset.scope,exactCharacterRows:40,oldV7AutomaticCharacters:304,newProductAdoptionsInCurrent37:0,wholeNameAssessment:'not-assessed',scoreDelta:0};outputs.set(names.manifest,encode(manifest));

 outputs.set(names.notice,Buffer.from(V71_NOTICE));
 for(const row of [V71_PUBLICATION_PINS.subset,V71_PUBLICATION_PINS.profile,V71_PUBLICATION_PINS.admission,V71_PUBLICATION_PINS.lock,V71_PUBLICATION_PINS.manifest])ensure(sha(outputs.get(row.file))===row.sha256,'7.1 reconstructed publication differs: '+row.file);
 return{outputs,inputFiles:[...inputs.keys()],sourceFileCount:files.length,source,coverage:{oldV7AutomaticallyDisplayable:304,exactCharacterRows:40,newRuntimeAdoptions:0,wholeNameAssessment:'not-assessed'}};
}
export function verifyNamingCharacterMeanings71(readBytes){const rebuilt=rebuildNamingCharacterMeanings71(readBytes),artifacts=[];for(const[file,expected]of rebuilt.outputs){ensure(Buffer.from(readBytes(file)).equals(expected),'7.1 published output differs: '+file);artifacts.push({file,sha256:sha(expected),bytes:expected.length});}return{passed:true,mode:'verify-7.1-no-writes',fixedInputs:rebuilt.inputFiles.length,derivedOutputs:artifacts.length,sourceFilesChecked:rebuilt.sourceFileCount,coverage:rebuilt.coverage,artifacts,networkRequests:0};}
