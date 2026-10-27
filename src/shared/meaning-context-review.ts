import {isNamingV7BaseRuleVersion} from './naming-rules';
import type {NameCandidate,NamingSession,SessionSourceSnapshot} from './types';
import type {MeaningContextResult} from '../domain/meaning-context-next.mjs';

/** D01-137-MEANING-CONSUMER / D03 UI hand-off. All positions are ZERO-BASED. */
export interface MeaningContextReadingIntent {action:'confirm-current-readings';positions:number[];}
export interface MeaningContextChoiceIntent {action:'choose-context';position:number;caseId:string;senseId:string;contextKey:string;}
/** Clear removes the entire optional snapshot, including every reading confirmation. */
export interface MeaningContextClearIntent {action:'clear';}
export type MeaningContextUpdateRequest=MeaningContextReadingIntent|MeaningContextChoiceIntent|MeaningContextClearIntent;

export interface SavedMeaningContextReading {position:number;char:string;pinyin:string;tone:number;confirmed:true;}
export interface SavedMeaningContextSelection {position:number;caseId:string;senseId:string;contextKey:string;}
export interface MeaningContextBoundCharacter {
 position:number;char:string;pinyin:string;tone:number;sourceId:string;meaning:string;readings:unknown[];
 /** Main canonical digest of the complete saved CharacterEntry, including its identity fields. */
 characterSha256:string;
}
export interface SavedMeaningContextReview {
 version:'meaning-context-review/1.0.0';
 productionApproved:false;
 sessionId:string;candidateId:string;givenName:string;fullName:string;
 packSha256:string;activeVersion:string;namingRulesVersion:'naming-editorial-7.0.0'|'naming-editorial-7.1.0';
 binding:{characters:MeaningContextBoundCharacter[];};
 source:{sourceId:'project-meaning-context-next-137'|'project-meaning-context-next-138-v1-1';sourceSha256:string;dataSha256:string;sourceLockSha256:string;dataManifestSha256:string;};
 /** Separate review-time registry, checked independently; generation sourceSnapshot stays byte-identical. */
 sourceSnapshot:SessionSourceSnapshot;
 confirmedReadings:SavedMeaningContextReading[];
 selections:SavedMeaningContextSelection[];
 rows:Array<{position:number;char:string;result:MeaningContextResult}>;
 automaticSemanticCreditAllowed:false;independentCharacterMeaningApproved:false;wholeNameApproved:false;scoreDelta:0;
}

export interface MeaningContextOption {
 position:number;char:string;caseId:string;senseId:string;contextKey:string;contextLabel:string;
 givenName:string;dictionaryOriginal:string;
 reference:{word:string;pinyin:string;sourceId:string;originalFile:string;originalSha256:string;rawEntryIndex:number;rawHeteronymIndex:number;rawDefinitionIndex:number;license:string;};
 grammar:Record<string,unknown>;reason:string;exclusions:string[];
 /** Display only: option text is never an adopted explanation or a client write payload. */
 adopted:false;
}
export interface MeaningContextOptions {
 version:'meaning-context-options/1.0.0';productionApproved:false;
 sessionId:string;candidateId:string;reviewRevision:number;reviewToken?:string;
 status:'available'|'legacy-unavailable'|'unsupported-pack'|'not-covered'|'data-unavailable';
 currentReadings:Array<{position:number;char:string;pinyin:string;tone:number;confirmed:boolean}>;
 options:MeaningContextOption[];
 savedReview?:SavedMeaningContextReview;
 notice:string;
}

export interface MeaningContextAPI {
 getMeaningContextOptions(sessionId:string,candidateId:string):Promise<MeaningContextOptions>;
 updateMeaningContext(sessionId:string,candidateId:string,request:MeaningContextUpdateRequest,expectedReviewRevision:number,expectedReviewToken:string):Promise<NamingSession>;
}
export type MeaningContextCandidate=NameCandidate&{meaningContextReview?:SavedMeaningContextReview};

