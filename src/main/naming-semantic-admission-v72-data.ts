import {readFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as equal} from 'node:util';
import {createNamingSemanticAdmissionHandle,semanticV72Freeze as freeze,semanticV72Hash as hash,semanticV72Need as need,semanticV72OwnRecord,semanticV72Plain} from '../domain/naming-semantic-admission-v72';
import {NAMING_EDITORIAL_V72_SOURCE_ID,NAMING_EDITORIAL_V72_VERSION} from '../shared/naming-semantic-admission-v72';
import type {SemanticAdmissionHandle,SemanticPublicationV72,SemanticCandidateRowV72,SemanticAdmissionRecord,SemanticThemeId} from '../shared/naming-semantic-admission-v72';
import type {CharacterEntry,Citation} from '../shared/types';

/** Next-version registration candidate. These source pins do not change CURRENT,
 * old publications, manual flags, coverage counters or storage validation. */
export const NAMING_V72_FIXED_PINS=freeze({
 decision:'ecfb610b2c3467b9326e45c25fa4581870f6b3a2087b6490af08bd77d39ccbe6',
 themes:'70af9e1f5932b68a9ad7b615459cc955335f62d0453ca0344888051ffca82171',
 contract:'660087ff57c5de26e4990a3c52a0c35f14180716fc2baaeac9f607ccb5573d06',
 fixtures:'e87d6111d901e63df44693263618d7c74f5e0e043805f26b021378f4579dd556',
 conflicts:'84bc15c8561bd0ffe4860720bbbdfd0c653c0c84ea290499fc8ef005ebbcadb9',
 policyManifest:'5f4b29d9a5cd13c2d0496fd84172823e551be0221cdc52c83d95d933e1e79969',
 m740Delivery:'0290ada57d4e87386e224d6be33901e0f626d3530c74e9d48611f046a6252f23',
 m740Manifest:'c1fd08a128672f0515e94e1729a5bc5bdc2756941d23f4e6353fe3dacee3c81a',
 m740Lock:'560d89b2652a622b1efa438330e2ab4be135e5ab0502f1ad14aa9d026fb2b21c',
 m740Profile:'9e9b54ec980a0edf023963a95b721ae91212a5b06d9121873cd2e9d6f7f3e397',
 m744Audit:'8b272e6062254fe3f112a19ee6a1f31a086ca56dc5964e21eb45fae8bc59b157',
 dataset:'3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728',
 pack:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',
});
const expectedChars=[...'邦沫纪纶年农作岁叶萧'];
const sourceKinds=['product-data','product-root','m690','old-batch-occupancy'];
const candidateFiles=['data/profile.json','data/rows.jsonl','data/coverage.json','data/pending-review.json','data/NOTICE.md','selection.json','inventory-sources.json','data/source-lock.json'];
interface FilePin {file:string;bytes:number;sha256:string;root?:string;absolute?:string}
export type NamingSemanticSourceRoot='product-data'|'product-root'|'m690'|'old-batch-occupancy';
/** Main-only addressing. Overrides never replace a source pin or its required bytes. */
export interface NamingSemanticAdmissionLoaderConfig {decisionRoot:string;m740Root:string;sourceDataDir:string;m744AuditPath:string;sourceRoots?:Readonly<Partial<Record<NamingSemanticSourceRoot,string>>>}
interface Resources {config:Readonly<NamingSemanticAdmissionLoaderConfig>;dataset:{characters:CharacterEntry[];citations:Citation[]};originals:ReadonlyMap<string,Buffer>;handle:SemanticAdmissionHandle}
const authenticated=new WeakMap<object,Resources>();
let validatedCache:{key:string;publication:SemanticPublicationV72;dataset:Resources['dataset']}|undefined;

