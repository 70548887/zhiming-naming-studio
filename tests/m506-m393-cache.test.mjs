import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {syncBuiltinESMExports} from 'node:module';
import {pathToFileURL} from 'node:url';
import * as candidate from '../src/main/m393-meaning-candidate.mjs';
import {loadFixedMoeRows,moeTitleLookup} from '../scripts/fixed-moe-index.mjs';
import {M393_PINS} from '../src/main/m393-meaning-candidate-pins.mjs';

const root=path.resolve(process.env.M506_BASELINE_ROOT??process.cwd()),data=path.join(root,'data'),lexical=path.join(data,'m460-lexical');
const verify=()=>candidate.verifyM393MeaningCandidate(lexical,data);
const originalFiles=Object.keys(M393_PINS.originalPins).map(file=>path.resolve(data,file));
const candidateFiles=['naming-character-meanings-m393-manifest.json',...Object.keys(M393_PINS.filePins)].map(file=>path.resolve(lexical,file));
let baseline;

test('cold and warm source results match the unmodified verifier without reusing DTOs',async()=>{
 const original=await import(pathToFileURL(path.join(root,'src/main/m393-meaning-candidate.mjs')));
 baseline=original.verifyM393MeaningCandidate(lexical,data);
 const realGunzip=zlib.gunzipSync;let decodes=0;
 try{
  zlib.gunzipSync=(...args)=>{decodes++;return realGunzip(...args);};syncBuiltinESMExports();
  const first=verify(),afterCold=decodes,second=verify();
  assert.equal(afterCold,1,'the staged parser performs one genuine cold source decode');
  assert.equal(decodes,afterCold,'the warm call performs no additional decompression');
  assert.deepEqual(first,baseline);assert.deepEqual(second,baseline);
  assert.notStrictEqual(first,second);assert.notStrictEqual(first.cases,second.cases);
  assert.notStrictEqual(first.verification,second.verification);
 }finally{zlib.gunzipSync=realGunzip;syncBuiltinESMExports();}
});

test('a warm call rereads every original, license and candidate artifact',()=>{
 const actualRead=fs.readFileSync,counts=new Map();
 try{
  fs.readFileSync=(file,...args)=>{if(typeof file==='string'){const key=path.resolve(file);counts.set(key,(counts.get(key)??0)+1);}return actualRead(file,...args);};syncBuiltinESMExports();
  assert.deepEqual(verify(),baseline);
  for(const file of [...originalFiles,...candidateFiles])assert.equal(counts.get(file),1,'fresh fixed-byte read: '+file);
 }finally{fs.readFileSync=actualRead;syncBuiltinESMExports();}
});

test('warm caches reject same-length changes and truncation across source, license and candidate files',()=>{
 const actualRead=fs.readFileSync;let tamper;
 const cases=[
  {base:data,file:'raw/moe-revised.json.gz'},
  {base:data,file:'raw/moe-revised.json.gz',truncate:true},
  {base:data,file:'raw/kTraditionalVariant.txt'},
  {base:data,file:'raw/kSimplifiedVariant.txt'},
  {base:data,file:'dataset-v6.json'},
  {base:data,file:'naming-editorial-v7.json'},
  {base:data,file:'raw/CC-BY-ND-3.0-TW.html'},
  {base:lexical,file:'naming-character-meanings-m393-profile.json'},
  {base:lexical,file:'naming-character-meanings-m393-admission.json'},
  {base:lexical,file:'naming-character-meanings-m393-manifest.json'},
 ];
 try{
  fs.readFileSync=(file,...args)=>{
   const bytes=actualRead(file,...args);
   if(tamper&&typeof file==='string'&&path.resolve(file)===tamper.path){const changed=Buffer.from(bytes);if(tamper.truncate)return changed.subarray(0,changed.length-1);changed[0]^=1;return changed;}
   return bytes;
  };syncBuiltinESMExports();
  for(const row of cases){tamper={path:path.resolve(row.base,row.file),truncate:!!row.truncate};assert.throws(verify,/fixed bytes\/hash differ|manifest fixed hash differs/,row.file);tamper=undefined;assert.deepEqual(verify(),baseline);}
 }finally{fs.readFileSync=actualRead;syncBuiltinESMExports();}
});

