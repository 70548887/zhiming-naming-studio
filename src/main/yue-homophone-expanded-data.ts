import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {canonicalPlainJson} from '../shared/plain-json';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';
import type {YueHomophoneCandidateAddon,YueHomophoneData,YueHomophoneSourceReference} from '../shared/yue-homophone-types';

export const YUE_HOMOPHONE_EXPANDED_VERSION='yue-homophone-review/1.1.0' as const;
export const YUE_HOMOPHONE_EXPANDED_SOURCE_IDS=['yue-homophones-wiktionary-extended-fixed','yue-homophones-rime-extended-fixed'] as const;
const [WIKI_ID,RIME_ID]=YUE_HOMOPHONE_EXPANDED_SOURCE_IDS;
const LOCK_SHA256='1cfe317145772e4df393f54039c99cb831ced1f8c89eba00340a4db098a47349';
const WIKI_SHA='3c9fa2e012e6c257b7a0789b581cadc3f19fd8316118dc48235b1eb4ccbd2d10';
const RIME_COMMIT='259f0e48bba840c3a2e0d117539e96937f3d89bc';
const RIME_SHA='54d174ad2bb997e4a678b7b076b84e4dc5914481b32467cdea3b43e88b7d5474';
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
type WikiRecord={line:number;sha256:string;rawJson:string};
type RimeRecord={line:number;sha256:string;rawLine:string};
type ExpandedReference=YueHomophoneSourceReference&{recordSha256?:string;rowSha256?:string};
const expectedFiles:Record<string,string[]>={
 [WIKI_ID]:['data/raw/yue-homophone-CC-BY-SA-4.0.txt','data/raw/yue-homophone-wiktionary-NOTICE-v1-1.md','data/raw/yue-homophone-wiktionary-excerpts-v1-1.json','data/yue-homophone-rules-v1-1.json'],
 [RIME_ID]:['data/raw/yue-homophone-CC-BY-4.0.txt','data/raw/yue-homophone-rime-NOTICE-v1-1.md','data/raw/yue-homophone-rime-README-cmn.md','data/raw/yue-homophone-rime-excerpts-v1-1.json'],
};
function uniqueRows(records:Array<WikiRecord|RimeRecord>,expected:number):boolean{
 return Array.isArray(records)&&records.length===expected&&new Set(records.map(record=>record.line)).size===expected&&records.every(record=>Number.isInteger(record.line)&&record.line>0&&/^[a-f0-9]{64}$/.test(record.sha256));
}

