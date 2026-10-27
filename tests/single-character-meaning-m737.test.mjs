import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createSingleCharacterMeaningAdapter} from '../src/main/single-character-meaning-query.mjs';
import {createManualM690MeaningQuery} from '../src/main/m690-single-character-meaning-query.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDataDir = path.join(root,'data');
const batchRoot = process.env.NAMING_M737_M690_ROOT ?? path.resolve(root,'../m690-meanings-batch-next');
const evidence = path.join(root,'.local/m737-tests');
fs.mkdirSync(evidence,{recursive:true});
const profile = JSON.parse(fs.readFileSync(path.join(batchRoot,'data/profile.json'),'utf8'));
const helper = createManualM690MeaningQuery({batchRoot,sourceDataDir});
const provider = createSingleCharacterMeaningAdapter({projectRoot:root,manualM690BatchRoot:batchRoot});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function candidateCopy() {
  const target = fs.mkdtempSync(path.join(evidence,'candidate-'));
  fs.copyFileSync(path.join(batchRoot,'M690-MANIFEST.json'),path.join(target,'M690-MANIFEST.json'));
  fs.cpSync(path.join(batchRoot,'data'),path.join(target,'data'),{recursive:true});
  return target;
}

test('M737 existing provider remains M690-disabled by default',()=>{
  const original = createSingleCharacterMeaningAdapter({projectRoot:root});
  const actual = original.getSingleCharacterMeaningOptions({char:'丘'});
  assert.equal(actual.status,'not-covered');
  assert.deepEqual(actual.options,[]);
  assert.equal(actual.source,null);
});

test('M737 opt-in uses the same query method and exposes manual candidate state',()=>{
  const actual = provider.getSingleCharacterMeaningOptions({char:'丘',pinyin:'qiū',tone:1});
  assert.equal(actual.status,'available');
  assert.equal(actual.source.batchId,'M690-D02');
  assert.equal(actual.source.manualOnly,true);
  assert.equal(actual.source.individualAdmission,'not-granted');
  assert.equal(actual.source.independentReview,'scope-only');
  assert.equal(actual.source.admission,'candidate-awaiting-independent-review');
  assert.equal(actual.source.activation,'off');
  assert.equal(actual.source.productionApproved,false);
  assert.equal(actual.options[0].source.definition.def,'小土山、小土堆。');
  assert.equal(actual.options[0].defaultReading.pinyin,'qiū');
});

test('M737 all20 preserve exact source, definition, POS and original reading arrays',()=>{
  for(const row of profile.cases){
    const result=helper.getSingleCharacterMeaningOptions({char:row.char,pinyin:row.pinyin,tone:row.tone});
    const option=result.options[0];
    assert.equal(result.status,'available',row.char);
    assert.equal(option.source.sourceId,row.source.sourceId);
    assert.equal(option.source.pinyin,row.pinyin);
    assert.equal(option.source.tone,row.tone);
    assert.equal(option.source.sourcePOS,row.source.definition.type);
    assert.equal(option.source.rawEntryIndex,row.source.rawEntryIndex);
    assert.equal(option.source.rawHeteronymIndex,row.source.rawHeteronymIndex);
    assert.equal(option.source.rawDefinitionIndex,row.source.rawDefinitionIndex);
    assert.deepEqual(option.source.completeOriginalEntry,row.source.completeOriginalEntry);
    assert.deepEqual(option.source.readings,row.baselineCharacter.readings);
    assert.deepEqual(option.project,row.project);
    assert.equal(option.scoreDelta,0);
    assert.equal(option.wholeNameMeaning,null);
    assert.equal(option.automaticNameRecommendation,false);
    assert.equal(option.automaticSemanticCreditAllowed,false);
  }
});

test('M737 char-only uses fixed default while mismatched tone, pinyin and unknown do not fall back',()=>{
  assert.equal(helper.getSingleCharacterMeaningOptions({char:'问'}).options[0].pinyin,'wèn');
  for(const query of [{char:'问',pinyin:'wen',tone:4},{char:'问',pinyin:'wèn',tone:1},{char:'安'},{char:'知',pinyin:'zhì',tone:4}]){
    const actual=helper.getSingleCharacterMeaningOptions(query);
    assert.equal(actual.status,'not-covered');assert.deepEqual(actual.options,[]);
  }
});

