import {afterEach,describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {chmodSync,cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {loadYueHomophoneData} from '../src/main/yue-homophone-data';
import {loadYueHomophoneExpandedData,loadYueHomophoneExpandedSources,verifyYueHomophoneExpandedProvenance,YUE_HOMOPHONE_EXPANDED_SOURCE_IDS,YUE_HOMOPHONE_EXPANDED_VERSION} from '../src/main/yue-homophone-expanded-data';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import type {NamingSession} from '../src/shared/types';
const temporary:string[]=[];
const digest=(value:Buffer|string)=>createHash('sha256').update(value).digest('hex');
function fixture(){
 const target=mkdtempSync(join(tmpdir(),'naming-yue-extended-'));temporary.push(target);
 const lock=JSON.parse(readFileSync(resolve('data/yue-homophone-expanded-source-lock.json'),'utf8')) as {sources:{files:string[]}[]};
 for(const relative of ['data/yue-homophone-expanded-source-lock.json',...lock.sources.flatMap(source=>source.files)]){const output=join(target,relative.slice(5));cpSync(resolve(relative),output,{recursive:true});chmodSync(output,0o666);}
 return target;
}
afterEach(()=>{for(const target of temporary.splice(0)){if(dirname(resolve(target))!==resolve(tmpdir())||!basename(target).startsWith('naming-yue-extended-'))throw new Error('Unexpected temporary target');rmSync(target,{recursive:true,force:true});}});
describe('independent 1.1 Cantonese source package',()=>{
 it('keeps 28 lexemes, 29 explicit shared word sounds and both independent licences',()=>{
  const {data,sources}=loadYueHomophoneExpandedData(resolve('data'));
  expect(data.version).toBe(YUE_HOMOPHONE_EXPANDED_VERSION);expect(data.rules).toHaveLength(29);expect(new Set(data.rules.map(rule=>rule.term)).size).toBe(28);
  expect(data.sourceReferences).toHaveLength(58);expect(sources.map(source=>source.id)).toEqual([...YUE_HOMOPHONE_EXPANDED_SOURCE_IDS]);expect(sources.map(source=>source.license)).toEqual(['CC-BY-SA-4.0','CC-BY-4.0']);
  expect(loadYueHomophoneExpandedSources(resolve('data'))).toEqual(sources);
  expect(data.rules.filter(rule=>rule.term==='流氓').map(rule=>rule.tokens.join(' '))).toEqual(['lau4 man4','lau4 mong4']);
  expect(data.rules.some(rule=>rule.tokens.includes('mang4')||rule.tokens.includes('maang4'))).toBe(false);
 });
 it('preserves per-sense standardized tags separately from the actual raw_tags',()=>{
  const {data}=loadYueHomophoneExpandedData(resolve('data'));
  const oldContext=data.rules.find(rule=>rule.term==='死人')!,newContext=data.rules.find(rule=>rule.term==='老千')!;
  expect(oldContext.glosses[2]).toMatchObject({senseIndex:2,tags:['colloquial'],rawTags:['稍微粗俗','常幽默']});
  expect(newContext.glosses[0]).toMatchObject({senseIndex:0,tags:[],rawTags:['主要用於粵語']});
  expect(newContext.register).toEqual(['主要用於粵語']);
  expect(data.rules.every(rule=>rule.glosses.every(gloss=>Array.isArray(gloss.rawTags)))).toBe(true);
 });
 it('retains exact original record/row identity and selected sense/sound locators',()=>{
  const {data}=loadYueHomophoneExpandedData(resolve('data'));
  const wiki=JSON.parse(readFileSync(resolve('data/raw/yue-homophone-wiktionary-excerpts-v1-1.json'),'utf8')) as {records:{line:number;sha256:string;rawJson:string}[]};
  const rime=JSON.parse(readFileSync(resolve('data/raw/yue-homophone-rime-excerpts-v1-1.json'),'utf8')) as {records:{line:number;sha256:string;rawLine:string}[]};
  for(const rule of data.rules){
   const first=rule.sourceRefs[0] as typeof rule.sourceRefs[number]&{recordSha256:string},second=rule.sourceRefs[1] as typeof rule.sourceRefs[number]&{rowSha256:string};
   const original=wiki.records.find(record=>record.line===first.line)!,row=rime.records.find(record=>record.line===second.line)!;
   expect(first.recordSha256).toBe(digest(original.rawJson));expect(second.rowSha256).toBe(digest(row.rawLine));expect(row.rawLine).toBe(rule.term+'\t'+rule.tokens.join(' '));
   expect(first.locator).toContain(';senses:'+rule.glosses.map(gloss=>gloss.senseIndex).join(',')+';sounds:');expect(first.version).toMatch(/^snapshot-sha256:/);expect(first.url).not.toContain('oldid=');
  }
 });
 it('does not introduce a new body, hygiene or illness word while extending other contexts',()=>{
  const old=loadYueHomophoneData(resolve('data')).data,newData=loadYueHomophoneExpandedData(resolve('data')).data;
  const oldTerms=new Set(old.rules.map(rule=>rule.term));
  expect(newData.rules.filter(rule=>!oldTerms.has(rule.term))).toHaveLength(17);
  expect(newData.rules.filter(rule=>!oldTerms.has(rule.term)).some(rule=>/hygiene|body|illness|medical|disease|epidemic|mucus/.test(rule.category))).toBe(false);
 });
 it('keeps original v1.0 source bytes and twelve-rule results independent',()=>{
  const fixed:Record<string,string>={
   'data/yue-homophone-rules.json':'a36bb8178264cb0555531295e7afb061b4a4d67bf7585bf3c07a72aa44bf9023',
   'data/yue-homophone-source-lock.json':'6deabda4ca04b476d649a0ec28e226cb4bbde78dd8119e56aeb125ccbefda77c',
   'src/main/yue-homophone-data.ts':'94cb8fa55389a88facc410c89e8d2b10f2a973ebef707c582661ef48961ff2b7',
   'data/raw/yue-homophone-wiktionary-excerpts.json':'8a76ed5b74961fca2a9054bfd250c4eb10a6382af338d4c4c6a607c709ff21a1',
   'data/raw/yue-homophone-rime-excerpts.json':'4654a8c39cf903b4535c1110499ab56c1a73bf3dc24b84f0f400b5b8bc453538',
  };
  for(const [path,sha]of Object.entries(fixed))expect(digest(readFileSync(resolve(path))),path).toBe(sha);
  const old=loadYueHomophoneData(resolve('data')).data;expect(old.version).toBe('yue-homophone-review/1.0.0');expect(old.rules).toHaveLength(12);expect(old.rules.some(rule=>rule.glosses.some(gloss=>Object.hasOwn(gloss,'rawTags')))).toBe(false);
 });
 it('rejects a relabelled, even internally rehashed lock',()=>{const directory=fixture(),file=join(directory,'yue-homophone-expanded-source-lock.json'),value=JSON.parse(readFileSync(file,'utf8'));value.sources[0].license='CC0';writeFileSync(file,JSON.stringify(value,null,2)+'\n');expect(()=>loadYueHomophoneExpandedData(directory)).toThrow('来源登记');});
 it.each(['raw/yue-homophone-wiktionary-excerpts-v1-1.json','raw/yue-homophone-rime-excerpts-v1-1.json','raw/yue-homophone-wiktionary-NOTICE-v1-1.md','raw/yue-homophone-rime-NOTICE-v1-1.md','raw/yue-homophone-CC-BY-SA-4.0.txt','raw/yue-homophone-CC-BY-4.0.txt','raw/yue-homophone-rime-README-cmn.md','yue-homophone-rules-v1-1.json'])('rejects modified definitions, readings, tags or attribution file %s',relative=>{const directory=fixture(),file=join(directory,relative);writeFileSync(file,readFileSync(file,'utf8')+'\n');expect(()=>loadYueHomophoneExpandedData(directory)).toThrow('校验失败');});
});
describe('independent 1.1 source gating',()=>{
 function session(){const {sources}=loadYueHomophoneExpandedData(resolve('data'));return{sources,value:{preferences:{yueReading:true,yueHomophones:'strict'},candidates:[{yueReading:{},yueHomophones:{version:YUE_HOMOPHONE_EXPANDED_VERSION,mode:'strict'}}],dataVersion:'fixed',sourceSnapshot:createSessionSourceSnapshot('fixed',sources)} as unknown as NamingSession};}
 it('requires the exact two new source records and 1.1 result version',()=>{const {value,sources}=session();expect(()=>verifyYueHomophoneExpandedProvenance(value,sources)).not.toThrow();value.sourceSnapshot!.sources[0].sha256='0'.repeat(64);expect(()=>verifyYueHomophoneExpandedProvenance(value,sources)).toThrow('生成时来源');});
 it('rejects a legacy result under new sources',()=>{const {value,sources}=session();value.candidates[0].yueHomophones!.version='yue-homophone-review/1.0.0';expect(()=>verifyYueHomophoneExpandedProvenance(value,sources)).toThrow('每个候选');});
 it('does not add this package to a disabled session',()=>{const {value,sources}=session();value.preferences.yueHomophones='none';expect(()=>verifyYueHomophoneExpandedProvenance(value,sources)).toThrow('未启用');delete value.candidates[0].yueHomophones;delete value.sourceSnapshot;expect(()=>verifyYueHomophoneExpandedProvenance(value,sources)).not.toThrow();});
});