/** Descriptor-first JSON guard; it never invokes a getter or toJSON. */
export function assertMeaningContextJson(value:unknown):void {
 const active=new Set<object>();let count=0;
 const visit=(item:unknown,depth:number):void=>{
  if(++count>100000||depth>70)throw new Error('词义参考资料过深或过大。');
  if(item===null||typeof item==='string'||typeof item==='boolean'||typeof item==='number'&&Number.isFinite(item))return;
  if(!item||typeof item!=='object'||active.has(item))throw new Error('词义参考只接受无循环的普通JSON。');
  const array=Array.isArray(item),prototype=Object.getPrototypeOf(item),keys=Reflect.ownKeys(item);
  if(array?prototype!==Array.prototype:![Object.prototype,null].includes(prototype))throw new Error('词义参考不接受自定义对象。');
  if(array&&(keys.length!==item.length+1||Array.from({length:item.length},(_,i)=>Object.hasOwn(item,i)).some(value=>!value)))throw new Error('词义参考数组不得稀疏或附加字段。');
  active.add(item);
  for(const key of keys){if(array&&key==='length')continue;const d=Object.getOwnPropertyDescriptor(item,key)!;if(typeof key!=='string'||!Object.hasOwn(d,'value')||!d.enumerable)throw new Error('词义参考不接受访问器或隐藏字段。');visit(d.value,depth+1);}
  active.delete(item);
 };visit(value,0);
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,required:string[])=>Object.keys(v).sort().join(',')===[...required].sort().join(',');
const string=(v:unknown,max=1000)=>typeof v==='string'&&v.length>0&&v.length<=max;
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const positions=(v:unknown[],field='position')=>v.every(x=>object(x)&&Number.isInteger(x[field])&&Number(x[field])>=0&&Number(x[field])<2)&&new Set(v.map(x=>(x as Record<string,unknown>)[field])).size===v.length;

/** Reject malformed/overspecified intent before opening or scanning saved sessions. */
export function assertMeaningContextUpdateRequest(value:unknown):asserts value is MeaningContextUpdateRequest {
 assertMeaningContextJson(value);if(!object(value))throw new Error('词义确认意图格式无效。');
 if(value.action==='clear'&&keys(value,['action']))return;
 if(value.action==='confirm-current-readings'&&keys(value,['action','positions'])&&Array.isArray(value.positions)&&value.positions.length>0&&value.positions.length<=2&&new Set(value.positions).size===value.positions.length&&value.positions.every(p=>Number.isInteger(p)&&p>=0&&p<2))return;
 if(value.action==='choose-context'&&keys(value,['action','position','caseId','senseId','contextKey'])&&Number.isInteger(value.position)&&Number(value.position)>=0&&Number(value.position)<2&&['caseId','senseId','contextKey'].every(k=>string(value[k],300)))return;
 throw new Error('词义确认意图包含无效字位、义项或额外字段。');
}

