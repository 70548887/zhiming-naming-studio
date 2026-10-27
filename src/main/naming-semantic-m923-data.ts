import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual,types} from 'node:util';
import {M923_APPLICATION_ROOT,M923_FAMILY_DIRECTORY,M923_FAMILY_IDENTITY,M923_DECISION_AND_EVIDENCE_PINS,M923_ORIGINAL_DATA_PINS,M923_EXPECTED_CANDIDATE_IDS,M923_THEMES,type M923FilePin} from './naming-semantic-m923-pins';
import type {M921M923FamilyHandle,M923AdmissionRecord,M923LoadResult,M923FamilyIdentity} from '../shared/naming-semantic-m923';
import type {CharacterEntry,Citation} from '../shared/types';
interface M923DatasetProjection {characters:CharacterEntry[];citations:Citation[];}
interface M923BaselineJson extends M923DatasetProjection {knowledge:unknown[];sources:unknown[];}

export interface M923FixedPins {
 readonly registryEntrySHA256:string;readonly decisionRecordsSHA256:string;readonly policySHA256:string;
 readonly contractSHA256:string;readonly baseDatasetSHA256:string;readonly basePackSHA256:string;
 readonly publicationSHA256:string;readonly lineageSHA256:string;readonly sourceClosureSHA256:string;
}
export interface AuthenticatedM923Resources {
 readonly identity:M923FamilyIdentity;readonly records:readonly M923AdmissionRecord[];
 readonly dataset:M923DatasetProjection;readonly datasetVersion:string;readonly pins:M923FixedPins;
 readonly publication:Readonly<Record<string,unknown>>;readonly policy:Readonly<Record<string,unknown>>;readonly registry:Readonly<Record<string,unknown>>;
}
type LoadCode='M923_SOURCE_UNAVAILABLE'|'M923_REJECTED_INTEGRITY';
class ResourceError extends Error{constructor(readonly code:LoadCode|'M923_UNTRUSTED_HANDLE'){super(code);}}
const reject=():never=>{throw new ResourceError('M923_REJECTED_INTEGRITY');};
function need(value:unknown):asserts value {if(!value)reject();}
const hash=(value:Uint8Array|string):string=>createHash('sha256').update(value).digest('hex');
const objectHash=(value:unknown):string=>hash(JSON.stringify(value));
const same=(a:unknown,b:unknown):boolean=>isDeepStrictEqual(a,b);
function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
const registry=new WeakMap<object,AuthenticatedM923Resources>();
let verifiedParsed:AuthenticatedM923Resources|undefined;
function inside(root:string,file:string):boolean{const r=path.relative(root,file);return !!r&&!path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep);}
function safe(relative:string):void{need(typeof relative==='string'&&!!relative&&!path.isAbsolute(relative)&&!relative.includes('\\')&&!relative.includes(':')&&!relative.includes('\0')&&relative.split('/').every(p=>!!p&&p!=='.'&&p!=='..'));}
function utf8(bytes:Uint8Array):string{const text=Buffer.from(bytes).toString('utf8');need(Buffer.from(text,'utf8').equals(Buffer.from(bytes)));return text;}
function parse<T=any>(bytes:Uint8Array):T{return JSON.parse(utf8(bytes)) as T;}
function pinned(root:string,pin:M923FilePin):Buffer{
 safe(pin.file);const target=path.join(root,...pin.file.split('/')),real=fs.realpathSync(target),info=fs.lstatSync(target);
 need(!info.isSymbolicLink()&&info.isFile()&&inside(root,real)&&info.size===pin.bytes);
 const bytes=fs.readFileSync(real);need(bytes.length===pin.bytes&&hash(bytes)===pin.sha256&&fs.realpathSync(target)===real);return bytes;
}
function actualFiles(root:string):string[]{
 const result:string[]=[];
 const walk=(directory:string,relative='')=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){safe(entry.name);const file=path.join(directory,entry.name),name=relative?relative+'/'+entry.name:entry.name;need(!entry.isSymbolicLink()&&inside(root,fs.realpathSync(file)));if(entry.isDirectory())walk(file,name);else{need(entry.isFile());result.push(name);}}};walk(root);return result.sort();
}
function readClosure():{family:Map<string,Buffer>;originals:Map<string,Buffer>}{
 const familyRoot=fs.realpathSync(M923_FAMILY_DIRECTORY),applicationRoot=fs.realpathSync(M923_APPLICATION_ROOT);
 need(!fs.lstatSync(M923_FAMILY_DIRECTORY).isSymbolicLink()&&fs.statSync(familyRoot).isDirectory()&&inside(applicationRoot,familyRoot));
 need(same(actualFiles(familyRoot),M923_DECISION_AND_EVIDENCE_PINS.map(p=>p.file).sort()));
 const family=new Map<string,Buffer>(),originals=new Map<string,Buffer>();
 for(const pin of M923_DECISION_AND_EVIDENCE_PINS)family.set(pin.file,pinned(familyRoot,pin));
 for(const pin of M923_ORIGINAL_DATA_PINS)originals.set(pin.file,pinned(applicationRoot,pin));
 return{family,originals};
}
function markedTone(pinyin:string):number{
 const marks=[...pinyin.normalize('NFD')].filter(c=>['\u0304','\u0301','\u030c','\u0300'].includes(c));need(marks.length===1);return({'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4} as Record<string,number>)[marks[0]];
}
function glyph(char:string,word:string,originals:Map<string,Buffer>):unknown{
 if(char===word)return{character:char,dictionaryWord:word,kind:'same-codepoint',proof:[]};
 need([...char].length===1&&[...word].length===1);
 const c=char.codePointAt(0)!.toString(16).toUpperCase(),w=word.codePointAt(0)!.toString(16).toUpperCase();
 const proof=[];
 for(const [file,from,to]of [['data/raw/kTraditionalVariant.txt',c,w],['data/raw/kSimplifiedVariant.txt',w,c]]){
  const bytes=originals.get(file)!;const lines=utf8(bytes).split(/\r?\n/u),index=lines.findIndex(line=>line.split(/\s+/u)[0]===from&&line.split(/\s+/u).slice(1).includes('U+'+to));need(index>=0);
  proof.push({file,lineNumberOneBased:index+1,line:lines[index],sha256:hash(bytes)});
 }
 return{character:char,dictionaryWord:word,kind:'fixed-unicode-direct-two-way',proof};
}
function uniqueBy(rows:any[],key:string):Map<string,any>{need(Array.isArray(rows));const result=new Map<string,any>();for(const row of rows){need(row&&typeof row[key]==='string'&&!result.has(row[key]));result.set(row[key],row);}return result;}
function validate(closure:ReturnType<typeof readClosure>):AuthenticatedM923Resources{
 const {family,originals}=closure;
 const file=(name:string):Buffer=>{const bytes=family.get(name);if(!bytes)return reject();return bytes;};
 const original=(name:string):Buffer=>{const bytes=originals.get(name);if(!bytes)return reject();return bytes;};
 const spec=parse(file('registry-entry.json')),policy=parse(file('family-policy.json')),decisions=parse(file('admission-records.json'));
 need(spec.schema==='m923-compiled-registry-entry-spec/1'&&same(spec.familyIdentity,M923_FAMILY_IDENTITY)&&same(policy.familyIdentity,M923_FAMILY_IDENTITY)&&same(decisions.familyIdentity,M923_FAMILY_IDENTITY));
 need(policy.schema==='m923-family-generation-policy/1'&&decisions.schema==='m923-character-generation-records/1');
 need(spec.records.file==='admission-records.json'&&spec.records.sha256===hash(file('admission-records.json'))&&spec.policy.file==='family-policy.json'&&spec.policy.sha256===hash(file('family-policy.json')));
 need(same(spec.m921EvidencePins,M923_DECISION_AND_EVIDENCE_PINS.filter(p=>p.file.startsWith('inputs/m921/'))));
 const originalPins=Object.fromEntries(M923_ORIGINAL_DATA_PINS.map(p=>[p.file,{sha256:p.sha256,bytes:p.bytes}]));
 need(same(spec.originalRuntimeDataPins,originalPins)&&same(policy.inputEvidence.sourcePins,originalPins));
 need(spec.expectedRecordCount===40&&spec.expectedAllowCount===40&&same(spec.expectedCandidateIds,M923_EXPECTED_CANDIDATE_IDS)&&spec.privateRegistryRequired===true&&spec.callerSuppliedRegistryAllowed===false&&spec.legacySourceIdAllowed===false);
 need(policy.decision.supported===40&&policy.decision.existingProjectText===37&&policy.decision.narrowedProjectText===3&&policy.decision.pending===0&&policy.decision.policyApproved===true&&policy.decision.grant==='allow-single-character-generation');
 need(policy.activation.enabledByDefault===false&&policy.activation.explicitRequestOptInRequired===true&&policy.activation.defaultAutomaticCoverageAdded===0&&policy.activation.productionActivation==='off');
 need(same(policy.themes.knownIds,M923_THEMES)&&same(policy.themes.requiredIds,[])&&policy.themes.freeTextInference===false&&same(policy.sourceAuthentication.map((s:any)=>s.id),['S1','S2','S3','S4','S5','S6','S7']));
 const at=(name:string)=>parse(file('inputs/m921/'+name));
 const publication=at('publication.json'),lineage=at('lineage.json'),proposals=at('revision-proposals.json'),m921Lock=at('source-lock.json'),m921Manifest=at('manifest.json');
 need(publication.activation==='not-current'&&publication.productionApproved===false&&same(lineage.sourceClassification,{general:38,pending:2})&&same(lineage.independentDisposition,{semanticClear:37,sourcePending:2,migrationHold:1}));
 need(m921Manifest.schema==='m921-publication-manifest/1'&&m921Manifest.files.length===26&&m921Manifest.activation==='off'&&m921Manifest.admissionGranted===false);
 for(const pin of m921Manifest.files){const bytes=file('inputs/m921/'+pin.file);need(bytes.length===pin.bytes&&hash(bytes)===pin.sha256);}
 need(policy.upstream.publicationSHA256===hash(file('inputs/m921/publication.json'))&&policy.upstream.manifestSHA256===hash(file('inputs/m921/manifest.json')));
 need(same(policy.historical.m916,{general:38,pending:2})&&same(policy.historical.m917AdditionalMigrationHold,['川'])&&same(policy.inputEvidence.oldVerifierDiscrepancy,m921Lock.originalSourceAudit));
 const review=at('inputs/m916-semantic-review.json'),reviewInput=at('inputs/m916-review-input.json'),m917Rows=utf8(file('inputs/m921/inputs/m917-rows.jsonl')).trim().split('\n').map(line=>JSON.parse(line));
 const oldRows=uniqueBy(publication.rows,'caseId'),oldRecords=uniqueBy(publication.records,'candidateCaseId'),lineageRows=uniqueBy(lineage.rows,'candidateCaseId'),proposalRows=uniqueBy(proposals.rows,'candidateCaseId');
 const reviews=uniqueBy(review.rows,'candidateId'),inputs=uniqueBy(reviewInput.rows,'candidateId'),m917=uniqueBy(m917Rows,'candidateId');
 const selections=new Map<string,{batch:string;row:any;source:any}>();
 for(const batch of ['m910','m914']){
  const selected=at('inputs/'+batch+'-selection.json'),subset=at('inputs/'+batch+'-source-subset.json'),manifest=at('inputs/'+batch+'-manifest.json');
  need(selected.selected.length===20&&subset.entries.length===20);at('inputs/'+batch+'-source-lock.json');
  for(const pin of manifest.files){const key='inputs/m921/inputs/'+batch+'-'+pin.file;const bytes=family.get(key);if(bytes)need(bytes.length===pin.bytes&&hash(bytes)===pin.sha256);}
  for(const item of selected.selected){need(!selections.has(item.candidateId));const source=subset.entries.find((s:any)=>s.char===item.char&&s.rawEntryIndex===item.rawEntryIndex&&s.rawHeteronymIndex===item.rawHeteronymIndex&&s.rawDefinitionIndex===item.rawDefinitionIndex);need(source);selections.set(item.candidateId,{batch,row:item,source});}
 }
 const datasetFile=parse(original('data/dataset-v6.json')) as M923BaselineJson;
 need(Array.isArray(datasetFile.characters)&&Array.isArray(datasetFile.citations)&&Array.isArray(datasetFile.knowledge)&&Array.isArray(datasetFile.sources));
 const characters=uniqueBy(datasetFile.characters,'char');
 // Pack bytes are verified independently on every load. The fixed JSON and
 // fixed SQLite pack are one reviewed baseline; no SQLite program is executed.
 const pack=original('data/knowledge-v6.sqlite');need(pack.subarray(0,16).equals(Buffer.from('SQLite format 3\0','binary')));
 const dictionary=parse<any[]>(gunzipSync(original('data/raw/moe-revised.json.gz'),{maxOutputLength:256*1024*1024}));need(Array.isArray(dictionary));
 need(Array.isArray(decisions.records)&&same(decisions.records.map((r:any)=>r.candidateCaseId),M923_EXPECTED_CANDIDATE_IDS)&&oldRows.size===40&&oldRecords.size===40&&lineageRows.size===40&&reviews.size===40&&inputs.size===40&&m917.size===40&&proposalRows.size===3);
 let originalText=0,narrowText=0,sourceGeneral=0,sourcePending=0,hold=0;
 for(const record of decisions.records as any[]){
  const candidateId=record.candidateCaseId,id=record.identity,old=oldRows.get(candidateId),oldRecord=oldRecords.get(candidateId),past=lineageRows.get(candidateId),proposal=proposalRows.get(candidateId),reviewRow=reviews.get(candidateId),decision=m917.get(candidateId),selection=selections.get(candidateId);
  need(old&&oldRecord&&past&&reviewRow&&decision&&selection&&same(reviewRow,inputs.get(candidateId)));
  need(record.schema==='m923-character-generation-decision/1'&&same(record.familyIdentity,M923_FAMILY_IDENTITY)&&record.editorialDecision==='supported'&&record.decision==='allow-single-character-generation'&&record.eligibilityPolicyApproved===true&&record.reviewId.startsWith('M923-use-review-'));
  need(same(id,oldRecord.identity)&&same(id.char,old.char)&&same(record.sourceCoordinates,{rawEntryIndex:id.rawEntryIndex,rawHeteronymIndex:id.rawHeteronymIndex,rawDefinitionIndex:id.rawDefinitionIndex}));
  const entry=dictionary[id.rawEntryIndex],reading=entry?.heteronyms?.[id.rawHeteronymIndex],definition=reading?.definitions?.[id.rawDefinitionIndex],baseline=characters.get(id.char) as CharacterEntry|undefined;
  need(entry&&reading&&definition&&entry.title===id.dictionaryWord&&id.sourceWord===entry.title&&[...entry.title].length===1&&reading.pinyin===id.pinyin&&markedTone(reading.pinyin)===id.tone&&id.sourceId==='moe-revised');
  need(same(entry,old.source.completeOriginalEntry)&&same(entry,selection.source.completeOriginalEntry)&&objectHash(entry)===id.parsedEntrySha256&&record.sourceSHA256===id.parsedEntrySha256);
  need(same(definition,record.sourceDefinition)&&same(definition,old.source.definition)&&same(definition,selection.source.sourceDefinition)&&objectHash(definition)===id.definitionSha256&&hash(definition.def)===id.definitionTextSha256&&definition.def===id.dictionarySense&&definition.type===id.sourcePOS);
  need(id.rawOriginalSha256===hash(original('data/raw/moe-revised.json.gz'))&&id.baseDatasetSha256===hash(original('data/dataset-v6.json'))&&id.basePackSha256===hash(pack)&&id.baseActiveVersion===hash(pack).slice(0,12));
  need(baseline&&same(baseline,old.baselineCharacter)&&objectHash(baseline)===id.baselineCharacterSha256&&objectHash(baseline!.readings)===id.readingsSha256&&baseline!.pinyin===id.pinyin&&baseline!.tone===id.tone&&baseline!.sourceId===id.sourceId);
  const defaultReading=baseline!.readings?.find(r=>r.pinyin===id.pinyin&&r.tone===id.tone&&r.sourceId===id.sourceId&&r.word===id.sourceWord&&r.referenceOnly!==true);
  need(defaultReading&&same(defaultReading,old.defaultReading)&&same(defaultReading.meanings,reading.definitions.map((d:any)=>d.def))&&defaultReading.meanings.includes(id.dictionarySense));
  const proof=glyph(id.char,id.sourceWord,originals);need(same(proof,old.glyph)&&objectHash(proof)===id.glyphProofSha256&&objectHash(old)===id.sourceCaseSha256);
  for(const key of ['char','pinyin','tone','sourceId','dictionaryWord'])need(id[key]===selection.row[key]&&id[key]===decision[key]&&id[key]===reviewRow[key]);
  for(const key of ['rawEntryIndex','rawHeteronymIndex','rawDefinitionIndex'])need(id[key]===selection.row[key]&&id[key]===selection.source[key]&&id[key]===reviewRow[key]);
  need(objectHash(reviewRow)===decision.sourceRowSHA256&&same(decision.sourceDefinition,definition));
  const l=record.lineage;
  need(l.m921PublicationSHA256===hash(file('inputs/m921/publication.json'))&&l.m921RecordSHA256===objectHash(oldRecord)&&l.m921ProjectSHA256===objectHash(old.project)&&l.m921SourceRowSHA256===objectHash(old)&&l.m921LineageRowSHA256===objectHash(past)&&l.m917RowSHA256===objectHash(decision)&&l.originalSelectedReadingRetained===true);
  const historical=record.historical;
  need(historical.m916Classification===decision.sourceClassification&&historical.m916Decision===decision.sourceSemanticDecision&&historical.m916RowSHA256===objectHash(reviewRow)&&historical.originalProjectMeaning===decision.projectMeaning&&historical.originalTextSHA256===hash(decision.projectMeaning)&&historical.oldRecordsRewritten===false);
  need(historical.originalProjectSHA256===objectHash({meaning:decision.projectMeaning,projectWish:decision.documentaryProjectWish,limits:decision.sourceLimits})&&historical.m917Decision===decision.decision&&same(historical.m917MigrationReview,decision.migrationReview));
  if(historical.m916Classification==='general')sourceGeneral++;else if(historical.m916Classification==='pending')sourcePending++;else reject();if(id.char==='川'){need(decision.migrationReview.kind==='additional-editorial-scope-hold');hold++;}
  need(record.project.projectWish===null&&record.project.license==='CC0-1.0'&&record.project.attribution==='M923 independent project wording decision; dictionary text remains MOE'&&same(record.project.limits,decision.sourceLimits));
  if(proposal){need(record.revisionKind==='approved-narrowed-proposal'&&record.project.meaning===proposal.proposedMeaning&&record.proposalSHA256===objectHash(proposal));narrowText++;}else{need(record.revisionKind==='approved-existing-project-text'&&record.project.meaning===decision.projectMeaning&&record.proposalSHA256===null);originalText++;}
  need(record.projectTextSHA256===hash(record.project.meaning)&&record.projectSHA256===objectHash(record.project)&&record.sourceLicense==='CC-BY-ND-3.0-TW'&&record.sourceFieldMayBeRewritten===false&&record.approvedScope==='characterwise-only');
  need(record.grants.eligibilityPolicyApproved===true&&record.grants.sourceAuthorityFromCaller===false&&record.grants.automaticSemanticCreditAllowed===false&&record.grants.scoreDelta===0&&record.grants.wholeNameMeaning===null&&record.grants.wholeNameApproved===false&&record.grants.personalityPrediction===false&&record.grants.fortunePrediction===false&&record.grants.elementModification===false&&record.grants.citationAuthorityAdded===false);
  need(record.usage.mode==='any-context-with-explicit-family-opt-in'&&same(record.usage.requiredThemeIds,[])&&record.usage.automaticThemeInference===false);
  const conditions=record.machineConditions;need(conditions.namePart==='given-name'&&same(conditions.allowedGivenNameLengths,[1,2])&&conditions.selectedPinyin===id.pinyin&&conditions.tone===id.tone&&conditions.senseId===id.senseId&&id.senseId===`moe-revised:${id.rawEntryIndex}:${id.rawHeteronymIndex}:${id.rawDefinitionIndex}`&&conditions.familyOptInRequired===true&&same(conditions.familyOptInIdentity,M923_FAMILY_IDENTITY)&&conditions.existingHardConstraintsApply===true&&conditions.requiresNewFamilySignature===false&&conditions.wholeNameApprovalRequired===false);
 }
 need(originalText===37&&narrowText===3&&sourceGeneral===38&&sourcePending===2&&hold===1);
 need(policy.licenses.dictionary.attribution==='教育部《重編國語辭典修訂本》'&&policy.licenses.dictionary.label==='CC-BY-ND-3.0-TW'&&policy.licenses.project==='CC0-1.0'&&policy.licenses.glyph==='Unicode-3.0'&&policy.licenses.sourceLicenseSubstitutionAllowed===false);
 for(const name of policy.licenses.fixedLicenseFilePaths)need(originals.has(name)&&utf8(original(name)).length>100);
 const dataset:M923DatasetProjection={characters:datasetFile.characters,citations:datasetFile.citations};
 const pins:M923FixedPins={registryEntrySHA256:hash(file('registry-entry.json')),decisionRecordsSHA256:hash(file('admission-records.json')),policySHA256:hash(file('family-policy.json')),contractSHA256:hash(file('contract.d.ts')),baseDatasetSHA256:hash(original('data/dataset-v6.json')),basePackSHA256:hash(pack),publicationSHA256:hash(file('inputs/m921/publication.json')),lineageSHA256:hash(file('inputs/m921/lineage.json')),sourceClosureSHA256:objectHash([...M923_DECISION_AND_EVIDENCE_PINS,...M923_ORIGINAL_DATA_PINS])};
 return freeze({identity:M923_FAMILY_IDENTITY,records:decisions.records as M923AdmissionRecord[],dataset,datasetVersion:hash(pack).slice(0,12),pins,publication,policy,registry:spec});
}
function failure(error:unknown):M923LoadResult{
 if(error instanceof ResourceError)return{ok:false,code:error.code==='M923_UNTRUSTED_HANDLE'?'M923_REJECTED_INTEGRITY':error.code};
 const code=error&&typeof error==='object'&&'code'in error?(error as {code?:unknown}).code:undefined;
 return{ok:false,code:typeof code==='string'&&['ENOENT','EACCES','EPERM','EIO','ENOTDIR'].includes(code)?'M923_SOURCE_UNAVAILABLE':'M923_REJECTED_INTEGRITY'};
}
/** No arguments: actual code-owned bytes, never caller pins/configuration. */
export function loadM921M923Family():M923LoadResult{
 try{
  if(arguments.length!==0)reject();
  const closure=readClosure();
  // Only deeply frozen pure derivations may be reused after ALL current bytes
  // have just matched their fixed code pins. Failures never fall back to cache.
  const resources=verifiedParsed??validate(closure);if(!verifiedParsed)verifiedParsed=resources;
  const handle=Object.freeze(Object.create(null)) as M921M923FamilyHandle;registry.set(handle,resources);return{ok:true,handle};
 }catch(error){return failure(error);}
}
export function isAuthenticatedM923Family(handle:unknown):handle is M921M923FamilyHandle{return !!handle&&typeof handle==='object'&&!types.isProxy(handle)&&registry.has(handle);}
export function getAuthenticatedM923Resources(handle:M921M923FamilyHandle):AuthenticatedM923Resources{
 if(arguments.length!==1||!isAuthenticatedM923Family(handle))throw new ResourceError('M923_UNTRUSTED_HANDLE');return registry.get(handle)!;
}
export function refreshM921M923Family(handle:M921M923FamilyHandle):M923LoadResult{
 if(arguments.length!==1||!isAuthenticatedM923Family(handle)){if(handle&&typeof handle==='object')registry.delete(handle);return{ok:false,code:'M923_REJECTED_INTEGRITY'};}
 const result=loadM921M923Family();if(!result.ok)registry.delete(handle);return result;
}
