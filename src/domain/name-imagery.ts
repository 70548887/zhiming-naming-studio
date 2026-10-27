import profileData from '../../data/name-imagery-profile.json';
import type {BirthProfile,CharacterEntry,Element,NameCandidate,NameImageryAnalysis,NameImageryObservation,NameImageryPalaceReading,NameImageryProfile,NameImagerySourceReference,QimenChart,QimenMarkerRule} from '../shared/types';

export const NAME_IMAGERY_VERSION='project-character-imagery-outer-palace-set/1.0.0' as const;
export const NAME_IMAGERY_PROJECT_SOURCE_ID='project-name-imagery-outer-palaces-v1';
export const NAME_IMAGERY_ARC_SOURCE_ID='name-imagery-arc-palace-elements';
const ELEMENTS:Element[]=['木','火','土','金','水'];
const OUTER=[1,2,3,4,6,7,8,9];
export interface NameImageryMetadata {profile:NameImageryProfile;chartSha256:string;}

function canonical(value:unknown,depth=0):string {
  if(depth>80)throw new Error('意象对读结构过深。');
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value)){
    const keys=Reflect.ownKeys(value);if(keys.length!==value.length+1||keys.some(key=>typeof key!=='string'||key!=='length'&&!/^(0|[1-9]\d*)$/.test(key)))throw new Error('意象对读数组含额外字段或空位。');
    return '['+Array.from({length:value.length},(_,index)=>{const descriptor=Object.getOwnPropertyDescriptor(value,String(index));if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('意象对读数组不得为访问器。');return canonical(descriptor.value,depth+1);}).join(',')+']';
  }
  if(value&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value))){const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key!=='string'))throw new Error('意象对读键无效。');return '{'+(keys as string[]).sort().map(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!Object.hasOwn(descriptor,'value'))throw new Error('意象对读对象不得为访问器。');return JSON.stringify(key)+':'+canonical(descriptor.value,depth+1);}).join(',')+'}';}
  throw new Error('意象对读快照含无效值。');
}
export function nameImageryProfile():NameImageryProfile {
  const profile=profileData as NameImageryProfile;
  if(profile.version!==NAME_IMAGERY_VERSION||profile.mode!==NAME_IMAGERY_VERSION||profile.authority!=='project-experimental'||profile.labelSourceId!=='editorial-rules'||profile.sourceIds.length!==2||!profile.sourceIds.includes(NAME_IMAGERY_PROJECT_SOURCE_ID)||!profile.sourceIds.includes(NAME_IMAGERY_ARC_SOURCE_ID))throw new Error('文化意象实验版本不完整。');
  return structuredClone(profile);
}
function ruleReferences(rule:QimenMarkerRule|undefined):NameImagerySourceReference[]{return(rule?.sources??[]).map(source=>({id:source.id,version:source.commit,locator:source.locator,note:'保存奇门规则原有来源，仅用于照读该盘结构；不提供姓名映射或效果判断。'}));}
function references(chart:QimenChart):NameImagerySourceReference[]{return [...chart.auxiliary?.rules??[],...chart.patterns?.rules??[],...chart.stemTombs?.rules??[]].flatMap(ruleReferences);}