/** Independent 1.1 source package; the original twelve-term data and its loader remain frozen. */
export function loadYueHomophoneExpandedData(directory:string):{data:YueHomophoneData;sources:SourceRecord[]}{
 const lockBytes=readFileSync(join(directory,'yue-homophone-expanded-source-lock.json'));
 if(digest(lockBytes)!==LOCK_SHA256)throw new Error('粤语词汇1.1来源登记校验失败。');
 const lock=JSON.parse(lockBytes.toString('utf8')) as {version:string;hashConvention:string;sources:LockedSource[]};
 canonicalPlainJson(lock);
 if(lock.version!==YUE_HOMOPHONE_EXPANDED_VERSION||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||!isDeepStrictEqual(lock.sources.map(source=>source.id),[...YUE_HOMOPHONE_EXPANDED_SOURCE_IDS]))throw new Error('粤语词汇1.1版本或来源不完整。');
 for(const source of lock.sources){
  const files=expectedFiles[source.id],hashes:Record<string,string>={};
  if(!files||!isDeepStrictEqual([...source.files].sort(),files)||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),files))throw new Error('粤语词汇1.1原件清单无效。');
  if(source.license!==(source.id===WIKI_ID?'CC-BY-SA-4.0':'CC-BY-4.0')||source.commit!==(source.id===WIKI_ID?'snapshot-sha256:'+WIKI_SHA:RIME_COMMIT))throw new Error('粤语词汇1.1许可或固定版本身份不一致。');
  for(const file of files){hashes[file]=digest(readFileSync(join(directory,file.slice(5))));if(hashes[file]!==source.fileHashes[file])throw new Error('粤语词汇1.1原义、音值、许可或规则原件校验失败。');}
  if(digest(JSON.stringify(hashes))!==source.sha256)throw new Error('粤语词汇1.1来源汇总校验失败。');
 }
 const data=JSON.parse(readFileSync(join(directory,'yue-homophone-rules-v1-1.json'),'utf8')) as YueHomophoneData;
 const wiki=JSON.parse(readFileSync(join(directory,'raw/yue-homophone-wiktionary-excerpts-v1-1.json'),'utf8')) as {version:string;sourceId:string;license:string;originalCompressedSha256:string;records:WikiRecord[]};
 const rime=JSON.parse(readFileSync(join(directory,'raw/yue-homophone-rime-excerpts-v1-1.json'),'utf8')) as {version:string;sourceId:string;license:string;commit:string;sourceVersion:string;originalFile:string;originalSha256:string;records:RimeRecord[]};
 canonicalPlainJson(data);canonicalPlainJson(wiki);canonicalPlainJson(rime);
 if(data.version!==YUE_HOMOPHONE_EXPANDED_VERSION||!isDeepStrictEqual(data.sourceIds,[...YUE_HOMOPHONE_EXPANDED_SOURCE_IDS])||data.rules.length!==29||new Set(data.rules.map(rule=>rule.term)).size!==28||wiki.version!==data.version||wiki.sourceId!==WIKI_ID||wiki.license!=='CC-BY-SA-4.0'||wiki.originalCompressedSha256!==WIKI_SHA||!uniqueRows(wiki.records,28)||rime.version!==data.version||rime.sourceId!==RIME_ID||rime.license!=='CC-BY-4.0'||rime.commit!==RIME_COMMIT||rime.sourceVersion!=='2026.08.10'||rime.originalFile!=='jyut6ping3.words.dict.yaml'||rime.originalSha256!==RIME_SHA||!uniqueRows(rime.records,29))throw new Error('粤语词汇1.1节录与固定原件身份或28词29音不符。');
 for(const record of wiki.records)if(digest(record.rawJson)!==record.sha256)throw new Error('粤语词汇1.1原记录校验失败。');
 for(const record of rime.records)if(digest(record.rawLine)!==record.sha256)throw new Error('粤语词汇1.1原音行校验失败。');
 const ids=new Set<string>(),termSounds=new Set<string>(),usedWiki=new Set<number>(),usedRime=new Set<number>();
 for(const rule of data.rules){
  const pair=rule.term+'|'+rule.tokens.join(' ');
  if(ids.has(rule.id)||termSounds.has(pair)||!rule.id.startsWith('yue-review-')||rule.sourceRefs.length!==2||!isDeepStrictEqual(rule.sourceRefs.map(ref=>ref.id),[...YUE_HOMOPHONE_EXPANDED_SOURCE_IDS])||!/^\p{Script=Han}{2,3}$/u.test(rule.term)||rule.tokens.length!==[...rule.term].length||rule.tokens.some(token=>!/^[a-z]+[1-6]$/.test(token))||!isDeepStrictEqual(rule.scopes,['whole-full-name','whole-given-name','cross-surname-given'])||!rule.notice.trim()||!rule.glosses.length)throw new Error('粤语词汇1.1规则标识、范围或音节不完整。');
  ids.add(rule.id);termSounds.add(pair);
  const [wikiRef,rimeRef]=rule.sourceRefs as ExpandedReference[],entry=wiki.records.find(row=>row.line===wikiRef.line),word=rime.records.find(row=>row.line===rimeRef.line);
  if(!entry||!word)throw new Error('粤语词汇1.1原记录定位缺失。');usedWiki.add(entry.line);usedRime.add(word.line);
  const original=JSON.parse(entry.rawJson) as {word:string;lang_code:string;sounds:{zh_pron?:string;tags?:string[]}[];senses:{glosses?:string[];tags?:string[];raw_tags?:string[]}[]};
  const locator=wikiRef.locator.match(/^JSONL:(\d+);senses:(\d+(?:,\d+)*);sounds:(\d+)$/),soundIndex=locator?Number(locator[3]):-1,sound=original.sounds[soundIndex];
  const senses=locator?locator[2].split(',').map(Number):[];
  if(!locator||Number(locator[1])!==entry.line||original.word!==rule.term||original.lang_code!=='zh'||!sound?.tags?.includes('Cantonese')||!sound.tags.includes('Jyutping')||sound.zh_pron?.normalize('NFKC')!==rule.tokens.join(' ')||!isDeepStrictEqual(rule.glosses.map(gloss=>gloss.senseIndex),senses)||new Set(senses).size!==senses.length||rule.glosses.some(gloss=>!original.senses[gloss.senseIndex]||!isDeepStrictEqual(gloss.quotes,original.senses[gloss.senseIndex].glosses??[])||!isDeepStrictEqual(gloss.tags,original.senses[gloss.senseIndex].tags??[])||!isDeepStrictEqual(gloss.rawTags,original.senses[gloss.senseIndex].raw_tags??[])))throw new Error('粤语词汇1.1所选义项、标准及原始语域或音值与原文不符。');
  if(!isDeepStrictEqual(rule.register,[...new Set(rule.glosses.flatMap(gloss=>[...gloss.tags,...(gloss.rawTags??[])]))])||wikiRef.recordSha256!==entry.sha256||rimeRef.rowSha256!==word.sha256||wikiRef.version!=='snapshot-sha256:'+WIKI_SHA||rimeRef.version!==RIME_COMMIT||wikiRef.file!=='zhwiktionary-Chinese.jsonl.gz'||rimeRef.file!=='jyut6ping3.words.dict.yaml'||wikiRef.license!=='CC-BY-SA-4.0'||rimeRef.license!=='CC-BY-4.0'||rimeRef.locator!==`jyut6ping3.words.dict.yaml:${word.line}`||rimeRef.quote!==word.rawLine||word.rawLine!==rule.term+'\t'+rule.tokens.join(' ')||wikiRef.quote!==rule.glosses.flatMap(gloss=>gloss.quotes).join('；')||wikiRef.word!==rule.term||rimeRef.word!==rule.term||wikiRef.url!=='https://zh.wiktionary.org/wiki/'+encodeURIComponent(rule.term)||rimeRef.url!==`https://github.com/rime/rime-cantonese/blob/${RIME_COMMIT}/jyut6ping3.words.dict.yaml#L${word.line}`)throw new Error('粤语词汇1.1引用、逐行SHA、语域或原音行不符。');
 }
 if(usedWiki.size!==28||usedRime.size!==29||!isDeepStrictEqual(data.sourceReferences,data.rules.flatMap(rule=>rule.sourceRefs)))throw new Error('粤语词汇1.1完整参考清单不一致。');
 return{data:structuredClone(data),sources:lock.sources.map(({fileHashes:_,...source})=>structuredClone(source))};
}
export function loadYueHomophoneExpandedSources(directory:string):SourceRecord[]{return loadYueHomophoneExpandedData(directory).sources;}

