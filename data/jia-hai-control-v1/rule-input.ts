import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {analyzeProfile} from '../engine';
import type {BirthProfile,Analysis} from '../../shared/types';
import type {ChartCase140,Carrier140} from '../../shared/bazi-mainchain-method-types';
import {prepareRootInput145} from '../bazi-mainchain/project-v13/consumers';
import {resolveRootFeedback} from '../bazi-mainchain/project-v13/root-feedback';
import {settleRootCarrierFlows} from '../bazi-mainchain/project-v13/settled-flows';
import type {CarrierFlowSettlement} from '../bazi-mainchain/project-v13/settled-flows';
import {compareRootFeedbackIntervention145} from '../bazi-mainchain/project-v13';
import {difference,point,sumIntervals} from '../bazi-mainchain/kernel-v12-fixed/numeric-interval';
import type {NumericInterval} from '../bazi-mainchain/kernel-v12-fixed/numeric-interval';
import projectParameters from '../bazi-mainchain/project-v13/rules/project-mainchain-1.3.1.json';
import kernelParameters from '../bazi-mainchain/kernel-v12-fixed/rules/project-mainchain-1.2.0.json';
import sourceContext from './jia-hai-wu-ren-source.json';
import type {JiaHaiCarrierSelector,JiaHaiControlOptions,JiaHaiPathCandidate,JiaHaiPairedRegime,JiaHaiControlProjection,JiaHaiLegacyComparison} from './jia-hai-control-types';

const PROFILE_KEYS = ['id', 'customerName', 'surname', 'surnamePinyin', 'gender', 'calendar', 'birthDate', 'leapMonth', 'birthTime', 'timeUnknown', 'birthPlace', 'timezone', 'notes', 'fatherName', 'motherName', 'parentNameReadings', 'namingPreferences', 'monthAuthorityMethod', 'seasonalMethod', 'timeBasis', 'birthLongitude', 'renMethod'];

const OPTIONAL_PROFILE_KEYS = ['fatherName', 'motherName', 'parentNameReadings', 'namingPreferences', 'monthAuthorityMethod', 'seasonalMethod', 'timeBasis', 'birthLongitude', 'renMethod'];

function copyPlain(value: unknown, path = '出生资料', ancestors = new Set<object>(), depth = 0): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || depth > 24 || types.isProxy(value)) throw new Error(path + '拒绝代理或非JSON数据。');
  if (ancestors.has(value)) throw new Error(path + '拒绝循环引用。');
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  if (array ? prototype !== Array.prototype : ![Object.prototype, null].includes(prototype)) throw new Error(path + '原型无效。');
  ancestors.add(value);
  try {
    const keys = Reflect.ownKeys(value);
    const result: unknown[] | Record<string, unknown> = array ? [] : {};
    if (array) {
      const length = Object.getOwnPropertyDescriptor(value, 'length')!.value as number;
      if (length > 4096 || keys.length !== length + 1) throw new Error(path + '拒绝稀疏或附加数组字段。');
      for (let i = 0; i < length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(path + '拒绝访问器或隐藏字段。');
        (result as unknown[]).push(copyPlain(descriptor.value, path + '[' + i + ']', ancestors, depth + 1));
      }
    } else for (const key of keys) {
      if (typeof key !== 'string' || key === '__proto__') throw new Error(path + '拒绝符号或原型字段。');
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(path + '拒绝访问器或隐藏字段。');
      Object.defineProperty(result, key, { value: copyPlain(descriptor.value, path + '.' + key, ancestors, depth + 1), enumerable: true, writable: true, configurable: true });
    }
    return result;
  } finally { ancestors.delete(value); }
}

