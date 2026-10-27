import type { NamingSession } from './types';

export const REVIEW_CONFLICT_MESSAGE='方案已被其他窗口更新，本次修改未保存。当前草稿仍保留，请先核对最新已保存方案，再重新应用修改。';
export function validReviewRevision(value:unknown):value is number|undefined {
  return value===undefined || typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<Number.MAX_SAFE_INTEGER;
}
export function reviewRevision(session:Pick<NamingSession,'reviewRevision'>):number {
  if(!validReviewRevision(session.reviewRevision))throw new Error('方案审阅修订号无效。');
  return session.reviewRevision??0;
}
export function validReviewToken(value:unknown):value is string|undefined {
  return value===undefined||typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function assertReviewRevision(session:Pick<NamingSession,'reviewRevision'|'reviewToken'>,expected:unknown=0,token?:unknown):void {
  if(!validReviewRevision(expected))throw new Error('方案审阅修订号无效。');
  if(!validReviewToken(token)||!validReviewToken(session.reviewToken))throw new Error('方案审阅凭据无效。');
  if(reviewRevision(session)!==(expected??0)||session.reviewToken!==token)throw new Error(REVIEW_CONFLICT_MESSAGE);
}
export function isReviewConflict(error:unknown):boolean {
  return String(error instanceof Error?error.message:error).includes('方案已被其他窗口更新');
}
