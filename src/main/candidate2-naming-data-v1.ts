import {readFileSync,realpathSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {canonicalPlainJson} from '../shared/plain-json';
import type {CharacterEntry,Citation,SourceRecord} from '../shared/types';
import type {Candidate2NamingDataIdentity} from '../shared/candidate2-naming-consumer-v1';
import {loadNamingEditorialV7Data,loadNamingEditorialV71Data,NAMING_EDITORIAL_V7_PUBLICATION_PINS} from './naming-editorial-v7-data';
import type {NamingEditorialV71Data} from './naming-editorial-v7-data';

const PACK_SHA256='1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b';
const DATASET_SHA256='3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728';
const ACTIVE_VERSION='1875aa49dcfa';
const METADATA_VERSION='2026.10.20.2';
const REVIEW60_SOURCE_SHA256='870846c44faa368c913536467cf62b60cf5a96d43256f796644856dc1ae007a4';
const NAMING_RULES_VERSION='naming-editorial-7.1.0' as const;
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const fail=(message:string):never=>{throw Error('CANDIDATE2_NAMING_DATA_INVALID: '+message);};

interface FixedDataset {
 version:string;
 characters:CharacterEntry[];
 citations:Citation[];
 knowledge:unknown[];
 sources:SourceRecord[];
}
export interface Candidate2NamingData {
 characters:CharacterEntry[];
 citations:Citation[];
 context:{packSha256:string;activeVersion:string};
 review71:NamingEditorialV71Data;
 identity:Candidate2NamingDataIdentity;
}

function freeze<T>(value:T):T {
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const child of Object.values(value))freeze(child);
  Object.freeze(value);
 }
 return value;
}
function ownedJson<T>(value:T):T {
 return freeze(JSON.parse(canonicalPlainJson(value)) as T);
}
function readPhysical(directory:string,name:string):Buffer {
 const actual=realpathSync(path.join(directory,name)),relative=path.relative(directory,actual);
 if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative)||!statSync(actual).isFile())return fail('fixed data file escaped its directory: '+name);
 return readFileSync(actual);
}

/** A physical fixed-pack loader only. Caller records and claimed hashes never
 * supply data authority; every call rereads both originals and source closures.
 * These exact SQLite and JSON publications encode the same four ordered tables.
 */
export function loadCandidate2NamingData(dataDir:string,namingRulesVersion:'naming-editorial-7.1.0'):Candidate2NamingData {
 if(arguments.length!==2||typeof dataDir!=='string'||!dataDir.trim()||namingRulesVersion!==NAMING_RULES_VERSION)return fail('one data directory and explicit naming-editorial-7.1.0 are required');
 const directory=realpathSync(path.resolve(dataDir));
 if(!statSync(directory).isDirectory())return fail('data directory is not a physical directory');
 const physicalSql=readPhysical(directory,'knowledge-v6.sqlite'),datasetBytes=readPhysical(directory,'dataset-v6.json');
 const packSha256=sha(physicalSql),datasetSha256=sha(datasetBytes);
 if(packSha256!==PACK_SHA256||datasetSha256!==DATASET_SHA256||packSha256.slice(0,12)!==ACTIVE_VERSION)return fail('custom or changed SQLite/JSON package is not admitted');

 const naming7=loadNamingEditorialV7Data(directory);
 const tableBytes=readPhysical(directory,'naming-editorial-v7.json');
 if(sha(tableBytes)!==NAMING_EDITORIAL_V7_PUBLICATION_PINS.tableSha256)return fail('naming7 table changed after source verification');
 const table=JSON.parse(tableBytes.toString('utf8')) as {base?:Record<string,unknown>};
 const base=table.base;
 if(!base||base.knowledgePackFile!=='data/knowledge-v6.sqlite'||base.datasetJsonFile!=='data/dataset-v6.json'||base.knowledgePackSha256!==packSha256||base.datasetJsonSha256!==datasetSha256||base.activeVersion!==ACTIVE_VERSION||base.datasetMetadataVersion!==METADATA_VERSION)return fail('naming7 base pins do not identify the admitted physical package');

 const dataset=ownedJson(JSON.parse(datasetBytes.toString('utf8')) as FixedDataset);
 if(dataset.version!==METADATA_VERSION||!Array.isArray(dataset.characters)||dataset.characters.length!==779||!Array.isArray(dataset.citations)||dataset.citations.length!==1833||!Array.isArray(dataset.knowledge)||dataset.knowledge.length!==433||!Array.isArray(dataset.sources)||dataset.sources.length!==6)return fail('fixed dataset metadata or four-table membership differs');
 const review71=loadNamingEditorialV71Data(directory);
 if(review71.identity.ruleVersion!==NAMING_RULES_VERSION||review71.identity.sourceSha256!==REVIEW60_SOURCE_SHA256||review71.source.sha256!==REVIEW60_SOURCE_SHA256||review71.profile.cases.length!==60)return fail('current fixed 60-character review publication is required');

 const semanticSha256=sha(canonicalPlainJson({characters:dataset.characters,citations:dataset.citations,knowledge:dataset.knowledge,sources:dataset.sources}));
 const sources=ownedJson([...dataset.sources,...naming7.sources,...review71.sources]);
 if(new Set(sources.map(source=>source.id)).size!==sources.length)return fail('fixed package and review source records contain duplicate IDs');
 const identity:Candidate2NamingDataIdentity=ownedJson({
  schema:'candidate2-naming-data/1',packSha256,packBytes:physicalSql.length,datasetSha256,
  activeVersion:ACTIVE_VERSION,metadataVersion:dataset.version,namingRulesVersion,
  semanticSha256,reviewIdentity:structuredClone(review71.identity),sources,
 });
 return Object.freeze({characters:dataset.characters,citations:dataset.citations,context:ownedJson({packSha256,activeVersion:ACTIVE_VERSION}),review71,identity});
}