test('canonical cached rows and title records are deeply immutable',()=>{
 const rows=loadFixedMoeRows(fs.readFileSync(path.join(data,'raw/moe-revised.json.gz'))),titles=moeTitleLookup(rows),last=rows.at(-1),title=last.title;
 assert.ok(Object.isFrozen(rows));assert.ok(Object.isFrozen(last));
 assert.ok(Object.isFrozen(last.heteronyms));assert.ok(Object.isFrozen(last.heteronyms[0]));
 assert.ok(Object.isFrozen(last.heteronyms[0].definitions[0]));
 assert.ok(Object.isFrozen(titles));assert.ok(Object.isFrozen(titles.get(title)));
 assert.throws(()=>{last.title='M506-MUTATED';},TypeError);
 assert.throws(()=>{titles.get=()=>({row:{title:'forged'},index:0});},TypeError);
 assert.equal(titles.get('M506-MUTATED'),undefined);assert.strictEqual(titles.get(title).row,last);
 const dto=verify();assert.ok(Object.isFrozen(dto.cases[0].original.completeOriginalEntry));
 assert.throws(()=>{dto.cases[0].original.completeOriginalEntry.title='M506-MUTATED';},TypeError);
 assert.deepEqual(verify(),baseline);
});

test('proxy and superficially frozen caller rows do not acquire canonical index identity',()=>{
 const rows=loadFixedMoeRows(fs.readFileSync(path.join(data,'raw/moe-revised.json.gz'))),canonical=moeTitleLookup(rows),proxy=new Proxy(rows,{});
 assert.notStrictEqual(moeTitleLookup(proxy),canonical);assert.notStrictEqual(moeTitleLookup(proxy),moeTitleLookup(proxy));
 const fake=Object.freeze([{title:'甲'}]),first=moeTitleLookup(fake);fake[0].title='乙';
 const second=moeTitleLookup(fake);assert.notStrictEqual(first,second);assert.equal(second.get('甲'),undefined);assert.equal(second.get('乙').index,0);
 assert.deepEqual(verify(),baseline);
});

test('caller DTOs, digests and path proxies cannot select the private cache',()=>{
 assert.deepEqual(Object.keys(candidate).sort(),['loadM393MeaningCandidate','verifyM393MeaningCandidate']);
 const forged={...baseline,sha256:M393_PINS.originalPins['raw/moe-revised.json.gz'].sha256,rows:baseline.cases};
 assert.throws(()=>candidate.verifyM393MeaningCandidate(forged,data));
 let pathCalls=0;const proxy=new Proxy({},{get(){pathCalls++;return()=>lexical;}});
 assert.throws(()=>candidate.verifyM393MeaningCandidate(proxy,data));assert.equal(pathCalls,0);
 assert.throws(()=>candidate.loadM393MeaningCandidate(proxy));assert.equal(pathCalls,0);
 assert.throws(()=>candidate.verifyM393MeaningCandidate(lexical,proxy));assert.equal(pathCalls,0);
 assert.throws(()=>candidate.verifyM393MeaningCandidate(path.join(lexical,'not-present'),data));
 assert.throws(()=>candidate.verifyM393MeaningCandidate(lexical,path.join(data,'not-present')));
 assert.deepEqual(verify(),baseline);
});

test('warm derivations survive host parser/freeze spoof attempts without trusting caller rows',()=>{
 const realFreeze=Object.freeze,realIsFrozen=Object.isFrozen,realParse=JSON.parse;
 try{
  Object.freeze=value=>value;Object.isFrozen=()=>true;
  JSON.parse=()=>[{title:'M506-FORGED',heteronyms:[]}];
  assert.throws(verify,'candidate parsing and validation are still fresh');
  const rows=loadFixedMoeRows(fs.readFileSync(path.join(data,'raw/moe-revised.json.gz')));
  assert.equal(moeTitleLookup(rows).get('M506-FORGED'),undefined);
  assert.ok(realIsFrozen(rows));assert.ok(realIsFrozen(rows.at(-1).heteronyms[0]));
 }finally{Object.freeze=realFreeze;Object.isFrozen=realIsFrozen;JSON.parse=realParse;}
 assert.deepEqual(verify(),baseline);
});