/** Version-specific source gating. The routing/persistence layer also re-evaluates each exact saved result. */
export function verifyYueHomophoneExpandedProvenance(session:NamingSession,sources:SourceRecord[]):void{
 canonicalPlainJson(sources);
 const mode=session.preferences.yueHomophones??'none',candidates=session.candidates as Array<NamingSession['candidates'][number]&YueHomophoneCandidateAddon>;
 const recorded=session.sourceSnapshot?.sources??[],special=recorded.filter(source=>(YUE_HOMOPHONE_EXPANDED_SOURCE_IDS as readonly string[]).includes(source.id));
 if(mode==='none'){if(candidates.some(candidate=>candidate.yueHomophones!==undefined)||special.length)throw new Error('未启用粤语词汇1.1的方案不得附加结果或专用来源。');return;}
 if(!['strict','ignore-tone'].includes(mode)||session.preferences.yueReading!==true||candidates.some(candidate=>!candidate.yueReading||!candidate.yueHomophones||candidate.yueHomophones.version!==YUE_HOMOPHONE_EXPANDED_VERSION||candidate.yueHomophones.mode!==mode)||!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('粤语词汇1.1须启用读音并完整保存每个候选与来源。');
 for(const id of YUE_HOMOPHONE_EXPANDED_SOURCE_IDS){const expected=sources.filter(source=>source.id===id),actual=special.filter(source=>source.id===id);if(expected.length!==1||actual.length!==1||!isDeepStrictEqual(expected[0],actual[0]))throw new Error('粤语词汇1.1的生成时来源与固定版本不一致。');}
}
