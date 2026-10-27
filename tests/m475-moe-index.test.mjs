import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {StringDecoder} from 'node:string_decoder';
import {loadFixedMoeRows,moeTitleLookup} from '../scripts/fixed-moe-index.mjs';
import {validateNamingEditorialV5Inputs} from '../scripts/naming-editorial-v5-validation.mjs';
import {validateNamingEditorialV6Inputs} from '../scripts/naming-editorial-v6-validation.mjs';

const root=process.env.M475_BASELINE_ROOT??process.cwd();
const read=file=>readFileSync(join(root,'data',file));
const json=file=>JSON.parse(read(file).toString('utf8'));
const gzip=read('raw/moe-revised.json.gz');

test('actual gzip bytes, not a caller digest, key the fixed index',()=>{
 const changed=Buffer.from(gzip);
 changed[0]^=1;
 assert.throws(()=>loadFixedMoeRows(changed),/摘要/);
 const saved={freeze:Object.freeze,isFrozen:Object.isFrozen,values:Object.values,ownKeys:Reflect.ownKeys,descriptor:Object.getOwnPropertyDescriptor};
 let rows;
 try{
  Object.freeze=value=>value;
  Object.isFrozen=()=>true;
  Object.values=()=>[];
  Reflect.ownKeys=()=>[];
  Object.getOwnPropertyDescriptor=()=>undefined;
  rows=loadFixedMoeRows(gzip);
 }finally{
  Object.freeze=saved.freeze;
  Object.isFrozen=saved.isFrozen;
  Object.values=saved.values;
  Reflect.ownKeys=saved.ownKeys;
  Object.getOwnPropertyDescriptor=saved.descriptor;
 }
 assert.strictEqual(loadFixedMoeRows(Buffer.from(gzip)),rows);
 assert.strictEqual(moeTitleLookup(rows),moeTitleLookup(rows));
 assert.ok(Object.isFrozen(rows));
 assert.ok(Object.isFrozen(rows[0]));
 assert.ok(Object.isFrozen(rows[0].heteronyms[0]));
 assert.ok(Object.isFrozen(rows[0].heteronyms[0].definitions[0]));
 const last=rows.at(-1),title=last.title,lookup=moeTitleLookup(rows);
 assert.throws(()=>{last.title='M475-CACHE-MUTATED-TITLE';},TypeError);
 assert.strictEqual(lookup.get(title)?.row,last);
 assert.equal(lookup.get('M475-CACHE-MUTATED-TITLE'),undefined);
 assert.ok(Object.isFrozen(lookup));
 assert.ok(Object.isFrozen(lookup.get(title)));
});

test('ordinary mutable rows rebuild the lookup on each call',()=>{
 const rows=Object.freeze([{title:'甲',heteronyms:[]},{title:'甲',heteronyms:[]}]);
 const first=moeTitleLookup(rows);
 assert.strictEqual(first.get('甲')?.row,rows[1]);
 assert.equal(first.get('甲')?.index,1);
 rows[1].title='乙';
 const second=moeTitleLookup(rows);
 assert.notStrictEqual(first,second);
 assert.strictEqual(second.get('甲')?.row,rows[0]);
 assert.equal(second.get('甲')?.index,0);
 assert.equal(second.get('乙')?.index,1);
 assert.strictEqual(second.get('乙')?.row,rows[1]);
});

test('forged markers and row copies cannot register a cached lookup',()=>{
 const real=loadFixedMoeRows(gzip);
 const fake=[real[0]];
 fake.fixedMoeIndex=true;
 fake.sha256='cf29701f887bd3b58e9520df53d905e2697ff13a408d70a771b0458f3039fb2e';
 fake.get=()=>({row:{title:'forged'},index:0});
 const first=moeTitleLookup(fake),second=moeTitleLookup(fake);
 assert.notStrictEqual(first,second);
 assert.notStrictEqual(first,moeTitleLookup(real));
 assert.equal(first.get('forged'),undefined);
 assert.equal(first.get(real[0].title)?.index,0);
 const proxy=new Proxy(real,{});
 assert.notStrictEqual(moeTitleLookup(proxy),moeTitleLookup(real));
 assert.notStrictEqual(moeTitleLookup(proxy),moeTitleLookup(proxy));
 assert.strictEqual(moeTitleLookup(proxy).get(real.at(-1).title)?.row,real.at(-1));
});

