import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,sep} from 'node:path';
import {culturalCanonicalDigest,culturalCanonicalJson,ownCulturalJson} from '../domain/qimen-cultural-comparison-canonical';
import type {CulturalEvidenceRef,CulturalLabelPolicyIdentity} from '../shared/qimen-cultural-comparison';
import {M754_BASELINE_SHA} from '../shared/m754-element-imagery-pins';
import type {CharacterEntry,NameImageryProfile,SourceRecord} from '../shared/types';
import {loadBaziSources} from './bazi-data';
import {createM779AdmittedElementImagery} from './m779-admitted-element-imagery';
import {loadNameImageryData} from './name-imagery-data';
import {loadQimenSources} from './qimen-data';
import {loadSolarTimeSources} from './solar-time-data';

const PUBLICATION_PATH='assets/project-element-imagery/1.0.0';
const PUBLICATION_SHA='79fc7b9c1ffb4098c960cbd65ff0a9b92c69a41d680ed581380457c1180209f9';
const EDITORIAL_VERSION='naming-editorial-3.0.0';
const EDITORIAL_SHA='dd088dfe9e256c9dbd01793f099a93b040f7f8a8eb67c9b91fe5af7c6f9543c4';
const POLICY_ID='qimen-cultural-existing-editorial-labels/1.0.0';
const JSON_ASSET_SCHEMA='qimen-cultural-source-json-asset/1.0.0';
const LOCKS=Object.freeze([
 {file:'qimen-markers-source-lock.json',sha256:'921d35d90b3dcc8d3ae1c1cc6befc7748036b5c58b9dd6852a821f4a27827dae'},
 {file:'qimen-patterns-source-lock.json',sha256:'d620d224f56ef9815030174c49351bb71855cb4a2f267ebe4712c548c78edb37'},
 {file:'qimen-stem-tombs-source-lock.json',sha256:'406779b1d83236c8c8dde89b1def7dd18caf81fee981904b45d45655daf5d9e8'},
 {file:'name-imagery-source-lock.json',sha256:'d1c074aea2fe08ee0542ff06eecfddbd1a5638c1e8ac142e41196c58b772ec65'},
 {file:'bazi-evidence-source-lock.json',sha256:'4c0a03716599878e4d1fcc3f6f3f207c2a469cdcc041955fe3c31cae24b68b50'},
 {file:'solar-time-source-lock.json',sha256:'09c7946574ce37f0b2ee5204f76e61167a8001614157c2238b2e80658f383481'},
]);

type SourceBlob=Readonly<{id:string;relativePath:string;sha256:string;bytes:Uint8Array;mediaType:string}>;
type SourceJson=Readonly<{id:string;schemaId:string;codecVersion:string;sha256:string;exactUtf8Json:string}>;
interface PublicationManifest {schemaVersion:string;publicationId:string;files:{path:string;sha256:string;bytes:number}[];}
interface BaselineDataset {characters:CharacterEntry[];sources:SourceRecord[];}
interface LockedSource extends SourceRecord {fileHashes:Record<string,string>;}
interface SourceLock {version:string;sources:LockedSource[];}
export interface CulturalProviderSourcesV1 {
 revision:string;
 labelPolicy:CulturalLabelPolicyIdentity;
 baselineCharacters:readonly CharacterEntry[];
 baselineSources:readonly SourceRecord[];
 sourceReferences:readonly CulturalEvidenceRef[];
 mappingProfile:NameImageryProfile;
 pendingCharacters:readonly string[];
 blobs:readonly SourceBlob[];
 sourceJsons:readonly SourceJson[];
}
const unavailable=():never=>{throw new Error('CULTURAL_PROVIDER_SOURCE_UNAVAILABLE');};
const hash=(bytes:Uint8Array|string):string=>createHash('sha256').update(bytes).digest('hex');
const isHash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const same=(a:unknown,b:unknown):boolean=>culturalCanonicalJson(a)===culturalCanonicalJson(b);
function contained(root:string,file:string):boolean {
 const subpath=relative(root,file);
 return subpath.length>0&&!isAbsolute(subpath)&&subpath!=='..'&&!subpath.startsWith('..'+sep);
}
function checkedRelative(value:string):void {
 if(typeof value!=='string'||!value||isAbsolute(value)||value.includes('\\')||value.includes(':')||value.includes('\0')||value.split('/').some(part=>!part||part==='.'||part==='..'))unavailable();
}
function exactUtf8(bytes:Uint8Array):string {
 const text=Buffer.from(bytes).toString('utf8');
 if(!Buffer.from(text,'utf8').equals(Buffer.from(bytes)))unavailable();
 return text;
}
function parseJson<T>(bytes:Uint8Array):T {return ownCulturalJson<T>(JSON.parse(exactUtf8(bytes)));}
function mediaType(file:string):string {
 if(file.endsWith('.json'))return 'application/json';
 if(file.endsWith('.gz'))return 'application/gzip';
 if(file.endsWith('.html'))return 'text/html;charset=utf-8';
 if(file.endsWith('.md'))return 'text/markdown;charset=utf-8';
 if(file.endsWith('.js'))return 'text/javascript;charset=utf-8';
 return 'text/plain;charset=utf-8';
}
function sourceRecord(value:SourceRecord):SourceRecord {
 const {id,name,url,commit,license,files,sha256,note}=value;
 return {id,name,url,commit,license,files:[...files],sha256,note};
}
function evidence(source:SourceRecord,authority:CulturalEvidenceRef['authority'],locator:string,note:string):CulturalEvidenceRef {
 return {id:source.id,version:source.commit,sha256:source.sha256,locator,authority,license:source.license,note};
}