function profileCopy(raw: BirthProfile): BirthProfile {
  if (!raw || typeof raw !== 'object' || types.isProxy(raw) || ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) throw new Error('出生资料拒绝代理或非普通对象。');
  const topLevel: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== 'string' || !PROFILE_KEYS.includes(key)) throw new Error('出生资料含未允许字段。');
    const descriptor = Object.getOwnPropertyDescriptor(raw, key)!;
    if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error('出生资料拒绝访问器或隐藏字段。');
    if (descriptor.value === undefined && OPTIONAL_PROFILE_KEYS.includes(key)) continue;
    Object.defineProperty(topLevel, key, { value: descriptor.value, enumerable: true, writable: true, configurable: true });
  }
  const value = copyPlain(topLevel) as Record<string, unknown>;
  for (const key of ['id', 'customerName', 'surname', 'surnamePinyin', 'birthDate', 'birthTime', 'birthPlace', 'timezone', 'notes']) if (typeof value[key] !== 'string') throw new Error('出生资料缺少文本字段：' + key);
  if (typeof value.timeUnknown !== 'boolean' || typeof value.leapMonth !== 'boolean') throw new Error('出生资料时间标记无效。');
  if (!['solar', 'lunar'].includes(String(value.calendar)) || !['男', '女', '中性'].includes(String(value.gender))) throw new Error('出生资料历法或性别无效。');
  return value as unknown as BirthProfile;
}