test('M737 approved60, M610 and M616 paths retain their original source/status',()=>{
  const approved=provider.getSingleCharacterMeaningOptions({char:'静'});
  assert.equal(approved.source.batchId,'M460-V71-B02');
  assert.equal(approved.source.admission,'approved-character-notes');
  const m610=provider.getSingleCharacterMeaningOptions({char:'万'});
  assert.equal(m610.source.batchId,'M610-D02');
  const m616=provider.getSingleCharacterMeaningOptions({char:'知',pinyin:'zhì',tone:4});
  assert.equal(m616.source.batchId,'M616-D02');
  assert.equal(provider.getSingleCharacterMeaningOptions({char:'知'}).status,'ambiguous-reading');
});

test('M737 query and config reject Proxy/accessors without executing traps',()=>{
  let calls=0;
  const proxy=new Proxy({char:'丘'},{getPrototypeOf(){calls++;throw Error('trap');},ownKeys(){calls++;throw Error('trap');}});
  assert.throws(()=>helper.getSingleCharacterMeaningOptions(proxy),/Proxy/);
  assert.equal(calls,0);
  const getter={};Object.defineProperty(getter,'char',{enumerable:true,get(){calls++;throw Error('getter');}});
  assert.throws(()=>helper.getSingleCharacterMeaningOptions(getter),/accessor/);
  const badConfig={sourceDataDir};Object.defineProperty(badConfig,'batchRoot',{enumerable:true,get(){calls++;throw Error('getter');}});
  assert.throws(()=>createManualM690MeaningQuery(badConfig),/accessor/);
  assert.equal(calls,0);
  for(const query of [{char:'丘',tone:'1'},{char:'丘',tone:0},{char:'丘',pinyin:''},{char:'丘',automatic:true},{char:'\ud800'},{char:'丘', [Symbol('x')]:1}]) assert.throws(()=>helper.getSingleCharacterMeaningOptions(query));
});

test('M737 r2 public adapter rejects a forged opt-in descriptor before every Proxy trap',()=>{
  const target={projectRoot:root};
  const calls={getPrototypeOf:0,get:0,getOwnPropertyDescriptor:0,ownKeys:0};
  assert.equal(Object.hasOwn(target,'manualM690BatchRoot'),false);
  const forged=new Proxy(target,{
    getPrototypeOf(value){calls.getPrototypeOf++;return Reflect.getPrototypeOf(value);},
    get(value,key,receiver){calls.get++;return Reflect.get(value,key,receiver);},
    getOwnPropertyDescriptor(value,key){
      calls.getOwnPropertyDescriptor++;
      if(key==='manualM690BatchRoot')return{value:batchRoot,writable:true,enumerable:true,configurable:true};
      return Reflect.getOwnPropertyDescriptor(value,key);
    },
    ownKeys(value){calls.ownKeys++;return Reflect.ownKeys(value);},
  });
  assert.throws(()=>createSingleCharacterMeaningAdapter(forged),/Proxy config/);
  assert.deepEqual(calls,{getPrototypeOf:0,get:0,getOwnPropertyDescriptor:0,ownKeys:0});
  assert.equal(Object.hasOwn(target,'manualM690BatchRoot'),false);
});

test('M737 r2 public adapter rejects a Proxy before target getters or revoked traps',()=>{
  let getters=0,traps=0;
  const target={};
  Object.defineProperty(target,'projectRoot',{enumerable:true,get(){getters++;return root;}});
  const proxy=new Proxy(target,{getPrototypeOf(value){traps++;return Reflect.getPrototypeOf(value);},get(value,key,receiver){traps++;return Reflect.get(value,key,receiver);}});
  assert.throws(()=>createSingleCharacterMeaningAdapter(proxy),/Proxy config/);
  assert.equal(getters,0);assert.equal(traps,0);
  const revoked=Proxy.revocable({projectRoot:root},{});revoked.revoke();
  assert.throws(()=>createSingleCharacterMeaningAdapter(revoked.proxy),/Proxy config/);
});