function configSnapshot(value:NamingSemanticAdmissionLoaderConfig):Readonly<NamingSemanticAdmissionLoaderConfig> {
 const keys=['decisionRoot','m740Root','sourceDataDir','m744AuditPath'];
 const fields=semanticV72OwnRecord(value,[...keys,'sourceRoots'],keys),copy=Object.create(null) as Record<string,unknown>;
 for(const key of keys){need(typeof fields[key]==='string'&&String(fields[key]).trim().length>0,'literal '+key);copy[key]=resolve(fields[key] as string);}
 if(Object.hasOwn(fields,'sourceRoots')){
  const roots=semanticV72OwnRecord(fields.sourceRoots,sourceKinds,[]),owned=Object.create(null) as Record<string,string>;
  for(const key of Object.keys(roots)){need(typeof roots[key]==='string'&&String(roots[key]).trim().length>0,'literal source root '+key);owned[key]=resolve(roots[key] as string);}
  copy.sourceRoots=freeze(owned);
 }
 return freeze(copy as unknown as NamingSemanticAdmissionLoaderConfig);
}
function safe(root:string,file:string):string {
 need(typeof file==='string'&&!file.includes('\\')&&!file.includes(':')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..'),'relative pinned path');
 const result=resolve(root,...file.split('/'));need(result.startsWith(resolve(root)+sep),'path escapes root');return result;
}
function read(file:string,expected?:string,bytes?:number):Buffer {
 const value=readFileSync(file);need(expected===undefined||hash(value)===expected,'fixed bytes '+file);need(bytes===undefined||value.length===bytes,'fixed length '+file);return value;
}
function parse(bytes:Buffer):any {const value=JSON.parse(bytes.toString('utf8'));semanticV72Plain(value);return value;}
function checkedFile(root:string,pin:FilePin):Buffer {need(Number.isSafeInteger(pin.bytes)&&pin.bytes>=0&&/^[a-f0-9]{64}$/.test(pin.sha256),'file pin');return read(safe(root,pin.file),pin.sha256,pin.bytes);}
const objectHash=(value:unknown)=>hash(JSON.stringify(value));

function validateIdentity(row:SemanticCandidateRowV72,record:SemanticAdmissionRecord,originals:Map<string,Buffer>,dataset:Resources['dataset'],dictionary:any[]):void {
 const id=record.identity,source=row.source;
 need(record.candidateCaseId===row.caseId&&record.ruleVersion===NAMING_EDITORIAL_V72_VERSION&&record.reviewId.startsWith('M752-use-review-'),'case/review identity');
 need(objectHash(row)===id.sourceCaseSha256&&id.candidateProfileSha256===NAMING_V72_FIXED_PINS.m740Profile&&id.sourceLockSha256===NAMING_V72_FIXED_PINS.m740Lock,'source case pin');
 need(row.notWholeWordDerived===true&&row.candidateOnly===true&&row.activation==='off'&&row.scope==='on-request-supplement-only','unchanged candidate scope');
 need(id.char===row.char&&id.pinyin===row.pinyin&&id.tone===row.tone&&id.sourceId===source.sourceId&&id.dictionaryWord===source.word&&id.sourceWord===source.word&&id.sourcePOS===source.sourcePOS,'selected reading/word/POS');
 need(id.rawEntryIndex===source.rawEntryIndex&&id.rawHeteronymIndex===source.rawHeteronymIndex&&id.rawDefinitionIndex===source.rawDefinitionIndex&&id.dictionarySense===source.definition.def,'source indices/sense');
 const original=dataset.characters.find(entry=>entry.char===row.char);
 need(equal(original,row.baselineCharacter)&&objectHash(original)===id.baselineCharacterSha256&&objectHash(original?.readings)===id.readingsSha256,'complete baseline character/readings');
 need(original?.pinyin===id.pinyin&&original.tone===id.tone&&original.sourceId===id.sourceId,'default reading');
 const reading=original.readings?.find(entry=>entry.pinyin===id.pinyin&&entry.tone===id.tone&&entry.sourceId===id.sourceId&&entry.word===id.sourceWord&&entry.referenceOnly!==true);
 need(reading&&equal(reading,row.defaultReading)&&reading.meanings.includes(id.dictionarySense),'single default reading');
 const entry=dictionary[id.rawEntryIndex],heteronym=entry?.heteronyms?.[id.rawHeteronymIndex],definition=heteronym?.definitions?.[id.rawDefinitionIndex];
 need(entry?.title===id.sourceWord&&[...entry.title].length===1&&equal(entry,source.completeOriginalEntry)&&objectHash(entry)===id.parsedEntrySha256,'complete single original entry');
 need(heteronym.pinyin===id.pinyin&&equal(heteronym.definitions.map((d:any)=>d.def),reading.meanings)&&equal(definition,source.definition)&&objectHash(definition)===id.definitionSha256&&hash(String(definition.def))===id.definitionTextSha256&&definition.type===id.sourcePOS,'definition/POS/readings');
 need(objectHash(row.glyph)===id.glyphProofSha256&&row.glyph.character===row.char&&row.glyph.dictionaryWord===id.sourceWord,'glyph identity');
 const proof=row.glyph.proof as Array<{file:string;lineNumberOneBased:number;line:string;sha256:string}>;
 for(const line of proof){const bytes=originals.get('product-data:'+line.file);need(bytes&&hash(bytes)===line.sha256&&bytes.toString('utf8').split(/\r?\n/u)[line.lineNumberOneBased-1]===line.line,'fixed Unicode line');}
 need(id.senseId===`moe-revised:${id.rawEntryIndex}:${id.rawHeteronymIndex}:${id.rawDefinitionIndex}`,'senseId');
 need(hash(originals.get('product-data:raw/moe-revised.json.gz')!)===id.rawOriginalSha256&&id.baseDatasetSha256===NAMING_V72_FIXED_PINS.dataset&&id.basePackSha256===NAMING_V72_FIXED_PINS.pack&&id.baseActiveVersion===id.basePackSha256.slice(0,12),'raw/dataset/pack identity');
 need(objectHash(record.project)===record.projectSha256&&objectHash(row.project)===record.originalM740ProjectSha256&&source.license==='CC-BY-ND-3.0-TW','project scope/hash/license');
 need((record.newReview as Record<string,unknown>).authority==='M752-project-editorial-decision'&&(record.priorEvidence as Record<string,unknown>).auditId==='M744-DATA','separate source/editorial review');
 need(objectHash(row.priorV7Review)===row.priorV7ReviewSha256,'historical review preserved');
}

/** Reads fixed original bytes on every load. It never imports candidate scripts
 * or accepts caller review flags/callbacks, and it does not register CURRENT. */
export function loadNamingSemanticAdmissionV72(input:NamingSemanticAdmissionLoaderConfig):SemanticAdmissionHandle {
 const config=configSnapshot(input),pins=NAMING_V72_FIXED_PINS;
 const policyManifestBytes=read(join(config.decisionRoot,'manifest.json'),pins.policyManifest),policyManifest=parse(policyManifestBytes);
 need(policyManifest.schema==='M752-r2-manifest/1','M752-r2 manifest');
 const policy=new Map<string,Buffer>();
 for(const file of policyManifest.files as FilePin[])policy.set(file.file,checkedFile(config.decisionRoot,file));
 const expectedPolicy=[['m740-generation-admission.json',pins.decision],['theme-registry.json',pins.themes],['generation-admission-contract.json',pins.contract],['acceptance-cases.json',pins.fixtures],['conflict-registry.json',pins.conflicts]];
 for(const [file,sha] of expectedPolicy)need(policy.has(file)&&hash(policy.get(file)!)===sha,'explicit M752-r2 pin '+file);
 const decision=parse(policy.get('m740-generation-admission.json')!),themes=parse(policy.get('theme-registry.json')!),contract=parse(policy.get('generation-admission-contract.json')!),conflicts=parse(policy.get('conflict-registry.json')!);
 need(decision.schema==='meaning-generation-admission/1'&&decision.ruleVersion===NAMING_EDITORIAL_V72_VERSION&&decision.publicationStatus==='decision-approved-not-registered'&&decision.productionApproved===false&&decision.formalCoverageAdded===0,'policy authority');
 need(contract.schema==='M752-generation-admission-contract/2'&&contract.stageChangesEligibility===false&&contract.formalCoverageAdded===0,'r2 stage contract');
 const auditBytes=read(config.m744AuditPath,pins.m744Audit);need(parse(auditBytes).decision.generationAuthorityGranted===false,'source review does not grant generation');
 const deliveryBytes=read(join(config.m740Root,'M740-MANIFEST.json'),pins.m740Delivery),delivery=parse(deliveryBytes);
 for(const file of delivery.files as FilePin[])checkedFile(config.m740Root,file);
 const candidateManifestBytes=read(join(config.m740Root,'data/manifest.json'),pins.m740Manifest),lockBytes=read(join(config.m740Root,'data/source-lock.json'),pins.m740Lock);
 const manifest=parse(candidateManifestBytes),lock=parse(lockBytes);
 need(equal(manifest.candidateFiles.map((row:FilePin)=>row.file),candidateFiles)&&equal(lock.candidateFiles,manifest.candidateFiles.slice(0,-1))&&equal(manifest.sourceFiles,lock.sourceFiles),'M740 exact closure');
 const candidates=new Map<string,Buffer>();for(const file of manifest.candidateFiles as FilePin[])candidates.set(file.file,checkedFile(config.m740Root,file));
 const originals=new Map<string,Buffer>();
 for(const pin of manifest.sourceFiles as FilePin[]){
  need(sourceKinds.includes(pin.root??'')&&typeof pin.absolute==='string','upstream root');
  const sourceRoot=config.sourceRoots?.[pin.root as NamingSemanticSourceRoot];
  const file=sourceRoot?safe(sourceRoot,pin.file):pin.root==='product-data'?safe(config.sourceDataDir,pin.file):pin.root==='product-root'?safe(resolve(config.sourceDataDir,'..'),pin.file):pin.absolute!;
  originals.set(pin.root+':'+pin.file,read(file,pin.sha256,pin.bytes));
 }
 need(hash(candidates.get('data/profile.json')!)===pins.m740Profile&&hash(originals.get('product-data:dataset-v6.json')!)===pins.dataset,'base/profile identity');
 const pack=read(join(config.sourceDataDir,'knowledge-v6.sqlite'),pins.pack);void pack;
 const key=hash(policyManifestBytes)+':'+hash(candidateManifestBytes)+':'+pins.dataset;
 let publication:SemanticPublicationV72,dataset:Resources['dataset'];
 if(validatedCache?.key===key){({publication,dataset}=validatedCache);}else{
  dataset=parse(originals.get('product-data:dataset-v6.json')!);
  const profile=parse(candidates.get('data/profile.json')!);need(equal(profile.cases.map((row:SemanticCandidateRowV72)=>row.char),expectedChars)&&profile.generationAuthority===false,'unchanged M740 candidates');
  need(equal(decision.records.map((row:SemanticAdmissionRecord)=>row.identity.char),expectedChars)&&decision.records.filter((row:SemanticAdmissionRecord)=>row.decision==='allow-single-character-generation').length===9,'independent9 decisions');
  const dictionary=JSON.parse(gunzipSync(originals.get('product-data:raw/moe-revised.json.gz')!).toString('utf8'));
  for(const record of decision.records as SemanticAdmissionRecord[]){const row=profile.cases.find((row:SemanticCandidateRowV72)=>row.caseId===record.candidateCaseId);need(row,'exact candidate case');validateIdentity(row,record,originals,dataset,dictionary);for(const id of record.conflictIds)need(conflicts.conflicts.some((entry:any)=>entry.id===id),'known conflict category');}
  const themeIds=themes.themes.map((entry:any)=>entry.id) as SemanticThemeId[];need(themeIds.length===6,'six explicit themes');
  publication={identity:{ruleVersion:NAMING_EDITORIAL_V72_VERSION,sourceId:NAMING_EDITORIAL_V72_SOURCE_ID,decisionSha256:pins.decision,policySha256:pins.policyManifest,themeSha256:pins.themes,contractSha256:pins.contract,fixtureSha256:pins.fixtures,candidateProfileSha256:pins.m740Profile,candidateLockSha256:pins.m740Lock,datasetSha256:pins.dataset,basePackSha256:pins.pack},records:decision.records,rows:profile.cases,themes:themeIds,activation:'not-current',productionApproved:false};
  publication=freeze(structuredClone(publication));dataset=freeze(structuredClone(dataset));validatedCache={key,publication,dataset};
 }
 const handle=createNamingSemanticAdmissionHandle(publication);authenticated.set(handle,{config,dataset,originals,handle});return handle;
}
export function isAuthenticatedSemanticAdmissionV72(handle:unknown):handle is SemanticAdmissionHandle{return !!handle&&typeof handle==='object'&&authenticated.has(handle);}
/** Main facade uses this capability check; matching JSON or a pure domain handle
 * is insufficient. Re-reading closes file mutation between separate operations. */
export function refreshSemanticAdmissionV72(handle:SemanticAdmissionHandle):SemanticAdmissionHandle {const owned=authenticated.get(handle);need(owned,'main-authenticated handle required');return loadNamingSemanticAdmissionV72(owned.config);}
export function semanticAdmissionDatasetV72(handle:SemanticAdmissionHandle):Resources['dataset'] {const owned=authenticated.get(handle);need(owned,'main-authenticated dataset required');return owned.dataset;}
export function semanticAdmissionSourceDirectoryV72(handle:SemanticAdmissionHandle):string {const owned=authenticated.get(handle);need(owned,'main-authenticated source directory');return owned.config.sourceDataDir;}
