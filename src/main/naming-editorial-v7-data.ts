import {loadM460V71Publication,m460PublicationForSaved,isM460PublicationData} from './m460-publication-data.mjs';
import type {OwnedNamingRuleJsonInputs} from '../shared/candidate-facts';
import {resolveSessionNamingRulesVersion} from '../shared/naming-rules';
import compiled71Profile from '../../data/naming-character-meanings-v7.1-profile.json';
import compiled71Admission from '../../data/naming-character-meanings-v7.1-admission.json';
import compiled71Lock from '../../data/naming-character-meanings-v7.1-source-lock.json';
import compiled71Manifest from '../../data/naming-character-meanings-v7.1-manifest.json';
import compiled71Subset from '../../data/raw/naming-character-meanings-v7.1-subset.json';
import {createNamingCharacterReview71} from '../domain/naming-review-v7.mjs';
import type {NamingCharacterReview71Identity,NamingCharacterReview71Lookup} from '../domain/naming-review-v7.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {digestSourceBytes} from './source-byte-digest.mjs';
import {isDeepStrictEqual as equal} from 'node:util';
import compiledTable from '../../data/naming-editorial-v7.json';
import compiledPublication from '../../data/naming-editorial-meanings-v7-source-lock.json';
import type {NamingSession,SourceRecord} from '../shared/types';

export const NAMING_EDITORIAL_V7_SOURCE_ID='naming-editorial-meanings-v7-fixed';
export const NAMING_EDITORIAL_V7_VERSION='naming-editorial-7.0.0';
/** Fixed r2 source component verified; main-flow and release acceptance remain separate gates. */
export const NAMING_EDITORIAL_V7_PUBLICATION_PINS=Object.freeze({
 revision:'137.r2',reviewStatus:'source-component-verified',
 sourceAuditSha256:'9af2acd90ac0d1a3bd0107ccb52fc4f59f242514f647e474e55a377bdfec008f',
 manifestSha256:'60c14300d109e88afc245957c037df2732c82f5bbedc11373063ad039ad6f9b8',
 tableFile:'naming-editorial-v7.json',lockFile:'naming-editorial-meanings-v7-source-lock.json',
 tableSha256:'392fa47441a0c410b0903c3e85853081225a1a5e9f540b5467e4ea4e2151cc48',
 lockSha256:'2945297a7f4bca1489e12018cce2848909fc35716c999b7d309e9a79633f7476',
 aggregateSha256:'c8ab117059d68c26180c6de68b84032cd498fd8714cf5ee5b8df945c1205f676',
 fileCount:20,
});

const digest=(value:string|Uint8Array)=>Buffer.isBuffer(value)?digestSourceBytes(value):createHash('sha256').update(value).digest('hex');
function requireFact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('命名义7.0资料校验失败：'+message);}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const sameKeys=(value:object,keys:string[])=>equal(Reflect.ownKeys(value).sort(),[...keys].sort());
const property=(value:object,key:string):unknown=>{
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 requireFact(!descriptor||Object.hasOwn(descriptor,'value'),'字段不得是访问器：'+key);
 return descriptor?.value;
};
function requirePlainData(value:unknown,active=new WeakSet<object>()):void{
 if(value===null||typeof value==='string'||typeof value==='boolean'||(typeof value==='number'&&Number.isFinite(value)))return;
 requireFact(Array.isArray(value)||object(value),'来源和版本标记必须是纯JSON资料');
 const node=value as object;
 requireFact(!active.has(node),'纯JSON资料不得循环引用');active.add(node);
 if(Array.isArray(value)){
  requireFact(Object.getPrototypeOf(value)===Array.prototype&&Reflect.ownKeys(value).length===value.length+1,'来源数组不得稀疏或附加字段');
  for(let index=0;index<value.length;index++)requireFact(Object.hasOwn(value,index),'来源数组不得稀疏或附加字段');
 }
 for(const key of Reflect.ownKeys(node)){
  requireFact(typeof key==='string','来源不得包含符号字段');
  const descriptor=Object.getOwnPropertyDescriptor(node,key)!;
  requireFact(Object.hasOwn(descriptor,'value'),'来源字段不得是访问器');
  if(Array.isArray(value)&&key==='length')continue;
  requireFact(descriptor.enumerable,'来源不得包含隐藏字段');requirePlainData(descriptor.value,active);
 }
 active.delete(node);
}
function frozen<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
const publication=frozen(structuredClone(compiledPublication)),expectedTable=frozen(structuredClone(compiledTable));
const normalize=(source:typeof publication.sources[number]):SourceRecord=>{
 const {id,name,url,commit,license,files,sha256,note}=source;
 return {id,name,url,commit,license,files:[...files],sha256,note};
};