function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value)}return value}
const SOURCE=freeze(structuredClone(sourceContext));
const MODEL=freeze(structuredClone(projectParameters));
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function assertModelPins():void {
 const pins=SOURCE.modelPins;
 if(digest(projectParameters)!==pins[0].jsonValueSha256||digest(kernelParameters)!==pins[1].jsonValueSha256)throw new Error('M625_PROJECT_PARAMETERS_CHANGED: 固定项目参数已改变，停止可选推演。');
}
function ownData(value:unknown,allowed:readonly string[],required:readonly string[],label:string):Record<string,unknown>{
 if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(label+'须为非代理普通对象。');
 const out:Record<string,unknown>={};for(const key of Reflect.ownKeys(value)){if(typeof key!=='string'||!allowed.includes(key))throw new Error(label+'包含未允许字段。');const d=Object.getOwnPropertyDescriptor(value,key)!;if(!Object.hasOwn(d,'value')||!d.enumerable)throw new Error(label+'拒绝访问器或隐藏字段。');out[key]=d.value;}
 if(required.some(key=>!Object.hasOwn(out,key)))throw new Error(label+'缺少字段。');return out;
}
function optionsValue(value:JiaHaiControlOptions|undefined):{enabled:boolean;selector:JiaHaiCarrierSelector|null}{
 if(value===undefined)return{enabled:false,selector:null};const out=ownData(value,['enabled','selector'],[],'推演选项');
 if(Object.hasOwn(out,'enabled')&&typeof out.enabled!=='boolean')throw new Error('enabled须为显式布尔值。');
 let selector:JiaHaiCarrierSelector|null=null;
 if(Object.hasOwn(out,'selector')){const data=ownData(out.selector,['controllerId','attackerId','hiddenCarrierId'],['controllerId','attackerId','hiddenCarrierId'],'载体selector');for(const field of ['controllerId','attackerId','hiddenCarrierId'])if(typeof data[field]!=='string'||!(data[field] as string).length||(data[field] as string).length>200)throw new Error('selector载体标识无效。');selector=data as unknown as JiaHaiCarrierSelector;}
 if(selector&&out.enabled!==true)throw new Error('必须明确启用后才能选择载体。');return{enabled:out.enabled===true,selector};
}
function chartFromAnalysis(profile:BirthProfile,analysis:Analysis):ChartCase140|null{
 const map=new Map<string,{gan:string;zhi:string}>();for(const row of analysis.bazi.pillars){if(!['年柱','月柱','日柱','时柱'].includes(row.label)||map.has(row.label))throw new Error('实际排盘柱位无效或重复。');map.set(row.label,{gan:row.gan,zhi:row.zhi});}
 if(profile.timeUnknown&&map.has('时柱'))throw new Error('未知时刻排盘不应产生时柱。');
 const year=map.get('年柱'),month=map.get('月柱'),day=map.get('日柱');if(!year||!month||!day)return null;
 return{id:profile.id+':m625-jia-hai',provenance:'validated-existing-calendar:'+analysis.bazi.version+';'+(analysis.bazi.timeBasis?.methodId??'existing-civil')+';'+digest({birthDate:profile.birthDate,birthTime:profile.birthTime,timeUnknown:profile.timeUnknown,timezone:profile.timezone}),pillars:{year,month,day,hour:map.get('时柱')??null}};
}
function carrier(row:Carrier140){return{id:row.id,stem:row.stem,kind:row.kind,position:row.position,branch:row.branch??null,originalElement:row.originalElement,workingElement:row.element};}
function candidatesFromVerifiedSolves(discovery:JiaHaiControlProjection['project']['discovery']):JiaHaiPathCandidate[]{
 if(!discovery)return[];const found=new Map<string,JiaHaiPathCandidate>();
 for(const regime of discovery.regimes){const state=regime.settlement;if(!state||state.status!=='closed')continue;
  for(const edge of state.graph.edges){const source=state.carriers.find(c=>c.id===edge.source),attacker=state.carriers.find(c=>c.id===edge.target);
   if(!source||!attacker||source.kind!=='exposed'||source.stem!=='戊'||source.element!=='土'||source.originalElement!=='土'||source.conversion||attacker.stem!=='壬'||attacker.element!=='水'||attacker.originalElement!=='水'||attacker.conversion||!(edge.coefficient>0)||edge.id!=='control:'+source.id+':'+attacker.id)continue;
   for(const damage of state.graph.edges.filter(e=>e.source===attacker.id&&e.coefficient>0)){
    const hidden=state.carriers.find(c=>c.id===damage.target);if(!hidden||hidden.kind!=='hidden'||hidden.element!=='火'||hidden.originalElement!=='火'||hidden.conversion||damage.id!=='control:'+attacker.id+':'+hidden.id)continue;
    const selector={controllerId:source.id,attackerId:attacker.id,hiddenCarrierId:hidden.id},key=JSON.stringify(selector);
    if(!found.has(key))found.set(key,{selector,canonicalEdgeId:edge.id,attackerToHiddenEdgeId:damage.id,controller:carrier(source),attacker:carrier(attacker),hiddenCarrier:carrier(hidden),graphIdentity:digest({nodes:state.graph.nodes.map(n=>n.id),paths:state.graph.edges.map(e=>({id:e.id,source:e.source,target:e.target,pathFactor:e.pathFactor})),carriers:state.carriers.map(carrier)})});
   }
  }
 }
 return[...found.values()].sort((a,b)=>JSON.stringify(a.selector).localeCompare(JSON.stringify(b.selector)));
}
function paired(comparison:JiaHaiLegacyComparison,selected:JiaHaiPathCandidate):JiaHaiPairedRegime[]{
 return comparison.full.regimes.map(on=>{
  const off=comparison.without.regimes.find(r=>r.id===on.id);const enabled=on.settlement,disabled=off?.settlement,issues:string[]=[];
  if(!off)issues.push('相同根机制缺失。');
  if(off&&digest(on.rootAssumptions)!==digest(off.rootAssumptions))issues.push('根假设发生变化。');
  if(off&&digest(on.capacities)!==digest(off.capacities))issues.push('同态容量或根倍率发生变化。');
  if(!enabled||!disabled||enabled.status!=='closed'||disabled.status!=='closed')issues.push('两侧控制/生成结算未闭合。');
  const a=enabled?.controlSettlement??null,b=disabled?.controlSettlement??null;
  if(enabled&&disabled&&digest(enabled.graph)!==digest(disabled.graph))issues.push('原控制图、路径或分母权重改变。');
  if(a&&b){if(digest(a.nodes)!==digest(b.nodes)||digest(a.columnSums)!==digest(b.columnSums)||digest(a.columnSumUpperBounds)!==digest(b.columnSumUpperBounds)||digest(a.sourceIds)!==digest(b.sourceIds))issues.push('节点或冻结控制分母改变。');
   if(a.disabledEdgeIds.length||b.disabledEdgeIds.length!==1||b.disabledEdgeIds[0]!==selected.canonicalEdgeId)issues.push('未仅关闭内部解析的唯一边。');
   if(digest(a.fixedCoefficients.map(e=>({...e,disabled:false})))!==digest(b.fixedCoefficients.map(e=>({...e,disabled:false}))))issues.push('其他边或固定系数改变。');
  }
  let deltas:JiaHaiPairedRegime['deltas']=null;
  if(!issues.length&&enabled&&disabled&&a?.status==='closed'&&b?.status==='closed'){
   const bound=(state:CarrierFlowSettlement,id:string)=>state.bounds.powers[id]??point(0);
   const named=(state:CarrierFlowSettlement,stem:string)=>sumIntervals(state.carriers.filter(c=>c.stem===stem).map(c=>bound(state,c.id)));
   const day=enabled.carriers.find(c=>c.kind==='day-master')!.id;
   deltas={renRemainingReduction:difference(b.remainingBounds[selected.attacker.id],a.remainingBounds[selected.attacker.id]),renFinalPowerReduction:difference(bound(disabled,selected.attacker.id),bound(enabled,selected.attacker.id)),selectedHiddenCarrierPowerChange:difference(bound(enabled,selected.hiddenCarrier.id),bound(disabled,selected.hiddenCarrier.id)),selectedHiddenTotalLossReduction:difference(b.totalLossBoundsByNode[selected.hiddenCarrier.id],a.totalLossBoundsByNode[selected.hiddenCarrier.id]),jiaDayPowerChange:difference(bound(enabled,day),bound(disabled,day)),gengNamedCarrierPowerChange:difference(named(enabled,'庚'),named(disabled,'庚')),dingNamedCarrierPowerChange:difference(named(enabled,'丁'),named(disabled,'丁'))};
  }
  return{regimeId:on.id,retainedOnEitherSide:on.consistency!=='inconsistent'||off?.consistency!=='inconsistent',fullConsistency:on.consistency,withoutConsistency:off?.consistency??'missing',rootAssumptions:on.rootAssumptions,capacities:on.capacities,rootsEnabled:on.rootIntervals,rootsDisabled:off?.rootIntervals??[],invariants:{valid:issues.length===0,issues,graphDigestEnabled:enabled?digest(enabled.graph):null,graphDigestDisabled:disabled?digest(disabled.graph):null,unchangedOtherEdgeCount:issues.length?0:Math.max(0,(enabled?.graph.edges.length??0)-1)},convergenceEnabled:a,convergenceDisabled:b,deltas};
 });
}

