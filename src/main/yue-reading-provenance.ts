import {isDeepStrictEqual} from 'node:util';
import type {NamingSession,SourceRecord} from '../shared/types';
import {validSessionSourceSnapshot} from '../shared/session-sources';
import {YUE_READING_SOURCE_ID,YUE_READING_ALIAS_SOURCE_ID} from '../domain/yue-reading';

export function verifyYueReadingProvenance(session:NamingSession,sources:SourceRecord[]):void{
  const selected=session.preferences.yueReading===true;
  const readings=session.candidates.some(candidate=>candidate.yueReading!==undefined);
  const recorded=session.sourceSnapshot?.sources??[];
  if(!selected){if(readings||recorded.some(source=>source.id===YUE_READING_SOURCE_ID))throw new Error('粤语读音结果或专用来源不得附加到未启用方案。');return;}
  if(session.candidates.some(candidate=>candidate.yueReading===undefined)||!session.sourceSnapshot||!validSessionSourceSnapshot(session.sourceSnapshot,session.dataVersion))throw new Error('粤语读音方案缺少候选结果或完整生成时来源。');
  for(const id of [YUE_READING_SOURCE_ID,YUE_READING_ALIAS_SOURCE_ID]){
    const expected=sources.filter(source=>source.id===id),actual=recorded.filter(source=>source.id===id);
    if(expected.length!==1||actual.length!==1||!isDeepStrictEqual(expected[0],actual[0]))throw new Error('粤语字词或字形映射来源与保存版本不一致。');
  }
}
