import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {YUE_HOMOPHONE_RIME_SOURCE_ID,YUE_HOMOPHONE_SOURCE_IDS,YUE_HOMOPHONE_VERSION,YUE_HOMOPHONE_WIKI_SOURCE_ID} from '../domain/yue-homophones';
import {canonicalPlainJson} from '../shared/plain-json';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';
import type {YueHomophoneCandidateAddon,YueHomophoneData} from '../shared/yue-homophone-types';

export {YUE_HOMOPHONE_SOURCE_IDS};
const LOCK_SHA256='6deabda4ca04b476d649a0ec28e226cb4bbde78dd8119e56aeb125ccbefda77c';
const WIKI_SHA='3c9fa2e012e6c257b7a0789b581cadc3f19fd8316118dc48235b1eb4ccbd2d10';
const RIME_COMMIT='259f0e48bba840c3a2e0d117539e96937f3d89bc';
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
const expectedFiles:Record<string,string[]>={
 [YUE_HOMOPHONE_WIKI_SOURCE_ID]:['data/raw/yue-homophone-CC-BY-SA-4.0.txt','data/raw/yue-homophone-wiktionary-NOTICE.md','data/raw/yue-homophone-wiktionary-excerpts.json','data/yue-homophone-rules.json'],
 [YUE_HOMOPHONE_RIME_SOURCE_ID]:['data/raw/yue-homophone-CC-BY-4.0.txt','data/raw/yue-homophone-rime-NOTICE.md','data/raw/yue-homophone-rime-README-cmn.md','data/raw/yue-homophone-rime-excerpts.json'],
};
interface WikiRecord {line:number;sha256:string;rawJson:string;}
interface RimeRecord {line:number;sha256:string;rawLine:string;}

