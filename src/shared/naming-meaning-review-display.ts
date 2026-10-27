import type {Applicability,AutomaticMeaning,MeaningReview} from '../domain/naming-review-v7.mjs';
import type {NamingMeaningReviewSnapshot} from './naming-meaning-review';
export interface LegacyNamingMeaningDisplayRow{char:string;applicability:Applicability;review?:(MeaningReview&{automaticSemanticCreditAllowed:false;displayOnlyReview:true});automaticMeaning?:AutomaticMeaning;}
export type LegacyNamingMeaningDisplayState = 'automatic' | 'manual' | 'pending' | 'not-recommended' | 'outside' | 'not-applicable' | 'unrecorded';
export function legacyNamingMeaningDisplayState(row: LegacyNamingMeaningDisplayRow | undefined, char: string): LegacyNamingMeaningDisplayState {
  if (!row || row.char !== char) return 'unrecorded';
  const status = row.applicability?.status;
  if (status === 'not-applicable') return 'not-applicable';
  if (status === 'not-reviewed-by-overlay') return 'outside';
  const review = row.review;
  if (!review || review.char !== char || review.displayOnlyReview !== true || review.automaticSemanticCreditAllowed !== false) return 'unrecorded';
  if (status === 'pending' && review.status === 'pending' && review.automaticMeaningAllowed === false && review.applicability.mode === 'not-approved') return 'pending';
  if (status === 'not-recommended' && review.status === 'not-recommended' && review.automaticMeaningAllowed === false && review.applicability.mode === 'not-approved') return 'not-recommended';
  if (status === 'manual-confirmation-required' && review.status === 'approved' && review.automaticMeaningAllowed === false && review.applicability.mode === 'manual-confirmation-required') return 'manual';
  const automatic = row.automaticMeaning;
  const matchingBinding = automatic?.binding && review.binding &&
    (Object.keys(review.binding) as Array<keyof NonNullable<MeaningReview['binding']>>).every(key => automatic.binding[key] === review.binding![key]);
  if (status === 'applicable' && review.status === 'approved' && review.automaticMeaningAllowed === true &&
    ['any-name', 'allowed-names'].includes(review.applicability.mode) && automatic &&
    automatic.char === char && automatic.binding.char === char && automatic.automaticMeaningAllowed === true &&
    automatic.automaticSemanticCreditAllowed === false && automatic.reviewId === row.applicability.reviewId &&
    automatic.reviewId === `meaning137:${review.pendingIndex}:${char}` && automatic.meaning === review.namingMeaning &&
    automatic.projectWish === review.projectWish && automatic.scope === review.scope && automatic.useKind === review.useKind && matchingBinding) return 'automatic';
  return 'not-applicable';
}

export type NamingCharacterDisplayRow71={char:string;kind?:string;characterExplanation?:import('../domain/naming-review-v7.mjs').NamingCharacterReview71Result};
const CHARACTER71_IDENTITY_KEYS=['ruleVersion','profileVersion','sourceId','subsetSha256','profileSha256','admissionSha256','lockSha256','manifestSha256','sourceSha256'] as const;
const FIXED_CHARACTER71_PACK_SHA256='1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b';
const FAILURE71_STATUSES=['not-covered','not-applicable','wrong-rule-version','not-admitted'] as const;
const nonzeroSha256=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)&&value!=='0'.repeat(64);
/** Stored-value consistency only; source authenticity remains in main. */
export function recordedCharacterExplanation71(row:NamingCharacterDisplayRow71|undefined,char:string){
 try{
  if(!row||row.kind!=='character-level-project-explanation'||row.char!==char)return undefined;
  const value=row.characterExplanation;if(value?.status!=='character-explanations-ready')return undefined;
  if(value.ruleVersion!=='naming-editorial-7.1.0'||value.scope!=='per-character-project-explanation-only'||value.givenNameContext!==char||value.wholeNameAssessment!=='not-assessed'||value.wholeNameMeaning!==null||value.automaticNameRecommendation!==false||value.automaticSemanticCreditAllowed!==false||value.scoreDelta!==0||value.rows.length!==1||value.admittedCharacterCaseIds.length!==1)return undefined;
  const identity=value.profile;if(Reflect.ownKeys(identity).length!==CHARACTER71_IDENTITY_KEYS.length||!Object.keys(identity).every(key=>(CHARACTER71_IDENTITY_KEYS as readonly string[]).includes(key)))return undefined;
  if(identity.profileVersion!=='naming-character-meanings-v7.1/1'||identity.ruleVersion!=='naming-editorial-7.1.0'||identity.sourceId!=='naming-character-meanings-v7.1-fixed'||!['subsetSha256','profileSha256','admissionSha256','lockSha256','manifestSha256','sourceSha256'].every(key=>/^[a-f0-9]{64}$/.test(identity[key as keyof typeof identity])&&identity[key as keyof typeof identity]!=='0'.repeat(64)))return undefined;
  const note=value.rows[0],source=note.originalSourceBinding;
  if(note.position!==0||note.char!==char||note.caseId!==value.admittedCharacterCaseIds[0]||![`single-meaning-next:${char}:${source.rawEntryIndex}:${source.rawHeteronymIndex}:${source.rawDefinitionIndex}`,`single-meaning-m393:${char}:${source.rawEntryIndex}:${source.rawHeteronymIndex}:${source.rawDefinitionIndex}`].includes(note.caseId)||note.scope!==value.scope||note.wholeNameAssessment!=='not-assessed'||note.wholeNameMeaning!==null||note.automaticNameRecommendation!==false||note.automaticSemanticCreditAllowed!==false||note.scoreDelta!==0)return undefined;
  if(source.sourceId!=='moe-revised'||source.rawFile!=='data/raw/moe-revised.json.gz'||source.rawSha256!=='cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e'||source.definition.def!==note.dictionaryOriginal||!source.word||[source.rawEntryIndex,source.rawHeteronymIndex,source.rawDefinitionIndex].some(index=>!Number.isSafeInteger(index)||index<0))return undefined;
  if(typeof note.selectedPinyin!=='string'||source.pinyin.replace(/[（(][^）)]*[）)]/g,'').trim().normalize('NFC')!==note.selectedPinyin||!Number.isInteger(note.tone)||note.tone<1||note.tone>5||note.editorialLicense!=='CC0-1.0'||!note.projectMeaning||!note.projectWish.startsWith('项目创作：')||!Array.isArray(note.limits)||note.limits.length<3||note.limits.some(limit=>typeof limit!=='string'))return undefined;
  return note;
 }catch{return undefined;}
}


