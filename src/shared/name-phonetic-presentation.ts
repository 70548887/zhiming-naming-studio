import type {NamePhoneticReviewsSnapshot} from './name-phonetic-review-types';
import type {NamePhoneticReview,PhoneticLanguage,PhoneticSourceReference,SelectedPhoneticUnit,PhoneticScope} from '../../data/name-phonetic/name-phonetic-types';

export const phoneticLanguages=['cmn','yue'] as const;
export const phoneticLanguageLabel=(language:PhoneticLanguage)=>language==='cmn'?'普通话':'粤语';
export const phoneticModeLabel=(mode:NamePhoneticReview['mode'])=>mode==='strict'?'严格比较音节与声调':'严格同音及仅声调不同的匹配';
export const phoneticStateLabel=(review:NamePhoneticReview)=>review.status==='not-assessed'?'未评估 · 读音未齐':review.matches.length?`有限词表命中 ${review.matches.length} 项`:'本次有限词表无命中';
export const phoneticOriginLabel=(origin:SelectedPhoneticUnit['origin'])=>({'current-default':'方案保存的默认普通话',dictionary:'家庭已确认词典候选',user:'家庭确认读音（非词典证据）'}[origin]);
export const phoneticScopeLabel=(scope:PhoneticScope)=>({'whole-full-name':'全名','whole-given-name':'整个给名','cross-surname-given':'跨姓与名','given-subspan':'给名内连续字位'}[scope]);
export const phoneticSourceRoleLabel=(role:PhoneticSourceReference['role'])=>({'pronunciation-and-meaning':'词音与原义证据','exact-word-pronunciation':'该原词的读音证据','original-word-presence-only':'只证明原词收录，不证明本语言音值'}[role]);
export const phoneticComparisonLabel=(comparison:'exact'|'tone-only')=>comparison==='exact'?'音节与声调一致':'仅声调不同（去调匹配）';
export function namePhoneticReviewSummary(snapshot?:NamePhoneticReviewsSnapshot):string{
  if(!snapshot)return '未记录独立词音复核';
  return phoneticLanguages.flatMap(language=>{const review=snapshot.reviews[language];return review?[`${phoneticLanguageLabel(language)} ${phoneticStateLabel(review)} · ${phoneticModeLabel(review.mode)} · ${review.version}`]:[];}).join('；')||'保存记录没有语言结果，未评估';
}
/** Used by revision comparison only; reads the saved values and never invokes an engine. */
export function namePhoneticReviewHistoryText(snapshot?:NamePhoneticReviewsSnapshot):string{
  if(!snapshot)return '未记录独立词音复核';
  const lines=[namePhoneticReviewSummary(snapshot)];
  for(const language of phoneticLanguages){const review=snapshot.reviews[language],reading=snapshot.selectedReadings[language];if(!review)continue;
    if(reading)lines.push([reading.surname,...reading.given].map(unit=>`${unit.text}：${unit.selection?unit.selection.tokens.join(' ')+'（'+phoneticOriginLabel(unit.selection.origin)+'）':'未确认'}`).join('；'));
    lines.push(...review.missing,review.coverageNotice,...review.limitations);
    for(const match of review.matches){lines.push(`${match.span.text}→${match.rule.term}；姓名第${match.span.start+1}–${match.span.endExclusive}字；${phoneticComparisonLabel(match.comparison)}；所选${match.actualTokens.join(' ')}；原词${match.rule.tokens.join(' ')}；差调字位${match.differentTonePositions.map(index=>index+1).join('、')||'无'}`,match.rule.notice,`原词分类：${match.rule.categories.join('、')}`);
      for(const sense of match.rule.senses)lines.push(`原义项${sense.senseIndex+1}：${sense.glosses.join('；')}；语域${sense.registerDisplay.join('、')||'未标'}；标签${sense.tags.join('、')}；原标签${sense.rawTags.join('、')}`);
      for(const source of match.rule.sourceRefs)lines.push(`${source.id} ${source.word} ${source.file}:${source.line} ${source.license} ${source.url}；${phoneticSourceRoleLabel(source.role)}；${source.rawPronunciation??''}；音域标签${source.soundTags?.join('、')??''}；原音域标签${source.soundRawTags?.join('、')??''}`);
    }
    lines.push(`来源${review.sourceIds.join('、')}；规则摘要${review.profileSha256}；来源锁${review.sourceLockSha256}`);
  }
  return lines.join('\n');
}
