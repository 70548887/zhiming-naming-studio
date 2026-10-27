import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createManualM970MeaningQuery} from '../src/main/m970-manual-character-meaning-query.mjs';
import {M970_MANUAL_QUERY_PINS} from '../src/main/m970-manual-meaning-pins.mjs';
import {reconstructCoverage,classifyCharacters} from '../src/main/m970-manual-meaning-coverage.mjs';
import {createSingleCharacterMeaningAdapter} from '../src/main/single-character-meaning-query.mjs';
import {createManualM690MeaningQuery} from '../src/main/m690-single-character-meaning-query.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DATA=path.join(ROOT,'data'),PUBLICATION=path.join(DATA,'manual-meaning-m970/1.0.0'),EVIDENCE=path.join(ROOT,'.local/m1024');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const profile=json(path.join(PUBLICATION,'m970/candidate/profile.json'));
const subset=json(path.join(PUBLICATION,'m970/candidate/source-subset.json'));
const request=row=>({mode:'manual-request',char:row.char,pinyin:row.pinyin,tone:row.tone,senseId:`moe-revised:${row.sourceCoordinates.join(':')}`,packSha256:M970_MANUAL_QUERY_PINS.expectedPackSha256,activeVersion:M970_MANUAL_QUERY_PINS.expectedActiveVersion});
let adapter;
before(()=>{fs.mkdirSync(EVIDENCE,{recursive:true});adapter=createManualM970MeaningQuery({dataDir:DATA});});
const requireEmpty=(result,reason)=>{assert.equal(result.status,'not-covered');assert.deepEqual(result.options,[]);assert.equal(result.source,null);assert.equal(result.reasonCode,reason);assert.equal(result.automaticMeaningAllowed,false);assert.equal(result.generationAuthority,false);assert.equal(result.formalCoverageAdded,0);};

test('real adapter consumes exact six fixed source cases and preserves existing result DTO shape',()=>{
 const rows=[];
 for(const row of profile.rows){
  const result=adapter.getSingleCharacterMeaningOptions(request(row)),option=result.options[0],original=subset.entries.find(s=>s.char===row.char);
  assert.equal(result.schema,'single-character-meaning-options/1');assert.equal(result.status,'available');assert.equal(result.requestMode,'manual-request');assert.equal(result.scope,'on-request-supplement-only');assert.equal(option.char,row.char);assert.equal(option.pinyin,row.pinyin);assert.equal(option.tone,row.tone);assert.equal(option.senseId,`moe-revised:${row.sourceCoordinates.join(':')}`);
  assert.deepEqual(option.source.definition,original.definition);assert.deepEqual(option.source.completeOriginalEntry,original.completeOriginalEntry);assert.deepEqual(option.source.allOriginalReadings,original.allReadings);assert.deepEqual(option.source.readings,row.baselineCharacter.readings);assert.equal(option.source.parsedEntrySha256,original.parsedEntrySha256);assert.equal(option.source.sourcePOS,row.sourcePOS);assert.equal(option.source.originalSha256,original.rawFileSha256);assert.equal(option.source.license,'CC-BY-ND-3.0-TW');
  assert.equal(option.meaning,row.project.meaning);assert.deepEqual(option.project,row.project);assert.equal(option.project.projectWish,null);assert.equal(option.project.license,'CC0-1.0');assert.equal(option.pack.packSha256,M970_MANUAL_QUERY_PINS.expectedPackSha256);assert.equal(option.publication.sourceCommit,'dd54e0be89f4d8c71b65369c2b337e3410a61b7e');assert.equal(option.batch.manualOnly,true);assert.equal(option.batch.individualAdmission,'not-granted');assert.equal(option.batch.activation,'off');assert.equal(option.usageStatus,'manual-context-required');assert.equal(option.uncertainty.admissionGranted,false);assert.equal(option.wholeNameMeaning,null);assert.equal(option.scoreDelta,0);assert.equal(option.automaticMeaningAllowed,false);assert.equal(option.sourceAuthority,false);assert.equal(option.generationAuthority,false);assert.equal(option.formalCoverageAdded,0);assert.equal(Object.isFrozen(option.source.completeOriginalEntry),true);
  rows.push({char:row.char,pinyin:row.pinyin,tone:row.tone,senseId:option.senseId,sourceDefinition:option.source.definition.def,sourcePOS:option.source.sourcePOS,entrySha256:option.source.parsedEntrySha256,projectMeaning:option.meaning,publication:option.publication,usageStatus:option.usageStatus,selectedSenseChangedFromPrior:option.uncertainty.selectedSenseChangedFromPrior,admissionGranted:false});
 }
 const out=path.join(EVIDENCE,'real-six-query-results.json');fs.writeFileSync(out+'.tmp',JSON.stringify(rows,null,2)+'\n');fs.renameSync(out+'.tmp',out);
});

