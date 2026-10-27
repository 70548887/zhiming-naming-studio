import {join,dirname} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {loadVerifiedElementPackage} from '../../data/element-object/load-verified-element-package.mjs';
import {canonicalPlainJson,confirmElementAssessment} from '../../data/element-object/lookup-element-assessment.mjs';
import type {ObjectOverlay,ElementPlanBinding} from '../../data/element-object/lookup-element-assessment.mjs';
import type {FactArchive} from './candidate-facts';
import type {NamingSession,NameCandidate,SourceRecord} from '../shared/types';
import type {ElementAssessmentChoiceInput,ElementAssessmentPreferences,ElementCandidateAssessment,ElementAssessmentRow} from '../shared/element-assessment';
import {ELEMENT_ASSESSMENT_SOURCE_ID,ELEMENT_ASSESSMENT_PROFILE,ELEMENT_ASSESSMENT_LOCK} from '../shared/element-assessment';
import {isNamingV7BaseRuleVersion} from '../shared/naming-rules';

const PACK='1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b';
const VERSION='1875aa49dcfa';
export const ELEMENT_ASSESSMENT_SOURCE:SourceRecord={id:ELEMENT_ASSESSMENT_SOURCE_ID,name:'固定辞书原义与项目物象采用意见',url:'',commit:ELEMENT_ASSESSMENT_PROFILE,license:'CC0-1.0 project conventions;MOE verbatim evidence CC-BY-ND-3.0-TW;Unicode License',files:['element-object/source-lock.json','element-object/profile.json','element-object/element-overlay.json','element-object/source-excerpts.json'],sha256:ELEMENT_ASSESSMENT_LOCK,note:'项目物象约定；须人工选择确切原义与条件，采用意见不证明现实条件，也不等于传统汉字五行。'};
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
freeze(ELEMENT_ASSESSMENT_SOURCE);
function same(a:unknown,b:unknown){return canonicalPlainJson(a)===canonicalPlainJson(b);}
function exact(value:unknown,keys:string[]):asserts value is Record<string,unknown>{canonicalPlainJson(value);if(!value||typeof value!=='object'||Array.isArray(value)||!same(Object.keys(value).sort(),[...keys].sort()))throw Error('人工意象选择字段无效。');}
export function assertElementInput(value:unknown):void {
 if(!value||typeof value!=='object')return;
 for(const name of ['elementAssessmentPreferences','candidates','preferences']){
  const d=Object.getOwnPropertyDescriptor(value,name);if(d&&!Object.hasOwn(d,'value'))throw Error('人工意象资料不接受访问器。');
  if(name==='elementAssessmentPreferences'&&d)canonicalPlainJson(d.value);
  if(name==='preferences'&&d?.value){const p=Object.getOwnPropertyDescriptor(d.value,'elementAssessment');if(p&&(!Object.hasOwn(p,'value')||p.value!==undefined&&typeof p.value!=='boolean'))throw Error('人工意象开关只接受布尔值且不接受访问器。');}
  if(name==='candidates'&&Array.isArray(d?.value))for(let i=0;i<d.value.length;i++){
   const row=Object.getOwnPropertyDescriptor(d.value,String(i));if(!row||!Object.hasOwn(row,'value'))throw Error('人工意象候选不接受稀疏项或访问器。');
   const field=row.value&&Object.getOwnPropertyDescriptor(row.value,'elementAssessment');if(field){if(!Object.hasOwn(field,'value'))throw Error('人工意象快照不接受访问器。');canonicalPlainJson(field.value);}
  }
 }
}
export function assertUnchangedElementAssessment(incoming:NamingSession,saved:NamingSession):void {
 assertElementInput(incoming);
 const compare=(a:object,b:object,key:string)=>{const x=Object.getOwnPropertyDescriptor(a,key),y=Object.getOwnPropertyDescriptor(b,key);if(!!x!==!!y||x&&!isDeepStrictEqual(x.value,y?.value))throw Error('人工意象记录只可通过专门确认接口修改，普通审阅不得附加、删改或替换。');};
 compare(incoming,saved,'elementAssessmentPreferences');
 if(incoming.preferences.elementAssessment!==saved.preferences.elementAssessment)throw Error('人工意象开关不得通过普通审阅改变。');
 for(const c of incoming.candidates){const old=saved.candidates.find(x=>x.id===c.id);if(!old)throw Error('候选不存在。');compare(c,old,'elementAssessment');}
}
export class ElementAssessmentPackage {
 readonly #overlay:ObjectOverlay;
 constructor(dataDir:string){this.#overlay=loadVerifiedElementPackage(join(dataDir,'element-object'),ELEMENT_ASSESSMENT_LOCK,dirname(dataDir));}
 private eligible(s:NamingSession,archive:FactArchive|undefined):asserts archive is FactArchive {
  if(!isNamingV7BaseRuleVersion(s.namingRules?.version)||!archive||archive.sha256!==PACK||archive.version!==VERSION||s.dataVersion!==archive.version)throw Error('人工意象确认仅适用于该方案实际归档的命名7固定完整知识包；旧版或自定义包不补字段。');
  const originals=new Map(archive.dataset.characters.map(c=>[c.char,c]));
  for(const candidate of s.candidates)for(const c of candidate.characters)if(!isDeepStrictEqual(c,originals.get(c.char)))throw Error('人工意象用字与该方案原知识包字音义不一致。');
 }
 private choices(candidate:NameCandidate,input:unknown):ElementAssessmentChoiceInput[]{
  canonicalPlainJson(input);if(!Array.isArray(input)||input.length!==candidate.characters.length)throw Error('请完整提交该候选逐字采用意见。');
  const seen=new Set<number>();
  for(const c of input){exact(c,['position','decision','confirmedEvidenceIds']);if(!Number.isInteger(c.position)||Number(c.position)<1||Number(c.position)>candidate.characters.length||seen.has(Number(c.position))||!['unconfirmed','confirmed','not-applicable'].includes(String(c.decision))||!Array.isArray(c.confirmedEvidenceIds)||c.confirmedEvidenceIds.some(id=>typeof id!=='string')||new Set(c.confirmedEvidenceIds).size!==c.confirmedEvidenceIds.length||(c.decision==='confirmed'?c.confirmedEvidenceIds.length===0:c.confirmedEvidenceIds.length!==0))throw Error('人工意象采用意见、位置或义项编号无效。');seen.add(Number(c.position));}
  return structuredClone(input as ElementAssessmentChoiceInput[]).sort((a,b)=>a.position-b.position);
 }
 private snapshot(s:NamingSession,candidate:NameCandidate,input:unknown):ElementCandidateAssessment {
  const choices=this.choices(candidate,input);
  const rows:ElementAssessmentRow[]=candidate.characters.map((c,index)=>{
   const choice=choices[index],source=this.#overlay.rows.find(row=>row.char===c.char&&row.defaultPinyin===c.pinyin);
   if(!source){if(choice.decision==='confirmed')throw Error('该字或默认读音未覆盖，不可确认意象。');return {char:c.char,pinyin:c.pinyin,binding:null,...choice,assessment:null,unavailableReason:'本独立项目原义审阅未覆盖该字或读音；保留原字库标签。'};}
   const binding:ElementPlanBinding={planScope:JSON.stringify([s.id,candidate.id,index+1]),char:c.char,pinyin:c.pinyin,sourceEntrySha256:source.sourceBinding.sourceEntrySha256,sourceReadingSha256:source.sourceBinding.sourceReadingSha256};
   const selection=choice.decision==='confirmed'?{profileId:ELEMENT_ASSESSMENT_PROFILE,...binding,confirmedEvidenceIds:choice.confirmedEvidenceIds}:null;
   const assessment=confirmElementAssessment(this.#overlay,binding,selection);
   if(choice.decision==='confirmed'&&(assessment.selectionStatus!=='sense-confirmed'||!assessment.effectiveElements.length))throw Error('所选原义或限定对象不适用或彼此冲突，未保存。');
   return {char:c.char,pinyin:c.pinyin,binding,...choice,assessment,unavailableReason:assessment.matchingSourceCandidates.length?'':'固定原义下没有可采用的直接物象候选。'};
  });
  return freeze({version:'element-assessment-snapshot/1.0.0',profileId:ELEMENT_ASSESSMENT_PROFILE,sourceLockSha256:ELEMENT_ASSESSMENT_LOCK,sessionId:s.id,candidateId:candidate.id,sourceIds:[ELEMENT_ASSESSMENT_SOURCE_ID],rows});
 }
 initialize(s:NamingSession,archive:FactArchive|undefined):NamingSession {
  this.eligible(s,archive);const result=structuredClone(s);
  result.elementAssessmentPreferences={version:'element-assessment-preferences/1.0.0',sessionId:s.id,candidates:result.candidates.map(c=>({candidateId:c.id,choices:c.characters.map((_,i)=>({position:i+1,decision:'unconfirmed',confirmedEvidenceIds:[]}))}))};
  for(const c of result.candidates)c.elementAssessment=this.snapshot(result,c,result.elementAssessmentPreferences.candidates.find(x=>x.candidateId===c.id)!.choices);
  if(!result.sourceSnapshot)throw Error('人工意象方案必须记录来源。');
  if(result.sourceSnapshot.sources.some(src=>src.id===ELEMENT_ASSESSMENT_SOURCE_ID))throw Error('人工意象来源不得预先附加。');
  result.sourceSnapshot.sources.push(structuredClone(ELEMENT_ASSESSMENT_SOURCE));return result;
 }
 confirm(s:NamingSession,archive:FactArchive|undefined,candidateId:string,input:unknown):NamingSession {
  this.verify(s,archive);if(s.preferences.elementAssessment!==true)throw Error('该原方案未开启人工意象确认；旧方案不补字段。');
  const result=structuredClone(s),candidate=result.candidates.find(c=>c.id===candidateId);if(!candidate)throw Error('未找到属于该方案的候选。');
  const choices=this.choices(candidate,input);const item=result.elementAssessmentPreferences!.candidates.find(x=>x.candidateId===candidate.id)!;item.choices=choices;candidate.elementAssessment=this.snapshot(result,candidate,choices);return result;
 }
 verify(s:NamingSession,archive:FactArchive|undefined):void {
  assertElementInput(s);
  if(s.preferences.elementAssessment!==true){if(Object.hasOwn(s,'elementAssessmentPreferences')||s.candidates.some(c=>Object.hasOwn(c,'elementAssessment'))||s.sourceSnapshot?.sources.some(src=>src.id===ELEMENT_ASSESSMENT_SOURCE_ID))throw Error('未开启的原方案不得附加人工意象偏好、快照或来源。');return;}
  this.eligible(s,archive);const pref=s.elementAssessmentPreferences;exact(pref,['version','sessionId','candidates']);
  if(pref.version!=='element-assessment-preferences/1.0.0'||pref.sessionId!==s.id||!Array.isArray(pref.candidates)||pref.candidates.length!==s.candidates.length)throw Error('人工意象偏好归属不一致。');
  const ids=new Set<string>();for(const item of pref.candidates){exact(item,['candidateId','choices']);if(typeof item.candidateId!=='string'||ids.has(item.candidateId))throw Error('人工意象候选重复。');ids.add(item.candidateId);}
  for(const c of s.candidates){const choice=pref.candidates.find(x=>x.candidateId===c.id);if(!choice||!c.elementAssessment||!same(c.elementAssessment,this.snapshot(s,c,choice.choices)))throw Error('人工意象保存快照与原义、采用意见或固定来源不一致。');}
  const source=s.sourceSnapshot?.sources.find(src=>src.id===ELEMENT_ASSESSMENT_SOURCE_ID);if(!isDeepStrictEqual(source,ELEMENT_ASSESSMENT_SOURCE))throw Error('人工意象来源与固定资料不一致。');
 }
}
export function hasElementAssessment(s:NamingSession):boolean {return s.preferences?.elementAssessment===true||Object.hasOwn(s,'elementAssessmentPreferences')||s.candidates?.some(c=>Object.hasOwn(c,'elementAssessment'))||!!s.sourceSnapshot?.sources.some(src=>src.id===ELEMENT_ASSESSMENT_SOURCE_ID);}
