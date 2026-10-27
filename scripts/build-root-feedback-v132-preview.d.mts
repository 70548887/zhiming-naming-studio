import type {buildRootFeedbackV132R2} from './build-root-feedback-v132-r2.mjs';
type PreviewBuildReceipt=Awaited<ReturnType<typeof buildRootFeedbackV132R2>>;
export function rootFeedbackV132PreviewOutput(root:string):string;
export function buildRootFeedbackV132Preview(root?:string):Promise<PreviewBuildReceipt>;
export function createLazyRootFeedbackV132PreviewBuild(root:string):()=>Promise<PreviewBuildReceipt>;