/** File/provenance validation only; the trusted active SQLite identity is checked by candidate-facts. */
export function loadNamingEditorialV7Data(directory:string):{sources:SourceRecord[]}{
 const pins=NAMING_EDITORIAL_V7_PUBLICATION_PINS,load=(file:string)=>readFileSync(join(directory,file));
 const lockBytes=load(pins.lockFile),tableBytes=load(pins.tableFile);
 requireFact(digest(lockBytes)===pins.lockSha256&&digest(tableBytes)===pins.tableSha256,'固定表或来源锁原件摘要不一致');
 const lock=JSON.parse(lockBytes.toString('utf8')),table=JSON.parse(tableBytes.toString('utf8'));
 requirePlainData(lock);requirePlainData(table);
 requireFact(equal(lock,publication)&&equal(table,expectedTable),'编译表、来源锁或完整出版元信息不一致');
 requireFact(lock.version===NAMING_EDITORIAL_V7_VERSION&&lock.hashConvention==='sha256(JSON.stringify(fileHashes)); sorted relative path keys'&&Array.isArray(lock.sources)&&lock.sources.length===1,'独立来源出版身份不符');
 const source=lock.sources[0];
 requireFact(source.id===NAMING_EDITORIAL_V7_SOURCE_ID&&Array.isArray(source.files)&&source.files.length===pins.fileCount&&object(source.fileHashes)&&sameKeys(source.fileHashes,source.files)&&equal(source.files,[...source.files].sort())&&new Set(source.files).size===source.files.length,'20件固定原件清单不完整、重复或非排序');
 const actual:Record<string,string>={};
 for(const file of source.files){
  requireFact(typeof file==='string'&&file.startsWith('data/')&&!file.includes('\\')&&!file.split('/').some((part:string)=>!part||part==='.'||part==='..'),'来源路径无效');
  actual[file]=digest(load(file.slice(5)));
  requireFact(actual[file]===source.fileHashes[file],'来源原件摘要不一致：'+file);
 }
 requireFact(digest(JSON.stringify(actual))===source.sha256&&source.sha256===pins.aggregateSha256,'来源汇总摘要不符');
 requireFact(table.version===NAMING_EDITORIAL_V7_VERSION&&table.scope==='supplemental-meaning-and-citation-only'&&equal(table.sourceIds,[NAMING_EDITORIAL_V7_SOURCE_ID,'moe-revised','shijing','zhouyi']),'版本、用途范围或来源标记不符');
 requireFact(actual[table.base.datasetJsonFile]===table.base.datasetJsonSha256&&actual[table.base.knowledgePackFile]===table.base.knowledgePackSha256&&actual[table.base.rawMoeFile]===table.base.rawMoeSha256&&actual['data/naming-editorial-v6.json']===table.base.namingRuleSha256&&table.base.namingRuleVersion==='naming-editorial-6.0.0'&&table.base.activeVersion===table.base.knowledgePackSha256.slice(0,12),'6.0基件完整摘要或运行时版本元信息不符');
 requireFact(table.policy.automaticSemanticCredit===false&&table.policy.elementChanges===false,'命名义补充不得改变语义评分或五行标签');
 return {sources:[normalize(source)]};
}
export function loadNamingEditorialV7Sources(directory:string):SourceRecord[]{return loadNamingEditorialV7Data(directory).sources;}

/** Reauthenticate on every call, then retain exactly the four reread originals. */
export function loadOwnedNamingRuleJsonInputs(directory:string):OwnedNamingRuleJsonInputs {
  loadNamingEditorialV7Data(directory);
  const source=publication.sources[0];
  const files=['data/naming-editorial.json','data/naming-editorial-v5.json','data/naming-editorial-v6.json','data/naming-editorial-v7.json'] as const;
  const read=(file:typeof files[number]):string=>{
    const bytes=readFileSync(join(directory,file.slice(5)));
    requireFact(source.files.includes(file)&&digest(bytes)===source.fileHashes[file],'规则原件取用时摘要不一致：'+file);
    const text=bytes.toString('utf8');
    requirePlainData(JSON.parse(text));
    return text;
  };
  return Object.freeze({baseJson:read(files[0]),v5Json:read(files[1]),v6Json:read(files[2]),v7Json:read(files[3])});
}

