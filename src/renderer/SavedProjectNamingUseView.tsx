import React,{useId} from 'react';
import type {Element,SessionSourceSnapshot,SourceRecord} from '../shared/types';
import type {ProjectNamingUseSnapshot} from '../shared/project-naming-use';
import {readNamingElementMethodSelection} from '../shared/project-naming-use';
import {assertNamingElementApplicationTuple} from '../shared/naming-element-application';
import {ROOT_FEEDBACK_APPLICATION_SCHEMA} from '../shared/bazi-root-feedback-application';
import type {RootFeedbackResourceIdentity} from '../shared/bazi-root-feedback-application';
import {canonicalPlainJson} from '../shared/plain-json';
import './project-naming-method.css';

export interface SavedProjectNamingUseViewProps {
 snapshot?:unknown;
 sourceSnapshot?:SessionSourceSnapshot;
 compact?:boolean;
 id?:string;
}

const UNSUPPORTED='此保存记录的项目命名取法暂不支持展示';
const SOURCE_IDS=['project-bazi-mainchain-145','naming-element-application-v1'] as const;
const FILE_KINDS=['rule','source-lock','runtime-source','license','notice','publication'];
const isRecord=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/iu.test(value);
const elements=(value:unknown):value is Element[]=>Array.isArray(value)&&value.length<=5&&value.every(element=>['木','火','土','金','水'].includes(element))&&new Set(value).size===value.length;
const sameElements=(left:Element[],right:Element[])=>left.length===right.length&&left.every((element,index)=>element===right[index]);
const elementText=(value:Element[])=>value.length?value.join('、'):'未列出';
const entryText=(policy:ProjectNamingUseSnapshot['selection']['entryPolicy'])=>policy==='month-branch-only'?'月支入式':'月干透干提案';

type SavedDisplay={state:'absent'}|{state:'unsupported'}|{state:'recorded';snapshot:ProjectNamingUseSnapshot};

function validResource(value:unknown,methodId:string,policyId:string):value is RootFeedbackResourceIdentity {
 if(!isRecord(value)||value.schema!=='bazi-root-feedback-resource-identity/1'||value.methodId!==methodId||value.applicationPolicyVersion!==policyId
  ||!text(value.publicationId)||!hash(value.manifestSha256)||!text(value.sourceRevision)||!isRecord(value.kernel)
  ||!text(value.kernel.methodId)||!text(value.kernel.sourceRevision)||!Array.isArray(value.files)||value.files.length===0)return false;
 const paths=new Set<string>();
 return value.files.every(file=>{
  if(!isRecord(file)||!text(file.path)||paths.has(file.path)||!Number.isSafeInteger(file.bytes)||typeof file.bytes!=='number'||file.bytes<0||!hash(file.sha256)||typeof file.kind!=='string'||!FILE_KINDS.includes(file.kind))return false;
  paths.add(file.path);return true;
 });
}

/** Display compatibility only. The caller supplies analysis.projectNamingUse
 * already authenticated by main; these checks do not authenticate or replay it. */
