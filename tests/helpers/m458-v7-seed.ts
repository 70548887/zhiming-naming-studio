/** Independent V7 generation through existing public calculation/finalization
 * and ordinary Store saves. No V71 row is relabelled and no capability is made. */
import {randomUUID} from 'node:crypto';
import type {Store} from '../../src/main/store';
import {analyzeProfile} from '../../src/domain/engine';
import {generateLocalForRuleVersionWithContext} from '../../src/domain/naming';
import {finalizeNamingCandidateForRuleVersion} from '../../src/main/naming-meaning-review';
import {packSha} from '../../src/main/candidate-facts';
import {createSessionSourceSnapshot} from '../../src/shared/session-sources';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V7_SOURCE_ID} from '../../src/shared/naming-rules';
import {normalizePreferences} from '../../src/shared/workflow';
import {readNamingElementMethodSelection} from '../../src/shared/project-naming-use';
import {readNamePhoneticPreferences} from '../../src/shared/name-phonetic-preferences';
import {loadNumerologyData} from '../../src/main/numerology-data';
import {loadQimenSources} from '../../src/main/qimen-data';
import {loadBaziSources} from '../../src/main/bazi-data';
import {loadMonthAuthoritySources} from '../../src/main/month-authority-data';
import {loadMonthlySeasonalData} from '../../src/main/monthly-seasonal-data';
import {loadSeasonalConditionSources} from '../../src/main/seasonal-condition-data';
import {loadCongWealthSources} from '../../src/main/cong-wealth-data';
import {loadCongShaSources} from '../../src/main/cong-sha-data';
import {loadFollowingRestrictionsSources} from '../../src/main/following-restrictions-data';
import {loadDitianRenSources} from '../../src/main/ditian-ren-data';
import {loadRenNecessarySources} from '../../src/main/ren-necessary-data';
import {loadRenActionsSources} from '../../src/main/ren-actions-data';
import {loadRenCapacitiesSources} from '../../src/main/ren-capacities-data';
import {loadRenDirectionsSources} from '../../src/main/ren-directions-data';
import {loadRenJointBattleSources} from '../../src/main/ren-joint-battle-data';
import {loadSolarTimeSources} from '../../src/main/solar-time-data';
import {parentNameGenerationSources} from '../../src/main/parent-name-phonetics-adapter';
import {loadNamingEditorialV7Sources} from '../../src/main/naming-editorial-v7-data';
import type {BirthProfile,NamingSession} from '../../src/shared/types';

function freeze<T>(value:T):T {
  if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
  return value;
}
export function saveIndependentV7(store:Store,baseline:BirthProfile):NamingSession {
  const preferences=freeze(normalizePreferences({length:2,requiredChars:'安宁',preferredElements:['水'],numerology:false,zodiacRules:false}));
  if(readNamingElementMethodSelection(preferences)||readNamePhoneticPreferences(preferences)||preferences.imageryReading||preferences.yueReading||(preferences.yueHomophones&&preferences.yueHomophones!=='none'))throw new Error('M458 V7 fixture must stay on the ordinary manual/optional-disabled path');
  const profile:BirthProfile={...structuredClone(baseline),id:randomUUID(),customerName:'M458 独立公开V7生成',fatherName:'',motherName:'',namingPreferences:preferences};
  const analysis=analyzeProfile(profile),dataset=store.dataset,pack=store.currentPackBytes();
  const context={packSha256:packSha(pack),activeVersion:dataset.version};
  const generated=generateLocalForRuleVersionWithContext(NAMING_RULE_V7_VERSION,context,profile,preferences,analysis,dataset.characters,dataset.citations,29);
  if(!generated.candidates.length)throw new Error('M458 independent V7 generator returned no candidate');
  const candidates=generated.candidates.map(candidate=>finalizeNamingCandidateForRuleVersion(NAMING_RULE_V7_VERSION,candidate,profile,preferences,analysis,context));
  const directory=store.dataDir,numerology=loadNumerologyData(directory);
  // This is the full ordinary Service source-registration list for these
  // manual/none/civil, empty-parent, optional-feature-disabled inputs.
  const sourceSnapshot=createSessionSourceSnapshot(dataset.version,[
    ...dataset.sources,...numerology.strokes.sources,...numerology.rules.sources,
    ...loadQimenSources(directory),...loadBaziSources(directory),...loadMonthAuthoritySources(directory),
    ...loadMonthlySeasonalData(directory).sources,...loadSeasonalConditionSources(directory),
    ...loadCongWealthSources(directory),...loadCongShaSources(directory),...loadFollowingRestrictionsSources(directory),
    ...(analysis.renCommentary?loadDitianRenSources(directory):[]),
    ...(analysis.renCommentary?.necessaryConditions?loadRenNecessarySources(directory):[]),
    ...(analysis.renCommentary?.actionAnalysis?loadRenActionsSources(directory):[]),
    ...(analysis.renCommentary?.capacityAnalysis?loadRenCapacitiesSources(directory):[]),
    ...(analysis.renCommentary?.directionAnalysis?loadRenDirectionsSources(directory):[]),
    ...(analysis.renCommentary?.jointBattleAnalysis?loadRenJointBattleSources(directory):[]),
    ...(analysis.bazi.timeBasis?.sourceId?loadSolarTimeSources(directory):[]),
    ...parentNameGenerationSources(preferences,profile,dataset.sources),...loadNamingEditorialV7Sources(directory),
    // No namingElementMethod is selected: the existing manual resolver's
    // sourceRecords are empty, and no project-basis authority is constructed.
  ]);
  const session:NamingSession={
    id:randomUUID(),profileId:profile.id,createdAt:new Date().toISOString(),profile,preferences,analysis,candidates,
    reviewNote:'',originalFavorable:[...analysis.bazi.favorable],dataVersion:dataset.version,sourceSnapshot,
    namingRules:{version:NAMING_RULE_V7_VERSION,dataVersion:dataset.version,sourceId:NAMING_RULE_V7_SOURCE_ID},
  };
  store.saveProfile(profile);const saved=store.saveSession(session),verified=store.readVerifiedSession(saved.id);
  if(!verified||verified.namingRules?.version!==NAMING_RULE_V7_VERSION||!verified.factVerification?.status.startsWith('verified-'))throw new Error('M458 independent V7 save/read fixture did not verify');
  return verified;
}