/** Project set projection onto the unchanged saved chart. No clock, stroke, surname or ranking calculation. */
export function calculateNameImageryReading(surname:string,givenName:string,characters:CharacterEntry[],qimen:QimenChart,metadata:NameImageryMetadata):NameImageryAnalysis {
  if(typeof surname!=='string'||!/^\p{Script=Han}{1,4}$/u.test(surname))throw new Error('文化意象对读的姓氏须保留1–4个汉字原值。');
  if(typeof givenName!=='string'||!/^\p{Script=Han}{1,2}$/u.test(givenName))throw new Error('文化意象对读仅支持1或2字给名。');
  canonical(metadata);
  if(!metadata||typeof metadata.chartSha256!=='string'||!/^[a-f0-9]{64}$/.test(metadata.chartSha256))throw new Error('文化意象对读需要完整保存奇门盘的SHA-256。');
  const profile=nameImageryProfile();if(canonical(metadata.profile)!==canonical(profile))throw new Error('文化意象实验映射与固定版本不一致。');
  canonical(qimen);canonical(characters);
  if(!qimen||typeof qimen.available!=='boolean'||typeof qimen.version!=='string'||!Array.isArray(qimen.palaces))throw new Error('文化意象对读需要已保存的奇门快照。');
  if(qimen.available&&(qimen.palaces.length!==9||new Set(qimen.palaces.map(palace=>palace.number)).size!==9||qimen.palaces.some(palace=>!Number.isInteger(palace.number)||palace.number<1||palace.number>9)))throw new Error('保存奇门盘的九宫位置不完整。');
  if(!qimen.available&&qimen.palaces.length)throw new Error('未知奇门盘不得保留假定宫位。');
  const chars=[...givenName];if(!Array.isArray(characters)||characters.length!==chars.length)throw new Error('文化意象字位必须与候选保存记录逐字对应。');
  const characterRows=chars.map((char,index)=>{
    const entry=characters[index];if(!entry||entry.char!==char||typeof entry.pinyin!=='string'||!entry.pinyin.trim()||typeof entry.elementBasis!=='string'||typeof entry.sourceId!=='string'||!entry.sourceId||!Array.isArray(entry.elements)||entry.elements.some(element=>!ELEMENTS.includes(element)))throw new Error('文化意象字形、读音、元素或来源与候选字位不一致。');
    const palaces=[...new Set(entry.elements.flatMap(element=>profile.elementPalaces[element]))].sort((a,b)=>a-b);
    if(palaces.some(number=>!OUTER.includes(number)))throw new Error('实验文字集合只能映射外八宫。');
    return {index,char,pinyin:entry.pinyin,elements:[...entry.elements],labelBasis:entry.elementBasis,labelSourceId:'editorial-rules' as const,dictionarySourceId:entry.sourceId,state:entry.elements.length?'mapped' as const:'unresolved' as const,palaces,chartObservationStatus:qimen.available?'assessed-saved-intersection' as const:'not-assessed' as const,missing:[...(!entry.elements.length?['本字项目元素标签未定；不从寓意、偏旁、读音、普通或康熙笔画、AI猜补。']:[]),...(!qimen.available?['没有唯一保存出生奇门盘，只列静态意象集合，不补盘内观察。']:[])]};
  });
  const unionPalaces=[...new Set(characterRows.flatMap(row=>row.palaces))].sort((a,b)=>a-b);
  const wholeLayerRulesNotAssigned=[...new Set((qimen.patterns?.findings??[]).filter(finding=>['fuyin','fanyin'].includes(finding.kind)).map(finding=>finding.ruleId))];
  const palaceReadings:NameImageryPalaceReading[]=qimen.available?unionPalaces.map(number=>{
    const snapshot=qimen.palaces.find(palace=>palace.number===number)!;
    const observations:NameImageryObservation[]=[];
    for(const marker of qimen.auxiliary?.markers??[]){if(!marker.palaces.includes(number))continue;const rule=qimen.auxiliary!.rules.find(item=>item.id===marker.ruleId);if(!rule)throw new Error('保存旬空或驿马标记缺少对应规则来源。');observations.push({category:'auxiliary',kind:marker.kind,label:marker.label,palace:number,ruleId:marker.ruleId,ruleVersion:marker.ruleVersion,subjects:marker.branches.filter(branch=>profile.palaceBranches[String(number)].includes(branch)),evidence:[...marker.evidence],sourceReferences:ruleReferences(rule),status:'saved-structure-intersection',nameEffect:'not-evaluated'});}
    for(const finding of qimen.patterns?.findings??[]){if(!['menpo','jixing','rumu'].includes(finding.kind)||!finding.palaces.includes(number))continue;const rule=qimen.patterns!.rules.find(item=>item.id===finding.ruleId);if(!rule)throw new Error('保存盘结构缺少对应规则来源。');observations.push({category:'pattern',kind:finding.kind,label:finding.label,palace:number,ruleId:finding.ruleId,ruleVersion:finding.ruleVersion,subjects:[...finding.subjects],evidence:[...finding.evidence],sourceReferences:ruleReferences(rule),status:'saved-structure-intersection',nameEffect:'not-evaluated'});}
    for(const finding of qimen.stemTombs?.findings??[]){if(finding.palace!==number)continue;const rule=qimen.stemTombs!.rules.find(item=>item.id===finding.ruleId);if(!rule)throw new Error('保存墓支表结果缺少对应规则来源。');observations.push({category:'stem-tomb',kind:'explicit-stem-tomb',label:'独立十干墓支表 · 显式'+(finding.role==='principal'?'主干':'寄干'),palace:number,ruleId:finding.ruleId,ruleVersion:finding.ruleVersion,subjects:[finding.stem,finding.targetBranch],evidence:[...finding.evidence],sourceReferences:ruleReferences(rule),status:'saved-structure-intersection',nameEffect:'not-evaluated'});}
    return {palace:number,characterIndexes:characterRows.filter(row=>row.palaces.includes(number)).map(row=>row.index),snapshot:structuredClone(snapshot),observations,intersectionStatus:observations.length?'registered-intersection':'no-registered-intersection',note:observations.length?'只照读原保存盘在本宫已登记的位置结构；不是名字造成或解除的作用。':'本宫未见所查已登记位置结构的交集；这不是好名通过、无害或已解除四害。'};
  }):[];
  const allRefs=[...profile.sourceReferences,...references(qimen)],sourceReferences=[...new Map(allRefs.map(reference=>[canonical(reference),reference])).values()].map(reference=>({...reference}));
  return {version:NAME_IMAGERY_VERSION,mode:NAME_IMAGERY_VERSION,authority:'project-experimental',status:!qimen.available?'chart-unavailable':characterRows.some(row=>row.state==='unresolved')?'partial':'mapped',surnameContext:surname,surnameMapping:'not-performed',givenName,characterRows,unionPalaces,palaceReadings,chart:{sha256:metadata.chartSha256,version:qimen.version,available:qimen.available,observationStatus:qimen.available?'assessed-saved-intersection':'not-assessed'},sourceReferences,sourceIds:[...new Set(sourceReferences.map(reference=>reference.id))],profile,wholeLayerRulesNotAssigned,formationDecision:'not-evaluated',nameEffect:'not-evaluated',trueVoid:'not-evaluated',trueTomb:'not-evaluated',fourHarmRemoval:'not-performed',goodBadScore:null,limitations:[...profile.policies,'字符标签、字典义项与宫元素表是不同来源；姓氏只作背景，原名字顺序、重复字位和多元素均保留。','所列是同一保存盘与项目意象宫集合的交集；无交集不证明吉利，命中结构不等于名字不宜。','本实验没有传统姓名落宫、命星、四害解除、真假空墓或效用推断，不宣称通过姓名验局。',...(!qimen.auxiliary?['本保存盘没有辅助标记快照，不按今天规则回填旬空或驿马。']:[]),...(!qimen.patterns?['本保存盘没有盘层结构快照，不补算结构。']:[]),...(!qimen.stemTombs?['本保存盘没有独立墓支表快照，不补算或混入其他墓表。']:[])]};
}

/** Main callers must provide a freshly computed SHA of the canonical saved chart, never a candidate-authored hash. */
export function validNameImageryAnalysis(value:unknown,profile:BirthProfile,candidate:Pick<NameCandidate,'givenName'|'characters'>,qimen:QimenChart,metadata:NameImageryMetadata):value is NameImageryAnalysis {
  try{return canonical(value)===canonical(calculateNameImageryReading(profile.surname,candidate.givenName,candidate.characters,qimen,metadata));}catch{return false;}
}
