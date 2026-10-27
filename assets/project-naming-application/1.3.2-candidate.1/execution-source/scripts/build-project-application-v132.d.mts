import type {RootFeedbackV132R2Identity} from './build-root-feedback-v132-r2.mjs';

export interface ProjectApplicationV132BuildIdentity {
 schema:'project-application-build/1';
 policyId:'naming-element-application/1.3.2-candidate.1';
 publicationId:'project-naming-application/1.3.2-candidate.1';
 fullClosureSha256:string;
 manifestSha256:string;
 esbuildVersion:string;
 engine:RootFeedbackV132R2Identity;
}
export interface ProjectApplicationV132Source {
 sourcePath:string;
 resourcePath:string;
 bytes:number;
 sha256:string;
 role:'execution'|'resolution'|'build';
}
export interface ProjectApplicationV132Closure {
 schema:'project-application-execution-closure/1';
 build:{esbuildVersion:string;options:Readonly<Record<string,unknown>>};
 files:ProjectApplicationV132Source[];
 executionInputs:string[];
 externalRuntimeModules:string[];
 resolutionGuards:{path:string;expected:'absent'}[];
}
export interface ProjectApplicationV132PublicationReceipt {
 schema:'project-application-publication-receipt/1';
 identity:ProjectApplicationV132BuildIdentity;
 publicationPath:string;
 pinsPath:string;
 executionInputCount:number;
 closureFileCount:number;
}
export interface ProjectApplicationV132BuildReceipt {
 schema:'project-application-build-receipt/1';
 identity:ProjectApplicationV132BuildIdentity;
 compiledExecutionSources:ProjectApplicationV132Source[];
 virtualInputs:{file:string;bytes:number;sha256:string}[];
 externalRuntimeModules:string[];
 resolutionMetadata:ProjectApplicationV132Source[];
 buildSources:ProjectApplicationV132Source[];
 runtimeEnvironment:{node:string;icu:string|null;tz:string|null;unicode:string|null;platform:string;arch:string};
 output:{file:string;bytes:number;sha256:string};
 metafile:unknown;
}
export function captureProjectApplicationV132Closure(root:string):Promise<ProjectApplicationV132Closure>;
export function publishProjectApplicationV132(options?:{root?:string}):Promise<ProjectApplicationV132PublicationReceipt>;
export function verifyProjectApplicationV132BuildSources(root:string):Readonly<ProjectApplicationV132BuildIdentity>;
export function buildProjectApplicationV132(options:{root?:string;outfile:string}):Promise<ProjectApplicationV132BuildReceipt>;
