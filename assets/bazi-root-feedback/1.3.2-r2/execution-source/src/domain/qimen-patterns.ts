import type { Element, QimenMarkerRule, QimenPalace, QimenPatternAnalysis, QimenPatternCheck, QimenPatternFinding, QimenPatternLayer } from '../shared/types';

/** This profile reports structural matches, without attaching a good/bad verdict or mapping names into palaces. */
export const QIMEN_PATTERN_VERSION = 'zhuanpan-structural-patterns/1.0.0';
const OUTER=[1,2,3,4,6,7,8,9];
const STEMS=[...'乙丙丁戊己庚辛壬癸'];
const PALACE_ELEMENT:Record<number,Element>={1:'水',2:'土',3:'木',4:'木',6:'金',7:'金',8:'土',9:'火'};
const DOOR_HOME:Record<string,number>={休门:1,死门:2,伤门:3,杜门:4,开门:6,惊门:7,生门:8,景门:9};
const STAR_HOME:Record<string,number>={天蓬:1,天芮:2,天冲:3,天辅:4,天心:6,天柱:7,天任:8,天英:9};
const CONTROLS:Record<Element,Element>={木:'土',火:'金',土:'水',金:'木',水:'火'};
const JIXING:Record<string,number>={戊:3,己:2,庚:8,辛:9,壬:4,癸:4};
const RUMU:Record<string,number>={乙:2,丙:6,丁:8};
const ARC={id:'qimen-arc-structural-patterns',url:'https://github.com/arc119226/qimen_dunjia',commit:'7d941031d685d818d9fd234edf891dba5bd6a323'};
const GO={id:'qimen-go-structural-patterns',url:'https://github.com/deminzhang/qimen-go',commit:'4d3f58fa0f401b5b3a337f119138e99e90685dda'};
const arc=(locator:string)=>({...ARC,locator});
const go=(locator:string)=>({...GO,locator});
const STEM_SCOPE='只核外八宫天盘主干及随天芮落宫的寄干，按实际落宫计算；地盘干与中五展示副本不参与。';
const LAYER_SCOPE='逐一核对外八宫全部八项，不以值符或值使单宫代替整层；中五无独立星门，天禽随天芮以坤二为原位。';
const RULES:QimenMarkerRule[]=[
  {id:'qimen-door-menpo',version:'1.0.0',name:'门迫（门克宫）',sources:[arc('patterns.js:59–71 SOURCES.法竅_迫制註; 384–407 detectMenPo')],conditions:[
    '仅在门五行克落宫五行时命中；宫克门、生扶或同类不记为门迫。',
    '休水；伤杜木；景火；生死土；开惊金。宫行：坎水、震巽木、离火、坤艮土、乾兑金。',
    '核查外八宫，不将中五寄坤产生第九个门。'
  ]},
  {id:'qimen-heaven-yi-jixing',version:'1.0.0',name:'六仪击刑（天盘宽式）',sources:[arc('patterns.js:516–556 JI_XING / detectLiuYiJiXing'),go('xuan/qimen_defs.go:226–235 QM6YiJiXing')],conditions:[
    '采用宽式任一六仪落刑宫，不采用仅值符所带仪的严式；同一仪不再重复记严式结果。',
    '固定仪宫：戊3、己2、庚8、辛9、壬4、癸4。',STEM_SCOPE
  ]},
  {id:'qimen-heaven-qi-rumu',version:'1.0.0',name:'三奇入墓（乙坤、丙乾、丁艮）',sources:[arc('patterns.js:150–158 SOURCES.統宗_四十格 / 旨歸_入墓; 563–579 RU_MU')],conditions:[
    '仅核三奇乙丙丁，固定采用乙入坤二、丙入乾六、丁入艮八的读法，不声称覆盖十干入墓。',
    '丁墓乾六及其他长生表为不同读法，本版本未采用；不得把不同流派的墓宫混成一张表。',STEM_SCOPE
  ]},
  {id:'qimen-stars-fuyin',version:'1.0.0',name:'星盘原位（结构伏吟）',sources:[arc('patterns.js:145–149 SOURCES.釣叟_反吟'),go('xuan/qimen_defs.go:198–205 StarHome / DoorHome')],conditions:[
    LAYER_SCOPE,'本产品按固定原位表定义整层结构伏吟，不把该软件分层定义声称为独立核验古籍原页。',
    '天蓬1、天芮2、天冲3、天辅4、天心6、天柱7、天任8、天英9全部处于原位才命中；不把单干重叠格同名伏吟混入。'
  ]},
  {id:'qimen-stars-fanyin',version:'1.0.0',name:'星盘对宫（结构反吟）',sources:[arc('patterns.js:145–149 SOURCES.釣叟_反吟; 312–330 detectFanYin'),go('xuan/qimen_defs.go:198–205 StarHome / DoorHome')],conditions:[
    LAYER_SCOPE,'本产品把单星对宫条文与固定原位表扩展为整层核查，明确属于软件结构定义。',
    '八星全部到各自原位对宫才命中；对宫固定为1↔9、2↔8、3↔7、4↔6（宫号和为10）。'
  ]},
  {id:'qimen-doors-fuyin',version:'1.0.0',name:'门盘原位（结构伏吟）',sources:[go('xuan/qimen_defs.go:198–205 StarHome / DoorHome')],conditions:[
    LAYER_SCOPE,'本产品按固定门原位表定义的整层结构检查，未声称已核验独立古籍的门层判语。',
    '休1、死2、伤3、杜4、开6、惊7、生8、景9全部处于原位才命中；不与星层合并。'
  ]},
  {id:'qimen-doors-fanyin',version:'1.0.0',name:'门盘对宫（结构反吟）',sources:[go('xuan/qimen_defs.go:198–205 StarHome / DoorHome')],conditions:[
    LAYER_SCOPE,'本产品按固定门原位表及对宫几何定义的整层结构检查，未声称已核验独立古籍的门层判语。',
    '八门全部到各自原位对宫才命中；对宫固定为1↔9、2↔8、3↔7、4↔6（宫号和为10），不与星层合并。'
  ]}
];

