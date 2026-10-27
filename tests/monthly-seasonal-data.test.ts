import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadMonthlySeasonalData, loadMonthlySeasonalSources, MONTHLY_SEASONAL_SOURCE_ID, verifyMonthlySeasonalProvenance } from '../src/main/monthly-seasonal-data';
import { createSessionSourceSnapshot } from '../src/shared/session-sources';
import type { NamingSession } from '../src/shared/types';
const directories:string[]=[];
function isolated(){
 const directory=mkdtempSync(join(tmpdir(),'monthly-seasonal-source-'));directories.push(directory);
 const lock=JSON.parse(readFileSync(resolve('data/monthly-seasonal-source-lock.json'),'utf8'));
 for(const file of ['data/monthly-seasonal-source-lock.json',...lock.sources[0].files]){const output=join(directory,file.slice('data/'.length));mkdirSync(dirname(output),{recursive:true});writeFileSync(output,readFileSync(resolve(file)));}
 return directory;
}
afterEach(()=>{for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});

describe('fixed monthly initial-use source package',()=>{
 it('retains120indices,112initial-transcriptions,8pending,shared sections and exact original quotations',()=>{
  const {table,sources}=loadMonthlySeasonalData(resolve('data'));
  expect(sources[0].id).toBe(MONTHLY_SEASONAL_SOURCE_ID);expect(sources[0].commit).toBe('wikisource-revision/2294674');expect(table.entries).toHaveLength(120);
  expect(table.entries.filter(entry=>entry.reviewStatus==='initial')).toHaveLength(112);expect(table.entries.filter(entry=>entry.reviewStatus==='needs-review')).toHaveLength(8);
  expect(table.entries.filter(entry=>entry.reviewStatus==='needs-review').every(entry=>entry.initialUses.length===0)).toBe(true);
  expect(table.entries.find(entry=>entry.id==='乙-丑')).toMatchObject({sourceScope:'generic-winter-context-only',initialUses:[]});
  expect(table.entries.find(entry=>entry.id==='甲-寅')?.initialUses.map(use=>[use.stem,use.role])).toEqual([['丙','unranked'],['癸','unranked']]);
  expect(table.entries.find(entry=>entry.id==='甲-丑')?.initialUses.map(use=>use.stem)).toEqual(['庚','丁']);
  expect(table.entries.find(entry=>entry.id==='己-申')?.sourceQuote).toBe(table.entries.find(entry=>entry.id==='己-酉')?.sourceQuote);
  expect(table.entries.every(entry=>!entry.sourceQuote.includes('{|')&&!entry.sourceQuote.includes('|}'))).toBe(true);
  const fragments=JSON.parse(readFileSync(resolve('data/raw/monthly-seasonal-qiongtong-excerpts.json'),'utf8')).chapters.flatMap((chapter:any)=>chapter.excerpts);
  for(const entry of table.entries){const original=fragments.find((fragment:any)=>fragment.sourceSpan.start===entry.sourceSpan.start&&fragment.sourceSpan.end===entry.sourceSpan.end);expect(original?.text,entry.id).toBe(entry.sourceQuote);for(const use of entry.initialUses)expect(entry.sourceQuote).toContain(use.quote);}
  expect(table.entries.flatMap(entry=>entry.conditions)).toHaveLength(15);expect(table.entries.flatMap(entry=>entry.conditions).filter(condition=>condition.predicate)).toHaveLength(3);expect(table.source.scanCollation).toBe(false);
 });
 it('rejects modified manifest metadata before accepting source declarations',()=>{
  const directory=isolated(),target=join(directory,'monthly-seasonal-source-lock.json');writeFileSync(target,readFileSync(target,'utf8')+' ');expect(()=>loadMonthlySeasonalSources(directory)).toThrow('来源登记校验失败');
 });
 it.each(['monthly-seasonal-table.json','monthly-seasonal-editorial.json','raw/monthly-seasonal-qiongtong-excerpts.json','raw/monthly-seasonal-qiongtong-source.json','raw/monthly-seasonal-ATTRIBUTION.md','raw/CC-BY-SA-4.0.txt'])('rejects changed original/editorial/license file %s',file=>{
  const directory=isolated(),target=join(directory,file);writeFileSync(target,readFileSync(target,'utf8')+'\nchanged');expect(()=>loadMonthlySeasonalData(directory)).toThrow('原文、结构表或许可校验失败');
 });
 it('binds current saved metadata to this profile and never synthesizes source snapshots for legacy records',()=>{
  const sources=loadMonthlySeasonalSources(resolve('data')),session={dataVersion:'fixture',analysis:{bazi:{evidence:{sources:[{id:MONTHLY_SEASONAL_SOURCE_ID}]}}},sourceSnapshot:createSessionSourceSnapshot('fixture',sources)} as unknown as NamingSession;
  expect(()=>verifyMonthlySeasonalProvenance(session,sources)).not.toThrow();
  for(const field of ['name','url','commit','license','sha256','note']as const){const altered=structuredClone(session);altered.sourceSnapshot!.sources[0][field]='changed';expect(()=>verifyMonthlySeasonalProvenance(altered,sources)).toThrow('固定转录资料不一致');}
  const absent=structuredClone(session);delete absent.sourceSnapshot;expect(()=>verifyMonthlySeasonalProvenance(absent,sources)).not.toThrow();expect(absent.sourceSnapshot).toBeUndefined();
 });
});
