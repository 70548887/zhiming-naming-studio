import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadMonthAuthorityData, loadMonthAuthoritySources, MONTH_AUTHORITY_SOURCE_ID, verifyMonthAuthorityProvenance } from '../src/main/month-authority-data';
import { createSessionSourceSnapshot } from '../src/shared/session-sources';
import type { NamingSession } from '../src/shared/types';

const directories:string[]=[];
function isolated(){
 const directory=mkdtempSync(join(tmpdir(),'month-authority-source-'));directories.push(directory);
 const lock=JSON.parse(readFileSync(resolve('data/month-authority-source-lock.json'),'utf8'));
 for(const file of ['data/month-authority-source-lock.json',...lock.sources[0].files]){
  const output=join(directory,file.slice('data/'.length));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,readFileSync(resolve(file)));
 }
 return directory;
}
afterEach(()=>{for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('independent monthly authority source profile',()=>{
 it('preserves original soil terms, exact quotes,30-day rows and non-computational alternative readings',()=>{
  const {table,sources}=loadMonthAuthorityData(resolve('data'));
  expect(sources[0].id).toBe(MONTH_AUTHORITY_SOURCE_ID);expect(sources[0].commit).toBe('eb3cacbf4b41a4fe8fc3c0e77e0d12b5bd17c079');
  expect(table.months).toHaveLength(12);expect(table.months.flatMap(month=>month.segments)).toHaveLength(32);
  expect(table.months.every(month=>month.segments.reduce((sum,segment)=>sum+segment.days,0)===30)).toBe(true);
  const yin=table.months.find(month=>month.monthBranch==='寅')!;expect(yin.segments.map(segment=>[segment.sourceTerm,segment.days])).toEqual([['艮土',5],['丙火',5],['甲木',20]]);
  expect(yin.segments[0]).toMatchObject({element:'土'});expect(yin.segments[0].normalizedStem).toBeUndefined();
  expect(table.months.find(month=>month.monthBranch==='未')?.segments.at(-1)?.sourceTerm).toBe('巳土');
  expect(table.months.find(month=>month.monthBranch==='未')?.segments.at(-1)?.normalizedStem).toBeUndefined();
  expect(table.readings).toHaveLength(2);expect(table.readings.every(reading=>reading.status==='comparison-only')).toBe(true);expect(table.readings[1].quote).toContain('又豈可以三五七日為限哉');expect(table.verification.scanCollation).toBe(false);
  const excerpt=readFileSync(resolve('data/raw/month-authority-sanming-excerpt.md'),'utf8');
  for(const row of table.months){expect(excerpt).toContain(row.sourceQuote);const match=/excerpt-codepoint\[(\d+),(\d+)\)/.exec(row.sourceLocator)!;expect([...excerpt].slice(Number(match[1]),Number(match[2])).join('')).toBe(row.sourceQuote);}
  for(const reading of table.readings){const match=/excerpt-codepoint\[(\d+),(\d+)\)/.exec(reading.sourceLocator)!;expect([...excerpt].slice(Number(match[1]),Number(match[2])).join('')).toBe(reading.quote);}
 });
 it('rejects a modified manifest before treating changed source declarations as valid',()=>{
  const directory=isolated(),file=join(directory,'month-authority-source-lock.json');writeFileSync(file,readFileSync(file,'utf8')+' ');expect(()=>loadMonthAuthoritySources(directory)).toThrow('来源登记校验失败');
 });
 it.each(['month-authority-table.json','raw/month-authority-sanming-excerpt.md','raw/month-authority-sanming-LICENSE.md','raw/month-authority-sanming-SOURCE_MANIFEST.json','raw/month-authority-ATTRIBUTION.md','raw/CC-BY-SA-4.0.txt'])('rejects changed source/derived/license file %s',file=>{
  const directory=isolated(),target=join(directory,file);writeFileSync(target,readFileSync(target,'utf8')+'\nchanged');expect(()=>loadMonthAuthorityData(directory)).toThrow('原文、结构表或许可校验失败');
 });
 it('binds enabled monthly provenance to its own saved registry without synthesizing old records',()=>{
  const sources=loadMonthAuthoritySources(resolve('data')),session={dataVersion:'fixture-data',analysis:{bazi:{evidence:{sources:[{id:MONTH_AUTHORITY_SOURCE_ID}]}}},sourceSnapshot:createSessionSourceSnapshot('fixture-data',sources)} as unknown as NamingSession;
  expect(()=>verifyMonthAuthorityProvenance(session,sources)).not.toThrow();const bad=structuredClone(session);bad.sourceSnapshot!.sources[0].commit='invented';expect(()=>verifyMonthAuthorityProvenance(bad,sources)).toThrow('固定转录资料不一致');
  delete session.sourceSnapshot;expect(()=>verifyMonthAuthorityProvenance(session,sources)).not.toThrow();expect(session.sourceSnapshot).toBeUndefined();
 });
});
