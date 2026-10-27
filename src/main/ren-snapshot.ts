import {isDeepStrictEqual} from 'node:util';
import {validRenCommentaryAnalysis,REN_JOINT_BATTLE_COMMENTARY_VERSION} from '../domain/ditian-ren';
import {canonicalPlainJson} from '../shared/plain-json';
import {expectedAnalysis} from './expected-analysis';
import {BAZI_REN_JOINT_BATTLE_RULE_VERSION} from '../domain/engine';
import {REN_JOINT_BATTLE_METHOD} from '../shared/ren-method';
import type {BaziAnalysis,BirthProfile,RenCommentaryAnalysis} from '../shared/types';

/** Reuse only the existing bounded, frozen calculation derived from validated
 * birth fields. No caller session, review, source record or validation result is
 * cached here. Store's source/fact, meaning/modern history and CAS checks remain
 * at their original call sites, including the targeted verified-reader path. */
export function validRenCommentarySnapshot(value:unknown,profile:BirthProfile,bazi:BaziAnalysis):value is RenCommentaryAnalysis|undefined {
  try{
    // Reject accessors/extra non-JSON state before inspecting a supplied version.
    const actual=value===undefined?undefined:canonicalPlainJson(value);
    if(profile.renMethod!==REN_JOINT_BATTLE_METHOD||bazi.version!==BAZI_REN_JOINT_BATTLE_RULE_VERSION
      ||!value||typeof value!=='object'||!('version' in value)||value.version!==REN_JOINT_BATTLE_COMMENTARY_VERSION)
      return validRenCommentaryAnalysis(value,profile,bazi);
    const expected=expectedAnalysis(profile);
    // Never accept a supplied Bazi merely because the commentary looks right.
    // Unknown/new calculator output retains the complete original validator.
    if(!isDeepStrictEqual(bazi,expected.bazi)||expected.renCommentary?.version!==REN_JOINT_BATTLE_COMMENTARY_VERSION)
      return validRenCommentaryAnalysis(value,profile,bazi);
    return actual===canonicalPlainJson(expected.renCommentary);
  }catch{return false;}
}
