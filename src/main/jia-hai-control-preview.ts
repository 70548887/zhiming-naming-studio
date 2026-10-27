import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {isDeepStrictEqual,types} from 'node:util';
import type {BirthProfile} from '../shared/types';
import type {JiaHaiControlPreview,JiaHaiControlOptions,JiaHaiCarrierSelector} from '../shared/jia-hai-control-preview';
import {validateBirthTimeInput} from '../shared/birth-time-basis';
import {validMonthAuthorityMethod} from '../shared/month-authority-method';
import {validSeasonalMethod} from '../shared/seasonal-method';
import {validRenMethod} from '../shared/ren-method';
import {evaluateJiaHaiControlProjection} from '../domain/traditional/jia-hai-control-v1';
import {readQiongtongClausePreviewProfile} from './qiongtong-preview-input';
import {loadMonthlySeasonalData,MONTHLY_SEASONAL_SOURCE_ID} from './monthly-seasonal-data';
import {loadBaziSources} from './bazi-data';
import {loadRootFeedbackResources} from './bazi-root-feedback-resources';

const DIRECTORY='jia-hai-control-v1';
const MANIFEST_SHA256='fd0e6618f91a66682ae0d7dbbc9a66d0531e11600abc1a781e4b4c0da26630e0';
const MANIFEST_BYTES=1612;
const RAW_SHA256='8ba17242f116583de2e10172e006f5ce5f74b23ccfc0bd24b886be135e9f20bd';
const REVISION='wikisource-revision/2294674' as const;
const METHOD='project-bazi-mainchain-145/1.3.1' as const;
const PROJECTION_SCHEMA='jia-hai-wu-ren-project-intervention/1.0.0' as const;
const INPUT_NAMES=['rule-input.ts','types-input.ts','source.json'];
const INPUT_ROLES=['rule-input','types-input','source'];
type Span=JiaHaiControlPreview['sourceVerification']['quoteSpan'];
interface ModelPin {path:string;byteSha256:string;jsonValueSha256:string;methodId:string;}
interface SourceContext {schema:string;revision:string;rawSha256:string;quote:string;quoteSpan:Span;counterControlQuote:string;counterControlSpan:Span;traditionalDependencies:string[];modelPins:ModelPin[];}
interface Manifest {
  schema:string;sourceVersion:string;sourceSchema:string;rawSha256:string;revision:string;contextSpan:Span;contextSha256:string;
  quote:string;quoteSpan:Span;counterControl:{quote:string;safeSpan:Span};
  files:{file:string;role:string;sha256:string;bytes:number}[];
}
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
function fixed(file:string,sha256:string,bytes:number):Buffer {
  const value=readFileSync(file);
  if(types.isProxy(value)||!Buffer.isBuffer(value)||value.length!==bytes||digest(value)!==sha256)throw new Error('甲亥项目预览固定来源字节不一致。');
  return value;
}
function slice(points:readonly string[],span:Span):string {
  if(!span||span.unit!=='unicode-codepoint'||span.interval!=='[start,end)'||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end<=span.start||span.end>points.length)throw new Error('甲亥项目预览原文范围无效。');
  return points.slice(span.start,span.end).join('');
}
function ownOptions(value:unknown,allowed:readonly string[],required:readonly string[]):Record<string,unknown> {
  if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('项目推演选项须为非代理普通对象。');
  const result:Record<string,unknown>={};
  for(const key of Reflect.ownKeys(value)){
    if(typeof key!=='string'||!allowed.includes(key))throw new Error('项目推演选项包含未允许字段。');
    const descriptor=Object.getOwnPropertyDescriptor(value,key)!;
    if(!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('项目推演选项拒绝访问器或隐藏字段。');
    result[key]=descriptor.value;
  }
  if(required.some(key=>!Object.hasOwn(result,key)))throw new Error('载体选择缺少身份字段。');
  return result;
}
function optionsForPreview(value:unknown):{enabled:boolean;selector:JiaHaiCarrierSelector|null} {
  if(value===undefined)return{enabled:false,selector:null};
  const options=ownOptions(value,['enabled','selector'],[]);
  if(Object.hasOwn(options,'enabled')&&typeof options.enabled!=='boolean')throw new Error('enabled须为显式布尔值。');
  let selector:JiaHaiCarrierSelector|null=null;
  if(Object.hasOwn(options,'selector')){
    const row=ownOptions(options.selector,['controllerId','attackerId','hiddenCarrierId'],['controllerId','attackerId','hiddenCarrierId']);
    for(const key of ['controllerId','attackerId','hiddenCarrierId'])if(typeof row[key]!=='string'||row[key].length<1||row[key].length>200)throw new Error('selector载体身份无效。');
    selector=row as unknown as JiaHaiCarrierSelector;
  }
  if(selector&&options.enabled!==true)throw new Error('必须明确启用后才能选择载体。');
  return{enabled:options.enabled===true,selector};
}
function profileForPreview(input:BirthProfile):BirthProfile {
  const profile=readQiongtongClausePreviewProfile(input);
  for(const key of ['id','customerName','surname','surnamePinyin','birthDate','birthTime','birthPlace','timezone','notes'] as const)if(typeof profile[key]!=='string'||profile[key].length>(key==='notes'?10000:300))throw new Error('甲亥预览出生资料字段不合法或过长。');
  if(!/^[\p{Script=Han}]{1,4}$/u.test(profile.surname.trim())||!['男','女','中性'].includes(profile.gender)||!['solar','lunar'].includes(profile.calendar)||typeof profile.timeUnknown!=='boolean'||typeof profile.leapMonth!=='boolean')throw new Error('甲亥预览姓氏、历法或时间标记无效。');
  for(const name of [profile.fatherName,profile.motherName])if(name!==undefined&&(typeof name!=='string'||[...name].length>40))throw new Error('父母姓名须为40字符以内文本。');
  if(!validMonthAuthorityMethod(profile.monthAuthorityMethod)||!validSeasonalMethod(profile.seasonalMethod)||!validRenMethod(profile.renMethod))throw new Error('甲亥预览出生参考方法无效。');
  validateBirthTimeInput(profile);return readQiongtongClausePreviewProfile(profile);
}
function freeze<T>(value:T):T {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function safeDiscovery(value:unknown):unknown {
  if(!value||typeof value!=='object')return null;
  const source=value as Record<string,any>;
  return {id:source.id,methodId:source.methodId,scope:source.scope,
    facts:Array.isArray(source.facts)?source.facts.map((fact:any)=>({carrierId:fact.carrierId,position:fact.position,stem:fact.stem,branch:fact.branch,originalElement:fact.originalElement,workingElement:fact.workingElement,seed:fact.seed,hiddenOrder:fact.hiddenOrder,supportedOriginalCarrierIds:fact.supportedOriginalCarrierIds})):[],
    variables:Array.isArray(source.variables)?source.variables.map((item:any)=>({id:item.id,element:item.element,carrierIds:item.carrierIds,resourceElement:item.resourceElement,resourceSeed:item.resourceSeed,fallbackFactor:item.fallbackFactor})):[],
    regimes:Array.isArray(source.regimes)?source.regimes.map((regime:any)=>({id:regime.id,rootAssumptions:regime.rootAssumptions,capacities:regime.capacities,consistency:regime.consistency})):[],
    consistentIds:Array.isArray(source.consistentIds)?[...source.consistentIds]:[],possibleIds:Array.isArray(source.possibleIds)?[...source.possibleIds]:[],resolution:source.resolution,commonOpinion:[],conflicts:[],pending:[]};
}

/** Fresh, opt-in project comparison. Resources never confer naming adoption or write authority. */
export function buildJiaHaiControlPreview(input:BirthProfile,options:JiaHaiControlOptions|undefined,dataDir:string):JiaHaiControlPreview {
  const profile=profileForPreview(input),request=optionsForPreview(options);
  const monthly=loadMonthlySeasonalData(dataDir);loadBaziSources(dataDir);
  const resources=loadRootFeedbackResources({assetDir:resolve(dataDir,'..','assets'),dataDir});
  if(monthly.table.sourceId!==MONTHLY_SEASONAL_SOURCE_ID||monthly.table.source.revisionId!==2294674||monthly.table.source.rawSha256!==RAW_SHA256||resources.resourceIdentity.methodId!==METHOD)throw new Error('甲亥项目预览流派或项目资源身份不一致。');
  const manifestBytes=fixed(join(dataDir,DIRECTORY,'manifest.json'),MANIFEST_SHA256,MANIFEST_BYTES),manifest=JSON.parse(manifestBytes.toString('utf8')) as Manifest;
  if(manifest.schema!=='jia-hai-control-managed-inputs/1.0.0'||manifest.sourceVersion!==PROJECTION_SCHEMA||manifest.sourceSchema!=='jia-hai-wu-ren-source-context/1.0.0'||manifest.rawSha256!==RAW_SHA256||manifest.revision!==REVISION||!Array.isArray(manifest.files)||manifest.files.length!==3)throw new Error('甲亥项目预览受管清单版本不一致。');
  const managedInputs:JiaHaiControlPreview['sourceVerification']['managedInputs'][number][]=[{file:'data/'+DIRECTORY+'/manifest.json',sha256:MANIFEST_SHA256,bytes:manifestBytes.length}];
  let source:SourceContext|undefined;
  for(let index=0;index<INPUT_NAMES.length;index++){
    const row=manifest.files[index];
    if(row.file!==INPUT_NAMES[index]||row.role!==INPUT_ROLES[index]||!/^[a-f0-9]{64}$/.test(row.sha256)||!Number.isSafeInteger(row.bytes)||row.bytes<1)throw new Error('甲亥项目预览受管文件定位不一致。');
    const bytes=fixed(join(dataDir,DIRECTORY,row.file),row.sha256,row.bytes);
    managedInputs.push({file:'data/'+DIRECTORY+'/'+row.file,sha256:row.sha256,bytes:row.bytes});
    if(row.role==='source')source=JSON.parse(bytes.toString('utf8')) as SourceContext;
  }
  if(!source||source.schema!=='jia-hai-wu-ren-source-context/1.0.0'||source.revision!==REVISION||source.rawSha256!==RAW_SHA256||source.quote!==manifest.quote||!isDeepStrictEqual(source.quoteSpan,manifest.quoteSpan)||source.counterControlQuote!==manifest.counterControl.quote||!isDeepStrictEqual(source.counterControlSpan,manifest.counterControl.safeSpan)||source.modelPins.length!==2)throw new Error('甲亥项目预览条件出处不一致。');
  const raw=fixed(join(dataDir,'raw/classics-qiongtong-2294674.wiki'),RAW_SHA256,99998),text=raw.toString('utf8'),points=[...text];
  if(!Buffer.from(text,'utf8').equals(raw)||points.length!==36746||slice(points,source.quoteSpan)!==source.quote||slice(points,source.counterControlSpan)!==source.counterControlQuote||digest(slice(points,manifest.contextSpan))!==manifest.contextSha256)throw new Error('甲亥项目预览原句或上下文定位不一致。');
  const entry=monthly.table.entries.find(row=>row.id==='甲-亥');
  if(!entry||!isDeepStrictEqual(entry.sourceSpan,manifest.contextSpan)||slice(points,entry.sourceSpan)!==entry.sourceQuote)throw new Error('甲亥上下文与固定月别原包不一致。');
  const publication=join(resolve(dataDir,'..','assets'),'bazi-root-feedback','1.3.1');
  const parameters:Record<string,unknown>[]=[];
  const parameterPaths=['src/domain/bazi-mainchain/project-v13/rules/project-mainchain-1.3.1.json','src/domain/bazi-mainchain/kernel-v12-fixed/rules/project-mainchain-1.2.0.json'];
  for(let index=0;index<parameterPaths.length;index++){
    const pin=source.modelPins[index],path=parameterPaths[index],row=resources.resourceIdentity.files.find(file=>file.path==='runtime-source/'+path);
    if(pin.path!==path||!row||row.sha256!==pin.byteSha256)throw new Error('甲亥项目参数未绑定固定完整出版。');
    const parsed=JSON.parse(fixed(join(publication,row.path),row.sha256,row.bytes).toString('utf8')) as Record<string,unknown>;
    if(digest(JSON.stringify(parsed))!==pin.jsonValueSha256||parsed.methodId!==pin.methodId)throw new Error('甲亥项目参数值身份不一致。');
    parameters.push(parsed);
  }
  const projection=evaluateJiaHaiControlProjection(profile,{enabled:request.enabled,...(request.selector?{selector:request.selector}:{})});
  if(projection.schema!==PROJECTION_SCHEMA||projection.birth.profile.id!==profile.id||!isDeepStrictEqual(projection.birth.profile,{id:profile.id,birthDate:profile.birthDate,birthTime:profile.birthTime,timeUnknown:profile.timeUnknown,timezone:profile.timezone})||projection.project.enabled!==request.enabled||projection.project.methodId!==METHOD||!isDeepStrictEqual(projection.project.modelPins,source.modelPins)||!isDeepStrictEqual(projection.project.parameters,parameters[0].parameters)||projection.project.parameterVersion!==METHOD+';control-budget/1.0.0;'+(parameters[0].rootFeedback as {version:string}).version||projection.project.scoreMutation!==false||projection.traditional.usefulGodDecision!=='not-evaluated'||projection.traditional.namingImpact!=='none'||projection.source.sourceId!==MONTHLY_SEASONAL_SOURCE_ID||projection.source.revision!==REVISION||projection.source.rawSha256!==RAW_SHA256||projection.source.quote!==source.quote||!isDeepStrictEqual(projection.source.quoteSpan,source.quoteSpan))throw new Error('甲亥项目推演与本次已核出生资料、来源或项目参数不一致。');
  if(!request.enabled&&(projection.project.status!=='disabled'||projection.project.discovery!==null||projection.project.legacyComparison!==null)||profile.timeUnknown&&(projection.birth.knownPillars.some(row=>row.label==='时柱')||projection.birth.chart?.pillars.hour!=null||projection.project.legacyComparison!==null))throw new Error('甲亥项目预览关闭或未知时柱边界不一致。');
  const selected=projection.project.selected;
  if(selected&&(selected.controller.kind!=='exposed'||selected.controller.stem!=='戊'||selected.attacker.stem!=='壬'||selected.hiddenCarrier.kind!=='hidden'||selected.canonicalEdgeId!=='control:'+selected.controller.id+':'+selected.attacker.id||selected.attackerToHiddenEdgeId!=='control:'+selected.attacker.id+':'+selected.hiddenCarrier.id||request.selector&&!isDeepStrictEqual(selected.selector,request.selector)))throw new Error('甲亥项目推演未保留同一已核载体链。');
  const comparison=projection.project.legacyComparison as any;
  const safeComparison=comparison?{disabledControlEdgeIds:Array.isArray(comparison.disabledControlEdgeIds)?[...comparison.disabledControlEdgeIds]:[],definiteRestoration:comparison.definiteRestoration===true,full:comparison.full?{resolution:comparison.full.resolution,consistentIds:[...(comparison.full.consistentIds??[])],possibleIds:[...(comparison.full.possibleIds??[])]}:null,without:comparison.without?{resolution:comparison.without.resolution,consistentIds:[...(comparison.without.consistentIds??[])],possibleIds:[...(comparison.without.possibleIds??[])]}:null}:null;
  const safeCertificates=Array.isArray(projection.project.selectedLegacyCertificates)?projection.project.selectedLegacyCertificates.map((certificate:any)=>({status:certificate.status,rescueEdgeId:certificate.rescueEdgeId,attackerId:certificate.attackerId,hiddenRootId:certificate.hiddenRootId})):[];
  const safeProjection={...projection,project:{...projection.project,discovery:safeDiscovery(projection.project.discovery) as any,legacyComparison:safeComparison as any,selectedLegacyCertificates:safeCertificates as any,stopReasons:projection.project.stopReasons.map(reason=>reason.includes('历史')?'项目资源与传统解释边界已保留，未输出历史断语。':'项目推演结论仅供项目参数对比，未形成传统采用意见。')}} as any;
  return freeze(structuredClone({schema:'jia-hai-control-preview/1.0.0' as const,profileId:profile.id,request,projection:safeProjection,sourceVerification:{schema:'jia-hai-control-source-verification/1.0.0' as const,status:'verified-fixed-resources' as const,school:'qiongtong-wikisource-2294674' as const,sourceId:MONTHLY_SEASONAL_SOURCE_ID,revision:REVISION,rawSha256:RAW_SHA256,scanCollation:false as const,quote:source.quote,quoteSpan:source.quoteSpan,context:{span:manifest.contextSpan,sha256:manifest.contextSha256},counterControl:{quote:source.counterControlQuote,span:source.counterControlSpan},monthlySources:monthly.sources,managedInputs,project:{methodId:METHOD,resourceIdentity:resources.resourceIdentity,sources:resources.sources},binding:{profileId:profile.id,projectionSchema:PROJECTION_SCHEMA,originalAnalysisDigest:projection.birth.originalAnalysisDigest}}}));
}
