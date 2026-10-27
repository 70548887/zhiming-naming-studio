import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {canonicalPlainJson} from '../shared/plain-json';
import type {SourceRecord} from '../shared/types';
import type {RootFeedbackResourceFile} from '../shared/bazi-root-feedback-application';
import {ROOT_FEEDBACK_V132_POLICY,type RootFeedbackV132ResourceIdentity} from '../shared/bazi-root-feedback-v132-r2-facade';
import {assertRootFeedbackV132Engine,ROOT_FEEDBACK_V132_METHOD_ID,type RootFeedbackV132Engine} from './bazi-root-feedback-v132-r2-engine';

export interface VerifiedRootFeedbackV132Resources {readonly resourceIdentity:RootFeedbackV132ResourceIdentity;readonly sources:SourceRecord[];}
export interface RootFeedbackV132ResourceConfiguration {assetDir:string;}
const boundEngines=new WeakMap<object,RootFeedbackV132Engine>();
const sha256=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const fail=(message:string):never=>{throw Error('ROOT_FEEDBACK_V132_R2_RESOURCES_UNAVAILABLE: '+message);};
const hash=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const safe=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.includes(':')&&!value.startsWith('/')&&value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..');
function exact(value:unknown,keys:string[]):asserts value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return fail('manifest must be a plain data object.');
 if(Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail('manifest fields differ from the fixed schema.');
 for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!keys.includes(key)||!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)fail('manifest contains an accessor or hidden field.');}
}
function read(base:string,relative:string):Buffer {
 try{const actual=fs.realpathSync(path.join(base,...relative.split('/'))),rel=path.relative(fs.realpathSync(base),actual);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||!fs.statSync(actual).isFile())return fail('resource escapes the publication: '+relative);return fs.readFileSync(actual);}catch(error){if(error instanceof Error&&error.message.startsWith('ROOT_FEEDBACK_'))throw error;return fail('missing fixed resource: '+relative);}
}
function freeze<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
/** Packaged resources bind the complete facade execution closure; checkout source is never read here. */
export function loadRootFeedbackV132Resources(configuration:RootFeedbackV132ResourceConfiguration,engine:RootFeedbackV132Engine):VerifiedRootFeedbackV132Resources {
 assertRootFeedbackV132Engine(engine);const pin=engine.identity;
 if(!configuration||typeof configuration.assetDir!=='string'||!path.isAbsolute(configuration.assetDir)||!hash(pin.manifestSha256))return fail('an absolute main-process asset root and a compiled fixed pin are required.');
 const base=path.join(configuration.assetDir,'bazi-root-feedback','1.3.2-r2'),bytes=read(base,'resource-manifest.json');
 if(sha256(bytes)!==pin.manifestSha256)return fail('manifest bytes differ from the full-closure built engine pin.');
 let raw:unknown;try{raw=JSON.parse(bytes.toString('utf8'));}catch{return fail('manifest is not JSON.');}
 exact(raw,['schema','methodId','applicationPolicyVersion','publicationId','fullClosureSha256','kernel','files','sources','closure']);
 if(raw.schema!=='bazi-root-feedback-resource-manifest/3'||raw.methodId!==ROOT_FEEDBACK_V132_METHOD_ID||raw.applicationPolicyVersion!==ROOT_FEEDBACK_V132_POLICY||raw.publicationId!==pin.publicationId||raw.fullClosureSha256!==pin.fullClosureSha256||sha256(canonicalPlainJson(raw.closure))!==pin.fullClosureSha256)return fail('wrong version or complete execution closure identity.');
 exact(raw.kernel,['methodId','sourceRevision']);exact(raw.closure,['schema','build','files','executionInputs','externalRuntimeModules','resolutionGuards']);
 if(raw.kernel.methodId!=='project-bazi-mainchain-144/1.2.0'||!hash(raw.kernel.sourceRevision)||!Array.isArray(raw.files)||!Array.isArray(raw.sources)||raw.sources.length!==1||!Array.isArray(raw.closure.files)||!Array.isArray(raw.closure.executionInputs))return fail('incomplete fixed facade execution closure.');
 const seen=new Set<string>();
 for(const file of raw.files){exact(file,['path','bytes','sha256','kind']);if(!safe(file.path)||seen.has(file.path)||!Number.isSafeInteger(file.bytes)||(file.bytes as number)<0||!hash(file.sha256)||!['rule','source-lock','runtime-source','license','notice','publication'].includes(file.kind as string))return fail('invalid or duplicate fixed resource entry.');seen.add(file.path);const actual=read(base,file.path);if(actual.length!==file.bytes||sha256(actual)!==file.sha256)return fail('resource bytes differ: '+file.path);}
 for(const expected of raw.closure.files){exact(expected,['sourcePath','resourcePath','bytes','sha256','role']);if(!safe(expected.sourcePath)||!safe(expected.resourcePath)||!hash(expected.sha256)||!Number.isSafeInteger(expected.bytes))return fail('invalid complete-closure source mapping.');const row=raw.files.find(file=>file.path===expected.resourcePath);if(!row||row.bytes!==expected.bytes||row.sha256!==expected.sha256)return fail('published source differs from the full compiled closure: '+expected.sourcePath);}
 for(const source of raw.sources){exact(source,['id','name','url','commit','license','files','sha256','note']);if(!Array.isArray(source.files))return fail('source attribution file list is missing.');const sourceFiles=source.files;if(source.id!=='project-bazi-mainchain-145-v132-r2-preview'||['name','url','commit','license','note'].some(key=>typeof source[key]!=='string'||!(source[key] as string))||!hash(source.sha256)||sourceFiles.length===0||sourceFiles.some(file=>!safe(file)||!seen.has(file))||!raw.files.some(file=>file.kind==='publication'&&file.sha256===source.sha256&&sourceFiles.includes(file.path)))return fail('source attribution or publication pin mismatch.');}
 const identity:RootFeedbackV132ResourceIdentity={schema:'bazi-root-feedback-resource-identity/3',methodId:ROOT_FEEDBACK_V132_METHOD_ID,applicationPolicyVersion:ROOT_FEEDBACK_V132_POLICY,publicationId:pin.publicationId,manifestSha256:pin.manifestSha256,fullClosureSha256:pin.fullClosureSha256,kernel:raw.kernel as unknown as RootFeedbackV132ResourceIdentity['kernel'],files:raw.files as unknown as RootFeedbackResourceFile[],runtimeEnvironment:{node:process.versions.node,icu:process.versions.icu??null,tz:process.versions.tz??null,unicode:process.versions.unicode??null}};
 const result=freeze({resourceIdentity:identity,sources:raw.sources as unknown as SourceRecord[]});canonicalPlainJson(result);boundEngines.set(result,engine);return result;
}
export function assertRootFeedbackV132ResourceBinding(resources:unknown,engine:RootFeedbackV132Engine):asserts resources is VerifiedRootFeedbackV132Resources {
 assertRootFeedbackV132Engine(engine);if(!resources||typeof resources!=='object'||boundEngines.get(resources)!==engine)fail('only resources bound by this loader to the same full-closure engine are accepted.');
}