function savedDisplay(value:unknown):SavedDisplay {
 if(value===undefined)return{state:'absent'};
 try{
  // Clone through the shared data-only reader before touching nested fields.
  // Neither accessors nor toJSON/script-bearing unknown records are executed.
  const encoded=canonicalPlainJson(value);
  if(encoded.length>1000000)return{state:'unsupported'};
  const saved:unknown=JSON.parse(encoded);
  if(!isRecord(saved)||saved.schema!=='project-naming-use/1')return{state:'unsupported'};
  const selection=readNamingElementMethodSelection({namingElementMethod:saved.selection});
  if(!selection||!isRecord(saved.sourceRecipe)||saved.sourceRecipe.schema!=='naming-element-source-recipe/1'||saved.sourceRecipe.source!=='project')return{state:'unsupported'};
  assertNamingElementApplicationTuple(saved.sourceRecipe.namingRulesVersion,selection.methodId,saved.sourceRecipe.applicationPolicyVersion);
  const application=saved.application,certificate=saved.engineCertificate;
  if(!isRecord(application)||application.status!=='applied'||application.policyId!==saved.sourceRecipe.applicationPolicyVersion
   ||!elements(application.primary)||!elements(application.secondary)||!elements(application.avoid)||!elements(application.effectiveElements)
   ||!isRecord(certificate)||certificate.schema!==ROOT_FEEDBACK_APPLICATION_SCHEMA||certificate.methodId!==selection.methodId
   ||certificate.entryPolicy!==selection.entryPolicy||certificate.applicationPolicyVersion!==application.policyId||!text(certificate.profileId)
   ||!validResource(certificate.resourceIdentity,selection.methodId,application.policyId as string))return{state:'unsupported'};
  const certificateElements=certificate.effectiveElements,opinion=certificate.mainchainOpinion;
  const primary=application.primary,secondary=application.secondary,avoid=application.avoid,effective=application.effectiveElements;
  if(!isRecord(certificateElements)||!elements(certificateElements.primary)||!elements(certificateElements.secondary)||!elements(certificateElements.avoid)||!elements(certificateElements.applied)
   ||!sameElements(application.primary,certificateElements.primary)||!sameElements(application.secondary,certificateElements.secondary)
   ||!sameElements(application.avoid,certificateElements.avoid)||!sameElements(application.effectiveElements,certificateElements.applied)
   ||avoid.some(element=>primary.includes(element)||secondary.includes(element)||effective.includes(element))
   ||!isRecord(opinion)||opinion.methodId!==selection.methodId||opinion.entryPolicy!==selection.entryPolicy)return{state:'unsupported'};
  return{state:'recorded',snapshot:saved as unknown as ProjectNamingUseSnapshot};
 }catch{return{state:'unsupported'};}
}

type SavedSources={state:'recorded';sources:SourceRecord[]}|{state:'missing'|'unsupported'};
function savedSources(value:SessionSourceSnapshot|undefined):SavedSources {
 if(value===undefined)return{state:'missing'};
 try{
  const encoded=canonicalPlainJson(value);
  if(encoded.length>1000000)return{state:'unsupported'};
  const saved:unknown=JSON.parse(encoded);
  if(!isRecord(saved)||saved.version!=='session-sources/1.0.0'||!text(saved.dataVersion)||!Array.isArray(saved.sources))return{state:'unsupported'};
  const selected:SourceRecord[]=[];
  for(const sourceId of SOURCE_IDS){
   const matches=saved.sources.filter(source=>isRecord(source)&&source.id===sourceId);
   if(matches.length>1)return{state:'unsupported'};
   if(!matches.length)continue;
   const source=matches[0];
   if(!isRecord(source)||!text(source.name)||!['url','commit','license','sha256','note'].every(key=>typeof source[key]==='string')
    ||!Array.isArray(source.files)||!source.files.every(file=>typeof file==='string'))return{state:'unsupported'};
   selected.push(source as unknown as SourceRecord);
  }
  return{state:'recorded',sources:selected};
 }catch{return{state:'unsupported'};}
}

function SavedSourceDetails({sourceSnapshot}:{sourceSnapshot:SessionSourceSnapshot|undefined}) {
 const saved=savedSources(sourceSnapshot);
 return <div className="project-naming-saved-sources"><h4>本方案已保存的来源登记</h4>{saved.state==='unsupported'?<p>此保存来源清单暂不支持展示</p>:SOURCE_IDS.map(sourceId=>{
  const source=saved.state==='recorded'?saved.sources.find(row=>row.id===sourceId):undefined;
  return <section className="project-naming-saved-source" key={sourceId}>{source?<><h5>{source.name}</h5><dl>
   <dt>来源 ID</dt><dd>{source.id}</dd><dt>保存修订</dt><dd>{source.commit||'未列出'}</dd>
   <dt>保存哈希</dt><dd>{source.sha256||'未列出'}</dd><dt>许可</dt><dd>{source.license||'未列出'}</dd>
   <dt>保存地址</dt><dd>{source.url||'未列出'}</dd><dt>说明</dt><dd>{source.note||'未列出'}</dd>
  </dl><p>保存文件</p>{source.files.length?<ul>{source.files.map((file,index)=><li key={index}>{file}</li>)}</ul>:<p>未列出</p>}</>:<p>未保存来源记录：{sourceId}</p>}</section>;
 })}</div>;
}

