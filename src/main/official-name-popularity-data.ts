import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonicalPlainJson} from '../shared/plain-json';
import {assertOfficialNamePopularityCatalog,OFFICIAL_NAME_POPULARITY_DATA_VERSION,OFFICIAL_NAME_POPULARITY_SOURCE_ID,type OfficialNamePopularityCatalog} from '../shared/official-name-popularity';
import type {SourceRecord} from '../shared/types';

const LOCK_SHA256='42c2b7169edfe0ae1557068196488139d3bca48d4cde147d6eb1caf43f5680db';
const FILE_HASHES={
  'data/official-name-popularity-NOTICE.md':'b8ece54fed1c3b15ddf25a695449b9cd87cc3301940b5e97f0455961f5220a20',
  'data/official-name-popularity.json':'39f58bf3aa92864f902b3e0a7719ef771184afffed44e6ed151959363c76c80c'
};
const digest=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
function requireFact(condition:unknown,message:string):asserts condition{if(!condition)throw new Error('官方历史姓名统计资料校验失败：'+message);}
function frozen<T>(value:T):T{if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}

/** Independent facts publication. Mutable knowledge packs never supply or replace this catalog. */
export function loadOfficialNamePopularityData(directory:string):{catalog:OfficialNamePopularityCatalog;sources:SourceRecord[]}{
  const bytes=readFileSync(join(directory,'official-name-popularity-source-lock.json'));
  requireFact(digest(bytes)===LOCK_SHA256,'来源锁摘要不一致');
  const lock=JSON.parse(bytes.toString('utf8'));canonicalPlainJson(lock);
  requireFact(lock.version===OFFICIAL_NAME_POPULARITY_DATA_VERSION&&lock.hashConvention==='sha256(JSON.stringify(fileHashes)); sorted relative path keys'&&Array.isArray(lock.sources)&&lock.sources.length===1,'来源版本或数量不一致');
  const source=lock.sources[0],files=Object.keys(FILE_HASHES);
  requireFact(source.id===OFFICIAL_NAME_POPULARITY_SOURCE_ID&&isDeepStrictEqual(source.files,files)&&isDeepStrictEqual(source.fileHashes,FILE_HASHES),'来源身份或最小事实清单不一致');
  for(const file of files){const original=readFileSync(join(directory,file.slice(5)));requireFact(digest(original)===FILE_HASHES[file as keyof typeof FILE_HASHES],'固定事实或NOTICE被改变：'+file);}
  requireFact(digest(JSON.stringify(source.fileHashes))===source.sha256,'来源汇总摘要不一致');
  const dataBytes=readFileSync(join(directory,'official-name-popularity.json')),text=dataBytes.toString('utf8');requireFact(Buffer.from(text,'utf8').equals(dataBytes),'事实数据不是无损UTF8');
  const data=JSON.parse(text);canonicalPlainJson(data);const {fileHashes:_,...record}=source;
  const catalog={...data,source:record};assertOfficialNamePopularityCatalog(catalog);
  return frozen({catalog,sources:[record]});
}
export function loadOfficialNamePopularitySources(directory:string):SourceRecord[]{return structuredClone(loadOfficialNamePopularityData(directory).sources);}
