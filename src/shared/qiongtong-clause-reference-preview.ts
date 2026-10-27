import type {BirthProfile,SourceRecord} from './types';
import type {FreshQiongtongClauseReference,QiongtongClauseReference} from './qiongtong-clause-reference';
import type {JiaLiteralReferenceV11,JiaSourceSpan} from '../domain/traditional/qiongtong-jia-v11-types';

export interface JiaChapterSourceVerification {
  schema:'qiongtong-jia-source-verification/1.0.0';
  status:'verified-fixed-resources';
  sourceId:'bazi-monthly-qiongtong-2294674';
  revision:'wikisource-revision/2294674';
  rawSha256:string;
  scanCollation:false;
  monthlySources:readonly SourceRecord[];
  catalog:{file:string;version:'qiongtong-jia-literal-conditions/1.1.0';sha256:string;bytes:number};
  managedInputs:readonly {file:string;sha256:string;bytes:number}[];
  chapter:{span:JiaSourceSpan;sha256:string};
  rules:readonly {id:string;quote:string;locator:string;quoteSpan:JiaSourceSpan;contextSpan:JiaSourceSpan;contextSha256:string}[];
}

export const QIONGTONG_CLAUSE_PREVIEW_SCHEMA='qiongtong-clause-reference-preview/1.0.0' as const;
export interface QiongtongClauseReferencePreview extends FreshQiongtongClauseReference {
  schema:typeof QIONGTONG_CLAUSE_PREVIEW_SCHEMA;
  profileId:string;
  /** Older envelope1.0.0 clients may omit this pair; the new adapter returns both or rejects. */
  jiaChapter?:JiaLiteralReferenceV11;
  jiaSourceVerification?:JiaChapterSourceVerification;
  sourceVerification:{
    status:'verified-fixed-resources';
    school:'qiongtong-wikisource-2294674';
    revision:'wikisource-revision/2294674';
    label:'《穷通宝鉴》固定电子修订2294674 · 三条字面条件参考';
    scanCollation:false;
    sources:readonly SourceRecord[];
    conditions:{
      file:'data/qiongtong-clause-conditions-v1.json';
      schema:'qiongtong-literal-conditions/1.0.0';
      sha256:string;
    };
    rules:readonly {
      ruleId:string;
      existingConditionId:string;
      entryId:string;
      source:QiongtongClauseReference['rules'][number]['source'];
    }[];
  };
}
export interface QiongtongClauseReferenceApi {
  previewQiongtongClauseReferences(profile:BirthProfile):Promise<QiongtongClauseReferencePreview>;
}
