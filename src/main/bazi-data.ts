import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { NamingSession, SourceRecord } from '../shared/types';
import { validSessionSourceSnapshot } from '../shared/session-sources';

export const BAZI_SOURCE_PROFILE_VERSION='bazi-evidence-profile/1.0.0';
const MANIFEST_SHA256='4c0a03716599878e4d1fcc3f6f3f207c2a469cdcc041955fe3c31cae24b68b50';
const REQUIRED_IDS=['bazi-evidence-lunar186','bazi-evidence-go-ganzhi','bazi-evidence-project-heuristic'];
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');

interface LockedSource extends SourceRecord { fileHashes:Record<string,string>; }

/** The installed app verifies the exact manifest, original source files and license notices before publishing them. */
export function loadBaziSources(dataDirectory:string):SourceRecord[] {
  const bytes=readFileSync(join(dataDirectory,'bazi-evidence-source-lock.json'));
  if(sha(bytes)!==MANIFEST_SHA256) throw new Error('八字证据来源登记校验失败，请恢复原始规则资料。');
  const lock=JSON.parse(bytes.toString('utf8')) as {version:string;sources:LockedSource[]};
  if(lock.version!==BAZI_SOURCE_PROFILE_VERSION || !Array.isArray(lock.sources) || lock.sources.length!==REQUIRED_IDS.length
    || REQUIRED_IDS.some(id=>!lock.sources.some(source=>source.id===id))) throw new Error('八字证据资料版本或来源登记不完整。');
  for(const source of lock.sources){
    if(!source.fileHashes || Object.keys(source.fileHashes).length!==source.files.length
      || source.files.some(file=>!file.startsWith('data/') || file.split('/').some(part=>part==='..' || part==='.') || !/^[a-f0-9]{64}$/.test(source.fileHashes[file] ?? '')))
      throw new Error('八字证据原件定位或校验记录无效。');
    const actual:Record<string,string>={};
    for(const file of [...source.files].sort()){
      const raw=readFileSync(join(dataDirectory,file.slice('data/'.length)));
      actual[file]=sha(raw);
      if(actual[file]!==source.fileHashes[file]) throw new Error('八字证据原件或许可校验失败，请恢复原始规则资料。');
      if(/LICENSE|NOTICE/.test(file)){
        const license=raw.toString('utf8');
        if(!license.includes('Permission is hereby granted, free of charge') || !license.includes('THE SOFTWARE IS PROVIDED "AS IS"')) throw new Error('八字证据资料缺少完整许可声明。');
      }
    }
    if(sha(JSON.stringify(actual))!==source.sha256) throw new Error('八字证据来源汇总校验失败。');
  }
  // Consumers persist the source fields, never a shared or caller-mutable manifest object.
  return lock.sources.map(({id,name,url,commit,license,files,sha256,note})=>({id,name,url,commit,license,files:[...files],sha256,note}));
}

/** Bind current evidence's historical registry to the shipped rules, independently of mutable knowledge packs. */
export function verifyBaziProvenance(session:NamingSession,shippedSources:SourceRecord[]):void {
  // Legacy records remain legacy. Absence is displayed explicitly and never backfilled from today's sources.
  if(!session.analysis.bazi.evidence || session.sourceSnapshot===undefined) return;
  const snapshot=session.sourceSnapshot;
  if(!validSessionSourceSnapshot(snapshot,session.dataVersion)) throw new Error('八字证据生成时来源快照格式无效或与方案数据版本不一致。');
  for(const id of REQUIRED_IDS){
    const expected=shippedSources.filter(source=>source.id===id),recorded=snapshot.sources.filter(source=>source.id===id);
    if(expected.length!==1 || recorded.length!==1 || !isDeepStrictEqual(recorded[0],expected[0]))
      throw new Error('八字证据生成时来源记录与声明的固定规则资料不一致。');
  }
}
