import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {nameImageryProfile,NAME_IMAGERY_VERSION,NAME_IMAGERY_PROJECT_SOURCE_ID,NAME_IMAGERY_ARC_SOURCE_ID} from '../domain/name-imagery';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NameImageryProfile,NamingSession,SourceRecord} from '../shared/types';

export const NAME_IMAGERY_SOURCE_IDS=[NAME_IMAGERY_PROJECT_SOURCE_ID,NAME_IMAGERY_ARC_SOURCE_ID] as const;
const LOCK_SHA='d1c074aea2fe08ee0542ff06eecfddbd1a5638c1e8ac142e41196c58b772ec65';
const ARC_ORIGINAL_SHA='7dc6e2470862c5bf418020ac3aeb771936abb7e47549b426892578656ad86592';
const hash=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
/** Independent project projection and Arc palace-table publications; neither is a traditional name-reading method. */
export function loadNameImageryData(directory:string):{profile:NameImageryProfile;sources:SourceRecord[]} {
  const bytes=readFileSync(join(directory,'name-imagery-source-lock.json'));
  if(hash(bytes)!==LOCK_SHA)throw new Error('文化意象实验来源登记校验失败。');
  const lock=JSON.parse(bytes.toString('utf8')) as {version:string;hashConvention:string;sources:LockedSource[]};
  if(lock.version!==NAME_IMAGERY_VERSION||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||lock.sources.length!==2||new Set(lock.sources.map(source=>source.id)).size!==2||NAME_IMAGERY_SOURCE_IDS.some(id=>!lock.sources.some(source=>source.id===id)))throw new Error('文化意象实验来源版本不完整。');
  for(const source of lock.sources){
    if(!Array.isArray(source.files)||source.files.length!==2||new Set(source.files).size!==source.files.length||!source.fileHashes||Object.keys(source.fileHashes).length!==source.files.length)throw new Error('文化意象实验原件登记不完整。');
    const hashes:Record<string,string>={};
    for(const file of [...source.files].sort()){
      if(!file.startsWith('data/')||file.split('/').some(part=>part==='.'||part==='..')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('文化意象实验原件定位无效。');
      hashes[file]=hash(readFileSync(join(directory,file.slice(5))));if(hashes[file]!==source.fileHashes[file])throw new Error('文化意象实验映射、节录或许可校验失败。');
    }
    if(hash(JSON.stringify(hashes))!==source.sha256)throw new Error('文化意象实验来源汇总校验失败。');
  }
  const profile=JSON.parse(readFileSync(join(directory,'name-imagery-profile.json'),'utf8')) as NameImageryProfile;
  if(!isDeepStrictEqual(profile,nameImageryProfile())||!isDeepStrictEqual(profile.elementPalaces,{木:[3,4],火:[9],土:[2,8],金:[6,7],水:[1]}))throw new Error('文化意象集合投影与固定版本不一致。');
  const original=readFileSync(join(directory,'raw/qimen-patterns-arc-constants.js'));
  if(hash(original)!==ARC_ORIGINAL_SHA)throw new Error('文化意象宫元素的原Arc固定原件不一致。');
  const excerpts=JSON.parse(readFileSync(join(directory,'raw/name-imagery-arc-palace-excerpts.json'),'utf8')) as {source:{sha256:string;commit:string};excerpts:{quote:string;locator:string}[]};
  const lines=original.toString('utf8').split(/\r?\n/);
  if(excerpts.source.sha256!==ARC_ORIGINAL_SHA||excerpts.source.commit!=='7d941031d685d818d9fd234edf891dba5bd6a323'||excerpts.excerpts.length!==2||excerpts.excerpts.some(excerpt=>{const match=/L(\d+)–L(\d+)$/.exec(excerpt.locator);return!match||lines.slice(Number(match[1])-1,Number(match[2])).join('\n')!==excerpt.quote;}))throw new Error('文化意象宫元素节录与原件行号不一致。');
  const license=readFileSync(join(directory,'raw/name-imagery-arc-LICENSE.txt'),'utf8');
  if(!license.includes('Copyright (c) 2026 Arc.')||!license.includes('Permission is hereby granted, free of charge')||!license.includes('THE SOFTWARE IS PROVIDED "AS IS"'))throw new Error('文化意象Arc宫表缺少完整MIT许可。');
  return {profile:structuredClone(profile),sources:lock.sources.map(({id,name,url,commit,license,files,sha256,note})=>({id,name,url,commit,license,files:[...files],sha256,note}))};
}
export function loadNameImagerySources(directory:string):SourceRecord[]{return loadNameImageryData(directory).sources;}
/** New publications are required only for explicitly selected experimental results; old rows are never backfilled. */
export function verifyNameImageryProvenance(session:NamingSession,sources:SourceRecord[]):void {
  const selected=session.preferences.imageryReading===true,hasReading=session.candidates.some(candidate=>candidate.imageReading!==undefined);
  const recorded=session.sourceSnapshot?.sources.filter(source=>NAME_IMAGERY_SOURCE_IDS.includes(source.id as typeof NAME_IMAGERY_SOURCE_IDS[number]))??[];
  if(!selected){if(hasReading||recorded.length)throw new Error('文化意象实验结果或来源不得嫁接未启用方案。');return;}
  if(session.candidates.some(candidate=>candidate.imageReading?.version!==NAME_IMAGERY_VERSION))throw new Error('文化意象实验已启用，候选必须保留同版结果。');
  if(!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('文化意象实验缺少完整生成时来源清单。');
  if(sources.length!==2||recorded.length!==2||NAME_IMAGERY_SOURCE_IDS.some(id=>sources.filter(source=>source.id===id).length!==1||recorded.filter(source=>source.id===id).length!==1||!isDeepStrictEqual(sources.find(source=>source.id===id),recorded.find(source=>source.id===id))))throw new Error('文化意象实验生成时来源与固定映射版本不一致。');
}