test('M737 r3 public adapter rejects a projectRoot getter that injects manual opt-in',()=>{
  let getters=0;
  const config={};
  Object.defineProperty(config,'projectRoot',{enumerable:true,get(){
    getters++;config.manualM690BatchRoot=batchRoot;return root;
  }});
  assert.equal(Object.hasOwn(config,'manualM690BatchRoot'),false);
  assert.throws(()=>createSingleCharacterMeaningAdapter(config),/config.*data propert/i);
  assert.equal(getters,0);
  assert.equal(Object.hasOwn(config,'manualM690BatchRoot'),false);
});

test('M737 r3 public adapter rejects a dataDir getter that injects manual opt-in',()=>{
  let getters=0;
  const config={projectRoot:root};
  Object.defineProperty(config,'dataDir',{enumerable:true,get(){
    getters++;config.manualM690BatchRoot=batchRoot;return sourceDataDir;
  }});
  assert.equal(Object.hasOwn(config,'manualM690BatchRoot'),false);
  assert.throws(()=>createSingleCharacterMeaningAdapter(config),/config.*data propert/i);
  assert.equal(getters,0);
  assert.equal(Object.hasOwn(config,'manualM690BatchRoot'),false);
});

test('M737 r3 public adapter rejects manual getter, hidden/symbol/unknown and inherited config fields',()=>{
  let getters=0;
  const manualGetter={projectRoot:root};
  Object.defineProperty(manualGetter,'manualM690BatchRoot',{enumerable:true,get(){getters++;return batchRoot;}});
  assert.throws(()=>createSingleCharacterMeaningAdapter(manualGetter),/config.*data propert/i);
  assert.equal(getters,0);
  const hidden={projectRoot:root};Object.defineProperty(hidden,'manualM690BatchRoot',{value:batchRoot,enumerable:false});
  assert.throws(()=>createSingleCharacterMeaningAdapter(hidden),/config.*data propert/i);
  const hiddenRoot={};Object.defineProperty(hiddenRoot,'projectRoot',{value:root,enumerable:false});
  assert.throws(()=>createSingleCharacterMeaningAdapter(hiddenRoot),/config.*data propert/i);
  assert.throws(()=>createSingleCharacterMeaningAdapter({projectRoot:root,[Symbol('manual')]:batchRoot}),/config.*extra.*symbol/i);
  assert.throws(()=>createSingleCharacterMeaningAdapter({projectRoot:root,unreviewed:true}),/config.*extra.*symbol/i);
  assert.throws(()=>createSingleCharacterMeaningAdapter(Object.create({projectRoot:root})),/plain object/);
  assert.throws(()=>createSingleCharacterMeaningAdapter({}),/projectRoot.*own data/i);
});

test('M737 r3 explicit data config is copied once, detached and keeps default off',()=>{
  const config=Object.assign(Object.create(null),{projectRoot:root,dataDir:sourceDataDir});
  const target=createSingleCharacterMeaningAdapter(config);
  config.manualM690BatchRoot=batchRoot;config.projectRoot='changed-after-construction';
  assert.equal(target.getSingleCharacterMeaningOptions({char:'丘'}).status,'not-covered');
  const explicit=createSingleCharacterMeaningAdapter({projectRoot:root,dataDir:sourceDataDir,manualM690BatchRoot:batchRoot});
  const actual=explicit.getSingleCharacterMeaningOptions({char:'丘'});
  assert.equal(actual.status,'available');assert.equal(actual.source.manualOnly,true);
  assert.equal(actual.source.activation,'off');assert.equal(actual.source.individualAdmission,'not-granted');
});

