import type {QiongtongClauseReferencePreview} from '../shared/qiongtong-clause-reference-preview';
import type {JiaSourceSpan} from '../domain/traditional/qiongtong-jia-v11-types';

/** Exact owner contracts combined for UI consumption; no new public API or verification authority. */
export type ClausePreviewWithJia=QiongtongClauseReferencePreview;
export interface ClausePreviewLease {key:string;api:unknown;epoch:number;request:number;}
export function ownsClausePreviewLease(current:ClausePreviewLease & {alive:boolean},lease:ClausePreviewLease):boolean {
 return current.alive&&current.key===lease.key&&current.api===lease.api&&current.epoch===lease.epoch&&current.request===lease.request;
}
export interface ClausePreviewLeaseController {
  activate():void;
  setIdentity(key:string,api:unknown):void;
  identity():{key:string;api:unknown;epoch:number};
  begin():ClausePreviewLease;
  owns(lease:ClausePreviewLease):boolean;
  dispose():void;
}
export function createClausePreviewLeaseController():ClausePreviewLeaseController {
 let identity:{key:string;api:unknown;epoch:number}={key:'',api:undefined,epoch:0},request=0,alive=true;
 return {
  activate(){alive=true;},
  setIdentity(key,api){if(identity.key!==key||identity.api!==api)identity={key,api,epoch:identity.epoch+1};},
  identity(){return {...identity};},
  begin(){return {...identity,request:++request};},
  owns(lease){return ownsClausePreviewLease({...identity,alive,request},lease);},
  dispose(){alive=false;request++;},
 };
}
const sameSpan=(a:JiaSourceSpan,b:JiaSourceSpan)=>a.start===b.start&&a.end===b.end&&a.unit===b.unit&&a.interval===b.interval;
const hash=(value:string)=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value);
function validJiaPair(result:ClausePreviewWithJia):boolean {
 const chapter=result.jiaChapter,verified=result.jiaSourceVerification;
 if(chapter===undefined&&verified===undefined)return true;
 if(!chapter||!verified)return false;
 if(chapter.schema!=='qiongtong-jia-literal-conditions/1.1.0'||verified.schema!=='qiongtong-jia-source-verification/1.0.0'||verified.status!=='verified-fixed-resources'||chapter.school!==result.sourceVerification.school||chapter.namingImpact!=='none'||chapter.source.scanCollation!==false||verified.scanCollation!==false)return false;
 if(verified.sourceId!==chapter.source.id||verified.revision!==chapter.source.revision||verified.rawSha256!==chapter.source.rawSha256||!hash(verified.rawSha256)||!sameSpan(verified.chapter.span,chapter.source.chapterSpan)||!hash(verified.chapter.sha256))return false;
 if(verified.catalog.version!==chapter.schema||!verified.catalog.file||!hash(verified.catalog.sha256)||!Number.isSafeInteger(verified.catalog.bytes)||verified.catalog.bytes<=0||!verified.managedInputs.length||!verified.managedInputs.every(row=>!!row.file&&hash(row.sha256)&&Number.isSafeInteger(row.bytes)&&row.bytes>0)||!verified.monthlySources.length)return false;
 if(chapter.input.complete!==result.reference.input.complete||chapter.input.dayStem!==result.reference.input.dayStem||chapter.input.monthBranch!==result.reference.input.monthBranch||chapter.input.unknownPositions.length!==result.reference.input.unknownPositions.length||!chapter.input.unknownPositions.every(position=>result.reference.input.unknownPositions.includes(position)))return false;
 if(chapter.coverage.firstBatchOnly!==true||chapter.coverage.fullChapterDecisionImplemented!==false||verified.rules.length!==chapter.checks.length||new Set(chapter.checks.map(check=>check.id)).size!==chapter.checks.length)return false;
 return chapter.checks.every(check=>{
  const matches=verified.rules.filter(rule=>rule.id===check.id);if(matches.length!==1)return false;const source=matches[0];
  return typeof check.label==='string'&&!!check.label&&['condition-met','condition-not-met','unknown','not-applicable'].includes(check.status)&&check.decisionLevel==='selected-literal-subclause-only'&&check.wholeSourceBranchDecision==='not-evaluated'&&check.actionEvaluation==='not-evaluated'&&check.usefulGodDecision==='not-evaluated'&&source.quote===check.source.quote&&source.locator===check.source.locator&&sameSpan(source.quoteSpan,check.source.quoteSpan)&&sameSpan(source.contextSpan,check.source.contextSpan)&&source.contextSha256===check.source.contextSha256&&hash(source.contextSha256);
 });
}
/** Checks returned bindings only. All file/resource authentication belongs to the Service. */
export function validClausePreviewResponse(result:ClausePreviewWithJia,profileId:string):boolean {
 try{
  if(result.schema!=='qiongtong-clause-reference-preview/1.0.0'||result.profileId!==profileId)return false;
  const verification=result.sourceVerification;
  if(verification.status!=='verified-fixed-resources'||verification.school!=='qiongtong-wikisource-2294674'||verification.revision!=='wikisource-revision/2294674'||verification.scanCollation!==false||result.reference.school!==verification.school||result.reference.namingImpact!=='none')return false;
  if(verification.conditions.file!=='data/qiongtong-clause-conditions-v1.json'||verification.conditions.schema!=='qiongtong-literal-conditions/1.0.0'||verification.rules.length!==result.reference.rules.length)return false;
  const oldBindings=result.reference.rules.every(rule=>{const rows=verification.rules.filter(row=>row.ruleId===rule.id&&row.existingConditionId===rule.existingConditionId);if(rows.length!==1)return false;const source=rows[0].source,expected=rule.source;return source.id===expected.id&&source.revision===expected.revision&&source.rawSha256===expected.rawSha256&&source.quote===expected.quote&&source.locator===expected.locator&&source.contextQuote===expected.contextQuote&&source.scanCollation===false&&sameSpan(source.quoteSpan,expected.quoteSpan)&&sameSpan(source.contextSpan,expected.contextSpan);});
  return oldBindings&&validJiaPair(result);
 }catch{return false;}
}