/** Fresh fixed resources only. The ten separately admitted M770 mappings are
 * captured as source material but are deliberately not consumed by this policy.
 * Binary bytes are owned per invocation and never passed through a JSON copier.
 */
export function loadCulturalProviderSources(dataDir:string):CulturalProviderSourcesV1 {
 try{
  if(arguments.length!==1||typeof dataDir!=='string'||!dataDir||dataDir.length>8192)unavailable();
  const realDataDir=realpathSync(dataDir),applicationRoot=dirname(realDataDir);
  if(!statSync(realDataDir).isDirectory())unavailable();
  const publicationRoot=realpathSync(join(applicationRoot,PUBLICATION_PATH));
  if(!contained(applicationRoot,publicationRoot)||!statSync(publicationRoot).isDirectory())unavailable();
  // This factory performs its complete current fixed admission check on every
  // call. Its project()/new mapping projection is intentionally never invoked.
  const admitted=createM779AdmittedElementImagery(applicationRoot);
  const byPath=new Map<string,SourceBlob>(),jsons:SourceJson[]=[];
  const capture=(root:string,file:string,prefix:string,expectedSha?:string,expectedBytes?:number):SourceBlob=>{
   checkedRelative(file);
   const relativePath=prefix+'/'+file,id='cultural-source:'+relativePath;
   const existing=byPath.get(relativePath);
   if(existing){if(expectedSha&&existing.sha256!==expectedSha||expectedBytes!==undefined&&existing.bytes.byteLength!==expectedBytes)unavailable();return existing;}
   const target=realpathSync(join(root,file));
   if(!contained(root,target)||!statSync(target).isFile())unavailable();
   const bytes=new Uint8Array(readFileSync(target)),sha256=hash(bytes);
   if(!contained(root,realpathSync(join(root,file)))||expectedSha&&sha256!==expectedSha||expectedBytes!==undefined&&bytes.byteLength!==expectedBytes)unavailable();
   const blob=Object.freeze({id,relativePath,sha256,bytes,mediaType:mediaType(file)});
   byPath.set(relativePath,blob);
   if(file.endsWith('.json')){
    const exactUtf8Json=exactUtf8(bytes);parseJson<unknown>(bytes);
    jsons.push(Object.freeze({id,schemaId:JSON_ASSET_SCHEMA,codecVersion:'exact-utf8-json/1',sha256,exactUtf8Json}));
   }
   return blob;
  };
  const publicationFile=(file:string,expectedSha?:string,expectedBytes?:number)=>capture(publicationRoot,file,PUBLICATION_PATH,expectedSha,expectedBytes);
  const dataFile=(file:string,expectedSha?:string)=>capture(realDataDir,file,'data',expectedSha);
  const manifestBlob=publicationFile('manifest.json',PUBLICATION_SHA);
  const manifest=parseJson<PublicationManifest>(manifestBlob.bytes);
  if(manifest.schemaVersion!=='m779-admitted-element-imagery-manifest/1.0.0'||manifest.publicationId!=='project-element-imagery/1.0.0'||!Array.isArray(manifest.files)||manifest.files.length!==21||new Set(manifest.files.map(file=>file.path)).size!==21)unavailable();
  for(const file of manifest.files){
   if(!isHash(file.sha256)||!Number.isSafeInteger(file.bytes)||file.bytes<0)unavailable();
   publicationFile(file.path,file.sha256,file.bytes);
  }
  const baselineBlob=publicationFile('data/dataset-v6.json',M754_BASELINE_SHA);
  const baseline=parseJson<BaselineDataset>(baselineBlob.bytes),baselineCharacters=admitted.baselineCharacters();
  if(!Array.isArray(baseline.characters)||!Array.isArray(baseline.sources)||baseline.characters.length!==779||!same(baseline.characters,baselineCharacters))unavailable();
  const editorial=baseline.sources.filter(source=>source.id==='editorial-rules');
  if(editorial.length!==1||editorial[0].commit!==EDITORIAL_VERSION||editorial[0].sha256!==EDITORIAL_SHA)unavailable();
  const dependency={sourceId:editorial[0].id,version:editorial[0].commit,sha256:editorial[0].sha256};
  const policyDescriptor={schema:'qimen-cultural-existing-editorial-label-policy/1.0.0',id:POLICY_ID,version:'1.0.0',baselineDatasetSha256:M754_BASELINE_SHA,authority:'project-editorial-label',dependencies:[dependency],selection:'fixed-baseline-reading-and-existing-elements-only',newM770Mappings:'not-consumed'};
  const labelPolicy:CulturalLabelPolicyIdentity={id:POLICY_ID,version:'1.0.0',manifestDigest:culturalCanonicalDigest(policyDescriptor),dependencies:[dependency]};
  const policyJson=culturalCanonicalJson(policyDescriptor);
  jsons.push(Object.freeze({id:'cultural-source:label-policy-descriptor',schemaId:policyDescriptor.schema,codecVersion:'cultural-canonical-json/1',sha256:hash(policyJson),exactUtf8Json:policyJson}));
  const policyPath='@generated/qimen-cultural-existing-editorial-label-policy-v1.json';
  byPath.set(policyPath,Object.freeze({id:'cultural-source:label-policy-descriptor',relativePath:policyPath,sha256:hash(policyJson),bytes:new Uint8Array(Buffer.from(policyJson,'utf8')),mediaType:'application/json'}));
  const coverage=admitted.coverage;
  const pendingCharacters=[...coverage.admitted.generalCharacters,...coverage.admitted.themeCharacters];
  if(coverage.baseline.total!==779||coverage.baseline.tagged!==257||coverage.baseline.untagged!==522||coverage.admitted.general!==5||coverage.admitted.explicitTheme!==5||pendingCharacters.length!==10||new Set(pendingCharacters).size!==10)unavailable();
  const lockedRecords=new Map<string,SourceRecord>(),sourceLocations=new Map<string,string>();
  for(const lockPin of LOCKS){
   const lockBlob=dataFile(lockPin.file,lockPin.sha256),lock=parseJson<SourceLock>(lockBlob.bytes);
   if(!Array.isArray(lock.sources)||!lock.sources.length)unavailable();
   for(const source of lock.sources){
    if(!Array.isArray(source.files)||!source.fileHashes||!source.files.length||new Set(source.files).size!==source.files.length||source.files.length!==Object.keys(source.fileHashes).length||!isHash(source.sha256))unavailable();
    const actual:Record<string,string>={};
    for(const file of [...source.files].sort()){
     if(typeof file!=='string'||!file.startsWith('data/')||!isHash(source.fileHashes[file]))unavailable();
     const blob=dataFile(file.slice(5),source.fileHashes[file]);actual[file]=blob.sha256;
     if(/LICENSE|NOTICE/.test(file)&&source.license.includes('MIT')){
      const license=exactUtf8(blob.bytes);
      if(!license.includes('Permission is hereby granted, free of charge')||!license.includes('THE SOFTWARE IS PROVIDED "AS IS"'))unavailable();
     }
    }
    // These historical source locks define their aggregate using ordered
    // JSON.stringify(fileHashes), independently of the new canonical codec.
    if(hash(JSON.stringify(actual))!==source.sha256)unavailable();
    const record=sourceRecord(source),prior=lockedRecords.get(record.id);
    if(prior&&!same(prior,record))unavailable();lockedRecords.set(record.id,record);
    sourceLocations.set(record.id,'data/'+lockPin.file+'#sources/'+record.id);
   }
  }
  // The historical marker/pattern loaders return lock records with extra
  // fileHashes. Compare their source fields, preserving the original loaders.
  const mapping=loadNameImageryData(realDataDir),qimenSources=loadQimenSources(realDataDir).map(sourceRecord);
  const baziSources=loadBaziSources(realDataDir).map(sourceRecord),solarSources=loadSolarTimeSources(realDataDir).map(sourceRecord);
  const actualRules=[...mapping.sources,...qimenSources,...baziSources,...solarSources];
  if(new Set(actualRules.map(source=>source.id)).size!==actualRules.length||actualRules.length!==lockedRecords.size||actualRules.some(source=>!same(source,lockedRecords.get(source.id))))unavailable();
  const sourceLocator=(source:SourceRecord):string=>{const locator=sourceLocations.get(source.id);if(!locator)return unavailable();return locator;};
  const mappingProfileBlob=dataFile('name-imagery-profile.json');
  if(!same(parseJson<NameImageryProfile>(mappingProfileBlob.bytes),mapping.profile))unavailable();
  // loadNameImageryData additionally authenticates this full Arc original,
  // rather than only the line-excerpt and license listed by its own lock.
  dataFile('raw/qimen-patterns-arc-constants.js','7dc6e2470862c5bf418020ac3aeb771936abb7e47549b426892578656ad86592');
  const dictionaryIds=new Set(baseline.characters.flatMap(character=>[character.sourceId,...(character.readings??[]).map(reading=>reading.sourceId)]));
  const dictionarySources=baseline.sources.filter(source=>dictionaryIds.has(source.id));
  if([...dictionaryIds].some(id=>!dictionarySources.some(source=>source.id===id)))unavailable();
  const sourceReferences:CulturalEvidenceRef[]=[
   ...dictionarySources.map(source=>evidence(source,'dictionary-fact',PUBLICATION_PATH+'/data/dataset-v6.json#sources/'+source.id,'固定 baseline 辞书/读音事实；不据此授予元素标签。')),
   evidence(editorial[0],'project-editorial-label',PUBLICATION_PATH+'/data/dataset-v6.json#characters','仅已有项目自编意象标签；不消费新增十条映射，也不宣称传统唯一归属。'),
   ...mapping.sources.map(source=>evidence(source,'palace-table',sourceLocator(source),'固定项目外八宫集合约定；不是传统姓名落宫。')),
   ...qimenSources.map(source=>evidence(source,'saved-chart-rule',sourceLocator(source),'原保存盘规则及观察来源；不由名字造成或解除。')),
   ...baziSources.map(source=>evidence(source,'saved-chart-rule',sourceLocator(source),'出生历法与基础时制材料；不作为字符标签或任注新结论。')),
   ...solarSources.map(source=>evidence(source,'saved-chart-rule',sourceLocator(source),'出生太阳时公式及例证材料；不作为字符元素标签。')),
  ];
  const blobs=[...byPath.values()].sort((a,b)=>a.relativePath<b.relativePath?-1:a.relativePath>b.relativePath?1:0);
  const sourceJsons=jsons.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const descriptor={schema:'qimen-cultural-provider-source-revision/1.0.0',labelPolicy,baselineDatasetSha256:M754_BASELINE_SHA,mappingProfile:mapping.profile,pendingCharacters,sourceReferences,blobs:blobs.map(blob=>({id:blob.id,relativePath:blob.relativePath,sha256:blob.sha256,bytes:blob.bytes.byteLength,mediaType:blob.mediaType})),sourceJsons:sourceJsons.map(json=>({id:json.id,schemaId:json.schemaId,codecVersion:json.codecVersion,sha256:json.sha256}))};
  return Object.freeze({revision:culturalCanonicalDigest(descriptor),labelPolicy:ownCulturalJson<CulturalLabelPolicyIdentity>(labelPolicy),baselineCharacters:ownCulturalJson<CharacterEntry[]>(baselineCharacters),baselineSources:ownCulturalJson<SourceRecord[]>(baseline.sources),sourceReferences:ownCulturalJson<CulturalEvidenceRef[]>(sourceReferences),mappingProfile:ownCulturalJson<NameImageryProfile>(mapping.profile),pendingCharacters:ownCulturalJson<string[]>(pendingCharacters),blobs:Object.freeze(blobs),sourceJsons:Object.freeze(sourceJsons)});
 }catch{return unavailable();}
}
