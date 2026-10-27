import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {manualFixture,type ReviewedVersion} from './m452-pure-fixture';
import {NAMING_RULE_V7_VERSION} from '../../src/shared/naming-rules';
import type {OwnedReviewedCitationBatchInputs} from '../../src/domain/naming-v7';
import type {CitationReadingTableV4,CitationReadingTableV5} from '../../src/domain/naming-semantics-v5';
import type {CitationReadingTableV6} from '../../src/domain/naming-semantics-v6';

export type PureRow={givenName:string;origin:'local'|'ai'};
const text=(file:string)=>readFileSync(resolve('data',file),'utf8');

/** Pure computation fixture only. The API field verifiedV4Table below contains
 * ordinary parsed fixture data, not a main-loader/source-authentication grant.
 * No Store, SQL, main producer, project resolver or FactVerification is used. */
export function ownedInputs(candidates:ReadonlyArray<PureRow>,version:ReviewedVersion=NAMING_RULE_V7_VERSION):OwnedReviewedCitationBatchInputs {
  const fixture=manualFixture(version);
  const raw=Object.freeze({
    baseJson:text('naming-editorial.json'),v5Json:text('naming-editorial-v5.json'),
    v6Json:text('naming-editorial-v6.json'),v7Json:text('naming-editorial-v7.json'),
  });
  return {
    raw,verifiedV4Table:JSON.parse(text('naming-editorial-v4.json')) as CitationReadingTableV4,
    version,trustedContext:fixture.context,profile:fixture.profile,preferences:fixture.preferences,
    analysis:fixture.analysis,characters:fixture.characters,citations:fixture.citations,candidates,
  };
}

export function gateTables(inputs:OwnedReviewedCitationBatchInputs){
  return {
    v4:structuredClone(inputs.verifiedV4Table),
    v5:JSON.parse(inputs.raw.v5Json) as CitationReadingTableV5,
    v6:JSON.parse(inputs.raw.v6Json) as CitationReadingTableV6,
  };
}
