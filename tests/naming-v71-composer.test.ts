import{beforeAll,afterAll,describe,it,expect}from'vitest';
import fs from'node:fs';import path from'node:path';import os from'node:os';import{createRequire}from'node:module';import{createHash}from'node:crypto';import{build}from'esbuild';
import*as next from'../src/domain/naming-v7';import{catalogSession}from'./fixtures/catalog-session';
import type{NamingPreferences,NameCandidate}from'../src/shared/types';
import baselineProof from'./fixtures/naming-v7-composer-baseline.json';
const raw=JSON.parse(fs.readFileSync(path.resolve('data/dataset-v6.json'),'utf8')),context={packSha256:'1875aa49dcfaeca0f266a3be7578e4d4b2a9b2c9c1f59fd79699a3e26d5d6b8b',activeVersion:'1875aa49dcfa'},sample=catalogSession();
const profile={...sample.profile,surname:'林',surnamePinyin:'lín',fatherName:'',motherName:''},analysis=sample.analysis;
const pref=(name:string):NamingPreferences=>({...sample.preferences,length:[...name].length as 1|2,generationChar:'',requiredChars:name,forbiddenChars:'',elderTaboo:'',numerology:false,zodiacRules:false,meanings:'',industry:'',style:'自然'});
let directory:string,baseline:Pick<typeof next,'evaluateNameWithContext'|'generateLocalWithContext'>;const parent=fs.realpathSync.native(os.tmpdir());
const noId=(candidate:NameCandidate)=>{const{id,...rest}=candidate;return rest;};
beforeAll(async()=>{directory=fs.realpathSync.native(fs.mkdtempSync(path.join(parent,'naming-v7-composer-')));const source=fs.readFileSync(path.resolve('tests/fixtures/naming-v7-pre-composer.ts.txt'),'utf8');expect(createHash('sha256').update(source).digest('hex')).toBe(baselineProof.sha256);const outfile=path.join(directory,'frozen-v7.cjs');await build({stdin:{contents:source,resolveDir:path.resolve('src/domain'),sourcefile:'frozen-v7-original.ts',loader:'ts'},outfile,bundle:true,platform:'node',target:'node22',format:'cjs',logLevel:'silent'});baseline=createRequire(import.meta.url)(outfile);},30000);
afterAll(()=>{if(directory){if(!directory.startsWith(parent+path.sep))throw Error('Unsafe frozen-source cleanup');fs.rmSync(directory,{recursive:true,force:true});}});
describe('pure composer extraction keeps actual old7 evaluation and order unchanged',()=>{
 it('matches all40 forced original-character results plus mixed/direct-citation examples byte-for-byte except randomID',()=>{
  const names=[...JSON.parse(fs.readFileSync(path.resolve('data/naming-character-meanings-v7.1-profile.json'),'utf8')).cases.map((r:{char:string})=>r.char),'南安','南木','斐然','安然','琼莹','静朔'];
  for(const name of names){const a=baseline.evaluateNameWithContext(context,name,profile,pref(name),analysis,raw.characters,raw.citations),b=next.evaluateNameWithContext(context,name,profile,pref(name),analysis,raw.characters,raw.citations);expect(!!b).toBe(!!a);if(a&&b)expect(JSON.stringify(noId(b))).toBe(JSON.stringify(noId(a)));}
 },30000);
 it('structured frame renders the same7.0 meaning and warnings for every valid example',()=>{
  for(const name of ['南','木','南安','南木','斐然','安然','琼莹','静朔']){const candidate=next.evaluateNameWithContext(context,name,profile,pref(name),analysis,raw.characters,raw.citations);if(!candidate)continue;const frame=next.describeNamingMeaningCompositionV7(context,name,profile,pref(name),analysis,candidate.characters,candidate.citations,candidate.style);expect(next.composeNamingMeaningV7(frame.composition)).toBe(candidate.meaning);expect(frame.baseWarnings).toEqual(candidate.warnings);expect(frame.composition.parts.map(r=>r.char).join('')).toBe(name);}
 });
 it('same-seed candidate order, raw records, citations, scores, prose and messages stay exact',()=>{
  const pool=raw.characters.filter((r:{char:string})=>'南安木斐然静碧黎霆彩清宁知远'.includes(r.char)),preferences={...pref('南安'),requiredChars:'',generationChar:''};
  for(const seed of [7,29,83]){const a=baseline.generateLocalWithContext(context,profile,preferences,analysis,pool,raw.citations,seed),b=next.generateLocalWithContext(context,profile,preferences,analysis,pool,raw.citations,seed);expect(JSON.stringify(b.candidates.map(noId))).toBe(JSON.stringify(a.candidates.map(noId)));expect(b.messages).toEqual(a.messages);}
 },30000);
 it('unreviewed warning positions are explicit so future71 recomposition need not delete by prose',()=>{
  const candidate=next.evaluateNameWithContext(context,'南安',profile,pref('南安'),analysis,raw.characters,raw.citations);expect(candidate).not.toBeNull();const frame=next.describeNamingMeaningCompositionV7(context,'南安',profile,pref('南安'),analysis,candidate!.characters,candidate!.citations,candidate!.style);expect(frame.warningRows.some(r=>r.kind==='unreviewed-character-meaning'&&r.position===0&&r.char==='南')).toBe(true);expect(frame.warningRows.filter(r=>r.kind==='ordinary').every(r=>typeof r.text==='string')).toBe(true);
 });
 it('pure structural rendering preserves original-citation branch instead of treating new notes as quotation senses',()=>{
  expect(next.composeNamingMeaningV7({parts:[{position:0,char:'南',text:'不应拼入原句'}],wishes:[{position:0,char:'南',text:'不应拼入原句期许'}],combination:'原有组合说明',originalCitationMeaning:true})).toBe('原文选义与组合寓意（项目原创解释）：原有组合说明');
 });
});
