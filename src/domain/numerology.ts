import type { Element, NumerologyAnalysis, NumerologyGrid, NumerologyRuleProfile, SourceRecord, StrokeRecord } from '../shared/types';

export interface NumerologyStrokeData {version:string;sources:SourceRecord[];records:StrokeRecord[];}
export interface NumerologyRules {version:string;profile:NumerologyRuleProfile;sources:SourceRecord[];interpretations:Record<string,{label:string;keyword:string;sourceId:string}>;}
const ELEMENTS:Element[]=['木','火','土','金','水'];
export function numeralElement(value:number):Element {
  if(!Number.isSafeInteger(value)||value<1)throw new Error('数理值必须为正整数。');
  const tail=value%10;return tail===1||tail===2?'木':tail===3||tail===4?'火':tail===5||tail===6?'土':tail===7||tail===8?'金':'水';
}
export function talentRelationship(from:Element,to:Element):string {
  const a=ELEMENTS.indexOf(from),b=ELEMENTS.indexOf(to);
  if(a===b)return `${from}${to}同类`;
  if((a+1)%5===b)return `${from}生${to}`;
  if((b+1)%5===a)return `${to}生${from}（下生上）`;
  if((a+2)%5===b)return `${from}克${to}`;
  return `${to}克${from}（下克上）`;
}
/** Fixed Kumazaki five-grid formula variant, without any 81-cycle reduction. */
export function calculateFiveGrids(surname:number[],given:number[],rules:NumerologyRules):NumerologyGrid[]{
  if(![1,2].includes(surname.length)||![1,2].includes(given.length)||[...surname,...given].some(n=>!Number.isSafeInteger(n)||n<1||n>100))throw new Error('当前五格规则支持一或二字姓氏、一或二字名字，且笔画需为1–100的整数。');
  const sum=(xs:number[])=>xs.reduce((a,b)=>a+b,0),s=sum(surname),g=sum(given);
  const values:[NumerologyGrid['name'],number,string][]=[
    ['天格',s+(surname.length===1?1:0),surname.join(' + ')+(surname.length===1?' + 1（单姓虚数）':'')],
    ['人格',surname[surname.length-1]+given[0],`${surname[surname.length-1]}（姓末） + ${given[0]}（名首）`],
    ['地格',g+(given.length===1?1:0),given.join(' + ')+(given.length===1?' + 1（单名虚数）':'')],
    ['外格',(surname.length===1?1:surname[0])+(given.length===1?1:given[given.length-1]),`${surname.length===1?'1（单姓虚数）':surname[0]+'（姓首）'} + ${given.length===1?'1（单名虚数）':given[given.length-1]+'（名末）'}`],
    ['总格',s+g,[...surname,...given].join(' + ')]
  ];
  return values.map(([name,value,formula])=>({name,value,formula,element:numeralElement(value),...(value<=81&&rules.interpretations[String(value)]?{interpretation:rules.interpretations[String(value)]}:{})}));
}
/** Never uses ordinary character strokes. An unresolved glyph or conflicting source requires review. */
export function analyzeNumerology(surname:string,givenName:string,data:NumerologyStrokeData,rules:NumerologyRules,selections:Record<string,string>={}):NumerologyAnalysis {
  const s=[...surname],g=[...givenName],chars=[...s,...g];
  if(!selections||typeof selections!=='object'||Array.isArray(selections)||Object.entries(selections).some(([key,value])=>!/^\d+$/.test(key)||Number(key)>=chars.length||typeof value!=='string'))throw new Error('笔画字形选择格式无效。');
  const supported=[1,2].includes(s.length)&&[1,2].includes(g.length);
  const strokes=chars.map((inputChar,position)=>{
    const options=data.records.filter(r=>r.character===inputChar);
    let selectedRecordId=selections[String(position)];
    if(selectedRecordId&&!options.some(r=>r.id===selectedRecordId))throw new Error(`“${inputChar}”的选形不属于当前可核对资料，请重新选择。`);
    // A unique mapped traditional form still needs user confirmation; exact unambiguous forms may be used.
    if(!selectedRecordId&&options.length===1&&options[0].glyph===inputChar)selectedRecordId=options[0].id;
    return {position,inputChar,role:position<s.length?'surname' as const:'given' as const,options,selectedRecordId,status:selectedRecordId?'selected' as const:options.length?'ambiguous' as const:'missing' as const};
  });
  const warnings=[
    '五格及81数理属于所载传统规则版本的文化参考；不表示命运、能力或心理测量，也不参与综合名字评分。',
    '按所选字形的来源表计数，普通笔画不替代康熙计数；原文字形、部首计数表和现代姓名表可能存在分歧。',
    '81分类采用所注明MIT开源固定版本，不宣称已逐项核验熊崎原典；不据此作人生结果保证。'
  ];
  if(!supported)warnings.push('当前规则只支持单姓/二字复姓与单字/双字名，未将三字以上姓氏自动拆分。');
  for(const choice of strokes)if(choice.status==='missing')warnings.push(`“${choice.inputChar}”尚无可核对的康熙笔画来源，暂停五格结论。`);else if(choice.status==='ambiguous')warnings.push(`“${choice.inputChar}”的字形映射或计数来源需确认，请选择实际使用的记录。`);
  const result:NumerologyAnalysis={status:!supported?'unsupported':strokes.some(c=>c.status!=='selected')?'pending':'complete',fullName:surname+givenName,rule:structuredClone(rules.profile),dataVersion:data.version,strokes,grids:[],warnings};
  if(result.status!=='complete')return result;
  const counts=strokes.map(c=>c.options.find(r=>r.id===c.selectedRecordId)!.count);
  result.grids=calculateFiveGrids(counts.slice(0,s.length),counts.slice(s.length),rules);
  const elements=result.grids.slice(0,3).map(c=>c.element);
  const relationships=[{from:elements[0],to:elements[1],relation:talentRelationship(elements[0],elements[1])},{from:elements[1],to:elements[2],relation:talentRelationship(elements[1],elements[2])}];
  result.threeTalents={elements,relationships,description:`天格、人格、地格末位取五行：${elements.join(' / ')}；${relationships.map(r=>r.relation).join('；')}。仅列生克方向，不套用未经审定的125种三才吉凶判文。`};
  if(result.grids.some(c=>c.value>81))result.warnings.push('部分原始格数超过81，本版保留原数和末位五行，不循环减80，不给81表之外的判语。');
  return result;
}
export function numerologySelections(analysis:NumerologyAnalysis):Record<string,string>{return Object.fromEntries(analysis.strokes.filter(s=>s.selectedRecordId).map(s=>[String(s.position),s.selectedRecordId!]));}
export function validNumerologySnapshot(value:unknown,surname:string,givenName:string):value is NumerologyAnalysis {
  const n=value as NumerologyAnalysis;if(!n||typeof n!=='object'||!['complete','pending','unsupported'].includes(n.status)||n.fullName!==surname+givenName||typeof n.dataVersion!=='string'||!n.rule||['id','version','name','strokePolicy','formulaConvention'].some(k=>typeof (n.rule as any)[k]!=='string')||!Array.isArray(n.strokes)||!Array.isArray(n.grids)||!Array.isArray(n.warnings)||n.warnings.some(w=>typeof w!=='string'))return false;
  const chars=[...surname,...givenName];if(n.strokes.length!==chars.length)return false;
  for(const [i,c]of n.strokes.entries()){
    if(!c||c.position!==i||c.inputChar!==chars[i]||c.role!==(i<[...surname].length?'surname':'given')||!['selected','missing','ambiguous'].includes(c.status)||!Array.isArray(c.options)||c.options.some(r=>!r||typeof r!=='object')||new Set(c.options.map(r=>r.id)).size!==c.options.length)return false;
    if(c.options.some(r=>!r||['id','character','glyph','sourceId','sourceLocator','note'].some(k=>typeof (r as any)[k]!=='string')||r.character!==c.inputChar||[...r.glyph].length!==1||!Number.isInteger(r.count)||r.count<1||r.count>100))return false;
    if(c.status==='selected'?!c.selectedRecordId||!c.options.some(r=>r.id===c.selectedRecordId):c.selectedRecordId!==undefined)return false;
    if(c.status==='missing'&&c.options.length||c.status==='ambiguous'&&!c.options.length)return false;
  }
  const supported=[1,2].includes([...surname].length)&&[1,2].includes([...givenName].length),complete=n.strokes.every(c=>c.status==='selected');
  if(n.status!==(!supported?'unsupported':complete?'complete':'pending'))return false;
  if(n.status!=='complete')return n.grids.length===0&&n.threeTalents===undefined;
  const counts=n.strokes.map(c=>c.options.find(r=>r.id===c.selectedRecordId)!.count),expected=calculateFiveGrids(counts.slice(0,[...surname].length),counts.slice([...surname].length),{version:'',profile:n.rule,sources:[],interpretations:{}});
  if(n.grids.length!==5||n.grids.some((g,i)=>!g||g.name!==expected[i].name||g.value!==expected[i].value||g.formula!==expected[i].formula||g.element!==expected[i].element||g.value>81&&g.interpretation!==undefined||g.interpretation&&['label','keyword','sourceId'].some(k=>typeof (g.interpretation as any)[k]!=='string')))return false;
  const e=expected.slice(0,3).map(g=>g.element),t=n.threeTalents;
  return !!t&&Array.isArray(t.elements)&&t.elements.join()===e.join()&&typeof t.description==='string'&&Array.isArray(t.relationships)&&t.relationships.length===2&&t.relationships.every((r,i)=>r.from===e[i]&&r.to===e[i+1]&&r.relation===talentRelationship(e[i],e[i+1]));
}
