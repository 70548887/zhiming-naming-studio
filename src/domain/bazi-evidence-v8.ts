import { calculateMonthAuthority,monthAuthorityRules } from './month-authority-v8';
import { calculateMonthlySeasonal,monthlySeasonalRules } from './monthly-seasonal-v8';
import { calculateSeasonalConditionEvidence,seasonalConditionRules } from './seasonal-conditions-v8';
import { followingPatternRules } from './following-patterns-v8';
import { calculatePatternEvidence } from './pattern-evidence-v8';
import { followingShaRules } from './following-sha-v8';
import type {
  BaziAnalysis, BaziEvidenceAnalysis, BaziEvidenceRule, BaziEvidenceSource,
  BaziRelationFact, Element, FavorableElementOpinion,MonthAuthorityMethod,SeasonalMethod
} from '../shared/types';

export const BAZI_EVIDENCE_VERSION='bazi-evidence-profile/1.6.0';
const PROFILE='selected-clock-midnight;factual-relations;separate-fuyi-seasonal-opinions';
export interface BaziEvidenceContext {
  timezone:string; timeUnknown:boolean; ambiguous:boolean;
  monthAuthorityMethod?:MonthAuthorityMethod;
  seasonalMethod?:SeasonalMethod;
  timeBasisDescription?:string;
  /** Closed ranges used by the selected calculation policy; known folds use the first occurrence only. */
  ranges:{startEpoch:number;endEpoch:number}[];
}
const GAN=[...'甲乙丙丁戊己庚辛壬癸'];
const ELEMENTS:Element[]=['木','火','土','金','水'];
const GAN_ELEMENT:Record<string,Element>={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const HIDDEN:Record<string,string[]>={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const SOURCES:BaziEvidenceSource[]=[
  {id:'bazi-evidence-lunar186',name:'lunar-typescript 1.8.6 固定关系与历算接口',url:'https://github.com/6tail/lunar-typescript',revision:'0f3e95d15e31f1a7c7b93d624542649347328a20',locator:'src/lib/LunarUtil.ts:813–814 HE_GAN_5/HE_ZHI_6,928–1043 SHI_SHEN/ZHI_HIDE_GAN; src/lib/Lunar.ts:1332–1347 getNextJie/getPrevJie',note:'MIT；藏干顺序、十神、五合、六合及十二节接口的所选电子实现；组合出现不等于化气，固定实现不等于独立天文精度验证。'},
  {id:'bazi-evidence-go-ganzhi',name:'qimen-go 固定干支组合表',url:'https://github.com/deminzhang/qimen-go',revision:'4d3f58fa0f401b5b3a337f119138e99e90685dda',locator:'xuan/ganzhi.go:75–133 HeGan/HeZhi/ChongZhi/He3Zhi/Hui3Zhi',note:'MIT；只取三合、三会与六冲组成员事实，不采用其六合化气注释，也不据此宣布格局成立。'},
  {id:'bazi-evidence-project-heuristic',name:'本产品既有扶抑与季节意象启发式',url:'local:data/bazi-evidence-project-profile.json',revision:'project-fuyi-seasonal/1.0.0',locator:'data/bazi-evidence-project-profile.json',note:'项目自编数值与季节意见，非古籍定量公式，非《穷通宝鉴》逐日干逐月用神表；不具备唯一喜用神判定。'}
];
const RULES:BaziEvidenceRule[]=[
  {id:'bazi-hidden-tengod',version:'1.0.0',name:'所选藏干表与相对日主十神',sourceIds:['bazi-evidence-lunar186'],conditions:['只列已确定的柱；时刻未知时不补时柱，交节待定的月柱不补事实。','藏干顺序保留所选电子表列序，序号从1开始；不是司权顺序，也不用于本产品既有扶抑权重。','旧扶抑的巳列序丙戊庚保持不变；本事实表巳列序丙庚戊来自所选lunar-typescript电子表。','按天干阴阳与五行生克列十神；此层不判断喜忌、从格或吉凶。']},
  {id:'bazi-stem-five-combination',version:'1.0.0',name:'天干五合出现核查',sourceIds:['bazi-evidence-lunar186'],conditions:['仅核查四柱已确定的明干中甲己、乙庚、丙辛、丁壬、戊癸配对。','不要求相邻；逐对保留柱位，未评估距离、争合、得时或化神条件。','来源只证配对，不输出候选化气五行或合化成立结论。']},
  {id:'bazi-branch-six-combination',version:'1.0.0',name:'地支六合出现核查',sourceIds:['bazi-evidence-lunar186'],conditions:['仅核查子丑、寅亥、卯戌、辰酉、巳申、午未六组。','只列确定地支的配对，不输出六合化成何行，也不把六合当作统一吉凶。']},
  {id:'bazi-branch-three-combination',version:'1.0.0',name:'地支三合组全支出现',sourceIds:['bazi-evidence-go-ganzhi'],conditions:['只在申子辰、寅午戌、亥卯未、巳酉丑三支全部出现在已确定四柱时记录。','重复地支不替代缺少的第三支；不把半合、拱合或三合组齐全认定为合化。']},
  {id:'bazi-branch-three-meeting',version:'1.0.0',name:'地支三会组全支出现',sourceIds:['bazi-evidence-go-ganzhi'],conditions:['只在亥子丑、寅卯辰、巳午未、申酉戌三支全部出现在已确定四柱时记录。','仅记录完整组成员和实际柱位，不输出力量、化气或吉凶判定。']},
  {id:'bazi-branch-six-clash',version:'1.0.0',name:'地支六冲配对出现',sourceIds:['bazi-evidence-go-ganzhi'],conditions:['只记录子午、丑未、寅申、卯酉、辰戌、巳亥配对的实际柱位。','配对出现不等于凶断；不评估冲动、冲散、旺衰或流年。']},
  {id:'bazi-month-authority',version:'1.0.0',name:'十二节实际区间与待核实的司权取法',sourceIds:['bazi-evidence-lunar186'],conditions:['以相邻十二节划分月令，交节瞬间按 UTC+08:00 历算转换为实际瞬间。','已记录十二节区间，不代表已选定月令分日司权表；未核实分日表前不输出司权。','未知时刻保留当日本地有效时段；重复民用小时按既有政策取第一次实际瞬间，并标注歧义。']},
  {id:'bazi-fuyi-opinion',version:'1.0.0',name:'既有项目扶抑初筛意见',sourceIds:['bazi-evidence-project-heuristic'],conditions:['照录既有扶抑候选，不用本模块新事实改动排序或筛选。','透干1；旧支藏干权重1或0.7/0.3或0.6/0.25/0.15，月支乘2；比印占比小于38%或大于55%作初筛。','全部权重、阈值为产品自编；不宣称来源于古籍或流派公认定量式。']},
  {id:'bazi-seasonal-opinion',version:'1.0.0',name:'季节寒暖意象意见',sourceIds:['bazi-evidence-project-heuristic'],conditions:['只提供现有冬火、夏水季节意象，春秋保留多解。','这不是《穷通宝鉴》的逐日干逐月调候取用；未计算燥湿、具体用神搭配或通关。','不覆盖扶抑、不自动参与姓名排序，所有意见须人工复核。']}
];

/** Fresh copies prevent a consumer from changing the canonical source/rule profile. */
export function baziEvidenceRules():{version:string;profile:string;sources:BaziEvidenceSource[];rules:BaziEvidenceRule[]} {
  const month=monthAuthorityRules();
  const seasonal=monthlySeasonalRules();
  const conditions=seasonalConditionRules();
  const patterns=followingPatternRules();
  const sha=followingShaRules();
  return {version:BAZI_EVIDENCE_VERSION,profile:PROFILE,sources:[...SOURCES.map(source=>({...source})),...month.sources,...seasonal.sources,...conditions.sources,...patterns.sources,...sha.sources],rules:[...RULES.filter(rule=>rule.id!=='bazi-month-authority').map(rule=>({...rule,sourceIds:[...rule.sourceIds],conditions:[...rule.conditions]})),...month.rules,...seasonal.rules,...conditions.rules,...patterns.rules,...sha.rules]};
}
const mod=(n:number)=>((n%5)+5)%5;
function relationToDay(day:string,other:string):string {
  const a=ELEMENTS.indexOf(GAN_ELEMENT[day]),b=ELEMENTS.indexOf(GAN_ELEMENT[other]);
  if(a===b) return '与日主同五行';
  if(mod(a+1)===b) return '日主生此干';
  if(mod(b+1)===a) return '此干生日主';
  return mod(a+2)===b?'日主克此干':'此干克日主';
}
function tenGod(day:string,other:string):string {
  const a=ELEMENTS.indexOf(GAN_ELEMENT[day]),b=ELEMENTS.indexOf(GAN_ELEMENT[other]);
  const same=GAN.indexOf(day)%2===GAN.indexOf(other)%2;
  if(a===b) return same?'比肩':'劫财';
  if(mod(a+1)===b) return same?'食神':'伤官';
  if(mod(a+2)===b) return same?'偏财':'正财';
  if(mod(a+3)===b) return same?'七杀':'正官';
  return same?'偏印':'正印';
}

const STEM_PAIRS=['甲己','乙庚','丙辛','丁壬','戊癸'];
const BRANCH_PAIRS=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
const CLASH_PAIRS=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const THREE_COMBINATIONS=['申子辰','寅午戌','亥卯未','巳酉丑'];
const THREE_MEETINGS=['亥子丑','寅卯辰','巳午未','申酉戌'];
function relations(bazi:BaziAnalysis):BaziRelationFact[] {
  const result:BaziRelationFact[]=[];
  for(let a=0;a<bazi.pillars.length;a++) for(let b=a+1;b<bazi.pillars.length;b++) {
    const first=bazi.pillars[a],second=bazi.pillars[b];
    const stemIndex=STEM_PAIRS.findIndex(pair=>pair===first.gan+second.gan || pair===second.gan+first.gan);
    if(stemIndex>=0) result.push({kind:'stem-combination',label:'天干五合配对',subjects:[first.gan,second.gan],pillars:[first.label,second.label],ruleId:'bazi-stem-five-combination',evidence:[`${first.label}${first.gan}与${second.label}${second.gan}构成${STEM_PAIRS[stemIndex]}五合配对。`,'只记录配对，不输出候选化气五行，不判断合化成立或据此改变五行计数。']});
    if(BRANCH_PAIRS.some(pair=>pair===first.zhi+second.zhi || pair===second.zhi+first.zhi)) result.push({kind:'branch-liuhe',label:'地支六合配对',subjects:[first.zhi,second.zhi],pillars:[first.label,second.label],ruleId:'bazi-branch-six-combination',evidence:[`${first.label}${first.zhi}与${second.label}${second.zhi}在所选六合表中配对；未评估化气或吉凶。`]});
    if(CLASH_PAIRS.some(pair=>pair===first.zhi+second.zhi || pair===second.zhi+first.zhi)) result.push({kind:'branch-clash',label:'地支六冲配对',subjects:[first.zhi,second.zhi],pillars:[first.label,second.label],ruleId:'bazi-branch-six-clash',evidence:[`${first.label}${first.zhi}与${second.label}${second.zhi}在所选六冲表中配对；只记录关系出现，不推断吉凶。`]});
  }
  for(const [groups,kind,label,ruleId] of [[THREE_COMBINATIONS,'branch-sanhe','地支三合组全支出现','bazi-branch-three-combination'],[THREE_MEETINGS,'branch-sanhui','地支三会组全支出现','bazi-branch-three-meeting']] as const)for(const group of groups){
    if(![...group].every(branch=>bazi.pillars.some(pillar=>pillar.zhi===branch)))continue;
    const participants=bazi.pillars.filter(pillar=>group.includes(pillar.zhi));
    result.push({kind,label,subjects:[...group],pillars:participants.map(pillar=>pillar.label),ruleId,evidence:[`${[...group].join('、')}三支均见于${participants.map(pillar=>pillar.label+pillar.zhi).join('、')}。`,'只核实完整组出现，未评估半合、拱合、成局、化气或喜忌。']});
  }
  return result;
}

function opinions(bazi:BaziAnalysis,context:BaziEvidenceContext):FavorableElementOpinion[] {
  const month=bazi.pillars.find(pillar=>pillar.label==='月柱');
  const incomplete=context.timeUnknown || context.ambiguous || !month || bazi.pillars.length!==4;
  const fuyiMissing=[...(context.timeUnknown?['出生时刻未知，缺时柱；扶抑候选来自不完整资料。']:[]),...(context.ambiguous?['重复民用小时采用第一次瞬间，需复核。']:[]),...(!month?['月柱交节待定，暂停扶抑元素候选。']:[]),'未执行从格、化气格或合化条件裁决。'];
  const season=month?.zhi;
  const seasonal:Element[]=season && '亥子丑'.includes(season)?['火']:season && '巳午未'.includes(season)?['水']:[];
  return [
    {method:'fuyi',profile:'project-weighted-fuyi/1.0.0',status:bazi.favorable.length?'candidate':'pending',elements:[...bazi.favorable],unfavorable:[...bazi.unfavorable],evidence:[bazi.strength,...bazi.reasons.filter(reason=>reason.includes('权重') || reason.includes('占比')),'此意见照录原有扶抑初筛，新证据模块不改姓名筛选或排序。'],missing:fuyiMissing,requiresManualReview:true,ruleId:'bazi-fuyi-opinion'},
    {method:'tiaohou',profile:'project-seasonal-imagery/1.0.0',status:seasonal.length?'candidate':'pending',elements:seasonal,unfavorable:[],evidence:[bazi.seasonalAdvice,'本项仅为项目季节寒暖意象，不是《穷通宝鉴》日干×月份调候用神表，不合并成唯一喜用神。'],missing:['未评估完整寒暖燥湿、日干逐月用神组合与通关条件。',...(!seasonal.length?['所选季节没有机械指定元素，保留多解。']:[]),...(incomplete?['出生资料不完整或瞬间有歧义，季节意见须保留人工复核。']:[])],requiresManualReview:true,ruleId:'bazi-seasonal-opinion'}
  ];
}

/** Facts and attributed opinions are intentionally separate from the existing ranking inputs. */
export function calculateBaziEvidence(bazi:BaziAnalysis,context:BaziEvidenceContext):BaziEvidenceAnalysis {
  const day=bazi.pillars.find(pillar=>pillar.label==='日柱');
  if(!day || !GAN_ELEMENT[day.gan]) throw new Error('八字证据需要已确定的日主。');
  if(!context.ranges.length || context.ranges.some(range=>!Number.isFinite(range.startEpoch) || !Number.isFinite(range.endEpoch) || range.startEpoch>range.endEpoch || range.endEpoch-range.startEpoch>3*86400000)) throw new Error('八字证据需要有效且有界的出生瞬间区间。');
  const data=baziEvidenceRules(),found=relations(bazi);
  const stems=bazi.pillars.map(pillar=>({pillar:pillar.label,stem:pillar.gan,element:GAN_ELEMENT[pillar.gan],tenGod:pillar.label==='日柱'?'日主':tenGod(day.gan,pillar.gan),relationToDay:pillar.label==='日柱'?'日主自身':relationToDay(day.gan,pillar.gan),ruleId:'bazi-hidden-tengod'}));
  const hiddenStems=bazi.pillars.flatMap(pillar=>(HIDDEN[pillar.zhi]||[]).map((stem,index)=>({pillar:pillar.label,branch:pillar.zhi,stem,element:GAN_ELEMENT[stem],order:index+1,tenGod:tenGod(day.gan,stem),relationToDay:relationToDay(day.gan,stem),ruleId:'bazi-hidden-tengod'})));
  const monthAuthority=calculateMonthAuthority({...context,method:context.monthAuthorityMethod});
  const monthlySeasonal=calculateMonthlySeasonal(bazi,{method:context.seasonalMethod,timeUnknown:context.timeUnknown,ambiguous:context.ambiguous,monthAuthority,stems,hiddenStems});
  const seasonalConditions=calculateSeasonalConditionEvidence(bazi,{ranges:context.ranges,timeUnknown:context.timeUnknown,ambiguous:context.ambiguous,monthly:monthlySeasonal,facts:{dayMaster:day.gan,stems,hiddenStems,complete:bazi.pillars.length===4&&!context.timeUnknown}});
  const patternEvidence=calculatePatternEvidence(bazi,{timeUnknown:context.timeUnknown,ambiguous:context.ambiguous,monthAuthority,facts:{stems,hiddenStems,complete:bazi.pillars.length===4&&!context.timeUnknown}});
  return {...data,dayMaster:{stem:day.gan,element:GAN_ELEMENT[day.gan]},timeBasis:{timezone:context.timezone,timeUnknown:context.timeUnknown,ambiguous:context.ambiguous,description:context.timeBasisDescription??('出生地民用午夜换日，交节按实际瞬间与北京时间历算比对；未作真太阳时修正。'+(context.ambiguous?'重复民用小时只计算第一次实际瞬间，第二次未计算。':''))},
    stems,hiddenStems,relations:found,monthAuthority,opinions:opinions(bazi,context),
    monthlySeasonal,seasonalConditions,patternEvidence,
    patternCandidates:[{kind:'cong',name:'从格候选',status:'not-evaluated',supportedBy:[],opposedBy:[],missing:['尚未接入可独立复核的同流派从格成立与破格条件；不以五行加权占比阈值断真从。','需明确月令、根气、透干、逆势因素及未知时柱的影响后再分阶段评估。']}],
    transformationEvidence:found.filter(relation=>['stem-combination','branch-liuhe','branch-sanhe','branch-sanhui'].includes(relation.kind)).map(relation=>({kind:relation.kind,subjects:[...relation.subjects],...(relation.candidateElement?{candidateElement:relation.candidateElement}:{}),status:'not-evaluated',supportedBy:[`仅核实${relation.pillars.join('、')}的${relation.subjects.join('、')}组合出现。`],opposedBy:[],missing:['未接入完整同流派得令、透引、阻隔与争合等合化条件；组合出现不等于合化成立。'],ruleId:relation.ruleId})),
    limitations:['事实层只描述本命已确定四柱，不推导大运、流年或命运吉凶。','关系检查覆盖五合、六合、完整三合与三会、六冲；六害、三刑、半合、拱合尚未启用。','扶抑阈值与季节意象都是明确标注的项目启发式；司权、从格及合化不应由它们自动推出。','不同流派可使用不同藏干次序、分日司权与调候取法，不能把某一电子表视为唯一标准。','本模块属于传统文化规则说明，无证据证明姓名会改变命运。']};
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

/** Compare with a fresh calculation bound to trusted birth context, never with imported context. */
export function validBaziEvidenceSnapshot(value:unknown,input:{bazi:BaziAnalysis;context:BaziEvidenceContext}|{expected:BaziEvidenceAnalysis}):value is BaziEvidenceAnalysis {
  try {
    const expected='expected' in input?input.expected:calculateBaziEvidence(input.bazi,input.context);
    const metadata=baziEvidenceRules();
    return canonical(expected.sources)===canonical(metadata.sources) && canonical(expected.rules)===canonical(metadata.rules) && expected.version===BAZI_EVIDENCE_VERSION && expected.profile===PROFILE && canonical(value)===canonical(expected);
  } catch { return false; }
}
