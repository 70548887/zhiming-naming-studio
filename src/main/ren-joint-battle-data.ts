import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import fixedRules from '../../data/ren-joint-battle-rules.json';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import type {NamingSession,SourceRecord} from '../shared/types';

export const REN_JOINT_BATTLE_SOURCE_ID='bazi-ditian-ren-joint-battle-2600158';
export const REN_JOINT_BATTLE_VERSION='1.0.0';
export const REN_JOINT_BATTLE_PROFILE='ren-source-wood-direction-joint-battle/1.0.0';
export const REN_JOINT_BATTLE_METHOD='ditian-ren-commentary-2600158/1.5.0';
export const REN_JOINT_BATTLE_LOCK_SHA256='297c175fc3d20073f6ec39e0173852119e2e80f8a85cd67a09809cc631bcc8b9';
const ORIGINAL_SHA256='1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d';
const FILES=['data/raw/CC-BY-SA-4.0.txt','data/raw/ren-joint-battle-NOTICE.md','data/raw/ren-joint-battle-excerpts.json','data/ren-joint-battle-rules.json'];
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
type LockedSource=SourceRecord&{fileHashes:Record<string,string>};
interface Context {id:string;section:string;heading:string;layer:string;start:number;end:number;quote:string;sha256:string;}
export type RenJointBattleRuleTable=typeof fixedRules;