/** Independently locked senses and word-pronunciation excerpts; old reading-source identity is untouched. */
export function loadYueHomophoneData(directory:string):{data:YueHomophoneData;sources:SourceRecord[]}{
 const lockBytes=readFileSync(join(directory,'yue-homophone-source-lock.json'));
 if(digest(lockBytes)!==LOCK_SHA256)throw new Error('粤语词汇复核来源登记校验失败。');
 const lock=JSON.parse(lockBytes.toString('utf8')) as {version:string;hashConvention:string;sources:LockedSource[]};
 canonicalPlainJson(lock);
 if(lock.version!==YUE_HOMOPHONE_VERSION||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||!isDeepStrictEqual(lock.sources.map(source=>source.id),[...YUE_HOMOPHONE_SOURCE_IDS]))throw new Error('粤语词汇复核版本或来源不完整。');
 for(const source of lock.sources){
  const files=expectedFiles[source.id],hashes:Record<string,string>={};
  if(!files||!isDeepStrictEqual([...source.files].sort(),files)||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),files))throw new Error('粤语词汇复核原件清单无效。');
  if(source.license!==(source.id===YUE_HOMOPHONE_WIKI_SOURCE_ID?'CC-BY-SA-4.0':'CC-BY-4.0')||source.commit!==(source.id===YUE_HOMOPHONE_WIKI_SOURCE_ID?'snapshot-sha256:'+WIKI_SHA:RIME_COMMIT))throw new Error('粤语词汇复核许可或版本身份不一致。');
  for(const file of files){hashes[file]=digest(readFileSync(join(directory,file.slice(5))));if(hashes[file]!==source.fileHashes[file])throw new Error('粤语词汇、原义、许可或规则原件校验失败。');}
  if(digest(JSON.stringify(hashes))!==source.sha256)throw new Error('粤语词汇复核来源汇总校验失败。');
 }
 const data=JSON.parse(readFileSync(join(directory,'yue-homophone-rules.json'),'utf8')) as YueHomophoneData;
 const wiki=JSON.parse(readFileSync(join(directory,'raw/yue-homophone-wiktionary-excerpts.json'),'utf8')) as {version:string;sourceId:string;originalCompressedSha256:string;records:WikiRecord[]};
 const rime=JSON.parse(readFileSync(join(directory,'raw/yue-homophone-rime-excerpts.json'),'utf8')) as {version:string;sourceId:string;commit:string;sourceVersion:string;originalSha256:string;records:RimeRecord[]};
 canonicalPlainJson(data);canonicalPlainJson(wiki);canonicalPlainJson(rime);
 if(data.version!==YUE_HOMOPHONE_VERSION||!isDeepStrictEqual(data.sourceIds,[...YUE_HOMOPHONE_SOURCE_IDS])||data.rules.length!==12||wiki.version!==data.version||wiki.sourceId!==YUE_HOMOPHONE_WIKI_SOURCE_ID||wiki.originalCompressedSha256!==WIKI_SHA||wiki.records.length!==12||rime.version!==data.version||rime.sourceId!==YUE_HOMOPHONE_RIME_SOURCE_ID||rime.commit!==RIME_COMMIT||rime.sourceVersion!=='2026.08.10'||rime.originalSha256!=='54d174ad2bb997e4a678b7b076b84e4dc5914481b32467cdea3b43e88b7d5474'||rime.records.length!==12)throw new Error('粤语词汇节录与固定原件身份不符。');
 for(const record of wiki.records)if(!Number.isInteger(record.line)||record.line<1||digest(record.rawJson)!==record.sha256)throw new Error('粤语词义原记录校验失败。');
 for(const record of rime.records)if(!Number.isInteger(record.line)||record.line<1||digest(record.rawLine)!==record.sha256)throw new Error('粤语词音原行校验失败。');
 const ids=new Set<string>();
 for(const rule of data.rules){
  if(ids.has(rule.id)||rule.sourceRefs.length!==2||!isDeepStrictEqual(rule.sourceRefs.map(ref=>ref.id),[...YUE_HOMOPHONE_SOURCE_IDS])||!/^\p{Script=Han}{2,3}$/u.test(rule.term)||rule.tokens.length!==[...rule.term].length||rule.tokens.some(token=>!/^[a-z]+[1-6]$/.test(token)))throw new Error('粤语词汇规则标识或音节不完整。');ids.add(rule.id);
  const wikiRef=rule.sourceRefs[0],rimeRef=rule.sourceRefs[1],entry=wiki.records.find(row=>row.line===wikiRef.line),word=rime.records.find(row=>row.line===rimeRef.line);
  if(!entry||!word)throw new Error('粤语词汇原记录定位缺失。');
  const original=JSON.parse(entry.rawJson) as {word:string;lang_code:string;pos:string;sounds:{zh_pron?:string;tags?:string[]}[];senses:{glosses?:string[];tags?:string[]}[]};
  const soundIndex=Number(wikiRef.locator.match(/;sounds:(\d+)$/)?.[1]),sound=original.sounds[soundIndex];
  const normalized=sound?.zh_pron?.normalize('NFKC');
  if(original.word!==rule.term||original.lang_code!=='zh'||!sound?.tags?.includes('Cantonese')||!sound.tags.includes('Jyutping')||normalized!==rule.tokens.join(' ')||rule.glosses.some(gloss=>!isDeepStrictEqual(gloss.quotes,original.senses[gloss.senseIndex]?.glosses??[])||!isDeepStrictEqual(gloss.tags,original.senses[gloss.senseIndex]?.tags??[])))throw new Error('粤语词汇所选义项或音值与原文不符。');
  if(!isDeepStrictEqual(rule.register,[...new Set(rule.glosses.flatMap(gloss=>gloss.tags))])||rimeRef.quote!==word.rawLine||word.rawLine!==rule.term+'\t'+rule.tokens.join(' ')||wikiRef.quote!==rule.glosses.flatMap(gloss=>gloss.quotes).join('；')||wikiRef.word!==rule.term||rimeRef.word!==rule.term)throw new Error('粤语词汇引用、语域或词音原行不符。');
 }
 if(!isDeepStrictEqual(data.sourceReferences,data.rules.flatMap(rule=>rule.sourceRefs)))throw new Error('粤语词汇完整参考清单不一致。');
 return{data:structuredClone(data),sources:lock.sources.map(({fileHashes:_,...source})=>structuredClone(source))};
}
export function loadYueHomophoneSources(directory:string):SourceRecord[]{return loadYueHomophoneData(directory).sources;}

/** Source gating only; main persistence separately validates every result with its fixed rules and confirmed readings. */
export function verifyYueHomophoneProvenance(session:NamingSession,sources:SourceRecord[]):void{
 canonicalPlainJson(sources);
 const preferences=session.preferences as NamingSession['preferences']&{yueHomophones?:'none'|'strict'|'ignore-tone'};
 const mode=preferences.yueHomophones??'none',candidates=session.candidates as Array<NamingSession['candidates'][number]&YueHomophoneCandidateAddon>;
 const recorded=session.sourceSnapshot?.sources??[],special=recorded.filter(source=>(YUE_HOMOPHONE_SOURCE_IDS as readonly string[]).includes(source.id));
 if(mode==='none'){if(candidates.some(candidate=>candidate.yueHomophones!==undefined)||special.length)throw new Error('未启用粤语词汇复核的方案不得附加结果或专用来源。');return;}
 if(!['strict','ignore-tone'].includes(mode)||preferences.yueReading!==true||candidates.some(candidate=>!candidate.yueReading||!candidate.yueHomophones||candidate.yueHomophones.mode!==mode)||!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('粤语词汇复核须启用读音并完整保存每个候选与来源。');
 for(const id of YUE_HOMOPHONE_SOURCE_IDS){const expected=sources.filter(source=>source.id===id),actual=special.filter(source=>source.id===id);if(expected.length!==1||actual.length!==1||!isDeepStrictEqual(expected[0],actual[0]))throw new Error('粤语词汇复核的生成时来源与固定版本不一致。');}
}