const priorTuples=new Map([
 ['naming-editorial-4.0.0','naming-editorial-readings-v4-fixed'],
 ['naming-editorial-5.0.0','naming-editorial-names-v5-fixed'],
 ['naming-editorial-6.0.0','naming-editorial-dictionary-v6-fixed'],
]);
export function verifyNamingEditorialV7Provenance(session:NamingSession,sources:SourceRecord[]=[normalize(publication.sources[0])]):void{
 requireFact(object(session),'方案对象无效');
 const markerDescriptor=Object.getOwnPropertyDescriptor(session,'namingRules');
 requireFact(!markerDescriptor||(Object.hasOwn(markerDescriptor,'value')&&markerDescriptor.value!==undefined),'命名规则标记必须是明确保存值，不得为空字段或访问器');
 const snapshot=property(session,'sourceSnapshot'),allSources=object(snapshot)?property(snapshot,'sources'):undefined;
 if(allSources!==undefined)requirePlainData(allSources);
 const rows=Array.isArray(allSources)?allSources:[];
 const recorded=rows.filter(row=>object(row)&&property(row,'id')===NAMING_EDITORIAL_V7_SOURCE_ID);
 if(!markerDescriptor){requireFact(recorded.length===0,'旧方案不得混入命名义7.0专用来源');return;}
 const marker=markerDescriptor.value;requirePlainData(marker);
 requireFact(object(marker)&&sameKeys(marker,['version','dataVersion','sourceId'])&&typeof property(marker,'dataVersion')==='string'&&String(property(marker,'dataVersion')).trim()&&property(marker,'dataVersion')===property(session,'dataVersion'),'命名版本或字库标记不一致');
 const version=property(marker,'version'),sourceId=property(marker,'sourceId');
 if(typeof version==='string'&&priorTuples.get(version)===sourceId){requireFact(recorded.length===0,'4.0/5.0/6.0方案不得混入7.0专用来源');return;}
 requireFact(version===NAMING_EDITORIAL_V7_VERSION&&sourceId===NAMING_EDITORIAL_V7_SOURCE_ID,'命名义7.0方法或来源标记不符');
 requireFact(!rows.some(row=>object(row)&&[...priorTuples.values()].includes(String(property(row,'id')))),'7.0方案不能同时宣称采用4.0/5.0/6.0专用来源');
 requirePlainData(sources);
 const expected=sources.filter(row=>row.id===NAMING_EDITORIAL_V7_SOURCE_ID);
 requireFact(expected.length===1&&recorded.length===1&&equal(recorded[0],expected[0])&&equal(expected[0],normalize(publication.sources[0])),'命名义7.0固定来源缺失、重复或元信息不一致');
}