/** Optional project-only adapter. Source semantics remain traditional-unknown.
 * No public edgeId, graph, root booleans, capacities or model parameters.
 */
export function evaluateJiaHaiControlProjection(profile:BirthProfile,options?:JiaHaiControlOptions):JiaHaiControlProjection{
 const mode=optionsValue(options),input=profileCopy(profile),analysis=analyzeProfile(input),chart=chartFromAnalysis(input,analysis);
 const day=analysis.bazi.pillars.find(p=>p.label==='日柱')?.gan,month=analysis.bazi.pillars.find(p=>p.label==='月柱')?.zhi;
 const excluded=day!==undefined&&day!=='甲'||month!==undefined&&month!=='亥',applicable=day==='甲'&&month==='亥';
 const result:JiaHaiControlProjection={schema:'jia-hai-wu-ren-project-intervention/1.0.0',applicability:excluded?'not-applicable':applicable?'applicable':'unknown',
  traditional:{status:excluded?'not-applicable':'traditional-unknown',dependencies:SOURCE.traditionalDependencies.map(id=>({id,status:'unknown'})),usefulGodDecision:'not-evaluated',namingImpact:'none'},
  birth:{profile:{id:input.id,birthDate:input.birthDate,birthTime:input.birthTime,timeUnknown:input.timeUnknown,timezone:input.timezone},baziVersion:analysis.bazi.version,timeBasis:analysis.bazi.timeBasis??null,knownPillars:structuredClone(analysis.bazi.pillars),chart,originalAnalysisDigest:digest(analysis)},
  literal:{exposedWu:analysis.bazi.pillars.some(p=>p.gan==='戊')?'present':analysis.bazi.pillars.length===4&&!input.timeUnknown?'not-seen':'unknown',note:'只核戊明干出现，不证明传统有效制壬；辰不藏壬，实际藏干身份来自原图。'},
  project:{enabled:mode.enabled,status:'disabled',methodId:MODEL.methodId,parameterVersion:MODEL.methodId+';control-budget/1.0.0;'+MODEL.rootFeedback.version,parameters:structuredClone(MODEL.parameters),modelPins:structuredClone(SOURCE.modelPins),discovery:null,candidates:[],selected:null,legacyComparison:null,comparisonResolution:'not-run',pairedRegimes:[],selectedLegacyCertificates:[],stopReasons:[],controls:'same-regime-capacity-and-original-control-denominator',generation:'unchanged-existing-rule-recomputed-from-each-solution',scoreMutation:false},
  source:{sourceId:'bazi-monthly-qiongtong-2294674',revision:SOURCE.revision,rawSha256:SOURCE.rawSha256,quote:SOURCE.quote,quoteSpan:structuredClone(SOURCE.quoteSpan),note:'传统有效控制、水泛、根容量、反制与净作用均未闭合；项目参数不是古籍数值。'}};
 // Mutations below affect only this new local response builder, not readonly
 // public input or an old solver object. Freeze a detached copy at return.
 const project=result.project as {-readonly[K in keyof JiaHaiControlProjection['project']]:JiaHaiControlProjection['project'][K]};
 const finish=()=>freeze(structuredClone(result));
 if(!mode.enabled){project.stopReasons=['默认关闭；未运行项目图或两侧干预。'];return finish();}
 if(excluded){project.status='not-applicable';project.stopReasons=['已知出生图不在甲日亥月范围。'];return finish();}
 if(!chart||!applicable){project.status='calendar-unknown';project.stopReasons=['实际日/月或年柱未确定，未构造替代图。'];return finish();}
 assertModelPins();
 const prepared=prepareRootInput145(chart,{}),discovery=resolveRootFeedback(prepared.input,{settle:settleRootCarrierFlows});
 project.discovery=discovery;const candidates=candidatesFromVerifiedSolves(discovery);project.candidates=candidates;
 if(chart.pillars.hour===null){project.status='pending-incomplete-graph';project.stopReasons=['仅已知三柱的投影图尚不完整；保留全部possible根状态和可见候选，不把未知时柱遗漏视为完整唯一链，未进入单边比较。'];return finish();}
 if(!candidates.length){project.status=chart.pillars.hour===null?'pending-incomplete-graph':'no-eligible-path';project.stopReasons=['已知项目图没有唯一可用的明戊→原壬→同一未转换藏火载体链；不借藏戊或不同对象代替。'];return finish();}
 const choices=mode.selector?candidates.filter(c=>c.selector.controllerId===mode.selector!.controllerId&&c.selector.attackerId===mode.selector!.attackerId&&c.selector.hiddenCarrierId===mode.selector!.hiddenCarrierId):candidates;
 if(choices.length!==1){project.status=mode.selector&&choices.length===0?'selector-rejected':'ambiguous-selector';project.stopReasons=['零条或多条身份链不得任取；只能用候选图内三个载体标识明确选择唯一链。'];return finish();}
 const selected=choices[0];project.selected=selected;
 // The only intervention call: exactly one canonical edge derived internally.
 const comparison=compareRootFeedbackIntervention145(chart,[selected.canonicalEdgeId],{});assertModelPins();
 project.legacyComparison=comparison;project.pairedRegimes=paired(comparison,selected);
 project.selectedLegacyCertificates=comparison.conditionalCertificates.filter(c=>c.rescueEdgeId===selected.canonicalEdgeId&&c.rescuerId===selected.controller.id&&c.attackerId===selected.attacker.id&&c.hiddenRootId===selected.hiddenCarrier.id);
 const valid=project.pairedRegimes.every(pair=>pair.invariants.valid);
 project.status=valid?'projected-only':'projection-unknown';
 project.comparisonResolution=comparison.full.resolution==='unique-consistent-regime'&&comparison.without.resolution==='unique-consistent-regime'&&chart.pillars.hour!==null?'two-unique-regime-comparison':'conditional-or-unresolved';
 project.stopReasons=[...(valid?[]:['同态不变量或数值闭合未通过，差值不得视为认证作用。']),...(project.comparisonResolution==='conditional-or-unresolved'?['反馈多解、无解或输入不完整；保留所有机制，不拼接为确定恢复。']:[]),...(project.selectedLegacyCertificates.length?[]:['旧solver未给本指定藏载体一份根保护证书。']),'即使项目差值为正，传统四项前提仍未知，不作经典喜用或评分采用。'];
 return finish();
}
