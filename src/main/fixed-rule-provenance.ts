import { isDeepStrictEqual } from 'node:util';
import type { NamingSession, SourceRecord } from '../shared/types';
import type { NumerologyRules,NumerologyStrokeData } from '../domain/numerology';
import {requiresSessionSourceManifest}from'./saved-analysis-policy';

/** These publications are independent of custom knowledge packs. Same source IDs never authorize changed metadata. */
export function verifyFixedRuleProvenance(session:NamingSession,resources:{qimenSources:SourceRecord[];numerology:{strokes:NumerologyStrokeData;rules:NumerologyRules;historicalStrokes?:NumerologyStrokeData[]}}):void {
 if(!session.sourceSnapshot){if(requiresSessionSourceManifest(session.analysis.bazi?.version))throw new Error('当前版方案缺少生成时完整来源清单，不能降级为历史缺失状态。');return;}
 const registry=new Map([...resources.qimenSources,...resources.numerology.strokes.sources,...resources.numerology.rules.sources].map(({id,name,url,commit,license,files,sha256,note})=>[id,{id,name,url,commit,license,files:[...files],sha256,note}]));
 // Source IDs identify a fixed publication (including versioned source commit in its metadata).
 // An upgraded/unprovided numerical profile may keep unknown IDs as unverified history; it may not reuse
 // a current publication ID for different metadata. Future publications must allocate a new source ID.
 // Check every displayed known fixed ID, even if this particular candidate did not enable its calculation.
 for(const recorded of session.sourceSnapshot.sources){const expected=registry.get(recorded.id);if(expected&&!isDeepStrictEqual(recorded,expected))throw new Error('奇门或数理生成时固定来源与对应资料版本不一致，未保存。');}
 const required=new Set<string>();
 for(const result of [session.analysis.qimen.auxiliary,session.analysis.qimen.patterns,session.analysis.qimen.stemTombs])for(const rule of result?.rules??[])for(const source of rule.sources)required.add(source.id);
 for(const candidate of session.candidates){const numeric=candidate.numerology;if(!numeric)continue;
  const selected=numeric.dataVersion===resources.numerology.strokes.version?resources.numerology.strokes:resources.numerology.historicalStrokes?.find(data=>data.version===numeric.dataVersion);
  if(selected&&numeric.rule.id===resources.numerology.rules.profile.id&&numeric.rule.version===resources.numerology.rules.profile.version){
   for(const source of [...selected.sources,...resources.numerology.rules.sources])required.add(source.id);
  }
 }
 for(const id of required)if(!registry.has(id)||session.sourceSnapshot.sources.filter(source=>source.id===id).length!==1)throw new Error('奇门或数理生成时固定来源缺失或版本未提供。');
}