/** Explicit future7.1 capsule. Loading does not switch the current generator. */
export const NAMING_EDITORIAL_V71_VERSION='naming-editorial-7.1.0' as const;
export const NAMING_EDITORIAL_V71_SOURCE_ID='naming-character-meanings-v7.1-fixed' as const;
export const NAMING_EDITORIAL_V71_PINS=frozen({
  "ruleVersion": "naming-editorial-7.1.0",
  "profileVersion": "naming-character-meanings-v7.1/1",
  "sourceId": "naming-character-meanings-v7.1-fixed",
  "subset": {
    "file": "data/raw/naming-character-meanings-v7.1-subset.json",
    "sha256": "59be39f7d9cbed1db5220721c015445546a19aa9967e59d4db0f820f3bcee8c1"
  },
  "profile": {
    "file": "data/naming-character-meanings-v7.1-profile.json",
    "sha256": "6e619be92c16dc018715fc77425f150b6a2c9af2e01be63b309035c81dd6a85b"
  },
  "admission": {
    "file": "data/naming-character-meanings-v7.1-admission.json",
    "sha256": "425909be7aa94e251a37d45a77c759d0b3dfd323beef0af6882f3e0596b4d313"
  },
  "lock": {
    "file": "data/naming-character-meanings-v7.1-source-lock.json",
    "sha256": "d8e1c6c278090d290b5792e31dc5187df5ad290b97e7ccdbce58dcbd285d793a"
  },
  "manifest": {
    "file": "data/naming-character-meanings-v7.1-manifest.json",
    "sha256": "51277c6deca9d7177d41518b76740077938030e847ad72464f343c6e98b880fb"
  },
  "sourceAggregateSha256": "01adfb9e007c441469c28b101e51bf43f72afc49fe3ad2a68614babce9fa0fe1",
  "exactCaseIds": [
    "single-meaning-next:中:6025:0:0",
    "single-meaning-next:仪:14591:0:0",
    "single-meaning-next:元:14888:0:8",
    "single-meaning-next:冰:17833:0:0",
    "single-meaning-next:南:23414:0:0",
    "single-meaning-next:境:34131:0:1",
    "single-meaning-next:墨:34262:0:0",
    "single-meaning-next:奕:38570:0:1",
    "single-meaning-next:峻:46828:0:1",
    "single-meaning-next:庆:56503:0:2",
    "single-meaning-next:彩:51603:0:1",
    "single-meaning-next:彰:51723:0:0",
    "single-meaning-next:情:55118:0:0",
    "single-meaning-next:惠:55334:0:4",
    "single-meaning-next:普:71655:0:0",
    "single-meaning-next:朋:73620:0:0",
    "single-meaning-next:朔:73727:0:0",
    "single-meaning-next:木:74035:0:0",
    "single-meaning-next:格:76502:0:4",
    "single-meaning-next:楚:77603:0:2",
    "single-meaning-next:欢:79612:0:1",
    "single-meaning-next:理:96624:0:7",
    "single-meaning-next:碧:105031:0:1",
    "single-meaning-next:程:107277:0:2",
    "single-meaning-next:空:107834:0:2",
    "single-meaning-next:纾:111486:0:1",
    "single-meaning-next:绪:113522:0:2",
    "single-meaning-next:绿:113006:0:1",
    "single-meaning-next:翠:115840:0:6",
    "single-meaning-next:肃:117686:0:1",
    "single-meaning-next:萍:123879:0:0",
    "single-meaning-next:豪:134656:0:6",
    "single-meaning-next:贵:135430:0:2",
    "single-meaning-next:遥:142679:0:0",
    "single-meaning-next:霆:152712:0:1",
    "single-meaning-next:青:153099:0:6",
    "single-meaning-next:静:153292:0:4",
    "single-meaning-next:高:158594:0:0",
    "single-meaning-next:黎:161706:0:1",
    "single-meaning-next:黛:161987:0:3"
  ],
  "reviewedSelection": {
    "firstManifestSha256": "fe8ea3fc0c39d8423a41cd9789dfbf2a3a4e3bfb7c5b3b2a222a9b47579ff8fb",
    "secondManifestSha256": "aca8762eac8f39fa98288c0db2451bdd8ce8387532bfe9f5474d81092910d078",
    "sixCorrectionManifestSha256": "b7b5d183d49ed4df3d57b52955025c6188cefc13e75df65400e1184bdcb42934",
    "scopeFixManifestSha256": "125e3d8ebf14acdfc8f16a0fca10d64f89a0aae4354a712b7a87fd8f53250763",
    "requiredOutputScopeAuditSha256": "956bd1475a1fe19115447ca42c9ffb99f39b22f9f3fe738d474e38520c7ef41c",
    "decisionIndexSha256": "58a6d9d57f672a9da46ea5f6f55f9c6f54caab613677105942702b386a8aed3c",
    "firstCases": [
      "single-meaning-next:静:153292:0:4",
      "single-meaning-next:碧:105031:0:1",
      "single-meaning-next:理:96624:0:7",
      "single-meaning-next:奕:38570:0:1",
      "single-meaning-next:墨:34262:0:0",
      "single-meaning-next:青:153099:0:6",
      "single-meaning-next:冰:17833:0:0",
      "single-meaning-next:朋:73620:0:0",
      "single-meaning-next:遥:142679:0:0",
      "single-meaning-next:峻:46828:0:1",
      "single-meaning-next:肃:117686:0:1",
      "single-meaning-next:仪:14591:0:0",
      "single-meaning-next:庆:56503:0:2",
      "single-meaning-next:惠:55334:0:4",
      "single-meaning-next:元:14888:0:8",
      "single-meaning-next:彰:51723:0:0",
      "single-meaning-next:欢:79612:0:1",
      "single-meaning-next:豪:134656:0:6",
      "single-meaning-next:纾:111486:0:1",
      "single-meaning-next:贵:135430:0:2"
    ],
    "secondUnchangedCases": [
      "single-meaning-next:木:74035:0:0",
      "single-meaning-next:南:23414:0:0",
      "single-meaning-next:绿:113006:0:1",
      "single-meaning-next:萍:123879:0:0",
      "single-meaning-next:情:55118:0:0",
      "single-meaning-next:黛:161987:0:3",
      "single-meaning-next:格:76502:0:4",
      "single-meaning-next:楚:77603:0:2",
      "single-meaning-next:空:107834:0:2",
      "single-meaning-next:普:71655:0:0",
      "single-meaning-next:高:158594:0:0",
      "single-meaning-next:程:107277:0:2",
      "single-meaning-next:境:34131:0:1",
      "single-meaning-next:翠:115840:0:6"
    ],
    "correctedCases": [
      "single-meaning-next:绪:113522:0:2",
      "single-meaning-next:朔:73727:0:0",
      "single-meaning-next:霆:152712:0:1",
      "single-meaning-next:中:6025:0:0",
      "single-meaning-next:黎:161706:0:1",
      "single-meaning-next:彩:51603:0:1"
    ]
  }
});
const expected71Profile=frozen(structuredClone(compiled71Profile)),expected71Admission=frozen(structuredClone(compiled71Admission)),expected71Lock=frozen(structuredClone(compiled71Lock)),expected71Manifest=frozen(structuredClone(compiled71Manifest)),expected71Subset=frozen(structuredClone(compiled71Subset));
const source71=frozen(normalize(expected71Lock.sources[0]));
export interface NamingEditorialV71Data {sources:SourceRecord[];source:SourceRecord;identity:NamingCharacterReview71Identity;lookup:Readonly<NamingCharacterReview71Lookup>;profile:typeof expected71Profile;admission:typeof expected71Admission;subset:typeof expected71Subset;}
const identity71:NamingCharacterReview71Identity=frozen({ruleVersion:NAMING_EDITORIAL_V71_VERSION,profileVersion:'naming-character-meanings-v7.1/1',sourceId:NAMING_EDITORIAL_V71_SOURCE_ID,subsetSha256:NAMING_EDITORIAL_V71_PINS.subset.sha256,profileSha256:NAMING_EDITORIAL_V71_PINS.profile.sha256,admissionSha256:NAMING_EDITORIAL_V71_PINS.admission.sha256,lockSha256:NAMING_EDITORIAL_V71_PINS.lock.sha256,manifestSha256:NAMING_EDITORIAL_V71_PINS.manifest.sha256,sourceSha256:NAMING_EDITORIAL_V71_PINS.sourceAggregateSha256});
/** Canonical compiled expected capsule, matching the old7 snapshot pattern.
 * Generation must obtain this same capsule via the filesystem loader first. */
