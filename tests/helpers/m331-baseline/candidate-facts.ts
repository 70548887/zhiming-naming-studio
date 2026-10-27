import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { surnameReading,resolveNamingContextForRuleVersion,selectNamingCitationsForRuleVersionWithContext,evaluateNameForRuleVersionWithContext,evaluateNameWithResolvedBasisForRuleVersion } from './naming';
import type {ResolvedNamingBasis} from '../../../src/domain/naming-element-basis';
import {hasProjectNamingUseFootprint,assertVerifiedSavedProjectNamingBasis} from '../../../src/main/verify-project-naming-use';
import {verifyNamingMeaningReviewSnapshot} from '../../../src/main/naming-meaning-review';
import { CANDIDATE_FACT_VERSION } from '../../../src/shared/candidate-facts';
import {NAMING_RULE_V7_VERSION,NAMING_RULE_V71_VERSION,isNamingV7BaseRuleVersion,resolveSessionNamingRulesVersion} from '../../../src/shared/naming-rules';
import {selectedMeaningBelongsToReading} from '../../../src/shared/character-reading';
import {selectedReferenceOnlyReading,validReadingReferenceMetadata} from '../../../src/shared/character-reading-reference';
import type { CandidateFactVerification,CharacterEntry,Citation,NamingSession,SourceRecord } from '../../../src/shared/types';

export interface FactDataset {version:string;characters:CharacterEntry[];citations:Citation[];sources:SourceRecord[];}
export interface FactArchive {sha256:string;version:string;pack:Uint8Array;dataset:FactDataset;}
export const ARCHIVE_MAX_COUNT=100,ARCHIVE_MAX_BYTES=150*1024*1024;
export const packSha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

/** The default reading must refer to an actual stored reading/meaning, including on unresolvable legacy snapshots. */
export function validCharacterReading(character:CharacterEntry):boolean {
 if(!character.pinyin.trim()||!character.meaning.trim())return false;
 if(!character.readings?.length)return true;
 if(character.readings.some(reading=>!validReadingReferenceMetadata(reading))||selectedReferenceOnlyReading(character))return false;
 return character.readings.some(reading=>reading.referenceOnly!==true&&reading.pinyin===character.pinyin&&reading.tone===character.tone&&reading.sourceId===character.sourceId
  &&selectedMeaningBelongsToReading(character.meaning,reading.meanings));
}

