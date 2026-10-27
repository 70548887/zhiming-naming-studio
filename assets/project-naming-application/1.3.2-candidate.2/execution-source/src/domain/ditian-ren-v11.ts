import ruleData from '../../data/ren-necessary-rules.json';
import {calculateRenCommentary as calculateRenCommentaryV1,validRenCommentaryAnalysis as validRenCommentaryAnalysisV1} from './ditian-ren-v1';
import {normalizeRenMethod,REN_METHOD,LEGACY_REN_METHOD} from '../shared/ren-method';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis,RenNecessaryCheck,RenNecessaryConditions,RenSourceReference} from '../shared/types';

export {matchRenSourceCases,resolveRenDependencies} from './ditian-ren-v1';
export type {RenDependencyInput,RenDependencyState} from './ditian-ren-v1';
export const REN_COMMENTARY_VERSION='ditian-ren-commentary-2600158/1.1.0' as const;
export const LEGACY_REN_COMMENTARY_VERSION='ditian-ren-commentary-2600158/1.0.0' as const;
export const REN_COMMENTARY_SOURCE_ID='bazi-ditian-ren-2600158';
export const REN_NECESSARY_VERSION='ditian-ren-necessary-clauses/1.0.0' as const;
export const REN_NECESSARY_SOURCE_ID='bazi-ditian-ren-necessary-2600158' as const;
const BAZI_VERSION='civil-midnight-fuyi-candidate/1.11.0;lunar-typescript/1.8.6';
const BAZI_V1_VERSION='civil-midnight-fuyi-candidate/1.10.0;lunar-typescript/1.8.6';
const SCOPE='selected-vocabulary-necessary-prerequisite-only' as const;
export interface RenNecessaryRule {
  id:RenNecessaryCheck['id'];name:string;pattern:'cong-er';role:'necessary-literal-membership'|'necessary-superset';
  requiredRelation:'wealth'|'output';scope:typeof SCOPE;sourceId:typeof REN_NECESSARY_SOURCE_ID;sourceQuote:string;sourceLocator:string;
  sourceSpan:{start:number;end:number;unit:'unicode-codepoint';interval:'[start,end)'};sourceHeading:string;interpretation:string;
}
export function renNecessaryRules():RenNecessaryRule[] {
  const data=ruleData as unknown as {version:string;profileId:string;sourceId:string;scope:string;rules:RenNecessaryRule[]};
  if(data.version!==REN_NECESSARY_VERSION||data.profileId!==REN_COMMENTARY_VERSION||data.sourceId!==REN_NECESSARY_SOURCE_ID||data.scope!==SCOPE||data.rules.length!==2||new Set(data.rules.map(rule=>rule.id)).size!==2||data.rules.some(rule=>rule.scope!==SCOPE||rule.sourceId!==REN_NECESSARY_SOURCE_ID))throw new Error('任注必要条件的固定规则版本不完整。');
  return structuredClone(data.rules);
}
function legacyInputs(profile:BirthProfile,bazi:BaziAnalysis):{profile:BirthProfile;bazi:BaziAnalysis}{return{profile:{...profile,renMethod:LEGACY_REN_METHOD},bazi:{...bazi,version:BAZI_V1_VERSION}};}
/** Lexical necessary membership only; observed presence is never a sufficient formation judgement. */
export function calculateRenNecessaryConditions(base:RenCommentaryAnalysis):RenNecessaryConditions {
  const day=base.input.dayStem,complete=!!day&&base.input.complete&&base.input.pillars.length===4&&base.input.pillars.every(pillar=>pillar.known);
  const checks=renNecessaryRules().map((rule):RenNecessaryCheck=>{
    const matched=day?base.structureGraph.nodes.filter(node=>node.layer!=='branch'&&!node.isDayMaster&&node.relation===rule.requiredRelation):[];
    const status:RenNecessaryCheck['status']=!day?'unknown':matched.length?'not-excluded':complete?'contradicted':'unknown';
    const positions=matched.map(node=>node.pillar+(node.layer==='hidden'?node.branch+'藏':'明干')+node.symbol);
    const target=rule.requiredRelation==='wealth'?'财星':'食伤';
    const evidence:string[]=[rule.requiredRelation==='wealth'?'在已确定日主下，对四柱明干与所选完整藏干表查财星；藏财不要求透出。':'核全盘明干与所选完整藏干的食伤上位集合；该集合包含月干、本气和月支全藏等通常子集。'];
    if(!day)evidence.push('日主未定，没有任选日期或代表时刻分配相对关系。');
    else if(matched.length)evidence.push('已见'+target+'位置：'+positions.join('、')+'；只表示本项未被字面缺项排除，不证明有效作用或成格。');
    else if(complete)evidence.push('四柱完整且所选全部明藏未见'+target+'；仅本条所选字面必要前提不符，不推广为所有流派从儿不成立。');
    else evidence.push('当前已知柱未见'+target+'，但存在未确定柱，不能证明完整命局没有。');
    const missing=[...(!day?['日主未定，暂停相对财星、食伤必要条件核查。']:[]),...(!complete&&!matched.length?['出生柱不完整；未知柱可能提供所查成员，缺项反证暂不成立。']:[]),...(rule.requiredRelation==='output'?['即使全盘见食伤，也未证明其有效或确在任注所说的提纲；提纲窄范围仍待核。']:['财星字面存在不证明有效生育或食伤生财关系已成立。']),'完整从儿还需其他原文条件、有效制化和整体取舍；本项不能给出成格、真假或命运结论。'];
    return{id:rule.id,name:rule.name,pattern:'cong-er',status,scope:rule.scope,sourceId:rule.sourceId,sourceQuote:rule.sourceQuote,sourceLocator:rule.sourceLocator,...(day?{dayStem:day}:{}),complete,matchedNodeIds:matched.map(node=>node.id),positions,evidence,missing,doesNotResolveFormation:true};
  });
  return{version:REN_NECESSARY_VERSION,sourceId:REN_NECESSARY_SOURCE_ID,scope:SCOPE,checks,interpretationPolicy:[
    '仅核所选明干和完整藏干词汇中的必要成员；不是任注唯一有效藏干取法，也不是完整从儿判格。',
    '完整缺项只反证本条所选字面必要前提；成员已见只表示未被该缺项排除，不证明有效或充分成格。',
    '全盘食伤是提纲食伤的必要上位集合；有食伤不能反推提纲条件满足。',
    '未知时刻已见成员可以保留位置证据；缺柱未见或日主未定必须保留未知，不用中午或其他代表盘补齐。',
    '本项不改变旧源例作者标签、有效作用图、《穷通宝鉴》判断、喜用候选或名字排序。'
  ]};
}
/** Exact1.0 remains routed to its frozen calculator. New1.1 appends only independently sourced necessity checks. */
export function calculateRenCommentary(profile:BirthProfile,bazi:BaziAnalysis):RenCommentaryAnalysis|undefined {
  const method=normalizeRenMethod(profile.renMethod);
  if(method==='none')return undefined;
  if(method===LEGACY_REN_METHOD)return calculateRenCommentaryV1(profile,bazi);
  if(method!==REN_METHOD||bazi.version!==BAZI_VERSION)throw new Error('任注1.1必要条件需要对应1.11出生盘，不得嫁接旧版本。');
  const legacy=legacyInputs(profile,bazi),base=calculateRenCommentaryV1(legacy.profile,legacy.bazi)!;
  const necessaryConditions=calculateRenNecessaryConditions(base);
  const references:RenSourceReference[]=renNecessaryRules().map(rule=>({id:rule.id,sourceId:rule.sourceId,section:rule.sourceHeading,layer:'ren-commentary;project-lexical-necessary-check',quote:rule.sourceQuote,locator:rule.sourceLocator}));
  return{...base,version:REN_COMMENTARY_VERSION,profileId:REN_COMMENTARY_VERSION,input:{...base.input,baziVersion:bazi.version},sourceRules:[...base.sourceRules,...references],necessaryConditions};
}
function canonical(value:unknown,depth=0):string {
  if(depth>100)throw new Error('任注必要快照过深。');
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value)){
    const keys=Reflect.ownKeys(value);if(keys.length!==value.length+1||keys.some(key=>typeof key!=='string'||key!=='length'&&!/^(0|[1-9]\d*)$/.test(key)))throw new Error('任注必要数组结构无效。');
    const parts=[];for(let index=0;index<value.length;index++){const descriptor=Object.getOwnPropertyDescriptor(value,String(index));if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('任注必要数组访问器或空位无效。');parts.push(canonical(descriptor.value,depth+1));}return '['+parts.join(',')+']';
  }
  if(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value))){const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))throw new Error('任注必要键无效。');return '{'+(keys as string[]).sort().map(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('任注必要访问器无效。');return JSON.stringify(key)+':'+canonical(descriptor.value,depth+1);}).join(',')+'}';}
  throw new Error('任注必要快照值无效。');
}
export function validRenCommentaryAnalysis(value:unknown,profile:BirthProfile,bazi:BaziAnalysis):value is RenCommentaryAnalysis|undefined {
  try{
    const method=normalizeRenMethod(profile.renMethod);
    if(method==='none')return value===undefined;
    if(method===LEGACY_REN_METHOD)return validRenCommentaryAnalysisV1(value,profile,bazi);
    if(method!==REN_METHOD||bazi.version!==BAZI_VERSION)return false;
    const legacy=legacyInputs(profile,bazi),base=calculateRenCommentaryV1(legacy.profile,legacy.bazi);
    if(!validRenCommentaryAnalysisV1(base,legacy.profile,legacy.bazi))return false;
    return canonical(value)===canonical(calculateRenCommentary(profile,bazi));
  }catch{return false;}
}
