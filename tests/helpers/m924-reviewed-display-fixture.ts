import type {BirthProfile,NamingPreferences,NamingSession} from '../../src/shared/types';
import type {ReviewedDataSelection,ReviewedGenerateResult} from '../../src/shared/reviewed-naming-data';
import {matchesReviewedGenerateResult} from '../../src/renderer/reviewed-naming-data-state';

/** UI display-correlation fixture only. It deliberately makes no Store/source
 * authenticity assertion. The production response validator remains unchanged
 * and checks this fixture before the DOM harness resolves the bridge request. */
export function reviewedDisplayFixture(base:NamingSession,profile:BirthProfile,preferences:NamingPreferences,selection:ReviewedDataSelection):ReviewedGenerateResult {
 const session=structuredClone(base),sessionId='rd1-s-m924-display-success';
 session.id=sessionId;session.profile=structuredClone(profile);session.profileId=profile.id;session.preferences=structuredClone(preferences);
 const binding={sessionId,profileId:profile.id,createdAt:session.createdAt,dataVersion:session.dataVersion,namingRulesSha256:'0'.repeat(64),profileSha256:'0'.repeat(64),generationPreferencesSha256:'0'.repeat(64),analysisSha256:'0'.repeat(64),sourceSnapshotSha256:'0'.repeat(64),originalFavorableSha256:'0'.repeat(64),sourceRecordsSha256:'0'.repeat(64)};
 const publication={publicationId:'reviewed-naming-data/1.0.0',manifestSha256:'0'.repeat(64),semantic:{},imagery:{},sourceEvidence:{}};
 const candidates=session.candidates.map((candidate,index)=>{
  const id='rd1-c-m924-display-'+index;
  return {...candidate,id,characters:[],reviewedDataUse:{schemaVersion:'reviewed-naming-data-candidate/1',method:'reviewed-naming-data/1.0.0',publication,selectionSha256:'0'.repeat(64),binding:{...binding,candidateIndex:index,candidateId:id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,origin:candidate.origin},semantic:{publication:{},rows:[],warningRevisions:[],generatedMeaning:candidate.meaning,wholeNameMeaning:null,scoreDelta:0,explanationPolicy:'eligible-characterwise-only-otherwise-preserve-7.1'},imagery:{schemaVersion:'m779-admitted-element-imagery-provenance/1.0.0',publication:{},binding:{candidateId:id,givenName:candidate.givenName},namingRulesVersion:'naming-editorial-7.1.0',scoreEffect:'projected-elements-enter-existing-shortlist-and-traditional-score',rows:[]},stylePolicy:'canonical-existing-evaluate-style',canonicalCandidateSha256:'0'.repeat(64),proofSha256:'0'.repeat(64)}};
 });
 const result={session:{...session,candidates,reviewedData:{schemaVersion:'reviewed-naming-data-session/1',method:'reviewed-naming-data/1.0.0',publication,selection:structuredClone(selection),binding,candidateBindings:candidates.map((candidate,candidateIndex)=>({candidateIndex,candidateId:candidate.id,givenName:candidate.givenName,fullName:candidate.fullName,pinyin:candidate.pinyin,origin:candidate.origin,proofSha256:'0'.repeat(64)})),proofSha256:'0'.repeat(64)}},messages:['M924 UI display correlation fixture returned; not Service/source authenticity evidence.']} as unknown as ReviewedGenerateResult;
 if(!matchesReviewedGenerateResult(result,profile,selection,preferences))throw Error('M924 success fixture must satisfy the unchanged production display validator');
 return result;
}