export const FIXED_NAMING_EDITORIAL_V71_DATA:NamingEditorialV71Data=frozen({sources:[source71],source:source71,identity:identity71,lookup:createNamingCharacterReview71(expected71Profile,expected71Admission,identity71),profile:expected71Profile,admission:expected71Admission,subset:expected71Subset});

function loadLegacyNamingEditorialV71Data(directory:string):NamingEditorialV71Data {
 const pins=NAMING_EDITORIAL_V71_PINS,cache=new Map<string,Buffer>();
 const bytes=(file:string)=>{requireFact(file.startsWith('data/')&&!file.includes(String.fromCharCode(92))&&!file.split('/').some(part=>!part||part==='.'||part==='..'),'7.1来源路径无效');if(!cache.has(file))cache.set(file,readFileSync(join(directory,file.slice(5))));return cache.get(file)!;};
 const parse=(file:string)=>JSON.parse(bytes(file).toString('utf8'));
 for(const row of [pins.subset,pins.profile,pins.admission,pins.lock,pins.manifest])requireFact(digest(bytes(row.file))===row.sha256,'7.1固定出版身份不同：'+row.file);
 const profile=parse(pins.profile.file),admission=parse(pins.admission.file),lock=parse(pins.lock.file),manifest=parse(pins.manifest.file),subset=parse(pins.subset.file);
 for(const value of [profile,admission,lock,manifest,subset])requirePlainData(value);
 requireFact(equal(profile,expected71Profile)&&equal(admission,expected71Admission)&&equal(lock,expected71Lock)&&equal(manifest,expected71Manifest)&&equal(subset,expected71Subset),'7.1编译和磁盘完整出版资料不同');
 requireFact(lock.version===NAMING_EDITORIAL_V71_VERSION&&lock.profileVersion===pins.profileVersion&&lock.hashConvention==='sha256(JSON.stringify(fileHashes)); sorted relative path keys'&&lock.sources.length===1,'7.1规则／profile／来源集合不同');
 const source=lock.sources[0];requireFact(source.id===NAMING_EDITORIAL_V71_SOURCE_ID&&source.files.length===29&&equal(source.files,Object.keys(source.fileHashes).sort())&&new Set(source.files).size===source.files.length,'7.1来源闭包不完整');
 const actual:Record<string,string>={};for(const file of source.files){actual[file]=digest(bytes(file));requireFact(actual[file]===source.fileHashes[file],'7.1依赖原件不同：'+file);}
 requireFact(digest(JSON.stringify(actual))===pins.sourceAggregateSha256&&source.sha256===pins.sourceAggregateSha256,'7.1来源聚合不同');
 requireFact(manifest.schema==='naming-character-meanings-v7.1-publication/1'&&manifest.ruleVersion===NAMING_EDITORIAL_V71_VERSION&&manifest.profileVersion===pins.profileVersion&&manifest.sourceId===NAMING_EDITORIAL_V71_SOURCE_ID&&manifest.files.length===30,'7.1出版清单格式不同');
 const published=[...source.files,pins.lock.file].sort();requireFact(equal(manifest.files.map((row:{file:string})=>row.file),published),'7.1出版依赖集合不同');for(const row of manifest.files){const b=bytes(row.file);requireFact(digest(b)===row.sha256&&b.length===row.bytes,'7.1出版文件字节不同：'+row.file);}
 requireFact(profile.cases.length===40&&equal(profile.cases,subset.cases)&&equal(admission.approvedCaseIds,pins.exactCaseIds)&&admission.testOnly===false&&admission.decision==='approved-character-notes'&&admission.activation===NAMING_EDITORIAL_V71_VERSION&&admission.profileSha256===pins.profile.sha256,'7.1完整40项准入不同');
 return FIXED_NAMING_EDITORIAL_V71_DATA;
}

