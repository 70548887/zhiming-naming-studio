import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {SourceRecord} from '../shared/types';
import {canonicalPlainJson} from '../shared/plain-json';
import {ROOT_FEEDBACK_APPLICATION_POLICY,ROOT_FEEDBACK_METHOD_ID,type RootFeedbackResourceFile,type RootFeedbackResourceIdentity} from '../shared/bazi-root-feedback-application';
import {ROOT_FEEDBACK_RESOURCE_MANIFEST_SHA256} from './bazi-root-feedback-resource-pins';

interface RootFeedbackResourceManifest {
  schema:'bazi-root-feedback-resource-manifest/1';methodId:typeof ROOT_FEEDBACK_METHOD_ID;
  applicationPolicyVersion:typeof ROOT_FEEDBACK_APPLICATION_POLICY;publicationId:string;sourceRevision:string;
  kernel:{methodId:string;sourceRevision:string};files:RootFeedbackResourceFile[];sources:SourceRecord[];
}
export interface VerifiedRootFeedbackResources {readonly sources:SourceRecord[];readonly resourceIdentity:RootFeedbackResourceIdentity;}
export interface RootFeedbackResourceConfiguration {assetDir:string;dataDir?:string;}
const verified=new WeakSet<object>();
const sha256=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const fail=(message:string):never=>{throw new Error('ROOT_FEEDBACK_RESOURCES_UNAVAILABLE: '+message);};
const hash=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function exact(value:unknown,keys:string[]):asserts value is Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return fail('资源清单须为普通数据对象。');
  if(Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('资源清单字段不匹配固定格式。');
  for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!keys.includes(key)||!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)fail('资源清单含访问器或额外字段。');}
}
function deepFreeze<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;}
function safeRelative(value:unknown):value is string{return typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');}
function readFixedFile(base:string,relative:string):Buffer {
  const filename=path.join(base,...relative.split('/'));
  let actual:string;
  try{actual=fs.realpathSync(filename);}catch{return fail('缺少固定资源：'+relative);}
  const relation=path.relative(fs.realpathSync(base),actual);
  if(relation.startsWith('..'+path.sep)||relation==='..'||path.isAbsolute(relation))fail('固定资源路径越出出版目录：'+relative);
  if(!fs.statSync(actual).isFile())fail('固定资源不是文件：'+relative);
  return fs.readFileSync(actual);
}
/** Main-process configuration only. The fixed publication has no latest-version or data-pack fallback. */
export function loadRootFeedbackResources(configuration:RootFeedbackResourceConfiguration):VerifiedRootFeedbackResources {
  if(!configuration||typeof configuration.assetDir!=='string'||!path.isAbsolute(configuration.assetDir)||configuration.dataDir!==undefined&&(typeof configuration.dataDir!=='string'||!path.isAbsolute(configuration.dataDir)))return fail('资源根须由主进程提供绝对路径。');
  if(!hash(ROOT_FEEDBACK_RESOURCE_MANIFEST_SHA256))return fail('编译期资源清单pin无效。');
  const base=path.join(configuration.assetDir,'bazi-root-feedback','1.3.1');
  const manifestBytes=readFixedFile(base,'resource-manifest.json');
  if(sha256(manifestBytes)!==ROOT_FEEDBACK_RESOURCE_MANIFEST_SHA256)return fail('固定资源清单字节与编译期pin不符。');
  let raw:unknown;try{raw=JSON.parse(manifestBytes.toString('utf8'));}catch{return fail('固定资源清单不是JSON。');}
  exact(raw,['schema','methodId','applicationPolicyVersion','publicationId','sourceRevision','kernel','files','sources']);
  if(raw.schema!=='bazi-root-feedback-resource-manifest/1'||raw.methodId!==ROOT_FEEDBACK_METHOD_ID||raw.applicationPolicyVersion!==ROOT_FEEDBACK_APPLICATION_POLICY||typeof raw.publicationId!=='string'||!raw.publicationId||typeof raw.sourceRevision!=='string'||!raw.sourceRevision)return fail('固定出版身份错误。');
  exact(raw.kernel,['methodId','sourceRevision']);
  if(typeof raw.kernel.methodId!=='string'||!raw.kernel.methodId||typeof raw.kernel.sourceRevision!=='string'||!raw.kernel.sourceRevision)return fail('固定数值内核身份缺失。');
  if(!Array.isArray(raw.files)||raw.files.length===0||!Array.isArray(raw.sources)||raw.sources.length!==2)return fail('资源或来源记录不完整。');
  const seen=new Set<string>();
  for(const file of raw.files){
    exact(file,['path','bytes','sha256','kind']);
    if(!safeRelative(file.path)||seen.has(file.path)||!Number.isSafeInteger(file.bytes)||(file.bytes as number)<0||!hash(file.sha256)||!['rule','source-lock','runtime-source','license','notice','publication'].includes(file.kind as string))return fail('资源条目格式、路径或pin无效。');
    seen.add(file.path);const bytes=readFixedFile(base,file.path);
    if(bytes.byteLength!==file.bytes||sha256(bytes)!==file.sha256)return fail('固定资源字节不符：'+file.path);
  }
  for(const kind of ['rule','source-lock','runtime-source','license','notice','publication'])if(!raw.files.some(file=>file.kind===kind))return fail('资源闭包缺少 '+kind+'。');
  const ids=['project-bazi-mainchain-145','naming-element-application-v1'];
  for(const source of raw.sources){
    exact(source,['id','name','url','commit','license','files','sha256','note']);
    if(!Array.isArray(source.files))return fail('固定来源文件列表缺失。');
    const sourceFiles=source.files;
    if(!ids.includes(source.id as string)||raw.sources.filter(item=>item.id===source.id).length!==1||['id','name','url','commit','license','note'].some(key=>typeof source[key]!=='string'||!(source[key] as string).length)||!hash(source.sha256)||sourceFiles.length===0||sourceFiles.some(file=>!safeRelative(file)||!seen.has(file))||!raw.files.some(file=>file.kind==='publication'&&file.sha256===source.sha256&&sourceFiles.includes(file.path)))return fail('固定来源记录或出版pin不一致。');
  }
  const manifest=raw as unknown as RootFeedbackResourceManifest;
  const result:VerifiedRootFeedbackResources={sources:manifest.sources,resourceIdentity:{schema:'bazi-root-feedback-resource-identity/1',methodId:ROOT_FEEDBACK_METHOD_ID,applicationPolicyVersion:ROOT_FEEDBACK_APPLICATION_POLICY,publicationId:manifest.publicationId,manifestSha256:ROOT_FEEDBACK_RESOURCE_MANIFEST_SHA256,sourceRevision:manifest.sourceRevision,kernel:manifest.kernel,files:manifest.files}};
  canonicalPlainJson(result);deepFreeze(result);verified.add(result);return result;
}
export function assertVerifiedRootFeedbackResources(value:unknown):asserts value is VerifiedRootFeedbackResources {
  if(!value||typeof value!=='object'||!verified.has(value))fail('只接受本进程固定loader核验的资源handle。');
}
