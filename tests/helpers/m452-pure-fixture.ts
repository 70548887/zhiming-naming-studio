import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {catalogSession} from '../fixtures/catalog-session';
import {normalizePreferences} from '../../src/shared/workflow';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION} from '../../src/shared/naming-rules';
import type {TrustedNamingContext} from '../../src/domain/naming-review-v7.mjs';
import type {Analysis,BirthProfile,CharacterEntry,Citation,NamingPreferences} from '../../src/shared/types';

export type ReviewedVersion=typeof NAMING_RULE_V7_VERSION|typeof NAMING_RULE_V71_VERSION;
export interface CandidateFixture {
  version:ReviewedVersion;context:TrustedNamingContext;profile:BirthProfile;
  preferences:NamingPreferences;analysis:Analysis;characters:CharacterEntry[];citations:Citation[];
}

/** Reuses only M331 helper lines33-37 (raw pack identity/dataset) and47-51
 * (manual fixture). The pack is read as bytes, never opened as SQL. The original
 * catalog fixture imports shared code only. No main loader, project basis,
 * resolver, producer or generation authority is created by this fixture. */
export function manualFixture(version:ReviewedVersion=NAMING_RULE_V7_VERSION,length:1|2=2,preferredElements:NamingPreferences['preferredElements']=['水']):CandidateFixture {
  const sample=catalogSession('m331-pure-candidate');
  const pack=new Uint8Array(readFileSync(resolve('data/knowledge-v6.sqlite')));
  const sha256=createHash('sha256').update(pack).digest('hex'),activeVersion=sha256.slice(0,12);
  const dataset=JSON.parse(readFileSync(resolve('data/dataset-v6.json'),'utf8')) as {characters:CharacterEntry[];citations:Citation[]};
  const context:TrustedNamingContext={packSha256:sha256,activeVersion};
  const preferences=normalizePreferences({...sample.preferences,length,preferredElements,requiredChars:'',generationChar:'',forbiddenChars:'',elderTaboo:'',style:'自然',meanings:'',industry:'',numerology:false,zodiacRules:false});
  const profile:BirthProfile={...sample.profile,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:'',namingPreferences:structuredClone(preferences)};
  return {version,context,profile,preferences,analysis:structuredClone(sample.analysis),characters:dataset.characters,citations:dataset.citations};
}
