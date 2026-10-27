/** First batch of discrete facts from the COMPLETE fixed Jia chapter.
 * No field below authorizes naming adoption or a complete useful-god verdict.
 */
export type JiaLiteralState='condition-met'|'condition-not-met'|'unknown'|'not-applicable';
export interface JiaSourceSpan {readonly start:number;readonly end:number;readonly unit:'unicode-codepoint';readonly interval:'[start,end)';}
export interface JiaMonthCoverage {
  readonly monthBranch:string;
  readonly transcribedParagraphs:number;
  readonly sourceSentenceUnits:number;
  readonly identifiedBranchAnchors:number;
  readonly newExecutablePredicates:number;
  readonly existingVersionAnchors:number;
  readonly needsDefinition:number;
  readonly queuedDiscreteReview:number;
  readonly recordedTextOnly:number;
  readonly fullMonthDecisionImplemented:false;
  readonly paragraphIds:readonly string[];
  readonly actualUnimplementedSentenceIds:readonly string[];
}
export interface JiaLiteralReferenceV11 {
  readonly schema:'qiongtong-jia-literal-conditions/1.1.0';
  readonly school:'qiongtong-wikisource-2294674';
  readonly source:{readonly id:'bazi-monthly-qiongtong-2294674';readonly revision:'wikisource-revision/2294674';readonly rawSha256:string;readonly chapterSpan:JiaSourceSpan;readonly scanCollation:false;};
  readonly input:{readonly complete:boolean;readonly dayStem:string|null;readonly monthBranch:string|null;readonly unknownPositions:readonly string[];};
  readonly checks:readonly {
    readonly id:string;
    readonly label:string;
    readonly status:JiaLiteralState;
    readonly applicability:{readonly dayStem:'met'|'not-met'|'unknown';readonly monthBranch:'met'|'not-met'|'unknown';};
    readonly literalFact:{readonly result:'met'|'not-met'|'unknown'|'not-evaluated';readonly evidence:readonly string[];readonly missing:readonly string[];};
    readonly source:{readonly quote:string;readonly locator:string;readonly quoteSpan:JiaSourceSpan;readonly contextSpan:JiaSourceSpan;readonly contextSha256:string;};
    readonly decisionLevel:'selected-literal-subclause-only';
    readonly wholeSourceBranchDecision:'not-evaluated';
    readonly actionEvaluation:'not-evaluated';
    readonly usefulGodDecision:'not-evaluated';
    readonly unresolvedDependencies:readonly string[];
  }[];
  readonly coverage:{readonly firstBatchOnly:true;readonly fullChapterDecisionImplemented:false;readonly newlyExecutablePredicates:4;readonly months:readonly JiaMonthCoverage[];};
  readonly namingImpact:'none';
}