test('existing c866 router and optional M690 adapter actually do not expose exact six',()=>{
 const old=createSingleCharacterMeaningAdapter({projectRoot:ROOT});
 const sample=profile.rows.find(r=>r.char==='革');const oldResult=old.getSingleCharacterMeaningOptions({char:sample.char,pinyin:sample.pinyin,tone:sample.tone});
 assert.equal(oldResult.status,'not-covered');assert.deepEqual(oldResult.options,[]);
 const m690=createManualM690MeaningQuery({batchRoot:'D:/Codex-NamingStudio-Evidence/m690-meanings-batch-next',sourceDataDir:DATA});
 for(const row of profile.rows){const actual=m690.getSingleCharacterMeaningOptions({char:row.char,pinyin:row.pinyin,tone:row.tone});assert.equal(actual.status,'not-covered');assert.deepEqual(actual.options,[]);}
 fs.writeFileSync(path.join(EVIDENCE,'existing-entry-gap.json'),JSON.stringify({baseline:'c86600dcb9f51e02aeffa48ec74922fe983d6121',existingUnifiedRouter:{char:'革',status:oldResult.status},optionalM690ExactSixStatuses:profile.rows.map(r=>({char:r.char,status:'not-covered'})),runtimeRegistrationChanged:false},null,2)+'\n');
});

test('only explicit manual-request with all reading, pack and sense fields is accepted',()=>{
 const query=request(profile.rows[0]);
 for(const key of ['mode','char','pinyin','tone','senseId','packSha256','activeVersion']){const missing={...query};delete missing[key];assert.throws(()=>adapter.getSingleCharacterMeaningOptions(missing),/missing explicit/);}
 for(const mode of ['automatic','generation','auto','default',''])assert.throws(()=>adapter.getSingleCharacterMeaningOptions({...query,mode}),/only explicit manual-request/);
 for(const extra of [{approved:true},{wholeNameMeaning:'已认可'},{givenName:'傲然'},{themeIds:['strength']},{verified:true}])assert.throws(()=>adapter.getSingleCharacterMeaningOptions({...query,...extra}),/extra, authority/);
});

test('wrong pinyin/tone, a different or missing sense and unknown characters fail closed without fallback',()=>{
 const query=request(profile.rows[0]);requireEmpty(adapter.getSingleCharacterMeaningOptions({...query,pinyin:'āo'}),'reading-mismatch');requireEmpty(adapter.getSingleCharacterMeaningOptions({...query,tone:1}),'reading-mismatch');requireEmpty(adapter.getSingleCharacterMeaningOptions({...query,senseId:'moe-revised:14019:0:0'}),'sense-mismatch');requireEmpty(adapter.getSingleCharacterMeaningOptions({...query,char:'衡',pinyin:'héng',tone:2,senseId:'moe-revised:128496:0:1'}),'not-covered');
});

test('wrong requested pack or activeVersion does not inherit fixed pack authority',()=>{
 const query=request(profile.rows[1]);requireEmpty(adapter.getSingleCharacterMeaningOptions({...query,packSha256:'f'.repeat(64)}),'pack-mismatch');requireEmpty(adapter.getSingleCharacterMeaningOptions({...query,activeVersion:'f'.repeat(12)}),'pack-mismatch');assert.throws(()=>adapter.getSingleCharacterMeaningOptions({...query,packSha256:'caller-trust'}),/pack\/sense/);
});

test('complete default217+304 and independent60 dedup reconstruction remains unchanged',()=>{
 const manifest=json(path.join(PUBLICATION,'publication-manifest.json')),source=file=>json(path.join(DATA,file));
 const reservations=manifest.reservationDescriptors.map(d=>{const value=json(path.join(PUBLICATION,'m970',d.inputCopy)),rows=d.field?value[d.field]:value;return {...d,characters:rows.map(r=>typeof r==='string'?r:r.char??r.identity?.char)};});
 const coverage=reconstructCoverage({dataset:source('dataset-v6.json'),v7:source('naming-editorial-v7.json'),v4:source('naming-editorial-v4.json'),v5:source('naming-editorial-v5.json'),v6:source('naming-editorial-v6.json'),reservations});
 assert.equal(isDeepStrictEqual(coverage,json(path.join(PUBLICATION,'m970/coverage.json'))),true,'Full coverage and documentary reservation metadata match');assert.equal(coverage.previous217.length,217);assert.equal(coverage.automatic304.length,304);assert.equal(coverage.default521.length,521);assert.equal(coverage.onDemand60.length,60);assert.equal(coverage.defaultAndOnDemandUnion.length,581);assert.equal(coverage.optInFamily40.length,40);assert.equal(coverage.occupied.length,706);
 const old=json(path.join(PUBLICATION,'m970/inputs/m959-selection-original.json'));assert.equal(classifyCharacters(coverage,old.selected.map(r=>r.char)).every(r=>r.inLegacy217&&r.inDefault521&&!r.unreserved),true);assert.equal(profile.rows.every(r=>coverage.remainingUnreserved.includes(r.char)),true);
});

