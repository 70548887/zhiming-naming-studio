import type {RootFeedbackV132R2Identity} from './build-root-feedback-v132-r2.mjs';

export interface ProjectApplicationV132R2BuildIdentity {
 schema:'project-application-build/1';
 policyId:'naming-element-application/1.3.2-candidate.2';
 publicationId:'project-naming-application/1.3.2-candidate.2';
 fullClosureSha256:string;
 manifestSha256:string;
 esbuildVersion:string;
 engine:RootFeedbackV132R2Identity;
}
export interface ProjectApplicationV132R2Source {
 sourcePath:string;
 resourcePath:string;
 bytes:number;
 sha256:string;
 role:'execution'|'resolution'|'build';
}
export interface ProjectApplicationV132R2Closure {
 schema:'project-application-execution-closure/1';
 build:{esbuildVersion:string;options:Readonly<Record<string,unknown>>};
 files:ProjectApplicationV132R2Source[];
 executionInputs:string[];
 externalRuntimeModules:string[];
 resolutionGuards:{path:string;expected:'absent'}[];
}
export interface ProjectApplicationV132R2PublicationReceipt {
 schema:'project-application-publication-receipt/1';
 identity:ProjectApplicationV132R2BuildIdentity;
 publicationPath:string;
 pinsPath:string;
 executionInputCount:number;
 closureFileCount:number;
}
export interface ProjectApplicationV132R2BuildReceipt {
 schema:'project-application-build-receipt/1';
 identity:ProjectApplicationV132R2BuildIdentity;
 compiledExecutionSources:ProjectApplicationV132R2Source[];
 virtualInputs:{file:string;bytes:number;sha256:string}[];
 externalRuntimeModules:string[];
 resolutionMetadata:ProjectApplicationV132R2Source[];
 buildSources:ProjectApplicationV132R2Source[];
 runtimeEnvironment:{node:string;icu:string|null;tz:string|null;unicode:string|null;platform:string;arch:string};
 output:{file:string;bytes:number;sha256:string};
 metafile:unknown;
}
export function captureProjectApplicationV132R2Closure(root:string):Promise<ProjectApplicationV132R2Closure>;
export function publishProjectApplicationV132R2(options?:{root?:string}):Promise<ProjectApplicationV132R2PublicationReceipt>;
export function verifyProjectApplicationV132R2BuildSources(root:string):Readonly<ProjectApplicationV132R2BuildIdentity>;
export function buildProjectApplicationV132R2(options:{root?:string;outfile:string}):Promise<ProjectApplicationV132R2BuildReceipt>;
