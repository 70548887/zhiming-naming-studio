import {afterEach,describe,expect,it} from 'vitest';
import {chmodSync,cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {loadYueReadingData,loadYueReadingSources} from '../src/main/yue-reading-data';
import type {YueReadingData} from '../src/shared/types';
const tempPaths:string[]=[];
function fixture():string{
 const target=mkdtempSync(join(tmpdir(),'naming-yue-source-'));tempPaths.push(target);
 const lock=JSON.parse(readFileSync(resolve('data/yue-reading-source-lock.json'),'utf8')) as {sources:{files:string[]}[]};
 for(const path of ['data/yue-reading-source-lock.json',...lock.sources.flatMap(source=>source.files)]){const output=join(target,path.slice(5));cpSync(resolve(path),output,{recursive:true});chmodSync(output,0o666);}
 return target;
}
afterEach(()=>{for(const target of tempPaths.splice(0)){if(dirname(resolve(target))!==resolve(tmpdir())||!basename(target).startsWith('naming-yue-source-'))throw new Error('Unexpected temporary target');rmSync(target,{recursive:true,force:true});}});
describe('fixed Cantonese source package',()=>{
 it('locks licences, complete originals, Unicode aliases and each selected source row',()=>{
  const loaded=loadYueReadingData(resolve('data'));
  expect(loaded.data.readings).toHaveLength(1406);expect(loaded.data.readings.filter(row=>row.sourceFile==='jyut6ping3.words.dict.yaml')).toHaveLength(15);
  expect(loaded.sources).toEqual(loadYueReadingSources(resolve('data')));expect(loaded.sources[0].license).toBe('CC-BY-4.0');
  const builtin=JSON.parse(readFileSync(resolve('data/dataset.json'),'utf8')) as {sources:unknown[]};
  expect(loaded.sources[1]).toEqual(builtin.sources.find(source=>(source as {id:string}).id==='unicode-17'));
  expect(loaded.sources[0].commit).toBe('259f0e48bba840c3a2e0d117539e96937f3d89bc');
  expect(loaded.sources[0].files.some(file=>/Wiktionary|phrase|maps/iu.test(file))).toBe(false);
  expect(loaded.data.readings.every(row=>row.tokens.length===[...row.text].length)).toBe(true);
 });
 it('rejects source-registry modifications before accepting changed hashes',()=>{
  const directory=fixture(),file=join(directory,'yue-reading-source-lock.json');writeFileSync(file,readFileSync(file,'utf8').replace('CC-BY-4.0','MIT'));
  expect(()=>loadYueReadingData(directory)).toThrow('来源登记');
 });
 it.each(['raw/yue-reading-chars.dict.yaml','raw/yue-reading-words.dict.yaml','raw/yue-reading-CC-BY-4.0.txt','raw/kTraditionalVariant.txt'])('rejects altered original or licence %s',relative=>{
  const directory=fixture(),file=join(directory,relative);writeFileSync(file,readFileSync(file,'utf8')+'\n# changed\n');
  expect(()=>loadYueReadingData(directory)).toThrow('校验失败');
 });
 it('rejects a forged source row even if the phonetic text still looks plausible',()=>{
  const directory=fixture(),file=join(directory,'yue-reading-table.json');const data=JSON.parse(readFileSync(file,'utf8')) as YueReadingData;data.readings[0].sourceLine++;
  writeFileSync(file,JSON.stringify(data));expect(()=>loadYueReadingData(directory)).toThrow('校验失败');
 });
});
