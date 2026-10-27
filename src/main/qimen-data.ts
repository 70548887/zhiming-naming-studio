import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { QIMEN_AUXILIARY_VERSION, calculateQimenAuxiliary } from '../domain/qimen-markers';
import { QIMEN_PATTERN_VERSION, qimenPatternRules } from '../domain/qimen-patterns';
import type { SourceRecord } from '../shared/types';

// Fixed publication manifest: raw research files are not needed by the installed application.
const SOURCE_LOCK_SHA256 = '921d35d90b3dcc8d3ae1c1cc6befc7748036b5c58b9dd6852a821f4a27827dae';
const PATTERN_SOURCE_LOCK_SHA256 = 'd620d224f56ef9815030174c49351bb71855cb4a2f267ebe4712c548c78edb37';
export const QIMEN_STEM_TOMB_VERSION='qimen-go-explicit-stem-tombs/1.0.0';
const STEM_TOMB_SOURCE_LOCK_SHA256='406779b1d83236c8c8dde89b1def7dd18caf81fee981904b45d45655daf5d9e8';
export function loadQimenSources(directory: string): SourceRecord[] {
  const raw = readFileSync(join(directory, 'qimen-markers-source-lock.json'));
  if (createHash('sha256').update(raw).digest('hex') !== SOURCE_LOCK_SHA256) throw new Error('奇门辅助规则来源登记校验失败。');
  const lock = JSON.parse(raw.toString('utf8'));
  if (lock.version !== QIMEN_AUXILIARY_VERSION || !Array.isArray(lock.sources)) throw new Error('奇门辅助规则来源版本不匹配。');
  const required = calculateQimenAuxiliary('甲子').rules.flatMap(r => r.sources);
  if (required.some(r => !lock.sources.some((s: SourceRecord) => s.id === r.id && s.commit === r.commit && s.url === r.url))) throw new Error('奇门辅助规则缺少对应来源。');
  return [...lock.sources, ...loadQimenPatternSources(directory),...loadQimenStemTombSources(directory)];
}

/** New fixed publication; old marker and structural manifests remain unchanged. */
export function loadQimenStemTombSources(directory:string):SourceRecord[]{
  const raw=readFileSync(join(directory,'qimen-stem-tombs-source-lock.json'));
  if(createHash('sha256').update(raw).digest('hex')!==STEM_TOMB_SOURCE_LOCK_SHA256)throw new Error('十干墓支参考来源登记校验失败。');
  const lock=JSON.parse(raw.toString('utf8'));
  if(lock.version!==QIMEN_STEM_TOMB_VERSION||!Array.isArray(lock.sources)||lock.sources.length!==1||lock.sources[0].id!=='qimen-go-stem-tombs')throw new Error('十干墓支参考资料版本不完整。');
  const source=lock.sources[0],hashes:Record<string,string>={};
  if(!Array.isArray(source.files)||!source.fileHashes||source.files.length!==Object.keys(source.fileHashes).length)throw new Error('十干墓支参考原件登记不完整。');
  for(const file of [...source.files].sort()){
    if(!file.startsWith('data/')||file.split('/').some((part:string)=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('十干墓支参考原件定位无效。');
    const bytes=readFileSync(join(directory,file.slice('data/'.length)));
    hashes[file]=createHash('sha256').update(bytes).digest('hex');
    if(hashes[file]!==source.fileHashes[file])throw new Error('十干墓支参考原表或许可校验失败。');
    if(file.endsWith('LICENSE.txt')&&(!bytes.toString('utf8').includes('Permission is hereby granted, free of charge')||!bytes.toString('utf8').includes('THE SOFTWARE IS PROVIDED "AS IS"')))throw new Error('十干墓支参考缺少完整MIT许可。');
  }
  if(createHash('sha256').update(JSON.stringify(hashes)).digest('hex')!==source.sha256)throw new Error('十干墓支参考来源汇总校验失败。');
  const {id,name,url,commit,license,files,sha256,note}=source;return [{id,name,url,commit,license,files:[...files],sha256,note}];
}

export function loadQimenPatternSources(directory: string): SourceRecord[] {
  const raw = readFileSync(join(directory, 'qimen-patterns-source-lock.json'));
  if (createHash('sha256').update(raw).digest('hex') !== PATTERN_SOURCE_LOCK_SHA256) throw new Error('奇门结构规则来源登记校验失败。');
  const lock = JSON.parse(raw.toString('utf8'));
  if (lock.version !== QIMEN_PATTERN_VERSION || !Array.isArray(lock.sources)) throw new Error('奇门结构规则来源版本不匹配。');
  const required = qimenPatternRules().flatMap(rule => rule.sources);
  if (required.some(r => !lock.sources.some((source: SourceRecord) => source.id === r.id && source.commit === r.commit && source.url === r.url))) throw new Error('奇门结构规则缺少对应固定来源。');
  const sourceIds = lock.sources.map((source: SourceRecord) => source.id);
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error('奇门结构规则来源编号重复。');
  return lock.sources;
}