/** Structure only. Main authenticates every byte and recomputes against the fixed version. */
export function validSavedMeaningContextReview(value:unknown):value is SavedMeaningContextReview {
 try{
  assertMeaningContextJson(value);if(!object(value)||!keys(value,['version','productionApproved','sessionId','candidateId','givenName','fullName','packSha256','activeVersion','namingRulesVersion','binding','source','sourceSnapshot','confirmedReadings','selections','rows','automaticSemanticCreditAllowed','independentCharacterMeaningApproved','wholeNameApproved','scoreDelta']))return false;
  if(value.version!=='meaning-context-review/1.0.0'||value.productionApproved!==false||!isNamingV7BaseRuleVersion(value.namingRulesVersion)||value.automaticSemanticCreditAllowed!==false||value.independentCharacterMeaningApproved!==false||value.wholeNameApproved!==false||value.scoreDelta!==0)return false;
  if(!['sessionId','candidateId','givenName','fullName','activeVersion'].every(k=>string(value[k]))||[...(value.givenName as string)].length!==2||!hash(value.packSha256)||!object(value.binding)||!keys(value.binding,['characters'])||!Array.isArray(value.binding.characters)||value.binding.characters.length!==2)return false;
  if(!value.binding.characters.every((c,i)=>object(c)&&keys(c,['position','char','pinyin','tone','sourceId','meaning','readings','characterSha256'])&&c.position===i&&c.char===[...(value.givenName as string)][i]&&['pinyin','sourceId','meaning'].every(k=>string(c[k],10000))&&Number.isInteger(c.tone)&&Number(c.tone)>=0&&Number(c.tone)<=5&&Array.isArray(c.readings)&&hash(c.characterSha256)))return false;
  if(!object(value.source)||!keys(value.source,['sourceId','sourceSha256','dataSha256','sourceLockSha256','dataManifestSha256'])||typeof value.source.sourceId!=='string'||!['project-meaning-context-next-137','project-meaning-context-next-138-v1-1'].includes(value.source.sourceId)||!['sourceSha256','dataSha256','sourceLockSha256','dataManifestSha256'].every(k=>hash((value.source as Record<string,unknown>)[k])))return false;
  if(!object(value.sourceSnapshot)||!Array.isArray(value.confirmedReadings)||value.confirmedReadings.length>2||!positions(value.confirmedReadings)||!Array.isArray(value.selections)||value.selections.length>2||!positions(value.selections))return false;
  if(!value.confirmedReadings.every(r=>object(r)&&keys(r,['position','char','pinyin','tone','confirmed'])&&r.confirmed===true&&['char','pinyin'].every(k=>string(r[k]))&&Number.isInteger(r.tone)))return false;
  if(value.selections.length&&value.confirmedReadings.length!==2||!value.selections.every(s=>object(s)&&keys(s,['position','caseId','senseId','contextKey'])&&['caseId','senseId','contextKey'].every(k=>string(s[k],300))))return false;
  return Array.isArray(value.rows)&&value.rows.length===2&&value.rows.every((r,i)=>object(r)&&keys(r,['position','char','result'])&&r.position===i&&r.char===[...(value.givenName as string)][i]&&object(r.result)&&['not-applicable','not-covered','needs-confirmed-reading','needs-explicit-choice','explanation-ready'].includes(String(r.result.status)));
 }catch{return false;}
}

/** Inspect the new field before generic save/validation can serialize it. */
export function assertMeaningContextReviewInput(value:unknown):void {
 if(!value||typeof value!=='object')return;
 const rows=Object.getOwnPropertyDescriptor(value,'candidates');if(rows&&!Object.hasOwn(rows,'value'))throw new Error('词义参考候选不接受访问器。');
 if(!Array.isArray(rows?.value))return;
 for(let i=0;i<rows.value.length;i++){const row=Object.getOwnPropertyDescriptor(rows.value,String(i));if(row&&!Object.hasOwn(row,'value'))throw new Error('词义参考候选不接受访问器。');if(!row?.value||typeof row.value!=='object')continue;const field=Object.getOwnPropertyDescriptor(row.value,'meaningContextReview');if(field){if(!Object.hasOwn(field,'value'))throw new Error('词义参考快照不接受访问器。');assertMeaningContextJson(field.value);if(!validSavedMeaningContextReview(field.value))throw new Error('词义参考快照格式无效。');}}
}

/** UI protocol:
 * 1. Read options from main; display CURRENT saved readings, coverage and unadopted options.
 * 2. Confirm selected character positions (intent only; send no pinyin/source/result).
 * 3. Use the returned session/revision/token; choose an explicit option by position and three IDs.
 * 4. Clear removes all this feature's confirmations/selections; CAS errors retain UI input.
 * Only saved rows with status explanation-ready may appear as an adopted complete-word reference.
 * Legacy4/5/6 and custom/unknown packs are read-only unavailable; no automatic backfill.
 * The review has its own immutable data/source lock; generation sourceSnapshot/naming7 stay unchanged.
 */
