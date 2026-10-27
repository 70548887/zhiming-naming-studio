import {analyzeChart145,toRootFeedbackPreviewDTO} from '../domain/bazi-mainchain/project-v132';
import type {ChartCase140,MethodPolicy140} from '../shared/bazi-mainchain-method-types';

export const ROOT_FEEDBACK_V132_METHOD_ID='project-bazi-mainchain-145/1.3.2' as const;
export interface RootFeedbackV132BuildIdentity {
 readonly schema:'bazi-root-feedback-build/2';readonly methodId:typeof ROOT_FEEDBACK_V132_METHOD_ID;
 readonly publicationId:'bazi-root-feedback/1.3.2;preview-publication-r2';
 readonly fullClosureSha256:string;readonly manifestSha256:string;readonly esbuildVersion:string;
}
declare const __ROOT_FEEDBACK_V132_R2_BUILD_IDENTITY__:RootFeedbackV132BuildIdentity|undefined;
const injected=typeof __ROOT_FEEDBACK_V132_R2_BUILD_IDENTITY__==='undefined'?undefined:__ROOT_FEEDBACK_V132_R2_BUILD_IDENTITY__;
const verified=new WeakSet<object>();
export interface RootFeedbackV132Engine {
 readonly identity:RootFeedbackV132BuildIdentity;
 analyze(chart:ChartCase140,policy?:MethodPolicy140,disabledControlEdgeIds?:readonly string[],hypothetical?:boolean):ReturnType<typeof analyzeChart145>;
 project(result:ReturnType<typeof analyzeChart145>):ReturnType<typeof toRootFeedbackPreviewDTO>;
}
/** The official build gate pins every compiler input and resolver dependency before injecting this trust anchor. */
export function rootFeedbackV132R2BuildIdentity():RootFeedbackV132BuildIdentity {
 if(!injected||injected.schema!=='bazi-root-feedback-build/2'||injected.methodId!==ROOT_FEEDBACK_V132_METHOD_ID||injected.publicationId!=='bazi-root-feedback/1.3.2;preview-publication-r2'||!/^[a-f0-9]{64}$/.test(injected.fullClosureSha256)||!/^[a-f0-9]{64}$/.test(injected.manifestSha256)||typeof injected.esbuildVersion!=='string'||!injected.esbuildVersion)throw Error('ROOT_FEEDBACK_V132_R2_BUILD_UNVERIFIED: use the fixed full-closure build entry.');
 return Object.freeze({...injected});
}
export function createRootFeedbackV132Engine():RootFeedbackV132Engine {
 const engine:RootFeedbackV132Engine=Object.freeze({identity:rootFeedbackV132R2BuildIdentity(),analyze:analyzeChart145,project:toRootFeedbackPreviewDTO});verified.add(engine);return engine;
}
export function assertRootFeedbackV132Engine(value:unknown):asserts value is RootFeedbackV132Engine {
 if(!value||typeof value!=='object'||!verified.has(value))throw Error('ROOT_FEEDBACK_V132_R2_ENGINE_INVALID: a branded full-closure engine is required.');
}
