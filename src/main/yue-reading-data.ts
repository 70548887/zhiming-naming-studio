import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {YUE_DICTIONARY_VERSION,YUE_READING_ALIAS_SOURCE_ID,YUE_READING_SOURCE_ID,YUE_READING_VERSION} from '../domain/yue-reading';
import type {SourceRecord,YueDictionaryReading,YueReadingData} from '../shared/types';

export {YUE_READING_SOURCE_ID};
const LOCK_SHA256='e5a593195a4fbc0fcce98b7f11e535aca7754f68f02d8d2ae45715d15a4acf25';
const COMMIT='259f0e48bba840c3a2e0d117539e96937f3d89bc';
const FILES=[
  'data/raw/yue-reading-CC-BY-4.0.txt','data/raw/yue-reading-NOTICE.md','data/raw/yue-reading-README-cmn.md',
  'data/raw/yue-reading-chars.dict.yaml','data/raw/yue-reading-words.dict.yaml','data/yue-reading-table.json',
];
const UNICODE_FILES=['data/raw/CJKRadicals.txt','data/raw/kMandarin.txt','data/raw/kRSUnicode.txt','data/raw/kSimplifiedVariant.txt','data/raw/kTotalStrokes.txt','data/raw/kTraditionalVariant.txt','data/raw/unicode-LICENSE'];
const digest=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>;aggregateConvention?:string};
function glyphAliases(directory:string):Map<string,Set<string>>{
  const result=new Map<string,Set<string>>();
  for(const file of ['kTraditionalVariant.txt','kSimplifiedVariant.txt'])for(const line of readFileSync(join(directory,'raw',file),'utf8').split(/\r?\n/u)){
    const [key,value]=line.split('\t');if(!key||!value)continue;const char=String.fromCodePoint(parseInt(key,16));
    if(!result.has(char))result.set(char,new Set([char]));
    for(const match of value.matchAll(/U\+([0-9A-F]+)/gu))result.get(char)!.add(String.fromCodePoint(parseInt(match[1],16)));
  }
  return result;
}

