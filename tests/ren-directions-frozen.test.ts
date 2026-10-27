import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {analyzeProfile} from '../src/domain/engine';
import {analyzeProfile as analyzeFrozen13} from '../src/domain/engine-v13';
import {validRenCommentaryAnalysis as validFrozen13} from '../src/domain/ditian-ren-v13';
import type {NamingSession} from '../src/shared/types';

interface Captured {key:string;table:string;rowId:string;sessionJsonSha256:string;session:NamingSession;}
const saved=JSON.parse(readFileSync(resolve('tests/fixtures/ren-session-1.3-saved.json'),'utf8')) as {provenance:{sha256Before:string;sha256After:string;capturedFromRelease:string;published127Asar:{sha256:string};publishedSources:Array<{original:string;sha256:string}>};records:Captured[]};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const plain=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));

describe('real saved1.3 current/history frozen before independent1.4 direction expansion',()=>{
 it('states actual126 SQL origin and127 code anchor instead of inventing127 Ren records',()=>{
  expect(saved.provenance.capturedFromRelease).toBe('1.0.26');expect(saved.provenance.sha256Before).toBe(saved.provenance.sha256After);
  expect(saved.provenance.published127Asar.sha256).toBe('42a3cdeead5821082558850b5938c92c532a5cf08e2f482796fd5a814ce58158');
  expect(saved.records.filter(item=>item.table==='sessions')).toHaveLength(3);expect(saved.records.filter(item=>item.table==='revisions')).toHaveLength(3);
  expect(new Set(saved.records.map(item=>item.session.profileId))).toEqual(new Set(['smoke-capacity-known','smoke-capacity-outside','smoke-capacity-unknown']));
 });
 it.each(saved.records)('retains full actual saved analysis for $key',record=>{
  const before=JSON.stringify(record.session);expect(hash(record.session)).toBe(record.sessionJsonSha256);
  expect(plain(analyzeFrozen13(record.session.profile))).toEqual(record.session.analysis);
  expect(plain(analyzeProfile(record.session.profile))).toEqual(record.session.analysis);
  expect(validFrozen13(record.session.analysis.renCommentary,record.session.profile,record.session.analysis.bazi)).toBe(true);
  expect(record.session.analysis.renCommentary?.version).toBe('ditian-ren-commentary-2600158/1.3.0');
  expect(record.session.analysis.renCommentary).not.toHaveProperty('directionAnalysis');
  expect(record.session.sourceSnapshot?.sources.some(source=>source.id==='bazi-ditian-ren-directions-2600158')).toBe(false);
  expect(JSON.stringify(record.session)).toBe(before);
 });
 it('retains published1.3 wrapper bytes and engine bytes except its explicit frozen-entry import',()=>{
  const wrapper=readFileSync(resolve('src/domain/ditian-ren-v13.ts'),'utf8'),engine=readFileSync(resolve('src/domain/engine-v13.ts'),'utf8');
  expect(createHash('sha256').update(wrapper).digest('hex')).toBe(saved.provenance.publishedSources.find(file=>file.original==='src/domain/ditian-ren.ts')!.sha256);
  expect(createHash('sha256').update(engine.replace("from './ditian-ren-v13';","from './ditian-ren';")).digest('hex')).toBe(saved.provenance.publishedSources.find(file=>file.original==='src/domain/engine.ts')!.sha256);
  for(const original of ['src/domain/ren-capacities.ts','src/domain/ren-actions.ts','src/domain/ren-dependencies.ts'])expect(createHash('sha256').update(readFileSync(resolve(original))).digest('hex')).toBe(saved.provenance.publishedSources.find(file=>file.original===original)!.sha256);
 });
});