export function loadNamingEditorialV71Data(directory:string):NamingEditorialV71Data {
 const legacy=loadLegacyNamingEditorialV71Data(directory);return loadM460V71Publication(directory)??legacy;
}
export function namingEditorialV71ForSaved(sourceSha256:string):NamingEditorialV71Data {
 if(sourceSha256===FIXED_NAMING_EDITORIAL_V71_DATA.source.sha256)return FIXED_NAMING_EDITORIAL_V71_DATA;
 const selected=m460PublicationForSaved(sourceSha256);if(!selected)throw new Error('未知或未准入的7.1出版摘要，不能借用当前资料。');return selected;
}
export function isTrustedNamingEditorialV71Data(value:unknown):value is NamingEditorialV71Data{return value===FIXED_NAMING_EDITORIAL_V71_DATA||isM460PublicationData(value);}

export function verifyNamingEditorialV71Provenance(session:NamingSession,sources:SourceRecord[]=[source71]):void {
 const snapshot=property(session,'sourceSnapshot'),all=object(snapshot)?property(snapshot,'sources'):undefined;
 if(all!==undefined)requirePlainData(all);
 const recorded=Array.isArray(all)?all.filter(row=>object(row)&&property(row,'id')===NAMING_EDITORIAL_V71_SOURCE_ID):[];
 const marker=resolveSessionNamingRulesVersion(session);
 if(marker!==NAMING_EDITORIAL_V71_VERSION){requireFact(recorded.length===0,'其他版本不得混入7.1专用来源');return;}
 requireFact(recorded.length===1,'7.1固定来源记录缺失或重复');
 const recordedSha=property(recorded[0],'sha256');requireFact(typeof recordedSha==='string','7.1保存来源摘要无效');
 const selected=namingEditorialV71ForSaved(recordedSha);
 requireFact(sources.length===1&&equal(sources[0],namingEditorialV71ForSaved(sources[0].sha256).source)&&equal(recorded[0],selected.source),'7.1完整固定来源记录或依赖闭包身份不同');
}
