import type { QimenAuxiliaryAnalysis, QimenAuxiliaryMarker, QimenMarkerRule } from '../shared/types';

/** Only hour-based auxiliary facts belong to this profile; base plate rules are versioned separately. */
export const QIMEN_AUXILIARY_VERSION = 'hour-xunkong-yima/1.0.0';
const GAN=[...'甲乙丙丁戊己庚辛壬癸'];
const ZHI=[...'子丑寅卯辰巳午未申酉戌亥'];
const JIAZI=Array.from({length:60},(_,index)=>GAN[index%10]+ZHI[index%12]);
const BRANCH_PALACE:Record<string,number>={子:1,丑:8,寅:8,卯:3,辰:4,巳:4,午:9,未:2,申:2,酉:7,戌:6,亥:6};
const XUN_VOID=[['戌','亥'],['申','酉'],['午','未'],['辰','巳'],['寅','卯'],['子','丑']];
const HORSE_GROUPS=[{branches:'申子辰',horse:'寅'},{branches:'寅午戌',horse:'申'},{branches:'巳酉丑',horse:'亥'},{branches:'亥卯未',horse:'巳'}];
const ARC_SOURCE={id:'qimen-arc-markers',url:'https://github.com/arc119226/qimen_dunjia',commit:'7d941031d685d818d9fd234edf891dba5bd6a323',locator:'constants.js:627–632,651–659; test.js:527–549'};
const GO_SOURCE={id:'qimen-go-markers',url:'https://github.com/deminzhang/qimen-go',commit:'4d3f58fa0f401b5b3a337f119138e99e90685dda',locator:'xuan/ganzhi.go:31–46,141–148; xuan/qimen.go:182–190'};
const RULES:QimenMarkerRule[]=[
  {id:'qimen-hour-xunkong',version:'1.0.0',name:'时柱六旬旬空',sources:[ARC_SOURCE,GO_SOURCE],conditions:[
    '输入为已确定时柱的有效六十甲子，以时柱所属的十干一旬取两支旬空，不取年柱或日柱。',
    '地支按固定后天九宫映射：子1，丑寅8，卯3，辰巳4，午9，未申2，酉7，戌亥6。',
    '同宫两空支合并显示；中宫5无地支，不因中五寄坤或天盘旋转而转移旬空。'
  ]},
  {id:'qimen-hour-yima',version:'1.0.0',name:'时支三合组驿马',sources:[GO_SOURCE],conditions:[
    '仅按已确定时柱的时支取驿马，不使用年支、日支或姓名笔画。',
    '申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳。',
    '马支按固定地支宫位标记，不随阴阳遁、盘层转动或中五寄坤改变。'
  ]}
];

/** Fixed branch membership, deliberately independent of the rotating star/door/earth layers. */
export function calculateQimenAuxiliary(hourGanzhi:string):QimenAuxiliaryAnalysis {
  const hourIndex=JIAZI.indexOf(hourGanzhi);
  if(hourIndex<0) throw new Error('辅助标记需要有效的六十甲子时柱。');
  const xunIndex=Math.floor(hourIndex/10),xunHead=JIAZI[xunIndex*10],xunEnd=JIAZI[xunIndex*10+9];
  const voidBranches=[...XUN_VOID[xunIndex]],voidPalaces=[...new Set(voidBranches.map(branch=>BRANCH_PALACE[branch]))].sort((a,b)=>a-b);
  const hourBranch=hourGanzhi[1],group=HORSE_GROUPS.find(item=>item.branches.includes(hourBranch))!;
  const horsePalace=BRANCH_PALACE[group.horse];
  const markers:QimenAuxiliaryMarker[]=[
    {kind:'xunkong',label:'时旬空',branches:voidBranches,palaces:voidPalaces,ruleId:RULES[0].id,ruleVersion:RULES[0].version,evidence:[
      `时柱${hourGanzhi}属${xunHead}旬（${xunHead}至${xunEnd}）。`,
      `本旬十干配支后余${voidBranches.join('、')}，取为时旬空；固定支宫为${voidBranches.map(branch=>`${branch}→${BRANCH_PALACE[branch]}宫`).join('、')}。`,
      '仅标两支所在固定宫位，不判断真空、假空、冲空、填实或吉凶。'
    ]},
    {kind:'yima',label:'时驿马',branches:[group.horse],palaces:[horsePalace],ruleId:RULES[1].id,ruleVersion:RULES[1].version,evidence:[
      `时柱${hourGanzhi}的时支${hourBranch}属${[...group.branches].join('、')}三合组，按该组取马在${group.horse}。`,
      `马支${group.horse}固定落${horsePalace}宫，不取年支、日支，也不随转盘或寄中改变。`
    ]}
  ];
  return {version:QIMEN_AUXILIARY_VERSION,hourGanzhi,scope:'hour',rules:RULES.map(rule=>({...rule,sources:rule.sources.map(source=>({...source})),conditions:[...rule.conditions]})),markers,
    warnings:['本模块仅列时柱旬空与时支驿马的规则事实，不推导姓名落宫或吉凶结论。']};
}

/** One label per marker and palace, retaining the actual branches that hit this palace. */
export function qimenAuxiliaryPalaceMarks(aux:QimenAuxiliaryAnalysis|undefined,palace:number):string[] {
  if(!aux || palace===5) return [];
  return aux.markers.filter(marker=>marker.palaces.includes(palace)).map(marker=>`${marker.label}（${marker.branches.filter(branch=>BRANCH_PALACE[branch]===palace).join('、')}）`);
}

function canonical(value:unknown):string {
  if(value===null || typeof value==='string' || typeof value==='boolean') return JSON.stringify(value);
  if(typeof value==='number' && Number.isFinite(value)) return JSON.stringify(value);
  if(Array.isArray(value)) {
    if(Object.keys(value).length!==value.length) throw new Error('Invalid snapshot array');
    return '['+Array.from(value,canonical).join(',')+']';
  }
  if(typeof value==='object' && value!==null && [Object.prototype,null].includes(Object.getPrototypeOf(value))) {
    const keys=Reflect.ownKeys(value);
    if(keys.some(key=>typeof key!=='string')) throw new Error('Invalid snapshot key');
    return '{'+(keys as string[]).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  }
  throw new Error('Invalid snapshot value');
}

/** Imported snapshots must preserve this exact rule/source/result version; object key order is immaterial. */
export function validQimenAuxiliarySnapshot(aux:unknown):aux is QimenAuxiliaryAnalysis {
  try {
    if(!aux || typeof aux!=='object' || !('hourGanzhi' in aux) || typeof aux.hourGanzhi!=='string') return false;
    return canonical(aux)===canonical(calculateQimenAuxiliary(aux.hourGanzhi));
  } catch { return false; }
}
