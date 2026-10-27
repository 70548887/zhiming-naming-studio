import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual,types} from 'node:util';
import {INPUT_PINS,SOURCE_PINS} from './pins.mjs';

export const PACKAGE_ROOT=path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SOURCE_ROOT=path.resolve(PACKAGE_ROOT,'../..');
export const VERSION='m921-character-meaning-publication/1.0.0-candidate.1';
export const RULE_VERSION='naming-editorial-7.2.0';
export const THEMES=Object.freeze(['civic-homeland','water-bubbles','textile-ribbon','agriculture','literary-artwork','herb-plant']);
export const STAGES=Object.freeze(['pool','required','local','ai','save','restore']);
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const objectHash=value=>hash(JSON.stringify(value));
export const fail=code=>{throw Error('M921_'+code);};
export const need=(value,code)=>{if(!value)fail(code);};
export const same=(a,b)=>isDeepStrictEqual(a,b);
export function plain(value,depth=0,seen=new Set()){
 need(depth<=70,'DEPTH');if(value===null||['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value))return;
 need(value&&typeof value==='object'&&!types.isProxy(value)&&!seen.has(value),'PLAIN');const array=Array.isArray(value),proto=Object.getPrototypeOf(value);need(array?proto===Array.prototype:proto===Object.prototype||proto===null,'PROTOTYPE');
 const keys=Reflect.ownKeys(value),desc=Object.getOwnPropertyDescriptors(value);need(keys.every(k=>typeof k==='string'),'SYMBOL');
 if(array){const length=desc.length;need(length&&Number.isSafeInteger(length.value)&&keys.length===length.value+1,'ARRAY');for(let i=0;i<length.value;i++)need(Object.hasOwn(desc,String(i)),'SPARSE');}
 seen.add(value);for(const key of keys){if(array&&key==='length')continue;need(desc[key].enumerable&&Object.hasOwn(desc[key],'value'),'ACCESSOR');plain(desc[key].value,depth+1,seen);}seen.delete(value);
}
export function config(value={}){plain(value);need(value&&!Array.isArray(value)&&Object.keys(value).every(k=>['sourceRoot','packageRoot'].includes(k)),'CONFIG');for(const key of Object.keys(value))need(typeof value[key]==='string'&&path.isAbsolute(value[key]),'CONFIG_PATH');return{sourceRoot:value.sourceRoot??DEFAULT_SOURCE_ROOT,packageRoot:value.packageRoot??PACKAGE_ROOT};}
function readPinned(root,file,pin){const bytes=fs.readFileSync(path.join(root,file));need(bytes.length===pin.bytes&&hash(bytes)===pin.sha256,'FIXED_SOURCE_'+file);return bytes;}
function tone(pinyin){const marked=[...pinyin.normalize('NFD')].filter(c=>['\u0304','\u0301','\u030c','\u0300'].includes(c));need(marked.length===1,'PINYIN_TONE');return{'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4}[marked[0]];}
function glyph(char,word,buffers){
 if(char===word)return{character:char,dictionaryWord:word,kind:'same-codepoint',proof:[]};
 const c=char.codePointAt(0).toString(16).toUpperCase(),w=word.codePointAt(0).toString(16).toUpperCase(),proof=[];
 for(const [file,from,to]of [['data/raw/kTraditionalVariant.txt',c,w],['data/raw/kSimplifiedVariant.txt',w,c]]){
  const lines=buffers.get(file).toString('utf8').split(/\r?\n/u),index=lines.findIndex(line=>line.split(/\s+/u)[0]===from&&line.split(/\s+/u).slice(1).includes('U+'+to));need(index>=0,'GLYPH_'+char);
  proof.push({file,lineNumberOneBased:index+1,line:lines[index],sha256:SOURCE_PINS[file].sha256});
 }return{character:char,dictionaryWord:word,kind:'fixed-unicode-direct-two-way',proof};
}
const narrowed=Object.freeze({方:'取区域的空间意象。',锋:'取器物尖端部分的意象。',川:'取河流的自然意象。'});
const zeroGrants=()=>({eligibilityPolicyApproved:false,sourceAuthorityFromCaller:false,automaticSemanticCreditAllowed:false,scoreDelta:0,wholeNameMeaning:null,wholeNameApproved:false,personalityPrediction:false,fortunePrediction:false,elementModification:false});

/** Deterministic candidate conversion. Every caller root is addressing only;
 * fixed code-owned hashes are reread before any source or decision is used. */
export function convert(options={}){
 const {sourceRoot,packageRoot}=config(options),buffers=new Map(),inputs=new Map();
 for(const [file,pin]of Object.entries(SOURCE_PINS))buffers.set(file,readPinned(sourceRoot,file,pin));
 for(const [file,pin]of Object.entries(INPUT_PINS))inputs.set(file,readPinned(packageRoot,file,pin));
 const parse=file=>JSON.parse(inputs.get('inputs/'+file).toString('utf8'));
 const decision=parse('m917-decision-contract.json'),decisions=inputs.get('inputs/m917-rows.jsonl').toString('utf8').trim().split('\n').map(JSON.parse),review=parse('m916-semantic-review.json'),reviewInput=parse('m916-review-input.json');
 const dataset=JSON.parse(buffers.get('data/dataset-v6.json')),dictionary=JSON.parse(gunzipSync(buffers.get('data/raw/moe-revised.json.gz')));
 need(decisions.length===40&&review.rows.length===40&&reviewInput.rows.length===40,'COUNT');
 need(same(decision.sourceClassification,{total:40,general:38,explicitTheme:0,pending:2,upstreamChanged:false}),'SOURCE_CLASSIFICATION');
 need(same(decision.independentDisposition.additionalHoldChars,['川'])&&same(decision.independentDisposition.sourcePendingChars,['方','锋']),'DISPOSITION');
 const original=new Map(),sourceCases=new Map();
 for(const batch of ['m910','m914']){
  const selection=parse(batch+'-selection.json'),subset=parse(batch+'-source-subset.json'),manifest=parse(batch+'-manifest.json'),binding=decision.sourceBindings[batch];
  need(selection.selected.length===20&&subset.entries.length===20,'BATCH_COUNT');
  for(const [name,field]of [['selection','selectionSHA256'],['source-subset','sourceSubsetSHA256'],['manifest','manifestSHA256']])need(hash(inputs.get('inputs/'+batch+'-'+name+'.json'))===binding[field],'UPSTREAM_PIN');
  for(const entry of manifest.files){const capture=inputs.get('inputs/'+batch+'-'+entry.file);if(capture)need(hash(capture)===entry.sha256&&capture.length===entry.bytes,'UPSTREAM_MANIFEST');}
  for(const item of selection.selected){need(!original.has(item.candidateId),'DUPLICATE');original.set(item.candidateId,{batch,selection:item});const source=subset.entries.find(e=>e.char===item.char&&e.rawEntryIndex===item.rawEntryIndex&&e.rawHeteronymIndex===item.rawHeteronymIndex&&e.rawDefinitionIndex===item.rawDefinitionIndex);need(source,'SOURCE_CASE');sourceCases.set(item.candidateId,source);}
 }
 const rows=[],records=[],lineage=[],revisionProposals=[];let clear=0,sourcePending=0,migrationHold=0,general=0;
 for(const d of decisions){
  const old=original.get(d.candidateId),s=sourceCases.get(d.candidateId),r=review.rows.find(row=>row.candidateId===d.candidateId),ri=reviewInput.rows.find(row=>row.candidateId===d.candidateId);need(old&&s&&r&&ri&&same(r,ri),'LINEAGE_ROW');
  const c=old.selection,entry=dictionary[d.definitionCoordinate.rawEntryIndex],h=entry?.heteronyms?.[d.definitionCoordinate.rawHeteronymIndex],definition=h?.definitions?.[d.definitionCoordinate.rawDefinitionIndex],base=dataset.characters.find(row=>row.char===d.char);
  need(objectHash(r)===d.sourceRowSHA256&&objectHash(entry)===d.sourceSHA256&&same(entry,s.completeOriginalEntry)&&d.rawFileSHA256===SOURCE_PINS['data/raw/moe-revised.json.gz'].sha256,'ORIGINAL_ENTRY');
  for(const key of ['char','pinyin','tone','sourceId','dictionaryWord'])need(d[key]===r[key]&&d[key]===c[key]&&d[key]===s[key],'READING_IDENTITY_'+key);
  for(const key of ['rawEntryIndex','rawHeteronymIndex','rawDefinitionIndex'])need(d.definitionCoordinate[key]===c[key]&&r[key]===c[key]&&s[key]===c[key],'COORDINATE');
  need(entry.title===d.dictionaryWord&&[...entry.title].length===1&&h.pinyin===d.pinyin&&tone(h.pinyin)===d.tone&&same(definition,d.sourceDefinition)&&same(definition,s.sourceDefinition)&&definition.def===d.dictionarySense&&definition.type===d.sourcePOS,'RAW_READING_DEFINITION');
  need(base&&base.pinyin===d.pinyin&&base.tone===d.tone&&base.sourceId===d.sourceId,'DEFAULT_READING');
  const defaultReading=base.readings?.find(x=>x.word===d.dictionaryWord&&x.pinyin===d.pinyin&&x.tone===d.tone&&!x.referenceOnly);need(defaultReading&&defaultReading.meanings.includes(definition.def),'DEFAULT_SENSE');
  need(c.meaning===d.projectMeaning&&r.projectMeaning===d.projectMeaning&&d.sourceClassification===r.classification&&d.runtimeProjectWish===null&&!d.admissionGranted,'REVIEW_BINDING');
  const held=Object.hasOwn(narrowed,d.char),disposition=d.char==='川'?'migration-hold':d.sourceClassification==='pending'?'source-pending':'semantic-clear';
  if(disposition==='semantic-clear'){clear++;need(d.decision==='retain-characterwise-review-candidate','CLEAR_DECISION');}else if(disposition==='source-pending')sourcePending++;else migrationHold++;
  if(d.sourceClassification==='general')general++;
  const project={meaning:held?narrowed[d.char]:d.projectMeaning,projectWish:null,limits:[...d.sourceLimits,...(held?['本版收窄项目释义尚待新的独立决定；不得借旧分类视为复审通过。']:[])],attribution:'M921-DATA versioned project wording; dictionary text remains MOE',license:'CC0-1.0'};
  const proof=glyph(d.char,d.dictionaryWord,buffers),source={sourceId:d.sourceId,word:d.dictionaryWord,pinyin:d.pinyin,tone:d.tone,originalFile:'data/raw/moe-revised.json.gz',originalSha256:SOURCE_PINS['data/raw/moe-revised.json.gz'].sha256,rawEntryIndex:d.definitionCoordinate.rawEntryIndex,rawHeteronymIndex:d.definitionCoordinate.rawHeteronymIndex,rawDefinitionIndex:d.definitionCoordinate.rawDefinitionIndex,sourcePOS:d.sourcePOS,definition,completeOriginalEntry:entry,parsedEntrySha256:objectHash(entry),license:'CC-BY-ND-3.0-TW'};
  const historical={candidateId:d.candidateId,batch:d.batch,sourceClassification:d.sourceClassification,sourceSemanticDecision:d.sourceSemanticDecision,originalProjectMeaning:d.projectMeaning,documentaryProjectWish:d.documentaryProjectWish,originalProjectSha256:objectHash({meaning:d.projectMeaning,projectWish:d.documentaryProjectWish,limits:d.sourceLimits}),decisionId:d.decisionId,sourceRowSHA256:d.sourceRowSHA256,sourceDefinitionSHA256:objectHash(definition),sourceReviewCommit:d.sourceReviewCommit};
  const row={caseId:d.candidateId,char:d.char,pinyin:d.pinyin,tone:d.tone,defaultReading,baselineCharacter:base,baselineCharacterSha256:objectHash(base),binding:{ruleVersion:RULE_VERSION,publicationVersion:VERSION,sourceClassification:d.sourceClassification,independentDisposition:disposition,admissionGranted:false},glyph:proof,source,project,priorV7Review:r,priorV7ReviewSha256:objectHash(r),notWholeWordDerived:true,candidateOnly:true,activation:'off',generationAuthority:false,scope:'on-request-supplement-only',lineage:historical};
  const identity={char:d.char,pinyin:d.pinyin,tone:d.tone,sourceId:d.sourceId,dictionaryWord:d.dictionaryWord,sourceWord:d.dictionaryWord,sourcePOS:d.sourcePOS,...d.definitionCoordinate,dictionarySense:d.dictionarySense,senseId:`moe-revised:${source.rawEntryIndex}:${source.rawHeteronymIndex}:${source.rawDefinitionIndex}`,rawOriginalSha256:source.originalSha256,parsedEntrySha256:source.parsedEntrySha256,definitionSha256:objectHash(definition),definitionTextSha256:hash(definition.def),baselineCharacterSha256:objectHash(base),readingsSha256:objectHash(base.readings),glyphProofSha256:objectHash(proof),sourceCaseSha256:objectHash(row),candidateProfileSha256:INPUT_PINS['inputs/'+old.batch+'-selection.json'].sha256,sourceLockSha256:INPUT_PINS['inputs/'+old.batch+'-source-lock.json'].sha256,baseDatasetSha256:SOURCE_PINS['data/dataset-v6.json'].sha256,basePackSha256:SOURCE_PINS['data/knowledge-v6.sqlite'].sha256,baseActiveVersion:SOURCE_PINS['data/knowledge-v6.sqlite'].sha256.slice(0,12)};
  const record={candidateCaseId:d.candidateId,admissionId:'m921-candidate:'+d.candidateId,reviewId:d.decisionId+':'+d.candidateId,ruleVersion:RULE_VERSION,decision:held?'pending':'manual-only',usage:{mode:'any-context'},candidateConstraints:{namePart:'given-name',givenNameLengths:[1,2],wholeNameApprovalRequired:false,requiresNewFamilySignature:false},identity,project,projectSha256:objectHash(project),originalM740ProjectSha256:historical.originalProjectSha256,approvedScope:'none',sourceIdentityDecision:'fixed-source-replayed-no-generation-grant',sourceLicense:source.license,sourceFieldMayBeRewritten:false,reason:held?'new-narrowed-wording-awaiting-independent-decision':'semantic-clear-readonly-candidate-no-generation-grant',prohibitedInferences:d.sourceProhibitedInferences,priorEvidence:historical,newReview:{authority:'M921-candidate-conversion-not-independent-approval',decisionRequired:held,independentDecisionId:null},conditionIds:['fixed-default-reading','fixed-sense','candidate-only'],conflictIds:d.sourceProhibitedInferences,machineConditions:{selectedPinyin:d.pinyin,tone:d.tone,senseId:identity.senseId,allowedGivenNameLengths:[1,2],requiredThemeIds:[],namePart:'given-name',conflictPolicy:'do-not-claim-alternate-sense'},grants:zeroGrants(),productionActivation:'off'};
  rows.push(row);records.push(record);lineage.push({candidateCaseId:d.candidateId,...historical,definitionCoordinate:d.definitionCoordinate,originalSourceSHA256:d.sourceSHA256,rawFileSHA256:d.rawFileSHA256,newProjectSha256:record.projectSha256,runtimeProjectWish:null,independentDisposition:disposition,newIndependentDecisionId:null});
  if(held)revisionProposals.push({candidateCaseId:d.candidateId,char:d.char,sourceClassification:d.sourceClassification,independentDisposition:disposition,sourceMeaning:d.projectMeaning,proposedMeaning:project.meaning,sourceDefinition:d.sourceDefinition,sourceDefinitionSha256:objectHash(d.sourceDefinition),pinyin:d.pinyin,tone:d.tone,definitionCoordinate:d.definitionCoordinate,status:'pending-independent-decision',decisionId:null,admissionGranted:false,generationEligibilityGranted:false,activation:'off'});
 }
 need(clear===37&&sourcePending===2&&migrationHold===1&&general===38&&new Set(rows.map(r=>r.caseId)).size===40,'FINAL_CLASSIFICATION');
 const sourceLock={schema:'m921-source-lock/1',publicationVersion:VERSION,inputPins:INPUT_PINS,sourcePins:SOURCE_PINS,hashConvention:'file=actual UTF8/original bytes; object=SHA256(UTF8(JSON.stringify(original parsed key order)))',originalSourceAudit:decision.sourceAudit,dictionaryAttribution:'教育部《重編國語辭典修訂本》',dictionaryLicense:'CC-BY-ND-3.0-TW',formatConversionLicense:'kcwu JSON format conversion CC0',glyphLicense:'Unicode-3.0',projectLicense:'CC0-1.0',oldVerifierMismatchPreserved:true,blanketOldManifestApproval:false};
 const publication={identity:{ruleVersion:RULE_VERSION,sourceId:'naming-semantic-admission-v72-M752',decisionSha256:INPUT_PINS['inputs/m917-rows.jsonl'].sha256,policySha256:objectHash(sourceLock),themeSha256:objectHash(THEMES),contractSha256:INPUT_PINS['inputs/m917-decision-contract.json'].sha256,fixtureSha256:objectHash(lineage),candidateProfileSha256:objectHash(rows),candidateLockSha256:objectHash(sourceLock),datasetSha256:SOURCE_PINS['data/dataset-v6.json'].sha256,basePackSha256:SOURCE_PINS['data/knowledge-v6.sqlite'].sha256},records,rows,themes:THEMES,activation:'not-current',productionApproved:false};
 return{publication,lineage:{schema:'m921-lineage/1',version:VERSION,sourceClassification:{general:38,pending:2},independentDisposition:{semanticClear:37,sourcePending:2,migrationHold:1},rows:lineage},revisionProposals:{schema:'m921-editorial-revisions/1',version:VERSION,admissionGranted:false,status:'pending-independent-decision',rows:revisionProposals},sourceLock};
}

export function writeCandidate(options={}){
 const c=config(options),result=convert(c);for(const [key,file]of [['publication','publication.json'],['lineage','lineage.json'],['revisionProposals','revision-proposals.json'],['sourceLock','source-lock.json']]){const target=path.join(c.packageRoot,file);fs.writeFileSync(target+'.tmp',JSON.stringify(result[key],null,2)+'\n');fs.renameSync(target+'.tmp',target);}
 // Compile actual representative clear/held payloads with `satisfies`, without
 // assertions or unknown casts. All forty undergo the same runtime converter.
 const clear=result.publication.records.findIndex(r=>r.decision==='manual-only'),held=result.publication.records.findIndex(r=>r.decision==='pending');
 const sample={...result.publication,rows:[result.publication.rows[clear],result.publication.rows[held]],records:[result.publication.records[clear],result.publication.records[held]]};
 const target=path.join(c.packageRoot,'interface-check.ts');fs.writeFileSync(target+'.tmp',"import type {SemanticPublicationV72} from '../../src/shared/naming-semantic-admission-v72';\n// Actual generated clear and held records; compilation grants no runtime authority.\nexport const candidate = "+JSON.stringify(sample,null,2)+' satisfies SemanticPublicationV72;\n');fs.renameSync(target+'.tmp',target);return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=writeCandidate();console.log(JSON.stringify({ok:true,rows:result.publication.rows.length,sourceGeneral:38,sourcePending:2,semanticClear:37,migrationHold:1,newRevisions:3,activation:'off'}));}
