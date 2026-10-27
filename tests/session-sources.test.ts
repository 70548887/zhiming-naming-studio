import { describe, expect, it } from 'vitest';
import type { NamingSession, SourceRecord } from '../src/shared/types';
import {
  createSessionSourceSnapshot, LEGACY_SESSION_SOURCES_NOTICE, safeSourceUrl,
  sessionReferencedSourceIds, sessionSourceStatus, sourceHashLabel,
  validSessionSourceRecord, validSessionSourceSnapshot, validSessionSources,
} from '../src/shared/session-sources';
import { sessionSourcesReport } from '../src/main/session-sources-report';

const source = (id='old-source'):SourceRecord => ({id,name:'原始资料',url:'https://example.test/original',commit:'a'.repeat(40),license:'MIT',files:['data/raw/original.json'],sha256:'b'.repeat(64),note:'生成时固定记录'});
const context = (snapshot=true) => ({dataVersion:'historical-data-v1',candidates:[{
  characters:[{sourceId:'old-source'}],citations:[{sourceId:'old-source'}],
}],analysis:{bazi:{},qimen:{}},...(snapshot?{sourceSnapshot:createSessionSourceSnapshot('historical-data-v1',[source()])}:{})}) as unknown as NamingSession;

describe('generation-time source snapshot contract',()=>{
  it('copies records and files so current registry changes cannot alter historical metadata',()=>{
    const current=[source()],snapshot=createSessionSourceSnapshot('v1',current);
    current[0].url='https://example.test/replacement';current[0].files.push('new-file');current.push(source('new-source'));
    expect(snapshot.sources).toHaveLength(1);expect(snapshot.sources[0].url).toBe('https://example.test/original');expect(snapshot.sources[0].files).toEqual(['data/raw/original.json']);
    snapshot.sources[0].files.push('historical-only');expect(current[0].files).not.toContain('historical-only');
  });
  it('rejects duplicate source identities, wrong data version, unknown fields and invalid metadata',()=>{
    expect(()=>createSessionSourceSnapshot('v1',[source(),source()])).toThrow('重复');
    const good=createSessionSourceSnapshot('v1',[source()]);expect(validSessionSourceSnapshot(good,'v1')).toBe(true);
    expect(validSessionSourceSnapshot(good,'v2')).toBe(false);
    expect(validSessionSourceSnapshot({...good,unexpected:true},'v1')).toBe(false);
    expect(validSessionSourceRecord({...source(),id:''})).toBe(false);
    expect(validSessionSourceRecord({...source(),files:[3]})).toBe(false);
    expect(validSessionSourceRecord({...source(),files:new Array(1)})).toBe(false);
    expect(validSessionSourceRecord({...source(),note:'x'.repeat(10001)})).toBe(false);
    expect(validSessionSourceSnapshot({...good,sources:[]},'v1')).toBe(false);
    expect(validSessionSourceSnapshot({...good,sources:new Array(1)},'v1')).toBe(false);
  });
  it('preserves unknown source commit/hash declarations without claiming verification',()=>{
    const custom={...source(),commit:'custom-v2',sha256:'not-registered'};
    expect(validSessionSourceRecord(custom)).toBe(true);
    expect(sourceHashLabel(custom)).toContain('未提供有效');
    expect(sourceHashLabel(source())).toBe('登记 SHA-256');
    const state=sessionSourceStatus({dataVersion:'v1',sourceSnapshot:createSessionSourceSnapshot('v1',[custom])});
    expect(state.notice).toContain('不等于已重新联网或逐页校勘');
  });
  it('accepts legacy absence explicitly, with no fallback from the current knowledge registry',()=>{
    const legacy=context(false);expect(validSessionSources(legacy)).toBe(true);
    const state=sessionSourceStatus(legacy);expect(state.status).toBe('missing');expect(state.sources).toEqual([]);expect(state.notice).toBe(LEGACY_SESSION_SOURCES_NOTICE);
    const html=sessionSourcesReport(legacy);expect(html).toContain(LEGACY_SESSION_SOURCES_NOTICE);expect(html).not.toContain('https://example.test');
  });
  it('requires all embedded character, citation and rule source references in the saved registry',()=>{
    const session=context();expect(sessionReferencedSourceIds(session)).toEqual(['old-source']);expect(validSessionSources(session)).toBe(true);
    session.candidates[0].citations[0].sourceId='missing-source';expect(validSessionSources(session)).toBe(false);
    const ruleSession=context();ruleSession.analysis.qimen.auxiliary={rules:[{sources:[{id:'qimen-source'}]}]} as any;
    expect(validSessionSources(ruleSession)).toBe(false);
    ruleSession.sourceSnapshot!.sources.push(source('qimen-source'));expect(validSessionSources(ruleSession)).toBe(true);
    const numeric=context();numeric.candidates[0].numerology={strokes:[{options:[{sourceId:'stroke-source'}]}],rule:{interpretationSourceId:'formula-source'},grids:[{interpretation:{sourceId:'classification-source'}}]} as any;
    expect(sessionReferencedSourceIds(numeric)).toEqual(['old-source','stroke-source','formula-source','classification-source']);
    expect(validSessionSources(numeric)).toBe(false);
  });
  it('does not show a malformed or mismatched snapshot as a valid historical registry',()=>{
    const session=context();session.sourceSnapshot!.dataVersion='wrong-version';expect(validSessionSources(session)).toBe(false);
    const state=sessionSourceStatus(session);expect(state.status).toBe('invalid');expect(state.sources).toEqual([]);
    expect(sessionSourcesReport(session)).toContain('版本不一致或格式无效');
  });
});

describe('historical sources report and links',()=>{
  it('prints original URL, complete commit and hash directly in a report, even after current sources change',()=>{
    const session=context();const html=sessionSourcesReport(session);
    expect(html).toContain('historical-data-v1');expect(html).toContain('https://example.test/original');expect(html).toContain('a'.repeat(40));expect(html).toContain('b'.repeat(64));expect(html).toContain('data/raw/original.json');
    expect(html).toContain('当前知识库更新不会替换此清单');
  });
  it('escapes imported metadata and prevents executable or credentialed links',()=>{
    const malicious={...source(),name:'<script>alert(1)</script>',url:'javascript:alert(2)',note:'<img src=x onerror=alert(3)>'};
    const session={dataVersion:'v1',sourceSnapshot:createSessionSourceSnapshot('v1',[malicious])};const html=sessionSourcesReport(session);
    expect(html).toContain('&lt;script&gt;');expect(html).toContain('&lt;img');expect(html).not.toContain('<script>');expect(html).not.toContain('href="javascript:');
    expect(safeSourceUrl('https://user:secret@example.test')).toBeUndefined();expect(safeSourceUrl('file:///private')).toBeUndefined();
    expect(safeSourceUrl('https://example.test/real?a=1&b=2')).toBe('https://example.test/real?a=1&b=2');
    expect(safeSourceUrl('local:data/naming-editorial.json')).toBeUndefined();
  });
});
