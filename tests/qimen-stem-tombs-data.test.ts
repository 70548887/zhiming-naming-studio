import { afterEach,describe,expect,it } from 'vitest';
import { mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync } from 'node:fs';
import { dirname,join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {loadQimenSources,loadQimenStemTombSources,QIMEN_STEM_TOMB_VERSION}from'../src/main/qimen-data';
const dirs:string[]=[];
function isolated(){const directory=mkdtempSync(join(tmpdir(),'qimen-tomb-source-'));dirs.push(directory);const lock=JSON.parse(readFileSync(resolve('data/qimen-stem-tombs-source-lock.json'),'utf8'));for(const file of ['data/qimen-stem-tombs-source-lock.json',...lock.sources[0].files]){const out=join(directory,file.slice('data/'.length));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,readFileSync(resolve(file)));}return directory;}
afterEach(()=>{for(const directory of dirs.splice(0))rmSync(directory,{recursive:true,force:true});});
describe('separate fixed ten-stem tomb source publication',()=>{
 it('publishes exactGo table independently from unchanged existing3奇 rules',()=>{
  const sources=loadQimenStemTombSources(resolve('data')),table=JSON.parse(readFileSync(resolve('data/qimen-stem-tombs-table.json'),'utf8'));
  expect(sources).toHaveLength(1);expect(sources[0].id).toBe('qimen-go-stem-tombs');expect(sources[0].commit).toBe('4d3f58fa0f401b5b3a337f119138e99e90685dda');expect(table.version).toBe(QIMEN_STEM_TOMB_VERSION);
  expect(table.entries.map((entry:any)=>[entry.stem,entry.tombBranch,entry.palace])).toEqual([['甲','未',2],['乙','戌',6],['丙','戌',6],['丁','丑',8],['戊','戌',6],['己','丑',8],['庚','丑',8],['辛','辰',4],['壬','辰',4],['癸','未',2]]);
  expect(table.scope.executableStems).not.toContain('甲');expect(table.scope.hiddenJia).toContain('not-directly-observed');expect(table.disagreements[0].note).toContain('旧三奇读法乙坤二');
  expect(loadQimenSources(resolve('data')).filter(source=>source.id==='qimen-go-stem-tombs')).toEqual(sources);
 });
 it('rejects changedmanifest before trusting source metadata',()=>{const directory=isolated(),file=join(directory,'qimen-stem-tombs-source-lock.json');writeFileSync(file,readFileSync(file,'utf8')+' ');expect(()=>loadQimenStemTombSources(directory)).toThrow('来源登记校验失败');});
 it.each(['qimen-stem-tombs-table.json','raw/qimen-stem-tombs-go-defs.go','raw/qimen-stem-tombs-go-ganzhi.go','raw/qimen-stem-tombs-go-LICENSE.txt'])('rejects changedsource/table/license %s',file=>{const directory=isolated(),out=join(directory,file);writeFileSync(out,readFileSync(out,'utf8')+'\nchanged');expect(()=>loadQimenStemTombSources(directory)).toThrow('原表或许可校验失败');});
});