/** Validate only the saved snapshot and candidate positions, never today's table. */
export function recordedNamingMeaningSnapshot(candidate:{givenName:string;namingMeaningReview?:NamingMeaningReviewSnapshot}):NamingMeaningReviewSnapshot|undefined{
 try{
  const snapshot=candidate.namingMeaningReview;if(!snapshot)return undefined;const chars=[...candidate.givenName];
  const positions=snapshot.recordState==='recorded'&&snapshot.automaticSemanticCreditAllowed===false&&snapshot.givenName===candidate.givenName&&Array.isArray(snapshot.rows)&&snapshot.rows.length===chars.length&&snapshot.rows.every((row,index)=>row.position===index+1&&row.char===chars[index]);
  if(!positions)return undefined;
  if(snapshot.version==='naming-editorial-7.0.0'&&snapshot.sourceId==='naming-editorial-meanings-v7-fixed')return snapshot;
  if(snapshot.version==='naming-editorial-7.1.0'&&snapshot.sourceId==='naming-character-meanings-v7.1-fixed'&&snapshot.scope==='per-character-project-explanation-only'&&snapshot.wholeNameAssessment==='not-assessed'&&snapshot.wholeNameMeaning===null&&snapshot.automaticNameRecommendation===false&&snapshot.scoreDelta===0&&[1,2].includes(chars.length)){
   if(!nonzeroSha256(snapshot.sourceSha256)||snapshot.packSha256!==FIXED_CHARACTER71_PACK_SHA256||snapshot.activeVersion!==FIXED_CHARACTER71_PACK_SHA256.slice(0,12))return undefined;
   let publication:import('../domain/naming-review-v7.mjs').NamingCharacterReview71Identity|undefined;
   for(const row of snapshot.rows){
    if(row.kind==='legacy-v7-review'){if(Object.hasOwn(row,'characterExplanation'))return undefined;continue;}
    if(row.kind!=='character-level-project-explanation'||!row.characterExplanation)return undefined;
    const explanation=row.characterExplanation;
    if(explanation.status!=='character-explanations-ready'){
     if(!FAILURE71_STATUSES.includes(explanation.status)||Reflect.ownKeys(explanation).length!==2||!Object.keys(explanation).every(key=>key==='status'||key==='reason')||typeof explanation.reason!=='string'||!explanation.reason.trim())return undefined;
     continue;
    }
    if(!recordedCharacterExplanation71(row,row.char)||explanation.profile.sourceSha256!==snapshot.sourceSha256)return undefined;
    const identity=explanation.profile;
    if(publication&&CHARACTER71_IDENTITY_KEYS.some(key=>identity[key]!==publication![key]))return undefined;
    publication=identity;
   }
   return snapshot;
  }
  return undefined;
 }catch{return undefined;}
}
