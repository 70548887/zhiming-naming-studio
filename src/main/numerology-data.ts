import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import type {NumerologyRules,NumerologyStrokeData} from '../domain/numerology';
import type {NumerologyAnalysis} from '../shared/types';
export interface NumerologyResources {strokes:NumerologyStrokeData;rules:NumerologyRules;historicalStrokes?:NumerologyStrokeData[];}
const LEGACY_VERSION='kangxi-radical-candidates-2026.10.18-v1';
const CURRENT_VERSION='kangxi-radical-candidates-2026.10.19-v2';
const LEGACY_DATA_SHA='08fff8673a3a22fe568a65d203fdd7545a725ebe0251898f7a5b3fead71963d6';
const LEGACY_LOCK_SHA='3ca6e9b84ecd3e4a1d0141b84450f433ab2cd75255ffb5544a29b7fbfcb90e98';
export function loadNumerologyData(directory:string):NumerologyResources{
  const strokeBytes=readFileSync(join(directory,'numerology-strokes.json')),ruleBytes=readFileSync(join(directory,'numerology-rules.json'));
  const strokeLock=JSON.parse(readFileSync(join(directory,'numerology-source-lock.json'),'utf8')),ruleLock=JSON.parse(readFileSync(join(directory,'numerology-rules-lock.json'),'utf8'));
  const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
  if(sha(strokeBytes)!==strokeLock.build?.outputSha256||sha(ruleBytes)!==ruleLock.outputSha256)throw new Error('康熙笔画或五格规则文件校验失败，请恢复原始数据包。');
  const strokes=JSON.parse(strokeBytes.toString('utf8')) as NumerologyStrokeData;
  const rules=JSON.parse(ruleBytes.toString('utf8')) as NumerologyRules;
  if(typeof strokes.version!=='string'||!Array.isArray(strokes.records)||!Array.isArray(strokes.sources)||!strokes.records.length||!rules.profile||!rules.interpretations||!Array.isArray(rules.sources))throw new Error('康熙笔画或五格规则数据缺失，请重建本地资料。');
  const ids=new Set(strokes.sources.map(s=>s.id));
  if(new Set(strokes.records.map(r=>r.id)).size!==strokes.records.length||strokes.records.some(r=>!r.id||[...r.character].length!==1||[...r.glyph].length!==1||!Number.isInteger(r.count)||r.count<1||r.count>100||!ids.has(r.sourceId)||typeof r.sourceLocator!=='string'||typeof r.note!=='string'))throw new Error('康熙笔画记录未通过字段及来源校验。');
  const ruleSources=new Set(rules.sources.map(s=>s.id));
  if(typeof rules.version!=='string'||['id','version','name','strokePolicy','formulaConvention'].some(k=>typeof(rules.profile as any)[k]!=='string')||Object.keys(rules.interpretations).length!==81||Array.from({length:81},(_,i)=>rules.interpretations[String(i+1)]).some(v=>!v||typeof v.label!=='string'||typeof v.keyword!=='string'||!ruleSources.has(v.sourceId)))throw new Error('81数理规则未通过完整性及来源校验。');
  const historicalStrokes:NumerologyStrokeData[]=[];
  if(strokes.version===CURRENT_VERSION){
    const legacyRoot=join(directory,'numerology-history/kangxi-20261018-v1');
    let legacyBytes:Buffer,legacyLockBytes:Buffer;
    try{legacyBytes=readFileSync(join(legacyRoot,'numerology-strokes.json'));legacyLockBytes=readFileSync(join(legacyRoot,'numerology-source-lock.json'));}catch{throw new Error('康熙历史笔画资料缺失，请恢复完整安装包。');}
    if(sha(legacyBytes)!==LEGACY_DATA_SHA||sha(legacyLockBytes)!==LEGACY_LOCK_SHA)throw new Error('康熙历史笔画资料校验失败，未使用当前字形改写旧方案。');
    const legacy=JSON.parse(legacyBytes.toString('utf8')) as NumerologyStrokeData;
    const legacyLock=JSON.parse(legacyLockBytes.toString('utf8'));
    if(legacy.version!==LEGACY_VERSION||legacyLock.version!==LEGACY_VERSION||legacyLock.build?.outputSha256!==LEGACY_DATA_SHA)throw new Error('康熙历史笔画版本不一致。');
    historicalStrokes.push(legacy);
  }
  return {strokes,rules,...(historicalStrokes.length?{historicalStrokes}:{})};
}
export function verifyNumerologyProvenance(n:NumerologyAnalysis,resources:ReturnType<typeof loadNumerologyData>):void {
  const selected=n.dataVersion===resources.strokes.version?resources.strokes:resources.historicalStrokes?.find(data=>data.version===n.dataVersion);
  if(!selected||n.rule.id!==resources.rules.profile.id||n.rule.version!==resources.rules.profile.version){
    const notice='历史数理资料版本未在当前安装包中重新核对，所存笔画仅作历史记录；已移除未核对的81分类，重新确认字形可按当前资料计算。';
    if(!n.warnings.includes(notice))n.warnings.push(notice);for(const grid of n.grids)delete grid.interpretation;return;
  }
  const registry=new Map(selected.records.map(r=>[r.id,r]));
  if(JSON.stringify(n.rule)!==JSON.stringify(resources.rules.profile)||n.strokes.some(c=>c.options.some(r=>{const known=registry.get(r.id);return !known||['character','glyph','count','sourceId','sourceLocator','note'].some(k=>(known as any)[k]!==(r as any)[k]);})))throw new Error('数理字形记录与声明的资料版本不一致。');
  for(const grid of n.grids){const expected=grid.value<=81?resources.rules.interpretations[String(grid.value)]:undefined;if(JSON.stringify(grid.interpretation)!==JSON.stringify(expected))throw new Error('数理分类与声明的规则版本不一致。');}
}