/** Validate immutable facts against real archived package records, not a candidate-authored checksum. */
export function verifyCandidateFacts(session:NamingSession,archive:FactArchive|undefined,builtin:FactArchive,projectBasis?:Extract<ResolvedNamingBasis,{source:'project'}>):CandidateFactVerification {
 const projectFootprint=hasProjectNamingUseFootprint(session);
 if(projectFootprint)assertVerifiedSavedProjectNamingBasis(projectBasis);
 else if(projectBasis!==undefined)throw new Error('历史方案不得借用其他方案的项目五行复评结果。');
 const namingVersion=resolveSessionNamingRulesVersion(session);
 const namingContext=namingVersion?resolveNamingContextForRuleVersion(namingVersion,archive?{packSha256:archive.sha256,activeVersion:archive.version}:undefined):{context:undefined};
 if(isNamingV7BaseRuleVersion(namingVersion)&&(!archive||!namingContext.context||archive.version!==session.dataVersion))throw new Error('命名7.x方案必须绑定保存版本的完整知识包身份，不能借用自定义包或降级历史。');
 if(namingVersion===NAMING_RULE_V71_VERSION&&!session.profile.namingPreferences)throw new Error('命名7.1方案缺少生成时冻结偏好，不得借用审阅时偏好。');
 const generationVersion=/^civil-midnight-fuyi-candidate\/(\d+)\.(\d+)\.\d+;/.exec(session.analysis.bazi.version);
 const requiresArchive=!!generationVersion&&(Number(generationVersion[1])>1||Number(generationVersion[1])===1&&Number(generationVersion[2])>=4);
 if(requiresArchive&&!archive)throw new Error('当前版方案缺少生成时完整知识包，不能降级为未核验历史。');
 if(session.factVerification?.status==='verified-archive'||session.factVerification?.status==='verified-builtin'){
  if(!archive||session.factVerification.datasetSha256!==archive.sha256)throw new Error('已核验方案的完整知识包归档缺失或SHA-256不一致，不能降级恢复。');
 }
 const sourceRegistry=new Map(session.sourceSnapshot?.sources.map(source=>[source.id,source])??[]);
 const selected=archive?.dataset,characters=new Map((selected?.characters??[]).map(character=>[character.char,character])),citations=new Map((selected?.citations??[]).map(citation=>[citation.id,citation]));
 const builtinCitations=new Map(builtin.dataset.citations.map(citation=>[citation.id,citation])),builtinSources=new Map(builtin.dataset.sources.map(source=>[source.id,source]));
 if(selected&&session.sourceSnapshot)for(const source of selected.sources){const recorded=sourceRegistry.get(source.id);if(!recorded||!isDeepStrictEqual(recorded,source))throw new Error('生成时来源快照与候选原知识包登记不一致。');}
 for(const candidate of session.candidates){
  // Review-time manual preferences do not change the saved score. Reproduce
  // only from the frozen generation preferences; retain legacy absence.
  const generationPreferences=session.profile.namingPreferences;
  if(projectBasis||isNamingV7BaseRuleVersion(namingVersion)&&generationPreferences!==undefined){
   if(!isNamingV7BaseRuleVersion(namingVersion)||!archive||!namingContext.context||!generationPreferences)throw new Error('命名复评缺少生成时固定命名规则、知识包或偏好。');
   const expected=projectBasis?evaluateNameWithResolvedBasisForRuleVersion(namingVersion,namingContext.context,projectBasis,candidate.givenName,session.profile,generationPreferences,session.analysis,archive.dataset.characters,archive.dataset.citations,candidate.origin):evaluateNameForRuleVersionWithContext(namingVersion,namingContext.context,candidate.givenName,session.profile,generationPreferences,session.analysis,archive.dataset.characters,archive.dataset.citations,candidate.origin);
   if(!expected||!isDeepStrictEqual(candidate.evaluation,expected.evaluation))throw new Error('候选评分与生成时命名方法、固定字库及采用五行的真实复算不一致。');
  }
  verifyNamingMeaningReviewSnapshot(candidate,session,namingContext.context);
  if(isNamingV7BaseRuleVersion(namingVersion)&&!isDeepStrictEqual(candidate.citations,selectNamingCitationsForRuleVersionWithContext(namingVersion,namingContext.context,candidate.givenName,candidate.characters,candidate.citations)))throw new Error('命名7.0逐名出处与全名顺序、字音义项或完整原文绑定不一致。');
  const expectedPinyin=[surnameReading(session.profile),...candidate.characters.map(character=>character.pinyin)].filter(Boolean).join(' ');
  if(candidate.pinyin!==expectedPinyin||candidate.characters.some(character=>!validCharacterReading(character)))throw new Error('候选姓名读音与字典读音义项不自洽，未保存。');
  for(const character of candidate.characters){if(selected&&!isDeepStrictEqual(character,characters.get(character.char)))throw new Error('候选字音、字义或字形事实与生成时原知识包不一致。');}
  for(const citation of candidate.citations){
   if(selected){if(!isDeepStrictEqual(citation,citations.get(citation.id)))throw new Error('候选引文事实与生成时原知识包不一致。');}
   else {
    const known=builtinCitations.get(citation.id),declared=sourceRegistry.get(citation.sourceId),builtinSource=builtinSources.get(citation.sourceId);
    // Unknown external legacy packages may have their own IDs/text. A claimed built-in source/ID is still checkable.
    if((declared&&builtinSource&&isDeepStrictEqual(declared,builtinSource)&&!known)
      ||known&&(!declared||builtinSource&&isDeepStrictEqual(declared,builtinSource))&&!isDeepStrictEqual(citation,known))throw new Error('历史方案所称内置引文与已知原条目不一致。');
   }
  }
 }
 return {version:CANDIDATE_FACT_VERSION,status:archive?(archive.sha256===builtin.sha256?'verified-builtin':'verified-archive'):'unverified-legacy',dataVersion:session.dataVersion,...(archive?{datasetSha256:archive.sha256}:{})};
}
