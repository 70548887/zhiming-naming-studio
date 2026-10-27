import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PROJECT_APPLICATION_V132_POLICY,PROJECT_APPLICATION_V132_PUBLICATION,type ProjectApplicationBuildIdentity,type ProjectApplicationIdentity} from '../shared/project-application-v132';
import type {RootFeedbackV132Engine} from './bazi-root-feedback-v132-r2-engine';
import {assertRootFeedbackV132Engine} from './bazi-root-feedback-v132-r2-engine';
import type {SourceRecord} from '../shared/types';
import {applicationDigest,applicationSame,freezeApplication} from './project-application-v132-common';

declare const __PROJECT_APPLICATION_V132_BUILD_IDENTITY__:ProjectApplicationBuildIdentity|undefined;
const injected=typeof __PROJECT_APPLICATION_V132_BUILD_IDENTITY__==='undefined'?undefined:__PROJECT_APPLICATION_V132_BUILD_IDENTITY__;
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const validHash=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const fail=(message:string):never=>{throw Error('PROJECT_APPLICATION_RESOURCES_INVALID: '+message);};
function read(base:string,relative:string):Buffer {
 if(typeof relative!=='string'||relative.includes('\\')||relative.includes(':')||relative.startsWith('/')||relative.split('/').some(part=>!part||part==='.'||part==='..'))return fail('unsafe resource path');
 try{const file=fs.realpathSync(path.join(base,...relative.split('/'))),root=fs.realpathSync(base),inside=path.relative(root,file);if(inside==='..'||inside.startsWith('..'+path.sep)||path.isAbsolute(inside)||!fs.statSync(file).isFile())return fail('resource escaped publication');return fs.readFileSync(file);}catch{return fail('missing publication file '+relative);}
}
export interface VerifiedProjectApplicationResources {identity:ProjectApplicationIdentity;sources:SourceRecord[];}
const bound=new WeakMap<object,RootFeedbackV132Engine>();
/** A separate source closure certifies the new policy and saved adapter, not the preview manifest. */
export function loadProjectApplicationResources(assetDir:string,engine:RootFeedbackV132Engine):VerifiedProjectApplicationResources {
 assertRootFeedbackV132Engine(engine);
 if(!injected||injected.schema!=='project-application-build/1'||injected.policyId!==PROJECT_APPLICATION_V132_POLICY||injected.publicationId!==PROJECT_APPLICATION_V132_PUBLICATION||!validHash(injected.fullClosureSha256)||!validHash(injected.manifestSha256)||!applicationSame(injected.engine,engine.identity))return fail('official independent application build and same r2 engine required');
 if(typeof assetDir!=='string'||!path.isAbsolute(assetDir))return fail('absolute main process asset root required');
 const base=path.join(assetDir,'project-naming-application','1.3.2-candidate.1'),bytes=read(base,'resource-manifest.json');
 if(sha(bytes)!==injected.manifestSha256)return fail('application manifest bytes differ');
 const manifest=JSON.parse(bytes.toString('utf8'));
 if(manifest.schema!=='project-application-resource-manifest/1'||manifest.policyId!==injected.policyId||manifest.publicationId!==injected.publicationId||manifest.fullClosureSha256!==injected.fullClosureSha256||applicationDigest(manifest.closure)!==injected.fullClosureSha256||!applicationSame(manifest.engine,injected.engine)||!Array.isArray(manifest.files)||!Array.isArray(manifest.sources))return fail('application tuple or full closure differs');
 const seen=new Set<string>();
 for(const file of manifest.files){if(!file||typeof file.path!=='string'||seen.has(file.path)||!Number.isSafeInteger(file.bytes)||file.bytes<0||!validHash(file.sha256))return fail('invalid fixed file row');seen.add(file.path);const actual=read(base,file.path);if(actual.length!==file.bytes||sha(actual)!==file.sha256)return fail('fixed application bytes differ: '+file.path);}
 if(!Array.isArray(manifest.closure.files)||!Array.isArray(manifest.closure.executionInputs))return fail('execution closure missing');
 for(const file of manifest.closure.files){const row=manifest.files.find((entry:{path:string})=>entry.path===file.resourcePath);if(!row||row.bytes!==file.bytes||row.sha256!==file.sha256)return fail('source mapping differs: '+file.sourcePath);}
 const required=['src/main/project-application-v132.ts','src/main/project-application-v132-policy.ts','src/main/project-application-v132-saved.ts','src/main/project-application-v132-resources.ts','data/project-application-v132-policy.json'];
 if(required.some(file=>!manifest.closure.executionInputs.includes(file)))return fail('application/saved/policy implementation missing from closure');
 if(manifest.sources.length!==1)return fail('one independent application source required');
 const source=manifest.sources[0];
 if(source.id!=='project-naming-application-v132-candidate.1'||!Array.isArray(source.files)||source.files.some((file:string)=>!seen.has(file))||!manifest.files.some((file:{path:string;kind:string;sha256:string})=>file.kind==='publication'&&source.files.includes(file.path)&&file.sha256===source.sha256))return fail('policy source attribution or publication mismatch');
 const identity:ProjectApplicationIdentity={...injected,runtimeEnvironment:{node:process.versions.node,icu:process.versions.icu??null,tz:process.versions.tz??null,unicode:process.versions.unicode??null}};
 const value=freezeApplication({identity,sources:manifest.sources as SourceRecord[]});bound.set(value,engine);return value;
}
export function assertProjectApplicationResourceBinding(value:VerifiedProjectApplicationResources,engine:RootFeedbackV132Engine):void {
 assertRootFeedbackV132Engine(engine);if(bound.get(value)!==engine)return fail('cloned or cross-engine application resources rejected');
}
