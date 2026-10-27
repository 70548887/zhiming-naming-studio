import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {Script} from 'node:vm';
import {types} from 'node:util';
import type {BirthProfile} from '../shared/types';
import {readRootFeedbackFacadeOptions} from '../shared/bazi-root-feedback-facade';
import type {RootFeedbackFacadeOptions} from '../shared/bazi-root-feedback-facade';
import type {RootFeedbackV132FacadeDTO} from '../shared/bazi-root-feedback-v132-r2-facade';
import type {RootFeedbackV132Engine} from './bazi-root-feedback-v132-r2-engine';
import type {VerifiedRootFeedbackV132Resources} from './bazi-root-feedback-v132-r2-resources';

const PUBLICATION='bazi-root-feedback/1.3.2-r2';
const BUNDLE_FILE='root-feedback.cjs';
const EXPECTED_BUNDLE_BYTES=2233517;
const EXPECTED_BUNDLE_SHA256='d01d2b51e10b48c3de361ab27de451dcb91670b71197a559f6fb8182215193fb';
const EXPECTED_IDENTITY={schema:'bazi-root-feedback-build/2',methodId:'project-bazi-mainchain-145/1.3.2',publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2',fullClosureSha256:'9f3fa8d4cfc8f190934268597cffb25be19cbf2723b4b827ec74228f2c7596f8',manifestSha256:'3d9b15e6f9963f385411a70eabcbb3ab940629bc285bea65a8ebee92c3f6c71a',esbuildVersion:'0.25.12'} as const;

interface RootFeedbackV132Bundle {
  createRootFeedbackV132Engine():RootFeedbackV132Engine;
  loadRootFeedbackV132Resources(configuration:{assetDir:string},engine:RootFeedbackV132Engine):VerifiedRootFeedbackV132Resources;
  createBaziRootFeedbackV132Facade(engine:RootFeedbackV132Engine,resources:VerifiedRootFeedbackV132Resources):{previewBaziRootFeedbackProfile(profile:BirthProfile,options?:RootFeedbackFacadeOptions):RootFeedbackV132FacadeDTO};
}

export class RootFeedbackV132PreviewUnavailable extends Error {
  constructor(message:string){super(`ROOT_FEEDBACK_V132_R2_PREVIEW_UNAVAILABLE: ${message}`);this.name='RootFeedbackV132PreviewUnavailable';}
}

const sha256=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const sameIdentity=(value:unknown):value is typeof EXPECTED_IDENTITY=>!!value&&typeof value==='object'&&Object.entries(EXPECTED_IDENTITY).every(([key,expected])=>(value as Record<string,unknown>)[key]===expected);
function inside(base:string,target:string):boolean{const relative=path.relative(base,target);return relative!== '..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
function fixedFile(assetDir:string):string {
  if(typeof assetDir!=='string'||!path.isAbsolute(assetDir))throw new RootFeedbackV132PreviewUnavailable('固定资源根必须是绝对路径。');
  const root=path.resolve(assetDir,'..'),output=path.resolve(root,'dist-electron'),file=path.resolve(output,PUBLICATION,BUNDLE_FILE);
  if(!inside(output,file))throw new RootFeedbackV132PreviewUnavailable('固定 bundle 路径越界。');
  return file;
}
function readReceipt(file:string,bundle:Buffer):void {
  const receiptFile=file+'.receipt.json';let receipt:unknown;
  try{receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8'));}catch{throw new RootFeedbackV132PreviewUnavailable('固定 bundle receipt 缺失或不是 JSON。');}
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))throw new RootFeedbackV132PreviewUnavailable('固定 bundle receipt 结构无效。');
  const row=receipt as Record<string,unknown>,identity=row.identity,output=row.output;
  if(row.schema!=='bazi-root-feedback-build-receipt/2'||!sameIdentity(identity)||!output||typeof output!=='object'||Array.isArray(output))throw new RootFeedbackV132PreviewUnavailable('固定 bundle receipt 身份不匹配。');
  const out=output as Record<string,unknown>;
  if(out.file!==BUNDLE_FILE||out.bytes!==bundle.length||out.sha256!==sha256(bundle))throw new RootFeedbackV132PreviewUnavailable('固定 bundle receipt 与实际字节不一致。');
}
function loadBundle(file:string,bytes:Buffer):RootFeedbackV132Bundle {
  // Compile the bytes already authenticated above. A second require(file)
  // would reread disk or return an independently populated require cache.
  let value:unknown;try{const module={exports:{}},nativeRequire=createRequire(file);const builtinRequire=(name:string)=>{if(!['node:crypto','node:fs','node:path','node:util'].includes(name))throw new Error('Unfixed bundle external module.');return nativeRequire(name);};const execute=new Script('(function(exports,require,module,__filename,__dirname){\n'+bytes.toString('utf8')+'\n})',{filename:file}).runInThisContext();execute(module.exports,builtinRequire,module,file,path.dirname(file));value=module.exports;}catch{throw new RootFeedbackV132PreviewUnavailable('固定 bundle 无法加载。');}
  if(!value||typeof value!=='object')throw new RootFeedbackV132PreviewUnavailable('固定 bundle 导出无效。');
  const bundle=value as Partial<RootFeedbackV132Bundle>;
  if(typeof bundle.createRootFeedbackV132Engine!=='function'||typeof bundle.loadRootFeedbackV132Resources!=='function'||typeof bundle.createBaziRootFeedbackV132Facade!=='function')throw new RootFeedbackV132PreviewUnavailable('固定 bundle 缺少 r2 facade 导出。');
  return bundle as RootFeedbackV132Bundle;
}

/**
 * Lazy adapter for the reviewed r2 CJS publication. It never imports the
 * checkout TypeScript facade and only accepts the audited bundle bytes at the
 * package-relative path, then binds resources to the engine from that bundle.
 */
export function createBaziRootFeedbackV132PreviewAdapter(assetDir:string){
  let cached:{api:RootFeedbackV132Bundle;engine:RootFeedbackV132Engine}|undefined;
  const load=()=>{
    const file=fixedFile(assetDir);let bundle:Buffer;
    try{bundle=fs.readFileSync(file);}catch{throw new RootFeedbackV132PreviewUnavailable(`固定 bundle 不存在：${path.join('dist-electron',PUBLICATION,BUNDLE_FILE)}`);}
    if(bundle.length!==EXPECTED_BUNDLE_BYTES||sha256(bundle)!==EXPECTED_BUNDLE_SHA256)throw new RootFeedbackV132PreviewUnavailable('固定 bundle 字节未通过已审计 SHA256。');
    readReceipt(file,bundle);
    const {api,engine}=cached??=(()=>{const api=loadBundle(file,bundle);return{api,engine:api.createRootFeedbackV132Engine()};})();
    if(!sameIdentity(engine.identity))throw new RootFeedbackV132PreviewUnavailable('固定 bundle 的运行身份不匹配。');
    const resources=api.loadRootFeedbackV132Resources({assetDir},engine);
    return api.createBaziRootFeedbackV132Facade(engine,resources);
  };
  return Object.freeze({previewBaziRootFeedbackProfile(profile:BirthProfile,options?:RootFeedbackFacadeOptions){return load().previewBaziRootFeedbackProfile(profile,options);}});
}

/** Validate the request before the Service's normal profile validator can touch fields. */
const PROFILE_FIELDS=['id','customerName','surname','surnamePinyin','gender','calendar','birthDate','leapMonth','birthTime','timeUnknown','birthPlace','timezone','notes','fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];
const OPTIONAL_PROFILE_FIELDS=['fatherName','motherName','parentNameReadings','namingPreferences','monthAuthorityMethod','seasonalMethod','timeBasis','birthLongitude','renMethod'];
export function readRootFeedbackV132PreviewProfile(value:unknown):BirthProfile {
  if(types.isProxy(value))throw new Error('1.3.2 用神预览拒绝代理输入。');
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('1.3.2 用神预览资料必须是普通对象。');
  const budget={nodes:0,scalarBytes:0},charge=(text:string)=>{budget.scalarBytes+=Buffer.byteLength(text,'utf8');if(budget.scalarBytes>200000)throw new Error('1.3.2 用神预览输入超出大小预算。');};
  const copy=(input:unknown,depth:number,ancestors:Set<object>):unknown=>{
    if(depth>24)throw new Error('1.3.2 用神预览输入嵌套过深。');
    if(++budget.nodes>25000)throw new Error('1.3.2 用神预览输入节点过多。');
    if(input===null){charge('null');return null;}
    if(typeof input==='string'){charge(input);return input;}
    if(typeof input==='boolean'||typeof input==='number'&&Number.isFinite(input)){charge(String(input));return input;}
    if(!input||typeof input!=='object'||types.isProxy(input)||ancestors.has(input))throw new Error('1.3.2 用神预览拒绝代理、循环或非 JSON 数据。');
    const array=Array.isArray(input),prototype=Object.getPrototypeOf(input);
    if(array?prototype!==Array.prototype:![Object.prototype,null].includes(prototype))throw new Error('1.3.2 用神预览资料必须是普通 JSON 对象。');
    ancestors.add(input);
    try{
      if(array){const lengthDescriptor=Object.getOwnPropertyDescriptor(input,'length'),length=lengthDescriptor?.value as number;if(!Number.isSafeInteger(length)||length>4096||Reflect.ownKeys(input).length!==length+1)throw new Error('1.3.2 用神预览数组不完整。');const output:unknown[]=[];for(let index=0;index<length;index++){const descriptor=Object.getOwnPropertyDescriptor(input,String(index));if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('1.3.2 用神预览拒绝数组访问器或空位。');output.push(copy(descriptor.value,depth+1,ancestors));}return output;}
      const output:Record<string,unknown>={};for(const key of Reflect.ownKeys(input)){if(typeof key!=='string'||key==='__proto__'||depth===0&&!PROFILE_FIELDS.includes(key))throw new Error('1.3.2 用神预览包含未允许字段。');const descriptor=Object.getOwnPropertyDescriptor(input,key);if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)throw new Error('1.3.2 用神预览拒绝访问器或隐藏字段。');charge(key);if(depth===0&&descriptor.value===undefined&&OPTIONAL_PROFILE_FIELDS.includes(key))continue;output[key]=copy(descriptor.value,depth+1,ancestors);}return output;
    }finally{ancestors.delete(input);}
  };
  return copy(value,0,new Set()) as BirthProfile;
}
export function assertRootFeedbackV132PreviewOptions(value:unknown):void {
  if(types.isProxy(value))throw new Error('1.3.2 用神预览拒绝代理选项。');
  readRootFeedbackFacadeOptions(value);
}