/** Source identity only; Store's independent full analysis validation authenticates the calculated result. */
export function loadRenJointBattleData(directory:string):{rules:RenJointBattleRuleTable;sources:SourceRecord[]}{
 const bytes=readFileSync(join(directory,'ren-joint-battle-source-lock.json'));
 if(digest(bytes)!==REN_JOINT_BATTLE_LOCK_SHA256)throw new Error('任注联合动气来源登记校验失败。');
 const lock=JSON.parse(bytes.toString('utf8')) as{version:string;profileId:string;hashConvention:string;sources:LockedSource[]};
 if(lock.version!==REN_JOINT_BATTLE_VERSION||lock.profileId!==REN_JOINT_BATTLE_PROFILE||lock.hashConvention!=='sha256(JSON.stringify(fileHashes)); sorted relative path keys'||!Array.isArray(lock.sources)||lock.sources.length!==1)throw new Error('任注联合动气来源版本不完整。');
 const source=lock.sources[0];
 if(source.id!==REN_JOINT_BATTLE_SOURCE_ID||source.commit!=='wikisource-oldid/2600158;wood-direction-joint-battle/1.0.0'||source.license!=='CC-BY-SA-4.0'||!Array.isArray(source.files)||!isDeepStrictEqual([...source.files].sort(),FILES)||!source.fileHashes||!isDeepStrictEqual(Object.keys(source.fileHashes).sort(),FILES))throw new Error('任注联合动气原件登记不完整。');
 const actual:Record<string,string>={};
 for(const file of [...source.files].sort()){
  if(!file.startsWith('data/')||file.split('/').some(part=>part==='..'||part==='.')||!/^[a-f0-9]{64}$/.test(source.fileHashes[file]??''))throw new Error('任注联合动气原件路径无效。');
  actual[file]=digest(readFileSync(join(directory,file.slice(5))));
  if(actual[file]!==source.fileHashes[file])throw new Error('任注联合动气规则、上下文、桥接约定或许可校验失败。');
 }
 if(digest(JSON.stringify(actual))!==source.sha256)throw new Error('任注联合动气来源汇总校验失败。');
 const table=JSON.parse(readFileSync(join(directory,'ren-joint-battle-rules.json'),'utf8')) as RenJointBattleRuleTable;
 const excerpts=JSON.parse(readFileSync(join(directory,'raw/ren-joint-battle-excerpts.json'),'utf8')) as{version:string;source:Record<string,unknown>;contexts:Context[]};
 if(!isDeepStrictEqual(table,fixedRules)||table.version!==REN_JOINT_BATTLE_VERSION||table.profileId!==REN_JOINT_BATTLE_PROFILE||table.methodVersion!==REN_JOINT_BATTLE_METHOD||table.sourceId!==REN_JOINT_BATTLE_SOURCE_ID||table.source.revision!==2600158||table.source.fullWikitextSha256!==ORIGINAL_SHA256||table.source.fullWikitextCodepoints!==143701||excerpts.version!==REN_JOINT_BATTLE_VERSION||!isDeepStrictEqual(excerpts.source,table.source)||!Array.isArray(excerpts.contexts)||excerpts.contexts.length!==2||new Set(excerpts.contexts.map(c=>c.id)).size!==2||table.clauses.length!==7||new Set(table.clauses.map(c=>c.id)).size!==7)throw new Error('任注联合动气固定原文身份不一致。');
 for(const context of excerpts.contexts){
  const prefix=context.layer==='ren-commentary'?'{{annotate|任氏曰：':context.layer==='original-commentary'?'{{*|原注：':null;
  if(!prefix||!context.id||!Number.isSafeInteger(context.start)||!Number.isSafeInteger(context.end)||context.start<0||context.end>143701||context.end-context.start!==[...context.quote].length||!context.quote.startsWith(prefix)||!context.quote.endsWith('}}')||context.section!=='六亲论 十八、战局'||context.heading!==context.section||digest(context.quote)!==context.sha256)throw new Error('任注联合动气完整分层上下文无效。');
 }
 for(const clause of table.clauses){
  const context=excerpts.contexts.find(c=>c.id===clause.contextId),span=clause.sourceSpan;
  if(!context||span.unit!=='unicode-codepoint'||span.interval!=='[start,end)'||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<context.start||span.end>context.end||span.end-span.start!==[...clause.quote].length||[...context.quote].slice(span.start-context.start,span.end-context.start).join('')!==clause.quote||clause.locator!==`oldid=2600158;codepoint[${span.start},${span.end})`||clause.section!==context.heading||clause.sourceId!==REN_JOINT_BATTLE_SOURCE_ID||!clause.scope||!clause.layer.startsWith(context.layer+';')||context.layer==='original-commentary'&&clause.use!=='context-only')throw new Error('任注联合动气原句码点或作者层不一致。');
 }
 if(table.patterns.length!==4||table.adoption.bridges.length!==2||table.adoption.bridges.some(b=>b.authority!=='project-adoption')||table.adoption.requiredBaseMethod!=='ditian-ren-commentary-2600158/1.4.0'||table.adoption.adjacencyRequired!==false||table.adoption.completeInputIsMetadataOnly!==true)throw new Error('任注联合动气条文与项目桥接约定不得混同。');
 const{id,name,url,commit,license,files,sha256,note}=source;
 return{rules:structuredClone(table),sources:[{id,name,url,commit,license,files:[...files],sha256,note}]};
}
export function loadRenJointBattleSources(directory:string):SourceRecord[]{return loadRenJointBattleData(directory).sources;}
export function verifyRenJointBattleProvenance(session:NamingSession,sources:SourceRecord[]):void{
 const result=session.analysis.renCommentary as unknown as{version?:string;profileId?:string;jointBattleAnalysis?:{version?:string;profileId?:string;sourceId?:string}}|undefined;
 const recorded=session.sourceSnapshot?.sources.filter(source=>source.id===REN_JOINT_BATTLE_SOURCE_ID)??[],selected=String(session.profile.renMethod)===REN_JOINT_BATTLE_METHOD;
 if(!selected){if(result&&Object.hasOwn(result,'jointBattleAnalysis')||recorded.length||result?.version===REN_JOINT_BATTLE_METHOD)throw new Error('任注联合动气结果或来源不得附着旧版或未启用方案。');return;}
 if(!result||result.version!==REN_JOINT_BATTLE_METHOD||result.profileId!==REN_JOINT_BATTLE_METHOD||result.jointBattleAnalysis?.version!==REN_JOINT_BATTLE_VERSION||result.jointBattleAnalysis?.profileId!==REN_JOINT_BATTLE_PROFILE||result.jointBattleAnalysis?.sourceId!==REN_JOINT_BATTLE_SOURCE_ID||!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('任注1.5方案必须保留联合动气结果与完整来源。');
 if(sources.length!==1||recorded.length!==1||!isDeepStrictEqual(sources[0],recorded[0]))throw new Error('任注联合动气生成时来源与固定原文不一致。');
}
