import type { NamingSession, SessionSourceSnapshot, SourceRecord } from './types';
import {validSavedMeaningContextReview,assertMeaningContextReviewInput} from './meaning-context-review';

export const SESSION_SOURCE_SNAPSHOT_VERSION = 'session-sources/1.0.0' as const;
export const LEGACY_SESSION_SOURCES_NOTICE = '此方案未保存生成时来源清单，当前知识库来源不能用于补证历史。';

const recordKeys = ['id','name','url','commit','license','files','sha256','note'];
const plainObject = (value:unknown):value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const text = (value:unknown,max:number) => typeof value === 'string' && value.length <= max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value);
const ownKeys = (value:Record<string,unknown>,expected:string[]) => Object.keys(value).length === expected.length && Object.keys(value).every(key=>expected.includes(key));

/** Preserve declared metadata; this is structural validation, not authentication of an imported source. */
export function validSessionSourceRecord(value:unknown):value is SourceRecord {
  if(!plainObject(value) || !ownKeys(value,recordKeys)) return false;
  return text(value.id,300) && !!(value.id as string).trim()
    && text(value.name,1000) && !!(value.name as string).trim()
    && text(value.url,4000) && text(value.commit,2000) && text(value.license,1000)
    && text(value.sha256,2000) && text(value.note,10000)
    && Array.isArray(value.files) && value.files.length <= 500 && Array.from(value.files).every(file=>text(file,2000));
}

export function validSessionSourceSnapshot(value:unknown,expectedDataVersion?:string):value is SessionSourceSnapshot {
  try {
    if(!plainObject(value) || !ownKeys(value,['version','dataVersion','sources']) || value.version !== SESSION_SOURCE_SNAPSHOT_VERSION
      || !text(value.dataVersion,1000) || !(value.dataVersion as string).trim()
      || expectedDataVersion !== undefined && value.dataVersion !== expectedDataVersion
      || !Array.isArray(value.sources) || !value.sources.length || value.sources.length > 500
      || !Array.from(value.sources).every(validSessionSourceRecord)) return false;
    if(new Set(value.sources.map(source=>source.id)).size !== value.sources.length) return false;
    return JSON.stringify(value).length <= 1000000;
  } catch { return false; }
}

/** Capture all registered data/rule sources available for this generation, with no shared mutable arrays. */
export function createSessionSourceSnapshot(dataVersion:string,sources:SourceRecord[]):SessionSourceSnapshot {
  const records:SourceRecord[] = sources.map(source=>({
    id:source.id,name:source.name,url:source.url,commit:source.commit,license:source.license,
    files:Array.isArray(source.files)?[...source.files]:source.files,sha256:source.sha256,note:source.note,
  }));
  const snapshot = {version:SESSION_SOURCE_SNAPSHOT_VERSION,dataVersion,sources:records};
  if(!validSessionSourceSnapshot(snapshot,dataVersion)) throw new Error('生成时来源清单字段不完整、重复或过长，方案未保存。');
  return snapshot;
}