test('pre-import no-op freeze and forged inspection cannot register fixed rows',async()=>{
 const saved={freeze:Object.freeze,isFrozen:Object.isFrozen,values:Object.values,ownKeys:Reflect.ownKeys,descriptor:Object.getOwnPropertyDescriptor};
 let isolated;
 try{
  Object.freeze=value=>value;
  Object.isFrozen=()=>true;
  Object.values=()=>[];
  Reflect.ownKeys=()=>[];
  Object.getOwnPropertyDescriptor=()=>undefined;
  isolated=await import('../scripts/fixed-moe-index.mjs?m475-pre-import-noop');
  assert.throws(()=>isolated.loadFixedMoeRows(gzip),/未实际冻结/);
 }finally{
  Object.freeze=saved.freeze;
  Object.isFrozen=saved.isFrozen;
  Object.values=saved.values;
  Reflect.ownKeys=saved.ownKeys;
  Object.getOwnPropertyDescriptor=saved.descriptor;
 }
 assert.throws(()=>isolated.loadFixedMoeRows(gzip),/未实际冻结/);
 const ordinary=[{title:'甲'}];
 const first=isolated.moeTitleLookup(ordinary);
 ordinary[0].title='乙';
 const second=isolated.moeTitleLookup(ordinary);
 assert.notStrictEqual(first,second);
 assert.equal(second.get('甲'),undefined);
 assert.strictEqual(second.get('乙')?.row,ordinary[0]);
});

test('pre-import shallow freeze cannot exempt mutable nested rows',async()=>{
 const originalFreeze=Object.freeze;
 let calls=0;
 try{
  Object.freeze=value=>{calls++;return Array.isArray(value)?originalFreeze(value):value;};
  const isolated=await import('../scripts/fixed-moe-index.mjs?m475-pre-import-shallow');
  assert.throws(()=>isolated.loadFixedMoeRows(gzip),/未实际冻结/);
  assert.ok(calls>1);
 }finally{
  Object.freeze=originalFreeze;
 }
});

test('pre-import parser, Buffer string and constructor spoof cannot forge decoded fixed rows',async()=>{
 const saved={Object,Array,parse:JSON.parse,toString:Buffer.prototype.toString};
 let parserCalls=0,stringCalls=0,freezeCalls=0,dataExposures=0,rows,isolated;
 try{
  JSON.parse=()=>{parserCalls++;return [{title:'M475-PARSER-FORGED-ROW',heteronyms:[]}];};
  Buffer.prototype.toString=()=>{stringCalls++;return '[{"title":"M475-BUFFER-FORGED-ROW","heteronyms":[]}]';};
  globalThis.Object={freeze:value=>{
   freezeCalls++;
   if('title' in value){dataExposures++;value.title='M475-FREEZE-FORGED-ROW';}
   return saved.Object.freeze(value);
  }};
  globalThis.Array={isArray:()=>false};
  isolated=await import('../scripts/fixed-moe-index.mjs?m475-pre-import-decode');
  rows=isolated.loadFixedMoeRows(gzip);
  assert.strictEqual(isolated.loadFixedMoeRows(gzip),rows);
 }finally{
  globalThis.Object=saved.Object;
  globalThis.Array=saved.Array;
  JSON.parse=saved.parse;
  Buffer.prototype.toString=saved.toString;
 }
 assert.equal(parserCalls,0);
 assert.equal(stringCalls,0);
 assert.equal(dataExposures,0);
 assert.equal(freezeCalls,2,'only empty cold-load probes reach the host freeze');
 assert.equal(rows.length,163087);
 const ordinary=loadFixedMoeRows(gzip);
 assert.deepEqual(rows[0],ordinary[0]);
 assert.strictEqual(Object.getPrototypeOf(rows),Array.prototype);
 assert.strictEqual(Object.getPrototypeOf(rows[0]),Object.prototype);
 assert.strictEqual(Object.getPrototypeOf(rows[0].heteronyms),Array.prototype);
 assert.strictEqual(Object.getPrototypeOf(rows[0].heteronyms[0]),Object.prototype);
 assert.strictEqual(Object.getPrototypeOf(rows[0].heteronyms[0].definitions),Array.prototype);
 assert.strictEqual(Object.getPrototypeOf(rows[0].heteronyms[0].definitions[0]),Object.prototype);
 assert.equal(isolated.moeTitleLookup(rows).get('M475-PARSER-FORGED-ROW'),undefined);
 assert.equal(isolated.moeTitleLookup(rows).get('M475-BUFFER-FORGED-ROW'),undefined);
 assert.equal(isolated.moeTitleLookup(rows).get('M475-FREEZE-FORGED-ROW'),undefined);
});