/** The fixed source, licence, glyph mapping and each selected original dictionary line are checked together. */
export function loadYueReadingData(directory:string):{data:YueReadingData;sources:SourceRecord[]}{
  const rawLock=readFileSync(join(directory,'yue-reading-source-lock.json'));
  if(digest(rawLock)!==LOCK_SHA256)throw new Error('粤语读音来源登记校验失败。');
  const lock=JSON.parse(rawLock.toString('utf8')) as {version:string;sourceVersion:string;hashConvention:string;sources:LockedSource[]};
  if(lock.version!==YUE_READING_VERSION||lock.sourceVersion!==YUE_DICTIONARY_VERSION||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||lock.sources.length!==2)throw new Error('粤语读音来源版本不完整。');
  const source=lock.sources[0],actual:Record<string,string>={};
  if(source.id!==YUE_READING_SOURCE_ID||source.commit!==COMMIT||source.license!=='CC-BY-4.0'||!Array.isArray(source.files)||!isDeepStrictEqual([...source.files].sort(),FILES)||!source.fileHashes||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),FILES))throw new Error('粤语读音原件登记不完整。');
  for(const file of [...source.files].sort()){
    if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('粤语读音原件定位无效。');
    actual[file]=digest(readFileSync(join(directory,file.slice(5))));
    if(actual[file]!==source.fileHashes[file])throw new Error('粤语字词、字形映射、子集或许可校验失败。');
  }
  if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('粤语读音来源汇总校验失败。');
  const unicode=lock.sources[1],unicodeHashes:Record<string,string>={};
  if(unicode.id!==YUE_READING_ALIAS_SOURCE_ID||unicode.commit!=='4fd8eca90b30aa4c72543ccddb4c15d05becdf8d'||unicode.license!=='Unicode-3.0'||unicode.aggregateConvention!=='sha256(original files order: basename + NUL + sha256; newline joined)'||!Array.isArray(unicode.files)||!isDeepStrictEqual([...unicode.files].sort(),UNICODE_FILES)||!unicode.fileHashes||!isDeepStrictEqual(Object.keys(unicode.fileHashes).sort(),UNICODE_FILES))throw new Error('粤语字形来源登记不完整。');
  for(const file of [...unicode.files].sort()){
    unicodeHashes[file]=digest(readFileSync(join(directory,file.slice(5))));
    if(unicodeHashes[file]!==unicode.fileHashes[file])throw new Error('粤语字形映射来源原件校验失败。');
  }
  if(digest(unicode.files.map(file=>`${file.slice(9)}\0${unicodeHashes[file]}`).join('\n'))!==unicode.sha256)throw new Error('粤语字形来源汇总校验失败。');
  const data=JSON.parse(readFileSync(join(directory,'yue-reading-table.json'),'utf8')) as YueReadingData;
  if(data.version!==YUE_READING_VERSION||data.sourceId!==YUE_READING_SOURCE_ID||data.sourceVersion!==YUE_DICTIONARY_VERSION||!Array.isArray(data.readings)||data.readings.length!==1406||!data.aliases||Array.isArray(data.aliases))throw new Error('粤语字词读音子集版本不一致。');
  const originals={
    'jyut6ping3.chars.dict.yaml':readFileSync(join(directory,'raw/yue-reading-chars.dict.yaml'),'utf8').split(/\r?\n/u),
    'jyut6ping3.words.dict.yaml':readFileSync(join(directory,'raw/yue-reading-words.dict.yaml'),'utf8').split(/\r?\n/u),
  };
  for(const lines of Object.values(originals))if(!lines.includes(`version: "${YUE_DICTIONARY_VERSION}"`)||!lines.includes('...'))throw new Error('粤语词典原件版本标记不一致。');
  const ids=new Set<string>();
  for(const row of data.readings){
    if(!(row.sourceFile in originals)||!Number.isInteger(row.sourceLine)||row.sourceLine<1)throw new Error('粤语字词原件行号无效。');
    const [text,reading]=originals[row.sourceFile][row.sourceLine-1]?.split('\t')??[];
    const kind=row.sourceFile==='jyut6ping3.chars.dict.yaml'?'char':'word';
    const expected:YueDictionaryReading={id:`rime-yue:${kind}:${row.sourceLine}`,text,tokens:reading?.split(' ')??[],sourceId:YUE_READING_SOURCE_ID,sourceVersion:YUE_DICTIONARY_VERSION,sourceFile:row.sourceFile,sourceLine:row.sourceLine};
    if(!text||!reading||!isDeepStrictEqual(row,expected)||ids.has(row.id)||!Array.isArray(row.tokens)||row.tokens.length!==[...row.text].length||row.tokens.some(token=>!/^[a-z]+[1-6]$/.test(token))||!/^\p{Script=Han}+$/u.test(row.text)||(kind==='char'&&[...row.text].length!==1)||(kind==='word'&&[...row.text].length<2))throw new Error('粤语字词候选与原件定位不一致。');
    ids.add(row.id);
  }
  const aliases=glyphAliases(directory);
  for(const [char,options]of Object.entries(data.aliases)){
    const expected=[...(aliases.get(char)??new Set([char]))].sort();
    if([...char].length!==1||!/^\p{Script=Han}$/u.test(char)||!isDeepStrictEqual(options,expected))throw new Error('粤语字形候选与固定 Unihan 映射不一致。');
  }
  const{id,name,url,commit,license,files,sha256,note}=source;
  const{fileHashes:_,aggregateConvention:__,...unicodeSource}=unicode;
  return{data:structuredClone(data),sources:[{id,name,url,commit,license,files:[...files],sha256,note},structuredClone(unicodeSource)]};
}

export function loadYueReadingSources(directory:string):SourceRecord[]{return loadYueReadingData(directory).sources;}