for(const mode of ['value','getter'])test(`M737 r4 isolated inherited ${mode} cannot turn on a default-off adapter`,()=>{
  assert.equal(Object.hasOwn(Object.prototype,'manualM690BatchRoot'),false);
  const script=path.join(root,'tests/helpers/m737-prototype-config-child.mjs');
  const output=execFileSync(process.execPath,[script,root,batchRoot,mode],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  const actual=JSON.parse(output);
  fs.writeFileSync(path.join(evidence,`prototype-${mode}.json`),JSON.stringify(actual,null,2)+'\n');
  assert.equal(actual.inputPrototypeIsNull,true);
  assert.equal(actual.configHasOwnBefore,false);assert.equal(actual.configHasOwnAfter,false);
  assert.equal(actual.status,'not-covered');assert.equal(actual.options,0);assert.equal(actual.batchId,null);
  assert.equal(actual.getterCalls,0);assert.equal(actual.prototypeRestored,true);
  assert.equal(Object.hasOwn(Object.prototype,'manualM690BatchRoot'),false);
});

test('M737 each candidate manifest/lock/profile mutation fails closed, even after a successful query',()=>{
  for(const relative of ['M690-MANIFEST.json','data/manifest.json','data/source-lock.json','data/profile.json']){
    const copied=candidateCopy();
    try{
      const target=createManualM690MeaningQuery({batchRoot:copied,sourceDataDir});
      if(relative==='data/profile.json')assert.equal(target.getSingleCharacterMeaningOptions({char:'丘'}).status,'available');
      fs.appendFileSync(path.join(copied,relative),'\n');
      assert.throws(()=>target.getSingleCharacterMeaningOptions({char:'丘'}),/fixed|bytes differ/);
    }finally{fs.rmSync(copied,{recursive:true,force:true});}
  }
});

test('M737 relocated source/candidate roots load and then reject changed source bytes',()=>{
  const copied=candidateCopy(), relocated=fs.mkdtempSync(path.join(evidence,'source-'));
  try{
    const lock=JSON.parse(fs.readFileSync(path.join(batchRoot,'data/source-lock.json'),'utf8'));
    for(const pin of lock.sourceFiles){
      const target=path.join(relocated,pin.file);fs.mkdirSync(path.dirname(target),{recursive:true});
      // Reuse immutable large dictionary bytes; never mutate this hardlink.
      if(pin.file==='raw/moe-revised.json.gz')fs.linkSync(path.join(sourceDataDir,pin.file),target);
      else fs.copyFileSync(path.join(sourceDataDir,pin.file),target);
    }
    const target=createManualM690MeaningQuery({batchRoot:copied,sourceDataDir:relocated});
    assert.equal(target.getSingleCharacterMeaningOptions({char:'诺'}).options[0].source.word,'諾');
    fs.appendFileSync(path.join(relocated,'raw/moe-README.md'),'tampered');
    assert.throws(()=>target.getSingleCharacterMeaningOptions({char:'诺'}),/original|bytes differ/);
  }finally{fs.rmSync(copied,{recursive:true,force:true});fs.rmSync(relocated,{recursive:true,force:true});}
});

test('M737 missing opt-in package raises instead of silently returning an old meaning',()=>{
  const broken=createSingleCharacterMeaningAdapter({projectRoot:root,manualM690BatchRoot:path.join(evidence,'absent')});
  assert.throws(()=>broken.getSingleCharacterMeaningOptions({char:'丘'}),/ENOENT/);
});

test('M737 manual DTO is detached and deeply frozen',()=>{
  const actual=helper.getSingleCharacterMeaningOptions({char:'菘'});
  assert.ok(Object.isFrozen(actual.options[0].source.completeOriginalEntry));
  assert.throws(()=>{actual.options[0].project.limits[0]='replace';},TypeError);
  assert.notEqual(actual.options[0].source,actual.options[0].project);
  assert.equal(actual.options[0].source.sourcePOS,'名');
  assert.match(actual.options[0].source.definition.def,/白菜/);
});

test('M737 external candidate package remains byte-identical and default779 unchanged',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(batchRoot,'M690-MANIFEST.json'),'utf8'));
  for(const pin of manifest.files){const bytes=fs.readFileSync(path.join(batchRoot,pin.file));assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.sha256);}
  const dataset=fs.readFileSync(path.join(sourceDataDir,'dataset-v6.json'));
  assert.equal(hash(dataset),'3245e1701046d43562520926d185e8363da8bf27c2523fc27a7de4e15eda0728');
});