/** A read-only saved view: no live profile, preferences, registry, API, engine or callbacks. */
export function SavedProjectNamingUseView({snapshot,sourceSnapshot,compact=false,id}:SavedProjectNamingUseViewProps) {
 const generatedId=useId(),headingId=`${id??generatedId}-heading`,display=savedDisplay(snapshot);
 if(display.state==='absent')return null;
 if(display.state==='unsupported')return <section id={id} className="project-naming-use project-naming-saved project-naming-use-unsupported project-naming-warning"><p>{UNSUPPORTED}</p></section>;
 const saved=display.snapshot,resource=saved.engineCertificate.resourceIdentity;
 return <section id={id} className={`project-naming-use project-naming-saved project-naming-use-saved${compact?' project-naming-use-compact':''}`} aria-labelledby={headingId}>
  {compact?<h4 id={headingId} className="project-naming-heading">本方案已保存的采用记录</h4>:<h3 id={headingId} className="project-naming-heading">本方案已保存的采用记录</h3>}
  <p className="project-naming-saved-method">项目八字主链取法 1.3.1 · {entryText(saved.selection.entryPolicy)}（{saved.selection.entryPolicy}）</p>
  {compact?<><p className="project-naming-saved-method-id">保存方法：{saved.selection.methodId}</p><p className="project-naming-effective-elements">实际选字五行：{elementText(saved.application.effectiveElements)}</p></>:<>
   <dl className="project-naming-elements project-naming-saved-elements"><dt>主用</dt><dd>{elementText(saved.application.primary)}</dd><dt>辅用</dt><dd>{elementText(saved.application.secondary)}</dd><dt>回避</dt><dd>{elementText(saved.application.avoid)}</dd><dt>实际选字五行</dt><dd>{elementText(saved.application.effectiveElements)}</dd></dl>
   <details className="project-naming-saved-details"><summary>查看保存的方法、版本与资源来源</summary>
    <dl className="project-naming-saved-versions"><dt>保存方法 ID</dt><dd>{saved.selection.methodId}</dd><dt>保存档案 ID</dt><dd>{saved.engineCertificate.profileId}</dd><dt>命名规则版本</dt><dd>{saved.sourceRecipe.namingRulesVersion}</dd><dt>采用协议版本</dt><dd>{saved.sourceRecipe.applicationPolicyVersion}</dd></dl>
    <h4>已保存的资源身份</h4><dl className="project-naming-saved-resource"><dt>发布 ID</dt><dd>{resource.publicationId}</dd><dt>清单 SHA-256</dt><dd>{resource.manifestSha256}</dd><dt>资源源修订</dt><dd>{resource.sourceRevision}</dd><dt>内核方法 ID</dt><dd>{resource.kernel.methodId}</dd><dt>内核源修订</dt><dd>{resource.kernel.sourceRevision}</dd></dl>
    <ul className="project-naming-resource-files">{resource.files.map(file=><li key={file.path}><p className="project-naming-resource-path">{file.path}</p><dl><dt>字节数</dt><dd>{file.bytes}</dd><dt>SHA-256</dt><dd>{file.sha256}</dd><dt>类型</dt><dd>{file.kind}</dd></dl></li>)}</ul>
    <SavedSourceDetails sourceSnapshot={sourceSnapshot}/>
   </details>
  </>}
 </section>;
}
