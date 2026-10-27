import type {BirthProfile,SourceRecord} from './types';
import type {RootFeedbackResourceIdentity} from './bazi-root-feedback-application';
import type {JiaHaiCarrierSelector,JiaHaiControlOptions,JiaHaiControlProjection} from '../domain/traditional/jia-hai-control-types';
export type {JiaHaiCarrierSelector,JiaHaiControlOptions,JiaHaiControlProjection};
export interface JiaHaiControlPreview {
  readonly schema:'jia-hai-control-preview/1.0.0';
  readonly profileId:string;
  readonly request:{readonly enabled:boolean;readonly selector:JiaHaiCarrierSelector|null};
  readonly projection:JiaHaiControlProjection;
  readonly sourceVerification:{
    readonly schema:'jia-hai-control-source-verification/1.0.0';
    readonly status:'verified-fixed-resources';
    readonly school:'qiongtong-wikisource-2294674';
    readonly sourceId:'bazi-monthly-qiongtong-2294674';
    readonly revision:'wikisource-revision/2294674';
    readonly rawSha256:string;readonly scanCollation:false;
    readonly quote:string;
    readonly quoteSpan:{readonly start:number;readonly end:number;readonly unit:'unicode-codepoint';readonly interval:'[start,end)'};
    readonly context:{readonly span:JiaHaiControlPreview['sourceVerification']['quoteSpan'];readonly sha256:string};
    readonly counterControl:{readonly quote:string;readonly span:JiaHaiControlPreview['sourceVerification']['quoteSpan']};
    readonly monthlySources:readonly SourceRecord[];
    readonly managedInputs:readonly {readonly file:string;readonly sha256:string;readonly bytes:number}[];
    readonly project:{readonly methodId:'project-bazi-mainchain-145/1.3.1';readonly resourceIdentity:RootFeedbackResourceIdentity;readonly sources:readonly SourceRecord[]};
    readonly binding:{readonly profileId:string;readonly projectionSchema:'jia-hai-wu-ren-project-intervention/1.0.0';readonly originalAnalysisDigest:string};
  };
}
export interface JiaHaiControlPreviewApi {
  previewJiaHaiControl(profile:BirthProfile,options?:JiaHaiControlOptions):Promise<JiaHaiControlPreview>;
}