test('multiple dictionary meanings and three prior-sense changes remain documentary uncertainty',()=>{
 for(const char of ['革','姿','由']){const row=profile.rows.find(r=>r.char===char),result=adapter.getSingleCharacterMeaningOptions(request(row)),option=result.options[0];assert.equal(option.uncertainty.selectedSenseChangedFromPrior,true);assert.ok(option.manualReason);assert.ok(option.source.completeOriginalEntry.heteronyms[0].definitions.length>1);assert.equal(option.project.projectWish,null);assert.equal(option.batch.independentReview,'literal-scope-verified');}
 const ge=profile.rows.find(r=>r.char==='革');requireEmpty(adapter.getSingleCharacterMeaningOptions({...request(ge),pinyin:'jí',tone:2}),'reading-mismatch');
});

test('an actual changed pack file cannot be accepted by caller-provided correct SHA',()=>{
 const bad=path.join(EVIDENCE,'fixtures/bad-pack');fs.mkdirSync(bad,{recursive:true});
 for(const pin of M970_MANUAL_QUERY_PINS.sourceFiles){if(pin.file==='raw/moe-revised.json.gz')continue;const dest=path.join(bad,pin.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(DATA,pin.file),dest);}
 const pack=path.join(bad,'knowledge-v6.sqlite'),b=fs.readFileSync(pack);b[0]^=1;fs.writeFileSync(pack,b);
 const altered=createManualM970MeaningQuery({dataDir:bad,publicationDir:PUBLICATION});assert.throws(()=>altered.getSingleCharacterMeaningOptions(request(profile.rows[0])),/fixed file identity differs: knowledge-v6.sqlite/);
});

test('changed publication after a successful query is rejected on next request even if all neighbor hashes are recomputed',()=>{
 const copy=path.join(EVIDENCE,'fixtures/resigned-publication');fs.mkdirSync(path.dirname(copy),{recursive:true});fs.cpSync(PUBLICATION,copy,{recursive:true});const a=createManualM970MeaningQuery({dataDir:DATA,publicationDir:copy});assert.equal(a.getSingleCharacterMeaningOptions(request(profile.rows[0])).status,'available');
 const admissionPath=path.join(copy,'m970/candidate/admission.json'),admission=json(admissionPath);admission.admissionGranted=true;admission.approvedCaseIds=[profile.rows[0].candidateId];const bytes=Buffer.from(JSON.stringify(admission,null,2)+'\n');fs.writeFileSync(admissionPath,bytes);
 for(const manifestPath of [path.join(copy,'m970/candidate/manifest.json'),path.join(copy,'publication-manifest.json')]){const manifest=json(manifestPath);for(const p of manifest.files){if(p.file.endsWith('candidate/admission.json')){p.bytes=bytes.length;p.sha256=hash(bytes);}}fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
 assert.throws(()=>a.getSingleCharacterMeaningOptions(request(profile.rows[0])),/fixed file identity differs: publication-manifest.json/);
});

test('missing source/publication errors never fall back to historical meanings or a subset response',()=>{
 const a=createManualM970MeaningQuery({dataDir:DATA,publicationDir:path.join(EVIDENCE,'fixtures/no-publication')});assert.throws(()=>a.getSingleCharacterMeaningOptions(request(profile.rows[0])),/ENOENT/);
 const copy=path.join(EVIDENCE,'fixtures/missing-source');fs.mkdirSync(path.dirname(copy),{recursive:true});fs.cpSync(PUBLICATION,copy,{recursive:true});fs.unlinkSync(path.join(copy,'m970/candidate/source-subset.json'));const b=createManualM970MeaningQuery({dataDir:DATA,publicationDir:copy});assert.throws(()=>b.getSingleCharacterMeaningOptions(request(profile.rows[0])),/ENOENT/);
});

test('Proxy/accessor/hidden fields and extra config do not execute user code or alter query mode',()=>{
 let calls=0;const proxy=new Proxy(request(profile.rows[0]),{ownKeys(){calls++;throw Error('trap');}});assert.throws(()=>adapter.getSingleCharacterMeaningOptions(proxy),/non-Proxy/);assert.equal(calls,0);
 const getter=request(profile.rows[0]);Object.defineProperty(getter,'mode',{enumerable:true,get(){calls++;return 'manual-request';}});assert.throws(()=>adapter.getSingleCharacterMeaningOptions(getter),/accessor/);assert.equal(calls,0);
 const hidden=request(profile.rows[0]);Object.defineProperty(hidden,'tone',{value:4,enumerable:false});assert.throws(()=>adapter.getSingleCharacterMeaningOptions(hidden),/hidden/);assert.throws(()=>createManualM970MeaningQuery({dataDir:DATA,sourceAuthority:true}),/extra, authority/);
});
