import tableData from '../../data/qimen-stem-tombs-table.json';
import type {QimenMarkerRule,QimenPalace,QimenStemTombAnalysis,QimenStemTombObservation} from '../shared/types';

export const QIMEN_STEM_TOMBS_VERSION='qimen-go-explicit-stem-tombs/1.0.0';
const OUTER=[1,2,3,4,6,7,8,9];
const EXPLICIT=[...'乙丙丁戊己庚辛壬癸'];
const SOURCE={id:'qimen-go-stem-tombs',url:'https://github.com/deminzhang/qimen-go',commit:'4d3f58fa0f401b5b3a337f119138e99e90685dda',locator:'xuan/qimen_defs.go:220–224 QMTomb; xuan/ganzhi.go:43–46 ZhiGong9'};
const RULE:QimenMarkerRule={id:'qimen-go-heaven-explicit-stem-tombs',version:'1.0.0',name:'qimen-go固定十干墓支表参考（显式天盘干）',sources:[SOURCE],conditions:[
  '采用独立固定电子表的十干墓支→固定地支宫映射；与既有三奇乙坤二、丙乾六、丁艮八读法分别保留，不覆盖也不混表。',
  '本产品限定核查外八宫实际天盘主干和随天芮提供的寄干；地盘干、中五说明副本不重复参与。此范围是产品选择，不声称原源软件仅查天盘。',
  '转盘显式三奇六仪共九干各核一次；甲不直接出现，列原表甲未坤二但状态为未直接观测，不把甲子戊等遁仪身份反推甲的独立落宫。',
  '只列所选表匹配或不匹配，不判断旺衰、真假入墓、解除四害、人生吉凶或姓名落宫。'
]};
export interface QimenStemTombTableEntry {stem:string;tombBranch:string;palace:number;sourceLocator:string;note:string;}
export function qimenStemTombTable():QimenStemTombTableEntry[]{
  if(tableData.version!==QIMEN_STEM_TOMBS_VERSION||tableData.entries.length!==10)throw new Error('十干墓支独立表缺失或版本不一致。');
  return tableData.entries.map(entry=>({...entry}));
}
export function qimenStemTombRules():QimenMarkerRule[]{return [{...RULE,sources:RULE.sources.map(source=>({...source})),conditions:[...RULE.conditions]}];}
function observe(palaces:QimenPalace[]):Map<string,QimenStemTombObservation[]>{
  if(!Array.isArray(palaces)||palaces.length!==9||new Set(palaces.map(palace=>palace?.number)).size!==9||palaces.some(palace=>!palace||!Number.isInteger(palace.number)||palace.number<1||palace.number>9))throw new Error('十干墓支参考需要完整且不重复的九宫盘。');
  const result=new Map<string,QimenStemTombObservation[]>();
  for(const number of OUTER){
    const palace=palaces.find(palace=>palace.number===number)!;
    const parsed=typeof palace.heaven==='string'?/^([乙丙丁戊己庚辛壬癸])(?:（寄([乙丙丁戊己庚辛壬癸])）)?$/.exec(palace.heaven):null;
    if(!parsed||!!parsed[2]!==palace.star?.includes('、天禽')||(parsed[2]&&palace.star!=='天芮、天禽'))throw new Error('十干墓支参考只接受本转盘已提供的实际主、寄天盘干。');
    for(const [stem,role] of [[parsed[1],'principal'],...(parsed[2]?[[parsed[2],'lodged']]:[])] as [string,'principal'|'lodged'][]){
      result.set(stem,[...(result.get(stem)||[]),{palace:number,role}]);
    }
  }
  if(result.size!==9||EXPLICIT.some(stem=>result.get(stem)?.length!==1))throw new Error('十干墓支参考需要三奇六仪九个显式干各出现一次。');
  return result;
}

/** Actual outer heavenly-stem locations only; the source table does not authorize a hidden-Jia substitution. */
export function calculateQimenStemTombs(palaces:QimenPalace[]):QimenStemTombAnalysis {
  const observed=observe(palaces),entries=qimenStemTombTable();
  const checks=entries.map(entry=>{
    const observations=observed.get(entry.stem)||[];
    const status=entry.stem==='甲'?'not-directly-observed' as const:observations.some(item=>item.palace===entry.palace)?'matched' as const:'not-matched' as const;
    return {stem:entry.stem,targetBranch:entry.tombBranch,targetPalace:entry.palace,status,observations:observations.map(item=>({...item})),ruleId:RULE.id,ruleVersion:RULE.version,evidence:[
      `所选固定表${entry.stem}墓${entry.tombBranch}，按固定支宫映射至${entry.palace}宫；定位${entry.sourceLocator}。`,
      ...(observations.length?observations.map(item=>`${entry.stem}实际为${item.palace}宫天盘${item.role==='lodged'?'寄干':'主干'}，与目标${entry.palace}宫${item.palace===entry.palace?'匹配':'不匹配'}。`):['转盘明干中没有甲；不从旬首遁仪生成甲的天盘位置，本项不判命中或未命中。']),
      ...(entry.note?[entry.note]:[])
    ]};
  });
  const findings=checks.flatMap(check=>check.status==='matched'?check.observations.filter(item=>item.palace===check.targetPalace).map(item=>({stem:check.stem,palace:item.palace,role:item.role,targetBranch:check.targetBranch,ruleId:RULE.id,ruleVersion:RULE.version,evidence:[...check.evidence]})):[]);
  return {version:QIMEN_STEM_TOMBS_VERSION,profile:'qimen-go-explicit-stem-tombs',rules:qimenStemTombRules(),checks,findings,warnings:[
    '这是独立qimen-go固定十干墓支表参考，乙戌乾六与既有三奇乙坤二不同；两个读法不互相覆盖。',
    '甲仅展示原表目标，未直接观测其落宫；不把戊、己等遁仪当作甲来核查。',
    '只检查实际天盘主、寄干，不重复中五副本，不据匹配结果推断吉凶、四害解除或姓名验局。'
  ]};
}
function canonical(value:unknown):string{
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value)){if(Object.keys(value).length!==value.length)throw new Error('Invalid snapshot array');return '['+value.map(canonical).join(',')+']';}
  if(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value))){const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))throw new Error('Invalid snapshot key');return '{'+(keys as string[]).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';}
  throw new Error('Invalid snapshot value');
}
export function validQimenStemTombsSnapshot(value:unknown,palaces:QimenPalace[]):value is QimenStemTombAnalysis{
  try{return canonical(value)===canonical(calculateQimenStemTombs(palaces));}catch{return false;}
}