/** Fresh copies prevent mutable UI/snapshot objects from changing rule metadata for later charts. */
export function qimenPatternRules():QimenMarkerRule[] {
  return RULES.map(rule=>({...rule,sources:rule.sources.map(source=>({...source})),conditions:[...rule.conditions]}));
}

interface ParsedPalace { number:number; star:string; door:string; stems:{stem:string;lodged:boolean}[]; }

function parsePalaces(palaces:QimenPalace[]):ParsedPalace[] {
  if(!Array.isArray(palaces) || palaces.length!==9 || new Set(palaces.map(p=>p?.number)).size!==9 || palaces.some(p=>!p || !Number.isInteger(p.number) || p.number<1 || p.number>9)) throw new Error('结构辅助需要完整且不重复的九宫盘。');
  const outer=OUTER.map(number=>palaces.find(p=>p.number===number)!);
  const result=outer.map(p=>{
    const heaven=typeof p.heaven==='string'?/^([乙丙丁戊己庚辛壬癸])(?:（寄([乙丙丁戊己庚辛壬癸])）)?$/.exec(p.heaven):null;
    const star=typeof p.star==='string'?/^(天蓬|天芮|天冲|天辅|天心|天柱|天任|天英)(、天禽)?$/.exec(p.star):null;
    if(!heaven || !star || typeof p.door!=='string' || !Object.hasOwn(DOOR_HOME,p.door) || !!star[2]!==!!heaven[2] || (star[2] && star[1]!=='天芮')) throw new Error('结构辅助需要本流派的外八宫星门及主、寄天盘干。');
    return {number:p.number,star:star[1],door:p.door,stems:[{stem:heaven[1],lodged:false},...(heaven[2]?[{stem:heaven[2],lodged:true}]:[])]};
  });
  const allStems=result.flatMap(p=>p.stems.map(s=>s.stem));
  if(new Set(result.map(p=>p.star)).size!==8 || new Set(result.map(p=>p.door)).size!==8 || allStems.length!==9 || new Set(allStems).size!==9 || STEMS.some(s=>!allStems.includes(s))) throw new Error('结构辅助需要八星八门与三奇六仪各出现一次。');
  return result;
}

