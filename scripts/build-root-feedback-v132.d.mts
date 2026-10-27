export interface RootFeedbackV132BuildIdentity {schema:'bazi-root-feedback-build/1';methodId:'project-bazi-mainchain-145/1.3.2';implementationSha256:string;manifestSha256:string;}
export function verifyRootFeedbackV132BuildSources(root:string):Readonly<RootFeedbackV132BuildIdentity>;
export function buildRootFeedbackV132(options:{root?:string;outfile:string}):Promise<{schema:string;identity:RootFeedbackV132BuildIdentity;inputs:{file:string;kind:string;bytes:number;sha256:string}[];inputClosureSha256:string;output:{file:string;bytes:number;sha256:string};metafile:unknown}>;