/** References actually embedded in the saved result must remain resolvable inside its own registry. */
export function sessionReferencedSourceIds(session:Pick<NamingSession,'candidates'|'analysis'|'namingRules'>,includeReviewSources=true):string[] {
  assertMeaningContextReviewInput(session);
  const ids = new Set<string>();
  if(session.namingRules)ids.add(session.namingRules.sourceId);
  if(Object.hasOwn(session.analysis,'projectNamingUse')){ids.add('project-bazi-mainchain-145');ids.add('naming-element-application-v1');}
  for(const candidate of session.candidates) {
    const namingReview=candidate.namingMeaningReview;if(namingReview){ids.add(namingReview.sourceId);if(namingReview.version==='naming-editorial-7.1.0')for(const row of namingReview.rows){if(row.kind==='character-level-project-explanation'&&row.characterExplanation.status==='character-explanations-ready'){ids.add(row.characterExplanation.profile.sourceId);for(const explanation of row.characterExplanation.rows){ids.add(explanation.originalSourceBinding.sourceId);const proofs=explanation.glyph.proof;if(Array.isArray(proofs)&&proofs.length)ids.add('unicode-17');}}}
    }
    // Within71, legacy7 row provenance is a dependency in the new immutable
    // source lock, not a second active dedicated naming-source record.
    for(const id of candidate.wordPronunciationReference?.sourceIds??[])ids.add(id);
    for(const id of candidate.elementAssessment?.sourceIds??[])ids.add(id);
    for(const result of Object.values(candidate.namePhoneticReviews?.reviews??{}))for(const id of result.sourceIds)ids.add(id);
    if(includeReviewSources&&candidate.meaningContextReview){
      ids.add(candidate.meaningContextReview.source.sourceId);
      for(const row of candidate.meaningContextReview.rows){const result=row.result;if('source' in result&&typeof result.source.id==='string')ids.add(result.source.id);}
    }
    if(candidate.parentNamePhoneticReview){ids.add(candidate.parentNamePhoneticReview.sourceSnapshot.method.id);for(const source of candidate.parentNamePhoneticReview.sourceSnapshot.dictionarySources)ids.add(source.sourceId);}
    for(const id of candidate.yueReading?.sourceIds??[])ids.add(id);
    for(const id of candidate.yueHomophones?.sourceIds??[])ids.add(id);
    for(const reference of candidate.imageReading?.sourceReferences??[])ids.add(reference.id);
    for(const id of candidate.imageReading?.sourceIds??[])ids.add(id);
    for(const character of candidate.characters) {
      ids.add(character.sourceId);
      for(const reading of character.readings ?? []) ids.add(reading.sourceId);
    }
    for(const citation of candidate.citations) ids.add(citation.sourceId);
    if(candidate.numerology) {
      for(const stroke of candidate.numerology.strokes) for(const record of stroke.options) ids.add(record.sourceId);
      if(candidate.numerology.rule.interpretationSourceId) ids.add(candidate.numerology.rule.interpretationSourceId);
      for(const grid of candidate.numerology.grids) if(grid.interpretation) ids.add(grid.interpretation.sourceId);
    }
  }
  for(const result of [session.analysis.qimen.auxiliary,session.analysis.qimen.patterns,session.analysis.qimen.stemTombs]) {
    for(const rule of result?.rules ?? []) for(const source of rule.sources) ids.add(source.id);
  }
  for(const source of session.analysis.bazi.evidence?.sources ?? []) ids.add(source.id);
  if(session.analysis.bazi.monthFollowingRestrictions){
    ids.add(session.analysis.bazi.monthFollowingRestrictions.sourceId);
    for(const check of session.analysis.bazi.monthFollowingRestrictions.checks)ids.add(check.sourceId);
  }
  if(session.analysis.renCommentary){
    ids.add(session.analysis.renCommentary.sourceId);
    if(session.analysis.renCommentary.necessaryConditions)ids.add(session.analysis.renCommentary.necessaryConditions.sourceId);
    if(session.analysis.renCommentary.actionAnalysis)ids.add(session.analysis.renCommentary.actionAnalysis.sourceId);
    for(const rule of session.analysis.renCommentary.sourceRules)ids.add(rule.sourceId);
  }
  return [...ids];
}

/** Undefined is a legacy state. A provided manifest must be complete and belong to this data version. */
export function validSessionSources(session:Pick<NamingSession,'dataVersion'|'sourceSnapshot'|'candidates'|'analysis'|'namingRules'>):boolean {
  try {
    assertMeaningContextReviewInput(session);
    const reviews=session.candidates.flatMap(candidate=>candidate.meaningContextReview?[candidate.meaningContextReview]:[]);
    if(session.sourceSnapshot === undefined) return reviews.length===0;
    if(!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion)) return false;
    const ids = new Set(session.sourceSnapshot.sources.map(source=>source.id));
    // Review-time registries may resolve only their own references. They can
    // never mask a missing generation-time character/citation/rule source.
    if(!sessionReferencedSourceIds(session,false).every(id=>ids.has(id)))return false;
    return reviews.every(review=>{
      if(!validSavedMeaningContextReview(review)||!validSessionSourceSnapshot(review.sourceSnapshot,session.dataVersion))return false;
      const registry=new Set(review.sourceSnapshot.sources.map(source=>source.id));
      if(!registry.has(review.source.sourceId))return false;
      return review.rows.every(row=>!('source' in row.result)||typeof row.result.source.id==='string'&&registry.has(row.result.source.id));
    });
  } catch { return false; }
}

export function safeSourceUrl(value:string):string|undefined {
  try { const url = new URL(value);return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}

export function sourceHashLabel(source:SourceRecord):string {
  return /^[a-f0-9]{64}$/i.test(source.sha256) ? '登记 SHA-256' : '登记哈希（未提供有效 SHA-256）';
}

export function sessionSourceStatus(session:Pick<NamingSession,'dataVersion'|'sourceSnapshot'>):{status:'recorded'|'missing'|'invalid';notice:string;sources:SourceRecord[]} {
  if(session.sourceSnapshot === undefined) return {status:'missing',notice:LEGACY_SESSION_SOURCES_NOTICE,sources:[]};
  if(!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion)) return {status:'invalid',notice:'生成时来源清单与本方案版本不一致或格式无效，暂不展示为有效来源。',sources:[]};
  return {status:'recorded',notice:'以下为生成本方案时保存的资料来源登记；当前知识库更新不会替换此清单。登记信息不等于已重新联网或逐页校勘。',sources:session.sourceSnapshot.sources};
}