/** The chart's existing layer assignments are inputs; no additional name-to-palace or fate inference is made. */
export function calculateQimenPatterns(palaces:QimenPalace[]):QimenPatternAnalysis {
  const outer=parsePalaces(palaces),checks:QimenPatternCheck[]=[],findings:QimenPatternFinding[]=[];
  const addCheck=(rule:QimenMarkerRule,layer:QimenPatternLayer,entries:QimenPatternFinding[],evidence:string[])=>{
    checks.push({ruleId:rule.id,ruleVersion:rule.version,layer,status:entries.length?'matched':'not-matched',palaces:[...new Set(entries.flatMap(f=>f.palaces))].sort((a,b)=>a-b),evidence});
    findings.push(...entries);
  };
  const makeFinding=(rule:QimenMarkerRule,kind:QimenPatternFinding['kind'],label:string,layer:QimenPatternLayer,palaces:number[],subjects:string[],evidence:string[]):QimenPatternFinding=>({kind,label,layer,palaces,subjects,ruleId:rule.id,ruleVersion:rule.version,evidence});
  const menpoRule=RULES[0];
  const menpo=outer.filter(p=>CONTROLS[PALACE_ELEMENT[DOOR_HOME[p.door]]]===PALACE_ELEMENT[p.number]).map(p=>makeFinding(menpoRule,'menpo','门迫','doors',[p.number],[p.door],[
    `${p.number}宫${p.door}属${PALACE_ELEMENT[DOOR_HOME[p.door]]}，落宫属${PALACE_ELEMENT[p.number]}，构成门克宫。`
  ]));
  addCheck(menpoRule,'doors',menpo,[
    '外八宫逐门按门克宫核查，未将宫克门计作门迫。',
    ...outer.map(p=>`${p.number}宫${p.door}${PALACE_ELEMENT[DOOR_HOME[p.door]]}→宫${PALACE_ELEMENT[p.number]}：${menpo.some(f=>f.palaces[0]===p.number)?'命中门克宫':'未命中门克宫'}。`)
  ]);
  const stemChecks:[number,'jixing'|'rumu',string,Record<string,number>][]=[[1,'jixing','六仪击刑',JIXING],[2,'rumu','三奇入墓',RUMU]];
  for(const [ruleIndex,kind,label,table] of stemChecks) {
    const rule=RULES[ruleIndex];
    const entries=outer.flatMap(p=>{
      const hits=p.stems.filter(s=>table[s.stem]===p.number);
      return hits.length?[makeFinding(rule,kind,label,'heaven-stems',[p.number],hits.map(s=>s.stem+(s.lodged?'（寄干）':'（主干）')),
        hits.map(s=>`${p.number}宫天盘${s.lodged?'寄干':'主干'}${s.stem}，对应本规则${s.stem}→${table[s.stem]}宫，命中${label}。`))]:[];
    });
    addCheck(rule,'heaven-stems',entries,[STEM_SCOPE,
      kind==='rumu'?'本次仅核乙→2、丙→6、丁→8；丁在乾六不按本版本三奇入墓计。':'本次采用任一六仪的宽式，固定戊→3、己→2、庚→8、辛→9、壬→4、癸→4。',
      ...outer.flatMap(p=>p.stems.filter(s=>Object.hasOwn(table,s.stem)).map(s=>`${p.number}宫${s.stem}${s.lodged?'（寄）':'（主）'}，本规则目标${table[s.stem]}宫：${table[s.stem]===p.number?'命中':'未命中'}。`))
    ]);
  }
  const layerChecks:[number,QimenPatternLayer,boolean][]=[[3,'stars',false],[4,'stars',true],[5,'doors',false],[6,'doors',true]];
  for(const [ruleIndex,layer,opposite] of layerChecks) {
    const rule=RULES[ruleIndex],home=layer==='stars'?STAR_HOME:DOOR_HOME;
    const item=(p:ParsedPalace)=>layer==='stars'?p.star:p.door;
    const target=(p:ParsedPalace)=>opposite?10-home[item(p)]:home[item(p)];
    const matches=outer.filter(p=>p.number===target(p));
    const evidence=[LAYER_SCOPE,
      ...outer.map(p=>`${p.number}宫${item(p)}原位${home[item(p)]}宫，本规则目标${target(p)}宫：${p.number===target(p)?'符合':'不符合'}。`),
      `外八项${matches.length}/8符合${opposite?'对宫':'原位'}条件；${matches.length===8?'整层命中':'整层未命中'}。`
    ];
    const label=(layer==='stars'?'星盘':'门盘')+(opposite?'对宫':'原位')+(opposite?'（结构反吟）':'（结构伏吟）');
    addCheck(rule,layer,matches.length===8?[makeFinding(rule,opposite?'fanyin':'fuyin',label,layer,[...OUTER],outer.map(item),[...evidence])]:[],evidence);
  }
  return {version:QIMEN_PATTERN_VERSION,school:'zhuanpan-chaibu-futou-kun2',rules:qimenPatternRules(),checks,findings,warnings:[
    '本模块只列固定流派的结构匹配与逐项核查，不据此推断人生吉凶、四害解除或姓名验局。',
    '六仪击刑采用天盘宽式，三奇入墓只用乙坤二、丙乾六、丁艮八；地盘、中宫副本及其他流派条件未纳入。',
    '典籍条文使用开源项目的固定版本转录及规则对照，未声称逐页核验全部古籍原本。'
  ]};
}

export function qimenPatternPalaceMarks(patterns:QimenPatternAnalysis|undefined,palace:number):string[] {
  if(!patterns || palace===5) return [];
  return patterns.findings.filter(f=>f.palaces.includes(palace)).map(f=>f.palaces.length===1?`${f.label}（${f.subjects.join('、')}）`:f.label);
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

/** Recompute all checks from plate layers and require exact provenance/evidence; object property order is irrelevant. */
export function validQimenPatternsSnapshot(value:unknown,palaces:QimenPalace[]):value is QimenPatternAnalysis {
  try { return canonical(value)===canonical(calculateQimenPatterns(palaces)); } catch { return false; }
}
