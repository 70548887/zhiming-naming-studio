import {createManualM970MeaningQuery} from '../src/main/m970-manual-character-meaning-query.mjs';
import type {ManualM970MeaningOptions} from '../src/main/m970-manual-character-meaning-query.mjs';
import type {SingleCharacterMeaningOptions} from '../src/shared/single-character-meaning';

const adapter=createManualM970MeaningQuery({dataDir:'fixed-directory'});
const result:ManualM970MeaningOptions=adapter.getSingleCharacterMeaningOptions({mode:'manual-request',char:'傲',pinyin:'ào',tone:4,senseId:'moe-revised:14019:0:1',packSha256:'fixed-full-sha256',activeVersion:'fixed-runtime-version'});
const existingDto:SingleCharacterMeaningOptions=result;
const newSourceHash:string=result.options[0].source.originalSha256;
const sourceOriginals:readonly Readonly<Record<string,unknown>>[]=result.options[0].source.allOriginalReadings;
const manualOnly:'manual-context-required'=result.options[0].usageStatus;
const noAdmission:false=result.options[0].admissionGranted;
const noCoverage:0=result.formalCoverageAdded;
void [existingDto,newSourceHash,sourceOriginals,manualOnly,noAdmission,noCoverage];
// @ts-expect-error The old char-only query cannot silently become an explicit manual request.
adapter.getSingleCharacterMeaningOptions({char:'傲'});
// @ts-expect-error Automatic requests are outside the module contract.
adapter.getSingleCharacterMeaningOptions({mode:'automatic',char:'傲',pinyin:'ào',tone:4,senseId:'x',packSha256:'y',activeVersion:'z'});
// @ts-expect-error No caller-provided admission or verified flag is accepted.
createManualM970MeaningQuery({dataDir:'x',verified:true});
