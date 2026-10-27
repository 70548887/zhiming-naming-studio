import {readFileSync,lstatSync} from 'node:fs';import {join,resolve} from 'node:path';import {createHash} from 'node:crypto';
import methodMetadata from '../../data/parent-name-phonetics-method-v1.json';import {CMN_READING_INPUTS} from './cmn-reading-pins';import {loadVerifiedCmnReadingSource} from './cmn-reading-source';
import {canonicalPlainJson} from '../shared/plain-json';import {parentNameReadingFromIntent,validateParentNameReadings,parentGivenNameFromBoundary,parentFullName,normalizeParentCmnToken} from '../shared/parent-name-phonetics';
import type {ParentNameReading,ParentNameReadings,ParentNameBinding,ParentNameReadingConfirmIntent} from '../shared/parent-name-phonetics';import type {CmnReadingQuery,CmnReadingAdapter} from '../shared/cmn-reading';import type {SourceRecord} from '../shared/types';
export const PARENT_NAME_METHOD_SOURCE_ID='parent-name-phonetics-method-149-v1';
export const PARENT_NAME_METHOD_FILE='parent-name-phonetics-method-v1.json';
// Replaced by the local builder once, using the actual reviewed metadata bytes.
export const PARENT_NAME_METHOD_SHA256='adc7c59fbf2f248f022e9b580a8baceb6f635edb6402988540b014f34c8f4823';
const sha=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
function fact(c:unknown,m:string):asserts c{if(!c)throw Error('家庭姓名读音来源：'+m);}
function frozen<T>(v:T):T{if(v&&typeof v==='object'){for(const x of Object.values(v))frozen(x);Object.freeze(v);}return v;}
export function parentNameMethodSource():SourceRecord{return{id:PARENT_NAME_METHOD_SOURCE_ID,name:'完整给名家庭重音比较方法1.0',url:'local:data/'+PARENT_NAME_METHOD_FILE,commit:'M149-D02;parent-name-phonetics/1.0.0',license:'CC0-1.0 project method metadata only',files:['data/'+PARENT_NAME_METHOD_FILE],sha256:PARENT_NAME_METHOD_SHA256,note:'只比较已确认父母给名与孩子实际采用音节；原词典来源另保留，不判断名字安全、品质或整名适合度。'};}
export function parentNameDictionarySource():SourceRecord{return structuredClone(methodMetadata.dictionarySourceRecord);}
type Scope={method:boolean;dictionary:boolean;started:number;label:string;canonicalAdapter?:CmnReadingAdapter};
export class ParentNameSourceValidator {
 private readonly queries=new Map<string,CmnReadingQuery>();private scope?:Scope;
 private readonly stats={boundaries:0,activatedBoundaries:0,methodReads:0,dictionaryPasses:0,rawFilesRead:0,syncCanonicalLoads:0,syncCanonicalLoadMs:0,syncQueryCharacters:0,workerQuerySeeds:0,boundaryMs:0};
 constructor(readonly dataDirectory:string){fact(resolve(dataDirectory)===dataDirectory,'资料目录须为实际绝对路径。');}
 diagnostics(){return{...this.stats,cachedCharacters:this.queries.size,activeBoundary:!!this.scope};}
 /** Sync boundary only; no scope is held across await, so concurrent worker
  * confirmations cannot share an unfinished verification traversal.
  * Start verification activates lazily at its first family value. End verification
  * completes before this callback returns; Store wraps mutation inside rollback
  * and before persist, and wraps an entire backup traversal rather than each row.
  */
 boundary<T>(label:string,action:()=>T):T{
  if(this.scope)return action();const scope:Scope={method:false,dictionary:false,started:performance.now(),label};this.scope=scope;this.stats.boundaries++;
  try{const result=action();fact(!(result instanceof Promise),'同步来源认证边界不能跨异步作业。');return result;}
  finally{try{if(scope.dictionary)this.verifyOriginals();if(scope.method)this.verifyMethod();}finally{if(scope.method||scope.dictionary)this.stats.activatedBoundaries++;this.stats.boundaryMs+=performance.now()-scope.started;this.scope=undefined;}}
 }
 private verifyMethod(){const file=join(this.dataDirectory,PARENT_NAME_METHOD_FILE);fact(lstatSync(this.dataDirectory).isDirectory()&&!lstatSync(this.dataDirectory).isSymbolicLink()&&lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink(),'固定方法目录或原件不得通过链接替换。');const bytes=readFileSync(file);this.stats.methodReads++;fact(sha(bytes)===PARENT_NAME_METHOD_SHA256&&canonicalPlainJson(JSON.parse(bytes.toString()))===canonicalPlainJson(methodMetadata),'固定方法原件被删除或替换。');}
 private verifyOriginals(){
  fact(lstatSync(this.dataDirectory).isDirectory()&&!lstatSync(this.dataDirectory).isSymbolicLink(),'字典原件目录不得通过链接替换。');
  for(const row of CMN_READING_INPUTS){let current=this.dataDirectory;for(const part of row.file.slice(5).split('/')){current=join(current,part);fact(!lstatSync(current).isSymbolicLink(),'来源原件不得通过符号链接替换。');}const bytes=readFileSync(current);this.stats.rawFilesRead++;fact(bytes.length===row.bytes&&sha(bytes)===row.sha256,'固定原件不同：'+row.file);}this.stats.dictionaryPasses++;
 }
 private activate(dictionary:boolean){fact(this.scope,'缺少同步认证边界。');if(!this.scope.method){this.verifyMethod();this.scope.method=true;}if(dictionary&&!this.scope.dictionary){this.verifyOriginals();this.scope.dictionary=true;}}
 private dictionaryCharacters(value:unknown):string[]{canonicalPlainJson(value);fact(Array.isArray(value),'确认记录须为父母数组。');const chars=new Set<string>();for(const raw of value){if(!raw||typeof raw!=='object'||!Array.isArray(raw.readings))continue;for(const r of raw.readings)if(r&&r.origin==='dictionary'&&typeof r.char==='string')chars.add(r.char);}return[...chars];}
 validateSync(value:unknown,binding:ParentNameBinding):ParentNameReadings{
  if(value===undefined)return[];return this.boundary('profile/readings',()=>{const chars=this.dictionaryCharacters(value);this.activate(chars.length>0);
   const missing=chars.filter(char=>!this.queries.has(char));if(missing.length){const scope=this.scope!;let adapter=scope.canonicalAdapter;if(!adapter){const started=performance.now();adapter=loadVerifiedCmnReadingSource(this.dataDirectory);scope.canonicalAdapter=adapter;this.stats.syncCanonicalLoads++;this.stats.syncCanonicalLoadMs+=performance.now()-started;
    // loadVerifiedCmnReadingSource also re-reads its8 original files before using
    // the process-private parsed index. Count this additional pass explicitly.
    this.stats.rawFilesRead+=CMN_READING_INPUTS.length;this.stats.dictionaryPasses++;}
    for(const char of missing){const query=adapter.query(char);this.queries.set(char,frozen(structuredClone(query)));this.stats.syncQueryCharacters++;}
   }
   return validateParentNameReadings(value,binding,this.queries);
  });
 }
 async confirm(binding:ParentNameBinding,intent:ParentNameReadingConfirmIntent,actualWorkerQuery:(char:string)=>Promise<CmnReadingQuery>):Promise<ParentNameReading>{
  canonicalPlainJson(binding);canonicalPlainJson(intent);const names=structuredClone(binding),request=structuredClone(intent);
  fact(request&&Object.keys(request).sort().join(',')==='fullName,readings,role,surnameLength'&&(request.role==='father'||request.role==='mother')&&request.fullName===parentFullName(names,request.role),'确认意图含未知字段或不绑定当前父母原名。');const given=parentGivenNameFromBoundary(request.fullName,request.surnameLength);
  fact(Array.isArray(request.readings)&&request.readings.length===[...given].length,'确认意图缺少完整给名音节。');for(let i=0;i<request.readings.length;i++){const r=request.readings[i];fact(r&&r.position===i&&r.char===[...given][i],'确认意图字位或分界不符。');if(r.origin==='family-confirmed'){fact(Object.keys(r).sort().join(',')==='char,origin,pinyin,position','手输意图不能伪造字典证明。');normalizeParentCmnToken(r.pinyin);}else fact(r.origin==='dictionary'&&Object.keys(r).sort().join(',')==='char,option,origin,position'&&r.option&&typeof r.option.optionId==='string','字典意图无效。');}const chars=[...new Set(request.readings.flatMap(r=>r.origin==='dictionary'?[r.char]:[]))];
  const workerResults=await Promise.all(chars.map(char=>actualWorkerQuery(char)));
  return this.boundary('async-confirm-result',()=>{this.activate(chars.length>0);for(let i=0;i<chars.length;i++){const q=workerResults[i];canonicalPlainJson(q);fact(q.char===chars[i]&&q.source.profile==='cmn-character-source/1.0.0'&&q.source.profileSha256===methodMetadata.dictionaryProfileSha256,'实际worker没有返回该字固定来源。');this.queries.set(chars[i],frozen(structuredClone(q)));this.stats.workerQuerySeeds++;}
   // Uses the actual worker map, never a client Map. Full option equality and
   // name/boundary/position binding are rechecked by the shared confirmation API.
   return parentNameReadingFromIntent(request,names,this.queries);
  });
 }
 withQueries<T>(value:unknown,binding:ParentNameBinding,action:(readings:ParentNameReadings,queries:ReadonlyMap<string,CmnReadingQuery>)=>T):T{return this.boundary('family-calculation',()=>{const readings=this.validateSync(value,binding);this.activate(false);return action(readings,new Map(this.queries));});}
}
const validators=new Map<string,ParentNameSourceValidator>();
export function parentNameSourceValidator(dataDirectory:string){const key=resolve(dataDirectory);let value=validators.get(key);if(!value){value=new ParentNameSourceValidator(key);validators.set(key,value);}return value;}
export function withParentNameSourceBoundary<T>(dataDirectory:string,label:string,action:()=>T):T{return parentNameSourceValidator(dataDirectory).boundary(label,action);}
