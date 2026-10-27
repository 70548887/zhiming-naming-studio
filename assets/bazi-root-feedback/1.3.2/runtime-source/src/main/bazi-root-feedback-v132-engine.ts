import {analyzeChart145,toRootFeedbackPreviewDTO} from '../domain/bazi-mainchain/project-v132';
import pins from './bazi-root-feedback-v132-pins.json';
import type {ChartCase140,MethodPolicy140} from '../shared/bazi-mainchain-method-types';

export const ROOT_FEEDBACK_V132_METHOD_ID='project-bazi-mainchain-145/1.3.2' as const;
export interface RootFeedbackV132BuildIdentity {
 readonly schema:'bazi-root-feedback-build/1';readonly methodId:typeof ROOT_FEEDBACK_V132_METHOD_ID;
 readonly implementationSha256:string;readonly manifestSha256:string;
}
declare const __ROOT_FEEDBACK_V132_BUILD_IDENTITY__:RootFeedbackV132BuildIdentity|undefined;
const identity=typeof __ROOT_FEEDBACK_V132_BUILD_IDENTITY__==='undefined'?undefined:__ROOT_FEEDBACK_V132_BUILD_IDENTITY__;
const verified=new WeakSet<object>();
export interface RootFeedbackV132Engine {
 readonly identity:RootFeedbackV132BuildIdentity;
 analyze(chart:ChartCase140,policy?:MethodPolicy140,disabledControlEdgeIds?:readonly string[],hypothetical?:boolean):ReturnType<typeof analyzeChart145>;
 project(result:ReturnType<typeof analyzeChart145>):ReturnType<typeof toRootFeedbackPreviewDTO>;
}
/** Only the source-verified build helper supplies this compile-time identity. */
export function createRootFeedbackV132Engine():RootFeedbackV132Engine {
 if(!identity||identity.schema!=='bazi-root-feedback-build/1'||identity.methodId!==ROOT_FEEDBACK_V132_METHOD_ID||identity.implementationSha256!==pins.implementationSha256||identity.manifestSha256!==pins.manifestSha256)throw Error('ROOT_FEEDBACK_V132_BUILD_UNVERIFIED: use the fixed source-verified build entry.');
 const engine:RootFeedbackV132Engine=Object.freeze({identity:Object.freeze({...identity}),analyze:analyzeChart145,project:toRootFeedbackPreviewDTO});
 verified.add(engine);return engine;
}
export function assertRootFeedbackV132Engine(value:unknown):asserts value is RootFeedbackV132Engine {
 if(!value||typeof value!=='object'||!verified.has(value))throw Error('ROOT_FEEDBACK_V132_ENGINE_INVALID: a branded fixed 1.3.2 engine is required.');
}