test('post-import parser, Buffer string and decoder method spoof cannot change a cold decode',async()=>{
 const isolated=await import('../scripts/fixed-moe-index.mjs?m475-post-import-decode');
 const saved={parse:JSON.parse,toString:Buffer.prototype.toString,write:StringDecoder.prototype.write,end:StringDecoder.prototype.end};
 let parserCalls=0,stringCalls=0,decoderCalls=0,rows;
 try{
  JSON.parse=()=>{parserCalls++;return [{title:'M475-POST-PARSER-FORGED-ROW',heteronyms:[]}];};
  Buffer.prototype.toString=()=>{stringCalls++;return '[{"title":"M475-POST-BUFFER-FORGED-ROW","heteronyms":[]}]';};
  StringDecoder.prototype.write=()=>{decoderCalls++;return '[]';};
  StringDecoder.prototype.end=()=>{decoderCalls++;return '[]';};
  rows=isolated.loadFixedMoeRows(gzip);
 }finally{
  JSON.parse=saved.parse;
  Buffer.prototype.toString=saved.toString;
  StringDecoder.prototype.write=saved.write;
  StringDecoder.prototype.end=saved.end;
 }
 assert.equal(parserCalls,0);
 assert.equal(stringCalls,0);
 assert.equal(decoderCalls,0);
 assert.equal(rows.length,163087);
 assert.deepEqual(rows[0],loadFixedMoeRows(gzip)[0]);
 assert.ok(Object.isFrozen(rows.at(-1)));
 assert.equal(isolated.moeTitleLookup(rows).get('M475-POST-PARSER-FORGED-ROW'),undefined);
 assert.equal(isolated.moeTitleLookup(rows).get('M475-POST-BUFFER-FORGED-ROW'),undefined);
});

test('V5 and V6 keep baseline outputs and recheck bad tables after index reuse',async()=>{
 const rows=loadFixedMoeRows(gzip);
 const originalV5=await import(pathToFileURL(join(root,'scripts','naming-editorial-v5-validation.mjs')).href);
 const originalV6=await import(pathToFileURL(join(root,'scripts','naming-editorial-v6-validation.mjs')).href);
 const v5={table:json('naming-editorial-v5.json'),baseDataset:json('dataset.json'),nextDataset:json('dataset-v5.json'),base4:json('naming-editorial-v4.json'),review:json('raw/naming-editorial-v5-name-review.json'),corrections:json('raw/naming-editorial-v5-character-overrides.json'),rawMoe:rows,rawPoems:json('raw/shijing.json')};
 const v6={table:json('naming-editorial-v6.json'),baseDataset:v5.nextDataset,nextDataset:json('dataset-v6.json'),base5:v5.table,base4:v5.base4,corrections:json('raw/naming-editorial-v6-character-overrides.json'),semanticReview:json('raw/naming-editorial-v6-semantic-review.json'),rawMoe:rows};
 assert.deepEqual(validateNamingEditorialV5Inputs(v5),originalV5.validateNamingEditorialV5Inputs(v5));
 assert.deepEqual(validateNamingEditorialV6Inputs(v6),originalV6.validateNamingEditorialV6Inputs(v6));
 assert.strictEqual(moeTitleLookup(rows),moeTitleLookup(rows));
 const changedV5=structuredClone(v5.table);
 changedV5.nameRules[0].meaning='uncorroborated meaning';
 assert.throws(()=>validateNamingEditorialV5Inputs({...v5,table:changedV5}),/正式表与独立手录审阅证据不一致/);
 const changedV6=structuredClone(v6.table);
 changedV6.semanticMigrations.defaultSenseMap['冬'].after.meaning='uncorroborated metaphor';
 assert.throws(()=>validateNamingEditorialV6Inputs({...v6,table:changedV6}),/逐用途语义迁移证据不符/);
});
