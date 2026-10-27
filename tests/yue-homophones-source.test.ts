import {afterEach,describe,expect,it} from 'vitest';
import {chmodSync,cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve} from 'node:path';
import {loadYueHomophoneData,verifyYueHomophoneProvenance} from '../src/main/yue-homophone-data';
import {loadYueReadingData} from '../src/main/yue-reading-data';
import {calculateYueNameReading,confirmYueNameReading} from '../src/domain/yue-reading';
import {calculateYueHomophoneReview} from '../src/domain/yue-homophones';
import {analyzeProfile} from '../src/domain/engine';
import {analyzeNumerology} from '../src/domain/numerology';
import {loadNumerologyData} from '../src/main/numerology-data';
import {REN_ACTION_METHOD} from '../src/shared/ren-method';
import {createSessionSourceSnapshot} from '../src/shared/session-sources';
import type {NamingSession} from '../src/shared/types';
const temporary:string[]=[];
function fixture(){const target=mkdtempSync(join(tmpdir(),'naming-yue-words-'));temporary.push(target);const lock=JSON.parse(readFileSync(resolve('data/yue-homophone-source-lock.json'),'utf8')) as {sources:{files:string[]}[]};for(const relative of ['data/yue-homophone-source-lock.json',...lock.sources.flatMap(source=>source.files)]){const output=join(target,relative.slice(5));cpSync(resolve(relative),output,{recursive:true});chmodSync(output,0o666);}return target;}
afterEach(()=>{for(const target of temporary.splice(0)){if(dirname(resolve(target))!==resolve(tmpdir())||!basename(target).startsWith('naming-yue-words-'))throw new Error('Unexpected temporary target');rmSync(target,{recursive:true,force:true});}});
describe('fixed independent Cantonese lexical sources',()=>{
 it('checks twelve original Kaikki records, twelve Rime original rows and separate licences',()=>{
  const {data,sources}=loadYueHomophoneData(resolve('data'));
  expect(data.rules).toHaveLength(12);expect(sources.map(source=>source.license)).toEqual(['CC-BY-SA-4.0','CC-BY-4.0']);
  expect(data.sourceReferences).toHaveLength(24);expect(sources.some(source=>source.id==='rime-cantonese-jyutping'||source.id==='wiktionary-zh')).toBe(false);
  expect(data.rules.every(rule=>rule.glosses.length&&rule.sourceRefs.every(ref=>ref.line>0&&!!ref.quote))).toBe(true);
 });
 it('refuses relabelled registry licences',()=>{const directory=fixture(),file=join(directory,'yue-homophone-source-lock.json');writeFileSync(file,readFileSync(file,'utf8').replace('CC-BY-SA-4.0','CC0'));expect(()=>loadYueHomophoneData(directory)).toThrow('来源登记');});
 it.each(['raw/yue-homophone-wiktionary-excerpts.json','raw/yue-homophone-rime-excerpts.json','raw/yue-homophone-CC-BY-SA-4.0.txt','raw/yue-homophone-CC-BY-4.0.txt','yue-homophone-rules.json'])('rejects modified source/meaning/rules/licence %s',relative=>{const directory=fixture(),file=join(directory,relative);writeFileSync(file,readFileSync(file,'utf8')+'\n');expect(()=>loadYueHomophoneData(directory)).toThrow('校验失败');});
});
describe('Cantonese word-review provenance gating',()=>{
 function session(mode:'none'|'strict'|'ignore-tone'='strict'){
  const {data,sources}=loadYueHomophoneData(resolve('data')),{data:readingData}=loadYueReadingData(resolve('data'));
  const reading=confirmYueNameReading(calculateYueNameReading('溫','奕',readingData),{surname:{tokens:['wan1'],origin:'user',confirmed:true},given:[{tokens:['jik6'],origin:'user',confirmed:true}]});
  const review=calculateYueHomophoneReview('溫','奕',reading,'strict',data);
  return{sources,value:{preferences:{yueReading:true,yueHomophones:mode},candidates:[{yueReading:reading,yueHomophones:review}],dataVersion:'fixed',sourceSnapshot:createSessionSourceSnapshot('fixed',sources)} as unknown as NamingSession};
 }
 it('requires both exact source records for each enabled review',()=>{const {value,sources}=session();expect(()=>verifyYueHomophoneProvenance(value,sources)).not.toThrow();value.sourceSnapshot!.sources[0].sha256='0'.repeat(64);expect(()=>verifyYueHomophoneProvenance(value,sources)).toThrow('生成时来源');});
 it('does not attach new sources or review assertions to a disabled or legacy preference',()=>{const {value,sources}=session('none');expect(()=>verifyYueHomophoneProvenance(value,sources)).toThrow('未启用');const raw=value as unknown as {candidates:{yueHomophones?:unknown}[];sourceSnapshot?:unknown};delete raw.candidates[0].yueHomophones;delete raw.sourceSnapshot;expect(()=>verifyYueHomophoneProvenance(value,sources)).not.toThrow();});
 it('does not apply lexical JSON constraints to authentic unrelated unknown-time Ren and pending numerology payloads',()=>{
  const resources=loadNumerologyData(resolve('data'));
  const analysis=analyzeProfile({id:'yue-lexical-legacy',customerName:'隔离词汇来源门控',surname:'林',surnamePinyin:'lín',gender:'中性',calendar:'solar',birthDate:'2024-02-04',birthTime:'',timeUnknown:true,leapMonth:false,birthPlace:'杭州',timezone:'Asia/Shanghai',notes:'',renMethod:REN_ACTION_METHOD});
  const numerology=analyzeNumerology('林','安宁',resources.strokes,resources.rules);
  expect(analysis.qimen.available).toBe(false);expect(analysis.renCommentary).toBeDefined();
  expect(numerology.strokes.some(stroke=>Object.hasOwn(stroke,'selectedRecordId')&&stroke.selectedRecordId===undefined)).toBe(true);
  const {value,sources}=session('none');const candidate=value.candidates[0];delete candidate.yueHomophones;delete candidate.yueReading;candidate.numerology=numerology;value.analysis=analysis;delete value.sourceSnapshot;
  expect(()=>verifyYueHomophoneProvenance(value,sources)).not.toThrow();
 });
 it('requires reading enabled and a result of the chosen mode on every candidate',()=>{const {value,sources}=session();value.preferences.yueReading=false;expect(()=>verifyYueHomophoneProvenance(value,sources)).toThrow('须启用');value.preferences.yueReading=true;(value as unknown as {preferences:{yueHomophones:string}}).preferences.yueHomophones='ignore-tone';expect(()=>verifyYueHomophoneProvenance(value,sources)).toThrow('每个候选');});
});
